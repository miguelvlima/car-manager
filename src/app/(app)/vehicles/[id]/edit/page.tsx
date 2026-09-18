import { VehicleForm } from "@/components/vehicles/vehicle-form";
import PhotoEditor from "@/components/vehicles/photo-uploader";
import { ConfirmDeleteButton } from "@/components/shared/record-actions";
import { can, requirePermission } from "@/server/permissions/check";
import { deleteVehicleAction } from "@/server/actions";
import { getLookups, getVehicleById } from "@/server/services/vehicle.service";

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requirePermission("vehicle:edit");
  const { id } = await params;
  const [{ vehicle }, lookups] = await Promise.all([getVehicleById(actor, id), getLookups()]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-accent">{vehicle.internalCode}</p>
          <h1 className="text-3xl font-semibold">
            Editar {vehicle.make} {vehicle.model}
          </h1>
        </div>
        {can(actor, "vehicle:delete") ? (
          <ConfirmDeleteButton
            id={vehicle.id}
            itemLabel={`${vehicle.make} ${vehicle.model}`}
            deleteAction={deleteVehicleAction}
            redirectTo="/vehicles"
            message="A viatura sai das listagens. O histórico e o audit log mantêm-se."
          />
        ) : null}
      </div>
      {can(actor, "photo:manage") ? (
        <PhotoEditor
          vehicleId={vehicle.id}
          photos={vehicle.photos.map((photo) => ({ id: photo.id, url: photo.url, isPrimary: photo.isPrimary }))}
        />
      ) : null}
      <VehicleForm
        vehicle={vehicle}
        lookups={lookups}
        canEditOperational={can(actor, "vehicle:edit_operational")}
        canChangePrice={can(actor, "vehicle:change_price")}
        canSeeAcquisition={can(actor, "vehicle:view_acquisition_price")}
      />
    </div>
  );
}
