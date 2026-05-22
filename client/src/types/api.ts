/** Standard API envelope returned by the server (Phase 2+). */
export interface ApiSuccessResponse<T = unknown> {
  ok: true;
  data: T;
}

export interface ApiErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/** Extract the data field from a successful API response, or throw on error. */
export function unwrapApiResponse<T>(json: unknown): T {
  const res = json as ApiResponse<T>;
  if (res.ok === false) {
    throw new Error(res.error?.message || "Unknown API error");
  }
  if ("data" in res) return res.data;
  // Backward compat: some endpoints still return raw payload
  return json as T;
}
