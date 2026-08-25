import { bundles, type Lang } from "../i18n/index.js";
import type { BotLead } from "../generated/prisma/client/client.js";
import { config } from "../config.js";

const T = (lang: Lang) => bundles[lang];

export function escapeHtml(input: string): string {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const MANAGER = config.telegram.managerContact
  ? ` @${config.telegram.managerContact.replace("@", "")}`
  : "";

function groupUrl(): string {
  return `https://t.me/${config.telegram.channelUsername.replace("@", "")}`;
}

export function welcome(lang: Lang, name: string): string {
  return T(lang).welcome(escapeHtml(name));
}

export function welcomeBack(lang: Lang, name: string): string {
  return T(lang).welcomeBack(escapeHtml(name));
}

export function helpText(lang: Lang): string {
  return T(lang).helpText(MANAGER);
}

export function fallbackText(lang: Lang): string {
  return T(lang).fallbackText(MANAGER);
}

export function stoppedText(lang: Lang): string {
  return T(lang).STOPPED;
}

export function gateText(lang: Lang): string {
  return T(lang).GATE_TEXT;
}

export function gateFailText(lang: Lang): string {
  return T(lang).GATE_FAIL;
}

export function guidePinText(lang: Lang, groupUrl: string): string {
  return T(lang).guidePinText(groupUrl);
}

export function backBtnText(lang: Lang): string {
  return T(lang).BACK_BTN;
}

export function menuBackBtnText(lang: Lang): string {
  return T(lang).MENU_BACK_BTN;
}

export function langPickText(lang: Lang): string {
  return T(lang).LANG_PICK;
}

export function menuTitleText(lang: Lang): string {
  return T(lang).MENU_TITLE;
}

export function langSetText(lang: Lang): string {
  return T(lang)[lang === "uk" ? "LANG_SET_UK" : "LANG_SET_RU"];
}

export function checkingMembershipText(lang: Lang): string {
  return T(lang).CHECKING_MEMBERSHIP;
}

export function hotToursText(lang: Lang): string {
  return T(lang).hotToursText(groupUrl());
}

export function intentSentText(lang: Lang): string {
  return T(lang).INTENT_SENT;
}

export function reviewThanksText(lang: Lang): string {
  return T(lang).REVIEW_THANKS;
}

// ===== Quiz display helpers (lang-aware) =====

export const QUIZ_TEXTS = (lang: Lang) => T(lang).QUESTIONS;

export const AGE_OPTIONS = (lang: Lang) => T(lang).AGE_OPTIONS;

export function childAgeQuestionText(lang: Lang, indexZeroBased: number): string {
  return T(lang).childAgeQuestionText(indexZeroBased);
}

export function ageLabel(lang: Lang, code: string): string {
  return T(lang).ageLabel(code);
}

export function agesReadable(lang: Lang, codes: string[]): string {
  return T(lang).agesReadable(codes);
}

export function budgetLabel(lang: Lang, code: string | null): string {
  return T(lang).budgetLabel(code);
}

export function directionLabel(lang: Lang, code: string | null): string {
  if (!code) return "\u2014";
  return T(lang).directionLabel(code);
}

export function travelMonthLabel(lang: Lang, code: string | null): string {
  if (!code) return "\u2014";
  return T(lang).travelMonthLabel(code);
}

export function durationLabel(lang: Lang, code: string | null): string {
  if (!code) return "\u2014";
  return T(lang).durationLabel(code);
}

export function partySummary(
  lang: Lang,
  adults: number | null,
  children: number | null,
  childAgesReadable: string | null,
): string {
  return T(lang).partySummary(adults, children, childAgesReadable);
}

export function totalPeoplePhrase(
  lang: Lang,
  adults: number | null,
  children: number | null,
): string {
  return T(lang).totalPeoplePhrase(adults, children);
}

export function confirmPartyText(lang: Lang, partySummaryStr: string, totalPhrase: string): string {
  return T(lang).confirmPartyText(partySummaryStr, totalPhrase);
}

export function perPersonLabel(
  lang: Lang,
  budget: string | null,
  adults: number | null,
  children: number | null,
): string {
  return T(lang).perPersonLabel(budget, adults, children);
}

export function quizFinished(lang: Lang, lead: BotLead): string {
  return T(lang).quizFinished(lead);
}

export function followUpMessage(lang: Lang, key: "day3" | "day7" | "day14" | "day30"): string {
  return T(lang).FOLLOW_UPS[key];
}

export function followUpButton(
  lang: Lang,
  key: "overview" | "photos" | "fixprice" | "refresh",
): string {
  return T(lang).FU_BUTTONS[key];
}

export function menuLabels(lang: Lang): {
  guide: string;
  hot: string;
  select: string;
  langItem: string;
} {
  const t = T(lang);
  return { guide: t.MENU_GUIDE, hot: t.MENU_HOT, select: t.MENU_SELECT, langItem: t.MENU_LANG };
}

export function buttons(lang: Lang) {
  const t = T(lang);
  return {
    group: t.GROUP_BTN,
    joinGroup: t.JOIN_GROUP_BTN,
    iJoined: t.I_JOINED_BTN,
    openGroup: t.OPEN_GROUP_BTN,
    pickForMe: t.PICK_FOR_ME_BTN,
    pickTour: t.PICK_TOUR_BTN,
    hotTours: t.HOT_TOURS_BTN,
    langSwitch: t.MENU_LANG,
    faster: t.FASTER_BTN,
    menuBack: t.MENU_BACK_BTN,
    requests: t.REQUESTS_MENU,
  };
}

export function wishesStepText(lang: Lang): string {
  return T(lang).WISHES_STEP;
}

export function skipBtnText(lang: Lang): string {
  return T(lang).SKIP_BTN;
}

export function requestsMenuLabel(lang: Lang): string {
  return T(lang).REQUESTS_MENU;
}

export function requestsHeader(lang: Lang): string {
  return T(lang).REQUESTS_HEADER;
}

export function requestsEmptyText(lang: Lang): string {
  return T(lang).REQUESTS_EMPTY;
}

export function newRequestBtnText(lang: Lang): string {
  return T(lang).NEW_REQUEST_BTN;
}

export function moreRequestsText(lang: Lang, n: number): string {
  return T(lang).MORE_REQUESTS.replace("{n}", String(n));
}

export function wishesSummaryPrefix(lang: Lang): string {
  return T(lang).WISHES_SUMMARY_PREFIX;
}

export function wishesOwnerPrefix(lang: Lang): string {
  return T(lang).WISHES_OWNER_PREFIX;
}

export function adultPhrase(lang: Lang, n: number | null): string {
  if (!n) return "\u2014";
  return T(lang).adultWord(n);
}

export function childPhrase(lang: Lang, n: number | null): string {
  if (!n) return "\u2014";
  return T(lang).childWord(n);
}

// ===== Owner & Instagram — always Russian =====

function ru() {
  return bundles.ru;
}

function profileLink(username: string | null, telegramId: string): string {
  if (username) return `https://t.me/${username}`;
  return `tg://user?id=${telegramId}`;
}

function leadHeader(lead: BotLead): string {
  const name = escapeHtml(lead.displayName ?? "\u2014");
  const username = lead.username ? ` (@${escapeHtml(lead.username)})` : "";
  return `<b>Имя:</b> ${name}${username}\n<b>Профиль:</b> ${profileLink(lead.username, lead.telegramId)}`;
}

export function ownerNewLeadText(lead: BotLead): string {
  return [
    "<b>🔔 Новый квалифицированный лид!</b>",
    leadHeader(lead),
    `<b>Направление:</b> ${ru().directionLabel(lead.direction ?? "")}`,
    `<b>Когда:</b> ${ru().travelMonthLabel(lead.travelMonth ?? "")} · <b>Надолго:</b> ${ru().durationLabel(lead.duration ?? "")}`,
    `<b>Состав:</b> ${ru().partySummary(lead.adults, lead.children, lead.childAges)} — всего ${ru().totalPeoplePhrase(lead.adults, lead.children)}`,
    `<b>Бюджет:</b> ${ru().budgetLabel(lead.budget)}${perPersonRu(lead)}`,
    `${lead.wishes ? `<b>Особые пожелания:</b> ${escapeHtml(lead.wishes)}\n` : ""}<b>Источник:</b> ${lead.source}`,
    "",
    `ID лида: ${lead.id} · ответь в течение 2 минут!`,
  ].join("\n");
}

function perPersonRu(lead: BotLead): string {
  const label = ru().perPersonLabel(lead.budget, lead.adults, lead.children);
  return label ? ` ${label}` : "";
}

export function ownerIntentText(lead: BotLead, intent: string): string {
  return [
    "<b>🔔 Лид отреагировал на дожим!</b>",
    leadHeader(lead),
    `<b>Запрос:</b> ${intent}`,
    "",
    `ID лида: ${lead.id}`,
  ].join("\n");
}

export function ownerReviewText(lead: BotLead, kind: "text" | "photo", body: string): string {
  return [
    "<b>📝 Отзыв от клиента!</b>",
    leadHeader(lead),
    kind === "text" ? `\n${escapeHtml(body)}` : "\n(приложено фото)",
  ].join("\n");
}

export function weeklyReportText(data: {
  byBranch: Array<{ branch: string; count: number }>;
  byKeyword: Array<{ keyword: string; count: number }>;
  won: number;
  newLeads: number;
}): string {
  const branchLine = data.byBranch.map((b) => `  ${b.branch}: ${b.count}`).join("\n");
  const keywordLine = data.byKeyword.map((k) => `  ${k.keyword}: ${k.count}`).join("\n");
  const conversion = data.newLeads > 0 ? Math.round((data.won / data.newLeads) * 100) + "%" : "—";
  return (
    "<b>📊 Недельный отчёт воронки</b>\n\n" +
    `Новые лиды по веткам:\n${branchLine || "  —"}\n\n` +
    `Кодовые слова в Instagram:\n${keywordLine || "  —"}\n\n` +
    `Продаж за неделю: ${data.won}\n` +
    `Конверсия лид→продажа: ${conversion}`
  );
}

// ===== Instagram — always Russian =====

export function igPrivateReply(branch: string): string {
  const botUsername = config.telegram.botUsername.replace("@", "");
  const link = `https://t.me/${botUsername}`;
  switch (branch) {
    case "guide":
      return `📕 Привет! Гайд уже у меня — забирай: ${link}?start=guide`;
    case "hot":
      return `🔥 Свежие горящие туры с вылетом из Праги, Брно и Остравы — скидываю: ${link}?start=hot`;
    case "select":
      return `✍️ Отлично! Подберу тур под твой запрос. Пройди короткий опрос — займёт минуту: ${link}?start=select`;
    default:
      return `👋 Привет! Всё самое полезное здесь: ${link}`;
  }
}

export const PUBLIC_COMMENT_REPLY = "Ответил вам в Direct 👌";
