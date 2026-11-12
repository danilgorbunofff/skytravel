import { useCallback, useEffect, useState } from "react";
import { createInquiry } from "../api";

/** localStorage key: epoch ms of the last time the visitor closed the popup. */
export const LEAD_POPUP_DISMISSED_KEY = "skytravel:lead-popup-dismissed-at";
/** localStorage key: set once the visitor has submitted the popup form. */
export const LEAD_POPUP_SUBMITTED_KEY = "skytravel:lead-popup-submitted";
/** After a dismissal the popup stays away this long. */
export const LEAD_POPUP_SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
/** Timed trigger: only after this much time on the page… */
export const LEAD_POPUP_MIN_DWELL_MS = 40_000;
/** …or once the visitor has scrolled this share of the page. */
export const LEAD_POPUP_SCROLL_RATIO = 0.5;

export interface LeadPopupGate {
  now: number;
  dismissedAt: number | null;
  submitted: boolean;
  cookieBannerVisible: boolean;
  anotherDialogOpen: boolean;
}

/**
 * Whether the popup may open right now. Pure so the policy is unit-testable:
 * never twice after a submit, never within the snooze window after a dismissal,
 * and never on top of the cookie banner or another open dialog.
 */
export function canShowLeadPopup(gate: LeadPopupGate): boolean {
  if (gate.submitted) return false;
  if (gate.cookieBannerVisible || gate.anotherDialogOpen) return false;
  if (gate.dismissedAt != null && gate.now - gate.dismissedAt < LEAD_POPUP_SNOOZE_MS) return false;
  return true;
}

/** Whether the visitor has engaged enough for the timed/scroll trigger. */
export function hasEngaged(dwellMs: number, scrollRatio: number): boolean {
  return dwellMs >= LEAD_POPUP_MIN_DWELL_MS || scrollRatio >= LEAD_POPUP_SCROLL_RATIO;
}

function readNumber(key: string): number | null {
  try {
    const raw = window.localStorage.getItem(key);
    const value = raw == null ? NaN : Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function readGate(): LeadPopupGate {
  let submitted = false;
  try {
    submitted = window.localStorage.getItem(LEAD_POPUP_SUBMITTED_KEY) === "1";
  } catch {
    // storage unavailable — treat as not submitted
  }
  return {
    now: Date.now(),
    dismissedAt: readNumber(LEAD_POPUP_DISMISSED_KEY),
    submitted,
    cookieBannerVisible: document.querySelector(".cookie-banner") != null,
    anotherDialogOpen: document.querySelector('[aria-modal="true"]') != null,
  };
}

function scrollRatio(): number {
  const doc = document.documentElement;
  const scrollable = doc.scrollHeight - window.innerHeight;
  return scrollable > 0 ? window.scrollY / scrollable : 0;
}

/** One settings request per page load, shared by every popup trigger. */
let enabledPromise: Promise<boolean> | null = null;
function fetchPopupEnabled(): Promise<boolean> {
  if (enabledPromise) return enabledPromise;
  const API_URL = import.meta.env.VITE_API_URL || "";
  const localFallback = () => {
    try {
      return window.localStorage.getItem("leadPopupEnabled") !== "false";
    } catch {
      return true;
    }
  };
  enabledPromise = fetch(`${API_URL}/api/site-settings`, { credentials: "omit" })
    .then((r) => (r.ok ? r.json() : null))
    .then((body: unknown) => {
      const enabled = (body as { data?: { leadPopupEnabled?: boolean } } | null)?.data
        ?.leadPopupEnabled;
      return typeof enabled === "boolean" ? enabled : localFallback();
    })
    .catch(localFallback);
  return enabledPromise;
}

export function useLeadPopup() {
  const [showLeadPopup, setShowLeadPopup] = useState(false);
  const [leadEmail, setLeadEmail] = useState("");
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  // Marketing consent must be an explicit opt-in (GDPR: no pre-ticked boxes).
  const [leadConsent, setLeadConsent] = useState(false);
  const [leadGdpr, setLeadGdpr] = useState(false);
  const [leadError, setLeadError] = useState("");

  useEffect(() => {
    // Disabled in dev so popups never interrupt local design review; prod unaffected.
    if (import.meta.env.DEV) return;

    let cancelled = false;
    let shown = false;
    let interval: number | undefined;
    const isDesktop = window.innerWidth >= 769;

    function tryOpen() {
      if (cancelled || shown || !canShowLeadPopup(readGate())) return;
      shown = true;
      setShowLeadPopup(true);
      teardown();
    }

    // Timed / scroll trigger: checked on scroll and every few seconds.
    function check() {
      if (hasEngaged(performance.now(), scrollRatio())) tryOpen();
    }

    // Exit intent (desktop only), after the same engagement threshold.
    function handleMouseLeave(e: MouseEvent) {
      if (e.clientY < 10 && performance.now() >= LEAD_POPUP_MIN_DWELL_MS / 2) tryOpen();
    }

    function teardown() {
      window.removeEventListener("scroll", check);
      document.removeEventListener("mouseleave", handleMouseLeave);
      if (interval !== undefined) window.clearInterval(interval);
    }

    fetchPopupEnabled().then((enabled) => {
      if (cancelled || !enabled || !canShowLeadPopup({ ...readGate(), cookieBannerVisible: false }))
        return;
      window.addEventListener("scroll", check, { passive: true });
      interval = window.setInterval(check, 5000);
      if (isDesktop) document.addEventListener("mouseleave", handleMouseLeave);
    });

    return () => {
      cancelled = true;
      teardown();
    };
  }, []);

  const dismissLeadPopup = useCallback(() => {
    setShowLeadPopup(false);
    try {
      window.localStorage.setItem(LEAD_POPUP_DISMISSED_KEY, String(Date.now()));
    } catch {
      // storage unavailable — popup may come back next visit
    }
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
      .then(() => {
        setLeadSubmitted(true);
        try {
          window.localStorage.setItem(LEAD_POPUP_SUBMITTED_KEY, "1");
        } catch {
          // ignore
        }
      })
      .catch(() => setLeadError("Odeslání se nepodařilo, zkuste to prosím znovu."));
  }

  return {
    showLeadPopup,
    dismissLeadPopup,
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
