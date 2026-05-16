/**
 * Lightweight reactive store for sharing CRM data between AdminDashboard and Chatbot.
 * AdminDashboard writes snapshots; Chatbot reads them when composing admin requests.
 */

export type CrmAppointmentSummary = {
  id: string;
  date: string;
  time: string;
  duration: number;
  client: string;
  phone?: string;
  service: string;
  serviceId: string;
  staff: string;
  staffId: string;
  status: string;
  type: string;
  amountPaidCents?: number;
  paymentStatus?: string;
};

export type CrmCustomerSummary = {
  id: string;
  name: string;
  phone: string;
  email: string;
  visitCount: number;
  lastVisitAt?: string;
  source?: string;
  notes?: string;
};

export type CrmInboxSummary = {
  id: string;
  name: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
};

export type CrmStaffAvailability = {
  staffId: string;
  staffName: string;
  /** Booked slots: array of "YYYY-MM-DD HH:mm" strings */
  bookedSlots: string[];
  /** Total appointments this period */
  totalAppointments: number;
  /** Revenue generated (estimated) */
  estimatedRevenue: number;
};

export type CrmSnapshot = {
  // KPI counters
  totalBookings: number;
  confirmed: number;
  cancelled: number;
  pending: number;
  completed: number;
  estimatedRevenue: number;
  grossRevenue: number;
  paidAppointments: number;
  freeConsultations: number;
  meetings: number;
  newCustomers: number;
  totalCustomers: number;
  /** Human-readable label like "Today" or "Last 7 days" */
  dateLabel: string;
  /** ISO date string of when this snapshot was taken */
  updatedAt: string;

  // Full appointment list (all loaded, not capped at 20)
  allAppointments: CrmAppointmentSummary[];
  // Recent 20 for backwards compat
  recentAppointments: CrmAppointmentSummary[];

  // Upcoming (future) appointments sorted by date+time
  upcomingAppointments: CrmAppointmentSummary[];

  // Today's appointments
  todayAppointments: CrmAppointmentSummary[];

  // Customer list
  customers: CrmCustomerSummary[];

  // Inbox messages
  inboxMessages: CrmInboxSummary[];

  // Per-staff availability and performance
  staffAvailability: CrmStaffAvailability[];

  // Top services by booking count
  topServices: { name: string; count: number; revenue: number }[];

  // Busiest days (day name -> count)
  busiestDays: { day: string; count: number }[];
};

let snapshot: CrmSnapshot | null = null;

export function setCrmSnapshot(data: CrmSnapshot): void {
  snapshot = { ...data, updatedAt: new Date().toISOString() };
}

export function getCrmSnapshot(): CrmSnapshot | null {
  return snapshot;
}
