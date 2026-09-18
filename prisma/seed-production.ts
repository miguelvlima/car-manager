import { PrismaClient, type PhotographyStatus } from "@prisma/client";
import { bootstrapCatalog } from "./bootstrap";
import { normalizePlate } from "../src/lib/plate";

const prisma = new PrismaClient();

const VEHICLES: Array<{
  make: string;
  model: string;
  version?: string;
  licensePlate: string;
  color?: string;
  year?: number;
  fuelType?: string;
  transmission?: string;
  mileage?: number;
  salePrice?: number;
  acquisitionPrice?: number;
  entryDate: string;
  status: string;
  location?: string;
  source?: string;
  type?: string;
  photographyStatus?: PhotographyStatus;
  photo?: string;
  reserved?: boolean;
  sold?: { soldAt: string; price: number; expectedDeliveryAt?: string; deliveredAt?: string };
}> = [
  {
    make: "Toyota",
    model: "bZ4X",
    version: "Comfort AWD",
    licensePlate: "TU-40-BZ",
    color: "Azul",
    year: 2024,
    fuelType: "Elétrico",
    mileage: 9800,
    salePrice: 39900,
    entryDate: "2026-08-28",
    status: "A_ENTRAR",
    location: "Armazém Feira",
    source: "TCAP",
  },
  {
    make: "Toyota",
    model: "Aygo X",
    version: "Play 1.0",
    licensePlate: "BJ-52-DT",
    color: "Preto",
    year: 2024,
    fuelType: "Gasolina",
    transmission: "Manual",
    mileage: 37372,
    salePrice: 18900,
    acquisitionPrice: 15200,
    entryDate: "2026-09-13",
    status: "EM_PREPARACAO",
    location: "Feira",
    source: "TCAP",
  },
  {
    make: "Toyota",
    model: "RAV4",
    version: "2.5 Hybrid AWD",
    licensePlate: "DE-44-RV",
    color: "Branco Pérola",
    year: 2022,
    fuelType: "Híbrido",
    mileage: 54012,
    salePrice: 34900,
    entryDate: "2026-03-20",
    status: "EM_RECONDICIONAMENTO",
    location: "Espinho",
    source: "RETOMA",
  },
  {
    make: "Toyota",
    model: "Prius",
    version: "Plug-in Comfort",
    licensePlate: "NO-19-PR",
    color: "Branco",
    year: 2024,
    fuelType: "Híbrido Plug-in",
    mileage: 15400,
    salePrice: 36900,
    entryDate: "2026-09-01",
    status: "AGUARDA_HIGIENIZACAO",
    location: "Feira",
    source: "KINTO",
    photographyStatus: "PHOTOGRAPHED",
  },
  {
    make: "Toyota",
    model: "GR Yaris",
    version: "1.6 Circuit Pack",
    licensePlate: "RS-16-GR",
    color: "Branco",
    year: 2022,
    fuelType: "Gasolina",
    mileage: 18750,
    salePrice: 44900,
    entryDate: "2026-07-01",
    status: "AGUARDA_REVISAO",
    location: "Espinho",
    source: "COMPRA",
  },
  {
    make: "Toyota",
    model: "Proace City",
    version: "1.5 D-4D",
    licensePlate: "HI-90-PC",
    color: "Branco",
    year: 2022,
    fuelType: "Diesel",
    mileage: 91000,
    salePrice: 19900,
    entryDate: "2026-07-22",
    status: "PRONTO_PARA_FOTOGRAFAR",
    location: "Stand Feira",
    source: "COMPRA",
  },
  {
    make: "Toyota",
    model: "C-HR",
    version: "1.8 Hybrid Advance",
    licensePlate: "FG-11-CH",
    color: "Vermelho",
    year: 2021,
    fuelType: "Híbrido",
    mileage: 67890,
    salePrice: 22900,
    entryDate: "2026-01-15",
    status: "AGUARDA_PUBLICACAO",
    location: "Armazém Feira",
    source: "TCAP",
    photographyStatus: "READY_TO_PUBLISH",
    photo: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1600&q=80",
  },
  {
    make: "Toyota",
    model: "C-HR",
    version: "1.8 Hybrid Exclusive",
    licensePlate: "BB-35-ZR",
    color: "Cinza",
    year: 2024,
    fuelType: "Híbrido",
    transmission: "Automática",
    mileage: 32450,
    salePrice: 28900,
    acquisitionPrice: 24100,
    entryDate: "2026-08-02",
    status: "DISPONIVEL_PARA_VENDA",
    location: "Feira",
    source: "TCAP",
    photographyStatus: "PUBLISHED",
    photo: "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=1600&q=80",
  },
  {
    make: "Toyota",
    model: "Hilux",
    version: "2.8 D-4D Extra Cab",
    licensePlate: "JK-28-HX",
    color: "Cinza",
    year: 2021,
    fuelType: "Diesel",
    mileage: 102340,
    salePrice: 32900,
    entryDate: "2026-04-08",
    status: "RESERVADO",
    location: "EXP. Ovar",
    source: "COMPRA",
    photographyStatus: "PUBLISHED",
    photo: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=1600&q=80",
    reserved: true,
  },
  {
    make: "Toyota",
    model: "Yaris",
    version: "1.5 Hybrid Comfort",
    licensePlate: "BC-15-YR",
    color: "Vermelho",
    year: 2022,
    fuelType: "Híbrido",
    mileage: 45120,
    salePrice: 17900,
    entryDate: "2026-04-18",
    status: "VENDIDO",
    location: "Feira",
    source: "TCAP",
    photographyStatus: "PUBLISHED",
    type: "SERVICO",
    sold: { soldAt: "2026-09-05", price: 17500 },
  },
];

async function nextInternalCode() {
  const year = new Date().getFullYear();
  const prefix = `V-${year}-`;
  const last = await prisma.vehicle.findFirst({
    where: { internalCode: { startsWith: prefix } },
    orderBy: { internalCode: "desc" },
    select: { internalCode: true },
  });
  const seq = last ? Number(last.internalCode.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

async function main() {
  const host = (() => {
    try {
      return new URL(process.env.DATABASE_URL ?? "").hostname;
    } catch {
      return "";
    }
  })();
  if (!host.includes("neon.tech")) {
    console.log("A saltar seed de produção: a base não é Neon.");
    return;
  }

  await bootstrapCatalog();

  const admin = await prisma.user.findFirst({
    where: { deletedAt: null, isActive: true, role: { code: "SUPER_ADMIN" } },
  });
  if (!admin) throw new Error("Super Admin em falta na produção.");

  const site = await prisma.site.findUnique({ where: { code: "LIMA" } });
  const types = Object.fromEntries((await prisma.vehicleType.findMany()).map((item) => [item.code, item]));
  const statuses = Object.fromEntries((await prisma.vehicleStatus.findMany()).map((item) => [item.code, item]));
  const locations = Object.fromEntries((await prisma.location.findMany()).map((item) => [item.name, item]));
  const sources = Object.fromEntries((await prisma.vehicleSource.findMany()).map((item) => [item.code, item]));

  let createdCount = 0;
  let skippedCount = 0;

  for (const item of VEHICLES) {
    const plate = normalizePlate(item.licensePlate);
    const existing = await prisma.vehicle.findFirst({
      where: { licensePlateNormalized: plate, deletedAt: null },
    });
    if (existing) {
      skippedCount += 1;
      continue;
    }

    const created = await prisma.vehicle.create({
      data: {
        internalCode: await nextInternalCode(),
        make: item.make,
        model: item.model,
        version: item.version,
        licensePlate: item.licensePlate,
        licensePlateNormalized: plate,
        color: item.color,
        year: item.year,
        fuelType: item.fuelType,
        transmission: item.transmission,
        mileage: item.mileage,
        salePrice: item.salePrice,
        acquisitionPrice: item.acquisitionPrice,
        entryDate: new Date(item.entryDate),
        statusId: statuses[item.status].id,
        locationId: item.location ? locations[item.location].id : null,
        sourceId: item.source ? sources[item.source].id : null,
        vehicleTypeId: types[item.type ?? "USADA"].id,
        photographyStatus: item.photographyStatus ?? "NOT_PHOTOGRAPHED",
        createdById: admin.id,
        siteId: site?.id ?? null,
      },
    });

    await prisma.vehicleEvent.create({
      data: {
        vehicleId: created.id,
        type: "CREATED",
        title: "Viatura entrou em stock",
        userId: admin.id,
        occurredAt: new Date(item.entryDate),
      },
    });
    await prisma.vehicleStatusHistory.create({
      data: {
        vehicleId: created.id,
        toStatusId: created.statusId,
        changedById: admin.id,
        changedAt: new Date(item.entryDate),
      },
    });
    if (created.locationId) {
      await prisma.vehicleLocationHistory.create({
        data: {
          vehicleId: created.id,
          toLocation: item.location,
          locationId: created.locationId,
          changedById: admin.id,
        },
      });
    }
    if (item.photo) {
      await prisma.vehiclePhoto.create({
        data: {
          vehicleId: created.id,
          storageDriver: "external",
          storageKey: item.photo,
          url: item.photo,
          isPrimary: true,
          uploadedById: admin.id,
        },
      });
    }
    if (item.reserved) {
      await prisma.vehicleReservation.create({
        data: {
          vehicleId: created.id,
          reservedById: admin.id,
          customerRef: "Cliente teste",
          notes: "Reserva de teste",
          status: "ACTIVE",
        },
      });
      await prisma.vehicleEvent.create({
        data: {
          vehicleId: created.id,
          type: "RESERVED",
          title: "Reservada",
          userId: admin.id,
        },
      });
    }
    if (item.sold) {
      await prisma.vehicleSale.create({
        data: {
          vehicleId: created.id,
          soldAt: new Date(item.sold.soldAt),
          sellerId: admin.id,
          finalPrice: item.sold.price,
          expectedDeliveryAt: item.sold.expectedDeliveryAt ? new Date(item.sold.expectedDeliveryAt) : null,
          actualDeliveryAt: item.sold.deliveredAt ? new Date(item.sold.deliveredAt) : null,
        },
      });
      await prisma.vehicleEvent.create({
        data: {
          vehicleId: created.id,
          type: "SALE_REGISTERED",
          title: "Vendida",
          userId: admin.id,
          occurredAt: new Date(item.sold.soldAt),
          next: { finalPrice: item.sold.price },
        },
      });
    }
    createdCount += 1;
  }

  console.log(`Configuração sincronizada. Viaturas criadas: ${createdCount}. Já existiam: ${skippedCount}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
