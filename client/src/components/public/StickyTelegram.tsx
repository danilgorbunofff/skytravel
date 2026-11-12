import { SITE } from "../../config/site";
import type { PublicLocale } from "../../i18n/locales";
import { publicStrings } from "./strings";
import { TelegramIcon } from "./TelegramIcon";

/** Floating "Write in Telegram" button shown on every public page. */
export function StickyTelegram({ lang }: { lang: PublicLocale }) {
  const s = publicStrings(lang);
  return (
    <a
      className="pub-sticky-tg"
      href={SITE.telegramContactUrl}
      target="_blank"
      rel="noopener"
      data-track-location="sticky"
      aria-label={s.writeTelegram}
    >
      <TelegramIcon size={22} />
      <span className="pub-sticky-tg__label">{s.writeTelegram}</span>
    </a>
  );
}
