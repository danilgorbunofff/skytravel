import { Router } from "express";
import prisma from "../prisma.js";

const router = Router();

router.get("/sitemap.xml", async (_req, res) => {
  const baseUrl = "https://sky-travel.tours";

  // Try to get destinations, but don't fail if DB unavailable
  let destinationUrls: Array<{ loc: string; priority: number }> = [];
  try {
    const destinations = await prisma.destination.findMany({ select: { czechName: true } });
    destinationUrls = destinations.map((d) => ({
      loc: `${baseUrl}/search?destination=${encodeURIComponent(d.czechName)}`,
      priority: 0.7,
    }));
  } catch {
    // DB may not be available
  }

  const urls = [
    { loc: baseUrl, priority: 1.0, changefreq: "weekly" },
    { loc: `${baseUrl}/search`, priority: 0.8, changefreq: "daily" },
    ...destinationUrls,
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><priority>${u.priority}</priority></url>`).join("\n")}
</urlset>`;

  res.header("Content-Type", "application/xml");
  res.send(xml);
});

export default router;
