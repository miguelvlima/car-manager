import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SettingsEmpty, SettingsListHeader, SettingsTable } from "@/components/settings/list-chrome";
import { RowActions } from "@/components/shared/record-actions";
import { LiveFilterForm } from "@/components/shared/live-filters";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/db";
import { deleteUserAction } from "@/server/actions";
import { requirePermission } from "@/server/permissions/check";
import { listUsersFiltered } from "@/server/services/admin.service";

export default async function UsersSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await requirePermission("user:manage");
  const query = await searchParams;
  const [{ items, total }, roles] = await Promise.all([
    listUsersFiltered(query),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <SettingsListHeader title="Utilizadores" count={total} actionHref="/settings/users/new" actionLabel="Novo utilizador" />
      <LiveFilterForm
        className="grid gap-3 rounded-3xl border border-border bg-card p-4 md:grid-cols-3"
        fields={[
          { type: "search", name: "q", placeholder: "Nome ou email" },
          {
            type: "select",
            name: "roleId",
            emptyLabel: "Perfil",
            options: roles.map((role) => ({ value: role.id, label: role.name })),
          },
          {
            type: "select",
            name: "isActive",
            emptyLabel: "Ativo / inativo",
            options: [
              { value: "true", label: "Ativo" },
              { value: "false", label: "Inativo" },
            ],
          },
        ]}
      />
      {items.length ? (
        <SettingsTable>
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Perfil</th>
              <th className="px-4 py-3">Último login</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((user) => (
              <tr key={user.id} className="border-t border-border hover:bg-muted/40">
                <td className="px-4 py-3">
                  <Link href={`/settings/users/${user.id}`} className="font-medium hover:underline">
                    {user.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">{user.role?.name ?? "—"}</td>
                <td className="px-4 py-3">{formatDateTime(user.lastLoginAt)}</td>
                <td className="px-4 py-3">
                  <Badge tone={user.isActive ? "green" : "slate"}>{user.isActive ? "Ativo" : "Inativo"}</Badge>
                </td>
                <td className="px-4 py-3">
                  <RowActions
                    id={user.id}
                    itemLabel={user.name}
                    editHref={`/settings/users/${user.id}`}
                    deleteAction={deleteUserAction}
                    canDelete={user.id !== actor.id && user.role?.code !== "SUPER_ADMIN"}
                    message="O utilizador deixa de poder entrar. O histórico das ações anteriores mantém-se."
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </SettingsTable>
      ) : (
        <SettingsEmpty>Nenhum utilizador encontrado com os filtros atuais.</SettingsEmpty>
      )}
    </div>
  );
}
