import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SettingsEmpty, SettingsListHeader, SettingsTable } from "@/components/settings/list-chrome";
import { RowActions } from "@/components/shared/record-actions";
import { LOCATION_TYPE_LABELS } from "@/lib/labels";
import { LiveFilterForm } from "@/components/shared/live-filters";
import { deleteLocationAction } from "@/server/actions";
import { requirePermission } from "@/server/permissions/check";
import { listLocations } from "@/server/services/admin.service";

export default async function LocationsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePermission("location:manage");
  const query = await searchParams;
  const { items, total } = await listLocations(query);

  return (
    <div className="space-y-6">
      <SettingsListHeader title="Localizações" count={total} actionHref="/settings/locations/new" actionLabel="Nova localização" />
      <LiveFilterForm
        className="grid gap-3 rounded-3xl border border-border bg-card p-4 md:grid-cols-3"
        fields={[
          { type: "search", name: "q", placeholder: "Nome" },
          {
            type: "select",
            name: "type",
            emptyLabel: "Tipo",
            options: Object.entries(LOCATION_TYPE_LABELS).map(([value, label]) => ({ value, label })),
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
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Viaturas</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-border hover:bg-muted/40">
                <td className="px-4 py-3">
                  <Link href={`/settings/locations/${item.id}`} className="font-medium hover:underline">
                    {item.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{LOCATION_TYPE_LABELS[item.type]}</td>
                <td className="px-4 py-3">{item._count.vehicles}</td>
                <td className="px-4 py-3">
                  <Badge tone={item.isActive ? "green" : "slate"}>{item.isActive ? "Ativo" : "Inativo"}</Badge>
                </td>
                <td className="px-4 py-3">
                  <RowActions
                    id={item.id}
                    itemLabel={item.name}
                    editHref={`/settings/locations/${item.id}`}
                    deleteAction={deleteLocationAction}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </SettingsTable>
      ) : (
        <SettingsEmpty>Nenhuma localização encontrada com os filtros atuais.</SettingsEmpty>
      )}
    </div>
  );
}
