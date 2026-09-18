import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SettingsEmpty, SettingsListHeader, SettingsTable } from "@/components/settings/list-chrome";
import { RowActions } from "@/components/shared/record-actions";
import { PROCESS_SITE_KIND_LABELS } from "@/lib/labels";
import { LiveFilterForm } from "@/components/shared/live-filters";
import { deleteProcessSiteAction } from "@/server/actions";
import { requirePermission } from "@/server/permissions/check";
import { listProcessSites } from "@/server/services/admin.service";

export default async function ProcessSitesSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePermission("settings:manage");
  const query = await searchParams;
  const { items, total } = await listProcessSites(query);

  return (
    <div className="space-y-6">
      <SettingsListHeader title="Locais de processo" count={total} actionHref="/settings/process-sites/new" actionLabel="Novo local" />
      <LiveFilterForm
        className="grid gap-3 rounded-3xl border border-border bg-card p-4 md:grid-cols-3"
        fields={[
          { type: "search", name: "q", placeholder: "Nome" },
          {
            type: "select",
            name: "kind",
            emptyLabel: "Tipo de processo",
            options: Object.entries(PROCESS_SITE_KIND_LABELS).map(([value, label]) => ({ value, label })),
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
              <th className="px-4 py-3">Processo</th>
              <th className="px-4 py-3">Utilização</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-border hover:bg-muted/40">
                <td className="px-4 py-3">
                  <Link href={`/settings/process-sites/${item.id}`} className="font-medium hover:underline">
                    {item.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{PROCESS_SITE_KIND_LABELS[item.kind]}</td>
                <td className="px-4 py-3">
                  {item._count.refurbishments + item._count.cleaningProcesses + item._count.serviceProcesses}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={item.isActive ? "green" : "slate"}>{item.isActive ? "Ativo" : "Inativo"}</Badge>
                </td>
                <td className="px-4 py-3">
                  <RowActions
                    id={item.id}
                    itemLabel={item.name}
                    editHref={`/settings/process-sites/${item.id}`}
                    deleteAction={deleteProcessSiteAction}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </SettingsTable>
      ) : (
        <SettingsEmpty>Nenhum local encontrado com os filtros atuais.</SettingsEmpty>
      )}
    </div>
  );
}
