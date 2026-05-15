/**
 * Lightweight reactive store for sharing CRM data between AdminDashboard and Chatbot.
 * AdminDashboard writes snapshots; Chatbot reads them when composing admin requests.
 */

export type CrmAppointmentSummary = {
  date: string;
  time: string;
  client: string;
  service: string;
  staff: string;
  status: string;
};

export type CrmSnapshot = {
  totalBookings: number;
  confirmed: number;
  cancelled: number;
  pending: number;
  completed: number;
  estimatedRevenue: number;
  newCustomers: number;
  totalCustomers: number;
  recentAppointments: CrmAppointmentSummary[];
  /** Human-readable label like "Today" or "Last 7 days" */
  dateLabel: string;
  /** ISO date string of when this snapshot was taken */
  updatedAt: string;
};

let snapshot: CrmSnapshot | null = null;

export function setCrmSnapshot(data: CrmSnapshot): void {
  snapshot = { ...data, updatedAt: new Date().toISOString() };
}

export function getCrmSnapshot(): CrmSnapshot | null {
  return snapshot;
}
