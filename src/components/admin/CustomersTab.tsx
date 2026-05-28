import React from "react";
import { Search, User, Phone, Mail, Calendar, FileText, Clock, ChevronRight, Download, Plus, X, DollarSign, CreditCard, ShoppingBag, Tag, UserCheck, Kanban, List } from "lucide-react";
import { buildCsvBlob, downloadBlob } from "../../lib/exportCsv";
import { Customer, Appointment, AppointmentType, CustomerStage } from "../../types";
import { customerService } from "../../services/customers";
import { dbService } from "../../services/db";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";
import { TOUR_CONFIG } from "../../config/tour.config";
import { DEMO_CUSTOMERS, DEMO_APPOINTMENTS } from "../../config/demo-data";
import { cn } from "../../lib/utils";
import { format } from "date-fns";
import { CustomersKanban } from "./CustomersKanban";

export function CustomersTab() {
  const t = localeConfig.admin.customers;
  const tp = localeConfig.admin.pipeline;
  const { services: SERVICES, staff: STAFF } = siteConfig;

  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<Customer | null>(null);
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [notes, setNotes] = React.useState("");
  const [savingNotes, setSavingNotes] = React.useState(false);
  const [showAddForm, setShowAddForm] = React.useState(false);
  // View toggle: kanban (pipeline) is the default; the legacy list survives as
  // a fallback while the new view bakes in.
  const [view, setView] = React.useState<"kanban" | "list">("kanban");
  const [addForm, setAddForm] = React.useState({
    fullName: "", email: "", phone: "",
    serviceId: "", amountPaid: "", paymentMethod: "" as "" | "cash" | "card" | "transfer" | "other",
    appointmentType: "appointment" as AppointmentType,
    staffId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: format(new Date(), "HH:mm"),
    isExternal: false,
  });
  const [addingSaving, setAddingSaving] = React.useState(false);

  React.useEffect(() => {
    if (TOUR_CONFIG.isDemoMode) {
      setCustomers(DEMO_CUSTOMERS);
      setAppointments(DEMO_APPOINTMENTS);
      setLoading(false);
      return;
    }
    customerService.listCustomers().then((list) => {
      setCustomers(list);
      setLoading(false);
    });
  }, []);

  // Load all appointments once (for history filtering by email)
  React.useEffect(() => {
    if (TOUR_CONFIG.isDemoMode) return;
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

  const handleAddCustomer = async () => {
    if (!addForm.fullName.trim() || !addForm.phone.trim()) return;
    setAddingSaving(true);
    try {
      const email = addForm.email.trim() || `walkin_${Date.now()}@noemail.local`;
      const cents = addForm.amountPaid ? Math.round(parseFloat(addForm.amountPaid) * 100) : undefined;
      const docId = await customerService.upsertByEmail({
        fullName: addForm.fullName.trim(),
        email,
        phone: addForm.phone.trim(),
        source: addForm.isExternal ? "import" : "manual",
        ...(addForm.serviceId ? { lastServiceId: addForm.serviceId } : {}),
        ...(cents != null && !isNaN(cents) ? { amountPaidCents: cents } : {}),
        ...(addForm.paymentMethod ? { paymentMethod: addForm.paymentMethod } : {}),
      });

      // Also create an appointment record if a service was selected
      if (addForm.serviceId && !TOUR_CONFIG.isDemoMode) {
        const svc = SERVICES.find(s => s.id === addForm.serviceId);
        try {
          await dbService.createAppointment({
            customerName: addForm.fullName.trim(),
            customerEmail: email,
            customerPhone: addForm.phone.trim(),
            serviceId: addForm.serviceId,
            staffId: addForm.staffId || (STAFF[0]?.id ?? ""),
            date: addForm.date,
            time: addForm.time,
            duration: svc?.duration ?? 30,
            status: "completed",
            type: addForm.appointmentType,
            ...(cents != null && !isNaN(cents) ? { amountPaidCents: cents } : {}),
            ...(addForm.paymentMethod && cents ? { paymentStatus: "paid" as const } : {}),
          });
          // Refresh appointments list
          dbService.getAppointments().then(setAppointments);
        } catch (apptErr) {
          console.error("[CustomersTab] create walk-in appointment:", apptErr);
        }
      }

      if (docId) {
        const updated = await customerService.listCustomers();
        setCustomers(updated);
        const added = updated.find((c) => c.id === docId);
        if (added) setSelected(added);
      }
      setAddForm({
        fullName: "", email: "", phone: "", serviceId: "", amountPaid: "",
        paymentMethod: "", appointmentType: "appointment", staffId: "",
        date: format(new Date(), "yyyy-MM-dd"), time: format(new Date(), "HH:mm"),
        isExternal: false,
      });
      setShowAddForm(false);
    } catch (err) {
      console.error("[CustomersTab] add customer:", err);
    } finally {
      setAddingSaving(false);
    }
  };

  const handleCustomerUpdated = React.useCallback((next: Customer) => {
    setCustomers((prev) => prev.map((c) => (c.id === next.id ? next : c)));
    setSelected((prev) => (prev && prev.id === next.id ? next : prev));
  }, []);

  const handleStageChanged = React.useCallback((id: string, stage: CustomerStage) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, stage } : c)));
  }, []);

  if (loading && customers.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-light border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View toggle: Pipeline / List */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setView("kanban")}
          className={cn(
            "flex h-10 items-center gap-2 rounded-2xl border px-4 text-[10px] font-black uppercase tracking-widest transition-colors",
            view === "kanban"
              ? "border-accent-light/40 bg-accent-light/10 text-accent-light"
              : "border-border bg-card text-muted-foreground hover:border-accent-light/40 hover:text-accent-light",
          )}
          aria-pressed={view === "kanban"}
        >
          <Kanban size={13} />
          {tp.title}
        </button>
        <button
          type="button"
          onClick={() => setView("list")}
          className={cn(
            "flex h-10 items-center gap-2 rounded-2xl border px-4 text-[10px] font-black uppercase tracking-widest transition-colors",
            view === "list"
              ? "border-accent-light/40 bg-accent-light/10 text-accent-light"
              : "border-border bg-card text-muted-foreground hover:border-accent-light/40 hover:text-accent-light",
          )}
          aria-pressed={view === "list"}
        >
          <List size={13} />
          {t.title}
        </button>
      </div>

      {view === "kanban" ? (
        <CustomersKanban
          customers={customers}
          appointments={appointments}
          onCustomerUpdated={handleCustomerUpdated}
          onStageChanged={handleStageChanged}
        />
      ) : (
        renderListView()
      )}
    </div>
  );

  function renderListView() {
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
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground transition-colors hover:border-accent-light/40 hover:text-accent-light disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={15} />
          </button>
          <button
            onClick={() => setShowAddForm((p) => !p)}
            title={t.addCustomer}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground transition-colors hover:border-accent-light/40 hover:text-accent-light"
          >
            {showAddForm ? <X size={15} /> : <Plus size={15} />}
          </button>
        </div>

        {/* Inline add-customer form */}
        {showAddForm && (
          <div className="overflow-hidden rounded-2xl border border-accent-light/30 bg-card/95 p-4 shadow-elevated space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-light">{t.addCustomer}</p>
            <input
              type="text"
              value={addForm.fullName}
              onChange={(e) => setAddForm((f) => ({ ...f, fullName: e.target.value }))}
              placeholder={t.addCustomerName}
              className="w-full rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/50"
              autoFocus
            />
            <input
              type="tel"
              value={addForm.phone}
              onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder={t.addCustomerPhone}
              className="w-full rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/50"
            />
            <input
              type="email"
              value={addForm.email}
              onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
              placeholder={t.addCustomerEmail}
              className="w-full rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/50"
            />

            {/* Service used */}
            <div className="relative">
              <ShoppingBag size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
              <select
                value={addForm.serviceId}
                onChange={(e) => setAddForm((f) => ({ ...f, serviceId: e.target.value }))}
                className="w-full appearance-none rounded-xl border border-border bg-muted/40 py-2.5 ps-9 pe-4 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/50"
              >
                <option value="">{t.selectService}</option>
                {SERVICES.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Appointment type + staff */}
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <Tag size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                <select
                  value={addForm.appointmentType}
                  onChange={(e) => setAddForm((f) => ({ ...f, appointmentType: e.target.value as AppointmentType }))}
                  className="w-full appearance-none rounded-xl border border-border bg-muted/40 py-2.5 ps-9 pe-4 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/50"
                >
                  <option value="appointment">{localeConfig.admin.dashboard.appointmentTypes.appointment}</option>
                  <option value="consultation">{localeConfig.admin.dashboard.appointmentTypes.consultation}</option>
                  <option value="meeting">{localeConfig.admin.dashboard.appointmentTypes.meeting}</option>
                </select>
              </div>
              <div className="relative">
                <UserCheck size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                <select
                  value={addForm.staffId}
                  onChange={(e) => setAddForm((f) => ({ ...f, staffId: e.target.value }))}
                  className="w-full appearance-none rounded-xl border border-border bg-muted/40 py-2.5 ps-9 pe-4 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/50"
                >
                  <option value="">{localeConfig.admin.dashboard.filters.allStaff}</option>
                  {STAFF.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date + time */}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={addForm.date}
                onChange={(e) => setAddForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/50"
              />
              <input
                type="time"
                value={addForm.time}
                onChange={(e) => setAddForm((f) => ({ ...f, time: e.target.value }))}
                className="w-full rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/50"
              />
            </div>

            {/* Amount paid + payment method */}
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <DollarSign size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={addForm.amountPaid}
                  onChange={(e) => setAddForm((f) => ({ ...f, amountPaid: e.target.value }))}
                  placeholder={t.addCustomerAmount}
                  className="w-full rounded-xl border border-border bg-muted/40 py-2.5 ps-9 pe-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/50"
                />
              </div>
              <div className="relative">
                <CreditCard size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                <select
                  value={addForm.paymentMethod}
                  onChange={(e) => setAddForm((f) => ({ ...f, paymentMethod: e.target.value as typeof addForm.paymentMethod }))}
                  className="w-full appearance-none rounded-xl border border-border bg-muted/40 py-2.5 ps-9 pe-4 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/50"
                >
                  <option value="">{t.addCustomerPaymentMethod}</option>
                  <option value="cash">{t.paymentCash}</option>
                  <option value="card">{t.paymentCard}</option>
                  <option value="transfer">{t.paymentTransfer}</option>
                  <option value="other">{t.paymentOther}</option>
                </select>
              </div>
            </div>

            {/* External/walk-in toggle */}
            <button
              type="button"
              onClick={() => setAddForm((f) => ({ ...f, isExternal: !f.isExternal }))}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs transition-colors",
                addForm.isExternal
                  ? "border-accent-light/30 bg-accent-light/10 text-accent-light"
                  : "border-border bg-muted/40 text-muted-foreground"
              )}
            >
              <div className={`h-3 w-6 rounded-full transition-colors ${addForm.isExternal ? "bg-accent-light" : "bg-muted"}`}>
                <div className={`h-3 w-3 rounded-full bg-white transition-transform ${addForm.isExternal ? "translate-x-3" : "translate-x-0"}`} />
              </div>
              {t.sourceExternal}
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddCustomer}
                disabled={addingSaving || !addForm.fullName.trim() || !addForm.phone.trim()}
                className="flex-1 rounded-xl bg-accent-light px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-950 transition-all hover:bg-accent-light/80 disabled:opacity-40 active:scale-95"
              >
                {addingSaving ? t.saving : t.addCustomerSave}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setAddForm({ fullName: "", email: "", phone: "", serviceId: "", amountPaid: "", paymentMethod: "", appointmentType: "appointment", staffId: "", date: format(new Date(), "yyyy-MM-dd"), time: format(new Date(), "HH:mm"), isExternal: false }); }}
                className="rounded-xl border border-border bg-muted/80 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-all hover:border-accent-light/40 active:scale-95"
              >
                {t.addCustomerCancel}
              </button>
            </div>
          </div>
        )}

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
                {selected.lastServiceId && (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
                    <ShoppingBag size={13} className="shrink-0 text-accent-light/60" />
                    <span className="text-xs font-bold text-muted-foreground">
                      {SERVICES.find(s => s.id === selected.lastServiceId)?.name ?? selected.lastServiceId}
                    </span>
                  </div>
                )}
                {selected.amountPaidCents != null && (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
                    <DollarSign size={13} className="shrink-0 text-accent-light/60" />
                    <span className="text-xs font-bold text-muted-foreground">
                      {(selected.amountPaidCents / 100).toFixed(2)}
                      {selected.paymentMethod ? ` · ${selected.paymentMethod}` : ""}
                    </span>
                  </div>
                )}
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
                          {localeConfig.admin.statuses[appt.status as keyof typeof localeConfig.admin.statuses] ?? appt.status}
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
}
