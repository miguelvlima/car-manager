ALTER TABLE "VehicleStatus" ADD COLUMN "filterSelectedByDefault" BOOLEAN NOT NULL DEFAULT true;

UPDATE "VehicleStatus" SET "filterSelectedByDefault" = false WHERE "code" = 'ENTREGUE';
