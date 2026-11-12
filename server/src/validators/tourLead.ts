import { z } from "zod";

const shortText = (max: number) => z.string().trim().max(max);
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
  .optional();

const utmValue = shortText(120).optional();

/** Lead form on the public pages (destination, dates, people, budget, contact). */
export const tourLeadSchema = z
  .object({
    destination: shortText(120).optional(),
    dateFrom: isoDate,
    dateTo: isoDate,
    adults: z.number().int().min(1).max(20).default(2),
    children: z.number().int().min(0).max(10).default(0),
    budget: shortText(40).optional(),
    contactMethod: z.enum(["telegram", "phone", "email"]),
    contact: shortText(120).min(3, "Contact is required"),
    name: shortText(80).optional(),
    message: shortText(1000).optional(),
    gdprConsent: z.literal(true, { message: "GDPR consent is required" }),
    lang: z.enum(["cs", "ru"]).default("cs"),
    pagePath: shortText(300).optional(),
    utm: z
      .object({
        utm_source: utmValue,
        utm_medium: utmValue,
        utm_campaign: utmValue,
        utm_content: utmValue,
        utm_term: utmValue,
        landingPage: shortText(300).optional(),
        referrer: shortText(300).optional(),
      })
      .optional(),
    /** Honeypot: real visitors never fill this. */
    website: z.string().max(200).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.contactMethod === "email" && !z.email().safeParse(value.contact).success) {
      ctx.addIssue({ code: "custom", path: ["contact"], message: "Invalid email address" });
    }
    if (value.contactMethod === "phone" && !/^[+\d][\d\s().-]{5,}$/.test(value.contact)) {
      ctx.addIssue({ code: "custom", path: ["contact"], message: "Invalid phone number" });
    }
  });

export type TourLead = z.infer<typeof tourLeadSchema>;
