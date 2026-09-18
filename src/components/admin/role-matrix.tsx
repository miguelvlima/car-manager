"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { ConfirmDeleteButton } from "@/components/shared/record-actions";
import { createRoleAction, deleteRoleAction, saveRoleMatrixAction } from "@/server/actions";
import { isSuperAdmin } from "@/server/permissions/catalog";
import { cn } from "@/lib/utils";

type RoleRow = {
  id: string;
  name: string;
  code: string;
  isSystem: boolean;
  _count: { users: number };
  permissions: Array<{ allowed: boolean; permission: { key: string } }>;
};

export function RoleMatrix({
  roles,
  catalog,
}: {
  roles: RoleRow[];
  catalog: readonly { key: string; name: string; group: string }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(roles[0]?.id ?? "");
  const [pendingSelect, setPendingSelect] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [copyFromRoleId, setCopyFromRoleId] = useState("");
  const role = roles.find((item) => item.id === selected);
  const locked = role ? isSuperAdmin(role.code) : false;
  const [keys, setKeys] = useState<string[]>(
    role?.permissions.filter((item) => item.allowed).map((item) => item.permission.key) ?? [],
  );

  function selectRole(id: string) {
    setSelected(id);
    const next = roles.find((item) => item.id === id);
    setKeys(next?.permissions.filter((item) => item.allowed).map((item) => item.permission.key) ?? []);
  }

  useEffect(() => {
    if (pendingSelect && roles.some((item) => item.id === pendingSelect)) {
      selectRole(pendingSelect);
      setPendingSelect(null);
      return;
    }
    if (!roles.some((item) => item.id === selected)) {
      selectRole(roles[0]?.id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles, selected, pendingSelect]);

  const groups = [...new Set(catalog.map((item) => item.group))];

  async function onCreate(formData: FormData) {
    setCreating(true);
    const result = await createRoleAction({
      name: String(formData.get("name") ?? ""),
      copyFromRoleId: String(formData.get("copyFromRoleId") ?? "") || undefined,
    });
    setCreating(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Perfil criado. Ajuste as permissões abaixo.");
    setName("");
    setCopyFromRoleId("");
    setPendingSelect(result.data.id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form action={onCreate} className="grid gap-3 rounded-3xl border border-border bg-card p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div>
          <Label htmlFor="role-name">Novo perfil</Label>
          <Input
            id="role-name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome do perfil"
            required
            minLength={2}
          />
        </div>
        <div>
          <Label htmlFor="copy-from">Copiar permissões de</Label>
          <Select
            id="copy-from"
            name="copyFromRoleId"
            value={copyFromRoleId}
            onChange={(event) => setCopyFromRoleId(event.target.value)}
          >
            <option value="">Começar vazio</option>
            {roles.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" disabled={creating}>
          {creating ? "A criar..." : "Criar perfil"}
        </Button>
      </form>
      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Perfil</th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Utilizadores</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((item) => {
                const protectedRole = isSuperAdmin(item.code);
                return (
                  <tr
                    key={item.id}
                    className={cn("border-t border-border hover:bg-muted/40", item.id === selected && "bg-muted/70")}
                  >
                    <td className="px-4 py-3">
                      <button type="button" className="font-medium hover:underline" onClick={() => selectRole(item.id)}>
                        {item.name}
                      </button>
                    </td>
                    <td className="px-4 py-3">{item.code}</td>
                    <td className="px-4 py-3">{item._count.users}</td>
                    <td className="px-4 py-3">
                      <Badge tone={protectedRole ? "slate" : "green"}>{protectedRole ? "Protegido" : "Editável"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        {protectedRole ? (
                          <span className="text-xs text-muted-foreground">Não eliminável</span>
                        ) : (
                          <ConfirmDeleteButton
                            id={item.id}
                            itemLabel={item.name}
                            deleteAction={deleteRoleAction}
                            message="Só é possível eliminar perfis sem utilizadores ativos. O Super Admin não pode ser eliminado."
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        A editar permissões de <span className="font-medium text-foreground">{role?.name ?? "—"}</span>
        {locked ? ". O Super Admin tem acesso absoluto e não pode ser alterado." : ". A gravação fica no histórico."}
      </p>
      {groups.map((group) => (
        <section key={group} className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 font-medium">{group}</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {catalog
              .filter((item) => item.group === group)
              .map((item) => (
                <label key={item.key} className={cn("flex items-center gap-2 text-sm", locked && "text-muted-foreground")}>
                  <input
                    type="checkbox"
                    checked={locked || keys.includes(item.key)}
                    disabled={locked}
                    onChange={(event) => {
                      setKeys((current) =>
                        event.target.checked ? [...current, item.key] : current.filter((key) => key !== item.key),
                      );
                    }}
                  />
                  {item.name}
                </label>
              ))}
          </div>
        </section>
      ))}
      <Button
        disabled={locked}
        onClick={async () => {
          const result = await saveRoleMatrixAction({ roleId: selected, permissions: keys });
          if (!result.ok) toast.error(result.error);
          else toast.success("Permissões atualizadas. A alteração ficou no histórico.");
        }}
      >
        Guardar matriz
      </Button>
    </div>
  );
}
