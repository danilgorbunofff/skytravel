import type { PublicLocale } from "../i18n/locales";

interface PageMeta {
  title: string;
  description: string;
  h1: string;
}

/** Home page SEO copy. Title 50–60 chars, description 150–160 chars (checked by tests). */
export const HOME_META: Record<PublicLocale, PageMeta> = {
  cs: {
    title: "Zájezdy z Prahy, last minute od českých CK | SkyTravel",
    description:
      "Zájezdy a last minute z Prahy od všech českých cestovních kanceláří za jejich ceny. Porovnejte nabídky CK a vyberte si svou dovolenou u moře se SkyTravel.",
    h1: "Zájezdy z Prahy a last minute od českých CK",
  },
  ru: {
    title: "Туры из Праги и горящие путёвки от чешских CK | SkyTravel",
    description:
      "Туры из Праги от всех чешских туроператоров по их ценам: горящие путёвки, all inclusive, море и экзотика. Подберём тур на русском языке бесплатно — SkyTravel.",
    h1: "Туры из Праги от всех чешских туроператоров",
  },
};

export const NOT_FOUND_META: Record<PublicLocale, { title: string; description: string }> = {
  cs: { title: "Stránka nenalezena | SkyTravel", description: "Tato stránka neexistuje." },
  ru: { title: "Страница не найдена | SkyTravel", description: "Такой страницы не существует." },
};
