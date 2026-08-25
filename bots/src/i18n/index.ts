import type { Lang, LangBundle } from "./types.js";
import ru from "./ru.js";
import uk from "./uk.js";

export const bundles: Record<Lang, LangBundle> = { ru, uk };

export function resolveLang(languageCode?: string | null): Lang {
  return languageCode?.toLowerCase().startsWith("uk") ? "uk" : "ru";
}

export type { Lang, LangBundle };
