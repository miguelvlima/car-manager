import { Prisma, type PhotographyStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { normalizePlate } from "@/lib/plate";
import { can, type Actor } from "@/server/permissions/check";
import { writeAudit, writeVehicleEvent } from "@/server/services/audit.service";
import { getStockSettings } from "@/server/services/settings.service";
import { ensureSaleCatalogStatusesSynced } from "@/server/services/sale.service";
import { mapVehicle } from "@/server/services/vehicle-mapper";
import { sanitizeVehiclePatch, type VehicleWritableFields } from "@/server/services/vehicle-sanitize";
import { isButtonCommercialStatus, isSalesRole, STATUS_FILTER_NONE, type VehicleListSort } from "@/lib/vehicle-status";

const vehicleInclude = {
  operationalStatus: true,
  commercialStatus: true,
  location: true,
  source: true,
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
  version?: string;
  operationalStatusId?: string | string[];
  commercialStatusId?: string | string[];
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
  applyDefaultStatusFilter?: boolean;
  sort?: VehicleListSort;
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

function parseStatusIds(value?: string | string[]) {
  const parts = Array.isArray(value) ? value : value ? value.split(",") : [];
  return [...new Set(parts.map((item) => item.trim()).filter((item) => item && item !== STATUS_FILTER_NONE))];
}

function selectedStatusFilter(
  queryValue: string | string[] | undefined,
  statuses: Array<{ id: string; code: string; category: string; filterSelectedByDefault: boolean }>,
  category: "operational" | "commercial",
  applyDefault: boolean | undefined,
) {
  const inCategory = statuses.filter((status) => status.category === category);
  const explicit = queryValue != null && String(queryValue).length > 0;
  const ids = parseStatusIds(queryValue);
  const selected = explicit
    ? inCategory.filter((status) => ids.includes(status.id))
    : applyDefault
      ? inCategory.filter((status) => status.filterSelectedByDefault)
      : [];
  return { explicit, selected };
}

export async function listVehicles(actor: Actor, query: VehicleListQuery) {
  await ensureSaleCatalogStatusesSynced();
  const settings = await getStockSettings();
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(60, Math.max(1, query.pageSize ?? 24));
  const plate = normalizePlate(query.q);
  const sourceId = query.sourceId?.trim() || undefined;
  const catalogStatuses = await prisma.vehicleStatus.findMany({
    where: { isActive: true },
    select: { id: true, code: true, category: true, filterSelectedByDefault: true },
    orderBy: { sortOrder: "asc" },
  });
  const operationalFilter = selectedStatusFilter(
    query.operationalStatusId,
    catalogStatuses,
    "operational",
    query.applyDefaultStatusFilter,
  );
  const commercialFilter = selectedStatusFilter(
    query.commercialStatusId,
    catalogStatuses,
    "commercial",
    query.applyDefaultStatusFilter,
  );
  const includeDelivered = commercialFilter.selected.some(
    (status) => status.code === "ENTREGUE" || status.code === "DEVOLVIDO",
  );
  const hideDelivered = query.availableOnly || query.catalog || query.inStock || !includeDelivered;
  const clauses: Prisma.VehicleWhereInput[] = [
    { deletedAt: null },
    ...(query.make ? [{ make: { equals: query.make, mode: "insensitive" as const } }] : []),
    ...(query.model ? [{ model: { equals: query.model, mode: "insensitive" as const } }] : []),
    ...(query.version ? [{ version: { equals: query.version, mode: "insensitive" as const } }] : []),
    ...(operationalFilter.selected.length
      ? [{ operationalStatusId: { in: operationalFilter.selected.map((status) => status.id) } }]
      : operationalFilter.explicit
        ? [{ id: { in: ["__no_status__"] } }]
        : []),
    ...(commercialFilter.selected.length
      ? [{ commercialStatusId: { in: commercialFilter.selected.map((status) => status.id) } }]
      : commercialFilter.explicit
        ? [{ id: { in: ["__no_status__"] } }]
        : []),
    ...(query.locationId ? [{ locationId: query.locationId }] : []),
    ...(sourceId ? [{ sourceId }] : []),
    ...(query.photographyStatus ? [{ photographyStatus: query.photographyStatus }] : []),
    ...(query.year ? [{ year: query.year }] : []),
    ...(query.minPrice != null || query.maxPrice != null
      ? [{ salePrice: { gte: query.minPrice, lte: query.maxPrice } }]
      : []),
    ...(query.minKm != null || query.maxKm != null
      ? [{ mileage: { gte: query.minKm, lte: query.maxKm } }]
      : []),
    ...(hideDelivered
      ? [
          {
            AND: [
              { NOT: { sales: { some: { cancelledAt: null, actualDeliveryAt: { not: null } } } } },
              { commercialStatus: { code: { notIn: ["ENTREGUE", "DEVOLVIDO"] } } },
            ],
          },
        ]
      : []),
    ...(query.sellerId ? [{ sales: { some: { sellerId: query.sellerId, cancelledAt: null } } }] : []),
    ...(query.q
      ? [
          {
            OR: [
              { make: { contains: query.q, mode: "insensitive" as const } },
              { model: { contains: query.q, mode: "insensitive" as const } },
              { version: { contains: query.q, mode: "insensitive" as const } },
              { internalCode: { contains: query.q, mode: "insensitive" as const } },
              { source: { name: { contains: query.q, mode: "insensitive" as const } } },
              ...(plate ? [{ licensePlateNormalized: { contains: plate } }] : []),
            ],
          },
        ]
      : []),
  ];
  const where: Prisma.VehicleWhereInput = { AND: clauses };

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
      case "make_asc":
        return `${a.make} ${a.model} ${a.version ?? ""}`.localeCompare(`${b.make} ${b.model} ${b.version ?? ""}`, "pt");
      case "make_desc":
        return `${b.make} ${b.model} ${b.version ?? ""}`.localeCompare(`${a.make} ${a.model} ${a.version ?? ""}`, "pt");
      case "plate_asc":
        return (a.licensePlateDisplay ?? "").localeCompare(b.licensePlateDisplay ?? "", "pt");
      case "plate_desc":
        return (b.licensePlateDisplay ?? "").localeCompare(a.licensePlateDisplay ?? "", "pt");
      case "location_asc":
        return (a.location?.name ?? "").localeCompare(b.location?.name ?? "", "pt");
      case "location_desc":
        return (b.location?.name ?? "").localeCompare(a.location?.name ?? "", "pt");
      case "status_asc":
      case "operational_asc":
        return a.operationalStatus.name.localeCompare(b.operationalStatus.name, "pt")
          || a.commercialStatus.name.localeCompare(b.commercialStatus.name, "pt");
      case "status_desc":
      case "operational_desc":
        return b.operationalStatus.name.localeCompare(a.operationalStatus.name, "pt")
          || b.commercialStatus.name.localeCompare(a.commercialStatus.name, "pt");
      case "commercial_asc":
        return a.commercialStatus.name.localeCompare(b.commercialStatus.name, "pt")
          || a.operationalStatus.name.localeCompare(b.operationalStatus.name, "pt");
      case "commercial_desc":
        return b.commercialStatus.name.localeCompare(a.commercialStatus.name, "pt")
          || b.operationalStatus.name.localeCompare(a.operationalStatus.name, "pt");
      case "entry_asc":
        return a.entryDate.getTime() - b.entryDate.getTime();
      case "entry_desc":
        return b.entryDate.getTime() - a.entryDate.getTime();
      default:
        return b.createdAt.getTime() - a.createdAt.getTime();
    }
  });

  const total = mapped.length;
  const items = mapped.slice((page - 1) * pageSize, page * pageSize);
  return { items, total, page, pageSize };
}

export async function getVehicleById(actor: Actor, id: string) {
  await ensureSaleCatalogStatusesSynced();
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
  const delivered = vehicle.sales.some((sale) => !sale.cancelledAt && sale.actualDeliveryAt);
  if (isSalesRole(actor.roleCode) && delivered) {
    throw new AppError("Viatura não encontrada.", "NOT_FOUND", 404);
  }
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
  const [entering, available] = await Promise.all([
    prisma.vehicleStatus.findUnique({ where: { code: "A_ENTRAR" } }),
    prisma.vehicleStatus.findUnique({ where: { code: "DISPONIVEL_PARA_VENDA" } }),
  ]);
  if (!entering || !available || !sanitized.make || !sanitized.model || !sanitized.entryDate) {
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
      sourceId: emptyToNull(sanitized.sourceId),
      operationalStatusId: entering.id,
      commercialStatusId: available.id,
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
      inspectionReportUrl: emptyToNull(sanitized.inspectionReportUrl),
      transportGuideUrl: emptyToNull(sanitized.transportGuideUrl),
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
  await prisma.vehicleStatusHistory.createMany({
    data: [
      { vehicleId: vehicle.id, kind: "operational", toStatusId: vehicle.operationalStatusId, changedById: actor.id },
      { vehicleId: vehicle.id, kind: "commercial", toStatusId: vehicle.commercialStatusId, changedById: actor.id },
    ],
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
    include: {
      operationalStatus: true,
      commercialStatus: true,
      location: true,
      sales: { where: { cancelledAt: null }, select: { id: true } },
    },
  });
  if (!existing) throw new AppError("Viatura não encontrada.", "NOT_FOUND", 404);

  const sanitized = sanitizeVehiclePatch(input, actor.roleCode, actor.permissions);
  if (sanitized.operationalStatusId && sanitized.operationalStatusId !== existing.operationalStatusId) {
    const nextStatus = await prisma.vehicleStatus.findUnique({ where: { id: sanitized.operationalStatusId } });
    if (!nextStatus || nextStatus.category !== "operational") {
      throw new AppError("Estado operacional inválido.", "VALIDATION");
    }
  }
  if (sanitized.commercialStatusId && sanitized.commercialStatusId !== existing.commercialStatusId) {
    const nextStatus = await prisma.vehicleStatus.findUnique({ where: { id: sanitized.commercialStatusId } });
    if (!nextStatus || nextStatus.category !== "commercial") {
      throw new AppError("Estado comercial inválido.", "VALIDATION");
    }
    if (isButtonCommercialStatus(nextStatus.code)) {
      throw new AppError("Vendido, Entregue e Devolvido só se definem pelos botões da ficha.", "CONFLICT");
    }
    if (existing.sales.length || isButtonCommercialStatus(existing.commercialStatus.code)) {
      throw new AppError(
        "Enquanto a viatura estiver vendida, entregue ou devolvida, o estado comercial só muda pelos botões da ficha.",
        "CONFLICT",
      );
    }
  }
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
  assign("inspectionReportUrl", () => (data.inspectionReportUrl = emptyToNull(sanitized.inspectionReportUrl)));
  assign("transportGuideUrl", () => (data.transportGuideUrl = emptyToNull(sanitized.transportGuideUrl)));

  if (sanitized.salePrice !== undefined && sanitized.salePrice !== Number(existing.salePrice ?? NaN)) {
    data.previousPrice = existing.salePrice;
    data.salePrice = toDecimal(sanitized.salePrice);
    data.priceChangedAt = new Date();
  }
  if (sanitized.operationalStatusId && sanitized.operationalStatusId !== existing.operationalStatusId) {
    data.operationalStatus = { connect: { id: sanitized.operationalStatusId } };
  }
  if (sanitized.commercialStatusId && sanitized.commercialStatusId !== existing.commercialStatusId) {
    data.commercialStatus = { connect: { id: sanitized.commercialStatusId } };
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

  if (sanitized.operationalStatusId && sanitized.operationalStatusId !== existing.operationalStatusId) {
    await prisma.vehicleStatusHistory.create({
      data: {
        vehicleId: id,
        kind: "operational",
        fromStatusId: existing.operationalStatusId,
        toStatusId: sanitized.operationalStatusId,
        changedById: actor.id,
      },
    });
    await writeVehicleEvent({
      vehicleId: id,
      type: "STATUS_CHANGED",
      title: `Estado operacional: ${existing.operationalStatus.name} → ${updated.operationalStatus.name}`,
      actor,
      previous: { operationalStatus: existing.operationalStatus.name },
      next: { operationalStatus: updated.operationalStatus.name },
    });
  }
  if (sanitized.commercialStatusId && sanitized.commercialStatusId !== existing.commercialStatusId) {
    await prisma.vehicleStatusHistory.create({
      data: {
        vehicleId: id,
        kind: "commercial",
        fromStatusId: existing.commercialStatusId,
        toStatusId: sanitized.commercialStatusId,
        changedById: actor.id,
      },
    });
    await writeVehicleEvent({
      vehicleId: id,
      type: "STATUS_CHANGED",
      title: `Estado comercial: ${existing.commercialStatus.name} → ${updated.commercialStatus.name}`,
      actor,
      previous: { commercialStatus: existing.commercialStatus.name },
      next: { commercialStatus: updated.commercialStatus.name },
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
    previous: {
      operationalStatusId: existing.operationalStatusId,
      commercialStatusId: existing.commercialStatusId,
      locationId: existing.locationId,
    },
    next: {
      operationalStatusId: updated.operationalStatusId,
      commercialStatusId: updated.commercialStatusId,
      locationId: updated.locationId,
    },
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
      operationalStatusId: existing.operationalStatusId,
      commercialStatusId: existing.commercialStatusId,
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
    subtitle: [item.version, item.licensePlateDisplay, item.operationalStatus.name, item.commercialStatus.name]
      .filter(Boolean)
      .join(" · "),
    href: `/vehicles/${item.id}`,
  }));
}

export async function getLookups() {
  const [statuses, locations, sources, users, makes, models, versions] = await Promise.all([
    prisma.vehicleStatus.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.location.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.vehicleSource.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true, role: { select: { code: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.vehicle.findMany({ where: { deletedAt: null }, distinct: ["make"], select: { make: true }, orderBy: { make: "asc" } }),
    prisma.vehicle.findMany({ where: { deletedAt: null, model: { not: "" } }, distinct: ["model"], select: { model: true }, orderBy: { model: "asc" } }),
    prisma.vehicle.findMany({
      where: { deletedAt: null, version: { not: null } },
      distinct: ["version"],
      select: { version: true },
      orderBy: { version: "asc" },
    }),
  ]);
  return {
    statuses,
    locations,
    sources: sources.filter((item) => item.isActive),
    users,
    makes: makes.map((item) => item.make).filter(Boolean),
    models: models.map((item) => item.model).filter(Boolean),
    versions: versions.map((item) => item.version).filter((item): item is string => Boolean(item)),
  };
}
