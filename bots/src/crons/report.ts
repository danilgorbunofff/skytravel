import cron from "node-cron";
import prisma from "../prisma.js";
import { logger } from "../logger.js";
import { sendToOwner } from "../tg/notify.js";
import { weeklyReportText } from "../tg/texts.js";

export function startReportCron(): void {
  cron.schedule("0 9 * * 1", () => {
    void runWeeklyReport();
  });
  logger.info("weekly report cron scheduled (Monday 09:00)");
}

export async function runWeeklyReport(): Promise<void> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [byBranchRaw, byKeywordRaw, won, newLeads] = await Promise.all([
    prisma.botLead.groupBy({
      by: ["branch"],
      where: { createdAt: { gte: weekAgo } },
      _count: true,
    }),
    prisma.keywordHit.groupBy({
      by: ["keyword"],
      where: { createdAt: { gte: weekAgo } },
      _count: true,
    }),
    prisma.botLead.count({ where: { status: "won", updatedAt: { gte: weekAgo } } }),
    prisma.botLead.count({ where: { createdAt: { gte: weekAgo } } }),
  ]);

  const text = weeklyReportText({
    byBranch: byBranchRaw.map((b) => ({ branch: b.branch, count: b._count })),
    byKeyword: byKeywordRaw.map((k) => ({ keyword: k.keyword, count: k._count })),
    won,
    newLeads,
  });

  await sendToOwner(text);
  logger.info("weekly report sent");
}
