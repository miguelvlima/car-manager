import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { CatalogFilters } from "@/components/vehicles/vehicle-table";
import { requirePermission } from "@/server/permissions/check";
import { getLookups, listVehicles } from "@/server/services/vehicle.service";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await requirePermission("vehicle:view");
  const query = await searchParams;
  const [{ items }, lookups] = await Promise.all([
    listVehicles(actor, { ...query, catalog: true, pageSize: 24, year: query.year ? Number(query.year) : undefined }),
    getLookups(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Stock comercial</h1>
        <p className="text-sm text-muted-foreground">Disponíveis para venda</p>
      </div>
      <CatalogFilters locations={lookups.locations} query={query} />
      {items.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground">
          Não há viaturas disponíveis com estes filtros.
        </div>
      )}
    </div>
  );
}
