// CRM-03 · diseño (prototipo en el clon de diseño, no en T): la agenda del día del CRM.
// Una tira de la semana (domingo a sábado) en lugar del calendario de mes; el mes, a un toque. Cada turno, una tarjeta con su acción
// principal según el estado (pendiente → אישור; confirmado sin pagar → סמן כשולם), «שינוי מועד» y «עוד פעולות» (llamar, WhatsApp,
// cancelar). Los diálogos de pago y de cambio de hora son hojas desde abajo en el celular y ventanas centradas en la computadora.
import React from "react";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { AlertCircle, ChevronLeft, ChevronRight, CalendarDays, Check, Clock, Loader2, MoreHorizontal, Phone, Plus, RotateCcw, X, Ban, MessageCircle } from "lucide-react";
import type { Appointment, AppointmentStatus, Service, StaffMember } from "../../../types";
import { datePattern, getDateFnsLocale } from "../../../lib/dateLocale";
import { tx } from "./textos";
import { Calendar } from "../../ui/calendar";
import { useModalA11y } from "../../../hooks/useModalA11y";
import { cn } from "../../../lib/utils";
import { cobradoDe, cuentas, estaPagado, leerMonto, pagoNuevo, saldoDe, type Cobro } from "../../../lib/cobros";
import { waNumero } from "../../../lib/telefono";

const METODOS_K = ["cash", "card", "transfer", "other"] as const;
export const metodos = (): [NonNullable<Appointment["paymentMethod"]>, string][] => METODOS_K.map((k) => [k, tx().methods[k]]);
export const nombreMetodo = (m?: string) => metodos().find(([k]) => k === m)?.[1];
const shekel = (n: number) => `₪${n.toLocaleString("he-IL")}`;
const fechaLarga = (d: Date) => format(d, datePattern("EEEE, MMMM do"), { locale: getDateFnsLocale() });

type Props = {
  fecha: Date;
  setFecha: (d: Date) => void;
  turnosDelDia: Appointment[];
  todos: Appointment[];
  staff: StaffMember[];
  servicios: Service[];
  filtroPersona: string;
  setFiltroPersona: (id: string) => void;
  sola: boolean;
  alCambiarEstado: (id: string, s: AppointmentStatus) => void;
  alMover: (id: string, fecha: string, hora: string) => Promise<void> | void;
  alCobrar: (turno: Appointment, pago: PagoDelDialogo) => Promise<void>;
  alNuevo: () => void;
  /** D-305: la empleada ve sus turnos pero no cobra ni ve las cifras de dinero. */
  puedeCobrar?: boolean;
};

type Pagable = NonNullable<Appointment["paymentMethod"]>;
/** CRM-04 (D-344): lo que sale del diálogo de cobro: el cobro que va al servidor (el monto que entra ahora) y, para la demo, cómo queda. */
export type PagoDelDialogo = Cobro & ReturnType<typeof pagoNuevo>;

export function AgendaDia(p: Props) {
  const t = tx();
  const [mes, setMes] = React.useState(false);
  const [cobrando, setCobrando] = React.useState<Appointment | null>(null);
  const [moviendo, setMoviendo] = React.useState<Appointment | null>(null);
  const [menu, setMenu] = React.useState<string | null>(null);
  const [cancelando, setCancelando] = React.useState<Appointment | null>(null);
  const puedeCobrar = p.puedeCobrar !== false;
  const ancho = useAncho("(min-width: 1024px)");
  const hoy = new Date();
  const inicio = startOfWeek(p.fecha, { weekStartsOn: 0 });
  const semana = Array.from({ length: 7 }, (_, i) => addDays(inicio, i));
  const conTurnos = new Set(p.todos.filter((a) => a.status !== "cancelled").map((a) => a.date));
  const precio = (a: Appointment) => p.servicios.find((s) => s.id === a.serviceId)?.price ?? 0;
  const { activos, pendientes, ingreso, cobrado } = cuentas(p.turnosDelDia, precio);
  const acciones = (a: Appointment, fila = false) => (
    <Acciones a={a} precio={precio(a)} puedeCobrar={puedeCobrar} menu={menu} setMenu={setMenu} fila={fila}
      confirmar={() => p.alCambiarEstado(a.id, "confirmed")} cancelar={() => setCancelando(a)} cobrar={() => setCobrando(a)} mover={() => setMoviendo(a)} />
  );
  const restaurar = (a: Appointment) => (
    <button type="button" onClick={() => p.alCambiarEstado(a.id, "confirmed")} className="mt-3 flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-muted"><RotateCcw size={16} aria-hidden />{t.restore}</button>
  );

  return (
    <section aria-label={t.region} className="mx-auto max-w-3xl space-y-4 lg:max-w-5xl">
      {/* El día y la semana */}
      <div className="rounded-2xl border border-border bg-card p-3 sm:p-4">
        <h3 className="mb-2 text-lg font-bold text-foreground">{fechaLarga(p.fecha)}</h3>
        <div className="mb-2 flex items-center gap-2">
          <button type="button" aria-label={t.prevWeek} onClick={() => p.setFecha(addDays(p.fecha, -7))} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-foreground hover:bg-muted"><ChevronRight size={20} aria-hidden className="ltr:rotate-180" /></button>
          <button type="button" aria-label={t.nextWeek} onClick={() => p.setFecha(addDays(p.fecha, 7))} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-foreground hover:bg-muted"><ChevronLeft size={20} aria-hidden className="ltr:rotate-180" /></button>
          {!isSameDay(p.fecha, hoy) && (
            <button type="button" onClick={() => p.setFecha(hoy)} className="h-11 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-muted">{t.today}</button>
          )}
          <button type="button" onClick={() => setMes((v) => !v)} aria-expanded={mes} className={cn("ms-auto flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium", mes ? "border-foreground/30 bg-muted text-foreground" : "border-border text-foreground hover:bg-muted")}>
            <CalendarDays size={18} aria-hidden /> {t.month}
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {semana.map((d, i) => {
            const sel = isSameDay(d, p.fecha), esHoy = isSameDay(d, hoy), hay = conTurnos.has(format(d, "yyyy-MM-dd"));
            return (
              <button key={i} type="button" onClick={() => p.setFecha(d)} aria-pressed={sel} aria-label={`${fechaLarga(d)}${hay ? ` · ${t.hasAppointments}` : ""}`}
                className={cn("relative flex min-h-14 min-w-0 flex-col items-center justify-center rounded-xl text-foreground transition-colors", sel ? "bg-primary text-primary-foreground" : esHoy ? "ring-1 ring-inset ring-foreground/30" : "hover:bg-muted")}>
                <span className={cn("text-xs", sel ? "text-primary-foreground" : "text-muted-foreground")}>{t.days[i]}</span>
                <span className="text-base font-semibold tabular-nums">{d.getDate()}</span>
                {hay && <span aria-hidden className={cn("absolute bottom-1.5 h-1 w-1 rounded-full", sel ? "bg-primary-foreground" : "bg-foreground/50")} />}
              </button>
            );
          })}
        </div>
        {mes && (
          <div className="mt-3 flex justify-center border-t border-border pt-3">
            <Calendar grande selected={p.fecha} onSelect={(d) => { p.setFecha(d); setMes(false); }} className="max-w-full border-0 bg-transparent shadow-none" />
          </div>
        )}
      </div>

      {/* Quién atiende */}
      {!p.sola && (
        <div role="group" aria-label={t.filterStaff} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {[{ id: "all", name: t.all }, ...p.staff].map((s) => (
            <button key={s.id} type="button" onClick={() => p.setFiltroPersona(s.id)} aria-pressed={p.filtroPersona === s.id}
              className={cn("h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors", p.filtroPersona === s.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted")}>
              {s.name.split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      {/* El día en cifras (las mismas cuentas que el Resumen), y el turno nuevo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <dl className={cn("grid flex-1 divide-x divide-border rounded-2xl border border-border bg-card py-2.5", puedeCobrar ? "grid-cols-4" : "grid-cols-2")}>
          {([[t.statAppointments, String(activos.length), false], [t.statPending, String(pendientes), pendientes > 0], ...(puedeCobrar ? [[t.statRevenue, shekel(ingreso), false], [t.statCollected, shekel(cobrado), false]] : [])] as [string, string, boolean][]).map(([et, v, alerta]) => (
            <div key={et} className="flex flex-col items-center gap-0.5 px-1">
              <dt className="text-xs text-muted-foreground">{et}</dt>
              <dd className={cn("text-base font-semibold tabular-nums", alerta ? "text-amber-700 dark:text-amber-400" : "text-foreground")}>{v}</dd>
            </div>
          ))}
        </dl>
        <button type="button" onClick={p.alNuevo} className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
          <Plus size={18} /> {t.newAppointment}
        </button>
      </div>

      {/* Los turnos */}
      {p.turnosDelDia.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-base font-medium text-foreground">{t.emptyTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t.emptyBody}</p>
        </div>
      ) : ancho ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <caption className="sr-only">{t.caption(fechaLarga(p.fecha))}</caption>
            <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">{t.thTime}</th>
                <th scope="col" className="px-3 py-2.5 text-start font-medium">{t.thClient}</th>
                {!p.sola && <th scope="col" className="px-3 py-2.5 text-start font-medium">{t.thWith}</th>}
                <th scope="col" className="px-3 py-2.5 text-start font-medium">{t.thPayment}</th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium"><span className="sr-only">{t.thActions}</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {p.turnosDelDia.map((a) => {
                const s = p.servicios.find((x) => x.id === a.serviceId);
                const quien = p.staff.find((x) => x.id === a.staffId);
                const cancelado = a.status === "cancelled";
                return (
                  <tr key={a.id} data-turno={(a as Appointment & { origin?: { documentId?: string } }).origin?.documentId ?? a.id} className={cn("align-middle", cancelado && "opacity-60")}>
                    <td className="whitespace-nowrap px-4 py-3">
                      <p dir="ltr" className="text-end text-base font-semibold tabular-nums text-foreground">{a.time}</p>
                      <p className="text-end text-xs text-muted-foreground">{t.minutes(a.duration)}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className={cn("whitespace-nowrap font-semibold text-foreground", cancelado && "line-through")}>{a.customerName}</p>
                      <p className="text-muted-foreground">{s?.name ?? "—"}</p>
                      {a.status === "pending" && <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">{t.pending}</p>}
                      {cancelado && <p className="text-xs font-semibold text-red-700 dark:text-red-400">{t.cancelled}</p>}
                    </td>
                    {!p.sola && <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{quien?.name.split(" ")[0] ?? "—"}</td>}
                    <td className="whitespace-nowrap px-3 py-3">{!cancelado && <Pago a={a} precio={s?.price ?? 0} />}</td>
                    <td className="px-4 py-3">
                      {cancelado ? <div className="flex justify-end">{restaurar(a)}</div> : acciones(a, true)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <ol className="grid grid-cols-1 gap-3">
          {p.turnosDelDia.map((a) => {
            const s = p.servicios.find((x) => x.id === a.serviceId);
            const quien = p.staff.find((x) => x.id === a.staffId);
            const cancelado = a.status === "cancelled";
            return (
              <li key={a.id} data-turno={(a as Appointment & { origin?: { documentId?: string } }).origin?.documentId ?? a.id} className={cn("rounded-2xl border bg-card p-4", cancelado ? "border-border opacity-60" : "border-border")}>
                <div className="flex gap-3">
                  <div className="w-16 shrink-0">
                    <p dir="ltr" className="text-end text-lg font-bold tabular-nums text-foreground">{a.time}</p>
                    <p className="text-end text-xs text-muted-foreground">{t.minutes(a.duration)}</p>
                  </div>
                  <div className="min-w-0 flex-1 border-s border-border ps-3">
                    <p className={cn("text-base font-semibold text-foreground", cancelado && "line-through")}>{a.customerName}</p>
                    <p className="text-sm text-muted-foreground [hyphens:auto]">{s?.name ?? "—"}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      {!p.sola && quien && <span>{t.withStaff(quien.name.split(" ")[0])}</span>}
                      {a.status === "pending" && <span className="font-semibold text-amber-700 dark:text-amber-400">{t.pending}</span>}
                      {cancelado && <span className="font-semibold text-red-700 dark:text-red-400">{t.cancelled}</span>}
                    </p>
                  </div>
                  <div className="shrink-0 text-end">
                    {!cancelado && <Pago a={a} precio={s?.price ?? 0} />}
                  </div>
                </div>
                {cancelado ? restaurar(a) : acciones(a)}
              </li>
            );
          })}
        </ol>
      )}

      {cobrando && <DialogoPago turno={cobrando} precio={precio(cobrando)} servicio={p.servicios.find((x) => x.id === cobrando.serviceId)?.name ?? ""} cerrar={() => setCobrando(null)} guardar={async (pago) => { await p.alCobrar(cobrando, pago); setCobrando(null); }} />}
      {moviendo && <DialogoMover turno={moviendo} cerrar={() => setMoviendo(null)} guardar={async (f, h) => { await p.alMover(moviendo.id, f, h); setMoviendo(null); }} />}
      {cancelando && <ConfirmarCancelacion turno={cancelando} cerrar={() => setCancelando(null)} confirmar={() => { p.alCambiarEstado(cancelando.id, "cancelled"); setCancelando(null); }} />}
    </section>
  );
}

/** Una sola vista montada por ancho (tarjetas o tabla): sin dos copias del mismo turno en el DOM. */
export function useAncho(q: string) {
  const [m, setM] = React.useState(() => window.matchMedia(q).matches);
  React.useEffect(() => { const mq = window.matchMedia(q); const f = () => setM(mq.matches); mq.addEventListener("change", f); return () => mq.removeEventListener("change", f); }, [q]);
  return m;
}

function Pago({ a, precio }: { a: Appointment; precio: number }) {
  const t = tx();
  if (!estaPagado(a, precio) && cobradoDe(a, precio) > 0) return <span className="inline-flex flex-col items-end whitespace-nowrap text-sm"><span className="font-semibold tabular-nums text-foreground">{t.remaining(shekel(saldoDe(a, precio)))}</span><span className="text-xs text-muted-foreground">{t.depositPaid(shekel(cobradoDe(a, precio)))}</span></span>;
  if (estaPagado(a, precio)) return <span className="inline-flex max-w-[8.5rem] items-center gap-1 rounded-full bg-emerald-600/10 px-2.5 py-1 text-start text-xs font-semibold leading-tight text-emerald-800 dark:text-emerald-300"><Check size={14} aria-hidden />{t.paid}{nombreMetodo(a.paymentMethod) ? ` · ${nombreMetodo(a.paymentMethod)}` : ""}</span>;
  if (precio <= 0) return <span className="whitespace-nowrap text-sm text-muted-foreground">{t.free}</span>;
  return <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-foreground">{shekel(precio)}</span>;
}

/** Las acciones de un turno: la principal según el estado (pendiente → אישור; confirmado sin pagar → סמן כשולם), שינוי מועד y el menú. */
function Acciones({ a, precio, puedeCobrar, menu, setMenu, confirmar, cancelar, cobrar, mover, fila }: { a: Appointment; precio: number; puedeCobrar: boolean; menu: string | null; setMenu: (id: string | null) => void; confirmar: () => void; cancelar: () => void; cobrar: () => void; mover: () => void; fila?: boolean }) {
  const t = tx();
  const pagado = !puedeCobrar || precio <= 0 || estaPagado(a, precio);
  const primaria = a.status === "pending" ? "confirmar" : pagado ? null : "cobrar";
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (menu !== a.id) return;
    const fuera = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setMenu(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(null); };
    document.addEventListener("pointerdown", fuera); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", fuera); document.removeEventListener("keydown", esc); };
  }, [menu, a.id, setMenu]);
  const boton = "flex h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold whitespace-nowrap";
  const elMenu = (
    <div ref={ref} className="relative">
      <button type="button" aria-label={t.moreActions} aria-haspopup="menu" aria-expanded={menu === a.id} onClick={() => setMenu(menu === a.id ? null : a.id)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-foreground hover:bg-muted"><MoreHorizontal size={20} aria-hidden /></button>
      {menu === a.id && (
        <div role="menu" className="absolute end-0 top-12 z-20 w-52 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-xl">
          <a role="menuitem" href={`tel:${a.customerPhone}`} className="flex h-11 items-center gap-2 px-4 text-sm text-foreground hover:bg-muted"><Phone size={16} aria-hidden />{t.call}</a>
          <a role="menuitem" href={`https://wa.me/${waNumero(a.customerPhone)}`} target="_blank" rel="noreferrer" className="flex h-11 items-center gap-2 px-4 text-sm text-foreground hover:bg-muted"><MessageCircle size={16} aria-hidden />{t.whatsapp}</a>
          <button role="menuitem" type="button" onClick={() => { setMenu(null); cancelar(); }} className="flex h-11 w-full items-center gap-2 px-4 text-sm text-red-700 hover:bg-red-500/10 dark:text-red-400"><Ban size={16} aria-hidden />{t.cancelBooking}</button>
        </div>
      )}
    </div>
  );
  if (fila) return (
    <div className="flex items-center justify-end gap-2">
      {primaria === "confirmar" && <button type="button" onClick={confirmar} className={cn(boton, "bg-primary px-4 text-primary-foreground")}><Check size={18} aria-hidden />{t.confirm}</button>}
      {!pagado && <button type="button" onClick={cobrar} className={cn(boton, "px-4", primaria === "cobrar" ? "bg-primary text-primary-foreground" : "border border-border text-foreground")}>{t.markPaid}</button>}
      <button type="button" onClick={mover} className={cn(boton, "border border-border px-3 font-medium text-foreground hover:bg-muted")}><Clock size={16} aria-hidden />{t.reschedule}</button>
      {elMenu}
    </div>
  );
  return (
    <>
      {primaria === "confirmar" && <button type="button" onClick={confirmar} className={cn(boton, "mt-3 w-full bg-primary text-primary-foreground")}><Check size={18} aria-hidden />{t.confirm}</button>}
      {/* CRM-04: la fila reparte el ancho y el texto baja de línea si no entra (ru «Отметить оплату» + «Перенести» medía 356 en 324). */}
      <div className={cn("mt-2 grid gap-2", pagado ? "grid-cols-[1fr_auto]" : "grid-cols-[1fr_1fr_auto]")}>
        {!pagado && <button type="button" onClick={cobrar} className={cn(boton, "min-w-0 whitespace-normal px-2 text-center leading-tight", primaria === "cobrar" ? "bg-primary text-primary-foreground" : "border border-border text-foreground")}>{t.markPaid}</button>}
        <button type="button" onClick={mover} className={cn(boton, "min-w-0 whitespace-normal border border-border px-2 text-center font-medium leading-tight text-foreground")}><Clock size={16} aria-hidden className="shrink-0" />{t.reschedule}</button>
        {elMenu}
      </div>
    </>
  );
}

export function Hoja({ titulo, cerrar, children }: { titulo: string; cerrar: () => void; children: React.ReactNode }) {
  // Foco adentro al abrir, Tab que no se escapa, Escape cierra (useModalA11y); y el foco vuelve a quien lo abrió al desmontar.
  const ref = useModalA11y(true, cerrar);
  React.useEffect(() => { const antes = document.activeElement as HTMLElement | null; return () => { antes?.focus?.({ preventScroll: true }); }; }, []);
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center" onClick={cerrar}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()} className="outline-none w-full max-w-md rounded-t-3xl border border-border bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:pb-5">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-lg font-bold text-foreground">{titulo}</h4>
          <button type="button" aria-label={tx().close} onClick={cerrar} className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function DialogoPago({ turno, precio, servicio, cerrar, guardar }: { turno: Appointment; precio: number; servicio: string; cerrar: () => void; guardar: (pago: PagoDelDialogo) => Promise<void> }) {
  const t = tx();
  const ya = cobradoDe(turno, precio);
  const [monto, setMonto] = React.useState(String(saldoDe(turno, precio) || precio));
  const [metodo, setMetodo] = React.useState<Pagable>("cash");
  const [guardando, setGuardando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const valor = leerMonto(monto);
  const enviar = async () => {
    if (valor === null) { setError(t.amountError); return; }
    setGuardando(true); setError(null);
    try { await guardar({ ...pagoNuevo(turno, precio, valor), paymentMethod: metodo, montoCents: Math.round(valor * 100), precioCents: Math.round(precio * 100) }); }
    catch (err) { console.error("[CRM] cobro:", err); setError(t.payError); }
    finally { setGuardando(false); }
  };
  return (
    <Hoja titulo={t.payTitle} cerrar={cerrar}>
      <p className="mb-4 text-sm text-muted-foreground">{turno.customerName} · {servicio} · <span dir="ltr">{turno.time}</span></p>
      {ya > 0 && <p className="mb-4 rounded-xl bg-muted px-3 py-2 text-sm text-foreground">{t.alreadyPaid(shekel(ya), shekel(saldoDe(turno, precio)))}</p>}
      <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="crm03-monto">{t.amount}</label>
      <div className="relative mb-1">
        <span className="pointer-events-none absolute inset-y-0 start-4 flex items-center text-muted-foreground">₪</span>
        <input id="crm03-monto" inputMode="decimal" value={monto} aria-invalid={!!error && valor === null} aria-describedby="crm03-monto-ayuda" onChange={(e) => { setMonto(e.target.value); setError(null); }} className="h-12 w-full rounded-xl border border-border bg-background ps-9 pe-4 text-base text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" />
      </div>
      <p id="crm03-monto-ayuda" className="mb-4 text-xs text-muted-foreground">{ya > 0 ? t.amountHelpAdd : t.amountHelp}</p>
      <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="crm03-metodo">{t.method}</label>
      <select id="crm03-metodo" value={metodo} onChange={(e) => setMetodo(e.target.value as Pagable)} className="mb-5 h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
        {metodos().map(([k, n]) => <option key={k} value={k}>{n}</option>)}
      </select>
      {error && <p role="alert" className="mb-3 flex items-start gap-2 rounded-xl border border-red-600/30 bg-red-500/10 p-3 text-sm text-red-900 dark:text-red-200"><AlertCircle size={18} aria-hidden className="mt-0.5 shrink-0" />{error}</p>}
      <button type="button" disabled={guardando} onClick={() => void enviar()} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-50">{guardando && <Loader2 size={18} className="animate-spin" aria-hidden />}{t.save}</button>
    </Hoja>
  );
}

function DialogoMover({ turno, cerrar, guardar }: { turno: Appointment; cerrar: () => void; guardar: (fecha: string, hora: string) => Promise<void> }) {
  const t = tx();
  const [fecha, setFecha] = React.useState(turno.date);
  const [hora, setHora] = React.useState(turno.time);
  const [guardando, setGuardando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const hoy = format(new Date(), "yyyy-MM-dd");
  const enviar = async () => {
    if (!fecha || !hora) { setError(t.pickDateTime); return; }
    if (new Date(`${fecha}T${hora}`) < new Date()) { setError(t.pastTime); return; }
    if (fecha === turno.date && hora === turno.time) { cerrar(); return; }
    setGuardando(true); setError(null);
    try { await guardar(fecha, hora); }
    catch (err) {
      console.error("[CRM] cambio de hora:", err);
      const ocupado = err instanceof Error && (/conflict|409|תפוס|not available/i.test(err.message) || err.name.includes("Conflict"));
      setError(ocupado ? t.slotTaken : t.moveError);
    } finally { setGuardando(false); }
  };
  return (
    <Hoja titulo={t.reschedule} cerrar={cerrar}>
      <p className="mb-4 text-sm text-muted-foreground"><bdi>{turno.customerName}</bdi>{t.moveNote("")}</p>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="crm03-fecha">{t.date}</label>
          <input id="crm03-fecha" type="date" min={hoy} required value={fecha} onChange={(e) => { setFecha(e.target.value); setError(null); }} className="h-12 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="crm03-hora">{t.time}</label>
          <input id="crm03-hora" type="time" required value={hora} onChange={(e) => { setHora(e.target.value); setError(null); }} className="h-12 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground" />
        </div>
      </div>
      {error && <p role="alert" className="mb-3 flex items-start gap-2 rounded-xl border border-red-600/30 bg-red-500/10 p-3 text-sm text-red-900 dark:text-red-200"><AlertCircle size={18} aria-hidden className="mt-0.5 shrink-0" />{error}</p>}
      <button type="button" disabled={guardando} onClick={() => void enviar()} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-50">{guardando && <Loader2 size={18} className="animate-spin" aria-hidden />}{t.save}</button>
    </Hoja>
  );
}

/** Cancelar avisa a la clienta: se confirma antes. */
function ConfirmarCancelacion({ turno, cerrar, confirmar }: { turno: Appointment; cerrar: () => void; confirmar: () => void }) {
  const t = tx();
  const [a, nombre, b, hora, c] = t.cancelQuestion(turno.customerName, turno.time);
  return (
    <Hoja titulo={t.cancelBooking} cerrar={cerrar}>
      <p className="mb-5 text-base text-foreground">{a}<bdi className="font-semibold">{nombre}</bdi>{b}<span dir="ltr">{hora}</span>{c}</p>
      <div className="grid gap-2">
        <button type="button" onClick={confirmar} className="h-12 rounded-xl bg-red-700 text-base font-semibold text-white hover:bg-red-800">{t.cancelBooking}</button>
        <button type="button" onClick={cerrar} className="h-12 rounded-xl border border-border text-base font-medium text-foreground hover:bg-muted">{t.keep}</button>
      </div>
    </Hoja>
  );
}
