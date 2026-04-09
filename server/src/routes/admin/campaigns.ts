import { Router } from "express";
import prisma from "../../prisma.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { transporter, EMAIL_RE } from "../../lib/mail.js";
import { config } from "../../config.js";

const router = Router();

router.post("/send", asyncHandler(async (req, res) => {
  const { subject, preheader, fromEmail, html, segment } = req.body ?? {};
  const subjectValue = String(subject ?? "").trim();
  const htmlValue = String(html ?? "").trim();
  const segmentValue = String(segment ?? "consented");

  if (!subjectValue || !htmlValue) {
    return res.status(400).json({ error: "Missing subject or html." });
  }

  const where =
    segmentValue === "all"
      ? {}
      : segmentValue === "pending"
        ? { marketingConsent: false }
        : { marketingConsent: true };

  const leads = await prisma.lead.findMany({ where });
  if (leads.length === 0) {
    return res.status(400).json({ error: "No recipients." });
  }

  if (!transporter) {
    return res.status(400).json({
      error: "SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS in server/.env.",
    });
  }

  const fromValue = String(fromEmail || config.smtp.from || config.smtp.user || "").trim();
  if (!fromValue || !EMAIL_RE.test(fromValue)) {
    return res.status(400).json({ error: "Missing or invalid from email." });
  }

  await transporter.sendMail({
    from: fromValue,
    to: fromValue,
    bcc: leads.map((lead: { email: string }) => lead.email),
    subject: subjectValue,
    html: htmlValue,
    headers: preheader ? { "X-Preheader": String(preheader) } : undefined,
  });

  const campaign = await prisma.emailCampaign.create({
    data: {
      subject: subjectValue,
      preheader: preheader ? String(preheader) : null,
      fromEmail: fromValue,
      html: htmlValue,
      segment: segmentValue,
      recipientCount: leads.length,
      sentAt: new Date(),
    },
  });

  res.json({ ok: true, campaignId: campaign.id, recipients: leads.length });
}));

router.post("/test", asyncHandler(async (req, res) => {
  const { subject, preheader, fromEmail, html, testEmail } = req.body ?? {};
  const subjectValue = String(subject ?? "").trim();
  const htmlValue = String(html ?? "").trim();
  const testEmailValue = String(testEmail ?? "").trim();

  if (!subjectValue || !htmlValue || !testEmailValue) {
    return res.status(400).json({ error: "Missing subject, html or test email." });
  }

  if (!EMAIL_RE.test(testEmailValue)) {
    return res.status(400).json({ error: "Invalid test email address." });
  }

  if (!transporter) {
    return res.status(400).json({
      error: "SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS in server/.env.",
    });
  }

  const fromValue = String(fromEmail || config.smtp.from || config.smtp.user || "").trim();
  if (!fromValue || !EMAIL_RE.test(fromValue)) {
    return res.status(400).json({ error: "Missing or invalid from email." });
  }

  await transporter.sendMail({
    from: fromValue,
    to: testEmailValue,
    subject: subjectValue,
    html: htmlValue,
    headers: preheader ? { "X-Preheader": String(preheader) } : undefined,
  });

  res.json({ ok: true });
}));

export default router;
