// CRM-03 · diseño (prototipo en el clon de diseño, no en T): la agenda del día del CRM.
// Una tira de la semana (domingo a sábado) en lugar del calendario de mes; el mes, a un toque. Cada turno, una tarjeta con su acción
// principal según el estado (pendiente → אישור; confirmado sin pagar → סמן כשולם), «שינוי מועד» y «עוד פעולות» (llamar, WhatsApp,
// cancelar). Los diálogos de pago y de cambio de hora son hojas desde abajo en el celular y ventanas centradas en la computadora.
import React from "react";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { AlertCircle, ChevronLeft, ChevronRight, CalendarDays, Check, Clock, Loader2, MoreHorizontal, Phone, Plus, RotateCcw, X, Ban, MessageCircle } from "lucide-react";
import type { Appointment, AppointmentStatus, Service, StaffMember } from "../../../types";
import { getDateFnsLocale } from "../../../lib/dateLocale";
import { Calendar } from "../../ui/calendar";
import { useModalA11y } from "../../../hooks/useModalA11y";
import { cn } from "../../../lib/utils";
import { cobradoDe, cuentas, estaPagado, leerMonto, pagoNuevo, saldoDe } from "../../../lib/cobros";
import { waNumero } from "../../../lib/telefono";

const DIAS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
export const METODOS: [NonNullable<Appointment["paymentMethod"]>, string][] = [["cash", "מזומן"], ["card", "כרטיס"], ["transfer", "העברה"], ["other", "אחר"]];
export const nombreMetodo = (m?: string) => METODOS.find(([k]) => k === m)?.[1];
const shekel = (n: number) => `₪${n.toLocaleString("he-IL")}`;

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
  alCobrar: (turno: Appointment, pago: { paymentStatus: "paid" | "deposit_paid"; amountPaidCents: number; paymentMethod: NonNullable<Appointment["paymentMethod"]> }) => Promise<void>;
  alNuevo: () => void;
  /** D-305: la empleada ve sus turnos pero no cobra ni ve las cifras de dinero. */
  puedeCobrar?: boolean;
};

type Pagable = NonNullable<Appointment["paymentMethod"]>;

export function AgendaDia(p: Props) {
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
    <button type="button" onClick={() => p.alCambiarEstado(a.id, "confirmed")} className="mt-3 flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-muted"><RotateCcw size={16} aria-hidden />החזרת התור</button>
  );

  return (
    <section aria-label="הלו״ז של היום" className="mx-auto max-w-3xl space-y-4 lg:max-w-5xl">
      {/* El día y la semana */}
      <div className="rounded-2xl border border-border bg-card p-3 sm:p-4">
        <h3 className="mb-2 text-lg font-bold text-foreground">{format(p.fecha, "EEEE, d בMMMM", { locale: getDateFnsLocale() })}</h3>
        <div className="mb-2 flex items-center gap-2">
          <button type="button" aria-label="השבוע הקודם" onClick={() => p.setFecha(addDays(p.fecha, -7))} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-foreground hover:bg-muted"><ChevronRight size={20} aria-hidden /></button>
          <button type="button" aria-label="השבוע הבא" onClick={() => p.setFecha(addDays(p.fecha, 7))} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-foreground hover:bg-muted"><ChevronLeft size={20} aria-hidden /></button>
          {!isSameDay(p.fecha, hoy) && (
            <button type="button" onClick={() => p.setFecha(hoy)} className="h-11 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-muted">היום</button>
          )}
          <button type="button" onClick={() => setMes((v) => !v)} aria-expanded={mes} className={cn("ms-auto flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium", mes ? "border-foreground/30 bg-muted text-foreground" : "border-border text-foreground hover:bg-muted")}>
            <CalendarDays size={18} aria-hidden /> חודש
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {semana.map((d, i) => {
            const sel = isSameDay(d, p.fecha), esHoy = isSameDay(d, hoy), hay = conTurnos.has(format(d, "yyyy-MM-dd"));
            return (
              <button key={i} type="button" onClick={() => p.setFecha(d)} aria-pressed={sel} aria-label={`${format(d, "EEEE d בMMMM", { locale: getDateFnsLocale() })}${hay ? " · יש תורים" : ""}`}
                className={cn("relative flex min-h-14 min-w-0 flex-col items-center justify-center rounded-xl text-foreground transition-colors", sel ? "bg-primary text-primary-foreground" : esHoy ? "ring-1 ring-inset ring-foreground/30" : "hover:bg-muted")}>
                <span className={cn("text-xs", sel ? "text-primary-foreground/80" : "text-muted-foreground")}>{DIAS[i]}</span>
                <span className="text-base font-semibold tabular-nums">{d.getDate()}</span>
                {hay && <span aria-hidden className={cn("absolute bottom-1.5 h-1 w-1 rounded-full", sel ? "bg-primary-foreground" : "bg-foreground/50")} />}
              </button>
            );
          })}
        </div>
        {mes && (
          <div className="mt-3 flex justify-center border-t border-border pt-3">
            <Calendar selected={p.fecha} onSelect={(d) => { p.setFecha(d); setMes(false); }} className="max-w-full border-0 bg-transparent shadow-none" />
          </div>
        )}
      </div>

      {/* Quién atiende */}
      {!p.sola && (
        <div role="group" aria-label="סינון לפי צוות" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {[{ id: "all", name: "כולם" }, ...p.staff].map((s) => (
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
          {([["תורים", String(activos.length), false], ["ממתינים", String(pendientes), pendientes > 0], ...(puedeCobrar ? [["הכנסה", shekel(ingreso), false], ["נגבה", shekel(cobrado), false]] : [])] as [string, string, boolean][]).map(([et, v, alerta]) => (
            <div key={et} className="flex flex-col items-center gap-0.5 px-1">
              <dt className="text-xs text-muted-foreground">{et}</dt>
              <dd className={cn("text-base font-semibold tabular-nums", alerta ? "text-amber-700 dark:text-amber-400" : "text-foreground")}>{v}</dd>
            </div>
          ))}
        </dl>
        <button type="button" onClick={p.alNuevo} className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
          <Plus size={18} /> תור חדש
        </button>
      </div>

      {/* Los turnos */}
      {p.turnosDelDia.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-base font-medium text-foreground">אין תורים ביום הזה</p>
          <p className="mt-1 text-sm text-muted-foreground">אפשר להוסיף תור עם «תור חדש».</p>
        </div>
      ) : ancho ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <caption className="sr-only">התורים של {format(p.fecha, "EEEE d בMMMM", { locale: getDateFnsLocale() })}</caption>
            <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">שעה</th>
                <th scope="col" className="px-3 py-2.5 text-start font-medium">לקוחה</th>
                {!p.sola && <th scope="col" className="px-3 py-2.5 text-start font-medium">עם</th>}
                <th scope="col" className="px-3 py-2.5 text-start font-medium">תשלום</th>
                <th scope="col" className="px-4 py-2.5 text-end font-medium"><span className="sr-only">פעולות</span></th>
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
                      <p className="text-end text-xs text-muted-foreground">{a.duration} דק׳</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className={cn("whitespace-nowrap font-semibold text-foreground", cancelado && "line-through")}>{a.customerName}</p>
                      <p className="text-muted-foreground">{s?.name ?? "—"}</p>
                      {a.status === "pending" && <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">ממתין לאישור</p>}
                      {cancelado && <p className="text-xs font-semibold text-red-700 dark:text-red-400">בוטל</p>}
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
        <ol className="grid gap-3">
          {p.turnosDelDia.map((a) => {
            const s = p.servicios.find((x) => x.id === a.serviceId);
            const quien = p.staff.find((x) => x.id === a.staffId);
            const cancelado = a.status === "cancelled";
            return (
              <li key={a.id} data-turno={(a as Appointment & { origin?: { documentId?: string } }).origin?.documentId ?? a.id} className={cn("rounded-2xl border bg-card p-4", cancelado ? "border-border opacity-60" : "border-border")}>
                <div className="flex gap-3">
                  <div className="w-16 shrink-0">
                    <p dir="ltr" className="text-end text-lg font-bold tabular-nums text-foreground">{a.time}</p>
                    <p className="text-end text-xs text-muted-foreground">{a.duration} דק׳</p>
                  </div>
                  <div className="min-w-0 flex-1 border-s border-border ps-3">
                    <p className={cn("text-base font-semibold text-foreground", cancelado && "line-through")}>{a.customerName}</p>
                    <p className="text-sm text-muted-foreground">{s?.name ?? "—"}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      {!p.sola && quien && <span>עם {quien.name.split(" ")[0]}</span>}
                      {a.status === "pending" && <span className="font-semibold text-amber-700 dark:text-amber-400">ממתין לאישור</span>}
                      {cancelado && <span className="font-semibold text-red-700 dark:text-red-400">בוטל</span>}
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
  if (!estaPagado(a, precio) && cobradoDe(a, precio) > 0) return <span className="inline-flex flex-col items-end whitespace-nowrap text-sm"><span className="font-semibold tabular-nums text-foreground">נשאר {shekel(saldoDe(a, precio))}</span><span className="text-xs text-muted-foreground">שולמה מקדמה {shekel(cobradoDe(a, precio))}</span></span>;
  if (estaPagado(a, precio)) return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-600/10 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300"><Check size={14} aria-hidden />שולם{nombreMetodo(a.paymentMethod) ? ` · ${nombreMetodo(a.paymentMethod)}` : ""}</span>;
  return <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-foreground">{shekel(precio)}</span>;
}

/** Las acciones de un turno: la principal según el estado (pendiente → אישור; confirmado sin pagar → סמן כשולם), שינוי מועד y el menú. */
function Acciones({ a, precio, puedeCobrar, menu, setMenu, confirmar, cancelar, cobrar, mover, fila }: { a: Appointment; precio: number; puedeCobrar: boolean; menu: string | null; setMenu: (id: string | null) => void; confirmar: () => void; cancelar: () => void; cobrar: () => void; mover: () => void; fila?: boolean }) {
  const pagado = !puedeCobrar || estaPagado(a, precio);
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
      <button type="button" aria-label="עוד פעולות" aria-haspopup="menu" aria-expanded={menu === a.id} onClick={() => setMenu(menu === a.id ? null : a.id)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-foreground hover:bg-muted"><MoreHorizontal size={20} aria-hidden /></button>
      {menu === a.id && (
        <div role="menu" className="absolute end-0 top-12 z-20 w-52 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-xl">
          <a role="menuitem" href={`tel:${a.customerPhone}`} className="flex h-11 items-center gap-2 px-4 text-sm text-foreground hover:bg-muted"><Phone size={16} aria-hidden />התקשרות</a>
          <a role="menuitem" href={`https://wa.me/${waNumero(a.customerPhone)}`} target="_blank" rel="noreferrer" className="flex h-11 items-center gap-2 px-4 text-sm text-foreground hover:bg-muted"><MessageCircle size={16} aria-hidden />וואטסאפ</a>
          <button role="menuitem" type="button" onClick={() => { setMenu(null); cancelar(); }} className="flex h-11 w-full items-center gap-2 px-4 text-sm text-red-700 hover:bg-red-500/10 dark:text-red-400"><Ban size={16} aria-hidden />ביטול התור</button>
        </div>
      )}
    </div>
  );
  if (fila) return (
    <div className="flex items-center justify-end gap-2">
      {primaria === "confirmar" && <button type="button" onClick={confirmar} className={cn(boton, "bg-primary px-4 text-primary-foreground")}><Check size={18} aria-hidden />אישור</button>}
      {!pagado && <button type="button" onClick={cobrar} className={cn(boton, "px-4", primaria === "cobrar" ? "bg-primary text-primary-foreground" : "border border-border text-foreground")}>סמן כשולם</button>}
      <button type="button" onClick={mover} className={cn(boton, "border border-border px-3 font-medium text-foreground hover:bg-muted")}><Clock size={16} aria-hidden />שינוי מועד</button>
      {elMenu}
    </div>
  );
  return (
    <>
      {primaria === "confirmar" && <button type="button" onClick={confirmar} className={cn(boton, "mt-3 w-full bg-primary text-primary-foreground")}><Check size={18} aria-hidden />אישור</button>}
      <div className="mt-2 flex gap-2">
        {!pagado && <button type="button" onClick={cobrar} className={cn(boton, "flex-1", primaria === "cobrar" ? "bg-primary text-primary-foreground" : "border border-border text-foreground")}>סמן כשולם</button>}
        <button type="button" onClick={mover} className={cn(boton, "border border-border px-4 font-medium text-foreground", pagado && "flex-1")}><Clock size={16} aria-hidden />שינוי מועד</button>
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
          <button type="button" aria-label="סגירה" onClick={cerrar} className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function DialogoPago({ turno, precio, servicio, cerrar, guardar }: { turno: Appointment; precio: number; servicio: string; cerrar: () => void; guardar: (pago: { paymentStatus: "paid" | "deposit_paid"; amountPaidCents: number; paymentMethod: Pagable }) => Promise<void> }) {
  const ya = cobradoDe(turno, precio);
  const [monto, setMonto] = React.useState(String(saldoDe(turno, precio) || precio));
  const [metodo, setMetodo] = React.useState<Pagable>("cash");
  const [guardando, setGuardando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const valor = leerMonto(monto);
  const enviar = async () => {
    if (valor === null) { setError("כתבו סכום גדול מאפס, למשל 150."); return; }
    setGuardando(true); setError(null);
    try { await guardar({ ...pagoNuevo(turno, precio, valor), paymentMethod: metodo }); }
    catch (err) { console.error("[CRM] cobro:", err); setError("התשלום לא נשמר. בדקו את החיבור ונסו שוב."); }
    finally { setGuardando(false); }
  };
  return (
    <Hoja titulo="סימון כשולם" cerrar={cerrar}>
      <p className="mb-4 text-sm text-muted-foreground">{turno.customerName} · {servicio} · <span dir="ltr">{turno.time}</span></p>
      {ya > 0 && <p className="mb-4 rounded-xl bg-muted px-3 py-2 text-sm text-foreground">כבר שולם {shekel(ya)} · נשאר {shekel(saldoDe(turno, precio))}</p>}
      <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="crm03-monto">סכום</label>
      <div className="relative mb-1">
        <span className="pointer-events-none absolute inset-y-0 start-4 flex items-center text-muted-foreground">₪</span>
        <input id="crm03-monto" inputMode="decimal" value={monto} aria-invalid={!!error && valor === null} aria-describedby="crm03-monto-ayuda" onChange={(e) => { setMonto(e.target.value); setError(null); }} className="h-12 w-full rounded-xl border border-border bg-background ps-9 pe-4 text-base text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" />
      </div>
      <p id="crm03-monto-ayuda" className="mb-4 text-xs text-muted-foreground">{ya > 0 ? "הסכום שנכנס עכשיו; הוא מתווסף למה שכבר שולם." : "אפשר לשנות אם גבית סכום אחר."}</p>
      <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="crm03-metodo">אמצעי תשלום</label>
      <select id="crm03-metodo" value={metodo} onChange={(e) => setMetodo(e.target.value as Pagable)} className="mb-5 h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
        {METODOS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
      </select>
      {error && <p role="alert" className="mb-3 flex items-start gap-2 rounded-xl border border-red-600/30 bg-red-500/10 p-3 text-sm text-red-900 dark:text-red-200"><AlertCircle size={18} aria-hidden className="mt-0.5 shrink-0" />{error}</p>}
      <button type="button" disabled={guardando} onClick={() => void enviar()} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-50">{guardando && <Loader2 size={18} className="animate-spin" aria-hidden />}שמירה</button>
    </Hoja>
  );
}

function DialogoMover({ turno, cerrar, guardar }: { turno: Appointment; cerrar: () => void; guardar: (fecha: string, hora: string) => Promise<void> }) {
  const [fecha, setFecha] = React.useState(turno.date);
  const [hora, setHora] = React.useState(turno.time);
  const [guardando, setGuardando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const hoy = format(new Date(), "yyyy-MM-dd");
  const enviar = async () => {
    if (!fecha || !hora) { setError("בחרו תאריך ושעה."); return; }
    if (new Date(`${fecha}T${hora}`) < new Date()) { setError("המועד שבחרתם כבר עבר."); return; }
    if (fecha === turno.date && hora === turno.time) { cerrar(); return; }
    setGuardando(true); setError(null);
    try { await guardar(fecha, hora); }
    catch (err) {
      console.error("[CRM] cambio de hora:", err);
      const ocupado = err instanceof Error && (/conflict|409|תפוס|not available/i.test(err.message) || err.name.includes("Conflict"));
      setError(ocupado ? "בשעה הזאת כבר יש תור. בחרו שעה אחרת." : "השינוי לא נשמר. בדקו את החיבור ונסו שוב.");
    } finally { setGuardando(false); }
  };
  return (
    <Hoja titulo="שינוי מועד" cerrar={cerrar}>
      <p className="mb-4 text-sm text-muted-foreground">{turno.customerName} · הלקוחה תקבל הודעה על השינוי.</p>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="crm03-fecha">תאריך</label>
          <input id="crm03-fecha" type="date" min={hoy} required value={fecha} onChange={(e) => { setFecha(e.target.value); setError(null); }} className="h-12 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="crm03-hora">שעה</label>
          <input id="crm03-hora" type="time" required value={hora} onChange={(e) => { setHora(e.target.value); setError(null); }} className="h-12 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground" />
        </div>
      </div>
      {error && <p role="alert" className="mb-3 flex items-start gap-2 rounded-xl border border-red-600/30 bg-red-500/10 p-3 text-sm text-red-900 dark:text-red-200"><AlertCircle size={18} aria-hidden className="mt-0.5 shrink-0" />{error}</p>}
      <button type="button" disabled={guardando} onClick={() => void enviar()} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-50">{guardando && <Loader2 size={18} className="animate-spin" aria-hidden />}שמירה</button>
    </Hoja>
  );
}

/** Cancelar avisa a la clienta: se confirma antes. */
function ConfirmarCancelacion({ turno, cerrar, confirmar }: { turno: Appointment; cerrar: () => void; confirmar: () => void }) {
  return (
    <Hoja titulo="ביטול התור" cerrar={cerrar}>
      <p className="mb-5 text-base text-foreground">לבטל את התור של <span className="font-semibold">{turno.customerName}</span> ב-<span dir="ltr">{turno.time}</span>? הלקוחה תקבל הודעה על הביטול.</p>
      <div className="grid gap-2">
        <button type="button" onClick={confirmar} className="h-12 rounded-xl bg-red-700 text-base font-semibold text-white hover:bg-red-800">ביטול התור</button>
        <button type="button" onClick={cerrar} className="h-12 rounded-xl border border-border text-base font-medium text-foreground hover:bg-muted">לא, להשאיר</button>
      </div>
    </Hoja>
  );
}
