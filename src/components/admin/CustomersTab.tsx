import React from "react";
import { Search, User, Phone, Mail, Calendar, FileText, Clock, ChevronRight, Download } from "lucide-react";
import { buildCsvBlob, downloadBlob } from "../../lib/exportCsv";
import { Customer, Appointment } from "../../types";
import { customerService } from "../../services/customers";
import { dbService } from "../../services/db";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";
import { cn } from "../../lib/utils";
import { format } from "date-fns";

export function CustomersTab() {
  const t = localeConfig.admin.customers;
  const { services: SERVICES, staff: STAFF } = siteConfig;

  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<Customer | null>(null);
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [notes, setNotes] = React.useState("");
  const [savingNotes, setSavingNotes] = React.useState(false);

  // Load full customer list on mount
  React.useEffect(() => {
    customerService.listCustomers().then((list) => {
      setCustomers(list);
      setLoading(false);
    });
  }, []);

  // Load all appointments once (for history filtering by email)
  React.useEffect(() => {
    dbService.getAppointments().then(setAppointments);
  }, []);

  // Sync notes textarea when selected customer changes
  React.useEffect(() => {
    setNotes(selected?.notes ?? "");
  }, [selected?.id]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return customers;
    const lower = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.fullName.toLowerCase().includes(lower) ||
        c.email.toLowerCase().includes(lower) ||
        c.phone.includes(search)
    );
  }, [customers, search]);

  const customerHistory = React.useMemo(() => {
    if (!selected) return [];
    return appointments
      .filter((a) => a.customerEmail.toLowerCase() === selected.email.toLowerCase())
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [selected, appointments]);

  const handleSaveNotes = async () => {
    if (!selected) return;
    setSavingNotes(true);
    try {
      await customerService.updateCustomer(selected.id, { notes });
      setSelected((prev) => prev ? { ...prev, notes } : prev);
      setCustomers((prev) =>
        prev.map((c) => (c.id === selected.id ? { ...c, notes } : c))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNotes(false);
    }
  };

  const sourceLabel = (s?: Customer["source"]) => {
    if (s === "manual") return t.manualSource;
    if (s === "import") return t.importSource;
    return t.bookingSource;
  };

  const handleExportCsv = () => {
    const rows = filtered.map((c) => ({
      fullName: c.fullName,
      email: c.email,
      phone: c.phone ?? "",
      visits: String(c.visitCount ?? 0),
      source: c.source ?? "",
      lastVisit: c.lastVisitAt ? format(c.lastVisitAt, "yyyy-MM-dd") : "",
      createdAt: c.createdAt ? format(c.createdAt, "yyyy-MM-dd") : "",
      notes: c.notes ?? "",
    }));
    const columns = [
      { key: "fullName",  label: t.csvName      },
      { key: "email",     label: t.csvEmail     },
      { key: "phone",     label: t.csvPhone     },
      { key: "visits",    label: t.csvVisits    },
      { key: "source",    label: t.csvSource    },
      { key: "lastVisit", label: t.csvLastVisit },
      { key: "createdAt", label: t.csvCreated   },
      { key: "notes",     label: t.csvNotes     },
    ];
    downloadBlob(buildCsvBlob(rows, columns), `customers-${format(new Date(), "yyyy-MM-dd")}.csv`);
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* ── Left panel: list ── */}
      <aside className="lg:w-80 shrink-0 space-y-4">
        {/* Search + Export */}
        <div className="flex items-center gap-2">
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
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
            title={localeConfig.admin.overview.exportCsv}
            className="flex items-center gap-1.5 rounded-2xl border border-border bg-card px-3 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-colors hover:border-accent-light/40 hover:text-accent-light disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={13} />
          </button>
        </div>

        {/* List */}
        <div className="overflow-hidden rounded-3xl border border-border bg-card/95 shadow-elevated">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-light border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <User size={24} className="mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                {search ? t.noResults : t.empty}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((customer) => (
                <li key={customer.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(customer)}
                    className={cn(
                      "flex w-full items-center gap-4 px-5 py-4 text-start transition-colors hover:bg-muted/60",
                      selected?.id === customer.id && "bg-accent-light/5"
                    )}
                  >
                    {/* Avatar */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-[10px] font-black uppercase text-muted-foreground">
                      {customer.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-foreground">{customer.fullName}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{customer.email}</p>
                    </div>
                    <ChevronRight size={12} className="shrink-0 text-muted-foreground/40" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* ── Right panel: detail ── */}
      <main className="min-w-0 flex-1 space-y-6">
        {!selected ? (
          <div className="flex h-64 items-center justify-center rounded-3xl border border-dashed border-border">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{t.selectPrompt}</p>
          </div>
        ) : (
          <>
            {/* Identity card */}
            <div className="overflow-hidden rounded-3xl border border-border bg-card/95 p-8 shadow-elevated">
              <div className="mb-6 flex items-start gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-accent-light/10 text-lg font-black text-accent-light">
                  {selected.fullName.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-foreground">{selected.fullName}</h2>
                  <div className="mt-1 flex flex-wrap gap-3">
                    <span className="inline-block rounded-md border border-border bg-muted/60 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {sourceLabel(selected.source)}
                    </span>
                    {selected.visitCount !== undefined && (
                      <span className="inline-block rounded-md border border-accent-light/20 bg-accent-light/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-accent-light">
                        {selected.visitCount} {t.visitCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
                  <Mail size={13} className="shrink-0 text-accent-light/60" />
                  <span className="truncate text-xs font-bold text-muted-foreground">{selected.email}</span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
                  <Phone size={13} className="shrink-0 text-accent-light/60" />
                  <span className="text-xs font-bold text-muted-foreground">{selected.phone || "—"}</span>
                </div>
                {selected.lastVisitAt && (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
                    <Clock size={13} className="shrink-0 text-accent-light/60" />
                    <span className="text-xs font-bold text-muted-foreground">
                      {t.lastVisit}: {format(new Date(selected.lastVisitAt), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes editor */}
            <div className="overflow-hidden rounded-3xl border border-border bg-card/95 p-8 shadow-elevated">
              <div className="mb-4 flex items-center gap-2">
                <FileText size={14} className="text-accent-light" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{t.notes}</h3>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.notesPlaceholder}
                rows={4}
                className="w-full resize-none rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/50"
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={savingNotes || notes === (selected.notes ?? "")}
                  className="rounded-xl border border-border bg-muted/80 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-foreground transition-all hover:border-accent-light/40 disabled:opacity-40 active:scale-95"
                >
                  {savingNotes ? t.saving : t.saveNotes}
                </button>
              </div>
            </div>

            {/* Booking history */}
            <div className="overflow-hidden rounded-3xl border border-border bg-card/95 shadow-elevated">
              <div className="flex items-center gap-2 border-b border-border px-8 py-5">
                <Calendar size={14} className="text-accent-light" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{t.history}</h3>
              </div>
              {customerHistory.length === 0 ? (
                <div className="px-8 py-12 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{t.historyEmpty}</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {customerHistory.map((appt) => {
                    const svc = SERVICES.find((s) => s.id === appt.serviceId);
                    const staff = STAFF.find((s) => s.id === appt.staffId);
                    return (
                      <li key={appt.id} className="flex items-center gap-4 px-8 py-4">
                        <div className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          appt.status === "confirmed" ? "bg-emerald-500" :
                          appt.status === "cancelled" ? "bg-red-500" :
                          appt.status === "completed" ? "bg-primary" :
                          "bg-accent-light animate-pulse"
                        )} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-foreground">{svc?.name ?? appt.serviceId}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {appt.date} {appt.time}
                            {staff ? ` · ${staff.name.split("'")[0]}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          {appt.status}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
