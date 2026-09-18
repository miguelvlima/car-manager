import { PhotographyStatus } from "@prisma/client";
import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const optionalNumber = z.preprocess((value) => {
  if (value === "" || value == null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}, z.number().optional());

const boolFromForm = z.preprocess((value) => {
  if (value === true || value === "true") return true;
  if (value === false || value === "false" || value == null || value === "") return false;
  return value;
}, z.boolean());

export const vehicleCreateSchema = z.object({
  make: z.string().trim().min(1, "Marca obrigatória."),
  model: z.string().trim().min(1, "Modelo obrigatório."),
  version: optionalText,
  generation: optionalText,
  bodyType: optionalText,
  licensePlate: optionalText,
  vin: optionalText,
  color: optionalText,
  year: optionalNumber,
  firstRegistrationDate: optionalText,
  fuelType: optionalText,
  transmission: optionalText,
  powerHp: optionalNumber,
  engineSizeCc: optionalNumber,
  doors: optionalNumber,
  seats: optionalNumber,
  entryDate: z.string().min(1, "Data de entrada obrigatória."),
  renewal: boolFromForm.optional(),
  inspectionDate: optionalText,
  mileage: optionalNumber,
  passport: boolFromForm.optional(),
  numberOfKeys: optionalNumber,
  vehicleTypeId: z.string().min(1, "Tipo de viatura obrigatório."),
  sourceId: optionalText,
  statusId: z.string().min(1, "Estado obrigatório."),
  locationId: optionalText,
  commercialSupport: boolFromForm.optional(),
  commercialSupportAmount: optionalNumber,
  originNotes: optionalText,
  originEntity: optionalText,
  salePrice: optionalNumber,
  acquisitionPrice: optionalNumber,
  preparationCost: optionalNumber,
  photographyStatus: z.enum(PhotographyStatus).optional(),
  commercialNotes: optionalText,
});

export const vehicleUpdateSchema = vehicleCreateSchema.partial().extend({
  id: z.string().min(1),
});

export const vehicleListQuerySchema = z.object({
  q: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  statusId: z.string().optional(),
  locationId: z.string().optional(),
  sourceId: z.string().optional(),
  photographyStatus: z.enum(PhotographyStatus).optional(),
  minPrice: optionalNumber,
  maxPrice: optionalNumber,
  minKm: optionalNumber,
  maxKm: optionalNumber,
  year: optionalNumber,
  minDays: optionalNumber,
  maxDays: optionalNumber,
  sellerId: z.string().optional(),
  availableOnly: z.coerce.boolean().optional(),
  catalog: z.coerce.boolean().optional(),
  sort: z
    .enum(["newest", "oldest", "days_desc", "days_asc", "price_asc", "price_desc", "km_asc", "km_desc"])
    .optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
});

export const saleSchema = z.object({
  vehicleId: z.string().min(1),
  soldAt: z.string().min(1),
  sellerId: z.string().optional(),
  finalPrice: z.coerce.number().positive("Preço final obrigatório."),
  customerRef: optionalText,
  expectedDeliveryAt: optionalText,
  notes: optionalText,
});

export const reservationSchema = z.object({
  vehicleId: z.string().min(1),
  customerRef: optionalText,
  notes: optionalText,
});

export const commercialRevertSchema = z.object({
  vehicleId: z.string().min(1),
  reason: z.string().trim().min(8, "Indique uma justificação (mínimo 8 caracteres)."),
});

export const locationSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Nome obrigatório."),
  type: z.enum(["STAND", "EXPOSICAO", "OFICINA", "ARMAZEM", "CLIENTE", "CEDIDO", "OUTRO"]),
  isActive: boolFromForm.optional(),
});

export const sourceSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Nome obrigatório."),
  code: z.string().trim().min(1, "Código obrigatório."),
  hasCommercialSupport: boolFromForm.optional(),
  notes: optionalText,
  isActive: boolFromForm.optional(),
});

export const userSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Nome obrigatório."),
  email: z.string().email("Email inválido."),
  password: z.string().min(8).optional().or(z.literal("")),
  roleId: z.string().min(1, "Perfil obrigatório."),
  siteId: optionalText,
  isActive: boolFromForm.optional(),
});

export const statusSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Nome obrigatório."),
  code: optionalText,
  color: z.enum(["green", "yellow", "orange", "red", "blue", "slate"]),
  category: z.enum(["operational", "commercial", "terminal"]),
  isAvailableForSale: boolFromForm.optional(),
  isActive: boolFromForm.optional(),
  sortOrder: optionalNumber,
});

export const vehicleTypeSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Nome obrigatório."),
  code: optionalText,
  isActive: boolFromForm.optional(),
});

export const processSiteSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Nome obrigatório."),
  kind: z.enum(["REFURBISHMENT", "CLEANING", "SERVICE", "GENERAL"]),
  isActive: boolFromForm.optional(),
});

export const roleMatrixSchema = z.object({
  roleId: z.string().min(1),
  permissions: z.array(z.string()),
});

export const createRoleSchema = z.object({
  name: z.string().trim().min(2, "Nome obrigatório."),
  description: optionalText,
  copyFromRoleId: optionalText,
});

export const settingsSchema = z.object({
  renewalOffsetDays: z.coerce.number().int().min(0),
  yellowFromDays: z.coerce.number().int().min(0),
  orangeFromDays: z.coerce.number().int().min(0),
  redFromDays: z.coerce.number().int().min(0),
});

export const preparationActionSchema = z.object({
  vehicleId: z.string().min(1),
  kind: z.enum(["refurbishment", "cleaning", "service", "photo"]),
  step: z.enum(["start", "complete", "photographed", "published"]),
  processSiteId: optionalText,
  locationName: optionalText,
  notes: optionalText,
  expectedPickupAt: optionalText,
  mileage: optionalNumber,
});
