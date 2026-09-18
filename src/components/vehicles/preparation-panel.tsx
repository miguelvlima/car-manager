"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { formatDate, formatDateTime } from "@/lib/format";
import { PHOTOGRAPHY_STATUS_LABELS } from "@/lib/labels";
import { runPreparationAction } from "@/server/actions";

type Site = { id: string; name: string; kind: string };
type Refurb = {
  status: string;
  locationName: string | null;
  deliveredAt: Date | string | null;
  expectedPickupAt: Date | string | null;
  actualPickupAt: Date | string | null;
  notes: string | null;
  processSite: { id: string; name: string } | null;
} | null;
type Cleaning = {
  status: string;
  locationName: string | null;
  deliveredAt: Date | string | null;
  completedAt: Date | string | null;
  processSite: { id: string; name: string } | null;
} | null;
type Service = {
  locationName: string | null;
  enteredAt: Date | string | null;
  completedAt: Date | string | null;
  mileage: number | null;
  processSite: { id: string; name: string } | null;
} | null;

const ACTIVE_REFURB = new Set(["TO_START", "DELIVERED", "IN_PROGRESS"]);
const ACTIVE_CLEAN = new Set(["PENDING", "IN_PROGRESS"]);

export default function PreparationPanel({
  vehicleId,
  photographyStatus,
  canManageProcess,
  canManagePhoto,
  processSites,
  refurbishment,
  cleaning,
  service,
}: {
  vehicleId: string;
  photographyStatus: string;
  canManageProcess: boolean;
  canManagePhoto: boolean;
  processSites: Site[];
  refurbishment: Refurb;
  cleaning: Cleaning;
  service: Service;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"refurb-start" | "refurb-done" | "clean-start" | "clean-done" | "service-start" | "service-done" | null>(null);
  const [pending, setPending] = useState(false);

  const refurbActive = Boolean(refurbishment && ACTIVE_REFURB.has(refurbishment.status));
  const cleanActive = Boolean(cleaning && ACTIVE_CLEAN.has(cleaning.status));
  const serviceActive = Boolean(service?.enteredAt && !service.completedAt);

  async function run(payload: Parameters<typeof runPreparationAction>[0]) {
    setPending(true);
    const result = await runPreparationAction(payload);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Preparação atualizada.");
    setDialog(null);
    router.refresh();
  }

  return (
    <section className="space-y-4 rounded-3xl border border-border bg-card p-6">
      <div>
        <h2 className="text-lg font-semibold">Preparação</h2>
        <p className="text-sm text-muted-foreground">
          Oficina, higienização, revisão, fotos e publicação — com data e histórico.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Recondicionamento">
          {refurbActive ? (
            <>
              <p className="text-sm font-medium">Em curso · {place(refurbishment?.processSite?.name, refurbishment?.locationName)}</p>
              <p className="text-xs text-muted-foreground">Saiu {formatDateTime(refurbishment?.deliveredAt)}</p>
              {refurbishment?.expectedPickupAt ? (
                <p className="text-xs text-muted-foreground">Previsão de regresso {formatDate(refurbishment.expectedPickupAt)}</p>
              ) : null}
              {canManageProcess ? (
                <Button size="sm" className="mt-3" onClick={() => setDialog("refurb-done")} disabled={pending}>
                  Já voltou
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {refurbishment?.actualPickupAt
                  ? `Última volta ${formatDate(refurbishment.actualPickupAt)} · ${place(refurbishment.processSite?.name, refurbishment.locationName)}`
                  : "Ainda não foi enviada."}
              </p>
              {canManageProcess ? (
                <Button size="sm" className="mt-3" onClick={() => setDialog("refurb-start")} disabled={pending}>
                  Enviar para recondicionar
                </Button>
              ) : null}
            </>
          )}
        </Card>

        <Card title="Higienização">
          {cleanActive ? (
            <>
              <p className="text-sm font-medium">Em curso · {place(cleaning?.processSite?.name, cleaning?.locationName)}</p>
              <p className="text-xs text-muted-foreground">Iniciada {formatDateTime(cleaning?.deliveredAt)}</p>
              {canManageProcess ? (
                <Button size="sm" className="mt-3" onClick={() => setDialog("clean-done")} disabled={pending}>
                  Concluída
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {cleaning?.completedAt ? `Última conclusão ${formatDate(cleaning.completedAt)}` : "Ainda não foi feita."}
              </p>
              {canManageProcess ? (
                <Button size="sm" className="mt-3" onClick={() => setDialog("clean-start")} disabled={pending}>
                  Iniciar higienização
                </Button>
              ) : null}
            </>
          )}
        </Card>

        <Card title="Revisão">
          {serviceActive ? (
            <>
              <p className="text-sm font-medium">Em curso · {place(service?.processSite?.name, service?.locationName)}</p>
              <p className="text-xs text-muted-foreground">Entrou {formatDateTime(service?.enteredAt)}</p>
              {canManageProcess ? (
                <Button size="sm" className="mt-3" onClick={() => setDialog("service-done")} disabled={pending}>
                  Concluída
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {service?.completedAt ? `Última conclusão ${formatDate(service.completedAt)}` : "Ainda não foi feita."}
              </p>
              {canManageProcess ? (
                <Button size="sm" className="mt-3" onClick={() => setDialog("service-start")} disabled={pending}>
                  Enviar para revisão
                </Button>
              ) : null}
            </>
          )}
        </Card>

        <Card title="Fotos e publicação">
          <p className="text-sm font-medium">{PHOTOGRAPHY_STATUS_LABELS[photographyStatus] ?? photographyStatus}</p>
          {canManagePhoto ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {photographyStatus === "NOT_PHOTOGRAPHED" || photographyStatus === "UNPUBLISHED" ? (
                <Button size="sm" disabled={pending} onClick={() => run({ vehicleId, kind: "photo", step: "photographed" })}>
                  Já fotografada
                </Button>
              ) : null}
              {photographyStatus !== "PUBLISHED" ? (
                <Button
                  size="sm"
                  variant={photographyStatus === "NOT_PHOTOGRAPHED" ? "outline" : "default"}
                  disabled={pending}
                  onClick={() => run({ vehicleId, kind: "photo", step: "published" })}
                >
                  Publicada
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">Já está marcada como publicada.</p>
              )}
            </div>
          ) : null}
        </Card>
      </div>

      {dialog ? (
        <ProcessDialog
          title={dialogTitle(dialog)}
          sites={processSites}
          showSite={dialog.endsWith("-start")}
          showPickup={dialog === "refurb-start"}
          showMileage={dialog.startsWith("service")}
          pending={pending}
          onClose={() => setDialog(null)}
          onSubmit={(fields) => {
            const kind = dialog.startsWith("refurb") ? "refurbishment" : dialog.startsWith("clean") ? "cleaning" : "service";
            const step = dialog.endsWith("-start") ? "start" : "complete";
            return run({ vehicleId, kind, step, ...fields });
          }}
        />
      ) : null}
    </section>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-4">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

function place(site?: string | null, fallback?: string | null) {
  return site || fallback || "local não indicado";
}

function dialogTitle(dialog: string) {
  if (dialog === "refurb-start") return "Enviar para recondicionar";
  if (dialog === "refurb-done") return "Já voltou do recondicionamento?";
  if (dialog === "clean-start") return "Iniciar higienização";
  if (dialog === "clean-done") return "Higienização concluída?";
  if (dialog === "service-start") return "Enviar para revisão";
  return "Revisão concluída?";
}

function ProcessDialog({
  title,
  sites,
  showSite,
  showPickup,
  showMileage,
  pending,
  onClose,
  onSubmit,
}: {
  title: string;
  sites: Site[];
  showSite: boolean;
  showPickup: boolean;
  showMileage: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: (fields: { processSiteId?: string; locationName?: string; notes?: string; expectedPickupAt?: string; mileage?: number }) => void;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const processSiteId = String(form.get("processSiteId") ?? "");
    const locationName = String(form.get("locationName") ?? "").trim();
    const notes = String(form.get("notes") ?? "").trim();
    const expectedPickupAt = String(form.get("expectedPickupAt") ?? "");
    const mileageRaw = String(form.get("mileage") ?? "");
    onSubmit({
      processSiteId: processSiteId || undefined,
      locationName: locationName || undefined,
      notes: notes || undefined,
      expectedPickupAt: expectedPickupAt || undefined,
      mileage: mileageRaw ? Number(mileageRaw) : undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-3xl bg-card p-6">
        <h3 className="text-xl font-semibold">{title}</h3>
        {showSite ? (
          <>
            <div>
              <Label>Local</Label>
              <Select name="processSiteId" defaultValue="">
                <option value="">Escolher…</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Ou outro local</Label>
              <Input name="locationName" placeholder="Nome do sítio" />
            </div>
          </>
        ) : null}
        {showPickup ? (
          <div>
            <Label>Previsão de regresso</Label>
            <Input name="expectedPickupAt" type="date" />
          </div>
        ) : null}
        {showMileage ? (
          <div>
            <Label>Quilómetros</Label>
            <Input name="mileage" type="number" min={0} />
          </div>
        ) : null}
        <div>
          <Label>Notas</Label>
          <Textarea name="notes" />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button disabled={pending}>{pending ? "A gravar..." : "Confirmar"}</Button>
        </div>
      </form>
    </div>
  );
}
