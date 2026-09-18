import { VehicleTypeForm } from "@/components/admin/vehicle-type-form";
import { SettingsEntityHeader } from "@/components/shared/record-actions";
import { deleteVehicleTypeAction } from "@/server/actions";
import { requirePermission } from "@/server/permissions/check";
import { getVehicleType } from "@/server/services/admin.service";

export default async function EditVehicleTypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("settings:manage");
  const { id } = await params;
  const type = await getVehicleType(id);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SettingsEntityHeader
        title="Editar tipo de viatura"
        id={type.id}
        itemLabel={type.name}
        deleteAction={deleteVehicleTypeAction}
        redirectTo="/settings/types"
      />
      <VehicleTypeForm type={type} />
    </div>
  );
}
