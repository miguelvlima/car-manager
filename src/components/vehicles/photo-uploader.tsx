"use client";

import { Camera, Images, Star, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deletePhotoAction, setPrimaryPhotoAction } from "@/server/actions";

const GALLERY_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,image/*";

async function uploadPhotos(vehicleId: string, files: File[]) {
  if (!files.length) return 0;
  for (const [index, file] of files.entries()) {
    const body = new FormData();
    body.append("file", file);
    const response = await fetch(`/api/vehicles/${vehicleId}/photos`, { method: "POST", body });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? `Não foi possível carregar a fotografia ${index + 1}.`);
    }
  }
  return files.length;
}

function FilePicker({
  label,
  accept,
  capture,
  multiple,
  disabled,
  onFiles,
  className,
  children,
}: {
  label: string;
  accept: string;
  capture?: "environment";
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className={cn(
        "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {children}
      {label}
      <input
        id={id}
        type="file"
        accept={accept}
        capture={capture}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
    </label>
  );
}

export default function PhotoEditor({
  vehicleId,
  photos,
}: {
  vehicleId: string;
  photos: Array<{ id: string; url: string | null; isPrimary: boolean }>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"idle" | "upload" | "primary" | "delete">("idle");
  const [dragging, setDragging] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const pending = busy !== "idle";
  const confirming = photos.find((photo) => photo.id === confirmId);

  async function handleFiles(files: File[]) {
    const images = files.filter((file) => file.type.startsWith("image/") || !file.type);
    if (!images.length) {
      toast.error("Escolha uma imagem (JPG, PNG, WEBP ou HEIC).");
      return;
    }
    setBusy("upload");
    try {
      const count = await uploadPhotos(vehicleId, images);
      toast.success(count === 1 ? "Fotografia adicionada." : `${count} fotografias adicionadas.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar a fotografia.");
    } finally {
      setBusy("idle");
    }
  }

  async function handlePrimary(photoId: string) {
    setBusy("primary");
    try {
      const result = await setPrimaryPhotoAction(vehicleId, photoId);
      if (!result.ok) throw new Error(result.error);
      toast.success("Fotografia principal atualizada. É esta que aparece no stock comercial.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível definir a fotografia principal.");
    } finally {
      setBusy("idle");
    }
  }

  async function handleDelete() {
    if (!confirmId) return;
    setBusy("delete");
    try {
      const result = await deletePhotoAction(confirmId);
      if (!result.ok) throw new Error(result.error);
      toast.success("Fotografia eliminada. A ação ficou no histórico.");
      setConfirmId(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível eliminar a fotografia.");
    } finally {
      setBusy("idle");
    }
  }

  return (
    <section className="space-y-4 rounded-3xl border border-border bg-card p-6">
      <div>
        <h2 className="text-lg font-semibold">Fotografias</h2>
        <p className="text-sm text-muted-foreground">
          Pode carregar várias, escolher a principal e eliminar as que carregou por engano. A principal é a que fica visível no stock comercial.
        </p>
      </div>
      <div
        className={cn(
          "rounded-2xl border border-dashed border-border bg-muted/30 p-4 transition-colors",
          dragging && "border-primary bg-primary/5",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <div className="hidden flex-wrap items-center gap-3 md:flex">
          <FilePicker
            label={busy === "upload" ? "A enviar..." : "Carregar fotografias"}
            accept={GALLERY_ACCEPT}
            multiple
            disabled={pending}
            onFiles={handleFiles}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Upload className="h-4 w-4" />
          </FilePicker>
          <p className="text-sm text-muted-foreground">Ou largue as imagens aqui. Pode selecionar várias.</p>
        </div>
        <div className="flex flex-col gap-3 md:hidden">
          <div className="flex flex-wrap gap-2">
            <FilePicker
              label={busy === "upload" ? "A enviar..." : "Galeria"}
              accept={GALLERY_ACCEPT}
              multiple
              disabled={pending}
              onFiles={handleFiles}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Images className="h-4 w-4" />
            </FilePicker>
            <FilePicker
              label={busy === "upload" ? "A enviar..." : "Tirar foto"}
              accept="image/*"
              capture="environment"
              disabled={pending}
              onFiles={handleFiles}
              className="border border-border bg-background hover:bg-muted"
            >
              <Camera className="h-4 w-4" />
            </FilePicker>
          </div>
          <p className="text-sm text-muted-foreground">Galeria do telemóvel (várias) ou câmara traseira.</p>
        </div>
      </div>
      {photos.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((photo) => (
            <div key={photo.id} className="overflow-hidden rounded-xl border border-border bg-muted">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url ?? ""} alt="" className="aspect-[4/3] w-full object-cover" />
                {photo.isPrimary ? (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground">
                    <Star className="h-3 w-3 fill-current" />
                    Principal
                  </span>
                ) : null}
                <button
                  type="button"
                  disabled={pending}
                  aria-label="Eliminar fotografia"
                  onClick={() => setConfirmId(photo.id)}
                  className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white hover:bg-red-600 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {photo.isPrimary ? (
                <p className="px-2 py-2 text-center text-xs text-muted-foreground">Visível no stock comercial</p>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handlePrimary(photo.id)}
                  className="flex h-10 w-full items-center justify-center gap-1 px-2 text-xs font-medium text-accent hover:bg-background disabled:opacity-50"
                >
                  <Star className="h-3.5 w-3.5" />
                  {busy === "primary" ? "A definir..." : "Definir como principal"}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Ainda não há fotografias nesta viatura.</p>
      )}
      {confirming ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div role="dialog" aria-modal="true" className="w-full max-w-md space-y-4 rounded-3xl bg-card p-6">
            <h3 className="text-xl font-semibold">Eliminar esta fotografia?</h3>
            <p className="text-sm text-muted-foreground">
              {confirming.isPrimary
                ? "Sai da ficha e do stock comercial. Se houver outras, uma delas passa a principal."
                : "Sai da ficha. Esta ação fica registada no histórico."}
            </p>
            <div className="overflow-hidden rounded-xl bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={confirming.url ?? ""} alt="" className="aspect-[4/3] w-full object-cover" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setConfirmId(null)} disabled={busy === "delete"}>
                Cancelar
              </Button>
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={busy === "delete"}>
                {busy === "delete" ? "A eliminar..." : "Eliminar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
