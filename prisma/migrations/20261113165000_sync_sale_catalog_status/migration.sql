INSERT INTO "VehicleStatusHistory" ("id", "vehicleId", "fromStatusId", "toStatusId", "changedAt", "notes")
SELECT
  concat('c', substr(md5(v.id || ':entregue'), 1, 24)),
  v.id,
  v."statusId",
  s.id,
  NOW(),
  'Sincronização automática: viatura entregue'
FROM "Vehicle" v
CROSS JOIN "VehicleStatus" s
WHERE s.code = 'ENTREGUE'
  AND v."deletedAt" IS NULL
  AND v."statusId" <> s.id
  AND EXISTS (
    SELECT 1
    FROM "VehicleSale" sale
    WHERE sale."vehicleId" = v.id
      AND sale."cancelledAt" IS NULL
      AND sale."actualDeliveryAt" IS NOT NULL
  );

UPDATE "Vehicle" v
SET "statusId" = s.id
FROM "VehicleStatus" s
WHERE s.code = 'ENTREGUE'
  AND v."deletedAt" IS NULL
  AND v."statusId" <> s.id
  AND EXISTS (
    SELECT 1
    FROM "VehicleSale" sale
    WHERE sale."vehicleId" = v.id
      AND sale."cancelledAt" IS NULL
      AND sale."actualDeliveryAt" IS NOT NULL
  );

INSERT INTO "VehicleStatusHistory" ("id", "vehicleId", "fromStatusId", "toStatusId", "changedAt", "notes")
SELECT
  concat('c', substr(md5(v.id || ':vendido'), 1, 24)),
  v.id,
  v."statusId",
  s.id,
  NOW(),
  'Sincronização automática: viatura vendida'
FROM "Vehicle" v
CROSS JOIN "VehicleStatus" s
WHERE s.code = 'VENDIDO'
  AND v."deletedAt" IS NULL
  AND v."statusId" <> s.id
  AND EXISTS (
    SELECT 1
    FROM "VehicleSale" sale
    WHERE sale."vehicleId" = v.id
      AND sale."cancelledAt" IS NULL
      AND sale."actualDeliveryAt" IS NULL
  );

UPDATE "Vehicle" v
SET "statusId" = s.id
FROM "VehicleStatus" s
WHERE s.code = 'VENDIDO'
  AND v."deletedAt" IS NULL
  AND v."statusId" <> s.id
  AND EXISTS (
    SELECT 1
    FROM "VehicleSale" sale
    WHERE sale."vehicleId" = v.id
      AND sale."cancelledAt" IS NULL
      AND sale."actualDeliveryAt" IS NULL
  );
