import { StatusForm } from "@/components/admin/status-form";
import { requirePermission } from "@/server/permissions/check";

export default async function NewStatusPage() {
  await requirePermission("settings:manage");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h2 className="text-2xl font-semibold">Novo estado</h2>
      <StatusForm />
    </div>
  );
}
