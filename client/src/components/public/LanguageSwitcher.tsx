import { useLanguage, type LanguageKey } from "../../hooks/useLanguage";
import { LOCALE_LABELS, PUBLIC_LOCALES, localePath, type PublicLocale } from "../../i18n/locales";

interface Props {
  lang: PublicLocale;
  /** Equivalent page per language; missing languages link to that language's home. */
  alternates?: Partial<Record<PublicLocale, string>>;
  className?: string;
}

/** Plain links (not buttons) so crawlers can follow them to the other language. */
export function LanguageSwitcher({ lang, alternates = {}, className }: Props) {
  return (
    <nav className={`pub-lang ${className ?? ""}`} aria-label="Language / Язык / Jazyk">
      {PUBLIC_LOCALES.map((code) => {
        const href = alternates[code] ?? localePath(code);
        const active = code === lang;
        return (
          <a
            key={code}
            href={href}
            hrefLang={code}
            lang={code}
            className={`pub-lang__link${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
            title={LOCALE_LABELS[code].name}
          >
            {LOCALE_LABELS[code].short}
          </a>
        );
      })}
    </nav>
  );
}

// Same order as the localized switcher (CZ, RU first). "UA", not "UK": "UK" reads as English.
const APP_LANGUAGES: { code: LanguageKey; short: string; name: string }[] = [
  { code: "cs", short: "CZ", name: "Čeština" },
  { code: "ru", short: "RU", name: "Русский" },
  { code: "uk", short: "UA", name: "Українська" },
  { code: "en", short: "EN", name: "English" },
];

/**
 * Switcher for pages without a language in the URL (/search, /favorites, legal pages).
 * Same look as `LanguageSwitcher`; switches the UI language in place.
 */
export function AppLanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useLanguage();
  return (
    <div
      className={`pub-lang ${className ?? ""}`}
      role="group"
      aria-label="Language / Язык / Jazyk"
    >
      {APP_LANGUAGES.map((item) => {
        const active = item.code === lang;
        return (
          <button
            key={item.code}
            type="button"
            lang={item.code}
            className={`pub-lang__link${active ? " is-active" : ""}`}
            aria-pressed={active}
            title={item.name}
            onClick={() => setLang(item.code)}
          >
            {item.short}
          </button>
        );
      })}
    </div>
  );
}
