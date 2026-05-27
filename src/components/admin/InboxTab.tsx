import React from "react";
import {
  Inbox,
  Mail,
  MailOpen,
  ArchiveX,
  MessageSquare,
  Globe,
  Phone,
  ChevronRight,
  RefreshCw,
  Send,
  ExternalLink,
  AlertTriangle,
  Pause,
  Play,
  CheckCircle2,
} from "lucide-react";
import { ContactInboxItem, InboxStatus } from "../../types";
import { inboxService } from "../../services/inbox";
import { localeConfig } from "../../config/locale";
import { TOUR_CONFIG } from "../../config/tour.config";
import { DEMO_INBOX } from "../../config/demo-data";
import { cn } from "../../lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { auth as firebaseAuth } from "../../lib/firebase";

type FilterTab = "all" | InboxStatus;

const STATUS_FILTERS: FilterTab[] = ["all", "new", "read", "replied", "archived"];

const statusDot: Record<InboxStatus, string> = {
  new: "bg-accent-light animate-pulse",
  read: "bg-emerald-500",
  replied: "bg-primary",
  archived: "bg-muted-foreground/40",
};

type WhatsAppThreadMessage = {
  role: string;
  text: string;
  timestamp?: string;
};

type WhatsAppThreadResponse = {
  exists: boolean;
  phone: string;
  clientId: string;
  messages: WhatsAppThreadMessage[];
  lastMessageAt?: string;
};

type ThreadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; data: WhatsAppThreadResponse }
  | { status: "error"; message: string };

type QueueState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "queued"; at: number }
  | { status: "delayed" }
  | { status: "error"; message: string };

type PauseState =
  | { status: "idle"; paused: boolean }
  | { status: "loading" }
  | { status: "updating"; nextPaused: boolean }
  | { status: "error"; message: string; paused: boolean };

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

function buildWaMeUrl(phone: string, text: string): string {
  // wa.me wants digits only — no +, no spaces.
  const digits = phone.replace(/[^\d]/g, "");
  const params = text.trim() ? `?text=${encodeURIComponent(text.trim())}` : "";
  return `https://wa.me/${digits}${params}`;
}

function formatRelativeTime(iso?: string): string {
  if (!iso) return "";
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

export function InboxTab() {
  const t = localeConfig.admin.inbox;

  const [items, setItems] = React.useState<ContactInboxItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<FilterTab>("all");
  const [selected, setSelected] = React.useState<ContactInboxItem | null>(null);
  const [updating, setUpdating] = React.useState(false);

  const [thread, setThread] = React.useState<ThreadState>({ status: "idle" });
  const [replyDraft, setReplyDraft] = React.useState("");
  const [queueState, setQueueState] = React.useState<QueueState>({ status: "idle" });
  const queueTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [pauseState, setPauseState] = React.useState<PauseState>({ status: "loading" });

  React.useEffect(() => {
    if (TOUR_CONFIG.isDemoMode) {
      setItems(DEMO_INBOX);
      setLoading(false);
      return;
    }
    const unsub = inboxService.subscribe((data) => {
      setItems(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Keep selected fresh when the list updates
  React.useEffect(() => {
    if (!selected) return;
    const updated = items.find((i) => i.id === selected.id);
    if (updated) setSelected(updated);
  }, [items]);

  // Load pause state once on mount (admin only — silently degrades if endpoint
  // is unavailable in demo or unconfigured environments).
  React.useEffect(() => {
    if (TOUR_CONFIG.isDemoMode) {
      setPauseState({ status: "idle", paused: false });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const headers = await getAdminAuthHeader();
        if (!headers.Authorization) {
          setPauseState({ status: "idle", paused: false });
          return;
        }
        const res = await fetch("/api/whatsapp/config", { headers });
        if (!res.ok) {
          if (!cancelled) setPauseState({ status: "idle", paused: false });
          return;
        }
        const data = await res.json();
        if (!cancelled) setPauseState({ status: "idle", paused: data.paused === true });
      } catch {
        if (!cancelled) setPauseState({ status: "idle", paused: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load conversation thread when a whatsapp-source item is selected.
  React.useEffect(() => {
    setReplyDraft("");
    setQueueState({ status: "idle" });
    if (queueTimeoutRef.current) {
      clearTimeout(queueTimeoutRef.current);
      queueTimeoutRef.current = null;
    }
    if (!selected || selected.source !== "whatsapp" || !selected.phone) {
      setThread({ status: "idle" });
      return;
    }
    if (TOUR_CONFIG.isDemoMode) {
      setThread({
        status: "loaded",
        data: {
          exists: true,
          phone: selected.phone,
          clientId: "demo",
          messages: [
            { role: "user", text: selected.message, timestamp: selected.createdAt.toISOString() },
            { role: "assistant", text: "Hi! Thanks for reaching out — happy to help.", timestamp: selected.createdAt.toISOString() },
          ],
        },
      });
      return;
    }
    let cancelled = false;
    setThread({ status: "loading" });
    (async () => {
      try {
        const headers = await getAdminAuthHeader();
        const res = await fetch(
          `/api/whatsapp/conversation?phone=${encodeURIComponent(selected.phone!)}`,
          { headers },
        );
        if (!res.ok) {
          const msg = res.status === 401 || res.status === 403 ? "unauthorized" : `${res.status}`;
          if (!cancelled) setThread({ status: "error", message: msg });
          return;
        }
        const data = (await res.json()) as WhatsAppThreadResponse;
        if (!cancelled) setThread({ status: "loaded", data });
      } catch (err) {
        if (!cancelled) setThread({ status: "error", message: String(err) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected?.id, selected?.phone, selected?.source]);

  React.useEffect(() => {
    return () => {
      if (queueTimeoutRef.current) clearTimeout(queueTimeoutRef.current);
    };
  }, []);

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
    if (src === "whatsapp") return t.whatsappSource;
    if (src === "manual") return t.manualSource;
    return t.webSource;
  };

  const SourceIcon = ({ src }: { src: ContactInboxItem["source"] }) =>
    src === "chat" ? (
      <MessageSquare size={11} className="text-muted-foreground/60" />
    ) : src === "whatsapp" ? (
      <Phone size={11} className="text-muted-foreground/60" />
    ) : (
      <Globe size={11} className="text-muted-foreground/60" />
    );

  const isWhatsApp = selected?.source === "whatsapp" && !!selected?.phone;
  const threadMessages = thread.status === "loaded" ? thread.data.messages : [];

  const handleWaMeReply = async () => {
    if (!selected || !selected.phone) return;
    window.open(buildWaMeUrl(selected.phone, replyDraft), "_blank", "noopener,noreferrer");
    if (selected.status !== "replied") {
      try {
        await inboxService.updateStatus(selected.id, "replied");
      } catch {
        /* non-fatal */
      }
    }
  };

  const handleQueueReply = async () => {
    if (!selected || !selected.phone) return;
    const body = replyDraft.trim();
    if (!body) return;
    setQueueState({ status: "sending" });
    if (queueTimeoutRef.current) clearTimeout(queueTimeoutRef.current);
    if (TOUR_CONFIG.isDemoMode) {
      setQueueState({ status: "queued", at: Date.now() });
      setReplyDraft("");
      return;
    }
    try {
      const headers = {
        "Content-Type": "application/json",
        ...(await getAdminAuthHeader()),
      };
      const res = await fetch("/api/whatsapp/queue-message", {
        method: "POST",
        headers,
        body: JSON.stringify({ phone: selected.phone, message: body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setQueueState({ status: "error", message: data?.error ?? t.replyError });
        return;
      }
      setQueueState({ status: "queued", at: Date.now() });
      setReplyDraft("");
      queueTimeoutRef.current = setTimeout(() => {
        setQueueState((prev) => (prev.status === "queued" ? { status: "delayed" } : prev));
      }, 60_000);
      if (selected.status !== "replied") {
        try {
          await inboxService.updateStatus(selected.id, "replied");
        } catch {
          /* non-fatal */
        }
      }
    } catch (err) {
      console.error("[InboxTab] queue reply failed:", err);
      setQueueState({ status: "error", message: t.replyError });
    }
  };

  const handleTogglePause = async () => {
    const current =
      pauseState.status === "idle"
        ? pauseState.paused
        : pauseState.status === "error"
          ? pauseState.paused
          : false;
    const nextPaused = !current;
    if (nextPaused) {
      const ok = window.confirm(t.pauseConfirm);
      if (!ok) return;
    }
    setPauseState({ status: "updating", nextPaused });
    if (TOUR_CONFIG.isDemoMode) {
      setPauseState({ status: "idle", paused: nextPaused });
      return;
    }
    try {
      const headers = {
        "Content-Type": "application/json",
        ...(await getAdminAuthHeader()),
      };
      const res = await fetch("/api/whatsapp/pause", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ paused: nextPaused }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setPauseState({
          status: "error",
          message: data?.error ?? "Failed",
          paused: current,
        });
        return;
      }
      const data = await res.json();
      setPauseState({ status: "idle", paused: data.paused === true });
    } catch (err) {
      console.error("[InboxTab] toggle pause failed:", err);
      setPauseState({ status: "error", message: String(err), paused: current });
    }
  };

  const pauseDisplay: { paused: boolean; busy: boolean } = (() => {
    if (pauseState.status === "loading") return { paused: false, busy: true };
    if (pauseState.status === "updating") return { paused: pauseState.nextPaused, busy: true };
    if (pauseState.status === "idle") return { paused: pauseState.paused, busy: false };
    return { paused: pauseState.paused, busy: false };
  })();

  return (
    <div className="flex flex-col gap-5">
      {/* ── WhatsApp agent pause toggle ── */}
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-4 transition-colors",
          pauseDisplay.paused
            ? "border-red-500/30 bg-red-500/[0.04]"
            : "border-emerald-500/20 bg-emerald-500/[0.03]",
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              pauseDisplay.paused
                ? "bg-red-500/10 text-red-500"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            )}
          >
            {pauseDisplay.paused ? <Pause size={16} /> : <Play size={16} />}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
              {t.pauseHeading}
            </p>
            <p
              className={cn(
                "text-sm font-bold",
                pauseDisplay.paused ? "text-red-500" : "text-emerald-600 dark:text-emerald-400",
              )}
            >
              {pauseDisplay.paused ? t.pausePaused : t.pauseActive}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleTogglePause}
          disabled={pauseDisplay.busy}
          className={cn(
            "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50",
            pauseDisplay.paused
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20",
          )}
        >
          {pauseDisplay.busy ? (
            <>
              <RefreshCw size={12} className="animate-spin" />
              {t.pauseUpdating}
            </>
          ) : pauseDisplay.paused ? (
            <>
              <Play size={12} />
              {t.resumeButton}
            </>
          ) : (
            <>
              <Pause size={12} />
              {t.pauseButton}
            </>
          )}
        </button>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row">
      {/* ── Left panel ── */}
      <aside className="lg:w-72 xl:w-80 shrink-0 space-y-4">
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
                    {selected.subject || localeConfig.admin.common.noSubject}
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

              {/* Message body: WhatsApp thread or single message */}
              {isWhatsApp ? (
                <WhatsAppThread
                  state={thread}
                  messages={threadMessages}
                  fallbackMessage={selected.message}
                  fallbackTimestamp={selected.createdAt}
                  t={t}
                />
              ) : (
                <div className="rounded-2xl border border-border bg-muted/40 px-6 py-5">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{selected.message}</p>
                </div>
              )}
            </div>

            {/* Reply box — WhatsApp only */}
            {isWhatsApp && selected.phone && (
              <ReplyBox
                phone={selected.phone}
                draft={replyDraft}
                onDraftChange={setReplyDraft}
                queueState={queueState}
                onWaMeReply={handleWaMeReply}
                onQueueReply={handleQueueReply}
                t={t}
              />
            )}
          </>
        )}
      </main>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

type InboxLocale = typeof localeConfig.admin.inbox;

function WhatsAppThread({
  state,
  messages,
  fallbackMessage,
  fallbackTimestamp,
  t,
}: {
  state: ThreadState;
  messages: WhatsAppThreadMessage[];
  fallbackMessage: string;
  fallbackTimestamp: Date;
  t: InboxLocale;
}) {
  if (state.status === "loading") {
    return (
      <div className="flex items-center justify-center gap-3 rounded-2xl border border-border bg-muted/40 py-10">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-light border-t-transparent" />
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {t.threadLoading}
        </span>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3 text-amber-700 dark:text-amber-300">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <p className="text-xs">{t.threadError}</p>
        </div>
        <div className="rounded-2xl border border-border bg-muted/40 px-6 py-5">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{fallbackMessage}</p>
        </div>
      </div>
    );
  }

  if (state.status === "loaded" && messages.length === 0) {
    // Conversation doc exists but is empty, OR the agent hasn't written yet —
    // show the original contact_inbox message so the owner sees context.
    return (
      <div className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
          {t.threadEmpty}
        </p>
        <div className="rounded-2xl border border-border bg-muted/40 px-6 py-5">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{fallbackMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-h-[480px] space-y-3 overflow-y-auto rounded-2xl border border-border bg-muted/30 px-4 py-5">
      {messages.map((msg, idx) => {
        const fromAgent = msg.role === "assistant" || msg.role === "system";
        return (
          <div
            key={`${idx}-${msg.timestamp ?? ""}`}
            className={cn("flex", fromAgent ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                fromAgent
                  ? "rounded-br-md bg-emerald-500/15 text-emerald-950 dark:bg-emerald-500/20 dark:text-emerald-50"
                  : "rounded-bl-md bg-card text-foreground/90",
              )}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              {msg.timestamp && (
                <p
                  className={cn(
                    "mt-1 text-[9px] uppercase tracking-widest",
                    fromAgent
                      ? "text-emerald-700/70 dark:text-emerald-300/70"
                      : "text-muted-foreground/60",
                  )}
                >
                  {formatRelativeTime(msg.timestamp)}
                </p>
              )}
            </div>
          </div>
        );
      })}
      <p className="pt-1 text-center text-[9px] uppercase tracking-widest text-muted-foreground/40">
        {fallbackTimestamp ? format(fallbackTimestamp, "MMM d, yyyy") : ""}
      </p>
    </div>
  );
}

function ReplyBox({
  phone,
  draft,
  onDraftChange,
  queueState,
  onWaMeReply,
  onQueueReply,
  t,
}: {
  phone: string;
  draft: string;
  onDraftChange: (next: string) => void;
  queueState: QueueState;
  onWaMeReply: () => void;
  onQueueReply: () => void;
  t: InboxLocale;
}) {
  const queueDisabled =
    queueState.status === "sending" || draft.trim().length === 0;

  return (
    <div className="space-y-3 rounded-3xl border border-border bg-card/95 p-6 shadow-elevated">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
          {t.replyHeading}
        </p>
        <span className="font-mono text-[10px] text-muted-foreground/60">{phone}</span>
      </div>

      <textarea
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        rows={3}
        maxLength={3_000}
        placeholder={t.replyPlaceholder}
        className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/40"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {/* A) wa.me link — always works */}
        <button
          type="button"
          onClick={onWaMeReply}
          className="flex flex-col gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/[0.08] px-4 py-3 text-start text-emerald-700 transition-all hover:bg-emerald-500/[0.14] active:scale-[0.98] dark:text-emerald-300"
        >
          <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest">
            <ExternalLink size={13} />
            {t.replyViaWhatsApp}
          </span>
          <span className="text-[10px] text-emerald-700/70 dark:text-emerald-300/70">
            {t.replyViaWhatsAppHint}
          </span>
        </button>

        {/* B) Queue from CRM */}
        <button
          type="button"
          onClick={onQueueReply}
          disabled={queueDisabled}
          className="flex flex-col gap-1 rounded-xl border border-border bg-muted/60 px-4 py-3 text-start text-foreground transition-all hover:bg-muted active:scale-[0.98] disabled:opacity-40"
        >
          <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest">
            {queueState.status === "sending" ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : (
              <Send size={13} />
            )}
            {t.replyViaQueue}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {t.replyViaQueueHint}
          </span>
        </button>
      </div>

      {/* Feedback */}
      {queueState.status === "queued" && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3 text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
          <p className="text-xs">{t.replyQueued}</p>
        </div>
      )}
      {queueState.status === "delayed" && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3 text-amber-700 dark:text-amber-300">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <p className="text-xs">{t.replyQueueDelayed}</p>
        </div>
      )}
      {queueState.status === "error" && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.06] px-4 py-3 text-red-500">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <p className="text-xs">{t.replyError}</p>
        </div>
      )}
    </div>
  );
}
