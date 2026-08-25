export type Branch = "guide" | "hot" | "select";

export interface KeywordDef {
  word: string;
  variants: string[];
  branch: Branch;
}

export const KEYWORDS: KeywordDef[] = [
  {
    word: "СПИСОК",
    variants: ["список", "сисок", "списак", "спесок", "guide", "гаид"],
    branch: "guide",
  },
  {
    word: "ЦЕНЫ",
    variants: ["цены", "цени", "цену", "ценa", "price", "горящие"],
    branch: "hot",
  },
  {
    word: "ПОДОБЕРИ",
    variants: ["подбери", "подбор", "podbor", "подбери мне"],
    branch: "select",
  },
];

export function matchKeyword(rawText: string): KeywordDef | null {
  const normalized = rawText.trim().toLowerCase();
  if (normalized.length === 0 || normalized.length > 40) {
    return null;
  }
  for (const def of KEYWORDS) {
    if (normalized === def.word.toLowerCase()) return def;
    if (def.variants.some((v) => v === normalized)) return def;
    if (normalized.includes(def.word.toLowerCase())) return def;
  }
  return null;
}
