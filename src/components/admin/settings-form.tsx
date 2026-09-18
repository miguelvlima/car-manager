"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { saveSettingsAction } from "@/server/actions";
import type { StockAlertSettings } from "@/lib/stock";

export function SettingsForm({ settings }: { settings: StockAlertSettings }) {
  return (
    <form
      className="grid max-w-xl gap-4 rounded-3xl border border-border bg-card p-6"
      action={async (formData) => {
        const result = await saveSettingsAction({
          renewalOffsetDays: formData.get("renewalOffsetDays"),
          yellowFromDays: formData.get("yellowFromDays"),
          orangeFromDays: formData.get("orangeFromDays"),
          redFromDays: formData.get("redFromDays"),
        });
        if (!result.ok) toast.error(result.error);
        else toast.success("Configurações guardadas.");
      }}
    >
      <div>
        <Label>Dias a descontar numa renovação</Label>
        <Input name="renewalOffsetDays" type="number" defaultValue={settings.renewalOffsetDays} />
      </div>
      <div>
        <Label>Alerta amarelo a partir de (dias)</Label>
        <Input name="yellowFromDays" type="number" defaultValue={settings.yellowFromDays} />
      </div>
      <div>
        <Label>Alerta laranja a partir de (dias)</Label>
        <Input name="orangeFromDays" type="number" defaultValue={settings.orangeFromDays} />
      </div>
      <div>
        <Label>Alerta vermelho a partir de (dias)</Label>
        <Input name="redFromDays" type="number" defaultValue={settings.redFromDays} />
      </div>
      <Button>Guardar</Button>
    </form>
  );
}
