/**
 * CRM metrics shared helpers.
 *
 * Used directly by `server.ts`. `api/index.ts` keeps an inline copy because
 * the Vercel `@vercel/node` bundler does not cross-import from `src/`
 * (see docs/ARCHITECTURE.md). Keep the two copies in sync.
 *
 * Pure functions only — no Firebase / no IO. The runtimes pass raw doc rows
 * to `computeCrmMetrics()` and it returns the response shape.
 */

export type CrmMetricsRange = "7d" | "30d" | "mtd" | "all";


export type MetricSourceCoverage = {
  state: "complete" | "partial" | "unknown";
  read: number;
  total: number | null;
  limit: number;
};
export type MetricSources = Record<"appointments" | "customers" | "contact_inbox" | "hub_leads", MetricSourceCoverage>;
export type MetricsCoverage = {
  state: "complete" | "partial" | "unknown" | "demo";
  source: "booking-backend";
  timeZone: "Asia/Jerusalem";
  asOf: string;
  leadSource: "hub_leads" | "contact_inbox";
  sources: MetricSources;
  periodTotal: number | null;
  quality: { invalidDates: number; invalidTimes: number; unknownStatuses: number; invalidLeadTimes: number; unknownInboxStatuses: number };
};

/** Sólo el lector de una consulta terminada puede afirmar queryComplete. La fila extra prueba truncamiento. */
export function metricSourceCoverage(received: number, queryComplete: boolean): MetricSourceCoverage {
  const partial = received > CRM_METRICS_DOC_CAP;
  return { state: !queryComplete ? "unknown" : partial ? "partial" : "complete",
    read: Math.min(received, CRM_METRICS_DOC_CAP), total: queryComplete && !partial ? received : null,
    limit: CRM_METRICS_DOC_CAP };
}

export type CrmMetricsResponse = {
  coverage: MetricsCoverage;
  range: CrmMetricsRange;
  rangeStart: string | null;
  rangeEnd: string;
  newLeads: { count: number; prevPeriod: number; deltaPct: number | null };
  conversion: {
    leads: number;
    appointments: number;
    completed: number;
    completedRate: number | null;
  };
  revenue: null;
  money: import("./reg/reading").RegReading;
  topServices: { serviceId: string; count: number; revenueCents: null }[];
  busiestDays: { day: number; hour: number; count: number }[];
  upcomingAppointments: {
    id: string;
    date: string;
    time: string;
    client: string;
    serviceId: string;
  }[];
  unreadMessages: number;
  cancellationRate: number | null;
  noShowRate: number | null;
  noShowRateReason: "attendance_not_recorded";
  newVsRecurring: { new: number; recurring: number } | null;
  appointmentsTotal: number;
};

export type RawAppointment = {
  id: string;
  status: string;
  serviceId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  amountPaidCents?: number;
  paymentStatus?: string;
  createdAtMs?: number;
};

export type RawCustomer = {
  id: string;
  phone?: string;
  email?: string;
  visitCount?: number;
};

export type RawInboxItem = {
  id: string;
  status: string;
  createdAtMs?: number;
};

export type RawLead = {
  id: string;
  createdAtMs?: number;
};

export type CrmMetricsInput = {
  sourceCoverage?: MetricSources;
  range: CrmMetricsRange;
  now: Date;
  appointments: RawAppointment[];
  customers: RawCustomer[];
  inbox: RawInboxItem[];
  /** Optional. If empty, lead count falls back to inbox count. */
  leads: RawLead[];
};

/** Day cap to avoid degrading queries on large tenants. */
export const CRM_METRICS_DOC_CAP = 5000;

/** In-memory cache TTL in ms. */
export const CRM_METRICS_CACHE_TTL_MS = 60_000;

export function isValidRange(value: unknown): value is CrmMetricsRange {
  return value === "7d" || value === "30d" || value === "mtd" || value === "all";
}

/** Día civil del negocio. Las Date internas de ventana codifican días en UTC, no instantes de medianoche de Israel. */
function israelDay(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  return get("year").padStart(4, "0") + "-" + get("month") + "-" + get("day");
}
function isoDay(day: Date): string { return day.toISOString().slice(0, 10); }
export function isValidMetricDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && isoDay(date) === value;
}
function validMetricTime(value: string): boolean { return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value); }
function knownMetricStatus(value: string): boolean { return ["pending", "confirmed", "completed", "cancelled", "expired"].includes(value); }

/** Ventanas inclusivas: hoy y seis/29 días anteriores; mtd desde el primero; all sin inferior. */
export function rangeWindow(range: CrmMetricsRange, now: Date): { start: Date | null; end: Date; startIso: string | null; endIso: string } {
  const endIso = israelDay(now), end = new Date(endIso + "T00:00:00Z");
  if (range === "all") return { start: null, end, startIso: null, endIso };
  const start = new Date(end);
  if (range === "mtd") start.setUTCDate(1);
  else start.setUTCDate(start.getUTCDate() - (range === "7d" ? 6 : 29));
  return { start, end, startIso: isoDay(start), endIso };
}
export function previousRangeWindow(range: CrmMetricsRange, now: Date): { start: Date | null; end: Date | null } {
  const current = rangeWindow(range, now);
  if (!current.start) return { start: null, end: null };
  const days = Math.round((current.end.getTime() - current.start.getTime()) / 86400000) + 1;
  const end = new Date(current.start); end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - days + 1);
  return { start, end };
}
function inDayRange(dateStr: string, startIso: string | null, endIso: string): boolean {
  if (!isValidMetricDate(dateStr)) return false;
  return (!startIso || dateStr >= startIso) && dateStr <= endIso;
}
function inMsRange(ms: number | undefined, start: Date | null, end: Date | null): boolean {
  if (typeof ms !== "number" || !Number.isFinite(ms) || !Number.isFinite(new Date(ms).getTime())) return false;
  const day = israelDay(new Date(ms));
  return (!start || day >= isoDay(start)) && (!end || day <= isoDay(end));
}

function deltaPct(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Compute every metric the dashboard renders, given raw rows already
 * fetched + filtered by clientId by the calling runtime.
 *
 * El lector entrega como máximo5000 filas y metadatos de la consulta terminada con testigo extra.
 */
export function computeCrmMetrics(input: CrmMetricsInput): CrmMetricsResponse {
  const { range, now, appointments, customers, inbox, leads } = input;
  const win = rangeWindow(range, now);
  const prev = previousRangeWindow(range, now);

  // ── Leads (hub_leads first, fallback to contact_inbox) ──────────────────
  const leadSource = leads.length > 0
    ? leads.map((l) => ({ createdAtMs: l.createdAtMs }))
    : inbox.map((i) => ({ createdAtMs: i.createdAtMs }));

  const newLeadsCount = leadSource.filter((l) =>
    inMsRange(l.createdAtMs, win.start, win.end) && l.createdAtMs! <= now.getTime(),
  ).length;
  const prevLeadsCount = leadSource.filter((l) =>
    prev.start ? inMsRange(l.createdAtMs, prev.start, prev.end) : false,
  ).length;

  // ── Appointments in range (using booking date, not createdAt) ───────────
  const apptsInRange = appointments.filter((a) =>
    inDayRange(a.date, win.startIso, win.endIso),
  );
  const completed = apptsInRange.filter((a) => a.status === "completed").length;
  const unknownStatuses = apptsInRange.filter(a => !knownMetricStatus(a.status)).length;
  const cancelled = apptsInRange.filter((a) => a.status === "cancelled").length;
  const cancellationRate = unknownStatuses > 0 ? null : apptsInRange.length > 0
    ? Math.round((cancelled / apptsInRange.length) * 100)
    : 0;

  // Los importes legacy no identifican dinero REG.
  const svcMap = new Map<string, { count: number; revenueCents: null }>();
  for (const a of apptsInRange) {
    if (!knownMetricStatus(a.status) || a.status === "cancelled") continue;
    const cur = svcMap.get(a.serviceId) ?? { count: 0, revenueCents: null as null };
    cur.count += 1;
    svcMap.set(a.serviceId, cur);
  }
  const topServices = [...svcMap.entries()]
    .map(([serviceId, v]) => ({ serviceId, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ── Busiest days heatmap (day of week × hour) ───────────────────────────
  const heatMap = new Map<string, number>();
  for (const a of apptsInRange) {
    if (!knownMetricStatus(a.status) || a.status === "cancelled") continue;
    if (!validMetricTime(a.time)) continue;
    const day = new Date(a.date + "T00:00:00Z").getUTCDay();
    const hour = Number(a.time.slice(0, 2));
    const key = `${day}-${hour}`;
    heatMap.set(key, (heatMap.get(key) ?? 0) + 1);
  }
  const busiestDays = [...heatMap.entries()].map(([key, count]) => {
    const [d, h] = key.split("-").map(Number);
    return { day: d, hour: h, count };
  });

  // ── Upcoming appointments (today onwards) ───────────────────────────────
  const todayIso = israelDay(now);
  const nowHm = new Intl.DateTimeFormat("en-GB", {timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hourCycle: "h23"}).format(now);
  const upcomingAppointments = appointments
    .filter((a) => {
      if (!isValidMetricDate(a.date) || !validMetricTime(a.time)) return false;
      if (a.status !== "confirmed" && a.status !== "pending") return false;
      if (a.date > todayIso) return true;
      if (a.date === todayIso && a.time >= nowHm) return true;
      return false;
    })
    .sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)))
    .slice(0, 10)
    .map((a) => ({
      id: a.id,
      date: a.date,
      time: a.time,
      client: a.customerName,
      serviceId: a.serviceId,
    }));

  // ── Unread messages ─────────────────────────────────────────────────────
  const unreadMessages = inbox.filter((i) => i.status === "new").length;

  // ── New vs recurring (cross-ref customers in range) ─────────────────────
  // A customer counts as "new" if visitCount <= 1, recurring otherwise.
  // Identify customers who had an appointment in the range, then look them
  // up against the customers collection by phone/email.
  const apptCustomerKeys = new Set<string>();
  for (const a of apptsInRange) {
    const key = (a.customerPhone || a.customerEmail || "").toLowerCase();
    if (key) apptCustomerKeys.add(key);
  }
  let newCount = 0;
  let recurringCount = 0;
  for (const key of apptCustomerKeys) {
    const customer = customers.find(
      (c) =>
        (c.phone ?? "").toLowerCase() === key ||
        (c.email ?? "").toLowerCase() === key,
    );
    const visits = customer?.visitCount ?? 1;
    if (visits <= 1) newCount += 1;
    else recurringCount += 1;
  }

  const sources: MetricSources = input.sourceCoverage ?? {
    appointments: metricSourceCoverage(appointments.length, false), customers: metricSourceCoverage(customers.length, false),
    contact_inbox: metricSourceCoverage(inbox.length, false), hub_leads: metricSourceCoverage(leads.length, false),
  };
  const leadSourceName = leads.length > 0 ? "hub_leads" : "contact_inbox";
  const invalidDates = appointments.filter(a => !isValidMetricDate(a.date)).length;
  const invalidTimes = apptsInRange.filter(a => !validMetricTime(a.time)).length;
  const invalidLeadTimes = leadSource.filter(l => !inMsRange(l.createdAtMs, null, null)).length;
  const unknownInboxStatuses = inbox.filter(i => !["new", "read", "replied", "archived"].includes(i.status)).length;
  const appointmentsComplete = sources.appointments.state === "complete" && invalidDates === 0 && unknownStatuses === 0;
  const leadsComplete = sources[leadSourceName].state === "complete" && sources.hub_leads.state === "complete" && invalidLeadTimes === 0;
  const customersComplete = sources.customers.state === "complete" && apptsInRange.every(a => Boolean(a.customerPhone || a.customerEmail)) && customers.every(c => typeof c.visitCount === "number" && Number.isFinite(c.visitCount)) && [...apptCustomerKeys].every(key => customers.some(c => ((c.phone ?? "").toLowerCase() === key || (c.email ?? "").toLowerCase() === key) && typeof c.visitCount === "number" && Number.isFinite(c.visitCount)));
  const hasUnknown = Object.values(sources).some(s => s.state === "unknown");
  const hasPartial = Object.values(sources).some(s => s.state === "partial") || invalidDates + invalidTimes + unknownStatuses + invalidLeadTimes + unknownInboxStatuses > 0;
  const coverage: MetricsCoverage = {
    state: hasUnknown ? "unknown" : hasPartial ? "partial" : "complete", source: "booking-backend", timeZone: "Asia/Jerusalem",
    asOf: now.toISOString(), leadSource: leadSourceName, sources,
    periodTotal: sources.appointments.state === "complete" && invalidDates === 0 ? apptsInRange.length : null,
    quality: { invalidDates, invalidTimes, unknownStatuses, invalidLeadTimes, unknownInboxStatuses },
  };

  return {
    coverage,
    range,
    rangeStart: win.startIso,
    rangeEnd: win.endIso,
    newLeads: {
      count: newLeadsCount,
      prevPeriod: prevLeadsCount,
      deltaPct: leadsComplete ? deltaPct(newLeadsCount, prevLeadsCount) : null,
    },
    conversion: {
      leads: newLeadsCount,
      appointments: apptsInRange.length,
      completed,
      completedRate: !appointmentsComplete || !leadsComplete ? null : newLeadsCount > 0
        ? Math.round((completed / newLeadsCount) * 100)
        : 0,
    },
    revenue: null,
    money: {reg:null,legacy:[],coverage:'error',error:'reg.not_loaded'},
    topServices,
    busiestDays,
    upcomingAppointments,
    unreadMessages,
    cancellationRate,
    // Los estados de cita no acreditan asistencia.
    noShowRate: null,
    noShowRateReason: "attendance_not_recorded",
    newVsRecurring: appointmentsComplete && customersComplete ? { new: newCount, recurring: recurringCount } : null,
    appointmentsTotal: apptsInRange.length,
  };
}

/**
 * Demo-mode realistic mock. Mirrors the shape exactly so the dashboard
 * renders without hitting Firestore in demo deploys.
 */
export function buildDemoCrmMetrics(range: CrmMetricsRange, now: Date): CrmMetricsResponse {
  const win = rangeWindow(range, now);
  const startIso = win.startIso;
  const endIso = win.endIso;

  // La demo no fabrica ingresos REG.
  const busiestDays: { day: number; hour: number; count: number }[] = [];
  for (let d = 0; d < 7; d += 1) {
    for (let h = 9; h <= 20; h += 1) {
      const intensity = (h >= 10 && h <= 13) || (h >= 17 && h <= 20)
        ? Math.round(2 + Math.sin(d + h) * 1.5 + (d === 5 || d === 6 ? 2 : 0))
        : Math.max(0, Math.round(1 + Math.cos(d - h)));
      if (intensity > 0) busiestDays.push({ day: d, hour: h, count: intensity });
    }
  }

  const todayIso = israelDay(now);
  const tomorrow = new Date(todayIso + "T00:00:00Z");
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowIso = isoDay(tomorrow);

  return {
    coverage: { ...computeCrmMetrics({range,now,appointments:[],customers:[],inbox:[],leads:[]}).coverage, state: "demo" },
    range,
    rangeStart: startIso,
    rangeEnd: endIso,
    newLeads: { count: 24, prevPeriod: 18, deltaPct: 33 },
    conversion: { leads: 24, appointments: 31, completed: 22, completedRate: 92 },
    revenue: null,
    money: {reg:null,legacy:[],coverage:'error',error:'reg.not_loaded'},
    topServices: [
      { serviceId: "haircut", count: 14, revenueCents: null },
      { serviceId: "beard-trim", count: 9, revenueCents: null },
      { serviceId: "fade", count: 6, revenueCents: null },
      { serviceId: "kids-cut", count: 4, revenueCents: null },
      { serviceId: "shave", count: 2, revenueCents: null },
    ],
    busiestDays,
    upcomingAppointments: [
      { id: "u1", date: todayIso, time: "16:30", client: "David Cohen", serviceId: "haircut" },
      { id: "u2", date: todayIso, time: "17:15", client: "Yossi Levi", serviceId: "fade" },
      { id: "u3", date: todayIso, time: "18:00", client: "Eli Mizrahi", serviceId: "beard-trim" },
      { id: "u4", date: tomorrowIso, time: "10:00", client: "Avi Shapira", serviceId: "haircut" },
      { id: "u5", date: tomorrowIso, time: "11:30", client: "Tomer Ben-David", serviceId: "kids-cut" },
      { id: "u6", date: tomorrowIso, time: "13:00", client: "Ronen Katz", serviceId: "haircut" },
    ],
    unreadMessages: 3,
    cancellationRate: 8,
    noShowRate: null,
    noShowRateReason: "attendance_not_recorded",
    newVsRecurring: { new: 9, recurring: 22 },
    appointmentsTotal: 31,
  };
}
