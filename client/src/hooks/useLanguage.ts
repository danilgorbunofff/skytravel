import { useCallback, useContext, useEffect, useSyncExternalStore } from "react";
import { LocaleContext } from "../i18n/localeContextValue";
import { isPublicLocale, localePath } from "../i18n/locales";
import cs from "../data/translations/cs";
import en from "../data/translations/en";
import uk from "../data/translations/uk";
import ru from "../data/translations/ru";

export type LanguageKey = "cs" | "en" | "uk" | "ru";

export type TranslationKey = string;

type TranslationDict = Record<string, string>;

// Static imports: switching language never shows the raw key while a chunk
// loads, and dict sizes (~300 entries) are negligible in one bundle.
const DICTS: Record<LanguageKey, TranslationDict> = { cs, en, uk, ru };

// Module-level store shared by every useLanguage() consumer, so one setLang
// re-renders the whole tree consistently (header, hero, cards, filters…).
const store = {
  lang: (typeof window !== "undefined"
    ? ((window.localStorage.getItem("skytravel-lang") as LanguageKey | null) ?? "cs")
    : "cs") as LanguageKey,
  listeners: new Set<() => void>(),
};

function setLangGlobal(next: LanguageKey) {
  if (store.lang === next) return;
  store.lang = next;
  try {
    window.localStorage.setItem("skytravel-lang", next);
  } catch {
    // private mode — ignore
  }
  document.documentElement.lang = next;
  store.listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  store.listeners.add(fn);
  return () => {
    store.listeners.delete(fn);
  };
}

// Fallback chain: active dict → cs → raw key, so a missing key never
// renders as its identifier.
const csDict = DICTS.cs;

// On /cs/… and /ru/… pages the URL decides the language (LocaleProvider), so the
// server render and the browser agree; switching means going to the other URL.
function switchLocalized(next: LanguageKey) {
  if (isPublicLocale(next)) window.location.assign(localePath(next));
}

export function useLanguage() {
  const localeCtx = useContext(LocaleContext);
  const storeLang = useSyncExternalStore(
    subscribe,
    () => store.lang,
    () => "cs" as LanguageKey,
  );
  const lang: LanguageKey = localeCtx ? localeCtx.lang : storeLang;

  useEffect(() => {
    if (localeCtx) return;
    document.documentElement.lang = store.lang;
  }, [lang, localeCtx]);

  // Stable identity: `t` is drilled as a prop into memoized components
  // (PublicTourCard, SearchFilters, SearchHero…). Recreated only when the
  // language actually changes.
  const t = useCallback((key: string): string => DICTS[lang][key] ?? csDict[key] ?? key, [lang]);

  return { lang, setLang: localeCtx ? switchLocalized : setLangGlobal, t, loading: false as const };
}
