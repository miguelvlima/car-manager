import type { Location, Vehicle, VehiclePhoto, VehicleSale, VehicleSource, VehicleStatus, VehicleType, User } from "@prisma/client";
import { formatPlate, maskPlate } from "@/lib/plate";
import { calculateDaysInStock, stockAgeLevel, type StockAlertSettings } from "@/lib/stock";
import { toNumber } from "@/lib/utils";
import { can, type Actor } from "@/server/permissions/check";

type VehicleWithRelations = Vehicle & {
  status: VehicleStatus;
  location: Location | null;
  source: VehicleSource | null;
  vehicleType: VehicleType;
  photos: VehiclePhoto[];
  sales?: (VehicleSale & { seller: Pick<User, "id" | "name"> })[];
};

export type VehicleAlert = {
  code: string;
  label: string;
  tone: "warning" | "alert" | "critical";
};

export function mapVehicle(vehicle: VehicleWithRelations, actor: Actor, settings: StockAlertSettings, now = new Date()) {
  const daysInStock = calculateDaysInStock(vehicle.entryDate, vehicle.renewal, settings.renewalOffsetDays, now);
  const ageLevel = stockAgeLevel(daysInStock, settings);
  const canSeePlate = can(actor, "vehicle:view_license_plate");
  const canSeeAcquisition = can(actor, "vehicle:view_acquisition_price");
  const salePrice = toNumber(vehicle.salePrice);
  const acquisitionPrice = toNumber(vehicle.acquisitionPrice);
  const preparationCost = toNumber(vehicle.preparationCost);
  const activeSale = vehicle.sales?.find((sale) => !sale.cancelledAt) ?? null;
  const primaryPhoto = vehicle.photos.find((photo) => photo.isPrimary && !photo.deletedAt) ?? vehicle.photos.find((photo) => !photo.deletedAt);

  const alerts: VehicleAlert[] = [];
  if (daysInStock >= settings.yellowFromDays) {
    alerts.push({
      code: "stock_age",
      label: `${daysInStock} dias em stock`,
      tone: ageLevel === "critical" ? "critical" : ageLevel === "alert" ? "alert" : "warning",
    });
  }
  if (!primaryPhoto) alerts.push({ code: "no_photo", label: "Sem fotografia", tone: "warning" });
  if (salePrice == null) alerts.push({ code: "no_price", label: "Sem preço", tone: "warning" });
  if (!vehicle.locationId) alerts.push({ code: "no_location", label: "Sem localização", tone: "warning" });
  if (vehicle.inspectionDate) {
    const daysToIpo = Math.ceil((vehicle.inspectionDate.getTime() - now.getTime()) / 86_400_000);
    if (daysToIpo <= 60) {
      alerts.push({
        code: "ipo",
        label: daysToIpo < 0 ? "IPO expirada" : `IPO expira em ${daysToIpo} dias`,
        tone: daysToIpo <= 15 ? "critical" : "alert",
      });
    }
  }
  if (activeSale && !activeSale.actualDeliveryAt) {
    alerts.push({ code: "sold_pending_delivery", label: "Vendida mas ainda não entregue", tone: "alert" });
  }

  return {
    id: vehicle.id,
    internalCode: vehicle.internalCode,
    make: vehicle.make,
    model: vehicle.model,
    version: vehicle.version,
    generation: vehicle.generation,
    bodyType: vehicle.bodyType,
    licensePlate: canSeePlate ? vehicle.licensePlate : maskPlate(vehicle.licensePlate),
    licensePlateDisplay: canSeePlate ? formatPlate(vehicle.licensePlate) : maskPlate(vehicle.licensePlate),
    vin: canSeePlate ? vehicle.vin : null,
    color: vehicle.color,
    year: vehicle.year,
    firstRegistrationDate: vehicle.firstRegistrationDate,
    fuelType: vehicle.fuelType,
    transmission: vehicle.transmission,
    powerHp: vehicle.powerHp,
    engineSizeCc: vehicle.engineSizeCc,
    doors: vehicle.doors,
    seats: vehicle.seats,
    entryDate: vehicle.entryDate,
    renewal: vehicle.renewal,
    daysInStock,
    ageLevel,
    inspectionDate: vehicle.inspectionDate,
    mileage: vehicle.mileage,
    passport: vehicle.passport,
    numberOfKeys: vehicle.numberOfKeys,
    commercialSupport: vehicle.commercialSupport,
    commercialSupportAmount: toNumber(vehicle.commercialSupportAmount),
    originNotes: vehicle.originNotes,
    originEntity: vehicle.originEntity,
    salePrice,
    previousPrice: toNumber(vehicle.previousPrice),
    priceChangedAt: vehicle.priceChangedAt,
    acquisitionPrice: canSeeAcquisition ? acquisitionPrice : null,
    preparationCost: canSeeAcquisition ? preparationCost : null,
    estimatedMargin:
      canSeeAcquisition && salePrice != null && acquisitionPrice != null
        ? salePrice - acquisitionPrice - (preparationCost ?? 0)
        : null,
    photographyStatus: vehicle.photographyStatus,
    photographyNotes: vehicle.photographyNotes,
    commercialNotes: vehicle.commercialNotes,
    needsImportReview: vehicle.needsImportReview,
    status: vehicle.status,
    location: vehicle.location,
    source: vehicle.source,
    vehicleType: vehicle.vehicleType,
    primaryPhotoUrl: primaryPhoto?.url ?? null,
    photos: vehicle.photos.filter((photo) => !photo.deletedAt),
    activeSale: activeSale
      ? {
          id: activeSale.id,
          soldAt: activeSale.soldAt,
          finalPrice: toNumber(activeSale.finalPrice),
          customerRef: activeSale.customerRef,
          expectedDeliveryAt: activeSale.expectedDeliveryAt,
          actualDeliveryAt: activeSale.actualDeliveryAt,
          seller: activeSale.seller,
        }
      : null,
    alerts,
    createdAt: vehicle.createdAt,
    updatedAt: vehicle.updatedAt,
  };
}

export type VehicleDTO = ReturnType<typeof mapVehicle>;
