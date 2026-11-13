"use client";

const TARGET_BYTES = 1_500_000;
const MAX_EDGE = 2400;

export class PhotoPrepareError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhotoPrepareError";
  }
}

function looksLikeHeic(file: File) {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return type.includes("heic") || type.includes("heif") || /\.hei[cf]$/i.test(name);
}

function mightBeHeic(file: File) {
  return looksLikeHeic(file) || !file.type || file.type === "application/octet-stream";
}

async function heicToJpeg(file: File) {
  try {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.82 });
    return Array.isArray(converted) ? converted[0] : converted;
  } catch {
    throw new PhotoPrepareError(
      "Esta fotografia está em HEIC (formato típico do iPhone) e não foi possível convertê-la. Nas definições da Câmara, escolha «Mais compatível» / JPG, ou tente «Tirar foto» outra vez.",
    );
  }
}

async function loadImage(blob: Blob) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob);
    } catch {
      // Some browsers cannot decode HEIC/AVIF here; fall through to <img>.
    }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(blob);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new PhotoPrepareError(
          "Não foi possível ler esta fotografia. Aceitamos JPG, PNG, WEBP, HEIC, AVIF e outros formatos de imagem; se o telemóvel a gravou noutro formato, tente «Tirar foto» ou guardar como JPG.",
        ),
      );
    };
    image.src = url;
  });
}

async function canvasToJpeg(source: ImageBitmap | HTMLImageElement, quality: number, edge = MAX_EDGE) {
  const { width, height } = (() => {
    const longest = Math.max(source.width, source.height) || 1;
    const scale = Math.min(1, edge / longest);
    return { width: Math.max(1, Math.round(source.width * scale)), height: Math.max(1, Math.round(source.height * scale)) };
  })();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new PhotoPrepareError("Este dispositivo não consegue comprimir fotografias. Tente outro telemóvel ou um computador.");
  }
  context.drawImage(source, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) {
    throw new PhotoPrepareError("Não foi possível comprimir esta fotografia. Tente outra foto ou um JPG.");
  }
  return blob;
}

function jpegFile(blob: Blob, originalName: string) {
  const base = originalName.replace(/\.[^.]+$/, "") || "fotografia";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}

export async function prepareImageForUpload(file: File): Promise<File> {
  if (file.size === 0) {
    throw new PhotoPrepareError("O ficheiro está vazio. Escolha outra fotografia.");
  }

  let sourceBlob: Blob = file;
  if (looksLikeHeic(file)) {
    sourceBlob = await heicToJpeg(file);
  }

  let bitmap: ImageBitmap | HTMLImageElement;
  try {
    bitmap = await loadImage(sourceBlob);
  } catch (error) {
    if (looksLikeHeic(file) || !mightBeHeic(file)) throw error;
    sourceBlob = await heicToJpeg(file);
    bitmap = await loadImage(sourceBlob);
  }

  let blob = await canvasToJpeg(bitmap, 0.82);
  for (const quality of [0.7, 0.55, 0.4]) {
    if (blob.size <= TARGET_BYTES) break;
    blob = await canvasToJpeg(bitmap, quality);
  }
  for (const edge of [1600, 1280, 1024]) {
    if (blob.size <= TARGET_BYTES) break;
    blob = await canvasToJpeg(bitmap, 0.45, edge);
  }
  if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();

  if (blob.size > TARGET_BYTES) {
    throw new PhotoPrepareError(
      "Mesmo comprimida, esta fotografia continua demasiado grande para enviar. Tente uma foto com menos zoom ou tire-a outra vez.",
    );
  }

  return jpegFile(blob, file.name);
}
