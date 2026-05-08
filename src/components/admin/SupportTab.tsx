import React from "react";
import { Send, MessageSquare, Loader2, CheckCircle } from "lucide-react";
import { isFirebaseConfigured } from "../../lib/firebase";
import { supportService } from "../../services/support";
import { tenant } from "../../config/tenant";
import { cn } from "../../lib/utils";
import { format } from "date-fns";
import type { ProviderMessage } from "../../types";

export function SupportTab() {
  const [messages, setMessages] = React.useState<ProviderMessage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
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

  if (!isFirebaseConfigured || !tenant.clientId) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <MessageSquare size={32} className="mb-4 text-muted-foreground/30" />
        <p className="text-xs font-medium text-muted-foreground">Support not configured</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">Soporte</h3>
        <p className="mt-1 text-[11px] text-muted-foreground">Enviá mensajes al equipo de soporte técnico</p>
      </div>

      {/* Messages Thread */}
      <div
        ref={scrollRef}
        className="mb-4 max-h-[400px] min-h-[200px] space-y-3 overflow-y-auto rounded-2xl border border-border bg-card/50 p-4"
      >
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <MessageSquare size={24} className="mb-3 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">Sin mensajes todavía</p>
            <p className="mt-1 text-[10px] text-muted-foreground/60">Escribí tu primer mensaje abajo</p>
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
                {msg.sender === "provider" ? "Soporte" : "Tú"} &middot; {format(msg.createdAt, "dd/MM HH:mm")}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Send Form */}
      <div className="rounded-2xl border border-border bg-card/90 p-4 backdrop-blur-sm">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describí tu consulta o solicitud..."
          rows={3}
          className="w-full resize-none rounded-xl border border-border bg-background/50 px-4 py-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-accent-light/50 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
          }}
        />
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[9px] text-muted-foreground/50">Ctrl+Enter para enviar</p>
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
            {sent ? "Enviado" : "Enviar"}
          </button>
        </div>
      </div>

      {sent && (
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-3">
          <p className="text-[11px] font-medium text-emerald-500">
            Mensaje enviado — te contactaremos pronto
          </p>
        </div>
      )}
    </div>
  );
}
