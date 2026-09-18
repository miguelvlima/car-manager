import { Prisma, type VehicleEventType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { can, type Actor } from "@/server/permissions/check";
import { writeAudit, writeVehicleEvent } from "@/server/services/audit.service";

const BLOCKED_STATUS = new Set(["RESERVADO", "VENDIDO", "AGUARDA_ENTREGA", "ENTREGUE", "CEDIDO", "DEVOLVIDO"]);
const ACTIVE_REFURB = new Set(["TO_START", "DELIVERED", "IN_PROGRESS"]);
const ACTIVE_CLEAN = new Set(["PENDING", "IN_PROGRESS"]);

export const preparationSchema = {
  kind: ["refurbishment", "cleaning", "service", "photo"] as const,
  step: ["start", "complete", "photographed", "published"] as const,
};

export type PreparationInput = {
  vehicleId: string;
  kind: (typeof preparationSchema.kind)[number];
  step: (typeof preparationSchema.step)[number];
  processSiteId?: string;
  locationName?: string;
  notes?: string;
  expectedPickupAt?: string;
  mileage?: number;
};

export async function getPreparation(vehicleId: string) {
  const [refurbishment, cleaning, service, processSites] = await Promise.all([
    prisma.refurbishment.findFirst({
      where: { vehicleId },
      orderBy: { createdAt: "desc" },
      include: { processSite: { select: { id: true, name: true } } },
    }),
    prisma.cleaningProcess.findFirst({
      where: { vehicleId },
      orderBy: { createdAt: "desc" },
      include: { processSite: { select: { id: true, name: true } } },
    }),
    prisma.serviceProcess.findFirst({
      where: { vehicleId },
      orderBy: { createdAt: "desc" },
      include: { processSite: { select: { id: true, name: true } } },
    }),
    prisma.processSite.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, kind: true },
    }),
  ]);
  return { refurbishment, cleaning, service, processSites };
}

export async function runPreparation(actor: Actor, input: PreparationInput) {
  if (input.kind === "photo") {
    if (!can(actor, "photo:manage") && !can(actor, "vehicle:edit")) {
      throw new AppError("Não tem permissão para atualizar fotografias/publicação.", "FORBIDDEN", 403);
    }
  } else if (!can(actor, "process:manage")) {
    throw new AppError("Não tem permissão para gerir a preparação.", "FORBIDDEN", 403);
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: input.vehicleId, deletedAt: null },
    include: { status: true },
  });
  if (!vehicle) throw new AppError("Viatura não encontrada.", "NOT_FOUND", 404);

  if (input.kind === "photo") {
    if (input.step === "photographed") return markPhotographed(actor, vehicle);
    if (input.step === "published") return markPublished(actor, vehicle);
    throw new AppError("Ação de fotografia inválida.", "VALIDATION");
  }
  if (input.kind === "refurbishment") {
    return input.step === "complete" ? completeRefurbishment(actor, vehicle, input) : startRefurbishment(actor, vehicle, input);
  }
  if (input.kind === "cleaning") {
    return input.step === "complete" ? completeCleaning(actor, vehicle, input) : startCleaning(actor, vehicle, input);
  }
  return input.step === "complete" ? completeService(actor, vehicle, input) : startService(actor, vehicle, input);
}

type VehicleRow = Prisma.VehicleGetPayload<{ include: { status: true } }>;

async function startRefurbishment(actor: Actor, vehicle: VehicleRow, input: PreparationInput) {
  const active = await prisma.refurbishment.findFirst({
    where: { vehicleId: vehicle.id, status: { in: [...ACTIVE_REFURB] as Array<"TO_START" | "DELIVERED" | "IN_PROGRESS"> } },
  });
  if (active) throw new AppError("Esta viatura já está em recondicionamento.", "CONFLICT");
  const site = await resolveSite(input);
  const record = await prisma.refurbishment.create({
    data: {
      vehicleId: vehicle.id,
      processSiteId: site?.id,
      locationName: site?.name ?? empty(input.locationName),
      status: "IN_PROGRESS",
      deliveredAt: new Date(),
      expectedPickupAt: parseDate(input.expectedPickupAt),
      notes: empty(input.notes),
      responsibleUserId: actor.id,
      responsibleName: actor.name,
    },
  });
  await applyStatus(actor, vehicle, "EM_RECONDICIONAMENTO");
  await logProcess(actor, vehicle.id, "REFURBISHMENT_STARTED", "Enviada para recondicionamento", {
    location: site?.name ?? input.locationName ?? null,
    notes: input.notes ?? null,
  });
  return record.id;
}

async function completeRefurbishment(actor: Actor, vehicle: VehicleRow, input: PreparationInput) {
  const active = await prisma.refurbishment.findFirst({
    where: { vehicleId: vehicle.id, status: { in: [...ACTIVE_REFURB] as Array<"TO_START" | "DELIVERED" | "IN_PROGRESS"> } },
    orderBy: { createdAt: "desc" },
  });
  if (!active) throw new AppError("Não há recondicionamento em curso.", "VALIDATION");
  await prisma.refurbishment.update({
    where: { id: active.id },
    data: { status: "PICKED_UP", actualPickupAt: new Date(), notes: empty(input.notes) ?? active.notes },
  });
  await applyStatus(actor, vehicle, "EM_PREPARACAO");
  await logProcess(actor, vehicle.id, "REFURBISHMENT_PICKED_UP", "Voltou do recondicionamento", {
    notes: input.notes ?? null,
  });
}

async function startCleaning(actor: Actor, vehicle: VehicleRow, input: PreparationInput) {
  const active = await prisma.cleaningProcess.findFirst({
    where: { vehicleId: vehicle.id, status: { in: [...ACTIVE_CLEAN] as Array<"PENDING" | "IN_PROGRESS"> } },
  });
  if (active) throw new AppError("A higienização já está em curso.", "CONFLICT");
  const site = await resolveSite(input);
  await prisma.cleaningProcess.create({
    data: {
      vehicleId: vehicle.id,
      processSiteId: site?.id,
      locationName: site?.name ?? empty(input.locationName),
      status: "IN_PROGRESS",
      deliveredAt: new Date(),
      notes: empty(input.notes),
      responsibleUserId: actor.id,
      responsibleName: actor.name,
    },
  });
  await applyStatus(actor, vehicle, "AGUARDA_HIGIENIZACAO");
  await logProcess(actor, vehicle.id, "CLEANING_STARTED", "Higienização iniciada", {
    location: site?.name ?? input.locationName ?? null,
  });
}

async function completeCleaning(actor: Actor, vehicle: VehicleRow, input: PreparationInput) {
  const active = await prisma.cleaningProcess.findFirst({
    where: { vehicleId: vehicle.id, status: { in: [...ACTIVE_CLEAN] as Array<"PENDING" | "IN_PROGRESS"> } },
    orderBy: { createdAt: "desc" },
  });
  if (!active) throw new AppError("Não há higienização em curso.", "VALIDATION");
  await prisma.cleaningProcess.update({
    where: { id: active.id },
    data: { status: "COMPLETED", completedAt: new Date(), notes: empty(input.notes) ?? active.notes },
  });
  await applyStatus(actor, vehicle, "EM_PREPARACAO");
  await logProcess(actor, vehicle.id, "CLEANING_COMPLETED", "Higienização concluída", { notes: input.notes ?? null });
}

async function startService(actor: Actor, vehicle: VehicleRow, input: PreparationInput) {
  const active = await prisma.serviceProcess.findFirst({
    where: { vehicleId: vehicle.id, completedAt: null, enteredAt: { not: null } },
  });
  if (active) throw new AppError("A revisão já está em curso.", "CONFLICT");
  const site = await resolveSite(input);
  await prisma.serviceProcess.create({
    data: {
      vehicleId: vehicle.id,
      needsService: true,
      processSiteId: site?.id,
      locationName: site?.name ?? empty(input.locationName),
      enteredAt: new Date(),
      mileage: input.mileage ?? vehicle.mileage,
      notes: empty(input.notes),
      responsibleUserId: actor.id,
    },
  });
  await applyStatus(actor, vehicle, "AGUARDA_REVISAO");
  await logProcess(actor, vehicle.id, "SERVICE_STARTED", "Revisão iniciada", {
    location: site?.name ?? input.locationName ?? null,
    mileage: input.mileage ?? vehicle.mileage,
  });
}

async function completeService(actor: Actor, vehicle: VehicleRow, input: PreparationInput) {
  const active = await prisma.serviceProcess.findFirst({
    where: { vehicleId: vehicle.id, completedAt: null, enteredAt: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (!active) throw new AppError("Não há revisão em curso.", "VALIDATION");
  await prisma.serviceProcess.update({
    where: { id: active.id },
    data: {
      completedAt: new Date(),
      notes: empty(input.notes) ?? active.notes,
      mileage: input.mileage ?? active.mileage,
    },
  });
  const nextStatus =
    vehicle.photographyStatus === "PUBLISHED"
      ? "DISPONIVEL_PARA_VENDA"
      : vehicle.photographyStatus === "NOT_PHOTOGRAPHED"
        ? "PRONTO_PARA_FOTOGRAFAR"
        : "AGUARDA_PUBLICACAO";
  await applyStatus(actor, vehicle, nextStatus);
  await logProcess(actor, vehicle.id, "SERVICE_COMPLETED", "Revisão concluída", { notes: input.notes ?? null });
}

async function markPhotographed(actor: Actor, vehicle: VehicleRow) {
  await prisma.vehicle.update({
    where: { id: vehicle.id },
    data: { photographyStatus: "PHOTOGRAPHED", photographyUpdatedAt: new Date(), photographyUpdatedById: actor.id },
  });
  if (vehicle.status.code !== "DISPONIVEL_PARA_VENDA" && vehicle.status.code !== "AGUARDA_PUBLICACAO") {
    await applyStatus(actor, vehicle, "AGUARDA_PUBLICACAO");
  }
  await writeVehicleEvent({
    vehicleId: vehicle.id,
    type: "PUBLISHING_CHANGED",
    title: "Viatura fotografada",
    actor,
    previous: { photographyStatus: vehicle.photographyStatus },
    next: { photographyStatus: "PHOTOGRAPHED" },
  });
  await writeAudit({
    actor,
    action: "MARK_PHOTOGRAPHED",
    entityType: "Vehicle",
    entityId: vehicle.id,
    previous: { photographyStatus: vehicle.photographyStatus },
    next: { photographyStatus: "PHOTOGRAPHED" },
  });
}

async function markPublished(actor: Actor, vehicle: VehicleRow) {
  await prisma.vehicle.update({
    where: { id: vehicle.id },
    data: { photographyStatus: "PUBLISHED", photographyUpdatedAt: new Date(), photographyUpdatedById: actor.id },
  });
  await applyStatus(actor, vehicle, "DISPONIVEL_PARA_VENDA");
  await writeVehicleEvent({
    vehicleId: vehicle.id,
    type: "PUBLISHING_CHANGED",
    title: "Viatura publicada",
    actor,
    previous: { photographyStatus: vehicle.photographyStatus },
    next: { photographyStatus: "PUBLISHED" },
  });
  await writeAudit({
    actor,
    action: "MARK_PUBLISHED",
    entityType: "Vehicle",
    entityId: vehicle.id,
    previous: { photographyStatus: vehicle.photographyStatus },
    next: { photographyStatus: "PUBLISHED" },
  });
}

async function applyStatus(actor: Actor, vehicle: VehicleRow, code: string) {
  if (BLOCKED_STATUS.has(vehicle.status.code)) return;
  if (vehicle.status.code === code) return;
  if (!can(actor, "vehicle:change_status") && !can(actor, "vehicle:edit")) return;
  const status = await prisma.vehicleStatus.findUnique({ where: { code } });
  if (!status) return;
  await prisma.vehicle.update({ where: { id: vehicle.id }, data: { statusId: status.id } });
  await prisma.vehicleStatusHistory.create({
    data: {
      vehicleId: vehicle.id,
      fromStatusId: vehicle.statusId,
      toStatusId: status.id,
      changedById: actor.id,
    },
  });
  await writeVehicleEvent({
    vehicleId: vehicle.id,
    type: "STATUS_CHANGED",
    title: `Estado: ${vehicle.status.name} → ${status.name}`,
    actor,
    previous: { status: vehicle.status.name },
    next: { status: status.name },
  });
  vehicle.statusId = status.id;
  vehicle.status = status;
}

async function logProcess(
  actor: Actor,
  vehicleId: string,
  type: VehicleEventType,
  title: string,
  next: Prisma.InputJsonValue,
) {
  await writeVehicleEvent({ vehicleId, type, title, actor, next });
  await writeAudit({ actor, action: type, entityType: "Vehicle", entityId: vehicleId, next });
}

async function resolveSite(input: PreparationInput) {
  if (!input.processSiteId) {
    const name = empty(input.locationName);
    return name ? { id: null as string | null, name } : null;
  }
  const site = await prisma.processSite.findFirst({ where: { id: input.processSiteId, isActive: true } });
  if (!site) throw new AppError("Local de processo inválido.", "VALIDATION");
  return { id: site.id, name: site.name };
}

function empty(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
