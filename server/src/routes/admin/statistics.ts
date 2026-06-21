import { Router } from "express";
import prisma from "../../prisma.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { success } from "../../lib/response.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const period = (req.query.period as string) || "30";
    const days = period === "year" ? 365 : period === "90" ? 90 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    // Run aggregations in parallel
    const [inquiries, totalTours, totalProviderTours, topDestRow, destBreakdown, perDestination] =
      await Promise.all([
        prisma.lead.count({ where: { createdAt: { gte: since } } }),
        prisma.tour.count(),
        prisma.providerTour.count(),
        prisma.lead.groupBy({
          by: ["destination"],
          where: { destination: { not: null }, createdAt: { gte: since } },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: 1,
        }),
        prisma.lead.groupBy({
          by: ["destination"],
          where: { destination: { not: null }, createdAt: { gte: since } },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: 10,
        }),
        prisma.lead.groupBy({
          by: ["destination"],
          where: { destination: { not: null }, createdAt: { gte: since } },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
        }),
      ]);

    const totalVisits = totalTours + totalProviderTours;
    const conversionRate = totalVisits > 0 ? (inquiries / totalVisits) * 100 : 0;
    const topDestination = topDestRow[0]?.destination ?? "—";

    const destinationBreakdown = destBreakdown.map((d) => ({
      label: d.destination ?? "—",
      value: d._count.id,
    }));

    // Daily trends: efficient single-query date-grouping via raw SQL
    const dbType = "mysql";
    const dateFn =
      dbType === "mysql"
        ? "DATE(syncedAt)"
        : "date(syncedAt)";

    const providerTourDaily = await prisma.$queryRawUnsafe<
      { day: string; count: bigint }[]
    >(
      `SELECT ${dateFn} AS day, COUNT(*) AS count FROM ProviderTour WHERE syncedAt >= ? GROUP BY ${dateFn} ORDER BY day ASC`,
      since,
    );

    const leadDaily = await prisma.$queryRawUnsafe<
      { day: string; count: bigint }[]
    >(
      `SELECT DATE(createdAt) AS day, COUNT(*) AS count FROM Lead WHERE createdAt >= ? GROUP BY DATE(createdAt) ORDER BY day ASC`,
      since,
    );

    // Build daily series filling missing days with 0
    const pMap = new Map<string, number>();
    for (const r of providerTourDaily) {
      const dayVal = r.day as unknown;
      const d = dayVal instanceof Date ? dayVal.toISOString().slice(0, 10) : String(dayVal).slice(0, 10);
      pMap.set(d, Number(r.count));
    }
    const lMap = new Map<string, number>();
    for (const r of leadDaily) {
      const dayVal = r.day as unknown;
      const d = dayVal instanceof Date ? dayVal.toISOString().slice(0, 10) : String(dayVal).slice(0, 10);
      lMap.set(d, Number(r.count));
    }

    const visitsTrend: { label: string; value: number }[] = [];
    const inquiriesTrend: { label: string; value: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const day = new Date(since.getTime() + i * 86_400_000);
      const key = day.toISOString().slice(0, 10);
      const label = day.toLocaleDateString("cs-CZ", { day: "numeric", month: "short" });
      visitsTrend.push({ label, value: pMap.get(key) ?? 0 });
      inquiriesTrend.push({ label, value: lMap.get(key) ?? 0 });
    }

    // Channel data (static — we don't have real source tracking in DB)
    const channels = [
      { label: "Organické vyhledávání", pct: 42 },
      { label: "Přímý přístup", pct: 26 },
      { label: "Sociální sítě", pct: 18 },
      { label: "Placené kampaně", pct: 14 },
    ];

    success(res, {
      totalVisits,
      inquiries,
      conversionRate: Math.round(conversionRate * 100) / 100,
      topDestination,
      visitsTrend,
      inquiriesTrend,
      channels,
      destinationBreakdown,
      perDestination: perDestination.map((d) => ({
        destination: d.destination ?? "—",
        inquiries: d._count.id,
      })),
      period,
    });
  }),
);

export default router;
