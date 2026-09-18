import { LocationForm } from "@/components/admin/location-form";
import { requirePermission } from "@/server/permissions/check";

export default async function NewLocationPage() {
  await requirePermission("location:manage");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h2 className="text-2xl font-semibold">Nova localização</h2>
      <LocationForm />
    </div>
  );
}
