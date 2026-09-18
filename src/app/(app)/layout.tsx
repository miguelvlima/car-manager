import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { getActor } from "@/server/permissions/check";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  if (!actor) redirect("/login");
  return (
    <Suspense>
      <AppShell
        actor={{
          id: actor.id,
          name: actor.name,
          roleCode: actor.roleCode,
          permissions: Array.from(actor.permissions),
        }}
      >
        {children}
      </AppShell>
    </Suspense>
  );
}
