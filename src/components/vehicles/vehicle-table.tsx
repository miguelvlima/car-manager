import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { RowActions } from "@/components/shared/record-actions";
import { LiveFilterForm } from "@/components/shared/live-filters";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deleteVehicleAction } from "@/server/actions";
import type { VehicleDTO } from "@/server/services/vehicle-mapper";

export function VehicleTable({
  vehicles,
  canEdit = false,
  canDelete = false,
}: {
  vehicles: VehicleDTO[];
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

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Viatura</th>
              <th className="px-4 py-3">Matrícula</th>
              <th className="px-4 py-3">Localização</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Dias</th>
              <th className="px-4 py-3">Preço</th>
              <th className="px-4 py-3">Entrada</th>
              {showActions ? <th className="px-4 py-3 text-right">Ações</th> : null}
            </tr>
          </thead>
          <tbody>
            {vehicles.map((vehicle) => (
              <tr key={vehicle.id} className="border-t border-border hover:bg-muted/40">
                <td className="px-4 py-3">
                  <Link href={`/vehicles/${vehicle.id}`} className="font-medium hover:underline">
                    {vehicle.make} {vehicle.model}
                  </Link>
                  <p className="text-xs text-muted-foreground">{vehicle.version}</p>
                </td>
                <td className="px-4 py-3">{vehicle.licensePlateDisplay}</td>
                <td className="px-4 py-3">{vehicle.location?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge tone={vehicle.status.color}>{vehicle.status.name}</Badge>
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

export function CatalogFilters({
  locations,
}: {
  locations: Array<{ id: string; name: string }>;
  query?: Record<string, string | undefined>;
}) {
  return (
    <LiveFilterForm
      className="grid gap-3 rounded-3xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4"
      fields={[
        { type: "search", name: "q", placeholder: "Marca, modelo, matrícula...", className: "h-10 rounded-lg border border-border px-3 text-sm sm:col-span-2" },
        {
          type: "select",
          name: "locationId",
          emptyLabel: "Localização",
          options: locations.map((item) => ({ value: item.id, label: item.name })),
        },
        {
          type: "select",
          name: "sort",
          emptyLabel: "Mais recente",
          options: [
            { value: "price_asc", label: "Preço crescente" },
            { value: "price_desc", label: "Preço decrescente" },
            { value: "km_asc", label: "Menos quilómetros" },
          ],
        },
      ]}
    />
  );
}

export function VehicleFilters({
  statuses,
  locations,
  sources,
}: {
  statuses: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string }>;
  sources: Array<{ id: string; name: string }>;
  query?: Record<string, string | undefined>;
}) {
  return (
    <LiveFilterForm
      className="grid gap-3 rounded-3xl border border-border bg-card p-4 md:grid-cols-4 lg:grid-cols-5"
      preserve={["inStock", "available"]}
      fields={[
        { type: "search", name: "q", placeholder: "Matrícula, modelo, VIN", className: "h-10 rounded-lg border border-border px-3 text-sm md:col-span-2" },
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
        {
          type: "select",
          name: "sort",
          emptyLabel: "Mais recente",
          options: [
            { value: "oldest", label: "Mais antiga" },
            { value: "days_desc", label: "Mais dias em stock" },
            { value: "days_asc", label: "Menos dias em stock" },
            { value: "price_asc", label: "Preço crescente" },
            { value: "price_desc", label: "Preço decrescente" },
            { value: "km_asc", label: "Menos quilómetros" },
            { value: "km_desc", label: "Mais quilómetros" },
          ],
        },
      ]}
    />
  );
}
