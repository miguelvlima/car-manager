"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Car, CircleDollarSign, LayoutDashboard, LayoutGrid, LogOut, Menu, Settings, X } from "lucide-react";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { logoutAction } from "@/server/actions";
import { hasPermission } from "@/server/permissions/catalog";
import { SETTINGS_PERMISSIONS } from "@/lib/labels";
import {
  getBackLabel,
  getFallbackBackHref,
  homePath,
  isIndexPath,
  needsBackButton,
  resolveBackHref,
  returnStorageKey,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";

export type ShellActor = {
  id: string;
  name: string;
  roleCode: string;
  permissions: string[];
};

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "report:view" as const },
  { href: "/catalog", label: "Stock comercial", icon: LayoutGrid, permission: "vehicle:view" as const },
  { href: "/vehicles", label: "Viaturas", icon: Car, permission: "vehicle:view" as const },
  { href: "/sales", label: "Vendas", icon: CircleDollarSign, permission: "report:view" as const },
  { href: "/settings", label: "Configurações", icon: Settings, permission: "settings:manage" as const },
];

export function AppShell({ actor, children }: { actor: ShellActor; children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const items = NAV.filter((item) => {
    if (item.href === "/settings") {
      return SETTINGS_PERMISSIONS.some((permission) => hasPermission(actor.roleCode, actor.permissions, permission));
    }
    return hasPermission(actor.roleCode, actor.permissions, item.permission);
  });

  const query = searchParams.toString();

  useEffect(() => {
    if (isIndexPath(pathname)) {
      sessionStorage.setItem(returnStorageKey(pathname), `${pathname}${query ? `?${query}` : ""}`);
    }
    if (/^\/vehicles\/[^/]+$/.test(pathname)) {
      sessionStorage.setItem("cm:last-vehicle", pathname);
    }
  }, [pathname, query]);

  return (
    <div className="h-dvh overflow-hidden lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="hidden h-dvh overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
        <div className="shrink-0 border-b border-white/10 px-5 py-5">
          <Link href={homePath(actor)} className="block">
            <BrandLockup />
          </Link>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-hidden px-3 py-4">
          {items.map((item) => {
            const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/65 hover:bg-white/10 hover:text-white",
                  active && "bg-white/10 text-white",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="shrink-0 border-t border-white/10 p-4">
          <p className="text-sm font-medium text-white">{actor.name}</p>
          <p className="text-xs text-white/50">{actor.roleCode.replaceAll("_", " ")}</p>
          <LogoutButton className="mt-3 w-full" />
        </div>
      </aside>

      <div className="flex h-dvh min-h-0 flex-col">
        <div className="flex items-center gap-3 px-4 pt-4 lg:hidden">
          <button className="rounded-lg p-2" onClick={() => setOpen(true)} aria-label="Menu" type="button">
            <Menu className="h-5 w-5" />
          </button>
          <Link href={homePath(actor)}>
            <BrandLockup compact tone="light" />
          </Link>
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-6">
          <PageBack />
          {children}
        </main>
      </div>

      {open ? (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)}>
          <div className="h-full w-72 bg-sidebar p-4 text-sidebar-foreground" onClick={(event) => event.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <BrandLockup compact />
              <button onClick={() => setOpen(false)} aria-label="Fechar menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="space-y-1">
              {items.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-white/10">
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-6 border-t border-white/10 pt-4">
              <p className="px-1 text-sm font-medium text-white">{actor.name}</p>
              <LogoutButton className="mt-3 w-full" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PageBack() {
  const pathname = usePathname();
  const [href, setHref] = useState<string | null>(() =>
    needsBackButton(pathname) ? getFallbackBackHref(pathname) : null,
  );

  useEffect(() => {
    if (!needsBackButton(pathname)) {
      setHref(null);
      return;
    }
    setHref(
      resolveBackHref(
        pathname,
        sessionStorage.getItem(returnStorageKey(pathname)),
        sessionStorage.getItem("cm:last-vehicle"),
      ),
    );
  }, [pathname]);

  if (!href) return null;

  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      {getBackLabel(pathname)}
    </Link>
  );
}

function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logoutAction} className={className}>
      <button
        type="submit"
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 text-sm font-medium text-white hover:bg-white/10"
      >
        <LogOut className="h-4 w-4" />
        Sair
      </button>
    </form>
  );
}
