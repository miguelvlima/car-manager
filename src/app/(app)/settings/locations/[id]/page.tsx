import { LocationForm } from "@/components/admin/location-form";
import { SettingsEntityHeader } from "@/components/shared/record-actions";
import { deleteLocationAction } from "@/server/actions";
import { requirePermission } from "@/server/permissions/check";
import { getLocation } from "@/server/services/admin.service";

export default async function EditLocationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("location:manage");
  const { id } = await params;
  const location = await getLocation(id);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SettingsEntityHeader
        title="Editar localização"
        id={location.id}
        itemLabel={location.name}
        deleteAction={deleteLocationAction}
        redirectTo="/settings/locations"
      />
      <LocationForm location={location} />
    </div>
  );
}
