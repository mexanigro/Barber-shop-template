import { onAuthStateChanged } from "firebase/auth";
import { auth, db, isFirebaseConfigured } from "../lib/firebase";
import { dbService } from "./db";
import type { Appointment } from "../types";

type Origin = { source: "browser" | "booking-backend"; documentId: string };
type AgendaAppointment = Appointment & { origin: Origin; sessionUid: string };
type Source = { project: string; database: string; collection: string };
const refreshers = new Set<() => Promise<void>>();

function reference(row: Appointment): AgendaAppointment {
  const item = row as AgendaAppointment;
  if (!item.origin || !["browser", "booking-backend"].includes(item.origin.source) || !item.origin.documentId) {
    throw new Error("Falta el origen de la cita.");
  }
  return item;
}

/** Adaptador exclusivo de agenda; las altas y los demás consumidores conservan dbService. */
export const crmAppointments = {
  documentId: (row: Appointment) => reference(row).origin.documentId,
  sourceLabel: (row: Appointment) => (row as Partial<AgendaAppointment>).origin?.source === "booking-backend"
    ? "Origen: backend" : "Origen: navegador",

  subscribe(callback: (rows: Appointment[]) => void, onError: (message: string | null) => void): () => void {
    if (!isFirebaseConfigured || !auth || !db) {
      onError("Navegador: Firebase no está configurado.");
      return () => {};
    }
    const database = (db.toJSON() as { databaseId: { projectId: string; database: string } }).databaseId;
    const browserSource: Source = { project: database.projectId, database: database.database, collection: "appointments" };
    let stopped = false;
    let uid: string | null = null;
    let generation = 0;
    let request = 0;
    let controller: AbortController | undefined;
    let browserRows: Appointment[] = [];
    let backendRows: Appointment[] = [];
    let backendSource: Source | null = null;
    let browserError: string | null = null;
    let backendError: string | null = null;
    let unsubscribeBrowser: (() => void) | undefined;

    const attach = (row: Appointment, source: Origin["source"]): AgendaAppointment => ({
      ...row, id: JSON.stringify([source, row.id]), origin: { source, documentId: row.id }, sessionUid: uid!,
    });
    const publish = () => {
      if (stopped) return;
      const sameSource = backendSource?.project === browserSource.project &&
        backendSource.database === browserSource.database && backendSource.collection === browserSource.collection;
      const browserIds = new Set(browserRows.map(row => row.id));
      // Sólo la identidad física completa permite quitar una segunda representación del MISMO documento.
      const rows = [...browserRows.map(row => attach(row, "browser")),
        ...backendRows.filter(row => !(sameSource && browserIds.has(row.id))).map(row => attach(row, "booking-backend"))];
      rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      callback(rows);
      onError([browserError && `Navegador: ${browserError}`, backendError && `Backend: ${backendError}`].filter(Boolean).join(" · ") || null);
    };

    const refresh = async () => {
      const user = auth.currentUser;
      if (stopped || !uid || !user || user.uid !== uid) return;
      const epoch = generation;
      const sequence = ++request;
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      try {
        const token = await user.getIdToken();
        if (stopped || epoch !== generation || sequence !== request) return;
        const response = await fetch("/api/crm/appointments", { headers: { Authorization: `Bearer ${token}` }, signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}; datos anteriores sin actualizar`);
        const result = await response.json() as { source: Source; appointments: Appointment[] };
        if (stopped || epoch !== generation || sequence !== request) return;
        backendSource = result.source;
        backendRows = result.appointments.map(row => ({ ...row, createdAt: row.createdAt ? new Date(row.createdAt) : new Date() }));
        backendError = null;
      } catch (error) {
        if (stopped || epoch !== generation || sequence !== request) return;
        backendError = error instanceof Error ? error.message : "No se pudo actualizar esta fuente.";
      }
      publish();
    };
    const unsubscribeAuth = onAuthStateChanged(auth, user => {
      if (stopped || user?.uid === uid) return;
      generation++;
      controller?.abort();
      unsubscribeBrowser?.();
      unsubscribeBrowser = undefined;
      uid = user?.uid ?? null;
      browserRows = [];
      backendRows = [];
      backendSource = null;
      browserError = null;
      backendError = null;
      publish();
      if (!uid) return;
      const epoch = generation;
      try {
        unsubscribeBrowser = dbService.subscribeToAppointments(rows => {
          if (stopped || epoch !== generation) return;
          browserRows = rows;
          browserError = null;
          publish();
        }, message => {
          if (stopped || epoch !== generation) return;
          browserError = `${message}; datos anteriores sin actualizar`;
          publish();
        });
      } catch (error) {
        browserError = error instanceof Error ? error.message : "No se pudo leer esta fuente.";
        publish();
      }
      void refresh();
    });
    const focus = () => { void refresh(); };
    const timer = setInterval(focus, 30_000);
    window.addEventListener("focus", focus);
    refreshers.add(refresh);
    return () => {
      stopped = true;
      generation++;
      controller?.abort();
      unsubscribeBrowser?.();
      unsubscribeAuth();
      clearInterval(timer);
      window.removeEventListener("focus", focus);
      refreshers.delete(refresh);
    };
  },

  async refresh(): Promise<void> {
    await Promise.all([...refreshers].map(refresh => refresh()));
  },

  async update(row: Appointment, patch: Partial<Pick<Appointment, "status" | "date" | "time">>): Promise<void> {
    const item = reference(row);
    const user = auth.currentUser;
    if (!user || item.sessionUid !== user.uid) throw new Error("La sesión de la cita cambió.");
    if (item.origin.source === "browser") {
      await dbService.updateAppointment(item.origin.documentId, patch);
    } else {
      const token = await user.getIdToken();
      if (auth.currentUser !== user) throw new Error("La sesión de la cita cambió.");
      const response = await fetch(`/api/crm/appointments/${encodeURIComponent(item.origin.documentId)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(patch),
      });
      if (!response.ok) throw new Error(`No se actualizó la cita (HTTP ${response.status}).`);
    }
    await crmAppointments.refresh();
  },
};
