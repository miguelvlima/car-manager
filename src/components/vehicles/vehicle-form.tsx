"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { toDateInput } from "@/lib/format";
import { createVehicleAction, updateVehicleAction } from "@/server/actions";
import type { VehicleDTO } from "@/server/services/vehicle-mapper";

type Lookup = {
  statuses: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string }>;
  sources: Array<{ id: string; name: string }>;
  types: Array<{ id: string; name: string }>;
};

export function VehicleForm({
  vehicle,
  lookups,
  canEditOperational,
  canChangePrice,
  canSeeAcquisition,
}: {
  vehicle?: VehicleDTO;
  lookups: Lookup;
  canEditOperational: boolean;
  canChangePrice: boolean;
  canSeeAcquisition: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    const payload = Object.fromEntries(formData.entries());
    const result = vehicle
      ? await updateVehicleAction({ id: vehicle.id, ...payload })
      : await createVehicleAction(payload);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
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
        <Field label="VIN" name="vin" defaultValue={vehicle?.vin ?? ""} disabled={!canEditOperational && !!vehicle} />
        <Field label="Cor" name="color" defaultValue={vehicle?.color} />
        <Field label="Ano" name="year" type="number" defaultValue={vehicle?.year} />
        <Field label="Combustível" name="fuelType" defaultValue={vehicle?.fuelType} />
        <Field label="Caixa" name="transmission" defaultValue={vehicle?.transmission} />
        <Field label="Potência (cv)" name="powerHp" type="number" defaultValue={vehicle?.powerHp} />
        <Field label="Cilindrada" name="engineSizeCc" type="number" defaultValue={vehicle?.engineSizeCc} />
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
        <div>
          <Label>Tipo</Label>
          <Select name="vehicleTypeId" defaultValue={vehicle?.vehicleType.id} required>
            {lookups.types.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Estado</Label>
          <Select name="statusId" defaultValue={vehicle?.status.id} required>
            {lookups.statuses.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
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
        <div className="md:col-span-2">
          <Label>Notas comerciais</Label>
          <Textarea name="commercialNotes" defaultValue={vehicle?.commercialNotes ?? ""} />
        </div>
      </section>

      <section className="grid gap-4 rounded-3xl border border-border bg-card p-6 md:grid-cols-2">
        <h2 className="md:col-span-2 text-lg font-semibold">Preço</h2>
        <Field label="Preço de venda" name="salePrice" type="number" step="0.01" defaultValue={vehicle?.salePrice} disabled={!canChangePrice} />
        {canSeeAcquisition ? (
          <>
            <Field label="Preço de aquisição" name="acquisitionPrice" type="number" step="0.01" defaultValue={vehicle?.acquisitionPrice} />
            <Field label="Custos de preparação" name="preparationCost" type="number" step="0.01" defaultValue={vehicle?.preparationCost} />
          </>
        ) : null}
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
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  step?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input name={name} type={type} step={step} defaultValue={defaultValue ?? ""} required={required} disabled={disabled} />
    </div>
  );
}
