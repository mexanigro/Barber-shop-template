import React from "react";
import { localeConfig } from "../../config/locale";

export function CustomerLoadNotice({ error, loading, hasData, onRetry }: {
  error: boolean;
  loading: boolean;
  hasData: boolean;
  onRetry: () => Promise<unknown>;
}) {
  if (!error) return null;
  const t = localeConfig.admin.common;
  return (
    <div role="alert" className="rounded-xl border border-red-500/30 p-3 text-sm">
      <p>{t.toastCustomerFetchError}</p>
      {hasData && <p>{t.customerDataStale}</p>}
      <button type="button" disabled={loading} onClick={() => { void onRetry().catch(() => {}); }}>
        {t.retry}
      </button>
    </div>
  );
}
