import { z } from "zod";

export const createTourSchema = z.object({
  destination: z.string().min(1, "Destination is required"),
  title: z.string().min(1, "Title is required"),
  price: z.number().positive("Price must be positive"),
  image: z.string().min(1, "Image is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  transport: z.string().min(1, "Transport is required"),
  description: z.string().nullable().optional(),
  stars: z.string().optional(),
  board: z.string().optional(),
  photos: z.array(z.string()).optional(),
  i18nJson: z.record(z.string(), z.unknown()).optional(),
  originalPrice: z.number().optional(),
  url: z.string().optional(),
});

export const updateTourSchema = createTourSchema.partial();

export const reorderToursSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, "At least one ID is required"),
});
