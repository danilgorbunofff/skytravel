import crypto from "node:crypto";

/**
 * Normalize and hash an email address with SHA-256.
 *
 * @param email - Raw email address
 * @returns Hex-encoded SHA-256 digest of the lowercased, trimmed input
 * @example
 * hashEmail("Alice@Example.com") // "4f8c...b3c"
 */
export function hashEmail(email: string): string {
  return crypto.createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
}
