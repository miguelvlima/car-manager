export function normalizePlate(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return normalized.length ? normalized : null;
}

export function formatPlate(value: string | null | undefined) {
  const normalized = normalizePlate(value);
  if (!normalized) return "—";
  if (normalized.length === 6) {
    return `${normalized.slice(0, 2)}-${normalized.slice(2, 4)}-${normalized.slice(4)}`;
  }
  return value ?? normalized;
}

export function maskPlate(value: string | null | undefined) {
  const formatted = formatPlate(value);
  if (formatted === "—") return formatted;
  return formatted.replace(/[A-Z0-9]/g, "•");
}
