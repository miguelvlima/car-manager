import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { auth } from "@/auth";

export async function GET(_request: NextRequest, context: { params: Promise<{ key: string[] }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { key } = await context.params;
  const relative = key.join("/");
  if (relative.includes("..")) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });

  const uploadDir = process.env.UPLOAD_DIR ?? "./uploads";
  const fullPath = path.join(process.cwd(), uploadDir, relative);
  try {
    const fileStat = await stat(fullPath);
    if (!fileStat.isFile()) throw new Error("not file");
    const stream = createReadStream(fullPath);
    return new NextResponse(stream as unknown as ReadableStream, {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600" },
    });
  } catch {
    return NextResponse.json({ error: "Ficheiro não encontrado." }, { status: 404 });
  }
}
