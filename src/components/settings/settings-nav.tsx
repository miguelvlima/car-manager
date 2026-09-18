"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SettingsNav({
  tabs,
}: {
  tabs: Array<{ href: string; label: string }>;
}) {
  const pathname = usePathname();

  return (
    <div className="overflow-x-auto">
      <nav className="flex min-w-max gap-1 rounded-2xl border border-border bg-card p-1">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "rounded-xl px-3 py-2 text-sm whitespace-nowrap transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
