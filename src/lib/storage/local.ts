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

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/avif",
  "image/gif",
  "image/bmp",
  "image/tiff",
]);
const MAX_BYTES = 15 * 1024 * 1024;

export function sniffImageType(bytes: Uint8Array) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length >= 12 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) return "image/bmp";
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    const tag = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (tag === "WEBP") return "image/webp";
  }
  if (bytes.length >= 12) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]).toLowerCase();
    if (["heic", "heif", "mif1", "msf1"].includes(brand)) return "image/heic";
    if (["avif", "avis"].includes(brand)) return "image/avif";
  }
  return null;
}

export function inferUploadType(file: File) {
  const raw = file.type.toLowerCase();
  if (raw === "image/jpg") return "image/jpeg";
  if (ALLOWED_TYPES.has(raw)) return raw;
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".bmp")) return "image/bmp";
  if (name.endsWith(".tif") || name.endsWith(".tiff")) return "image/tiff";
  if (name.endsWith(".avif")) return "image/avif";
  if (name.endsWith(".heic")) return "image/heic";
  if (name.endsWith(".heif")) return "image/heif";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".jfif")) return "image/jpeg";
  if (!raw || raw === "application/octet-stream") return "image/jpeg";
  return null;
}

export function assertSafeUpload(file: File, sniffed?: string | null) {
  if (!inferUploadType(file) && !sniffed) {
    throw new Error("Este ficheiro não parece uma fotografia. Use a galeria, tire uma foto, ou envie JPG, PNG, WEBP ou HEIC.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Ficheiro demasiado grande (máx. 15 MB). A app comprime as fotos no telemóvel; se ainda falhar, envie uma de cada vez.");
  }
}

export async function storeLocalFile(file: File, folder: string): Promise<StoredFile> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImageType(buffer);
  assertSafeUpload(file, sniffed);
  const contentType = sniffed ?? inferUploadType(file) ?? "image/jpeg";
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : contentType === "image/heic" || contentType === "image/heif" ? "heic" : "jpg";
  const key = `${folder}/${randomUUID()}.${ext}`;
  const uploadDir = process.env.UPLOAD_DIR ?? "./uploads";
  const fullPath = path.join(process.cwd(), uploadDir, key);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, buffer);
  return {
    driver: "local",
    key,
    url: `/api/uploads/${key}`,
    contentType,
    sizeBytes: file.size,
  };
}
