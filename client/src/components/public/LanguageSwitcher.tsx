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
