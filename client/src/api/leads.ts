import type { UtmParams } from "../lib/utm";

const API_URL = import.meta.env.VITE_API_URL || "";

export type ContactMethod = "telegram" | "phone" | "email";

export interface LeadRequest {
  destination?: string;
  dateFrom?: string;
  dateTo?: string;
  adults: number;
  children: number;
  budget?: string;
  contactMethod: ContactMethod;
  contact: string;
  name?: string;
  message?: string;
  gdprConsent: true;
  lang: "cs" | "ru";
  pagePath: string;
  utm?: UtmParams;
  /** Honeypot — must stay empty. */
  website?: string;
}

export async function submitLead(data: LeadRequest): Promise<void> {
  const res = await fetch(`${API_URL}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Lead submit failed: ${res.status}`);
}
