/**
 * Safely parses a fetch Response as JSON.
 * Validates the Content-Type header and catches JSON parse errors,
 * throwing a user-facing Czech error message instead of a raw
 * "Unexpected token" SyntaxError.
 */
export async function safeParseJSON<T = unknown>(
  res: Response,
  context?: string,
): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";

  // If the server returned HTML (nginx misroute, SPA fallback, etc.),
  // fail fast with a readable message instead of "Unexpected token '<' …"
  if (!contentType.includes("application/json")) {
    throw new Error(
      context
        ? `Server vrátil neočekávanou odpověď (${context}). Zkuste to prosím později.`
        : "Server vrátil neočekávanou odpověď. Zkuste to prosím později.",
    );
  }

  try {
    return (await res.json()) as T;
  } catch {
    // Malformed JSON body (truncated response, proxy errors, etc.)
    throw new Error(
      context
        ? `Nepodařilo se načíst data (${context}). Zkuste to prosím později.`
        : "Nepodařilo se načíst data. Zkuste to prosím později.",
    );
  }
}
