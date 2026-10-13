import type { ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/shared/record-actions";
import { PhotoThumb } from "@/components/vehicles/photo-thumb";
import { DeliverDialog, RevertAvailabilityButton, SaleDialog } from "@/components/vehicles/sale-dialog";
import { formatDate, formatDateTime, formatKm, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { isSalesRole } from "@/lib/vehicle-status";
import { deleteVehicleAction } from "@/server/actions";
import { can, requirePermission } from "@/server/permissions/check";
import { getVehicleById } from "@/server/services/vehicle.service";
import { getPreparation } from "@/server/services/process.service";
import PreparationPanel from "@/components/vehicles/preparation-panel";

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
  const sold = Boolean(vehicle.activeSale);
  const delivered = Boolean(vehicle.activeSale?.actualDeliveryAt);
  const showHistory = !isSalesRole(actor.roleCode);

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
            <div className="flex flex-wrap gap-2">
              <Badge tone={vehicle.status.color}>{vehicle.status.name}</Badge>
              {delivered ? <Badge tone="slate">Entregue</Badge> : null}
              {sold && !delivered ? <Badge tone="blue">Vendida</Badge> : null}
            </div>
            <div>
              <h1 className="text-2xl font-semibold md:text-3xl">
                {vehicle.make} {vehicle.model}
              </h1>
              <p className="text-muted-foreground">{vehicle.version}</p>
            </div>
            <p className="text-lg">{vehicle.licensePlateDisplay}</p>
            <p className="text-3xl font-semibold">{formatMoney(vehicle.salePrice)}</p>
            <p className="text-sm text-muted-foreground">Localização: {vehicle.location?.name ?? "Sem localização"}</p>
            <div className="flex flex-wrap gap-2">
              {can(actor, "vehicle:edit") ? (
                <Button asChild variant="outline">
                  <Link href={`/vehicles/${vehicle.id}/edit`}>Editar</Link>
                </Button>
              ) : null}
              {can(actor, "vehicle:register_sale") && !sold ? (
                <SaleDialog
                  vehicleId={vehicle.id}
                  price={vehicle.salePrice}
                  sellerName={actor.name}
                  canChangeSeller={can(actor, "vehicle:change_seller")}
                />
              ) : null}
              {can(actor, "vehicle:mark_delivered") && sold && !delivered ? <DeliverDialog vehicleId={vehicle.id} /> : null}
              {can(actor, "vehicle:register_sale") && sold && !delivered ? <RevertAvailabilityButton vehicleId={vehicle.id} /> : null}
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

      <div className={cn("grid gap-6", showHistory ? "xl:grid-cols-[1.3fr_0.7fr]" : "")}>
        <section className="space-y-4 rounded-3xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Resumo</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Item label="Origem" value={vehicle.source?.name} />
            <Item label="Entrada" value={formatDate(vehicle.entryDate)} />
            <Item label="Stock" value={`${vehicle.daysInStock} dias`} className={`stock-${vehicle.ageLevel}`} />
            <Item label="Kms" value={formatKm(vehicle.mileage)} />
            <Item label="Combustível" value={vehicle.fuelType} />
            <Item label="Cor" value={vehicle.color} />
            {vehicle.inspectionReportUrl ? (
              <Item
                label="Peritagem"
                value={
                  <Link href={vehicle.inspectionReportUrl} target="_blank" className="text-accent hover:underline">
                    Abrir relatório
                  </Link>
                }
              />
            ) : null}
            {vehicle.transportGuideUrl ? (
              <Item
                label="Guia de transporte"
                value={
                  <Link href={vehicle.transportGuideUrl} target="_blank" className="text-accent hover:underline">
                    Abrir guia
                  </Link>
                }
              />
            ) : null}
          </dl>
          {vehicle.commercialNotes ? <p className="text-sm text-muted-foreground">{vehicle.commercialNotes}</p> : null}
          {locationHistory.length ? (
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Histórico de localização</p>
              <ol className="space-y-1 text-sm">
                {locationHistory.map((item) => (
                  <li key={item.id}>
                    {formatDateTime(item.changedAt)} · {item.fromLocation ?? "—"} → {item.toLocation ?? "—"}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
          {priceHistory.length ? (
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Histórico de preço</p>
              <ol className="space-y-1 text-sm">
                {priceHistory.map((item) => (
                  <li key={item.id}>
                    {formatDate(item.changedAt)} · {formatMoney(item.previousPrice ? Number(item.previousPrice) : null)} →{" "}
                    {formatMoney(Number(item.newPrice))}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </section>

        {showHistory ? (
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
        ) : null}
      </div>

      <PreparationPanel
        vehicleId={vehicle.id}
        canManageProcess={can(actor, "process:manage")}
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
              {photo.url ? (
                <PhotoThumb src={photo.url} alt="" className="aspect-[4/3] w-full object-cover" />
              ) : null}
              {photo.isPrimary ? (
                <span className="pointer-events-none absolute bottom-1 left-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                  Principal
                </span>
              ) : null}
            </div>
          ))}
          {!vehicle.photos.length ? <p className="col-span-full text-sm text-muted-foreground">Ainda não há fotografias.</p> : null}
        </div>
      </section>

      {vehicle.activeSale ? (
        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Venda</h2>
          <p>Vendedor: {vehicle.activeSale.seller.name}</p>
          <p>Data da venda: {formatDateTime(vehicle.activeSale.soldAt)}</p>
          <p>Preço final: {formatMoney(vehicle.activeSale.finalPrice)}</p>
          <p>Data de entrega: {formatDate(vehicle.activeSale.actualDeliveryAt)}</p>
          {vehicle.activeSale.notes ? <p>Observação da venda: {vehicle.activeSale.notes}</p> : null}
          {vehicle.activeSale.deliveryNotes ? <p>Observação da entrega: {vehicle.activeSale.deliveryNotes}</p> : null}
        </section>
      ) : null}
    </div>
  );
}

function Item({
  label,
  value,
  className,
}: {
  label: string;
  value?: ReactNode;
  className?: string;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={cn("text-sm font-medium", className)}>{value ?? "—"}</dd>
    </div>
  );
}
