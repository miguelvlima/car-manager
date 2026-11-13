import { Badge } from "@/components/ui/badge";

export function VehicleStatusBadges({
  vehicle,
}: {
  vehicle: {
    status: { name: string; color: string };
  };
}) {
  return <Badge tone={vehicle.status.color}>{vehicle.status.name}</Badge>;
}
