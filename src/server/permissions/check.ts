import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  hasPermission,
  isSuperAdmin,
  type PermissionKey,
} from "@/server/permissions/catalog";

export type Actor = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleCode: string;
  siteId: string | null;
  permissions: Set<string>;
  ip: string | null;
};

export async function getActor(): Promise<Actor | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findFirst({
    where: { id: session.user.id, deletedAt: null, isActive: true },
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  });

  if (!user?.role) return null;

  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerStore.get("x-real-ip");

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roleId: user.role.id,
    roleCode: user.role.code,
    siteId: user.siteId,
    permissions: new Set(
      user.role.permissions.filter((item) => item.allowed).map((item) => item.permission.key),
    ),
    ip,
  };
}

export async function requireAuth() {
  const actor = await getActor();
  if (!actor) throw new AppError("Sessão inválida.", "UNAUTHORIZED", 401);
  return actor;
}

export async function requirePermission(key: PermissionKey) {
  const actor = await requireAuth();
  if (!can(actor, key)) {
    throw new AppError("Não tem permissão para esta operação.", "FORBIDDEN", 403);
  }
  return actor;
}

export function can(actor: Pick<Actor, "roleCode" | "permissions">, key: PermissionKey) {
  return hasPermission(actor.roleCode, actor.permissions, key);
}

export function actorIsSuperAdmin(actor: Pick<Actor, "roleCode">) {
  return isSuperAdmin(actor.roleCode);
}
