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

export type CrmMetricsResponse = {
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

/**
 * Compute the inclusive start/end window for a range as ISO YYYY-MM-DD.
 * - 7d  → today − 7 (inclusive)
 * - 30d → today − 30
 * - mtd → first day of current month
 * - all → no lower bound (returns null start)
 */
export function rangeWindow(
  range: CrmMetricsRange,
  now: Date,
): { start: Date | null; end: Date; startIso: string | null; endIso: string } {
  const end = startOfDay(now);
  const endIso = isoDay(end);
  if (range === "all") {
    return { start: null, end, startIso: null, endIso };
  }
  let start: Date;
  if (range === "mtd") {
    start = new Date(end.getFullYear(), end.getMonth(), 1);
  } else {
    const days = range === "7d" ? 7 : 30;
    start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
  }
  return { start, end, startIso: isoDay(start), endIso };
}

/**
 * Window covering the period immediately preceding `range`, same length, used
 * for delta % calculations. Returns null bounds for "all" (no prior window).
 */
export function previousRangeWindow(
  range: CrmMetricsRange,
  now: Date,
): { start: Date | null; end: Date | null } {
  if (range === "all") return { start: null, end: null };
  const current = rangeWindow(range, now);
  if (!current.start) return { start: null, end: null };
  const lengthDays = Math.round(
    (current.end.getTime() - current.start.getTime()) / 86_400_000,
  ) + 1;
  const prevEnd = new Date(current.start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (lengthDays - 1));
  return { start: prevStart, end: prevEnd };
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function inDayRange(dateStr: string, startIso: string | null, endIso: string): boolean {
  if (!dateStr) return false;
  if (startIso && dateStr < startIso) return false;
  if (dateStr > endIso) return false;
  return true;
}

function inMsRange(ms: number | undefined, start: Date | null, end: Date | null): boolean {
  if (!ms) return false;
  if (start && ms < start.getTime()) return false;
  if (end && ms > end.getTime() + 86_399_999) return false;
  return true;
}

function deltaPct(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Compute every metric the dashboard renders, given raw rows already
 * fetched + filtered by clientId by the calling runtime.
 *
 * Caller is responsible for capping reads at CRM_METRICS_DOC_CAP.
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
    win.start ? inMsRange(l.createdAtMs, win.start, win.end) : true,
  ).length;
  const prevLeadsCount = leadSource.filter((l) =>
    prev.start ? inMsRange(l.createdAtMs, prev.start, prev.end) : false,
  ).length;

  // ── Appointments in range (using booking date, not createdAt) ───────────
  const apptsInRange = appointments.filter((a) =>
    inDayRange(a.date, win.startIso, win.endIso),
  );
  const prevAppts = appointments.filter((a) =>
    inDayRange(a.date, prev.start ? isoDay(prev.start) : null, prev.end ? isoDay(prev.end) : win.endIso),
  );

  const completed = apptsInRange.filter((a) => a.status === "completed").length;
  const cancelled = apptsInRange.filter((a) => a.status === "cancelled").length;
  const noShow = apptsInRange.filter((a) => a.status === "no_show" || a.status === "expired").length;
  const cancellationRate = apptsInRange.length > 0
    ? Math.round((cancelled / apptsInRange.length) * 100)
    : 0;
  const noShowRate = completed + noShow > 0
    ? Math.round((noShow / (completed + noShow)) * 100)
    : 0;

  // ── Revenue ─────────────────────────────────────────────────────────────
  const isPaid = (a: RawAppointment) =>
    a.paymentStatus === "paid" || a.paymentStatus === "deposit_paid";

  const totalRevenueCents = apptsInRange
    .filter(isPaid)
    .reduce((acc, a) => acc + (a.amountPaidCents ?? 0), 0);
  const prevRevenueCents = prevAppts
    .filter(isPaid)
    .reduce((acc, a) => acc + (a.amountPaidCents ?? 0), 0);

  // Build byDay series. Skip for "all" range (would be unbounded).
  const byDayCents: { date: string; cents: number }[] = [];
  if (win.start) {
    const byDayMap = new Map<string, number>();
    for (const a of apptsInRange) {
      if (!isPaid(a)) continue;
      byDayMap.set(a.date, (byDayMap.get(a.date) ?? 0) + (a.amountPaidCents ?? 0));
    }
    const cursor = new Date(win.start);
    while (cursor <= win.end) {
      const iso = isoDay(cursor);
      byDayCents.push({ date: iso, cents: byDayMap.get(iso) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
  } else {
    // For "all", group by day from raw appts (no skeleton).
    const byDayMap = new Map<string, number>();
    for (const a of apptsInRange) {
      if (!isPaid(a)) continue;
      byDayMap.set(a.date, (byDayMap.get(a.date) ?? 0) + (a.amountPaidCents ?? 0));
    }
    const sortedDates = [...byDayMap.keys()].sort();
    for (const date of sortedDates) {
      byDayCents.push({ date, cents: byDayMap.get(date) ?? 0 });
    }
  }

  // ── Top services ────────────────────────────────────────────────────────
  const svcMap = new Map<string, { count: number; revenueCents: number }>();
  for (const a of apptsInRange) {
    if (a.status === "cancelled") continue;
    const cur = svcMap.get(a.serviceId) ?? { count: 0, revenueCents: 0 };
    cur.count += 1;
    if (isPaid(a)) cur.revenueCents += a.amountPaidCents ?? 0;
    svcMap.set(a.serviceId, cur);
  }
  const topServices = [...svcMap.entries()]
    .map(([serviceId, v]) => ({ serviceId, ...v }))
    .sort((a, b) => b.count - a.count || b.revenueCents - a.revenueCents)
    .slice(0, 5);

  // ── Busiest days heatmap (day of week × hour) ───────────────────────────
  const heatMap = new Map<string, number>();
  for (const a of apptsInRange) {
    if (a.status === "cancelled") continue;
    // Parse date as local-noon to avoid TZ rollover.
    const [yyyy, mm, dd] = a.date.split("-").map((n) => Number(n));
    if (!yyyy || !mm || !dd) continue;
    const day = new Date(yyyy, mm - 1, dd).getDay(); // 0 = Sunday
    const hour = Number(a.time.split(":")[0]);
    if (!Number.isFinite(hour)) continue;
    const key = `${day}-${hour}`;
    heatMap.set(key, (heatMap.get(key) ?? 0) + 1);
  }
  const busiestDays = [...heatMap.entries()].map(([key, count]) => {
    const [d, h] = key.split("-").map(Number);
    return { day: d, hour: h, count };
  });

  // ── Upcoming appointments (today onwards) ───────────────────────────────
  const todayIso = isoDay(startOfDay(now));
  const nowHm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const upcomingAppointments = appointments
    .filter((a) => {
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

  return {
    range,
    rangeStart: win.startIso,
    rangeEnd: win.endIso,
    newLeads: {
      count: newLeadsCount,
      prevPeriod: prevLeadsCount,
      deltaPct: deltaPct(newLeadsCount, prevLeadsCount),
    },
    conversion: {
      leads: newLeadsCount,
      appointments: apptsInRange.length,
      completed,
      completedRate: newLeadsCount > 0
        ? Math.round((completed / newLeadsCount) * 100)
        : 0,
    },
    revenue: {
      totalCents: totalRevenueCents,
      prevPeriodCents: prevRevenueCents,
      deltaPct: deltaPct(totalRevenueCents, prevRevenueCents),
      byDayCents,
    },
    topServices,
    busiestDays,
    upcomingAppointments,
    unreadMessages,
    cancellationRate,
    noShowRate,
    newVsRecurring: { new: newCount, recurring: recurringCount },
    appointmentsTotal: apptsInRange.length,
  };
}

/**
 * Demo-mode realistic mock. Mirrors the shape exactly so the dashboard
 * renders without hitting Firestore in demo deploys.
 */
export function buildDemoCrmMetrics(range: CrmMetricsRange, now: Date): CrmMetricsResponse {
  const win = rangeWindow(range, now);
  const startIso = win.startIso ?? isoDay(new Date(now.getFullYear(), now.getMonth() - 2, 1));
  const endIso = win.endIso;

  // Synthesize a daily revenue curve with weekend peaks.
  const byDayCents: { date: string; cents: number }[] = [];
  const start = win.start ?? new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const cursor = new Date(start);
  while (cursor <= win.end) {
    const dow = cursor.getDay();
    const base = dow === 0 || dow === 6 ? 45_000 : 22_000;
    const jitter = Math.floor((Math.sin(cursor.getDate() * 1.7) + 1) * 8_000);
    byDayCents.push({ date: isoDay(cursor), cents: base + jitter });
    cursor.setDate(cursor.getDate() + 1);
  }
  const totalCents = byDayCents.reduce((acc, d) => acc + d.cents, 0);
  const prevPeriodCents = Math.round(totalCents * 0.83);

  // Busiest hours skew toward 10-13 and 17-20.
  const busiestDays: { day: number; hour: number; count: number }[] = [];
  for (let d = 0; d < 7; d += 1) {
    for (let h = 9; h <= 20; h += 1) {
      const intensity = (h >= 10 && h <= 13) || (h >= 17 && h <= 20)
        ? Math.round(2 + Math.sin(d + h) * 1.5 + (d === 5 || d === 6 ? 2 : 0))
        : Math.max(0, Math.round(1 + Math.cos(d - h)));
      if (intensity > 0) busiestDays.push({ day: d, hour: h, count: intensity });
    }
  }

  const todayIso = isoDay(startOfDay(now));
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = isoDay(tomorrow);

  return {
    range,
    rangeStart: startIso,
    rangeEnd: endIso,
    newLeads: { count: 24, prevPeriod: 18, deltaPct: 33 },
    conversion: { leads: 24, appointments: 31, completed: 22, completedRate: 92 },
    revenue: {
      totalCents,
      prevPeriodCents,
      deltaPct: deltaPct(totalCents, prevPeriodCents),
      byDayCents,
    },
    topServices: [
      { serviceId: "haircut", count: 14, revenueCents: 420_00 },
      { serviceId: "beard-trim", count: 9, revenueCents: 180_00 },
      { serviceId: "fade", count: 6, revenueCents: 210_00 },
      { serviceId: "kids-cut", count: 4, revenueCents: 80_00 },
      { serviceId: "shave", count: 2, revenueCents: 50_00 },
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
    noShowRate: 4,
    newVsRecurring: { new: 9, recurring: 22 },
    appointmentsTotal: 31,
  };
}
