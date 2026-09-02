import { getLocale } from "./lib/locale";

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function formatPrice(price: number) {
  return `${new Intl.NumberFormat(getLocale()).format(price)} Kč`;
}
