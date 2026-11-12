import type { Lead, OwnTour } from "../types";
import { csrfFetch } from "../../../lib/csrf";

const API_URL = import.meta.env.VITE_API_URL || "";

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
  if (!res.ok) throw new Error("Failed to load tours");
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
  if (!res.ok) throw new Error("Failed to create tour");
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
  if (!res.ok) throw new Error("Failed to update tour");
  const body = (await res.json()) as { data?: { item?: OwnTour } };
  return body.data?.item as OwnTour;
}

export async function deleteTour(id: number) {
  const res = await csrfFetch(`${API_URL}/api/admin/tours/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok && res.status !== 204) throw new Error("Failed to delete tour");
}

export async function updateTourOrder(ids: number[]) {
  const res = await csrfFetch(`${API_URL}/api/admin/tours/order`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error("Failed to update order");
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
  if (!res.ok) throw new Error("Failed to upload images");
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
  if (!res.ok) throw new Error("Failed to fetch leads");
  return res.json() as Promise<
    | { ok: boolean; data: { items: Lead[]; total: number; limit: number; offset: number } }
    | { ok: boolean; data: { items: unknown[] } }
  >;
}

export async function deleteLead(id: number) {
  const res = await csrfFetch(`${API_URL}/api/admin/leads/${id}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204) throw new Error("Failed to delete lead");
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
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Failed to send campaign");
  }
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
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Failed to send test email");
  }
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
  if (!res.ok) throw new Error("Failed to load statistics");
  const body = await res.json();
  return body.data as StatisticsData;
}
