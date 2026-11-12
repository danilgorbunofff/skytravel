import { SITE } from "../config/site";

/**
 * Google Analytics 4 with Consent Mode v2.
 *
 * gtag.js is loaded only when SITE.ga4Id is filled in. Until the visitor
 * accepts analytics cookies, GA runs in cookieless mode (consent "denied");
 * accepting in the cookie banner calls `setAnalyticsConsent(true)`.
 *
 * Custom events (GA4 → Admin → Events):
 *   generate_lead   – lead form sent        { form_location, destination, contact_method }
 *   telegram_click  – any t.me link clicked { link_url, click_location }
 *   deal_click      – a tour/deal opened    { deal_id, deal_destination, value, click_location }
 */

type GtagArgs = [string, ...unknown[]];

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: GtagArgs) => void;
  }
}

const CONSENT_KEY = "skytravel:analytics-consent";
let initialised = false;

function gtag(..._args: GtagArgs) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  // gtag.js only processes real `arguments` objects — a plain array is ignored.
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments);
}

function storedConsent(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === "granted";
  } catch {
    return false;
  }
}

export function initAnalytics(): void {
  if (initialised || typeof window === "undefined" || !SITE.ga4Id) return;
  initialised = true;
  window.gtag = gtag;

  const granted = storedConsent();
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: granted ? "granted" : "denied",
  });
  gtag("js", new Date());
  gtag("config", SITE.ga4Id, { anonymize_ip: true });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(SITE.ga4Id)}`;
  document.head.appendChild(script);

  installTelegramClickTracking();
}

export function setAnalyticsConsent(granted: boolean): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, granted ? "granted" : "denied");
  } catch {
    // ignore
  }
  if (!SITE.ga4Id) return;
  gtag("consent", "update", { analytics_storage: granted ? "granted" : "denied" });
}

export function track(event: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined" || !SITE.ga4Id) return;
  gtag("event", event, params);
}

/** One delegated listener tracks every Telegram link on every page. */
function installTelegramClickTracking() {
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target as Element | null;
      const link = target?.closest?.("a[href*='t.me/']") as HTMLAnchorElement | null;
      if (!link) return;
      track("telegram_click", {
        link_url: link.href,
        click_location: link.dataset.trackLocation ?? "unknown",
        page_path: window.location.pathname,
      });
    },
    { capture: true },
  );
}
