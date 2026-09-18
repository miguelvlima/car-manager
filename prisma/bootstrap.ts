import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { DEFAULT_ROLE_PERMISSIONS, PERMISSION_CATALOG } from "../src/server/permissions/catalog";
import { DEFAULT_STOCK_SETTINGS } from "../src/lib/stock";

const prisma = new PrismaClient();

const DEFAULT_ROLES = [
  { code: "SUPER_ADMIN", name: "Super Admin", description: "Acesso absoluto" },
  { code: "ADMIN", name: "Gestor de stock", description: "Operação completa do stock" },
  { code: "SALES", name: "Vendedor", description: "Consulta comercial e vendas" },
  { code: "VIEWER", name: "Consulta", description: "Apenas leitura" },
] as const;

const DEFAULT_TYPES = [
  ["USADA", "Usada"],
  ["SERVICO", "Serviço"],
  ["DEMONSTRACAO", "Demonstração"],
  ["CORTESIA", "Cortesia"],
  ["OUTRA", "Outra"],
] as const;

const DEFAULT_STATUSES = [
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
] as const;

export async function bootstrapCatalog() {
  await prisma.site.upsert({
    where: { code: "LIMA" },
    update: {},
    create: { name: "LIMA Automóveis", code: "LIMA" },
  });

  for (const item of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { key: item.key },
      update: { name: item.name, resource: item.resource, action: item.action },
      create: { key: item.key, resource: item.resource, action: item.action, name: item.name },
    });
  }

  for (const role of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, description: role.description, isSystem: true },
      create: { ...role, isSystem: true },
    });
  }

  const permissions = await prisma.permission.findMany();
  const permissionByKey = Object.fromEntries(permissions.map((item) => [item.key, item]));
  const roles = await prisma.role.findMany();
  const roleByCode = Object.fromEntries(roles.map((role) => [role.code, role]));

  for (const [code, keys] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const role = roleByCode[code];
    if (!role) continue;
    for (const key of keys) {
      const permission = permissionByKey[key];
      if (!permission) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id, allowed: true },
      });
    }
  }

  for (const [code, name] of DEFAULT_TYPES) {
    await prisma.vehicleType.upsert({
      where: { code },
      update: {},
      create: { code, name },
    });
  }

  for (const [index, [code, name, color, category, isAvailableForSale]] of DEFAULT_STATUSES.entries()) {
    await prisma.vehicleStatus.upsert({
      where: { code },
      update: {},
      create: { code, name, color, category, isAvailableForSale, sortOrder: index },
    });
  }

  await prisma.appSetting.upsert({
    where: { key: "stock.alerts" },
    update: {},
    create: { key: "stock.alerts", value: DEFAULT_STOCK_SETTINGS },
  });
}

export async function bootstrapAdminFromEnv() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || "Administrador";
  if (!email || !password) return;

  const existing = await prisma.user.count({ where: { deletedAt: null } });
  if (existing > 0) return;
  if (password.length < 8) {
    throw new Error("BOOTSTRAP_ADMIN_PASSWORD tem de ter pelo menos 8 caracteres.");
  }

  const role = await prisma.role.findUnique({ where: { code: "SUPER_ADMIN" } });
  const site = await prisma.site.findUnique({ where: { code: "LIMA" } });
  if (!role) throw new Error("Perfil SUPER_ADMIN em falta. Corra o bootstrap do catálogo primeiro.");

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      roleId: role.id,
      siteId: site?.id ?? null,
      isActive: true,
    },
  });
}

async function main() {
  await bootstrapCatalog();
  await bootstrapAdminFromEnv();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
