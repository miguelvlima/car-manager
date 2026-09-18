import { redirect } from "next/navigation";
import { homePath } from "@/lib/navigation";
import { SETTINGS_TABS } from "@/lib/labels";
import { can, getActor } from "@/server/permissions/check";

export default async function SettingsIndexPage() {
  const actor = await getActor();
  if (!actor) redirect("/login");
  const first = SETTINGS_TABS.find((tab) => can(actor, tab.permission));
  redirect(first?.href ?? homePath(actor));
}
