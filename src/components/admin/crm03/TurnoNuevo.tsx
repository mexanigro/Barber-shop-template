// CRM-03 · diseño (clon de diseño): «תור חדש». Dos casos de la dueña en un solo diálogo: la clienta que llama y pide un turno (fecha y
// una de las horas libres de esa persona, calculadas con generateSlots y los turnos que ya tiene ese día) y la que ya vino («רישום
// ביקור»: queda como visita realizada). El guardado es el de siempre (handleWalkIn en AdminDashboard); este componente sólo pide los datos.
import React from "react";
import { addMinutes, format, isBefore, parse, parseISO, startOfDay } from "date-fns";
import { AlertCircle, Loader2 } from "lucide-react";
import type { Appointment, Service, StaffMember } from "../../../types";
import { generateSlots } from "../../../lib/booking";
import { getDateFnsLocale } from "../../../lib/dateLocale";
import { cn } from "../../../lib/utils";
import { Hoja } from "./AgendaDia";

export type ModoTurno = "turno" | "visita";
type Formulario = { name: string; phone: string; serviceId: string; staffId: string };

export function TurnoNuevo(p: {
  modo: ModoTurno;
  setModo: (m: ModoTurno) => void;
  /** Viene de tocar un hueco del calendario: la fecha y la hora ya están elegidas. */
  desdeCalendario: boolean;
  form: Formulario;
  setForm: (f: Formulario) => void;
  fecha: string;
  setFecha: (f: string) => void;
  hora: string;
  setHora: (h: string) => void;
  servicios: Service[];
  staff: StaffMember[];
  sola: boolean;
  turnos: Appointment[];
  bloqueado: boolean;
  guardando: boolean;
  error: string | null;
  textoGuardar: string;
  extra?: React.ReactNode;
  alCerrar: () => void;
  alGuardar: () => void;
}) {
  const [otraHora, setOtraHora] = React.useState(false);
  const servicio = p.servicios.find((s) => s.id === p.form.serviceId) ?? p.servicios[0];
  const persona = p.staff.find((s) => s.id === p.form.staffId) ?? p.staff[0];
  const libres = React.useMemo(() => {
    if (p.modo !== "turno" || !servicio || !persona || !p.fecha) return [] as string[];
    const ocupado = p.turnos
      .filter((a) => a.staffId === persona.id && a.date === p.fecha && a.status !== "cancelled")
      .map((a) => ({ start: a.time, end: format(addMinutes(parse(a.time, "HH:mm", new Date()), a.duration || 30), "HH:mm") }));
    return generateSlots(parseISO(p.fecha), persona, servicio, ocupado) as string[];
  }, [p.modo, servicio, persona, p.fecha, p.turnos]);
  React.useEffect(() => { if (p.hora && !libres.includes(p.hora) && !p.desdeCalendario) setOtraHora(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const campo = "h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60";
  const etiqueta = "mb-1.5 block text-sm font-medium text-foreground";
  const hoy = format(new Date(), "yyyy-MM-dd");
  const faltaHora = p.modo === "turno" && !p.hora;
  const listo = !!p.form.name.trim() && p.form.phone.trim().length >= 5 && !faltaHora;

  return (
    <Hoja titulo="תור חדש" cerrar={p.alCerrar}>
      <div className="max-h-[70dvh] space-y-4 overflow-y-auto pb-1 sm:max-h-[75dvh]">
        {!p.desdeCalendario && (
          <div role="group" aria-label="מה רושמים" className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-background p-1">
            {([["turno", "תור לתאריך"], ["visita", "רישום ביקור"]] as const).map(([k, n]) => (
              <button key={k} type="button" disabled={p.bloqueado} aria-pressed={p.modo === k} onClick={() => p.setModo(k)} className={cn("h-11 rounded-lg text-sm font-medium", p.modo === k ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted")}>{n}</button>
            ))}
          </div>
        )}
        {p.modo === "visita" && <p className="rounded-xl bg-muted px-3 py-2 text-sm text-foreground">לביקור שכבר קרה או שקורה עכשיו: נרשם כטיפול שהתקיים, בלי תזכורת ללקוחה.</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="tn-nombre" className={etiqueta}>שם הלקוחה <span aria-hidden className="text-red-700">*</span></label><input id="tn-nombre" autoComplete="off" required disabled={p.bloqueado} value={p.form.name} onChange={(e) => p.setForm({ ...p.form, name: e.target.value })} className={campo} /></div>
          <div><label htmlFor="tn-tel" className={etiqueta}>טלפון <span aria-hidden className="text-red-700">*</span></label><input id="tn-tel" type="tel" inputMode="tel" required disabled={p.bloqueado} value={p.form.phone} onChange={(e) => p.setForm({ ...p.form, phone: e.target.value })} className={campo} /></div>
          <div><label htmlFor="tn-servicio" className={etiqueta}>שירות</label>
            <select id="tn-servicio" disabled={p.bloqueado} value={p.form.serviceId || servicio?.id} onChange={(e) => p.setForm({ ...p.form, serviceId: e.target.value })} className={campo}>
              {p.servicios.map((s) => <option key={s.id} value={s.id}>{s.name}{s.duration ? ` · ${s.duration} דק׳` : ""}</option>)}
            </select></div>
          {!p.sola && <div><label htmlFor="tn-persona" className={etiqueta}>אצל מי</label>
            <select id="tn-persona" disabled={p.bloqueado} value={p.form.staffId || persona?.id} onChange={(e) => p.setForm({ ...p.form, staffId: e.target.value })} className={campo}>
              {p.staff.map((s) => <option key={s.id} value={s.id}>{s.name.split(" ")[0]}</option>)}
            </select></div>}
        </div>

        {p.modo === "turno" && (
          <div className="space-y-3">
            <div><label htmlFor="tn-fecha" className={etiqueta}>תאריך</label>
              <input id="tn-fecha" type="date" min={hoy} disabled={p.bloqueado} value={p.fecha} onChange={(e) => { p.setFecha(e.target.value); p.setHora(""); }} className={campo} />
              {p.fecha && <p className="mt-1 text-xs text-muted-foreground">{format(parseISO(p.fecha), "EEEE, d בMMMM", { locale: getDateFnsLocale() })}</p>}</div>
            <fieldset>
              <legend className={etiqueta}>שעה <span aria-hidden className="text-red-700">*</span></legend>
              {libres.length > 0 && !otraHora ? (
                <div role="radiogroup" aria-label="שעות פנויות" className="flex flex-wrap gap-1.5">
                  {libres.map((h) => (
                    <button key={h} type="button" role="radio" aria-checked={p.hora === h} disabled={p.bloqueado} onClick={() => p.setHora(h)} dir="ltr"
                      className={cn("h-11 min-w-[4.5rem] rounded-xl border px-3 text-base tabular-nums", p.hora === h ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted")}>{h}</button>
                  ))}
                </div>
              ) : (
                <>
                  {!otraHora && <p className="mb-2 text-sm text-muted-foreground">{isBefore(startOfDay(parseISO(p.fecha || hoy)), startOfDay(new Date())) ? "התאריך עבר." : `אין שעות פנויות ל${persona?.name.split(" ")[0] ?? ""} ביום הזה לפי לוח הזמנים.`}</p>}
                  <input id="tn-hora" type="time" aria-label="שעה" disabled={p.bloqueado} value={p.hora} onChange={(e) => p.setHora(e.target.value)} className={cn(campo, "max-w-[10rem]")} />
                </>
              )}
              {libres.length > 0 && (
                <button type="button" onClick={() => { setOtraHora((v) => !v); if (otraHora) p.setHora(""); }} className="mt-2 h-11 rounded-xl px-2 text-sm font-medium text-foreground underline-offset-2 hover:underline">
                  {otraHora ? "לבחור משעות פנויות" : "שעה אחרת"}
                </button>
              )}
            </fieldset>
          </div>
        )}

        {p.error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-600/30 bg-red-500/10 p-3 text-sm text-red-900 dark:text-red-200"><AlertCircle size={18} aria-hidden className="mt-0.5 shrink-0" />{p.error}</p>}
        {p.extra}
      </div>
      <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
        <button type="button" onClick={p.alCerrar} disabled={p.guardando} className="h-11 rounded-xl border border-border px-5 text-sm font-medium text-foreground hover:bg-muted">ביטול</button>
        <button type="button" onClick={p.alGuardar} disabled={p.guardando || !listo} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {p.guardando && <Loader2 size={16} className="animate-spin" aria-hidden />}{p.textoGuardar}
        </button>
      </div>
    </Hoja>
  );
}
