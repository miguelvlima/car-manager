import { VehicleForm } from "@/components/vehicles/vehicle-form";
import { can, requirePermission } from "@/server/permissions/check";
import { getLookups } from "@/server/services/vehicle.service";

export default async function NewVehiclePage() {
  const actor = await requirePermission("vehicle:create");
  const lookups = await getLookups();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-accent">Nova viatura</p>
        <h1 className="text-3xl font-semibold">Entrada em stock</h1>
      </div>
      <VehicleForm
        lookups={lookups}
        canEditOperational={can(actor, "vehicle:edit_operational")}
        canChangePrice={can(actor, "vehicle:change_price")}
        canSeeAcquisition={can(actor, "vehicle:view_acquisition_price")}
      />
    </div>
  );
}
