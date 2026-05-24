import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { TranslationKey } from "../../../hooks/useLanguage";

interface Props {
  t: (key: TranslationKey) => string;
  startDate: string;
  endDate: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onClear: () => void;
}

const WEEKDAYS_CS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getMonthGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = startOfMonth(year, month);
  // Monday = 0, Sunday = 6
  let startWeekday = firstDay.getDay() - 1;
  if (startWeekday < 0) startWeekday = 6;
  const totalDays = daysInMonth(year, month);

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(year, month, d));
  // Pad to complete weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

function getMonthLabel(year: number, month: number): string {
  const date = new Date(year, month, 1);
  return date.toLocaleDateString("cs-CZ", { month: "long", year: "numeric" });
}

export function DateRangePicker({
  t,
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  onClear,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState<"start" | "end">("start");
  const [viewOffset, setViewOffset] = useState(0);

  const today = useMemo(() => toISO(new Date()), []);
  const baseDate = new Date();
  const viewYear = baseDate.getFullYear() + Math.floor((baseDate.getMonth() + viewOffset) / 12);
  const viewMonth = (baseDate.getMonth() + viewOffset) % 12;
  const nextMonth = (viewMonth + 1) % 12;
  const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;

  const grid1 = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const grid2 = useMemo(() => getMonthGrid(nextYear, nextMonth), [nextYear, nextMonth]);

  const handleDayClick = useCallback(
    (date: Date) => {
      const iso = toISO(date);
      if (selecting === "start") {
        onStartChange(iso);
        if (endDate && iso > endDate) {
          onEndChange("");
        }
        setSelecting("end");
      } else {
        if (startDate && iso < startDate) {
          onStartChange(iso);
          onEndChange("");
          setSelecting("end");
        } else {
          onEndChange(iso);
          setSelecting("start");
          // Auto-close after selecting both dates
          setTimeout(() => setOpen(false), 200);
        }
      }
    },
    [selecting, startDate, endDate, onStartChange, onEndChange],
  );

  function getDayClass(date: Date): string {
    const iso = toISO(date);
    const classes: string[] = ["date-picker__day"];

    if (iso < today) classes.push("date-picker__day--past");
    if (iso === startDate) classes.push("date-picker__day--start");
    if (iso === endDate) classes.push("date-picker__day--end");
    if (startDate && endDate && iso > startDate && iso < endDate) {
      classes.push("date-picker__day--in-range");
    }
    if (iso === today) classes.push("date-picker__day--today");

    return classes.join(" ");
  }

  function renderMonthGrid(grid: (Date | null)[][], year: number, month: number) {
    return (
      <div className="date-picker__month">
        <div className="date-picker__month-label">{getMonthLabel(year, month)}</div>
        <div className="date-picker__weekdays">
          {WEEKDAYS_CS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="date-picker__grid">
          {grid.flat().map((date, i) =>
            date === null ? (
              <span key={`empty-${i}`} className="date-picker__empty" />
            ) : (
              <button
                key={toISO(date)}
                type="button"
                className={getDayClass(date)}
                disabled={toISO(date) < today}
                onClick={() => handleDayClick(date)}
              >
                {date.getDate()}
              </button>
            ),
          )}
        </div>
      </div>
    );
  }

  const displayText = startDate || endDate
    ? `${startDate ? new Date(startDate).toLocaleDateString("cs-CZ") : "—"} → ${endDate ? new Date(endDate).toLocaleDateString("cs-CZ") : "—"}`
    : t("sFormDatePlaceholder");

  return (
    <div className="date-range-picker">
      <button
        type="button"
        className={`date-range-picker__trigger${open ? " is-open" : ""}${startDate || endDate ? " has-value" : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="date-range-picker__text">{displayText}</span>
        {(startDate || endDate) && (
          <span
            className="date-range-picker__clear"
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
          >
            <X size={14} aria-hidden="true" />
          </span>
        )}
      </button>

      {open && (
        <div className="date-picker__popover">
          <div className="date-picker__nav">
            <button
              type="button"
              onClick={() => setViewOffset((v) => v - 1)}
              disabled={viewOffset <= 0}
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => setViewOffset((v) => v + 1)}
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="date-picker__months">
            {renderMonthGrid(grid1, viewYear, viewMonth)}
            {renderMonthGrid(grid2, nextYear, nextMonth)}
          </div>
          <div className="date-picker__shortcuts">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                onStartChange(toISO(now));
                onEndChange(toISO(new Date(now.getTime() + 14 * 86400000)));
                setOpen(false);
              }}
            >
              {t("sDateNext2Weeks")}
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                onStartChange(toISO(now));
                onEndChange(toISO(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
                setOpen(false);
              }}
            >
              {t("sDateThisMonth")}
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const nextM = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                onStartChange(toISO(nextM));
                onEndChange(toISO(new Date(nextM.getFullYear(), nextM.getMonth() + 1, 0)));
                setOpen(false);
              }}
            >
              {t("sDateNextMonth")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
