import { useCallback, useEffect, useState } from "react";

export type LanguageKey = "cs" | "en" | "uk" | "ru";

export type TranslationKey = string;

type TranslationDict = Record<string, string>;

export function useLanguage() {
  const [lang, setLang] = useState<LanguageKey>("cs");
  const [dict, setDict] = useState<TranslationDict | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("skytravel-lang") as LanguageKey | null;
    if (saved) setLang(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    window.localStorage.setItem("skytravel-lang", lang);
  }, [lang]);

  useEffect(() => {
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
  }, [lang]);

  // Stable identity: `t` is drilled as a prop into memoized components
  // (PublicTourCard, SearchFilters, SearchHero…). A fresh function on every
  // render defeats React.memo on all of them. Recreated only when the
  // dictionary (i.e. the language) actually changes.
  const t = useCallback((key: string): string => dict?.[key] ?? key, [dict]);

  return { lang, setLang, t, loading };
}
