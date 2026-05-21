import React from "react";
import {
  Banknote,
  CreditCard,
  TrendingUp,
  Calendar,
  Download,
  CheckCircle,
  Clock,
  Ban,
  ArrowUpRight,
} from "lucide-react";
import { Appointment, Service, StaffMember } from "../../types";
import { localeConfig } from "../../config/locale";
import { buildCsvBlob, downloadBlob } from "../../lib/exportCsv";
import { cn } from "../../lib/utils";
import { format, startOfDay, parse, subDays, isWithinInterval } from "date-fns";

type DateRange = "7" | "30" | "custom";

const METHOD_COLORS: Record<string, string> = {
  cash: "text-emerald-500",
  card: "text-blue-500",
  transfer: "text-purple-500",
  other: "text-amber-500",
  stripe: "text-indigo-500",
};

export function PaymentsTab({
  appointments,
  services,
  staff,
}: {
  appointments: Appointment[];
  services: Service[];
  staff: StaffMember[];
}) {
  const t = localeConfig.admin.payments;
  const tOverview = localeConfig.admin.overview;
  const tDash = localeConfig.admin.dashboard;
  const sym = localeConfig.currency.symbol;

  const [range, setRange] = React.useState<DateRange>("7");
  const [customFrom, setCustomFrom] = React.useState(
    format(subDays(new Date(), 7), "yyyy-MM-dd"),
  );
  const [customTo, setCustomTo] = React.useState(
    format(new Date(), "yyyy-MM-dd"),
  );

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

  // Filter to only appointments with a payment record or completed status
  const filtered = React.useMemo(
    () =>
      appointments.filter((a) => {
        const d = startOfDay(parse(a.date, "yyyy-MM-dd", new Date()));
        return (
          isWithinInterval(d, { start: dateWindow.start, end: dateWindow.end }) &&
          a.status !== "cancelled"
        );
      }),
    [appointments, dateWindow],
  );

  const paidRows = React.useMemo(
    () =>
      filtered
        .filter((a) => a.paymentStatus === "paid" || a.amountPaidCents)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [filtered],
  );

  const totalRevenue = React.useMemo(
    () =>
      paidRows.reduce((acc, a) => {
        if (a.amountPaidCents != null) return acc + a.amountPaidCents / 100;
        const svc = services.find((s) => s.id === a.serviceId);
        return acc + (svc?.price ?? 0);
      }, 0),
    [paidRows, services],
  );

  const stripeRevenue = React.useMemo(
    () =>
      paidRows
        .filter((a) => a.stripeSessionId)
        .reduce((acc, a) => acc + (a.amountPaidCents ?? 0) / 100, 0),
    [paidRows],
  );

  const pendingCount = filtered.filter(
    (a) => !a.paymentStatus || a.paymentStatus === "pending",
  ).length;

  const todayTotal = React.useMemo(() => {
    const todayStr = format(today, "yyyy-MM-dd");
    return appointments
      .filter(
        (a) =>
          a.date === todayStr &&
          a.status !== "cancelled" &&
          (a.paymentStatus === "paid" || a.amountPaidCents),
      )
      .reduce((acc, a) => {
        if (a.amountPaidCents != null) return acc + a.amountPaidCents / 100;
        const svc = services.find((s) => s.id === a.serviceId);
        return acc + (svc?.price ?? 0);
      }, 0);
  }, [appointments, services, today]);

  const handleExport = () => {
    const svcMap = Object.fromEntries(services.map((s) => [s.id, s.name]));
    const staffMap = Object.fromEntries(staff.map((s) => [s.id, s.name]));
    const rows = paidRows.map((a) => ({
      Date: a.date,
      Time: a.time,
      Customer: a.customerName,
      Service: svcMap[a.serviceId] ?? a.serviceId,
      Staff: staffMap[a.staffId] ?? a.staffId,
      Amount: a.amountPaidCents != null
        ? (a.amountPaidCents / 100).toFixed(2)
        : (services.find((s) => s.id === a.serviceId)?.price ?? 0).toFixed(2),
      Method: a.stripeSessionId ? t.stripe : t.manual,
      Status: a.paymentStatus ?? "—",
    }));
    downloadBlob(
      buildCsvBlob(rows, [
        { key: "Date", label: localeConfig.admin.common.csvDate },
        { key: "Time", label: localeConfig.admin.common.csvTime },
        { key: "Customer", label: localeConfig.admin.common.csvCustomerName },
        { key: "Service", label: localeConfig.admin.common.csvService },
        { key: "Staff", label: localeConfig.admin.common.csvStaff },
        { key: "Amount", label: `${t.title} (${sym})` },
        { key: "Method", label: t.method },
        { key: "Status", label: localeConfig.admin.common.csvPaymentStatus },
      ]),
      `payments-${format(new Date(), "yyyy-MM-dd")}.csv`,
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
            {tDash.tabs.appointments}
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
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r === "7" ? tOverview.range7 : r === "30" ? tOverview.range30 : tOverview.rangeCustom}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={paidRows.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-all hover:border-accent-light/40 hover:text-foreground disabled:opacity-40 active:scale-95"
          >
            <Download size={12} />
            {t.exportCsv}
          </button>
        </div>
      </div>

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

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-4 sm:px-5">
          <p className="text-2xl font-black tracking-tight text-emerald-500 sm:text-3xl">
            {sym}{totalRevenue.toFixed(0)}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/60">
            {tOverview.grossRevenue}
          </p>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card/90 px-4 py-4 sm:px-5">
          <p className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {sym}{todayTotal.toFixed(0)}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {tDash.stats.today}
          </p>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.04] px-4 py-4 sm:px-5">
          <p className="text-2xl font-black tracking-tight text-indigo-500 sm:text-3xl">
            {sym}{stripeRevenue.toFixed(0)}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500/60">
            {t.stripe}
          </p>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-4 sm:px-5">
          <p className="text-2xl font-black tracking-tight text-amber-500 sm:text-3xl">
            {pendingCount}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500/60">
            {localeConfig.admin.dashboard.stats.pending}
          </p>
        </div>
      </div>

      {/* Payment rows */}
      {paidRows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-muted/40 p-16 text-center">
          <Banknote className="mx-auto mb-4 h-10 w-10 text-muted-foreground/20" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {t.noData}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-border bg-card/95 shadow-elevated">
          {/* Desktop table */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full border-separate border-spacing-0 text-left">
              <thead className="bg-muted/50 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                <tr>
                  <th className="border-b border-border px-5 py-4">{localeConfig.admin.common.csvDate}</th>
                  <th className="border-b border-border px-5 py-4">{localeConfig.admin.common.csvCustomerName}</th>
                  <th className="border-b border-border px-5 py-4">{localeConfig.admin.common.csvService}</th>
                  <th className="border-b border-border px-5 py-4">{localeConfig.admin.common.csvStaff}</th>
                  <th className="border-b border-border px-5 py-4 text-center">{t.method}</th>
                  <th className="border-b border-border px-5 py-4 text-right">{sym}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paidRows.map((app) => {
                  const svc = services.find((s) => s.id === app.serviceId);
                  const staffMember = staff.find((s) => s.id === app.staffId);
                  const amount =
                    app.amountPaidCents != null
                      ? app.amountPaidCents / 100
                      : (svc?.price ?? 0);
                  const method = app.stripeSessionId ? "stripe" : "manual";
                  return (
                    <tr key={app.id} className="hover:bg-foreground/[0.025]">
                      <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                        {app.date} {app.time}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-foreground">{app.customerName}</p>
                        {app.customerEmail?.startsWith("walkin_") && (
                          <span className="text-[9px] font-black uppercase tracking-wide text-accent-light/60">
                            {localeConfig.admin.dashboard.walkIn.label}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-block rounded-md border border-border bg-muted/50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          {svc?.name ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">
                        {staffMember?.name.split("'")[0] ?? "—"}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={cn("text-[10px] font-black uppercase tracking-widest", METHOD_COLORS[method])}>
                          {method === "stripe" ? <CreditCard size={13} className="mx-auto" /> : <Banknote size={13} className="mx-auto" />}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="font-mono text-sm font-black text-emerald-500">
                          {sym}{amount.toFixed(0)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="divide-y divide-border lg:hidden">
            {paidRows.map((app) => {
              const svc = services.find((s) => s.id === app.serviceId);
              const amount =
                app.amountPaidCents != null
                  ? app.amountPaidCents / 100
                  : (svc?.price ?? 0);
              const isStripe = !!app.stripeSessionId;
              return (
                <div key={app.id} className="flex items-center gap-3 px-4 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/60">
                    {isStripe ? (
                      <CreditCard size={14} className="text-indigo-500" />
                    ) : (
                      <Banknote size={14} className="text-emerald-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-foreground">{app.customerName}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {svc?.name ?? "—"} · {app.date} {app.time}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-sm font-black text-emerald-500">
                    {sym}{amount.toFixed(0)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending payments */}
      {pendingCount > 0 && (
        <div className="overflow-hidden rounded-[28px] border border-amber-500/20 bg-amber-500/[0.02]">
          <div className="flex items-center gap-2 border-b border-amber-500/10 px-5 py-4">
            <Clock size={13} className="text-amber-500" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500/80">
              {localeConfig.admin.dashboard.stats.pending} ({pendingCount})
            </p>
          </div>
          <div className="divide-y divide-amber-500/10">
            {filtered
              .filter((a) => !a.paymentStatus || a.paymentStatus === "pending")
              .map((app) => {
                const svc = services.find((s) => s.id === app.serviceId);
                return (
                  <div key={app.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">{app.customerName}</p>
                      <p className="text-[10px] text-muted-foreground">{svc?.name ?? "—"} · {app.date}</p>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-black text-amber-500">
                      {sym}{svc?.price ?? "—"}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
