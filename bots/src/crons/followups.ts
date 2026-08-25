import cron from "node-cron";
import { InlineKeyboard } from "grammy";
import prisma from "../prisma.js";
import { logger } from "../logger.js";
import { followUpButton, followUpMessage } from "../tg/texts.js";
import type { Lang } from "../i18n/types.js";

const STAGES = [
  { stage: 3, key: "day3" as const, intent: "overview" as const },
  { stage: 7, key: "day7" as const, intent: "photos" as const },
  { stage: 14, key: "day14" as const, intent: "fixprice" as const },
  { stage: 30, key: "day30" as const, intent: "refresh" as const },
];

export function startFollowUpCron(): void {
  cron.schedule("0 11 * * *", () => {
    void runFollowUps();
  });
  logger.info("follow-up cron scheduled (daily 11:00)");
}

export async function runFollowUps(): Promise<void> {
  const now = Date.now();
  let sent = 0;

  for (const s of [...STAGES].sort((a, b) => b.stage - a.stage)) {
    const olderThan = new Date(now - s.stage * 24 * 60 * 60 * 1000);
    const leads = await prisma.botLead.findMany({
      where: {
        branch: "select",
        status: { in: ["new", "contacted"] },
        unsubscribed: false,
        lastFollowUp: { lt: s.stage },
        createdAt: { lte: olderThan },
      },
      take: 50,
    });

    for (const lead of leads) {
      const lang: Lang = lead.lang === "uk" ? "uk" : "ru";
      try {
        await sendToLead(
          lead.telegramId,
          lang,
          followUpMessage(lang, s.key),
          `fu:${s.intent}`,
          followUpButton(lang, s.intent),
        );
        await prisma.botLead.update({
          where: { id: lead.id },
          data: { lastFollowUp: s.stage },
        });
        sent++;
      } catch (e) {
        if (isBlockedError(e)) {
          await prisma.botLead.update({
            where: { id: lead.id },
            data: { status: "lost" },
          });
          logger.warn({ leadId: lead.id }, "lead blocked the bot, marked lost");
        } else {
          logger.warn(e, `follow-up failed for lead ${lead.id}`);
        }
      }
    }
  }

  if (sent > 0) {
    logger.info({ sent }, "follow-ups processed");
  }
}

function isBlockedError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "error_code" in e &&
    (e as { error_code?: number }).error_code === 403
  );
}

async function sendToLead(
  telegramId: string,
  _lang: Lang,
  text: string,
  callbackData: string,
  buttonLabel: string,
): Promise<void> {
  const kb = new InlineKeyboard().text(buttonLabel, callbackData);
  const { bot } = await import("../tg/bot.js");
  await bot.api.sendMessage(Number(telegramId), text, { reply_markup: kb });
}
