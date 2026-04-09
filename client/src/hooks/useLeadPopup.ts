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
    const enabled = raw === null ? true : raw === "true";
    if (!enabled) return;
    const timer = window.setTimeout(() => setShowLeadPopup(true), 5000);
    return () => window.clearTimeout(timer);
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
