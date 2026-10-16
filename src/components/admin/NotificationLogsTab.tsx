// CRM-03 · diseño (clon de diseño): el registro de avisos (yoman mail) para la dueña. Cada aviso dice qué fue, a quién y si salió,
// en hebreo; en el celular una lista, en la computadora una tabla. Sin la jerga del proveedor ni el tamaño de página.
import React from "react";
import { AlertCircle, Bell, CheckCircle, ChevronLeft, ChevronRight, Clock, RefreshCw, Search } from "lucide-react";
import { NotificationLog } from "../../types";
import { notificationLogsService } from "../../services/notificationLogs";
import { localeConfig } from "../../config/locale";
import { TOUR_CONFIG } from "../../config/tour.config";
import { cn } from "../../lib/utils";
import { format, subHours, subDays } from "date-fns";
import { useAncho } from "./crm03/AgendaDia";

const TIPO: Record<string, string> = {
  booking: "אישור תור", reminder: "תזכורת", contact: "פנייה מהאתר", cancellation: "ביטול תור", reschedule: "שינוי מועד",
  digest: "סיכום יומי", marketing: "דיוור", invite: "הזמנה לצוות",
};
const tipo = (t: string) => TIPO[t] ?? "הודעה אחרת";
const ESTADO: Record<NotificationLog["status"], { texto: string; clase: string; Icono: typeof CheckCircle }> = {
  sent: { texto: "נשלח", clase: "bg-emerald-600/10 text-emerald-800 dark:text-emerald-300", Icono: CheckCircle },
  failed: { texto: "לא נשלח · נכשל", clase: "bg-red-600/10 text-red-800 dark:text-red-300", Icono: AlertCircle },
  queued: { texto: "לא נשלח עדיין", clase: "bg-amber-500/15 text-amber-900 dark:text-amber-200", Icono: Clock },
};
const POR_PAGINA = 25;

const now = new Date();
const DEMO_LOGS: NotificationLog[] = [
  { id: "demo-log-1", clientId: "demo", channel: "email", recipient: "david.c@gmail.com", subject: "התור שלך נקבע: תספורת, היום ב־10:00", type: "booking", status: "sent", createdAt: subHours(now, 1) },
  { id: "demo-log-2", clientId: "demo", channel: "email", recipient: "yossi.l@gmail.com", subject: "תזכורת: מחר ב-11:30", type: "reminder", status: "sent", createdAt: subHours(now, 3) },
  { id: "demo-log-3", clientId: "demo", channel: "email", recipient: "amit.s@gmail.com", subject: "התור שלך בוטל", type: "booking", status: "sent", createdAt: subHours(now, 5) },
  { id: "demo-log-4", clientId: "demo", channel: "email", recipient: "eyal.m@gmail.com", subject: "פנייה חדשה מהאתר", type: "contact", status: "sent", createdAt: subDays(now, 1) },
  { id: "demo-log-5", clientId: "demo", channel: "email", recipient: "noam.k@gmail.com", subject: "תזכורת: מחר ב-09:30", type: "reminder", status: "failed", error: "550 5.1.1 The email account does not exist.", createdAt: subDays(now, 1) },
  { id: "demo-log-6", clientId: "demo", channel: "email", recipient: "michael.b@gmail.com", subject: "התור שלך נקבע: צבע, אתמול ב־16:00", type: "booking", status: "sent", createdAt: subDays(now, 2) },
];

function Estado({ s }: { s: NotificationLog["status"] }) {
  const e = ESTADO[s];
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", e.clase)}><e.Icono size={14} aria-hidden />{e.texto}</span>;
}

export function NotificationLogsTab() {
  const t = localeConfig.admin.notificationLogs;
  const ancho = useAncho("(min-width: 1024px)");
  const [items, setItems] = React.useState<NotificationLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = React.useState<"all" | NotificationLog["status"]>("all");
  const [filtroTipo, setFiltroTipo] = React.useState("all");
  const [busqueda, setBusqueda] = React.useState("");
  const [pagina, setPagina] = React.useState(1);
  const [intento, setIntento] = React.useState(0);

  React.useEffect(() => {
    if (TOUR_CONFIG.isDemoMode) { setItems(DEMO_LOGS); setLoading(false); return; }
    setError(null);
    return notificationLogsService.subscribe(
      (data) => { setItems(data); setLoading(false); },
      () => { setError(t.errorLoad); setLoading(false); },
    );
  }, [intento]);

  const tipos = React.useMemo(() => [...new Set(items.map((i) => i.type))].sort(), [items]);
  const filtrados = React.useMemo(() => items.filter((i) =>
    (filtroEstado === "all" || i.status === filtroEstado) &&
    (filtroTipo === "all" || i.type === filtroTipo) &&
    (!busqueda.trim() || `${i.recipient} ${i.subject ?? ""}`.toLowerCase().includes(busqueda.toLowerCase()))), [items, filtroEstado, filtroTipo, busqueda]);
  const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const actual = Math.min(pagina, paginas);
  const visibles = filtrados.slice((actual - 1) * POR_PAGINA, actual * POR_PAGINA);
  React.useEffect(() => { setPagina(1); }, [filtroEstado, filtroTipo, busqueda]);
  const cuando = (d: Date) => format(d, "d.M, HH:mm");
  const campo = "h-11 rounded-xl border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <p className="text-sm text-muted-foreground">כל אימייל שהאתר שלח או ניסה לשלוח: אישורי תור, תזכורות ופניות מהאתר.</p>

      <div className="grid gap-2 sm:flex sm:flex-wrap">
        <div className="relative sm:min-w-[16rem] sm:flex-1">
          <Search size={18} aria-hidden className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="search" aria-label={t.searchPlaceholder} placeholder={t.searchPlaceholder} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className={cn(campo, "w-full ps-10 text-base")} />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <select aria-label="מצב" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)} className={campo}>
            <option value="all">{t.filterAll}</option>
            {(Object.keys(ESTADO) as NotificationLog["status"][]).map((k) => <option key={k} value={k}>{ESTADO[k].texto}</option>)}
          </select>
          <select aria-label="סוג" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className={campo}>
            <option value="all">{t.filterAllTypes}</option>
            {tipos.map((k) => <option key={k} value={k}>{tipo(k)}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div aria-busy="true" className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted/60" />)}</div>
      ) : error ? (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-foreground">{error}</p>
          <button type="button" onClick={() => { setLoading(true); setIntento((n) => n + 1); }} className="flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted"><RefreshCw size={16} aria-hidden />{localeConfig.admin.common.refresh}</button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Bell aria-hidden className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{t.empty}</p>
        </div>
      ) : filtrados.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">{t.noResults}</p>
      ) : (
        <>
          {ancho ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 text-start font-medium">{t.colWhen}</th>
                    <th scope="col" className="px-3 py-2.5 text-start font-medium">{t.colType}</th>
                    <th scope="col" className="px-3 py-2.5 text-start font-medium">{t.colRecipient}</th>
                    <th scope="col" className="px-3 py-2.5 text-start font-medium">{t.colSubject}</th>
                    <th scope="col" className="px-4 py-2.5 text-start font-medium">{t.colStatus}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibles.map((row) => (
                    <tr key={row.id}>
                      <td dir="ltr" className="whitespace-nowrap px-4 py-3 text-end tabular-nums text-muted-foreground">{cuando(row.createdAt)}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-medium text-foreground">{tipo(row.type)}</td>
                      <td dir="ltr" className="max-w-[14rem] truncate px-3 py-3 text-end text-foreground" title={row.recipient}>{row.recipient}</td>
                      <td className="max-w-[18rem] truncate px-3 py-3 text-muted-foreground" title={row.subject}>{row.subject ?? "—"}</td>
                      <td className="px-4 py-3"><Estado s={row.status} />{row.error && <p className="mt-1 max-w-[16rem] truncate text-xs text-muted-foreground" title={row.error}>{row.error}</p>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {visibles.map((row) => (
                <li key={row.id} className="space-y-1 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-foreground">{tipo(row.type)}</p>
                    <Estado s={row.status} />
                  </div>
                  <p dir="ltr" className="truncate text-end text-sm text-foreground">{row.recipient}</p>
                  {row.subject && <p className="text-sm text-muted-foreground">{row.subject}</p>}
                  <p dir="ltr" className="text-end text-xs tabular-nums text-muted-foreground">{cuando(row.createdAt)}</p>
                  {row.error && <p className="break-words text-xs text-muted-foreground">{row.error}</p>}
                </li>
              ))}
            </ul>
          )}

          {paginas > 1 && (
            <nav aria-label="עמודים" className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{filtrados.length} {t.totalLabel} · {t.pageLabel} {actual} מתוך {paginas}</p>
              <div className="flex items-center gap-2">
                <button type="button" aria-label="העמוד הקודם" onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={actual <= 1} className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-foreground hover:bg-muted disabled:opacity-40"><ChevronRight size={20} aria-hidden /></button>
                <button type="button" aria-label="העמוד הבא" onClick={() => setPagina((p) => Math.min(paginas, p + 1))} disabled={actual >= paginas} className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-foreground hover:bg-muted disabled:opacity-40"><ChevronLeft size={20} aria-hidden /></button>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
