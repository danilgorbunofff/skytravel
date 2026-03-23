import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import multer from "multer";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import prisma from "../prisma";

const router = Router();
const uploadDir = path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "-").toLowerCase();
    const name = `${base}-${Date.now()}${ext || ".jpg"}`;
    cb(null, name);
  },
});

const upload = multer({ storage });

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM;

const transporter =
  smtpHost && smtpUser && smtpPass
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      })
    : null;

router.post("/login", async (req, res) => {
  const { login, password } = req.body ?? {};
  if (!login || !password) {
    return res.status(400).json({ error: "Missing credentials." });
  }
  const loginValue = String(login);
  const passwordValue = String(password);
  const envLogin = process.env.ADMIN_LOGIN;
  const envPassword = process.env.ADMIN_PASSWORD;
  let user = await prisma.adminUser.findUnique({ where: { login: loginValue } });

  if (!user) {
    if (envLogin && envPassword && loginValue === envLogin && passwordValue === envPassword) {
      const passwordHash = await bcrypt.hash(passwordValue, 12);
      user = await prisma.adminUser.create({ data: { login: loginValue, passwordHash } });
    } else {
      return res.status(401).json({ error: "Invalid credentials." });
    }
  } else {
    const ok = await bcrypt.compare(passwordValue, user.passwordHash);
    if (!ok) {
      if (envLogin && envPassword && loginValue === envLogin && passwordValue === envPassword) {
        const passwordHash = await bcrypt.hash(passwordValue, 12);
        user = await prisma.adminUser.update({
          where: { id: user.id },
          data: { passwordHash },
        });
      } else {
        return res.status(401).json({ error: "Invalid credentials." });
      }
    }
  }

  req.session.adminUserId = user.id;
  req.session.adminLogin = user.login;
  return res.json({ ok: true, login: user.login });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.status(204).send();
  });
});

router.get("/me", (req, res) => {
  if (!req.session.adminUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return res.json({ ok: true, login: req.session.adminLogin });
});

router.use((req, res, next) => {
  if (!req.session.adminUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
});

router.get("/tours", async (_req, res) => {
  const tours = await prisma.tour.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  res.json({ items: tours });
});

router.post("/uploads", upload.array("images", 8), (req, res) => {
  const files = (req.files || []) as Express.Multer.File[];
  const urls = files.map((file) => `/uploads/${file.filename}`);
  res.json({ urls });
});

router.post("/tours", async (req, res) => {
  const { destination, title, price, image, description, photos, startDate, endDate, transport, i18n } =
    req.body ?? {};

  if (!destination || !title || !price || !image || !startDate || !endDate || !transport) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return res.status(400).json({ error: "Invalid date range." });
  }

  const created = await prisma.tour.create({
    data: {
      destination: String(destination),
      title: String(title),
      price: Number(price),
      image: String(image),
      description: description ? String(description) : null,
      photos: photos ?? null,
      startDate: start,
      endDate: end,
      transport: String(transport),
      i18n: i18n ?? null,
      sortOrder: await prisma.tour.count(),
    },
  });

  res.status(201).json({ item: created });
});

router.put("/tours/order", async (req, res) => {
  console.log("order payload", { body: req.body, query: req.query });
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const idsFromBody = body?.ids ?? body;
  const idsFromQuery =
    typeof req.query.ids === "string" ? req.query.ids.split(",") : [];
  const rawIds = Array.isArray(idsFromBody)
    ? idsFromBody
    : Array.isArray(idsFromQuery) && idsFromQuery.length > 0
      ? idsFromQuery
      : [];
  const numericIds = rawIds
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id));
  if (numericIds.length === 0) {
    return res.status(400).json({ error: "Invalid ids." });
  }
  const updates = numericIds.map((id, index) =>
    prisma.tour.update({
      where: { id },
      data: { sortOrder: index },
    })
  );
  await prisma.$transaction(updates);
  res.json({ ok: true });
});

router.put("/tours/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid id." });
  }

  const { destination, title, price, image, description, photos, startDate, endDate, transport, i18n } =
    req.body ?? {};

  const start = startDate ? new Date(startDate) : undefined;
  const end = endDate ? new Date(endDate) : undefined;
  if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) {
    return res.status(400).json({ error: "Invalid date range." });
  }

  const updated = await prisma.tour.update({
    where: { id },
    data: {
      destination: destination ? String(destination) : undefined,
      title: title ? String(title) : undefined,
      price: price !== undefined ? Number(price) : undefined,
      image: image ? String(image) : undefined,
      description: description === undefined ? undefined : description ? String(description) : null,
      photos: photos === undefined ? undefined : photos,
      startDate: start ?? undefined,
      endDate: end ?? undefined,
      transport: transport ? String(transport) : undefined,
      i18n: i18n === undefined ? undefined : i18n,
    },
  });

  res.json({ item: updated });
});

router.delete("/tours/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid id." });
  }

  await prisma.tour.delete({ where: { id } });
  res.status(204).send();
});

router.get("/leads", async (req, res) => {
  const segment = String(req.query.segment ?? "all");
  const where =
    segment === "consented"
      ? { marketingConsent: true }
      : segment === "pending"
        ? { marketingConsent: false }
        : {};
  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  res.json({ items: leads });
});

router.delete("/leads/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid id." });
  }
  await prisma.lead.delete({ where: { id } });
  res.status(204).send();
});

router.post("/campaigns/send", async (req, res) => {
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
      error:
        "SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS in server/.env.",
    });
  }

  const fromValue = String(fromEmail || smtpFrom || smtpUser || "").trim();
  if (!fromValue) {
    return res.status(400).json({ error: "Missing from email." });
  }

  await transporter.sendMail({
    from: fromValue,
    to: fromValue,
    bcc: leads.map((lead: { email: string }) => lead.email),
    subject: subjectValue,
    html: htmlValue,
    headers: preheader
      ? {
          "X-Preheader": String(preheader),
        }
      : undefined,
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
});

router.post("/campaigns/test", async (req, res) => {
  const { subject, preheader, fromEmail, html, testEmail } = req.body ?? {};
  const subjectValue = String(subject ?? "").trim();
  const htmlValue = String(html ?? "").trim();
  const testEmailValue = String(testEmail ?? "").trim();

  if (!subjectValue || !htmlValue || !testEmailValue) {
    return res.status(400).json({ error: "Missing subject, html or test email." });
  }

  if (!transporter) {
    return res.status(400).json({
      error:
        "SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS in server/.env.",
    });
  }

  const fromValue = String(fromEmail || smtpFrom || smtpUser || "").trim();
  if (!fromValue) {
    return res.status(400).json({ error: "Missing from email." });
  }

  await transporter.sendMail({
    from: fromValue,
    to: testEmailValue,
    subject: subjectValue,
    html: htmlValue,
    headers: preheader
      ? {
          "X-Preheader": String(preheader),
        }
      : undefined,
  });

  res.json({ ok: true });
});

export default router;
