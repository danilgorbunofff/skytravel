export type Lang = "ru" | "uk";

export interface LabeledOption {
  code: string;
  label: string;
}

export interface QuestionTexts {
  text: string;
  options: LabeledOption[];
}

export type QuizTextKey =
  | "direction"
  | "travelMonth"
  | "duration"
  | "adults"
  | "hasChildren"
  | "childCount"
  | "budget";

export interface LangBundle {
  welcome(name: string): string;
  welcomeBack(name: string): string;
  helpText(managerMention: string): string;
  fallbackText(managerMention: string): string;
  STOPPED: string;
  GATE_TEXT: string;
  GATE_FAIL: string;
  guidePinText(groupUrl: string): string;
  hotToursText(groupUrl: string): string;
  INTENT_SENT: string;
  REVIEW_THANKS: string;

  MENU_GUIDE: string;
  MENU_HOT: string;
  MENU_SELECT: string;
  MENU_LANG: string;
  BACK_BTN: string;
  MENU_BACK_BTN: string;
  MENU_TITLE: string;
  LANG_PICK: string;
  LANG_SET_RU: string;
  LANG_SET_UK: string;
  CHECKING_MEMBERSHIP: string;
  GROUP_BTN: string;
  JOIN_GROUP_BTN: string;
  I_JOINED_BTN: string;
  OPEN_GROUP_BTN: string;
  PICK_FOR_ME_BTN: string;
  PICK_TOUR_BTN: string;
  HOT_TOURS_BTN: string;
  FASTER_BTN: string;

  WISHES_STEP: string;
  SKIP_BTN: string;
  REQUESTS_MENU: string;
  REQUESTS_HEADER: string;
  REQUESTS_EMPTY: string;
  NEW_REQUEST_BTN: string;
  MORE_REQUESTS: string;
  WISHES_SUMMARY_PREFIX: string;
  WISHES_OWNER_PREFIX: string;

  QUESTIONS: Record<QuizTextKey, QuestionTexts>;
  AGE_OPTIONS: LabeledOption[];
  childAgeQuestionText(indexZeroBased: number): string;
  confirmPartyText(partySummaryStr: string, totalPhrase: string): string;

  ageLabel(code: string): string;
  agesReadable(codes: string[]): string;
  budgetLabel(code: string | null): string;
  directionLabel(code: string): string;
  travelMonthLabel(code: string): string;
  durationLabel(code: string): string;
  partySummary(
    adults: number | null,
    children: number | null,
    childAgesReadable: string | null,
  ): string;
  totalPeoplePhrase(adults: number | null, children: number | null): string;
  perPersonLabel(budget: string | null, adults: number | null, children: number | null): string;

  adultWord(n: number): string;
  childWord(n: number): string;
  peopleWord(n: number): string;
  totalTravelers(adults: number | null, children: number | null): number;
  BUDGET_PER_PERSON: Record<string, { mid: number; bound: string }>;

  quizFinished(lead: {
    direction: string | null;
    travelMonth: string | null;
    duration: string | null;
    adults: number | null;
    children: number | null;
    childAges: string | null;
    budget: string | null;
    wishes: string | null;
  }): string;
  escapeWishes(wishes: string): string;

  FOLLOW_UPS: Record<"day3" | "day7" | "day14" | "day30", string>;
  FU_BUTTONS: Record<"overview" | "photos" | "fixprice" | "refresh", string>;
}
