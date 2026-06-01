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
import { ChevronLeft, ChevronRight, CheckCircle, Ban, AlertTriangle } from "lucide-react";
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
};

const STATUS_DOT: Record<AppointmentStatus, string> = {
  confirmed: "bg-emerald-500",
  pending: "bg-accent-light animate-pulse",
  cancelled: "bg-red-500",
  completed: "bg-primary",
  expired: "bg-muted-foreground/40",
};

const STATUS_BLOCK: Record<AppointmentStatus, string> = {
  confirmed: "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
  pending: "bg-accent-light/15 border-accent-light/40 text-accent-light",
  cancelled: "bg-red-500/10 border-red-500/30 text-red-500/80 line-through",
  completed: "bg-primary/15 border-primary/30 text-primary",
  expired: "bg-muted/40 border-border text-muted-foreground/70",
};

const HOUR_PX = 48; // height per hour in week/day views
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
}: Props) {
  const t = localeConfig.admin.dashboard;
  const cvt = t.calendarView;

  const [view, setView] = React.useState<CalendarView>(() =>
    window.innerWidth < 768 ? "day" : "month",
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
        <div className="inline-flex rounded-xl border border-border bg-card p-0.5">
          {(["month", "week", "day"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all",
                view === v
                  ? "bg-accent-light text-zinc-950 shadow-sm"
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
            className="flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-[10px] font-semibold text-red-400"
          >
            <AlertTriangle size={12} />
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
  onStatusChange,
}: {
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
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const selectedDateStr = selectedDay ? fmtDate(selectedDay) : null;
  const selectedApps = selectedDateStr
    ? (byDate[selectedDateStr] ?? []).sort((a, b) => a.time.localeCompare(b.time))
    : [];

  const weekdayLabels = t.weekdayAbbr as readonly string[];

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="min-w-0 flex-1 overflow-hidden rounded-3xl border border-border bg-card/95 shadow-elevated">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <button
            type="button"
            onClick={() => setViewDate((d) => startOfMonth(new Date(d.getFullYear(), d.getMonth() - 1, 1)))}
            className="rounded-xl border border-border bg-muted/60 p-2 text-muted-foreground transition-all hover:text-foreground active:scale-95"
          >
            <ChevronLeft size={14} />
          </button>
          <p className="text-sm font-black uppercase tracking-widest text-foreground">
            {format(viewDate, "MMMM yyyy")}
          </p>
          <button
            type="button"
            onClick={() => setViewDate((d) => startOfMonth(new Date(d.getFullYear(), d.getMonth() + 1, 1)))}
            className="rounded-xl border border-border bg-muted/60 p-2 text-muted-foreground transition-all hover:text-foreground active:scale-95"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-border">
          {weekdayLabels.map((d) => (
            <div
              key={d}
              className="py-2 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/60"
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
            const confirmed = dayApps.filter((a) => a.status === "confirmed" || a.status === "completed").length;
            const pending = dayApps.filter((a) => a.status === "pending").length;

            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "relative flex min-h-[64px] flex-col border-b border-e border-border p-2 text-start transition-colors",
                  !isCurrentMonth && "opacity-30",
                  isSelected && "bg-accent-light/10",
                  isToday(day) && !isSelected && "bg-muted/40",
                  "hover:bg-foreground/[0.03]",
                  (i + 1) % 7 === 0 && "border-e-0",
                )}
              >
                <span
                  className={cn(
                    "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-black",
                    isToday(day) && "bg-accent-light text-zinc-950",
                    isSelected && !isToday(day) && "text-accent-light",
                    !isToday(day) && !isSelected && "text-muted-foreground",
                  )}
                >
                  {format(day, "d")}
                </span>
                {dayApps.length > 0 && (
                  <div className="flex flex-wrap gap-0.5">
                    {confirmed > 0 && (
                      <span className="rounded-sm bg-emerald-500/20 px-1 py-0.5 text-[9px] font-black text-emerald-600 dark:text-emerald-400">
                        {confirmed}
                      </span>
                    )}
                    {pending > 0 && (
                      <span className="rounded-sm bg-accent-light/20 px-1 py-0.5 text-[9px] font-black text-accent-light">
                        {pending}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <aside className="w-full shrink-0 space-y-3 lg:w-80 xl:w-96">
        <div className="overflow-hidden rounded-3xl border border-border bg-card/95 shadow-elevated">
          <div className="border-b border-border px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
              {selectedDay ? format(selectedDay, "EEEE, MMMM d") : "—"}
            </p>
            <p className="mt-0.5 text-xl font-black tracking-tight text-foreground">
              {selectedApps.length} {t.table.title.toLowerCase()}
            </p>
          </div>

          {selectedApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40">
                {t.table.empty}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {selectedApps.map((app) => {
                const svc = services.find((s) => s.id === app.serviceId);
                const staffMember = staff.find((s) => s.id === app.staffId);
                return (
                  <div key={app.id} className="space-y-3 px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex min-w-[44px] shrink-0 flex-col items-center gap-1 rounded-xl border border-border bg-muted/60 px-2.5 py-2">
                        <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[app.status])} />
                        <span className="font-mono text-xs font-black text-foreground">{app.time}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-foreground">{app.customerName}</p>
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {svc?.name ?? "—"}
                          {staffMember && (
                            <span className="text-muted-foreground/50"> · {staffMember.name.split("'")[0]}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onStatusChange(app.id, "confirmed")}
                        disabled={app.status === "confirmed"}
                        className={cn(
                          "flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.97]",
                          app.status === "confirmed"
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border-border bg-muted/60 text-muted-foreground hover:border-emerald-500/30 hover:text-emerald-500",
                        )}
                      >
                        <CheckCircle size={12} />
                        {t.table.confirmTitle}
                      </button>
                      <button
                        type="button"
                        onClick={() => onStatusChange(app.id, "cancelled")}
                        disabled={app.status === "cancelled"}
                        className={cn(
                          "flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.97]",
                          app.status === "cancelled"
                            ? "border-red-500/20 bg-red-500/10 text-red-500"
                            : "border-border bg-muted/60 text-muted-foreground hover:border-red-500/30 hover:text-red-500",
                        )}
                      >
                        <Ban size={12} />
                        {t.table.cancelTitle}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 px-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
              {t.table.confirmTitle}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent-light" />
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
              {t.stats.pending}
            </span>
          </div>
        </div>
      </aside>
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
}: {
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
  const weekStart = startOfWeek(viewDate, { weekStartsOn: 1 });
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
          className="rounded-xl border border-border bg-muted/60 p-2 text-muted-foreground transition-all hover:text-foreground active:scale-95"
        >
          <ChevronLeft size={14} />
        </button>
        <p className="text-sm font-black uppercase tracking-widest text-foreground">
          {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
        </p>
        <button
          type="button"
          onClick={() => setViewDate(addDays(weekStart, 7))}
          className="rounded-xl border border-border bg-muted/60 p-2 text-muted-foreground transition-all hover:text-foreground active:scale-95"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[700px]" style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}>
          {/* Header row */}
          <div className="sticky top-0 z-10 border-b border-e border-border bg-card/95" />
          {days.map((d) => (
            <div
              key={d.toISOString()}
              className={cn(
                "sticky top-0 z-10 border-b border-e border-border bg-card/95 px-2 py-2 text-center last:border-e-0",
                isToday(d) && "bg-accent-light/10",
              )}
            >
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                {format(d, "EEE")}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-sm font-black",
                  isToday(d) ? "text-accent-light" : "text-foreground",
                )}
              >
                {format(d, "d")}
              </p>
            </div>
          ))}

          {/* Hour rows */}
          {hours.map((hour) => (
            <React.Fragment key={hour}>
              <div className="flex h-12 items-start justify-end border-b border-e border-border pe-2 pt-1 font-mono text-[9px] font-bold text-muted-foreground/70">
                {String(hour).padStart(2, "0")}:00
              </div>
              {days.map((day) => (
                <DayHourCell
                  key={`${day.toISOString()}-${hour}`}
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
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-4 border-t border-border px-5 py-2">
        <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60">
          {t.table.title}
        </p>
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
}: {
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

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card/95 shadow-elevated">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <button
          type="button"
          onClick={() => setDay(addDays(day, -1))}
          className="rounded-xl border border-border bg-muted/60 p-2 text-muted-foreground transition-all hover:text-foreground active:scale-95"
        >
          <ChevronLeft size={14} />
        </button>
        <p className="text-sm font-black uppercase tracking-widest text-foreground">
          {format(day, "EEEE, MMMM d, yyyy")}
        </p>
        <button
          type="button"
          onClick={() => setDay(addDays(day, 1))}
          className="rounded-xl border border-border bg-muted/60 p-2 text-muted-foreground transition-all hover:text-foreground active:scale-95"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "56px 1fr" }}>
        {hours.map((hour) => (
          <React.Fragment key={hour}>
            <div className="flex h-12 items-start justify-end border-b border-e border-border pe-2 pt-1 font-mono text-[10px] font-bold text-muted-foreground/70">
              {String(hour).padStart(2, "0")}:00
            </div>
            <DayHourCell
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
}: {
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
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative grid h-12 grid-rows-2 border-b border-e border-border last:border-e-0"
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
}: {
  app: Appointment;
  service?: Service;
  staffMember?: StaffMember;
  onDragStart: () => void;
  onDragEnd: () => void;
  draggable: boolean;
  wide?: boolean;
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

  function handleDragStart(e: React.DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData("text/appointment-id", app.id);
    e.dataTransfer.effectAllowed = "move";
    onDragStart();
  }

  return (
    <div
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      style={{ top: `${top}px`, height: `${height}px` }}
      className={cn(
        "pointer-events-auto absolute start-0 end-0 mx-1 overflow-hidden rounded-md border px-2 py-1 text-[10px] shadow-sm transition-all",
        STATUS_BLOCK[app.status],
        draggable && "cursor-grab active:cursor-grabbing hover:shadow-md hover:scale-[1.01]",
      )}
      title={`${app.time} · ${app.customerName} · ${service?.name ?? "—"}${staffMember ? ` · ${staffMember.name.split("'")[0]}` : ""}`}
    >
      <p className="font-mono text-[9px] font-bold opacity-80">{app.time}</p>
      <p className={cn("truncate font-bold leading-tight", wide && "text-[11px]")}>{app.customerName}</p>
      {height >= 32 && (
        <p className="truncate text-[9px] opacity-75">{service?.name ?? "—"}</p>
      )}
    </div>
  );
}

// Re-export the time helpers in case other admin tools need them.
export { appointmentsOverlap, appointmentEndsAt };
