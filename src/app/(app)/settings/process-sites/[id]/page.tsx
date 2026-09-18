import { ProcessSiteForm } from "@/components/admin/process-site-form";
import { SettingsEntityHeader } from "@/components/shared/record-actions";
import { deleteProcessSiteAction } from "@/server/actions";
import { requirePermission } from "@/server/permissions/check";
import { getProcessSite } from "@/server/services/admin.service";

export default async function EditProcessSitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("settings:manage");
  const { id } = await params;
  const site = await getProcessSite(id);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SettingsEntityHeader
        title="Editar local de processo"
        id={site.id}
        itemLabel={site.name}
        deleteAction={deleteProcessSiteAction}
        redirectTo="/settings/process-sites"
      />
      <ProcessSiteForm site={site} />
    </div>
  );
}
