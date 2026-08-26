// Czech diacritic folding — maps every accented Czech letter to its ASCII base.
// Uppercase variants included so titles fold correctly before lowercasing.
const FOLD_MAP: Record<string, string> = {
  á: "a",
  č: "c",
  ď: "d",
  é: "e",
  ě: "e",
  í: "i",
  ň: "n",
  ó: "o",
  ř: "r",
  š: "s",
  ť: "t",
  ú: "u",
  ů: "u",
  ý: "y",
  ž: "z",
  Á: "a",
  Č: "c",
  Ď: "d",
  É: "e",
  Ě: "e",
  Í: "i",
  Ň: "n",
  Ó: "o",
  Ř: "r",
  Š: "s",
  Ť: "t",
  Ú: "u",
  Ů: "u",
  Ý: "y",
  Ž: "z",
};

/** Fold Czech diacritics to base ASCII letters. Other Latin accents fall back to NFD decomposition. */
export function foldCzech(value: string): string {
  let out = "";
  for (const char of value) {
    const mapped = FOLD_MAP[char];
    if (mapped !== undefined) {
      out += mapped;
      continue;
    }
    // Fallback for non-Czech Latin diacritics (ä, ö, ł, …)
    const decomposed = char.normalize("NFD").replace(/\p{M}/gu, "");
    out += decomposed;
  }
  return out;
}

/** Convert arbitrary Czech text (e.g. a title) into a URL-safe ASCII slug. */
export function slugifyCzechTitle(value: string): string {
  return foldCzech(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Destination hub slugs follow the same rules as article slugs. */
export function destinationSlug(czechName: string): string {
  return slugifyCzechTitle(czechName);
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
