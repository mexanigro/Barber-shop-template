/**
 * AppointmentCalendar — monthly grid view of all appointments.
 * Shows each day as a cell; click to expand day's appointments.
 */
import React from "react";
import { ChevronLeft, ChevronRight, CheckCircle, Ban } from "lucide-react";
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
} from "date-fns";
import { Appointment, AppointmentStatus, Service, StaffMember } from "../../types";
import { localeConfig } from "../../config/locale";
import { cn } from "../../lib/utils";

type Props = {
  appointments: Appointment[];
  staff: StaffMember[];
  services: Service[];
  filterStaff: string;
  onStatusChange: (id: string, status: AppointmentStatus) => Promise<void>;
};

const STATUS_DOT: Record<AppointmentStatus, string> = {
  confirmed: "bg-emerald-500",
  pending: "bg-accent-light animate-pulse",
  cancelled: "bg-red-500",
  completed: "bg-primary",
  expired: "bg-muted-foreground/40",
};

export function AppointmentCalendar({
  appointments,
  staff,
  services,
  filterStaff,
  onStatusChange,
}: Props) {
  const t = localeConfig.admin.dashboard;

  const [viewDate, setViewDate] = React.useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(new Date());

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

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

  const selectedDateStr = selectedDay ? format(selectedDay, "yyyy-MM-dd") : null;
  const selectedApps = selectedDateStr
    ? (byDate[selectedDateStr] ?? []).sort((a, b) => a.time.localeCompare(b.time))
    : [];

  const weekdayLabels = localeConfig.admin.dashboard.weekdayAbbr as readonly string[];

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Calendar grid */}
      <div className="min-w-0 flex-1 overflow-hidden rounded-3xl border border-border bg-card/95 shadow-elevated">
        {/* Month nav */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <button
            type="button"
            onClick={() =>
              setViewDate((d) => startOfMonth(new Date(d.getFullYear(), d.getMonth() - 1, 1)))
            }
            className="rounded-xl border border-border bg-muted/60 p-2 text-muted-foreground transition-all hover:text-foreground active:scale-95"
          >
            <ChevronLeft size={14} />
          </button>
          <p className="text-sm font-black uppercase tracking-widest text-foreground">
            {format(viewDate, "MMMM yyyy")}
          </p>
          <button
            type="button"
            onClick={() =>
              setViewDate((d) => startOfMonth(new Date(d.getFullYear(), d.getMonth() + 1, 1)))
            }
            className="rounded-xl border border-border bg-muted/60 p-2 text-muted-foreground transition-all hover:text-foreground active:scale-95"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Weekday headers */}
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

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayApps = byDate[dateStr] ?? [];
            const isCurrentMonth = isSameMonth(day, viewDate);
            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
            const confirmed = dayApps.filter(
              (a) => a.status === "confirmed" || a.status === "completed"
            ).length;
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
                  (i + 1) % 7 === 0 && "border-e-0"
                )}
              >
                <span
                  className={cn(
                    "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-black",
                    isToday(day) && "bg-accent-light text-zinc-950",
                    isSelected && !isToday(day) && "text-accent-light",
                    !isToday(day) && !isSelected && "text-muted-foreground"
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

      {/* Day detail panel */}
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
                        <span className="font-mono text-xs font-black text-foreground">
                          {app.time}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-foreground">
                          {app.customerName}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {svc?.name ?? "—"}
                          {staffMember && (
                            <span className="text-muted-foreground/50">
                              {" "}· {staffMember.name.split("'")[0]}
                            </span>
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
                            : "border-border bg-muted/60 text-muted-foreground hover:border-emerald-500/30 hover:text-emerald-500"
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
                            : "border-border bg-muted/60 text-muted-foreground hover:border-red-500/30 hover:text-red-500"
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

        {/* Legend */}
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
              {localeConfig.admin.dashboard.stats.pending}
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
}
