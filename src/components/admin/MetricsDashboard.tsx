import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Clock,
  DollarSign,
  Mail,
  PieChart as PieIcon,
  Scissors,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { localeConfig } from "../../config/locale";
import { TOUR_CONFIG } from "../../config/tour.config";
import { auth as firebaseAuth } from "../../lib/firebase";
import { cn } from "../../lib/utils";
import { format, parse } from "date-fns";
import { currencySymbol } from "../../lib/currency";

type CrmMetricsRange = "7d" | "30d" | "mtd" | "all";

type CrmMetricsResponse = {
  range: CrmMetricsRange;
  rangeStart: string | null;
  rangeEnd: string;
  newLeads: { count: number; prevPeriod: number; deltaPct: number };
  conversion: {
    leads: number;
    appointments: number;
    completed: number;
    completedRate: number;
  };
  revenue: {
    totalCents: number;
    prevPeriodCents: number;
    deltaPct: number;
    byDayCents: { date: string; cents: number }[];
  };
  topServices: { serviceId: string; count: number; revenueCents: number }[];
  busiestDays: { day: number; hour: number; count: number }[];
  upcomingAppointments: {
    id: string;
    date: string;
    time: string;
    client: string;
    serviceId: string;
  }[];
  unreadMessages: number;
  cancellationRate: number;
  noShowRate: number;
  newVsRecurring: { new: number; recurring: number };
  appointmentsTotal: number;
};

type FetchState =
  | { status: "loading" }
  | { status: "ready"; data: CrmMetricsResponse }
  | { status: "error"; message: string };

const RANGES: CrmMetricsRange[] = ["7d", "30d", "mtd", "all"];

const SERVICE_COLORS = ["#10b981", "#f59e0b", "#6366f1", "#ec4899", "#0ea5e9"];

async function getAdminAuthHeader(): Promise<Record<string, string>> {
  try {
    const user = firebaseAuth?.currentUser;
    if (!user) return {};
    const token = await user.getIdToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

function formatCurrency(cents: number, symbol: string): string {
  const v = Math.round(cents / 100);
  return `${symbol}${v.toLocaleString()}`;
}

function shortDateLabel(iso: string, range: CrmMetricsRange): string {
  try {
    const d = parse(iso, "yyyy-MM-dd", new Date());
    if (range === "7d") return format(d, "EEE");
    if (range === "30d" || range === "mtd") return format(d, "MMM d");
    return format(d, "MMM d");
  } catch {
    return iso;
  }
}

export function MetricsDashboard({
  serviceNameById,
}: {
  serviceNameById?: Record<string, string>;
}) {
  const t = localeConfig.admin.metrics;
  const overviewT = localeConfig.admin.overview;
  const sym = currencySymbol();

  const [range, setRange] = React.useState<CrmMetricsRange>("30d");
  const [state, setState] = React.useState<FetchState>({ status: "loading" });

  React.useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    (async () => {
      try {
        const headers = TOUR_CONFIG.isDemoMode ? {} : await getAdminAuthHeader();
        if (!TOUR_CONFIG.isDemoMode && !headers.Authorization) {
          if (!cancelled) {
            setState({ status: "error", message: t.errorUnauthenticated });
          }
          return;
        }
        const res = await fetch(`/api/crm-metrics?range=${range}`, { headers });
        if (!res.ok) {
          if (!cancelled) {
            setState({ status: "error", message: t.errorGeneric });
          }
          return;
        }
        const data = (await res.json()) as CrmMetricsResponse;
        if (!cancelled) setState({ status: "ready", data });
      } catch {
        if (!cancelled) setState({ status: "error", message: t.errorGeneric });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [range, t.errorGeneric, t.errorUnauthenticated]);

  const rangeLabel = (r: CrmMetricsRange) => {
    if (r === "7d") return t.range7d;
    if (r === "30d") return t.range30d;
    if (r === "mtd") return t.rangeMtd;
    return t.rangeAll;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
            {t.subtitle}
          </p>
          <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-foreground">
            {t.title}
          </h2>
        </div>
        <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/60 p-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all",
                range === r
                  ? "bg-accent-light text-zinc-950 shadow-lg shadow-accent-light/20"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {rangeLabel(r)}
            </button>
          ))}
        </div>
      </div>

      {state.status === "loading" && <LoadingSkeleton t={t} />}
      {state.status === "error" && (
        <div className="rounded-3xl border border-border bg-muted/40 p-12 text-center">
          <p className="text-[11px] font-bold text-muted-foreground">{state.message}</p>
        </div>
      )}

      {state.status === "ready" && (
        <MetricsBody
          data={state.data}
          range={range}
          sym={sym}
          t={t}
          overviewT={overviewT}
          serviceNameById={serviceNameById}
        />
      )}
    </div>
  );
}

function MetricsBody({
  data,
  range,
  sym,
  t,
  overviewT,
  serviceNameById,
}: {
  data: CrmMetricsResponse;
  range: CrmMetricsRange;
  sym: string;
  t: typeof localeConfig.admin.metrics;
  overviewT: typeof localeConfig.admin.overview;
  serviceNameById?: Record<string, string>;
}) {
  const empty = data.appointmentsTotal === 0 && data.newLeads.count === 0;

  if (empty) {
    return (
      <div className="rounded-3xl border border-border bg-muted/40 p-12 text-center">
        <Sparkles className="mx-auto mb-4 h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm font-black uppercase tracking-widest text-foreground">
          {t.emptyTitle}
        </p>
        <p className="mt-3 text-[11px] text-muted-foreground">{t.emptyBody}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiBig
          icon={DollarSign}
          label={t.kpiRevenue}
          value={formatCurrency(data.revenue.totalCents, sym)}
          delta={range === "all" ? undefined : data.revenue.deltaPct}
        />
        <KpiBig
          icon={UserPlus}
          label={t.kpiLeads}
          value={data.newLeads.count.toString()}
          delta={range === "all" ? undefined : data.newLeads.deltaPct}
        />
        <KpiBig
          icon={CalendarDays}
          label={t.kpiCompleted}
          value={data.conversion.completed.toString()}
          subtext={`${data.conversion.appointments} ${t.totalAppointments}`}
        />
        <KpiBig
          icon={TrendingUp}
          label={t.kpiConversion}
          value={`${data.conversion.completedRate}%`}
          subtext={`${data.conversion.leads} ${t.kpiLeads.toLowerCase()} → ${data.conversion.completed}`}
        />
      </div>

      {/* Row 2: Revenue trend + Top services */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-[28px] border border-border bg-card/95 shadow-elevated lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-6 py-4">
            <TrendingUp size={14} className="text-accent-light" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {t.revenueTrend}
            </p>
          </div>
          <div className="px-2 pb-4 pt-6 sm:px-4">
            {data.revenue.byDayCents.length === 0 ? (
              <div className="px-4 py-10 text-center text-[11px] font-bold text-muted-foreground">
                {t.noRevenue}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={data.revenue.byDayCents.map((d) => ({
                    label: shortDateLabel(d.date, range),
                    value: Math.round(d.cents / 100),
                  }))}
                  margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--accent-light))" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="hsl(var(--accent-light))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fontWeight: 700 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tickFormatter={(v: number) => `${sym}${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                    formatter={(v: number) => [`${sym}${v.toLocaleString()}`, t.kpiRevenue]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--accent-light))"
                    fill="url(#revGrad)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top services */}
        <div className="overflow-hidden rounded-[28px] border border-border bg-card/95 shadow-elevated">
          <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-6 py-4">
            <Scissors size={14} className="text-accent-light" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {t.topServices}
            </p>
          </div>
          {data.topServices.length === 0 ? (
            <div className="px-6 py-10 text-center text-[11px] font-bold text-muted-foreground">
              {t.noServices}
            </div>
          ) : (
            <div className="space-y-3 p-5">
              {data.topServices.map((s, i) => {
                const max = data.topServices[0]?.count ?? 1;
                const pct = Math.round((s.count / max) * 100);
                const name = serviceNameById?.[s.serviceId] ?? s.serviceId;
                return (
                  <div key={s.serviceId}>
                    <div className="mb-1.5 flex items-center justify-between text-[11px]">
                      <span className="truncate font-bold text-foreground">{name}</span>
                      <span className="ml-2 shrink-0 font-mono text-muted-foreground">
                        {s.count} · {formatCurrency(s.revenueCents, sym)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: SERVICE_COLORS[i % SERVICE_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Heatmap + New vs Recurring */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-[28px] border border-border bg-card/95 shadow-elevated lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-6 py-4">
            <Clock size={14} className="text-accent-light" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {t.busiestHeatmap}
            </p>
          </div>
          <BusiestHeatmap data={data.busiestDays} t={t} />
        </div>

        {/* New vs recurring donut */}
        <div className="overflow-hidden rounded-[28px] border border-border bg-card/95 shadow-elevated">
          <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-6 py-4">
            <Users size={14} className="text-accent-light" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {t.newVsRecurring}
            </p>
          </div>
          <NewVsRecurringDonut data={data.newVsRecurring} t={t} />
        </div>
      </div>

      {/* Row 4: Upcoming + Unread */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-[28px] border border-border bg-card/95 shadow-elevated lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-6 py-4">
            <CalendarDays size={14} className="text-accent-light" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {t.upcomingAppointments}
            </p>
          </div>
          {data.upcomingAppointments.length === 0 ? (
            <div className="p-8 text-center text-[11px] font-bold text-muted-foreground">
              {t.noUpcoming}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.upcomingAppointments.map((a) => {
                const serviceName = serviceNameById?.[a.serviceId] ?? a.serviceId;
                return (
                  <div key={a.id} className="flex items-center gap-3 px-6 py-3 text-xs">
                    <span className="w-16 shrink-0 font-mono text-[11px] font-bold text-accent-light">
                      {a.time}
                    </span>
                    <span className="w-24 shrink-0 font-mono text-[11px] text-muted-foreground">
                      {a.date}
                    </span>
                    <span className="truncate font-bold text-foreground">{a.client}</span>
                    <span className="ml-auto truncate text-muted-foreground">{serviceName}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Side cards: unread + rates */}
        <div className="flex flex-col gap-4">
          <SideStat
            icon={Mail}
            label={t.unreadMessages}
            value={data.unreadMessages.toString()}
            tone={data.unreadMessages > 0 ? "accent" : "muted"}
          />
          <SideStat
            icon={PieIcon}
            label={overviewT.cancellationRate}
            value={`${data.cancellationRate}%`}
            tone={data.cancellationRate > 20 ? "danger" : "muted"}
          />
          <SideStat
            icon={PieIcon}
            label={t.noShowRate}
            value={`${data.noShowRate}%`}
            tone={data.noShowRate > 15 ? "danger" : "muted"}
          />
        </div>
      </div>
    </div>
  );
}

function KpiBig({
  icon: Icon,
  label,
  value,
  delta,
  subtext,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  delta?: number;
  subtext?: string;
}) {
  const hasDelta = typeof delta === "number";
  const isPos = (delta ?? 0) >= 0;
  const deltaColor = isPos ? "text-emerald-500" : "text-red-500";
  const DeltaIcon = isPos ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-border bg-card/90 p-5 shadow-elevated transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="absolute right-0 top-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
        <Icon size={40} className="text-foreground" />
      </div>
      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
        {label}
      </p>
      <div className="flex items-end gap-2">
        <h4 className="text-2xl font-black tracking-tighter text-foreground lg:text-3xl">
          {value}
        </h4>
        {hasDelta && (
          <span className={cn("mb-1 inline-flex items-center gap-0.5 text-[10px] font-black", deltaColor)}>
            <DeltaIcon size={11} />
            {Math.abs(delta ?? 0)}%
          </span>
        )}
      </div>
      {subtext && (
        <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
          {subtext}
        </p>
      )}
    </div>
  );
}

function BusiestHeatmap({
  data,
  t,
}: {
  data: { day: number; hour: number; count: number }[];
  t: typeof localeConfig.admin.metrics;
}) {
  const map = new Map<string, number>();
  let maxCount = 0;
  for (const cell of data) {
    map.set(`${cell.day}-${cell.hour}`, cell.count);
    if (cell.count > maxCount) maxCount = cell.count;
  }

  // Determine hour bounds. Default 8-21 if no data.
  const hours = data.length > 0
    ? Array.from(new Set(data.map((d) => d.hour))).sort((a, b) => a - b)
    : Array.from({ length: 14 }, (_, i) => i + 8);
  const minHour = Math.max(7, Math.min(...hours, 9));
  const maxHour = Math.min(22, Math.max(...hours, 20));
  const hourList = Array.from({ length: maxHour - minHour + 1 }, (_, i) => i + minHour);

  // Day labels (Sun-Sat, 0-6). t.weekdayShort is an array.
  const dayLabels = t.weekdayShort;

  if (data.length === 0) {
    return (
      <div className="p-10 text-center text-[11px] font-bold text-muted-foreground">
        {t.noHeatmap}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto p-5">
      <div className="inline-grid gap-1" style={{ gridTemplateColumns: `auto repeat(${hourList.length}, minmax(20px, 1fr))` }}>
        {/* Empty top-left */}
        <div />
        {/* Hour headers */}
        {hourList.map((h) => (
          <div
            key={h}
            className="text-center text-[9px] font-mono text-muted-foreground/60"
          >
            {h}
          </div>
        ))}
        {/* Rows: one per day */}
        {[0, 1, 2, 3, 4, 5, 6].map((day) => (
          <React.Fragment key={day}>
            <div className="pr-2 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
              {dayLabels[day]}
            </div>
            {hourList.map((h) => {
              const count = map.get(`${day}-${h}`) ?? 0;
              const intensity = maxCount > 0 ? count / maxCount : 0;
              const bg = count === 0
                ? "hsl(var(--muted))"
                : `color-mix(in oklab, hsl(var(--accent-light)) ${Math.round(15 + intensity * 75)}%, transparent)`;
              return (
                <div
                  key={`${day}-${h}`}
                  className="aspect-square rounded-md border border-border/40 transition-transform hover:scale-110"
                  title={count > 0 ? `${dayLabels[day]} ${h}:00 — ${count}` : `${dayLabels[day]} ${h}:00`}
                  style={{ background: bg }}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[9px] font-mono uppercase tracking-widest text-muted-foreground/70">
        <span>{t.heatmapLess}</span>
        <div className="flex gap-0.5">
          {[0.1, 0.3, 0.55, 0.8, 1].map((i) => (
            <div
              key={i}
              className="h-2.5 w-3.5 rounded-sm border border-border/40"
              style={{
                background: `color-mix(in oklab, hsl(var(--accent-light)) ${Math.round(15 + i * 75)}%, transparent)`,
              }}
            />
          ))}
        </div>
        <span>{t.heatmapMore}</span>
      </div>
    </div>
  );
}

function NewVsRecurringDonut({
  data,
  t,
}: {
  data: { new: number; recurring: number };
  t: typeof localeConfig.admin.metrics;
}) {
  const total = data.new + data.recurring;
  if (total === 0) {
    return (
      <div className="p-10 text-center text-[11px] font-bold text-muted-foreground">
        {t.noCustomers}
      </div>
    );
  }
  const chartData = [
    { name: t.customersNew, value: data.new, color: "hsl(var(--accent-light))" },
    { name: t.customersRecurring, value: data.recurring, color: "hsl(var(--muted-foreground))" },
  ];
  const newPct = Math.round((data.new / total) * 100);
  return (
    <div className="flex flex-col items-center gap-2 p-5">
      <div className="relative h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              innerRadius={42}
              outerRadius={64}
              strokeWidth={0}
              startAngle={90}
              endAngle={-270}
              paddingAngle={2}
              isAnimationActive={false}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                fontSize: "11px",
                fontWeight: 700,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-black tracking-tighter text-foreground">{newPct}%</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
            {t.customersNew}
          </p>
        </div>
      </div>
      <div className="grid w-full grid-cols-2 gap-2 text-center">
        <div className="rounded-xl border border-border bg-muted/40 py-3">
          <p className="text-lg font-black tracking-tighter text-accent-light">{data.new}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
            {t.customersNew}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-muted/40 py-3">
          <p className="text-lg font-black tracking-tighter text-foreground">{data.recurring}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
            {t.customersRecurring}
          </p>
        </div>
      </div>
    </div>
  );
}

function SideStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  tone: "muted" | "accent" | "danger";
}) {
  const colorClass =
    tone === "accent" ? "text-accent-light" : tone === "danger" ? "text-red-500" : "text-foreground";
  const borderClass =
    tone === "accent"
      ? "border-accent-light/20"
      : tone === "danger"
      ? "border-red-500/20"
      : "border-border";
  return (
    <div className={cn("rounded-3xl border bg-card/90 p-5 shadow-elevated", borderClass)}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
          {label}
        </p>
        <Icon size={14} className={cn("opacity-50", colorClass)} />
      </div>
      <p className={cn("mt-2 text-3xl font-black tracking-tighter", colorClass)}>{value}</p>
    </div>
  );
}

function LoadingSkeleton({ t }: { t: typeof localeConfig.admin.metrics }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-3xl border border-border bg-muted/40"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="h-72 animate-pulse rounded-[28px] border border-border bg-muted/40 lg:col-span-2" />
        <div className="h-72 animate-pulse rounded-[28px] border border-border bg-muted/40" />
      </div>
      <p className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {t.loading}
      </p>
    </div>
  );
}

