import { crmAppointments } from "../../services/crm-appointments";
import React from "react";
import { ordenarPorHora } from "../../lib/agenda";
import { currencySymbol } from "../../lib/currency";
import { datePattern, getDateFnsLocale } from "../../lib/dateLocale";
import { useCustomerList } from "../../hooks/useCustomerList";
import { CustomerLoadNotice } from "./CustomerLoadNotice";
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
  BookOpen,
  UserCog,
  CheckSquare,
  MoreHorizontal,
} from "lucide-react";
import { Appointment, AppointmentStatus, StaffMember, ContactInboxItem } from "../../types";
import { format, parse, startOfDay } from "date-fns";
import { cn } from "../../lib/utils";
import { dbService } from "../../services/db";
import { siteConfig } from "../../config/site";
import { localeConfig } from "../../config/locale";
import { TOUR_CONFIG } from "../../config/tour.config";
import { DEMO_APPOINTMENTS, DEMO_INBOX } from "../../config/demo-data";
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
import { KnowledgeTab } from "./KnowledgeTab";
import { UsersTab } from "./UsersTab";
import { TasksTab } from "./TasksTab";
import { AppointmentCalendar } from "./AppointmentCalendar";
import { AgendaDia, useAncho } from "./crm03/AgendaDia";
import { useModalA11y } from "../../hooks/useModalA11y";
import { TurnoNuevo, type ModoTurno } from "./crm03/TurnoNuevo";
import { ThemeToggle } from "../theme/ThemeToggle";
import { useTheme } from "../theme/ThemeProvider";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";
import { useToast } from "../ui/Toast";
import { Calendar } from "../ui/calendar";
import { auth as firebaseAuth } from "../../lib/firebase";
import { signOut } from "firebase/auth";
import { pestanasDeRol } from "../../lib/admin-users";
import { useRolAdmin } from "./ProtectedRoute";
import { tx } from "./crm03/textos";
import type { Trato } from "./crm03/textos-pantallas";

export function AdminDashboard({ onExit }: { onExit: () => void }) {
  const { services: SERVICES, brand } = siteConfig;
  const t = localeConfig.admin.dashboard;
  const isSolo = siteConfig.features.showAbout && !siteConfig.features.showTeam;
  const toast = useToast();

  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  // CRM-04 (D-345): mientras el panel está montado, el tema es el suyo; al volver a la web, el del nicho.
  const { usarTemaDelPanel } = useTheme();
  React.useEffect(() => { usarTemaDelPanel(true); return () => usarTemaDelPanel(false); }, [usarTemaDelPanel]);
  const [staffList, setStaffList] = React.useState<StaffMember[]>(siteConfig.staff);
  const [filterDate, setFilterDate] = React.useState(new Date());
  const [filterStaff, setFilterStaff] = React.useState<string>("all");
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [showWalkIn, setShowWalkIn] = React.useState(false);
  const { customers: crmCustomers, loading: customersLoading, error: customersError, refresh: refreshCustomers } = useCustomerList();
  const walkInFlight = React.useRef(false);
  // La confirmación vive con la operación, no con los campos editables del formulario.
  type WalkInOperation = {
    customer: Parameters<typeof import("../../services/customers").customerService.upsertByEmail>[0];
    appointment: Parameters<typeof dbService.createAppointment>[0];
    notification: Parameters<typeof import("../../lib/appointment-notify-client").notifyAppointmentBooked>[0] | null;
    claimSlot: boolean;
    contactId?: string;
    appointmentId?: string;
    appointmentRejected?: boolean;
    forceAllowed?: boolean;
    uncertain?: boolean;
    complete?: boolean;
  };
  const confirmedWalkIn = React.useRef<WalkInOperation | null>(null);
  const [walkInState, setWalkInState] = React.useState<"editable" | "pending" | "unknown" | "complete">("editable");
  const [crmInbox, setCrmInbox] = React.useState<ContactInboxItem[]>([]);
  const [walkInForm, setWalkInForm] = React.useState({ name: "", phone: "", serviceId: "", staffId: "", trato: "n" as Trato });
  const [walkInSaving, setWalkInSaving] = React.useState(false);
  const [attendanceConfirmed, setAttendanceConfirmed] = React.useState(false);
  // CRM-03 diseño: el diálogo «תור חדש» — qué se registra, y la fecha y la hora del turno.
  const [modoTurno, setModoTurno] = React.useState<ModoTurno>("turno");
  const [fechaTurno, setFechaTurno] = React.useState(() => format(new Date(), "yyyy-MM-dd"));
  const [horaTurno, setHoraTurno] = React.useState("");
  const [walkInError, setWalkInError] = React.useState<string | null>(null);
  // True after a manifest conflict: the next submit overbooks on purpose.
  const [walkInConflict, setWalkInConflict] = React.useState(false);

  const walkInLocked = walkInSaving || walkInState === "pending" || walkInState === "unknown";
  const [appointmentView, setAppointmentView] = React.useState<"list" | "calendar">("list");

  const canReviseRejected = (op: WalkInOperation | null): op is WalkInOperation =>
    !!op?.contactId && !!op.appointmentRejected && !op.appointmentId && !op.uncertain && !op.complete;

  const cancelRejectedWalkIn = () => {
    const op = confirmedWalkIn.current;
    if (walkInFlight.current || !canReviseRejected(op)) return;
    // Termina sólo el intento rechazado. El contacto guardado no se borra ni se reescribe.
    op.complete = true;
    setWalkInState("complete");
    setWalkInConflict(false);
    setWalkInError(null);
    setWalkInForm({ name: "", phone: "", serviceId: "", staffId: "", trato: "n" as Trato });
    setQuickAddSlot(null);
    setShowWalkIn(false);
    toast.info(localeConfig.admin.common.walkInAppointmentCancelled);
  };

  const chooseRejectedWalkInTime = () => {
    if (walkInFlight.current || !canReviseRejected(confirmedWalkIn.current)) return;
    setAppointmentView("calendar");
    setShowWalkIn(false);
  };

  const closeWalkIn = () => {
    if (walkInFlight.current) return;
    setShowWalkIn(false);
    // Ocultar no descarta una escritura confirmada ni un resultado incierto.
    if (!confirmedWalkIn.current || confirmedWalkIn.current.complete) {
      setWalkInForm({ name: "", phone: "", serviceId: "", staffId: "", trato: "n" as Trato });
      setQuickAddSlot(null);
      setWalkInError(null);
      setWalkInConflict(false);
    }
  };

  const openWalkIn = () => {
    if (walkInFlight.current) return;
    if (!confirmedWalkIn.current || confirmedWalkIn.current.complete) {
      confirmedWalkIn.current = null;
      setAttendanceConfirmed(false);
      setWalkInState("editable");
      setWalkInError(null);
      setWalkInConflict(false);
      setWalkInForm({ name: "", phone: "", serviceId: "", staffId: "", trato: "n" as Trato });
      setQuickAddSlot(null);
      setModoTurno("turno");
      setFechaTurno(format(filterDate, "yyyy-MM-dd"));
      setHoraTurno("");
    }
    setShowWalkIn(true);
  };

  const handleWalkIn = async (elegido?: { date: string; time: string } | null, visitaConfirmada = false) => {
    const slot = elegido === undefined ? quickAddSlot : elegido;
    if (walkInFlight.current || confirmedWalkIn.current?.uncertain || confirmedWalkIn.current?.complete || !walkInForm.name.trim() || !walkInForm.phone.trim()) return;
    // Un turno rechazado por superposición con otra hora elegida en el mismo diálogo: el mismo contacto, la cita con la hora nueva.
    const previo = confirmedWalkIn.current;
    if (slot && canReviseRejected(previo) && (previo.appointment.date !== slot.date || previo.appointment.time !== slot.time)) {
      previo.appointment = { ...previo.appointment, date: slot.date, time: slot.time, status: "confirmed" };
      if (previo.notification) previo.notification = { ...previo.notification, date: slot.date, time: slot.time };
      previo.claimSlot = parse(`${slot.date} ${slot.time}`, "yyyy-MM-dd HH:mm", new Date()) > new Date();
      previo.forceAllowed = false;
      setWalkInConflict(false);
    }
    if (!confirmedWalkIn.current && !slot && !attendanceConfirmed && !visitaConfirmada) {
      setWalkInError(localeConfig.admin.common.attendanceRequired);
      return;
    }
    walkInFlight.current = true;
    setWalkInSaving(true);
    setWalkInError(null);
    let stage: "dependencies" | "contact" | "appointment" | "notification-load" | "notification-invoke" = "dependencies";
    try {
      const { dbService: db } = await import("../../services/db");
      const { customerService } = await import("../../services/customers");
      if (!confirmedWalkIn.current) {
        const now = new Date();
        const normalizedPhone = walkInForm.phone.trim().replace(/[^0-9+]/g, "");
        const email = normalizedPhone ? `walkin_${normalizedPhone}@noemail.local` : `walkin_${Date.now()}@noemail.local`;
        const serviceId = walkInForm.serviceId || (SERVICES[0]?.id ?? "");
        const staffId = walkInForm.staffId || (staffList[0]?.id ?? "");
        const service = SERVICES.find((s) => s.id === walkInForm.serviceId);
        const date = slot?.date ?? format(now, "yyyy-MM-dd");
        const time = slot?.time ?? format(now, "HH:mm");
        const customerName = walkInForm.name.trim();
        const customerPhone = walkInForm.phone.trim();
        confirmedWalkIn.current = {
          customer: { fullName: customerName, email, phone: customerPhone, source: "walkin", ...(walkInForm.trato !== "n" ? { trato: walkInForm.trato } : {}), ...(!slot && walkInForm.serviceId ? { lastServiceId: walkInForm.serviceId } : {}) },
          appointment: { customerName, customerEmail: email, customerPhone, serviceId, staffId, date, time, duration: service?.duration ?? 30, status: slot ? "confirmed" : "completed", type: "appointment" },
          claimSlot: !!slot && parse(`${date} ${time}`, "yyyy-MM-dd HH:mm", now) > now,
          notification: slot ? { date, time, serviceName: SERVICES.find((s) => s.id === serviceId)?.name, staffName: staffList.find((s) => s.id === staffId)?.name, staffId, customerName, customerPhone, duration: service?.duration ?? 30 } : null,
        };
      }
      const op = confirmedWalkIn.current;
      if (!op.contactId) {
        stage = "contact";
        op.contactId = await customerService.upsertByEmail(op.customer);
        if (!op.contactId) throw new Error("Contacto sin confirmación");
        setWalkInState("pending");
        // La carga compartida muestra su propio fallo; nunca repite esta operación.
        void refreshCustomers().catch(() => {});
      }
      if (!op.appointmentId) {
        stage = "appointment";
        op.appointmentRejected = false;
        op.appointmentId = await db.createAppointment(op.appointment, { claimSlot: op.claimSlot, force: !!op.forceAllowed });
        if (!op.appointmentId) throw new Error("Cita sin confirmación");
        setWalkInConflict(false);
      }
      if (op.notification) {
        stage = "notification-load";
        const { notifyAppointmentBooked } = await import("../../lib/appointment-notify-client");
        stage = "notification-invoke";
        // Completa la entrega al helper local; su contrato no confirma entrega externa.
        // CRM-04 (D-343): el servidor lee el email del turno guardado, así que va su id.
        notifyAppointmentBooked({ ...op.notification, appointmentId: op.appointmentId });
      }
      op.complete = true;
      setWalkInState("complete");
      setWalkInForm({ name: "", phone: "", serviceId: "", staffId: "", trato: "n" as Trato });
      setQuickAddSlot(null);
      setShowWalkIn(false);
      setWalkInConflict(false);
    } catch (err) {
      console.error("[WalkIn]", err);
      const op = confirmedWalkIn.current;
      const common = localeConfig.admin.common;
      if (stage === "appointment" && err instanceof Error && err.name === "SlotConflictError") {
        if (op) {
          op.appointmentRejected = true;
          op.forceAllowed = true;
        }
        setWalkInConflict(true);
        setWalkInError(t.walkIn.conflict);
      } else if (stage === "notification-load") {
        setWalkInError(common.walkInNotificationPending);
      } else if (stage === "dependencies") {
        setWalkInError(op?.appointmentId ? common.walkInNotificationPending : op?.contactId ? common.customerSavedAppointmentPending : common.toastCustomerError);
      } else if (stage === "contact" && err && typeof err === "object" && "code" in err && ["permission-denied", "unauthenticated"].includes(String(err.code))) {
        // Rechazo explícito sin confirmación: permite corregir el formulario.
        confirmedWalkIn.current = null;
        setWalkInState("editable");
        setWalkInError(common.toastCustomerError);
      } else {
        if (op) op.uncertain = true;
        setWalkInState("unknown");
        setWalkInError(op?.appointmentId ? common.walkInNotificationUnknown : op?.contactId ? common.walkInAppointmentUnknown : common.walkInContactUnknown);
      }
    } finally {
      walkInFlight.current = false;
      setWalkInSaving(false);
    }
  };

  // Subscription error state
  const [subscriptionError, setSubscriptionError] = React.useState<string | null>(null);
  const [appointmentsLoaded, setAppointmentsLoaded] = React.useState(false);

  type AdminTab = "missions" | "personnel" | "customers" | "inbox" | "logs" | "rules" | "overview" | "support" | "payments" | "stock" | "knowledge" | "users" | "tasks";

  const VALID_TABS: ReadonlySet<string> = new Set<AdminTab>(["missions", "personnel", "customers", "inbox", "logs", "rules", "overview", "support", "payments", "stock", "knowledge", "users", "tasks"]);

  const readTabFromHash = (): AdminTab => {
    const h = window.location.hash.replace("#", "");
    return VALID_TABS.has(h) ? (h as AdminTab) : "missions";
  };

  // Start at "missions" — the correct tab is applied in useLayoutEffect (before
  // first paint) so there is no visible flash, but the hash is only read AFTER
  // auth is confirmed and the component tree is fully mounted.
  const [activeTab, setActiveTabRaw] = React.useState<AdminTab>("missions");

  const setActiveTab = React.useCallback((tab: AdminTab) => {
    setActiveTabRaw(tab);
    window.history.replaceState(null, "", `/admin#${tab}`);
  }, []);

  React.useLayoutEffect(() => {
    setActiveTabRaw(readTabFromHash());
  }, []);

  React.useEffect(() => {
    const onHashChange = () => setActiveTabRaw(readTabFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // CRM-03 (D-305): el rol con que entró (ProtectedRoute lo resolvió con adminEmail o GET /api/admin/me). Sin un «owner» por defecto:
  // fuera de la puerta el contexto da el menor. El servidor sigue verificando cada llamada.
  const { rol: currentRole, email: currentEmail } = useRolAdmin();
  const pestanas = React.useMemo(() => new Set<string>(pestanasDeRol(currentRole)), [currentRole]);

  // Sidebar badge (Bloque J): poll task count assigned to current user every
  // 60s. Cheap because /api/tasks already pre-filters by visibility server-side.
  const [tasksBadgeCount, setTasksBadgeCount] = React.useState<number>(0);
  React.useEffect(() => {
    if (TOUR_CONFIG.isDemoMode) {
      // Pull from demo dataset to show a non-zero badge in tours.
      import("../../config/demo-data").then(({ DEMO_TASKS }) => {
        const count = DEMO_TASKS.filter(
          (task) =>
            task.assignedTo === (siteConfig.adminEmail || "owner@demo.local") &&
            (task.status === "pending" || task.status === "in_progress"),
        ).length;
        setTasksBadgeCount(count);
      });
      return;
    }
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const user = firebaseAuth?.currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const params = new URLSearchParams({ status: "open" });
        if (user.email) params.set("assignedTo", user.email.toLowerCase());
        const res = await fetch(`/api/tasks?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { total?: number };
        if (!cancelled) setTasksBadgeCount(Number(data.total ?? 0));
      } catch {
        // non-fatal
      }
    };
    void fetchCount();
    const id = setInterval(fetchCount, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

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
      setAppointmentsLoaded(true);
      setCrmInbox(DEMO_INBOX as ContactInboxItem[]);
      return;
    }

    let appUnsubscribe: (() => void) | undefined;

    dbService.getStaff().then(setStaffList);

    try {
      appUnsubscribe = crmAppointments.subscribe(
        (data) => {
          setAppointments(data);
          setAppointmentsLoaded(true);

        },
        (msg) => { if (msg) console.warn("[CRM] sincronización de turnos:", msg); setSubscriptionError(msg); },
      );
    } catch (err: unknown) {
      console.error("Subscription failed:", err);
      setSubscriptionError(err instanceof Error ? err.message : localeConfig.admin.common.connectionFailed);
    }

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
    return ordenarPorHora(appointments.filter((app) => {
      const dateMatch = app.date === format(filterDate, "yyyy-MM-dd");
      const staffMatch = filterStaff === "all" || app.staffId === filterStaff;
      return dateMatch && staffMatch;
    }));
  }, [filterDate, filterStaff, appointments]);

  const stats = React.useMemo(() => {
    const today = appointments.filter((a) => a.date === format(new Date(), "yyyy-MM-dd"));
    // CRM-02: la misma cuenta que «היום» del Resumen (un turno terminado no es «pendiente» y también es ingreso).
    const confirmed = today.filter((a) => a.status === "confirmed" || a.status === "completed");
    const pending = today.filter((a) => a.status === "pending").length;
    const revenue = today.filter((a) => a.status !== "cancelled").reduce((acc, curr) => {
      const s = SERVICES.find((sv) => sv.id === curr.serviceId);
      return acc + (curr.amountPaidCents != null ? curr.amountPaidCents / 100 : (s?.price || 0));
    }, 0);
    return { count: today.length, confirmed: confirmed.length, pending, revenue };
  }, [appointments]);

  // Keep CRM store in sync so the admin chatbot has live data
  React.useEffect(() => {
    if (customersLoading || customersError) {
      setCrmSnapshot(null);
      return;
    }
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
    return () => setCrmSnapshot(null);
  }, [appointments, staffList, SERVICES, crmCustomers, crmInbox, customersLoading, customersError]);

  const handleStatusChange = async (id: string, status: AppointmentStatus) => {
    try {
      const prev = appointments.find((a) => a.id === id);
      if (!prev) throw new Error("appointment_missing");
      await crmAppointments.update(prev, { status });
      // Notify agent on cancellation so reminders/reviews are cancelled and
      // the customer gets a WhatsApp notice. Fire-and-forget.
      if (status === "cancelled" && prev) {
        const { notifyAppointmentCancelled } = await import("../../lib/appointment-notify-client");
        notifyAppointmentCancelled({
          appointmentId: crmAppointments.documentId(prev),
          date: prev.date,
          time: prev.time,
          serviceName: SERVICES.find((s) => s.id === prev.serviceId)?.name,
          staffName: staffList.find((s) => s.id === prev.staffId)?.name,
          staffId: prev.staffId,
          customerName: prev.customerName,
          customerPhone: prev.customerPhone,
          customerEmail: prev.customerEmail,
          duration: prev.duration,
        });
      }
    } catch (err) {
      console.error(err);
      toast.error(localeConfig.admin.common.appointmentUpdateError);
    }
  };

  // Optimistic reschedule for the week/day calendar. Updates local state
  // immediately so the dragged block snaps to its new spot, reverts if the
  // Firestore write rejects. Calendar overlap check runs before this fires.
  const handleReschedule = React.useCallback(
    async (id: string, date: string, time: string) => {
      const prev = appointments.find((a) => a.id === id);
      if (!prev) throw new Error("appointment_missing");
      setAppointments((current) =>
        current.map((a) => (a.id === id ? { ...a, date, time } : a)),
      );
      try {
        await crmAppointments.update(prev, { date, time });
        // Notify agent of the reschedule so reminders get re-programmed. Fire-and-forget.
        const { notifyAppointmentRescheduled } = await import("../../lib/appointment-notify-client");
        const serviceName = SERVICES.find((s) => s.id === prev.serviceId)?.name;
        const staffName = staffList.find((s) => s.id === prev.staffId)?.name;
        notifyAppointmentRescheduled(
          {
            appointmentId: crmAppointments.documentId(prev),
            date: prev.date,
            time: prev.time,
            serviceName,
            staffName,
            staffId: prev.staffId,
            customerName: prev.customerName,
            customerPhone: prev.customerPhone,
          customerEmail: prev.customerEmail,
            duration: prev.duration,
          },
          {
            appointmentId: crmAppointments.documentId(prev),
            date,
            time,
            serviceName,
            staffName,
            staffId: prev.staffId,
            customerName: prev.customerName,
            customerPhone: prev.customerPhone,
          customerEmail: prev.customerEmail,
            duration: prev.duration,
          },
        );
      } catch (err) {
        // Revert local state so the block snaps back.
        setAppointments((current) =>
          current.map((a) => (a.id === id ? prev : a)),
        );
        throw err;
      }
    },
    [appointments, SERVICES, staffList],
  );

  const [quickAddSlot, setQuickAddSlot] = React.useState<{ date: string; time: string } | null>(null);

  const handleQuickAdd = React.useCallback(
    (date: string, time: string) => {
      if (walkInFlight.current) return;
      const op = confirmedWalkIn.current;
      if (canReviseRejected(op)) {
        const now = new Date();
        // Nuevo intento de cita para el mismo contacto confirmado, nunca otro upsert.
        op.appointment = { ...op.appointment, date, time, status: "confirmed" };
        op.notification = {
          ...(op.notification ?? {
            serviceName: SERVICES.find((service) => service.id === op.appointment.serviceId)?.name,
            staffName: staffList.find((staff) => staff.id === op.appointment.staffId)?.name,
            staffId: op.appointment.staffId,
            customerName: op.appointment.customerName,
            customerPhone: op.appointment.customerPhone,
            duration: op.appointment.duration,
          }),
          date,
          time,
        };
        op.claimSlot = parse(date + " " + time, "yyyy-MM-dd HH:mm", now) > now;
        op.forceAllowed = false;
        setWalkInConflict(false);
        setWalkInError(localeConfig.admin.common.walkInTimeChanged);
        setQuickAddSlot({ date, time });
        setFechaTurno(date);
        setHoraTurno(time);
        setShowWalkIn(true);
        return;
      }
      if (confirmedWalkIn.current && !confirmedWalkIn.current.complete) {
        setShowWalkIn(true);
        return;
      }
      confirmedWalkIn.current = null;
      setAttendanceConfirmed(false);
      setWalkInState("editable");
      setWalkInError(null);
      setWalkInConflict(false);
      setWalkInForm({ name: "", phone: "", serviceId: "", staffId: "", trato: "n" as Trato });
      setQuickAddSlot({ date, time });
      setModoTurno("turno");
      setFechaTurno(date);
      setHoraTurno(time);
      setShowWalkIn(true);
    },
    [SERVICES, staffList],
  );

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
    knowledge: t.tabs.knowledge,
    users: t.tabs.users,
    tasks: t.tabs.tasks ?? "Tasks",
  };

  // Per-role visibility. Server still enforces auth on every mutation; this
  // only declutters the sidebar. Owners see everything; managers lose
  // Knowledge (sensitive RAG); staff lose Knowledge, Users, Rules, and
  // Payments (read-only roles).
  // CRM-03 (D-305): cada rol ve lo de pestanasDeRol (la empleada, lo del día a día; gerente y dueña, todo).
  const canSeeUsers = pestanas.has("users");
  // CRM-02: la base de conocimiento sólo alimenta el chat con IA; sin chat no hay a quién enseñarle.
  const canSeeKnowledge = currentRole === "owner" && siteConfig.features.showChat !== false;
  const canSeePayments = pestanas.has("payments");
  const puede = (tab: AdminTab) => (tab === "knowledge" ? canSeeKnowledge : pestanas.has(tab));

  // Lo que se pinta nunca es una pestaña que el rol no ve, ni por un cuadro.
  const tabVisible: AdminTab = puede(activeTab) ? activeTab : "missions";
  // Una pestaña que el rol no ve (un link guardado, el rol que cambió) vuelve a la agenda.
  React.useEffect(() => {
    if (!puede(activeTab)) setActiveTab("missions");
  });

  // CRM-04: en el celular el menú es un diálogo: toma el foco, Tab no sale, Escape lo cierra y el foco vuelve a «תפריט».
  const esEscritorio = useAncho("(min-width: 1024px)");
  const cajonRef = useModalA11y(isSidebarOpen && !esEscritorio, () => setIsSidebarOpen(false));
  const navBtn = (key: AdminTab, Icon: typeof CalendarDays, label: string, badge?: number) => (
    <button
      key={key}
      onClick={() => {
        setActiveTab(key);
        setIsSidebarOpen(false);
      }}
      aria-current={activeTab === key ? "page" : undefined}
      className={cn(
        "relative flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-[15px] transition-colors lg:[@media(min-height:781px)_and_(max-height:860px)]:min-h-10 lg:[@media(max-height:780px)]:min-h-8",
        activeTab === key
          ? "bg-muted font-semibold text-foreground before:absolute before:inset-y-2.5 before:start-0 before:w-1 before:rounded-full before:bg-primary"
          : "font-medium text-foreground/80 hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <Icon size={18} />
      <span className="flex-1 text-start">{label}</span>
      {badge && badge > 0 ? (
        <span
          className="rounded-full bg-primary px-2 text-xs font-semibold tabular-nums text-primary-foreground"
          title={localeConfig.admin.tasks?.badge?.assignedToMe ?? "assigned to me"}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
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
        ref={cajonRef as unknown as React.RefObject<HTMLElement>}
        tabIndex={-1}
        {...(isSidebarOpen && !esEscritorio ? { role: "dialog", "aria-modal": true, "aria-label": tx().menu } : {})}
        className={cn("outline-none",
          "fixed inset-y-0 start-0 z-50 flex w-64 flex-col border-e border-border bg-card/95 backdrop-blur-md duration-300",
          "lg:flex lg:translate-x-0 lg:rtl:translate-x-0",
          // CRM-03 diseño: cerrado en el celular queda invisible — fuera de la pantalla no recibe foco ni toques.
          // Cerrado, en el celular sale del layout (fuera de la pantalla no recibe foco ni toques); al abrir entra deslizándose desde el borde
          // (@starting-style). Ocultarlo con visibility no sirve: la regla global de transiciones («all») anima la visibilidad heredada y
          // las entradas quedan «hidden» un instante después de abrir.
          isSidebarOpen ? "translate-x-0 transition-transform starting:translate-x-full starting:ltr:-translate-x-full" : "max-lg:hidden",
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <div aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Scissors size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">{brand.name}</p>
            <p className="text-xs text-muted-foreground">{t.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            aria-label={localeConfig.a11y.close}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav aria-label={tx().mainNav} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 lg:[@media(max-height:780px)]:space-y-1.5 lg:[@media(max-height:780px)]:py-2">
          <div>
            <p className="mb-1 px-3 text-xs font-semibold text-muted-foreground">
              {localeConfig.admin.sidebarGroups.main}
            </p>
            <div className="space-y-0.5">
              {puede("overview") && navBtn("overview", BarChart3, t.tabs.overview)}
              {navBtn("missions", CalendarDays, t.tabs.appointments)}
              {canSeePayments && navBtn("payments", Banknote, localeConfig.admin.payments?.title ?? "Payments")}
            </div>
          </div>

          <div>
            <p className="mb-1 px-3 text-xs font-semibold text-muted-foreground">
              {localeConfig.admin.sidebarGroups.manage}
            </p>
            <div className="space-y-0.5">
              {navBtn("customers", Users, t.tabs.customers)}
              {!isSolo && puede("personnel") && navBtn("personnel", Scissors, t.tabs.staff)}
              {navBtn("tasks", CheckSquare, t.tabs.tasks ?? "Tasks", tasksBadgeCount)}
              {siteConfig.features.showStock !== false && navBtn("stock", Package, localeConfig.admin.stock?.title ?? "Inventario")}
              {canSeeUsers && navBtn("users", UserCog, t.tabs.users)}
            </div>
          </div>

          <div>
            <p className="mb-1 px-3 text-xs font-semibold text-muted-foreground">
              {localeConfig.admin.sidebarGroups.comms}
            </p>
            <div className="space-y-0.5">
              {navBtn("inbox", Mail, t.tabs.inbox)}
              {puede("logs") && navBtn("logs", Bell, t.tabs.notificationLogs)}
            </div>
          </div>

          {(puede("rules") || canSeeKnowledge || puede("support")) && (
            <div>
              <p className="mb-1 px-3 text-xs font-semibold text-muted-foreground">
                {localeConfig.admin.sidebarGroups.system}
              </p>
              <div className="space-y-0.5">
                {puede("rules") && navBtn("rules", SlidersHorizontal, t.tabs.businessRules)}
                {canSeeKnowledge && navBtn("knowledge", BookOpen, t.tabs.knowledge)}
                {puede("support") && navBtn("support", HeadphonesIcon, t.tabs.support)}
              </div>
            </div>
          )}
        </nav>

        {/* Bottom section */}
        <div className="flex items-center gap-2 border-t border-border px-3 py-2 [&>button:first-child]:flex [&>button:first-child]:size-11 [&>button:first-child]:items-center [&>button:first-child]:justify-center [&>div>button]:min-h-11 [&>div>button]:px-3">
          <ThemeToggle />
          <LanguageSwitcher variant="dark" dropUp />
          <button
            type="button"
            onClick={async () => {
              // «התנתקות» cierra la sesión (antes sólo volvía a la web y la cuenta quedaba abierta en ese aparato).
              try { sessionStorage.clear(); } catch { /* sin almacenamiento */ }
              if (firebaseAuth) await signOut(firebaseAuth).catch(() => {});
              onExit();
            }}
            className="ms-auto h-11 rounded-xl px-3 text-sm font-medium text-foreground transition-colors hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300"
          >
            {t.signOut}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="min-w-0 flex-1 lg:ms-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/95 px-2 py-2 backdrop-blur-sm lg:hidden">
          <button type="button" onClick={() => setIsSidebarOpen(true)} aria-label={tx().menu} aria-expanded={isSidebarOpen} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-foreground hover:bg-muted">
            <Menu size={22} aria-hidden />
          </button>
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">{brand.name}</p>
            <h1 className="truncate text-lg font-bold text-foreground">{tabLabels[activeTab]}</h1>
          </div>
        </header>

        {/* Desktop header */}
        <header className="hidden items-center justify-between border-b border-border px-8 py-5 lg:flex">
          <h1 className="text-2xl font-bold text-foreground">{tabLabels[activeTab]}</h1>
        </header>

        <CustomerLoadNotice error={customersError} loading={customersLoading} hasData={crmCustomers.length > 0} onRetry={refreshCustomers} />

        {/* Subscription error banner */}
        {subscriptionError && (
          <div role="alert" data-crm03="aviso-sync" title={subscriptionError} className="flex flex-wrap items-center justify-between gap-3 border-b border-red-500/30 bg-red-500/10 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-start gap-2">
              <AlertCircle size={18} aria-hidden className="mt-0.5 shrink-0 text-red-700 dark:text-red-400" />
              <p className="text-sm text-red-800 dark:text-red-300"><span className="font-semibold">{tx().syncFailTitle}</span> {tx().syncFailBody}</p>
            </div>
            <button
              type="button"
              onClick={() => { setSubscriptionError(null); void crmAppointments.refresh(); }}
              className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-red-600/40 px-4 text-sm font-semibold text-red-800 transition-colors hover:bg-red-500/10 dark:text-red-300"
            >
              <RefreshCw size={16} aria-hidden />
              {localeConfig.admin.common.refresh}
            </button>
          </div>
        )}

        {/* ── Tab content ── (CRM-04: el landmark principal que el panel no tenía) */}
        <main id="contenido" className="p-4 sm:p-6 lg:p-8">
          {tabVisible === "missions" ? (
            <>

              {/* ── «תור חדש»: turno a una fecha (horas libres reales) o visita realizada ── */}
              {showWalkIn && (
                <TurnoNuevo
                  modo={quickAddSlot ? "turno" : modoTurno}
                  setModo={setModoTurno}
                  desdeCalendario={!!quickAddSlot}
                  form={walkInForm}
                  setForm={setWalkInForm}
                  fecha={fechaTurno}
                  setFecha={setFechaTurno}
                  hora={horaTurno}
                  setHora={setHoraTurno}
                  servicios={SERVICES}
                  staff={staffList}
                  sola={isSolo}
                  turnos={appointments}
                  bloqueado={walkInLocked}
                  guardando={walkInSaving}
                  error={walkInError ?? (walkInState === "unknown" && !confirmedWalkIn.current?.contactId ? localeConfig.admin.common.toastCustomerError : walkInConflict && confirmedWalkIn.current?.contactId && !confirmedWalkIn.current.appointmentId ? localeConfig.admin.common.customerSavedAppointmentPending : null)}
                  textoGuardar={walkInSaving ? t.walkIn.saving : walkInState === "unknown" ? localeConfig.admin.common.walkInReviewRequired : confirmedWalkIn.current?.appointmentId ? localeConfig.admin.common.retry : walkInConflict ? t.walkIn.forceRegister : (quickAddSlot || modoTurno === "turno") ? tx().saveBooking : tx().saveVisit}
                  extra={canReviseRejected(confirmedWalkIn.current) ? (
                    <button type="button" onClick={cancelRejectedWalkIn} disabled={walkInSaving} className="h-11 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-muted">{localeConfig.admin.common.walkInCancelAppointment}</button>
                  ) : null}
                  alCerrar={closeWalkIn}
                  alGuardar={() => void handleWalkIn((quickAddSlot || modoTurno === "turno") ? { date: fechaTurno, time: horaTurno } : null, modoTurno === "visita")}
                />
              )}

              {/* ── View toggle: list / calendar ── */}
              <div role="group" aria-label={tx().view} className="mx-auto mb-4 flex w-full max-w-3xl items-center gap-1 rounded-xl border border-border bg-card p-1 sm:w-fit sm:ms-auto sm:me-0">
                <button
                  type="button"
                  onClick={() => setAppointmentView("list")}
                  className={cn(
                    "flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-medium transition-colors sm:flex-none",
                    appointmentView === "list"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <List size={13} />
                  {localeConfig.admin.dashboard.calendarView.listView}
                </button>
                <button
                  type="button"
                  onClick={() => setAppointmentView("calendar")}
                  className={cn(
                    "flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-medium transition-colors sm:flex-none",
                    appointmentView === "calendar"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <LayoutGrid size={13} />
                  {localeConfig.admin.dashboard.calendarView.calendarLabel}
                </button>
              </div>

              {appointmentView === "calendar" ? (
                <AppointmentCalendar
                  appointments={appointments}
                  staff={staffList}
                  services={SERVICES}
                  filterStaff={filterStaff}
                  onStatusChange={handleStatusChange}
                  onReschedule={handleReschedule}
                  onQuickAdd={handleQuickAdd}
                  onAbrirDia={(dia) => { setFilterDate(startOfDay(dia)); setAppointmentView("list"); }}
                />
              ) : (
              <AgendaDia
                fecha={filterDate}
                setFecha={(d) => setFilterDate(startOfDay(d))}
                turnosDelDia={filteredAppointments}
                todos={appointments}
                staff={staffList}
                servicios={SERVICES}
                filtroPersona={filterStaff}
                setFiltroPersona={setFilterStaff}
                sola={isSolo}
                alCambiarEstado={handleStatusChange}
                alMover={handleReschedule}
                // El cobro por el mismo camino que el resto de los cambios (navegador o backend, según el origen del turno); en la demo, sólo en pantalla.
                alCobrar={async (a, pago) => {
                  if (TOUR_CONFIG.isDemoMode) { const { paymentStatus, amountPaidCents, paymentMethod } = pago; setAppointments((prev) => prev.map((x) => (x.id === a.id ? { ...x, paymentStatus, amountPaidCents, paymentMethod } : x))); return; }
                  await crmAppointments.cobrar(a, pago);
                }}
                puedeCobrar={canSeePayments}
                alNuevo={() => { if (showWalkIn) closeWalkIn(); else openWalkIn(); }}
              />
              )}
            </>
          ) : tabVisible === "personnel" ? (
            <StaffLogistics />
          ) : tabVisible === "customers" ? (
            <CustomersTab onOpenCalendar={() => { setActiveTab("missions"); setAppointmentView("calendar"); }} />
          ) : tabVisible === "inbox" ? (
            <InboxTab />
          ) : tabVisible === "logs" ? (
            <NotificationLogsTab />
          ) : tabVisible === "rules" ? (
            <BusinessRulesTab />
          ) : tabVisible === "overview" ? (
            <DashboardTab appointments={appointments} services={SERVICES} staff={staffList} isLoading={!appointmentsLoaded} error={subscriptionError} />
          ) : tabVisible === "payments" ? (
            <PaymentsTab appointments={appointments} services={SERVICES} staff={staffList} isLoading={!appointmentsLoaded} error={subscriptionError} />
          ) : tabVisible === "support" ? (
            <SupportTab />
          ) : tabVisible === "stock" ? (
            <StockTab />
          ) : tabVisible === "knowledge" ? (
            <KnowledgeTab />
          ) : tabVisible === "users" ? (
            <UsersTab />
          ) : tabVisible === "tasks" ? (
            <TasksTab currentRole={currentRole} currentEmail={currentEmail} />
          ) : null}
        </main>
      </div>
    </div>
  );
}
