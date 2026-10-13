import { RoleMatrix } from "@/components/admin/role-matrix";
import { requirePermission } from "@/server/permissions/check";
import { listRolesWithPermissions } from "@/server/services/admin.service";

export default async function RolesSettingsPage() {
  await requirePermission("role:manage");
  const { roles, catalog } = await listRolesWithPermissions();
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Perfis e permissões</h2>
        <p className="text-sm text-muted-foreground">
          Crie, edite e elimine perfis. O Super Admin tem de existir sempre e o utilizador associado não pode ser
          eliminado. Vendedores vêem todas as viaturas até haver data de entrega e só podem marcar como vendida; a
          entrega fica no admin. Já não existe reserva nem stock comercial. Todas as alterações ficam no histórico.
        </p>
      </div>
      <RoleMatrix
        roles={roles.map((role) => ({
          id: role.id,
          name: role.name,
          code: role.code,
          isSystem: role.isSystem,
          _count: role._count,
          permissions: role.permissions,
        }))}
        catalog={catalog}
      />
    </div>
  );
}
