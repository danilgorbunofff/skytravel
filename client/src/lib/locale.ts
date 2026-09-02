/**
 * Locale-aware formatting helpers driven by the active UI language.
 * The language is mirrored onto <html lang> by useLanguage, so reading it
 * here keeps every formatter consistent without prop drilling.
 */

export type UiLanguage = "cs" | "en" | "uk" | "ru";

const BCP47: Record<UiLanguage, string> = {
  cs: "cs-CZ",
  en: "en-US",
  uk: "uk-UA",
  ru: "ru-RU",
};

export function getLang(): UiLanguage {
  if (typeof document === "undefined") return "cs";
  const lang = document.documentElement.lang;
  return (lang in BCP47 ? lang : "cs") as UiLanguage;
}

export function getLocale(): string {
  return BCP47[getLang()];
}

export function formatDate(
  value: string | number | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(getLocale(), options);
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return value.toLocaleString(getLocale(), options);
}

/** Text-embedded number formatting (inline in JSX templates). */
export function localeForText(): string {
  return getLocale();
}
