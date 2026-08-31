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
    const raw = localStorage.getItem("leadPopupEnabled");
    const enabled = raw === "true";
    if (!enabled) return;
    const timer = window.setTimeout(() => setShowLeadPopup(true), 5000);
    return () => window.clearTimeout(timer);
  }, []);

  // Exit-intent: fires once per session after 30s of engagement (desktop only)
  useEffect(() => {
    if (window.innerWidth < 769) return;
    const STORAGE_KEY = "skytravel:exit-popup-shown";
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    function handleMouseLeave(e: MouseEvent) {
      if (e.clientY < 10) {
        setShowLeadPopup(true);
        sessionStorage.setItem(STORAGE_KEY, "1");
        document.removeEventListener("mouseleave", handleMouseLeave);
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener("mouseleave", handleMouseLeave);
    }, 30_000);

    return () => {
      clearTimeout(timer);
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
