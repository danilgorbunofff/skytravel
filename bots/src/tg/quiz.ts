import { InlineKeyboard, type Context } from "grammy";
import prisma from "../prisma.js";
import { logger } from "../logger.js";
import { notifyOwnerIntent, notifyOwnerNewLead } from "./notify.js";
import { channelLink } from "../config.js";
import {
  adultPhrase,
  ageLabel,
  agesReadable,
  backBtnText,
  buttons,
  childAgeQuestionText,
  childPhrase,
  confirmPartyText,
  durationLabel,
  intentSentText,
  menuBackBtnText,
  partySummary,
  quizFinished,
  skipBtnText,
  totalPeoplePhrase,
  travelMonthLabel,
  directionLabel,
  wishesStepText,
} from "./texts.js";
import { show } from "./ui.js";
import type { Lang } from "../i18n/types.js";
import { resolveLang } from "../i18n/index.js";

type QuestionKey =
  | "direction"
  | "travelMonth"
  | "duration"
  | "adults"
  | "hasChildren"
  | "childCount"
  | "confirmParty"
  | "childAge"
  | "budget"
  | "wishes";

type SimpleQuestionKey = Exclude<QuestionKey, "childAge" | "confirmParty" | "wishes">;

interface QuizQuestion {
  text: Record<Lang, string>;
  options: Array<{ code: string; label: Record<Lang, string> }>;
}

const QUESTIONS: Record<SimpleQuestionKey, QuizQuestion> = {
  direction: {
    text: { ru: "Какой отдых предпочитаете?", uk: "Який відпочинок обираєте?" },
    options: [
      { code: "beach", label: { ru: "🏖 Пляж", uk: "🏖 Пляж" } },
      { code: "tours", label: { ru: "🏛 Экскурсии", uk: "🏛 Екскурсії" } },
      { code: "mountains", label: { ru: "⛷ Горы", uk: "⛷ Гори" } },
      { code: "advise", label: { ru: "🤷 Посоветуй", uk: "🤷 Порадь" } },
    ],
  },
  travelMonth: {
    text: { ru: "Когда планируете поездку?", uk: "Коли плануєте поїздку?" },
    options: [
      { code: "month", label: { ru: "📅 В ближайший месяц", uk: "📅 Найближчим часом" } },
      { code: "1-3", label: { ru: "🗓 Через 1–3 месяца", uk: "🗓 Через 1–3 місяці" } },
      { code: "3-6", label: { ru: "🗓 Через 3–6 месяцев", uk: "🗓 Через 3–6 місяців" } },
      { code: "flex", label: { ru: "🌍 Даты гибкие", uk: "🌍 Гнучкі дати" } },
    ],
  },
  duration: {
    text: { ru: "На сколько дней едете?", uk: "На скільки днів їдете?" },
    options: [
      { code: "3-5", label: { ru: "✈️ 3–5 ночей", uk: "✈️ 3–5 ночей" } },
      { code: "7-10", label: { ru: "🛫 7–10 ночей", uk: "🛫 7–10 ночей" } },
      { code: "11-14", label: { ru: "🏖 11–14 ночей", uk: "🏖 11–14 ночей" } },
      { code: "2w+", label: { ru: "🌴 Больше 2 недель", uk: "🌴 Понад 2 тижні" } },
    ],
  },
  adults: {
    text: { ru: "Сколько взрослых едет?", uk: "Скільки дорослих їде?" },
    options: [
      { code: "1", label: { ru: "👤 Один", uk: "👤 Один" } },
      { code: "2", label: { ru: "👥 Двое", uk: "👥 Двоє" } },
      { code: "3", label: { ru: "👨‍👩‍👦 Трое", uk: "👨‍👩‍👦 Троє" } },
      {
        code: "4",
        label: {
          ru: "👨‍👩‍👧‍👦 Четверо или больше",
          uk: "👨‍👩‍👧‍👦 Четверо чи більше",
        },
      },
    ],
  },
  hasChildren: {
    text: { ru: "Дети едут с вами?", uk: "Діти їдуть з вами?" },
    options: [
      { code: "0", label: { ru: "🙅 Нет", uk: "🙅 Ні" } },
      { code: "1", label: { ru: "✅ Да", uk: "✅ Так" } },
    ],
  },
  childCount: {
    text: { ru: "Сколько детей?", uk: "Скільки дітей?" },
    options: [
      { code: "1", label: { ru: "🧒 Один", uk: "🧒 Одна" } },
      { code: "2", label: { ru: "👶 Двое", uk: "👶 Дві" } },
      { code: "3", label: { ru: "👧 Трое", uk: "👧 Три" } },
      {
        code: "4",
        label: {
          ru: "👦👧 Четверо или больше",
          uk: "👦👧 Четверо чи більше",
        },
      },
    ],
  },
  budget: {
    text: { ru: "Бюджет на всех?", uk: "Бюджет на всіх?" },
    options: [
      { code: "<35k", label: { ru: "💰 До 35 000 CZK", uk: "💰 До 35 000 CZK" } },
      { code: "35-45k", label: { ru: "💰 35–45 000 CZK", uk: "💰 35–45 000 CZK" } },
      { code: "45-60k", label: { ru: "💰 45–60 000 CZK", uk: "💰 45–60 000 CZK" } },
      { code: "60k+", label: { ru: "💰 От 60 000 CZK", uk: "💰 Від 60 000 CZK" } },
    ],
  },
};

const CHILDREN_YES = 1;

const AGE_OPTIONS: Array<{ code: string; label: Record<Lang, string> }> = [
  { code: "0-2", label: { ru: "🍼 0–2", uk: "🍼 0–2" } },
  { code: "3-7", label: { ru: "🧒 3–7", uk: "🧒 3–7" } },
  { code: "8-12", label: { ru: "👦 8–12", uk: "👦 8–12" } },
  { code: "13+", label: { ru: "🧑 13+", uk: "🧑 13+" } },
];

interface SessionState {
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
  lang: Lang;
}

function childTotal(s: SessionState): number {
  return Math.min(Math.max(s.childCount ?? 1, 1), 4);
}

function flowFor(s: SessionState): QuestionKey[] {
  const flow: QuestionKey[] = ["direction", "travelMonth", "duration", "adults", "hasChildren"];
  if (s.hasChildren === CHILDREN_YES) {
    flow.push("childCount");
    if ((s.childCount ?? 1) > 0) {
      flow.push("confirmParty");
      for (let i = 0; i < childTotal(s); i++) flow.push("childAge");
    }
  }
  flow.push("budget");
  flow.push("wishes");
  return flow;
}

function currentQuestion(s: SessionState): QuestionKey | null {
  return flowFor(s)[s.step] ?? null;
}

function selectedCodes(s: SessionState): string[] {
  return s.childAges ? s.childAges.split(",") : [];
}

function ageKeyboard(lang: Lang, step: number): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const opt of AGE_OPTIONS) {
    kb.text(opt.label[lang], `q:${step}:${opt.code}`).row();
  }
  return kb;
}

function questionKeyboard(q: QuizQuestion, lang: Lang, step: number): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const opt of q.options) {
    kb.text(opt.label[lang], `q:${step}:${opt.code}`).row();
  }
  return kb;
}

function appendBack(kb: InlineKeyboard, s: SessionState): void {
  if (s.step === 0) {
    kb.text(menuBackBtnText(s.lang), "quiz:quit");
  } else {
    kb.text(backBtnText(s.lang), `qback:${s.step}`);
  }
  kb.row();
}

function quizProgress(s: SessionState): string {
  const parts: string[] = [];
  if (s.direction) parts.push(directionLabel(s.lang, s.direction));
  if (s.travelMonth) parts.push(travelMonthLabel(s.lang, s.travelMonth));
  if (s.duration) parts.push(durationLabel(s.lang, s.duration));
  if (s.adults) parts.push(adultPhrase(s.lang, s.adults));
  if (s.hasChildren === CHILDREN_YES && s.childCount) {
    parts.push(childPhrase(s.lang, s.childCount));
  }
  const codes = selectedCodes(s);
  codes.forEach((code, i) => {
    const label = s.lang === "uk" ? `Вік ${i + 1}:` : `Возраст ${i + 1}:`;
    parts.push(`${label} ${ageLabel(s.lang, code)}`);
  });
  if (parts.length === 0) return "";
  return `✅ ${parts.join(" · ✅ ")}`;
}

function withProgress(s: SessionState, text: string): string {
  const progress = quizProgress(s);
  return progress ? `${progress}\n\n${text}` : text;
}

export async function sendQuestion(ctx: Context, s: SessionState): Promise<void> {
  const key = currentQuestion(s);
  if (!key) return;
  if (key === "childAge") {
    const index = selectedCodes(s).length;
    const kb = ageKeyboard(s.lang, s.step);
    appendBack(kb, s);
    await show(ctx, withProgress(s, childAgeQuestionText(s.lang, index)), kb);
    return;
  }
  if (key === "confirmParty") {
    const summary = partySummary(
      s.lang,
      s.adults,
      s.hasChildren === CHILDREN_YES ? s.childCount : null,
      null,
    );
    const total = totalPeoplePhrase(
      s.lang,
      s.adults,
      s.hasChildren === CHILDREN_YES ? s.childCount : null,
    );
    const kb = questionKeyboard(
      {
        text: { ru: "", uk: "" },
        options: [
          { code: "1", label: { ru: "✅ Всё верно", uk: "✅ Все вірно" } },
          { code: "0", label: { ru: "↩️ Изменить состав", uk: "↩️ Змінити склад" } },
        ],
      },
      s.lang,
      s.step,
    );
    appendBack(kb, s);
    await show(ctx, withProgress(s, confirmPartyText(s.lang, summary, total)), kb);
    return;
  }
  if (key === "wishes") {
    const kb = new InlineKeyboard()
      .text(skipBtnText(s.lang), `q:${s.step}:skip`)
      .row()
      .text(backBtnText(s.lang), `qback:${s.step}`);
    await show(ctx, withProgress(s, wishesStepText(s.lang)), kb);
    return;
  }
  const q = QUESTIONS[key];
  const kb = questionKeyboard(q, s.lang, s.step);
  appendBack(kb, s);
  await show(ctx, withProgress(s, q.text[s.lang]), kb);
}

export async function startQuiz(ctx: Context, source: string): Promise<void> {
  if (!ctx.chat || !ctx.from) return;
  const lead = await prisma.botLead.findUnique({
    where: { telegramId: String(ctx.from.id) },
    select: { lang: true },
  });
  const lang: Lang =
    lead?.lang === "uk" || lead?.lang === "ru" ? lead.lang : resolveLang(ctx.from.language_code);
  await prisma.quizSession.upsert({
    where: { chatId: String(ctx.chat.id) },
    create: { chatId: String(ctx.chat.id), step: 0, source, lang },
    update: {
      step: 0,
      direction: null,
      travelMonth: null,
      duration: null,
      adults: null,
      hasChildren: null,
      childCount: null,
      childAges: null,
      budget: null,
      wishes: null,
      source,
      lang,
    },
  });
  await sendQuestion(ctx, emptySession(source, lang));
}

function emptySession(source: string, lang: Lang): SessionState {
  return {
    id: 0,
    step: 0,
    direction: null,
    travelMonth: null,
    duration: null,
    adults: null,
    hasChildren: null,
    childCount: null,
    childAges: null,
    budget: null,
    wishes: null,
    source,
    lang,
  };
}

async function safeAnswer(ctx: Context, text?: string): Promise<void> {
  try {
    await ctx.answerCallbackQuery(text ? { text } : undefined);
  } catch {
    logger.debug("callback answer failed (stale or simulated)");
  }
}

async function loadSessionOrRestart(
  ctx: Context,
): Promise<{ chatId: string; session: SessionState } | null> {
  if (!ctx.chat) return null;
  const chatId = String(ctx.chat.id);
  const row = await prisma.quizSession.findUnique({ where: { chatId } });
  if (!row) {
    await startQuiz(ctx, "direct");
    return null;
  }
  const session: SessionState = {
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
    lang: row.lang === "uk" ? "uk" : "ru",
  };
  return { chatId, session };
}

export async function handleQuizBack(ctx: Context, pressedStep: number): Promise<void> {
  const loaded = await loadSessionOrRestart(ctx);
  if (!loaded) return;
  const { session } = loaded;

  if (pressedStep !== session.step) {
    await safeAnswer(ctx);
    await sendQuestion(ctx, session);
    return;
  }

  if (session.step <= 0) {
    await safeAnswer(ctx);
    return;
  }

  const targetIdx = session.step - 1;
  const flow = flowFor(session);
  const targetKey = flow[targetIdx];
  const patch: Record<string, string | number | null> = { step: targetIdx };

  switch (targetKey) {
    case "direction":
      patch.direction = null;
      break;
    case "travelMonth":
      patch.travelMonth = null;
      break;
    case "duration":
      patch.duration = null;
      break;
    case "adults":
      patch.adults = null;
      patch.hasChildren = null;
      patch.childCount = null;
      patch.childAges = null;
      break;
    case "hasChildren":
      patch.hasChildren = null;
      patch.childCount = null;
      patch.childAges = null;
      break;
    case "childCount":
      patch.childCount = null;
      patch.childAges = null;
      break;
    case "childAge": {
      const firstAgeIdx = flow.indexOf("childAge");
      const keep = Math.max(targetIdx - firstAgeIdx, 0);
      patch.childAges = selectedCodes(session).slice(0, keep).join(",") || null;
      break;
    }
    default:
      break;
  }

  await prisma.quizSession.update({ where: { id: session.id }, data: patch });
  await safeAnswer(ctx);
  const next: SessionState = { ...session, ...patch } as SessionState;
  await sendQuestion(ctx, next);
}

export async function handleQuizAnswer(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!ctx.chat || !data?.startsWith("q:")) return;

  const [, stepRaw, ...rest] = data.split(":");
  const value = rest.join(":");
  const step = Number(stepRaw);
  const loaded = await loadSessionOrRestart(ctx);
  if (!loaded) return;
  const { session } = loaded;

  if (session.step !== step) {
    await safeAnswer(ctx);
    await sendQuestion(ctx, session);
    return;
  }

  const questionKey = flowFor(session)[step];
  if (!questionKey) {
    await safeAnswer(ctx);
    return;
  }

  if (questionKey === "confirmParty") {
    await handleConfirmAnswer(ctx, session, value);
    return;
  }

  if (questionKey === "childAge") {
    await handleChildAgeAnswer(ctx, session, value);
    return;
  }

  if (questionKey === "wishes") {
    await handleWishesSkip(ctx, session);
    return;
  }

  await prisma.quizSession.update({
    where: { id: session.id },
    data: buildPatch(questionKey, value, session.step + 1),
  });
  await safeAnswer(ctx);

  const updated = applyAnswer(session, questionKey, value);
  const nextKey = currentQuestion(updated);
  if (nextKey) {
    await sendQuestion(ctx, updated);
    return;
  }
  await finishQuiz(ctx, updated);
}

export async function handleWishesText(ctx: Context, text: string): Promise<void> {
  const loaded = await loadSessionOrRestart(ctx);
  if (!loaded) return;
  const { session } = loaded;

  if (flowFor(session)[session.step] !== "wishes") return;

  const wishes = text.slice(0, 1000);
  await prisma.quizSession.update({
    where: { id: session.id },
    data: { wishes, step: session.step + 1 },
  });
  await ctx.deleteMessage().catch(() => undefined);

  const updated: SessionState = { ...session, wishes, step: session.step + 1 };
  await finishQuiz(ctx, updated);
}

async function handleWishesSkip(ctx: Context, session: SessionState): Promise<void> {
  await safeAnswer(ctx);
  await prisma.quizSession.update({
    where: { id: session.id },
    data: { wishes: null, step: session.step + 1 },
  });
  const updated: SessionState = { ...session, wishes: null, step: session.step + 1 };
  await finishQuiz(ctx, updated);
}

async function handleChildAgeAnswer(
  ctx: Context,
  session: SessionState,
  code: string,
): Promise<void> {
  const nextCodes = [...selectedCodes(session), code];
  await prisma.quizSession.update({
    where: { id: session.id },
    data: { childAges: nextCodes.join(","), step: session.step + 1 },
  });
  await safeAnswer(ctx);

  const updated: SessionState = {
    ...session,
    childAges: nextCodes.join(","),
    step: session.step + 1,
  };
  const nextKey = currentQuestion(updated);
  if (nextKey) {
    await sendQuestion(ctx, updated);
    return;
  }
  await finishQuiz(ctx, updated);
}

async function handleConfirmAnswer(
  ctx: Context,
  session: SessionState,
  value: string,
): Promise<void> {
  await safeAnswer(ctx);

  if (value === "0") {
    const resetFlow = flowFor({ ...session, hasChildren: null, childCount: null });
    const adultsStep = resetFlow.indexOf("adults");
    await prisma.quizSession.update({
      where: { id: session.id },
      data: {
        adults: null,
        hasChildren: null,
        childCount: null,
        childAges: null,
        step: adultsStep,
      },
    });
    await sendQuestion(ctx, {
      ...session,
      adults: null,
      hasChildren: null,
      childCount: null,
      childAges: null,
      step: adultsStep,
    });
    return;
  }

  await prisma.quizSession.update({
    where: { id: session.id },
    data: { step: session.step + 1 },
  });
  const updated: SessionState = { ...session, step: session.step + 1 };
  const nextKey = currentQuestion(updated);
  if (nextKey) {
    await sendQuestion(ctx, updated);
    return;
  }
  await finishQuiz(ctx, updated);
}

function applyAnswer(session: SessionState, key: SimpleQuestionKey, value: string): SessionState {
  const intValue = parseInt(value, 10);
  const numeric = Number.isNaN(intValue) ? null : intValue;
  switch (key) {
    case "adults":
      return { ...session, adults: numeric, step: session.step + 1 };
    case "hasChildren":
      return { ...session, hasChildren: numeric, step: session.step + 1 };
    case "childCount":
      return { ...session, childCount: numeric, step: session.step + 1 };
    case "duration":
      return { ...session, duration: value, step: session.step + 1 };
    case "budget":
      return { ...session, budget: value, step: session.step + 1 };
    default:
      return { ...session, [key]: value, step: session.step + 1 };
  }
}

function buildPatch(
  key: SimpleQuestionKey,
  value: string,
  nextStep: number,
): Record<string, number | string> {
  const intValue = parseInt(value, 10);
  switch (key) {
    case "adults":
      return { adults: intValue, step: nextStep };
    case "hasChildren":
      return { hasChildren: intValue, step: nextStep };
    case "childCount":
      return { childCount: intValue, step: nextStep };
    case "duration":
      return { duration: value, step: nextStep };
    case "budget":
      return { budget: value, step: nextStep };
    default:
      return { [key]: value, step: nextStep };
  }
}

async function finishQuiz(ctx: Context, session: SessionState): Promise<void> {
  const chatId = String(ctx.chat?.id ?? "");
  const from = ctx.from;
  const children = session.hasChildren === CHILDREN_YES ? session.childCount : null;
  const childAgesReadable =
    children && session.childAges ? agesReadable(session.lang, session.childAges.split(",")) : null;

  await prisma.botRequest
    .create({
      data: {
        telegramId: chatId,
        direction: session.direction,
        travelMonth: session.travelMonth,
        duration: session.duration,
        adults: session.adults,
        children,
        childAges: childAgesReadable,
        budget: session.budget,
        wishes: session.wishes,
        source: session.source,
      },
    })
    .catch((e) => logger.warn(e, "failed to save bot request"));

  const existing = await prisma.botLead.findUnique({ where: { telegramId: chatId } });
  const status = existing?.status === "won" ? "won" : "new";

  const lead = await prisma.botLead.upsert({
    where: { telegramId: chatId },
    create: {
      telegramId: chatId,
      username: from?.username ?? null,
      displayName: [from?.first_name, from?.last_name].filter(Boolean).join(" ") || null,
      lang: session.lang,
      source: session.source,
      branch: "select",
      direction: session.direction,
      travelMonth: session.travelMonth,
      duration: session.duration,
      adults: session.adults,
      children,
      childAges: childAgesReadable,
      budget: session.budget,
      wishes: session.wishes,
    },
    update: {
      branch: "select",
      lang: session.lang,
      direction: session.direction,
      travelMonth: session.travelMonth,
      duration: session.duration,
      adults: session.adults,
      children,
      childAges: childAgesReadable,
      budget: session.budget,
      wishes: session.wishes,
      status,
      lastFollowUp: 0,
    },
  });

  logger.info({ leadId: lead.id }, "quiz completed");
  await notifyOwnerNewLead(lead);

  const kb = new InlineKeyboard()
    .text(buttons(session.lang).faster, "lead:dates")
    .row()
    .url(buttons(session.lang).group, channelLink())
    .row()
    .text(buttons(session.lang).menuBack, "menu:back");
  await show(ctx, quizFinished(session.lang, lead), kb);
  await prisma.quizSession.delete({ where: { chatId } }).catch(() => undefined);
}

export async function handleIntentButton(ctx: Context, intent: string): Promise<void> {
  if (!ctx.chat) return;
  await safeAnswer(ctx);
  const lead = await prisma.botLead.findUnique({
    where: { telegramId: String(ctx.chat.id) },
  });
  if (!lead) return;
  await notifyOwnerIntent(lead, intent);
  const lang: Lang = lead.lang === "uk" ? "uk" : "ru";
  const kb = new InlineKeyboard().text(buttons(lang).menuBack, "menu:back");
  await show(ctx, intentSentText(lang), kb);
}
