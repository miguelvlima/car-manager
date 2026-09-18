"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { LOCATION_TYPE_LABELS } from "@/lib/labels";
import { upsertLocationAction } from "@/server/actions";

export function LocationForm({
  location,
}: {
  location?: { id: string; name: string; type: string; isActive: boolean };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    const result = await upsertLocationAction({ id: location?.id, ...Object.fromEntries(formData.entries()) });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(location ? "Localização atualizada." : "Localização criada.");
    router.push("/settings/locations");
    router.refresh();
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <section className="grid gap-4 rounded-3xl border border-border bg-card p-6 md:grid-cols-2">
        <div>
          <Label>Nome</Label>
          <Input name="name" defaultValue={location?.name} required />
        </div>
        <div>
          <Label>Tipo</Label>
          <Select name="type" defaultValue={location?.type ?? "STAND"}>
            {Object.entries(LOCATION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Ativo</Label>
          <Select name="isActive" defaultValue={location?.isActive === false ? "false" : "true"}>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </Select>
        </div>
      </section>
      <Button disabled={pending}>{pending ? "A gravar..." : location ? "Guardar alterações" : "Criar localização"}</Button>
    </form>
  );
}
