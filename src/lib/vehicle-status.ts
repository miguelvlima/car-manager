export const COMMERCIAL_STATUS_CODES = [
  "DISPONIVEL_PARA_VENDA",
  "RESERVADO",
  "VENDIDO",
  "AGUARDA_ENTREGA",
] as const;

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

export function isCommercialStatus(code: string) {
  return (COMMERCIAL_STATUS_CODES as readonly string[]).includes(code);
}

export function isSalesRole(roleCode: string) {
  return roleCode === "SALES";
}

export function operationalStatuses<T extends { code: string; category?: string }>(statuses: T[], currentCode?: string) {
  return statuses.filter((status) => {
    if (currentCode && status.code === currentCode) return true;
    if (status.category && status.category !== "operational") return false;
    return !isCommercialStatus(status.code);
  });
}
