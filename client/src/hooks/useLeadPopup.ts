import { useEffect, useState } from "react";
import { createInquiry } from "../api";

export function useLeadPopup() {
  const [showLeadPopup, setShowLeadPopup] = useState(false);
  const [leadEmail, setLeadEmail] = useState("");
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadConsent, setLeadConsent] = useState(true);
  const [leadGdpr, setLeadGdpr] = useState(false);
  const [leadError, setLeadError] = useState("");

  useEffect(() => {
    let timer: number | undefined;
    let cancelled = false;
    const API_URL = import.meta.env.VITE_API_URL || "";
    const scheduleIfEnabled = (enabled: boolean) => {
      if (cancelled || !enabled) return;
      timer = window.setTimeout(() => setShowLeadPopup(true), 5000);
    };
    fetch(`${API_URL}/api/site-settings`, { credentials: "omit" })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: unknown) => {
        const enabled = (body as { data?: { leadPopupEnabled?: boolean } } | null)?.data
          ?.leadPopupEnabled;
        const effective =
          typeof enabled === "boolean"
            ? enabled
            : localStorage.getItem("leadPopupEnabled") !== "false";
        scheduleIfEnabled(effective);
      })
      .catch(() => {
        scheduleIfEnabled(localStorage.getItem("leadPopupEnabled") !== "false");
      });
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  // Exit-intent: fires once per session after 30s of engagement (desktop only).
  // Gated by the same global leadPopupEnabled setting as the timed popup.
  useEffect(() => {
    if (window.innerWidth < 769) return;
    const STORAGE_KEY = "skytravel:exit-popup-shown";
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    let cancelled = false;
    const API_URL = import.meta.env.VITE_API_URL || "";
    const armIfEnabled = (enabled: boolean) => {
      if (cancelled || !enabled) return;
      const attach = () => {
        function handleMouseLeave(e: MouseEvent) {
          if (e.clientY < 10) {
            setShowLeadPopup(true);
            sessionStorage.setItem(STORAGE_KEY, "1");
            document.removeEventListener("mouseleave", handleMouseLeave);
          }
        }
        document.addEventListener("mouseleave", handleMouseLeave);
      };
      if (performance.now() > 30_000) {
        attach();
      } else {
        setTimeout(attach, 30_000 - performance.now());
      }
    };

    fetch(`${API_URL}/api/site-settings`, { credentials: "omit" })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: unknown) => {
        const enabled = (body as { data?: { leadPopupEnabled?: boolean } } | null)?.data
          ?.leadPopupEnabled;
        const effective =
          typeof enabled === "boolean"
            ? enabled
            : localStorage.getItem("leadPopupEnabled") !== "false";
        armIfEnabled(effective);
      })
      .catch(() => {
        armIfEnabled(localStorage.getItem("leadPopupEnabled") !== "false");
      });

    return () => {
      cancelled = true;
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
      .catch(() => setLeadError("Odeslání se nepodařilo, zkuste to prosím znovu."));
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
