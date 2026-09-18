import { prisma } from "@/lib/db";
import {
  DEFAULT_STOCK_SETTINGS,
  type StockAlertSettings,
} from "@/lib/stock";

const KEYS = {
  stock: "stock.alerts",
} as const;

export async function getStockSettings(): Promise<StockAlertSettings> {
  const row = await prisma.appSetting.findUnique({ where: { key: KEYS.stock } });
  if (!row || typeof row.value !== "object" || row.value === null) {
    return DEFAULT_STOCK_SETTINGS;
  }
  return { ...DEFAULT_STOCK_SETTINGS, ...(row.value as Partial<StockAlertSettings>) };
}

export async function saveStockSettings(value: StockAlertSettings, userId?: string) {
  await prisma.appSetting.upsert({
    where: { key: KEYS.stock },
    update: { value, updatedById: userId },
    create: { key: KEYS.stock, value, updatedById: userId },
  });
  return value;
}
