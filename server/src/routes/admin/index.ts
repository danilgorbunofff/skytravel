import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import authRoutes from "./auth.js";
import tourRoutes from "./tours.js";
import uploadRoutes from "./uploads.js";
import leadRoutes from "./leads.js";
import campaignRoutes from "./campaigns.js";
import alexandriaRoutes from "./alexandria.js";

const router = Router();

// Public admin routes (login, logout, me)
router.use(authRoutes);

// All routes below require authentication
router.use(requireAuth);

router.use("/tours", tourRoutes);
router.use("/uploads", uploadRoutes);
router.use("/leads", leadRoutes);
router.use("/campaigns", campaignRoutes);
router.use("/alexandria", alexandriaRoutes);

export default router;
