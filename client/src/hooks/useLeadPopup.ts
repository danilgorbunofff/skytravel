import { useEffect, useState } from "react";
import { createInquiry } from "../api";
import { useLanguage } from "./useLanguage";

const SHOWN_KEY = "skytravel:lead-popup-shown";
const EXIT_KEY = "skytravel:exit-popup-shown";
const COOKIE_CONSENT_KEY = "cookieConsentGiven";

/** The timed popup waits for real engagement instead of interrupting on arrival. */
const MIN_ENGAGED_MS = 10_000;
const MAX_WAIT_MS = 30_000;
const ENGAGED_SCROLL_PX = 800;
const CHECK_EVERY_MS = 2_000;

function readFlag(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeFlag(storage: Storage, key: string) {
  try {
    storage.setItem(key, "1");
  } catch {
    // storage blocked: the popup may show again on the next page, nothing else breaks
  }
}

/** Never stack the popup on top of the cookie banner: wait until the visitor has answered it. */
function cookieChoiceMade(): boolean {
  if (document.querySelector(".cookie-banner, .cookie-modal")) return false;
  // The banner only renders on the home page; elsewhere there is nothing to wait for.
  return window.location.pathname !== "/" || readFlag(localStorage, COOKIE_CONSENT_KEY) === "true";
}

/** Resolves the admin switch; falls back to the local override when the API is unreachable. */
async function fetchLeadPopupEnabled(): Promise<boolean> {
  const API_URL = import.meta.env.VITE_API_URL || "";
  const local = () => readFlag(localStorage, "leadPopupEnabled") !== "false";
  try {
    const r = await fetch(`${API_URL}/api/site-settings`, { credentials: "omit" });
    const body: unknown = r.ok ? await r.json() : null;
    const enabled = (body as { data?: { leadPopupEnabled?: boolean } } | null)?.data
      ?.leadPopupEnabled;
    return typeof enabled === "boolean" ? enabled : local();
  } catch {
    return local();
  }
}

export function useLeadPopup() {
  const { t } = useLanguage();
  const [showLeadPopup, setShowLeadPopup] = useState(false);
  const [leadEmail, setLeadEmail] = useState("");
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  // Marketing consent must be an explicit opt-in, so it starts unticked.
  const [leadConsent, setLeadConsent] = useState(false);
  const [leadGdpr, setLeadGdpr] = useState(false);
  const [leadError, setLeadError] = useState("");

  // Timed popup: once per session, after the cookie choice and some engagement.
  useEffect(() => {
    // Disabled in dev so popups never interrupt local design review; prod unaffected.
    if (import.meta.env.DEV) return;
    if (readFlag(sessionStorage, SHOWN_KEY)) return;

    let cancelled = false;
    let interval: number | undefined;
    const mountedAt = performance.now();

    fetchLeadPopupEnabled().then((enabled) => {
      if (cancelled || !enabled) return;
      interval = window.setInterval(() => {
        if (!cookieChoiceMade()) return;
        const elapsed = performance.now() - mountedAt;
        const engaged = elapsed >= MIN_ENGAGED_MS && window.scrollY >= ENGAGED_SCROLL_PX;
        if (!engaged && elapsed < MAX_WAIT_MS) return;
        window.clearInterval(interval);
        writeFlag(sessionStorage, SHOWN_KEY);
        setShowLeadPopup(true);
      }, CHECK_EVERY_MS);
    });

    return () => {
      cancelled = true;
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, []);

  // Exit-intent: fires once per session after 30s of engagement (desktop only).
  // Gated by the same global leadPopupEnabled setting as the timed popup.
  useEffect(() => {
    if (import.meta.env.DEV) return;
    if (window.innerWidth < 769) return;
    if (readFlag(sessionStorage, EXIT_KEY) || readFlag(sessionStorage, SHOWN_KEY)) return;

    let cancelled = false;
    let timer: number | undefined;

    function handleMouseLeave(e: MouseEvent) {
      if (e.clientY >= 10 || !cookieChoiceMade()) return;
      if (readFlag(sessionStorage, SHOWN_KEY)) {
        document.removeEventListener("mouseleave", handleMouseLeave);
        return;
      }
      setShowLeadPopup(true);
      writeFlag(sessionStorage, EXIT_KEY);
      writeFlag(sessionStorage, SHOWN_KEY);
      document.removeEventListener("mouseleave", handleMouseLeave);
    }

    fetchLeadPopupEnabled().then((enabled) => {
      if (cancelled || !enabled) return;
      const attach = () => document.addEventListener("mouseleave", handleMouseLeave);
      const remaining = 30_000 - performance.now();
      if (remaining <= 0) attach();
      else timer = window.setTimeout(attach, remaining);
    });

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  function handleLeadSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!leadEmail) return;
    setLeadError("");
    createInquiry({
      email: leadEmail,
      marketingConsent: leadConsent,
      gdprConsent: leadGdpr,
      source: "lead-popup",
    })
      .then(() => setLeadSubmitted(true))
      .catch(() => setLeadError(t("formSendError")));
  }

  return {
    showLeadPopup,
    setShowLeadPopup,
    leadEmail,
    setLeadEmail,
    leadSubmitted,
    leadConsent,
    setLeadConsent,
    leadGdpr,
    setLeadGdpr,
    leadError,
    handleLeadSubmit,
  };
}
