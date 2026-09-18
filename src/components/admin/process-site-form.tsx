"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { PROCESS_SITE_KIND_LABELS } from "@/lib/labels";
import { upsertProcessSiteAction } from "@/server/actions";

export function ProcessSiteForm({
  site,
}: {
  site?: { id: string; name: string; kind: string; isActive: boolean };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    const result = await upsertProcessSiteAction({ id: site?.id, ...Object.fromEntries(formData.entries()) });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(site ? "Local atualizado." : "Local criado.");
    router.push("/settings/process-sites");
    router.refresh();
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <section className="grid gap-4 rounded-3xl border border-border bg-card p-6 md:grid-cols-2">
        <div>
          <Label>Nome</Label>
          <Input name="name" defaultValue={site?.name} required />
        </div>
        <div>
          <Label>Tipo de processo</Label>
          <Select name="kind" defaultValue={site?.kind ?? "REFURBISHMENT"}>
            {Object.entries(PROCESS_SITE_KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Ativo</Label>
          <Select name="isActive" defaultValue={site?.isActive === false ? "false" : "true"}>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </Select>
        </div>
      </section>
      <Button disabled={pending}>{pending ? "A gravar..." : site ? "Guardar alterações" : "Criar local"}</Button>
    </form>
  );
}
