import { UserForm } from "@/components/admin/user-form";
import { SettingsEntityHeader } from "@/components/shared/record-actions";
import { prisma } from "@/lib/db";
import { deleteUserAction } from "@/server/actions";
import { requirePermission } from "@/server/permissions/check";
import { getUser } from "@/server/services/admin.service";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requirePermission("user:manage");
  const { id } = await params;
  const [user, roles] = await Promise.all([getUser(id), prisma.role.findMany({ orderBy: { name: "asc" } })]);
  const isProtectedUser = user.role?.code === "SUPER_ADMIN";
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {user.id === actor.id || isProtectedUser ? (
        <h2 className="text-2xl font-semibold">Editar utilizador</h2>
      ) : (
        <SettingsEntityHeader
          title="Editar utilizador"
          id={user.id}
          itemLabel={user.name}
          deleteAction={deleteUserAction}
          redirectTo="/settings/users"
          message="O utilizador deixa de poder entrar. O histórico das ações anteriores mantém-se."
        />
      )}
      <UserForm
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          roleId: user.roleId ?? user.role?.id ?? "",
          isActive: user.isActive,
          roleCode: user.role?.code,
        }}
        roles={roles}
      />
    </div>
  );
}
