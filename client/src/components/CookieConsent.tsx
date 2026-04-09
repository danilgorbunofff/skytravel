import { useLanguage } from "../hooks/useLanguage";
import type { CookiePrefs } from "../hooks/useCookieConsent";

type Props = {
  showCookies: boolean;
  cookieSettingsOpen: boolean;
  setCookieSettingsOpen: (v: boolean) => void;
  cookiePrefs: CookiePrefs;
  setCookiePrefs: React.Dispatch<React.SetStateAction<CookiePrefs>>;
  applyCookiePrefs: (prefs: CookiePrefs) => void;
};

export default function CookieConsent({
  showCookies,
  cookieSettingsOpen,
  setCookieSettingsOpen,
  cookiePrefs,
  setCookiePrefs,
  applyCookiePrefs,
}: Props) {
  const { t } = useLanguage();

  if (!showCookies) return null;

  return (
    <>
      <div className="cookie-banner" role="dialog" aria-live="polite" aria-label="Cookie consent">
        <div className="cookie-banner__content">
          <div className="cookie-banner__text">
            <strong>{t("cookieTitle")}</strong>
            <span>{t("cookieText")}</span>
          </div>
          <div className="cookie-banner__actions">
            <button
              type="button"
              className="cookie-btn cookie-btn--primary"
              onClick={() => applyCookiePrefs({ necessary: true, analytics: true, marketing: true })}
            >
              {t("cookieAccept")}
            </button>
            <button
              type="button"
              className="cookie-btn"
              onClick={() => applyCookiePrefs({ necessary: true, analytics: false, marketing: false })}
            >
              {t("cookieReject")}
            </button>
          </div>
          <button type="button" className="cookie-manage" onClick={() => setCookieSettingsOpen(true)}>
            {t("cookieManage")}
          </button>
        </div>
      </div>

      {cookieSettingsOpen && (
        <div className="cookie-modal" role="dialog" aria-modal="true" aria-label={t("cookieSettingsTitle")}>
          <div className="cookie-modal__backdrop" onClick={() => setCookieSettingsOpen(false)} />
          <div className="cookie-modal__card">
            <div className="cookie-modal__head">
              <strong>{t("cookieSettingsTitle")}</strong>
              <button type="button" onClick={() => setCookieSettingsOpen(false)}>✕</button>
            </div>
            <p className="cookie-modal__intro">{t("cookieSettingsIntro")}</p>
            <div className="cookie-modal__list">
              <div className="cookie-modal__item">
                <div>
                  <strong>{t("cookieMarketing")}</strong>
                  <span>{t("cookieMarketingDesc")}</span>
                </div>
                <button
                  type="button"
                  className={`cookie-toggle${cookiePrefs.marketing ? " is-on" : ""}`}
                  aria-pressed={cookiePrefs.marketing}
                  onClick={() => setCookiePrefs((prev) => ({ ...prev, marketing: !prev.marketing }))}
                />
              </div>
              <div className="cookie-modal__item">
                <div>
                  <strong>{t("cookieAnalytics")}</strong>
                  <span>{t("cookieAnalyticsDesc")}</span>
                </div>
                <button
                  type="button"
                  className={`cookie-toggle${cookiePrefs.analytics ? " is-on" : ""}`}
                  aria-pressed={cookiePrefs.analytics}
                  onClick={() => setCookiePrefs((prev) => ({ ...prev, analytics: !prev.analytics }))}
                />
              </div>
              <div className="cookie-modal__item">
                <div>
                  <strong>{t("cookieNecessary")}</strong>
                  <span>{t("cookieNecessaryDesc")}</span>
                </div>
                <button type="button" className="cookie-toggle is-on is-disabled" disabled aria-pressed />
              </div>
            </div>
            <div className="cookie-modal__actions">
              <button
                type="button"
                className="cookie-btn"
                onClick={() => applyCookiePrefs({ necessary: true, analytics: false, marketing: false })}
              >
                {t("cookieReject")}
              </button>
              <button
                type="button"
                className="cookie-btn cookie-btn--ghost"
                onClick={() => applyCookiePrefs({ necessary: true, analytics: true, marketing: true })}
              >
                {t("cookieAllowAll")}
              </button>
              <button
                type="button"
                className="cookie-btn cookie-btn--primary"
                onClick={() =>
                  applyCookiePrefs({
                    necessary: true,
                    analytics: cookiePrefs.analytics,
                    marketing: cookiePrefs.marketing,
                  })
                }
              >
                {t("cookieSave")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
