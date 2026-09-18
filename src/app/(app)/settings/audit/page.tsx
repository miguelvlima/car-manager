import Link from "next/link";
import { SettingsEmpty, SettingsListHeader, SettingsTable } from "@/components/settings/list-chrome";
import { LiveFilterForm } from "@/components/shared/live-filters";
import { formatDateTime } from "@/lib/format";
import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS } from "@/lib/labels";
import { requirePermission } from "@/server/permissions/check";
import { listAuditLogs } from "@/server/services/audit.service";

function jsonPreview(value: unknown) {
  if (value == null) return "—";
  try {
    return JSON.stringify(value);
  } catch {
    return "—";
  }
}

export default async function AuditSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePermission("audit:view");
  const query = await searchParams;
  const page = Number(query.page ?? 1);
  const { items, total, pageSize } = await listAuditLogs({ q: query.q, page });

  return (
    <div className="space-y-6">
      <SettingsListHeader title="Histórico" count={total} />
      <p className="text-sm text-muted-foreground">
        Criar, editar e eliminar ficam registados com utilizador, data e valores anteriores/novos.
      </p>
      <LiveFilterForm
        className="rounded-3xl border border-border bg-card p-4"
        fields={[{ type: "search", name: "q", placeholder: "Ação, entidade ou utilizador", className: "h-10 w-full rounded-lg border border-border px-3 text-sm" }]}
      />
      {items.length ? (
        <SettingsTable>
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Quando</th>
              <th className="px-4 py-3">Quem</th>
              <th className="px-4 py-3">Ação</th>
              <th className="px-4 py-3">Entidade</th>
              <th className="px-4 py-3">Antes / depois</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-border align-top hover:bg-muted/40">
                <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(item.createdAt)}</td>
                <td className="px-4 py-3">{item.user?.name ?? "Sistema"}</td>
                <td className="px-4 py-3">{AUDIT_ACTION_LABELS[item.action] ?? item.action}</td>
                <td className="px-4 py-3">
                  {AUDIT_ENTITY_LABELS[item.entityType] ?? item.entityType}
                  <p className="text-xs text-muted-foreground">{item.entityId}</p>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  <p className="max-w-md truncate" title={jsonPreview(item.previous)}>
                    Antes: {jsonPreview(item.previous)}
                  </p>
                  <p className="max-w-md truncate" title={jsonPreview(item.next)}>
                    Depois: {jsonPreview(item.next)}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </SettingsTable>
      ) : (
        <SettingsEmpty>Nenhuma ação registada com os filtros atuais.</SettingsEmpty>
      )}
      <div className="flex justify-end gap-2">
        {page > 1 ? (
          <Link href={`/settings/audit?page=${page - 1}${query.q ? `&q=${encodeURIComponent(query.q)}` : ""}`} className="rounded-lg border px-3 py-2 text-sm">
            Anterior
          </Link>
        ) : null}
        {page * pageSize < total ? (
          <Link href={`/settings/audit?page=${page + 1}${query.q ? `&q=${encodeURIComponent(query.q)}` : ""}`} className="rounded-lg border px-3 py-2 text-sm">
            Seguinte
          </Link>
        ) : null}
      </div>
    </div>
  );
}
