"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { STATUS_CATEGORY_LABELS, STATUS_COLORS } from "@/lib/labels";
import { upsertStatusAction } from "@/server/actions";

export function StatusForm({
  status,
}: {
  status?: {
    id: string;
    name: string;
    code: string;
    color: string;
    category: string;
    isAvailableForSale: boolean;
    isActive: boolean;
    sortOrder: number;
  };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    const result = await upsertStatusAction({ id: status?.id, ...Object.fromEntries(formData.entries()) });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(status ? "Estado atualizado." : "Estado criado.");
    router.push("/settings/statuses");
    router.refresh();
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <section className="grid gap-4 rounded-3xl border border-border bg-card p-6 md:grid-cols-2">
        <div>
          <Label>Nome</Label>
          <Input name="name" defaultValue={status?.name} required />
        </div>
        <div>
          <Label>Código</Label>
          <Input name="code" defaultValue={status?.code} disabled={Boolean(status)} />
        </div>
        <div>
          <Label>Cor</Label>
          <Select name="color" defaultValue={status?.color ?? "slate"}>
            {STATUS_COLORS.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Categoria</Label>
          <Select name="category" defaultValue={status?.category ?? "operational"}>
            {Object.entries(STATUS_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Disponível para venda</Label>
          <Select name="isAvailableForSale" defaultValue={status?.isAvailableForSale ? "true" : "false"}>
            <option value="false">Não</option>
            <option value="true">Sim</option>
          </Select>
        </div>
        <div>
          <Label>Ordem</Label>
          <Input name="sortOrder" type="number" defaultValue={status?.sortOrder ?? 0} />
        </div>
        <div>
          <Label>Ativo</Label>
          <Select name="isActive" defaultValue={status?.isActive === false ? "false" : "true"}>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </Select>
        </div>
      </section>
      <Button disabled={pending}>{pending ? "A gravar..." : status ? "Guardar alterações" : "Criar estado"}</Button>
    </form>
  );
}
