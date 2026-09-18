import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SettingsEmpty, SettingsListHeader, SettingsTable } from "@/components/settings/list-chrome";
import { RowActions } from "@/components/shared/record-actions";
import { STATUS_CATEGORY_LABELS } from "@/lib/labels";
import { LiveFilterForm } from "@/components/shared/live-filters";
import { deleteStatusAction } from "@/server/actions";
import { requirePermission } from "@/server/permissions/check";
import { listStatuses } from "@/server/services/admin.service";

export default async function StatusesSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePermission("settings:manage");
  const query = await searchParams;
  const { items, total } = await listStatuses(query);

  return (
    <div className="space-y-6">
      <SettingsListHeader title="Estados" count={total} actionHref="/settings/statuses/new" actionLabel="Novo estado" />
      <LiveFilterForm
        className="grid gap-3 rounded-3xl border border-border bg-card p-4 md:grid-cols-3"
        fields={[
          { type: "search", name: "q", placeholder: "Nome" },
          {
            type: "select",
            name: "category",
            emptyLabel: "Categoria",
            options: Object.entries(STATUS_CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
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
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Venda</th>
              <th className="px-4 py-3">Viaturas</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-border hover:bg-muted/40">
                <td className="px-4 py-3">
                  <Link href={`/settings/statuses/${item.id}`} className="font-medium hover:underline">
                    {item.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{item.code}</td>
                <td className="px-4 py-3">
                  {STATUS_CATEGORY_LABELS[item.category as keyof typeof STATUS_CATEGORY_LABELS] ?? item.category}
                </td>
                <td className="px-4 py-3">{item.isAvailableForSale ? "Sim" : "Não"}</td>
                <td className="px-4 py-3">{item._count.vehicles}</td>
                <td className="px-4 py-3">
                  <Badge tone={item.color}>{item.isActive ? "Ativo" : "Inativo"}</Badge>
                </td>
                <td className="px-4 py-3">
                  <RowActions
                    id={item.id}
                    itemLabel={item.name}
                    editHref={`/settings/statuses/${item.id}`}
                    deleteAction={deleteStatusAction}
                    message="Se o estado já tiver sido usado no stock ou no histórico, a eliminação é recusada. Nesse caso, inative-o."
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </SettingsTable>
      ) : (
        <SettingsEmpty>Nenhum estado encontrado com os filtros atuais.</SettingsEmpty>
      )}
    </div>
  );
}
