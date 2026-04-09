import type { OwnTour } from "./data";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// ── Shared request helpers ────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function publicGet<T>(path: string) {
  return request<T>(path);
}

function adminRequest<T>(path: string, options: RequestInit = {}) {
  return request<T>(path, { credentials: "include", ...options });
}

function adminPost<T>(path: string, body?: unknown) {
  return adminRequest<T>(path, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function adminPut<T>(path: string, body?: unknown) {
  return adminRequest<T>(path, {
    method: "PUT",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function adminDelete<T>(path: string) {
  return adminRequest<T>(path, { method: "DELETE" });
}

// ── Public API ────────────────────────────────────────────────────────

export async function fetchTours() {
  const data = await publicGet<{ items: OwnTour[] }>("/api/tours");
  return data.items;
}

export async function createInquiry(data: {
  email: string;
  destination?: string | null;
  tourId?: number | null;
  marketingConsent?: boolean;
  gdprConsent?: boolean;
  source?: string;
}) {
  return request<{ ok: boolean }>("/api/inquiries", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Admin API ─────────────────────────────────────────────────────────

export async function fetchAdminTours() {
  const data = await adminRequest<{ items: OwnTour[] }>("/api/admin/tours");
  return data.items;
}

export async function fetchAdminMe() {
  return adminRequest<{ ok: boolean; login: string }>("/api/admin/me");
}

export async function loginAdmin(login: string, password: string) {
  return adminPost<{ ok: boolean; login: string }>("/api/admin/login", { login, password });
}

export async function logoutAdmin() {
  return adminPost<void>("/api/admin/logout");
}

export async function createTour(payload: OwnTour) {
  const data = await adminPost<{ item: OwnTour }>("/api/admin/tours", payload);
  return data.item;
}

export async function updateTour(id: number, payload: OwnTour) {
  const data = await adminPut<{ item: OwnTour }>(`/api/admin/tours/${id}`, payload);
  return data.item;
}

export async function deleteTour(id: number) {
  return adminDelete<void>(`/api/admin/tours/${id}`);
}

export async function updateTourOrder(ids: number[]) {
  return adminPut<{ ok: boolean }>("/api/admin/tours/order", { ids });
}

export async function uploadAdminImages(files: FileList | File[]) {
  const body = new FormData();
  Array.from(files).forEach((file) => body.append("images", file));
  return adminRequest<{ urls: string[] }>("/api/admin/uploads", {
    method: "POST",
    body,
  });
}

// ── Leads ─────────────────────────────────────────────────────────────

export async function fetchLeads() {
  return adminRequest<{ items: unknown[] }>("/api/admin/leads");
}

export async function deleteLead(id: number) {
  return adminDelete<void>(`/api/admin/leads/${id}`);
}

// ── Campaigns ─────────────────────────────────────────────────────────

export async function sendCampaign(payload: {
  subject: string;
  preheader?: string;
  fromEmail?: string;
  html: string;
  segment: string;
}) {
  return adminPost<{ ok: boolean; campaignId: number; recipients: number }>(
    "/api/admin/campaigns/send",
    payload,
  );
}

export async function sendTestCampaign(payload: {
  subject: string;
  preheader?: string;
  fromEmail?: string;
  html: string;
  testEmail: string;
}) {
  return adminPost<{ ok: boolean }>("/api/admin/campaigns/test", payload);
}

// ── Alexandria ────────────────────────────────────────────────────────

export async function importAlexandria(options?: { zeme?: number; dryRun?: boolean }) {
  return adminPost<{
    ok: boolean;
    created?: number;
    updated?: number;
    total?: number;
    dryRun?: boolean;
    message?: string;
  }>("/api/admin/alexandria/import", options ?? {});
}

export async function previewAlexandria(zeme?: number): Promise<Record<string, unknown>> {
  const params = zeme !== undefined ? `?zeme=${zeme}` : "";
  return adminRequest<Record<string, unknown>>(`/api/admin/alexandria/preview/json${params}`);
}
