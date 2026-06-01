import React from "react";
import {
  CalendarDays,
  CheckCircle,
  Ban,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Bell,
  AlertCircle,
  Clock,
  UserPlus,
  Users,
  Download,
  Scissors,
  Tag,
  Banknote,
  Zap,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Appointment, Customer, NotificationLog, Service, StaffMember } from "../../types";
import { notificationLogsService } from "../../services/notificationLogs";
import { customerService } from "../../services/customers";
import { localeConfig } from "../../config/locale";
import { TOUR_CONFIG } from "../../config/tour.config";
import { DEMO_CUSTOMERS } from "../../config/demo-data";
import { cn } from "../../lib/utils";
import { buildCsvBlob, downloadBlob } from "../../lib/exportCsv";
import { MetricsDashboard } from "./MetricsDashboard";
import { useToast } from "../ui/Toast";
import {
  format,
  subDays,
  startOfDay,
  isWithinInterval,
  parse,
  eachDayOfInterval,
} from "date-fns";

type DateRange = "7" | "30" | "custom";

const statusIcon: Record<NotificationLog["status"], typeof CheckCircle> = {
  sent: CheckCircle,
  failed: AlertCircle,
  queued: Clock,
};
const statusColor: Record<NotificationLog["status"], string> = {
  sent: "text-emerald-500",
  failed: "text-red-500",
  queued: "text-amber-500",
};

export function DashboardTab({
  appointments,
  services,
  staff,
  isLoading = false,
  error = null,
}: {
  appointments: Appointment[];
  services: Service[];
  staff: StaffMember[];
  isLoading?: boolean;
  error?: string | null;
}) {
  const t = localeConfig.admin.overview;
  const toast = useToast();

  const serviceNameById = React.useMemo(
    () => Object.fromEntries(services.map((s) => [s.id, s.name])),
    [services],
  );

  const [range, setRange] = React.useState<DateRange>("7");
  const [customFrom, setCustomFrom] = React.useState(
    format(subDays(new Date(), 7), "yyyy-MM-dd")
  );
  const [customTo, setCustomTo] = React.useState(
    format(new Date(), "yyyy-MM-dd")
  );

  const [logs, setLogs] = React.useState<NotificationLog[]>([]);
  React.useEffect(() => {
    if (TOUR_CONFIG.isDemoMode) return;
    return notificationLogsService.subscribe(setLogs);
  }, []);

  const [customers, setCustomers] = React.useState<Customer[]>([]);
  React.useEffect(() => {
    if (TOUR_CONFIG.isDemoMode) {
      setCustomers(DEMO_CUSTOMERS);
      return;
    }
    customerService.listCustomers().then(setCustomers).catch(() => {
      toast.error(localeConfig.admin.common.toastCustomerFetchError ?? "Could not load customers.");
    });
  }, []);

  // Derive date window
  const today = startOfDay(new Date());
  const dateWindow = React.useMemo<{ start: Date; end: Date }>(() => {
    if (range === "custom") {
      return {
        start: startOfDay(parse(customFrom, "yyyy-MM-dd", new Date())),
        end: startOfDay(parse(customTo, "yyyy-MM-dd", new Date())),
      };
    }
    const days = range === "7" ? 7 : 30;
    return { start: subDays(today, days), end: today };
  }, [range, customFrom, customTo]);

  // Filter appointments within window
  const filtered = React.useMemo(
    () =>
      appointments.filter((a) => {
        const d = startOfDay(parse(a.date, "yyyy-MM-dd", new Date()));
        return isWithinInterval(d, { start: dateWindow.start, end: dateWindow.end });
      }),
    [appointments, dateWindow]
  );

  // KPIs
  const total = filtered.length;
  const confirmed = filtered.filter((a) => a.status === "confirmed" || a.status === "completed").length;
  const cancelled = filtered.filter((a) => a.status === "cancelled").length;
  const cancelRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;
  const estimatedRevenue = filtered
    .filter((a) => a.status !== "cancelled")
    .reduce((acc, a) => {
      const svc = services.find((s) => s.id === a.serviceId);
      return acc + (svc?.price ?? 0);
    }, 0);

  const recentLogs = logs.slice(0, 10);

  // New customers: those whose createdAt falls within the date window.
  // createdAt = date first upserted via booking; reflects CRM entry date, not
  // necessarily the customer's real first-ever visit to the business.
  const newCustomers = React.useMemo(
    () =>
      customers.filter((c) =>
        isWithinInterval(startOfDay(c.createdAt), {
          start: dateWindow.start,
          end: dateWindow.end,
        })
      ).length,
    [customers, dateWindow]
  );

  // Bookings by staff: group filtered appointments by staffId.
  const byStaff = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of filtered) {
      counts[a.staffId] = (counts[a.staffId] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([staffId, count]) => ({
        staffId,
        name: staff.find((s) => s.id === staffId)?.name ?? staffId,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filtered, staff]);

  // Revenue by service: actual payments or catalogue-price fallback
  const byService = React.useMemo(() => {
    const counts: Record<string, { name: string; count: number; revenue: number }> = {};
    for (const a of filtered) {
      if (a.status === "cancelled") continue;
      const svc = services.find((s) => s.id === a.serviceId);
      const name = svc?.name ?? a.serviceId;
      if (!counts[a.serviceId]) counts[a.serviceId] = { name, count: 0, revenue: 0 };
      counts[a.serviceId].count++;
      counts[a.serviceId].revenue += a.amountPaidCents != null ? a.amountPaidCents / 100 : (svc?.price ?? 0);
    }
    return Object.values(counts).sort((a, b) => b.revenue - a.revenue);
  }, [filtered, services]);

  // Appointment-type breakdown
  const typeBreakdown = React.useMemo(() => {
    const paid = filtered.filter((a) => (a.type ?? "appointment") === "appointment" && a.status !== "cancelled");
    const consult = filtered.filter((a) => a.type === "consultation" && a.status !== "cancelled");
    const meet = filtered.filter((a) => a.type === "meeting" && a.status !== "cancelled");
    const grossRevenue = filtered.reduce((acc, a) => acc + (a.amountPaidCents ?? 0), 0) / 100;
    const avgPerPaid = paid.length > 0
      ? paid.reduce((acc, a) => {
          const svc = services.find((s) => s.id === a.serviceId);
          return acc + (a.amountPaidCents != null ? a.amountPaidCents / 100 : (svc?.price ?? 0));
        }, 0) / paid.length
      : 0;
    return { paid: paid.length, consult: consult.length, meet: meet.length, grossRevenue, avgPerPaid };
  }, [filtered, services]);

  // Daily trend: confirmed + cancelled per day across the selected window
  const trendData = React.useMemo(() => {
    const countMap: Record<string, { confirmed: number; cancelled: number }> = {};
    for (const a of filtered) {
      if (!countMap[a.date]) countMap[a.date] = { confirmed: 0, cancelled: 0 };
      if (a.status === "confirmed" || a.status === "completed") {
        countMap[a.date].confirmed++;
      } else if (a.status === "cancelled") {
        countMap[a.date].cancelled++;
      }
    }
    const days = eachDayOfInterval({ start: dateWindow.start, end: dateWindow.end });
    const labelFmt = range === "7" ? "EEE" : "MMM d";
    return days.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      return {
        label: format(day, labelFmt),
        confirmed: countMap[dateStr]?.confirmed ?? 0,
        cancelled: countMap[dateStr]?.cancelled ?? 0,
      };
    });
  }, [filtered, dateWindow, range]);

  // Today at-a-glance (always reflects today regardless of selected range)
  const todayStr = format(today, "yyyy-MM-dd");
  const todayApps = React.useMemo(
    () => appointments.filter((a) => a.date === todayStr),
    [appointments, todayStr],
  );
  const todayConfirmed = todayApps.filter((a) => a.status === "confirmed" || a.status === "completed").length;
  const todayPending = todayApps.filter((a) => a.status === "pending").length;
  const todayRevenue = todayApps
    .filter((a) => a.status !== "cancelled")
    .reduce((acc, a) => {
      const svc = services.find((s) => s.id === a.serviceId);
      return acc + (a.amountPaidCents != null ? a.amountPaidCents / 100 : (svc?.price ?? 0));
    }, 0);
  const nextTodayApp = todayApps
    .filter((a) => a.status === "pending" || a.status === "confirmed")
    .sort((a, b) => a.time.localeCompare(b.time))
    .find((a) => {
      const [h, m] = a.time.split(":").map(Number);
      const now = new Date();
      return h > now.getHours() || (h === now.getHours() && m >= now.getMinutes());
    });
  const nextService = nextTodayApp ? services.find((s) => s.id === nextTodayApp.serviceId) : null;

  const sym = localeConfig.currency.symbol;

  // Appointments CSV export for the current date window
  const handleExportAppointments = () => {
    const svcMap = Object.fromEntries(services.map((s) => [s.id, s.name]));
    const staffMap = Object.fromEntries(staff.map((s) => [s.id, s.name]));
    const c = localeConfig.admin.common;
    const rows = filtered.map((a) => ({
      Date: a.date,
      Time: a.time,
      "Customer Name": a.customerName,
      "Customer Email": a.customerEmail,
      "Customer Phone": a.customerPhone,
      Service: svcMap[a.serviceId] ?? a.serviceId,
      Staff: staffMap[a.staffId] ?? a.staffId,
      Status: a.status,
      "Payment Status": a.paymentStatus ?? "",
    }));
    const columns = [
      { key: "Date", label: c.csvDate },
      { key: "Time", label: c.csvTime },
      { key: "Customer Name", label: c.csvCustomerName },
      { key: "Customer Email", label: c.csvCustomerEmail },
      { key: "Customer Phone", label: c.csvCustomerPhone },
      { key: "Service", label: c.csvService },
      { key: "Staff", label: c.csvStaff },
      { key: "Status", label: c.csvStatus },
      { key: "Payment Status", label: c.csvPaymentStatus },
    ];
    downloadBlob(buildCsvBlob(rows, columns), `appointments-${format(new Date(), "yyyy-MM-dd")}.csv`);
  };

  return (
    <div className="space-y-8">
      {/* ── Today at-a-glance strip ── */}
      <div className="overflow-hidden rounded-3xl border border-accent-light/20 bg-accent-light/[0.03]">
        <div className="flex items-center gap-2 border-b border-accent-light/10 px-5 py-3">
          <Zap size={13} className="text-accent-light" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-light/80">
            {localeConfig.admin.dashboard.stats.today} · {format(today, "EEEE, MMMM d")}
          </p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-accent-light/10 sm:grid-cols-4">
          <div className="px-5 py-5 text-center">
            <p className="text-3xl font-black tracking-tighter text-foreground">{todayApps.length}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.totalBookings}</p>
          </div>
          <div className="px-5 py-5 text-center">
            <p className="text-3xl font-black tracking-tighter text-emerald-500">{todayConfirmed}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.confirmed}</p>
          </div>
          <div className="px-5 py-5 text-center">
            <p className="text-3xl font-black tracking-tighter text-accent-light">{todayPending}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{localeConfig.admin.dashboard.stats.pending}</p>
          </div>
          <div className="px-5 py-5 text-center">
            <p className="text-3xl font-black tracking-tighter text-foreground">{sym}{todayRevenue.toFixed(0)}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{localeConfig.admin.dashboard.stats.revenue}</p>
          </div>
        </div>
        {nextTodayApp && (
          <div className="flex items-center gap-3 border-t border-accent-light/10 px-5 py-3">
            <Clock size={12} className="shrink-0 text-accent-light/60" />
            <p className="text-[11px] text-muted-foreground">
              <span className="font-black text-foreground">{nextTodayApp.time}</span>
              {" · "}
              {nextTodayApp.customerName}
              {nextService && <span className="text-muted-foreground/60"> — {nextService.name}</span>}
            </p>
          </div>
        )}
      </div>

      {/* Server-driven metrics dashboard (Bloque D). Legacy view below stays
          as a deeper-dive filter/export panel for the same data. */}
      <MetricsDashboard serviceNameById={serviceNameById} />

      {/* Header + range filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
            {t.subtitle}
          </p>
          <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-foreground">
            {t.title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/60 p-1">
            {(["7", "30", "custom"] as DateRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all",
                  range === r
                    ? "bg-accent-light text-zinc-950 shadow-lg shadow-accent-light/20"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r === "7" ? t.range7 : r === "30" ? t.range30 : t.rangeCustom}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleExportAppointments}
            disabled={filtered.length === 0}
            title={t.exportCsv}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-all hover:border-accent-light/40 hover:text-foreground disabled:opacity-40 active:scale-95"
          >
            <Download size={12} />
            {t.exportCsv}
          </button>
        </div>
      </div>

      {/* Custom range inputs */}
      {range === "custom" && (
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground"
          />
          <span className="text-xs text-muted-foreground">&ndash;</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground"
          />
        </div>
      )}

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 overflow-hidden rounded-3xl border border-border bg-card/90 p-6 shadow-elevated">
              <div className="h-2.5 w-20 animate-pulse rounded bg-muted/60" />
              <div className="h-8 w-16 animate-pulse rounded-lg bg-muted/60" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-red-500/30 bg-red-500/[0.02] p-16 text-center">
          <AlertCircle className="h-10 w-10 text-red-500/40" />
          <p className="text-[10px] font-black uppercase tracking-widest text-red-500">
            {t.errorLoad ?? "Could not load appointments."}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 rounded-xl border border-red-500/20 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-500 transition-colors hover:bg-red-500/10 active:scale-95"
          >
            <RefreshCw size={12} />
            {localeConfig.admin.common.refresh}
          </button>
        </div>
      ) : total === 0 ? (
        <div className="rounded-3xl border border-border bg-muted/40 p-12 text-center backdrop-blur-sm">
          <CalendarDays className="mx-auto mb-4 h-10 w-10 text-muted-foreground/30" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {t.noData}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            icon={CalendarDays}
            label={t.totalBookings}
            value={total}
            colorClass="text-foreground"
            borderClass="border-border"
          />
          <KpiCard
            icon={CheckCircle}
            label={t.confirmed}
            value={confirmed}
            colorClass="text-emerald-500"
            borderClass="border-emerald-500/20"
          />
          <KpiCard
            icon={Ban}
            label={t.cancelled}
            value={cancelled}
            colorClass="text-red-500"
            borderClass="border-red-500/20"
          />
          <KpiCard
            icon={TrendingDown}
            label={t.cancellationRate}
            value={`${cancelRate}%`}
            colorClass={cancelRate > 20 ? "text-red-500" : "text-muted-foreground"}
            borderClass={cancelRate > 20 ? "border-red-500/20" : "border-border"}
          />
          <KpiCard
            icon={DollarSign}
            label={t.estimatedRevenue}
            value={`${sym}${estimatedRevenue}`}
            colorClass="text-foreground"
            borderClass="border-border"
          />
          <KpiCard
            icon={UserPlus}
            label={t.newCustomers}
            value={newCustomers}
            colorClass="text-accent-light"
            borderClass="border-accent-light/20"
            hint={t.newCustomersHint}
          />
        </div>
      )}

      {/* Bookings trend chart */}
      {total > 0 && (
        <div className="overflow-hidden rounded-[28px] border border-border bg-card/95 shadow-elevated">
          <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-6 py-4">
            <TrendingUp size={14} className="text-accent-light" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {t.bookingsTrend}
            </p>
          </div>
          <div className="px-2 pb-4 pt-6 sm:px-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trendData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fontWeight: 700 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.6 }}
                  allowEscapeViewBox={{ x: false, y: false }}
                  wrapperStyle={{ zIndex: 50 }}
                />
                <Bar dataKey="confirmed" name={t.confirmed} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="cancelled" name={t.cancelled} fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Appointment type breakdown + gross revenue */}
      {total > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Type breakdown */}
          <div className="overflow-hidden rounded-[28px] border border-border bg-card/95 shadow-elevated">
            <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-6 py-4">
              <Tag size={14} className="text-accent-light" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {t.byType}
              </p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-border">
              <div className="px-5 py-6 text-center">
                <p className="text-2xl font-black tracking-tighter text-emerald-500">{typeBreakdown.paid}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.paidAppointments}</p>
              </div>
              <div className="px-5 py-6 text-center">
                <p className="text-2xl font-black tracking-tighter text-amber-500">{typeBreakdown.consult}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.freeConsultations}</p>
              </div>
              <div className="px-5 py-6 text-center">
                <p className="text-2xl font-black tracking-tighter text-indigo-500">{typeBreakdown.meet}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.meetings}</p>
              </div>
            </div>
          </div>

          {/* Gross revenue + avg */}
          <div className="overflow-hidden rounded-[28px] border border-border bg-card/95 shadow-elevated">
            <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-6 py-4">
              <Banknote size={14} className="text-accent-light" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {t.grossRevenue}
              </p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-border">
              <div className="px-5 py-6 text-center">
                <p className="text-2xl font-black tracking-tighter text-foreground">{sym}{typeBreakdown.grossRevenue.toFixed(0)}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.grossRevenue}</p>
              </div>
              <div className="px-5 py-6 text-center">
                <p className="text-2xl font-black tracking-tighter text-accent-light">{sym}{typeBreakdown.avgPerPaid.toFixed(0)}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.avgPerAppointment}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue by service */}
      {byService.length > 0 && (
        <div className="overflow-hidden rounded-[28px] border border-border bg-card/95 shadow-elevated">
          <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-6 py-4">
            <Scissors size={14} className="text-accent-light" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {t.revenueByService}
            </p>
          </div>
          <div className="divide-y divide-border">
            {byService.map(({ name, count, revenue }) => (
              <div key={name} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-foreground">{name}</span>
                  <span className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {count}x
                  </span>
                </div>
                <span className="text-sm font-black tracking-tight text-foreground">{sym}{revenue.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By-staff breakdown */}
      {byStaff.length > 0 && (
        <div className="overflow-hidden rounded-[28px] border border-border bg-card/95 shadow-elevated">
          <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-6 py-4">
            <Users size={14} className="text-accent-light" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {t.byStaff}
            </p>
          </div>
          <div className="divide-y divide-border">
            {byStaff.map(({ staffId, name, count }) => (
              <div key={staffId} className="flex items-center justify-between px-6 py-4">
                <span className="text-sm font-bold text-foreground">{name}</span>
                <span className="rounded-lg border border-border bg-muted/60 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent notification logs widget */}
      <div className="overflow-hidden rounded-[28px] border border-border bg-card/95 shadow-elevated">
        <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-6 py-4">
          <Bell size={14} className="text-accent-light" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {t.recentNotifications}
          </p>
        </div>
        {recentLogs.length === 0 ? (
          <div className="p-8 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {localeConfig.admin.notificationLogs.empty}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentLogs.map((log) => {
              const Icon = statusIcon[log.status];
              return (
                <div
                  key={log.id}
                  className="flex items-center gap-4 px-6 py-3 text-xs"
                >
                  <Icon size={14} className={statusColor[log.status]} />
                  <span className="w-28 shrink-0 font-mono text-[11px] text-muted-foreground">
                    {format(log.createdAt, "MMM d, HH:mm")}
                  </span>
                  <span className="w-16 shrink-0 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {log.type}
                  </span>
                  <span className="truncate text-muted-foreground" title={log.subject ?? ""}>
                    {log.subject ?? "—"}
                  </span>
                  {log.error && (
                    <span
                      className="ml-auto max-w-[200px] truncate text-[10px] text-red-500"
                      title={log.error}
                    >
                      {log.error}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  colorClass,
  borderClass,
  hint,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: number | string;
  colorClass: string;
  borderClass: string;
  hint?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl border bg-card/90 p-6 shadow-elevated backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg",
        borderClass
      )}
    >
      <div className="absolute right-0 top-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
        <Icon size={36} className={colorClass} />
      </div>
      <p
        className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground"
        title={hint}
      >
        {label}
      </p>
      <h4 className={cn("text-3xl font-black tracking-tighter", colorClass)}>
        {value}
      </h4>
    </div>
  );
}
