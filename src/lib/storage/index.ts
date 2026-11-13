import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { assertSafeUpload, inferUploadType, sniffImageType, storeLocalFile, type StoredFile } from "./local";

function extensionFor(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/heic" || contentType === "image/heif") return "heic";
  return "jpg";
}

export async function storeUpload(file: File, folder: string): Promise<StoredFile> {
  const useBlob =
    process.env.STORAGE_DRIVER === "blob" ||
    Boolean(process.env.BLOB_READ_WRITE_TOKEN) ||
    Boolean(process.env.BLOB_STORE_ID);
  if (!useBlob) return storeLocalFile(file, folder);

  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImageType(buffer);
  assertSafeUpload(file, sniffed);
  const contentType = sniffed ?? inferUploadType(file) ?? "image/jpeg";
  const blob = await put(`${folder}/${randomUUID()}.${extensionFor(contentType)}`, buffer, {
    access: "public",
    contentType,
  });
  return {
    driver: "vercel-blob",
    key: blob.pathname,
    url: blob.url,
    contentType,
    sizeBytes: buffer.length,
  };
}
