import React from "react";
import { Inbox, Mail, MailOpen, ArchiveX, MessageSquare, Globe, ChevronRight, RefreshCw } from "lucide-react";
import { ContactInboxItem, InboxStatus } from "../../types";
import { inboxService } from "../../services/inbox";
import { localeConfig } from "../../config/locale";
import { cn } from "../../lib/utils";
import { format } from "date-fns";

type FilterTab = "all" | InboxStatus;

const STATUS_FILTERS: FilterTab[] = ["all", "new", "read", "replied", "archived"];

const statusDot: Record<InboxStatus, string> = {
  new: "bg-accent-light animate-pulse",
  read: "bg-emerald-500",
  replied: "bg-primary",
  archived: "bg-muted-foreground/40",
};

export function InboxTab() {
  const t = localeConfig.admin.inbox;

  const [items, setItems] = React.useState<ContactInboxItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<FilterTab>("all");
  const [selected, setSelected] = React.useState<ContactInboxItem | null>(null);
  const [updating, setUpdating] = React.useState(false);

  // Real-time subscription
  React.useEffect(() => {
    const unsub = inboxService.subscribe((data) => {
      setItems(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Sync selected item when list updates (keeps detail panel fresh)
  React.useEffect(() => {
    if (!selected) return;
    const updated = items.find((i) => i.id === selected.id);
    if (updated) setSelected(updated);
  }, [items]);

  // Auto-mark as read when opened (if currently new)
  const handleSelect = async (item: ContactInboxItem) => {
    setSelected(item);
    if (item.status === "new") {
      try {
        await inboxService.updateStatus(item.id, "read");
      } catch {
        // non-fatal
      }
    }
  };

  const handleStatusChange = async (id: string, status: InboxStatus) => {
    setUpdating(true);
    try {
      await inboxService.updateStatus(id, status);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const filtered = React.useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.status === filter);
  }, [items, filter]);

  const countFor = (f: FilterTab) =>
    f === "all" ? items.length : items.filter((i) => i.status === f).length;

  const sourceLabel = (src: ContactInboxItem["source"]) => {
    if (src === "chat") return t.chatSource;
    if (src === "manual") return t.manualSource;
    return t.webSource;
  };

  const SourceIcon = ({ src }: { src: ContactInboxItem["source"] }) =>
    src === "chat" ? (
      <MessageSquare size={11} className="text-muted-foreground/60" />
    ) : (
      <Globe size={11} className="text-muted-foreground/60" />
    );

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* ── Left panel ── */}
      <aside className="lg:w-80 shrink-0 space-y-4">
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all",
                filter === f
                  ? "border-accent-light bg-accent-light text-zinc-950 shadow-lg shadow-accent-light/20"
                  : "border-border bg-muted/60 text-muted-foreground hover:border-accent-light/30 hover:text-foreground"
              )}
            >
              {t[f as keyof typeof t] ?? f}
              {countFor(f) > 0 && (
                <span className={cn(
                  "rounded px-1 text-[9px] font-black",
                  filter === f ? "bg-zinc-950/20 text-zinc-950" : "bg-border text-muted-foreground"
                )}>
                  {countFor(f)}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="overflow-hidden rounded-3xl border border-border bg-card/95 shadow-elevated">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-light border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <Inbox size={24} className="mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{t.empty}</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={cn(
                      "flex w-full items-start gap-3 px-5 py-4 text-start transition-colors hover:bg-muted/60",
                      selected?.id === item.id && "bg-accent-light/5"
                    )}
                  >
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", statusDot[item.status])} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn(
                          "truncate text-xs",
                          item.status === "new" ? "font-black text-foreground" : "font-bold text-muted-foreground"
                        )}>
                          {item.name}
                        </p>
                        <span className="shrink-0 text-[9px] text-muted-foreground/60">
                          {format(new Date(item.createdAt), "MMM d")}
                        </span>
                      </div>
                      <p className="truncate text-[10px] text-muted-foreground">{item.subject || item.email}</p>
                    </div>
                    <ChevronRight size={11} className="mt-1 shrink-0 text-muted-foreground/40" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* ── Right panel: detail ── */}
      <main className="min-w-0 flex-1 space-y-4">
        {!selected ? (
          <div className="flex h-64 items-center justify-center rounded-3xl border border-dashed border-border">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{t.selectPrompt}</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="overflow-hidden rounded-3xl border border-border bg-card/95 p-8 shadow-elevated">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", statusDot[selected.status])} />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                      {t[selected.status as keyof typeof t] ?? selected.status}
                    </span>
                  </div>
                  <h2 className="text-lg font-black uppercase tracking-tight text-foreground">
                    {selected.subject || "(no subject)"}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="font-bold">{t.from}: {selected.name} &lt;{selected.email}&gt;</span>
                    {selected.phone && <span>{selected.phone}</span>}
                    <span className="flex items-center gap-1">
                      <SourceIcon src={selected.source} />
                      {sourceLabel(selected.source)}
                    </span>
                    <span>{t.received}: {format(new Date(selected.createdAt), "MMM d, yyyy HH:mm")}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  {selected.status !== "read" && selected.status !== "replied" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(selected.id, "read")}
                      disabled={updating}
                      className="flex items-center gap-2 rounded-xl border border-border bg-muted/80 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-foreground transition-all hover:border-emerald-500/30 hover:text-emerald-500 disabled:opacity-40 active:scale-95"
                    >
                      <MailOpen size={12} />
                      {t.markRead}
                    </button>
                  )}
                  {selected.status !== "replied" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(selected.id, "replied")}
                      disabled={updating}
                      className="flex items-center gap-2 rounded-xl border border-border bg-muted/80 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-foreground transition-all hover:border-primary/30 hover:text-primary disabled:opacity-40 active:scale-95"
                    >
                      <Mail size={12} />
                      {t.markReplied}
                    </button>
                  )}
                  {selected.status !== "archived" ? (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(selected.id, "archived")}
                      disabled={updating}
                      className="flex items-center gap-2 rounded-xl border border-border bg-muted/80 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-all hover:border-red-500/20 hover:text-red-500 disabled:opacity-40 active:scale-95"
                    >
                      <ArchiveX size={12} />
                      {t.archive}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(selected.id, "new")}
                      disabled={updating}
                      className="flex items-center gap-2 rounded-xl border border-border bg-muted/80 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-all hover:border-accent-light/30 hover:text-accent-light disabled:opacity-40 active:scale-95"
                    >
                      <RefreshCw size={12} />
                      {t.reopen}
                    </button>
                  )}
                </div>
              </div>

              {/* Message body */}
              <div className="rounded-2xl border border-border bg-muted/40 px-6 py-5">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{selected.message}</p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
