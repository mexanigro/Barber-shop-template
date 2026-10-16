// CRM-03 · diseño (clon de diseño): la ficha de una clienta. Un diálogo lateral (pantalla entera en el celular) con su etapa, cómo
// contactarla (llamar, WhatsApp con 972, mail), etiquetas, notas que se guardan solas —y avisan si no se guardaron— y sus turnos.
// La regla de qué turnos son suyos no cambia (selectCustomerAppointmentCandidates, CRM-02); se explica en una línea.
import React from "react";
import { AlertCircle, Check, Loader2, Mail, MessageCircle, Phone, Plus, X } from "lucide-react";
import { format, parse } from "date-fns";
import type { Appointment, Customer, CustomerStage } from "../../types";
import {
  CUSTOMER_STAGES,
  MAX_TAG_LENGTH,
  MAX_TAGS_PER_CUSTOMER,
  applyTagsPatch,
  selectCustomerAppointmentCandidates,
  deriveStage,
  normalizeTag,
} from "../../lib/customer-pipeline";
import { localeConfig } from "../../config/locale";
import { TOUR_CONFIG } from "../../config/tour.config";
import { auth as firebaseAuth } from "../../lib/firebase";
import { siteConfig } from "../../config/site";
import { customerService } from "../../services/customers";
import { cn } from "../../lib/utils";
import { useModalA11y } from "../../hooks/useModalA11y";
import { origenHe } from "./CustomersKanban";
import { nombreMetodo } from "./crm03/AgendaDia";
import { waNumero } from "../../lib/telefono";

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

const DIAS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
const ESTADO: Record<string, { texto: string; clase: string }> = {
  confirmed: { texto: "מאושר", clase: "bg-emerald-600/10 text-emerald-800 dark:text-emerald-300" },
  pending: { texto: "ממתין לאישור", clase: "bg-amber-500/15 text-amber-900 dark:text-amber-200" },
  completed: { texto: "התקיים", clase: "bg-muted text-foreground" },
  cancelled: { texto: "בוטל", clase: "bg-red-600/10 text-red-800 dark:text-red-300" },
  expired: { texto: "פג תוקף", clase: "bg-muted text-muted-foreground" },
};


export type CustomerDetailPanelProps = {
  customerId: string;
  customers: Customer[];
  appointments: Appointment[];
  onClose: () => void;
  onCustomerUpdated: (customer: Customer) => void;
  onStageChange: (customerId: string, stage: CustomerStage) => void;
};

export function CustomerDetailPanel({ customerId, customers, appointments, onClose, onCustomerUpdated, onStageChange }: CustomerDetailPanelProps) {
  const t = localeConfig.admin.pipeline;
  const services = siteConfig.services;
  const staff = siteConfig.staff;
  const ref = useModalA11y(true, onClose);
  React.useEffect(() => { const antes = document.activeElement as HTMLElement | null; return () => { antes?.focus?.({ preventScroll: true }); }; }, []);

  const customer = React.useMemo(() => customers.find((c) => c.id === customerId) ?? null, [customers, customerId]);
  const customerAppts = React.useMemo<Appointment[]>(() => {
    if (!customer) return [];
    return selectCustomerAppointmentCandidates(appointments, customer, customers).sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1));
  }, [appointments, customer, customers]);
  const derivedStage = customer ? deriveStage(customer) : "lead";

  // Notas: se guardan solas a los 600 ms; si falla, se dice y se puede reintentar (antes fallaba en silencio).
  const [notes, setNotes] = React.useState<string>(customer?.notes ?? "");
  const [notasEstado, setNotasEstado] = React.useState<"" | "guardando" | "guardado" | "error">("");
  React.useEffect(() => { setNotes(customer?.notes ?? ""); }, [customerId, customer?.notes]);
  const lastSavedNotes = React.useRef<string>(customer?.notes ?? "");
  const guardarNotas = React.useCallback(async (texto: string) => {
    if (!customer) return;
    setNotasEstado("guardando");
    try {
      if (!TOUR_CONFIG.isDemoMode) await customerService.updateCustomer(customer.id, { notes: texto });
      lastSavedNotes.current = texto;
      onCustomerUpdated({ ...customer, notes: texto });
      setNotasEstado("guardado");
    } catch (err) {
      console.error("[CustomerDetail] notas:", err);
      setNotasEstado("error");
    }
  }, [customer, onCustomerUpdated]);
  React.useEffect(() => {
    if (!customer || notes === lastSavedNotes.current) return;
    const h = window.setTimeout(() => { void guardarNotas(notes); }, 600);
    return () => window.clearTimeout(h);
  }, [notes, customer, guardarNotas]);

  // Etiquetas: optimistas, y si el servidor no las acepta vuelven atrás con aviso.
  const [tagDraft, setTagDraft] = React.useState("");
  const [tagsSaving, setTagsSaving] = React.useState(false);
  const [tagsError, setTagsError] = React.useState(false);
  const patchTags = async (add: string[], remove: string[]) => {
    if (!customer) return;
    const antes = customer;
    onCustomerUpdated({ ...customer, tags: applyTagsPatch(customer.tags, { add, remove }) });
    if (TOUR_CONFIG.isDemoMode) return;
    setTagsSaving(true);
    setTagsError(false);
    try {
      const headers = await getAdminAuthHeader();
      if (!headers.Authorization) throw new Error("sin sesión");
      const res = await fetch(`/api/customers/${encodeURIComponent(customer.id)}/tags`, { method: "PATCH", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ add, remove }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error("[CustomerDetail] etiquetas:", err);
      onCustomerUpdated(antes);
      setTagsError(true);
    } finally {
      setTagsSaving(false);
    }
  };
  const tags = Array.isArray(customer?.tags) ? customer!.tags : [];
  const handleAddTag = async () => {
    const norm = normalizeTag(tagDraft);
    if (!norm || !customer) return;
    if (tags.includes(norm)) { setTagDraft(""); return; }
    if (tags.length >= MAX_TAGS_PER_CUSTOMER) return;
    setTagDraft("");
    await patchTags([norm], []);
  };

  if (!customer) return null;
  const email = customer.email && !customer.email.endsWith("@noemail.local") ? customer.email : "";
  const boton = "flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-muted";
  const cuando = (a: Appointment) => { const d = parse(a.date, "yyyy-MM-dd", new Date()); return `יום ${DIAS[d.getDay()]} ${format(d, "d.M.yy")}`; };

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch justify-end bg-black/40" onClick={onClose}>
      <aside ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="ficha-nombre" onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-xl flex-col overflow-y-auto border-s border-border bg-card shadow-2xl outline-none">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-semibold text-foreground">{customer.fullName.charAt(0)}</span>
            <div className="min-w-0">
              <h2 id="ficha-nombre" className="truncate text-xl font-bold text-foreground">{customer.fullName}</h2>
              <p className="text-sm text-muted-foreground">
                {[customer.source ? origenHe(customer.source) : "", customer.createdAt ? `נוספה ${format(customer.createdAt, "d.M.yy")}` : ""].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="סגירה" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"><X size={20} aria-hidden /></button>
        </div>

        <section aria-labelledby="ficha-contacto" className="border-b border-border px-4 py-4 sm:px-6">
          <h3 id="ficha-contacto" className="sr-only">יצירת קשר</h3>
          <dl className="mb-3 space-y-1 text-sm">
            {customer.phone && <div className="flex gap-2"><dt className="w-14 shrink-0 text-muted-foreground">טלפון</dt><dd dir="ltr" className="text-foreground">{customer.phone}</dd></div>}
            {email && <div className="flex gap-2"><dt className="w-14 shrink-0 text-muted-foreground">מייל</dt><dd dir="ltr" className="truncate text-foreground">{email}</dd></div>}
          </dl>
          <div className="grid grid-cols-3 gap-2">
            {customer.phone ? <a href={`tel:${customer.phone}`} className={boton}><Phone size={16} aria-hidden />חיוג</a> : <span />}
            {customer.phone ? <a href={`https://wa.me/${waNumero(customer.phone)}`} target="_blank" rel="noreferrer" className={boton}><MessageCircle size={16} aria-hidden />וואטסאפ</a> : <span />}
            {email ? <a href={`mailto:${email}`} className={boton}><Mail size={16} aria-hidden />מייל</a> : <span />}
          </div>
        </section>

        <section aria-labelledby="ficha-etapa" className="border-b border-border px-4 py-4 sm:px-6">
          <h3 id="ficha-etapa" className="mb-2 text-base font-semibold text-foreground">שלב</h3>
          <div role="group" aria-labelledby="ficha-etapa" className="flex flex-wrap gap-1.5">
            {CUSTOMER_STAGES.map((s) => (
              <button key={s} type="button" aria-pressed={derivedStage === s} onClick={() => onStageChange(customer.id, s)}
                className={cn("h-11 rounded-full border px-4 text-sm font-medium transition-colors", derivedStage === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted")}>{t.stages[s]}</button>
            ))}
          </div>
        </section>

        <section aria-labelledby="ficha-turnos" className="border-b border-border px-4 py-4 sm:px-6">
          <h3 id="ficha-turnos" className="text-base font-semibold text-foreground">התורים שלה</h3>
          <p className="mb-2 text-xs text-muted-foreground">תורים עם אותו שם, טלפון ומייל.</p>
          {customerAppts.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">עוד אין תורים שתואמים לפרטים שלה.</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {customerAppts.map((a) => {
                const svc = services.find((s) => s.id === a.serviceId);
                const quien = staff.find((s) => s.id === a.staffId);
                const e = ESTADO[a.status] ?? ESTADO.expired;
                return (
                  <li key={a.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{svc?.name ?? "—"}</p>
                      <p className="text-sm text-muted-foreground">{cuando(a)} · <span dir="ltr" className="tabular-nums">{a.time}</span>{quien ? ` · ${quien.name.split(" ")[0]}` : ""}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", e.clase)}>{e.texto}</span>
                      {a.paymentStatus === "paid" && <span className="text-xs tabular-nums text-muted-foreground">₪{Math.round((a.amountPaidCents ?? (svc?.price ?? 0) * 100) / 100).toLocaleString("he-IL")}{nombreMetodo(a.paymentMethod) ? ` · ${nombreMetodo(a.paymentMethod)}` : ""}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="ficha-notas" className="border-b border-border px-4 py-4 sm:px-6">
          <div className="mb-2 flex items-center justify-between gap-2">
            <label id="ficha-notas" htmlFor="ficha-notas-texto" className="text-base font-semibold text-foreground">הערות</label>
            <span role="status" className="text-xs">
              {notasEstado === "guardando" ? <span className="text-muted-foreground">שומר…</span>
                : notasEstado === "guardado" ? <span className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-300"><Check size={14} aria-hidden />נשמר</span>
                : null}
            </span>
          </div>
          <textarea id="ficha-notas-texto" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="מה חשוב לזכור עליה: צבע, רגישויות, העדפות…" rows={4}
            className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" />
          <p className="mt-1 text-xs text-muted-foreground">נשמר לבד בזמן הכתיבה. רק את והצוות רואים.</p>
          {notasEstado === "error" && (
            <div role="alert" className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-600/30 bg-red-500/10 px-3 py-2 text-sm text-red-900 dark:text-red-200">
              <span className="flex items-center gap-2"><AlertCircle size={16} aria-hidden />ההערות לא נשמרו.</span>
              <button type="button" onClick={() => void guardarNotas(notes)} className="h-11 rounded-xl border border-red-600/40 px-3 font-semibold">ניסיון נוסף</button>
            </div>
          )}
        </section>

        <section aria-labelledby="ficha-etiquetas" className="px-4 py-4 sm:px-6">
          <div className="mb-2 flex items-center gap-2">
            <h3 id="ficha-etiquetas" className="text-base font-semibold text-foreground">תגיות</h3>
            {tagsSaving && <Loader2 size={14} className="animate-spin text-muted-foreground" aria-label="שומר" />}
          </div>
          <ul className="mb-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <li key={tag} className="inline-flex items-center rounded-full bg-muted ps-3 text-sm text-foreground">
                {tag}
                <button type="button" onClick={() => void patchTags([], [tag])} aria-label={`הסרת התגית ${tag}`} className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"><X size={16} aria-hidden /></button>
              </li>
            ))}
          </ul>
          {tags.length < MAX_TAGS_PER_CUSTOMER && (
            <form onSubmit={(e) => { e.preventDefault(); void handleAddTag(); }} className="flex gap-2">
              <label htmlFor="ficha-tag" className="sr-only">תגית חדשה</label>
              <input id="ficha-tag" value={tagDraft} onChange={(e) => setTagDraft(e.target.value.slice(0, MAX_TAG_LENGTH))} placeholder="תגית חדשה, למשל: כלה" maxLength={MAX_TAG_LENGTH}
                className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" />
              <button type="submit" disabled={!normalizeTag(tagDraft)} className={cn(boton, "disabled:opacity-50")}><Plus size={16} aria-hidden />הוספה</button>
            </form>
          )}
          {tagsError && <p role="alert" className="mt-2 text-sm text-red-800 dark:text-red-300">התגיות לא נשמרו. אפשר לנסות שוב.</p>}
        </section>
      </aside>
    </div>
  );
}
