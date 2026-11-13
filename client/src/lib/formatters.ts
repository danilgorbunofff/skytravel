/**
 * Shared display formatters for tour data.
 * Keep all date / star / similar presentation helpers here so providers
 * and admin/public surfaces stay consistent.
 */

import { formatDate, getLocale } from "./locale";

export function fmtDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : formatDate(value);
}

export function starsDisplay(value: string | number | undefined | null): string {
  const stars = Number(value);
  if (!Number.isFinite(stars) || stars < 1 || stars > 5) return "";
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}

export type PluralForm = "One" | "Few" | "Many";

const pluralRulesCache = new Map<string, Intl.PluralRules>();

/**
 * Grammatical number for `n` in the active UI language, mapped onto the three noun forms
 * our dictionaries carry: cs/uk/ru "1 noc · 2 noci · 5 nocí", en "1 night · 2 nights".
 * CLDR "other" (cs 5+, en 2+, fractions) uses the Many form.
 */
export function pluralForm(n: number, locale: string = getLocale()): PluralForm {
  let rules = pluralRulesCache.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(locale);
    pluralRulesCache.set(locale, rules);
  }
  const category = rules.select(n);
  if (category === "one") return "One";
  if (category === "few") return "Few";
  return "Many";
}

/**
 * "5 nocí", "2 noci", "1 noc": the number plus the right form of the noun whose dictionary
 * keys are `${base}One`, `${base}Few` and `${base}Many`.
 */
export function countLabel(t: (key: string) => string, n: number, base: string): string {
  const locale = getLocale();
  return `${n.toLocaleString(locale)} ${t(`${base}${pluralForm(n, locale)}`)}`;
}
