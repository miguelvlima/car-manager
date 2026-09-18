import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SettingsEmpty, SettingsListHeader, SettingsTable } from "@/components/settings/list-chrome";
import { RowActions } from "@/components/shared/record-actions";
import { LiveFilterForm } from "@/components/shared/live-filters";
import { deleteVehicleTypeAction } from "@/server/actions";
import { requirePermission } from "@/server/permissions/check";
import { listVehicleTypes } from "@/server/services/admin.service";

export default async function TypesSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePermission("settings:manage");
  const query = await searchParams;
  const { items, total } = await listVehicleTypes(query);

  return (
    <div className="space-y-6">
      <SettingsListHeader title="Tipos de viatura" count={total} actionHref="/settings/types/new" actionLabel="Novo tipo" />
      <LiveFilterForm
        className="grid gap-3 rounded-3xl border border-border bg-card p-4 md:grid-cols-2"
        fields={[
          { type: "search", name: "q", placeholder: "Nome" },
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
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Viaturas</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-border hover:bg-muted/40">
                <td className="px-4 py-3">
                  <Link href={`/settings/types/${item.id}`} className="font-medium hover:underline">
                    {item.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{item.code}</td>
                <td className="px-4 py-3">{item._count.vehicles}</td>
                <td className="px-4 py-3">
                  <Badge tone={item.isActive ? "green" : "slate"}>{item.isActive ? "Ativo" : "Inativo"}</Badge>
                </td>
                <td className="px-4 py-3">
                  <RowActions
                    id={item.id}
                    itemLabel={item.name}
                    editHref={`/settings/types/${item.id}`}
                    deleteAction={deleteVehicleTypeAction}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </SettingsTable>
      ) : (
        <SettingsEmpty>Nenhum tipo encontrado com os filtros atuais.</SettingsEmpty>
      )}
    </div>
  );
}
