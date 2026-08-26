import type express from "express";
import { Bot, InlineKeyboard, webhookCallback, type Context } from "grammy";
import { channelLink, config } from "../config.js";
import { resolveLang, type Lang } from "../i18n/index.js";
import prisma from "../prisma.js";
import { logger } from "../logger.js";
import { isSubscribed } from "./subscribe.js";
import {
  startQuiz,
  handleQuizAnswer,
  handleIntentButton,
  handleQuizBack,
  handleWishesText,
  sendQuestion,
} from "./quiz.js";
import {
  welcome,
  welcomeBack,
  helpText,
  fallbackText,
  stoppedText,
  gateText,
  gateFailText,
  guidePinText,
  hotToursText,
  reviewThanksText,
  menuTitleText,
  langPickText,
  langSetText,
  checkingMembershipText,
  menuLabels,
  buttons,
  requestsHeader,
  requestsEmptyText,
  moreRequestsText,
  wishesSummaryPrefix,
  directionLabel,
  travelMonthLabel,
  durationLabel,
  partySummary,
  budgetLabel,
  escapeHtml,
} from "./texts.js";
import { show } from "./ui.js";
import { forwardReview, forwardPhotoToOwner } from "./notify.js";

export const bot = new Bot(config.telegram.token);

bot.api.config.use(async (prev, method, payload, signal) => {
  if (
    (method === "sendMessage" || method === "editMessageText") &&
    payload &&
    typeof payload === "object" &&
    !("parse_mode" in payload)
  ) {
    (payload as { parse_mode?: string }).parse_mode = "HTML";
  }
  return prev(method, payload, signal);
});

bot.use(async (ctx, next) => {
  if (ctx.chat && ctx.chat.type !== "private") return;
  await next();
});

function menuKeyboard(lang: Lang): InlineKeyboard {
  const m = menuLabels(lang);
  const b = buttons(lang);
  const kb = new InlineKeyboard();
  kb.text(m.hot, "menu:hot").row();
  kb.text(m.select, "menu:select").row();
  kb.text(m.guide, "menu:guide").text(b.requests, "menu:requests").row();
  kb.text(b.langSwitch, "menu:lang").row();
  kb.url(b.group, channelLink());
  return kb;
}

function langKeyboard(lang: Lang): InlineKeyboard {
  return new InlineKeyboard()
    .text("\u{1F1F7}\u{1F1FA} Русский", "setlang:ru")
    .row()
    .text("\u{1F1FA}\u{1F1E6} Українська", "setlang:uk")
    .row()
    .text(buttons(lang).menuBack, "menu:back");
}

function gateKeyboard(lang: Lang, branch: string): InlineKeyboard {
  const b = buttons(lang);
  return new InlineKeyboard()
    .url(b.joinGroup, channelLink())
    .row()
    .text(b.iJoined, `verify:${branch}`)
    .row()
    .text(b.menuBack, "menu:back");
}

async function safeAnswer(ctx: Context, text?: string): Promise<void> {
  try {
    await ctx.answerCallbackQuery(text ? { text } : undefined);
  } catch {
    logger.debug("callback answer failed (stale or simulated)");
  }
}

async function upsertLead(
  ctx: Context,
  branch: string,
  source: string,
  updateBranch = true,
): Promise<void> {
  if (!ctx.from) return;
  try {
    await prisma.botLead.upsert({
      where: { telegramId: String(ctx.from.id) },
      create: {
        telegramId: String(ctx.from.id),
        username: ctx.from.username ?? null,
        displayName: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ") || null,
        lang: ctx.from.language_code?.startsWith("uk") ? "uk" : "ru",
        source,
        branch,
      },
      update: updateBranch ? { branch } : {},
    });
  } catch (e) {
    logger.error(e, "failed to upsert lead");
  }
}

async function userLang(ctx: Context): Promise<Lang> {
  if (!ctx.from) return "ru";
  const row = await prisma.botLead.findUnique({
    where: { telegramId: String(ctx.from.id) },
    select: { lang: true },
  });
  if (row?.lang === "uk" || row?.lang === "ru") return row.lang;
  return ctx.from.language_code?.startsWith("uk") ? "uk" : "ru";
}

async function requireSubscription(
  ctx: Context,
  branch: string,
  action: (c: Context) => Promise<void>,
): Promise<void> {
  if (!ctx.from) return;
  const status = await isSubscribed(ctx.api, config.telegram.channelId, ctx.from.id);
  if (status === true || status === null) {
    if (status === null) {
      logger.warn("cannot verify membership (bot not admin of group?)");
    }
    await action(ctx);
    return;
  }
  const lang = await userLang(ctx);
  await show(ctx, gateText(lang), gateKeyboard(lang, branch));
}

async function handleGuideRequest(ctx: Context, source: string): Promise<void> {
  await upsertLead(ctx, "guide", source);
  await requireSubscription(ctx, "guide", async (c) => {
    const lang = await userLang(c);
    const b = buttons(lang);
    await show(
      c,
      guidePinText(lang, channelLink()),
      new InlineKeyboard().url(b.openGroup, channelLink()).row().text(b.menuBack, "menu:back"),
    );
  });
}

async function handleHotRequest(ctx: Context, source: string): Promise<void> {
  await upsertLead(ctx, "hot", source);
  await requireSubscription(ctx, "hot", async (c) => {
    const lang = await userLang(c);
    const b = buttons(lang);
    await show(
      c,
      hotToursText(lang),
      new InlineKeyboard()
        .url(b.openGroup, channelLink())
        .row()
        .text(b.pickForMe, "menu:select")
        .row()
        .text(b.menuBack, "menu:back"),
    );
  });
}

bot.command("start", async (ctx) => {
  if (!ctx.from) return;
  const payload = (ctx.match ?? "").trim();
  const existing = await prisma.botLead.findUnique({
    where: { telegramId: String(ctx.from.id) },
  });

  await upsertLead(
    ctx,
    branchFromPayload(payload),
    payload ? "deep_link" : "direct",
    Boolean(payload),
  );
  if (existing?.unsubscribed) {
    await prisma.botLead.update({
      where: { telegramId: String(ctx.from.id) },
      data: { unsubscribed: false },
    });
  }

  const lang =
    existing?.lang === "uk" || existing?.lang === "ru"
      ? existing.lang
      : resolveLang(ctx.from.language_code);
  const firstName = ctx.from.first_name ?? "друг";

  switch (payload) {
    case "guide":
      await handleGuideRequest(ctx, "deep_link");
      return;
    case "hot":
      await handleHotRequest(ctx, "deep_link");
      return;
    case "select":
      await startQuiz(ctx, "deep_link");
      return;
    default: {
      const greeting = existing ? welcomeBack(lang, firstName) : welcome(lang, firstName);
      await show(ctx, greeting, menuKeyboard(lang));
    }
  }
});

function branchFromPayload(payload: string): string {
  if (payload === "guide") return "guide";
  if (payload === "hot") return "hot";
  if (payload === "select") return "select";
  return "guide";
}

bot.command("help", async (ctx) => {
  const lang = await userLang(ctx);
  await show(ctx, helpText(lang), menuKeyboard(lang));
});

bot.command("stop", async (ctx) => {
  if (!ctx.from) return;
  await prisma.botLead.updateMany({
    where: { telegramId: String(ctx.from.id) },
    data: { unsubscribed: true },
  });
  await show(ctx, stoppedText(await userLang(ctx)));
});

bot.command("language", async (ctx) => {
  const lang = await userLang(ctx);
  await show(ctx, langPickText(lang), langKeyboard(lang));
});

bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;

  if (data.startsWith("q:")) {
    await handleQuizAnswer(ctx);
    return;
  }

  if (data.startsWith("qback:")) {
    await handleQuizBack(ctx, Number(data.slice(6)));
    return;
  }

  if (data.startsWith("setlang:")) {
    const lang = data.slice("setlang:".length) === "uk" ? "uk" : "ru";
    if (ctx.from) {
      const telegramId = String(ctx.from.id);
      await prisma.botLead.upsert({
        where: { telegramId },
        create: {
          telegramId,
          username: ctx.from.username ?? null,
          displayName: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ") || null,
          lang,
          branch: "guide",
          source: "direct",
        },
        update: { lang },
      });
      await prisma.quizSession.updateMany({
        where: { chatId: telegramId },
        data: { lang },
      });
    }
    await safeAnswer(ctx);

    const quizRow = ctx.chat
      ? await prisma.quizSession
          .findUnique({ where: { chatId: String(ctx.chat.id) } })
          .catch(() => null)
      : null;
    if (quizRow) {
      await sendQuestion(ctx, {
        id: quizRow.id,
        step: quizRow.step,
        direction: quizRow.direction,
        travelMonth: quizRow.travelMonth,
        duration: quizRow.duration,
        adults: quizRow.adults,
        hasChildren: quizRow.hasChildren,
        childCount: quizRow.childCount,
        childAges: quizRow.childAges,
        budget: quizRow.budget,
        wishes: quizRow.wishes,
        source: quizRow.source,
        lang,
      });
      return;
    }

    await show(ctx, langSetText(lang), menuKeyboard(lang));
    return;
  }

  if (data === "menu:back" || data === "quiz:quit") {
    if (data === "quiz:quit" && ctx.chat) {
      await prisma.quizSession
        .delete({ where: { chatId: String(ctx.chat.id) } })
        .catch(() => undefined);
    }
    await safeAnswer(ctx);
    const lang = await userLang(ctx);
    await show(ctx, menuTitleText(lang), menuKeyboard(lang));
    return;
  }

  if (data === "menu:lang") {
    await safeAnswer(ctx);
    const lang = await userLang(ctx);
    await show(ctx, langPickText(lang), langKeyboard(lang));
    return;
  }

  if (data === "menu:requests") {
    await safeAnswer(ctx);
    await showRequests(ctx);
    return;
  }

  if (data === "lead:dates") {
    await handleIntentButton(ctx, "просит ускорить подбор");
    return;
  }

  if (data.startsWith("fu:")) {
    const intents: Record<string, string> = {
      overview: "просит обзор отелей по подборке",
      photos: "просит фотоотчёт из поездки",
      fixprice: "хочет зафиксировать цену тура",
      refresh: "просит свежую подборку",
    };
    await handleIntentButton(ctx, intents[data.slice(3)] ?? data);
    return;
  }

  if (data === "menu:guide") {
    await safeAnswer(ctx);
    await handleGuideRequest(ctx, "direct");
    return;
  }

  if (data === "menu:hot") {
    await safeAnswer(ctx);
    await handleHotRequest(ctx, "direct");
    return;
  }

  if (data === "menu:select") {
    await safeAnswer(ctx);
    await startQuiz(ctx, "direct");
    return;
  }

  if (data.startsWith("verify:")) {
    const lang = await userLang(ctx);
    await safeAnswer(ctx, checkingMembershipText(lang));
    const target = data.slice("verify:".length);
    const joined = await isSubscribed(ctx.api, config.telegram.channelId, ctx.from?.id ?? 0);
    if (joined !== false) {
      if (target === "guide") await handleGuideRequest(ctx, "direct");
      if (target === "hot") await handleHotRequest(ctx, "direct");
      if (target === "select") await startQuiz(ctx, "direct");
      return;
    }
    await show(ctx, gateFailText(lang), gateKeyboard(lang, target));
    return;
  }

  await safeAnswer(ctx);
});

async function showRequests(ctx: Context): Promise<void> {
  if (!ctx.chat) return;
  const chatId = String(ctx.chat.id);
  const lang = await userLang(ctx);
  const requests = await prisma.botRequest.findMany({
    where: { telegramId: chatId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const total = await prisma.botRequest.count({ where: { telegramId: chatId } });

  if (requests.length === 0) {
    await show(
      ctx,
      `${requestsHeader(lang)}\n\n${requestsEmptyText(lang)}`,
      new InlineKeyboard()
        .text(buttons(lang).pickForMe, "menu:select")
        .row()
        .text(buttons(lang).menuBack, "menu:back"),
    );
    return;
  }

  const lines = requests.map((r, i) => {
    const date = r.createdAt.toLocaleDateString(lang === "uk" ? "uk-UA" : "ru-RU");
    const L = {
      where: lang === "uk" ? "Куди" : "Куда",
      when: lang === "uk" ? "Коли" : "Когда",
      howLong: lang === "uk" ? "Надовго" : "На как долго",
      party: lang === "uk" ? "Склад" : "Состав",
      budget: lang === "uk" ? "Бюджет" : "Бюджет",
    };
    const bullets = [
      `• ${L.where}: ${directionLabel(lang, r.direction)} · ${L.when}: ${travelMonthLabel(lang, r.travelMonth)}`,
      `• ${L.howLong}: ${durationLabel(lang, r.duration)}`,
      `• ${L.party}: ${partySummary(lang, r.adults, r.children, r.childAges)}`,
      `• ${L.budget}: ${budgetLabel(lang, r.budget)}`,
    ];
    if (r.wishes) bullets.push(`• ${wishesSummaryPrefix(lang)}: ${truncateWishes(r.wishes)}`);
    return `<b>${i + 1}) ${date}</b>\n${bullets.join("\n")}`;
  });

  let body = lines.join("\n\n");
  if (total > requests.length) {
    body += `\n\n${moreRequestsText(lang, total - requests.length)}`;
  }

  await show(
    ctx,
    `${requestsHeader(lang)}\n\n${body}`,
    new InlineKeyboard()
      .text(buttons(lang).pickForMe, "menu:select")
      .row()
      .text(buttons(lang).menuBack, "menu:back"),
  );
}

function truncateWishes(wishes: string): string {
  const clean = wishes.replace(/\s+/g, " ").trim();
  const max = 60;
  const shown = clean.length > max ? `${clean.slice(0, max)}…` : clean;
  return escapeHtml(shown);
}

function sessionFromRow(row: {
  id: number;
  step: number;
  direction: string | null;
  travelMonth: string | null;
  duration: string | null;
  adults: number | null;
  hasChildren: number | null;
  childCount: number | null;
  childAges: string | null;
  budget: string | null;
  wishes: string | null;
  source: string;
  lang: string;
}) {
  return {
    id: row.id,
    step: row.step,
    direction: row.direction,
    travelMonth: row.travelMonth,
    duration: row.duration,
    adults: row.adults,
    hasChildren: row.hasChildren,
    childCount: row.childCount,
    childAges: row.childAges,
    budget: row.budget,
    wishes: row.wishes,
    source: row.source,
    lang: (row.lang === "uk" ? "uk" : "ru") as Lang,
  };
}

function quizWishesCheck(row: {
  step: number;
  direction: string | null;
  travelMonth: string | null;
  duration: string | null;
  adults: number | null;
  hasChildren: number | null;
  childCount: number | null;
  childAges: string | null;
  budget: string | null;
  wishes: string | null;
  source: string;
  lang: string;
}): boolean {
  const flow: Array<string> = ["direction", "travelMonth", "duration", "adults", "hasChildren"];
  if (row.hasChildren === 1) {
    flow.push("childCount");
    if ((row.childCount ?? 1) > 0) {
      flow.push("confirmParty");
      for (let i = 0; i < Math.min(Math.max(row.childCount ?? 1, 1), 4); i++) flow.push("childAge");
    }
  }
  flow.push("budget");
  flow.push("wishes");
  return flow[row.step] === "wishes";
}

async function handleUserMessage(ctx: Context): Promise<void> {
  if (!ctx.chat || ctx.chat.type !== "private") return;
  const chatId = String(ctx.chat.id);

  const quizSession = await prisma.quizSession.findUnique({ where: { chatId } });

  if (quizSession) {
    const flowKey = quizWishesCheck(quizSession);
    if (flowKey && ctx.has("message:text")) {
      await handleWishesText(ctx, ctx.message.text);
      return;
    }
    if (flowKey) {
      await sendQuestion(ctx, sessionFromRow(quizSession));
      return;
    }
    await sendQuestion(ctx, sessionFromRow(quizSession));
    return;
  }

  const lead = await prisma.botLead.findUnique({ where: { telegramId: chatId } });

  if (lead && lead.status === "won") {
    const lang: Lang = lead.lang === "uk" ? "uk" : "ru";
    if (ctx.has("message:photo")) {
      const photos = ctx.message.photo;
      const best = photos[photos.length - 1];
      await forwardPhotoToOwner(lead, best.file_id, ctx.message.caption ?? undefined);
    } else if (ctx.has("message:text")) {
      await forwardReview(lead, "text", ctx.message.text);
    }
    const kb = new InlineKeyboard().text(buttons(lang).menuBack, "menu:back");
    await show(ctx, reviewThanksText(lang), kb);
    return;
  }

  const lang = await userLang(ctx);
  await show(ctx, fallbackText(lang), menuKeyboard(lang));
}

bot.on(["message:text", "message:photo"], async (ctx) => {
  const text = ctx.message.text;
  if (typeof text === "string" && text.startsWith("/")) {
    const lang = await userLang(ctx);
    await show(ctx, helpText(lang), menuKeyboard(lang));
    return;
  }
  await handleUserMessage(ctx);
});

bot.catch((err) => {
  const ctx = err.ctx;
  logger.error(
    { updateId: ctx.update?.update_id, err: err.error },
    "telegram update handling failed",
  );
});

export function telegramWebhook(): (req: express.Request, res: express.Response) => Promise<void> {
  const handler = webhookCallback(bot, "express");
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (e) {
      logger.error(e, "telegram update handling failed (webhook)");
      res.sendStatus(200);
    }
  };
}
