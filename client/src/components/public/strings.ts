import type { PublicLocale } from "../../i18n/locales";

/** UI copy for the server-rendered public blocks (cs + ru only). */
const STRINGS = {
  cs: {
    home: "Úvod",
    search: "Vyhledat zájezd",
    contact: "Kontakt",
    lastMinute: "Last minute",
    lastMinutePath: "/cs/last-minute/",
    writeTelegram: "Napsat na Telegram",
    writeTelegramShort: "Telegram",
    languageLabel: "Jazyk",

    trustTitle: "Proč SkyTravel",
    trust1Title: "Zájezdy od všech českých CK za jejich ceny",
    trust1Text:
      "Prodáváme zájezdy českých cestovních kanceláří za stejnou cenu jako přímo u CK — bez přirážky.",
    trust2Title: "Všechny CK jsou ze zákona pojištěné",
    trust2Text:
      "Každá česká cestovní kancelář musí mít pojištění proti úpadku. Vaše peníze i návrat domů jsou chráněné.",
    trust3Title: "Poradíme česky i rusky",
    trust3Text:
      "Vybereme zájezd podle vašeho rozpočtu a odpovíme na Telegramu, telefonu nebo e-mailu.",
    reviewsTitle: "Recenze klientů",

    channelTitle: "Nejlepší last minute nabídky na Telegramu",
    channelText:
      "Každý den posíláme vybrané zájezdy z Prahy a slevy českých CK. Odebírejte náš kanál a nic vám neuteče.",
    channelBtn: "Odebírat kanál",

    leadTitle: "Pošlete poptávku — vybereme zájezd za vás",
    leadSubtitle: "Odpovíme obvykle do 1 hodiny v pracovní době.",
    leadDestination: "Kam chcete letět?",
    leadDestinationPh: "např. Egypt, Turecko, je mi to jedno…",
    leadDateFrom: "Odlet od",
    leadDateTo: "Návrat do",
    leadAdults: "Dospělí",
    leadChildren: "Děti",
    leadBudget: "Rozpočet na osobu",
    leadBudgetAny: "Nevím / libovolný",
    leadContactMethod: "Jak vás máme kontaktovat?",
    leadContact: "Kontakt",
    leadContactPh: {
      telegram: "@uzivatel nebo telefon",
      phone: "+420 …",
      email: "vas@email.cz",
    },
    leadName: "Jméno",
    leadMessage: "Poznámka",
    leadGdpr: "Souhlasím se zpracováním osobních údajů pro vyřízení poptávky.",
    leadGdprLink: "Zásady ochrany osobních údajů",
    leadSubmit: "Odeslat poptávku",
    leadSending: "Odesílám…",
    leadSuccess: "Děkujeme! Poptávku jsme přijali a brzy se vám ozveme.",
    leadError: "Odeslání se nepodařilo. Zkuste to znovu nebo nám napište na Telegram.",
    leadContactRequired: "Vyplňte prosím kontakt.",
    leadGdprRequired: "Pro odeslání je potřeba souhlas se zpracováním údajů.",

    dealsTitle: "Aktuální nabídky",
    catalogEmptyTitle: "Nabídky právě aktualizujeme",
    catalogEmptyText:
      "Napište nám, kam a kdy chcete jet — pošleme vám aktuální ceny všech českých CK.",
    catalogEmptyCta: "Poslat poptávku",
    dealsEmpty:
      "Právě teď zde nemáme živé nabídky pro tuto destinaci. Napište nám — pošleme vám aktuální ceny všech CK.",
    dealsAll: "Zobrazit všechny zájezdy",
    dealsFrom: "od",
    perPerson: "/ os.",
    faqTitle: "Časté dotazy",
    relatedTitle: "Mohlo by vás zajímat",
    breadcrumbs: "Drobečková navigace",
    popularTitle: "Oblíbené směry",
    notFoundTitle: "Stránka nenalezena",
    notFoundText: "Tato stránka neexistuje nebo byla přesunuta.",
    notFoundBack: "Zpět na úvod",
    footerRights: "Všechna práva vyhrazena.",
    footerGdpr: "Ochrana osobních údajů",
    footerTerms: "Obchodní podmínky",
    footerBlog: "Blog",
  },
  ru: {
    home: "Главная",
    search: "Поиск туров",
    contact: "Контакты",
    lastMinute: "Горящие туры",
    lastMinutePath: "/ru/goryashchie-tury/",
    writeTelegram: "Написать в Telegram",
    writeTelegramShort: "Telegram",
    languageLabel: "Язык",

    trustTitle: "Почему SkyTravel",
    trust1Title: "Туры от всех чешских CK по их собственной цене",
    trust1Text:
      "Продаём туры чешских туроператоров по той же цене, что и напрямую в CK, — без наценки.",
    trust2Title: "Все CK застрахованы по закону",
    trust2Text:
      "Каждый чешский туроператор обязан иметь страховку от банкротства. Ваши деньги и возвращение домой защищены.",
    trust3Title: "Говорим по-русски и по-чешски",
    trust3Text: "Подберём тур под ваш бюджет и ответим в Telegram, по телефону или e-mail.",
    reviewsTitle: "Отзывы клиентов",

    channelTitle: "Лучшие горящие туры — в нашем Telegram-канале",
    channelText:
      "Каждый день публикуем туры из Праги и скидки чешских туроператоров. Подпишитесь, чтобы не пропустить.",
    channelBtn: "Подписаться на канал",

    leadTitle: "Оставьте заявку — подберём тур за вас",
    leadSubtitle: "Обычно отвечаем в течение часа в рабочее время.",
    leadDestination: "Куда хотите поехать?",
    leadDestinationPh: "например, Египет, Турция, не знаю…",
    leadDateFrom: "Вылет с",
    leadDateTo: "Возвращение до",
    leadAdults: "Взрослые",
    leadChildren: "Дети",
    leadBudget: "Бюджет на человека",
    leadBudgetAny: "Не знаю / любой",
    leadContactMethod: "Как с вами связаться?",
    leadContact: "Контакт",
    leadContactPh: {
      telegram: "@username или телефон",
      phone: "+420 …",
      email: "vash@email.cz",
    },
    leadName: "Имя",
    leadMessage: "Комментарий",
    leadGdpr: "Согласен(на) на обработку персональных данных для обработки заявки.",
    leadGdprLink: "Политика конфиденциальности",
    leadSubmit: "Отправить заявку",
    leadSending: "Отправляем…",
    leadSuccess: "Спасибо! Заявка получена, мы скоро свяжемся с вами.",
    leadError: "Не удалось отправить. Попробуйте ещё раз или напишите нам в Telegram.",
    leadContactRequired: "Укажите, пожалуйста, контакт.",
    leadGdprRequired: "Для отправки нужно согласие на обработку данных.",

    dealsTitle: "Актуальные предложения",
    catalogEmptyTitle: "Мы как раз обновляем предложения",
    catalogEmptyText:
      "Напишите нам, куда и когда хотите поехать — пришлём актуальные цены всех чешских туроператоров.",
    catalogEmptyCta: "Отправить заявку",
    dealsEmpty:
      "Сейчас здесь нет онлайн-предложений по этому направлению. Напишите нам — пришлём актуальные цены всех чешских CK.",
    dealsAll: "Смотреть все туры",
    dealsFrom: "от",
    perPerson: "/ чел.",
    faqTitle: "Частые вопросы",
    relatedTitle: "Смотрите также",
    breadcrumbs: "Навигационная цепочка",
    popularTitle: "Популярные направления",
    notFoundTitle: "Страница не найдена",
    notFoundText: "Такой страницы нет или она была перемещена.",
    notFoundBack: "На главную",
    footerRights: "Все права защищены.",
    footerGdpr: "Защита персональных данных",
    footerTerms: "Условия",
    footerBlog: "Блог",
  },
} as const;

export type PublicStrings = (typeof STRINGS)["cs"];

export function publicStrings(lang: PublicLocale): PublicStrings {
  return STRINGS[lang] as PublicStrings;
}

export const BUDGET_OPTIONS = [
  { value: "do-20000", label: "do 20 000 Kč" },
  { value: "20000-30000", label: "20 000 – 30 000 Kč" },
  { value: "30000-45000", label: "30 000 – 45 000 Kč" },
  { value: "45000+", label: "45 000+ Kč" },
] as const;
