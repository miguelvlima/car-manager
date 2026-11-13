"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { toDateInput } from "@/lib/format";
import { uploadVehiclePhotos } from "@/lib/photos/upload-vehicle-photos";
import { dropdownCommercialStatuses, isButtonCommercialStatus, statusesByCategory } from "@/lib/vehicle-status";
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
  const operationalOptions = withCurrent(
    statusesByCategory(lookups.statuses, "operational"),
    vehicle?.operationalStatus,
  );
  const commercialOptions = withCurrent(
    dropdownCommercialStatuses(lookups.statuses),
    vehicle && !isButtonCommercialStatus(vehicle.commercialStatus.code) ? vehicle.commercialStatus : undefined,
  );
  const commercialLocked = Boolean(
    vehicle && (vehicle.activeSale || isButtonCommercialStatus(vehicle.commercialStatus.code)),
  );

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
      const toastId = "create-photos";
      try {
        await uploadVehiclePhotos(result.data.id, photos, (message) => toast.loading(message, { id: toastId }));
        toast.dismiss(toastId);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? `A viatura foi criada, mas as fotos falharam: ${error.message}`
            : "A viatura foi criada, mas as fotos falharam. Abra a ficha e tente carregar outra vez.",
          { id: toastId, duration: 8000 },
        );
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
          <>
            <div>
              <Label>Estado operacional</Label>
              <Select name="operationalStatusId" defaultValue={vehicle.operationalStatus.id} required>
                {operationalOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Estado comercial</Label>
              {commercialLocked ? (
                <>
                  <Input value={vehicle.commercialStatus.name} disabled />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {vehicle.commercialStatus.code === "ENTREGUE"
                      ? "Entregue não se altera aqui. Na ficha, use Anular entrega — a viatura volta a Vendido."
                      : vehicle.commercialStatus.code === "DEVOLVIDO"
                        ? "Devolvido não se altera aqui. Na ficha, use Anular devolução."
                        : "Vendido não se altera aqui. Na ficha, use Anular venda. Depois de entregue, só com Anular entrega."}
                  </p>
                </>
              ) : (
                <Select name="commercialStatusId" defaultValue={vehicle.commercialStatus.id} required>
                  {commercialOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          </>
        ) : (
          <>
            <div>
              <Label>Estado operacional</Label>
              <Input value="A entrar" disabled />
              <p className="mt-1 text-xs text-muted-foreground">As novas viaturas entram sempre neste estado.</p>
            </div>
            <div>
              <Label>Estado comercial</Label>
              <Input value="Disponível para venda" disabled />
              <p className="mt-1 text-xs text-muted-foreground">As novas viaturas ficam disponíveis para venda.</p>
            </div>
          </>
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
            accept="image/*,.heic,.heif,.avif,.bmp,.tif,.tiff,.dng,.gif"
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

function withCurrent<T extends { id: string }>(list: T[], current?: T) {
  if (!current) return list;
  if (list.some((item) => item.id === current.id)) return list;
  return [current, ...list];
}
