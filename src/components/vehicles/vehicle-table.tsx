import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { RowActions } from "@/components/shared/record-actions";
import { LiveFilterForm } from "@/components/shared/live-filters";
import { PhotoThumb } from "@/components/vehicles/photo-thumb";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deleteVehicleAction } from "@/server/actions";
import type { VehicleDTO } from "@/server/services/vehicle-mapper";

function sortHref(query: Record<string, string | undefined>, field: string, current?: string) {
  const next = current === `${field}_asc` ? `${field}_desc` : `${field}_asc`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value && key !== "sort" && key !== "page") params.set(key, value);
  }
  params.set("sort", next);
  return `?${params.toString()}`;
}

function SortLink({
  label,
  field,
  query,
  current,
}: {
  label: string;
  field: string;
  query: Record<string, string | undefined>;
  current?: string;
}) {
  const active = current === `${field}_asc` || current === `${field}_desc`;
  return (
    <Link href={sortHref(query, field, current)} className={cn("hover:text-foreground", active && "text-foreground")}>
      {label}
      {current === `${field}_asc` ? " ↑" : current === `${field}_desc` ? " ↓" : ""}
    </Link>
  );
}

export function VehicleTable({
  vehicles,
  query = {},
  canEdit = false,
  canDelete = false,
}: {
  vehicles: VehicleDTO[];
  query?: Record<string, string | undefined>;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  if (!vehicles.length) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
        Nenhuma viatura encontrada com os filtros atuais.
      </div>
    );
  }

  const showActions = canEdit || canDelete;
  const sort = query.sort;

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Foto</th>
              <th className="px-4 py-3">
                <SortLink label="Viatura" field="make" query={query} current={sort} />
              </th>
              <th className="px-4 py-3">
                <SortLink label="Matrícula" field="plate" query={query} current={sort} />
              </th>
              <th className="px-4 py-3">
                <SortLink label="Localização" field="location" query={query} current={sort} />
              </th>
              <th className="px-4 py-3">
                <SortLink label="Estado" field="status" query={query} current={sort} />
              </th>
              <th className="px-4 py-3">
                <SortLink label="Dias" field="days" query={query} current={sort} />
              </th>
              <th className="px-4 py-3">
                <SortLink label="Preço" field="price" query={query} current={sort} />
              </th>
              <th className="px-4 py-3">
                <SortLink label="Entrada" field="entry" query={query} current={sort} />
              </th>
              {showActions ? <th className="px-4 py-3 text-right">Ações</th> : null}
            </tr>
          </thead>
          <tbody>
            {vehicles.map((vehicle) => (
              <tr key={vehicle.id} className="border-t border-border hover:bg-muted/40">
                <td className="px-4 py-3">
                  {vehicle.primaryPhotoUrl ? (
                    <PhotoThumb src={vehicle.primaryPhotoUrl} alt={`${vehicle.make} ${vehicle.model}`} />
                  ) : (
                    <div className="h-12 w-16 rounded-lg bg-muted" />
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/vehicles/${vehicle.id}`} className="font-medium hover:underline">
                    {vehicle.make} {vehicle.model}
                  </Link>
                  <p className="text-xs text-muted-foreground">{vehicle.version || "—"}</p>
                </td>
                <td className="px-4 py-3">{vehicle.licensePlateDisplay}</td>
                <td className="px-4 py-3">{vehicle.location?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <Badge tone={vehicle.status.color}>{vehicle.status.name}</Badge>
                    {vehicle.activeSale?.actualDeliveryAt ? <Badge tone="slate">Entregue</Badge> : null}
                    {vehicle.activeSale && !vehicle.activeSale.actualDeliveryAt ? <Badge tone="blue">Vendida</Badge> : null}
                  </div>
                </td>
                <td className={cn("px-4 py-3 font-medium", `stock-${vehicle.ageLevel}`)}>{vehicle.daysInStock}</td>
                <td className="px-4 py-3">{formatMoney(vehicle.salePrice)}</td>
                <td className="px-4 py-3">{formatDate(vehicle.entryDate)}</td>
                {showActions ? (
                  <td className="px-4 py-3">
                    <RowActions
                      id={vehicle.id}
                      itemLabel={`${vehicle.make} ${vehicle.model}`}
                      editHref={`/vehicles/${vehicle.id}/edit`}
                      deleteAction={deleteVehicleAction}
                      canEdit={canEdit}
                      canDelete={canDelete}
                      message="A viatura sai das listagens. O histórico e o audit log mantêm-se."
                    />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function VehicleFilters({
  statuses,
  locations,
  sources,
  makes,
  models,
  versions,
}: {
  statuses: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string }>;
  sources: Array<{ id: string; name: string }>;
  makes: string[];
  models: string[];
  versions: string[];
}) {
  return (
    <LiveFilterForm
      className="grid gap-3 rounded-3xl border border-border bg-card p-4 md:grid-cols-4 lg:grid-cols-7"
      preserve={["inStock", "available", "sort"]}
      fields={[
        { type: "search", name: "q", placeholder: "Marca, modelo, versão, matrícula", className: "h-10 rounded-lg border border-border px-3 text-sm md:col-span-2 lg:col-span-2" },
        {
          type: "select",
          name: "make",
          emptyLabel: "Marca",
          options: makes.map((item) => ({ value: item, label: item })),
        },
        {
          type: "select",
          name: "model",
          emptyLabel: "Modelo",
          options: models.map((item) => ({ value: item, label: item })),
        },
        {
          type: "select",
          name: "version",
          emptyLabel: "Versão",
          options: versions.map((item) => ({ value: item, label: item })),
        },
        {
          type: "select",
          name: "statusId",
          emptyLabel: "Estado",
          options: statuses.map((item) => ({ value: item.id, label: item.name })),
        },
        {
          type: "select",
          name: "locationId",
          emptyLabel: "Localização",
          options: locations.map((item) => ({ value: item.id, label: item.name })),
        },
        {
          type: "select",
          name: "sourceId",
          emptyLabel: "Origem",
          options: sources.map((item) => ({ value: item.id, label: item.name })),
        },
      ]}
    />
  );
}
