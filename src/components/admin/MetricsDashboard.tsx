// CRM-03 · diseño (clon de diseño): el tablero de la clienta para una dueña de salón, en una columna que se lee en el celular.
// Un solo rango para todo (lo controla DashboardTab); las cifras sin íconos de fondo; el gráfico corre de derecha a izquierda; el mapa
// de días y horas con los días en columnas (domingo a la derecha, como la agenda) para que entre a 390; nuevas y recurrentes en una
// barra; sin la tarjeta de inasistencias (no se puede calcular y no dice nada que la dueña pueda hacer).
import React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, Mail, RefreshCw } from "lucide-react";
import { localeConfig } from "../../config/locale";
import { TOUR_CONFIG } from "../../config/tour.config";
import { auth as firebaseAuth } from "../../lib/firebase";
import { cn } from "../../lib/utils";
import { addDays, format, isSameDay, parse } from "date-fns";
import { currencySymbol } from "../../lib/currency";

export type CrmMetricsRange = "7d" | "30d" | "mtd" | "all";

type CrmMetricsResponse = {
  range: CrmMetricsRange;
  rangeStart: string | null;
  rangeEnd: string;
  newLeads: { count: number; prevPeriod: number; deltaPct: number };
  conversion: { leads: number; appointments: number; completed: number; completedRate: number };
  revenue: { totalCents: number; prevPeriodCents: number; deltaPct: number; byDayCents: { date: string; cents: number }[] };
  topServices: { serviceId: string; count: number; revenueCents: number }[];
  busiestDays: { day: number; hour: number; count: number }[];
  upcomingAppointments: { id: string; date: string; time: string; client: string; serviceId: string }[];
  unreadMessages: number;
  cancellationRate: number;
  noShowRate: number | null;
  noShowRateReason?: "attendance_not_recorded";
  newVsRecurring: { new: number; recurring: number };
  appointmentsTotal: number;
};

type FetchState = { status: "loading" } | { status: "ready"; data: CrmMetricsResponse } | { status: "error"; message: string };

export const RANGES: CrmMetricsRange[] = ["7d", "30d", "mtd", "all"];
const DIAS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

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

const shekel = (cents: number, sym: string) => `${sym}${Math.round(cents / 100).toLocaleString("he-IL")}`;

function etiquetaDia(iso: string, range: CrmMetricsRange): string {
  try {
    const d = parse(iso, "yyyy-MM-dd", new Date());
    return range === "7d" ? DIAS[d.getDay()] : format(d, "d.M");
  } catch {
    return iso;
  }
}

function cuando(iso: string): string {
  const d = parse(iso, "yyyy-MM-dd", new Date());
  const hoy = new Date();
  if (isSameDay(d, hoy)) return "היום";
  if (isSameDay(d, addDays(hoy, 1))) return "מחר";
  return `יום ${DIAS[d.getDay()]} ${format(d, "d.M")}`;
}

export function rangoNombre(r: CrmMetricsRange) {
  const t = localeConfig.admin.metrics;
  return r === "7d" ? t.range7d : r === "30d" ? t.range30d : r === "mtd" ? "החודש" : t.rangeAll;
}

export function MetricsDashboard({
  serviceNameById,
  range,
  setRange,
  acciones,
  children,
}: {
  serviceNameById?: Record<string, string>;
  range: CrmMetricsRange;
  setRange: (r: CrmMetricsRange) => void;
  /** Acciones de la cabecera de la tabla (p. ej. ייצוא CSV). */
  acciones?: React.ReactNode;
  /** Secciones que calcula DashboardTab con el mismo rango (p. ej. por persona del equipo). */
  children?: React.ReactNode;
}) {
  const t = localeConfig.admin.metrics;
  const sym = currencySymbol();
  const [state, setState] = React.useState<FetchState>({ status: "loading" });
  const [intento, setIntento] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    (async () => {
      try {
        const headers = TOUR_CONFIG.isDemoMode ? {} : await getAdminAuthHeader();
        if (!TOUR_CONFIG.isDemoMode && !headers.Authorization) {
          if (!cancelled) setState({ status: "error", message: t.errorUnauthenticated });
          return;
        }
        const res = await fetch(`/api/crm-metrics?range=${range}`, { headers });
        if (!res.ok) {
          if (!cancelled) setState({ status: "error", message: t.errorGeneric });
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
  }, [range, intento, t.errorGeneric, t.errorUnauthenticated]);

  return (
    <section aria-labelledby="crm03-periodo" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="crm03-periodo" className="text-lg font-bold text-foreground">איך הולך לעסק</h2>
        {acciones}
      </div>
      <div role="group" aria-label="תקופה" className="grid grid-cols-4 gap-1 rounded-xl border border-border bg-card p-1 sm:inline-grid sm:w-auto">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            aria-pressed={range === r}
            className={cn("h-11 rounded-lg px-3 text-sm font-medium transition-colors", range === r ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted")}
          >
            {rangoNombre(r)}
          </button>
        ))}
      </div>

      {state.status === "loading" && (
        <div aria-busy="true" className="space-y-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted/60" />)}</div>
          <p className="text-center text-sm text-muted-foreground">{t.loading}</p>
        </div>
      )}
      {state.status === "error" && (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-foreground">{state.message}</p>
          <button type="button" onClick={() => setIntento((n) => n + 1)} className="flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted">
            <RefreshCw size={16} aria-hidden />
            {localeConfig.admin.common.refresh}
          </button>
        </div>
      )}
      {state.status === "ready" && <Cuerpo data={state.data} range={range} sym={sym} serviceNameById={serviceNameById} />}
      {state.status === "ready" && children}
    </section>
  );
}

export function Seccion({ titulo, nota, children, className }: { titulo: string; nota?: string; children: React.ReactNode; className?: string }) {
  const id = React.useId();
  return (
    <section aria-labelledby={id} className={cn("rounded-2xl border border-border bg-card p-4 sm:p-5", className)}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 id={id} className="text-base font-semibold text-foreground">{titulo}</h3>
        {nota && <p className="text-xs text-muted-foreground">{nota}</p>}
      </div>
      {children}
    </section>
  );
}

function Cuerpo({ data, range, sym, serviceNameById }: { data: CrmMetricsResponse; range: CrmMetricsRange; sym: string; serviceNameById?: Record<string, string> }) {
  const t = localeConfig.admin.metrics;
  const conDelta = range !== "all";
  if (data.appointmentsTotal === 0 && data.newLeads.count === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <p className="text-base font-medium text-foreground">{t.emptyTitle}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t.emptyBody}</p>
      </div>
    );
  }
  const nombre = (id: string) => serviceNameById?.[id] ?? id;
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Cifra etiqueta={t.kpiRevenue} valor={shekel(data.revenue.totalCents, sym)} delta={conDelta ? data.revenue.deltaPct : undefined} />
        <Cifra etiqueta="תורים" valor={String(data.conversion.appointments)} nota={`${data.conversion.completed} ${t.kpiCompleted}`} />
        <Cifra etiqueta="פניות חדשות" valor={String(data.newLeads.count)} delta={conDelta ? data.newLeads.deltaPct : undefined} />
        <Cifra etiqueta="ביטולים" valor={`${data.cancellationRate}%`} alerta={data.cancellationRate > 20} nota="מכלל התורים" />
      </dl>
      {data.unreadMessages > 0 && (
        <p className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground">
          <Mail size={18} aria-hidden className="shrink-0 text-muted-foreground" />
          <span><span className="font-semibold tabular-nums">{data.unreadMessages}</span> {t.unreadMessages} בתיבת הדואר</span>
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Seccion titulo={t.revenueTrend} className="lg:col-span-3">
          {data.revenue.byDayCents.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t.noRevenue}</p>
          ) : (
            <div dir="ltr" className="-mx-2">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.revenue.byDayCents.map((d) => ({ label: etiquetaDia(d.date, range), value: Math.round(d.cents / 100) }))} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="label" reversed tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis orientation="right" tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => `${sym}${v.toLocaleString("he-IL")}`} />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "12px", fontSize: "13px", direction: "rtl" }} cursor={{ fill: "var(--color-muted)", opacity: 0.6 }} formatter={(v: number) => [`${sym}${v.toLocaleString("he-IL")}`, t.kpiRevenue]} />
                  <Bar dataKey="value" fill="var(--color-primary)" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Seccion>

        <Seccion titulo={t.topServices} nota="לפי מספר תורים" className="lg:col-span-2">
          {data.topServices.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t.noServices}</p>
          ) : (
            <ol className="space-y-3">
              {data.topServices.map((s, _i, todos) => {
                const pct = Math.round((s.count / (todos[0]?.count || 1)) * 100);
                return (
                  <li key={s.serviceId}>
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 text-foreground">{nombre(s.serviceId)}</span>
                      <span className="shrink-0 whitespace-nowrap tabular-nums text-muted-foreground"><span className="font-semibold text-foreground">{s.count} תורים</span> · {shekel(s.revenueCents, sym)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
                  </li>
                );
              })}
            </ol>
          )}
        </Seccion>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-5">
        <Seccion titulo={t.busiestHeatmap} nota="לפי תורים בתקופה" className="lg:col-span-3">
          <MapaDiasHoras data={data.busiestDays} />
        </Seccion>
        <div className="grid gap-4 lg:col-span-2">
        <Seccion titulo="לקוחות חדשות וחוזרות">
          <NuevasRecurrentes data={data.newVsRecurring} />
        </Seccion>

      <Seccion titulo={t.upcomingAppointments}>
        {data.upcomingAppointments.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t.noUpcoming}</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.upcomingAppointments.map((a) => (
              <li key={a.id} className="flex items-baseline gap-3 py-2.5 text-sm">
                <span className="w-20 shrink-0 text-muted-foreground">{cuando(a.date)}</span>
                <span dir="ltr" className="w-12 shrink-0 text-end font-semibold tabular-nums text-foreground">{a.time}</span>
                <span className="min-w-0 flex-1"><span className="font-semibold text-foreground">{a.client}</span> <span className="text-muted-foreground">· {nombre(a.serviceId)}</span></span>
              </li>
            ))}
          </ul>
        )}
      </Seccion>
        </div>
      </div>
    </div>
  );
}

function Cifra({ etiqueta, valor, delta, nota, alerta }: { etiqueta: string; valor: string; delta?: number; nota?: string; alerta?: boolean }) {
  const sube = (delta ?? 0) >= 0;
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <dt className="text-sm text-muted-foreground">{etiqueta}</dt>
      <dd className="mt-1 flex flex-wrap items-baseline gap-x-2">
        <span className={cn("whitespace-nowrap text-2xl font-semibold tabular-nums", alerta ? "text-red-700 dark:text-red-400" : "text-foreground")}>{valor}</span>
        {typeof delta === "number" && (
          <span className={cn("inline-flex items-center gap-0.5 whitespace-nowrap text-xs font-semibold", sube ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400")}>
            {sube ? <ArrowUpRight size={14} aria-hidden /> : <ArrowDownRight size={14} aria-hidden />}
            <span dir="ltr">{Math.abs(delta)}%</span>
            <span className="sr-only">{sube ? "יותר" : "פחות"} מהתקופה הקודמת</span>
          </span>
        )}
      </dd>
      {nota && <dd className="mt-0.5 text-xs text-muted-foreground">{nota}</dd>}
    </div>
  );
}

/** Días en columnas (domingo primero: a la derecha en RTL) y horas en filas: entra entero a 390. */
function MapaDiasHoras({ data }: { data: { day: number; hour: number; count: number }[] }) {
  const t = localeConfig.admin.metrics;
  if (data.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">{t.noHeatmap}</p>;
  const map = new Map(data.map((c) => [`${c.day}-${c.hour}`, c.count]));
  const max = Math.max(...data.map((c) => c.count));
  const horas = data.map((d) => d.hour);
  const desde = Math.max(0, Math.min(...horas, 9));
  const hasta = Math.min(23, Math.max(...horas, 19));
  const lista = Array.from({ length: hasta - desde + 1 }, (_, i) => i + desde);
  const fondo = (n: number) => (n === 0 ? "var(--color-muted)" : `color-mix(in oklab, var(--color-primary) ${Math.round(25 + (n / max) * 75)}%, var(--color-card))`);
  return (
    <div>
      <div className="grid gap-1" style={{ gridTemplateColumns: "2.5rem repeat(7, minmax(0, 1fr))" }}>
        <div />
        {DIAS.map((d) => <div key={d} className="pb-1 text-center text-xs text-muted-foreground">{d}</div>)}
        {lista.map((h) => (
          <React.Fragment key={h}>
            <div dir="ltr" className="pe-1 text-end text-xs tabular-nums leading-6 text-muted-foreground">{String(h).padStart(2, "0")}:00</div>
            {DIAS.map((d, day) => {
              const n = map.get(`${day}-${h}`) ?? 0;
              return <div key={d} className="h-6 rounded" title={n > 0 ? `${d} ${h}:00 — ${n}` : `${d} ${h}:00`} style={{ background: fondo(n) }} />;
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted-foreground" aria-hidden>
        <span>{t.heatmapLess}</span>
        {[0, 0.33, 0.66, 1].map((i) => <span key={i} className="h-3 w-4 rounded-sm" style={{ background: i === 0 ? "var(--color-muted)" : `color-mix(in oklab, var(--color-primary) ${Math.round(25 + i * 75)}%, var(--color-card))` }} />)}
        <span>{t.heatmapMore}</span>
      </div>
    </div>
  );
}

function NuevasRecurrentes({ data }: { data: { new: number; recurring: number } }) {
  const total = data.new + data.recurring;
  if (total === 0) return <p className="py-8 text-center text-sm text-muted-foreground">{localeConfig.admin.metrics.noCustomers}</p>;
  const pct = Math.round((data.new / total) * 100);
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div><dt className="flex items-center gap-1.5 text-sm text-muted-foreground"><span aria-hidden className="h-2.5 w-2.5 rounded-full bg-primary" />חדשות</dt><dd className="text-2xl font-semibold tabular-nums text-foreground">{data.new}</dd></div>
        <div><dt className="flex items-center gap-1.5 text-sm text-muted-foreground"><span aria-hidden className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />חוזרות</dt><dd className="text-2xl font-semibold tabular-nums text-foreground">{data.recurring}</dd></div>
      </dl>
    </div>
  );
}
