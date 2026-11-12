/** Editorial copy that is not stored per-article: hub intros, page leads, tag blurbs. */

export const BLOG_NAME = "Cestovní deník";
export const BLOG_HOME_TITLE = "SkyTravel Cestovní deník — průvodci, pláže a rady před odletem";
export const BLOG_HOME_LEAD =
  "Píšeme o místech, kam z Česka reálně létáme a jezdíme: co tam funguje, kolik co stojí, kdy jet a čemu se vyhnout. Bez přehnaných slibů a bez textů opsaných z tiskových zpráv.";

export const BLOG_HOME_INTRO =
  "Průvodce středomořskými destinacemi z pohledu českého cestovatele — sezony, ceny, pláže, doprava a praktické rady, které se hodí před rezervací.";

/** Hub intro copy — doubles as the hub page's meta description. */
export const HUB_INTROS: Record<string, string> = {
  Albánie:
    "Albánská riviéra mezi Vlorem a Sarandou: které pláže stojí za to, jak jezdí trajekty, kolik stojí jídlo a co čekat od silnic. Praktický průvodce bez iluzí.",
  Bulharsko:
    "Černomořské pobřeží od Zlatých písků po Sozopol: kdy je moře nejteplejší, kde jsou pláže pro rodiny, kolik stojí lehátka a jak se dostat z letiště. Praktický průvodce.",
  "Černá Hora":
    "Boka Kotorská, Budva, Ulcinj a hory Durmitor: kombinace moře a hor na malém území. Kdy jet, kde se koupat, jak jezdit mezi pobřežím a vnitrozemím a na co si dát pozor.",
  Chorvatsko:
    "Istrie, Kvarner, Dalmácie a ostrovy: který region vybrat, jak fungují trajekty, kolik stojí apartmán a kde jsou pláže bez davů. Průvodce pro cesty autem i letecky.",
  Itálie:
    "Od Bibione po Apulii: pláže s pozvolným vstupem, rodinné kempy, města na jeden den a jídlo, které dětem opravdu chutná. Praktické rady pro dovolenou v Itálii.",
  Řecko:
    "Kréta, Rhodos, Chalkidiki i pevnina: které ostrovy vybrat podle typu dovolené, kdy fouká meltemi, kolik stojí trajekt a jak se domluvit. Průvodce řeckým létem.",
  Španělsko:
    "Costa Brava, Costa del Sol a Baleáry: rozdíly mezi pobřežími, ceny mimo sezonu, pláže pro děti a doprava. Co vědět před dovolenou ve Španělsku.",
  Turecko:
    "Riviéra mezi Antalyí a Bodrumem: all inclusive vs. městský pobyt, pláže, památky, bazary a ceny. Praktický průvodce tureckým pobřežím pro české cestovatele.",
};

export const HUBS_LEAD =
  "Osm destinací, o kterých píšeme nejvíc. U každé najdete průvodce sezonou, plážemi, cenami a dopravou — a odkazy na aktuální nabídky zájezdů.";

/** Tag pages are only indexable with enough posts; the blurb appears on the page. */
export const TAG_INTROS: Record<string, string> = {
  rady: "Praktické rady před rezervací i před odletem: výběr zájezdu, pojištění, zavazadla, platby a chování v destinaci.",
  plaze:
    "Pláže, které jsme prošli: vstup do moře, vlny, stín, lehátka, parkování a vhodnost pro děti.",
  pruvodce:
    "Průvodce destinacemi od sezony přes ceny až po dopravu. Texty stavíme na datech dodavatelů a na opakovaných návštěvách.",
  rodiny:
    "Dovolená s dětmi bez zbytečných kompromisů: pláže s pozvolným vstupem, animace, jídlo a cestovní časy.",
  ceny: "Kolik co skutečně stojí — letenky, ubytování, jídlo, vstupy i doprava. S rozsahy, které odpovídají sezoně.",
  doprava:
    "Jak se dostat z letiště, jak fungují trajekty, půjčovny aut a dálniční známky v jednotlivých zemích.",
  jidlo:
    "Co jíst a kde: místní kuchyně, ceny v restauracích, trhy a jídlo, které zvládnou i vybíravé děti.",
  itinerar: "Konkrétní plány na tři až sedm dní: co stihnout, co vynechat a kde se dá ušetřit čas.",
  more: "Kdy je moře nejteplejší, kdy fouká vítr a kdy se vyplatí počkat na září.",
};

export const ABOUT_LEAD =
  "Jsme redakce SkyTravel. Píšeme o destinacích, které máme v nabídce, a o tom, co před cestou skutečně potřebujete vědět.";

export const ABOUT_SECTIONS: { heading: string; paragraphs: string[] }[] = [
  {
    heading: "Odkud bereme informace",
    paragraphs: [
      "Ceny, termíny a dostupnost vycházejí z dat našich dodavatelů, která průběžně stahujeme a porovnáváme. Rozsahy cen v článcích proto odpovídají reálné nabídce, ne ceníkovým listům hotelů.",
      "Praktické údaje o destinaci — sezona, teplota moře, doprava, vstupy — ověřujeme proti oficiálním zdrojům (meteorologické služby, dopravci, správy parků) a uvádíme je s datem poslední aktualizace.",
      "Když si nejsme jistí, napsali to do textu. Nedomýšlíme ceny ani provozní dobu.",
    ],
  },
  {
    heading: "Jak články vznikají a aktualizují",
    paragraphs: [
      "Každý text prochází redakční úpravou: kontrolujeme strukturu, srozumitelnost a to, zda čtenář po přečtení umí udělat rozhodnutí — vybrat destinaci, termín nebo zájezd.",
      "Sezonní texty revidujeme před začátkem sezony. Pokud se změní zásadní věc (například cena trajektu nebo vstupu), doplníme datum aktualizace do hlavičky článku.",
    ],
  },
  {
    heading: "Co na blogu nenajdete",
    paragraphs: [
      "Žádné recenze hotelů, které jsme nenavštívili, žádné placené články vydávané za redakční obsah a žádné affiliate odkazy, které by ovlivnily, co doporučujeme.",
      "Pokud někdy doporučení vznikne na základě obchodní spolupráce, bude to v článku výslovně označené.",
    ],
  },
];

export const ABOUT_CONTACT = {
  email: "info@skytravel.cz",
  note: "Máte připomínku k článku, našli jste neaktuální cenu nebo chcete navrhnout téma? Napište nám.",
};

export const SEARCH_LEAD =
  "Hledejte v článcích podle destinace, tématu nebo konkrétní situace — třeba „trajekt“ nebo „dovolená s dítětem“.";
