import { LocationType, ProcessSiteKind } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { slugifyCode } from "@/lib/utils";
import { writeAudit } from "@/server/services/audit.service";
import type { Actor } from "@/server/permissions/check";
import { isSuperAdmin, PERMISSION_CATALOG } from "@/server/permissions/catalog";

export async function listUsers() {
  return prisma.user.findMany({
    where: { deletedAt: null },
    include: { role: true, site: true },
    orderBy: { name: "asc" },
  });
}

export async function upsertUser(
  actor: Actor,
  input: {
    id?: string;
    name: string;
    email: string;
    password?: string;
    roleId: string;
    siteId?: string | null;
    isActive?: boolean;
  },
) {
  const email = input.email.toLowerCase();
  const nextRole = await prisma.role.findUnique({ where: { id: input.roleId } });
  if (!nextRole) throw new AppError("Perfil não encontrado.", "NOT_FOUND", 404);

  if (input.id) {
    const previous = await prisma.user.findFirst({
      where: { id: input.id, deletedAt: null },
      include: { role: true },
    });
    if (!previous) throw new AppError("Utilizador não encontrado.", "NOT_FOUND", 404);
    if (previous.role && isSuperAdmin(previous.role.code)) {
      if (input.roleId !== previous.roleId) {
        throw new AppError("O perfil do super-administrador não pode ser alterado.", "FORBIDDEN", 403);
      }
      if (input.isActive === false) {
        throw new AppError("O super-administrador não pode ser desativado.", "FORBIDDEN", 403);
      }
    } else if (isSuperAdmin(nextRole.code)) {
      throw new AppError("Não é possível atribuir o perfil Super Admin a outro utilizador.", "FORBIDDEN", 403);
    }
    const data = {
      name: input.name,
      email,
      roleId: input.roleId,
      siteId: input.siteId || null,
      isActive: input.isActive ?? true,
      ...(input.password ? { passwordHash: await bcrypt.hash(input.password, 12) } : {}),
    };
    const user = await prisma.user.update({ where: { id: input.id }, data });
    await writeAudit({
      actor,
      action: "UPDATE_USER",
      entityType: "User",
      entityId: user.id,
      previous: {
        name: previous.name,
        email: previous.email,
        roleId: previous.roleId,
        siteId: previous.siteId,
        isActive: previous.isActive,
      },
      next: { name: data.name, email, roleId: data.roleId, siteId: data.siteId, isActive: data.isActive, passwordChanged: Boolean(input.password) },
    });
    return user;
  }
  if (!input.password) throw new AppError("Password obrigatória.", "VALIDATION");
  if (isSuperAdmin(nextRole.code)) {
    throw new AppError("Não é possível criar outro super-administrador.", "FORBIDDEN", 403);
  }
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email,
      passwordHash: await bcrypt.hash(input.password, 12),
      roleId: input.roleId,
      siteId: input.siteId || null,
      isActive: input.isActive ?? true,
    },
  });
  await writeAudit({ actor, action: "CREATE_USER", entityType: "User", entityId: user.id, next: { email } });
  return user;
}

export async function listRolesWithPermissions() {
  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: { where: { deletedAt: null } } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.permission.findMany({ orderBy: { key: "asc" } }),
  ]);
  return { roles, permissions, catalog: PERMISSION_CATALOG };
}

export async function saveRolePermissions(actor: Actor, roleId: string, keys: string[]) {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { permissions: { include: { permission: true } } },
  });
  if (!role) throw new AppError("Perfil não encontrado.", "NOT_FOUND", 404);
  if (isSuperAdmin(role.code)) {
    throw new AppError("As permissões do Super Admin não podem ser alteradas.", "FORBIDDEN", 403);
  }
  const previousKeys = role.permissions.filter((item) => item.allowed).map((item) => item.permission.key);
  const permissions = await prisma.permission.findMany();
  await prisma.$transaction(
    permissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId: permission.id } },
        update: { allowed: keys.includes(permission.key) },
        create: { roleId, permissionId: permission.id, allowed: keys.includes(permission.key) },
      }),
    ),
  );
  await writeAudit({
    actor,
    action: "UPDATE_ROLE_PERMISSIONS",
    entityType: "Role",
    entityId: roleId,
    previous: { name: role.name, keys: previousKeys },
    next: { name: role.name, keys },
  });
}

async function uniqueRoleCode(name: string) {
  const base = slugifyCode(name) || "PERFIL";
  const reserved = isSuperAdmin(base) ? "PERFIL" : base;
  let code = reserved;
  let n = 2;
  while (await prisma.role.findUnique({ where: { code } })) {
    code = `${reserved}_${n}`;
    n += 1;
  }
  return code;
}

export async function createRole(
  actor: Actor,
  input: { name: string; description?: string | null; copyFromRoleId?: string | null },
) {
  const code = await uniqueRoleCode(input.name);
  let permissionKeys: string[] = [];
  if (input.copyFromRoleId) {
    const source = await prisma.role.findUnique({
      where: { id: input.copyFromRoleId },
      include: { permissions: { include: { permission: true } } },
    });
    if (!source) throw new AppError("Perfil de origem não encontrado.", "NOT_FOUND", 404);
    permissionKeys = source.permissions.filter((item) => item.allowed).map((item) => item.permission.key);
  }

  const role = await prisma.role.create({
    data: {
      code,
      name: input.name,
      description: input.description || null,
      isSystem: false,
    },
  });

  if (permissionKeys.length) {
    const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });
    await prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId: role.id,
        permissionId: permission.id,
        allowed: true,
      })),
    });
  }

  await writeAudit({
    actor,
    action: "CREATE_ROLE",
    entityType: "Role",
    entityId: role.id,
    next: { name: role.name, code: role.code, copyFromRoleId: input.copyFromRoleId || null },
  });
  return role;
}

export async function upsertLocation(
  actor: Actor,
  input: { id?: string; name: string; type: "STAND" | "EXPOSICAO" | "OFICINA" | "ARMAZEM" | "CLIENTE" | "CEDIDO" | "OUTRO"; isActive?: boolean },
) {
  const previous = input.id ? await prisma.location.findUnique({ where: { id: input.id } }) : null;
  if (input.id && !previous) throw new AppError("Localização não encontrada.", "NOT_FOUND", 404);
  const data = { name: input.name, type: input.type, isActive: input.isActive ?? true };
  const location = input.id
    ? await prisma.location.update({ where: { id: input.id }, data })
    : await prisma.location.create({ data });
  await writeAudit({
    actor,
    action: input.id ? "UPDATE_LOCATION" : "CREATE_LOCATION",
    entityType: "Location",
    entityId: location.id,
    previous: previous ? { name: previous.name, type: previous.type, isActive: previous.isActive } : null,
    next: data,
  });
  return location;
}

export async function upsertSource(
  actor: Actor,
  input: { id?: string; name: string; code: string; hasCommercialSupport?: boolean; notes?: string | null; isActive?: boolean },
) {
  const data = {
    name: input.name,
    code: slugifyCode(input.code),
    hasCommercialSupport: input.hasCommercialSupport ?? false,
    notes: input.notes || null,
    isActive: input.isActive ?? true,
  };
  const previous = input.id ? await prisma.vehicleSource.findUnique({ where: { id: input.id } }) : null;
  if (input.id && !previous) throw new AppError("Origem não encontrada.", "NOT_FOUND", 404);
  const source = input.id
    ? await prisma.vehicleSource.update({ where: { id: input.id }, data })
    : await prisma.vehicleSource.create({ data });
  await writeAudit({
    actor,
    action: input.id ? "UPDATE_SOURCE" : "CREATE_SOURCE",
    entityType: "VehicleSource",
    entityId: source.id,
    previous: previous
      ? {
          name: previous.name,
          code: previous.code,
          hasCommercialSupport: previous.hasCommercialSupport,
          notes: previous.notes,
          isActive: previous.isActive,
        }
      : null,
    next: data,
  });
  return source;
}

export type CatalogListQuery = {
  q?: string;
  type?: string;
  kind?: string;
  roleId?: string;
  isActive?: string;
  support?: string;
  category?: string;
  page?: number;
  pageSize?: number;
};

function activeFilter(value?: string) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export async function listLocations(query: CatalogListQuery) {
  const isActive = activeFilter(query.isActive);
  const where = {
    ...(query.q ? { name: { contains: query.q, mode: "insensitive" as const } } : {}),
    ...(query.type ? { type: query.type as LocationType } : {}),
    ...(isActive === undefined ? {} : { isActive }),
  };
  const items = await prisma.location.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { vehicles: true } } },
  });
  return { items, total: items.length };
}

export async function getLocation(id: string) {
  const location = await prisma.location.findUnique({ where: { id } });
  if (!location) throw new AppError("Localização não encontrada.", "NOT_FOUND", 404);
  return location;
}

export async function listSources(query: CatalogListQuery) {
  const isActive = activeFilter(query.isActive);
  const items = await prisma.vehicleSource.findMany({
    where: {
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { code: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.support === "true" ? { hasCommercialSupport: true } : {}),
      ...(query.support === "false" ? { hasCommercialSupport: false } : {}),
      ...(isActive === undefined ? {} : { isActive }),
    },
    orderBy: { name: "asc" },
    include: { _count: { select: { vehicles: true } } },
  });
  return { items, total: items.length };
}

export async function getSource(id: string) {
  const source = await prisma.vehicleSource.findUnique({ where: { id } });
  if (!source) throw new AppError("Origem não encontrada.", "NOT_FOUND", 404);
  return source;
}

export async function listUsersFiltered(query: CatalogListQuery) {
  const isActive = activeFilter(query.isActive);
  const items = await prisma.user.findMany({
    where: {
      deletedAt: null,
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { email: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.roleId ? { roleId: query.roleId } : {}),
      ...(isActive === undefined ? {} : { isActive }),
    },
    include: { role: true, site: true },
    orderBy: { name: "asc" },
  });
  return { items, total: items.length };
}

export async function getUser(id: string) {
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    include: { role: true },
  });
  if (!user) throw new AppError("Utilizador não encontrado.", "NOT_FOUND", 404);
  return user;
}

export async function listStatuses(query: CatalogListQuery) {
  const isActive = activeFilter(query.isActive);
  const items = await prisma.vehicleStatus.findMany({
    where: {
      ...(query.q ? { name: { contains: query.q, mode: "insensitive" } } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(isActive === undefined ? {} : { isActive }),
    },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { vehicles: true } } },
  });
  return { items, total: items.length };
}

export async function getStatus(id: string) {
  const status = await prisma.vehicleStatus.findUnique({ where: { id } });
  if (!status) throw new AppError("Estado não encontrado.", "NOT_FOUND", 404);
  return status;
}

export async function upsertStatus(
  actor: Actor,
  input: {
    id?: string;
    name: string;
    code?: string;
    color: string;
    category: string;
    isAvailableForSale?: boolean;
    isActive?: boolean;
    sortOrder?: number;
  },
) {
  const data = {
    name: input.name,
    code: slugifyCode(input.code || input.name),
    color: input.color,
    category: input.category,
    isAvailableForSale: input.isAvailableForSale ?? false,
    isActive: input.isActive ?? true,
    sortOrder: input.sortOrder ?? 0,
  };
  const previous = input.id ? await prisma.vehicleStatus.findUnique({ where: { id: input.id } }) : null;
  if (input.id && !previous) throw new AppError("Estado não encontrado.", "NOT_FOUND", 404);
  const status = input.id
    ? await prisma.vehicleStatus.update({
        where: { id: input.id },
        data: {
          name: data.name,
          color: data.color,
          category: data.category,
          isAvailableForSale: data.isAvailableForSale,
          isActive: data.isActive,
          sortOrder: data.sortOrder,
        },
      })
    : await prisma.vehicleStatus.create({ data });
  await writeAudit({
    actor,
    action: input.id ? "UPDATE_STATUS" : "CREATE_STATUS",
    entityType: "VehicleStatus",
    entityId: status.id,
    previous: previous
      ? {
          name: previous.name,
          code: previous.code,
          color: previous.color,
          category: previous.category,
          isAvailableForSale: previous.isAvailableForSale,
          isActive: previous.isActive,
          sortOrder: previous.sortOrder,
        }
      : null,
    next: data,
  });
  return status;
}

export async function listVehicleTypes(query: CatalogListQuery) {
  const isActive = activeFilter(query.isActive);
  const items = await prisma.vehicleType.findMany({
    where: {
      ...(query.q ? { name: { contains: query.q, mode: "insensitive" } } : {}),
      ...(isActive === undefined ? {} : { isActive }),
    },
    orderBy: { name: "asc" },
    include: { _count: { select: { vehicles: true } } },
  });
  return { items, total: items.length };
}

export async function getVehicleType(id: string) {
  const type = await prisma.vehicleType.findUnique({ where: { id } });
  if (!type) throw new AppError("Tipo não encontrado.", "NOT_FOUND", 404);
  return type;
}

export async function upsertVehicleType(
  actor: Actor,
  input: { id?: string; name: string; code?: string; isActive?: boolean },
) {
  const data = {
    name: input.name,
    code: slugifyCode(input.code || input.name),
    isActive: input.isActive ?? true,
  };
  const previous = input.id ? await prisma.vehicleType.findUnique({ where: { id: input.id } }) : null;
  if (input.id && !previous) throw new AppError("Tipo não encontrado.", "NOT_FOUND", 404);
  const type = input.id
    ? await prisma.vehicleType.update({ where: { id: input.id }, data: { name: data.name, isActive: data.isActive } })
    : await prisma.vehicleType.create({ data });
  await writeAudit({
    actor,
    action: input.id ? "UPDATE_VEHICLE_TYPE" : "CREATE_VEHICLE_TYPE",
    entityType: "VehicleType",
    entityId: type.id,
    previous: previous ? { name: previous.name, code: previous.code, isActive: previous.isActive } : null,
    next: data,
  });
  return type;
}

export async function listProcessSites(query: CatalogListQuery) {
  const isActive = activeFilter(query.isActive);
  const items = await prisma.processSite.findMany({
    where: {
      ...(query.q ? { name: { contains: query.q, mode: "insensitive" } } : {}),
      ...(query.kind ? { kind: query.kind as ProcessSiteKind } : {}),
      ...(isActive === undefined ? {} : { isActive }),
    },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { refurbishments: true, cleaningProcesses: true, serviceProcesses: true } },
    },
  });
  return { items, total: items.length };
}

export async function getProcessSite(id: string) {
  const site = await prisma.processSite.findUnique({ where: { id } });
  if (!site) throw new AppError("Local de processo não encontrado.", "NOT_FOUND", 404);
  return site;
}

export async function upsertProcessSite(
  actor: Actor,
  input: { id?: string; name: string; kind: "REFURBISHMENT" | "CLEANING" | "SERVICE" | "GENERAL"; isActive?: boolean },
) {
  const previous = input.id ? await prisma.processSite.findUnique({ where: { id: input.id } }) : null;
  if (input.id && !previous) throw new AppError("Local de processo não encontrado.", "NOT_FOUND", 404);
  const data = { name: input.name, kind: input.kind, isActive: input.isActive ?? true };
  const site = input.id
    ? await prisma.processSite.update({ where: { id: input.id }, data })
    : await prisma.processSite.create({ data });
  await writeAudit({
    actor,
    action: input.id ? "UPDATE_PROCESS_SITE" : "CREATE_PROCESS_SITE",
    entityType: "ProcessSite",
    entityId: site.id,
    previous: previous ? { name: previous.name, kind: previous.kind, isActive: previous.isActive } : null,
    next: data,
  });
  return site;
}

function refuseIfInUse(name: string, count: number, what: string) {
  if (count > 0) {
    throw new AppError(
      `Não é possível eliminar «${name}»: existem ${count} ${what}. Altere esses registos ou inative esta entrada.`,
      "CONFLICT",
    );
  }
}

export async function deleteUser(actor: Actor, id: string) {
  if (actor.id === id) {
    throw new AppError("Não pode eliminar a sua própria conta.", "FORBIDDEN", 403);
  }
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    include: { role: true },
  });
  if (!user) throw new AppError("Utilizador não encontrado.", "NOT_FOUND", 404);
  if (user.role && isSuperAdmin(user.role.code)) {
    throw new AppError("O super-administrador não pode ser eliminado.", "FORBIDDEN", 403);
  }
  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
  await writeAudit({
    actor,
    action: "DELETE_USER",
    entityType: "User",
    entityId: id,
    previous: { name: user.name, email: user.email, roleId: user.roleId, role: user.role?.code, isActive: user.isActive },
  });
}

export async function deleteRole(actor: Actor, id: string) {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw new AppError("Perfil não encontrado.", "NOT_FOUND", 404);
  if (isSuperAdmin(role.code)) {
    throw new AppError("O perfil Super Admin tem de existir sempre e não pode ser eliminado.", "FORBIDDEN", 403);
  }
  const liveUsers = await prisma.user.findMany({
    where: { roleId: id, deletedAt: null },
    select: { name: true },
    orderBy: { name: "asc" },
  });
  if (liveUsers.length) {
    const names = liveUsers.map((user) => `«${user.name}»`).join(", ");
    throw new AppError(
      liveUsers.length === 1
        ? `Não é possível eliminar «${role.name}»: está associado a ${names}. Altere o perfil desse utilizador primeiro.`
        : `Não é possível eliminar «${role.name}»: está associado a ${names}. Altere o perfil desses utilizadores primeiro.`,
      "CONFLICT",
    );
  }
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`UPDATE "User" SET "roleId" = NULL WHERE "roleId" = ${id}`;
    await tx.role.delete({ where: { id } });
  });
  await writeAudit({
    actor,
    action: "DELETE_ROLE",
    entityType: "Role",
    entityId: id,
    previous: { name: role.name, code: role.code },
  });
}

export async function deleteLocation(actor: Actor, id: string) {
  const location = await getLocation(id);
  const vehicleCount = await prisma.vehicle.count({ where: { locationId: id } });
  refuseIfInUse(
    location.name,
    vehicleCount,
    vehicleCount === 1 ? "viatura nesta localização" : "viaturas nesta localização",
  );
  await prisma.$transaction([
    prisma.vehicleLocationHistory.updateMany({ where: { locationId: id }, data: { locationId: null } }),
    prisma.location.delete({ where: { id } }),
  ]);
  await writeAudit({
    actor,
    action: "DELETE_LOCATION",
    entityType: "Location",
    entityId: id,
    previous: { name: location.name, type: location.type, isActive: location.isActive },
  });
}

export async function deleteSource(actor: Actor, id: string) {
  const source = await getSource(id);
  const vehicleCount = await prisma.vehicle.count({ where: { sourceId: id } });
  refuseIfInUse(source.name, vehicleCount, vehicleCount === 1 ? "viatura com esta origem" : "viaturas com esta origem");
  await prisma.vehicleSource.delete({ where: { id } });
  await writeAudit({
    actor,
    action: "DELETE_SOURCE",
    entityType: "VehicleSource",
    entityId: id,
    previous: {
      name: source.name,
      code: source.code,
      hasCommercialSupport: source.hasCommercialSupport,
      isActive: source.isActive,
    },
  });
}

export async function deleteStatus(actor: Actor, id: string) {
  const status = await getStatus(id);
  const [vehicles, historyFrom, historyTo, transitions] = await Promise.all([
    prisma.vehicle.count({ where: { statusId: id } }),
    prisma.vehicleStatusHistory.count({ where: { fromStatusId: id } }),
    prisma.vehicleStatusHistory.count({ where: { toStatusId: id } }),
    prisma.vehicleStatusTransition.count({ where: { OR: [{ fromStatusId: id }, { toStatusId: id }] } }),
  ]);
  const used = vehicles + historyFrom + historyTo + transitions;
  if (used > 0) {
    throw new AppError(
      `Não é possível eliminar «${status.name}»: já está em uso no stock ou no histórico. Inative o estado em vez de o apagar.`,
      "CONFLICT",
    );
  }
  await prisma.vehicleStatus.delete({ where: { id } });
  await writeAudit({
    actor,
    action: "DELETE_STATUS",
    entityType: "VehicleStatus",
    entityId: id,
    previous: { name: status.name, code: status.code, category: status.category, isActive: status.isActive },
  });
}

export async function deleteVehicleType(actor: Actor, id: string) {
  const type = await getVehicleType(id);
  const vehicleCount = await prisma.vehicle.count({ where: { vehicleTypeId: id } });
  refuseIfInUse(type.name, vehicleCount, vehicleCount === 1 ? "viatura deste tipo" : "viaturas deste tipo");
  await prisma.vehicleType.delete({ where: { id } });
  await writeAudit({
    actor,
    action: "DELETE_VEHICLE_TYPE",
    entityType: "VehicleType",
    entityId: id,
    previous: { name: type.name, code: type.code, isActive: type.isActive },
  });
}

export async function deleteProcessSite(actor: Actor, id: string) {
  const site = await getProcessSite(id);
  const [refurbishments, cleaning, services] = await Promise.all([
    prisma.refurbishment.count({ where: { processSiteId: id } }),
    prisma.cleaningProcess.count({ where: { processSiteId: id } }),
    prisma.serviceProcess.count({ where: { processSiteId: id } }),
  ]);
  const used = refurbishments + cleaning + services;
  refuseIfInUse(site.name, used, used === 1 ? "processo associado" : "processos associados");
  await prisma.processSite.delete({ where: { id } });
  await writeAudit({
    actor,
    action: "DELETE_PROCESS_SITE",
    entityType: "ProcessSite",
    entityId: id,
    previous: { name: site.name, kind: site.kind, isActive: site.isActive },
  });
}
