import type { LangBundle } from "./types.js";

const uk: LangBundle = {
  welcome(name) {
    return (
      `<b>👋 Привіт, ${name}!</b> Це SkyTravel — тури з вильотом із Праги, Брно та Острави.\n\n` +
      "Обери, що потрібно 👇"
    );
  },
  welcomeBack(name) {
    return `<b>👋 З поверненням, ${name}!</b>\n\nОбери, що потрібно 👇`;
  },
  helpText(managerMention) {
    return (
      "<b>🤖 Що я вмію:</b>\n\n" +
      "📕 Гайди — корисні матеріали для подорожей із Чехії\n" +
      "🔥 Гарячі тури — свіжі ціни з вильотом із Праги, Брно та Острави\n" +
      "✍️ Підбір — зберу 3 тури особисто під твій запит\n" +
      (managerMention ? `\nАбо одразу пиши менеджеру:${managerMention}` : "")
    );
  },
  fallbackText(managerMention) {
    return (
      "Я бот і розумію лише кнопки 🙂\n" +
      "За твоїм запитанням стоїть жива людина — обирай варіант нижче" +
      (managerMention ? ` або пиши менеджеру:${managerMention}` : ".")
    );
  },
  STOPPED:
    "✅ Готово, більше не надсилатиму підбірок.\nХочеш повернути розсилки — просто напиши /start.",
  GATE_TEXT:
    "Вступай до нашої групи з турами — там підбірки й гарячі тури. Після вступу покажу, де що шукати 👇",
  GATE_FAIL: "Поки не бачу вступу 🤔 Натисни «Вступити» вище та спробуй ще раз.",
  guidePinText(groupUrl) {
    return (
      "<b>📕 Гайд чекає на тебе в нашій групі — у закріпі:</b>\n\n" +
      `📌 ${groupUrl}\n\n` +
      "Всередині — усе для планування поїздки із Чехії.\n\n" +
      "Тисни кнопку нижче 👇"
    );
  },
  hotToursText(groupUrl) {
    return (
      "<b>🔥 Гарячі тури публікуємо в нашій групі — дивись закріп:</b>\n\n" +
      `📌 ${groupUrl}\n\n` +
      "Там ціни «під ключ», дати та рейтинги готелів. Оновлюємо щодня."
    );
  },
  INTENT_SENT: "✅ Передав менеджеру — напише тобі найближчим часом.",
  REVIEW_THANKS: "🙏 Дякую! Відгук передано — опублікуємо в групі.",

  MENU_GUIDE: "📕 Гайди",
  MENU_HOT: "🔥 Гарячі тури",
  MENU_SELECT: "✍️ Персональний підбір",
  MENU_LANG: "🌐 Мова",
  BACK_BTN: "\u25c0\ufe0f Назад",
  MENU_BACK_BTN: "\u25c0\ufe0f До меню",
  MENU_TITLE: "🏠 Головне меню\n\nОбери, що потрібно 👇",
  LANG_PICK: "🌐 Выбери язык · Оберіть мову",
  LANG_SET_RU: "✅ Готово! Мова: російська.",
  LANG_SET_UK: "✅ Готово! Мова: українська.",
  CHECKING_MEMBERSHIP: "Перевіряю вступ…",
  GROUP_BTN: "📢 Наша група з турами",
  JOIN_GROUP_BTN: "📢 Вступити до групи",
  I_JOINED_BTN: "✅ Я вступив",
  OPEN_GROUP_BTN: "📢 Відкрити групу",
  PICK_FOR_ME_BTN: "✍️ Хочу підбір під себе",
  PICK_TOUR_BTN: "✍️ Підібрати тур",
  HOT_TOURS_BTN: "🔥 Гарячі тури",
  FASTER_BTN: "⚡ Хочу швидше",

  WISHES_STEP:
    "Є особливі побажання?\n\nНапиши одним повідомленням — наприклад: Туреччина чи Єгипет, тихий готель, номер із видом на море, дитячий клуб, перша лінія пляжу…\n\nАбо натисни «Пропустити».",
  SKIP_BTN: "⏭ Пропустити",
  REQUESTS_MENU: "📋 Мої заявки",
  REQUESTS_HEADER: "📋 Мої заявки",
  REQUESTS_EMPTY: "Заявок поки немає. Почнемо підбір? 👇",
  NEW_REQUEST_BTN: "✍️ Нова заявка",
  MORE_REQUESTS: "і ще {n} раніших",
  WISHES_SUMMARY_PREFIX: "Побажання",
  WISHES_OWNER_PREFIX: "Особливі побажання",

  QUESTIONS: {
    direction: {
      text: "Який відпочинок обираєте?",
      options: [
        { code: "beach", label: "🏖 Пляж" },
        { code: "tours", label: "🏛 Екскурсії" },
        { code: "mountains", label: "⛷ Гори" },
        { code: "advise", label: "🤷 Порадь" },
      ],
    },
    travelMonth: {
      text: "Коли плануєте поїздку?",
      options: [
        { code: "month", label: "📅 Найближчим часом" },
        { code: "1-3", label: "🗓 Через 1–3 місяці" },
        { code: "3-6", label: "🗓 Через 3–6 місяців" },
        { code: "flex", label: "🌍 Гнучкі дати" },
      ],
    },
    duration: {
      text: "На скільки днів їдете?",
      options: [
        { code: "3-5", label: "✈️ 3–5 ночей" },
        { code: "7-10", label: "🛫 7–10 ночей" },
        { code: "11-14", label: "🏖 11–14 ночей" },
        { code: "2w+", label: "🌴 Понад 2 тижні" },
      ],
    },
    adults: {
      text: "Скільки дорослих їде?",
      options: [
        { code: "1", label: "👤 Один" },
        { code: "2", label: "👥 Двоє" },
        { code: "3", label: "👨‍👩‍👦 Троє" },
        { code: "4", label: "👨‍👩‍👧‍👦 Четверо чи більше" },
      ],
    },
    hasChildren: {
      text: "Діти їдуть з вами?",
      options: [
        { code: "0", label: "🙅 Ні" },
        { code: "1", label: "✅ Так" },
      ],
    },
    childCount: {
      text: "Скільки дітей?",
      options: [
        { code: "1", label: "🧒 Одна" },
        { code: "2", label: "👶 Дві" },
        { code: "3", label: "👧 Три" },
        { code: "4", label: "👦👧 Чотири чи більше" },
      ],
    },
    budget: {
      text: "Бюджет на всіх?",
      options: [
        { code: "<35k", label: "💰 До 35 000 CZK" },
        { code: "35-45k", label: "💰 35–45 000 CZK" },
        { code: "45-60k", label: "💰 45–60 000 CZK" },
        { code: "60k+", label: "💰 Від 60 000 CZK" },
      ],
    },
  },
  AGE_OPTIONS: [
    { code: "0-2", label: "🍼 0–2" },
    { code: "3-7", label: "🧒 3–7" },
    { code: "8-12", label: "👦 8–12" },
    { code: "13+", label: "🧑 13+" },
  ],
  childAgeQuestionText(indexZeroBased) {
    const ordinals = ["1-ї", "2-ї", "3-ї", "4-ї"];
    const ordinal = ordinals[indexZeroBased] ?? `${indexZeroBased + 1}-ї`;
    return `Вік ${ordinal} дитини?`;
  },
  ageLabel(code) {
    const labels: Record<string, string> = {
      "0-2": "0–2 роки",
      "3-7": "3–7 років",
      "8-12": "8–12 років",
      "13+": "13+",
    };
    return labels[code] ?? code;
  },
  agesReadable(codes) {
    const counts = new Map<string, number>();
    for (const code of codes) counts.set(code, (counts.get(code) ?? 0) + 1);
    return [...counts.entries()]
      .map(([code, n]) => (n > 1 ? `${this.ageLabel(code)} ×${n}` : this.ageLabel(code)))
      .join(", ");
  },
  budgetLabel(code) {
    if (!code) return "\u2014";
    const labels: Record<string, string> = {
      "<35k": "до 35 000 CZK",
      "35-45k": "35–45 000 CZK",
      "45-60k": "45–60 000 CZK",
      "60k+": "від 60 000 CZK",
    };
    return labels[code] ?? code;
  },
  directionLabel(code) {
    const map: Record<string, string> = {
      beach: "Пляж",
      tours: "Екскурсії",
      mountains: "Гори",
      advise: "Порадь",
    };
    return map[code] ?? code;
  },
  travelMonthLabel(code) {
    const map: Record<string, string> = {
      month: "Найближчий час",
      "1-3": "Через 1–3 місяці",
      "3-6": "Через 3–6 місяців",
      flex: "Гнучкі дати",
    };
    return map[code] ?? code;
  },
  durationLabel(code) {
    const map: Record<string, string> = {
      "3-5": "3–5 ночей",
      "7-10": "7–10 ночей",
      "11-14": "11–14 ночей",
      "2w+": "2+ тижні",
    };
    return map[code] ?? code;
  },

  adultWord(n) {
    const label = n >= 4 ? "4+" : String(n);
    return n === 1 ? `${label} дорослий` : `${label} дорослих`;
  },
  childWord(n) {
    const label = n >= 4 ? "4+" : String(n);
    if (n === 1) return `${label} дитина`;
    return `${label} дитини`;
  },
  partySummary(adults, children, childAgesReadable) {
    if (!adults && !children) return "\u2014";
    const parts: string[] = [];
    if (adults) parts.push(this.adultWord(adults));
    if (children) {
      let childPart = this.childWord(children);
      if (childAgesReadable) childPart += ` (${childAgesReadable})`;
      parts.push(childPart);
    }
    return parts.join(" + ");
  },
  totalTravelers(adults, children) {
    return (adults ?? 0) + (children ?? 0);
  },
  peopleWord(n) {
    if (n === 1) return "людина";
    if (n >= 2 && n <= 4) return "людини";
    return "людей";
  },
  totalPeoplePhrase(adults, children) {
    const total = this.totalTravelers(adults, children);
    const plus = adults === 4 || children === 4 ? "+" : "";
    return `${total}${plus} ${this.peopleWord(total)}`;
  },
  confirmPartyText(summary, totalPhrase) {
    return `Разом: ${summary} — усього ${totalPhrase}. Все вірно?`;
  },

  BUDGET_PER_PERSON: {
    "<35k": { mid: 17500, bound: "максимум" },
    "35-45k": { mid: 40000, bound: "" },
    "45-60k": { mid: 52500, bound: "" },
    "60k+": { mid: 60000, bound: "мінімум" },
  },
  perPersonLabel(budget, adults, children) {
    const total = this.totalTravelers(adults, children);
    const range = budget ? this.BUDGET_PER_PERSON[budget] : undefined;
    if (!range || !total) return "";
    const value = Math.round(range.mid / total / 100) * 100;
    const bound = range.bound ? `${range.bound} ` : "";
    return `(≈ ${bound}${value.toLocaleString("ru-RU")} CZK на людину)`;
  },

  escapeWishes(wishes) {
    return wishes.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  },

  quizFinished(lead) {
    return (
      "<b>✅ Прийняв! Ось твій підбір:</b>\n" +
      `• Куди: ${lead.direction ? this.directionLabel(lead.direction) : "—"}\n` +
      `• Коли: ${lead.travelMonth ? this.travelMonthLabel(lead.travelMonth) : "—"}\n` +
      `• Надовго: ${lead.duration ? this.durationLabel(lead.duration) : "—"}\n` +
      `• Склад: ${this.partySummary(lead.adults, lead.children, lead.childAges)} — усього ${this.totalPeoplePhrase(lead.adults, lead.children)}\n` +
      `• Бюджет: ${this.budgetLabel(lead.budget)}\n` +
      `${lead.wishes ? `• Побажання: ${this.escapeWishes(lead.wishes)}\n` : ""}\n` +
      "Надішлу 3 варіанти з розбором кожного готелю протягом пари годин.\n\n" +
      "Хочеш отримати підбір швидше? Тисни кнопку — менеджер візьме запит у роботу першим."
    );
  },

  FOLLOW_UPS: {
    day3: "👀 Підбір ще актуальний? Якщо так — надішлю огляд готелів з деталями номерів.",
    day7: "📸 Родина зі схожим запитом вже полетіла за одним із варіантів. Фотоозвіт?",
    day14: "⏳ Ціни на твої дати зростають, місця за старим тарифом закінчуються.",
    day30: "🍂 Минає місяць — як плани? Зібрати свіжу підбірку під нові дати?",
  },
  FU_BUTTONS: {
    overview: "📋 Хочу огляд",
    photos: "📸 Хочу фотоозвіт",
    fixprice: "💰 Зафіксувати ціну",
    refresh: "✍️ Так, зберіть",
  },
};

export default uk;
