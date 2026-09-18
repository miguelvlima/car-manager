import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "slate",
  ...props
}: React.ComponentProps<"span"> & { tone?: string }) {
  const tones: Record<string, string> = {
    green: "bg-emerald-500/15 text-emerald-800",
    yellow: "bg-amber-400/20 text-amber-900",
    orange: "bg-orange-500/15 text-orange-800",
    red: "bg-red-500/15 text-red-800",
    blue: "bg-sky-500/15 text-sky-800",
    slate: "bg-slate-500/15 text-slate-700",
    copper: "bg-accent/15 text-accent",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        tones[tone] ?? tones.slate,
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border border-border bg-card shadow-sm", className)} {...props} />;
}

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} {...props} />;
}
