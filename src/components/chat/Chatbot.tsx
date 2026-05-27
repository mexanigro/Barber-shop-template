import React, { useState, useEffect, useRef, useCallback } from "react";
import { MessageSquare, X, Send, User, Bot, Phone, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";
import { interpolate } from "../../lib/interpolate";
import { useModalA11y } from "../../hooks/useModalA11y";
import { DUR_OVERLAY, DUR_MODAL_ENTER } from "../../lib/motion";
import { getCrmSnapshot } from "../../lib/crm-store";
import { TOUR_CONFIG } from "../../config/tour.config";
import { tenant } from "../../config/tenant";
import { auth as firebaseAuth } from "../../lib/firebase";
import { useAdminAccess } from "../../hooks/useAdminAccess";
import Markdown from "react-markdown";

/**
 * Attach the admin's Firebase ID token to admin-scoped requests so the
 * server can verify identity (V1/V2 gate in server.ts and api/index.ts).
 * Returns an empty object if the user is not signed in — the server will
 * then reject with 401.
 */
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

type Message = {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp?: number;
  actionStatus?: "pending" | "success" | "error";
  actionLabel?: string;
};

type ChatActionType =
  | "walk_in"
  | "support_request"
  | "book_appointment"
  | "update_appointment"
  | "mark_paid"
  | "update_customer"
  | "add_walkin_count"
  | "bulk_update_status";

type ChatAction = {
  type: ChatActionType;
  data: Record<string, unknown>;
};

type ChatActionResult =
  | { ok: true; demo?: boolean; result?: Record<string, unknown> }
  | { ok: false; error: string; status?: number };

const ACTION_LABELS: Record<ChatActionType, string> = {
  walk_in: "Walk-in registrado ✓",
  support_request: "Solicitud enviada a Liam ✓",
  book_appointment: "Turno reservado ✓",
  update_appointment: "Turno actualizado ✓",
  mark_paid: "Pago registrado ✓",
  update_customer: "Cliente actualizado ✓",
  add_walkin_count: "Walk-ins sumados ✓",
  bulk_update_status: "Turnos actualizados ✓",
};

const ACTION_LABELS_DEMO: Record<ChatActionType, string> = {
  walk_in: "Walk-in registered ✓ (demo)",
  support_request: "Request sent ✓ (demo)",
  book_appointment: "Turno reservado ✓ (demo)",
  update_appointment: "Turno actualizado ✓ (demo)",
  mark_paid: "Pago registrado ✓ (demo)",
  update_customer: "Cliente actualizado ✓ (demo)",
  add_walkin_count: "Walk-ins sumados ✓ (demo)",
  bulk_update_status: "Turnos actualizados ✓ (demo)",
};

async function executeAction(action: ChatAction): Promise<{ ok: boolean; label: string }> {
  try {
    const authHeader = await getAdminAuthHeader();
    const res = await fetch("/api/ai/action", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({ type: action.type, data: action.data }),
    });
    if (!res.ok) {
      const isConflict = res.status === 409;
      return {
        ok: false,
        label: isConflict ? "Horario no disponible ✗" : "Action failed",
      };
    }
    return {
      ok: true,
      label: ACTION_LABELS[action.type] || "Done ✓",
    };
  } catch (err) {
    console.error("[Chat action]", err);
    return { ok: false, label: "Action failed" };
  }
}

const MAX_STORED_MESSAGES = 50;
const MAX_CONTEXT_MESSAGES = 20;
const HISTORY_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const closeChat = useCallback(() => setIsOpen(false), []);
  const chatRef = useModalA11y(isOpen, closeChat);

  // Derivar isAdmin del auth state real (no del DOM) — el server gate ya
  // verifica el ID token en /api/ai/*, pero acá lo usamos para decidir qué
  // copy mostrar, qué storage key usar, y si mandar Authorization header.
  // El flicker inicial (false → true cuando Firebase resuelve) es benigno: la
  // historia se carga cuando flippea por la dep de los useEffect.
  const { isAdmin } = useAdminAccess();
  const storageKey = isAdmin ? `admin_chat_${tenant.clientId}` : "";

  const initMessage: Message = {
    id: "init",
    role: "model",
    text: isAdmin
      ? (localeConfig.chat.adminWelcome ?? "Hi! I'm your CRM assistant. Ask me anything about your dashboard, appointments, customers, or metrics. I can also register walk-in customers, book appointments, or send website change requests to Liam.")
      : interpolate(localeConfig.chat.welcome, { brand: siteConfig.brand.name }),
  };

  // Load persisted history (admin only)
  useEffect(() => {
    if (isAdmin && storageKey) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as Message[];
          const cutoff = Date.now() - HISTORY_TTL_MS;
          const recent = parsed.filter(m => !m.timestamp || m.timestamp > cutoff);
          if (recent.length > 0) {
            setMessages([initMessage, ...recent]);
            return;
          }
        }
      } catch { /* ignore corrupt data */ }
    }
    setMessages([initMessage]);
  }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist messages to localStorage (admin only)
  useEffect(() => {
    if (!isAdmin || !storageKey || messages.length <= 1) return;
    try {
      const toStore = messages.slice(1).slice(-MAX_STORED_MESSAGES).map(m => ({
        ...m,
        timestamp: m.timestamp || Date.now(),
      }));
      localStorage.setItem(storageKey, JSON.stringify(toStore));
    } catch { /* quota exceeded or similar */ }
  }, [messages, isAdmin, storageKey]);

  const clearHistory = useCallback(() => {
    if (storageKey) localStorage.removeItem(storageKey);
    setMessages([initMessage]);
  }, [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    const newMessages: Message[] = [
      ...messages,
      { id: Date.now().toString(), role: "user", text: userMessage, timestamp: Date.now() },
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Sliding window: send only recent messages to control token usage
      const contextMessages = newMessages.slice(1).slice(-MAX_CONTEXT_MESSAGES);
      const authHeader = isAdmin ? await getAdminAuthHeader() : {};
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          mode: isAdmin ? "admin" : "public",
          messages: contextMessages.map(({ role, text }) => ({ role, text })),
          brand: {
            name: siteConfig.brand.name,
            tagline: siteConfig.brand.tagline,
            ...(siteConfig.brand.aiPersona ? { aiPersona: siteConfig.brand.aiPersona } : {}),
          },
          businessContext: {
            services: siteConfig.services.map(s => ({
              id: s.id,
              name: s.name, duration: s.duration, price: s.price,
              ...(s.description ? { description: s.description } : {}),
            })),
            staff: siteConfig.staff.map(s => ({ id: s.id, name: s.name, specialty: s.specialty })),
            hours: siteConfig.hours,
            contact: {
              phone: siteConfig.contact.phone,
              email: siteConfig.contact.email,
              address: `${siteConfig.contact.address.street}, ${siteConfig.contact.address.district}, ${siteConfig.contact.address.cityStateZip}`,
            },
            businessName: siteConfig.brand.name,
            businessType: siteConfig.business.type,
            cancellationPolicy: siteConfig.business.cancellationPolicy,
            ...(siteConfig.businessRules ? {
              bookingRules: {
                bufferMinutes: siteConfig.businessRules.bufferMinutes,
                maxAdvanceBookingDays: siteConfig.businessRules.maxAdvanceBookingDays,
                minAdvanceBookingHours: siteConfig.businessRules.minAdvanceBookingHours,
                autoConfirm: siteConfig.businessRules.autoConfirm,
              },
            } : {}),
            clientId: tenant.clientId,
            bookingEnabled: siteConfig.features.showBooking,
            paymentEnabled: siteConfig.payment?.enabled,
            whatsappInChat: siteConfig.features.showWhatsAppInChat,
          },
          ...(isAdmin ? {
            liveData: getCrmSnapshot(),
            clientId: tenant.clientId,
            // Demo mode short-circuits Firestore writes server-side too.
            isDemoMode: TOUR_CONFIG.isDemoMode,
          } : {}),
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        throw new Error(errText || res.statusText);
      }

      const data = (await res.json()) as {
        text?: string;
        error?: string;
        action?: ChatAction;
        // When present, the server already executed the action via native
        // function calling — frontend must NOT call /api/ai/action again.
        actionResult?: ChatActionResult;
      };
      const msgId = (Date.now() + 1).toString();

      // Add the AI message first
      const aiMsg: Message = {
        id: msgId,
        role: "model",
        text: data.text ?? "",
        timestamp: Date.now(),
        ...(data.action ? { actionStatus: "pending", actionLabel: "Processing…" } : {}),
      };
      setMessages((prev) => [...prev, aiMsg]);

      if (!data.action) {
        // No tool call — nothing to do.
      } else if (data.actionResult) {
        // Server already executed via native function calling.
        const ar: ChatActionResult = data.actionResult;
        let label: string;
        let status: "success" | "error";
        if (ar.ok === true) {
          status = "success";
          label = ar.demo
            ? ACTION_LABELS_DEMO[data.action.type] ?? "Done ✓ (demo)"
            : ACTION_LABELS[data.action.type] ?? "Done ✓";
        } else {
          status = "error";
          const errMsg = (ar as { ok: false; error: string }).error;
          label = errMsg === "database_unavailable"
            ? "Database unavailable ✗"
            : "Action failed ✗";
        }
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, actionStatus: status, actionLabel: label } : m)),
        );
      } else if (!TOUR_CONFIG.isDemoMode) {
        // Legacy path: server returned an action but did not execute it.
        // Fall back to the dedicated /api/ai/action endpoint.
        const result = await executeAction(data.action);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, actionStatus: result.ok ? "success" : "error", actionLabel: result.label }
              : m
          )
        );
      } else {
        // Demo mode + no server-side execution → show demo label.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, actionStatus: "success", actionLabel: ACTION_LABELS_DEMO[data.action!.type] ?? "Done ✓ (demo)" }
              : m
          )
        );
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "model",
          text: localeConfig.chat.errorConnect,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: DUR_OVERLAY }}
            onClick={() => setIsOpen(true)}
            id="chat-toggle"
            className="group fixed bottom-24 end-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-accent/35 transition-all duration-300 hover:bg-accent-light hover:text-zinc-950 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label={localeConfig.a11y.openChat}
          >
            <MessageSquare size={24} className="transition-transform group-hover:scale-110" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: DUR_MODAL_ENTER }}
            ref={chatRef as React.RefObject<HTMLDivElement>}
            role="dialog"
            aria-modal="true"
            aria-label={localeConfig.chat.title}
            tabIndex={-1}
            className="fixed bottom-4 end-3 z-[100] flex h-[calc(100vh-5rem)] w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl outline-none transition-colors duration-300 sm:bottom-24 sm:end-6 sm:h-[600px] sm:max-h-[calc(100vh-7.5rem)] sm:w-[380px] sm:rounded-3xl"
          >
            {/* Header */}
            <div className={cn(
              "flex items-center justify-between border-b border-border px-6 py-4 transition-colors duration-300",
              isAdmin ? "bg-indigo-950/80" : "bg-card",
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  isAdmin ? "bg-indigo-500/20 text-indigo-400" : "bg-accent-light/10 text-accent-light",
                )}>
                  <Bot size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold tracking-tight text-foreground">
                      {isAdmin ? (localeConfig.chat.adminTitle ?? "CRM Assistant") : localeConfig.chat.title}
                    </h3>
                    {isAdmin && (
                      <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                        Admin
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-muted-foreground">{localeConfig.chat.poweredBy}</p>
                    {!isAdmin && siteConfig.contact.phone && (
                      <>
                        <span className="text-xs text-muted-foreground/40">|</span>
                        <a
                          href={`https://wa.me/${siteConfig.contact.phone.replace(/[^0-9+]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-medium text-[#25D366] transition-colors hover:text-[#128C7E]"
                        >
                          <Phone size={10} />
                          <span>WhatsApp</span>
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {isAdmin && messages.length > 1 && (
                  <button
                    type="button"
                    onClick={clearHistory}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    aria-label="Clear chat history"
                    title="Clear chat history"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeChat}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  aria-label={localeConfig.a11y.closeChat}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div
              aria-live="polite"
              aria-relevant="additions"
              className="flex-1 space-y-6 overflow-y-auto p-5 [scrollbar-color:theme(colors.border)_transparent] [scrollbar-width:thin]"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex max-w-[85%] gap-4",
                    msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto",
                  )}
                >
                  <div
                    className={cn(
                      "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "chat-avatar-bot",
                    )}
                  >
                    {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div
                      className={cn(
                        "rounded-2xl px-5 py-3.5 text-sm leading-relaxed",
                        msg.role === "user"
                          ? "rounded-tr-sm bg-primary text-primary-foreground"
                          : "chat-bubble-bot [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:mb-2 [&_ul]:ml-4 [&_ul]:list-disc [&_strong]:text-accent-light",
                      )}
                    >
                      {msg.role === "model" ? (
                        <Markdown>{msg.text}</Markdown>
                      ) : (
                        msg.text
                      )}
                    </div>

                    {/* Action status badge */}
                    {msg.actionStatus && (
                      <div className={cn(
                        "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold",
                        msg.actionStatus === "success"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : msg.actionStatus === "error"
                          ? "bg-red-500/10 text-red-500"
                          : "bg-indigo-500/10 text-indigo-400",
                      )}>
                        {msg.actionStatus === "success" && <CheckCircle size={12} />}
                        {msg.actionStatus === "error" && <AlertCircle size={12} />}
                        {msg.actionStatus === "pending" && (
                          <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-400" />
                        )}
                        {msg.actionLabel}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="mr-auto flex max-w-[85%] gap-4">
                  <div className="chat-avatar-bot mt-1">
                    <Bot size={14} />
                  </div>
                  <div className="chat-bubble-bot flex items-center gap-2">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form
              onSubmit={handleSubmit}
              className="border-t border-border bg-card p-4 transition-colors duration-300"
            >
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={localeConfig.chat.placeholder}
                  className="w-full rounded-full border border-border bg-background py-3.5 pl-5 pr-14 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all duration-300 hover:bg-accent-light hover:text-zinc-950 disabled:bg-secondary disabled:text-muted-foreground disabled:opacity-50"
                  aria-label={localeConfig.a11y.sendMessage}
                >
                  <Send size={16} className={input.trim() && !isLoading ? "ml-0.5" : ""} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
