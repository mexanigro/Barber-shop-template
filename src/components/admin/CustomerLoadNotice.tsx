import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { localeConfig } from "../../config/locale";

// CRM-03 diseño: el aviso de que no se pudieron traer las clientas, legible y con «ניסיון נוסף» de 44 px.
export function CustomerLoadNotice({ error, loading, hasData, onRetry }: {
  error: boolean;
  loading: boolean;
  hasData: boolean;
  onRetry: () => Promise<unknown>;
}) {
  if (!error) return null;
  const t = localeConfig.admin.common;
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-600/30 bg-red-500/10 px-4 py-3">
      <div className="flex min-w-0 items-start gap-2 text-sm text-red-900 dark:text-red-200">
        <AlertCircle size={18} aria-hidden className="mt-0.5 shrink-0" />
        <p><span className="font-semibold">לא הצלחנו לטעון את הלקוחות.</span>{hasData && <> מה שמופיע כאן הוא מהטעינה הקודמת וייתכן שאינו מעודכן.</>}</p>
      </div>
      <button type="button" disabled={loading} onClick={() => { void onRetry().catch(() => {}); }} className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-red-600/40 px-4 text-sm font-semibold text-red-900 hover:bg-red-500/10 disabled:opacity-50 dark:text-red-200">
        <RefreshCw size={16} aria-hidden className={loading ? "animate-spin" : undefined} />{t.retry}
      </button>
    </div>
  );
}
