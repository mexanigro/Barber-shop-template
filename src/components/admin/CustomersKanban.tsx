import React from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  GripVertical,
  Mail,
  Phone,
  Search,
  Tag as TagIcon,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { format } from "date-fns";
import type { Appointment, Customer, CustomerStage } from "../../types";
import {
  CUSTOMER_STAGES,
  DEFAULT_VISIBLE_STAGES,
  MAX_BULK_CUSTOMERS,
  appointmentBelongsToCustomer,
  deriveStage,
  sourcePalette,
  type SourcePaletteKey,
} from "../../lib/customer-pipeline";
import { localeConfig } from "../../config/locale";
import { TOUR_CONFIG } from "../../config/tour.config";
import { auth as firebaseAuth } from "../../lib/firebase";
import { cn } from "../../lib/utils";
import { buildCsvBlob, downloadBlob } from "../../lib/exportCsv";
import { CustomerDetailPanel } from "./CustomerDetailPanel";

const SOURCE_PILL_CLASS: Record<SourcePaletteKey, string> = {
  web:       "bg-sky-500/10 text-sky-500 border-sky-500/20",
  whatsapp:  "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  instagram: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  google:    "bg-rose-500/10 text-rose-500 border-rose-500/20",
  referral:  "bg-violet-500/10 text-violet-500 border-violet-500/20",
  manual:    "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  walkin:    "bg-amber-500/10 text-amber-500 border-amber-500/20",
  booking:   "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  import:    "bg-slate-500/10 text-slate-500 border-slate-500/20",
  default:   "bg-muted text-muted-foreground border-border",
};

const STAGE_ACCENT: Record<CustomerStage, string> = {
  lead:      "from-sky-500/40 via-sky-500/0 to-transparent",
  contacted: "from-amber-500/40 via-amber-500/0 to-transparent",
  scheduled: "from-violet-500/40 via-violet-500/0 to-transparent",
  converted: "from-emerald-500/40 via-emerald-500/0 to-transparent",
  lost:      "from-zinc-500/30 via-zinc-500/0 to-transparent",
};

const STAGE_DOT: Record<CustomerStage, string> = {
  lead:      "bg-sky-500",
  contacted: "bg-amber-500",
  scheduled: "bg-violet-500",
  converted: "bg-emerald-500",
  lost:      "bg-zinc-500",
};

type EnrichedCustomer = Customer & {
  derivedStage: CustomerStage;
  lastAppointment?: Appointment;
};

type ToastState = { kind: "success" | "error"; message: string } | null;

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

function customerKey(c: Pick<Customer, "id">): string {
  return c.id;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

function relativeOrShort(date: Date | undefined): string {
  if (!date) return "";
  try {
    return format(date, "MMM d");
  } catch {
    return "";
  }
}

export type CustomersKanbanProps = {
  customers: Customer[];
  appointments: Appointment[];
  /**
   * Called when a stage change request completes. Parents update local state
   * after this resolves so the kanban can stay optimistic-first.
   */
  onStageChanged?: (customerId: string, stage: CustomerStage) => void;
  onCustomerUpdated?: (next: Customer) => void;
  /** Refresh hook used after operations that may mutate the customer list. */
  onRefreshRequested?: () => void;
};

export function CustomersKanban({
  customers,
  appointments,
  onStageChanged,
  onCustomerUpdated,
  onRefreshRequested,
}: CustomersKanbanProps) {
  const t = localeConfig.admin.pipeline;
  const customersT = localeConfig.admin.customers;

  const [localCustomers, setLocalCustomers] = React.useState<Customer[]>(customers);
  React.useEffect(() => setLocalCustomers(customers), [customers]);

  const [search, setSearch] = React.useState("");
  const [sourceFilters, setSourceFilters] = React.useState<Set<string>>(new Set());
  const [tagFilters, setTagFilters] = React.useState<Set<string>>(new Set());
  const [showLost, setShowLost] = React.useState(false);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  // Mobile single-column tab
  const [mobileStage, setMobileStage] = React.useState<CustomerStage>("lead");

  // Selection / bulk
  const [selectMode, setSelectMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  // Drag state
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = React.useState<CustomerStage | null>(null);

  // Detail panel
  const [detailCustomerId, setDetailCustomerId] = React.useState<string | null>(null);

  // Toast
  const [toast, setToast] = React.useState<ToastState>(null);
  React.useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(id);
  }, [toast]);

  // ── Enrich customers with derivedStage + lastAppointment ───────────────────
  const enriched = React.useMemo<EnrichedCustomer[]>(() => {
    const today = new Date().toISOString().slice(0, 10);
    return localCustomers.map((c) => {
      const customerAppts = appointments.filter((a) => appointmentBelongsToCustomer(a, c));
      const lastAppt = customerAppts
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
      return {
        ...c,
        derivedStage: deriveStage(c, customerAppts, today),
        lastAppointment: lastAppt,
      };
    });
  }, [localCustomers, appointments]);

  // ── Filter dropdown sources / tags (union of present values) ───────────────
  const availableSources = React.useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const c of enriched) if (c.source) set.add(c.source);
    return [...set].sort();
  }, [enriched]);

  const availableTags = React.useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const c of enriched) for (const tag of (Array.isArray(c.tags) ? c.tags : [])) set.add(tag);
    return [...set].sort();
  }, [enriched]);

  // ── Apply filters ──────────────────────────────────────────────────────────
  const filtered = React.useMemo<EnrichedCustomer[]>(() => {
    const term = search.trim().toLowerCase();
    return enriched.filter((c) => {
      if (term) {
        const hay = `${c.fullName} ${c.email} ${c.phone}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (sourceFilters.size > 0 && !sourceFilters.has(c.source ?? "")) return false;
      if (tagFilters.size > 0) {
        const tags = (Array.isArray(c.tags) ? c.tags : []);
        if (!tags.some((t) => tagFilters.has(t))) return false;
      }
      return true;
    });
  }, [enriched, search, sourceFilters, tagFilters]);

  // ── Group by stage ─────────────────────────────────────────────────────────
  const byStage = React.useMemo<Record<CustomerStage, EnrichedCustomer[]>>(() => {
    const acc: Record<CustomerStage, EnrichedCustomer[]> = {
      lead: [], contacted: [], scheduled: [], converted: [], lost: [],
    };
    for (const c of filtered) acc[c.derivedStage].push(c);
    return acc;
  }, [filtered]);

  const visibleStages = React.useMemo<CustomerStage[]>(() => {
    return showLost ? [...CUSTOMER_STAGES] : [...DEFAULT_VISIBLE_STAGES];
  }, [showLost]);

  // ── Stage change (drag drop OR menu) ───────────────────────────────────────
  const persistStage = React.useCallback(
    async (customerId: string, nextStage: CustomerStage): Promise<boolean> => {
      if (TOUR_CONFIG.isDemoMode) return true;
      try {
        const headers = await getAdminAuthHeader();
        if (!headers.Authorization) return false;
        const res = await fetch(`/api/customers/${encodeURIComponent(customerId)}/stage`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({ stage: nextStage }),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    [],
  );

  const moveToStage = React.useCallback(
    async (customerId: string, nextStage: CustomerStage) => {
      const current = localCustomers.find((c) => c.id === customerId);
      if (!current) return;
      const previousStage = current.stage;
      // Optimistic update.
      setLocalCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, stage: nextStage } : c)),
      );
      const ok = await persistStage(customerId, nextStage);
      if (!ok) {
        // Revert.
        setLocalCustomers((prev) =>
          prev.map((c) => (c.id === customerId ? { ...c, stage: previousStage } : c)),
        );
        setToast({ kind: "error", message: t.saveFailed });
        return;
      }
      onStageChanged?.(customerId, nextStage);
      setToast({
        kind: "success",
        message: t.stageChangedToast.replace("{stage}", t.stages[nextStage]),
      });
    },
    [localCustomers, persistStage, t, onStageChanged],
  );

  // ── Bulk actions ───────────────────────────────────────────────────────────
  const selectedList = React.useMemo<EnrichedCustomer[]>(
    () => enriched.filter((c) => selectedIds.has(c.id)),
    [enriched, selectedIds],
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size >= MAX_BULK_CUSTOMERS) {
        setToast({ kind: "error", message: t.bulkCapWarning });
        return prev;
      } else next.add(id);
      return next;
    });
  };

  const bulkChangeStage = async (nextStage: CustomerStage) => {
    const targets = [...selectedIds].slice(0, MAX_BULK_CUSTOMERS);
    if (targets.length === 0) return;
    setLocalCustomers((prev) =>
      prev.map((c) => (selectedIds.has(c.id) ? { ...c, stage: nextStage } : c)),
    );
    let failures = 0;
    for (const id of targets) {
      const ok = await persistStage(id, nextStage);
      if (!ok) failures += 1;
    }
    if (failures > 0) {
      setToast({ kind: "error", message: t.saveFailed });
      onRefreshRequested?.();
    } else {
      setToast({ kind: "success", message: t.saved });
    }
    setSelectedIds(new Set());
  };

  const bulkExportCsv = () => {
    const rows = selectedList.map((c) => ({
      fullName: c.fullName,
      email: c.email,
      phone: c.phone ?? "",
      stage: t.stages[c.derivedStage],
      tags: ((Array.isArray(c.tags) ? c.tags : [])).join(" | "),
      visitCount: String(c.visitCount ?? 0),
      source: c.source ?? "",
      lastVisit: c.lastVisitAt ? format(c.lastVisitAt, "yyyy-MM-dd") : "",
      createdAt: c.createdAt ? format(c.createdAt, "yyyy-MM-dd") : "",
      notes: c.notes ?? "",
    }));
    const columns = [
      { key: "fullName",   label: customersT.csvName },
      { key: "email",      label: customersT.csvEmail },
      { key: "phone",      label: customersT.csvPhone },
      { key: "stage",      label: t.changeStage },
      { key: "tags",       label: t.filterTag },
      { key: "visitCount", label: customersT.csvVisits },
      { key: "source",     label: customersT.csvSource },
      { key: "lastVisit",  label: customersT.csvLastVisit },
      { key: "createdAt",  label: customersT.csvCreated },
      { key: "notes",      label: customersT.csvNotes },
    ];
    downloadBlob(buildCsvBlob(rows, columns), `pipeline-${format(new Date(), "yyyy-MM-dd")}.csv`);
  };

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const onDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    if (selectMode) {
      e.preventDefault();
      return;
    }
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", id);
    } catch {
      // jsdom + some browsers throw on unset data — ignore.
    }
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>, stage: CustomerStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverStage !== stage) setDragOverStage(stage);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>, stage: CustomerStage) => {
    e.preventDefault();
    const id = draggingId ?? e.dataTransfer.getData("text/plain");
    setDraggingId(null);
    setDragOverStage(null);
    if (!id) return;
    const current = localCustomers.find((c) => c.id === id);
    if (!current) return;
    const currentStage = enriched.find((c) => c.id === id)?.derivedStage ?? current.stage;
    if (currentStage === stage) return;
    void moveToStage(id, stage);
  };

  const onDragEnd = () => {
    setDraggingId(null);
    setDragOverStage(null);
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const renderCard = (c: EnrichedCustomer) => {
    const selected = selectedIds.has(c.id);
    const palette = sourcePalette(c.source);
    const tagsToShow = ((Array.isArray(c.tags) ? c.tags : [])).slice(0, 3);
    const tagsExtra = ((Array.isArray(c.tags) ? c.tags : [])).length - tagsToShow.length;
    const lastApptLabel = c.lastAppointment
      ? `${c.lastAppointment.date}`
      : c.lastVisitAt
        ? format(c.lastVisitAt, "yyyy-MM-dd")
        : t.noAppointments;
    const phoneDigits = (c.phone ?? "").replace(/\D/g, "");
    const wa = phoneDigits ? `https://wa.me/${phoneDigits}` : null;
    return (
      <div
        key={customerKey(c)}
        draggable={!selectMode}
        onDragStart={(e) => onDragStart(e, c.id)}
        onDragEnd={onDragEnd}
        className={cn(
          "group relative cursor-pointer rounded-2xl border border-border bg-card/95 p-4 shadow-sm transition-all",
          "hover:border-accent-light/40 hover:shadow-elevated",
          draggingId === c.id && "opacity-40 ring-2 ring-accent-light/40",
          selected && "ring-2 ring-accent-light",
        )}
        onClick={(e) => {
          if (selectMode) {
            e.stopPropagation();
            toggleSelect(c.id);
            return;
          }
          setDetailCustomerId(c.id);
        }}
      >
        {/* Drag handle / select checkbox */}
        <div className="absolute end-3 top-3 flex items-center gap-1">
          {selectMode ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleSelect(c.id);
              }}
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-md border transition-colors",
                selected
                  ? "border-accent-light bg-accent-light text-zinc-950"
                  : "border-border bg-card hover:border-accent-light/40",
              )}
              aria-label="select"
            >
              {selected ? <Check size={12} /> : null}
            </button>
          ) : (
            <GripVertical size={14} className="text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
          )}
        </div>

        {/* Identity */}
        <div className="flex items-start gap-3 pe-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-[11px] font-black uppercase text-muted-foreground">
            {initials(c.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-foreground">{c.fullName}</p>
            {c.source ? (
              <span
                className={cn(
                  "mt-1 inline-block rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest",
                  SOURCE_PILL_CLASS[palette],
                )}
              >
                {c.source}
              </span>
            ) : null}
          </div>
        </div>

        {/* Tags */}
        {tagsToShow.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {tagsToShow.map((tag) => (
              <span
                key={tag}
                className="inline-flex max-w-[120px] items-center truncate rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-muted-foreground"
                title={tag}
              >
                {tag}
              </span>
            ))}
            {tagsExtra > 0 ? (
              <span className="inline-flex items-center rounded-md border border-dashed border-border bg-card px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground/60">
                +{tagsExtra}
              </span>
            ) : null}
          </div>
        ) : null}

        {/* Footer: last appt + contact icons */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="truncate text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
            {c.lastAppointment || c.lastVisitAt ? `${t.lastAppointment}: ${lastApptLabel}` : t.noAppointments}
          </span>
          <div className="flex items-center gap-1">
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:border-emerald-500/40 hover:text-emerald-500"
                aria-label={t.contactWhatsApp}
              >
                <Phone size={11} />
              </a>
            ) : null}
            {c.email && !c.email.endsWith("@noemail.local") ? (
              <a
                href={`mailto:${c.email}`}
                onClick={(e) => e.stopPropagation()}
                className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:border-sky-500/40 hover:text-sky-500"
                aria-label={t.contactEmail}
              >
                <Mail size={11} />
              </a>
            ) : null}
          </div>
        </div>

        {/* Mobile move-to dropdown */}
        {selectMode ? null : (
          <select
            value={c.derivedStage}
            onChange={(e) => {
              e.stopPropagation();
              const next = e.target.value as CustomerStage;
              if (next === c.derivedStage) return;
              void moveToStage(c.id, next);
            }}
            onClick={(e) => e.stopPropagation()}
            className="mt-3 w-full appearance-none rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-[10px] font-bold text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/50 lg:hidden"
            aria-label={t.moveTo}
          >
            {CUSTOMER_STAGES.map((s) => (
              <option key={s} value={s}>{t.stages[s]}</option>
            ))}
          </select>
        )}
      </div>
    );
  };

  const renderColumn = (stage: CustomerStage, list: EnrichedCustomer[], compact = false) => {
    const isOver = dragOverStage === stage;
    return (
      <div
        key={stage}
        onDragOver={(e) => onDragOver(e, stage)}
        onDrop={(e) => onDrop(e, stage)}
        onDragLeave={() => {
          if (dragOverStage === stage) setDragOverStage(null);
        }}
        className={cn(
          "relative flex min-h-[420px] flex-col rounded-3xl border border-border bg-card/80 backdrop-blur transition-colors",
          isOver && "border-accent-light/50 bg-accent-light/5",
          compact ? "w-full" : "min-w-[260px] flex-1",
        )}
      >
        {/* Stage header with subtle accent gradient */}
        <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-16 rounded-t-3xl bg-gradient-to-b opacity-80", STAGE_ACCENT[stage])} />
        <div className="relative flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 shrink-0 rounded-full", STAGE_DOT[stage])} />
            <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-foreground">
              {t.stages[stage]}
            </h3>
          </div>
          <span className="rounded-md border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-black tracking-widest text-muted-foreground">
            {list.length}
          </span>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          {list.length === 0 ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center px-4 text-center">
              <Users size={20} className="mb-2 text-muted-foreground/30" />
              <p className="text-[10px] leading-relaxed text-muted-foreground/70">
                {t.stageEmpty[stage]}
              </p>
            </div>
          ) : (
            list.map(renderCard)
          )}
        </div>
      </div>
    );
  };

  const mobileStageIndex = visibleStages.indexOf(mobileStage);
  const mobileNext = visibleStages[(mobileStageIndex + 1) % visibleStages.length];
  const mobilePrev = visibleStages[(mobileStageIndex - 1 + visibleStages.length) % visibleStages.length];

  React.useEffect(() => {
    if (!visibleStages.includes(mobileStage)) {
      setMobileStage(visibleStages[0]);
    }
  }, [visibleStages, mobileStage]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (localCustomers.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-card/40 px-6 text-center">
        <Users size={28} className="text-muted-foreground/40" />
        <p className="max-w-sm text-xs text-muted-foreground">{t.emptyAll}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-2xl border border-border bg-card ps-10 pe-4 py-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/50"
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((p) => !p)}
            className={cn(
              "flex h-11 items-center gap-2 rounded-2xl border px-4 text-[10px] font-black uppercase tracking-widest transition-colors",
              filtersOpen
                ? "border-accent-light/40 bg-accent-light/10 text-accent-light"
                : "border-border bg-card text-muted-foreground hover:border-accent-light/40 hover:text-accent-light",
            )}
            aria-pressed={filtersOpen}
          >
            <Filter size={13} />
            {(sourceFilters.size + tagFilters.size + (showLost ? 1 : 0)) > 0 ? (
              <span className="rounded-full bg-accent-light text-zinc-950 px-1.5 py-0.5 text-[9px]">
                {sourceFilters.size + tagFilters.size + (showLost ? 1 : 0)}
              </span>
            ) : null}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectMode((p) => !p);
              setSelectedIds(new Set());
            }}
            className={cn(
              "flex h-11 items-center gap-2 rounded-2xl border px-4 text-[10px] font-black uppercase tracking-widest transition-colors",
              selectMode
                ? "border-accent-light/40 bg-accent-light/10 text-accent-light"
                : "border-border bg-card text-muted-foreground hover:border-accent-light/40 hover:text-accent-light",
            )}
          >
            {selectMode ? t.bulkSelectExit : t.bulkSelect}
          </button>
        </div>
      </div>

      {/* Filters expanded */}
      {filtersOpen ? (
        <div className="space-y-3 rounded-2xl border border-border bg-card/60 p-4">
          {availableSources.length > 0 ? (
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.filterSource}</p>
              <div className="flex flex-wrap gap-1.5">
                {availableSources.map((src) => {
                  const active = sourceFilters.has(src);
                  return (
                    <button
                      key={src}
                      type="button"
                      onClick={() =>
                        setSourceFilters((prev) => {
                          const next = new Set(prev);
                          if (next.has(src)) next.delete(src);
                          else next.add(src);
                          return next;
                        })
                      }
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-[10px] font-bold transition-colors",
                        active
                          ? cn("ring-2 ring-accent-light/40", SOURCE_PILL_CLASS[sourcePalette(src)])
                          : "border-border bg-card text-muted-foreground hover:border-accent-light/40",
                      )}
                    >
                      {src}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          {availableTags.length > 0 ? (
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.filterTag}</p>
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((tag) => {
                  const active = tagFilters.has(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setTagFilters((prev) => {
                          const next = new Set(prev);
                          if (next.has(tag)) next.delete(tag);
                          else next.add(tag);
                          return next;
                        })
                      }
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-[10px] font-bold transition-colors",
                        active
                          ? "border-accent-light bg-accent-light/10 text-accent-light"
                          : "border-border bg-card text-muted-foreground hover:border-accent-light/40",
                      )}
                    >
                      <TagIcon size={9} className="me-1 inline" />
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <label className="flex cursor-pointer items-center gap-2 text-[11px] font-bold text-muted-foreground">
            <input
              type="checkbox"
              checked={showLost}
              onChange={(e) => setShowLost(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-zinc-500"
            />
            {t.showLost}
          </label>
        </div>
      ) : null}

      {/* Bulk action bar */}
      {selectMode && selectedIds.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-accent-light/40 bg-accent-light/5 px-4 py-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-accent-light">
            {t.bulkCount.replace("{count}", String(selectedIds.size))}
          </span>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="rounded-md border border-border bg-card px-2.5 py-1 text-[10px] font-bold text-muted-foreground hover:border-accent-light/40"
          >
            <Trash2 size={10} className="me-1 inline" />
            {t.bulkClear}
          </button>
          <div className="relative">
            <select
              onChange={(e) => {
                const stage = e.target.value as CustomerStage | "";
                if (!stage) return;
                void bulkChangeStage(stage as CustomerStage);
                e.currentTarget.value = "";
              }}
              defaultValue=""
              className="rounded-md border border-border bg-card px-2.5 py-1 text-[10px] font-bold text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/50"
            >
              <option value="" disabled>{t.bulkChangeStage}</option>
              {CUSTOMER_STAGES.map((s) => (
                <option key={s} value={s}>{t.stages[s]}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={bulkExportCsv}
            className="rounded-md border border-border bg-card px-2.5 py-1 text-[10px] font-bold text-muted-foreground hover:border-accent-light/40"
          >
            <Download size={10} className="me-1 inline" />
            {t.bulkExportCsv}
          </button>
        </div>
      ) : null}

      {/* Mobile stage switcher */}
      <div className="lg:hidden">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {visibleStages.map((s) => {
            const active = mobileStage === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setMobileStage(s)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors",
                  active
                    ? "border-accent-light bg-accent-light text-zinc-950"
                    : "border-border bg-card text-muted-foreground hover:border-accent-light/40",
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", STAGE_DOT[s])} />
                {t.stages[s]}
                <span className="ms-1 rounded bg-muted/60 px-1 py-0.5 text-[9px]">
                  {byStage[s].length}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3">
          <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground/70">
            <button type="button" onClick={() => setMobileStage(mobilePrev)} className="flex items-center gap-1">
              <ChevronLeft size={12} />
              {t.stages[mobilePrev]}
            </button>
            <button type="button" onClick={() => setMobileStage(mobileNext)} className="flex items-center gap-1">
              {t.stages[mobileNext]}
              <ChevronRight size={12} />
            </button>
          </div>
          {renderColumn(mobileStage, byStage[mobileStage], true)}
        </div>
      </div>

      {/* Desktop 5-column board */}
      <div className="hidden gap-3 lg:flex lg:overflow-x-auto lg:pb-2">
        {visibleStages.map((s) => renderColumn(s, byStage[s]))}
      </div>

      {/* Toast */}
      {toast ? (
        <div
          className={cn(
            "fixed bottom-6 end-6 z-50 flex items-center gap-2 rounded-2xl border px-4 py-3 text-[11px] font-bold shadow-elevated backdrop-blur",
            toast.kind === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
              : "border-red-500/40 bg-red-500/10 text-red-500",
          )}
        >
          {toast.kind === "success" ? <Check size={12} /> : <X size={12} />}
          {toast.message}
        </div>
      ) : null}

      {/* Detail panel */}
      {detailCustomerId ? (
        <CustomerDetailPanel
          customerId={detailCustomerId}
          customers={localCustomers}
          appointments={appointments}
          onClose={() => setDetailCustomerId(null)}
          onCustomerUpdated={(next) => {
            setLocalCustomers((prev) => prev.map((c) => (c.id === next.id ? next : c)));
            onCustomerUpdated?.(next);
          }}
          onStageChange={(id, stage) => moveToStage(id, stage)}
        />
      ) : null}
    </div>
  );
}
