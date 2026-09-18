import Link from "next/link";
import { redirect } from "next/navigation";
import { can, requirePermission } from "@/server/permissions/check";
import { getDashboardMetrics, getSalesReport, monthBounds } from "@/server/services/dashboard.service";
import { formatMoney } from "@/lib/format";

export default async function DashboardPage() {
  const actor = await requirePermission("vehicle:view");
  if (!can(actor, "report:view")) redirect("/catalog");

  const period = monthBounds();
  const [metrics, sales] = await Promise.all([
    getDashboardMetrics(),
    getSalesReport({ yearMonth: period.yearMonth }),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-accent">Dashboard</p>
        <h1 className="text-3xl font-semibold">Stock e vendas</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/vehicles?inStock=1"
          className="rounded-3xl border border-border bg-card p-6 transition-colors hover:border-primary/40 hover:bg-muted/40"
        >
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Stock</p>
          <p className="mt-2 text-4xl font-semibold">{metrics.totalStock}</p>
          <p className="mt-2 text-sm text-muted-foreground">Viaturas ainda connosco. Abrir lista.</p>
        </Link>
        <Link
          href="/vehicles?available=1"
          className="rounded-3xl border border-border bg-card p-6 transition-colors hover:border-primary/40 hover:bg-muted/40"
        >
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Disponíveis para venda</p>
          <p className="mt-2 text-4xl font-semibold">{metrics.available}</p>
          <p className="mt-2 text-sm text-muted-foreground">Prontas a comercializar. Abrir lista.</p>
        </Link>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Vendas do mês</h2>
            <p className="text-sm text-muted-foreground">
              {sales.count} viaturas · {formatMoney(sales.volume)}
            </p>
          </div>
          <Link href="/sales" className="text-sm font-medium text-accent hover:underline">
            Ver lista
          </Link>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <table className="w-full text-sm">
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
                  <Link href={`/sales?month=${period.yearMonth}`} className="hover:underline">
                    Todos
                  </Link>
                </td>
                <td className="px-4 py-3">{sales.count}</td>
                <td className="px-4 py-3">{formatMoney(sales.volume)}</td>
              </tr>
              {sales.sellers.map((seller) => (
                <tr key={seller.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <Link href={`/sales?month=${period.yearMonth}&sellerId=${seller.id}`} className="hover:underline">
                      {seller.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{seller.count}</td>
                  <td className="px-4 py-3">{formatMoney(seller.volume)}</td>
                </tr>
              ))}
              {!sales.sellers.length ? (
                <tr className="border-t border-border">
                  <td className="px-4 py-6 text-muted-foreground" colSpan={3}>
                    Ainda não há vendas este mês.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
