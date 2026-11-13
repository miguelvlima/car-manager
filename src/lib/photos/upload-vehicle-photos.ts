"use client";

import { prepareImageForUpload, PhotoPrepareError } from "@/lib/photos/prepare-upload";

export async function messageFromUploadResponse(response: Response, index: number, total: number) {
  const prefix = total > 1 ? `Fotografia ${index} de ${total}: ` : "";
  const raw = await response.text();
  let parsed: { error?: string } | null = null;
  try {
    parsed = JSON.parse(raw) as { error?: string };
  } catch {
    parsed = null;
  }

  if (response.status === 413 || /payload too large|entity too large|413/i.test(raw)) {
    return `${prefix}A fotografia é demasiado grande para o servidor. Já tentámos comprimi-la; envie uma de cada vez ou tire a foto outra vez.`;
  }
  if (response.status === 401) {
    return `${prefix}A sessão expirou. Entre novamente e volte a carregar a fotografia.`;
  }
  if (response.status === 403) {
    return `${prefix}Não tem permissão para carregar fotografias. Peça a um gestor para ativar «Gerir fotografias» no seu perfil.`;
  }
  if (parsed?.error) return `${prefix}${parsed.error}`;
  if (!response.ok) {
    return `${prefix}O servidor recusou o envio (${response.status}). Tente outra vez; se repetir, fale com um gestor.`;
  }
  return `${prefix}Não foi possível carregar a fotografia.`;
}

export async function uploadVehiclePhotos(
  vehicleId: string,
  files: File[],
  onStatus?: (message: string) => void,
) {
  if (!files.length) return 0;
  let uploaded = 0;
  for (const [index, file] of files.entries()) {
    const position = `${index + 1} de ${files.length}`;
    onStatus?.(files.length > 1 ? `A preparar a fotografia ${position}…` : "A preparar e comprimir a fotografia…");
    let prepared: File;
    try {
      prepared = await prepareImageForUpload(file);
    } catch (error) {
      const detail = error instanceof PhotoPrepareError ? error.message : "Não foi possível preparar esta fotografia.";
      throw new Error(files.length > 1 ? `Fotografia ${position}: ${detail}` : detail);
    }

    onStatus?.(files.length > 1 ? `A enviar a fotografia ${position}…` : "A enviar a fotografia…");
    const body = new FormData();
    body.append("file", prepared);
    let response: Response;
    try {
      response = await fetch(`/api/vehicles/${vehicleId}/photos`, { method: "POST", body });
    } catch {
      throw new Error(
        files.length > 1
          ? `Fotografia ${position}: falhou a ligação. Verifique a rede e tente outra vez.`
          : "Falhou a ligação ao enviar a fotografia. Verifique a rede e tente outra vez.",
      );
    }
    if (!response.ok) {
      throw new Error(await messageFromUploadResponse(response, index + 1, files.length));
    }
    uploaded += 1;
  }
  return uploaded;
}
