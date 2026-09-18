import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { can, type Actor } from "@/server/permissions/check";
import { writeAudit, writeVehicleEvent } from "@/server/services/audit.service";
import { getStockSettings } from "@/server/services/settings.service";
import { mapVehicle } from "@/server/services/vehicle-mapper";

async function getStatusByCode(code: string) {
  const status = await prisma.vehicleStatus.findUnique({ where: { code } });
  if (!status) throw new AppError(`Estado ${code} não configurado.`, "VALIDATION");
  return status;
}

export async function registerSale(
  actor: Actor,
  input: {
    vehicleId: string;
    soldAt: string;
    sellerId?: string;
    finalPrice: number;
    customerRef?: string | null;
    expectedDeliveryAt?: string | null;
    notes?: string | null;
  },
) {
  if (!can(actor, "vehicle:register_sale")) {
    throw new AppError("Não tem permissão para registar vendas.", "FORBIDDEN", 403);
  }

  const sellerId = can(actor, "vehicle:change_seller") && input.sellerId ? input.sellerId : actor.id;
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: input.vehicleId, deletedAt: null },
    include: { status: true, photos: true, vehicleType: true, location: true, source: true, sales: { include: { seller: { select: { id: true, name: true } } } } },
  });
  if (!vehicle) throw new AppError("Viatura não encontrada.", "NOT_FOUND", 404);

  const nextCode = input.expectedDeliveryAt ? "AGUARDA_ENTREGA" : "VENDIDO";
  const nextStatus = await getStatusByCode(nextCode);

  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.vehicleSale.create({
      data: {
        vehicleId: vehicle.id,
        soldAt: new Date(input.soldAt),
        sellerId,
        finalPrice: input.finalPrice,
        customerRef: input.customerRef || null,
        expectedDeliveryAt: input.expectedDeliveryAt ? new Date(input.expectedDeliveryAt) : null,
        notes: input.notes || null,
      },
      include: { seller: { select: { id: true, name: true } } },
    });

    await tx.vehicle.update({
      where: { id: vehicle.id },
      data: {
        statusId: nextStatus.id,
        salePrice: input.finalPrice,
      },
    });

    await tx.vehicleReservation.updateMany({
      where: { vehicleId: vehicle.id, status: "ACTIVE" },
      data: { status: "CONVERTED", releasedAt: new Date() },
    });

    await tx.vehicleStatusHistory.create({
      data: {
        vehicleId: vehicle.id,
        fromStatusId: vehicle.statusId,
        toStatusId: nextStatus.id,
        changedById: actor.id,
      },
    });

    return created;
  });

  await writeVehicleEvent({
    vehicleId: vehicle.id,
    type: "SALE_REGISTERED",
    title: `Vendida — ${sale.seller.name}`,
    actor,
    next: { finalPrice: input.finalPrice, sellerId, customerRef: input.customerRef },
    notes: input.notes,
  });
  await writeAudit({
    actor,
    action: "REGISTER_SALE",
    entityType: "Vehicle",
    entityId: vehicle.id,
    previous: { status: vehicle.status.code },
    next: { status: nextCode, sellerId, finalPrice: input.finalPrice },
  });

  const fresh = await prisma.vehicle.findFirstOrThrow({
    where: { id: vehicle.id },
    include: {
      status: true,
      location: true,
      source: true,
      vehicleType: true,
      photos: { where: { deletedAt: null } },
      sales: { where: { cancelledAt: null }, include: { seller: { select: { id: true, name: true } } } },
    },
  });
  return mapVehicle(fresh, actor, await getStockSettings());
}

export async function reserveVehicle(
  actor: Actor,
  input: { vehicleId: string; customerRef?: string | null; notes?: string | null },
) {
  if (!can(actor, "vehicle:reserve")) {
    throw new AppError("Não tem permissão para reservar viaturas.", "FORBIDDEN", 403);
  }
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: input.vehicleId, deletedAt: null },
    include: { status: true },
  });
  if (!vehicle) throw new AppError("Viatura não encontrada.", "NOT_FOUND", 404);
  const reserved = await getStatusByCode("RESERVADO");

  await prisma.$transaction(async (tx) => {
    await tx.vehicleReservation.create({
      data: {
        vehicleId: vehicle.id,
        reservedById: actor.id,
        customerRef: input.customerRef || null,
        notes: input.notes || null,
      },
    });
    await tx.vehicle.update({ where: { id: vehicle.id }, data: { statusId: reserved.id } });
    await tx.vehicleStatusHistory.create({
      data: {
        vehicleId: vehicle.id,
        fromStatusId: vehicle.statusId,
        toStatusId: reserved.id,
        changedById: actor.id,
      },
    });
  });

  await writeVehicleEvent({
    vehicleId: vehicle.id,
    type: "RESERVED",
    title: `Reservada por ${actor.name}`,
    actor,
    notes: input.notes,
  });
  await writeAudit({
    actor,
    action: "RESERVE_VEHICLE",
    entityType: "Vehicle",
    entityId: vehicle.id,
    previous: { status: vehicle.status.code },
    next: { status: "RESERVADO", customerRef: input.customerRef || null, notes: input.notes || null },
  });
}

const SOLD_STATUSES = new Set(["VENDIDO", "AGUARDA_ENTREGA"]);

export async function cancelReservation(actor: Actor, input: { vehicleId: string; reason: string }) {
  if (!can(actor, "vehicle:reserve")) {
    throw new AppError("Não tem permissão para anular reservas.", "FORBIDDEN", 403);
  }
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: input.vehicleId, deletedAt: null },
    include: { status: true, reservations: { where: { status: "ACTIVE" }, orderBy: { reservedAt: "desc" }, take: 1 } },
  });
  if (!vehicle) throw new AppError("Viatura não encontrada.", "NOT_FOUND", 404);
  if (vehicle.status.code !== "RESERVADO" && !vehicle.reservations.length) {
    throw new AppError("Esta viatura não tem uma reserva ativa.", "CONFLICT");
  }

  const available = await getStatusByCode("DISPONIVEL_PARA_VENDA");
  const reservation = vehicle.reservations[0];

  await prisma.$transaction(async (tx) => {
    if (reservation) {
      await tx.vehicleReservation.update({
        where: { id: reservation.id },
        data: { status: "CANCELLED", releasedAt: new Date() },
      });
    }
    await tx.vehicle.update({ where: { id: vehicle.id }, data: { statusId: available.id } });
    await tx.vehicleStatusHistory.create({
      data: {
        vehicleId: vehicle.id,
        fromStatusId: vehicle.statusId,
        toStatusId: available.id,
        changedById: actor.id,
        notes: input.reason,
      },
    });
  });

  await writeVehicleEvent({
    vehicleId: vehicle.id,
    type: "RESERVATION_CANCELLED",
    title: `Reserva anulada por ${actor.name}`,
    actor,
    previous: { status: vehicle.status.code, reservationId: reservation?.id ?? null },
    next: { status: "DISPONIVEL_PARA_VENDA", reason: input.reason },
    notes: input.reason,
  });
  await writeAudit({
    actor,
    action: "CANCEL_RESERVATION",
    entityType: "Vehicle",
    entityId: vehicle.id,
    previous: { status: vehicle.status.code, reservationId: reservation?.id ?? null },
    next: { status: "DISPONIVEL_PARA_VENDA", reason: input.reason },
  });
}

export async function cancelSale(actor: Actor, input: { vehicleId: string; reason: string }) {
  if (!can(actor, "vehicle:register_sale")) {
    throw new AppError("Não tem permissão para anular vendas.", "FORBIDDEN", 403);
  }
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: input.vehicleId, deletedAt: null },
    include: {
      status: true,
      sales: { where: { cancelledAt: null }, orderBy: { soldAt: "desc" }, take: 1, include: { seller: { select: { id: true, name: true } } } },
    },
  });
  if (!vehicle) throw new AppError("Viatura não encontrada.", "NOT_FOUND", 404);
  const sale = vehicle.sales[0];
  if (!sale) throw new AppError("Esta viatura não tem uma venda ativa.", "CONFLICT");
  if (sale.actualDeliveryAt || vehicle.status.code === "ENTREGUE") {
    throw new AppError("Não é possível anular uma venda já entregue.", "CONFLICT");
  }
  if (!SOLD_STATUSES.has(vehicle.status.code)) {
    throw new AppError("Só é possível anular vendas em estado vendido ou a aguardar entrega.", "CONFLICT");
  }

  const available = await getStatusByCode("DISPONIVEL_PARA_VENDA");

  await prisma.$transaction(async (tx) => {
    await tx.vehicleSale.update({
      where: { id: sale.id },
      data: { cancelledAt: new Date() },
    });
    await tx.vehicle.update({ where: { id: vehicle.id }, data: { statusId: available.id } });
    await tx.vehicleStatusHistory.create({
      data: {
        vehicleId: vehicle.id,
        fromStatusId: vehicle.statusId,
        toStatusId: available.id,
        changedById: actor.id,
        notes: input.reason,
      },
    });
  });

  await writeVehicleEvent({
    vehicleId: vehicle.id,
    type: "NOTE",
    title: `Venda anulada por ${actor.name}`,
    actor,
    previous: {
      status: vehicle.status.code,
      saleId: sale.id,
      sellerId: sale.sellerId,
      finalPrice: Number(sale.finalPrice),
    },
    next: { status: "DISPONIVEL_PARA_VENDA", reason: input.reason },
    notes: input.reason,
  });
  await writeAudit({
    actor,
    action: "CANCEL_SALE",
    entityType: "Vehicle",
    entityId: vehicle.id,
    previous: { status: vehicle.status.code, saleId: sale.id, sellerId: sale.sellerId, finalPrice: Number(sale.finalPrice) },
    next: { status: "DISPONIVEL_PARA_VENDA", reason: input.reason },
  });
}
