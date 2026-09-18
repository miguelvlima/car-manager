import { hasPermission, type PermissionKey } from "../permissions/catalog";

export type VehicleWritableFields = {
  make?: string;
  model?: string;
  version?: string | null;
  generation?: string | null;
  bodyType?: string | null;
  licensePlate?: string | null;
  vin?: string | null;
  color?: string | null;
  year?: number | null;
  firstRegistrationDate?: string | Date | null;
  fuelType?: string | null;
  transmission?: string | null;
  powerHp?: number | null;
  engineSizeCc?: number | null;
  doors?: number | null;
  seats?: number | null;
  entryDate?: string | Date;
  renewal?: boolean;
  inspectionDate?: string | Date | null;
  mileage?: number | null;
  passport?: boolean | null;
  numberOfKeys?: number | null;
  vehicleTypeId?: string;
  sourceId?: string | null;
  statusId?: string;
  locationId?: string | null;
  commercialSupport?: boolean;
  commercialSupportAmount?: number | null;
  originNotes?: string | null;
  originEntity?: string | null;
  salePrice?: number | null;
  acquisitionPrice?: number | null;
  preparationCost?: number | null;
  photographyStatus?: string;
  photographyNotes?: string | null;
  commercialNotes?: string | null;
};

const OPERATIONAL_FIELDS = [
  "entryDate",
  "renewal",
  "mileage",
  "sourceId",
  "vin",
  "originNotes",
  "originEntity",
  "commercialSupport",
  "commercialSupportAmount",
] as const;

export function sanitizeVehiclePatch(
  input: VehicleWritableFields,
  roleCode: string,
  permissions: Iterable<string>,
) {
  const next = { ...input };
  const can = (key: PermissionKey) => hasPermission(roleCode, permissions, key);

  if (!can("vehicle:edit_operational")) {
    for (const field of OPERATIONAL_FIELDS) {
      delete next[field];
    }
  }

  if (!can("vehicle:change_price")) {
    delete next.salePrice;
  }

  if (!can("vehicle:view_acquisition_price")) {
    delete next.acquisitionPrice;
    delete next.preparationCost;
  }

  if (!can("vehicle:change_status")) {
    delete next.statusId;
  }

  if (!can("vehicle:change_location")) {
    delete next.locationId;
  }

  return next;
}
