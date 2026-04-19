import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Scissors, User, Calendar as CalendarIcon, Clock, CheckCircle, X, ChevronRight, ChevronLeft, Phone, Mail, UserCircle, CreditCard, AlertCircle } from "lucide-react";
import { Service, StaffMember, Appointment, PaymentStatus, AppointmentStatus } from "../../types";
import { format, isBefore, startOfDay } from "date-fns";
import { generateSlots } from "../../lib/booking";
import { cn } from "../../lib/utils";
import { dbService } from "../../services/db";
import { siteConfig } from "../../config/site";
import { aiService } from "../../services/ai";
import { Sparkles, Send } from "lucide-react";
import { Calendar } from "../ui/calendar";

type Step = "service" | "staff" | "datetime" | "details" | "payment" | "success";

/** Visual-only field & surface tokens — no logic impact */
const fieldWithIcon =
  "w-full rounded-2xl border border-border bg-muted/50 py-4 pl-12 pr-4 text-sm text-foreground outline-none transition-all duration-300 placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-muted/30";
const fieldAi =
  "flex-1 rounded-xl border border-border bg-muted/50 px-3 py-3 text-xs text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-muted/30";
const btnPrimaryFull =
  "mt-4 flex w-full items-center justify-center gap-3 rounded-2xl bg-primary p-5 font-black uppercase tracking-widest text-primary-foreground shadow-md transition-all duration-300 hover:bg-accent-light hover:text-zinc-950 disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground";

export function BookingWizard({ onClose }: { onClose: () => void }) {
  const { services: SERVICES, staff: STAFF, brand, payment: PAYMENT_CONFIG, sections } = siteConfig;
  const { booking: config } = sections;
  /** When false, no Stripe step; new appointments are stored as `confirmed` without card flow. */
  const paymentsRequired = PAYMENT_CONFIG.enabled && PAYMENT_CONFIG.mode !== "none";
  const [step, setStep] = React.useState<Step>("service");

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("booking_status") === "success") {
      setStep("success");
    }
  }, []);

  const [selectedService, setSelectedService] = React.useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = React.useState<StaffMember | null>(null);
  const [anySpecialist, setAnySpecialist] = React.useState(false);
  const [staffList, setStaffList] = React.useState<StaffMember[]>(STAFF);
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = React.useState<string | null>(null);

  React.useEffect(() => {
    dbService.getStaff().then(setStaffList);
  }, []);
  
  const [customerInfo, setCustomerInfo] = React.useState({
    name: "",
    email: "",
    phone: "",
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [appointmentId, setAppointmentId] = React.useState<string | null>(null);
  const [existingAppointments, setExistingAppointments] = React.useState<Appointment[]>([]);
  const [isCancelling, setIsCancelling] = React.useState(false);

  React.useEffect(() => {
    if (selectedStaff && selectedDate) {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      dbService.getAppointmentsForDate(dateStr).then(apps => {
        setExistingAppointments(apps.filter(a => a.staffId === selectedStaff.id && a.status !== 'cancelled'));
      });
    }
  }, [selectedDate, selectedStaff, step]);
  const [isCancelled, setIsCancelled] = React.useState(false);
  const [paymentError, setPaymentError] = React.useState<string | null>(null);

  // AI Consultation State
  const [showAiConsult, setShowAiConsult] = React.useState(false);
  const [aiQuery, setAiQuery] = React.useState("");
  const [isConsulting, setIsConsulting] = React.useState(false);
  const [aiAdvice, setAiAdvice] = React.useState<string | null>(null);

  const handleClose = () => {
    // Clean up URL params
    const url = new URL(window.location.href);
    url.searchParams.delete("booking_status");
    url.searchParams.delete("session_id");
    window.history.replaceState({}, "", url);
    onClose();
  };

  const availableSlots = React.useMemo(() => {
    if (!selectedService) return [];
    
    if (anySpecialist) {
      // Aggregate slots from ALL staff
      const allSlots = new Set<string>();
      staffList.forEach(b => {
        const slots = generateSlots(selectedDate, b, selectedService, existingAppointments.filter(a => a.staffId === b.id));
        slots.forEach(s => allSlots.add(s));
      });
      return Array.from(allSlots).sort();
    }

    if (!selectedStaff) return [];
    return generateSlots(selectedDate, selectedStaff, selectedService, existingAppointments);
  }, [selectedDate, selectedStaff, selectedService, existingAppointments, anySpecialist, staffList]);

  const handleConfirm = async () => {
    if (!selectedService || (!selectedStaff && !anySpecialist) || !selectedTime) return;
    
    setIsSubmitting(true);
    setPaymentError(null);
    
    let targetStaff = selectedStaff;

    // If "Any Specialist", find the first one available for this specific time
    if (anySpecialist) {
      targetStaff = staffList.find(b => {
        const slots = generateSlots(selectedDate, b, selectedService, existingAppointments.filter(a => a.staffId === b.id));
        return slots.includes(selectedTime);
      }) || null;
    }

    if (!targetStaff) {
      console.error("No specialist available for chosen time.");
      setIsSubmitting(false);
      return;
    }

    let initialStatus: AppointmentStatus = "pending";
    let initialPaymentStatus: PaymentStatus | undefined;
    if (paymentsRequired) {
      initialStatus = "pending";
      if (PAYMENT_CONFIG.mode === "deposit") initialPaymentStatus = "deposit_required";
      else if (PAYMENT_CONFIG.mode === "full") initialPaymentStatus = "pending";
    } else {
      initialStatus = "confirmed";
    }

    const newAppointment: Omit<Appointment, "id" | "createdAt"> = {
      customerName: customerInfo.name,
      customerEmail: customerInfo.email,
      customerPhone: customerInfo.phone,
      serviceId: selectedService.id,
      staffId: targetStaff.id,
      date: format(selectedDate, "yyyy-MM-dd"),
      time: selectedTime,
      duration: selectedService.duration,
      status: initialStatus,
      ...(initialPaymentStatus !== undefined ? { paymentStatus: initialPaymentStatus } : {}),
    };

    try {
      const id = await dbService.saveAppointment(newAppointment);
      setAppointmentId(id);

      // Trigger owner notification (background)
      fetch("/api/notify-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          appointmentId: id, 
          details: { ...newAppointment, service: selectedService.name, staff: targetStaff.name } 
        }),
      }).catch(err => console.error("Notification trigger failed:", err));

      if (paymentsRequired) {
        const amount = PAYMENT_CONFIG.mode === 'deposit' 
          ? PAYMENT_CONFIG.depositAmount || 2000 
          : selectedService.price * 100;

        const response = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointmentId: id,
            price: amount,
            name: selectedService.name,
            customerEmail: customerInfo.email,
            mode: PAYMENT_CONFIG.mode,
          }),
        });

        const data = await response.json();

        if (data.url) {
          window.location.href = data.url;
          return;
        } else {
          console.warn("Stripe redirect failed:", data.error);
          setPaymentError(typeof data.error === "string" ? data.error : "Checkout could not be started.");
          setStep("payment");
        }
      } else {
        setStep("success");
      }
    } catch (error) {
      console.error("Booking failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!appointmentId) return;
    setIsCancelling(true);
    try {
      await dbService.updateAppointment(appointmentId, { status: "cancelled" });
      setIsCancelled(true);
    } catch (error) {
      console.error("Cancellation failed:", error);
    } finally {
      setIsCancelling(false);
    }
  };

  const runAiConsultation = async () => {
    if (!aiQuery.trim()) return;
    setIsConsulting(true);
    setAiAdvice(null);
    try {
      const result = await aiService.getStyleConsultation(aiQuery, SERVICES);
      if (result) {
        setAiAdvice(result.advice);
        if (result.serviceId) {
          const service = SERVICES.find(s => s.id === result.serviceId);
          if (service) setSelectedService(service);
        }
      }
    } catch (err) {
      console.error("AI Consult failed:", err);
    } finally {
      setIsConsulting(false);
    }
  };

  const renderHeader = () => {
    const steps: { key: Step; label: string; icon: any }[] = [
      { key: "service", label: config.steps.service, icon: Scissors },
      { key: "staff", label: config.steps.staff, icon: User },
      { key: "datetime", label: config.steps.datetime, icon: CalendarIcon },
      { key: "details", label: config.steps.details, icon: UserCircle },
      ...(paymentsRequired ? [{ key: "payment", label: config.steps.payment, icon: CreditCard } as const] : []),
    ];

    if (step === "success") return null;

    return (
      <div className="flex items-center justify-between mb-8 px-2 overflow-x-auto no-scrollbar">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          const isActive = step === s.key;
          const isDone = steps.findIndex(st => st.key === step) > idx;

          return (
             <React.Fragment key={s.key}>
                <div className="flex flex-col items-center gap-2 min-w-[60px]">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                    isActive ? "scale-110 border-accent-light bg-accent-light text-zinc-950" :
                    isDone ? "border-primary/40 bg-muted text-primary" :
                    "border-border bg-card text-muted-foreground"
                  )}>
                    <Icon size={18} />
                  </div>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-tighter",
                    isActive ? "text-accent-light" : "text-muted-foreground"
                  )}>{s.label}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div className="mx-4 min-h-[2px] min-w-[20px] flex-1 bg-border" />
                )}
             </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full max-h-[90vh]">
      <div className="mb-6 flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">{config.title}</h2>
           <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{config.tagline}</p>
        </div>
        <button type="button" onClick={handleClose} className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <X size={24} />
        </button>
      </div>

      {renderHeader()}

      <div className="flex-1 overflow-y-auto no-scrollbar pr-1">
        <AnimatePresence mode="wait">
          {step === "service" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              key="service"
              className="space-y-4"
            >
              <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Choose a service</h3>
              
              {/* AI Consultant Trigger */}
              <div className="group relative mb-6 overflow-hidden rounded-3xl border border-border bg-muted/40 p-6 backdrop-blur-sm transition-all hover:border-accent-light/40">
                 <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Sparkles size={60} />
                 </div>
                 
                 {!showAiConsult ? (
                   <div className="flex items-center justify-between gap-4">
                      <div>
                         <p className="text-accent-light text-[9px] font-black uppercase tracking-[0.2em] mb-1">{config.aiConsultant.title}</p>
                         <h4 className="text-sm font-black uppercase tracking-tight text-foreground">{config.aiConsultant.subtitle}</h4>
                         <p className="mt-1 text-[10px] text-muted-foreground">{config.aiConsultant.description}</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setShowAiConsult(true)}
                        className="rounded-xl border border-border bg-card p-3 text-accent-light shadow-sm transition-all hover:bg-accent-light hover:text-zinc-950 active:scale-95"
                      >
                         <Sparkles size={20} />
                      </button>
                   </div>
                 ) : (
                   <div className="space-y-4 relative z-10">
                      <div className="flex items-center justify-between">
                         <p className="text-accent-light text-[9px] font-black uppercase tracking-[0.2em]">{config.aiConsultant.agentLabel}</p>
                         <button type="button" onClick={() => setShowAiConsult(false)} className="text-muted-foreground transition-colors hover:text-foreground">
                            <X size={14} />
                         </button>
                      </div>
                      <div className="flex gap-2">
                         <input 
                           autoFocus
                           value={aiQuery}
                           onChange={(e) => setAiQuery(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && runAiConsultation()}
                           placeholder={config.aiConsultant.placeholder}
                           className={fieldAi}
                         />
                         <button 
                           type="button"
                           onClick={runAiConsultation}
                           disabled={isConsulting || !aiQuery.trim()}
                           className="flex min-w-[44px] items-center justify-center rounded-xl bg-primary p-3 text-primary-foreground transition-all duration-300 hover:bg-accent-light hover:text-zinc-950 disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground"
                         >
                            {isConsulting ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" /> : <Send size={18} />}
                         </button>
                      </div>
                      {aiAdvice && (
                        <motion.div 
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-xl border border-border bg-card/95 p-4 backdrop-blur-sm"
                        >
                           <p className="text-xs italic leading-relaxed text-muted-foreground">"{aiAdvice}"</p>
                           {selectedService && (
                             <div className="mt-2 flex items-center gap-2">
                                <CheckCircle size={12} className="text-emerald-500" />
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Selected: {selectedService.name}</span>
                             </div>
                           )}
                        </motion.div>
                      )}
                   </div>
                 )}
              </div>

              <div className="grid gap-3">
                {SERVICES.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => { setSelectedService(s); setStep("staff"); }}
                    className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:border-accent-light/50"
                  >
                    <div>
                      <h4 className="font-bold text-foreground transition-colors group-hover:text-accent-light">{s.name}</h4>
                      <p className="mt-1 text-xs text-muted-foreground">{s.duration} mins • ${s.price}</p>
                    </div>
                    <ChevronRight size={20} className="text-muted-foreground transition-colors group-hover:text-accent-light" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === "staff" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              key="staff"
              className="space-y-4"
            >
              <button 
                type="button"
                onClick={() => setStep("service")}
                className="mb-4 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronLeft size={14} /> Back to services
              </button>
              <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Choose a staff member</h3>
              <div className="grid gap-4">
                {/* Any Specialist Option */}
                <button
                  type="button"
                  onClick={() => { setAnySpecialist(true); setSelectedStaff(null); setStep("datetime"); }}
                  className="group flex items-center gap-5 rounded-2xl border border-border bg-muted/40 p-4 text-left backdrop-blur-sm transition-all hover:border-accent-light/50"
                >
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-border bg-card text-accent-light transition-transform group-hover:scale-105">
                    <User size={32} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-foreground transition-colors group-hover:text-accent-light">Any Available Specialist</h4>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Maximum Operational Flexibility</p>
                  </div>
                  <ChevronRight size={20} className="text-muted-foreground transition-colors group-hover:text-accent-light" />
                </button>

                <div className="my-2 h-px bg-border" />

                {staffList.map((b) => (
                  <button
                    type="button"
                    key={b.id}
                    onClick={() => { setSelectedStaff(b); setAnySpecialist(false); setStep("datetime"); }}
                    className="group flex items-center gap-5 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:border-accent-light/50"
                  >
                    <div className="h-16 w-16 overflow-hidden rounded-xl grayscale transition-all group-hover:grayscale-0">
                      <img src={b.photoUrl} className="h-full w-full object-cover" alt={b.name} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-foreground transition-colors group-hover:text-accent-light">{b.name}</h4>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{b.specialty}</p>
                    </div>
                    <ChevronRight size={20} className="text-muted-foreground transition-colors group-hover:text-accent-light" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === "datetime" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              key="datetime"
              className="space-y-6"
            >
              <button 
                type="button"
                onClick={() => setStep("staff")}
                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronLeft size={14} /> Back to staff
              </button>

              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
                <div className="shrink-0 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                      Choose date
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {format(selectedDate, "MMM d, yyyy")}
                    </span>
                  </div>
                  <Calendar
                    selected={selectedDate}
                    onSelect={(d) => setSelectedDate(startOfDay(d))}
                    disabled={(d) =>
                      isBefore(startOfDay(d), startOfDay(new Date()))
                    }
                    className="max-w-full border-border bg-card shadow-elevated sm:max-w-[340px]"
                  />
                </div>

                <div className="min-w-0 flex-1 space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Available Times</h3>
                {availableSlots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {availableSlots.map((time) => (
                      <button
                        type="button"
                        key={time}
                        onClick={() => { setSelectedTime(time); setStep("details"); }}
                        className={cn(
                          "rounded-xl border py-3 text-sm font-bold transition-all",
                          selectedTime === time ? "border-accent-light bg-accent-light text-zinc-950" : "border-border bg-card text-foreground hover:border-primary/40 dark:bg-card/90"
                        )}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border bg-muted/50 p-8 text-center backdrop-blur-sm">
                    <p className="text-sm font-bold uppercase italic tracking-widest text-muted-foreground">Fully booked for this date</p>
                  </div>
                )}
                </div>
              </div>
            </motion.div>
          )}

          {step === "details" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              key="details"
              className="space-y-6"
            >
              <button 
                type="button"
                onClick={() => setStep("datetime")}
                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronLeft size={14} /> Back to time selection
              </button>

              <div className="space-y-4 rounded-3xl border border-border bg-muted/40 p-6 shadow-inner backdrop-blur-sm">
                 <div className="flex items-start justify-between">
                    <div>
                       <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-accent-light">Appointment Summary</p>
                       <h4 className="text-xl font-black uppercase tracking-tight text-foreground">{selectedService?.name}</h4>
                    </div>
                    <span className="font-black text-foreground">${selectedService?.price}</span>
                 </div>
                 <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                       <User size={14} className="text-accent-light" />
                       {anySpecialist ? "Any Available Specialist" : selectedStaff?.name}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                       <Clock size={14} className="text-accent-light" />
                       {format(selectedDate, "MMM d")} @ {selectedTime}
                    </div>
                 </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Contact Details</h3>
                <div className="space-y-3">
                  <div className="group relative">
                    <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" size={20} />
                    <input
                      placeholder="Full Name"
                      className={fieldWithIcon}
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                    />
                  </div>
                  <div className="group relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" size={20} />
                    <input
                      placeholder="Email Address"
                      className={fieldWithIcon}
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                    />
                  </div>
                  <div className="group relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" size={20} />
                    <input
                      placeholder="Phone Number"
                      className={fieldWithIcon}
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={!customerInfo.name || !customerInfo.email || !customerInfo.phone || isSubmitting}
                onClick={handleConfirm}
                className={btnPrimaryFull}
              >
                {isSubmitting ? (
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                ) : (
                  <>
                    <CheckCircle size={22} />
                    <span>Confirm Booking</span>
                  </>
                )}
              </button>
            </motion.div>
          )}

          {step === "payment" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              key="payment"
              className="space-y-6 py-6 text-center"
            >
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-accent-light/25 bg-accent-light/10">
                <AlertCircle className="text-accent-light" size={40} />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-tight text-foreground">Stripe Setup Required</h3>
                <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
                  {paymentError || "The payment system is being configured. Please contact the administrator to complete your booking."}
                </p>
              </div>

              <div className="space-y-4 rounded-3xl border border-border bg-card/95 p-6 text-left shadow-elevated backdrop-blur-md dark:bg-card/90">
                 <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Wait-list Reserved</p>
                 <p className="text-sm font-bold text-foreground">Your details for {format(selectedDate, "MMM d")} @ {selectedTime} have been saved.</p>
                 <p className="text-xs text-muted-foreground">Once Stripe is configured, you will receive a payment link via email.</p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="mt-4 w-full rounded-2xl border border-border bg-secondary p-5 font-black uppercase tracking-widest text-secondary-foreground transition-colors hover:bg-muted"
              >
                Close & Notify Me Later
              </button>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              key="success"
              className="space-y-6 py-12 text-center"
            >
              {isCancelled ? (
                <>
                  <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full border border-red-500/25 bg-red-500/10">
                    <X className="text-red-500" size={60} />
                  </div>
                  <h2 className="text-4xl font-black uppercase tracking-tight text-foreground">{config.success.cancelled}</h2>
                  <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">
                    Your appointment has been successfully cancelled.
                  </p>
                  
                  <button
                    type="button"
                    onClick={handleClose}
                    className="mt-4 w-full rounded-2xl bg-primary p-4 font-bold uppercase tracking-widest text-primary-foreground shadow-md transition-colors hover:bg-accent-light hover:text-zinc-950"
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10">
                    <CheckCircle className="text-emerald-500" size={60} />
                  </div>
                  <h2 className="text-4xl font-black uppercase tracking-tight text-foreground">
                    {
                      (new URLSearchParams(window.location.search).get("booking_status") === "success" || !paymentsRequired)
                       ? config.success.confirmed 
                       : config.success.requestSaved
                    }
                  </h2>
                  <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">
                    {
                      new URLSearchParams(window.location.search).get("booking_status") === "success" 
                        ? "Excellent. Your payment was successful and your spot is strictly reserved." 
                        : !paymentsRequired
                          ? "Success! Your chair is reserved and we've added you to the calendar. We'll see you soon."
                          : "Your booking is saved in our system! We're just waiting for payment verification. A team member will review it and confirm your final slot shortly."
                    }
                  </p>
                  
                  {selectedService && (
                    <div className="inline-block w-full rounded-3xl border border-border bg-card/95 p-6 text-left shadow-elevated backdrop-blur-md dark:bg-card/90">
                       <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground underline decoration-accent-light underline-offset-4">Your Appointment</p>
                       <p className="font-bold text-foreground">{format(selectedDate, "EEEE, MMMM do")}</p>
                       <p className="text-2xl font-black tracking-tighter text-accent-light">{selectedTime}</p>
                       <div className="mt-4 flex items-center gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
                          <User size={14} className="text-accent-light" />
                          {anySpecialist ? "Assigned Specialist" : `Staff: ${selectedStaff?.name}`}
                       </div>
                    </div>
                  )}

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={isCancelling || !appointmentId}
                      className="w-full rounded-xl border border-border bg-transparent p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-red-500/40 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isCancelling ? "Cancelling..." : "Cancel"}
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="w-full rounded-xl bg-primary p-4 text-xs font-bold uppercase tracking-widest text-primary-foreground shadow-md transition-colors hover:bg-accent-light hover:text-zinc-950"
                    >
                      Done
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
