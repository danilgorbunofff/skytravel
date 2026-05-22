import { z } from "zod";

export const importToursSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "At least one tour ID is required"),
  regionCtx: z.record(z.string(), z.unknown()).optional(),
});
