import { Router } from "express";
import prisma from "../prisma.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { success } from "../lib/response.js";

export const SITE_SETTINGS_KEYS = ["leadPopupEnabled"] as const;
export type SiteSettingKey = (typeof SITE_SETTINGS_KEYS)[number];

export async function getSiteSetting(key: SiteSettingKey, fallback: string): Promise<string> {
  const row = await prisma.siteSetting.findUnique({ where: { key } });
  return row?.value ?? fallback;
}

const publicRouter = Router();
publicRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const enabled = await getSiteSetting("leadPopupEnabled", "true");
    success(res, { leadPopupEnabled: enabled === "true" });
  }),
);

const adminRouter = Router();
adminRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const enabled = await getSiteSetting("leadPopupEnabled", "true");
    success(res, { leadPopupEnabled: enabled === "true" });
  }),
);
adminRouter.put(
  "/",
  asyncHandler(async (req, res) => {
    const raw = req.body?.leadPopupEnabled;
    const enabled = raw === true || raw === "true" || raw === 1 || raw === "1";
    // Accept only boolean-like
    await prisma.siteSetting.upsert({
      where: { key: "leadPopupEnabled" },
      update: { value: enabled ? "true" : "false" },
      create: { key: "leadPopupEnabled", value: enabled ? "true" : "false" },
    });
    success(res, { leadPopupEnabled: enabled });
  }),
);

export { publicRouter as siteSettingsPublicRouter, adminRouter as siteSettingsAdminRouter };
