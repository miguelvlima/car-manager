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
  "operational_asc",
  "operational_desc",
  "commercial_asc",
  "commercial_desc",
  "entry_asc",
  "entry_desc",
] as const;

export type VehicleListSort = (typeof VEHICLE_LIST_SORTS)[number];

export const STATUS_FILTER_NONE = "none";

export const BUTTON_COMMERCIAL_CODES = new Set(["VENDIDO", "ENTREGUE", "DEVOLVIDO"]);
export const SALE_OUTCOME_CODES = new Set(["VENDIDO", "ENTREGUE"]);

export function isSalesRole(roleCode: string) {
  return roleCode === "SALES";
}

export function isButtonCommercialStatus(code: string) {
  return BUTTON_COMMERCIAL_CODES.has(code);
}

export function isSaleOutcomeStatus(code: string) {
  return SALE_OUTCOME_CODES.has(code);
}

export function statusesByCategory<T extends { category?: string }>(statuses: T[], category: "operational" | "commercial") {
  return statuses.filter((status) => status.category === category);
}

export function dropdownCommercialStatuses<T extends { code: string; category?: string }>(statuses: T[]) {
  return statuses.filter((status) => status.category === "commercial" && !isButtonCommercialStatus(status.code));
}
