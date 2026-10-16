// CRM-03 · diseño (clon de diseño): el editor de horarios «sumamente intuitivo» (D-303). La dueña elige a la persona, ve su semana
// de domingo a sábado en una lista corta (abrir/cerrar el día, horas, pausas, «העתקה לכל הימים»), marca un día especial tocando la
// fecha (יום חופש / שעות מיוחדות / ללא חריגה, también para lo que quedó en blockedDates) y ve al lado exactamente las horas que la
// clienta va a ver en la reserva (generateSlots con lo que está en pantalla). Guardar está siempre a mano; cambiar de persona con
// cambios sin guardar pregunta; «נשמר» se anuncia (role=status).
import React from "react";
import { AlertCircle, CalendarDays, Copy, Plus, Save, X } from "lucide-react";
import { DateOverride, StaffMember, WeeklySchedule } from "../../types";
import { siteConfig } from "../../config/site";
import { localeConfig } from "../../config/locale";
import { dbService } from "../../services/db";
import { TOUR_CONFIG } from "../../config/tour.config";
import { cn } from "../../lib/utils";
import { format, isBefore, parseISO, startOfDay } from "date-fns";
import { Calendar } from "../ui/calendar";
import { conHorarioGuardado, diasEnOrden } from "../../lib/agenda";
import { generateSlots } from "../../lib/booking";
import { getDateFnsLocale } from "../../lib/dateLocale";

type Dia = keyof WeeklySchedule;
const campoHora = "h-11 w-full min-w-0 rounded-xl border border-border bg-background px-2 text-base tabular-nums text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";
const botonTexto = "inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-foreground hover:bg-muted";

export function StaffLogistics() {
  const t = localeConfig.admin.staffSchedule;
  const nombreDia = (d: Dia) => localeConfig.admin.weekdays[d as keyof typeof localeConfig.admin.weekdays] ?? d;
  const [staff, setStaff] = React.useState<StaffMember[]>(siteConfig.staff);
  const [selectedStaffId, setSelectedStaffId] = React.useState<string>(siteConfig.staff[0]?.id || "");
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [fecha, setFecha] = React.useState<string | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const [guardado, setGuardado] = React.useState(false);
  const [cambiarA, setCambiarA] = React.useState<string | null>(null);
  const [servicioId, setServicioId] = React.useState(siteConfig.services[0]?.id ?? "");
  const [cargaFallo, setCargaFallo] = React.useState(false);
  /** Lo último cargado de cada persona: «מעבר בלי לשמור» vuelve a esto, sólo para esa persona. */
  const cargado = React.useRef<Record<string, StaffMember>>(Object.fromEntries(siteConfig.staff.map((m) => [m.id, m])));

  const yo = staff.find((b) => b.id === selectedStaffId);

  const cargar = React.useCallback(async () => {
    try {
      const data = await dbService.getStaffOverrides();
      // CRM-02: el editor arranca con lo guardado (horario, días bloqueados y excepciones), no con el horario del config.
      const lista = siteConfig.staff.map((b) => conHorarioGuardado(b, data[b.id]));
      cargado.current = Object.fromEntries(lista.map((m) => [m.id, m]));
      setStaff(lista);
      setCargaFallo(false);
    } catch {
      setCargaFallo(true);
    }
  }, []);
  React.useEffect(() => { if (!TOUR_CONFIG.isDemoMode) void cargar(); }, [cargar]);

  const cambiar = (fn: (m: StaffMember) => StaffMember) => {
    setStaff((prev) => prev.map((b) => (b.id === selectedStaffId ? fn(b) : b)));
    setDirty(true);
    setGuardado(false);
  };
  const cambiarDia = (d: Dia, fn: (w: WeeklySchedule[Dia]) => WeeklySchedule[Dia]) => cambiar((m) => ({ ...m, schedule: { ...m.schedule, [d]: fn(m.schedule[d]) } }));
  const copiarATodos = (desde: Dia) => cambiar((m) => {
    const src = m.schedule[desde];
    const schedule = { ...m.schedule };
    for (const d of diasEnOrden(m.schedule)) if (d !== desde && schedule[d].isOpen) schedule[d] = { ...schedule[d], hours: { ...src.hours }, breaks: src.breaks.map((b) => ({ ...b })) };
    return { ...m, schedule };
  });
  /** Una fecha: sin excepción (también la saca de blockedDates), día libre u horas especiales. */
  const fijarFecha = (f: string, ov: DateOverride | null) => cambiar((m) => {
    const dateOverrides = { ...(m.dateOverrides || {}) };
    if (ov) dateOverrides[f] = ov; else delete dateOverrides[f];
    // Sólo «יום חופש» deja la fecha en blockedDates; «שעות מיוחדות» o «ללא חריגה» la sacan (si no, la reserva la sigue cerrando).
    return { ...m, dateOverrides, blockedDates: ov?.type === "dayOff" ? m.blockedDates : (m.blockedDates || []).filter((x) => x !== f) };
  });

  const guardar = async () => {
    if (!yo || cargaFallo) return false;
    setIsSaving(true);
    setSaveError(null);
    try {
      await dbService.saveStaffOverride(selectedStaffId, { schedule: yo.schedule, blockedDates: yo.blockedDates || [], dateOverrides: yo.dateOverrides || {} });
      setDirty(false);
      setGuardado(true);
      await cargar();
      return true;
    } catch (error) {
      console.error("Failed to save staff data:", error);
      setSaveError(t.saveFailed);
      return false;
    } finally {
      setIsSaving(false);
    }
  };
  const elegir = (id: string) => {
    if (id === selectedStaffId) return;
    if (dirty) { setCambiarA(id); return; }
    setSelectedStaffId(id); setFecha(null); setSaveError(null); setGuardado(false);
  };
  const irA = (id: string) => { setCambiarA(null); setSelectedStaffId(id); setFecha(null); setDirty(false); setGuardado(false); };

  if (!yo) return <p className="py-16 text-center text-sm text-muted-foreground">{t.selectStaff}</p>;
  const avisoCarga = cargaFallo && (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-600/30 bg-red-500/10 px-4 py-3 text-sm text-red-900 dark:text-red-200">
      <span className="flex items-start gap-2"><AlertCircle size={18} aria-hidden className="mt-0.5 shrink-0" />לא הצלחנו לטעון את השעות השמורות. כדי לא לדרוס אותן, אי אפשר לשמור עד שהן נטענות.</span>
      <button type="button" onClick={() => void cargar()} className="h-11 rounded-xl border border-red-600/40 px-4 font-semibold">ניסיון נוסף</button>
    </div>
  );

  const ov = fecha ? yo.dateOverrides?.[fecha] : undefined;
  const bloqueada = !!fecha && (yo.blockedDates || []).includes(fecha);
  const estado: "normal" | "libre" | "especial" = ov?.type === "customHours" ? "especial" : ov?.type === "dayOff" || bloqueada ? "libre" : "normal";
  const fechaPrevia = fecha ?? format(new Date(), "yyyy-MM-dd");
  const servicio = siteConfig.services.find((s) => s.id === servicioId) ?? siteConfig.services[0];
  const horas: string[] = servicio ? generateSlots(parseISO(fechaPrevia), yo, servicio, []) : [];
  const fechaLarga = (f: string) => format(parseISO(f), "EEEE, d בMMMM", { locale: getDateFnsLocale() });

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {avisoCarga}
      <p className="text-sm text-muted-foreground">כאן קובעים מתי כל אחד מהצוות עובד. מה שנשמר כאן הוא מה שהלקוחות רואות כשהן קובעות תור.</p>

      <div role="group" aria-label="בחירת איש צוות" className="flex flex-wrap gap-2">
        {staff.map((m) => (
          <button key={m.id} type="button" onClick={() => elegir(m.id)} aria-pressed={m.id === selectedStaffId}
            className={cn("flex h-12 items-center gap-2 rounded-full border pe-4 ps-1.5 text-sm font-medium transition-colors", m.id === selectedStaffId ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted")}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-semibold text-foreground">
              {m.photoUrl ? <img src={m.photoUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <span aria-hidden>{m.name.charAt(0)}</span>}
            </span>
            {m.name.split(" ")[0]}
          </button>
        ))}
      </div>

      {/* Guardar arriba, con el estado (role=status); abajo, el mismo botón al terminar de editar */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3">
          <div role="status" className="min-w-0 text-sm">
            {saveError ? <span className="flex items-center gap-1.5 text-red-700 dark:text-red-400"><AlertCircle size={16} aria-hidden />{saveError}</span>
              : dirty ? <span className="text-foreground">יש שינויים שלא נשמרו</span>
              : guardado ? <span className="font-medium text-emerald-800 dark:text-emerald-300">נשמר ✓</span>
              : <span className="text-muted-foreground">הכל שמור</span>}
          </div>
          <button type="button" onClick={() => void guardar()} disabled={isSaving || cargaFallo || (!dirty && !saveError)}
            className="flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {isSaving ? <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" /> : <Save size={16} aria-hidden />}
            {t.commitButton}
          </button>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-5">
        <section aria-labelledby="crm03-semana" className="space-y-3 lg:col-span-3">
          <div>
            <h2 id="crm03-semana" className="text-lg font-bold text-foreground">השבוע הקבוע של {yo.name.split(" ")[0]}</h2>
            <p className="text-sm text-muted-foreground">חוזר בכל שבוע. ליום מסוים אחר — בלוח של ימים מיוחדים.</p>
          </div>
          <ul className="space-y-2">
            {diasEnOrden(yo.schedule).map((d) => {
              const w = yo.schedule[d];
              return (
                <li key={d} className={cn("rounded-2xl border p-3 sm:p-4", w.isOpen ? "border-border bg-card" : "border-dashed border-border bg-muted/30")}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-base font-semibold text-foreground">{nombreDia(d)}</span>
                    <button type="button" role="switch" aria-checked={w.isOpen} aria-label={`${nombreDia(d)}: יום עבודה`} onClick={() => cambiarDia(d, (x) => ({ ...x, isOpen: !x.isOpen }))}
                      className="flex h-11 items-center gap-2 rounded-xl px-2 text-sm text-foreground hover:bg-muted">
                      <span className="text-muted-foreground">{w.isOpen ? "יום עבודה" : "חופש"}</span>
                      <span aria-hidden className={cn("relative h-7 w-12 rounded-full transition-colors", w.isOpen ? "bg-primary" : "bg-muted-foreground/30")}>
                        <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-[inset-inline-start]", w.isOpen ? "start-6" : "start-1")} />
                      </span>
                    </button>
                  </div>
                  {w.isOpen && (
                    <div className="mt-2 space-y-2">
                      <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2">
                        <span className="text-sm text-muted-foreground">מ־</span>
                        <input type="time" aria-label={`${nombreDia(d)}: ${t.start}`} value={w.hours.start} onChange={(e) => cambiarDia(d, (x) => ({ ...x, hours: { ...x.hours, start: e.target.value } }))} className={campoHora} />
                        <span className="text-sm text-muted-foreground">עד</span>
                        <input type="time" aria-label={`${nombreDia(d)}: ${t.end}`} value={w.hours.end} onChange={(e) => cambiarDia(d, (x) => ({ ...x, hours: { ...x.hours, end: e.target.value } }))} className={campoHora} />
                      </div>
                      {w.breaks.map((b, i) => (
                        <div key={i} className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-2">
                          <span className="text-sm text-muted-foreground">הפסקה</span>
                          <input type="time" aria-label={`${nombreDia(d)}: תחילת הפסקה ${i + 1}`} value={b.start} onChange={(e) => cambiarDia(d, (x) => ({ ...x, breaks: x.breaks.map((y, j) => (j === i ? { ...y, start: e.target.value } : y)) }))} className={campoHora} />
                          <span className="text-sm text-muted-foreground">עד</span>
                          <input type="time" aria-label={`${nombreDia(d)}: סוף הפסקה ${i + 1}`} value={b.end} onChange={(e) => cambiarDia(d, (x) => ({ ...x, breaks: x.breaks.map((y, j) => (j === i ? { ...y, end: e.target.value } : y)) }))} className={campoHora} />
                          <button type="button" aria-label={`הסרת הפסקה ${i + 1} של ${nombreDia(d)}`} onClick={() => cambiarDia(d, (x) => ({ ...x, breaks: x.breaks.filter((_, j) => j !== i) }))} className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} aria-hidden /></button>
                        </div>
                      ))}
                      <div className="flex flex-wrap gap-1">
                        <button type="button" onClick={() => cambiarDia(d, (x) => ({ ...x, breaks: [...x.breaks, { start: "13:00", end: "13:30", label: t.breakLabel }] }))} className={botonTexto}><Plus size={16} aria-hidden />הפסקה</button>
                        <button type="button" onClick={() => copiarATodos(d)} className={botonTexto}><Copy size={16} aria-hidden />העתקה לכל הימים</button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <div className="space-y-5 lg:col-span-2">
          <section aria-labelledby="crm03-especiales" className="space-y-3 rounded-2xl border border-border bg-card p-3 sm:p-4">
            <div>
              <h2 id="crm03-especiales" className="flex items-center gap-2 text-lg font-bold text-foreground"><CalendarDays size={20} aria-hidden />ימים מיוחדים</h2>
              <p className="text-sm text-muted-foreground">חופש, שעות אחרות ביום מסוים — מקישים על התאריך.</p>
            </div>
            <Calendar
              grande
              selected={fecha ? parseISO(fecha) : null}
              onSelect={(d) => { const f = format(d, "yyyy-MM-dd"); setFecha((p) => (p === f ? null : f)); }}
              disabled={(d) => isBefore(startOfDay(d), startOfDay(new Date()))}
              isDateBlocked={(d) => { const f = format(d, "yyyy-MM-dd"); return yo.dateOverrides?.[f]?.type === "dayOff" || !!yo.blockedDates?.includes(f); }}
              isDateCustomHours={(d) => yo.dateOverrides?.[format(d, "yyyy-MM-dd")]?.type === "customHours"}
            />
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-hidden>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-red-600/50 bg-red-500/10" />יום חופש</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-dashed border-amber-600/70 bg-amber-500/10" />שעות מיוחדות</span>
            </div>
            {fecha && (
              <div className="space-y-3 rounded-xl bg-muted/50 p-3">
                <p className="text-base font-semibold text-foreground">{fechaLarga(fecha)}</p>
                <div role="group" aria-label="מה קורה ביום הזה" className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-card p-1">
                  {([["normal", t.noException], ["libre", t.dayOff], ["especial", t.customHours]] as const).map(([k, n]) => (
                    <button key={k} type="button" aria-pressed={estado === k}
                      onClick={() => fijarFecha(fecha, k === "normal" ? null : k === "libre" ? { type: "dayOff" } : { type: "customHours", start: ov?.type === "customHours" ? ov.start : "09:00", end: ov?.type === "customHours" ? ov.end : "18:00" })}
                      className={cn("min-h-11 rounded-lg px-1 text-sm font-medium", estado === k ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted")}>{n}</button>
                  ))}
                </div>
                {ov?.type === "customHours" && (
                  <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2">
                    <span className="text-sm text-muted-foreground">מ־</span>
                    <input type="time" aria-label={`${fechaLarga(fecha)}: ${t.start}`} value={ov.start} onChange={(e) => fijarFecha(fecha, { type: "customHours", start: e.target.value, end: ov.end })} className={campoHora} />
                    <span className="text-sm text-muted-foreground">עד</span>
                    <input type="time" aria-label={`${fechaLarga(fecha)}: ${t.end}`} value={ov.end} onChange={(e) => fijarFecha(fecha, { type: "customHours", start: ov.start, end: e.target.value })} className={campoHora} />
                  </div>
                )}
              </div>
            )}
          </section>

          <section role="region" aria-label="תצוגה מקדימה של ההזמנה" className="space-y-3 rounded-2xl border border-border bg-card p-3 sm:p-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">כך זה נראה בהזמנה</h2>
              <p className="text-sm text-muted-foreground">{fechaLarga(fechaPrevia)}{dirty ? " · אחרי השמירה" : ""} · לפני תורים שכבר נקבעו</p>
            </div>
            {siteConfig.services.length > 1 && (
              <div>
                <label htmlFor="crm03-servicio-previa" className="mb-1.5 block text-sm font-medium text-foreground">שירות</label>
                <select id="crm03-servicio-previa" value={servicioId} onChange={(e) => setServicioId(e.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground">
                  {siteConfig.services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            {horas.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">אין שעות פנויות ביום הזה.{!fecha && <><br />אפשר לבחור תאריך בלוח כדי לראות יום אחר.</>}</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {horas.map((h) => <li key={h} dir="ltr" className="rounded-lg bg-muted px-2.5 py-1 text-sm tabular-nums text-foreground">{h}{" "}</li>)}
              </ul>
            )}
          </section>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={() => void guardar()} disabled={isSaving || cargaFallo || (!dirty && !saveError)} className="flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          <Save size={16} aria-hidden />{t.commitButton}
        </button>
      </div>

      {cambiarA && <AvisoSinGuardar de={yo.name.split(" ")[0]} a={staff.find((m) => m.id === cambiarA)?.name.split(" ")[0] ?? ""} cancelar={() => setCambiarA(null)} descartar={() => { const id = selectedStaffId; setStaff((prev) => prev.map((m) => (m.id === id ? cargado.current[id] ?? m : m))); irA(cambiarA); }} guardarYSeguir={async () => { if (await guardar()) irA(cambiarA); }} />}
    </div>
  );
}

function AvisoSinGuardar({ de, a, cancelar, descartar, guardarYSeguir }: { de: string; a: string; cancelar: () => void; descartar: () => void; guardarYSeguir: () => void }) {
  const ref = React.useRef<HTMLButtonElement>(null);
  const alCancelar = React.useRef(cancelar);
  alCancelar.current = cancelar;
  React.useEffect(() => { ref.current?.focus(); }, []);
  React.useEffect(() => {
    const k = (ev: KeyboardEvent) => { if (ev.key === "Escape") alCancelar.current(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center" onClick={cancelar}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="crm03-sin-guardar" aria-describedby="crm03-sin-guardar-d" onClick={(e) => e.stopPropagation()} className="w-full max-w-md space-y-4 rounded-t-3xl border border-border bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:pb-5">
        <h2 id="crm03-sin-guardar" className="text-lg font-bold text-foreground">לשמור את השינויים של {de}?</h2>
        <p id="crm03-sin-guardar-d" className="text-sm text-muted-foreground">לפני שעוברים ל{a}: השינויים בלוח הזמנים של {de} עוד לא נשמרו.</p>
        <div className="grid gap-2">
          <button type="button" onClick={guardarYSeguir} className="h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground">שמירה ומעבר ל{a}</button>
          <button type="button" onClick={descartar} className="h-11 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted">מעבר בלי לשמור</button>
          <button ref={ref} type="button" onClick={cancelar} className="h-11 rounded-xl text-sm font-medium text-foreground hover:bg-muted">ביטול</button>
        </div>
      </div>
    </div>
  );
}
