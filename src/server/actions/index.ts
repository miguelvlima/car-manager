"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { signIn, signOut } from "@/auth";
import { AppError, toActionResult } from "@/lib/errors";
import { requirePermission } from "@/server/permissions/check";
import {
  commercialRevertSchema,
  createRoleSchema,
  locationSchema,
  preparationActionSchema,
  processSiteSchema,
  reservationSchema,
  roleMatrixSchema,
  saleSchema,
  settingsSchema,
  sourceSchema,
  statusSchema,
  userSchema,
  vehicleCreateSchema,
  vehicleTypeSchema,
  vehicleUpdateSchema,
} from "@/server/validations/vehicle";
import { loginSchema } from "@/server/validations/auth";
import { createVehicle, deletePhoto, deleteVehicle, setPrimaryPhoto, updateVehicle } from "@/server/services/vehicle.service";
import { cancelReservation, cancelSale, registerSale, reserveVehicle } from "@/server/services/sale.service";
import {
  deleteLocation,
  deleteProcessSite,
  deleteRole,
  deleteSource,
  deleteStatus,
  deleteUser,
  deleteVehicleType,
  saveRolePermissions,
  createRole,
  upsertLocation,
  upsertProcessSite,
  upsertSource,
  upsertStatus,
  upsertUser,
  upsertVehicleType,
} from "@/server/services/admin.service";
import { saveStockSettings } from "@/server/services/settings.service";
import { runPreparation } from "@/server/services/process.service";

const attempts = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string, limit = 8, windowMs = 60_000) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  current.count += 1;
  if (current.count > limit) {
    throw new AppError("Demasiadas tentativas. Aguarde um momento.", "FORBIDDEN", 429);
  }
}

export async function loginAction(_prev: unknown, formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    rateLimit(parsed.data.email.toLowerCase());
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/",
    });
    return { error: null };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: "Email ou password inválidos." };
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function createVehicleAction(input: unknown) {
  try {
    const actor = await requirePermission("vehicle:create");
    const data = vehicleCreateSchema.parse(input);
    const vehicle = await createVehicle(actor, data);
    return { ok: true as const, data: vehicle };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function updateVehicleAction(input: unknown) {
  try {
    const actor = await requirePermission("vehicle:edit");
    const data = vehicleUpdateSchema.parse(input);
    const vehicle = await updateVehicle(actor, data.id, data);
    return { ok: true as const, data: vehicle };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function deleteVehicleAction(id: string) {
  try {
    const actor = await requirePermission("vehicle:delete");
    await deleteVehicle(actor, id);
    return { ok: true as const, data: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function setPrimaryPhotoAction(vehicleId: string, photoId: string) {
  try {
    const actor = await requirePermission("photo:manage");
    await setPrimaryPhoto(actor, vehicleId, photoId);
    return { ok: true as const, data: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function deletePhotoAction(id: string) {
  try {
    const actor = await requirePermission("photo:manage");
    await deletePhoto(actor, id);
    return { ok: true as const, data: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function runPreparationAction(input: unknown) {
  try {
    const data = preparationActionSchema.parse(input);
    const permission = data.kind === "photo" ? "photo:manage" : "process:manage";
    const actor = await requirePermission(permission);
    await runPreparation(actor, data);
    return { ok: true as const, data: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function registerSaleAction(input: unknown) {
  try {
    const actor = await requirePermission("vehicle:register_sale");
    const data = saleSchema.parse(input);
    const vehicle = await registerSale(actor, data);
    return { ok: true as const, data: vehicle };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function reserveVehicleAction(input: unknown) {
  try {
    const actor = await requirePermission("vehicle:reserve");
    const data = reservationSchema.parse(input);
    await reserveVehicle(actor, data);
    return { ok: true as const, data: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function cancelReservationAction(input: unknown) {
  try {
    const actor = await requirePermission("vehicle:reserve");
    const data = commercialRevertSchema.parse(input);
    await cancelReservation(actor, data);
    return { ok: true as const, data: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function cancelSaleAction(input: unknown) {
  try {
    const actor = await requirePermission("vehicle:register_sale");
    const data = commercialRevertSchema.parse(input);
    await cancelSale(actor, data);
    return { ok: true as const, data: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function upsertUserAction(input: unknown) {
  try {
    const actor = await requirePermission("user:manage");
    const data = userSchema.parse(input);
    const user = await upsertUser(actor, data);
    return { ok: true as const, data: { id: user.id } };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function saveRoleMatrixAction(input: unknown) {
  try {
    const actor = await requirePermission("role:manage");
    const data = roleMatrixSchema.parse(input);
    await saveRolePermissions(actor, data.roleId, data.permissions);
    return { ok: true as const, data: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function createRoleAction(input: unknown) {
  try {
    const actor = await requirePermission("role:manage");
    const data = createRoleSchema.parse(input);
    const role = await createRole(actor, data);
    return { ok: true as const, data: { id: role.id } };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function upsertLocationAction(input: unknown) {
  try {
    const actor = await requirePermission("location:manage");
    const data = locationSchema.parse(input);
    const location = await upsertLocation(actor, data);
    return { ok: true as const, data: location };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function upsertSourceAction(input: unknown) {
  try {
    const actor = await requirePermission("source:manage");
    const data = sourceSchema.parse(input);
    const source = await upsertSource(actor, data);
    return { ok: true as const, data: source };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function saveSettingsAction(input: unknown) {
  try {
    const actor = await requirePermission("settings:manage");
    const data = settingsSchema.parse(input);
    await saveStockSettings(data, actor.id);
    return { ok: true as const, data: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function upsertStatusAction(input: unknown) {
  try {
    const actor = await requirePermission("settings:manage");
    const data = statusSchema.parse(input);
    const status = await upsertStatus(actor, data);
    return { ok: true as const, data: { id: status.id } };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function upsertVehicleTypeAction(input: unknown) {
  try {
    const actor = await requirePermission("settings:manage");
    const data = vehicleTypeSchema.parse(input);
    const type = await upsertVehicleType(actor, data);
    return { ok: true as const, data: { id: type.id } };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function upsertProcessSiteAction(input: unknown) {
  try {
    const actor = await requirePermission("settings:manage");
    const data = processSiteSchema.parse(input);
    const site = await upsertProcessSite(actor, data);
    return { ok: true as const, data: { id: site.id } };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function deleteUserAction(id: string) {
  try {
    const actor = await requirePermission("user:manage");
    await deleteUser(actor, id);
    return { ok: true as const, data: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function deleteRoleAction(id: string) {
  try {
    const actor = await requirePermission("role:manage");
    await deleteRole(actor, id);
    return { ok: true as const, data: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function deleteLocationAction(id: string) {
  try {
    const actor = await requirePermission("location:manage");
    await deleteLocation(actor, id);
    return { ok: true as const, data: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function deleteSourceAction(id: string) {
  try {
    const actor = await requirePermission("source:manage");
    await deleteSource(actor, id);
    return { ok: true as const, data: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function deleteStatusAction(id: string) {
  try {
    const actor = await requirePermission("settings:manage");
    await deleteStatus(actor, id);
    return { ok: true as const, data: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function deleteVehicleTypeAction(id: string) {
  try {
    const actor = await requirePermission("settings:manage");
    await deleteVehicleType(actor, id);
    return { ok: true as const, data: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function deleteProcessSiteAction(id: string) {
  try {
    const actor = await requirePermission("settings:manage");
    await deleteProcessSite(actor, id);
    return { ok: true as const, data: true };
  } catch (error) {
    return toActionResult(error);
  }
}
