/** Languages that have their own crawlable URL prefix (/cs/…, /ru/…). */
export const PUBLIC_LOCALES = ["cs", "ru"] as const;
export type PublicLocale = (typeof PUBLIC_LOCALES)[number];
export const DEFAULT_LOCALE: PublicLocale = "cs";

export function isPublicLocale(value: unknown): value is PublicLocale {
  return value === "cs" || value === "ru";
}

/** "/ru/egipet/" → "ru"; anything else → null. */
export function localeFromPath(pathname: string): PublicLocale | null {
  const first = pathname.split("/")[1];
  return isPublicLocale(first) ? first : null;
}

/** "/ru/egipet/" → "egipet"; "/ru/" → "". */
export function slugFromPath(pathname: string): string {
  return pathname.split("/").slice(2).filter(Boolean).join("/");
}

export function localePath(lang: PublicLocale, slug = ""): string {
  return slug ? `/${lang}/${slug.replace(/^\/+|\/+$/g, "")}/` : `/${lang}/`;
}

export const LOCALE_LABELS: Record<PublicLocale, { short: string; name: string; og: string }> = {
  cs: { short: "CZ", name: "Čeština", og: "cs_CZ" },
  ru: { short: "RU", name: "Русский", og: "ru_RU" },
};
