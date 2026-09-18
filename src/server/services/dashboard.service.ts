import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/utils";

export function monthBounds(yearMonth?: string) {
  const now = new Date();
  const [year, month] = yearMonth
    ? yearMonth.split("-").map(Number)
    : [now.getFullYear(), now.getMonth() + 1];
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end, year, month, yearMonth: `${year}-${String(month).padStart(2, "0")}` };
}

export async function getDashboardMetrics() {
  const vehicles = await prisma.vehicle.findMany({
    where: { deletedAt: null },
    include: { status: true },
  });
  const active = vehicles.filter((vehicle) => !["ENTREGUE", "DEVOLVIDO"].includes(vehicle.status.code));
  return {
    totalStock: active.length,
    available: vehicles.filter((vehicle) => vehicle.status.isAvailableForSale).length,
  };
}

export async function getSalesReport({
  yearMonth,
  sellerId,
}: {
  yearMonth?: string;
  sellerId?: string;
}) {
  const period = monthBounds(yearMonth);
  const sales = await prisma.vehicleSale.findMany({
    where: {
      cancelledAt: null,
      soldAt: { gte: period.start, lt: period.end },
      ...(sellerId ? { sellerId } : {}),
    },
    include: {
      seller: { select: { id: true, name: true } },
      vehicle: {
        select: {
          id: true,
          make: true,
          model: true,
          version: true,
          licensePlate: true,
          status: { select: { name: true, color: true, code: true } },
        },
      },
    },
    orderBy: { soldAt: "desc" },
  });

  const bySeller = new Map<string, { id: string; name: string; count: number; volume: number }>();
  for (const sale of sales) {
    const current = bySeller.get(sale.sellerId) ?? {
      id: sale.sellerId,
      name: sale.seller.name,
      count: 0,
      volume: 0,
    };
    current.count += 1;
    current.volume += toNumber(sale.finalPrice) ?? 0;
    bySeller.set(sale.sellerId, current);
  }

  const sellers = [...bySeller.values()].sort((a, b) => b.count - a.count || b.volume - a.volume);
  const volume = sellers.reduce((sum, item) => sum + item.volume, 0);

  return {
    period,
    count: sales.length,
    volume,
    sellers,
    items: sales.map((sale) => ({
      id: sale.id,
      soldAt: sale.soldAt,
      finalPrice: toNumber(sale.finalPrice),
      seller: sale.seller,
      vehicle: sale.vehicle,
    })),
  };
}
