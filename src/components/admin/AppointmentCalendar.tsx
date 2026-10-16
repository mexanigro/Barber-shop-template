/**
 * AppointmentCalendar — month / week / day view of all appointments.
 *
 * Month: original 6-row grid, click a day to see its list in the side panel.
 * Week: 7-column × 24-row grid, appointments rendered as positioned blocks.
 * Day:  single 24-row column with the same block layout for fine-grained drag.
 *
 * Drag-and-drop reschedule: HTML5 native DnD, optimistic update with revert
 * if the API write fails or the new slot overlaps another booked appointment.
 *
 * Click any empty slot in week/day to open the parent-supplied quick-add modal.
 */
import React from "react";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  isToday,
  addDays,
  addMinutes,
  parse,
} from "date-fns";
import { Appointment, AppointmentStatus, Service, StaffMember } from "../../types";
import { localeConfig } from "../../config/locale";
import { cn } from "../../lib/utils";
import { carriles } from "../../lib/agenda";
import { datePattern, getDateFnsLocale, MES_DEL_CALENDARIO } from "../../lib/dateLocale";

type CalendarView = "month" | "week" | "day";

type Props = {
  appointments: Appointment[];
  staff: StaffMember[];
  services: Service[];
  filterStaff: string;
  onStatusChange: (id: string, status: AppointmentStatus) => Promise<void>;
  /** Move an appointment to a new (date, time). Should throw on conflict / failure. */
  onReschedule?: (id: string, date: string, time: string) => Promise<void>;
  /** Open the parent quick-add modal pre-filled with date+time. */
  onQuickAdd?: (date: string, time: string) => void;
  /** CRM-03 diseño: abrir ese día en la agenda (la lista), donde están las acciones de cada turno. */
  onAbrirDia?: (d: Date) => void;
};

const STATUS_DOT: Record<AppointmentStatus, string> = {
  confirmed: "bg-emerald-500",
  pending: "bg-amber-500",
  cancelled: "bg-red-500",
  completed: "bg-primary",
  expired: "bg-muted-foreground/40",
};

const STATUS_BLOCK: Record<AppointmentStatus, string> = {
  confirmed: "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
  pending: "bg-amber-500/10 border-dashed border-amber-600/70 text-amber-800 dark:text-amber-300",
  cancelled: "bg-red-500/10 border-red-500/30 text-red-500/80 line-through",
  completed: "bg-primary/15 border-primary/30 text-primary",
  expired: "bg-muted/40 border-border text-muted-foreground/70",
};

const HOUR_PX = 64; // height per hour in week/day views (CRM-03 diseño: el texto de un turno de una hora se lee entero)
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 22;
const SLOT_MINUTES = 30;

function fmtDate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function appointmentEndsAt(app: Appointment): Date {
  const start = parse(`${app.date} ${app.time}`, "yyyy-MM-dd HH:mm", new Date());
  return addMinutes(start, app.duration || 30);
}

function appointmentsOverlap(a: Appointment, b: Appointment): boolean {
  if (a.id === b.id) return false;
  if (a.date !== b.date) return false;
  if (a.staffId !== b.staffId) return false;
  const aStart = parse(`${a.date} ${a.time}`, "yyyy-MM-dd HH:mm", new Date()).getTime();
  const aEnd = appointmentEndsAt(a).getTime();
  const bStart = parse(`${b.date} ${b.time}`, "yyyy-MM-dd HH:mm", new Date()).getTime();
  const bEnd = appointmentEndsAt(b).getTime();
  return aStart < bEnd && bStart < aEnd;
}

export function AppointmentCalendar({
  appointments,
  staff,
  services,
  filterStaff,
  onStatusChange,
  onReschedule,
  onQuickAdd,
  onAbrirDia,
}: Props) {
  const t = localeConfig.admin.dashboard;
  const cvt = t.calendarView;

  const [view, setView] = React.useState<CalendarView>(() =>
    window.innerWidth < 768 ? "week" : "month",
  );
  const [viewDate, setViewDate] = React.useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(new Date());
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [rescheduleError, setRescheduleError] = React.useState<string | null>(null);

  // Map date string -> filtered appointments
  const byDate = React.useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of appointments) {
      if (filterStaff !== "all" && a.staffId !== filterStaff) continue;
      if (!map[a.date]) map[a.date] = [];
      map[a.date].push(a);
    }
    return map;
  }, [appointments, filterStaff]);

  const handleDrop = React.useCallback(
    async (appointmentId: string, date: string, time: string) => {
      if (!onReschedule) return;
      const target = appointments.find((a) => a.id === appointmentId);
      if (!target) return;
      if (target.date === date && target.time === time) return;

      const moved: Appointment = { ...target, date, time };
      const conflict = appointments.some((other) => appointmentsOverlap(moved, other));
      if (conflict) {
        setRescheduleError(cvt.rescheduleConflict);
        window.setTimeout(() => setRescheduleError(null), 3500);
        return;
      }

      try {
        setRescheduleError(null);
        await onReschedule(appointmentId, date, time);
      } catch (err) {
        console.error("[Calendar] reschedule failed", err);
        setRescheduleError(cvt.rescheduleError);
        window.setTimeout(() => setRescheduleError(null), 3500);
      }
    },
    [appointments, cvt.rescheduleConflict, cvt.rescheduleError, onReschedule],
  );

  return (
    <div className="space-y-3">
      {/* View selector */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="תצוגת לוח" className="inline-flex rounded-xl border border-border bg-card p-1">
          {(["month", "week", "day"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "h-11 rounded-lg px-4 text-sm font-medium transition-colors",
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {cvt[v]}
            </button>
          ))}
        </div>
        {rescheduleError && (
          <div
            role="alert"
            className="flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300"
          >
            <AlertTriangle size={16} aria-hidden />
            {rescheduleError}
          </div>
        )}
      </div>

      {view === "month" && (
        <MonthView
          viewDate={viewDate}
          setViewDate={setViewDate}
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          byDate={byDate}
          staff={staff}
          services={services}
          onStatusChange={onStatusChange}
          onAbrirDia={onAbrirDia}
        />
      )}
      {view === "week" && (
        <WeekView
          viewDate={selectedDay ?? new Date()}
          setViewDate={setSelectedDay}
          byDate={byDate}
          staff={staff}
          services={services}
          draggingId={draggingId}
          setDraggingId={setDraggingId}
          onDrop={handleDrop}
          onQuickAdd={onQuickAdd}
          onReschedule={onReschedule}
          alElegirDia={(d) => { setSelectedDay(d); setView("day"); }}
          onAbrirDia={onAbrirDia}
        />
      )}
      {view === "day" && (
        <DayView
          day={selectedDay ?? new Date()}
          setDay={setSelectedDay}
          byDate={byDate}
          services={services}
          staff={staff}
          draggingId={draggingId}
          setDraggingId={setDraggingId}
          onDrop={handleDrop}
          onQuickAdd={onQuickAdd}
          onReschedule={onReschedule}
          onStatusChange={onStatusChange}
          onAbrirDia={onAbrirDia}
        />
      )}
    </div>
  );
}

// ─── Month view (preserved from original) ────────────────────────────────────
function MonthView({
  viewDate,
  setViewDate,
  selectedDay,
  setSelectedDay,
  byDate,
  staff,
  services,
  onAbrirDia,
}: {
  onAbrirDia?: (d: Date) => void;
  viewDate: Date;
  setViewDate: React.Dispatch<React.SetStateAction<Date>>;
  selectedDay: Date | null;
  setSelectedDay: (d: Date) => void;
  byDate: Record<string, Appointment[]>;
  staff: StaffMember[];
  services: Service[];
  onStatusChange: (id: string, status: AppointmentStatus) => Promise<void>;
}) {
  const t = localeConfig.admin.dashboard;
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const weekdayLabels = t.weekdayAbbr as readonly string[];

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-3xl border border-border bg-card/95 shadow-elevated">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <button
            type="button"
            onClick={() => setViewDate((d) => startOfMonth(new Date(d.getFullYear(), d.getMonth() - 1, 1)))}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-foreground transition-colors hover:bg-muted"
          >
            <ChevronRight size={20} aria-hidden /><span className="sr-only">החודש הקודם</span>
          </button>
          <p className="text-base font-semibold text-foreground">
            {format(viewDate, MES_DEL_CALENDARIO, { locale: getDateFnsLocale() })}
          </p>
          <button
            type="button"
            onClick={() => setViewDate((d) => startOfMonth(new Date(d.getFullYear(), d.getMonth() + 1, 1)))}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-foreground transition-colors hover:bg-muted"
          >
            <ChevronLeft size={20} aria-hidden /><span className="sr-only">החודש הבא</span>
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-border">
          {weekdayLabels.map((d) => (
            <div
              key={d}
              className="py-2 text-center text-xs text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dateStr = fmtDate(day);
            const dayApps = byDate[dateStr] ?? [];
            const isCurrentMonth = isSameMonth(day, viewDate);
            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
            const confirmed = dayApps.filter((a) => a.status === "confirmed").length;
            const completed = dayApps.filter((a) => a.status === "completed").length;
            const pending = dayApps.filter((a) => a.status === "pending").length;

            return (
              <button
                key={i}
                type="button"
                onClick={() => { setSelectedDay(day); onAbrirDia?.(day); }}
                aria-label={`${format(day, "d MMMM", { locale: getDateFnsLocale() })}${dayApps.length ? ` · ${dayApps.length} תורים${pending ? `, ${pending} ממתינים לאישור` : ""}${completed ? `, ${completed} הושלמו` : ""}` : ""}`}
                className={cn(
                  "relative flex min-h-[64px] flex-col items-center gap-1 border-b border-e border-border p-1.5 transition-colors sm:items-start sm:p-2 lg:min-h-[104px]",
                  !isCurrentMonth && "opacity-40",
                  isSelected && "bg-muted/60",
                  isToday(day) && !isSelected && "bg-muted/40",
                  "hover:bg-foreground/[0.03]",
                  (i + 1) % 7 === 0 && "border-e-0",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                    isToday(day) ? "bg-primary text-primary-foreground" : "text-foreground",
                  )}
                >
                  {format(day, "d")}
                </span>
                {dayApps.length > 0 && (
                  <div aria-hidden className="flex flex-wrap justify-center gap-0.5 sm:justify-start lg:hidden">
                    {confirmed > 0 && (
                      <span className="min-w-5 rounded bg-emerald-500/15 px-1 text-center text-xs font-semibold tabular-nums text-emerald-800 dark:text-emerald-300">
                        {confirmed}
                      </span>
                    )}
                    {completed > 0 && (
                      <span className="min-w-5 rounded bg-primary/15 px-1 text-center text-xs font-semibold tabular-nums text-foreground">
                        {completed}
                      </span>
                    )}
                    {pending > 0 && (
                      <span className="min-w-5 rounded border border-dashed border-amber-600/70 bg-amber-500/10 px-1 text-center text-xs font-semibold tabular-nums text-amber-800 dark:text-amber-300">
                        {pending}
                      </span>
                    )}
                  </div>
                )}
                {dayApps.length > 0 && (
                  <ul data-mes-turnos aria-hidden className="hidden w-full space-y-0.5 lg:block">
                    {[...dayApps].filter((a) => a.status !== "cancelled").sort((x, y) => x.time.localeCompare(y.time)).slice(0, 3).map((a) => (
                      <li key={a.id} className={cn("flex items-baseline gap-1 truncate rounded border px-1 text-xs leading-5", STATUS_BLOCK[a.status])}>
                        <span dir="ltr" className="tabular-nums opacity-80">{a.time}</span>
                        <span className="truncate font-medium">{a.customerName}</span>
                      </li>
                    ))}
                    {dayApps.filter((a) => a.status !== "cancelled").length > 3 && (
                      <li className="px-1 text-xs text-muted-foreground">עוד {dayApps.filter((a) => a.status !== "cancelled").length - 3}</li>
                    )}
                  </ul>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-500/30" aria-hidden />מאושרים</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-dashed border-amber-600/70 bg-amber-500/10" aria-hidden />ממתינים לאישור</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-primary/15" aria-hidden />הושלמו</span>
        <span>לחיצה על יום פותחת את התורים שלו</span>
      </div>
    </div>
  );
}

// ─── Week view ───────────────────────────────────────────────────────────────
function WeekView({
  viewDate,
  setViewDate,
  byDate,
  staff,
  services,
  draggingId,
  setDraggingId,
  onDrop,
  onQuickAdd,
  onReschedule,
  alElegirDia,
  onAbrirDia,
}: {
  alElegirDia: (d: Date) => void;
  onAbrirDia?: (d: Date) => void;
  viewDate: Date;
  setViewDate: (d: Date) => void;
  byDate: Record<string, Appointment[]>;
  staff: StaffMember[];
  services: Service[];
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
  onDrop: (id: string, date: string, time: string) => void;
  onQuickAdd?: (date: string, time: string) => void;
  onReschedule?: (id: string, date: string, time: string) => Promise<void>;
}) {
  const t = localeConfig.admin.dashboard;
  const weekStart = startOfWeek(viewDate, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from(
    { length: DAY_END_HOUR - DAY_START_HOUR },
    (_, i) => DAY_START_HOUR + i,
  );

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card/95 shadow-elevated">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <button
          type="button"
          onClick={() => setViewDate(addDays(weekStart, -7))}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-foreground transition-colors hover:bg-muted"
        >
          <ChevronRight size={20} aria-hidden /><span className="sr-only">השבוע הקודם</span>
        </button>
        <p className="text-base font-semibold text-foreground">
          {format(weekStart, datePattern("MMM d"), { locale: getDateFnsLocale() })} – {format(addDays(weekStart, 6), datePattern("MMM d, yyyy"), { locale: getDateFnsLocale() })}
        </p>
        <button
          type="button"
          onClick={() => setViewDate(addDays(weekStart, 7))}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-foreground transition-colors hover:bg-muted"
        >
          <ChevronLeft size={20} aria-hidden /><span className="sr-only">השבוע הבא</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="grid" style={{ gridTemplateColumns: "40px repeat(7, minmax(0, 1fr))" }}>
          {/* Header row */}
          <div className="sticky top-0 z-10 border-b border-e border-border bg-card/95" />
          {days.map((d) => (
            <button
              type="button"
              key={d.toISOString()}
              onClick={() => alElegirDia(d)}
              aria-label={format(d, "EEEE d MMMM", { locale: getDateFnsLocale() })}
              className={cn(
                "sticky top-0 z-10 min-h-11 border-b border-e border-border bg-card/95 px-1 py-2 text-center transition-colors last:border-e-0 hover:bg-muted",
                isToday(d) && "bg-muted",
              )}
            >
              <p className="text-xs text-muted-foreground">
                {(t.weekdayAbbr as readonly string[])[d.getDay()]}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-base font-semibold tabular-nums",
                  isToday(d) ? "text-accent-strong" : "text-foreground",
                )}
              >
                {format(d, "d")}
              </p>
            </button>
          ))}

          {/* Hour rows */}
          {hours.map((hour, i) => (
            <React.Fragment key={hour}>
              <div data-hora={`${String(hour).padStart(2, "0")}:00`} style={{ gridRow: i + 2, gridColumn: 1 }} className="flex h-16 items-start justify-end border-b border-e border-border pe-1.5 pt-1 text-xs tabular-nums text-muted-foreground">
                {String(hour).padStart(2, "0")}:00
              </div>
              {days.map((day, idx) => (
                <DayHourCell
                  key={`${day.toISOString()}-${hour}`}
                  style={{ gridRow: i + 2, gridColumn: idx + 2 }}
                  day={day}
                  hour={hour}
                  draggingId={draggingId}
                  onDrop={onDrop}
                  onQuickAdd={onQuickAdd}
                />
              ))}
            </React.Fragment>
          ))}

          {/* Appointment blocks (absolutely positioned inside the grid per day column) */}
          {days.map((day, idx) => {
            const dayApps = (byDate[fmtDate(day)] ?? []).filter(
              (a) => a.status !== "cancelled" || draggingId === a.id,
            );
            const lanes = carriles(dayApps);
            return (
              <div
                key={`${day.toISOString()}-appts`}
                className="pointer-events-none relative"
                style={{
                  gridColumnStart: idx + 2,
                  gridColumnEnd: idx + 3,
                  gridRowStart: 2,
                  gridRowEnd: 2 + hours.length,
                }}
              >
                {dayApps.map((app) => (
                  <AppointmentBlock
                    key={app.id}
                    app={app}
                    service={services.find((s) => s.id === app.serviceId)}
                    staffMember={staff.find((s) => s.id === app.staffId)}
                    onDragStart={() => setDraggingId(app.id)}
                    onDragEnd={() => setDraggingId(null)}
                    draggable={!!onReschedule}
                    carril={lanes.get(app.id)}
                    compacto
                    alAbrir={onAbrirDia}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Day view ────────────────────────────────────────────────────────────────
function DayView({
  day,
  setDay,
  byDate,
  services,
  staff,
  draggingId,
  setDraggingId,
  onDrop,
  onQuickAdd,
  onReschedule,
  onAbrirDia,
}: {
  onAbrirDia?: (d: Date) => void;
  day: Date;
  setDay: (d: Date) => void;
  byDate: Record<string, Appointment[]>;
  services: Service[];
  staff: StaffMember[];
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
  onDrop: (id: string, date: string, time: string) => void;
  onQuickAdd?: (date: string, time: string) => void;
  onReschedule?: (id: string, date: string, time: string) => Promise<void>;
  onStatusChange: (id: string, status: AppointmentStatus) => Promise<void>;
}) {
  const hours = Array.from(
    { length: DAY_END_HOUR - DAY_START_HOUR },
    (_, i) => DAY_START_HOUR + i,
  );
  const dayApps = (byDate[fmtDate(day)] ?? []).filter(
    (a) => a.status !== "cancelled" || draggingId === a.id,
  );
  const lanes = carriles(dayApps);

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card/95 shadow-elevated">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <button
          type="button"
          onClick={() => setDay(addDays(day, -1))}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-foreground transition-colors hover:bg-muted"
        >
          <ChevronRight size={20} aria-hidden /><span className="sr-only">היום הקודם</span>
        </button>
        <p className="text-base font-semibold text-foreground">
          {format(day, datePattern("EEEE, MMMM do"), { locale: getDateFnsLocale() })}
        </p>
        <button
          type="button"
          onClick={() => setDay(addDays(day, 1))}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-foreground transition-colors hover:bg-muted"
        >
          <ChevronLeft size={20} aria-hidden /><span className="sr-only">היום הבא</span>
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "56px 1fr" }}>
        {hours.map((hour, i) => (
          <React.Fragment key={hour}>
            <div data-hora={`${String(hour).padStart(2, "0")}:00`} style={{ gridRow: i + 1, gridColumn: 1 }} className="flex h-16 items-start justify-end border-b border-e border-border pe-2 pt-1 text-xs tabular-nums text-muted-foreground">
              {String(hour).padStart(2, "0")}:00
            </div>
            <DayHourCell
              style={{ gridRow: i + 1, gridColumn: 2 }}
              day={day}
              hour={hour}
              draggingId={draggingId}
              onDrop={onDrop}
              onQuickAdd={onQuickAdd}
            />
          </React.Fragment>
        ))}

        <div
          className="pointer-events-none relative"
          style={{ gridColumnStart: 2, gridColumnEnd: 3, gridRowStart: 1, gridRowEnd: 1 + hours.length }}
        >
          {dayApps.map((app) => (
            <AppointmentBlock
              key={app.id}
              app={app}
              service={services.find((s) => s.id === app.serviceId)}
              staffMember={staff.find((s) => s.id === app.staffId)}
              onDragStart={() => setDraggingId(app.id)}
              onDragEnd={() => setDraggingId(null)}
              draggable={!!onReschedule}
              wide
              carril={lanes.get(app.id)}
              alAbrir={onAbrirDia}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Reusable parts ──────────────────────────────────────────────────────────
function DayHourCell({
  day,
  hour,
  draggingId,
  onDrop,
  onQuickAdd,
  style,
}: {
  style?: React.CSSProperties;
  day: Date;
  hour: number;
  draggingId: string | null;
  onDrop: (id: string, date: string, time: string) => void;
  onQuickAdd?: (date: string, time: string) => void;
}) {
  const [hoverHalf, setHoverHalf] = React.useState<"top" | "bottom" | null>(null);

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (!draggingId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverHalf(e.clientY - rect.top < rect.height / 2 ? "top" : "bottom");
  }

  function handleDragLeave() {
    setHoverHalf(null);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/appointment-id");
    if (!id) return;
    const minute = hoverHalf === "bottom" ? 30 : 0;
    const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    setHoverHalf(null);
    onDrop(id, fmtDate(day), time);
  }

  function handleClick(half: "top" | "bottom") {
    if (!onQuickAdd) return;
    const minute = half === "bottom" ? 30 : 0;
    const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    onQuickAdd(fmtDate(day), time);
  }

  return (
    <div
      style={style}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative grid h-16 grid-rows-2 border-b border-e border-border last:border-e-0"
    >
      <button
        type="button"
        onClick={() => handleClick("top")}
        className={cn(
          "cursor-pointer border-b border-dashed border-border/40 transition-colors",
          hoverHalf === "top" && "bg-accent-light/20",
          onQuickAdd && !draggingId && "hover:bg-foreground/[0.04]",
        )}
        aria-label={`${format(day, "yyyy-MM-dd")} ${String(hour).padStart(2, "0")}:00`}
      />
      <button
        type="button"
        onClick={() => handleClick("bottom")}
        className={cn(
          "cursor-pointer transition-colors",
          hoverHalf === "bottom" && "bg-accent-light/20",
          onQuickAdd && !draggingId && "hover:bg-foreground/[0.04]",
        )}
        aria-label={`${format(day, "yyyy-MM-dd")} ${String(hour).padStart(2, "0")}:30`}
      />
    </div>
  );
}

function AppointmentBlock({
  app,
  service,
  staffMember,
  onDragStart,
  onDragEnd,
  draggable,
  wide,
  carril,
  compacto,
  alAbrir,
}: {
  compacto?: boolean;
  alAbrir?: (d: Date) => void;
  app: Appointment;
  service?: Service;
  staffMember?: StaffMember;
  onDragStart: () => void;
  onDragEnd: () => void;
  draggable: boolean;
  wide?: boolean;
  carril?: { carril: number; de: number };
}) {
  const startMinutes = (() => {
    const [h, m] = app.time.split(":").map(Number);
    return (h - DAY_START_HOUR) * 60 + m;
  })();
  const heightMinutes = Math.max(20, app.duration || 30);
  const visibleMinutes = (DAY_END_HOUR - DAY_START_HOUR) * 60;
  if (startMinutes < 0 || startMinutes >= visibleMinutes) return null;
  const top = (startMinutes / 60) * HOUR_PX;
  const height = (heightMinutes / 60) * HOUR_PX - 2;

  const etiqueta = `${app.time} · ${app.customerName} · ${service?.name ?? "—"}${staffMember ? ` · ${staffMember.name.split("'")[0]}` : ""}${app.status === "pending" ? " · ממתין לאישור" : ""}`;

  function handleDragStart(e: React.DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData("text/appointment-id", app.id);
    e.dataTransfer.effectAllowed = "move";
    onDragStart();
  }

  return (
    <div
      data-turno={(app as Appointment & { origin?: { documentId?: string } }).origin?.documentId ?? app.id}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      style={{ top: `${top}px`, height: `${height}px`, ...(carril && carril.de > 1 ? { insetInlineStart: `${(carril.carril / carril.de) * 100}%`, insetInlineEnd: `${((carril.de - carril.carril - 1) / carril.de) * 100}%` } : {}) }}
      className={cn(
        "pointer-events-auto absolute start-0 end-0 mx-0.5 overflow-hidden rounded-lg border px-1.5 py-1 text-xs shadow-sm transition-shadow",
        STATUS_BLOCK[app.status],
        draggable && "cursor-grab active:cursor-grabbing hover:shadow-md",
        alAbrir && "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
        carril && carril.de > 1 && "px-1",
      )}
      title={etiqueta}
      aria-label={alAbrir ? etiqueta : undefined}
      role={alAbrir ? "button" : undefined}
      tabIndex={alAbrir ? 0 : undefined}
      onClick={alAbrir ? () => alAbrir(parse(app.date, "yyyy-MM-dd", new Date())) : undefined}
      onKeyDown={alAbrir ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); alAbrir(parse(app.date, "yyyy-MM-dd", new Date())); } } : undefined}
    >
      <p dir="ltr" className={cn("truncate text-end text-xs font-semibold tabular-nums opacity-80", compacto && "hidden sm:block")}>{app.time}</p>
      <p className={cn("font-semibold leading-tight", wide && "text-sm", compacto ? "overflow-hidden whitespace-nowrap sm:truncate" : "truncate")}>{app.customerName}</p>
      {height >= 32 && (
        <p className={cn("truncate text-xs opacity-80", compacto && "hidden sm:block")}>{service?.name ?? "—"}</p>
      )}
    </div>
  );
}

// Re-export the time helpers in case other admin tools need them.
export { appointmentsOverlap, appointmentEndsAt };
