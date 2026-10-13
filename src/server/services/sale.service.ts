import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { can, type Actor } from "@/server/permissions/check";
import { writeAudit, writeVehicleEvent } from "@/server/services/audit.service";
import { getStockSettings } from "@/server/services/settings.service";
import { mapVehicle } from "@/server/services/vehicle-mapper";

export async function registerSale(
  actor: Actor,
  input: {
    vehicleId: string;
    soldAt: string;
    sellerId?: string;
    finalPrice: number;
    notes?: string | null;
  },
) {
  if (!can(actor, "vehicle:register_sale")) {
    throw new AppError("Não tem permissão para registar vendas.", "FORBIDDEN", 403);
  }

  const sellerId = can(actor, "vehicle:change_seller") && input.sellerId ? input.sellerId : actor.id;
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: input.vehicleId, deletedAt: null },
    include: { status: true, photos: true, location: true, source: true, sales: { include: { seller: { select: { id: true, name: true } } } } },
  });
  if (!vehicle) throw new AppError("Viatura não encontrada.", "NOT_FOUND", 404);
  if (vehicle.sales.some((sale) => !sale.cancelledAt)) {
    throw new AppError("Esta viatura já está marcada como vendida.", "CONFLICT");
  }

  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.vehicleSale.create({
      data: {
        vehicleId: vehicle.id,
        soldAt: new Date(input.soldAt),
        sellerId,
        finalPrice: input.finalPrice,
        notes: input.notes || null,
      },
      include: { seller: { select: { id: true, name: true } } },
    });

    await tx.vehicle.update({
      where: { id: vehicle.id },
      data: { salePrice: input.finalPrice },
    });

    return created;
  });

  await writeVehicleEvent({
    vehicleId: vehicle.id,
    type: "SALE_REGISTERED",
    title: `Vendida — ${sale.seller.name}`,
    actor,
    next: { finalPrice: input.finalPrice, sellerId },
    notes: input.notes,
  });
  await writeAudit({
    actor,
    action: "REGISTER_SALE",
    entityType: "Vehicle",
    entityId: vehicle.id,
    previous: { salePrice: vehicle.salePrice ? Number(vehicle.salePrice) : null },
    next: { sellerId, finalPrice: input.finalPrice },
  });

  const fresh = await prisma.vehicle.findFirstOrThrow({
    where: { id: vehicle.id },
    include: {
      status: true,
      location: true,
      source: true,
      photos: { where: { deletedAt: null } },
      sales: { where: { cancelledAt: null }, include: { seller: { select: { id: true, name: true } } } },
    },
  });
  return mapVehicle(fresh, actor, await getStockSettings());
}

export async function markDelivered(actor: Actor, input: { vehicleId: string; actualDeliveryAt: string }) {
  if (!can(actor, "vehicle:mark_delivered")) {
    throw new AppError("Não tem permissão para marcar a entrega.", "FORBIDDEN", 403);
  }
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: input.vehicleId, deletedAt: null },
    include: {
      sales: { where: { cancelledAt: null }, orderBy: { soldAt: "desc" }, take: 1, include: { seller: { select: { id: true, name: true } } } },
    },
  });
  if (!vehicle) throw new AppError("Viatura não encontrada.", "NOT_FOUND", 404);
  const sale = vehicle.sales[0];
  if (!sale) throw new AppError("Marque a viatura como vendida antes de a dar como entregue.", "CONFLICT");
  if (sale.actualDeliveryAt) throw new AppError("Esta viatura já tem data de entrega.", "CONFLICT");

  const deliveredAt = new Date(input.actualDeliveryAt);
  if (Number.isNaN(deliveredAt.getTime())) throw new AppError("Data de entrega inválida.", "VALIDATION");

  await prisma.vehicleSale.update({
    where: { id: sale.id },
    data: { actualDeliveryAt: deliveredAt },
  });

  await writeVehicleEvent({
    vehicleId: vehicle.id,
    type: "DELIVERED",
    title: `Entregue em ${deliveredAt.toISOString().slice(0, 10)}`,
    actor,
    next: { actualDeliveryAt: deliveredAt.toISOString() },
  });
  await writeAudit({
    actor,
    action: "MARK_DELIVERED",
    entityType: "Vehicle",
    entityId: vehicle.id,
    next: { saleId: sale.id, actualDeliveryAt: deliveredAt.toISOString() },
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
  if (sale.actualDeliveryAt) {
    throw new AppError("Não é possível anular uma venda já entregue.", "CONFLICT");
  }

  await prisma.vehicleSale.update({
    where: { id: sale.id },
    data: { cancelledAt: new Date() },
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
    next: { reason: input.reason },
    notes: input.reason,
  });
  await writeAudit({
    actor,
    action: "CANCEL_SALE",
    entityType: "Vehicle",
    entityId: vehicle.id,
    previous: { status: vehicle.status.code, saleId: sale.id, sellerId: sale.sellerId, finalPrice: Number(sale.finalPrice) },
    next: { reason: input.reason },
  });
}
