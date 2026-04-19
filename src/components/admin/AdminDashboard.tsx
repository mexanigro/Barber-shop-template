import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Scissors, Calendar, Users, Briefcase, ChevronRight, X, Clock, MapPin, CheckCircle, Ban, Mail, Phone, CreditCard, AlertCircle } from "lucide-react";
import { Appointment, AppointmentStatus, StaffMember } from "../../types";
import { format, isSameDay, parse } from "date-fns";
import { cn } from "../../lib/utils";
import { dbService } from "../../services/db";
import { siteConfig } from "../../config/site";
import { aiService } from "../../services/ai";

import { StaffLogistics } from "./StaffLogistics";
import { ThemeToggle } from "../theme/ThemeToggle";

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
    <div className="min-h-screen bg-zinc-50 dark:bg-surface-dark transition-colors duration-300 text-zinc-950 dark:text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-accent-light rounded-xl flex items-center justify-center shadow-lg shadow-accent-light/20 rotate-3">
                 <Scissors className="text-zinc-950" size={20} />
              </div>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-zinc-950 dark:text-white">Mission <span className="text-accent-light">Control</span></h1>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-zinc-500 dark:text-zinc-400 transition-colors duration-300 text-[10px] uppercase tracking-[0.3em] font-black">{brand.name} SYSTEMS</p>
              <div className="h-[1px] w-8 bg-zinc-100 dark:bg-zinc-800 transition-colors duration-300" />
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.3em] font-black">STATION: TERMINAL_01</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <ThemeToggle />
             <div className="px-5 py-3 bg-white dark:bg-zinc-900 transition-colors duration-300 border border-zinc-200 dark:border-zinc-800 transition-colors duration-300 rounded-xl flex items-center gap-3">
               <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Live Sync Active</span>
             </div>
             <button 
               onClick={onExit}
               className="px-8 py-3 bg-white text-zinc-950 hover:bg-accent-light rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-xl"
             >
               Relinquish Access
             </button>
          </div>
        </header>

        <div className="flex items-center gap-1 mb-12 bg-white dark:bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 transition-colors duration-300 w-fit">
          <button
            onClick={() => setActiveTab('missions')}
            className={cn(
              "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3",
              activeTab === 'missions' ? "bg-accent-light text-zinc-950 shadow-lg shadow-accent-light/20" : "text-zinc-500 hover:text-zinc-600 dark:text-zinc-300 transition-colors duration-300"
            )}
          >
            <Calendar size={14} />
            Sector Missions
          </button>
          <button
            onClick={() => setActiveTab('personnel')}
            className={cn(
              "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3",
              activeTab === 'personnel' ? "bg-accent-light text-zinc-950 shadow-lg shadow-accent-light/20" : "text-zinc-500 hover:text-zinc-600 dark:text-zinc-300 transition-colors duration-300"
            )}
          >
            <Users size={14} />
            Tactical Personnel
          </button>
        </div>

        {activeTab === 'missions' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
              <div className="bg-zinc-900/50 p-6 rounded-[24px] border border-zinc-800/50 backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Calendar size={40} className="text-zinc-950 dark:text-white" />
                </div>
                <p className="text-zinc-500 text-[9px] font-black uppercase tracking-[0.3em] mb-4">Daily Volume</p>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-4xl font-black text-zinc-950 dark:text-white tracking-tighter">{stats.count}</h4>
                  <p className="text-[10px] font-black text-zinc-600 uppercase">Bookings</p>
                </div>
              </div>
              
              <div className="bg-green-500/[0.03] p-6 rounded-[24px] border border-green-500/10 backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <CheckCircle size={40} className="text-green-500" />
                </div>
                <p className="text-green-500/50 text-[9px] font-black uppercase tracking-[0.3em] mb-4">Verified Slots</p>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-4xl font-black text-green-500 tracking-tighter">{stats.confirmed}</h4>
                  <p className="text-[10px] font-black text-green-500/30 uppercase">Confirmed</p>
                </div>
              </div>

              <div className="bg-accent-light/[0.03] p-6 rounded-[24px] border border-accent-light/10 backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Clock size={40} className="text-accent-light" />
                </div>
                <p className="text-accent-light/50 text-[9px] font-black uppercase tracking-[0.3em] mb-4">Pending Review</p>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-4xl font-black text-accent-light tracking-tighter">{stats.count - stats.confirmed}</h4>
                  <p className="text-[10px] font-black text-accent-light/30 uppercase">Action Req.</p>
                </div>
              </div>

              <div className="bg-zinc-900/50 p-6 rounded-[24px] border border-zinc-800/50 backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Briefcase size={40} className="text-zinc-950 dark:text-white" />
                </div>
                <p className="text-zinc-500 text-[9px] font-black uppercase tracking-[0.3em] mb-4">Projected Yield</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-black text-white/40">$</p>
                  <h4 className="text-4xl font-black text-zinc-950 dark:text-white tracking-tighter">{stats.revenue}</h4>
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
              <aside className="lg:w-80 space-y-6">
                <div className="bg-zinc-900/40 p-6 rounded-[28px] border border-zinc-800/50 space-y-6">
                  <div className="space-y-4">
                     <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-accent-light" />
                        <h3 className="text-zinc-500 dark:text-zinc-400 transition-colors duration-300 font-black uppercase text-[9px] tracking-[0.3em]">Temporal Filter</h3>
                     </div>
                     <input 
                       type="date"
                       value={format(filterDate, "yyyy-MM-dd")}
                       onChange={(e) => setFilterDate(new Date(e.target.value))}
                       className="w-full bg-zinc-50 dark:bg-surface-dark border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl outline-none focus:border-accent-light/50 text-sm text-zinc-950 dark:text-white font-mono transition-all"
                     />
                  </div>

                  <div className="h-[1px] bg-zinc-800/50" />

                  <div className="space-y-4">
                     <div className="flex items-center gap-2">
                        <Users size={14} className="text-accent-light" />
                        <h3 className="text-zinc-500 dark:text-zinc-400 transition-colors duration-300 font-black uppercase text-[9px] tracking-[0.3em]">Specialist Assignment</h3>
                     </div>
                     <div className="grid gap-2">
                        <button 
                          onClick={() => setFilterStaff("all")}
                          className={cn(
                            "px-5 py-4 rounded-xl border text-[10px] font-black uppercase tracking-widest text-left transition-all",
                            filterStaff === "all" ? "bg-accent-light border-accent-light text-zinc-950 shadow-lg shadow-accent-light/10" : "bg-zinc-50 dark:bg-surface-dark border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-600 dark:text-zinc-300 transition-colors duration-300"
                          )}
                        >
                          All Personnel
                        </button>
                        {staffList.map(b => (
                          <button 
                            key={b.id}
                            onClick={() => setFilterStaff(b.id)}
                            className={cn(
                              "px-5 py-4 rounded-xl border text-[10px] font-black uppercase tracking-widest text-left transition-all",
                              filterStaff === b.id ? "bg-accent-light border-accent-light text-zinc-950 shadow-lg shadow-accent-light/10" : "bg-zinc-50 dark:bg-surface-dark border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-600 dark:text-zinc-300 transition-colors duration-300"
                            )}
                          >
                            {b.name.split("'")[0]}
                          </button>
                        ))}
                     </div>
                  </div>
                </div>
                
                <div className="p-6 rounded-[28px] border border-dashed border-zinc-200 dark:border-zinc-800 transition-colors duration-300 text-center space-y-3">
                   <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">System Health</p>
                   <div className="flex items-center justify-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <p className="text-[10px] font-bold text-green-500/80 uppercase">All Services Operational</p>
                   </div>
                </div>
              </aside>

              <main className="flex-1 min-w-0 space-y-6">
                {/* AI Intelligence Panel */}
                <div className="bg-white dark:bg-zinc-900 transition-colors duration-300 border border-zinc-200 dark:border-zinc-800 transition-colors duration-300 rounded-3xl p-8 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Scissors size={120} className="-rotate-12" />
                   </div>
                   
                   <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-1">
                         <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-accent-light animate-pulse" />
                            <h3 className="text-accent-light text-[10px] font-black uppercase tracking-[0.3em]">Sector Intelligence Core</h3>
                         </div>
                         <h2 className="text-2xl font-black uppercase tracking-tight text-zinc-950 dark:text-white">Tactical <span className="text-zinc-500">Analytics</span></h2>
                         <p className="text-zinc-500 dark:text-zinc-400 transition-colors duration-300 text-xs max-w-md">Gemini-powered operational oversight. Synchronize missions with neural strategy.</p>
                      </div>
                      
                      <button 
                         onClick={runTacticalAnalysis}
                         disabled={isAnalyzing}
                         className="px-8 py-4 bg-zinc-50 dark:bg-surface-dark transition-colors duration-300 border border-zinc-200 dark:border-zinc-800 transition-colors duration-300 rounded-2xl text-zinc-950 dark:text-white font-black uppercase tracking-widest text-[10px] flex items-center gap-3 hover:border-accent-light transition-all shadow-2xl active:scale-95 disabled:opacity-50"
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
                        className="mt-8 pt-8 border-t border-zinc-200 dark:border-zinc-800 transition-colors duration-300 grid grid-cols-1 md:grid-cols-3 gap-6"
                      >
                         <div className="col-span-full bg-accent-light/5 p-4 rounded-xl border border-accent-light/10">
                            <p className="text-[9px] font-black uppercase tracking-widest text-accent-light/60 mb-1">Neural Summary</p>
                            <p className="text-zinc-200 text-sm italic">"{aiAnalysis.status}"</p>
                         </div>
                         
                         {aiAnalysis.insights?.map((ins: any, idx: number) => (
                            <div key={idx} className="bg-surface-dark/50 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 transition-colors duration-300 space-y-2">
                               <div className="flex items-center justify-between">
                                  <h4 className="text-zinc-950 dark:text-white font-black uppercase text-[10px] tracking-widest">{ins.title}</h4>
                                  <span className={cn(
                                     "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                                     ins.impact === 'High' ? "bg-red-500/10 text-red-500" : 
                                     ins.impact === 'Medium' ? "bg-accent-light/10 text-accent-light" : "bg-zinc-100 dark:bg-zinc-800 transition-colors duration-300 text-zinc-500"
                                  )}>{ins.impact} Impact</span>
                               </div>
                               <p className="text-zinc-500 dark:text-zinc-400 transition-colors duration-300 text-xs leading-relaxed">{ins.description}</p>
                            </div>
                         ))}
                         
                         <div className="col-span-full md:col-span-1 bg-surface-dark/80 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 transition-colors duration-300 flex items-center justify-between">
                             <div className="space-y-1">
                                <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">Efficiency Rating</p>
                                <p className="text-zinc-950 dark:text-white text-xl font-black">{aiAnalysis.tacticalMetric}%</p>
                             </div>
                             <div className="w-12 h-12 rounded-full border-4 border-zinc-200 dark:border-zinc-800 transition-colors duration-300 border-t-accent-light flex items-center justify-center">
                                <span className="text-accent-light text-[10px] font-black">AI</span>
                             </div>
                         </div>
                      </motion.div>
                   )}
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[32px] overflow-hidden backdrop-blur-md">
                   <div className="p-8 border-b border-zinc-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                         <h3 className="text-lg font-black uppercase tracking-tight text-zinc-950 dark:text-white mb-1">Appointment manifest</h3>
                         <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <Clock size={12} />
                            Real-time Queue Status
                         </p>
                      </div>
                      <div className="bg-surface-dark/50 px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors duration-300 flex items-center gap-3">
                         <Calendar size={14} className="text-accent-light" />
                         <span className="text-[10px] uppercase font-black tracking-widest text-zinc-600 dark:text-zinc-300 transition-colors duration-300">
                            {format(filterDate, "EEEE, MMMM do")}
                         </span>
                      </div>
                   </div>

                   <div className="overflow-x-auto">
                      <table className="w-full text-left border-separate border-spacing-0">
                         <thead className="bg-surface-dark/30 text-zinc-500 text-[9px] font-black uppercase tracking-[0.3em]">
                            <tr>
                               <th className="px-8 py-5 border-b border-zinc-800/50">Timestamp</th>
                               <th className="px-8 py-5 border-b border-zinc-800/50">Subject</th>
                               <th className="px-8 py-5 border-b border-zinc-800/50">Module</th>
                               <th className="px-8 py-5 border-b border-zinc-800/50">Personnel</th>
                               <th className="px-8 py-5 border-b border-zinc-800/50 text-center">Identity</th>
                               <th className="px-8 py-5 border-b border-zinc-800/50 text-right">Ops</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-zinc-800/30">
                            {filteredAppointments.length > 0 ? filteredAppointments.map(app => {
                               const staffMember = staffList.find(b => b.id === app.staffId);
                               const service = SERVICES.find(s => s.id === app.serviceId);
                               const isExpanded = expandedId === app.id;

                               return (
                                  <React.Fragment key={app.id}>
                                     <tr 
                                        onClick={() => setExpandedId(isExpanded ? null : app.id)}
                                        className={cn(
                                           "group hover:bg-white/[0.04] transition-all cursor-pointer border-l-2 border-transparent relative",
                                           isExpanded && "bg-accent-light/[0.04] border-l-accent-light"
                                        )}
                                     >
                                        <td className="px-8 py-6">
                                           <div className="font-mono text-sm font-bold text-accent-light flex items-center gap-2">
                                              <span className={cn(
                                                 "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]",
                                                 app.status === 'confirmed' ? "bg-green-500" : 
                                                 app.status === 'pending' ? "bg-accent-light animate-pulse" :
                                                 app.status === 'cancelled' ? "bg-red-500" :
                                                 app.status === 'completed' ? "bg-blue-500" :
                                                 "bg-zinc-600"
                                              )} />
                                              {app.time}
                                           </div>
                                        </td>
                                        <td className="px-8 py-6">
                                           <div className="font-bold text-zinc-900 dark:text-zinc-100 transition-colors duration-300 text-sm">{app.customerName}</div>
                                           <div className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mt-0.5">{app.customerPhone}</div>
                                        </td>
                                        <td className="px-8 py-6">
                                           <div className="text-zinc-500 dark:text-zinc-400 transition-colors duration-300 text-[10px] font-black uppercase tracking-widest py-1 px-2.5 bg-surface-dark/50 rounded-md border border-zinc-200 dark:border-zinc-800 transition-colors duration-300 inline-block shadow-inner">
                                              {service?.name}
                                           </div>
                                        </td>
                                        <td className="px-8 py-6">
                                           <div className="flex items-center gap-3 group/staff relative">
                                              <div className="w-6 h-6 rounded-md bg-zinc-100 dark:bg-zinc-800 transition-colors duration-300 border border-zinc-700 flex items-center justify-center text-[10px] font-black text-zinc-500 group-hover/staff:border-accent-light/50 transition-colors">
                                                 {staffMember?.name.charAt(0)}
                                              </div>
                                              <span className="text-zinc-500 dark:text-zinc-400 transition-colors duration-300 text-xs font-bold whitespace-nowrap">{staffMember?.name.split("'")[0]}</span>
                                              
                                              {/* Technical Tooltip */}
                                              <div className="absolute left-0 -top-8 px-2 py-1 bg-white dark:bg-zinc-900 transition-colors duration-300 border border-accent-light/30 rounded text-[9px] font-black text-accent-light uppercase tracking-widest opacity-0 scale-95 pointer-events-none group-hover/staff:opacity-100 group-hover/staff:scale-100 transition-all z-50 shadow-2xl backdrop-blur-md">
                                                 {staffMember?.name} // ID_{staffMember?.id.toUpperCase()}
                                              </div>
                                           </div>
                                        </td>
                                         <td className="px-8 py-6 text-center">
                                            <span className={cn(
                                               "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm",
                                               app.paymentStatus === 'paid' || app.paymentStatus === 'deposit_paid' ? "bg-green-500/5 text-green-500 border-green-500/20" :
                                               app.paymentStatus === 'failed' ? "bg-red-500/5 text-red-500 border-red-500/20" :
                                               "bg-surface-dark/50 text-zinc-600 border-zinc-200 dark:border-zinc-800 transition-colors duration-300"
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
                                                   ? "bg-green-500/10 border-green-500/20 text-green-500" 
                                                   : "bg-zinc-50 dark:bg-surface-dark transition-colors duration-300 border-zinc-200 dark:border-zinc-800 transition-colors duration-300 text-zinc-600 hover:text-green-500 hover:border-green-500/30"
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
                                                   : "bg-zinc-50 dark:bg-surface-dark transition-colors duration-300 border-zinc-200 dark:border-zinc-800 transition-colors duration-300 text-zinc-600 hover:text-red-500 hover:border-red-500/30"
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
                                                    className="overflow-hidden bg-surface-dark/50 border border-t-0 border-zinc-800/50 -mx-8 px-8 py-8"
                                                 >
                                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                    <div className="space-y-4">
                                                       <h5 className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600">Subject Identity</h5>
                                                       <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors duration-300 space-y-3">
                                                          <div className="flex items-center gap-3">
                                                             <div className="p-2 bg-zinc-100 dark:bg-zinc-800 transition-colors duration-300 rounded-lg"><Mail size={14} className="text-accent-light/50" /></div>
                                                             <div className="text-xs font-bold text-zinc-600 dark:text-zinc-300 transition-colors duration-300">{app.customerEmail}</div>
                                                          </div>
                                                          <div className="flex items-center gap-3">
                                                             <div className="p-2 bg-zinc-100 dark:bg-zinc-800 transition-colors duration-300 rounded-lg"><Phone size={14} className="text-accent-light/50" /></div>
                                                             <div className="text-xs font-bold text-zinc-600 dark:text-zinc-300 transition-colors duration-300">{app.customerPhone}</div>
                                                          </div>
                                                       </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                       <h5 className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600">Technical Context</h5>
                                                       <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors duration-300 text-[10px] space-y-2">
                                                          <div className="flex justify-between">
                                                             <span className="text-zinc-500 font-bold uppercase tracking-widest">RECORD_ID</span>
                                                             <span className="font-mono text-zinc-500 dark:text-zinc-400 transition-colors duration-300 font-bold">{app.id.slice(0, 12)}...</span>
                                                          </div>
                                                          <div className="flex justify-between">
                                                             <span className="text-zinc-500 font-bold uppercase tracking-widest">TIMESTAMP_UTC</span>
                                                             <span className="font-mono text-zinc-500 dark:text-zinc-400 transition-colors duration-300 font-bold">{format(new Date(app.date + 'T' + app.time), "HH:mm:ss 'UTC'")}</span>
                                                          </div>
                                                          <div className="flex justify-between">
                                                             <span className="text-zinc-500 font-bold uppercase tracking-widest">STATUS_CODE</span>
                                                             <span className="font-mono text-zinc-500 dark:text-zinc-400 transition-colors duration-300 font-bold">{app.status.toUpperCase()}</span>
                                                          </div>
                                                       </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                       <h5 className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600">Payment Validation</h5>
                                                       <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors duration-300 h-full flex flex-col justify-center">
                                                           {app.stripeSessionId ? (
                                                              <div className="text-center space-y-2">
                                                                 <CreditCard className="mx-auto text-green-500/40" size={24} />
                                                                 <p className="text-[10px] font-black text-green-500/60 uppercase">Transaction Verified</p>
                                                                 <p className="text-[8px] font-mono text-zinc-600 break-all">{app.stripeSessionId}</p>
                                                              </div>
                                                           ) : (
                                                              <div className="text-center space-y-2">
                                                                 <AlertCircle className="mx-auto text-zinc-700" size={24} />
                                                                 <p className="text-[10px] font-black text-zinc-600 uppercase">External Settlement Req.</p>
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
                                     <div className="text-zinc-700 space-y-4 max-w-xs mx-auto">
                                        <div className="w-16 h-16 bg-zinc-900/50 rounded-full flex items-center justify-center mx-auto border border-zinc-200 dark:border-zinc-800 transition-colors duration-300">
                                           <Ban className="opacity-20" size={24} />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600">No active signals detected for this sector</p>
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
