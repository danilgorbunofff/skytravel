import type { Author } from "./types.js";

/**
 * Editorial bylines. The blog is written by the SkyTravel editorial desk rather
 * than individual named journalists, so the byline stays honest about who is
 * accountable for the text: the desk plus the public editorial policy on
 * /blog/o-blogu/.
 */
export const AUTHORS: Author[] = [
  {
    slug: "redakce",
    name: "Redakce SkyTravel",
    role: "Redakce · Středomoří a Černá Hora",
    bio: "Redakce SkyTravel píše průvodce destinacemi, které máme v nabídce. Každý článek vychází z cenových a termínových dat našich dodavatelů, z opakovaných návštěv destinací a z ověřených zdrojů uvedených v textu. Texty aktualizujeme, když se změní sezona, ceny nebo podmínky vstupu.",
    expertise: ["Řecko", "Chorvatsko", "Itálie", "Španělsko", "Bulharsko", "Turecko"],
  },
];

export const DEFAULT_AUTHOR = AUTHORS[0];

export function getAuthor(slug: string | null | undefined): Author | null {
  if (!slug) return null;
  return AUTHORS.find((author) => author.slug === slug) ?? null;
}

export function authorUrl(slug: string): string {
  return `/blog/autor/${slug}/`;
}
