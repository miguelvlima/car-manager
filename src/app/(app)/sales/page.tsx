import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { LiveFilterForm } from "@/components/shared/live-filters";
import { formatDate, formatMoney } from "@/lib/format";
import { formatPlate } from "@/lib/plate";
import { DeliverDialog, RevertAvailabilityButton, RevertDeliveryButton } from "@/components/vehicles/sale-dialog";
import { can, requirePermission } from "@/server/permissions/check";
import { getSalesReport } from "@/server/services/dashboard.service";
import { getLookups } from "@/server/services/vehicle.service";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await requirePermission("report:view");
  const query = await searchParams;
  const [{ count, volume, sellers, items, period: used }, lookups] = await Promise.all([
    getSalesReport({ yearMonth: query.month, sellerId: query.sellerId }),
    getLookups(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-accent">Comercial</p>
        <h1 className="text-3xl font-semibold">Vendas</h1>
        <p className="text-sm text-muted-foreground">
          {count} viaturas · {formatMoney(volume)}
        </p>
      </div>

      <LiveFilterForm
        className="flex flex-wrap gap-3 rounded-3xl border border-border bg-card p-4"
        defaults={{ month: used.yearMonth }}
        fields={[
          { type: "month", name: "month" },
          {
            type: "select",
            name: "sellerId",
            emptyLabel: "Todos os vendedores",
            options: lookups.users.map((user) => ({ value: user.id, label: user.name })),
          },
        ]}
      />

      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Vendedor</th>
              <th className="px-4 py-3">Unidades</th>
              <th className="px-4 py-3">Volume</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border font-medium">
              <td className="px-4 py-3">
                <Link href={`/sales?month=${used.yearMonth}`} className="hover:underline">
                  Todos
                </Link>
              </td>
              <td className="px-4 py-3">{count}</td>
              <td className="px-4 py-3">{formatMoney(volume)}</td>
            </tr>
            {sellers.map((seller) => (
              <tr key={seller.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <Link href={`/sales?month=${used.yearMonth}&sellerId=${seller.id}`} className="hover:underline">
                    {seller.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{seller.count}</td>
                <td className="px-4 py-3">{formatMoney(seller.volume)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {items.length ? (
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Viatura</th>
                <th className="px-4 py-3">Matrícula</th>
                <th className="px-4 py-3">Vendedor</th>
                <th className="px-4 py-3">Preço</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Entrega / anulação</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const delivered = Boolean(item.actualDeliveryAt);
                return (
                <tr key={item.id} className="border-t border-border hover:bg-muted/40">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(item.soldAt)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/vehicles/${item.vehicle.id}`} className="font-medium hover:underline">
                      {item.vehicle.make} {item.vehicle.model}
                    </Link>
                    <p className="text-xs text-muted-foreground">{item.vehicle.version}</p>
                  </td>
                  <td className="px-4 py-3">
                    {can(actor, "vehicle:view_license_plate") ? formatPlate(item.vehicle.licensePlate) : "—"}
                  </td>
                  <td className="px-4 py-3">{item.seller.name}</td>
                  <td className="px-4 py-3">{formatMoney(item.finalPrice)}</td>
                  <td className="px-4 py-3">
                    {delivered ? <Badge tone="slate">Entregue</Badge> : <Badge tone="blue">Vendida</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {delivered ? (
                        <>
                          <span className="whitespace-nowrap text-muted-foreground">{formatDate(item.actualDeliveryAt)}</span>
                          {can(actor, "vehicle:mark_delivered") ? (
                            <RevertDeliveryButton vehicleId={item.vehicle.id} size="sm" />
                          ) : null}
                        </>
                      ) : can(actor, "vehicle:mark_delivered") || can(actor, "vehicle:register_sale") ? (
                        <>
                          {can(actor, "vehicle:mark_delivered") ? (
                            <DeliverDialog vehicleId={item.vehicle.id} size="sm" />
                          ) : null}
                          {can(actor, "vehicle:register_sale") ? (
                            <RevertAvailabilityButton vehicleId={item.vehicle.id} size="sm" />
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          Não há vendas neste período.
        </div>
      )}
    </div>
  );
}
