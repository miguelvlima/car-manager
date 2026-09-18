-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('STAND', 'EXPOSICAO', 'OFICINA', 'ARMAZEM', 'CLIENTE', 'CEDIDO', 'OUTRO');

-- CreateEnum
CREATE TYPE "PhotographyStatus" AS ENUM ('NOT_PHOTOGRAPHED', 'PHOTOGRAPHED', 'IN_TREATMENT', 'READY_TO_PUBLISH', 'PUBLISHED', 'UNPUBLISHED');

-- CreateEnum
CREATE TYPE "VehicleEventType" AS ENUM ('CREATED', 'UPDATED', 'STATUS_CHANGED', 'LOCATION_CHANGED', 'PRICE_CHANGED', 'PHOTO_ADDED', 'PHOTO_PRIMARY_SET', 'PUBLISHING_CHANGED', 'REFURBISHMENT_STARTED', 'REFURBISHMENT_COMPLETED', 'REFURBISHMENT_PICKED_UP', 'CLEANING_STARTED', 'CLEANING_COMPLETED', 'SERVICE_STARTED', 'SERVICE_COMPLETED', 'RESERVED', 'RESERVATION_CANCELLED', 'SALE_REGISTERED', 'DELIVERED', 'TYPE_CHANGED', 'IMPORT', 'NOTE');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CONVERTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProcessSiteKind" AS ENUM ('REFURBISHMENT', 'CLEANING', 'SERVICE', 'GENERAL');

-- CreateEnum
CREATE TYPE "RefurbishmentStatus" AS ENUM ('NOT_REQUIRED', 'TO_START', 'DELIVERED', 'IN_PROGRESS', 'COMPLETED', 'PICKED_UP', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CleaningStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportRowStatus" AS ENUM ('IMPORTED', 'NEEDS_REVIEW', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "siteId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LocationType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "hasCommercialSupport" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleStatus" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAvailableForSale" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleStatusTransition" (
    "id" TEXT NOT NULL,
    "fromStatusId" TEXT NOT NULL,
    "toStatusId" TEXT NOT NULL,

    CONSTRAINT "VehicleStatusTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "VehicleType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "internalCode" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "version" TEXT,
    "generation" TEXT,
    "bodyType" TEXT,
    "licensePlate" TEXT,
    "licensePlateNormalized" TEXT,
    "vin" TEXT,
    "color" TEXT,
    "year" INTEGER,
    "firstRegistrationDate" TIMESTAMP(3),
    "fuelType" TEXT,
    "transmission" TEXT,
    "powerHp" INTEGER,
    "engineSizeCc" INTEGER,
    "doors" INTEGER,
    "seats" INTEGER,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "renewal" BOOLEAN NOT NULL DEFAULT false,
    "inspectionDate" TIMESTAMP(3),
    "mileage" INTEGER,
    "passport" BOOLEAN,
    "numberOfKeys" INTEGER,
    "commercialSupport" BOOLEAN NOT NULL DEFAULT false,
    "commercialSupportAmount" DECIMAL(12,2),
    "originNotes" TEXT,
    "originEntity" TEXT,
    "salePrice" DECIMAL(12,2),
    "previousPrice" DECIMAL(12,2),
    "priceChangedAt" TIMESTAMP(3),
    "acquisitionPrice" DECIMAL(12,2),
    "preparationCost" DECIMAL(12,2),
    "photographyStatus" "PhotographyStatus" NOT NULL DEFAULT 'NOT_PHOTOGRAPHED',
    "photographyUpdatedAt" TIMESTAMP(3),
    "photographyNotes" TEXT,
    "commercialNotes" TEXT,
    "needsImportReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "vehicleTypeId" TEXT NOT NULL,
    "sourceId" TEXT,
    "statusId" TEXT NOT NULL,
    "locationId" TEXT,
    "siteId" TEXT,
    "createdById" TEXT,
    "photographyUpdatedById" TEXT,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehiclePhoto" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "storageDriver" TEXT NOT NULL DEFAULT 'local',
    "storageKey" TEXT NOT NULL,
    "url" TEXT,
    "contentType" TEXT,
    "sizeBytes" INTEGER,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "caption" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "VehiclePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleDocument" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "storageDriver" TEXT NOT NULL DEFAULT 'local',
    "storageKey" TEXT NOT NULL,
    "url" TEXT,
    "contentType" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "VehicleDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleEvent" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "VehicleEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "previous" JSONB,
    "next" JSONB,
    "notes" TEXT,

    CONSTRAINT "VehicleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleLocationHistory" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "fromLocation" TEXT,
    "toLocation" TEXT,
    "locationId" TEXT,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "VehicleLocationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleStatusHistory" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "fromStatusId" TEXT,
    "toStatusId" TEXT NOT NULL,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "VehicleStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehiclePriceHistory" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "previousPrice" DECIMAL(12,2),
    "newPrice" DECIMAL(12,2) NOT NULL,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "VehiclePriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleSale" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "soldAt" TIMESTAMP(3) NOT NULL,
    "sellerId" TEXT NOT NULL,
    "finalPrice" DECIMAL(12,2) NOT NULL,
    "customerRef" TEXT,
    "expectedDeliveryAt" TIMESTAMP(3),
    "actualDeliveryAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "VehicleSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleReservation" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "reservedById" TEXT NOT NULL,
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "customerRef" TEXT,
    "notes" TEXT,
    "releasedAt" TIMESTAMP(3),
    "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "VehicleReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessSite" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ProcessSiteKind" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refurbishment" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "processSiteId" TEXT,
    "locationName" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "expectedPickupAt" TIMESTAMP(3),
    "actualPickupAt" TIMESTAMP(3),
    "status" "RefurbishmentStatus" NOT NULL DEFAULT 'TO_START',
    "responsibleUserId" TEXT,
    "responsibleName" TEXT,
    "notes" TEXT,
    "cost" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Refurbishment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleaningProcess" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "processSiteId" TEXT,
    "locationName" TEXT,
    "status" "CleaningStatus" NOT NULL DEFAULT 'PENDING',
    "responsibleUserId" TEXT,
    "responsibleName" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleaningProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceProcess" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "needsService" BOOLEAN NOT NULL DEFAULT true,
    "processSiteId" TEXT,
    "locationName" TEXT,
    "enteredAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "serviceType" TEXT,
    "mileage" INTEGER,
    "checklist" TEXT,
    "notes" TEXT,
    "responsibleUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "ip" TEXT,
    "previous" JSONB,
    "next" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRow" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "rawData" JSONB NOT NULL,
    "status" "ImportRowStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "reviewNotes" TEXT,
    "warnings" TEXT[],
    "vehicleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiIngestion" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT,
    "kind" TEXT NOT NULL,
    "storageKey" TEXT,
    "suggestedFields" JSONB NOT NULL,
    "confidence" JSONB,
    "rawResponse" JSONB,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiIngestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Site_code_key" ON "Site"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- CreateIndex
CREATE INDEX "User_siteId_idx" ON "User"("siteId");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleSource_code_key" ON "VehicleSource"("code");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleStatus_code_key" ON "VehicleStatus"("code");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleStatusTransition_fromStatusId_toStatusId_key" ON "VehicleStatusTransition"("fromStatusId", "toStatusId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleType_code_key" ON "VehicleType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_internalCode_key" ON "Vehicle"("internalCode");

-- CreateIndex
CREATE INDEX "Vehicle_licensePlateNormalized_idx" ON "Vehicle"("licensePlateNormalized");

-- CreateIndex
CREATE INDEX "Vehicle_vin_idx" ON "Vehicle"("vin");

-- CreateIndex
CREATE INDEX "Vehicle_statusId_idx" ON "Vehicle"("statusId");

-- CreateIndex
CREATE INDEX "Vehicle_locationId_idx" ON "Vehicle"("locationId");

-- CreateIndex
CREATE INDEX "Vehicle_sourceId_idx" ON "Vehicle"("sourceId");

-- CreateIndex
CREATE INDEX "Vehicle_entryDate_idx" ON "Vehicle"("entryDate");

-- CreateIndex
CREATE INDEX "Vehicle_deletedAt_idx" ON "Vehicle"("deletedAt");

-- CreateIndex
CREATE INDEX "Vehicle_make_model_idx" ON "Vehicle"("make", "model");

-- CreateIndex
CREATE INDEX "Vehicle_needsImportReview_idx" ON "Vehicle"("needsImportReview");

-- CreateIndex
CREATE INDEX "VehiclePhoto_vehicleId_deletedAt_idx" ON "VehiclePhoto"("vehicleId", "deletedAt");

-- CreateIndex
CREATE INDEX "VehicleDocument_vehicleId_idx" ON "VehicleDocument"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleEvent_vehicleId_occurredAt_idx" ON "VehicleEvent"("vehicleId", "occurredAt");

-- CreateIndex
CREATE INDEX "VehicleLocationHistory_vehicleId_changedAt_idx" ON "VehicleLocationHistory"("vehicleId", "changedAt");

-- CreateIndex
CREATE INDEX "VehicleStatusHistory_vehicleId_changedAt_idx" ON "VehicleStatusHistory"("vehicleId", "changedAt");

-- CreateIndex
CREATE INDEX "VehiclePriceHistory_vehicleId_changedAt_idx" ON "VehiclePriceHistory"("vehicleId", "changedAt");

-- CreateIndex
CREATE INDEX "VehicleSale_vehicleId_idx" ON "VehicleSale"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleSale_sellerId_idx" ON "VehicleSale"("sellerId");

-- CreateIndex
CREATE INDEX "VehicleSale_soldAt_idx" ON "VehicleSale"("soldAt");

-- CreateIndex
CREATE INDEX "VehicleReservation_vehicleId_status_idx" ON "VehicleReservation"("vehicleId", "status");

-- CreateIndex
CREATE INDEX "Refurbishment_vehicleId_idx" ON "Refurbishment"("vehicleId");

-- CreateIndex
CREATE INDEX "Refurbishment_status_idx" ON "Refurbishment"("status");

-- CreateIndex
CREATE INDEX "CleaningProcess_vehicleId_idx" ON "CleaningProcess"("vehicleId");

-- CreateIndex
CREATE INDEX "ServiceProcess_vehicleId_idx" ON "ServiceProcess"("vehicleId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "ImportRow_batchId_status_idx" ON "ImportRow"("batchId", "status");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleStatusTransition" ADD CONSTRAINT "VehicleStatusTransition_fromStatusId_fkey" FOREIGN KEY ("fromStatusId") REFERENCES "VehicleStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleStatusTransition" ADD CONSTRAINT "VehicleStatusTransition_toStatusId_fkey" FOREIGN KEY ("toStatusId") REFERENCES "VehicleStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "VehicleType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "VehicleSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "VehicleStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_photographyUpdatedById_fkey" FOREIGN KEY ("photographyUpdatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehiclePhoto" ADD CONSTRAINT "VehiclePhoto_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehiclePhoto" ADD CONSTRAINT "VehiclePhoto_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleEvent" ADD CONSTRAINT "VehicleEvent_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleEvent" ADD CONSTRAINT "VehicleEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleLocationHistory" ADD CONSTRAINT "VehicleLocationHistory_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleLocationHistory" ADD CONSTRAINT "VehicleLocationHistory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleLocationHistory" ADD CONSTRAINT "VehicleLocationHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleStatusHistory" ADD CONSTRAINT "VehicleStatusHistory_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleStatusHistory" ADD CONSTRAINT "VehicleStatusHistory_fromStatusId_fkey" FOREIGN KEY ("fromStatusId") REFERENCES "VehicleStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleStatusHistory" ADD CONSTRAINT "VehicleStatusHistory_toStatusId_fkey" FOREIGN KEY ("toStatusId") REFERENCES "VehicleStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleStatusHistory" ADD CONSTRAINT "VehicleStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehiclePriceHistory" ADD CONSTRAINT "VehiclePriceHistory_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehiclePriceHistory" ADD CONSTRAINT "VehiclePriceHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleSale" ADD CONSTRAINT "VehicleSale_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleSale" ADD CONSTRAINT "VehicleSale_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleReservation" ADD CONSTRAINT "VehicleReservation_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleReservation" ADD CONSTRAINT "VehicleReservation_reservedById_fkey" FOREIGN KEY ("reservedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refurbishment" ADD CONSTRAINT "Refurbishment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refurbishment" ADD CONSTRAINT "Refurbishment_processSiteId_fkey" FOREIGN KEY ("processSiteId") REFERENCES "ProcessSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refurbishment" ADD CONSTRAINT "Refurbishment_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningProcess" ADD CONSTRAINT "CleaningProcess_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningProcess" ADD CONSTRAINT "CleaningProcess_processSiteId_fkey" FOREIGN KEY ("processSiteId") REFERENCES "ProcessSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningProcess" ADD CONSTRAINT "CleaningProcess_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProcess" ADD CONSTRAINT "ServiceProcess_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProcess" ADD CONSTRAINT "ServiceProcess_processSiteId_fkey" FOREIGN KEY ("processSiteId") REFERENCES "ProcessSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProcess" ADD CONSTRAINT "ServiceProcess_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppSetting" ADD CONSTRAINT "AppSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiIngestion" ADD CONSTRAINT "AiIngestion_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
