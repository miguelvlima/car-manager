import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toNumber(value: { toNumber?: () => number } | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value;
  return value.toNumber?.() ?? Number(value);
}

export function slugifyCode(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .toUpperCase();
}
