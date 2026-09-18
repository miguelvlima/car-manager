import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/shared/record-actions";
import { ReserveButton, RevertAvailabilityButton, SaleDialog } from "@/components/vehicles/sale-dialog";
import { formatDate, formatDateTime, formatKm, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deleteVehicleAction } from "@/server/actions";
import { can, requirePermission } from "@/server/permissions/check";
import { getVehicleById } from "@/server/services/vehicle.service";
import { getPreparation } from "@/server/services/process.service";
import PreparationPanel from "@/components/vehicles/preparation-panel";
import { PHOTOGRAPHY_STATUS_LABELS } from "@/lib/labels";

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requirePermission("vehicle:view");
  const { id } = await params;
  const [{ vehicle, events, locationHistory, priceHistory }, preparation] = await Promise.all([
    getVehicleById(actor, id),
    getPreparation(id),
  ]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-5 md:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="w-36 shrink-0 sm:w-44">
            {vehicle.primaryPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={vehicle.primaryPhotoUrl}
                alt={`${vehicle.make} ${vehicle.model}`}
                className="aspect-[4/3] w-full rounded-2xl bg-muted object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-muted text-xs text-muted-foreground">
                Sem fotografia
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <Badge tone={vehicle.status.color}>{vehicle.status.name}</Badge>
            <div>
              <h1 className="text-2xl font-semibold md:text-3xl">
                {vehicle.make} {vehicle.model}
              </h1>
              <p className="text-muted-foreground">{vehicle.version}</p>
            </div>
            <p className="text-lg">{vehicle.licensePlateDisplay}</p>
            <p className="text-3xl font-semibold">{formatMoney(vehicle.salePrice)}</p>
            <div className="flex flex-wrap gap-2">
              {can(actor, "vehicle:edit") ? (
                <Button asChild variant="outline">
                  <Link href={`/vehicles/${vehicle.id}/edit`}>Editar</Link>
                </Button>
              ) : null}
              {can(actor, "vehicle:reserve") && vehicle.status.isAvailableForSale ? <ReserveButton vehicleId={vehicle.id} /> : null}
              {can(actor, "vehicle:register_sale") && ["DISPONIVEL_PARA_VENDA", "RESERVADO"].includes(vehicle.status.code) ? (
                <SaleDialog
                  vehicleId={vehicle.id}
                  price={vehicle.salePrice}
                  sellerName={actor.name}
                  canChangeSeller={can(actor, "vehicle:change_seller")}
                />
              ) : null}
              {can(actor, "vehicle:reserve") && vehicle.status.code === "RESERVADO" ? (
                <RevertAvailabilityButton vehicleId={vehicle.id} kind="reservation" />
              ) : null}
              {can(actor, "vehicle:register_sale") &&
              vehicle.activeSale &&
              ["VENDIDO", "AGUARDA_ENTREGA"].includes(vehicle.status.code) ? (
                <RevertAvailabilityButton vehicleId={vehicle.id} kind="sale" />
              ) : null}
              {can(actor, "vehicle:delete") ? (
                <ConfirmDeleteButton
                  id={vehicle.id}
                  itemLabel={`${vehicle.make} ${vehicle.model}`}
                  deleteAction={deleteVehicleAction}
                  redirectTo="/vehicles"
                  message="A viatura sai das listagens. O histórico e o audit log mantêm-se."
                  size="default"
                  variant="outline"
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {vehicle.alerts.length ? (
        <div className="flex flex-wrap gap-2">
          {vehicle.alerts.map((alert) => (
            <span key={alert.code} className={cn("rounded-full px-3 py-1 text-sm", `stock-${alert.tone}`)}>
              ⚠ {alert.label}
            </span>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="space-y-4 rounded-3xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Resumo</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Item label="Origem" value={vehicle.source?.name} />
            <Item label="Entrada" value={formatDate(vehicle.entryDate)} />
            <Item label="Stock" value={`${vehicle.daysInStock} dias`} className={`stock-${vehicle.ageLevel}`} />
            <Item label="Kms" value={formatKm(vehicle.mileage)} />
            <Item label="Localização" value={vehicle.location?.name} />
            <Item label="Combustível" value={vehicle.fuelType} />
            <Item label="Caixa" value={vehicle.transmission} />
            <Item label="Cor" value={vehicle.color} />
            <Item label="Fotos" value={PHOTOGRAPHY_STATUS_LABELS[vehicle.photographyStatus] ?? vehicle.photographyStatus} />
          </dl>
          {vehicle.commercialNotes ? <p className="text-sm text-muted-foreground">{vehicle.commercialNotes}</p> : null}
        </section>

        <section className="space-y-4 rounded-3xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Histórico</h2>
          <ol className="space-y-4">
            {events.map((event) => (
              <li key={event.id} className="border-l-2 border-accent/40 pl-4">
                <p className="text-xs text-muted-foreground">{formatDateTime(event.occurredAt)}</p>
                <p className="font-medium">{event.title}</p>
                {event.notes ? <p className="text-sm text-muted-foreground">{event.notes}</p> : null}
                <p className="text-xs text-muted-foreground">{event.user?.name}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <PreparationPanel
        vehicleId={vehicle.id}
        photographyStatus={vehicle.photographyStatus}
        canManageProcess={can(actor, "process:manage")}
        canManagePhoto={can(actor, "photo:manage")}
        processSites={preparation.processSites}
        refurbishment={preparation.refurbishment}
        cleaning={preparation.cleaning}
        service={preparation.service}
      />

      <section className="space-y-4 rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Fotografias</h2>
          {can(actor, "vehicle:edit") ? (
            <Link href={`/vehicles/${vehicle.id}/edit`} className="text-sm font-medium text-accent hover:underline">
              Alterar na edição
            </Link>
          ) : null}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {vehicle.photos.map((photo) => (
            <div key={photo.id} className="relative overflow-hidden rounded-xl bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url ?? ""} alt="" className="aspect-[4/3] w-full object-cover" />
              {photo.isPrimary ? (
                <span className="absolute bottom-1 left-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                  Principal
                </span>
              ) : null}
            </div>
          ))}
          {!vehicle.photos.length ? <p className="col-span-full text-sm text-muted-foreground">Ainda não há fotografias.</p> : null}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Preço</h2>
          <p className="text-3xl font-semibold">{formatMoney(vehicle.salePrice)}</p>
          {vehicle.previousPrice != null ? (
            <p className="text-sm text-muted-foreground">Anterior: {formatMoney(vehicle.previousPrice)}</p>
          ) : null}
          {can(actor, "vehicle:view_acquisition_price") ? (
            <div className="mt-4 space-y-1 text-sm">
              <p>Aquisição: {formatMoney(vehicle.acquisitionPrice)}</p>
              <p>Preparação: {formatMoney(vehicle.preparationCost)}</p>
              <p>Margem estimada: {formatMoney(vehicle.estimatedMargin)}</p>
            </div>
          ) : null}
          <ol className="mt-4 space-y-2 text-sm">
            {priceHistory.map((item) => (
              <li key={item.id}>
                {formatDate(item.changedAt)} · {formatMoney(item.previousPrice ? Number(item.previousPrice) : null)} →{" "}
                {formatMoney(Number(item.newPrice))} · {item.changedBy?.name}
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-3xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Localização</h2>
          <p className="text-xl font-medium">{vehicle.location?.name ?? "Sem localização"}</p>
          <ol className="mt-4 space-y-2 text-sm">
            {locationHistory.map((item) => (
              <li key={item.id}>
                {formatDateTime(item.changedAt)} · {item.fromLocation ?? "—"} → {item.toLocation ?? "—"}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {vehicle.activeSale ? (
        <section className="rounded-3xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-lg font-semibold">Venda</h2>
            {can(actor, "vehicle:register_sale") && ["VENDIDO", "AGUARDA_ENTREGA"].includes(vehicle.status.code) ? (
              <RevertAvailabilityButton vehicleId={vehicle.id} kind="sale" />
            ) : null}
          </div>
          <p>Vendedor: {vehicle.activeSale.seller.name}</p>
          <p>Data: {formatDateTime(vehicle.activeSale.soldAt)}</p>
          <p>Preço final: {formatMoney(vehicle.activeSale.finalPrice)}</p>
          <p>Entrega prevista: {formatDate(vehicle.activeSale.expectedDeliveryAt)}</p>
        </section>
      ) : null}
    </div>
  );
}

function Item({ label, value, className }: { label: string; value?: string | null; className?: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={cn("text-sm font-medium", className)}>{value ?? "—"}</dd>
    </div>
  );
}
