import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Scissors,
  CalendarDays,
  Users,
  Briefcase,
  X,
  Clock,
  CheckCircle,
  Ban,
  Mail,
  Phone,
  CreditCard,
  AlertCircle,
  Tag,
  RefreshCw,
  Bell,
  SlidersHorizontal,
  BarChart3,
  HeadphonesIcon,
  Menu,
  UserPlus,
  ChevronDown,
  DollarSign,
  ShoppingBag,
  Banknote,
  LayoutGrid,
  List,
  Package,
} from "lucide-react";
import { Appointment, AppointmentStatus, StaffMember, Customer, ContactInboxItem } from "../../types";
import { format, startOfDay } from "date-fns";
import { cn } from "../../lib/utils";
import { dbService } from "../../services/db";
import { siteConfig } from "../../config/site";
import { localeConfig } from "../../config/locale";
import { TOUR_CONFIG } from "../../config/tour.config";
import { DEMO_APPOINTMENTS, DEMO_CUSTOMERS, DEMO_INBOX } from "../../config/demo-data";
import { setCrmSnapshot } from "../../lib/crm-store";

import { StaffLogistics } from "./StaffLogistics";
import { CustomersTab } from "./CustomersTab";
import { InboxTab } from "./InboxTab";
import { NotificationLogsTab } from "./NotificationLogsTab";
import { BusinessRulesTab } from "./BusinessRulesTab";
import { DashboardTab } from "./DashboardTab";
import { SupportTab } from "./SupportTab";
import { StockTab } from "./StockTab";
import { PaymentsTab } from "./PaymentsTab";
import { AppointmentCalendar } from "./AppointmentCalendar";
import { ThemeToggle } from "../theme/ThemeToggle";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";
import { Calendar } from "../ui/calendar";

export function AdminDashboard({ onExit }: { onExit: () => void }) {
  const { services: SERVICES, brand } = siteConfig;
  const t = localeConfig.admin.dashboard;
  const isSolo = siteConfig.features.showAbout && !siteConfig.features.showTeam;

  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [staffList, setStaffList] = React.useState<StaffMember[]>(siteConfig.staff);
  const [filterDate, setFilterDate] = React.useState(new Date());
  const [filterStaff, setFilterStaff] = React.useState<string>("all");
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [showWalkIn, setShowWalkIn] = React.useState(false);
  const [crmCustomers, setCrmCustomers] = React.useState<Customer[]>([]);
  const [crmInbox, setCrmInbox] = React.useState<ContactInboxItem[]>([]);
  const [walkInForm, setWalkInForm] = React.useState({ name: "", phone: "", serviceId: "", staffId: "" });
  const [walkInSaving, setWalkInSaving] = React.useState(false);
  const [appointmentView, setAppointmentView] = React.useState<"list" | "calendar">("list");

  const handleWalkIn = async () => {
    if (!walkInForm.name.trim() || !walkInForm.phone.trim()) return;
    setWalkInSaving(true);
    try {
      const { dbService: db } = await import("../../services/db");
      const { customerService } = await import("../../services/customers");
      const email = `walkin_${Date.now()}@noemail.local`;
      const svc = SERVICES.find((s) => s.id === walkInForm.serviceId);
      const now = new Date();
      await customerService.upsertByEmail({
        fullName: walkInForm.name.trim(),
        email,
        phone: walkInForm.phone.trim(),
        source: "manual",
        ...(walkInForm.serviceId ? { lastServiceId: walkInForm.serviceId } : {}),
      });
      await db.createAppointment({
        customerName: walkInForm.name.trim(),
        customerEmail: email,
        customerPhone: walkInForm.phone.trim(),
        serviceId: walkInForm.serviceId || (SERVICES[0]?.id ?? ""),
        staffId: walkInForm.staffId || (staffList[0]?.id ?? ""),
        date: format(now, "yyyy-MM-dd"),
        time: format(now, "HH:mm"),
        duration: svc?.duration ?? 30,
        status: "completed",
        type: "appointment",
      });
      setWalkInForm({ name: "", phone: "", serviceId: "", staffId: "" });
      setShowWalkIn(false);
    } catch (err) {
      console.error("[WalkIn]", err);
    } finally {
      setWalkInSaving(false);
    }
  };

  // Subscription error state
  const [subscriptionError, setSubscriptionError] = React.useState<string | null>(null);

  type AdminTab = "missions" | "personnel" | "customers" | "inbox" | "logs" | "rules" | "overview" | "support" | "payments" | "stock";
  const [activeTab, setActiveTab] = React.useState<AdminTab>("missions");

  React.useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent).detail as AdminTab;
      setActiveTab(tab);
    };
    window.addEventListener("tour:setAdminTab", handler);
    return () => window.removeEventListener("tour:setAdminTab", handler);
  }, []);

  React.useEffect(() => {
    if (TOUR_CONFIG.isDemoMode) {
      setAppointments(DEMO_APPOINTMENTS);
      setCrmCustomers(DEMO_CUSTOMERS as Customer[]);
      setCrmInbox(DEMO_INBOX as ContactInboxItem[]);
      return;
    }

    let appUnsubscribe: (() => void) | undefined;

    dbService.getStaff().then(setStaffList);

    try {
      appUnsubscribe = dbService.subscribeToAppointments(
        (data) => {
          setAppointments(data);
          setSubscriptionError(null);
        },
        (msg) => setSubscriptionError(msg),
      );
    } catch (err: unknown) {
      console.error("Subscription failed:", err);
      setSubscriptionError(err instanceof Error ? err.message : localeConfig.admin.common.connectionFailed);
    }

    // Subscribe to customers (async import, fire-and-forget)
    import("../../services/customers").then(({ customerService }) => {
      customerService.listCustomers().then(setCrmCustomers).catch(() => {});
    });

    // Subscribe to inbox (with race-safe cancellation)
    let inboxUnsub: (() => void) | undefined;
    let cancelled = false;
    import("../../services/inbox").then(({ inboxService }) => {
      if (cancelled) return;
      inboxUnsub = inboxService.subscribe((msgs) => setCrmInbox(msgs));
    });

    return () => {
      cancelled = true;
      if (appUnsubscribe) appUnsubscribe();
      if (inboxUnsub) inboxUnsub();
    };
  }, []);

  const filteredAppointments = React.useMemo(() => {
    return appointments.filter((app) => {
      const dateMatch = app.date === format(filterDate, "yyyy-MM-dd");
      const staffMatch = filterStaff === "all" || app.staffId === filterStaff;
      return dateMatch && staffMatch;
    });
  }, [filterDate, filterStaff, appointments]);

  const stats = React.useMemo(() => {
    const today = appointments.filter((a) => a.date === format(new Date(), "yyyy-MM-dd"));
    const confirmed = today.filter((a) => a.status === "confirmed");
    const revenue = confirmed.reduce((acc, curr) => {
      const s = SERVICES.find((sv) => sv.id === curr.serviceId);
      return acc + (s?.price || 0);
    }, 0);
    return { count: today.length, confirmed: confirmed.length, revenue };
  }, [appointments]);

  // Keep CRM store in sync so the admin chatbot has live data
  React.useEffect(() => {
    const confirmed = appointments.filter((a) => a.status === "confirmed");
    const cancelled = appointments.filter((a) => a.status === "cancelled");
    const pending = appointments.filter((a) => a.status === "pending");
    const completed = appointments.filter((a) => a.status === "completed");
    const totalRevenue = [...confirmed, ...completed].reduce((acc, curr) => {
      const s = SERVICES.find((sv) => sv.id === curr.serviceId);
      return acc + (s?.price || 0);
    }, 0);

    // Gross revenue = sum of actual payments collected
    const grossRevenue = appointments.reduce((acc, a) => acc + (a.amountPaidCents ?? 0), 0) / 100;

    // Type breakdown
    const paidAppointments = appointments.filter((a) => (a.type ?? "appointment") === "appointment" && a.status !== "cancelled").length;
    const freeConsultations = appointments.filter((a) => a.type === "consultation" && a.status !== "cancelled").length;
    const meetings = appointments.filter((a) => a.type === "meeting" && a.status !== "cancelled").length;

    // Last 20 appointments as summaries (backwards compat)
    const recent = appointments
      .slice(-20)
      .map((a) => ({
        id: a.id,
        date: a.date,
        time: a.time,
        duration: a.duration ?? 30,
        client: a.customerName || "Unknown",
        phone: a.customerPhone,
        service: SERVICES.find((s) => s.id === a.serviceId)?.name || a.serviceId,
        serviceId: a.serviceId,
        staff: staffList.find((s) => s.id === a.staffId)?.name || a.staffId,
        staffId: a.staffId,
        status: a.status,
        type: a.type ?? "appointment",
        amountPaidCents: a.amountPaidCents,
        paymentStatus: a.paymentStatus,
      }));

    // Build all appointments as full summaries
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const nowStr = format(new Date(), "HH:mm");
    const allAppointments = appointments.map((a) => ({
      id: a.id,
      date: a.date,
      time: a.time,
      duration: a.duration ?? 30,
      client: a.customerName || "Unknown",
      phone: a.customerPhone,
      service: SERVICES.find((s) => s.id === a.serviceId)?.name ?? a.serviceId,
      serviceId: a.serviceId,
      staff: staffList.find((s) => s.id === a.staffId)?.name ?? a.staffId,
      staffId: a.staffId,
      status: a.status,
      type: a.type ?? "appointment",
      amountPaidCents: a.amountPaidCents,
      paymentStatus: a.paymentStatus,
    }));

    const todayAppointments = allAppointments.filter((a) => a.date === todayStr);
    const upcomingAppointments = allAppointments
      .filter((a) => a.date > todayStr || (a.date === todayStr && a.time >= nowStr))
      .filter((a) => a.status !== "cancelled")
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
      .slice(0, 50);

    // Per-staff availability and performance
    const staffAvailability = staffList.map((st) => {
      const staffAppts = appointments.filter((a) => a.staffId === st.id && a.status !== "cancelled");
      const bookedSlots = staffAppts.map((a) => `${a.date} ${a.time}`);
      const estimatedRevenue = staffAppts.reduce((acc, a) => {
        const svc = SERVICES.find((s) => s.id === a.serviceId);
        return acc + (a.amountPaidCents != null ? a.amountPaidCents / 100 : (svc?.price ?? 0));
      }, 0);
      return { staffId: st.id, staffName: st.name, bookedSlots, totalAppointments: staffAppts.length, estimatedRevenue };
    });

    // Top services by bookings
    const svcCount: Record<string, { count: number; revenue: number }> = {};
    for (const a of appointments.filter((a) => a.status !== "cancelled")) {
      const svc = SERVICES.find((s) => s.id === a.serviceId);
      const name = svc?.name ?? a.serviceId;
      if (!svcCount[name]) svcCount[name] = { count: 0, revenue: 0 };
      svcCount[name].count++;
      svcCount[name].revenue += a.amountPaidCents != null ? a.amountPaidCents / 100 : (svc?.price ?? 0);
    }
    const topServices = Object.entries(svcCount)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Busiest days of the week
    const dayCount: Record<string, number> = {};
    for (const a of appointments.filter((a) => a.status !== "cancelled")) {
      try {
        const d = new Date(a.date).toLocaleDateString("en-US", { weekday: "long" });
        dayCount[d] = (dayCount[d] ?? 0) + 1;
      } catch { /* skip */ }
    }
    const busiestDays = Object.entries(dayCount)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => b.count - a.count);

    // Customers summary
    const customersSummary = crmCustomers.map((c) => ({
      id: c.id,
      name: c.fullName,
      phone: c.phone,
      email: c.email,
      visitCount: c.visitCount ?? 0,
      lastVisitAt: c.lastVisitAt ? format(c.lastVisitAt, "yyyy-MM-dd") : undefined,
      source: c.source,
      notes: c.notes,
    }));

    // Inbox summary
    const inboxSummary = crmInbox.slice(0, 30).map((m) => ({
      id: m.id,
      name: m.name,
      subject: m.subject,
      message: m.message.slice(0, 200),
      status: m.status,
      createdAt: format(m.createdAt, "yyyy-MM-dd HH:mm"),
    }));

    setCrmSnapshot({
      totalBookings: appointments.length,
      confirmed: confirmed.length,
      cancelled: cancelled.length,
      pending: pending.length,
      completed: completed.length,
      estimatedRevenue: totalRevenue,
      grossRevenue,
      paidAppointments,
      freeConsultations,
      meetings,
      newCustomers: 0,
      totalCustomers: crmCustomers.length,
      dateLabel: "All loaded appointments",
      updatedAt: new Date().toISOString(),
      allAppointments,
      recentAppointments: recent,
      todayAppointments,
      upcomingAppointments,
      customers: customersSummary,
      inboxMessages: inboxSummary,
      staffAvailability,
      topServices,
      busiestDays,
    });
  }, [appointments, staffList, SERVICES, crmCustomers, crmInbox]);

  const handleStatusChange = async (id: string, status: AppointmentStatus) => {
    try {
      await dbService.updateAppointment(id, { status });
    } catch (err) {
      console.error(err);
    }
  };

  /* ── Sidebar helpers ── */
  const tabLabels: Record<AdminTab, string> = {
    missions: t.tabs.appointments,
    personnel: t.tabs.staff,
    customers: t.tabs.customers,
    inbox: t.tabs.inbox,
    logs: t.tabs.notificationLogs,
    rules: t.tabs.businessRules,
    overview: t.tabs.overview,
    support: t.tabs.support,
    payments: localeConfig.admin.payments?.title ?? "Payments",
    stock: localeConfig.admin.stock?.title ?? "Inventario",
  };

  const navBtn = (key: AdminTab, Icon: typeof CalendarDays, label: string) => (
    <button
      key={key}
      onClick={() => {
        setActiveTab(key);
        setIsSidebarOpen(false);
      }}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all",
        activeTab === key
          ? "bg-accent-light/10 text-accent-light"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );

  return (
    <div id="admin-content" className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* ── Mobile sidebar overlay ── */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex w-64 flex-col border-e border-border bg-card/95 backdrop-blur-md transition-transform duration-300",
          "lg:translate-x-0 lg:rtl:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full",
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-light shadow-lg shadow-accent-light/20">
            <Scissors className="text-zinc-950" size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black tracking-tight text-foreground">{brand.name}</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{t.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground lg:hidden"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          <div>
            <p className="mb-2 px-3 text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">
              {localeConfig.admin.sidebarGroups.main}
            </p>
            <div className="space-y-1">
              {navBtn("overview", BarChart3, t.tabs.overview)}
              {navBtn("missions", CalendarDays, t.tabs.appointments)}
              {navBtn("payments", Banknote, localeConfig.admin.payments?.title ?? "Payments")}
            </div>
          </div>

          <div>
            <p className="mb-2 px-3 text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">
              {localeConfig.admin.sidebarGroups.manage}
            </p>
            <div className="space-y-1">
              {navBtn("customers", Users, t.tabs.customers)}
              {!isSolo && navBtn("personnel", Scissors, t.tabs.staff)}
              {siteConfig.features.showStock !== false && navBtn("stock", Package, localeConfig.admin.stock?.title ?? "Inventario")}
            </div>
          </div>

          <div>
            <p className="mb-2 px-3 text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">
              {localeConfig.admin.sidebarGroups.comms}
            </p>
            <div className="space-y-1">
              {navBtn("inbox", Mail, t.tabs.inbox)}
              {navBtn("logs", Bell, t.tabs.notificationLogs)}
            </div>
          </div>

          <div>
            <p className="mb-2 px-3 text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">
              {localeConfig.admin.sidebarGroups.system}
            </p>
            <div className="space-y-1">
              {navBtn("rules", SlidersHorizontal, t.tabs.businessRules)}
              {navBtn("support", HeadphonesIcon, t.tabs.support)}
            </div>
          </div>
        </nav>

        {/* Bottom section */}
        <div className="space-y-3 border-t border-border px-4 py-4">
          <div className="flex items-center gap-2 px-2">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{t.liveSync}</span>
          </div>
          <div className="flex items-center gap-3 px-2">
            <LanguageSwitcher variant="dark" />
            <ThemeToggle />
          </div>
          <button
            type="button"
            onClick={onExit}
            className="w-full rounded-xl border border-border px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-all hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-500"
          >
            {t.signOut}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 lg:ms-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm lg:hidden">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-sm font-black tracking-tight text-foreground">
            {brand.name} <span className="text-accent-light">{t.title}</span>
          </h1>
          <div className="ms-auto flex items-center gap-2">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          </div>
        </header>

        {/* Desktop header */}
        <header className="hidden items-center justify-between border-b border-border px-8 py-5 lg:flex">
          <h2 className="text-xl font-black uppercase tracking-tight text-foreground">{tabLabels[activeTab]}</h2>
        </header>

        {/* Subscription error banner */}
        {subscriptionError && (
          <div className="flex items-center justify-between border-b border-red-500/20 bg-red-500/5 px-6 py-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-red-500" />
              <p className="text-xs font-bold text-red-500">{subscriptionError}</p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 rounded-lg border border-red-500/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-500 transition-colors hover:bg-red-500/10"
            >
              <RefreshCw size={12} />
              {localeConfig.admin.common.refresh}
            </button>
          </div>
        )}

        {/* ── Tab content ── */}
        <div className="p-4 sm:p-6 lg:p-8">
          {activeTab === "missions" ? (
            <>
              {/* ── Stats strip — large, readable at a glance ── */}
              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card/90 px-4 py-4 sm:px-5">
                  <p className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">{stats.count}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t.stats.today}</p>
                </div>
                <div className="flex flex-col gap-1 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-4 sm:px-5">
                  <p className="text-2xl font-black tracking-tight text-emerald-500 sm:text-3xl">{stats.confirmed}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/60">{t.stats.confirmed}</p>
                </div>
                <div className="flex flex-col gap-1 rounded-2xl border border-accent-light/20 bg-accent-light/[0.04] px-4 py-4 sm:px-5">
                  <p className="text-2xl font-black tracking-tight text-accent-light sm:text-3xl">{stats.count - stats.confirmed}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-accent-light/60">{t.stats.pending}</p>
                </div>
                <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card/90 px-4 py-4 sm:px-5">
                  <p className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">${stats.revenue}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t.stats.revenue}</p>
                </div>
              </div>

              {/* ── Walk-in rápido ── */}
              <AnimatePresence>
                {showWalkIn && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                    className="mb-6 overflow-hidden"
                  >
                    <div className="rounded-2xl border border-accent-light/30 bg-accent-light/5 p-4 sm:p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserPlus size={15} className="text-accent-light" />
                          <p className="text-[11px] font-black uppercase tracking-widest text-accent-light">{t.walkIn.label}</p>
                        </div>
                        <button type="button" onClick={() => setShowWalkIn(false)} className="rounded-lg p-1 text-muted-foreground hover:text-foreground transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <input
                          type="text"
                          placeholder={t.walkIn.name}
                          value={walkInForm.name}
                          onChange={(e) => setWalkInForm((f) => ({ ...f, name: e.target.value }))}
                          autoFocus
                          className="h-12 rounded-xl border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/40"
                        />
                        <input
                          type="tel"
                          placeholder={t.walkIn.phone}
                          value={walkInForm.phone}
                          onChange={(e) => setWalkInForm((f) => ({ ...f, phone: e.target.value }))}
                          className="h-12 rounded-xl border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/40"
                        />
                        <select
                          value={walkInForm.serviceId}
                          onChange={(e) => setWalkInForm((f) => ({ ...f, serviceId: e.target.value }))}
                          className="h-12 rounded-xl border border-border bg-card px-4 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/40"
                        >
                          <option value="">{t.walkIn.service}</option>
                          {SERVICES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        {!isSolo && (
                          <select
                            value={walkInForm.staffId}
                            onChange={(e) => setWalkInForm((f) => ({ ...f, staffId: e.target.value }))}
                            className="h-12 rounded-xl border border-border bg-card px-4 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/40"
                          >
                            <option value="">{t.walkIn.staff}</option>
                            {staffList.map((s) => <option key={s.id} value={s.id}>{s.name.split("'")[0]}</option>)}
                          </select>
                        )}
                      </div>
                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => { setShowWalkIn(false); setWalkInForm({ name: "", phone: "", serviceId: "", staffId: "" }); }}
                          className="h-11 rounded-xl border border-border bg-muted/60 px-5 text-[11px] font-black uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {t.walkIn.cancel}
                        </button>
                        <button
                          type="button"
                          onClick={handleWalkIn}
                          disabled={walkInSaving || !walkInForm.name.trim() || !walkInForm.phone.trim()}
                          className="h-11 rounded-xl bg-accent-light px-6 text-[11px] font-black uppercase tracking-widest text-zinc-950 transition-all hover:bg-accent-light/80 disabled:opacity-40 active:scale-[0.97]"
                        >
                          {walkInSaving ? t.walkIn.saving : t.walkIn.register}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── View toggle: list / calendar ── */}
              <div className="mb-6 flex items-center gap-1 self-end rounded-xl border border-border bg-card p-1 w-fit ms-auto">
                <button
                  type="button"
                  onClick={() => setAppointmentView("list")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all",
                    appointmentView === "list"
                      ? "bg-accent-light text-zinc-950 shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <List size={13} />
                  {(t as any).calendarView?.listView ?? "List"}
                </button>
                <button
                  type="button"
                  onClick={() => setAppointmentView("calendar")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all",
                    appointmentView === "calendar"
                      ? "bg-accent-light text-zinc-950 shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <LayoutGrid size={13} />
                  {(t as any).calendarView?.calendarLabel ?? "Calendar"}
                </button>
              </div>

              {appointmentView === "calendar" ? (
                <AppointmentCalendar
                  appointments={appointments}
                  staff={staffList}
                  services={SERVICES}
                  filterStaff={filterStaff}
                  onStatusChange={handleStatusChange}
                />
              ) : (
              <div className="flex flex-col gap-6 lg:flex-row">
                {/* ── Filter sidebar ── */}
                <aside className="space-y-4 lg:w-72 xl:w-80 shrink-0">
                  <div className="glass-panel space-y-5 rounded-3xl p-5 shadow-elevated">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <CalendarDays size={13} className="text-accent-light" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{t.filters.dateFilter}</h3>
                      </div>
                      <Calendar
                        selected={filterDate}
                        onSelect={(d) => setFilterDate(startOfDay(d))}
                        className="max-w-full border-border bg-card shadow-elevated"
                      />
                    </div>

                    {!isSolo && (
                      <>
                        <div className="h-px bg-border" />
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Users size={13} className="text-accent-light" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{t.filters.staffFilter}</h3>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setFilterStaff("all")}
                              className={cn(
                                "rounded-xl border px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all",
                                filterStaff === "all"
                                  ? "border-accent-light bg-accent-light text-zinc-950"
                                  : "border-border bg-muted/60 text-muted-foreground hover:border-accent-light/30 hover:text-foreground",
                              )}
                            >
                              {t.filters.allStaff}
                            </button>
                            {staffList.map((b) => (
                              <button
                                key={b.id}
                                onClick={() => setFilterStaff(b.id)}
                                className={cn(
                                  "rounded-xl border px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all",
                                  filterStaff === b.id
                                    ? "border-accent-light bg-accent-light text-zinc-950"
                                    : "border-border bg-muted/60 text-muted-foreground hover:border-accent-light/30 hover:text-foreground",
                                )}
                              >
                                {b.name.split("'")[0]}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="space-y-2 rounded-2xl border border-dashed border-border p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                      <p className="text-[10px] font-bold uppercase text-emerald-500/80">{t.allOperational}</p>
                    </div>
                  </div>
                </aside>

                {/* ── Appointments list ── */}
                <main className="min-w-0 flex-1 space-y-4">
                  {/* Header row with walk-in CTA */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black uppercase tracking-tight text-foreground">{t.table.title}</h3>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        <CalendarDays size={11} className="text-accent-light" />
                        {format(filterDate, "EEEE, MMMM do")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowWalkIn((v) => !v)}
                      className={cn(
                        "flex h-11 items-center gap-2 rounded-xl border px-4 text-[11px] font-black uppercase tracking-widest transition-all active:scale-[0.97]",
                        showWalkIn
                          ? "border-accent-light/40 bg-accent-light/10 text-accent-light"
                          : "border-border bg-card text-muted-foreground hover:border-accent-light/40 hover:text-accent-light",
                      )}
                    >
                      <UserPlus size={14} />
                      <span className="hidden sm:inline">{t.walkIn.label}</span>
                    </button>
                  </div>

                  {/* ── Mobile: agenda cards ── */}
                  <div className="lg:hidden space-y-3">
                    {filteredAppointments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border py-16">
                        <CalendarDays size={28} className="text-muted-foreground/20" />
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">{t.table.empty}</p>
                      </div>
                    ) : (
                      filteredAppointments.map((app) => {
                        const staffMember = staffList.find((b) => b.id === app.staffId);
                        const service = SERVICES.find((s) => s.id === app.serviceId);
                        const isExpanded = expandedId === app.id;
                        const statusDot = app.status === "confirmed" ? "bg-emerald-500" : app.status === "pending" ? "animate-pulse bg-accent-light" : app.status === "cancelled" ? "bg-red-500" : "bg-primary";

                        return (
                          <div
                            key={app.id}
                            className={cn(
                              "overflow-hidden rounded-2xl border bg-card/95 transition-colors",
                              isExpanded ? "border-accent-light/30" : "border-border",
                            )}
                          >
                            {/* Card top row — always visible */}
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : app.id)}
                              className="flex w-full items-center gap-4 px-4 py-4 text-start"
                            >
                              {/* Time */}
                              <div className="flex shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-border bg-muted/60 px-3 py-2.5 min-w-[52px]">
                                <span className={cn("h-1.5 w-1.5 rounded-full", statusDot)} />
                                <span className="font-mono text-sm font-black text-foreground">{app.time}</span>
                              </div>
                              {/* Info */}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-black text-foreground">{app.customerName}</p>
                                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                  <span className="text-[10px] font-bold text-muted-foreground">{service?.name ?? "—"}</span>
                                  {!isSolo && staffMember && (
                                    <span className="text-[10px] text-muted-foreground/50">· {staffMember.name.split("'")[0]}</span>
                                  )}
                                </div>
                              </div>
                              {/* Source + Payment badges */}
                              <div className="flex shrink-0 flex-col items-end gap-1">
                                {app.customerEmail?.startsWith("walkin_") && (
                                  <span className="rounded-md border border-accent-light/20 bg-accent-light/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-accent-light">
                                    {t.walkIn.label}
                                  </span>
                                )}
                                <span className={cn(
                                  "rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-wide",
                                  app.paymentStatus === "paid" || app.paymentStatus === "deposit_paid"
                                    ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                                    : "border-border bg-muted/40 text-muted-foreground",
                                )}>
                                  {app.paymentStatus === "paid" ? t.walkIn.paid : app.paymentStatus === "deposit_paid" ? t.walkIn.deposit : t.walkIn.unpaid}
                                </span>
                              </div>
                              <ChevronDown size={14} className={cn("shrink-0 text-muted-foreground/40 transition-transform", isExpanded && "rotate-180")} />
                            </button>

                            {/* Action buttons — big, always accessible */}
                            <div className="flex gap-2 border-t border-border px-4 py-3">
                              <button
                                type="button"
                                onClick={() => handleStatusChange(app.id, "confirmed")}
                                disabled={app.status === "confirmed"}
                                className={cn(
                                  "flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-[11px] font-black uppercase tracking-widest transition-all active:scale-[0.97]",
                                  app.status === "confirmed"
                                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "border-border bg-muted/60 text-muted-foreground hover:border-emerald-500/30 hover:text-emerald-500",
                                )}
                              >
                                <CheckCircle size={14} />
                                {t.table.confirmTitle}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(app.id, "cancelled")}
                                disabled={app.status === "cancelled"}
                                className={cn(
                                  "flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-[11px] font-black uppercase tracking-widest transition-all active:scale-[0.97]",
                                  app.status === "cancelled"
                                    ? "border-red-500/20 bg-red-500/10 text-red-500"
                                    : "border-border bg-muted/60 text-muted-foreground hover:border-red-500/30 hover:text-red-500",
                                )}
                              >
                                <Ban size={14} />
                                {t.table.cancelTitle}
                              </button>
                            </div>

                            {/* Expandable detail */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                                  className="overflow-hidden"
                                >
                                  <div className="border-t border-border bg-muted/30 px-4 py-4 space-y-2">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Phone size={12} className="text-accent-light/50" />
                                      <span>{app.customerPhone || "—"}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Mail size={12} className="text-accent-light/50" />
                                      <span className="truncate">{app.customerEmail}</span>
                                    </div>
                                    {app.amountPaidCents != null && (
                                      <div className="flex items-center gap-2 text-xs text-emerald-500">
                                        <DollarSign size={12} />
                                        <span>${(app.amountPaidCents / 100).toFixed(2)}</span>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* ── Desktop: table (unchanged) ── */}
                  <div className="hidden overflow-hidden rounded-[28px] border border-border bg-card/95 shadow-elevated backdrop-blur-md lg:block">
                    <div className="overflow-x-auto">
                      <table className="w-full border-separate border-spacing-0 text-left">
                        <thead className="bg-muted/50 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                          <tr>
                            <th className="border-b border-border px-5 py-4">{t.table.time}</th>
                            <th className="border-b border-border px-5 py-4">{t.table.client}</th>
                            <th className="border-b border-border px-5 py-4">{t.table.service}</th>
                            {!isSolo && <th className="border-b border-border px-5 py-4">{t.table.staff}</th>}
                            <th className="border-b border-border px-5 py-4 text-center">{t.table.type}</th>
                            <th className="border-b border-border px-5 py-4 text-center">{t.table.payment}</th>
                            <th className="border-b border-border px-5 py-4 text-right">{t.table.actions}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredAppointments.length > 0 ? (
                            filteredAppointments.map((app) => {
                              const staffMember = staffList.find((b) => b.id === app.staffId);
                              const service = SERVICES.find((s) => s.id === app.serviceId);
                              const isExpanded = expandedId === app.id;

                              return (
                                <React.Fragment key={app.id}>
                                  <tr
                                    onClick={() => setExpandedId(isExpanded ? null : app.id)}
                                    className={cn("group cursor-pointer transition-all hover:bg-foreground/[0.025]", isExpanded && "bg-accent-light/[0.04]")}
                                  >
                                    <td className="px-5 py-4">
                                      <div className="flex items-center gap-2 font-mono text-sm font-bold text-accent-light">
                                        <span className={cn("h-1.5 w-1.5 rounded-full", app.status === "confirmed" ? "bg-emerald-500" : app.status === "pending" ? "animate-pulse bg-accent-light" : app.status === "cancelled" ? "bg-red-500" : "bg-primary")} />
                                        {app.time}
                                      </div>
                                    </td>
                                    <td className="px-5 py-4">
                                      <div className="text-sm font-bold text-foreground">{app.customerName}</div>
                                      <div className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{app.customerPhone}</div>
                                    </td>
                                    <td className="px-5 py-4">
                                      <div className="inline-block rounded-md border border-border bg-muted/50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                        {service?.name}
                                      </div>
                                    </td>
                                    {!isSolo && (
                                      <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                          <div className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-muted text-[10px] font-black text-muted-foreground">
                                            {staffMember?.name.charAt(0)}
                                          </div>
                                          <span className="text-xs font-bold text-muted-foreground">{staffMember?.name.split("'")[0]}</span>
                                        </div>
                                      </td>
                                    )}
                                    <td className="px-5 py-4 text-center">
                                      {(() => {
                                        const aptType = app.type ?? "appointment";
                                        const typeStyles = aptType === "consultation" ? "border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400" : aptType === "meeting" ? "border-indigo-500/20 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400" : "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400";
                                        return <span className={cn("rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em]", typeStyles)}>{t.appointmentTypes[aptType]}</span>;
                                      })()}
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                      <span className={cn("rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em]", app.paymentStatus === "paid" || app.paymentStatus === "deposit_paid" ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400" : app.paymentStatus === "failed" ? "border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400" : "border-border bg-muted/50 text-muted-foreground")}>
                                        {app.paymentStatus?.replace("_", " ") || localeConfig.admin.common.unpaid}
                                      </span>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                      <div className="flex justify-end gap-1.5">
                                        <button onClick={(e) => { e.stopPropagation(); handleStatusChange(app.id, "confirmed"); }} disabled={app.status === "confirmed"} className={cn("rounded-lg border p-2.5 transition-all active:scale-95", app.status === "confirmed" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-border bg-muted/70 text-muted-foreground hover:border-emerald-500/30 hover:text-emerald-500")} title={t.table.confirmTitle}>
                                          <CheckCircle size={14} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleStatusChange(app.id, "cancelled"); }} disabled={app.status === "cancelled"} className={cn("rounded-lg border p-2.5 transition-all active:scale-95", app.status === "cancelled" ? "border-red-500/20 bg-red-500/10 text-red-500" : "border-border bg-muted/70 text-muted-foreground hover:border-red-500/30 hover:text-red-500")} title={t.table.cancelTitle}>
                                          <Ban size={14} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                  <AnimatePresence>
                                    {isExpanded && (
                                      <tr>
                                        <td colSpan={7} className="px-5 py-0">
                                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }} className="-mx-5 overflow-hidden border border-t-0 border-border bg-muted/40 px-5 py-5">
                                            <div className="grid grid-cols-3 gap-6">
                                              <div className="space-y-3">
                                                <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{t.expanded.clientDetails}</h5>
                                                <div className="space-y-2 rounded-xl border border-border bg-muted/50 p-3">
                                                  <div className="flex items-center gap-2"><Mail size={12} className="text-accent-light/50" /><span className="text-xs text-muted-foreground">{app.customerEmail}</span></div>
                                                  <div className="flex items-center gap-2"><Phone size={12} className="text-accent-light/50" /><span className="text-xs text-muted-foreground">{app.customerPhone}</span></div>
                                                </div>
                                              </div>
                                              <div className="space-y-3">
                                                <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{t.expanded.bookingDetails}</h5>
                                                <div className="space-y-1.5 rounded-xl border border-border bg-muted/50 p-3 text-[10px]">
                                                  <div className="flex justify-between"><span className="font-bold uppercase text-muted-foreground">{t.expanded.status}</span><span className="font-mono font-bold text-muted-foreground">{app.status.toUpperCase()}</span></div>
                                                  <div className="flex justify-between"><span className="font-bold uppercase text-muted-foreground">{t.expanded.type}</span><span className="font-mono font-bold text-muted-foreground">{t.appointmentTypes[app.type ?? "appointment"]}</span></div>
                                                  {app.amountPaidCents != null && <div className="flex justify-between"><span className="font-bold uppercase text-muted-foreground">{t.expanded.amountPaid}</span><span className="font-mono font-bold text-emerald-500">${(app.amountPaidCents / 100).toFixed(2)}</span></div>}
                                                </div>
                                              </div>
                                              <div className="space-y-3">
                                                <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{t.expanded.paymentSection}</h5>
                                                <div className="flex h-full flex-col justify-center rounded-xl border border-border bg-muted/50 p-3 text-center">
                                                  {app.stripeSessionId ? (
                                                    <React.Fragment>
                                                      <CreditCard className="mx-auto mb-1 text-emerald-500/40" size={20} />
                                                      <p className="text-[10px] font-black uppercase text-emerald-500/60">{t.expanded.paymentVerified}</p>
                                                    </React.Fragment>
                                                  ) : (
                                                    <React.Fragment>
                                                      <AlertCircle className="mx-auto mb-1 text-muted-foreground/40" size={20} />
                                                      <p className="text-[10px] font-black uppercase text-muted-foreground">{t.expanded.paymentPending}</p>
                                                    </React.Fragment>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </motion.div>
                                        </td>
                                      </tr>
                                    )}
                                  </AnimatePresence>
                                </React.Fragment>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={7} className="py-16 text-center">
                                <CalendarDays className="mx-auto mb-3 opacity-20" size={28} />
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">{t.table.empty}</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </main>
              </div>
              )}
            </>
          ) : activeTab === "personnel" ? (
            <StaffLogistics />
          ) : activeTab === "customers" ? (
            <CustomersTab />
          ) : activeTab === "inbox" ? (
            <InboxTab />
          ) : activeTab === "logs" ? (
            <NotificationLogsTab />
          ) : activeTab === "rules" ? (
            <BusinessRulesTab />
          ) : activeTab === "overview" ? (
            <DashboardTab appointments={appointments} services={SERVICES} staff={staffList} />
          ) : activeTab === "payments" ? (
            <PaymentsTab appointments={appointments} services={SERVICES} staff={staffList} />
          ) : activeTab === "support" ? (
            <SupportTab />
          ) : activeTab === "stock" ? (
            <StockTab />
          ) : null}
        </div>
      </div>
    </div>
  );
}

