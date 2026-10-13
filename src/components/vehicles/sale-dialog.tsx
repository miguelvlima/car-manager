"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { toDateInput } from "@/lib/format";
import { formatMoney } from "@/lib/format";
import { cancelSaleAction, markDeliveredAction, registerSaleAction } from "@/server/actions";

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
  const [draft, setDraft] = useState<{ soldAt: string; finalPrice: string; notes: string } | null>(null);

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
                  A viatura fica marcada como vendida. Confirme para evitar um registo por engano. Esta ação fica no
                  histórico.
                </p>
                <dl className="space-y-2 rounded-2xl bg-muted/50 p-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Preço final</dt>
                    <dd className="font-medium">{formatMoney(Number(draft.finalPrice) || null)}</dd>
                  </div>
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
                <h3 className="text-xl font-semibold">Marcar como vendida</h3>
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
                  <div className="sm:col-span-2">
                    <Label>Preço final</Label>
                    <Input name="finalPrice" type="number" step="0.01" defaultValue={price ?? ""} required />
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

export function DeliverDialog({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const result = await markDeliveredAction({
      vehicleId,
      actualDeliveryAt: String(formData.get("actualDeliveryAt") ?? ""),
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Entrega registada. A viatura sai da lista dos vendedores.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Marcar como entregue
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-3xl bg-card p-6">
            <h3 className="text-xl font-semibold">Marcar como entregue</h3>
            <p className="text-sm text-muted-foreground">
              Depois de gravar a data de entrega, a viatura deixa de aparecer na listagem dos vendedores. O histórico
              mantém-se para o admin.
            </p>
            <div>
              <Label>Data de entrega</Label>
              <Input name="actualDeliveryAt" type="date" defaultValue={toDateInput(new Date())} required />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button disabled={pending}>{pending ? "A gravar..." : "Confirmar entrega"}</Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

export function RevertAvailabilityButton({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const result = await cancelSaleAction({ vehicleId, reason: String(formData.get("reason") ?? "") });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Venda anulada.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Anular venda
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-3xl bg-card p-6">
            <h3 className="text-xl font-semibold">Anular venda?</h3>
            <p className="text-sm text-muted-foreground">
              Tem de indicar o motivo; a anulação fica registada no histórico da ficha e na auditoria.
            </p>
            <div>
              <Label htmlFor="reason-sale">Justificação</Label>
              <Textarea id="reason-sale" name="reason" required minLength={8} placeholder="Explique o engano ou o motivo da anulação" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "A anular..." : "Confirmar anulação da venda"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
