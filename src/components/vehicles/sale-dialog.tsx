"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import {
  cancelReservationAction,
  cancelSaleAction,
  registerSaleAction,
  reserveVehicleAction,
} from "@/server/actions";
import { formatMoney } from "@/lib/format";

export function SaleDialog({
  vehicleId,
  price,
  sellerName,
  canChangeSeller,
}: {
  vehicleId: string;
  price: number | null;
  sellerName: string;
  canChangeSeller: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState<{
    soldAt: string;
    finalPrice: string;
    customerRef: string;
    expectedDeliveryAt: string;
    notes: string;
  } | null>(null);

  function close() {
    setOpen(false);
    setDraft(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (!draft) {
      setDraft({
        soldAt: String(formData.get("soldAt") ?? ""),
        finalPrice: String(formData.get("finalPrice") ?? ""),
        customerRef: String(formData.get("customerRef") ?? ""),
        expectedDeliveryAt: String(formData.get("expectedDeliveryAt") ?? ""),
        notes: String(formData.get("notes") ?? ""),
      });
      return;
    }
    setPending(true);
    const result = await registerSaleAction({ vehicleId, ...draft });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Venda registada. A ação ficou no histórico.");
    close();
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Marcar como vendida</Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <form onSubmit={onSubmit} className="w-full max-w-lg space-y-4 rounded-3xl bg-card p-6">
            {draft ? (
              <>
                <h3 className="text-xl font-semibold">Confirmar venda?</h3>
                <p className="text-sm text-muted-foreground">
                  A viatura deixa de estar disponível para venda. Confirme para evitar um registo por engano. Esta ação
                  fica no histórico.
                </p>
                <dl className="space-y-2 rounded-2xl bg-muted/50 p-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Preço final</dt>
                    <dd className="font-medium">{formatMoney(Number(draft.finalPrice) || null)}</dd>
                  </div>
                  {draft.customerRef ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Cliente</dt>
                      <dd className="font-medium">{draft.customerRef}</dd>
                    </div>
                  ) : null}
                </dl>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDraft(null)} disabled={pending}>
                    Voltar
                  </Button>
                  <Button disabled={pending}>{pending ? "A gravar..." : "Confirmar venda"}</Button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-semibold">Registar venda</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Data da venda</Label>
                    <Input name="soldAt" type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} required />
                  </div>
                  {canChangeSeller ? (
                    <div>
                      <Label>Vendedor</Label>
                      <Input defaultValue={sellerName} disabled />
                    </div>
                  ) : null}
                  <div>
                    <Label>Preço final</Label>
                    <Input name="finalPrice" type="number" step="0.01" defaultValue={price ?? ""} required />
                  </div>
                  <div>
                    <Label>Cliente / referência</Label>
                    <Input name="customerRef" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Data prevista de entrega</Label>
                    <Input name="expectedDeliveryAt" type="date" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Observação</Label>
                    <Textarea name="notes" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={close}>
                    Cancelar
                  </Button>
                  <Button>Continuar</Button>
                </div>
              </>
            )}
          </form>
        </div>
      ) : null}
    </>
  );
}

export function ReserveButton({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    const result = await reserveVehicleAction({ vehicleId });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Viatura reservada. A ação ficou no histórico.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Reservar
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div role="dialog" aria-modal="true" className="w-full max-w-md space-y-4 rounded-3xl bg-card p-6">
            <h3 className="text-xl font-semibold">Reservar esta viatura?</h3>
            <p className="text-sm text-muted-foreground">
              Deixa de aparecer como disponível para venda. Confirme para evitar um registo por engano. Esta ação fica no
              histórico.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="button" onClick={confirm} disabled={pending}>
                {pending ? "A reservar..." : "Confirmar reserva"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function RevertAvailabilityButton({
  vehicleId,
  kind,
}: {
  vehicleId: string;
  kind: "reservation" | "sale";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const isSale = kind === "sale";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const payload = { vehicleId, reason: String(formData.get("reason") ?? "") };
    const result = isSale ? await cancelSaleAction(payload) : await cancelReservationAction(payload);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(isSale ? "Venda anulada. A viatura voltou a estar disponível." : "Reserva anulada. A viatura voltou a estar disponível.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        {isSale ? "Anular venda" : "Anular reserva"}
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-3xl bg-card p-6">
            <h3 className="text-xl font-semibold">{isSale ? "Anular venda?" : "Anular reserva?"}</h3>
            <p className="text-sm text-muted-foreground">
              A viatura volta a ficar disponível para venda. Tem de indicar o motivo; a anulação fica registada no
              histórico da ficha e na auditoria.
            </p>
            <div>
              <Label htmlFor={`reason-${kind}`}>Justificação</Label>
              <Textarea id={`reason-${kind}`} name="reason" required minLength={8} placeholder="Explique o engano ou o motivo da anulação" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "A anular..." : isSale ? "Confirmar anulação da venda" : "Confirmar anulação da reserva"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
