/**
 * Typed helpers for reading/writing the Tour.i18n JSON field.
 *
 * Expected JSON shape stored in MySQL:
 * {
 *   "cs": { "title": "...", "description": "..." },
 *   "en": { "title": "...", "description": "..." }
 * }
 */

export interface TourI18nLocale {
  title?: string;
  description?: string;
}

export interface TourI18n {
  [locale: string]: TourI18nLocale | undefined;
}

/**
 * Safely read a localized field from the i18n JSON blob.
 * Falls back to `null` if the locale or field doesn't exist.
 */
export function getI18nField(
  i18n: unknown,
  locale: string,
  field: keyof TourI18nLocale,
): string | null {
  if (!i18n || typeof i18n !== "object") return null;
  const localeData = (i18n as TourI18n)[locale];
  if (!localeData || typeof localeData !== "object") return null;
  const value = localeData[field];
  return typeof value === "string" ? value : null;
}

/**
 * Set a localized field in the i18n JSON blob. Returns a new object (immutable).
 */
export function setI18nField(
  i18n: unknown,
  locale: string,
  field: keyof TourI18nLocale,
  value: string,
): TourI18n {
  const base: TourI18n = i18n && typeof i18n === "object" ? { ...(i18n as TourI18n) } : {};
  const localeData = base[locale] ? { ...base[locale] } : {};
  localeData[field] = value;
  base[locale] = localeData;
  return base;
}
