import nodemailer from "nodemailer";
import { config } from "../config.js";

const { smtp } = config;

export const transporter = smtp.isConfigured
  ? nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.pass },
    })
  : null;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Send an email with BCC recipients in batches.
 *
 * @param options - Email options (from, to, bcc, subject, html)
 * @param options.from - Sender address
 * @param options.to - Primary recipient
 * @param options.bcc - Array of BCC recipients
 * @param options.subject - Email subject line
 * @param options.html - HTML body content
 * @param batchSize - Number of BCC recipients per batch (default 50)
 * @throws {Error} If SMTP is not configured
 */
export async function sendBatchedEmail(
  options: {
    from: string;
    to: string;
    bcc: string[];
    subject: string;
    html: string;
    headers?: Record<string, string>;
  },
  batchSize = 50,
): Promise<void> {
  if (!transporter) {
    throw new Error("SMTP not configured");
  }
  const { bcc, ...rest } = options;
  const listUnsub = `<mailto:${options.from}?subject=unsubscribe>`;
  const baseHeaders: Record<string, string> = {
    ...(rest.headers ?? {}),
    "List-Unsubscribe": listUnsub,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
  for (let i = 0; i < bcc.length; i += batchSize) {
    const batch = bcc.slice(i, i + batchSize);
    await transporter.sendMail({ ...rest, headers: baseHeaders, bcc: batch });
  }
}
