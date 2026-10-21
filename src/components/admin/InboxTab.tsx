import React from "react";
import { pl, tp } from "./crm03/textos-pantallas";
import { motion, AnimatePresence } from "motion/react";
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
  Search,
} from "lucide-react";
import {
  DUR_OVERLAY,
  DUR_MODAL_ENTER,
  DUR_MODAL_EXIT,
  EASE_OUT_STRONG,
} from "../../lib/motion";
import { ContactInboxItem, InboxStatus } from "../../types";
import { inboxService } from "../../services/inbox";
import { localeConfig } from "../../config/locale";
import { TOUR_CONFIG } from "../../config/tour.config";
import { DEMO_INBOX } from "../../config/demo-data";
import { cn } from "../../lib/utils";
import { useAncho } from "./crm03/AgendaDia";
import { waEnlace } from "../../lib/telefono";
import { useModalA11y } from "../../hooks/useModalA11y";
import { format, formatDistanceToNow } from "date-fns";
import { datePattern, getDateFnsLocale } from "../../lib/dateLocale";
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

// CRM-03 diseño: el enlace de wa.me sale de lib/telefono (972, también desde «00972…»).
const buildWaMeUrl = (phone: string, text: string) => waEnlace(phone, text);

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
  const ancho = useAncho("(min-width: 1024px)");

  const [items, setItems] = React.useState<ContactInboxItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selected, setSelected] = React.useState<ContactInboxItem | null>(null);
  const refDetalle = useModalA11y(!!selected && !ancho, () => setSelected(null));
  // CRM-03 diseño: en el celular el detalle es una pantalla encima de la lista; Escape vuelve a la lista.
  React.useEffect(() => {
    if (!selected || ancho) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [selected, ancho]);
  const [updating, setUpdating] = React.useState(false);

  const [thread, setThread] = React.useState<ThreadState>({ status: "idle" });
  const [replyDraft, setReplyDraft] = React.useState("");
  const [queueState, setQueueState] = React.useState<QueueState>({ status: "idle" });
  const queueTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [pauseState, setPauseState] = React.useState<PauseState>({ status: "loading" });
  const [agentOn, setAgentOn] = React.useState(false);
  const [showPauseConfirm, setShowPauseConfirm] = React.useState(false);
  const pendingPauseRef = React.useRef<{ nextPaused: boolean; prevPaused: boolean } | null>(null);

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
        if (!cancelled) setAgentOn(data.agent === true);
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
    // CRM-03 diseño: el hilo de WhatsApp lo escribe el agente; sin agente no hay hilo que pedir (D-306).
    if (!agentOn || !selected || selected.source !== "whatsapp" || !selected.phone) {
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
  }, [selected?.id, selected?.phone, selected?.source, agentOn]);

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
    let result = filter === "all" ? items : items.filter((i) => i.status === filter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.email.toLowerCase().includes(q) ||
          (i.subject ?? "").toLowerCase().includes(q) ||
          i.message.toLowerCase().includes(q),
      );
    }
    return result;
  }, [items, filter, searchQuery]);

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

  const isWhatsApp = agentOn && selected?.source === "whatsapp" && !!selected?.phone;
  const threadMessages = thread.status === "loaded" ? thread.data.messages : [];

  const handleWaMeReply = async () => {
    if (!selected || !selected.phone) return;
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

  const executePause = async (nextPaused: boolean, prevPaused: boolean) => {
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
          paused: prevPaused,
        });
        return;
      }
      const data = await res.json();
      setPauseState({ status: "idle", paused: data.paused === true });
    } catch (err) {
      console.error("[InboxTab] toggle pause failed:", err);
      setPauseState({ status: "error", message: String(err), paused: prevPaused });
    }
  };

  const handleTogglePause = () => {
    const current =
      pauseState.status === "idle"
        ? pauseState.paused
        : pauseState.status === "error"
          ? pauseState.paused
          : false;
    const nextPaused = !current;
    if (nextPaused) {
      pendingPauseRef.current = { nextPaused, prevPaused: current };
      setShowPauseConfirm(true);
      return;
    }
    void executePause(nextPaused, current);
  };

  const handleConfirmPause = () => {
    setShowPauseConfirm(false);
    if (pendingPauseRef.current) {
      void executePause(pendingPauseRef.current.nextPaused, pendingPauseRef.current.prevPaused);
      pendingPauseRef.current = null;
    }
  };

  const handleCancelPause = () => {
    setShowPauseConfirm(false);
    pendingPauseRef.current = null;
  };

  const pauseDisplay: { paused: boolean; busy: boolean } = (() => {
    if (pauseState.status === "loading") return { paused: false, busy: true };
    if (pauseState.status === "updating") return { paused: pauseState.nextPaused, busy: true };
    if (pauseState.status === "idle") return { paused: pauseState.paused, busy: false };
    return { paused: pauseState.paused, busy: false };
  })();

  return (
    <div className="flex flex-col gap-5">
      <PauseConfirmModal
        open={showPauseConfirm}
        onConfirm={handleConfirmPause}
        onCancel={handleCancelPause}
        t={t}
      />
      {/* ── WhatsApp agent pause toggle (sólo con el agente configurado, CRM-02) ── */}
      {agentOn && <div
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
      </div>}

      <div className="flex flex-col gap-5 lg:flex-row">
      {/* ── Left panel ── */}
      <aside className="lg:w-72 xl:w-80 shrink-0 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search size={18} aria-hidden className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            aria-label={tp().inbox.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder ?? "Search by name, email or subject…"}
            className="h-11 w-full rounded-xl border border-border bg-card ps-10 pe-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          />
        </div>

        {/* Filter tabs */}
        <div role="group" aria-label={tp().inbox.byStatus} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                "flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors",
                filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted"
              )}
            >
              {t[f as keyof typeof t] ?? f}
              {countFor(f) > 0 && (
                <span className={cn("text-xs tabular-nums", filter === f ? "text-primary-foreground/85" : "text-muted-foreground")}>
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
              <Inbox size={24} aria-hidden className="mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">{t.empty}</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3.5 text-start transition-colors hover:bg-muted/60",
                      selected?.id === item.id && "bg-muted"
                    )}
                  >
                    <span aria-hidden className={cn("mt-2 h-2.5 w-2.5 shrink-0 rounded-full", statusDot[item.status])} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn(
                          "truncate text-base",
                          item.status === "new" ? "font-bold text-foreground" : "font-medium text-foreground"
                        )}>
                          <span>{item.name}</span>{item.status === "new" && <span className="sr-only"> · {t.new}</span>}
                        </p>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {format(new Date(item.createdAt), datePattern("MMM d"), { locale: getDateFnsLocale() })}
                        </span>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">{item.subject || item.message}</p>
                    </div>
                    <ChevronRight size={18} aria-hidden className="mt-1 shrink-0 rtl:rotate-180 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* ── Right panel: detail ── */}
      <section ref={refDetalle} tabIndex={selected && !ancho ? -1 : undefined} aria-label={tp().inbox.message} role={selected && !ancho ? "dialog" : undefined} aria-modal={selected && !ancho ? true : undefined} className={cn("min-w-0 flex-1 space-y-4", !selected ? "hidden lg:block" : "max-lg:fixed max-lg:inset-0 max-lg:z-[60] max-lg:overflow-y-auto max-lg:bg-background max-lg:p-4 max-lg:pb-[calc(1rem+env(safe-area-inset-bottom))]")}>
        {!selected ? (
          <div className="flex h-64 items-center justify-center rounded-3xl border border-dashed border-border">
            <p className="text-sm text-muted-foreground">{t.selectPrompt}</p>
          </div>
        ) : (
          <>
            <button type="button" onClick={() => setSelected(null)} className="flex h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-medium text-foreground hover:bg-muted lg:hidden">
              <ChevronRight size={18} aria-hidden className="ltr:rotate-180" />{tp().inbox.back}
            </button>
            {/* Header */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-6">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span aria-hidden className={cn("h-2.5 w-2.5 rounded-full", statusDot[selected.status])} />
                    <span className="text-sm text-muted-foreground">
                      {t[selected.status as keyof typeof t] ?? selected.status}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-foreground">{selected.name}</h2>
                  <p className="text-base text-foreground">{selected.subject || localeConfig.admin.common.noSubject}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    {selected.email && !selected.email.endsWith("@noemail.local") && <span>{selected.email}</span>}
                    {selected.phone && <span dir="ltr">{selected.phone}</span>}
                    <span className="flex items-center gap-1">
                      <SourceIcon src={selected.source} />
                      {sourceLabel(selected.source)}
                    </span>
                    <span>{t.received}: {format(new Date(selected.createdAt), datePattern("MMM d, yyyy HH:mm"), { locale: getDateFnsLocale() })}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  {selected.status !== "read" && selected.status !== "replied" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(selected.id, "read")}
                      disabled={updating}
                      className="flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      <MailOpen size={16} aria-hidden />
                      {t.markRead}
                    </button>
                  )}
                  {selected.status !== "replied" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(selected.id, "replied")}
                      disabled={updating}
                      className="flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      <Mail size={16} aria-hidden />
                      {t.markReplied}
                    </button>
                  )}
                  {selected.status !== "archived" ? (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(selected.id, "archived")}
                      disabled={updating}
                      className="flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      <ArchiveX size={16} aria-hidden />
                      {t.archive}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(selected.id, "new")}
                      disabled={updating}
                      className="flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      <RefreshCw size={16} aria-hidden />
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
                <div className="rounded-xl border border-border bg-muted/40 px-4 py-4 sm:px-6">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{selected.message}</p>
                </div>
              )}
            </div>

            {/* Reply box — WhatsApp only */}
            {selected.phone && (
              <ReplyBox
                agente={agentOn}
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
      </section>
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
        {fallbackTimestamp ? format(fallbackTimestamp, datePattern("MMM d, yyyy"), { locale: getDateFnsLocale() }) : ""}
      </p>
    </div>
  );
}

function PauseConfirmModal({
  open,
  onConfirm,
  onCancel,
  t,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  t: InboxLocale;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DUR_OVERLAY, ease: "easeOut" }}
          onClick={onCancel}
        >
          <div className="absolute inset-0 bg-black/50" />
          <motion.div
            className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-7 shadow-2xl"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: DUR_MODAL_ENTER, ease: EASE_OUT_STRONG } }}
            exit={{ opacity: 0, scale: 0.95, y: 4, transition: { duration: DUR_MODAL_EXIT, ease: "easeIn" } }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10">
              <Pause size={20} className="text-red-500" />
            </div>
            <h3 className="mb-2 text-sm font-black uppercase tracking-tight text-foreground">
              {t.pauseConfirmTitle}
            </h3>
            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
              {t.pauseConfirm}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                autoFocus
                onClick={onCancel}
                className="flex-1 rounded-xl border border-border bg-muted/60 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-all hover:text-foreground active:scale-[0.97]"
              >
                {t.pauseConfirmCancel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-red-500 transition-all hover:bg-red-500/20 active:scale-[0.97]"
              >
                <Pause size={11} />
                {t.pauseButton}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ReplyBox({
  agente,
  phone,
  draft,
  onDraftChange,
  queueState,
  onWaMeReply: onWaMeReplyMark,
  onQueueReply,
  t,
}: {
  agente: boolean;
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
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="crm03-respuesta" className="text-base font-semibold text-foreground">{t.replyHeading}</label>
        <span dir="ltr" className="text-sm tabular-nums text-muted-foreground">{phone}</span>
      </div>

      <textarea
        id="crm03-respuesta"
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        rows={3}
        maxLength={3_000}
        placeholder={t.replyPlaceholder}
        className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/40"
      />

      <div className={cn("grid gap-3", agente && "sm:grid-cols-2")}>
        {/* A) wa.me — un enlace de verdad: abre el WhatsApp de la dueña con el texto escrito */}
        <a
          href={buildWaMeUrl(phone, draft)}
          target="_blank"
          rel="noreferrer"
          onClick={() => { void Promise.resolve().then(onWaMeReplyMark); }}
          className="flex min-h-11 flex-col justify-center gap-0.5 rounded-xl bg-primary px-4 py-3 text-start text-primary-foreground"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <ExternalLink size={16} aria-hidden />
            {tp().inbox.openWa}
          </span>
          <span className="text-xs text-primary-foreground/85">{tp().inbox.openWaNote}</span>
        </a>

        {/* B) La cola del agente, sólo si la web tiene agente de WhatsApp (D-306) */}
        {agente && <button
          type="button"
          onClick={onQueueReply}
          disabled={queueDisabled}
          className="flex flex-col gap-1 rounded-xl border border-border bg-muted/60 px-4 py-3 text-start text-foreground transition-all hover:bg-muted active:scale-[0.98] disabled:opacity-40"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            {queueState.status === "sending" ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : (
              <Send size={13} />
            )}
            {t.replyViaQueue}
          </span>
          <span className="text-xs text-muted-foreground">
            {t.replyViaQueueHint}
          </span>
        </button>}
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
