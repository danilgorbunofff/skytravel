import type { PublicLocale } from "../../i18n/locales";
import type { LandingSummary } from "../../ssr/types";

const FALLBACK_LINKS: Record<PublicLocale, LandingSummary[]> = {
  cs: [
    { path: "/cs/last-minute/", label: "Last minute zájezdy z Prahy" },
    { path: "/cs/egypt/", label: "Zájezdy do Egypta" },
  ],
  ru: [
    { path: "/ru/goryashchie-tury/", label: "Горящие туры из Праги" },
    { path: "/ru/egipet/", label: "Туры в Египет из Праги" },
  ],
};

/**
 * Crawlable intro copy + internal links on the home page.
 * TODO (content): adjust the text below to your own words.
 */
export function HomeSeoSection({ lang, links }: { lang: PublicLocale; links?: LandingSummary[] }) {
  const items = links && links.length > 0 ? links : FALLBACK_LINKS[lang];
  return (
    <section className="pub-section pub-intro" aria-labelledby="pub-intro-title">
      <div className="container pub-intro__inner">
        {lang === "ru" ? (
          <div className="pub-content">
            <h2 id="pub-intro-title">Туры из Праги без наценки — от всех чешских туроператоров</h2>
            <p>
              SkyTravel — турагентство в Праге для тех, кто хочет отдыхать без переплат и общаться
              на родном языке. Мы продаём туры всех чешских туроператоров (CK) по их собственным
              ценам: вы платите столько же, сколько заплатили бы напрямую в CK, а подбор,
              консультацию и поддержку на русском языке получаете бесплатно.
            </p>
            <p>
              В поиске — пакетные туры с вылетом из Праги: горящие путёвки, all inclusive на море,
              Турция, Греция, Египет, Испания, Болгария и экзотика. Не хотите искать сами? Оставьте
              заявку или напишите нам в Telegram — пришлём лучшие варианты под ваши даты и бюджет.
            </p>
          </div>
        ) : (
          <div className="pub-content">
            <h2 id="pub-intro-title">Zájezdy z Prahy bez přirážky — od všech českých CK</h2>
            <p>
              SkyTravel je cestovní agentura v Praze. Prodáváme zájezdy všech českých cestovních
              kanceláří za jejich vlastní ceny — zaplatíte stejně jako přímo u CK, ale k tomu
              dostanete osobní výběr, srovnání nabídek a pomoc v češtině i ruštině.
            </p>
            <p>
              Ve vyhledávači najdete zájezdy s odletem z Prahy: last minute, all inclusive u moře,
              Turecko, Řecko, Egypt, Španělsko, Bulharsko i exotiku. Nechcete hledat sami? Pošlete
              poptávku nebo nám napište na Telegram a my vám pošleme nejlepší nabídky.
            </p>
          </div>
        )}
        <nav aria-label={lang === "ru" ? "Популярные направления" : "Oblíbené směry"}>
          <ul className="pub-related">
            {items.map((item) => (
              <li key={item.path}>
                <a href={item.path}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
