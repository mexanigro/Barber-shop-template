import React from "react";
import { Bell, AlertCircle, CheckCircle, Clock, Mail, Search, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { NotificationLog } from "../../types";
import { notificationLogsService } from "../../services/notificationLogs";
import { localeConfig } from "../../config/locale";
import { TOUR_CONFIG } from "../../config/tour.config";
import { cn } from "../../lib/utils";
import { format, subHours, subDays } from "date-fns";

const statusStyle: Record<NotificationLog["status"], string> = {
  sent: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  failed: "border-red-500/30 bg-red-500/10 text-red-600",
  queued: "border-amber-500/30 bg-amber-500/10 text-amber-600",
};

const now = new Date();

const DEMO_LOGS: NotificationLog[] = [
  { id: "demo-log-1", clientId: "demo", channel: "email", recipient: "david.c@gmail.com", subject: "Appointment Confirmation – Today at 10:00", type: "booking", status: "sent", createdAt: subHours(now, 1) },
  { id: "demo-log-2", clientId: "demo", channel: "email", recipient: "yossi.l@gmail.com", subject: "Appointment Reminder – Tomorrow at 11:30", type: "reminder", status: "sent", createdAt: subHours(now, 3) },
  { id: "demo-log-3", clientId: "demo", channel: "email", recipient: "amit.s@gmail.com", subject: "Booking Cancelled", type: "booking", status: "sent", createdAt: subHours(now, 5) },
  { id: "demo-log-4", clientId: "demo", channel: "email", recipient: "eyal.m@gmail.com", subject: "Message received from your website", type: "contact", status: "sent", createdAt: subDays(now, 1) },
  { id: "demo-log-5", clientId: "demo", channel: "email", recipient: "noam.k@gmail.com", subject: "Appointment Reminder – Today at 09:30", type: "reminder", status: "failed", error: "550 5.1.1 The email account does not exist.", createdAt: subDays(now, 1) },
  { id: "demo-log-6", clientId: "demo", channel: "email", recipient: "michael.b@gmail.com", subject: "Appointment Confirmation – Yesterday at 16:00", type: "booking", status: "sent", createdAt: subDays(now, 2) },
];

type PageSize = 25 | 50 | 100;

export function NotificationLogsTab() {
  const t = localeConfig.admin.notificationLogs;

  const [items, setItems] = React.useState<NotificationLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = React.useState<"all" | NotificationLog["status"]>("all");
  const [filterType, setFilterType] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Pagination
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState<PageSize>(25);

  React.useEffect(() => {
    if (TOUR_CONFIG.isDemoMode) {
      setItems(DEMO_LOGS);
      setLoading(false);
      return;
    }
    const unsub = notificationLogsService.subscribe(
      (data) => {
        setItems(data);
        setLoading(false);
      },
      () => {
        setError(t.errorLoad ?? "Could not load notification logs.");
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  // Derive unique types for filter dropdown
  const availableTypes = React.useMemo(() => {
    const types = new Set(items.map((i) => i.type));
    return Array.from(types).sort();
  }, [items]);

  // Apply filters
  const filtered = React.useMemo(() => {
    let result = items;
    if (filterStatus !== "all") {
      result = result.filter((i) => i.status === filterStatus);
    }
    if (filterType !== "all") {
      result = result.filter((i) => i.type === filterType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.recipient.toLowerCase().includes(q) ||
          (i.subject ?? "").toLowerCase().includes(q),
      );
    }
    return result;
  }, [items, filterStatus, filterType, searchQuery]);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safeCurrentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  // Reset page when filters change
  React.useEffect(() => { setPage(1); }, [filterStatus, filterType, searchQuery, pageSize]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{t.subtitle}</p>
        <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-foreground">{t.title}</h2>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] px-4 py-3">
        <Mail size={15} className="mt-0.5 shrink-0 text-blue-400" />
        <p className="text-[11px] leading-relaxed text-muted-foreground">{t.hint}</p>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder ?? "Search recipient or subject…"}
            className="h-9 w-full rounded-xl border border-border bg-card ps-9 pe-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/40"
          />
        </div>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          className="h-9 rounded-xl border border-border bg-card px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/40"
        >
          <option value="all">{t.filterAll ?? "All statuses"}</option>
          <option value="sent">{localeConfig.admin.statuses.sent}</option>
          <option value="failed">{localeConfig.admin.statuses.failed}</option>
          <option value="queued">{localeConfig.admin.statuses.queued}</option>
        </select>

        {/* Type filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-9 rounded-xl border border-border bg-card px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/40"
        >
          <option value="all">{t.filterAllTypes ?? "All types"}</option>
          {availableTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        {/* Page size */}
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value) as PageSize)}
          className="h-9 rounded-xl border border-border bg-card px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/40"
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {loading ? (
        <div className="overflow-hidden rounded-[28px] border border-border bg-card/95">
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="h-5 w-5 shrink-0 animate-pulse rounded-full bg-muted/60" />
                <div className="w-24 shrink-0 h-3 animate-pulse rounded bg-muted/60" />
                <div className="w-14 shrink-0 h-3 animate-pulse rounded bg-muted/40" />
                <div className="flex-1 h-3 animate-pulse rounded bg-muted/40" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-red-500/30 bg-red-500/[0.02] p-16 text-center">
          <AlertCircle className="h-10 w-10 text-red-500/40" />
          <p className="text-[10px] font-black uppercase tracking-widest text-red-500">
            {error}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 rounded-xl border border-red-500/20 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-500 transition-colors hover:bg-red-500/10 active:scale-95"
          >
            <RefreshCw size={12} />
            {localeConfig.admin.common.refresh}
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-border bg-muted/40 p-12 text-center backdrop-blur-sm">
          <Bell className="mx-auto mb-4 h-10 w-10 text-muted-foreground/30" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.empty}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-muted/40 p-12 text-center">
          <Search className="mx-auto mb-4 h-8 w-8 text-muted-foreground/20" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.noResults ?? "No logs match your filters."}</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-[28px] border border-border bg-card/95 shadow-elevated">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="sticky top-0 bg-card/95 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground backdrop-blur-sm border-b border-border">
                  <tr>
                    <th className="px-4 py-3 sm:px-6">{t.colWhen}</th>
                    <th className="px-4 py-3 sm:px-6">{t.colStatus}</th>
                    <th className="px-4 py-3 sm:px-6">{t.colType}</th>
                    <th className="px-4 py-3 sm:px-6">{t.colRecipient}</th>
                    <th className="px-4 py-3 sm:px-6">{t.colSubject}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginated.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/30">
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-muted-foreground">
                        {format(row.createdAt, "MMM d, HH:mm")}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider",
                            statusStyle[row.status],
                          )}
                        >
                          {row.status === "sent" && <CheckCircle size={12} />}
                          {row.status === "failed" && <AlertCircle size={12} />}
                          {row.status === "queued" && <Clock size={12} />}
                          {localeConfig.admin.statuses[row.status as keyof typeof localeConfig.admin.statuses] ?? row.status}
                        </span>
                        {row.error && (
                          <p className="mt-1 max-w-xs truncate text-[10px] text-red-500" title={row.error}>
                            {row.error}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        {row.type}
                      </td>
                      <td className="max-w-[140px] truncate px-6 py-4 text-xs" title={row.recipient}>
                        {row.recipient}
                      </td>
                      <td className="max-w-[200px] truncate px-6 py-4 text-xs text-muted-foreground" title={row.subject}>
                        {row.subject ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination controls */}
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-muted-foreground">
              {filtered.length} {t.totalLabel ?? "total"} · {t.pageLabel ?? "page"} {safeCurrentPage}/{totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
