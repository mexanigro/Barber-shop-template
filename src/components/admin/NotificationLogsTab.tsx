import React from "react";
import { Bell, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { NotificationLog } from "../../types";
import { notificationLogsService } from "../../services/notificationLogs";
import { localeConfig } from "../../config/locale";
import { cn } from "../../lib/utils";
import { format } from "date-fns";

const statusStyle: Record<NotificationLog["status"], string> = {
  sent: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  failed: "border-red-500/30 bg-red-500/10 text-red-600",
  queued: "border-amber-500/30 bg-amber-500/10 text-amber-600",
};

export function NotificationLogsTab() {
  const t = localeConfig.admin.notificationLogs;

  const [items, setItems] = React.useState<NotificationLog[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsub = notificationLogsService.subscribe((data) => {
      setItems(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{t.subtitle}</p>
        <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-foreground">{t.title}</h2>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t.loading}</p>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-border bg-muted/40 p-12 text-center backdrop-blur-sm">
          <Bell className="mx-auto mb-4 h-10 w-10 text-muted-foreground/30" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.empty}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-border bg-card/95 shadow-elevated">
          <div className="border-b border-border bg-muted/40 px-6 py-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.hint}</p>
          </div>
          <div className="max-h-[min(520px,70vh)] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-card/95 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-3">{t.colWhen}</th>
                  <th className="px-6 py-3">{t.colStatus}</th>
                  <th className="px-6 py-3">{t.colType}</th>
                  <th className="px-6 py-3">{t.colRecipient}</th>
                  <th className="px-6 py-3">{t.colSubject}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30">
                    <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-muted-foreground">
                      {format(row.createdAt, "MMM d, HH:mm")}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider",
                          statusStyle[row.status]
                        )}
                      >
                        {row.status === "sent" && <CheckCircle size={12} />}
                        {row.status === "failed" && <AlertCircle size={12} />}
                        {row.status === "queued" && <Clock size={12} />}
                        {row.status}
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
      )}
    </div>
  );
}
