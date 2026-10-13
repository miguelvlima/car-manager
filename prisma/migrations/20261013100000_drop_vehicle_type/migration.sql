ALTER TABLE "Vehicle" DROP CONSTRAINT "Vehicle_vehicleTypeId_fkey";
ALTER TABLE "Vehicle" DROP COLUMN "vehicleTypeId";
DROP TABLE "VehicleType";
