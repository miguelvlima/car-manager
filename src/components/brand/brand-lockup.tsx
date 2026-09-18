import { cn } from "@/lib/utils";

export function BrandLockup({
  tone = "dark",
  compact = false,
}: {
  tone?: "dark" | "light";
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", compact && "gap-2.5")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/car-manager-logo.png"
        alt=""
        className={cn("rounded-xl object-cover", compact ? "h-9 w-9" : "h-10 w-10")}
      />
      <p
        className={cn(
          "font-sans font-semibold tracking-tight",
          compact ? "text-sm" : "text-base",
          tone === "dark" ? "text-sidebar-foreground" : "text-foreground",
        )}
      >
        CAR MANAGER
      </p>
    </div>
  );
}
