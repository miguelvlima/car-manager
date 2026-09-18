"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { isSuperAdmin } from "@/server/permissions/catalog";
import { upsertUserAction } from "@/server/actions";

export function UserForm({
  user,
  roles,
}: {
  user?: { id: string; name: string; email: string; roleId: string; isActive: boolean; roleCode?: string };
  roles: Array<{ id: string; name: string; code: string }>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const locked = Boolean(user?.roleCode && isSuperAdmin(user.roleCode));
  const availableRoles = locked
    ? roles.filter((role) => isSuperAdmin(role.code) || role.id === user?.roleId)
    : roles.filter((role) => !isSuperAdmin(role.code));

  async function onSubmit(formData: FormData) {
    setPending(true);
    const result = await upsertUserAction({ id: user?.id, ...Object.fromEntries(formData.entries()) });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(user ? "Utilizador atualizado." : "Utilizador criado.");
    router.push("/settings/users");
    router.refresh();
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <section className="grid gap-4 rounded-3xl border border-border bg-card p-6 md:grid-cols-2">
        <div>
          <Label>Nome</Label>
          <Input name="name" defaultValue={user?.name} required />
        </div>
        <div>
          <Label>Email</Label>
          <Input name="email" type="email" defaultValue={user?.email} required />
        </div>
        <div>
          <Label>Password</Label>
          <Input name="password" type="password" placeholder={user ? "Manter atual" : ""} required={!user} minLength={user ? undefined : 8} />
        </div>
        <div>
          <Label>Perfil</Label>
          {locked ? <input type="hidden" name="roleId" value={user?.roleId} /> : null}
          <Select name={locked ? undefined : "roleId"} defaultValue={user?.roleId} required disabled={locked}>
            {availableRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Ativo</Label>
          {locked ? <input type="hidden" name="isActive" value="true" /> : null}
          <Select name={locked ? undefined : "isActive"} defaultValue={locked || user?.isActive !== false ? "true" : "false"} disabled={locked}>
            <option value="true">Sim</option>
            {locked ? null : <option value="false">Não</option>}
          </Select>
        </div>
      </section>
      <Button disabled={pending}>{pending ? "A gravar..." : user ? "Guardar alterações" : "Criar utilizador"}</Button>
    </form>
  );
}
