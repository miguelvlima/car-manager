"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type DeleteResult = { ok: true; data?: unknown } | { ok: false; error: string };
export type DeleteAction = (id: string) => Promise<DeleteResult>;

export function ConfirmDeleteButton({
  id,
  itemLabel,
  deleteAction,
  redirectTo,
  message,
  label = "Eliminar",
  size = "sm",
  variant = "destructive",
}: {
  id: string;
  itemLabel: string;
  deleteAction: DeleteAction;
  redirectTo?: string;
  message?: string;
  label?: string;
  size?: "sm" | "default";
  variant?: "destructive" | "outline";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await deleteAction(id);
      if (!result.ok) {
        toast.error(result.error);
        setOpen(false);
        return;
      }
      toast.success("Registo eliminado. A ação ficou no histórico.");
      setOpen(false);
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" size={size} variant={variant} onClick={() => setOpen(true)}>
        <Trash2 className="h-3.5 w-3.5" />
        {label}
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div role="dialog" aria-modal="true" className="w-full max-w-md space-y-4 rounded-3xl bg-card p-6">
            <h3 className="text-xl font-semibold">Eliminar «{itemLabel}»?</h3>
            <p className="text-sm text-muted-foreground">
              {message ??
                "Confirme para continuar. Esta ação fica registada no histórico. Se o registo estiver em uso, a eliminação é recusada."}
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="button" variant="destructive" onClick={confirm} disabled={pending}>
                {pending ? "A eliminar..." : "Eliminar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function RowActions({
  id,
  itemLabel,
  editHref,
  deleteAction,
  canEdit = true,
  canDelete = true,
  redirectTo,
  message,
}: {
  id: string;
  itemLabel: string;
  editHref?: string;
  deleteAction?: DeleteAction;
  canEdit?: boolean;
  canDelete?: boolean;
  redirectTo?: string;
  message?: string;
}) {
  if (!canEdit && !canDelete) return null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {canEdit && editHref ? (
        <Button asChild size="sm" variant="outline">
          <Link href={editHref}>
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Link>
        </Button>
      ) : null}
      {canDelete && deleteAction ? (
        <ConfirmDeleteButton
          id={id}
          itemLabel={itemLabel}
          deleteAction={deleteAction}
          redirectTo={redirectTo}
          message={message}
        />
      ) : null}
    </div>
  );
}

export function SettingsEntityHeader({
  title,
  id,
  itemLabel,
  deleteAction,
  redirectTo,
  message,
}: {
  title: string;
  id: string;
  itemLabel: string;
  deleteAction: DeleteAction;
  redirectTo: string;
  message?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <ConfirmDeleteButton
        id={id}
        itemLabel={itemLabel}
        deleteAction={deleteAction}
        redirectTo={redirectTo}
        message={message}
      />
    </div>
  );
}
