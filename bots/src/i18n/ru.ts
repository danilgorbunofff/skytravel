import type { LangBundle } from "./types.js";

const ru: LangBundle = {
  welcome(name) {
    return (
      `<b>👋 Привет, ${name}!</b> Это SkyTravel — туры с вылетом из Праги, Брно и Остравы.\n\n` +
      "Выбери, что нужно 👇"
    );
  },
  welcomeBack(name) {
    return `<b>👋 С возвращением, ${name}!</b>\n\nВыбери, что нужно 👇`;
  },
  helpText(managerMention) {
    return (
      "<b>🤖 Что я умею:</b>\n\n" +
      "📕 Гайды — полезные материалы для путешествий из Чехии\n" +
      "🔥 Горящие туры — свежие цены с вылетом из Праги, Брно и Остравы\n" +
      "✍️ Подбор — соберу 3 тура лично под твой запрос\n" +
      (managerMention ? `\nИли сразу пиши менеджеру:${managerMention}` : "")
    );
  },
  fallbackText(managerMention) {
    return (
      "Я бот и понимаю только кнопки 🙂\n" +
      "За твоим вопросом стоит живой человек — выбирай вариант ниже" +
      (managerMention ? ` или пиши менеджеру:${managerMention}` : ".")
    );
  },
  STOPPED: "✅ Готово, больше не пришлю подборок.\nХочешь вернуть рассылки — просто напиши /start.",
  GATE_TEXT:
    "Вступи в нашу группу с турами — там подборки и горящие. После вступления покажу, где что искать 👇",
  GATE_FAIL: "Пока не вижу вступления 🤔 Нажми «Вступить» выше и попробуй снова.",
  guidePinText(groupUrl) {
    return (
      "<b>📕 Гайд ждёт тебя в нашей группе — в закрепе:</b>\n\n" +
      `📌 ${groupUrl}\n\n` +
      "Внутри — всё для планирования поездки из Чехии.\n\n" +
      "Жми кнопку ниже 👇"
    );
  },
  hotToursText(groupUrl) {
    return (
      "<b>🔥 Горящие туры публикуем в нашей группе — смотри закреп:</b>\n\n" +
      `📌 ${groupUrl}\n\n` +
      "Там цены «под ключ», даты и рейтинги отелей. Обновляем каждый день."
    );
  },
  INTENT_SENT: "✅ Передал менеджеру — напишет тебе в ближайшее время.",
  REVIEW_THANKS: "🙏 Спасибо! Отзыв передан — опубликуем в группе.",

  MENU_GUIDE: "📕 Гайды",
  MENU_HOT: "🔥 Горящие туры",
  MENU_SELECT: "✍️ Персональный подбор",
  MENU_LANG: "🌐 Язык",
  BACK_BTN: "\u25c0\ufe0f Назад",
  MENU_BACK_BTN: "\u25c0\ufe0f В меню",
  MENU_TITLE: "🏠 Главное меню\n\nВыбери, что нужно 👇",
  LANG_PICK: "🌐 Выбери язык · Оберіть мову",
  LANG_SET_RU: "✅ Готово! Язык: русский.",
  LANG_SET_UK: "✅ Готово! Язык: украинский.",
  CHECKING_MEMBERSHIP: "Проверяю вступление…",
  GROUP_BTN: "📢 Наша группа",
  JOIN_GROUP_BTN: "📢 Вступить в группу",
  I_JOINED_BTN: "✅ Я вступил",
  OPEN_GROUP_BTN: "📢 Открыть группу",
  PICK_FOR_ME_BTN: "✍️ Хочу подбор под себя",
  PICK_TOUR_BTN: "✍️ Подобрать тур",
  HOT_TOURS_BTN: "🔥 Горящие туры",
  FASTER_BTN: "⚡ Хочу быстрее",

  WISHES_STEP:
    "Есть особые пожелания?\n\nНапиши одним сообщением — например: Турция или Египет, тихий отель, номер с видом на море, детский клуб, первый ряд пляжа…\n\nИли нажми «Пропустить».",
  SKIP_BTN: "⏭ Пропустить",
  REQUESTS_MENU: "📋 Мои заявки",
  REQUESTS_HEADER: "📋 Мои заявки",
  REQUESTS_EMPTY: "Заявок пока нет. Начнём подбор? 👇",
  NEW_REQUEST_BTN: "✍️ Новая заявка",
  MORE_REQUESTS: "и ещё {n} ранних",
  WISHES_SUMMARY_PREFIX: "Пожелания",
  WISHES_OWNER_PREFIX: "Особые пожелания",

  QUESTIONS: {
    direction: {
      text: "Какой отдых предпочитаете?",
      options: [
        { code: "beach", label: "🏖 Пляж" },
        { code: "tours", label: "🏛 Экскурсии" },
        { code: "mountains", label: "⛷ Горы" },
        { code: "advise", label: "🤷 Посоветуй" },
      ],
    },
    travelMonth: {
      text: "Когда планируете поездку?",
      options: [
        { code: "month", label: "📅 В ближайший месяц" },
        { code: "1-3", label: "🗓 Через 1–3 месяца" },
        { code: "3-6", label: "🗓 Через 3–6 месяцев" },
        { code: "flex", label: "🌍 Даты гибкие" },
      ],
    },
    duration: {
      text: "На сколько дней едете?",
      options: [
        { code: "3-5", label: "✈️ 3–5 ночей" },
        { code: "7-10", label: "🛫 7–10 ночей" },
        { code: "11-14", label: "🏖 11–14 ночей" },
        { code: "2w+", label: "🌴 Больше 2 недель" },
      ],
    },
    adults: {
      text: "Сколько взрослых едет?",
      options: [
        { code: "1", label: "👤 Один" },
        { code: "2", label: "👥 Двое" },
        { code: "3", label: "👨‍👩‍👦 Трое" },
        { code: "4", label: "👨‍👩‍👧‍👦 Четверо или больше" },
      ],
    },
    hasChildren: {
      text: "Дети едут с вами?",
      options: [
        { code: "0", label: "🙅 Нет" },
        { code: "1", label: "✅ Да" },
      ],
    },
    childCount: {
      text: "Сколько детей?",
      options: [
        { code: "1", label: "🧒 Один" },
        { code: "2", label: "👶 Двое" },
        { code: "3", label: "👧 Трое" },
        { code: "4", label: "👦👧 Четверо или больше" },
      ],
    },
    budget: {
      text: "Бюджет на всех?",
      options: [
        { code: "<35k", label: "💰 До 35 000 CZK" },
        { code: "35-45k", label: "💰 35–45 000 CZK" },
        { code: "45-60k", label: "💰 45–60 000 CZK" },
        { code: "60k+", label: "💰 От 60 000 CZK" },
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
    const ordinals = ["1-го", "2-го", "3-го", "4-го"];
    const ordinal = ordinals[indexZeroBased] ?? `${indexZeroBased + 1}-го`;
    return `Возраст ${ordinal} ребёнка?`;
  },
  ageLabel(code) {
    const labels: Record<string, string> = {
      "0-2": "0–2 года",
      "3-7": "3–7 лет",
      "8-12": "8–12 лет",
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
      "35-45k": "35\u201345 000 CZK",
      "45-60k": "45\u201360 000 CZK",
      "60k+": "от 60 000 CZK",
    };
    return labels[code] ?? code;
  },
  directionLabel(code) {
    const map: Record<string, string> = {
      beach: "Пляж",
      tours: "Экскурсии",
      mountains: "Горы",
      advise: "Посоветуй",
    };
    return map[code] ?? code;
  },
  travelMonthLabel(code) {
    const map: Record<string, string> = {
      month: "Ближайший месяц",
      "1-3": "Через 1–3 месяца",
      "3-6": "Через 3–6 месяцев",
      flex: "Гибкие даты",
    };
    return map[code] ?? code;
  },
  durationLabel(code) {
    const map: Record<string, string> = {
      "3-5": "3–5 ночей",
      "7-10": "7–10 ночей",
      "11-14": "11–14 ночей",
      "2w+": "2+ недели",
    };
    return map[code] ?? code;
  },

  adultWord(n) {
    const label = n >= 4 ? "4+" : String(n);
    return n === 1 ? `${label} взрослый` : `${label} взрослых`;
  },
  childWord(n) {
    const label = n >= 4 ? "4+" : String(n);
    if (n === 1) return `${label} ребёнок`;
    return `${label} ребёнка`;
  },
  partySummary(adults, children, childAgesReadable) {
    if (!adults && !children) return "—";
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
    if (n === 1) return "человек";
    if (n >= 2 && n <= 4) return "человека";
    return "человек";
  },
  totalPeoplePhrase(adults, children) {
    const total = this.totalTravelers(adults, children);
    const plus = adults === 4 || children === 4 ? "+" : "";
    return `${total}${plus} ${this.peopleWord(total)}`;
  },
  confirmPartyText(summary, totalPhrase) {
    return `Итого: ${summary} — всего ${totalPhrase}. Всё верно?`;
  },

  BUDGET_PER_PERSON: {
    "<35k": { mid: 17500, bound: "максимум" },
    "35-45k": { mid: 40000, bound: "" },
    "45-60k": { mid: 52500, bound: "" },
    "60k+": { mid: 60000, bound: "минимум" },
  },
  perPersonLabel(budget, adults, children) {
    const total = this.totalTravelers(adults, children);
    const range = budget ? this.BUDGET_PER_PERSON[budget] : undefined;
    if (!range || !total) return "";
    const value = Math.round(range.mid / total / 100) * 100;
    const bound = range.bound ? `${range.bound} ` : "";
    return `(≈ ${bound}${value.toLocaleString("ru-RU")} CZK на человека)`;
  },

  escapeWishes(wishes) {
    return wishes.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  },

  quizFinished(lead) {
    return (
      "<b>✅ Принял! Вот твой подбор:</b>\n" +
      `• Куда: ${lead.direction ? this.directionLabel(lead.direction) : "—"}\n` +
      `• Когда: ${lead.travelMonth ? this.travelMonthLabel(lead.travelMonth) : "—"}\n` +
      `• На как долго: ${lead.duration ? this.durationLabel(lead.duration) : "—"}\n` +
      `• Состав: ${this.partySummary(lead.adults, lead.children, lead.childAges)} — всего ${this.totalPeoplePhrase(lead.adults, lead.children)}\n` +
      `• Бюджет: ${this.budgetLabel(lead.budget)}\n` +
      `${lead.wishes ? `• Пожелания: ${this.escapeWishes(lead.wishes)}\n` : ""}\n` +
      "Пришлю 3 варианта с разбором каждого отеля в течение пары часов.\n\n" +
      "Хочешь получить подбор быстрее? Жми кнопку — менеджер возьмёт запрос в работу первым."
    );
  },

  FOLLOW_UPS: {
    day3: "👀 Подбор ещё актуален? Если да — пришлю обзор отелей с деталями по номерам.",
    day7: "📸 Семья с похожим запросом уже улетела по одному из вариантов. Фотоотчёт?",
    day14: "⏳ Цены на твои даты растут, места по старому тарифу заканчиваются.",
    day30: "🍂 Прошёл месяц — как планы? Собрать свежую подборку под новые даты?",
  },
  FU_BUTTONS: {
    overview: "📋 Хочу обзор",
    photos: "📸 Хочу фотоотчёт",
    fixprice: "💰 Зафиксировать цену",
    refresh: "✍️ Да, собери",
  },
};

export default ru;
