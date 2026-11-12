import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { PublicLocale } from "./locales";
import {
  LocaleContext,
  loadDictionary,
  type LocaleContextValue,
  type TranslationDict,
} from "./localeContextValue";

interface Props {
  lang: PublicLocale;
  /** Pre-loaded dictionary (from SSR payload). Loaded lazily when absent. */
  initialDict?: TranslationDict | null;
  initialDictLang?: PublicLocale;
  children: ReactNode;
}

export function LocaleProvider({ lang, initialDict, initialDictLang, children }: Props) {
  const [loaded, setLoaded] = useState<{ lang: PublicLocale; dict: TranslationDict } | null>(
    initialDict ? { lang: initialDictLang ?? lang, dict: initialDict } : null,
  );

  useEffect(() => {
    if (loaded?.lang === lang) return;
    let cancelled = false;
    loadDictionary(lang).then((dict) => {
      if (!cancelled) setLoaded({ lang, dict });
    });
    return () => {
      cancelled = true;
    };
  }, [lang, loaded?.lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      // Non-localized pages (/search, /favorites) pick the language up from here.
      window.localStorage.setItem("skytravel-lang", lang);
    } catch {
      // storage may be unavailable (private mode) — not critical
    }
  }, [lang]);

  const value = useMemo<LocaleContextValue>(
    () => ({ lang, dict: loaded?.lang === lang ? loaded.dict : null }),
    [lang, loaded],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
