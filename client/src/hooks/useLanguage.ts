import { useEffect, useMemo, useState } from "react";
import { translations } from "../data";

export type LanguageKey = keyof typeof translations;
export type TranslationKey = keyof typeof translations.cs;

export function useLanguage() {
  const [lang, setLang] = useState<LanguageKey>("cs");

  useEffect(() => {
    const saved = window.localStorage.getItem("skytravel-lang") as LanguageKey | null;
    if (saved && translations[saved]) {
      setLang(saved);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    window.localStorage.setItem("skytravel-lang", lang);
  }, [lang]);

  const dict = useMemo(() => translations[lang] || translations.cs, [lang]);

  function t(key: keyof typeof translations.cs) {
    return dict[key] ?? translations.cs[key];
  }

  return { lang, setLang, t };
}
