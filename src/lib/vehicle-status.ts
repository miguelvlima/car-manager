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

export function isSalesRole(roleCode: string) {
  return roleCode === "SALES";
}

export function operationalStatuses<T extends { code: string; category?: string }>(statuses: T[], currentCode?: string) {
  return statuses.filter((status) => {
    if (currentCode && status.code === currentCode) return true;
    return !status.category || status.category === "operational";
  });
}

const SALE_OUTCOME_CODES = new Set(["ENTREGUE", "VENDIDO"]);

export function saleStatusOverlay(vehicle: {
  status: { code: string };
  activeSale?: { actualDeliveryAt?: Date | string | null } | null;
}) {
  const delivered = Boolean(vehicle.activeSale?.actualDeliveryAt);
  const sold = Boolean(vehicle.activeSale && !delivered);
  return {
    showCatalogStatus: !vehicle.activeSale || !SALE_OUTCOME_CODES.has(vehicle.status.code),
    delivered,
    sold,
  };
}
