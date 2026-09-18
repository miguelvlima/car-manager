import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SettingsListHeader({
  title,
  count,
  actionHref,
  actionLabel,
}: {
  title: string;
  count: number;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{count} registos</p>
      </div>
      {actionHref && actionLabel ? (
        <Button asChild>
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}

export function SettingsEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
      {children}
    </div>
  );
}

export function SettingsTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">{children}</table>
      </div>
    </div>
  );
}
