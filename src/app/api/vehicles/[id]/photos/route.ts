import { NextRequest, NextResponse } from "next/server";
import { getActor } from "@/server/permissions/check";
import { can } from "@/server/permissions/check";
import { prisma } from "@/lib/db";
import { storeUpload } from "@/lib/storage";
import { writeAudit, writeVehicleEvent } from "@/server/services/audit.service";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor || !can(actor, "photo:manage")) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  const { id } = await context.params;
  const vehicle = await prisma.vehicle.findFirst({ where: { id, deletedAt: null } });
  if (!vehicle) return NextResponse.json({ error: "Viatura não encontrada." }, { status: 404 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Ficheiro em falta." }, { status: 400 });
  }

  let stored;
  try {
    stored = await storeUpload(file, `vehicles/${id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar a fotografia.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const isFirst = !(await prisma.vehiclePhoto.count({ where: { vehicleId: id, deletedAt: null } }));
  const photo = await prisma.vehiclePhoto.create({
    data: {
      vehicleId: id,
      storageDriver: stored.driver,
      storageKey: stored.key,
      url: stored.url,
      contentType: stored.contentType,
      sizeBytes: stored.sizeBytes,
      isPrimary: isFirst,
      uploadedById: actor.id,
    },
  });

  await writeVehicleEvent({
    vehicleId: id,
    type: "PHOTO_ADDED",
    title: isFirst ? "Fotografia principal adicionada" : "Fotografia adicionada",
    actor,
  });
  await writeAudit({
    actor,
    action: "ADD_PHOTO",
    entityType: "Vehicle",
    entityId: id,
    next: { photoId: photo.id },
  });

  return NextResponse.json({ ok: true, photo });
}
