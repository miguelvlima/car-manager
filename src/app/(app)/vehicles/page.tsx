import Link from "next/link";
import { VehicleFilters, VehicleTable } from "@/components/vehicles/vehicle-table";
import { Button } from "@/components/ui/button";
import { can, requirePermission } from "@/server/permissions/check";
import { getLookups, listVehicles } from "@/server/services/vehicle.service";

function queryHref(query: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value && key !== "page") params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const text = params.toString();
  return text ? `/vehicles?${text}` : "/vehicles";
}

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await requirePermission("vehicle:view");
  const query = await searchParams;
  const page = Number(query.page ?? 1);
  const inStock = query.inStock === "1";
  const available = query.available === "1";
  const [{ items, total, pageSize }, lookups] = await Promise.all([
    listVehicles(actor, {
      ...query,
      page,
      pageSize: 20,
      year: query.year ? Number(query.year) : undefined,
      inStock,
      availableOnly: available,
    }),
    getLookups(),
  ]);

  const title = available || inStock ? "Stock" : "Viaturas";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-accent">Operação</p>
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{total} registos</p>
        </div>
        {can(actor, "vehicle:create") ? (
          <Button asChild>
            <Link href="/vehicles/new">Nova viatura</Link>
          </Button>
        ) : null}
      </div>
      <VehicleFilters
        statuses={lookups.statuses}
        locations={lookups.locations}
        sources={lookups.sources}
        makes={lookups.makes}
        models={lookups.models}
        versions={lookups.versions}
      />
      <VehicleTable vehicles={items} query={query} canEdit={can(actor, "vehicle:edit")} canDelete={can(actor, "vehicle:delete")} />
      <div className="flex justify-end gap-2">
        {page > 1 ? (
          <Link href={queryHref(query, page - 1)} className="rounded-lg border px-3 py-2 text-sm">
            Anterior
          </Link>
        ) : null}
        {page * pageSize < total ? (
          <Link href={queryHref(query, page + 1)} className="rounded-lg border px-3 py-2 text-sm">
            Seguinte
          </Link>
        ) : null}
      </div>
    </div>
  );
}
