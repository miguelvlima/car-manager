import { StatusForm } from "@/components/admin/status-form";
import { SettingsEntityHeader } from "@/components/shared/record-actions";
import { deleteStatusAction } from "@/server/actions";
import { requirePermission } from "@/server/permissions/check";
import { getStatus } from "@/server/services/admin.service";

export default async function EditStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("settings:manage");
  const { id } = await params;
  const status = await getStatus(id);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SettingsEntityHeader
        title="Editar estado"
        id={status.id}
        itemLabel={status.name}
        deleteAction={deleteStatusAction}
        redirectTo="/settings/statuses"
        message="Se o estado já tiver sido usado no stock ou no histórico, a eliminação é recusada. Nesse caso, inative-o."
      />
      <StatusForm status={status} />
    </div>
  );
}
