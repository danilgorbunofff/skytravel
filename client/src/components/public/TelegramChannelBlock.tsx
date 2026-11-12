import { SITE } from "../../config/site";
import type { PublicLocale } from "../../i18n/locales";
import { publicStrings } from "./strings";
import { TelegramIcon } from "./TelegramIcon";

export function TelegramChannelBlock({ lang }: { lang: PublicLocale }) {
  const s = publicStrings(lang);
  return (
    <section className="pub-section pub-channel" aria-labelledby="pub-channel-title">
      <div className="container pub-channel__inner">
        <div>
          <h2 id="pub-channel-title" className="pub-h2">
            {s.channelTitle}
          </h2>
          <p>{s.channelText}</p>
        </div>
        <a
          className="pub-btn pub-btn--tg"
          href={SITE.telegramChannelUrl}
          target="_blank"
          rel="noopener"
          data-track-location="channel_block"
        >
          <TelegramIcon />
          {s.channelBtn}
        </a>
      </div>
    </section>
  );
}
