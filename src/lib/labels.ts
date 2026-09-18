import type { PermissionKey } from "@/server/permissions/catalog";

export const LOCATION_TYPE_LABELS = {
  STAND: "Stand",
  EXPOSICAO: "Exposição",
  OFICINA: "Oficina",
  ARMAZEM: "Armazém",
  CLIENTE: "Cliente",
  CEDIDO: "Cedido",
  OUTRO: "Outro",
} as const;

export const PROCESS_SITE_KIND_LABELS = {
  REFURBISHMENT: "Recondicionamento",
  CLEANING: "Higienização",
  SERVICE: "Revisão",
  GENERAL: "Geral",
} as const;

export const STATUS_CATEGORY_LABELS = {
  operational: "Operacional",
  commercial: "Comercial",
  terminal: "Final",
} as const;

export const PHOTOGRAPHY_STATUS_LABELS: Record<string, string> = {
  NOT_PHOTOGRAPHED: "Sem fotos",
  PHOTOGRAPHED: "Fotografada",
  IN_TREATMENT: "Em tratamento",
  READY_TO_PUBLISH: "Pronta a publicar",
  PUBLISHED: "Publicada",
  UNPUBLISHED: "Despublicada",
};

export const STATUS_COLORS = ["green", "yellow", "orange", "red", "blue", "slate"] as const;

export const SETTINGS_TABS: Array<{
  href: string;
  label: string;
  permission: PermissionKey;
}> = [
  { href: "/settings/locations", label: "Localizações", permission: "location:manage" },
  { href: "/settings/sources", label: "Origens", permission: "source:manage" },
  { href: "/settings/users", label: "Utilizadores", permission: "user:manage" },
  { href: "/settings/roles", label: "Perfis e permissões", permission: "role:manage" },
  { href: "/settings/statuses", label: "Estados", permission: "settings:manage" },
  { href: "/settings/types", label: "Tipos de viatura", permission: "settings:manage" },
  { href: "/settings/process-sites", label: "Locais de processo", permission: "settings:manage" },
  { href: "/settings/alerts", label: "Alertas e parâmetros", permission: "settings:manage" },
  { href: "/settings/audit", label: "Histórico", permission: "audit:view" },
];

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  CREATE_VEHICLE: "Viatura criada",
  UPDATE_VEHICLE: "Viatura atualizada",
  DELETE_VEHICLE: "Viatura eliminada",
  CREATE_USER: "Utilizador criado",
  UPDATE_USER: "Utilizador atualizado",
  DELETE_USER: "Utilizador eliminado",
  UPDATE_ROLE_PERMISSIONS: "Permissões do perfil atualizadas",
  DELETE_ROLE: "Perfil eliminado",
  CREATE_LOCATION: "Localização criada",
  UPDATE_LOCATION: "Localização atualizada",
  DELETE_LOCATION: "Localização eliminada",
  CREATE_SOURCE: "Origem criada",
  UPDATE_SOURCE: "Origem atualizada",
  DELETE_SOURCE: "Origem eliminada",
  CREATE_STATUS: "Estado criado",
  UPDATE_STATUS: "Estado atualizado",
  DELETE_STATUS: "Estado eliminado",
  CREATE_VEHICLE_TYPE: "Tipo de viatura criado",
  UPDATE_VEHICLE_TYPE: "Tipo de viatura atualizado",
  DELETE_VEHICLE_TYPE: "Tipo de viatura eliminado",
  CREATE_PROCESS_SITE: "Local de processo criado",
  UPDATE_PROCESS_SITE: "Local de processo atualizado",
  DELETE_PROCESS_SITE: "Local de processo eliminado",
  REGISTER_SALE: "Venda registada",
  RESERVE_VEHICLE: "Viatura reservada",
  CANCEL_RESERVATION: "Reserva anulada",
  CANCEL_SALE: "Venda anulada",
  ADD_PHOTO: "Fotografia adicionada",
  SET_PRIMARY_PHOTO: "Fotografia principal definida",
  DELETE_PHOTO: "Fotografia eliminada",
  MARK_PHOTOGRAPHED: "Viatura fotografada",
  MARK_PUBLISHED: "Viatura publicada",
  REFURBISHMENT_STARTED: "Recondicionamento iniciado",
  REFURBISHMENT_PICKED_UP: "Voltou do recondicionamento",
  CLEANING_STARTED: "Higienização iniciada",
  CLEANING_COMPLETED: "Higienização concluída",
  SERVICE_STARTED: "Revisão iniciada",
  SERVICE_COMPLETED: "Revisão concluída",
};

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  Vehicle: "Viatura",
  User: "Utilizador",
  Role: "Perfil",
  Location: "Localização",
  VehicleSource: "Origem",
  VehicleStatus: "Estado",
  VehicleType: "Tipo de viatura",
  ProcessSite: "Local de processo",
  VehiclePhoto: "Fotografia",
};

export const SETTINGS_PERMISSIONS = SETTINGS_TABS.map((tab) => tab.permission);
