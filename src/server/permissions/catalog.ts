export const PERMISSION_CATALOG = [
  { key: "vehicle:view", resource: "vehicle", action: "view", group: "Viaturas", name: "Ver viaturas" },
  { key: "vehicle:create", resource: "vehicle", action: "create", group: "Viaturas", name: "Criar viaturas" },
  { key: "vehicle:edit", resource: "vehicle", action: "edit", group: "Viaturas", name: "Editar viaturas" },
  { key: "vehicle:edit_operational", resource: "vehicle", action: "edit_operational", group: "Viaturas", name: "Editar dados operacionais" },
  { key: "vehicle:delete", resource: "vehicle", action: "delete", group: "Viaturas", name: "Apagar viaturas" },
  { key: "vehicle:change_status", resource: "vehicle", action: "change_status", group: "Viaturas", name: "Alterar estado" },
  { key: "vehicle:change_location", resource: "vehicle", action: "change_location", group: "Viaturas", name: "Alterar localização" },
  { key: "vehicle:register_sale", resource: "vehicle", action: "register_sale", group: "Vendas", name: "Registar venda" },
  { key: "vehicle:reserve", resource: "vehicle", action: "reserve", group: "Vendas", name: "Reservar" },
  { key: "vehicle:change_seller", resource: "vehicle", action: "change_seller", group: "Vendas", name: "Alterar vendedor da venda" },
  { key: "vehicle:change_price", resource: "vehicle", action: "change_price", group: "Preços", name: "Alterar preço" },
  { key: "vehicle:view_acquisition_price", resource: "vehicle", action: "view_acquisition_price", group: "Preços", name: "Ver preço de aquisição" },
  { key: "vehicle:view_license_plate", resource: "vehicle", action: "view_license_plate", group: "Viaturas", name: "Ver matrícula" },
  { key: "vehicle:export", resource: "vehicle", action: "export", group: "Relatórios", name: "Exportar informação" },
  { key: "photo:manage", resource: "photo", action: "manage", group: "Viaturas", name: "Gerir fotografias" },
  { key: "document:manage", resource: "document", action: "manage", group: "Viaturas", name: "Gerir documentos" },
  { key: "process:manage", resource: "process", action: "manage", group: "Processos", name: "Gerir processos de oficina" },
  { key: "user:manage", resource: "user", action: "manage", group: "Backoffice", name: "Gerir utilizadores" },
  { key: "role:manage", resource: "role", action: "manage", group: "Backoffice", name: "Gerir perfis e permissões" },
  { key: "report:view", resource: "report", action: "view", group: "Relatórios", name: "Ver relatórios" },
  { key: "import:excel", resource: "import", action: "excel", group: "Backoffice", name: "Importar Excel" },
  { key: "audit:view", resource: "audit", action: "view", group: "Backoffice", name: "Ver audit log" },
  { key: "location:manage", resource: "location", action: "manage", group: "Configurações", name: "Gerir localizações" },
  { key: "source:manage", resource: "source", action: "manage", group: "Configurações", name: "Gerir origens" },
  { key: "settings:manage", resource: "settings", action: "manage", group: "Configurações", name: "Gerir configurações" },
] as const;

export type PermissionKey = (typeof PERMISSION_CATALOG)[number]["key"];

export const ROLE_CODES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  SALES: "SALES",
  VIEWER: "VIEWER",
} as const;

export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  SUPER_ADMIN: PERMISSION_CATALOG.map((item) => item.key),
  ADMIN: [
    "vehicle:view",
    "vehicle:create",
    "vehicle:edit",
    "vehicle:edit_operational",
    "vehicle:delete",
    "vehicle:change_status",
    "vehicle:change_location",
    "vehicle:register_sale",
    "vehicle:reserve",
    "vehicle:change_price",
    "vehicle:view_acquisition_price",
    "vehicle:view_license_plate",
    "vehicle:export",
    "photo:manage",
    "document:manage",
    "process:manage",
    "report:view",
    "audit:view",
    "location:manage",
    "source:manage",
  ],
  SALES: [
    "vehicle:view",
    "vehicle:view_license_plate",
    "vehicle:register_sale",
    "vehicle:reserve",
  ],
  VIEWER: ["vehicle:view", "vehicle:view_license_plate"],
};

export function isSuperAdmin(roleCode: string) {
  return roleCode === ROLE_CODES.SUPER_ADMIN;
}

export function hasPermission(roleCode: string, permissions: Iterable<string>, key: PermissionKey) {
  if (isSuperAdmin(roleCode)) return true;
  if (permissions instanceof Set) return permissions.has(key);
  return new Set(permissions).has(key);
}
