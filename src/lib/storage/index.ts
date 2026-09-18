import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { assertSafeUpload, inferUploadType, storeLocalFile, type StoredFile } from "./local";

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

  assertSafeUpload(file);
  const contentType = inferUploadType(file) ?? "image/jpeg";
  const blob = await put(`${folder}/${randomUUID()}.${extensionFor(contentType)}`, file, {
    access: "public",
    contentType,
  });
  return {
    driver: "vercel-blob",
    key: blob.pathname,
    url: blob.url,
    contentType,
    sizeBytes: file.size,
  };
}
