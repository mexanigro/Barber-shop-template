import React from "react";
import {
  Calendar,
  FileText,
  Mail,
  Phone,
  Plus,
  Tag as TagIcon,
  X,
} from "lucide-react";
import { format } from "date-fns";
import type { Appointment, Customer, CustomerStage } from "../../types";
import {
  CUSTOMER_STAGES,
  MAX_TAG_LENGTH,
  MAX_TAGS_PER_CUSTOMER,
  applyTagsPatch,
  appointmentBelongsToCustomer,
  deriveStage,
  normalizeTag,
  sourcePalette,
} from "../../lib/customer-pipeline";
import { localeConfig } from "../../config/locale";
import { TOUR_CONFIG } from "../../config/tour.config";
import { auth as firebaseAuth } from "../../lib/firebase";
import { siteConfig } from "../../config/site";
import { customerService } from "../../services/customers";
import { cn } from "../../lib/utils";

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

const STAGE_DOT_BG: Record<CustomerStage, string> = {
  lead:      "bg-sky-500/10 border-sky-500/30 text-sky-500",
  contacted: "bg-amber-500/10 border-amber-500/30 text-amber-500",
  scheduled: "bg-violet-500/10 border-violet-500/30 text-violet-500",
  converted: "bg-emerald-500/10 border-emerald-500/30 text-emerald-500",
  lost:      "bg-zinc-500/10 border-zinc-500/30 text-zinc-500",
};

export type CustomerDetailPanelProps = {
  customerId: string;
  customers: Customer[];
  appointments: Appointment[];
  onClose: () => void;
  onCustomerUpdated: (customer: Customer) => void;
  onStageChange: (customerId: string, stage: CustomerStage) => void;
};

export function CustomerDetailPanel({
  customerId,
  customers,
  appointments,
  onClose,
  onCustomerUpdated,
  onStageChange,
}: CustomerDetailPanelProps) {
  const t = localeConfig.admin.pipeline;
  const customersT = localeConfig.admin.customers;
  const services = siteConfig.services;
  const staff = siteConfig.staff;

  const customer = React.useMemo(
    () => customers.find((c) => c.id === customerId) ?? null,
    [customers, customerId],
  );

  const customerAppts = React.useMemo<Appointment[]>(() => {
    if (!customer) return [];
    return appointments
      .filter((a) => appointmentBelongsToCustomer(a, customer))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [appointments, customer]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const derivedStage = customer ? deriveStage(customer, customerAppts, todayIso) : "lead";

  // Notes (debounced save)
  const [notes, setNotes] = React.useState<string>(customer?.notes ?? "");
  const [notesSaving, setNotesSaving] = React.useState(false);
  const [notesSaved, setNotesSaved] = React.useState(false);
  React.useEffect(() => {
    setNotes(customer?.notes ?? "");
  }, [customerId, customer?.notes]);

  const lastSavedNotes = React.useRef<string>(customer?.notes ?? "");
  React.useEffect(() => {
    if (!customer) return;
    if (notes === lastSavedNotes.current) return;
    const handle = window.setTimeout(async () => {
      setNotesSaving(true);
      try {
        if (TOUR_CONFIG.isDemoMode) {
          // Local-only — demo mode never hits Firestore.
        } else {
          await customerService.updateCustomer(customer.id, { notes });
        }
        lastSavedNotes.current = notes;
        const next: Customer = { ...customer, notes };
        onCustomerUpdated(next);
        setNotesSaved(true);
        window.setTimeout(() => setNotesSaved(false), 1500);
      } catch {
        // Silent — owner sees lack of saved state.
      } finally {
        setNotesSaving(false);
      }
    }, 600);
    return () => window.clearTimeout(handle);
  }, [notes, customer, onCustomerUpdated]);

  // Tags
  const [tagDraft, setTagDraft] = React.useState("");
  const [tagsSaving, setTagsSaving] = React.useState(false);

  const patchTags = async (add: string[], remove: string[]) => {
    if (!customer) return;
    const merged = applyTagsPatch(customer.tags, { add, remove });
    const optimistic: Customer = { ...customer, tags: merged };
    onCustomerUpdated(optimistic);
    if (TOUR_CONFIG.isDemoMode) return;
    setTagsSaving(true);
    try {
      const headers = await getAdminAuthHeader();
      if (!headers.Authorization) return;
      await fetch(`/api/customers/${encodeURIComponent(customer.id)}/tags`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ add, remove }),
      });
    } finally {
      setTagsSaving(false);
    }
  };

  const handleAddTag = async () => {
    const norm = normalizeTag(tagDraft);
    if (!norm || !customer) return;
    if (((Array.isArray(customer.tags) ? customer.tags : [])).includes(norm)) {
      setTagDraft("");
      return;
    }
    if (((Array.isArray(customer.tags) ? customer.tags : [])).length >= MAX_TAGS_PER_CUSTOMER) return;
    setTagDraft("");
    await patchTags([norm], []);
  };

  const handleRemoveTag = async (tag: string) => {
    if (!customer) return;
    await patchTags([], [tag]);
  };

  if (!customer) return null;

  const sourceKey = sourcePalette(customer.source);

  return (
    <div
      className="fixed inset-0 z-40 flex items-stretch justify-end bg-zinc-950/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-xl flex-col overflow-y-auto border-s border-border bg-card shadow-elevated"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-accent-light/10 text-base font-black text-accent-light">
              {customer.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-black uppercase tracking-tight text-foreground">
                {customer.fullName}
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest",
                    STAGE_DOT_BG[derivedStage],
                  )}
                >
                  {t.stages[derivedStage]}
                </span>
                {customer.source ? (
                  <span className="inline-block rounded-md border border-border bg-muted/60 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    {customer.source}
                  </span>
                ) : null}
                {customer.createdAt ? (
                  <span className="text-[9px] font-bold text-muted-foreground/60">
                    {t.created}: {format(customer.createdAt, "MMM d, yyyy")}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:border-accent-light/40 hover:text-accent-light"
            aria-label="close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Stage selector */}
        <div className="border-b border-border px-6 py-4">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
            {t.changeStage}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {CUSTOMER_STAGES.map((s) => {
              const active = derivedStage === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onStageChange(customer.id, s)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest transition-colors",
                    active
                      ? STAGE_DOT_BG[s] + " ring-2 ring-accent-light/30"
                      : "border-border bg-card text-muted-foreground hover:border-accent-light/40",
                  )}
                >
                  {t.stages[s]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Contact strip */}
        <div className="border-b border-border px-6 py-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <a
              href={customer.email && !customer.email.endsWith("@noemail.local") ? `mailto:${customer.email}` : undefined}
              className={cn(
                "flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-[11px] font-bold text-muted-foreground",
                customer.email && !customer.email.endsWith("@noemail.local") && "transition-colors hover:border-accent-light/40 hover:text-accent-light",
              )}
            >
              <Mail size={12} className="shrink-0 text-accent-light/60" />
              <span className="truncate">{customer.email && !customer.email.endsWith("@noemail.local") ? customer.email : "—"}</span>
            </a>
            <a
              href={customer.phone ? `tel:${customer.phone}` : undefined}
              className={cn(
                "flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-[11px] font-bold text-muted-foreground",
                customer.phone && "transition-colors hover:border-accent-light/40 hover:text-accent-light",
              )}
            >
              <Phone size={12} className="shrink-0 text-accent-light/60" />
              <span className="truncate">{customer.phone || "—"}</span>
            </a>
          </div>
          {customer.phone ? (
            <div className="mt-2 flex gap-2">
              <a
                href={`https://wa.me/${customer.phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest text-emerald-500 transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5"
              >
                {t.contactWhatsApp}
              </a>
              {customer.email && !customer.email.endsWith("@noemail.local") ? (
                <a
                  href={`mailto:${customer.email}`}
                  className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest text-sky-500 transition-colors hover:border-sky-500/40 hover:bg-sky-500/5"
                >
                  {t.contactEmail}
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Tags */}
        <div className="border-b border-border px-6 py-4">
          <div className="mb-3 flex items-center gap-2">
            <TagIcon size={12} className="text-accent-light" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
              {t.filterTag}
            </h3>
            {tagsSaving ? <span className="text-[9px] font-bold text-muted-foreground/60">{t.saving}</span> : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {((Array.isArray(customer.tags) ? customer.tags : [])).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-bold text-muted-foreground"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="rounded-sm p-0.5 transition-colors hover:bg-red-500/10 hover:text-red-500"
                  aria-label={t.removeTagAria}
                >
                  <X size={9} />
                </button>
              </span>
            ))}
            {((Array.isArray(customer.tags) ? customer.tags : [])).length < MAX_TAGS_PER_CUSTOMER ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleAddTag();
                }}
                className="flex items-center gap-1"
              >
                <input
                  type="text"
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value.slice(0, MAX_TAG_LENGTH))}
                  placeholder={t.addTagPlaceholder}
                  className="rounded-md border border-dashed border-border bg-card px-2 py-0.5 text-[10px] font-bold text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/40"
                  maxLength={MAX_TAG_LENGTH}
                />
                <button
                  type="submit"
                  disabled={!normalizeTag(tagDraft)}
                  className="flex h-5 w-5 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:border-accent-light/40 hover:text-accent-light disabled:opacity-40"
                  aria-label={t.addTag}
                >
                  <Plus size={9} />
                </button>
              </form>
            ) : null}
          </div>
        </div>

        {/* Notes */}
        <div className="border-b border-border px-6 py-4">
          <div className="mb-3 flex items-center gap-2">
            <FileText size={12} className="text-accent-light" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
              {t.notes}
            </h3>
            {notesSaving ? (
              <span className="text-[9px] font-bold text-muted-foreground/60">{t.saving}</span>
            ) : notesSaved ? (
              <span className="text-[9px] font-bold text-emerald-500">{t.saved}</span>
            ) : null}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t.notesPlaceholder}
            rows={4}
            className="w-full resize-none rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/50"
          />
        </div>

        {/* History */}
        <div className="px-6 py-4">
          <div className="mb-3 flex items-center gap-2">
            <Calendar size={12} className="text-accent-light" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
              {t.history}
            </h3>
          </div>
          {customerAppts.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card/40 px-4 py-6 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {customersT.historyEmpty}
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card/60">
              {customerAppts.map((appt) => {
                const svc = services.find((s) => s.id === appt.serviceId);
                const member = staff.find((s) => s.id === appt.staffId);
                return (
                  <li key={appt.id} className="flex items-center gap-3 px-4 py-3">
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        appt.status === "confirmed" ? "bg-emerald-500" :
                        appt.status === "cancelled" ? "bg-red-500" :
                        appt.status === "completed" ? "bg-primary" :
                        "bg-accent-light animate-pulse",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-foreground">
                        {svc?.name ?? appt.serviceId}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {appt.date} {appt.time}
                        {member ? ` · ${member.name.split("'")[0]}` : ""}
                        {typeof appt.amountPaidCents === "number" && appt.amountPaidCents > 0
                          ? ` · ${(appt.amountPaidCents / 100).toFixed(2)}`
                          : ""}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      {localeConfig.admin.statuses[appt.status as keyof typeof localeConfig.admin.statuses] ?? appt.status}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
