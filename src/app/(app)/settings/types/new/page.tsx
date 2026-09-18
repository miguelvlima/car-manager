import { VehicleTypeForm } from "@/components/admin/vehicle-type-form";
import { requirePermission } from "@/server/permissions/check";

export default async function NewVehicleTypePage() {
  await requirePermission("settings:manage");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h2 className="text-2xl font-semibold">Novo tipo de viatura</h2>
      <VehicleTypeForm />
    </div>
  );
}
