import { createContext } from "react";
import type { PublicLocale } from "./locales";

export type TranslationDict = Record<string, string>;

export interface LocaleContextValue {
  lang: PublicLocale;
  dict: TranslationDict | null;
}

/**
 * Set only on URL-localized pages (/cs/…, /ru/…). There the language comes
 * from the URL, never from localStorage, so the server and the browser agree
 * on what to render (no hydration mismatch, crawlers see the right language).
 */
export const LocaleContext = createContext<LocaleContextValue | null>(null);

export function loadDictionary(lang: PublicLocale): Promise<TranslationDict> {
  return lang === "ru"
    ? import("../data/translations/ru.ts").then((m) => m.default as TranslationDict)
    : import("../data/translations/cs.ts").then((m) => m.default as TranslationDict);
}
