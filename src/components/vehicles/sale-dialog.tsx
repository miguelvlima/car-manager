"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { toDateInput } from "@/lib/format";
import { formatMoney } from "@/lib/format";
import type { ActionResult } from "@/lib/errors";
import { cancelSaleAction, markDeliveredAction, registerSaleAction, unmarkDeliveredAction } from "@/server/actions";

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

export function DeliverDialog({
  vehicleId,
  size = "default",
  variant = "outline",
}: {
  vehicleId: string;
  size?: "default" | "sm";
  variant?: "default" | "outline";
}) {
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
      notes: String(formData.get("notes") ?? ""),
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
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        Marcar como entregue
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-3xl bg-card p-6">
            <h3 className="text-xl font-semibold">Marcar como entregue</h3>
            <p className="text-sm text-muted-foreground">
              Depois da entrega a viatura sai da lista dos vendedores e a venda deixa de poder ser anulada. Só um
              administrador pode anular a entrega; só nessa altura a venda volta a poder ser anulada.
            </p>
            <div>
              <Label>Data de entrega</Label>
              <Input name="actualDeliveryAt" type="date" defaultValue={toDateInput(new Date())} required />
            </div>
            <div>
              <Label>Observação</Label>
              <Textarea name="notes" />
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

export function RevertAvailabilityButton({ vehicleId, size = "default" }: { vehicleId: string; size?: "default" | "sm" }) {
  return (
    <RevertActionButton
      vehicleId={vehicleId}
      size={size}
      action={cancelSaleAction}
      trigger="Anular venda"
      title="Anular venda?"
      description="A viatura volta a ficar disponível. Tem de indicar o motivo; a anulação fica no histórico da ficha e na auditoria."
      confirm="Confirmar anulação da venda"
      success="Venda anulada."
    />
  );
}

export function RevertDeliveryButton({ vehicleId, size = "default" }: { vehicleId: string; size?: "default" | "sm" }) {
  return (
    <RevertActionButton
      vehicleId={vehicleId}
      size={size}
      action={unmarkDeliveredAction}
      trigger="Anular entrega"
      title="Anular entrega?"
      description="A viatura volta a 'Vendida', sem data de entrega. A venda em si não é anulada neste passo — isso só pode ser feito a seguir, à parte. O motivo fica no histórico e na auditoria."
      confirm="Confirmar anulação da entrega"
      success="Entrega anulada. A viatura volta à lista dos vendedores e a venda já pode ser anulada."
    />
  );
}

function RevertActionButton({
  vehicleId,
  size,
  action,
  trigger,
  title,
  description,
  confirm,
  success,
}: {
  vehicleId: string;
  size?: "default" | "sm";
  action: (input: unknown) => Promise<ActionResult<boolean>>;
  trigger: string;
  title: string;
  description: string;
  confirm: string;
  success: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const result = await action({ vehicleId, reason: String(new FormData(event.currentTarget).get("reason") ?? "") });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(success);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="outline" size={size} onClick={() => setOpen(true)}>
        {trigger}
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-3xl bg-card p-6">
            <h3 className="text-xl font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
            <div>
              <Label>Justificação</Label>
              <Textarea name="reason" required minLength={8} placeholder="Explique o engano ou o motivo da anulação" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "A anular..." : confirm}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
