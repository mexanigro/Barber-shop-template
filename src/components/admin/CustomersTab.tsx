import { isCompletedTimeValid } from "../../lib/completed-appointment";
import React from "react";
import { useCustomerList } from "../../hooks/useCustomerList";
import { CustomerLoadNotice } from "./CustomerLoadNotice";
import { Search, User, Phone, Mail, Calendar, FileText, Clock, ChevronRight, Download, Plus, X, DollarSign, CreditCard, ShoppingBag, Tag, UserCheck, Kanban, List } from "lucide-react";
import { buildCsvBlob, downloadBlob } from "../../lib/exportCsv";
import { Customer, Appointment, AppointmentType, CustomerStage } from "../../types";
import { CustomerOperationError, customerService } from "../../services/customers";
import { dbService } from "../../services/db";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";
import { TOUR_CONFIG } from "../../config/tour.config";
import { DEMO_APPOINTMENTS } from "../../config/demo-data";
import { cn } from "../../lib/utils";
import { format } from "date-fns";
import type { ContactIntent } from '../../services/core-contacts';
import { contactText } from '../../lib/core-contact-labels';
import { CoreContacts } from "./CoreContacts";
import { CustomersKanban } from "./CustomersKanban";
import { selectCustomerAppointmentCandidates } from "../../lib/customer-pipeline";
import { useToast } from "../ui/Toast";
import { RegOperationPanel } from './RegOperationPanel';
import { browserRegLinks } from '../../services/reg';
import { regText } from '../../lib/reg/labels';
import type { Link } from '../../lib/reg/types';

export function CustomersTab({ onOpenCalendar }: { onOpenCalendar?: () => void } = {}) {
  const t = localeConfig.admin.customers;
  const tp = localeConfig.admin.pipeline;
  const { services: SERVICES, staff: STAFF } = siteConfig;
  const toast = useToast();

  const [archiveFilter, setArchiveFilter] = React.useState<'active' | 'archived' | 'all'>('active');
  const [createPending, setCreatePending] = React.useState<ContactIntent | null>(null);
  const { customers, setCustomers, capabilities, scopeVersion, loading, error: customerLoadError, refresh: refreshCustomers } = useCustomerList(archiveFilter);
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
    serviceId: "", 
    appointmentType: "appointment" as AppointmentType,
    staffId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: format(new Date(), "HH:mm"),
    isExternal: false,
  });
  const [addingSaving, setAddingSaving] = React.useState(false);
  const [wantMoney,setWantMoney]=React.useState(false);
  const [moneyLinks,setMoneyLinks]=React.useState<Link[]|null>(null);

  const addInFlight = React.useRef(false);
  const contactOperation = React.useRef<string | null>(null);
  const confirmedAdd = React.useRef<{ id: string; appointmentFailed: boolean; appointmentId?: string } | null>(null);
  const [attendanceConfirmed, setAttendanceConfirmed] = React.useState(false);
  const [addUncertain, setAddUncertain] = React.useState(false);
  const [addError, setAddError] = React.useState<string | null>(null);
  const [reloadPending, setReloadPending] = React.useState(false);

  const canManage = TOUR_CONFIG.isDemoMode || capabilities?.member?.role === 'owner' || capabilities?.member?.role === 'manager';
  React.useEffect(() => {
    setSelected(null); setNotes(''); setAppointments([]); setMoneyLinks(null); setShowAddForm(false);
    confirmedAdd.current = null; contactOperation.current = null; setCreatePending(null); setAddUncertain(false); setReloadPending(false);
  }, [scopeVersion]);

  React.useEffect(() => {
    if (TOUR_CONFIG.isDemoMode || !capabilities) return;
    let active = true;
    void customerService.client.pendingCreates().then(rows => {
      if (!active || !rows.length) return;
      const intent = rows[0], fields = intent.command.fields ?? {};
      setCreatePending(intent); contactOperation.current = intent.command.operationId; setAddUncertain(true); setShowAddForm(true); setView('list');
      setAddForm(form => ({ ...form, fullName: fields.fullName ?? '', email: fields.email ?? '', phone: fields.phone ?? '', isExternal: fields.channel === 'import' }));
      setAddError(localeConfig.admin.common.walkInContactUnknown);
    }).catch(() => { if (active) setAddError(localeConfig.admin.common.toastCustomerError); });
    return () => { active = false; };
  }, [capabilities?.scope.epoch, scopeVersion]);

  const recoverCreate = async (retry: boolean) => {
    if (!createPending || addInFlight.current) return;
    addInFlight.current = true; setAddingSaving(true);
    try {
      const result = await (retry ? customerService.client.retry(createPending) : customerService.client.recover(createPending));
      setCreatePending(result);
      if (result.state === 'accepted' && result.result) {
        confirmedAdd.current = { id: result.result.key, appointmentFailed: false };
        setCreatePending(null); setAddUncertain(false); setReloadPending(true); setAddError(localeConfig.admin.common.customerSavedReloadPending);
      } else if (result.state === 'rejected') {
        setCreatePending(null); contactOperation.current = null; setAddUncertain(false); setAddError(localeConfig.admin.common.toastCustomerError);
      } else setAddError(localeConfig.admin.common.walkInContactUnknown);
    } catch { setAddError(localeConfig.admin.common.walkInContactUnknown); }
    finally { addInFlight.current = false; setAddingSaving(false); }
  };

  // Cargar citas para consultar coincidencias candidatas, sin inferir vínculos.
  React.useEffect(() => {
    if (TOUR_CONFIG.isDemoMode) { setAppointments(DEMO_APPOINTMENTS); return; }
    if (!canManage) { setAppointments([]); return; }
    let active = true;
    dbService.getAppointments().then(rows => { if (active) setAppointments(rows); }).catch(() => toast.error(localeConfig.admin.common.toastAppointmentError));
    return () => { active = false; };
  }, [canManage, scopeVersion]);

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
    return selectCustomerAppointmentCandidates(appointments, selected, customers)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [selected, appointments, customers]);

  const handleSaveNotes = async () => {
    if (!selected) return;
    setSavingNotes(true);
    try {
      const next = TOUR_CONFIG.isDemoMode ? { ...selected, notes } : await customerService.updateCustomer(selected, { notes }, crypto.randomUUID());
      setSelected(next); setCustomers(prev => prev.map(c => c.id === next.id ? next : c));
      toast.success(localeConfig.admin.pipeline.saved);
    } catch (err) {
      console.error(err);
      toast.error(localeConfig.admin.pipeline.saveFailed);
    } finally {
      setSavingNotes(false);
    }
  };

  const sourceLabel = (s?: Customer["source"]) => {
    return contactText(localeConfig.lang, (['manual','walkin','web','booking','import','whatsapp','instagram','google','referral'].includes(s ?? '') ? s : 'none') as 'manual');
  };

  const handleExportCsv = async () => {
    if (!TOUR_CONFIG.isDemoMode) {
      try { const csv = await customerService.export({ search, archived: archiveFilter }); downloadBlob(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }), 'customers.csv'); }
      catch { toast.error(localeConfig.admin.pipeline.saveFailed); }
      return;
    }
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
    if (addInFlight.current || addUncertain || !addForm.fullName.trim() || !(TOUR_CONFIG.isDemoMode || capabilities?.create)) return;
    if (!confirmedAdd.current && addForm.serviceId && canManage) {
      if (!attendanceConfirmed) { setAddError(localeConfig.admin.common.attendanceRequired); return; }
      if (!isCompletedTimeValid(addForm.date, addForm.time)) { setAddError(localeConfig.admin.common.attendanceTimeInvalid); return; }
    }
    addInFlight.current = true;
    setAddingSaving(true);
    setAddError(null);
    try {
      if (!confirmedAdd.current) {
        const email = addForm.email.trim();
        contactOperation.current ??= crypto.randomUUID();
        const prepared = await customerService.prepareCreate({
          operationId: contactOperation.current, scope: capabilities?.scope,
          fullName: addForm.fullName.trim(),
          email,
          phone: addForm.phone.trim(),
          source: addForm.isExternal ? "import" : "manual",
          // El contacto no acredita una atención por seleccionar un servicio.
        });

        setCreatePending(prepared);
        const outcome = await customerService.client.retry(prepared);
        if (outcome.state !== 'accepted' || !outcome.result) throw new CustomerOperationError(outcome);
        setCreatePending(null);
        confirmedAdd.current = { id: outcome.result.key, appointmentFailed: false };
      }

        // Atención declarada realizada; no es una nueva reserva.
        if (!confirmedAdd.current.appointmentId && !confirmedAdd.current.appointmentFailed && addForm.serviceId && canManage && !TOUR_CONFIG.isDemoMode) {
          const svc = SERVICES.find(s => s.id === addForm.serviceId);
          const apptStaffId = addForm.staffId || (STAFF[0]?.id ?? "");
          try {
            confirmedAdd.current.appointmentId = await dbService.createAppointment({
              customerName: addForm.fullName.trim(),
              customerEmail: addForm.email.trim(),
              customerPhone: addForm.phone.trim(),
              serviceId: addForm.serviceId,
              staffId: apptStaffId,
              date: addForm.date,
              time: addForm.time,
              duration: svc?.duration ?? 30,
              status: "completed",
              type: addForm.appointmentType,
            });
            if (!confirmedAdd.current.appointmentId) throw new Error("Cita sin confirmación");
          } catch (apptErr) {
            const rejected = apptErr instanceof Error && apptErr.name === "SlotConflictError";
            if (!rejected) {
              setAddUncertain(true);
              setAddError(localeConfig.admin.common.walkInAppointmentUnknown);
              return;
            }
            confirmedAdd.current.appointmentFailed = true;
            console.error("[CustomersTab] create walk-in appointment:", apptErr);
            toast.error(localeConfig.admin.common.toastAppointmentError ?? "Could not create the appointment record.");
          }
        }

      // Las lecturas posteriores no reclasifican ni repiten una escritura confirmada.
      if (confirmedAdd.current?.appointmentId) {
        await dbService.getAppointments().then(setAppointments).catch(() => toast.error(localeConfig.admin.common.toastAppointmentError));
      }
      // Una vez confirmado el contacto, este camino sólo repite la lectura.
      const updated = await refreshCustomers();
      const added = updated.find((c) => c.id === confirmedAdd.current?.id);
      if (added) setSelected(added);
      const appointmentFailed = confirmedAdd.current?.appointmentFailed;
      if(wantMoney&&!appointmentFailed&&confirmedAdd.current)setMoneyLinks(browserRegLinks(confirmedAdd.current.id,confirmedAdd.current.appointmentId));
      setWantMoney(false);
      confirmedAdd.current = null; contactOperation.current = null;
      setReloadPending(false);
      setAddForm({
        fullName: "", email: "", phone: "", serviceId: "",
         appointmentType: "appointment", staffId: "",
        date: format(new Date(), "yyyy-MM-dd"), time: format(new Date(), "HH:mm"),
        isExternal: false,
      });
      setShowAddForm(false);
      setAttendanceConfirmed(false);
      if (appointmentFailed) toast.error(localeConfig.admin.common.customerSavedAppointmentPending);
      else toast.success(localeConfig.admin.common.toastCustomerSaved);
    } catch (err) {
      console.error("[CustomersTab] add customer:", err);
      if (confirmedAdd.current) {
        setReloadPending(true);
        setAddError(localeConfig.admin.common.customerSavedReloadPending);
      } else {
        const rejected = err instanceof CustomerOperationError && err.intent.state === "rejected" || err && typeof err === "object" && "status" in err && Number(err.status) >= 400 && Number(err.status) < 500;
        if (rejected) contactOperation.current = null;
        if (rejected) setAddError(localeConfig.admin.common.toastCustomerError);
        else { if (err instanceof CustomerOperationError) setCreatePending(err.intent); setAddUncertain(true); setAddError(localeConfig.admin.common.walkInContactUnknown); }
      }
    } finally {
      addInFlight.current = false;
      setAddingSaving(false);
    }
  };

  const handleCustomerUpdated = React.useCallback((next: Customer) => {
    setCustomers((prev) => prev.map((c) => (c.id === next.id ? next : c)).filter(c => archiveFilter === 'all' || !!c.core?.archived === (archiveFilter === 'archived')));
    setSelected((prev) => (prev && prev.id === next.id ? next : prev));
  }, [archiveFilter]);

  const handleStageChanged = React.useCallback((id: string, stage: CustomerStage) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, stage } : c)));
  }, []);

  if (!TOUR_CONFIG.isDemoMode && !capabilities && !loading) return <CustomerLoadNotice error={customerLoadError} loading={loading} hasData={false} onRetry={refreshCustomers} />;
  if (loading && customers.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-light border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {moneyLinks&&<div className="rounded border border-border p-4"><RegOperationPanel language={localeConfig.lang} links={moneyLinks}/><button type="button" onClick={()=>setMoneyLinks(null)}>{regText(localeConfig.lang,'cancel')}</button></div>}
      <CustomerLoadNotice error={customerLoadError && !reloadPending} loading={loading} hasData={customers.length > 0} onRetry={refreshCustomers} />
      <label>{contactText(localeConfig.lang, 'archiveFilter')}<select value={archiveFilter} onChange={event => { setSelected(null); setArchiveFilter(event.target.value as 'active' | 'archived' | 'all'); }} className="rounded border border-border bg-card p-2">
        <option value="active">{contactText(localeConfig.lang, 'activeContacts')}</option><option value="archived">{contactText(localeConfig.lang, 'archivedContacts')}</option><option value="all">{contactText(localeConfig.lang, 'allContacts')}</option>
      </select></label>
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
        <fieldset disabled={customerLoadError || loading} aria-busy={loading}>
        <CustomersKanban key={scopeVersion}
          customers={customers}
          appointments={appointments}
          onCustomerUpdated={handleCustomerUpdated}
          onStageChanged={handleStageChanged}
        />
        </fieldset>
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
            disabled={filtered.length === 0 || customerLoadError || loading}
            title={localeConfig.admin.overview.exportCsv}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground transition-colors hover:border-accent-light/40 hover:text-accent-light disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={15} />
          </button>
          <button
            disabled={addingSaving || !(TOUR_CONFIG.isDemoMode || capabilities?.create)}
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
            <fieldset disabled={addingSaving || reloadPending || addUncertain} className="space-y-3">
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

            {canManage && <>
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

            {addForm.serviceId && <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={attendanceConfirmed} onChange={(e) => setAttendanceConfirmed(e.target.checked)} />
              {localeConfig.admin.common.attendanceConfirmed}
            </label>}
            {onOpenCalendar && <button type="button" onClick={onOpenCalendar} className="text-xs underline">{localeConfig.admin.common.attendanceReservation}</button>}

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

            <label className="flex items-center gap-2"><input type="checkbox" checked={wantMoney} onChange={e=>setWantMoney(e.target.checked)}/>{regText(localeConfig.lang,'create')} · {regText(localeConfig.lang,'declaration')}</label>

            </>}
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

            </fieldset>
            {addError && <div role="alert"><p>{addError}</p>{reloadPending && customers.length > 0 && <p>{localeConfig.admin.common.customerDataStale}</p>}</div>}
            {createPending && <div className="flex gap-2"><button type="button" disabled={addingSaving} onClick={() => void recoverCreate(false)}>{contactText(localeConfig.lang, 'recover')}</button><button type="button" disabled={addingSaving} onClick={() => void recoverCreate(true)}>{contactText(localeConfig.lang, 'retry')}</button></div>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddCustomer}
                disabled={addingSaving || addUncertain || !addForm.fullName.trim() || !(TOUR_CONFIG.isDemoMode || capabilities?.create)}
                className="flex-1 rounded-xl bg-accent-light px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-950 transition-all hover:bg-accent-light/80 disabled:opacity-40 active:scale-95"
              >
                {addingSaving ? t.saving : addUncertain ? localeConfig.admin.common.walkInReviewRequired : reloadPending ? localeConfig.admin.common.retry : t.addCustomerSave}
              </button>
              <button
                type="button"
                disabled={addingSaving || addUncertain}
                onClick={() => { setAttendanceConfirmed(false); confirmedAdd.current = null; contactOperation.current = null; setCreatePending(null); setReloadPending(false); setAddError(null); setShowAddForm(false); setAddForm({ fullName: "", email: "", phone: "", serviceId: "",  appointmentType: "appointment", staffId: "", date: format(new Date(), "yyyy-MM-dd"), time: format(new Date(), "HH:mm"), isExternal: false }); }}
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
          ) : customerLoadError && filtered.length === 0 ? null : filtered.length === 0 ? (
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
                      {String(selected.amountPaidCents)} · {regText(localeConfig.lang, "unlinked")}
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

            <button type="button" disabled={addUncertain||addingSaving} onClick={()=>setMoneyLinks(browserRegLinks(selected.id))}>{regText(localeConfig.lang, 'create')}</button>
            {selected.core ? <CoreContacts key={selected.id + selected.core.scope.epoch} customer={selected} onCustomerUpdated={handleCustomerUpdated} /> : <>
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

            </>}

            {/* Booking history */}
            <div className="overflow-hidden rounded-3xl border border-border bg-card/95 shadow-elevated">
              <div className="flex items-center gap-2 border-b border-border px-8 py-5">
                <Calendar size={14} className="text-accent-light" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{t.historyCandidates}</h3>
              </div>
              <p className="px-8 py-4 text-xs text-muted-foreground">{t.historyUnverified}</p>
              {customerHistory.length === 0 ? (
                <div className="px-8 py-12 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{t.historyNoCandidates}</p>
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
