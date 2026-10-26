import React from "react";
import { tp } from "../admin/crm03/textos-pantallas";
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
import { datePattern, getDateFnsLocale, MES_DEL_CALENDARIO } from "../../lib/dateLocale";

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
  /** Marca visual para fechas bloqueadas (staff) — rojo. */
  isDateBlocked?: (date: Date) => boolean;
  /** Marca visual para fechas con horario especial (staff) — ámbar. */
  isDateCustomHours?: (date: Date) => boolean;
  className?: string;
  /** 1 = lunes inicio semana (recomendado). */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** CRM-03 diseño: el calendario del panel — días y flechas de 44 px, sin marco, fecha entera para el lector. La reserva no lo usa. */
  grande?: boolean;
  /** CRM-05 (D-384): los días de otro mes legibles (≥ 4,5) y más tenues que los del mes. Sólo el mes de la agenda lo pide. */
  otroMesLegible?: boolean;
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
  isDateCustomHours,
  className,
  weekStartsOn = localeConfig.calendar.weekStartsOn,
  grande = false,
  otroMesLegible = false,
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
        grande ? "w-full" : "w-full max-w-[340px] rounded-2xl border border-border bg-card p-3 shadow-sm",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <button
          type="button"
          onClick={goPrev}
          className={grande ? "flex h-11 w-11 items-center justify-center rounded-xl border border-border text-foreground hover:bg-muted" : "rounded-xl border border-border bg-muted/50 p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"}
          aria-label={localeConfig.a11y.calendarPrevMonth}
        >
          {grande ? <ChevronRight size={20} aria-hidden className="rtl:rotate-0 ltr:rotate-180" /> : <ChevronLeft size={18} />}
        </button>
        <p className={cn("min-w-0 flex-1 text-center font-semibold capitalize tracking-tight text-foreground", grande ? "text-base" : "text-sm")}>
          {format(viewMonth, MES_DEL_CALENDARIO, { locale: getDateFnsLocale() })}
        </p>
        <button
          type="button"
          onClick={goNext}
          className={grande ? "flex h-11 w-11 items-center justify-center rounded-xl border border-border text-foreground hover:bg-muted" : "rounded-xl border border-border bg-muted/50 p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"}
          aria-label={localeConfig.a11y.calendarNextMonth}
        >
          {grande ? <ChevronLeft size={20} aria-hidden className="rtl:rotate-0 ltr:rotate-180" /> : <ChevronRight size={18} />}
        </button>
      </div>

      <div className={cn("grid grid-cols-7 border-b border-border pb-2", grande ? "gap-0.5" : "gap-1")}>
        {localeConfig.calendar.weekdaysShort.map((label) => (
          <div
            key={label}
            className={grande ? "text-center text-xs text-muted-foreground" : "text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"}
          >
            {label}
          </div>
        ))}
      </div>

      <div className={cn("mt-2 grid grid-cols-7", grande ? "gap-0.5" : "gap-1")}>
        {days.map((day) => {
          const outside = !isSameMonth(day, viewMonth);
          const isDisabled = disabled?.(day) ?? false;
          const isSelected = selected != null && isSameDay(day, selected);
          const blocked = isDateBlocked?.(day) ?? false;
          const customHours = isDateCustomHours?.(day) ?? false;
          const isToday = isSameDay(day, today);

          return (
            <button
              key={format(day, "yyyy-MM-dd")}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && onSelect?.(day)}
              aria-label={grande ? `${format(day, datePattern("EEEE, MMMM do"), { locale: getDateFnsLocale() })}${blocked ? ` · ${tp().staff.legendOff}` : customHours ? ` · ${tp().staff.legendCustom}` : ""}` : undefined}
              aria-pressed={grande ? isSelected : undefined}
              className={cn(
                "relative flex w-full items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                grande ? "h-11 min-w-11 tabular-nums" : "h-9",
                outside && (otroMesLegible ? "text-muted-foreground" : "text-muted-foreground/50"),
                !outside && !isDisabled && "text-foreground",
                isDisabled &&
                  "cursor-not-allowed opacity-40 hover:bg-transparent",
                !isSelected &&
                  !isDisabled &&
                  blocked &&
                  (grande ? "border border-red-600/50 bg-red-500/10 text-red-800 line-through dark:text-red-300" : "border border-red-500/35 bg-red-500/10 text-red-600 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-400"),
                !isSelected &&
                  !isDisabled &&
                  customHours &&
                  !blocked &&
                  (grande ? "border border-dashed border-amber-600/70 bg-amber-500/10 text-amber-900 dark:text-amber-200" : "border border-amber-400/40 bg-amber-400/10 text-amber-600 dark:border-amber-400/40 dark:bg-amber-400/15 dark:text-amber-400"),
                isSelected &&
                  "border border-primary bg-primary font-semibold text-primary-foreground shadow-sm hover:bg-primary",
                !isSelected &&
                  !isDisabled &&
                  !blocked &&
                  !customHours &&
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
