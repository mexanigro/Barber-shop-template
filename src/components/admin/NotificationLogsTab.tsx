import React from "react";
import { Bell, AlertCircle, CheckCircle, Clock, Mail } from "lucide-react";
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
  {
    id: "demo-log-1",
    clientId: "demo",
    channel: "email",
    recipient: "david.c@gmail.com",
    subject: "Appointment Confirmation – Today at 10:00",
    type: "booking",
    status: "sent",
    createdAt: subHours(now, 1),
  },
  {
    id: "demo-log-2",
    clientId: "demo",
    channel: "email",
    recipient: "yossi.l@gmail.com",
    subject: "Appointment Reminder – Tomorrow at 11:30",
    type: "reminder",
    status: "sent",
    createdAt: subHours(now, 3),
  },
  {
    id: "demo-log-3",
    clientId: "demo",
    channel: "email",
    recipient: "amit.s@gmail.com",
    subject: "Booking Cancelled",
    type: "booking",
    status: "sent",
    createdAt: subHours(now, 5),
  },
  {
    id: "demo-log-4",
    clientId: "demo",
    channel: "email",
    recipient: "eyal.m@gmail.com",
    subject: "Message received from your website",
    type: "contact",
    status: "sent",
    createdAt: subDays(now, 1),
  },
  {
    id: "demo-log-5",
    clientId: "demo",
    channel: "email",
    recipient: "noam.k@gmail.com",
    subject: "Appointment Reminder – Today at 09:30",
    type: "reminder",
    status: "failed",
    error: "550 5.1.1 The email account does not exist.",
    createdAt: subDays(now, 1),
  },
  {
    id: "demo-log-6",
    clientId: "demo",
    channel: "email",
    recipient: "michael.b@gmail.com",
    subject: "Appointment Confirmation – Yesterday at 16:00",
    type: "booking",
    status: "sent",
    createdAt: subDays(now, 2),
  },
];

export function NotificationLogsTab() {
  const t = localeConfig.admin.notificationLogs;

  const [items, setItems] = React.useState<NotificationLog[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (TOUR_CONFIG.isDemoMode) {
      setItems(DEMO_LOGS);
      setLoading(false);
      return;
    }
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

      {/* Info banner explaining what this tab does */}
      <div className="flex items-start gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] px-4 py-3">
        <Mail size={15} className="mt-0.5 shrink-0 text-blue-400" />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t.hint}
        </p>
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
          <div className="max-h-[min(520px,70vh)] overflow-x-auto overflow-y-auto">
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
      )}
    </div>
  );
}
