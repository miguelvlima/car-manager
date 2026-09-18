import { describe, expect, it } from "vitest";
import { formatPlate, normalizePlate } from "./plate";
import { calculateDaysInStock, stockAgeLevel } from "./stock";
import { hasPermission } from "../server/permissions/catalog";
import { sanitizeVehiclePatch } from "../server/services/vehicle-sanitize";

describe("dias em stock", () => {
  it("calcula dias sem renovação", () => {
    const entry = new Date("2026-08-02T00:00:00.000Z");
    const now = new Date("2026-09-18T00:00:00.000Z");
    expect(calculateDaysInStock(entry, false, 90, now)).toBe(47);
  });

  it("desconta o parâmetro de renovação", () => {
    const entry = new Date("2026-01-01T00:00:00.000Z");
    const now = new Date("2026-09-18T00:00:00.000Z");
    expect(calculateDaysInStock(entry, true, 90, now)).toBe(170);
  });

  it("não devolve valores negativos", () => {
    const entry = new Date("2026-09-10T00:00:00.000Z");
    const now = new Date("2026-09-18T00:00:00.000Z");
    expect(calculateDaysInStock(entry, true, 90, now)).toBe(0);
  });
});

describe("alertas de idade", () => {
  it("usa limiares progressivos", () => {
    expect(stockAgeLevel(10)).toBe("normal");
    expect(stockAgeLevel(40)).toBe("warning");
    expect(stockAgeLevel(70)).toBe("alert");
    expect(stockAgeLevel(100)).toBe("critical");
  });
});

describe("matrícula", () => {
  it("normaliza BB-35-ZR e BB35ZR para o mesmo valor", () => {
    expect(normalizePlate("BB-35-ZR")).toBe("BB35ZR");
    expect(normalizePlate("bb35zr")).toBe("BB35ZR");
    expect(formatPlate("BB35ZR")).toBe("BB-35-ZR");
  });
});

describe("permissões", () => {
  it("dá bypass ao super admin", () => {
    expect(hasPermission("SUPER_ADMIN", [], "vehicle:delete")).toBe(true);
  });

  it("bloqueia vendedor sem a chave", () => {
    expect(hasPermission("SALES", ["vehicle:view", "vehicle:register_sale"], "vehicle:edit_operational")).toBe(false);
  });
});

describe("sanitizeVehiclePatch", () => {
  it("impede o vendedor de alterar origem, entrada, kms e preço de aquisição", () => {
    const result = sanitizeVehiclePatch(
      {
        sourceId: "src_1",
        entryDate: "2026-01-01",
        mileage: 10,
        acquisitionPrice: 10000,
        salePrice: 20000,
        commercialNotes: "ok",
      },
      "SALES",
      ["vehicle:view", "vehicle:register_sale"],
    );
    expect(result.sourceId).toBeUndefined();
    expect(result.entryDate).toBeUndefined();
    expect(result.mileage).toBeUndefined();
    expect(result.acquisitionPrice).toBeUndefined();
    expect(result.salePrice).toBeUndefined();
    expect(result.commercialNotes).toBe("ok");
  });
});
