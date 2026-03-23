export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function formatPrice(price: number) {
  const lang = typeof document !== "undefined" ? document.documentElement.lang : "cs";
  const localeMap: Record<string, string> = {
    cs: "cs-CZ",
    en: "en-US",
    uk: "uk-UA",
    ru: "ru-RU",
  };
  const locale = localeMap[lang] || "cs-CZ";
  return `${new Intl.NumberFormat(locale).format(price)} Kč`;
}
