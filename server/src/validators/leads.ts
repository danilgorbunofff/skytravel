import { z } from "zod";

export const createLeadSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
  phone: z.string().optional(),
  tourId: z.union([z.number().finite(), z.string(), z.null()]).optional(),
  destination: z.string().optional(),
  dateStart: z.string().optional(),
  dateEnd: z.string().optional(),
  gdprConsent: z.boolean().optional(),
  marketingConsent: z.boolean().optional(),
  note: z.string().max(2000).optional(),
  source: z.string().optional(),
});
