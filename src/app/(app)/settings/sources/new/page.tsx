import { SourceForm } from "@/components/admin/source-form";
import { requirePermission } from "@/server/permissions/check";

export default async function NewSourcePage() {
  await requirePermission("source:manage");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h2 className="text-2xl font-semibold">Nova origem</h2>
      <SourceForm />
    </div>
  );
}
