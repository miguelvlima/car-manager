export type StockAgeLevel = "normal" | "warning" | "alert" | "critical";

export type StockAlertSettings = {
  renewalOffsetDays: number;
  yellowFromDays: number;
  orangeFromDays: number;
  redFromDays: number;
};

export const DEFAULT_STOCK_SETTINGS: StockAlertSettings = {
  renewalOffsetDays: 90,
  yellowFromDays: 31,
  orangeFromDays: 61,
  redFromDays: 91,
};

export function calculateDaysInStock(
  entryDate: Date,
  renewal: boolean,
  renewalOffsetDays = DEFAULT_STOCK_SETTINGS.renewalOffsetDays,
  now = new Date(),
) {
  const diff = Math.floor((now.getTime() - entryDate.getTime()) / 86_400_000);
  const days = renewal ? diff - renewalOffsetDays : diff;
  return Math.max(0, days);
}

export function stockAgeLevel(
  days: number,
  settings: Pick<StockAlertSettings, "yellowFromDays" | "orangeFromDays" | "redFromDays"> = DEFAULT_STOCK_SETTINGS,
): StockAgeLevel {
  if (days >= settings.redFromDays) return "critical";
  if (days >= settings.orangeFromDays) return "alert";
  if (days >= settings.yellowFromDays) return "warning";
  return "normal";
}

export function daysToEntryDateThreshold(days: number, now = new Date()) {
  const copy = new Date(now);
  copy.setDate(copy.getDate() - days);
  return copy;
}
