import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Scissors, CalendarDays, Users, Briefcase, ChevronRight, X, Clock, MapPin, CheckCircle, Ban, Mail, Phone, CreditCard, AlertCircle } from "lucide-react";
import { Appointment, AppointmentStatus, StaffMember } from "../../types";
import { format, isSameDay, startOfDay } from "date-fns";
import { cn } from "../../lib/utils";
import { dbService } from "../../services/db";
import { siteConfig } from "../../config/site";
import { aiService } from "../../services/ai";

import { StaffLogistics } from "./StaffLogistics";
import { ThemeToggle } from "../theme/ThemeToggle";
import { Calendar } from "../ui/calendar";

export function AdminDashboard({ onExit }: { onExit: () => void }) {
  const { services: SERVICES, brand } = siteConfig;
  const [staffList, setStaffList] = React.useState<StaffMember[]>(siteConfig.staff);
  const [filterDate, setFilterDate] = React.useState(new Date());
  const [filterStaff, setFilterStaff] = React.useState<string>("all");
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  // AI Intelligence State
  const [aiAnalysis, setAiAnalysis] = React.useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  
  const [activeTab, setActiveTab] = React.useState<'missions' | 'personnel'>('missions');

  React.useEffect(() => {
    let appUnsubscribe: (() => void) | undefined;

    dbService.getStaff().then(setStaffList);

    try {
      appUnsubscribe = dbService.subscribeToAppointments((data) => {
        setAppointments(data);
      });
    } catch (err: unknown) {
      console.error("Subscription failed:", err);
    }

    return () => {
      if (appUnsubscribe) appUnsubscribe();
    };
  }, []);

  const runTacticalAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await aiService.analyzeStrategicOps(appointments, staffList, SERVICES);
      setAiAnalysis(result);
    } catch (err) {
      console.error("AI Analysis failed:", err);
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
    const today = appointments.filter(a => a.date === format(new Date(), "yyyy-MM-dd"));
    const confirmed = today.filter(a => a.status === 'confirmed');
    const revenue = confirmed.reduce((acc, curr) => {
      const s = SERVICES.find(sv => sv.id === curr.serviceId);
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

  return (
    <div className="min-h-screen bg-background p-6 text-foreground transition-colors duration-300 md:p-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 rotate-3 items-center justify-center rounded-xl bg-accent-light shadow-lg shadow-accent-light/20">
                 <Scissors className="text-zinc-950" size={20} />
              </div>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-foreground">Mission <span className="text-accent-light">Control</span></h1>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{brand.name} SYSTEMS</p>
              <div className="h-px w-8 bg-border" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">STATION: TERMINAL_01</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="md:hidden">
               <ThemeToggle />
             </div>
              <div className="glass-panel flex items-center gap-3 rounded-2xl px-5 py-3">
               <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
               <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Live Sync Active</span>
             </div>
             <button 
               type="button"
               onClick={onExit}
               className="rounded-xl border border-border bg-card px-8 py-3 text-[10px] font-black uppercase tracking-widest text-foreground shadow-elevated transition-all duration-300 hover:border-accent-light/40 hover:bg-muted"
             >
               Relinquish Access
             </button>
          </div>
        </header>

        <div className="mb-12 flex w-fit items-center gap-1 rounded-2xl border border-border bg-muted/60 p-1.5 backdrop-blur-sm dark:bg-card/50">
          <button
            onClick={() => setActiveTab('missions')}
            className={cn(
              "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3",
              activeTab === 'missions' ? "bg-accent-light text-zinc-950 shadow-lg shadow-accent-light/20" : "text-muted-foreground transition-colors duration-300 hover:text-foreground"
            )}
          >
            <CalendarDays size={14} />
            Sector Missions
          </button>
          <button
            onClick={() => setActiveTab('personnel')}
            className={cn(
              "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3",
              activeTab === 'personnel' ? "bg-accent-light text-zinc-950 shadow-lg shadow-accent-light/20" : "text-muted-foreground transition-colors duration-300 hover:text-foreground"
            )}
          >
            <Users size={14} />
            Tactical Personnel
          </button>
        </div>

        {activeTab === 'missions' ? (
          <>
            <div className="mb-12 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="group relative overflow-hidden rounded-3xl border border-border bg-card/90 p-6 shadow-elevated backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                <div className="absolute right-0 top-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
                  <CalendarDays size={40} className="text-foreground" />
                </div>
                <p className="mb-4 text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Daily Volume</p>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-4xl font-black tracking-tighter text-foreground">{stats.count}</h4>
                  <p className="text-[10px] font-black uppercase text-muted-foreground">Bookings</p>
                </div>
              </div>
              
              <div className="group relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.04] p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <CheckCircle size={40} className="text-emerald-500" />
                </div>
                <p className="text-emerald-500/50 text-[9px] font-black uppercase tracking-[0.3em] mb-4">Verified Slots</p>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-4xl font-black text-emerald-500 tracking-tighter">{stats.confirmed}</h4>
                  <p className="text-[10px] font-black text-emerald-500/30 uppercase">Confirmed</p>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-3xl border border-accent-light/20 bg-accent-light/[0.05] p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Clock size={40} className="text-accent-light" />
                </div>
                <p className="text-accent-light/50 text-[9px] font-black uppercase tracking-[0.3em] mb-4">Pending Review</p>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-4xl font-black text-accent-light tracking-tighter">{stats.count - stats.confirmed}</h4>
                  <p className="text-[10px] font-black text-accent-light/30 uppercase">Action Req.</p>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-3xl border border-border bg-card/90 p-6 shadow-elevated backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                <div className="absolute right-0 top-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
                  <Briefcase size={40} className="text-foreground" />
                </div>
                <p className="mb-4 text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Projected Yield</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-black text-muted-foreground/80">$</p>
                  <h4 className="text-4xl font-black tracking-tighter text-foreground">{stats.revenue}</h4>
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
              <aside className="lg:w-80 space-y-6">
                <div className="glass-panel space-y-6 rounded-3xl p-6 shadow-elevated">
                  <div className="space-y-4">
                     <div className="flex items-center gap-2">
                        <CalendarDays size={14} className="text-accent-light" />
                        <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Temporal Filter</h3>
                     </div>
                     <Calendar
                       selected={filterDate}
                       onSelect={(d) => setFilterDate(startOfDay(d))}
                       className="max-w-full border-border bg-card shadow-elevated"
                     />
                  </div>

                  <div className="h-px bg-border" />

                  <div className="space-y-4">
                     <div className="flex items-center gap-2">
                        <Users size={14} className="text-accent-light" />
                        <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Specialist Assignment</h3>
                     </div>
                     <div className="grid gap-2">
                        <button 
                          onClick={() => setFilterStaff("all")}
                          className={cn(
                            "rounded-xl border px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest transition-all",
                            filterStaff === "all" ? "border-accent-light bg-accent-light text-zinc-950 shadow-lg shadow-accent-light/10" : "border-border bg-muted/60 text-muted-foreground hover:border-accent-light/30 hover:text-foreground"
                          )}
                        >
                          All Personnel
                        </button>
                        {staffList.map(b => (
                          <button 
                            key={b.id}
                            onClick={() => setFilterStaff(b.id)}
                            className={cn(
                              "rounded-xl border px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest transition-all",
                              filterStaff === b.id ? "border-accent-light bg-accent-light text-zinc-950 shadow-lg shadow-accent-light/10" : "border-border bg-muted/60 text-muted-foreground hover:border-accent-light/30 hover:text-foreground"
                            )}
                          >
                            {b.name.split("'")[0]}
                          </button>
                        ))}
                     </div>
                  </div>
                </div>
                
                <div className="space-y-3 rounded-3xl border border-dashed border-border p-6 text-center transition-colors duration-300">
                   <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">System Health</p>
                   <div className="flex items-center justify-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-[10px] font-bold text-emerald-500/80 uppercase">All Services Operational</p>
                   </div>
                </div>
              </aside>

              <main className="flex-1 min-w-0 space-y-6">
                {/* AI Intelligence Panel */}
                <div className="group relative overflow-hidden rounded-3xl border border-border bg-card/95 p-8 shadow-elevated backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl dark:bg-card/90">
                   <div className="absolute right-0 top-0 p-8 opacity-10 transition-opacity group-hover:opacity-20">
                      <Scissors size={120} className="-rotate-12 text-foreground" />
                   </div>
                   
                   <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                         <div className="mb-2 flex items-center gap-2">
                            <div className="h-2 w-2 animate-pulse rounded-full bg-accent-light" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-light">Sector Intelligence Core</h3>
                         </div>
                         <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">Tactical <span className="text-muted-foreground">Analytics</span></h2>
                         <p className="max-w-md text-xs text-muted-foreground">Gemini-powered operational oversight. Synchronize missions with neural strategy.</p>
                      </div>
                      
                      <button 
                         type="button"
                         onClick={runTacticalAnalysis}
                         disabled={isAnalyzing}
                         className="flex items-center gap-3 rounded-2xl border border-border bg-muted/80 px-8 py-4 text-[10px] font-black uppercase tracking-widest text-foreground shadow-lg transition-all hover:border-accent-light/50 active:scale-95 disabled:opacity-50 dark:bg-muted/40"
                      >
                         {isAnalyzing ? (
                            <div className="w-4 h-4 border-2 border-accent-light border-t-transparent rounded-full animate-spin" />
                         ) : <AlertCircle size={16} className="text-accent-light" />}
                         {isAnalyzing ? "Recalibrating..." : "Execute Intelligence Sync"}
                      </button>
                   </div>

                   {aiAnalysis && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-8 grid grid-cols-1 gap-6 border-t border-border pt-8 md:grid-cols-3"
                      >
                         <div className="col-span-full bg-accent-light/5 p-4 rounded-xl border border-accent-light/10">
                            <p className="text-[9px] font-black uppercase tracking-widest text-accent-light/60 mb-1">Neural Summary</p>
                            <p className="text-sm italic text-muted-foreground">"{aiAnalysis.status}"</p>
                         </div>
                         
                         {aiAnalysis.insights?.map((ins: any, idx: number) => (
                            <div key={idx} className="space-y-2 rounded-2xl border border-border bg-muted/40 p-5 backdrop-blur-sm dark:bg-card/60">
                               <div className="flex items-center justify-between">
                                  <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground">{ins.title}</h4>
                                  <span className={cn(
                                     "rounded px-2 py-0.5 text-[8px] font-black uppercase tracking-widest",
                                     ins.impact === 'High' ? "bg-red-500/10 text-red-500" : 
                                     ins.impact === 'Medium' ? "bg-accent-light/10 text-accent-light" : "bg-muted text-muted-foreground"
                                  )}>{ins.impact} Impact</span>
                               </div>
                               <p className="text-xs leading-relaxed text-muted-foreground">{ins.description}</p>
                            </div>
                         ))}
                         
                         <div className="col-span-full flex items-center justify-between rounded-2xl border border-border bg-muted/60 p-5 md:col-span-1">
                             <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Efficiency Rating</p>
                                <p className="text-foreground text-xl font-black">{aiAnalysis.tacticalMetric}%</p>
                             </div>
                             <div className="w-12 h-12 rounded-full border-4 border-border transition-colors duration-300 border-t-accent-light flex items-center justify-center">
                                <span className="text-accent-light text-[10px] font-black">AI</span>
                             </div>
                         </div>
                      </motion.div>
                   )}
                </div>

                <div className="overflow-hidden rounded-[32px] border border-border bg-card/95 shadow-elevated backdrop-blur-md">
                   <div className="flex flex-col gap-4 border-b border-border p-8 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                         <h3 className="mb-1 text-lg font-black uppercase tracking-tight text-foreground">Appointment manifest</h3>
                         <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            <Clock size={12} />
                            Real-time Queue Status
                         </p>
                      </div>
                      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/60 px-5 py-2.5">
                         <CalendarDays size={14} className="text-accent-light" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            {format(filterDate, "EEEE, MMMM do")}
                         </span>
                      </div>
                   </div>

                   <div className="overflow-x-auto">
                      <table className="w-full text-left border-separate border-spacing-0">
                         <thead className="bg-muted/50 text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                            <tr>
                               <th className="border-b border-border px-8 py-5">Timestamp</th>
                               <th className="border-b border-border px-8 py-5">Subject</th>
                               <th className="border-b border-border px-8 py-5">Module</th>
                               <th className="border-b border-border px-8 py-5">Personnel</th>
                               <th className="border-b border-border px-8 py-5 text-center">Identity</th>
                               <th className="border-b border-border px-8 py-5 text-right">Ops</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-border">
                            {filteredAppointments.length > 0 ? filteredAppointments.map(app => {
                               const staffMember = staffList.find(b => b.id === app.staffId);
                               const service = SERVICES.find(s => s.id === app.serviceId);
                               const isExpanded = expandedId === app.id;

                               return (
                                  <React.Fragment key={app.id}>
                                     <tr 
                                        onClick={() => setExpandedId(isExpanded ? null : app.id)}
                                        className={cn(
                                           "group hover:bg-foreground/[0.025] transition-all cursor-pointer border-l-2 border-transparent relative",
                                           isExpanded && "bg-accent-light/[0.04] border-l-accent-light"
                                        )}
                                     >
                                        <td className="px-8 py-6">
                                           <div className="font-mono text-sm font-bold text-accent-light flex items-center gap-2">
                                              <span className={cn(
                                                 "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]",
                                                 app.status === 'confirmed' ? "bg-emerald-500" : 
                                                 app.status === 'pending' ? "bg-accent-light animate-pulse" :
                                                 app.status === 'cancelled' ? "bg-red-500" :
                                                 app.status === 'completed' ? "bg-primary" :
                                                 "bg-muted-foreground"
                                              )} />
                                              {app.time}
                                           </div>
                                        </td>
                                        <td className="px-8 py-6">
                                           <div className="font-bold text-foreground transition-colors duration-300 text-sm">{app.customerName}</div>
                                           <div className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">{app.customerPhone}</div>
                                        </td>
                                        <td className="px-8 py-6">
                                           <div className="inline-block rounded-md border border-border bg-muted/50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground shadow-inner transition-colors duration-300">
                                              {service?.name}
                                           </div>
                                        </td>
                                        <td className="px-8 py-6">
                                           <div className="flex items-center gap-3 group/staff relative">
                                              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-muted text-[10px] font-black text-muted-foreground transition-colors group-hover/staff:border-accent-light/50">
                                                 {staffMember?.name.charAt(0)}
                                              </div>
                                              <span className="text-muted-foreground transition-colors duration-300 text-xs font-bold whitespace-nowrap">{staffMember?.name.split("'")[0]}</span>
                                              
                                              {/* Technical Tooltip */}
                                              <div className="absolute left-0 -top-8 px-2 py-1 bg-card transition-colors duration-300 border border-accent-light/30 rounded text-[9px] font-black text-accent-light uppercase tracking-widest opacity-0 scale-95 pointer-events-none group-hover/staff:opacity-100 group-hover/staff:scale-100 transition-all z-50 shadow-2xl backdrop-blur-md">
                                                 {staffMember?.name} // ID_{staffMember?.id.toUpperCase()}
                                              </div>
                                           </div>
                                        </td>
                                         <td className="px-8 py-6 text-center">
                                            <span className={cn(
                                               "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm",
                                               app.paymentStatus === 'paid' || app.paymentStatus === 'deposit_paid' ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/20 dark:text-emerald-400" :
                                               app.paymentStatus === 'failed' ? "bg-red-500/5 text-red-600 border-red-500/20 dark:text-red-400" :
                                               "border-border bg-muted/50 text-muted-foreground transition-colors duration-300"
                                            )}>
                                               {app.paymentStatus?.replace('_', ' ') || 'UNPAID'}
                                            </span>
                                         </td>
                                        <td className="px-8 py-6 text-right">
                                           <div className="flex justify-end gap-1.5 translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                                              <button 
                                                onClick={(e) => { e.stopPropagation(); handleStatusChange(app.id, 'confirmed'); }}
                                                disabled={app.status === 'confirmed'}
                                                className={cn(
                                                  "p-2.5 rounded-lg border transition-all shadow-lg active:scale-95",
                                                  app.status === 'confirmed' 
                                                   ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                                                   : "border-border bg-muted/70 text-muted-foreground transition-colors hover:border-emerald-500/30 hover:text-emerald-500 dark:bg-muted/30"
                                                )}
                                                title="Verify Presence"
                                              >
                                                 <CheckCircle size={14} />
                                              </button>
                                              <button 
                                                onClick={(e) => { e.stopPropagation(); handleStatusChange(app.id, 'cancelled'); }}
                                                disabled={app.status === 'cancelled'}
                                                className={cn(
                                                  "p-2.5 rounded-lg border transition-all shadow-lg active:scale-95",
                                                  app.status === 'cancelled' 
                                                   ? "bg-red-500/10 border-red-500/20 text-red-500" 
                                                   : "border-border bg-muted/70 text-muted-foreground transition-colors hover:border-red-500/30 hover:text-red-500 dark:bg-muted/30"
                                                )}
                                                title="Decommission Slot"
                                              >
                                                 <Ban size={14} />
                                              </button>
                                           </div>
                                        </td>
                                     </tr>

                                     <AnimatePresence>
                                        {isExpanded && (
                                           <tr>
                                              <td colSpan={6} className="px-8 py-0">
                                                 <motion.div 
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                                                    className="-mx-8 overflow-hidden border border-t-0 border-border bg-muted/40 px-8 py-8"
                                                 >
                                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                    <div className="space-y-4">
                                                       <h5 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Subject Identity</h5>
                                                       <div className="space-y-3 rounded-xl border border-border bg-muted/50 p-4 transition-colors duration-300">
                                                          <div className="flex items-center gap-3">
                                                             <div className="rounded-lg bg-muted p-2"><Mail size={14} className="text-accent-light/50" /></div>
                                                             <div className="text-xs font-bold text-muted-foreground transition-colors duration-300">{app.customerEmail}</div>
                                                          </div>
                                                          <div className="flex items-center gap-3">
                                                             <div className="rounded-lg bg-muted p-2"><Phone size={14} className="text-accent-light/50" /></div>
                                                             <div className="text-xs font-bold text-muted-foreground transition-colors duration-300">{app.customerPhone}</div>
                                                          </div>
                                                       </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                       <h5 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Technical Context</h5>
                                                       <div className="space-y-2 rounded-xl border border-border bg-muted/50 p-4 text-[10px] transition-colors duration-300">
                                                          <div className="flex justify-between">
                                                             <span className="font-bold uppercase tracking-widest text-muted-foreground">RECORD_ID</span>
                                                             <span className="font-mono text-muted-foreground transition-colors duration-300 font-bold">{app.id.slice(0, 12)}...</span>
                                                          </div>
                                                          <div className="flex justify-between">
                                                             <span className="font-bold uppercase tracking-widest text-muted-foreground">TIMESTAMP_UTC</span>
                                                             <span className="font-mono text-muted-foreground transition-colors duration-300 font-bold">{format(new Date(app.date + 'T' + app.time), "HH:mm:ss 'UTC'")}</span>
                                                          </div>
                                                          <div className="flex justify-between">
                                                             <span className="font-bold uppercase tracking-widest text-muted-foreground">STATUS_CODE</span>
                                                             <span className="font-mono text-muted-foreground transition-colors duration-300 font-bold">{app.status.toUpperCase()}</span>
                                                          </div>
                                                       </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                       <h5 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Payment Validation</h5>
                                                       <div className="flex h-full flex-col justify-center rounded-xl border border-border bg-muted/50 p-4 transition-colors duration-300">
                                                           {app.stripeSessionId ? (
                                                              <div className="text-center space-y-2">
                                                                 <CreditCard className="mx-auto text-emerald-500/40" size={24} />
                                                                 <p className="text-[10px] font-black text-emerald-500/60 uppercase">Transaction Verified</p>
                                                                 <p className="break-all font-mono text-[8px] text-muted-foreground">{app.stripeSessionId}</p>
                                                              </div>
                                                           ) : (
                                                              <div className="text-center space-y-2">
                                                                 <AlertCircle className="mx-auto text-muted-foreground" size={24} />
                                                                 <p className="text-[10px] font-black uppercase text-muted-foreground">External Settlement Req.</p>
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
                            }) : (
                               <tr>
                                  <td colSpan={6} className="px-8 py-24 text-center">
                                     <div className="mx-auto max-w-xs space-y-4 text-muted-foreground">
                                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted/60 transition-colors duration-300">
                                           <Ban className="opacity-20" size={24} />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">No active signals detected for this sector</p>
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
        ) : (
          <StaffLogistics />
        )}
      </div>
    </div>
  );
}
