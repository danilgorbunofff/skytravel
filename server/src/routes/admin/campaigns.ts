import { Router } from "express";
import prisma from "../../prisma.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { sendCampaignSchema, testCampaignSchema } from "../../validators/campaigns.js";
import { transporter, EMAIL_RE, sendBatchedEmail } from "../../lib/mail.js";
import { config } from "../../config.js";
import { success, fail } from "../../lib/response.js";
import { logAdminAction } from "../../middleware/auditLog.js";

const router = Router();

router.post(
  "/send",
  validateBody(sendCampaignSchema),
  asyncHandler(async (req, res) => {
    const { subject, preheader, fromEmail, html, segment } = req.body;
    const segmentValue = segment ?? "consented";

    const where =
      segmentValue === "all"
        ? {}
        : segmentValue === "pending"
          ? { marketingConsent: false }
          : { marketingConsent: true };

    const leads = await prisma.lead.findMany({ where, select: { email: true } });
    if (leads.length === 0) {
      fail("NO_RECIPIENTS", "No recipients.", 400);
    }

    if (!transporter) {
      fail(
        "SMTP_NOT_CONFIGURED",
        "SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS in server/.env.",
        400,
      );
    }

    const fromValue = String(fromEmail || config.smtp.from || config.smtp.user || "").trim();
    if (!fromValue || !EMAIL_RE.test(fromValue)) {
      fail("INVALID_FROM", "Missing or invalid from email.", 400);
    }

    await sendBatchedEmail({
      from: fromValue,
      to: fromValue,
      bcc: leads.map((lead) => lead.email),
      subject,
      html,
      headers: preheader ? { "X-Preheader": String(preheader) } : undefined,
    });

    const campaign = await prisma.emailCampaign.create({
      data: {
        subject,
        preheader: preheader ?? null,
        fromEmail: fromValue,
        html,
        segment: segmentValue,
        recipientCount: leads.length,
        sentAt: new Date(),
      },
    });

    await logAdminAction({
      action: "CAMPAIGN_SEND",
      target: `Campaign#${campaign.id}`,
      details: `Sent to ${leads.length} recipients (segment: ${segmentValue})`,
      adminUser: req.session.adminLogin || "unknown",
      ip: req.ip,
    });

    success(res, { campaignId: campaign.id, recipients: leads.length });
  }),
);

router.post(
  "/test",
  validateBody(testCampaignSchema),
  asyncHandler(async (req, res) => {
    const { subject, preheader, html, testEmail } = req.body;

    if (!transporter) {
      fail(
        "SMTP_NOT_CONFIGURED",
        "SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS in server/.env.",
        400,
      );
    }

    const fromValue = String(config.smtp.from || config.smtp.user || "").trim();
    if (!fromValue || !EMAIL_RE.test(fromValue)) {
      fail("INVALID_FROM", "Missing or invalid from email.", 400);
    }

    await transporter.sendMail({
      from: fromValue,
      to: testEmail,
      subject,
      html,
      headers: preheader ? { "X-Preheader": String(preheader) } : undefined,
    });

    success(res, null);
  }),
);

export default router;
