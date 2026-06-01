import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "../../lib/utils";

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const ICON_MAP = { success: CheckCircle, error: AlertCircle, info: Info };

const STYLE_MAP: Record<ToastType, string> = {
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  error: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  info: "border-accent-light/30 bg-accent-light/10 text-accent-light",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const remove = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = React.useCallback(
    (message: string, type: ToastType = "info", duration = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-4), { id, message, type, duration }]);
      if (duration > 0) {
        setTimeout(() => remove(id), duration);
      }
    },
    [remove],
  );

  const value = React.useMemo<ToastContextValue>(
    () => ({
      toast: add,
      success: (msg) => add(msg, "success"),
      error: (msg) => add(msg, "error", 6000),
      info: (msg) => add(msg, "info"),
    }),
    [add],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[9999] flex flex-col items-center gap-2 px-4 pb-6"
        aria-live="polite"
        aria-atomic="true"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => {
            const Icon = ICON_MAP[t.type];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                className={cn(
                  "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-xl backdrop-blur-md",
                  STYLE_MAP[t.type],
                )}
              >
                <Icon size={16} className="mt-0.5 shrink-0" />
                <p className="min-w-0 flex-1 text-xs font-bold leading-relaxed">{t.message}</p>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  className="shrink-0 rounded-lg p-1 opacity-60 transition-opacity hover:opacity-100"
                  aria-label="Dismiss"
                >
                  <X size={12} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
