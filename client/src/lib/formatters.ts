/**
 * Shared display formatters for tour data.
 * Keep all date / star / similar presentation helpers here so providers
 * and admin/public surfaces stay consistent.
 */

import { formatDate } from "./locale";

export function fmtDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : formatDate(value);
}

export function starsDisplay(value: string | number | undefined | null): string {
  const stars = Number(value);
  if (!Number.isFinite(stars) || stars < 1 || stars > 5) return "";
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}
