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

    // Honest aggregations — we do not have web-analytics visits; do not fabricate them.
    const [
      inquiries,
      inquiriesConsented,
      totalTours,
      totalProviderTours,
      topDestRow,
      destBreakdown,
      perDestination,
    ] = await Promise.all([
      prisma.lead.count({ where: { createdAt: { gte: since } } }),
      prisma.lead.count({ where: { createdAt: { gte: since }, marketingConsent: true } }),
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

    const totalOffers = totalTours + totalProviderTours;
    const consentRate = inquiries > 0 ? (inquiriesConsented / inquiries) * 100 : 0;
    const topDestination = topDestRow[0]?.destination ?? "—";

    const destinationBreakdown = destBreakdown.map((d) => ({
      label: d.destination ?? "—",
      value: d._count.id,
    }));

    const leadDaily = await prisma.$queryRawUnsafe<{ day: string; count: bigint }[]>(
      "SELECT DATE(`createdAt`) AS day, COUNT(*) AS count FROM `Lead` WHERE `createdAt` >= ? GROUP BY DATE(`createdAt`) ORDER BY day ASC",
      since,
    );

    const lMap = new Map<string, number>();
    for (const r of leadDaily) {
      const dayVal = r.day as unknown;
      const d =
        dayVal instanceof Date ? dayVal.toISOString().slice(0, 10) : String(dayVal).slice(0, 10);
      lMap.set(d, Number(r.count));
    }

    const inquiriesTrend: { label: string; value: number }[] = [];

    // DST-safe day iteration
    for (let i = 0; i < days; i++) {
      const day = new Date(since);
      day.setDate(since.getDate() + i);
      const key = day.toISOString().slice(0, 10);
      const label = day.toLocaleDateString("cs-CZ", { day: "numeric", month: "short" });
      inquiriesTrend.push({ label, value: lMap.get(key) ?? 0 });
    }

    let displayTrend = inquiriesTrend;
    let trendGranularity: "day" | "month" = "day";
    if (period === "year") {
      const monthly = new Map<string, number>();
      const monthLabels: string[] = [];
      const monthKeys: string[] = [];
      for (let m = 0; m < 12; m++) {
        const d = new Date(since);
        d.setMonth(since.getMonth() + m);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthKeys.push(key);
        monthLabels.push(d.toLocaleDateString("cs-CZ", { month: "short", year: "2-digit" }));
        monthly.set(key, 0);
      }
      for (const [dayKey, cnt] of lMap.entries()) {
        const mk = dayKey.slice(0, 7);
        if (monthly.has(mk)) monthly.set(mk, (monthly.get(mk) ?? 0) + cnt);
      }
      displayTrend = monthKeys.map((k, idx) => ({
        label: monthLabels[idx],
        value: monthly.get(k) ?? 0,
      }));
      trendGranularity = "month";
    }

    success(res, {
      inquiries,
      inquiriesConsented,
      consentRate: Math.round(consentRate * 100) / 100,
      totalOffers,
      topDestination,
      inquiriesTrend: displayTrend,
      trendGranularity,
      // Deprecated aliases — kept for older clients, do not use for new UI
      totalVisits: totalOffers,
      conversionRate: Math.round(consentRate * 100) / 100,
      visitsTrend: displayTrend,
      channels: [] as { label: string; pct: number }[],
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
