-- AlterEnum
ALTER TYPE "VehicleEventType" ADD VALUE 'SALE_CANCELLED';

-- AlterTable
ALTER TABLE "VehicleSale" ADD COLUMN "cancelledReason" TEXT;

-- AlterTable
ALTER TABLE "VehicleReservation" ADD COLUMN "cancelReason" TEXT;
