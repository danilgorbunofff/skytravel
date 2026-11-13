import type { Lead, OwnTour } from "../types";
import { csrfFetch } from "../../../lib/csrf";

const API_URL = import.meta.env.VITE_API_URL || "";

// ── Errors ────────────────────────────────────────────────────────────────

/** Czech messages for the machine-readable codes the admin API returns. */
const ERROR_MESSAGES: Record<string, string> = {
  NO_RECIPIENTS: "Žádný kontakt nemá marketingový souhlas.",
  FORBIDDEN_SEGMENT: "Kampaně lze posílat pouze kontaktům se souhlasem.",
  SMTP_NOT_CONFIGURED: "Odesílání e-mailů není na serveru nastavené (SMTP).",
  INVALID_FROM: "Adresa odesílatele chybí nebo je neplatná.",
  VALIDATION_ERROR: "Formulář obsahuje neplatné údaje.",
  RATE_LIMITED: "Příliš mnoho požadavků. Zkuste to za chvíli znovu.",
  CSRF_INVALID: "Platnost relace vypršela. Obnovte stránku a zkuste to znovu.",
  UNAUTHORIZED: "Nejste přihlášeni. Přihlaste se prosím znovu.",
  NOT_FOUND: "Položka nebyla nalezena.",
};

/**
 * Turns an admin API error body (`{ ok: false, error: { code, message } }`)
 * into a Czech message for the UI. Unknown codes fall back to `fallback`
 * rather than showing raw English server text.
 */
export function apiErrorMessage(body: unknown, fallback: string): string {
  const error = (body as { error?: unknown } | null)?.error;
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : typeof error === "string"
        ? error
        : "";
  return ERROR_MESSAGES[code] ?? fallback;
}

async function failWith(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => null);
  throw new Error(apiErrorMessage(body, fallback));
}

// ── Auth ──────────────────────────────────────────────────────────────────

export async function fetchAdminMe() {
  const res = await fetch(`${API_URL}/api/admin/me`, { credentials: "include" });
  if (!res.ok) throw new Error("Not authenticated");
  return res.json();
}

export async function loginAdmin(login: string, password: string) {
  const res = await csrfFetch(`${API_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ login, password }),
  });
  if (!res.ok) throw new Error("Invalid credentials");
  return res.json();
}

export async function logoutAdmin() {
  await csrfFetch(`${API_URL}/api/admin/logout`, { method: "POST" });
}

// ── Tours CRUD ────────────────────────────────────────────────────────────

export async function fetchAdminTours() {
  const res = await fetch(`${API_URL}/api/admin/tours`, { credentials: "include" });
  if (!res.ok) await failWith(res, "Nepodařilo se načíst nabídky.");
  const body = (await res.json()) as { data?: { items?: OwnTour[] } };
  return body.data?.items ?? [];
}

export async function createTour(payload: OwnTour) {
  const res = await csrfFetch(`${API_URL}/api/admin/tours`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) await failWith(res, "Nabídku se nepodařilo vytvořit.");
  const body = (await res.json()) as { data?: { item?: OwnTour } };
  return body.data?.item as OwnTour;
}

export async function updateTour(id: number, payload: OwnTour) {
  const res = await csrfFetch(`${API_URL}/api/admin/tours/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) await failWith(res, "Nabídku se nepodařilo uložit.");
  const body = (await res.json()) as { data?: { item?: OwnTour } };
  return body.data?.item as OwnTour;
}

export async function deleteTour(id: number) {
  const res = await csrfFetch(`${API_URL}/api/admin/tours/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok && res.status !== 204) await failWith(res, "Nabídku se nepodařilo smazat.");
}

export async function updateTourOrder(ids: number[]) {
  const res = await csrfFetch(`${API_URL}/api/admin/tours/order`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) await failWith(res, "Pořadí se nepodařilo uložit.");
  return res.json();
}

// ── Uploads ───────────────────────────────────────────────────────────────

export async function uploadAdminImages(files: FileList | File[]) {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append("images", file));
  const res = await csrfFetch(`${API_URL}/api/admin/uploads`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  if (!res.ok) await failWith(res, "Nahrání obrázků se nezdařilo.");
  const body = (await res.json()) as { data?: { urls?: string[] } };
  return { urls: body.data?.urls ?? [] };
}

// ── Leads & Campaigns ────────────────────────────────────────────────────

export async function fetchLeads(params?: {
  segment?: string;
  q?: string;
  limit?: number;
  offset?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.segment) qs.set("segment", params.segment);
  if (params?.q) qs.set("q", params.q);
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.offset != null) qs.set("offset", String(params.offset));
  const suffix = qs.toString() ? `?${qs}` : "";
  const res = await fetch(`${API_URL}/api/admin/leads${suffix}`, { credentials: "include" });
  if (!res.ok) await failWith(res, "Nepodařilo se načíst kontakty.");
  return res.json() as Promise<
    | { ok: boolean; data: { items: Lead[]; total: number; limit: number; offset: number } }
    | { ok: boolean; data: { items: unknown[] } }
  >;
}

export async function deleteLead(id: number) {
  const res = await csrfFetch(`${API_URL}/api/admin/leads/${id}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204) await failWith(res, "Kontakt se nepodařilo smazat.");
}

/**
 * Exact number of leads in a segment, counted by the server. The campaign
 * send endpoint targets `segment` without any search query, so this is the
 * number of recipients a campaign really reaches.
 */
export async function fetchLeadCount(segment: "all" | "consented" | "pending"): Promise<number> {
  const body = await fetchLeads({ segment, limit: 1, offset: 0 });
  const total = (body.data as { total?: unknown }).total;
  if (typeof total !== "number") throw new Error("Nepodařilo se zjistit počet kontaktů.");
  return total;
}

export async function sendCampaign(payload: {
  subject: string;
  preheader?: string;
  fromEmail?: string;
  html: string;
  segment: string;
}) {
  const res = await csrfFetch(`${API_URL}/api/admin/campaigns/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) await failWith(res, "Odeslání kampaně se nezdařilo.");
  return res.json();
}

export async function sendTestCampaign(payload: {
  subject: string;
  preheader?: string;
  fromEmail?: string;
  html: string;
  testEmail: string;
}) {
  const res = await csrfFetch(`${API_URL}/api/admin/campaigns/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) await failWith(res, "Testovací e-mail se nepodařilo odeslat.");
  return res.json();
}

// ── Statistics ────────────────────────────────────────────────────────────

export interface StatisticsData {
  totalVisits: number; // deprecated alias for totalOffers
  inquiries: number;
  inquiriesConsented: number;
  consentRate: number;
  conversionRate: number; // deprecated alias for consentRate
  totalOffers: number;
  topDestination: string;
  visitsTrend: { label: string; value: number }[]; // deprecated alias for inquiriesTrend
  inquiriesTrend: { label: string; value: number }[];
  trendGranularity: "day" | "month";
  channels: { label: string; pct: number }[];
  destinationBreakdown: { label: string; value: number }[];
  perDestination: { destination: string; inquiries: number }[];
  period: string;
}

export async function fetchStatistics(period: string): Promise<StatisticsData> {
  const res = await fetch(`${API_URL}/api/admin/statistics?period=${period}`, {
    credentials: "include",
  });
  if (!res.ok) await failWith(res, "Nepodařilo se načíst statistiky.");
  const body = await res.json();
  return body.data as StatisticsData;
}

// ── Site settings ─────────────────────────────────────────────────────────

export interface SiteSettings {
  leadPopupEnabled: boolean;
}

export async function fetchSiteSettings(): Promise<SiteSettings> {
  const res = await fetch(`${API_URL}/api/admin/site-settings`, { credentials: "include" });
  if (!res.ok) await failWith(res, "Nepodařilo se načíst nastavení.");
  const body = (await res.json()) as { data: SiteSettings };
  return body.data;
}

export async function updateSiteSettings(settings: SiteSettings): Promise<SiteSettings> {
  const res = await csrfFetch(`${API_URL}/api/admin/site-settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) await failWith(res, "Uložení nastavení se nezdařilo.");
  const body = (await res.json()) as { data: SiteSettings };
  return body.data;
}
