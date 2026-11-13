import { getLocale } from "./locale";

/**
 * Picks the plural form of a noun for `n` in the active UI language.
 * Forms live in the translation files as `${base}_one`, `_few`, `_many`, `_other`
 * (the CLDR categories from Intl.PluralRules); `_other` is the fallback.
 */
export function plural(
  n: number,
  base: string,
  t: (key: string) => string,
  locale: string = getLocale(),
): string {
  const key = `${base}_${new Intl.PluralRules(locale).select(n)}`;
  const form = t(key);
  // t() returns the key itself when a form is not defined for this language
  return form === key ? t(`${base}_other`) : form;
}
