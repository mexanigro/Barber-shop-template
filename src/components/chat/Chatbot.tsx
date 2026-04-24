import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, User, Bot } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";
import { interpolate } from "../../lib/interpolate";
import Markdown from "react-markdown";

type Message = {
  id: string;
  role: "user" | "model";
  text: string;
};

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        id: "init",
        role: "model",
        text: interpolate(localeConfig.chat.welcome, { brand: siteConfig.brand.name }),
      },
    ]);
  }, []);

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

    const newMessages = [
      ...messages,
      { id: Date.now().toString(), role: "user" as const, text: userMessage },
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.slice(1).map(({ role, text }) => ({ role, text })),
          brand: {
            name: siteConfig.brand.name,
            tagline: siteConfig.brand.tagline,
            ...(siteConfig.brand.aiPersona ? { aiPersona: siteConfig.brand.aiPersona } : {}),
          },
        }),
      });
      const data = (await res.json()) as { text?: string; error?: string };

      if (!res.ok) throw new Error(data.error ?? res.statusText);

      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "model", text: data.text ?? "" },
      ]);
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
            onClick={() => setIsOpen(true)}
            className="group fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-accent/35 transition-all duration-300 hover:bg-accent-light hover:text-zinc-950 active:scale-95"
            aria-label={localeConfig.a11y.openChat}
          >
            <MessageSquare size={24} className="transition-transform group-hover:scale-110" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-[100] flex h-[600px] max-h-[calc(100vh-7.5rem)] w-[380px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-2xl transition-colors duration-300"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4 transition-colors duration-300">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-light/10 text-accent-light">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="font-bold tracking-tight text-foreground">{localeConfig.chat.title}</h3>
                  <p className="text-xs font-medium text-muted-foreground">{localeConfig.chat.poweredBy}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label={localeConfig.a11y.closeChat}
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 space-y-6 overflow-y-auto p-5 [scrollbar-color:theme(colors.border)_transparent] [scrollbar-width:thin]">
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

                  <div
                    className={cn(
                      "rounded-2xl px-5 py-3.5 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "rounded-tr-sm bg-primary text-primary-foreground"
                        : "chat-bubble-bot [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:mb-2 [&_ul]:ml-4 [&_ul]:list-disc [&_strong]:text-accent-light",
                    )}
                  >
                    {msg.role === "model" ? (
                      <div>
                        <Markdown>{msg.text}</Markdown>
                      </div>
                    ) : (
                      msg.text
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
