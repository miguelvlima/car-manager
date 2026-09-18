import { SettingsForm } from "@/components/admin/settings-form";
import { requirePermission } from "@/server/permissions/check";
import { getStockSettings } from "@/server/services/settings.service";

export default async function AlertsSettingsPage() {
  await requirePermission("settings:manage");
  const settings = await getStockSettings();
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Alertas e parâmetros</h2>
        <p className="text-sm text-muted-foreground">
          Dias de renovação e limiares de idade do stock. Os dias em stock continuam a ser calculados, nunca gravados.
        </p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  );
}
