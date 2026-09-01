const API_URL = import.meta.env.VITE_API_URL || "";

function readCsrfCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

let minting: Promise<string | null> | null = null;

// Ensures a CSRF token cookie exists. The server only issues XSRF-TOKEN on
// requests that touch a session, so a session-materializing GET may be needed.
export async function ensureCsrfToken(force = false): Promise<string | null> {
  if (!force) {
    const existing = readCsrfCookie();
    if (existing) return existing;
  }
  if (!minting) {
    minting = fetch(`${API_URL}/api/admin/me`, { credentials: "include" })
      .catch(() => null)
      .then(() => readCsrfCookie())
      .finally(() => {
        minting = null;
      });
  }
  return minting;
}

// Fetch wrapper for admin mutations: injects the X-XSRF-TOKEN header and
// retries once with a freshly minted token when the server rejects a stale
// one (e.g. after login regenerates the session).
export async function csrfFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const doFetch = (token: string | null) =>
    fetch(url, {
      ...init,
      credentials: "include",
      headers: {
        ...(init.headers as Record<string, string> | undefined),
        ...(token ? { "X-XSRF-TOKEN": token } : {}),
      },
    });

  let res = await doFetch(await ensureCsrfToken());
  if (res.status === 403) {
    const code = (
      await res
        .clone()
        .json()
        .catch(() => null)
    )?.error?.code;
    if (code === "CSRF_INVALID") {
      res = await doFetch(await ensureCsrfToken(true));
    }
  }
  return res;
}
