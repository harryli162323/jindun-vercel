import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
}

export function formatDateOnly(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" });
}

export function formatMoney(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === "") return "0.00";
  return parseFloat(String(val)).toFixed(2);
}
