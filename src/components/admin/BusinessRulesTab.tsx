import React from "react";
import { SlidersHorizontal, Save, HelpCircle } from "lucide-react";
import type { BusinessRules } from "../../types";
import { siteConfig } from "../../config/site";
import { dbService } from "../../services/db";
import { localeConfig } from "../../config/locale";
import { DEFAULT_BUSINESS_RULES } from "../../constants";
import { cn } from "../../lib/utils";
import { useToast } from "../ui/Toast";

function rulesFromSite(): BusinessRules {
  const br = siteConfig.businessRules;
  return {
    bufferMinutes: typeof br?.bufferMinutes === "number" ? br.bufferMinutes : DEFAULT_BUSINESS_RULES.bufferMinutes,
    maxAdvanceBookingDays:
      typeof br?.maxAdvanceBookingDays === "number"
        ? br.maxAdvanceBookingDays
        : DEFAULT_BUSINESS_RULES.maxAdvanceBookingDays,
    minAdvanceBookingHours:
      typeof br?.minAdvanceBookingHours === "number"
        ? br.minAdvanceBookingHours
        : DEFAULT_BUSINESS_RULES.minAdvanceBookingHours,
    autoConfirm: typeof br?.autoConfirm === "boolean" ? br.autoConfirm : DEFAULT_BUSINESS_RULES.autoConfirm,
  };
}

export function BusinessRulesTab() {
  const t = localeConfig.admin.businessRules;
  const toast = useToast();
  const [form, setForm] = React.useState<BusinessRules>(rulesFromSite);
  const [saving, setSaving] = React.useState(false);

  const rulesSnapshot = JSON.stringify(siteConfig.businessRules ?? null);
  React.useEffect(() => {
    setForm(rulesFromSite());
  }, [rulesSnapshot]);

  const update =
    (key: keyof BusinessRules) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.type === "checkbox" ? e.target.checked : Number(e.target.value);
      setForm((f) => ({ ...f, [key]: v }));
    };

  const handleSave = async () => {
    setSaving(true);
    try {
      await dbService.saveBusinessRules({
        bufferMinutes: Math.max(0, Math.min(120, Math.round(form.bufferMinutes))),
        maxAdvanceBookingDays: Math.max(1, Math.min(365, Math.round(form.maxAdvanceBookingDays))),
        minAdvanceBookingHours: Math.max(0, Math.min(168, Math.round(form.minAdvanceBookingHours))),
        autoConfirm: form.autoConfirm,
      });
      toast.success(t.saved);
    } catch {
      toast.error(t.saveError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{t.subtitle}</p>
        <h2 className="mt-1 flex items-center gap-3 text-xl font-black uppercase tracking-tight text-foreground">
          <SlidersHorizontal className="h-6 w-6 text-accent-light" />
          {t.title}
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t.intro}</p>
      </div>

      <div className="space-y-6 rounded-[28px] border border-border bg-card/95 p-8 shadow-elevated">
        <div className="grid gap-6 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.bufferMinutes}</span>
            <input
              type="number"
              min={0}
              max={120}
              value={form.bufferMinutes}
              onChange={update("bufferMinutes")}
              className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm font-bold text-foreground"
            />
            <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-muted-foreground/70">
              <HelpCircle size={11} className="mt-0.5 shrink-0 text-accent-light/50" />
              {t.bufferHelp ?? "Cleanup time between appointments — prevents back-to-back bookings. Example: 15 min lets staff reset between clients."}
            </p>
          </label>
          <label className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {t.maxAdvanceBookingDays}
            </span>
            <input
              type="number"
              min={1}
              max={365}
              value={form.maxAdvanceBookingDays}
              onChange={update("maxAdvanceBookingDays")}
              className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm font-bold text-foreground"
            />
            <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-muted-foreground/70">
              <HelpCircle size={11} className="mt-0.5 shrink-0 text-accent-light/50" />
              {t.maxAdvanceHelp ?? "How far into the future customers can book. Example: 60 means they can book up to 2 months ahead."}
            </p>
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {t.minAdvanceBookingHours}
            </span>
            <input
              type="number"
              min={0}
              max={168}
              value={form.minAdvanceBookingHours}
              onChange={update("minAdvanceBookingHours")}
              className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm font-bold text-foreground"
            />
            <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-muted-foreground/70">
              <HelpCircle size={11} className="mt-0.5 shrink-0 text-accent-light/50" />
              {t.minAdvanceHelp ?? "Minimum notice required. Example: 2 hours means customers can't book less than 2 hours from now — gives you time to prepare."}
            </p>
          </label>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-4">
          <input
            type="checkbox"
            checked={form.autoConfirm}
            onChange={update("autoConfirm")}
            className="h-4 w-4 rounded border-border accent-accent-light"
          />
          <div>
            <p className="text-xs font-bold text-foreground">{t.autoConfirm}</p>
            <p className="text-[10px] text-muted-foreground">{t.autoConfirmHint}</p>
          </div>
        </label>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl border border-accent-light bg-accent-light py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-950 shadow-lg transition-all hover:opacity-95 disabled:opacity-50 sm:w-auto sm:px-10"
          )}
        >
          <Save size={14} />
          {saving ? t.saving : t.save}
        </button>
      </div>
    </div>
  );
}
