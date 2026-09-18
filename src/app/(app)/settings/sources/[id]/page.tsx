import { SourceForm } from "@/components/admin/source-form";
import { SettingsEntityHeader } from "@/components/shared/record-actions";
import { deleteSourceAction } from "@/server/actions";
import { requirePermission } from "@/server/permissions/check";
import { getSource } from "@/server/services/admin.service";

export default async function EditSourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("source:manage");
  const { id } = await params;
  const source = await getSource(id);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SettingsEntityHeader
        title="Editar origem"
        id={source.id}
        itemLabel={source.name}
        deleteAction={deleteSourceAction}
        redirectTo="/settings/sources"
      />
      <SourceForm source={source} />
    </div>
  );
}
