import type { OwnTour } from "./data";

// In production the frontend is served by the same nginx that proxies /api,
// so use a relative base. In local dev VITE_API_URL can override to http://localhost:4000.
const API_URL = import.meta.env.VITE_API_URL || "";

export async function fetchTours() {
  const res = await fetch(`${API_URL}/api/tours`);
  if (!res.ok) throw new Error("Failed to load tours");
  const data = await res.json();
  return data.items as OwnTour[];
}

export async function fetchAdminTours() {
  const res = await fetch(`${API_URL}/api/admin/tours`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load tours");
  const data = await res.json();
  return data.items as OwnTour[];
}

export async function fetchAdminMe() {
  const res = await fetch(`${API_URL}/api/admin/me`, { credentials: "include" });
  if (!res.ok) throw new Error("Not authenticated");
  return res.json();
}

export async function loginAdmin(login: string, password: string) {
  const res = await fetch(`${API_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ login, password }),
  });
  if (!res.ok) throw new Error("Invalid credentials");
  return res.json();
}

export async function logoutAdmin() {
  await fetch(`${API_URL}/api/admin/logout`, { method: "POST", credentials: "include" });
}

export async function createTour(payload: OwnTour) {
  const res = await fetch(`${API_URL}/api/admin/tours`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create tour");
  const data = await res.json();
  return data.item as OwnTour;
}

export async function updateTour(id: number, payload: OwnTour) {
  const res = await fetch(`${API_URL}/api/admin/tours/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update tour");
  const data = await res.json();
  return data.item as OwnTour;
}

export async function deleteTour(id: number) {
  const res = await fetch(`${API_URL}/api/admin/tours/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok && res.status !== 204) throw new Error("Failed to delete tour");
}

export async function updateTourOrder(ids: number[]) {
  const res = await fetch(`${API_URL}/api/admin/tours/order`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error("Failed to update order");
  return res.json();
}

export async function uploadAdminImages(files: FileList | File[]) {
  const body = new FormData();
  Array.from(files).forEach((file) => body.append("images", file));
  const res = await fetch(`${API_URL}/api/admin/uploads`, {
    method: "POST",
    body,
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to upload images");
  return res.json() as Promise<{ urls: string[] }>;
}

export async function createInquiry(data: {
  email: string;
  destination?: string | null;
  tourId?: number | null;
  marketingConsent?: boolean;
  gdprConsent?: boolean;
  source?: string;
}) {
  const res = await fetch(`${API_URL}/api/inquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to submit inquiry");
  return res.json();
}

export async function fetchLeads() {
  const res = await fetch(`${API_URL}/api/admin/leads`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch leads");
  return res.json();
}

export async function deleteLead(id: number) {
  const res = await fetch(`${API_URL}/api/admin/leads/${id}`, {
    method: "DELETE",
    credentials: "include",
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
  const res = await fetch(`${API_URL}/api/admin/campaigns/send`, {
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
  const res = await fetch(`${API_URL}/api/admin/campaigns/test`, {
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

// ──────────────────────────────────────────────────────────────
// Alexandria XML feed integration
// ──────────────────────────────────────────────────────────────

export type AlexandriaTour = {
  externalId: string;
  destination: string;
  title: string;
  price: number;
  startDate: string;
  endDate: string;
  transport: string;
  image: string;
  description: string | null;
  photos: string[];
  url?: string;
  stars?: string;
  board?: string;
};

export type AlexandriaFilters = {
  q?: string;
  transport?: string;
  priceMin?: number;
  priceMax?: number;
  dateStart?: string;
  dateEnd?: string;
  zeme?: number;
  refresh?: boolean;
};

export async function fetchAlexandriaTours(
  filters?: AlexandriaFilters,
): Promise<{ total: number; filtered: number; items: AlexandriaTour[] }> {
  const params = new URLSearchParams();
  if (filters?.q) params.set("q", filters.q);
  if (filters?.transport) params.set("transport", filters.transport);
  if (filters?.priceMin !== undefined) params.set("priceMin", String(filters.priceMin));
  if (filters?.priceMax !== undefined) params.set("priceMax", String(filters.priceMax));
  if (filters?.dateStart) params.set("dateStart", filters.dateStart);
  if (filters?.dateEnd) params.set("dateEnd", filters.dateEnd);
  if (filters?.zeme !== undefined) params.set("zeme", String(filters.zeme));
  if (filters?.refresh) params.set("refresh", "true");
  const qs = params.toString();
  const res = await fetch(`${API_URL}/api/admin/alexandria/tours${qs ? `?${qs}` : ""}`, {
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Failed to fetch Alexandria tours");
  }
  return res.json();
}

export async function importAlexandria(options?: {
  zeme?: number;
  dryRun?: boolean;
  ids?: string[];
}) {
  const res = await fetch(`${API_URL}/api/admin/alexandria/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(options ?? {}),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Alexandria import failed");
  }
  return res.json() as Promise<{
    ok: boolean;
    created?: number;
    updated?: number;
    total?: number;
    dryRun?: boolean;
    message?: string;
  }>;
}

export async function refreshAlexandriaCache() {
  const res = await fetch(`${API_URL}/api/admin/alexandria/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to refresh cache");
  return res.json();
}

export async function previewAlexandria(zeme?: number): Promise<Record<string, unknown>> {
  const params = zeme !== undefined ? `?zeme=${zeme}` : "";
  const res = await fetch(`${API_URL}/api/admin/alexandria/preview/json${params}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch Alexandria preview");
  return res.json();
}
