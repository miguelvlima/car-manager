"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { upsertVehicleTypeAction } from "@/server/actions";

export function VehicleTypeForm({
  type,
}: {
  type?: { id: string; name: string; code: string; isActive: boolean };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    const result = await upsertVehicleTypeAction({ id: type?.id, ...Object.fromEntries(formData.entries()) });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(type ? "Tipo atualizado." : "Tipo criado.");
    router.push("/settings/types");
    router.refresh();
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <section className="grid gap-4 rounded-3xl border border-border bg-card p-6 md:grid-cols-2">
        <div>
          <Label>Nome</Label>
          <Input name="name" defaultValue={type?.name} required />
        </div>
        <div>
          <Label>Código</Label>
          <Input name="code" defaultValue={type?.code} disabled={Boolean(type)} />
        </div>
        <div>
          <Label>Ativo</Label>
          <Select name="isActive" defaultValue={type?.isActive === false ? "false" : "true"}>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </Select>
        </div>
      </section>
      <Button disabled={pending}>{pending ? "A gravar..." : type ? "Guardar alterações" : "Criar tipo"}</Button>
    </form>
  );
}
