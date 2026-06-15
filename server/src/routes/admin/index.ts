import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { getPublicSearchCacheStats } from "../../providers/publicSearchCache.js";
import { success } from "../../lib/response.js";
import authRoutes from "./auth.js";
import tourRoutes from "./tours.js";
import uploadRoutes from "./uploads.js";
import leadRoutes from "./leads.js";
import campaignRoutes from "./campaigns.js";
import providersRoutes from "./providers.js";
import statisticsRoutes from "./statistics.js";
import auditLogRoutes from "./auditLog.js";

const router = Router();

// Public admin routes (login, logout, me)
router.use(authRoutes);

// All routes below require authentication
router.use(requireAuth);

router.use("/providers", providersRoutes);
router.use("/tours", tourRoutes);
router.use("/uploads", uploadRoutes);
router.use("/leads", leadRoutes);
router.use("/campaigns", campaignRoutes);
router.use("/statistics", statisticsRoutes);
router.use("/audit-log", auditLogRoutes);

router.get("/cache-stats", (_req, res) => {
  success(res, getPublicSearchCacheStats());
});

export default router;
