// CRM-03 · diseño (clon de diseño): Pagos para una dueña de salón. Arriba el período y sus cifras; primero lo que falta cobrar, con
// «סמן כשולם» (el mismo diálogo que la agenda); después lo cobrado, cada pago con su método en hebreo (D-307); «רישום תשלום» para un
// cobro sin turno, con etiquetas reales y el teléfono obligatorio (CRM-02).
import React from "react";
import { tp } from "./crm03/textos-pantallas";
import { tx } from "./crm03/textos";
import { Download, Plus, RefreshCw, X } from "lucide-react";
import { Appointment, Service, StaffMember } from "../../types";
import { localeConfig } from "../../config/locale";
import { buildCsvBlob, downloadBlob } from "../../lib/exportCsv";
import { cn } from "../../lib/utils";
import { format, startOfDay, parse, subDays, startOfMonth, isSameDay, addDays } from "date-fns";
import { dbService } from "../../services/db";
import { crmAppointments } from "../../services/crm-appointments";
import { TOUR_CONFIG } from "../../config/tour.config";
import { useToast } from "../ui/Toast";
import { DialogoPago, metodos, nombreMetodo, useAncho } from "./crm03/AgendaDia";
import { cobradoDe, saldoDe } from "../../lib/cobros";

type Rango = "7" | "30" | "mes";
const RANGOS = (): [Rango, string][] => (["7", "30", "mes"] as Rango[]).map((r, i) => [r, tp().pay.ranges[i]]);
const shekel = (n: number) => `₪${Math.round(n).toLocaleString("he-IL")}`;
const enLinea = (a: Appointment) => !!(a.providerSessionId ?? a.stripeSessionId);
const metodo = (a: Appointment) => (enLinea(a) ? tp().pay.online : nombreMetodo(a.paymentMethod) ?? tp().pay.notSet);

function fecha(a: Appointment) {
  const d = parse(a.date, "yyyy-MM-dd", new Date());
  const hoy = new Date();
  const dia = isSameDay(d, hoy) ? tx().today : isSameDay(d, addDays(hoy, -1)) ? tp().common.yesterday : tx().weekday(tx().days[d.getDay()], format(d, "d.M"));
  return { dia, hora: a.time };
}

export function PaymentsTab({
  appointments,
  services,
  staff,
  isLoading = false,
}: {
  appointments: Appointment[];
  services: Service[];
  staff: StaffMember[];
  isLoading?: boolean;
  error?: string | null;
}) {
  const t = localeConfig.admin.payments;
  const toast = useToast();
  const ancho = useAncho("(min-width: 1024px)");
  const [rango, setRango] = React.useState<Rango>("30");
  const [formulario, setFormulario] = React.useState(false);
  const [cobrando, setCobrando] = React.useState<Appointment | null>(null);

  const hoy = startOfDay(new Date());
  // Como el servidor (crm-metrics): «7 ימים» = hoy y los 6 anteriores.
  const desde = rango === "7" ? subDays(hoy, 6) : rango === "30" ? subDays(hoy, 29) : startOfMonth(hoy);
  const ahora = new Date();
  const yaPaso = (a: Appointment) => parse(`${a.date} ${a.time}`, "yyyy-MM-dd HH:mm", new Date()) <= ahora;
  const precio = (a: Appointment) => services.find((s) => s.id === a.serviceId)?.price ?? 0;
  const monto = (a: Appointment) => cobradoDe(a, precio(a));
  const servicio = (a: Appointment) => services.find((s) => s.id === a.serviceId)?.name ?? "—";

  const delPeriodo = appointments.filter((a) => {
    const d = parse(a.date, "yyyy-MM-dd", new Date());
    return a.status !== "cancelled" && d >= desde && d <= hoy;
  });
  const pagados = delPeriodo.filter((a) => cobradoDe(a, precio(a)) > 0).sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1));
  // Lo que se debe: turnos que ya ocurrieron (confirmados o realizados) y quedaron con saldo. Un pendiente o vencido no es deuda.
  const porCobrar = delPeriodo.filter((a) => (a.status === "confirmed" || a.status === "completed") && yaPaso(a) && saldoDe(a, precio(a)) > 0).sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1));
  const cobrado = pagados.reduce((s, a) => s + monto(a), 0);
  const hoyStr = format(hoy, "yyyy-MM-dd");
  const cobradoHoy = pagados.filter((a) => a.date === hoyStr).reduce((s, a) => s + monto(a), 0);
  const deben = porCobrar.reduce((s, a) => s + saldoDe(a, precio(a)), 0);

  const exportar = () => {
    const staffMap = Object.fromEntries(staff.map((s) => [s.id, s.name]));
    const rows = pagados.map((a) => ({ Date: a.date, Time: a.time, Customer: a.customerName, Service: servicio(a), Staff: staffMap[a.staffId] ?? a.staffId, Amount: monto(a).toFixed(2), Method: metodo(a) }));
    const c = localeConfig.admin.common;
    downloadBlob(buildCsvBlob(rows, [
      { key: "Date", label: c.csvDate }, { key: "Time", label: c.csvTime }, { key: "Customer", label: c.csvCustomerName },
      { key: "Service", label: c.csvService }, { key: "Staff", label: c.csvStaff }, { key: "Amount", label: tp().pay.amountCsv }, { key: "Method", label: t.method },
    ]), `payments-${format(new Date(), "yyyy-MM-dd")}.csv`);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label={tp().pay.period} className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-card p-1 sm:inline-grid">
          {RANGOS().map(([r, n]) => (
            <button key={r} type="button" onClick={() => setRango(r)} aria-pressed={rango === r} className={cn("h-11 rounded-lg px-4 text-sm font-medium transition-colors", rango === r ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted")}>{n}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button type="button" onClick={() => setFormulario((v) => !v)} aria-expanded={formulario} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
            <Plus size={18} aria-hidden />{t.recordManual}
          </button>
          <button type="button" onClick={exportar} disabled={pagados.length === 0} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50">
            <Download size={16} aria-hidden />{t.exportCsv}
          </button>
        </div>
      </div>

      {formulario && <RegistroPago services={services} staff={staff} cerrar={() => setFormulario(false)} alGuardar={() => toast.success(t.manualPaymentSaved)} alFallar={() => toast.error(t.manualPaymentError)} />}

      <dl className="grid grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-card py-3">
        {([[tp().pay.collectedPeriod, shekel(cobrado), ""], [tp().pay.collectedToday, shekel(cobradoHoy), ""], [tp().pay.toCollect, shekel(deben), deben > 0 ? "text-amber-700 dark:text-amber-400" : ""]] as const).map(([et, v, c]) => (
          <div key={et} className="flex flex-col items-center gap-0.5 px-1">
            <dt className="text-xs text-muted-foreground">{et}</dt>
            <dd className={cn("text-lg font-semibold tabular-nums text-foreground", c)}>{v}</dd>
          </div>
        ))}
      </dl>

      {isLoading ? (
        <div aria-busy="true" className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted/60" />)}</div>
      ) : (
        <>
          {porCobrar.length > 0 && (
            <section aria-labelledby="crm03-lagvia" className="space-y-2">
              <h2 id="crm03-lagvia" className="text-base font-semibold text-foreground">{tp().pay.toCollect} <span className="font-normal text-muted-foreground">· {porCobrar.length}</span></h2>
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                {porCobrar.map((a) => {
                  const f = fecha(a);
                  return (
                    <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground">{a.customerName}</p>
                        <p className="text-sm text-muted-foreground">{servicio(a)} · {f.dia} <span dir="ltr" className="tabular-nums">{f.hora}</span></p>
                      </div>
                      <span className="whitespace-nowrap font-semibold tabular-nums text-foreground">{shekel(saldoDe(a, precio(a)))}</span>
                      <button type="button" onClick={() => setCobrando(a)} className="h-11 rounded-xl border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted">{tp().pay.markPaid}</button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section aria-labelledby="crm03-pagos" className="space-y-2">
            <h2 id="crm03-pagos" className="text-base font-semibold text-foreground">{tp().pay.paidList} <span className="font-normal text-muted-foreground">· {pagados.length}</span></h2>
            {pagados.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">{t.noData}</p>
            ) : ancho ? (
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 text-start font-medium">{tp().pay.thWhen}</th>
                      <th scope="col" className="px-3 py-2.5 text-start font-medium">{tp().pay.thClient}</th>
                      <th scope="col" className="px-3 py-2.5 text-start font-medium">{tp().pay.thWith}</th>
                      <th scope="col" className="px-3 py-2.5 text-start font-medium">{t.method}</th>
                      <th scope="col" className="px-4 py-2.5 text-end font-medium">{tp().pay.thAmount}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pagados.map((a) => {
                      const f = fecha(a);
                      return (
                        <tr key={a.id}>
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{f.dia} · <span dir="ltr" className="tabular-nums">{f.hora}</span></td>
                          <td className="px-3 py-3"><p className="font-semibold text-foreground">{a.customerName}</p><p className="text-muted-foreground">{servicio(a)}</p></td>
                          <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{staff.find((s) => s.id === a.staffId)?.name.split(" ")[0] ?? "—"}</td>
                          <td className="whitespace-nowrap px-3 py-3"><Metodo a={a} /></td>
                          <td className="whitespace-nowrap px-4 py-3 text-end font-semibold tabular-nums text-foreground">{shekel(monto(a))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                {pagados.map((a) => {
                  const f = fecha(a);
                  return (
                    <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground">{a.customerName}</p>
                        <p className="text-sm text-muted-foreground">{servicio(a)} · {f.dia} <span dir="ltr" className="tabular-nums">{f.hora}</span></p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="font-semibold tabular-nums text-foreground">{shekel(monto(a))}</span>
                        <Metodo a={a} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      {cobrando && (
        <DialogoPago
          turno={cobrando}
          precio={precio(cobrando)}
          servicio={servicio(cobrando)}
          cerrar={() => setCobrando(null)}
          guardar={async (pago) => {
            if (!TOUR_CONFIG.isDemoMode) await crmAppointments.cobrar(cobrando, pago);
            setCobrando(null);
          }}
        />
      )}
    </div>
  );
}

function Metodo({ a }: { a: Appointment }) {
  return <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">{metodo(a)}</span>;
}

function RegistroPago({ services, staff, cerrar, alGuardar, alFallar }: { services: Service[]; staff: StaffMember[]; cerrar: () => void; alGuardar: () => void; alFallar: () => void }) {
  const [f, setF] = React.useState({ nombre: "", telefono: "", monto: "", metodo: "cash" as NonNullable<Appointment["paymentMethod"]>, servicio: "", persona: "", fecha: format(new Date(), "yyyy-MM-dd"), hora: format(new Date(), "HH:mm") });
  const [guardando, setGuardando] = React.useState(false);
  const [intentado, setIntentado] = React.useState(false);
  const faltaTel = f.telefono.trim().length < 5;
  const listo = !!f.nombre.trim() && !faltaTel && Number(f.monto) > 0;
  const campo = "h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";
  const etiqueta = "mb-1.5 block text-sm font-medium text-foreground";
  const guardar = async () => {
    setIntentado(true);
    if (!listo) return;
    setGuardando(true);
    try {
      if (!TOUR_CONFIG.isDemoMode) {
        const svc = services.find((s) => s.id === f.servicio);
        await dbService.createAppointment({
          customerName: f.nombre.trim(), customerEmail: `manual_${Date.now()}@noemail.local`, customerPhone: f.telefono.trim(),
          serviceId: f.servicio || (services[0]?.id ?? ""), staffId: f.persona || (staff[0]?.id ?? ""), date: f.fecha, time: f.hora || format(new Date(), "HH:mm"),
          duration: svc?.duration ?? 30, status: "completed", type: "appointment", amountPaidCents: Math.round(Number(f.monto) * 100), paymentStatus: "paid", paymentMethod: f.metodo,
        });
      }
      alGuardar();
      cerrar();
    } catch (err) {
      console.error("[PaymentsTab] record payment:", err);
      alFallar();
    } finally {
      setGuardando(false);
    }
  };
  return (
    <section aria-labelledby="crm03-registro" className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="crm03-registro" className="text-base font-semibold text-foreground">{tp().pay.newTitle}</h2>
        <button type="button" aria-label={tp().common.close} onClick={cerrar} className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"><X size={20} /></button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="rp-nombre" className={etiqueta}>{tp().pay.name} <span aria-hidden className="text-red-700">*</span></label><input id="rp-nombre" required value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} className={campo} autoComplete="off" /></div>
        <div>
          <label htmlFor="rp-tel" className={etiqueta}>{tp().pay.phone} <span aria-hidden className="text-red-700">*</span></label>
          <input id="rp-tel" type="tel" inputMode="tel" required value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} aria-invalid={intentado && faltaTel} aria-describedby="rp-tel-ayuda" className={cn(campo, intentado && faltaTel && "border-red-600")} />
          <p id="rp-tel-ayuda" className={cn("mt-1 text-xs", intentado && faltaTel ? "text-red-700 dark:text-red-400" : "text-muted-foreground")}>{intentado && faltaTel ? tp().pay.phoneNeeded : tp().pay.phoneHelp}</p>
        </div>
        <div>
          <label htmlFor="rp-monto" className={etiqueta}>{tp().pay.amount} <span aria-hidden className="text-red-700">*</span></label>
          <div className="relative"><span className="pointer-events-none absolute inset-y-0 start-4 flex items-center text-muted-foreground">₪</span><input id="rp-monto" inputMode="decimal" required value={f.monto} onChange={(e) => setF({ ...f, monto: e.target.value })} className={cn(campo, "ps-9")} /></div>
        </div>
        <div><label htmlFor="rp-metodo" className={etiqueta}>{tp().pay.method}</label><select id="rp-metodo" value={f.metodo} onChange={(e) => setF({ ...f, metodo: e.target.value as typeof f.metodo })} className={campo}>{metodos().map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></div>
        <div><label htmlFor="rp-servicio" className={etiqueta}>{tp().pay.service} <span className="font-normal text-muted-foreground">{tp().common.optional}</span></label><select id="rp-servicio" value={f.servicio} onChange={(e) => setF({ ...f, servicio: e.target.value })} className={campo}><option value="">—</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        {staff.length > 1 && <div><label htmlFor="rp-persona" className={etiqueta}>{tp().pay.who}</label><select id="rp-persona" value={f.persona || staff[0]?.id} onChange={(e) => setF({ ...f, persona: e.target.value })} className={campo}>{staff.map((s) => <option key={s.id} value={s.id}>{s.name.split(" ")[0]}</option>)}</select></div>}
        <div><label htmlFor="rp-hora" className={etiqueta}>{tp().pay.time}</label><input id="rp-hora" type="time" value={f.hora} onChange={(e) => setF({ ...f, hora: e.target.value })} className={campo} /></div>
        <div><label htmlFor="rp-fecha" className={etiqueta}>{tp().pay.date}</label><input id="rp-fecha" type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} className={campo} /></div>
      </div>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={cerrar} className="h-11 rounded-xl border border-border px-5 text-sm font-medium text-foreground hover:bg-muted">{tp().common.cancel}</button>
        <button type="button" onClick={guardar} disabled={guardando} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-50">{guardando && <RefreshCw size={16} className="animate-spin" aria-hidden />}{tp().common.save}</button>
      </div>
    </section>
  );
}
