const euro = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const euroExact = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatMoney(value: number | null | undefined, exact = false) {
  if (value == null) return "—";
  return (exact ? euroExact : euro).format(value);
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return dateFmt.format(new Date(value));
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  return dateTimeFmt.format(new Date(value));
}

export function formatKm(value: number | null | undefined) {
  if (value == null) return "—";
  return `${new Intl.NumberFormat("pt-PT").format(value)} km`;
}

export function toDateInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return date.toISOString().slice(0, 10);
}
