/**
 * Resilient fetch wrapper with timeout (AbortSignal) and exponential-backoff retry.
 */

export interface FetchRetryOptions extends RequestInit {
  /** Total timeout per attempt in ms (default 15 000). */
  timeout?: number;
  /** Maximum number of attempts (default 3). */
  maxAttempts?: number;
  /** Initial backoff delay in ms, doubled on each retry (default 1000). */
  backoffMs?: number;
}

export async function fetchWithRetry(
  url: string | URL,
  options: FetchRetryOptions = {},
): Promise<Response> {
  const { timeout = 15_000, maxAttempts = 3, backoffMs = 1000, ...fetchInit } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url.toString(), {
        ...fetchInit,
        signal: controller.signal,
      });

      clearTimeout(timer);

      // Retry on 5xx (server errors) or 429 (rate limited)
      if (response.status >= 500 || response.status === 429) {
        lastError = new Error(`HTTP ${response.status} ${response.statusText}`);
        if (attempt < maxAttempts) {
          await delay(backoffMs * 2 ** (attempt - 1));
          continue;
        }
        throw lastError;
      }

      return response;
    } catch (err: unknown) {
      clearTimeout(timer);
      lastError = err;

      // Don't retry on non-retryable errors (4xx will have been returned above)
      const isAbort =
        err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
      const isNetwork = err instanceof TypeError; // fetch network errors

      if (!isAbort && !isNetwork) throw err;
      if (attempt >= maxAttempts) throw lastError;

      await delay(backoffMs * 2 ** (attempt - 1));
    }
  }

  throw lastError;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
