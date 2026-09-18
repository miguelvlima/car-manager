import { VehicleEventType } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { Actor } from "@/server/permissions/check";
import { Prisma } from "@prisma/client";

export async function writeAudit(input: {
  actor?: Actor | null;
  action: string;
  entityType: string;
  entityId: string;
  previous?: Prisma.InputJsonValue | null;
  next?: Prisma.InputJsonValue | null;
}) {
  await prisma.auditLog.create({
    data: {
      userId: input.actor?.id,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      ip: input.actor?.ip,
      previous: input.previous ?? Prisma.JsonNull,
      next: input.next ?? Prisma.JsonNull,
    },
  });
}

export async function listAuditLogs(query: { q?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = query.pageSize ?? 30;
  const where = query.q
    ? {
        OR: [
          { action: { contains: query.q, mode: "insensitive" as const } },
          { entityType: { contains: query.q, mode: "insensitive" as const } },
          { entityId: { contains: query.q, mode: "insensitive" as const } },
          { user: { name: { contains: query.q, mode: "insensitive" as const } } },
        ],
      }
    : {};
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function writeVehicleEvent(input: {
  vehicleId: string;
  type: VehicleEventType;
  title: string;
  actor?: Actor | null;
  previous?: Prisma.InputJsonValue | null;
  next?: Prisma.InputJsonValue | null;
  notes?: string | null;
  occurredAt?: Date;
}) {
  await prisma.vehicleEvent.create({
    data: {
      vehicleId: input.vehicleId,
      type: input.type,
      title: input.title,
      userId: input.actor?.id,
      previous: input.previous ?? Prisma.JsonNull,
      next: input.next ?? Prisma.JsonNull,
      notes: input.notes,
      occurredAt: input.occurredAt,
    },
  });
}
