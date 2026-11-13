export const VEHICLE_LIST_SORTS = [
  "newest",
  "oldest",
  "days_desc",
  "days_asc",
  "price_asc",
  "price_desc",
  "km_asc",
  "km_desc",
  "make_asc",
  "make_desc",
  "plate_asc",
  "plate_desc",
  "location_asc",
  "location_desc",
  "status_asc",
  "status_desc",
  "entry_asc",
  "entry_desc",
] as const;

export type VehicleListSort = (typeof VEHICLE_LIST_SORTS)[number];

export const STATUS_FILTER_NONE = "none";

export const SALE_OUTCOME_CODES = new Set(["VENDIDO", "ENTREGUE"]);

export function isSalesRole(roleCode: string) {
  return roleCode === "SALES";
}

export function isSaleOutcomeStatus(code: string) {
  return SALE_OUTCOME_CODES.has(code);
}

export function operationalStatuses<T extends { code: string; category?: string }>(statuses: T[], currentCode?: string) {
  return statuses.filter((status) => {
    if (isSaleOutcomeStatus(status.code)) return false;
    if (currentCode && status.code === currentCode) return true;
    return !status.category || status.category === "operational";
  });
}

