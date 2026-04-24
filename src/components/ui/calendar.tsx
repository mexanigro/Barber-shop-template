import React from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";
import { localeConfig } from "../../config/locale";
import { getDateFnsLocale } from "../../lib/dateLocale";

export type CalendarProps = {
  /** Selección única (reserva, filtro admin). */
  selected?: Date | null;
  onSelect?: (date: Date) => void;
  /** Vista del mes (controlado opcionalmente). */
  month?: Date;
  defaultMonth?: Date;
  onMonthChange?: (month: Date) => void;
  /** Si devuelve true, el día no es clickeable. */
  disabled?: (date: Date) => boolean;
  /** Marca visual para fechas bloqueadas (staff). */
  isDateBlocked?: (date: Date) => boolean;
  className?: string;
  /** 1 = lunes inicio semana (recomendado). */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
};

/**
 * Calendario mensual en grilla (tokens semánticos). Día seleccionado: primary.
 */
export function Calendar({
  selected,
  onSelect,
  month: controlledMonth,
  defaultMonth,
  onMonthChange,
  disabled,
  isDateBlocked,
  className,
  weekStartsOn = localeConfig.calendar.weekStartsOn,
}: CalendarProps) {
  const [uncontrolledMonth, setUncontrolledMonth] = React.useState(() =>
    startOfMonth(defaultMonth ?? selected ?? new Date()),
  );

  const viewMonth =
    controlledMonth !== undefined ? startOfMonth(controlledMonth) : uncontrolledMonth;

  const setViewMonth = React.useCallback(
    (next: Date) => {
      const m = startOfMonth(next);
      if (onMonthChange) onMonthChange(m);
      if (controlledMonth === undefined) setUncontrolledMonth(m);
    },
    [controlledMonth, onMonthChange],
  );

  React.useEffect(() => {
    if (selected && controlledMonth === undefined) {
      setUncontrolledMonth((prev) =>
        isSameMonth(selected, prev) ? prev : startOfMonth(selected),
      );
    }
  }, [selected, controlledMonth]);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const goPrev = () => setViewMonth(addMonths(viewMonth, -1));
  const goNext = () => setViewMonth(addMonths(viewMonth, 1));

  const today = new Date();

  return (
    <div
      className={cn(
        "w-full max-w-[340px] rounded-2xl border border-border bg-card p-3 shadow-sm",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <button
          type="button"
          onClick={goPrev}
          className="rounded-xl border border-border bg-muted/50 p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          aria-label={localeConfig.a11y.calendarPrevMonth}
        >
          <ChevronLeft size={18} />
        </button>
        <p className="min-w-0 flex-1 text-center text-sm font-semibold capitalize tracking-tight text-foreground">
          {format(viewMonth, "MMMM yyyy", { locale: getDateFnsLocale() })}
        </p>
        <button
          type="button"
          onClick={goNext}
          className="rounded-xl border border-border bg-muted/50 p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          aria-label={localeConfig.a11y.calendarNextMonth}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 border-b border-border pb-2">
        {localeConfig.calendar.weekdaysShort.map((label) => (
          <div
            key={label}
            className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const outside = !isSameMonth(day, viewMonth);
          const isDisabled = disabled?.(day) ?? false;
          const isSelected = selected != null && isSameDay(day, selected);
          const blocked = isDateBlocked?.(day) ?? false;
          const isToday = isSameDay(day, today);

          return (
            <button
              key={format(day, "yyyy-MM-dd")}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && onSelect?.(day)}
              className={cn(
                "relative flex h-9 w-full items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                outside && "text-muted-foreground/50",
                !outside && !isDisabled && "text-foreground",
                isDisabled &&
                  "cursor-not-allowed opacity-40 hover:bg-transparent",
                !isSelected &&
                  !isDisabled &&
                  blocked &&
                  "border border-red-500/35 bg-red-500/10 text-red-600 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-400",
                isSelected &&
                  "border border-primary bg-primary font-semibold text-primary-foreground shadow-sm hover:bg-primary",
                !isSelected &&
                  !isDisabled &&
                  !blocked &&
                  "border border-transparent hover:bg-muted/80 hover:text-foreground",
                isToday &&
                  !isSelected &&
                  !isDisabled &&
                  "ring-1 ring-primary/40 ring-offset-2 ring-offset-background",
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
