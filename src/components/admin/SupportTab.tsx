import React from "react";
import { Send, MessageSquare, Loader2, CheckCircle, Info } from "lucide-react";
import { isFirebaseConfigured } from "../../lib/firebase";
import { supportService } from "../../services/support";
import { tenant } from "../../config/tenant";
import { localeConfig } from "../../config/locale";
import { TOUR_CONFIG } from "../../config/tour.config";
import { cn } from "../../lib/utils";
import { format, subDays, subHours } from "date-fns";
import type { ProviderMessage } from "../../types";

const now = new Date();

const DEMO_MESSAGES: ProviderMessage[] = [
  {
    id: "demo-sup-1",
    clientId: "demo",
    businessName: "Demo Barbershop",
    message: "Hi! I'd like to update the hero photo on the main page with a new image I have.",
    sender: "client",
    status: "read",
    category: "maintenance",
    createdAt: subDays(now, 3),
  },
  {
    id: "demo-sup-2",
    clientId: "demo",
    businessName: "Arzac Studio",
    message: "Got it! Please send me the new image and I'll have it updated within 24 hours. You can attach it by replying here or send to website@arzac.studio.",
    sender: "provider",
    status: "read",
    category: "maintenance",
    createdAt: subDays(now, 3),
  },
  {
    id: "demo-sup-3",
    clientId: "demo",
    businessName: "Demo Barbershop",
    message: "Also, can you change the price of the 'Beard Sculpt' service from $35 to $40?",
    sender: "client",
    status: "read",
    category: "maintenance",
    createdAt: subDays(now, 2),
  },
  {
    id: "demo-sup-4",
    clientId: "demo",
    businessName: "Arzac Studio",
    message: "Done! The Beard Sculpt price is now $40. You can confirm it on your Services page.",
    sender: "provider",
    status: "read",
    category: "maintenance",
    createdAt: subHours(now, 30),
  },
];

export function SupportTab() {
  const [messages, setMessages] = React.useState<ProviderMessage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (TOUR_CONFIG.isDemoMode) {
      setMessages(DEMO_MESSAGES);
      setLoading(false);
      return;
    }
    if (!isFirebaseConfigured || !tenant.clientId) {
      setLoading(false);
      return;
    }

    const unsub = supportService.subscribe((msgs) => {
      setMessages(msgs);
      setLoading(false);
    });

    return unsub;
  }, []);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  React.useEffect(() => {
    if (TOUR_CONFIG.isDemoMode) return;
    const unread = messages.filter((m) => m.sender === "provider" && m.status === "new");
    for (const msg of unread) {
      supportService.markAsRead(msg.id);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);

    const id = await supportService.sendMessage(text.trim());
    if (id) {
      setText("");
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    }

    setSending(false);
  };

  if (!TOUR_CONFIG.isDemoMode && (!isFirebaseConfigured || !tenant.clientId)) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <MessageSquare size={32} className="mb-4 text-muted-foreground/30" />
        <p className="text-xs font-medium text-muted-foreground">{localeConfig.admin.support.notConfigured}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">{localeConfig.admin.support.title}</h3>
        <p className="mt-1 text-[11px] text-muted-foreground">{localeConfig.admin.support.subtitle}</p>
      </div>

      {/* Explainer banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-accent-light/20 bg-accent-light/[0.04] px-4 py-3">
        <Info size={15} className="mt-0.5 shrink-0 text-accent-light" />
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-foreground">Direct line to Arzac Studio</p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Use this chat to request any changes to your website — new photos, updated prices, text edits, new services, or anything else. Messages go directly to Liam and are usually resolved within 24 hours.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {["Update photo", "Change price", "Edit text", "Add service", "Fix something"].map((ex) => (
              <button
                key={ex}
                onClick={() => setText((t) => t ? t : ex + ": ")}
                className="rounded-lg border border-accent-light/20 bg-accent-light/5 px-2.5 py-1 text-[10px] font-semibold text-accent-light/80 transition hover:bg-accent-light/10"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Messages Thread */}
      <div
        ref={scrollRef}
        className="max-h-[320px] min-h-[160px] space-y-3 overflow-y-auto rounded-2xl border border-border bg-card/50 p-3 sm:max-h-[400px] sm:p-4"
      >
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <MessageSquare size={24} className="mb-3 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">{localeConfig.admin.support.emptyTitle}</p>
            <p className="mt-1 text-[10px] text-muted-foreground/60">{localeConfig.admin.support.emptySubtitle}</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "max-w-[85%] rounded-xl px-4 py-2.5",
                msg.sender === "client"
                  ? "ml-auto bg-accent-light/10 text-foreground"
                  : "mr-auto border border-border bg-card"
              )}
            >
              <p className="text-xs leading-relaxed">{msg.message}</p>
              <p className={cn(
                "mt-1 text-[9px]",
                msg.sender === "client" ? "text-right text-accent-light/50" : "text-muted-foreground/50"
              )}>
                {msg.sender === "provider" ? localeConfig.admin.support.senderProvider : localeConfig.admin.support.senderClient}
                {" · "}
                {format(msg.createdAt, "dd/MM HH:mm")}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Send Form */}
      {!TOUR_CONFIG.isDemoMode && (
        <div className="rounded-2xl border border-border bg-card/90 p-4 backdrop-blur-sm">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={localeConfig.admin.support.placeholder}
            rows={3}
            className="w-full resize-none rounded-xl border border-border bg-background/50 px-4 py-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-accent-light/50 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
            }}
          />
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[9px] text-muted-foreground/50">{localeConfig.admin.support.sendHint}</p>
            <button
              onClick={handleSend}
              disabled={sending || !text.trim()}
              className={cn(
                "flex items-center gap-2 rounded-xl px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                sending || !text.trim()
                  ? "cursor-not-allowed bg-muted text-muted-foreground/50"
                  : "bg-accent-light text-zinc-950 shadow-lg shadow-accent-light/20 hover:shadow-xl hover:shadow-accent-light/30"
              )}
            >
              {sending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : sent ? (
                <CheckCircle size={12} />
              ) : (
                <Send size={12} />
              )}
              {sent ? localeConfig.admin.support.sent : localeConfig.admin.support.send}
            </button>
          </div>
        </div>
      )}

      {TOUR_CONFIG.isDemoMode && (
        <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-center">
          <p className="text-[11px] text-muted-foreground">
            In your live site, you can send messages directly from here.
          </p>
        </div>
      )}

      {sent && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-3">
          <p className="text-[11px] font-medium text-emerald-500">
            {localeConfig.admin.support.sentBanner}
          </p>
        </div>
      )}
    </div>
  );
}
