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
  RefreshCw,
  Bell,
  SlidersHorizontal,
  BarChart3,
  HeadphonesIcon,
  Menu,
} from "lucide-react";
import { Appointment, AppointmentStatus, StaffMember } from "../../types";
import { format, startOfDay } from "date-fns";
import { cn } from "../../lib/utils";
import { dbService } from "../../services/db";
import { siteConfig } from "../../config/site";
import { localeConfig } from "../../config/locale";
import { aiService } from "../../services/ai";
import { TOUR_CONFIG } from "../../config/tour.config";
import { DEMO_APPOINTMENTS } from "../../config/demo-data";

import { StaffLogistics } from "./StaffLogistics";
import { CustomersTab } from "./CustomersTab";
import { InboxTab } from "./InboxTab";
import { NotificationLogsTab } from "./NotificationLogsTab";
import { BusinessRulesTab } from "./BusinessRulesTab";
import { DashboardTab } from "./DashboardTab";
import { SupportTab } from "./SupportTab";
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

  // AI analysis state
  const [aiAnalysis, setAiAnalysis] = React.useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);

  // Subscription error state
  const [subscriptionError, setSubscriptionError] = React.useState<string | null>(null);

  type AdminTab = "missions" | "personnel" | "customers" | "inbox" | "logs" | "rules" | "overview" | "support";
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

    return () => {
      if (appUnsubscribe) appUnsubscribe();
    };
  }, []);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setAiError(null);
    try {
      const result = await aiService.analyzeStrategicOps(appointments, staffList, SERVICES);
      setAiAnalysis(result);
    } catch (err) {
      console.error("AI Analysis failed:", err);
      setAiError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

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
              {(localeConfig.admin as any).sidebarGroups?.main ?? "Main"}
            </p>
            <div className="space-y-1">
              {navBtn("overview", BarChart3, t.tabs.overview)}
              {navBtn("missions", CalendarDays, t.tabs.appointments)}
            </div>
          </div>

          <div>
            <p className="mb-2 px-3 text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">
              {(localeConfig.admin as any).sidebarGroups?.manage ?? "Manage"}
            </p>
            <div className="space-y-1">
              {navBtn("customers", Users, t.tabs.customers)}
              {!isSolo && navBtn("personnel", Scissors, t.tabs.staff)}
            </div>
          </div>

          <div>
            <p className="mb-2 px-3 text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">
              {(localeConfig.admin as any).sidebarGroups?.comms ?? "Messages"}
            </p>
            <div className="space-y-1">
              {navBtn("inbox", Mail, t.tabs.inbox)}
              {navBtn("logs", Bell, t.tabs.notificationLogs)}
            </div>
          </div>

          <div>
            <p className="mb-2 px-3 text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">
              {(localeConfig.admin as any).sidebarGroups?.system ?? "System"}
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
              {/* Stats strip */}
              <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/90 px-5 py-4">
                  <CalendarDays size={16} className="shrink-0 text-muted-foreground/40" />
                  <div>
                    <p className="text-lg font-black tracking-tight text-foreground">{stats.count}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t.stats.today}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] px-5 py-4">
                  <CheckCircle size={16} className="shrink-0 text-emerald-500/40" />
                  <div>
                    <p className="text-lg font-black tracking-tight text-emerald-500">{stats.confirmed}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/50">{t.stats.confirmed}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-accent-light/20 bg-accent-light/[0.03] px-5 py-4">
                  <Clock size={16} className="shrink-0 text-accent-light/40" />
                  <div>
                    <p className="text-lg font-black tracking-tight text-accent-light">{stats.count - stats.confirmed}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-accent-light/50">{t.stats.pending}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/90 px-5 py-4">
                  <Briefcase size={16} className="shrink-0 text-muted-foreground/40" />
                  <div>
                    <p className="text-lg font-black tracking-tight text-foreground">${stats.revenue}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t.stats.revenue}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-8 lg:flex-row">
                {/* ── Filter sidebar ── */}
                <aside className="space-y-6 lg:w-80">
                  <div className="glass-panel space-y-6 rounded-3xl p-6 shadow-elevated">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <CalendarDays size={14} className="text-accent-light" />
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
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Users size={14} className="text-accent-light" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{t.filters.staffFilter}</h3>
                          </div>
                          <div className="grid gap-2">
                            <button
                              onClick={() => setFilterStaff("all")}
                              className={cn(
                                "rounded-xl border px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest transition-all",
                                filterStaff === "all"
                                  ? "border-accent-light bg-accent-light text-zinc-950 shadow-lg shadow-accent-light/10"
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
                                  "rounded-xl border px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest transition-all",
                                  filterStaff === b.id
                                    ? "border-accent-light bg-accent-light text-zinc-950 shadow-lg shadow-accent-light/10"
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

                  <div className="space-y-3 rounded-3xl border border-dashed border-border p-6 text-center transition-colors duration-300">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.systemStatus}</p>
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                      <p className="text-[10px] font-bold uppercase text-emerald-500/80">{t.allOperational}</p>
                    </div>
                  </div>
                </aside>

                {/* ── Main content ── */}
                <main className="min-w-0 flex-1 space-y-6">
                  {/* AI Analysis Panel */}
                  <div className="group relative overflow-hidden rounded-3xl border border-border bg-card/95 p-8 shadow-elevated backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl dark:bg-card/90">
                    <div className="absolute right-0 top-0 p-8 opacity-10 transition-opacity group-hover:opacity-20">
                      <Scissors size={120} className="-rotate-12 text-foreground" />
                    </div>

                    <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <div className="mb-2 flex items-center gap-2">
                          <div className="h-2 w-2 animate-pulse rounded-full bg-accent-light" />
                          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-light">AI</h3>
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">{t.ai.title}</h2>
                        <p className="max-w-md text-xs text-muted-foreground">{t.ai.subtitle}</p>
                      </div>

                      <button
                        type="button"
                        onClick={runAnalysis}
                        disabled={isAnalyzing}
                        className="flex items-center gap-3 rounded-2xl border border-border bg-muted/80 px-8 py-4 text-[10px] font-black uppercase tracking-widest text-foreground shadow-lg transition-all hover:border-accent-light/50 active:scale-95 disabled:opacity-50 dark:bg-muted/40"
                      >
                        {isAnalyzing ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-light border-t-transparent" />
                        ) : (
                          <AlertCircle size={16} className="text-accent-light" />
                        )}
                        {isAnalyzing ? t.ai.analyzing : t.ai.runAnalysis}
                      </button>
                    </div>

                    {/* AI Error */}
                    {aiError && !aiAnalysis && (
                      <div className="mt-6 flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-3">
                        <div className="flex items-center gap-2">
                          <AlertCircle size={14} className="text-red-500" />
                          <p className="text-xs font-bold text-red-500">{aiError}</p>
                        </div>
                        <button type="button" onClick={runAnalysis} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-400">
                          <RefreshCw size={12} />
                        </button>
                      </div>
                    )}

                    {aiAnalysis && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-8 grid grid-cols-1 gap-6 border-t border-border pt-8 md:grid-cols-3"
                      >
                        <div className="col-span-full rounded-xl border border-accent-light/10 bg-accent-light/5 p-4">
                          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-accent-light/60">{t.ai.summary}</p>
                          <p className="text-sm italic text-muted-foreground">"{aiAnalysis.status}"</p>
                        </div>

                        {aiAnalysis.insights?.map((ins: { title: string; impact: string; description: string }, idx: number) => (
                          <div key={idx} className="space-y-2 rounded-2xl border border-border bg-muted/40 p-5 backdrop-blur-sm dark:bg-card/60">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground">{ins.title}</h4>
                              <span
                                className={cn(
                                  "rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-widest",
                                  ins.impact === "High" ? "bg-red-500/10 text-red-500" : ins.impact === "Medium" ? "bg-accent-light/10 text-accent-light" : "bg-muted text-muted-foreground",
                                )}
                              >
                                {ins.impact} {t.ai.impact}
                              </span>
                            </div>
                            <p className="text-xs leading-relaxed text-muted-foreground">{ins.description}</p>
                          </div>
                        ))}

                        <div className="col-span-full flex items-center justify-between rounded-2xl border border-border bg-muted/60 p-5 md:col-span-1">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.ai.efficiency}</p>
                            <p className="text-xl font-black text-foreground">{aiAnalysis.tacticalMetric}%</p>
                          </div>
                          <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-border border-t-accent-light transition-colors duration-300">
                            <span className="text-[10px] font-black text-accent-light">AI</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* ── Appointments Table ── */}
                  <div className="overflow-hidden rounded-[32px] border border-border bg-card/95 shadow-elevated backdrop-blur-md">
                    <div className="flex flex-col gap-4 border-b border-border p-8 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="mb-1 text-lg font-black uppercase tracking-tight text-foreground">{t.table.title}</h3>
                        <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          <Clock size={12} />
                          {t.table.subtitle}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/60 px-5 py-2.5">
                        <CalendarDays size={14} className="text-accent-light" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{format(filterDate, "EEEE, MMMM do")}</span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-separate border-spacing-0 text-left">
                        <thead className="bg-muted/50 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                          <tr>
                            <th className="border-b border-border px-5 py-4">{t.table.time}</th>
                            <th className="border-b border-border px-5 py-4">{t.table.client}</th>
                            <th className="border-b border-border px-5 py-4">{t.table.service}</th>
                            {!isSolo && <th className="border-b border-border px-5 py-4">{t.table.staff}</th>}
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
                                    className={cn("group relative cursor-pointer transition-all hover:bg-foreground/[0.025]", isExpanded && "bg-accent-light/[0.04]")}
                                  >
                                    <td className="px-5 py-4">
                                      <div className="flex items-center gap-2 font-mono text-sm font-bold text-accent-light">
                                        <span
                                          className={cn(
                                            "h-1.5 w-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]",
                                            app.status === "confirmed"
                                              ? "bg-emerald-500"
                                              : app.status === "pending"
                                                ? "animate-pulse bg-accent-light"
                                                : app.status === "cancelled"
                                                  ? "bg-red-500"
                                                  : app.status === "completed"
                                                    ? "bg-primary"
                                                    : "bg-muted-foreground",
                                          )}
                                        />
                                        {app.time}
                                      </div>
                                    </td>
                                    <td className="px-5 py-4">
                                      <div className="text-sm font-bold text-foreground transition-colors duration-300">{app.customerName}</div>
                                      <div className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{app.customerPhone}</div>
                                    </td>
                                    <td className="px-5 py-4">
                                      <div className="inline-block rounded-md border border-border bg-muted/50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground shadow-inner transition-colors duration-300">
                                        {service?.name}
                                      </div>
                                    </td>
                                    {!isSolo && (
                                      <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                          <div className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-muted text-[10px] font-black text-muted-foreground transition-colors">
                                            {staffMember?.name.charAt(0)}
                                          </div>
                                          <span className="whitespace-nowrap text-xs font-bold text-muted-foreground transition-colors duration-300">{staffMember?.name.split("'")[0]}</span>
                                        </div>
                                      </td>
                                    )}
                                    <td className="px-5 py-4 text-center">
                                      <span
                                        className={cn(
                                          "rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm",
                                          app.paymentStatus === "paid" || app.paymentStatus === "deposit_paid"
                                            ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                                            : app.paymentStatus === "failed"
                                              ? "border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400"
                                              : "border-border bg-muted/50 text-muted-foreground transition-colors duration-300",
                                        )}
                                      >
                                        {app.paymentStatus?.replace("_", " ") || localeConfig.admin.common.unpaid}
                                      </span>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                      <div className="flex justify-end gap-1.5">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleStatusChange(app.id, "confirmed");
                                          }}
                                          disabled={app.status === "confirmed"}
                                          className={cn(
                                            "rounded-lg border p-2.5 shadow-lg transition-all active:scale-95",
                                            app.status === "confirmed"
                                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                              : "border-border bg-muted/70 text-muted-foreground transition-colors hover:border-emerald-500/30 hover:text-emerald-500 dark:bg-muted/30",
                                          )}
                                          title={t.table.confirmTitle}
                                        >
                                          <CheckCircle size={14} />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleStatusChange(app.id, "cancelled");
                                          }}
                                          disabled={app.status === "cancelled"}
                                          className={cn(
                                            "rounded-lg border p-2.5 shadow-lg transition-all active:scale-95",
                                            app.status === "cancelled"
                                              ? "border-red-500/20 bg-red-500/10 text-red-500"
                                              : "border-border bg-muted/70 text-muted-foreground transition-colors hover:border-red-500/30 hover:text-red-500 dark:bg-muted/30",
                                          )}
                                          title={t.table.cancelTitle}
                                        >
                                          <Ban size={14} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>

                                  <AnimatePresence>
                                    {isExpanded && (
                                      <tr>
                                        <td colSpan={6} className="px-5 py-0">
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                                            className="-mx-5 overflow-hidden border border-t-0 border-border bg-muted/40 px-5 py-6"
                                          >
                                            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                                              <div className="space-y-4">
                                                <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{t.expanded.clientDetails}</h5>
                                                <div className="space-y-3 rounded-xl border border-border bg-muted/50 p-4 transition-colors duration-300">
                                                  <div className="flex items-center gap-3">
                                                    <div className="rounded-lg bg-muted p-2">
                                                      <Mail size={14} className="text-accent-light/50" />
                                                    </div>
                                                    <div className="text-xs font-bold text-muted-foreground transition-colors duration-300">{app.customerEmail}</div>
                                                  </div>
                                                  <div className="flex items-center gap-3">
                                                    <div className="rounded-lg bg-muted p-2">
                                                      <Phone size={14} className="text-accent-light/50" />
                                                    </div>
                                                    <div className="text-xs font-bold text-muted-foreground transition-colors duration-300">{app.customerPhone}</div>
                                                  </div>
                                                </div>
                                              </div>

                                              <div className="space-y-4">
                                                <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{t.expanded.bookingDetails}</h5>
                                                <div className="space-y-2 rounded-xl border border-border bg-muted/50 p-4 text-[10px] transition-colors duration-300">
                                                  <div className="flex justify-between">
                                                    <span className="font-bold uppercase tracking-widest text-muted-foreground">{t.expanded.recordId}</span>
                                                    <span className="font-mono font-bold text-muted-foreground transition-colors duration-300">{app.id.slice(0, 12)}...</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                    <span className="font-bold uppercase tracking-widest text-muted-foreground">{t.expanded.time}</span>
                                                    <span className="font-mono font-bold text-muted-foreground transition-colors duration-300">{format(new Date(app.date + "T" + app.time), "HH:mm:ss")}</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                    <span className="font-bold uppercase tracking-widest text-muted-foreground">{t.expanded.status}</span>
                                                    <span className="font-mono font-bold text-muted-foreground transition-colors duration-300">{app.status.toUpperCase()}</span>
                                                  </div>
                                                </div>
                                              </div>

                                              <div className="space-y-4">
                                                <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{t.expanded.paymentSection}</h5>
                                                <div className="flex h-full flex-col justify-center rounded-xl border border-border bg-muted/50 p-4 transition-colors duration-300">
                                                  {app.stripeSessionId ? (
                                                    <div className="space-y-2 text-center">
                                                      <CreditCard className="mx-auto text-emerald-500/40" size={24} />
                                                      <p className="text-[10px] font-black uppercase text-emerald-500/60">{t.expanded.paymentVerified}</p>
                                                      <p className="break-all font-mono text-[10px] text-muted-foreground">{app.stripeSessionId}</p>
                                                    </div>
                                                  ) : (
                                                    <div className="space-y-2 text-center">
                                                      <AlertCircle className="mx-auto text-muted-foreground" size={24} />
                                                      <p className="text-[10px] font-black uppercase text-muted-foreground">{t.expanded.paymentPending}</p>
                                                    </div>
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
                              <td colSpan={6} className="px-5 py-16 text-center">
                                <div className="mx-auto max-w-xs space-y-4 text-muted-foreground">
                                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted/60 transition-colors duration-300">
                                    <CalendarDays className="opacity-20" size={24} />
                                  </div>
                                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">{t.table.empty}</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </main>
              </div>
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
          ) : activeTab === "support" ? (
            <SupportTab />
          ) : null}
        </div>
      </div>
    </div>
  );
}
