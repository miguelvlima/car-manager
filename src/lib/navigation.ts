import { hasPermission } from "@/server/permissions/catalog";

export function homePath(actor: { roleCode: string; permissions: Iterable<string> }) {
  return hasPermission(actor.roleCode, actor.permissions, "report:view") ? "/dashboard" : "/catalog";
}

export function isIndexPath(pathname: string) {
  if (pathname === "/dashboard" || pathname === "/catalog" || pathname === "/vehicles" || pathname === "/sales") return true;
  if (/^\/settings\/[^/]+$/.test(pathname)) return true;
  return false;
}

export function needsBackButton(pathname: string) {
  return !isIndexPath(pathname) && pathname !== "/settings";
}

export function getFallbackBackHref(pathname: string) {
  if (pathname === "/vehicles/new") return "/vehicles";
  const vehicleEdit = pathname.match(/^\/vehicles\/([^/]+)\/edit$/);
  if (vehicleEdit) return `/vehicles/${vehicleEdit[1]}`;
  if (/^\/vehicles\/[^/]+$/.test(pathname)) return "/vehicles";
  const settingsNew = pathname.match(/^\/settings\/([^/]+)\/new$/);
  if (settingsNew) return `/settings/${settingsNew[1]}`;
  const settingsItem = pathname.match(/^\/settings\/([^/]+)\/[^/]+$/);
  if (settingsItem) return `/settings/${settingsItem[1]}`;
  return "/dashboard";
}

export function getBackLabel(pathname: string) {
  if (/^\/vehicles\/[^/]+\/edit$/.test(pathname)) return "Voltar à ficha";
  if (pathname === "/vehicles/new") return "Voltar às viaturas";
  if (/^\/vehicles\/[^/]+$/.test(pathname)) return "Voltar";
  if (pathname.startsWith("/settings/")) return "Voltar à lista";
  return "Voltar";
}

export function returnStorageKey(pathname: string) {
  if (pathname.startsWith("/settings/")) {
    const tab = pathname.split("/")[2] ?? "settings";
    return `cm:return:settings:${tab}`;
  }
  return "cm:return:stock";
}

export function isValidStoredReturn(stored: string, pathname: string) {
  if (!stored.startsWith("/")) return false;
  if (pathname.startsWith("/settings/")) {
    const tab = pathname.split("/")[2];
    return Boolean(tab) && stored.startsWith(`/settings/${tab}`);
  }
  return (
    stored.startsWith("/vehicles") ||
    stored.startsWith("/catalog") ||
    stored.startsWith("/dashboard") ||
    stored.startsWith("/sales")
  );
}

export function resolveBackHref(pathname: string, stored: string | null, lastVehicle: string | null) {
  const fallback = getFallbackBackHref(pathname);
  const vehicleEdit = pathname.match(/^\/vehicles\/([^/]+)\/edit$/);
  if (vehicleEdit) {
    const sheet = `/vehicles/${vehicleEdit[1]}`;
    if (lastVehicle === sheet) return sheet;
    if (stored && isValidStoredReturn(stored, pathname)) return stored;
    return fallback;
  }
  if (stored && isValidStoredReturn(stored, pathname)) return stored;
  return fallback;
}
