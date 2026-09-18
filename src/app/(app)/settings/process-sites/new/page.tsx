import { ProcessSiteForm } from "@/components/admin/process-site-form";
import { requirePermission } from "@/server/permissions/check";

export default async function NewProcessSitePage() {
  await requirePermission("settings:manage");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h2 className="text-2xl font-semibold">Novo local de processo</h2>
      <ProcessSiteForm />
    </div>
  );
}
