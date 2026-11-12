import { Router } from "express";
import prisma from "../prisma.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateBody } from "../middleware/validate.js";
import { tourLeadSchema, type TourLead } from "../validators/tourLead.js";
import { hashEmail } from "../lib/hash.js";
import { logger } from "../lib/logger.js";
import { sendTelegramLeadMessage, tgEscape } from "../lib/telegram.js";

const router = Router();

const CONTACT_LABEL: Record<TourLead["contactMethod"], string> = {
  telegram: "Telegram",
  phone: "Телефон",
  email: "E-mail",
};

function contactLink(lead: TourLead): string {
  const contact = tgEscape(lead.contact);
  if (lead.contactMethod === "telegram") {
    const username = lead.contact.replace(/^@/, "").replace(/^https?:\/\/t\.me\//, "");
    if (/^[A-Za-z0-9_]{5,32}$/.test(username))
      return `<a href="https://t.me/${username}">@${username}</a>`;
  }
  return contact;
}

/** Builds the Telegram notification text (HTML parse mode). Exported for tests. */
export function formatLeadMessage(lead: TourLead): string {
  const line = (label: string, value: string | number | undefined) =>
    value === undefined || value === ""
      ? null
      : `<b>${label}:</b> ${typeof value === "number" ? value : tgEscape(value)}`;

  const dates =
    lead.dateFrom || lead.dateTo ? `${lead.dateFrom ?? "?"} → ${lead.dateTo ?? "?"}` : undefined;
  const utm = lead.utm ?? {};
  const source = [utm.utm_source, utm.utm_medium, utm.utm_campaign].filter(Boolean).join(" / ");

  return [
    "🧳 <b>Новая заявка с сайта</b>",
    "",
    line("Направление", lead.destination || "любое"),
    line("Даты", dates),
    line("Люди", `${lead.adults} взр.${lead.children ? ` + ${lead.children} дет.` : ""}`),
    line("Бюджет/чел.", lead.budget),
    line("Имя", lead.name),
    `<b>${CONTACT_LABEL[lead.contactMethod]}:</b> ${contactLink(lead)}`,
    line("Комментарий", lead.message),
    "",
    line("Язык", lead.lang.toUpperCase()),
    line("Страница", lead.pagePath),
    line("Источник (UTM)", source || "—"),
    line("utm_content", utm.utm_content),
    line("utm_term", utm.utm_term),
    line("Первый вход", utm.landingPage),
    line("Referrer", utm.referrer),
  ]
    .filter((l): l is string => l !== null)
    .join("\n");
}

router.post(
  "/",
  validateBody(tourLeadSchema),
  asyncHandler(async (req, res) => {
    const lead = req.body as TourLead;

    // Honeypot filled → pretend success, drop silently.
    if (lead.website) {
      logger.warn({ pagePath: lead.pagePath }, "lead dropped: honeypot");
      res.status(201).json({ ok: true });
      return;
    }

    const delivered = await sendTelegramLeadMessage(formatLeadMessage(lead));

    // E-mail contacts also go into the admin "Leads" list.
    let saved = false;
    if (lead.contactMethod === "email") {
      try {
        await prisma.lead.create({
          data: {
            email: lead.contact,
            hashedEmail: hashEmail(lead.contact),
            destination: lead.destination ?? null,
            gdprConsent: true,
            marketingConsent: false,
            source: "lead-form",
          },
        });
        saved = true;
      } catch (err) {
        logger.error({ err }, "lead form: DB save failed");
      }
    }

    if (!delivered) {
      // Keep the lead recoverable from the logs if Telegram is down / not configured.
      logger.error(
        { lead: { ...lead, website: undefined } },
        "lead form: Telegram delivery failed",
      );
    } else {
      logger.info({ pagePath: lead.pagePath, utm: lead.utm?.utm_source }, "lead form: delivered");
    }

    if (!delivered && !saved) {
      res.status(502).json({
        ok: false,
        error: { code: "DELIVERY_FAILED", message: "Lead could not be delivered" },
      });
      return;
    }
    res.status(201).json({ ok: true });
  }),
);

export default router;
