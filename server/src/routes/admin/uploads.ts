import { Router } from "express";
import { upload } from "../../middleware/upload.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { success } from "../../lib/response.js";

const router = Router();

router.post(
  "/",
  upload.array("images", 8),
  asyncHandler(async (req, res) => {
    const files = (req.files || []) as Express.Multer.File[];
    const urls = files.map((file) => `/uploads/${file.filename}`);
    success(res, { urls });
  }),
);

export default router;
