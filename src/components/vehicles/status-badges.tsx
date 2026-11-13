import { Badge } from "@/components/ui/badge";

export function VehicleStatusBadges({
  vehicle,
}: {
  vehicle: {
    operationalStatus?: { name: string; color: string } | null;
    commercialStatus?: { name: string; color: string } | null;
  };
}) {
  return (
    <>
      {vehicle.operationalStatus ? (
        <Badge tone={vehicle.operationalStatus.color}>{vehicle.operationalStatus.name}</Badge>
      ) : null}
      {vehicle.commercialStatus ? (
        <Badge tone={vehicle.commercialStatus.color}>{vehicle.commercialStatus.name}</Badge>
      ) : null}
    </>
  );
}
