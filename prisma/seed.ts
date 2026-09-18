import { PrismaClient, type LocationType, type PhotographyStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_ROLE_PERMISSIONS, PERMISSION_CATALOG } from "../src/server/permissions/catalog";
import { DEFAULT_STOCK_SETTINGS } from "../src/lib/stock";
import { normalizePlate } from "../src/lib/plate";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("O seed de demonstração não corre em produção. Use prisma/bootstrap.ts.");
  }

  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.vehicleEvent.deleteMany();
  await prisma.vehiclePhoto.deleteMany();
  await prisma.vehicleSale.deleteMany();
  await prisma.vehicleReservation.deleteMany();
  await prisma.vehiclePriceHistory.deleteMany();
  await prisma.vehicleLocationHistory.deleteMany();
  await prisma.vehicleStatusHistory.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.location.deleteMany();
  await prisma.vehicleSource.deleteMany();
  await prisma.vehicleStatusTransition.deleteMany();
  await prisma.vehicleStatus.deleteMany();
  await prisma.vehicleType.deleteMany();
  await prisma.site.deleteMany();
  await prisma.processSite.deleteMany();
  await prisma.appSetting.deleteMany();

  const site = await prisma.site.create({
    data: { name: "LIMA Automóveis", code: "LIMA" },
  });

  const permissions = await Promise.all(
    PERMISSION_CATALOG.map((item) =>
      prisma.permission.create({
        data: {
          key: item.key,
          resource: item.resource,
          action: item.action,
          name: item.name,
        },
      }),
    ),
  );
  const permissionByKey = Object.fromEntries(permissions.map((item) => [item.key, item]));

  const roles = await Promise.all(
    [
      { code: "SUPER_ADMIN", name: "Super Admin", description: "Acesso absoluto" },
      { code: "ADMIN", name: "Gestor de stock", description: "Operação completa do stock" },
      { code: "SALES", name: "Vendedor", description: "Consulta comercial e vendas" },
      { code: "VIEWER", name: "Consulta", description: "Apenas leitura" },
    ].map((role) => prisma.role.create({ data: { ...role, isSystem: true } })),
  );
  const roleByCode = Object.fromEntries(roles.map((role) => [role.code, role]));

  for (const [code, keys] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    await prisma.rolePermission.createMany({
      data: keys.map((key) => ({
        roleId: roleByCode[code].id,
        permissionId: permissionByKey[key].id,
        allowed: true,
      })),
    });
  }

  const passwordHash = await bcrypt.hash("Lima2026!", 12);
  await prisma.user.createMany({
    data: [
      { name: "Miguel Lima", email: "superadmin@lima.local", passwordHash, roleId: roleByCode.SUPER_ADMIN.id, siteId: site.id },
      { name: "João Silva", email: "gestor@lima.local", passwordHash, roleId: roleByCode.ADMIN.id, siteId: site.id },
      { name: "Ana Ferreira", email: "vendedor@lima.local", passwordHash, roleId: roleByCode.SALES.id, siteId: site.id },
      { name: "Rita Costa", email: "consulta@lima.local", passwordHash, roleId: roleByCode.VIEWER.id, siteId: site.id },
    ],
  });
  const users = await prisma.user.findMany();
  const userByEmail = Object.fromEntries(users.map((user) => [user.email, user]));

  const types = await Promise.all(
    [
      ["USADA", "Usada"],
      ["SERVICO", "Serviço"],
      ["DEMONSTRACAO", "Demonstração"],
      ["CORTESIA", "Cortesia"],
      ["OUTRA", "Outra"],
    ].map(([code, name]) => prisma.vehicleType.create({ data: { code, name } })),
  );
  const typeByCode = Object.fromEntries(types.map((item) => [item.code, item]));

  const statuses = await Promise.all(
    ([
      ["A_ENTRAR", "A entrar", "slate", "operational", false],
      ["EM_PREPARACAO", "Em preparação", "yellow", "operational", false],
      ["AGUARDA_RECONDICIONAMENTO", "Aguarda recondicionamento", "orange", "operational", false],
      ["EM_RECONDICIONAMENTO", "Em recondicionamento", "orange", "operational", false],
      ["AGUARDA_HIGIENIZACAO", "Aguarda higienização", "yellow", "operational", false],
      ["AGUARDA_REVISAO", "Aguarda revisão", "yellow", "operational", false],
      ["PRONTO_PARA_FOTOGRAFAR", "Pronto para fotografar", "yellow", "operational", false],
      ["AGUARDA_PUBLICACAO", "Aguarda publicação", "yellow", "operational", false],
      ["DISPONIVEL_PARA_VENDA", "Disponível para venda", "green", "commercial", true],
      ["RESERVADO", "Reservado", "orange", "commercial", false],
      ["VENDIDO", "Vendido", "blue", "commercial", false],
      ["AGUARDA_ENTREGA", "Aguarda entrega", "blue", "commercial", false],
      ["ENTREGUE", "Entregue", "slate", "terminal", false],
      ["CEDIDO", "Cedido", "slate", "terminal", false],
      ["DEVOLVIDO", "Devolvido", "red", "terminal", false],
    ] as const).map(([code, name, color, category, isAvailableForSale], index) =>
      prisma.vehicleStatus.create({
        data: {
          code,
          name,
          color,
          category,
          isAvailableForSale: Boolean(isAvailableForSale),
          sortOrder: index,
        },
      }),
    ),
  );
  const statusByCode = Object.fromEntries(statuses.map((item) => [item.code, item]));

  const locations = await Promise.all(
    (
      [
        ["Stand Feira", "STAND"],
        ["Stand Ovar", "STAND"],
        ["EXP. Feira", "EXPOSICAO"],
        ["EXP. Ovar", "EXPOSICAO"],
        ["Armazém Feira", "ARMAZEM"],
        ["Espinho", "OFICINA"],
        ["Ovar", "STAND"],
        ["Feira", "STAND"],
        ["Cedido", "CEDIDO"],
        ["Cortesia", "OUTRO"],
        ["Entregue", "CLIENTE"],
      ] as Array<[string, LocationType]>
    ).map(([name, type], index) => prisma.location.create({ data: { name, type, sortOrder: index } })),
  );
  const locationByName = Object.fromEntries(locations.map((item) => [item.name, item]));

  const sources = await Promise.all(
    ([
      ["RETOMA", "Retoma", true],
      ["TCAP", "TCAP", true],
      ["SERVICO", "Serviço", false],
      ["COMPRA", "Compra", false],
      ["KINTO", "Kinto", true],
      ["COMPRA_TCAP", "Compra/TCAP", true],
    ] as const).map(([code, name, hasCommercialSupport]) =>
      prisma.vehicleSource.create({ data: { code, name, hasCommercialSupport } }),
    ),
  );
  const sourceByCode = Object.fromEntries(sources.map((item) => [item.code, item]));

  await prisma.processSite.createMany({
    data: ["Espinho", "Feira", "Aveiro", "Pedro", "Fernando", "Melisauto"].map((name) => ({
      name,
      kind: "REFURBISHMENT" as const,
    })),
  });

  await prisma.appSetting.create({
    data: { key: "stock.alerts", value: DEFAULT_STOCK_SETTINGS },
  });

  const vehicles: Array<{
    make: string;
    model: string;
    version?: string;
    licensePlate?: string;
    vin?: string;
    color?: string;
    year?: number;
    fuelType?: string;
    transmission?: string;
    mileage?: number;
    salePrice?: number;
    acquisitionPrice?: number;
    entryDate: string;
    renewal?: boolean;
    status: string;
    location?: string;
    source?: string;
    type?: string;
    photographyStatus?: PhotographyStatus;
    photo?: string;
    commercialNotes?: string;
    inspectionDate?: string;
    powerHp?: number;
    engineSizeCc?: number;
    doors?: number;
    seats?: number;
    numberOfKeys?: number;
    passport?: boolean;
    sold?: { sellerEmail: string; soldAt: string; price: number; expectedDeliveryAt?: string; deliveredAt?: string };
  }> = [
    {
      make: "Toyota",
      model: "C-HR",
      version: "1.8 Hybrid Exclusive",
      licensePlate: "BB-35-ZR",
      vin: "JTDKN3DU5A0123456",
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
      powerHp: 122,
      engineSizeCc: 1798,
      doors: 5,
      seats: 5,
      numberOfKeys: 2,
      passport: true,
      inspectionDate: "2027-08-01",
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
      photographyStatus: "NOT_PHOTOGRAPHED",
    },
    {
      make: "Toyota",
      model: "Avensis",
      version: "Sedan 2.0 D-4D",
      licensePlate: "09-PQ-46",
      color: "Cinza Escuro",
      year: 2016,
      fuelType: "Diesel",
      mileage: 82856,
      salePrice: 12900,
      entryDate: "2025-11-02",
      status: "ENTREGUE",
      location: "Entregue",
      source: "RETOMA",
      photographyStatus: "PUBLISHED",
      sold: { sellerEmail: "vendedor@lima.local", soldAt: "2026-02-18", price: 12500, deliveredAt: "2026-03-03" },
    },
    {
      make: "Toyota",
      model: "Corolla",
      version: "1.8 Hybrid Comfort",
      licensePlate: "AA-18-CR",
      color: "Branco",
      year: 2023,
      fuelType: "Híbrido",
      transmission: "Automática",
      mileage: 41200,
      salePrice: 24900,
      entryDate: "2026-06-10",
      status: "DISPONIVEL_PARA_VENDA",
      location: "Stand Ovar",
      source: "COMPRA",
      photographyStatus: "PUBLISHED",
      photo: "https://images.unsplash.com/photo-1619682817481-e994891cd1f5?auto=format&fit=crop&w=1600&q=80",
    },
    {
      make: "Toyota",
      model: "Yaris Cross",
      version: "1.5 Hybrid Lounge",
      licensePlate: "CD-21-YX",
      color: "Azul",
      year: 2023,
      fuelType: "Híbrido",
      mileage: 28900,
      salePrice: 26900,
      entryDate: "2026-05-01",
      renewal: true,
      status: "DISPONIVEL_PARA_VENDA",
      location: "EXP. Feira",
      source: "KINTO",
      photographyStatus: "PUBLISHED",
      photo: "https://images.unsplash.com/photo-1606664515524-ed2f58630c8d?auto=format&fit=crop&w=1600&q=80",
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
      photographyStatus: "NOT_PHOTOGRAPHED",
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
      photographyStatus: "NOT_PHOTOGRAPHED",
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
    },
    {
      make: "Toyota",
      model: "Camry",
      version: "2.5 Hybrid Luxury",
      licensePlate: "LM-25-CY",
      color: "Preto",
      year: 2023,
      fuelType: "Híbrido",
      mileage: 22110,
      salePrice: 33900,
      entryDate: "2026-08-20",
      status: "DISPONIVEL_PARA_VENDA",
      location: "Stand Feira",
      source: "TCAP",
      photographyStatus: "PUBLISHED",
      photo: "https://images.unsplash.com/photo-1617531653332-bd46c24f2068?auto=format&fit=crop&w=1600&q=80",
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
      model: "Land Cruiser",
      version: "2.8 D-4D",
      licensePlate: "PQ-70-LC",
      color: "Bege",
      year: 2020,
      fuelType: "Diesel",
      mileage: 118000,
      salePrice: 52900,
      entryDate: "2025-12-12",
      status: "DISPONIVEL_PARA_VENDA",
      location: "Stand Ovar",
      source: "RETOMA",
      photographyStatus: "PUBLISHED",
      photo: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1600&q=80",
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
      photographyStatus: "NOT_PHOTOGRAPHED",
    },
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
      photographyStatus: "NOT_PHOTOGRAPHED",
    },
    {
      make: "Toyota",
      model: "Highlander",
      version: "2.5 Hybrid Luxury",
      licensePlate: "VW-25-HL",
      color: "Cinza",
      year: 2022,
      fuelType: "Híbrido",
      mileage: 61000,
      salePrice: 42900,
      entryDate: "2026-02-14",
      status: "AGUARDA_ENTREGA",
      location: "Stand Feira",
      source: "RETOMA",
      photographyStatus: "PUBLISHED",
      sold: { sellerEmail: "vendedor@lima.local", soldAt: "2026-09-10", price: 41900, expectedDeliveryAt: "2026-09-25" },
    },
    {
      make: "Toyota",
      model: "Auris",
      version: "1.4 D-4D",
      licensePlate: "XY-14-AU",
      color: "Prata",
      year: 2017,
      fuelType: "Diesel",
      mileage: 142000,
      salePrice: 10900,
      entryDate: "2026-01-08",
      status: "CEDIDO",
      location: "Cedido",
      source: "RETOMA",
      type: "CORTESIA",
    },
    {
      make: "Toyota",
      model: "Corolla Touring Sports",
      version: "1.8 Hybrid Exclusive",
      licensePlate: "ZA-88-TS",
      color: "Verde",
      year: 2023,
      fuelType: "Híbrido",
      mileage: 33420,
      salePrice: 27900,
      entryDate: "2026-06-28",
      status: "DISPONIVEL_PARA_VENDA",
      location: "EXP. Feira",
      source: "COMPRA_TCAP",
      photographyStatus: "PUBLISHED",
      photo: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1600&q=80",
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
      sold: { sellerEmail: "gestor@lima.local", soldAt: "2026-09-05", price: 17500 },
    },
  ];

  let index = 1;
  for (const item of vehicles) {
    const created = await prisma.vehicle.create({
      data: {
        internalCode: `V-2026-${String(index).padStart(4, "0")}`,
        make: item.make,
        model: item.model,
        version: item.version,
        licensePlate: item.licensePlate,
        licensePlateNormalized: normalizePlate(item.licensePlate),
        vin: item.vin,
        color: item.color,
        year: item.year,
        fuelType: item.fuelType,
        transmission: item.transmission,
        mileage: item.mileage,
        salePrice: item.salePrice,
        acquisitionPrice: item.acquisitionPrice,
        entryDate: new Date(item.entryDate),
        renewal: Boolean(item.renewal),
        statusId: statusByCode[item.status].id,
        locationId: item.location ? locationByName[item.location].id : null,
        sourceId: item.source ? sourceByCode[item.source].id : null,
        vehicleTypeId: typeByCode[item.type ?? "USADA"].id,
        photographyStatus: item.photographyStatus ?? "NOT_PHOTOGRAPHED",
        commercialNotes: item.commercialNotes,
        inspectionDate: item.inspectionDate ? new Date(item.inspectionDate) : null,
        powerHp: item.powerHp,
        engineSizeCc: item.engineSizeCc,
        doors: item.doors,
        seats: item.seats,
        numberOfKeys: item.numberOfKeys,
        passport: item.passport,
        createdById: userByEmail["gestor@lima.local"].id,
        siteId: site.id,
      },
    });

    await prisma.vehicleEvent.create({
      data: {
        vehicleId: created.id,
        type: "CREATED",
        title: "Viatura entrou em stock",
        userId: userByEmail["gestor@lima.local"].id,
        occurredAt: new Date(item.entryDate),
      },
    });
    await prisma.vehicleStatusHistory.create({
      data: {
        vehicleId: created.id,
        toStatusId: created.statusId,
        changedById: userByEmail["gestor@lima.local"].id,
        changedAt: new Date(item.entryDate),
      },
    });
    if (created.locationId) {
      await prisma.vehicleLocationHistory.create({
        data: {
          vehicleId: created.id,
          toLocation: item.location,
          locationId: created.locationId,
          changedById: userByEmail["gestor@lima.local"].id,
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
          uploadedById: userByEmail["gestor@lima.local"].id,
        },
      });
    }
    if (item.sold) {
      await prisma.vehicleSale.create({
        data: {
          vehicleId: created.id,
          soldAt: new Date(item.sold.soldAt),
          sellerId: userByEmail[item.sold.sellerEmail].id,
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
          userId: userByEmail[item.sold.sellerEmail].id,
          occurredAt: new Date(item.sold.soldAt),
          next: { finalPrice: item.sold.price },
        },
      });
      if (item.sold.deliveredAt) {
        await prisma.vehicleEvent.create({
          data: {
            vehicleId: created.id,
            type: "DELIVERED",
            title: "Entregue ao cliente",
            userId: userByEmail[item.sold.sellerEmail].id,
            occurredAt: new Date(item.sold.deliveredAt),
          },
        });
      }
    }
    index += 1;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
