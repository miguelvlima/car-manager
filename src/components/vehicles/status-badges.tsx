import { Badge } from "@/components/ui/badge";
import { saleStatusOverlay } from "@/lib/vehicle-status";

export function VehicleStatusBadges({
  vehicle,
}: {
  vehicle: {
    status: { code: string; name: string; color: string };
    activeSale?: { actualDeliveryAt?: Date | string | null } | null;
  };
}) {
  const { showCatalogStatus, delivered, sold } = saleStatusOverlay(vehicle);
  return (
    <>
      {showCatalogStatus ? <Badge tone={vehicle.status.color}>{vehicle.status.name}</Badge> : null}
      {delivered ? <Badge tone="slate">Entregue</Badge> : null}
      {sold ? <Badge tone="blue">Vendida</Badge> : null}
    </>
  );
}
