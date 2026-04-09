import { Router } from "express";
import { upload } from "../../middleware/upload.js";

const router = Router();

router.post("/", upload.array("images", 8), (req, res) => {
  const files = (req.files || []) as Express.Multer.File[];
  const urls = files.map((file) => `/uploads/${file.filename}`);
  res.json({ urls });
});

export default router;
