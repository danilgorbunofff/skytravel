import { SITE } from "../../config/site";
import type { PublicLocale } from "../../i18n/locales";
import { publicStrings } from "./strings";
import { TelegramIcon } from "./TelegramIcon";

/**
 * Secondary "or write on Telegram" link placed next to a primary action. Keeps Telegram
 * available without a second solid button competing with the inquiry CTA.
 */
export function TelegramTextLink({ lang, location }: { lang: PublicLocale; location: string }) {
  return (
    <a
      className="pub-tg-link"
      href={SITE.telegramContactUrl}
      target="_blank"
      rel="noopener"
      data-track-location={location}
    >
      <TelegramIcon size={18} />
      {publicStrings(lang).orTelegram}
    </a>
  );
}
