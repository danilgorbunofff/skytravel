import { useEffect } from "react";
import { useLanguage } from "../hooks/useLanguage";
import { useFocusTrap } from "../features/search/hooks/useFocusTrap";
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
  const trapRef = useFocusTrap(showCookies && cookieSettingsOpen);

  useEffect(() => {
    if (!showCookies || !cookieSettingsOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setCookieSettingsOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showCookies, cookieSettingsOpen, setCookieSettingsOpen]);

  if (!showCookies) return null;

  return (
    <>
      {/* Non-blocking notice, not a modal: a labelled region the page can be used around. */}
      <section className="cookie-banner" aria-labelledby="cookie-banner-title">
        <div className="cookie-banner__content">
          <div className="cookie-banner__text">
            <strong id="cookie-banner-title">{t("cookieTitle")}</strong>
            <span>{t("cookieText")}</span>
          </div>
          <div className="cookie-banner__actions">
            <button
              type="button"
              className="cookie-btn cookie-btn--primary"
              onClick={() =>
                applyCookiePrefs({ necessary: true, analytics: true, marketing: true })
              }
            >
              {t("cookieAccept")}
            </button>
            <button
              type="button"
              className="cookie-btn"
              onClick={() =>
                applyCookiePrefs({ necessary: true, analytics: false, marketing: false })
              }
            >
              {t("cookieReject")}
            </button>
          </div>
          <button
            type="button"
            className="cookie-manage"
            onClick={() => setCookieSettingsOpen(true)}
          >
            {t("cookieManage")}
          </button>
        </div>
      </section>

      {cookieSettingsOpen && (
        <div
          ref={trapRef}
          className="cookie-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-modal-title"
        >
          <div
            className="cookie-modal__backdrop"
            aria-hidden="true"
            onClick={() => setCookieSettingsOpen(false)}
          />
          <div className="cookie-modal__card">
            <div className="cookie-modal__head">
              <strong id="cookie-modal-title">{t("cookieSettingsTitle")}</strong>
              <button
                type="button"
                aria-label={t("sModalClose")}
                onClick={() => setCookieSettingsOpen(false)}
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
            <p className="cookie-modal__intro">{t("cookieSettingsIntro")}</p>
            <div className="cookie-modal__list">
              <div className="cookie-modal__item">
                <div>
                  <strong id="cookie-marketing-label">{t("cookieMarketing")}</strong>
                  <span>{t("cookieMarketingDesc")}</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  className={`cookie-toggle${cookiePrefs.marketing ? " is-on" : ""}`}
                  aria-checked={cookiePrefs.marketing}
                  aria-labelledby="cookie-marketing-label"
                  onClick={() =>
                    setCookiePrefs((prev) => ({ ...prev, marketing: !prev.marketing }))
                  }
                />
              </div>
              <div className="cookie-modal__item">
                <div>
                  <strong id="cookie-analytics-label">{t("cookieAnalytics")}</strong>
                  <span>{t("cookieAnalyticsDesc")}</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  className={`cookie-toggle${cookiePrefs.analytics ? " is-on" : ""}`}
                  aria-checked={cookiePrefs.analytics}
                  aria-labelledby="cookie-analytics-label"
                  onClick={() =>
                    setCookiePrefs((prev) => ({ ...prev, analytics: !prev.analytics }))
                  }
                />
              </div>
              <div className="cookie-modal__item">
                <div>
                  <strong id="cookie-necessary-label">{t("cookieNecessary")}</strong>
                  <span>{t("cookieNecessaryDesc")}</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  className="cookie-toggle is-on is-disabled"
                  disabled
                  aria-checked
                  aria-labelledby="cookie-necessary-label"
                />
              </div>
            </div>
            <div className="cookie-modal__actions">
              <button
                type="button"
                className="cookie-btn"
                onClick={() =>
                  applyCookiePrefs({ necessary: true, analytics: false, marketing: false })
                }
              >
                {t("cookieReject")}
              </button>
              <button
                type="button"
                className="cookie-btn cookie-btn--ghost"
                onClick={() =>
                  applyCookiePrefs({ necessary: true, analytics: true, marketing: true })
                }
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
