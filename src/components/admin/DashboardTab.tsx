// CRM-03 · diseño (clon de diseño): el Resumen de la dueña. Arriba «היום» con las mismas cuatro cifras que la agenda (las mismas
// cuentas: el ingreso del día suma lo cobrado de los pagados y el precio de los demás, sin los cancelados); debajo, el tablero del
// período con un solo rango, que también usan «por persona» y la exportación. Sale lo que repetía el tablero (las seis tarjetas, el
// gráfico de confirmados y cancelados, el desglose por tipo —en peluquería todo es «turno»—, la lista de servicios) y el registro de
// emails, que tiene su pestaña.
import React from "react";
import { useCustomerList } from "../../hooks/useCustomerList";
import { CustomerLoadNotice } from "./CustomerLoadNotice";
import { Clock, Download } from "lucide-react";
import { Appointment, Service, StaffMember } from "../../types";
import { localeConfig } from "../../config/locale";
import { buildCsvBlob, downloadBlob } from "../../lib/exportCsv";
import { MetricsDashboard, Seccion, type CrmMetricsRange } from "./MetricsDashboard";
import { currencySymbol } from "../../lib/currency";
import { cuentas } from "../../lib/cobros";
import { datePattern, getDateFnsLocale } from "../../lib/dateLocale";
import { plural, tx } from "./crm03/textos";
import { format, subDays, startOfDay, startOfMonth, parse } from "date-fns";



export function DashboardTab({
  appointments,
  services,
  staff,
}: {
  appointments: Appointment[];
  services: Service[];
  staff: StaffMember[];
  isLoading?: boolean;
  error?: string | null;
}) {
  const t = localeConfig.admin.overview;
  const sym = currencySymbol();
  const serviceNameById = React.useMemo(() => Object.fromEntries(services.map((s) => [s.id, s.name])), [services]);
  const [range, setRange] = React.useState<CrmMetricsRange>("30d");
  const { customers, loading: customersLoading, error: customersError, refresh: refreshCustomers } = useCustomerList();

  const today = startOfDay(new Date());
  const precio = (a: Appointment) => services.find((s) => s.id === a.serviceId)?.price ?? 0;

  // El período: el mismo que pide el tablero al servidor.
  const filtered = React.useMemo(() => {
    // Como el servidor (crm-metrics): «7 ימים» = hoy y los 6 anteriores.
    const desde = range === "7d" ? subDays(today, 6) : range === "30d" ? subDays(today, 29) : range === "mtd" ? startOfMonth(today) : null;
    return appointments.filter((a) => {
      const d = parse(a.date, "yyyy-MM-dd", new Date());
      return d <= today && (!desde || d >= desde);
    });
  }, [appointments, range, today.getTime()]);

  // Hoy: las mismas cuentas que la agenda.
  const todayStr = format(today, "yyyy-MM-dd");
  const todayApps = appointments.filter((a) => a.date === todayStr);
  const { activos: activosHoy, ingreso: todayRevenue } = cuentas(todayApps, precio);
  const todayConfirmed = todayApps.filter((a) => a.status === "confirmed" || a.status === "completed").length;
  const todayPending = todayApps.filter((a) => a.status === "pending").length;
  const ahora = new Date();
  const proximo = activosHoy
    .filter((a) => a.status === "pending" || a.status === "confirmed")
    .sort((a, b) => a.time.localeCompare(b.time))
    .find((a) => { const [h, m] = a.time.split(":").map(Number); return h > ahora.getHours() || (h === ahora.getHours() && m >= ahora.getMinutes()); });

  const porPersona = React.useMemo(() => {
    const n: Record<string, number> = {};
    for (const a of filtered) if (a.status !== "cancelled") n[a.staffId] = (n[a.staffId] ?? 0) + 1;
    return Object.entries(n).map(([id, count]) => ({ id, name: staff.find((s) => s.id === id)?.name ?? id, count })).sort((a, b) => b.count - a.count);
  }, [filtered, staff]);

  const exportar = () => {
    const staffMap = Object.fromEntries(staff.map((s) => [s.id, s.name]));
    const c = localeConfig.admin.common;
    const rows = filtered.map((a) => ({
      Date: a.date, Time: a.time, "Customer Name": a.customerName, "Customer Email": a.customerEmail, "Customer Phone": a.customerPhone,
      Service: serviceNameById[a.serviceId] ?? a.serviceId, Staff: staffMap[a.staffId] ?? a.staffId,
      Status: tx().status[a.status] ?? a.status, "Payment Status": tx().payStatus[a.paymentStatus ?? "pending"] ?? a.paymentStatus ?? "",
    }));
    const columns = [
      { key: "Date", label: c.csvDate }, { key: "Time", label: c.csvTime }, { key: "Customer Name", label: c.csvCustomerName },
      { key: "Customer Email", label: c.csvCustomerEmail }, { key: "Customer Phone", label: c.csvCustomerPhone }, { key: "Service", label: c.csvService },
      { key: "Staff", label: c.csvStaff }, { key: "Status", label: c.csvStatus }, { key: "Payment Status", label: c.csvPaymentStatus },
    ];
    downloadBlob(buildCsvBlob(rows, columns), `appointments-${format(new Date(), "yyyy-MM-dd")}.csv`);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <CustomerLoadNotice error={customersError} loading={customersLoading} hasData={customers.length > 0} onRetry={refreshCustomers} />

      <section aria-labelledby="crm03-hoy" className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="crm03-hoy" className="text-lg font-bold text-foreground">{tx().today}</h2>
          <p className="text-sm text-muted-foreground">{format(today, datePattern("EEEE, MMMM do"), { locale: getDateFnsLocale() })}</p>
        </div>
        <dl className="grid grid-cols-4 divide-x divide-border rounded-2xl border border-border bg-card py-3">
          {([[tx().statAppointments, String(activosHoy.length), false], [t.confirmed, String(todayConfirmed), false], [tx().statPending, String(todayPending), todayPending > 0], [tx().statRevenue, `${sym}${Math.round(todayRevenue).toLocaleString("he-IL")}`, false]] as const).map(([et, v, alerta]) => (
            <div key={et} className="flex flex-col items-center gap-0.5 px-1">
              <dt className="text-xs text-muted-foreground">{et}</dt>
              <dd className={alerta ? "text-lg font-semibold tabular-nums text-amber-700 dark:text-amber-400" : "text-lg font-semibold tabular-nums text-foreground"}>{v}</dd>
            </div>
          ))}
        </dl>
        {proximo && (
          <p className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground">
            <Clock size={18} aria-hidden className="shrink-0 text-muted-foreground" />
            <span>{tx().nextUp} <span dir="ltr" className="font-semibold tabular-nums">{proximo.time}</span> · {proximo.customerName} <span className="text-muted-foreground">· {serviceNameById[proximo.serviceId] ?? ""}</span></span>
          </p>
        )}
      </section>

      <MetricsDashboard
        serviceNameById={serviceNameById}
        range={range}
        setRange={setRange}
        acciones={
          <button type="button" onClick={exportar} disabled={filtered.length === 0} className="flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50">
            <Download size={16} aria-hidden />
            {t.exportCsv}
          </button>
        }
      >
        {porPersona.length > 1 && (
          <Seccion titulo={t.byStaff}>
            <ul className="space-y-3">
              {porPersona.map((p) => (
                <li key={p.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-foreground">{p.name}</span>
                    <span className="tabular-nums text-muted-foreground">{plural(p.count, tx().count)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden><div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((p.count / porPersona[0].count) * 100)}%` }} /></div>
                </li>
              ))}
            </ul>
          </Seccion>
        )}
      </MetricsDashboard>
    </div>
  );
}
