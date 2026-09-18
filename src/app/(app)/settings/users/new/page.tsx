import { UserForm } from "@/components/admin/user-form";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/server/permissions/check";

export default async function NewUserPage() {
  await requirePermission("user:manage");
  const roles = await prisma.role.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h2 className="text-2xl font-semibold">Novo utilizador</h2>
      <UserForm roles={roles} />
    </div>
  );
}
