import { useEffect, useState } from "react";
import { SITE } from "../../config/site";
import type { PublicLocale } from "../../i18n/locales";
import { publicStrings } from "./strings";
import { TelegramIcon } from "./TelegramIcon";

// Blocks that already offer a contact channel; the floating button steps aside over them.
const CONTACT_BLOCKS = "#poptavka, .pub-channel";

/** Floating "Write in Telegram" button, hidden while the inquiry form or channel band is visible. */
export function StickyTelegram({ lang }: { lang: PublicLocale }) {
  const s = publicStrings(lang);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const targets = Array.from(document.querySelectorAll(CONTACT_BLOCKS));
    if (targets.length === 0 || typeof IntersectionObserver === "undefined") return;
    const visible = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      setHidden(visible.size > 0);
    });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return (
    <a
      className={`pub-sticky-tg${hidden ? " is-hidden" : ""}`}
      href={SITE.telegramContactUrl}
      target="_blank"
      rel="noopener"
      data-track-location="sticky"
      aria-label={s.writeTelegram}
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
    >
      <TelegramIcon size={22} />
      <span className="pub-sticky-tg__label">{s.writeTelegram}</span>
    </a>
  );
}
