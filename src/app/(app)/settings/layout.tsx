import { redirect } from "next/navigation";
import { SettingsNav } from "@/components/settings/settings-nav";
import { SETTINGS_TABS } from "@/lib/labels";
import { homePath } from "@/lib/navigation";
import { can, getActor } from "@/server/permissions/check";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  if (!actor) redirect("/login");

  const tabs = SETTINGS_TABS.filter((tab) => can(actor, tab.permission));
  if (!tabs.length) redirect(homePath(actor));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-accent">Backoffice</p>
        <h1 className="text-3xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Listas e parâmetros da operação, sem alterar código.</p>
      </div>
      <SettingsNav tabs={tabs} />
      {children}
    </div>
  );
}
