import { z } from "zod";

export const sendCampaignSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  html: z.string().min(1, "HTML body is required"),
  preheader: z.string().optional(),
  fromEmail: z.string().email().optional(),
  segment: z.enum(["consented", "pending", "all"]).optional(),
});

export const testCampaignSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  html: z.string().min(1, "HTML body is required"),
  testEmail: z.string().email("Invalid test email"),
  preheader: z.string().optional(),
});
