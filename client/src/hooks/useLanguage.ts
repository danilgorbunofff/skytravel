import { useCallback, useContext, useEffect, useState } from "react";
import { LocaleContext } from "../i18n/localeContextValue";
import { localePath, isPublicLocale } from "../i18n/locales";

export type LanguageKey = "cs" | "en" | "uk" | "ru";

export type TranslationKey = string;

type TranslationDict = Record<string, string>;

export function useLanguage() {
  // On /cs/… and /ru/… pages the language is fixed by the URL (LocaleProvider).
  const localeCtx = useContext(LocaleContext);

  const [lang, setLang] = useState<LanguageKey>("cs");
  const [dict, setDict] = useState<TranslationDict | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localeCtx) return;
    const saved = window.localStorage.getItem("skytravel-lang") as LanguageKey | null;
    if (saved) setLang(saved);
  }, [localeCtx]);

  useEffect(() => {
    if (localeCtx) return;
    document.documentElement.lang = lang;
    window.localStorage.setItem("skytravel-lang", lang);
  }, [lang, localeCtx]);

  useEffect(() => {
    if (localeCtx) return;
    let cancelled = false;
    setLoading(true);
    import(`../data/translations/${lang}.ts`)
      .then((mod) => {
        if (!cancelled) setDict(mod.default);
      })
      .catch(() => {
        if (!cancelled) {
          import("../data/translations/cs.ts").then((m) => {
            if (!cancelled) setDict(m.default);
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lang, localeCtx]);

  const activeDict = localeCtx ? localeCtx.dict : dict;

  // Stable identity: `t` is drilled as a prop into memoized components
  // (PublicTourCard, SearchFilters, SearchHero…). A fresh function on every
  // render defeats React.memo on all of them. Recreated only when the
  // dictionary (i.e. the language) actually changes.
  const t = useCallback((key: string): string => activeDict?.[key] ?? key, [activeDict]);

  // On localized pages switching language means going to the other URL.
  const switchLocalized = useCallback((next: LanguageKey) => {
    if (isPublicLocale(next)) window.location.assign(localePath(next));
  }, []);

  if (localeCtx) {
    return {
      lang: localeCtx.lang as LanguageKey,
      setLang: switchLocalized,
      t,
      loading: !localeCtx.dict,
    };
  }
  return { lang, setLang, t, loading };
}
