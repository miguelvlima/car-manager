import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SettingsEmpty, SettingsListHeader, SettingsTable } from "@/components/settings/list-chrome";
import { RowActions } from "@/components/shared/record-actions";
import { LiveFilterForm } from "@/components/shared/live-filters";
import { deleteSourceAction } from "@/server/actions";
import { requirePermission } from "@/server/permissions/check";
import { listSources } from "@/server/services/admin.service";

export default async function SourcesSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePermission("source:manage");
  const query = await searchParams;
  const { items, total } = await listSources(query);

  return (
    <div className="space-y-6">
      <SettingsListHeader title="Origens" count={total} actionHref="/settings/sources/new" actionLabel="Nova origem" />
      <LiveFilterForm
        className="grid gap-3 rounded-3xl border border-border bg-card p-4 md:grid-cols-3"
        fields={[
          { type: "search", name: "q", placeholder: "Nome ou código" },
          {
            type: "select",
            name: "support",
            emptyLabel: "Apoio comercial",
            options: [
              { value: "true", label: "Com apoio" },
              { value: "false", label: "Sem apoio" },
            ],
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
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Apoio</th>
              <th className="px-4 py-3">Viaturas</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-border hover:bg-muted/40">
                <td className="px-4 py-3">
                  <Link href={`/settings/sources/${item.id}`} className="font-medium hover:underline">
                    {item.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{item.code}</td>
                <td className="px-4 py-3">{item.hasCommercialSupport ? "Sim" : "Não"}</td>
                <td className="px-4 py-3">{item._count.vehicles}</td>
                <td className="px-4 py-3">
                  <Badge tone={item.isActive ? "green" : "slate"}>{item.isActive ? "Ativo" : "Inativo"}</Badge>
                </td>
                <td className="px-4 py-3">
                  <RowActions
                    id={item.id}
                    itemLabel={item.name}
                    editHref={`/settings/sources/${item.id}`}
                    deleteAction={deleteSourceAction}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </SettingsTable>
      ) : (
        <SettingsEmpty>Nenhuma origem encontrada com os filtros atuais.</SettingsEmpty>
      )}
    </div>
  );
}
