import { Prisma, type PhotographyStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { normalizePlate } from "@/lib/plate";
import { can, type Actor } from "@/server/permissions/check";
import { writeAudit, writeVehicleEvent } from "@/server/services/audit.service";
import { getStockSettings } from "@/server/services/settings.service";
import { mapVehicle } from "@/server/services/vehicle-mapper";
import { sanitizeVehiclePatch, type VehicleWritableFields } from "@/server/services/vehicle-sanitize";

const vehicleInclude = {
  status: true,
  location: true,
  source: true,
  vehicleType: true,
  photos: { where: { deletedAt: null }, orderBy: [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }] },
  sales: {
    where: { cancelledAt: null },
    include: { seller: { select: { id: true, name: true } } },
    orderBy: { soldAt: "desc" as const },
  },
} satisfies Prisma.VehicleInclude;

export type VehicleListQuery = {
  q?: string;
  make?: string;
  model?: string;
  statusId?: string;
  locationId?: string;
  sourceId?: string;
  photographyStatus?: PhotographyStatus;
  minPrice?: number;
  maxPrice?: number;
  minKm?: number;
  maxKm?: number;
  year?: number;
  minDays?: number;
  maxDays?: number;
  sellerId?: string;
  availableOnly?: boolean;
  inStock?: boolean;
  catalog?: boolean;
  sort?: "newest" | "oldest" | "days_desc" | "days_asc" | "price_asc" | "price_desc" | "km_asc" | "km_desc";
  page?: number;
  pageSize?: number;
};

function emptyToNull(value?: string | null) {
  if (value == null || value === "") return null;
  return value;
}

function parseDate(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function generateInternalCode() {
  const year = new Date().getFullYear();
  const prefix = `V-${year}-`;
  const last = await prisma.vehicle.findFirst({
    where: { internalCode: { startsWith: prefix } },
    orderBy: { internalCode: "desc" },
    select: { internalCode: true },
  });
  const seq = last ? Number(last.internalCode.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

function toDecimal(value?: number | null) {
  if (value == null) return null;
  return new Prisma.Decimal(value);
}

export async function listVehicles(actor: Actor, query: VehicleListQuery) {
  const settings = await getStockSettings();
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(60, Math.max(1, query.pageSize ?? 24));
  const plate = normalizePlate(query.q);
  const where: Prisma.VehicleWhereInput = {
    deletedAt: null,
    ...(query.make ? { make: { contains: query.make, mode: "insensitive" } } : {}),
    ...(query.model ? { model: { contains: query.model, mode: "insensitive" } } : {}),
    ...(query.statusId ? { statusId: query.statusId } : {}),
    ...(query.locationId ? { locationId: query.locationId } : {}),
    ...(query.sourceId ? { sourceId: query.sourceId } : {}),
    ...(query.photographyStatus ? { photographyStatus: query.photographyStatus } : {}),
    ...(query.year ? { year: query.year } : {}),
    ...(query.minPrice != null || query.maxPrice != null
      ? { salePrice: { gte: query.minPrice, lte: query.maxPrice } }
      : {}),
    ...(query.minKm != null || query.maxKm != null
      ? { mileage: { gte: query.minKm, lte: query.maxKm } }
      : {}),
    ...(query.availableOnly || query.catalog || query.inStock
      ? {
          status: {
            ...(query.availableOnly || query.catalog ? { isAvailableForSale: true } : {}),
            ...(query.inStock ? { code: { notIn: ["ENTREGUE", "DEVOLVIDO"] } } : {}),
          },
        }
      : {}),
    ...(query.sellerId
      ? { sales: { some: { sellerId: query.sellerId, cancelledAt: null } } }
      : {}),
    ...(query.q
      ? {
          OR: [
            { make: { contains: query.q, mode: "insensitive" } },
            { model: { contains: query.q, mode: "insensitive" } },
            { version: { contains: query.q, mode: "insensitive" } },
            { vin: { contains: query.q, mode: "insensitive" } },
            { internalCode: { contains: query.q, mode: "insensitive" } },
            ...(plate ? [{ licensePlateNormalized: { contains: plate } }] : []),
          ],
        }
      : {}),
  };

  const rows = await prisma.vehicle.findMany({
    where,
    include: vehicleInclude,
  });

  let mapped = rows.map((row) => mapVehicle(row, actor, settings));
  if (query.minDays != null) mapped = mapped.filter((row) => row.daysInStock >= query.minDays!);
  if (query.maxDays != null) mapped = mapped.filter((row) => row.daysInStock <= query.maxDays!);

  mapped.sort((a, b) => {
    switch (query.sort) {
      case "oldest":
        return a.entryDate.getTime() - b.entryDate.getTime();
      case "days_desc":
        return b.daysInStock - a.daysInStock;
      case "days_asc":
        return a.daysInStock - b.daysInStock;
      case "price_asc":
        return (a.salePrice ?? Number.POSITIVE_INFINITY) - (b.salePrice ?? Number.POSITIVE_INFINITY);
      case "price_desc":
        return (b.salePrice ?? -1) - (a.salePrice ?? -1);
      case "km_asc":
        return (a.mileage ?? Number.POSITIVE_INFINITY) - (b.mileage ?? Number.POSITIVE_INFINITY);
      case "km_desc":
        return (b.mileage ?? -1) - (a.mileage ?? -1);
      default:
        return b.createdAt.getTime() - a.createdAt.getTime();
    }
  });

  const total = mapped.length;
  const items = mapped.slice((page - 1) * pageSize, page * pageSize);
  return { items, total, page, pageSize };
}

export async function getVehicleById(actor: Actor, id: string) {
  const settings = await getStockSettings();
  const vehicle = await prisma.vehicle.findFirst({
    where: { id, deletedAt: null },
    include: {
      ...vehicleInclude,
      events: { include: { user: { select: { id: true, name: true } } }, orderBy: { occurredAt: "desc" } },
      locationHistory: { orderBy: { changedAt: "desc" }, take: 20 },
      priceHistory: { include: { changedBy: { select: { id: true, name: true } } }, orderBy: { changedAt: "desc" } },
      statusHistory: {
        include: { fromStatus: true, toStatus: true, changedBy: { select: { id: true, name: true } } },
        orderBy: { changedAt: "desc" },
        take: 20,
      },
    },
  });
  if (!vehicle) throw new AppError("Viatura não encontrada.", "NOT_FOUND", 404);
  return {
    vehicle: mapVehicle(vehicle, actor, settings),
    events: vehicle.events,
    locationHistory: vehicle.locationHistory,
    priceHistory: vehicle.priceHistory,
    statusHistory: vehicle.statusHistory,
  };
}

export async function createVehicle(actor: Actor, input: VehicleWritableFields) {
  if (!can(actor, "vehicle:create")) {
    throw new AppError("Não tem permissão para criar viaturas.", "FORBIDDEN", 403);
  }
  const sanitized = sanitizeVehiclePatch(input, actor.roleCode, actor.permissions);
  const plate = normalizePlate(sanitized.licensePlate ?? null);
  const statusId = sanitized.statusId;
  if (!statusId || !sanitized.vehicleTypeId || !sanitized.make || !sanitized.model || !sanitized.entryDate) {
    throw new AppError("Dados obrigatórios em falta.", "VALIDATION");
  }

  const vehicle = await prisma.vehicle.create({
    data: {
      internalCode: await generateInternalCode(),
      make: sanitized.make,
      model: sanitized.model,
      version: emptyToNull(sanitized.version),
      generation: emptyToNull(sanitized.generation),
      bodyType: emptyToNull(sanitized.bodyType),
      licensePlate: emptyToNull(sanitized.licensePlate),
      licensePlateNormalized: plate,
      vin: emptyToNull(sanitized.vin),
      color: emptyToNull(sanitized.color),
      year: sanitized.year ?? null,
      firstRegistrationDate: parseDate(sanitized.firstRegistrationDate),
      fuelType: emptyToNull(sanitized.fuelType),
      transmission: emptyToNull(sanitized.transmission),
      powerHp: sanitized.powerHp ?? null,
      engineSizeCc: sanitized.engineSizeCc ?? null,
      doors: sanitized.doors ?? null,
      seats: sanitized.seats ?? null,
      entryDate: parseDate(sanitized.entryDate) ?? new Date(),
      renewal: Boolean(sanitized.renewal),
      inspectionDate: parseDate(sanitized.inspectionDate),
      mileage: sanitized.mileage ?? null,
      passport: sanitized.passport ?? null,
      numberOfKeys: sanitized.numberOfKeys ?? null,
      vehicleTypeId: sanitized.vehicleTypeId,
      sourceId: emptyToNull(sanitized.sourceId),
      statusId,
      locationId: emptyToNull(sanitized.locationId),
      commercialSupport: Boolean(sanitized.commercialSupport),
      commercialSupportAmount: toDecimal(sanitized.commercialSupportAmount),
      originNotes: emptyToNull(sanitized.originNotes),
      originEntity: emptyToNull(sanitized.originEntity),
      salePrice: toDecimal(sanitized.salePrice),
      acquisitionPrice: toDecimal(sanitized.acquisitionPrice),
      preparationCost: toDecimal(sanitized.preparationCost),
      photographyStatus: (sanitized.photographyStatus as PhotographyStatus | undefined) ?? "NOT_PHOTOGRAPHED",
      commercialNotes: emptyToNull(sanitized.commercialNotes),
      createdById: actor.id,
    },
    include: vehicleInclude,
  });

  await writeVehicleEvent({
    vehicleId: vehicle.id,
    type: "CREATED",
    title: "Viatura entrou em stock",
    actor,
    next: { make: vehicle.make, model: vehicle.model, licensePlate: vehicle.licensePlate },
  });
  await prisma.vehicleStatusHistory.create({
    data: { vehicleId: vehicle.id, toStatusId: vehicle.statusId, changedById: actor.id },
  });
  if (vehicle.locationId) {
    await prisma.vehicleLocationHistory.create({
      data: {
        vehicleId: vehicle.id,
        toLocation: vehicle.location?.name,
        locationId: vehicle.locationId,
        changedById: actor.id,
      },
    });
  }
  await writeAudit({
    actor,
    action: "CREATE_VEHICLE",
    entityType: "Vehicle",
    entityId: vehicle.id,
    next: { internalCode: vehicle.internalCode },
  });

  const settings = await getStockSettings();
  return mapVehicle(vehicle, actor, settings);
}

export async function updateVehicle(actor: Actor, id: string, input: VehicleWritableFields) {
  if (!can(actor, "vehicle:edit") && !can(actor, "vehicle:change_status") && !can(actor, "vehicle:change_location")) {
    throw new AppError("Não tem permissão para alterar viaturas.", "FORBIDDEN", 403);
  }
  const existing = await prisma.vehicle.findFirst({
    where: { id, deletedAt: null },
    include: { status: true, location: true },
  });
  if (!existing) throw new AppError("Viatura não encontrada.", "NOT_FOUND", 404);

  const sanitized = sanitizeVehiclePatch(input, actor.roleCode, actor.permissions);
  const data: Prisma.VehicleUpdateInput = {};
  const assign = <K extends keyof VehicleWritableFields>(key: K, write: () => void) => {
    if (sanitized[key] !== undefined) write();
  };

  assign("make", () => (data.make = sanitized.make));
  assign("model", () => (data.model = sanitized.model));
  assign("version", () => (data.version = emptyToNull(sanitized.version)));
  assign("generation", () => (data.generation = emptyToNull(sanitized.generation)));
  assign("bodyType", () => (data.bodyType = emptyToNull(sanitized.bodyType)));
  assign("licensePlate", () => {
    data.licensePlate = emptyToNull(sanitized.licensePlate);
    data.licensePlateNormalized = normalizePlate(sanitized.licensePlate ?? null);
  });
  assign("vin", () => (data.vin = emptyToNull(sanitized.vin)));
  assign("color", () => (data.color = emptyToNull(sanitized.color)));
  assign("year", () => (data.year = sanitized.year ?? null));
  assign("firstRegistrationDate", () => (data.firstRegistrationDate = parseDate(sanitized.firstRegistrationDate)));
  assign("fuelType", () => (data.fuelType = emptyToNull(sanitized.fuelType)));
  assign("transmission", () => (data.transmission = emptyToNull(sanitized.transmission)));
  assign("powerHp", () => (data.powerHp = sanitized.powerHp ?? null));
  assign("engineSizeCc", () => (data.engineSizeCc = sanitized.engineSizeCc ?? null));
  assign("doors", () => (data.doors = sanitized.doors ?? null));
  assign("seats", () => (data.seats = sanitized.seats ?? null));
  assign("entryDate", () => (data.entryDate = parseDate(sanitized.entryDate) ?? existing.entryDate));
  assign("renewal", () => (data.renewal = Boolean(sanitized.renewal)));
  assign("inspectionDate", () => (data.inspectionDate = parseDate(sanitized.inspectionDate)));
  assign("mileage", () => (data.mileage = sanitized.mileage ?? null));
  assign("passport", () => (data.passport = sanitized.passport ?? null));
  assign("numberOfKeys", () => (data.numberOfKeys = sanitized.numberOfKeys ?? null));
  assign("vehicleTypeId", () => (data.vehicleType = { connect: { id: sanitized.vehicleTypeId! } }));
  assign("sourceId", () => {
    data.source = sanitized.sourceId ? { connect: { id: sanitized.sourceId } } : { disconnect: true };
  });
  assign("commercialSupport", () => (data.commercialSupport = Boolean(sanitized.commercialSupport)));
  assign("commercialSupportAmount", () => (data.commercialSupportAmount = toDecimal(sanitized.commercialSupportAmount)));
  assign("originNotes", () => (data.originNotes = emptyToNull(sanitized.originNotes)));
  assign("originEntity", () => (data.originEntity = emptyToNull(sanitized.originEntity)));
  assign("photographyStatus", () => {
    data.photographyStatus = sanitized.photographyStatus as PhotographyStatus;
    data.photographyUpdatedAt = new Date();
    data.photographyUpdatedBy = { connect: { id: actor.id } };
  });
  assign("photographyNotes", () => (data.photographyNotes = emptyToNull(sanitized.photographyNotes)));
  assign("commercialNotes", () => (data.commercialNotes = emptyToNull(sanitized.commercialNotes)));
  assign("acquisitionPrice", () => (data.acquisitionPrice = toDecimal(sanitized.acquisitionPrice)));
  assign("preparationCost", () => (data.preparationCost = toDecimal(sanitized.preparationCost)));

  if (sanitized.salePrice !== undefined && sanitized.salePrice !== Number(existing.salePrice ?? NaN)) {
    data.previousPrice = existing.salePrice;
    data.salePrice = toDecimal(sanitized.salePrice);
    data.priceChangedAt = new Date();
  }
  if (sanitized.statusId && sanitized.statusId !== existing.statusId) {
    data.status = { connect: { id: sanitized.statusId } };
  }
  if (sanitized.locationId !== undefined && sanitized.locationId !== existing.locationId) {
    data.location = sanitized.locationId
      ? { connect: { id: sanitized.locationId } }
      : { disconnect: true };
  }

  const updated = await prisma.vehicle.update({
    where: { id },
    data,
    include: vehicleInclude,
  });

  if (sanitized.statusId && sanitized.statusId !== existing.statusId) {
    await prisma.vehicleStatusHistory.create({
      data: {
        vehicleId: id,
        fromStatusId: existing.statusId,
        toStatusId: sanitized.statusId,
        changedById: actor.id,
      },
    });
    await writeVehicleEvent({
      vehicleId: id,
      type: "STATUS_CHANGED",
      title: `Estado alterado: ${existing.status.name} → ${updated.status.name}`,
      actor,
      previous: { status: existing.status.name },
      next: { status: updated.status.name },
    });
  }

  if (sanitized.locationId !== undefined && sanitized.locationId !== existing.locationId) {
    await prisma.vehicleLocationHistory.create({
      data: {
        vehicleId: id,
        fromLocation: existing.location?.name,
        toLocation: updated.location?.name,
        locationId: updated.locationId,
        changedById: actor.id,
      },
    });
    await writeVehicleEvent({
      vehicleId: id,
      type: "LOCATION_CHANGED",
      title: `Localização: ${existing.location?.name ?? "—"} → ${updated.location?.name ?? "—"}`,
      actor,
      previous: { location: existing.location?.name },
      next: { location: updated.location?.name },
    });
  }

  if (sanitized.salePrice !== undefined && Number(existing.salePrice ?? NaN) !== sanitized.salePrice) {
    await prisma.vehiclePriceHistory.create({
      data: {
        vehicleId: id,
        previousPrice: existing.salePrice,
        newPrice: toDecimal(sanitized.salePrice) ?? new Prisma.Decimal(0),
        changedById: actor.id,
      },
    });
    await writeVehicleEvent({
      vehicleId: id,
      type: "PRICE_CHANGED",
      title: "Preço alterado",
      actor,
      previous: { salePrice: existing.salePrice ? Number(existing.salePrice) : null },
      next: { salePrice: sanitized.salePrice },
    });
  }

  await writeVehicleEvent({
    vehicleId: id,
    type: "UPDATED",
    title: "Ficha atualizada",
    actor,
  });
  await writeAudit({
    actor,
    action: "UPDATE_VEHICLE",
    entityType: "Vehicle",
    entityId: id,
    previous: { statusId: existing.statusId, locationId: existing.locationId },
    next: { statusId: updated.statusId, locationId: updated.locationId },
  });

  const settings = await getStockSettings();
  return mapVehicle(updated, actor, settings);
}

export async function deleteVehicle(actor: Actor, id: string) {
  if (!can(actor, "vehicle:delete")) {
    throw new AppError("Não tem permissão para apagar viaturas.", "FORBIDDEN", 403);
  }
  const existing = await prisma.vehicle.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new AppError("Viatura não encontrada.", "NOT_FOUND", 404);
  await prisma.vehicle.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({
    actor,
    action: "DELETE_VEHICLE",
    entityType: "Vehicle",
    entityId: id,
    previous: {
      internalCode: existing.internalCode,
      make: existing.make,
      model: existing.model,
      licensePlate: existing.licensePlate,
      statusId: existing.statusId,
      locationId: existing.locationId,
      sourceId: existing.sourceId,
      salePrice: existing.salePrice?.toString() ?? null,
    },
  });
}

export async function setPrimaryPhoto(actor: Actor, vehicleId: string, photoId: string) {
  if (!can(actor, "photo:manage")) {
    throw new AppError("Não tem permissão para gerir fotografias.", "FORBIDDEN", 403);
  }
  const photo = await prisma.vehiclePhoto.findFirst({
    where: { id: photoId, vehicleId, deletedAt: null },
  });
  if (!photo) throw new AppError("Fotografia não encontrada.", "NOT_FOUND", 404);
  if (photo.isPrimary) return;

  const previous = await prisma.vehiclePhoto.findFirst({
    where: { vehicleId, deletedAt: null, isPrimary: true },
  });

  await prisma.$transaction([
    prisma.vehiclePhoto.updateMany({
      where: { vehicleId, deletedAt: null, isPrimary: true },
      data: { isPrimary: false },
    }),
    prisma.vehiclePhoto.update({ where: { id: photoId }, data: { isPrimary: true } }),
  ]);

  await writeVehicleEvent({
    vehicleId,
    type: "PHOTO_PRIMARY_SET",
    title: "Fotografia principal alterada",
    actor,
    previous: previous ? { photoId: previous.id } : null,
    next: { photoId },
  });
  await writeAudit({
    actor,
    action: "SET_PRIMARY_PHOTO",
    entityType: "Vehicle",
    entityId: vehicleId,
    previous: previous ? { photoId: previous.id } : null,
    next: { photoId },
  });
}

export async function deletePhoto(actor: Actor, photoId: string) {
  if (!can(actor, "photo:manage")) {
    throw new AppError("Não tem permissão para gerir fotografias.", "FORBIDDEN", 403);
  }
  const photo = await prisma.vehiclePhoto.findFirst({
    where: { id: photoId, deletedAt: null },
  });
  if (!photo) throw new AppError("Fotografia não encontrada.", "NOT_FOUND", 404);

  const wasPrimary = photo.isPrimary;
  await prisma.vehiclePhoto.update({
    where: { id: photoId },
    data: { deletedAt: new Date(), isPrimary: false },
  });

  let promotedId: string | null = null;
  if (wasPrimary) {
    const next = await prisma.vehiclePhoto.findFirst({
      where: { vehicleId: photo.vehicleId, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    if (next) {
      await prisma.vehiclePhoto.update({ where: { id: next.id }, data: { isPrimary: true } });
      promotedId = next.id;
    }
  }

  await writeVehicleEvent({
    vehicleId: photo.vehicleId,
    type: "NOTE",
    title: "Fotografia eliminada",
    actor,
    previous: { photoId: photo.id, isPrimary: wasPrimary },
    next: promotedId ? { promotedPhotoId: promotedId } : null,
  });
  if (promotedId) {
    await writeVehicleEvent({
      vehicleId: photo.vehicleId,
      type: "PHOTO_PRIMARY_SET",
      title: "Fotografia principal alterada",
      actor,
      previous: { photoId: photo.id },
      next: { photoId: promotedId },
    });
  }
  await writeAudit({
    actor,
    action: "DELETE_PHOTO",
    entityType: "VehiclePhoto",
    entityId: photo.id,
    previous: {
      vehicleId: photo.vehicleId,
      isPrimary: wasPrimary,
      storageKey: photo.storageKey,
    },
    next: promotedId ? { promotedPhotoId: promotedId } : null,
  });
}

export async function searchGlobal(actor: Actor, q: string) {
  const result = await listVehicles(actor, { q, page: 1, pageSize: 8 });
  return result.items.map((item) => ({
    id: item.id,
    title: `${item.make} ${item.model}`,
    subtitle: [item.version, item.licensePlateDisplay, item.status.name].filter(Boolean).join(" · "),
    href: `/vehicles/${item.id}`,
  }));
}

export async function getLookups() {
  const [statuses, locations, sources, types, users] = await Promise.all([
    prisma.vehicleStatus.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.location.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.vehicleSource.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.vehicleType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true, role: { select: { code: true } } },
      orderBy: { name: "asc" },
    }),
  ]);
  return { statuses, locations, sources, types, users };
}
