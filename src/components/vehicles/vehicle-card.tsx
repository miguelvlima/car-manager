import Link from "next/link";
import { MapPin } from "lucide-react";
import { formatKm, formatMoney } from "@/lib/format";
import type { VehicleDTO } from "@/server/services/vehicle-mapper";

export function VehicleCard({ vehicle }: { vehicle: VehicleDTO }) {
  return (
    <Link
      href={`/vehicles/${vehicle.id}`}
      className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-colors hover:border-primary/30"
    >
      <div className="relative aspect-[16/10] bg-muted">
        {vehicle.primaryPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={vehicle.primaryPhotoUrl} alt={`${vehicle.make} ${vehicle.model}`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem fotografia</div>
        )}
      </div>
      <div className="space-y-2 p-5">
        <div>
          <h3 className="text-lg font-semibold">
            {vehicle.make} {vehicle.model}
          </h3>
          <p className="text-sm text-muted-foreground">{vehicle.version ?? "—"}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {vehicle.year ?? "—"} · {formatKm(vehicle.mileage)}
        </p>
        <p className="text-2xl font-semibold">{formatMoney(vehicle.salePrice)}</p>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          {vehicle.location?.name ?? "Sem localização"}
        </p>
      </div>
    </Link>
  );
}
