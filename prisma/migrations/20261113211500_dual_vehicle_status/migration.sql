INSERT INTO "VehicleStatus" ("id", "code", "name", "color", "category", "sortOrder", "isActive", "isAvailableForSale", "filterSelectedByDefault", "createdAt", "updatedAt")
SELECT concat('c', substr(md5('status:' || v.code), 1, 24)), v.code, v.name, v.color, v.category, v."sortOrder", true, false, true, NOW(), NOW()
FROM (
  VALUES
    ('EM_HIGIENIZACAO', 'Em higienização', 'yellow', 'operational', 55),
    ('EM_REVISAO', 'Em revisão', 'yellow', 'operational', 65),
    ('AGUARDA_PREPARACAO', 'Aguarda preparação', 'yellow', 'operational', 18)
) AS v(code, name, color, category, "sortOrder")
WHERE NOT EXISTS (SELECT 1 FROM "VehicleStatus" s WHERE s.code = v.code);

UPDATE "VehicleStatus" SET category = 'operational' WHERE code IN (
  'A_ENTRAR',
  'AGUARDA_HIGIENIZACAO',
  'EM_HIGIENIZACAO',
  'AGUARDA_REVISAO',
  'EM_REVISAO',
  'AGUARDA_PREPARACAO',
  'EM_PREPARACAO',
  'AGUARDA_RECONDICIONAMENTO',
  'EM_RECONDICIONAMENTO',
  'AGUARDA_ENTREGA'
);

UPDATE "VehicleStatus" SET category = 'commercial' WHERE code IN (
  'DISPONIVEL_PARA_VENDA',
  'RESERVADO',
  'VENDIDO',
  'ENTREGUE',
  'CEDIDO',
  'DEVOLVIDO'
);

UPDATE "VehicleStatus" SET category = 'commercial' WHERE category = 'terminal';

UPDATE "VehicleStatus" SET "filterSelectedByDefault" = false WHERE code IN ('ENTREGUE', 'DEVOLVIDO');
UPDATE "VehicleStatus" SET "filterSelectedByDefault" = true WHERE code NOT IN ('ENTREGUE', 'DEVOLVIDO');
UPDATE "VehicleStatus" SET "isAvailableForSale" = (code = 'DISPONIVEL_PARA_VENDA');

ALTER TABLE "VehicleStatusHistory" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'operational';

UPDATE "VehicleStatusHistory" h
SET kind = 'commercial'
FROM "VehicleStatus" s
WHERE s.id = h."toStatusId" AND s.category = 'commercial';

ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "operationalStatusId" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "commercialStatusId" TEXT;

UPDATE "Vehicle" v
SET "operationalStatusId" = v."statusId"
FROM "VehicleStatus" s
WHERE s.id = v."statusId" AND s.category = 'operational';

UPDATE "Vehicle" v
SET "commercialStatusId" = v."statusId"
FROM "VehicleStatus" s
WHERE s.id = v."statusId" AND s.category = 'commercial';

UPDATE "Vehicle" v
SET "commercialStatusId" = s.id
FROM "VehicleStatus" s
WHERE s.code = 'ENTREGUE'
  AND v."commercialStatusId" IS NULL
  AND EXISTS (
    SELECT 1 FROM "VehicleSale" sale
    WHERE sale."vehicleId" = v.id AND sale."cancelledAt" IS NULL AND sale."actualDeliveryAt" IS NOT NULL
  );

UPDATE "Vehicle" v
SET "commercialStatusId" = s.id
FROM "VehicleStatus" s
WHERE s.code = 'VENDIDO'
  AND v."commercialStatusId" IS NULL
  AND EXISTS (
    SELECT 1 FROM "VehicleSale" sale
    WHERE sale."vehicleId" = v.id AND sale."cancelledAt" IS NULL AND sale."actualDeliveryAt" IS NULL
  );

UPDATE "Vehicle" v
SET "commercialStatusId" = s.id
FROM "VehicleStatus" s
WHERE s.code = 'DISPONIVEL_PARA_VENDA' AND v."commercialStatusId" IS NULL;

UPDATE "Vehicle" v
SET "operationalStatusId" = h."fromStatusId"
FROM (
  SELECT DISTINCT ON (hist."vehicleId") hist."vehicleId", hist."fromStatusId"
  FROM "VehicleStatusHistory" hist
  JOIN "VehicleStatus" fs ON fs.id = hist."fromStatusId"
  WHERE fs.category = 'operational'
  ORDER BY hist."vehicleId", hist."changedAt" DESC
) h
WHERE h."vehicleId" = v.id AND v."operationalStatusId" IS NULL AND h."fromStatusId" IS NOT NULL;

UPDATE "Vehicle" v
SET "operationalStatusId" = s.id
FROM "VehicleStatus" s
WHERE s.code = 'A_ENTRAR' AND v."operationalStatusId" IS NULL;

ALTER TABLE "Vehicle" ALTER COLUMN "operationalStatusId" SET NOT NULL;
ALTER TABLE "Vehicle" ALTER COLUMN "commercialStatusId" SET NOT NULL;

ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_operationalStatusId_fkey" FOREIGN KEY ("operationalStatusId") REFERENCES "VehicleStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_commercialStatusId_fkey" FOREIGN KEY ("commercialStatusId") REFERENCES "VehicleStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Vehicle_operationalStatusId_idx" ON "Vehicle"("operationalStatusId");
CREATE INDEX "Vehicle_commercialStatusId_idx" ON "Vehicle"("commercialStatusId");

ALTER TABLE "Vehicle" DROP CONSTRAINT "Vehicle_statusId_fkey";
DROP INDEX IF EXISTS "Vehicle_statusId_idx";
ALTER TABLE "Vehicle" DROP COLUMN "statusId";
