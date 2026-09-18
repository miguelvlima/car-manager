"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { upsertSourceAction } from "@/server/actions";

export function SourceForm({
  source,
}: {
  source?: { id: string; name: string; code: string; hasCommercialSupport: boolean; notes: string | null; isActive: boolean };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    const result = await upsertSourceAction({ id: source?.id, ...Object.fromEntries(formData.entries()) });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(source ? "Origem atualizada." : "Origem criada.");
    router.push("/settings/sources");
    router.refresh();
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <section className="grid gap-4 rounded-3xl border border-border bg-card p-6 md:grid-cols-2">
        <div>
          <Label>Nome</Label>
          <Input name="name" defaultValue={source?.name} required />
        </div>
        <div>
          <Label>Código</Label>
          <Input name="code" defaultValue={source?.code} required />
        </div>
        <div>
          <Label>Apoio comercial</Label>
          <Select name="hasCommercialSupport" defaultValue={source?.hasCommercialSupport ? "true" : "false"}>
            <option value="false">Não</option>
            <option value="true">Sim</option>
          </Select>
        </div>
        <div>
          <Label>Ativo</Label>
          <Select name="isActive" defaultValue={source?.isActive === false ? "false" : "true"}>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label>Notas</Label>
          <Textarea name="notes" defaultValue={source?.notes ?? ""} />
        </div>
      </section>
      <Button disabled={pending}>{pending ? "A gravar..." : source ? "Guardar alterações" : "Criar origem"}</Button>
    </form>
  );
}
