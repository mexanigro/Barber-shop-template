import React from "react";
import {
  CalendarDays,
  CheckCircle,
  Ban,
  TrendingDown,
  DollarSign,
  Bell,
  AlertCircle,
  Clock,
  UserPlus,
  Users,
  Download,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Appointment, Customer, NotificationLog, Service, StaffMember } from "../../types";
import { notificationLogsService } from "../../services/notificationLogs";
import { customerService } from "../../services/customers";
import { aiService } from "../../services/ai";
import { localeConfig } from "../../config/locale";
import { cn } from "../../lib/utils";
import { buildCsvBlob, downloadBlob } from "../../lib/exportCsv";
import {
  format,
  subDays,
  startOfDay,
  isWithinInterval,
  parse,
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
}: {
  appointments: Appointment[];
  services: Service[];
  staff: StaffMember[];
}) {
  const t = localeConfig.admin.overview;

  const [range, setRange] = React.useState<DateRange>("7");
  const [customFrom, setCustomFrom] = React.useState(
    format(subDays(new Date(), 7), "yyyy-MM-dd")
  );
  const [customTo, setCustomTo] = React.useState(
    format(new Date(), "yyyy-MM-dd")
  );

  const [logs, setLogs] = React.useState<NotificationLog[]>([]);
  React.useEffect(() => {
    return notificationLogsService.subscribe(setLogs);
  }, []);

  // Load all customers once for this tenant (admin-only tab; bounded per tenant).
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  React.useEffect(() => {
    customerService.listCustomers().then(setCustomers).catch(() => {});
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

  // CRM AI snapshot state
  const [crmInsight, setCrmInsight] = React.useState<{
    summary: string;
    opportunities: string[];
    churnRisk: string;
  } | null>(null);
  const [crmAnalyzing, setCrmAnalyzing] = React.useState(false);
  const [crmError, setCrmError] = React.useState<string | null>(null);

  const runCrmAnalysis = async () => {
    setCrmAnalyzing(true);
    setCrmError(null);
    const kpis = { totalBookings: total, confirmed, cancelled, cancelRate, estimatedRevenue, newCustomers, totalCustomers: customers.length };
    const result = await aiService.analyzeCrmSnapshot(kpis, filtered.slice(0, 20));
    if ("error" in result) {
      setCrmError(result.error);
    } else {
      setCrmInsight({
        summary: result.summary,
        opportunities: result.opportunities,
        churnRisk: result.churnRisk,
      });
    }
    setCrmAnalyzing(false);
  };

  // Appointments CSV export for the current date window
  const handleExportAppointments = () => {
    const svcMap = Object.fromEntries(services.map((s) => [s.id, s.name]));
    const staffMap = Object.fromEntries(staff.map((s) => [s.id, s.name]));
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
      { key: "Date", label: "Date" },
      { key: "Time", label: "Time" },
      { key: "Customer Name", label: "Customer Name" },
      { key: "Customer Email", label: "Customer Email" },
      { key: "Customer Phone", label: "Customer Phone" },
      { key: "Service", label: "Service" },
      { key: "Staff", label: "Staff" },
      { key: "Status", label: "Status" },
      { key: "Payment Status", label: "Payment Status" },
    ];
    downloadBlob(buildCsvBlob(rows, columns), `appointments-${format(new Date(), "yyyy-MM-dd")}.csv`);
  };

  return (
    <div className="space-y-8">
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
      {total === 0 ? (
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
            value={`$${estimatedRevenue}`}
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

      {/* CRM AI Snapshot */}
      <div className="overflow-hidden rounded-[28px] border border-border bg-card/95 shadow-elevated">
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-accent-light" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {t.crmInsight}
            </p>
          </div>
          <button
            type="button"
            onClick={runCrmAnalysis}
            disabled={crmAnalyzing || total === 0}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-all hover:border-accent-light/40 hover:text-foreground disabled:opacity-40 active:scale-95"
          >
            {crmAnalyzing ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-accent-light border-t-transparent" />
            ) : (
              <RefreshCw size={11} />
            )}
            {crmAnalyzing ? t.crmAnalyzing : t.runCrmAnalysis}
          </button>
        </div>
        <div className="p-6">
          {crmError && !crmInsight && (
            <p className="text-[10px] font-bold text-red-500">{crmError}</p>
          )}
          {!crmInsight && !crmError && (
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {t.crmInsightSubtitle}
            </p>
          )}
          {crmInsight && (
            <div className="space-y-4">
              <p className="text-sm italic text-muted-foreground">"{crmInsight.summary}"</p>
              {crmInsight.opportunities.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-accent-light">
                    {t.crmOpportunities}
                  </p>
                  <ul className="space-y-1">
                    {crmInsight.opportunities.map((opp, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-light" />
                        {opp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {crmInsight.churnRisk && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-amber-500/70">
                    {t.crmChurnRisk}
                  </p>
                  <p className="text-xs text-muted-foreground">{crmInsight.churnRisk}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
