import { NextRequest, NextResponse } from "next/server";
import { getActor } from "@/server/permissions/check";
import { can } from "@/server/permissions/check";
import { searchGlobal } from "@/server/services/vehicle.service";

export async function GET(request: NextRequest) {
  const actor = await getActor();
  if (!actor || !can(actor, "vehicle:view")) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ items: [] });
  const items = await searchGlobal(actor, q);
  return NextResponse.json({ items });
}
