import type {
  CacheStatus,
  ImportResult,
  ProviderMeta,
  ProviderRegion,
  ToursResult,
  UnifiedFilters,
  UnifiedTour,
} from "../types/providers";

const API_URL = import.meta.env.VITE_API_URL || "";

// ── helpers ──────────────────────────────────────────────────

function filtersToParams(filters: UnifiedFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of Object.keys(filters)) {
    const val = filters[key];
    if (val === undefined || val === null || val === "") continue;
    params.append(key, String(val));
  }
  return params;
}

async function throwIfNotOk(res: Response): Promise<void> {
  if (res.ok) return;
  const body = await res.json().catch(() => ({}));
  throw new Error(
    (body as Record<string, string>)?.error ||
      `Request failed with status ${res.status}`,
  );
}

// ── API functions ────────────────────────────────────────────

export async function fetchProviders(): Promise<ProviderMeta[]> {
  const res = await fetch(`${API_URL}/api/admin/providers`, {
    credentials: "include",
  });
  await throwIfNotOk(res);
  const data = await res.json();
  return data.providers as ProviderMeta[];
}

export async function fetchProviderRegions(
  providerId: string,
): Promise<ProviderRegion[]> {
  const res = await fetch(
    `${API_URL}/api/admin/providers/${encodeURIComponent(providerId)}/regions`,
    { credentials: "include" },
  );
  await throwIfNotOk(res);
  const data = await res.json();
  return data.items as ProviderRegion[];
}

export async function fetchProviderTours(
  providerId: string,
  filters: UnifiedFilters,
): Promise<ToursResult> {
  const params = filtersToParams(filters);
  const res = await fetch(
    `${API_URL}/api/admin/providers/${encodeURIComponent(providerId)}/tours?${params}`,
    { credentials: "include" },
  );
  await throwIfNotOk(res);
  return res.json() as Promise<ToursResult>;
}

export async function importProviderTours(
  providerId: string,
  ids: string[],
  regionCtx?: Record<string, unknown>,
): Promise<ImportResult> {
  const res = await fetch(
    `${API_URL}/api/admin/providers/${encodeURIComponent(providerId)}/import`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ids, regionCtx: regionCtx ?? {} }),
    },
  );
  await throwIfNotOk(res);
  return res.json() as Promise<ImportResult>;
}

export async function refreshProviderCache(
  providerId: string,
): Promise<void> {
  const res = await fetch(
    `${API_URL}/api/admin/providers/${encodeURIComponent(providerId)}/refresh`,
    { method: "POST", credentials: "include" },
  );
  await throwIfNotOk(res);
}

export async function fetchProviderCacheStatus(
  providerId: string,
): Promise<CacheStatus> {
  const res = await fetch(
    `${API_URL}/api/admin/providers/${encodeURIComponent(providerId)}/cache-status`,
    { credentials: "include" },
  );
  await throwIfNotOk(res);
  return res.json() as Promise<CacheStatus>;
}

// ── SSE streaming ────────────────────────────────────────────

export function streamProviderTours(
  providerId: string,
  filters: UnifiedFilters,
  callbacks: {
    onBatch: (items: UnifiedTour[], loaded: number) => void;
    onDone: (total: number) => void;
    onError: (error: Error) => void;
  },
): () => void {
  const controller = new AbortController();
  const params = filtersToParams(filters);
  const url = `${API_URL}/api/admin/providers/${encodeURIComponent(providerId)}/tours/stream?${params}`;

  (async () => {
    try {
      const res = await fetch(url, {
        credentials: "include",
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as Record<string, string>)?.error ||
            `Stream request failed with status ${res.status}`,
        );
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events (delimited by double newline)
        const parts = buffer.split("\n\n");
        buffer = parts.pop()!; // keep incomplete tail in the buffer

        for (const block of parts) {
          if (!block.trim()) continue;

          let eventType = "message";
          let dataStr = "";

          for (const line of block.split("\n")) {
            if (line.startsWith(":")) continue; // SSE comment
            if (line.startsWith("event:")) {
              eventType = line.slice("event:".length).trim();
            } else if (line.startsWith("data:")) {
              dataStr += line.slice("data:".length).trim();
            }
          }

          if (!dataStr) continue;

          try {
            const payload = JSON.parse(dataStr);
            if (eventType === "batch") {
              callbacks.onBatch(
                payload.items as UnifiedTour[],
                payload.progress?.loaded ?? 0,
              );
            } else if (eventType === "done") {
              callbacks.onDone(payload.total ?? 0);
            }
            // "start" events are intentionally ignored
          } catch {
            // malformed JSON — skip
          }
        }
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return; // normal cleanup
      callbacks.onError(
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  })();

  return () => controller.abort();
}
