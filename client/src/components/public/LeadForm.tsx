import { useId, useState, type FormEvent } from "react";
import { submitLead, type ContactMethod } from "../../api/leads";
import type { PublicLocale } from "../../i18n/locales";
import { track } from "../../lib/analytics";
import { getUtm } from "../../lib/utm";
import { BUDGET_OPTIONS, publicStrings } from "./strings";
import { TelegramTextLink } from "./TelegramTextLink";

interface Props {
  lang: PublicLocale;
  defaultDestination?: string;
  /** Where the form sits — sent to analytics and to the lead notification. */
  location: string;
}

type Status = "idle" | "sending" | "sent" | "error";

const CONTACT_METHODS: ContactMethod[] = ["telegram", "phone", "email"];
const CONTACT_LABELS: Record<ContactMethod, string> = {
  telegram: "Telegram",
  phone: "Tel.",
  email: "E-mail",
};

export function LeadForm({ lang, defaultDestination = "", location }: Props) {
  const s = publicStrings(lang);
  const id = useId();
  const [destination, setDestination] = useState(defaultDestination);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [budget, setBudget] = useState("");
  const [contactMethod, setContactMethod] = useState<ContactMethod>("telegram");
  const [contact, setContact] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [gdpr, setGdpr] = useState(false);
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contact.trim()) {
      setError(s.leadContactRequired);
      return;
    }
    if (!gdpr) {
      setError(s.leadGdprRequired);
      return;
    }
    setError("");
    setStatus("sending");
    try {
      await submitLead({
        destination: destination.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        adults,
        children,
        budget: budget || undefined,
        contactMethod,
        contact: contact.trim(),
        name: name.trim() || undefined,
        message: message.trim() || undefined,
        gdprConsent: true,
        lang,
        pagePath: window.location.pathname,
        utm: getUtm(),
        website,
      });
      setStatus("sent");
      track("generate_lead", {
        form_location: location,
        destination: destination.trim() || "any",
        contact_method: contactMethod,
      });
    } catch {
      setStatus("error");
      setError(s.leadError);
    }
  }

  if (status === "sent") {
    return (
      <div className="pub-lead pub-lead--sent" role="status">
        <p className="pub-lead__success">{s.leadSuccess}</p>
      </div>
    );
  }

  const f = (name: string) => `${id}-${name}`;

  return (
    <form className="pub-lead" onSubmit={handleSubmit} noValidate>
      <div className="pub-lead__grid">
        <label className="pub-field pub-field--wide" htmlFor={f("dest")}>
          <span>{s.leadDestination}</span>
          <input
            id={f("dest")}
            type="text"
            value={destination}
            maxLength={120}
            placeholder={s.leadDestinationPh}
            onChange={(e) => setDestination(e.target.value)}
          />
        </label>
        <label className="pub-field" htmlFor={f("from")}>
          <span>{s.leadDateFrom}</span>
          <input
            id={f("from")}
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>
        <label className="pub-field" htmlFor={f("to")}>
          <span>{s.leadDateTo}</span>
          <input
            id={f("to")}
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>
        <label className="pub-field" htmlFor={f("adults")}>
          <span>{s.leadAdults}</span>
          <select
            id={f("adults")}
            value={adults}
            onChange={(e) => setAdults(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="pub-field" htmlFor={f("children")}>
          <span>{s.leadChildren}</span>
          <select
            id={f("children")}
            value={children}
            onChange={(e) => setChildren(Number(e.target.value))}
          >
            {[0, 1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="pub-field pub-field--wide" htmlFor={f("budget")}>
          <span>{s.leadBudget}</span>
          <select id={f("budget")} value={budget} onChange={(e) => setBudget(e.target.value)}>
            <option value="">{s.leadBudgetAny}</option>
            {BUDGET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="pub-field pub-field--wide pub-contact-method">
          <legend>{s.leadContactMethod}</legend>
          <div className="pub-segmented">
            {CONTACT_METHODS.map((method) => (
              <label key={method} className={contactMethod === method ? "is-active" : ""}>
                <input
                  type="radio"
                  name={f("method")}
                  value={method}
                  checked={contactMethod === method}
                  onChange={() => setContactMethod(method)}
                />
                {CONTACT_LABELS[method]}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="pub-field" htmlFor={f("contact")}>
          <span>{s.leadContact} *</span>
          <input
            id={f("contact")}
            type={contactMethod === "email" ? "email" : contactMethod === "phone" ? "tel" : "text"}
            autoComplete={
              contactMethod === "email" ? "email" : contactMethod === "phone" ? "tel" : "off"
            }
            required
            maxLength={120}
            value={contact}
            placeholder={s.leadContactPh[contactMethod]}
            onChange={(e) => setContact(e.target.value)}
          />
        </label>
        <label className="pub-field" htmlFor={f("name")}>
          <span>{s.leadName}</span>
          <input
            id={f("name")}
            type="text"
            autoComplete="name"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="pub-field pub-field--wide" htmlFor={f("msg")}>
          <span>{s.leadMessage}</span>
          <textarea
            id={f("msg")}
            rows={3}
            maxLength={1000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>

        {/* Honeypot: hidden from people, bots tend to fill it. */}
        <div className="pub-hp" aria-hidden="true">
          <label>
            Website
            <input
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </label>
        </div>
      </div>

      <label className="pub-consent">
        <input type="checkbox" checked={gdpr} onChange={(e) => setGdpr(e.target.checked)} />
        <span>
          {s.leadGdpr} <a href="/gdpr">{s.leadGdprLink}</a>
        </span>
      </label>

      {error && (
        <p className="pub-lead__error" role="alert">
          {error}
        </p>
      )}

      <div className="pub-lead__actions">
        <button type="submit" className="pub-btn pub-btn--primary" disabled={status === "sending"}>
          {status === "sending" ? s.leadSending : s.leadSubmit}
        </button>
        <TelegramTextLink lang={lang} location={`${location}_form`} />
      </div>
    </form>
  );
}
