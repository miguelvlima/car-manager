"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { toDateInput } from "@/lib/format";
import { operationalStatuses } from "@/lib/vehicle-status";
import { createVehicleAction, updateVehicleAction } from "@/server/actions";
import type { VehicleDTO } from "@/server/services/vehicle-mapper";

type Lookup = {
  statuses: Array<{ id: string; name: string; code: string; category?: string }>;
  locations: Array<{ id: string; name: string }>;
  sources: Array<{ id: string; name: string }>;
};

export function VehicleForm({
  vehicle,
  lookups,
  canEditOperational,
  canChangePrice,
}: {
  vehicle?: VehicleDTO;
  lookups: Lookup;
  canEditOperational: boolean;
  canChangePrice: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const statuses = operationalStatuses(lookups.statuses, vehicle?.status.code);

  async function onSubmit(formData: FormData) {
    setPending(true);
    const payload = Object.fromEntries(formData.entries());
    const result = vehicle
      ? await updateVehicleAction({ id: vehicle.id, ...payload })
      : await createVehicleAction(payload);
    if (!result.ok) {
      setPending(false);
      toast.error(result.error);
      return;
    }
    if (!vehicle && photos.length) {
      try {
        for (const file of photos) {
          const body = new FormData();
          body.append("file", file);
          const response = await fetch(`/api/vehicles/${result.data.id}/photos`, { method: "POST", body });
          if (!response.ok) {
            const data = (await response.json().catch(() => null)) as { error?: string } | null;
            throw new Error(data?.error ?? "Não foi possível carregar uma fotografia.");
          }
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "A viatura foi criada, mas as fotos falharam.");
        router.push(`/vehicles/${result.data.id}/edit`);
        router.refresh();
        setPending(false);
        return;
      }
    }
    setPending(false);
    toast.success(vehicle ? "Viatura atualizada." : "Viatura criada.");
    router.push(`/vehicles/${result.data.id}`);
    router.refresh();
  }

  return (
    <form action={onSubmit} className="space-y-8">
      <section className="grid gap-4 rounded-3xl border border-border bg-card p-6 md:grid-cols-2">
        <h2 className="md:col-span-2 text-lg font-semibold">Identificação</h2>
        <Field label="Marca" name="make" defaultValue={vehicle?.make} required />
        <Field label="Modelo" name="model" defaultValue={vehicle?.model} required />
        <Field label="Versão" name="version" defaultValue={vehicle?.version} />
        <Field label="Matrícula" name="licensePlate" defaultValue={vehicle?.licensePlate ?? ""} disabled={!canEditOperational && !!vehicle} />
        <Field label="Cor" name="color" defaultValue={vehicle?.color} />
        <Field label="Ano" name="year" type="number" defaultValue={vehicle?.year} />
        <Field label="Combustível" name="fuelType" defaultValue={vehicle?.fuelType} />
        <Field label="Portas" name="doors" type="number" defaultValue={vehicle?.doors} />
        <Field label="Lugares" name="seats" type="number" defaultValue={vehicle?.seats} />
      </section>

      <section className="grid gap-4 rounded-3xl border border-border bg-card p-6 md:grid-cols-2">
        <h2 className="md:col-span-2 text-lg font-semibold">Stock</h2>
        <Field label="Data de entrada" name="entryDate" type="date" defaultValue={toDateInput(vehicle?.entryDate ?? new Date())} required disabled={!canEditOperational && !!vehicle} />
        <div>
          <Label>Renovação</Label>
          <Select name="renewal" defaultValue={vehicle?.renewal ? "true" : "false"} disabled={!canEditOperational && !!vehicle}>
            <option value="false">Não</option>
            <option value="true">Sim</option>
          </Select>
        </div>
        <Field label="IPO" name="inspectionDate" type="date" defaultValue={toDateInput(vehicle?.inspectionDate)} />
        <Field label="Quilómetros" name="mileage" type="number" defaultValue={vehicle?.mileage} disabled={!canEditOperational && !!vehicle} />
        <Field label="N.º de chaves" name="numberOfKeys" type="number" defaultValue={vehicle?.numberOfKeys} />
        <div>
          <Label>Passaporte</Label>
          <Select name="passport" defaultValue={vehicle?.passport ? "true" : "false"}>
            <option value="false">Não</option>
            <option value="true">Sim</option>
          </Select>
        </div>
        {vehicle ? (
          <div>
            <Label>Estado</Label>
            <Select name="statusId" defaultValue={vehicle.status.id} required>
              {statuses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <div>
            <Label>Estado</Label>
            <Input value="A entrar" disabled />
            <p className="mt-1 text-xs text-muted-foreground">As novas viaturas entram sempre neste estado.</p>
          </div>
        )}
        <div>
          <Label>Localização</Label>
          <Select name="locationId" defaultValue={vehicle?.location?.id ?? ""}>
            <option value="">Sem localização</option>
            {lookups.locations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Origem</Label>
          <Select name="sourceId" defaultValue={vehicle?.source?.id ?? ""} disabled={!canEditOperational && !!vehicle}>
            <option value="">Sem origem</option>
            {lookups.sources.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
        <Field label="Relatório de peritagem (link)" name="inspectionReportUrl" defaultValue={vehicle?.inspectionReportUrl} placeholder="https://" />
        <Field label="Guia de transporte (link)" name="transportGuideUrl" defaultValue={vehicle?.transportGuideUrl} placeholder="https://" />
        <div className="md:col-span-2">
          <Label>Notas comerciais</Label>
          <Textarea name="commercialNotes" defaultValue={vehicle?.commercialNotes ?? ""} />
        </div>
      </section>

      {!vehicle ? (
        <section className="space-y-3 rounded-3xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Fotografias</h2>
          <p className="text-sm text-muted-foreground">Opcional. Pode carregar já as fotos da viatura.</p>
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*"
            multiple
            onChange={(event) => {
              setPhotos(Array.from(event.target.files ?? []));
            }}
          />
          {photos.length ? <p className="text-sm text-muted-foreground">{photos.length} ficheiro(s) selecionado(s).</p> : null}
        </section>
      ) : null}

      <section className="grid gap-4 rounded-3xl border border-border bg-card p-6 md:grid-cols-2">
        <h2 className="md:col-span-2 text-lg font-semibold">Preço</h2>
        <Field label="Preço de venda" name="salePrice" type="number" step="0.01" defaultValue={vehicle?.salePrice} disabled={!canChangePrice} />
      </section>

      <Button disabled={pending}>{pending ? "A gravar..." : vehicle ? "Guardar alterações" : "Criar viatura"}</Button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  disabled,
  step,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  step?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input name={name} type={type} step={step} defaultValue={defaultValue ?? ""} required={required} disabled={disabled} placeholder={placeholder} />
    </div>
  );
}
