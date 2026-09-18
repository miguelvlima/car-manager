import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type StoredFile = {
  driver: string;
  key: string;
  url: string;
  contentType: string;
  sizeBytes: number;
};

const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"]);
const MAX_BYTES = 15 * 1024 * 1024;

export function inferUploadType(file: File) {
  const raw = file.type.toLowerCase();
  if (raw === "image/jpg") return "image/jpeg";
  if (ALLOWED_TYPES.has(raw)) return raw;
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".heic")) return "image/heic";
  if (name.endsWith(".heif")) return "image/heif";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".jfif")) return "image/jpeg";
  if (!raw || raw === "application/octet-stream") {
    if (!name || name === "image.jpg" || name === "image.jpeg") return "image/jpeg";
  }
  return null;
}

export function assertSafeUpload(file: File) {
  if (!inferUploadType(file)) {
    throw new Error("Tipo de ficheiro não permitido. Use JPG, PNG, WEBP ou HEIC.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Ficheiro demasiado grande (máx. 15 MB).");
  }
}

export async function storeLocalFile(file: File, folder: string): Promise<StoredFile> {
  assertSafeUpload(file);
  const contentType = inferUploadType(file) ?? "image/jpeg";
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : contentType === "image/heic" || contentType === "image/heif" ? "heic" : "jpg";
  const key = `${folder}/${randomUUID()}.${ext}`;
  const uploadDir = process.env.UPLOAD_DIR ?? "./uploads";
  const fullPath = path.join(process.cwd(), uploadDir, key);
  await mkdir(path.dirname(fullPath), { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, buffer);
  return {
    driver: "local",
    key,
    url: `/api/uploads/${key}`,
    contentType,
    sizeBytes: file.size,
  };
}
