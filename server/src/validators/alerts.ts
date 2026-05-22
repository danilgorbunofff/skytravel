import { z } from "zod";

export const createAlertSchema = z.object({
  email: z.string().email("Invalid email address"),
  providerId: z.string().min(1, "Provider ID is required"),
  externalId: z.string().min(1, "External tour ID is required"),
  priceMax: z.number().positive("Price must be positive"),
  destination: z.string().optional(),
  tourTitle: z.string().optional(),
});
