import { assertCompletedTime } from "../lib/completed-appointment";
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  runTransaction,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from '../lib/firebase';
import { Appointment, AppointmentStatus, BusinessRules, StaffMember } from '../types';
import { siteConfig, applyTenantConfigOverride } from '../config/site';
import { env } from '../config/env';
import { checkAvailability } from '../lib/booking';
import { format, parse, setMinutes, setHours, startOfDay, addMinutes, isBefore, isAfter } from 'date-fns';
import { getBufferMinutes } from '../lib/schedulingRules';
import { customerService } from './customers';
import type { DocumentReference } from 'firebase/firestore';
import { BookingConflictError, computeManifestWindow, applyAppointmentPatchInTransaction, type ManifestInterval } from '../lib/api/booking-validation';

// Guard: if Firebase is not configured, all db operations return safe empty defaults.
function assertFirebase(): void {
  if (!isFirebaseConfigured) {
    throw new Error(
      "[Template Setup] Firebase is not configured. " +
      "Replace firebase-applet-config.json with your project credentials."
    );
  }
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  // Log sanitized info (no PII) for debugging
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`[Firestore ${operationType}] ${path ?? "unknown"}: ${errorMessage}`);

  // Throw clean user-facing error (no PII, no JSON blob)
  throw new Error(`Firestore operation failed: ${operationType} on ${path ?? "unknown"}`);
}

const APPOINTMENTS_COLLECTION = 'appointments';
const CLIENT_ID = env.clientId;

/** Thrown by createAppointment({claimSlot}) when the interval overlaps the daily manifest. */
export class SlotConflictError extends Error {
  constructor() {
    super("This time slot overlaps an existing booking.");
    this.name = "SlotConflictError";
  }
}

/** Remove an appointment's interval from the daily manifest (transactional). */
async function removeIntervalFromManifest(appointmentData: Record<string, any>): Promise<void> {
  const staffId = appointmentData.staffId ?? appointmentData.barberId ?? '';
  const dateStr = appointmentData.date;
  const time = appointmentData.time;
  if (!staffId || !dateStr || !time) return;

  const manifestRef = doc(db, 'daily_manifests', `${CLIENT_ID}_${staffId}_${dateStr}`);

  await runTransaction(db, async (transaction) => {
    const manifestSnap = await transaction.get(manifestRef);
    if (!manifestSnap.exists()) return;

    const intervals: { start: string; end: string }[] = manifestSnap.data().intervals ?? [];
    const date = parse(dateStr, "yyyy-MM-dd", new Date());
    const slotStart = setMinutes(setHours(startOfDay(date), Number(time.split(":")[0])), Number(time.split(":")[1]));
    const slotEndWithBuffer = addMinutes(slotStart, (appointmentData.duration || 30) + getBufferMinutes());
    const endStr = appointmentData.manifestEnd ?? format(slotEndWithBuffer, "HH:mm");

    const filtered = intervals.filter(inv => !(inv.start === time && inv.end === endStr));
    if (filtered.length < intervals.length) {
      transaction.update(manifestRef, { intervals: filtered });
    }
  });
}

/**
 * Rellena los campos que `firestore.rules#isValidAppointment` exige y que el
 * import CSV del hub deja en `null`.
 *
 * El hub escribe con Admin SDK, así que no pasa por las rules, y pone `null` en
 * `customerEmail`, `customerPhone` y `staffId` cuando la fila del CSV no los trae.
 * La regla `appointments.update` revalida el documento COMPLETO, de modo que el
 * dueño no podía **ni cancelar** una cita importada así: medido en el banco
 * aislado, `permission-denied` con los tres campos por separado. Su única salida
 * era borrarla, es decir destruir el histórico que acababa de importar.
 *
 * Se sanea sólo lo que puede sanearse sin inventar un dato del negocio:
 *  · `customerEmail` → `import_<docId>@noemail.local`. Mismo compromiso que el
 *    producto ya toma en `CustomersTab` con `walkin_…@noemail.local`; el id del
 *    documento hace el valor determinista y trazable sin necesidad de un hash.
 *  · `staffId` → `""`. La regla pide `is string`; la cadena vacía la satisface y
 *    no inventa un miembro del personal que no existe.
 *  · `customerPhone` → **NO se toca**. Un teléfono inventado es un dato de negocio
 *    falso. Esa fila queda denegada a propósito y se resuelve normalizando el
 *    import en el hub (tramo R2), no aquí.
 *
 * No pisa nada: sólo devuelve las claves que faltan, y `createdAt` queda intacto
 * porque la regla también exige que no cambie.
 */
function healImportedFields(
  id: string,
  stored: Record<string, any> | null,
  updates: Partial<Appointment>,
): Record<string, unknown> {
  if (!stored) return {};
  const heal: Record<string, unknown> = {};
  const email = (updates as Record<string, any>).customerEmail ?? stored.customerEmail;
  if (typeof email !== 'string' || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
    heal.customerEmail = `import_${id}@noemail.local`;
  }
  const staffId = (updates as Record<string, any>).staffId ?? stored.staffId;
  if (typeof staffId !== 'string') heal.staffId = '';
  return heal;
}

export const dbService = {
  // Real-time listener for appointments
  subscribeToAppointments: (
    callback: (appointments: Appointment[]) => void,
    onError?: (message: string) => void,
  ) => {
    if (!isFirebaseConfigured) {
      console.warn("[Template Setup] Firebase not configured — appointment subscription skipped.");
      const msg =
        "[Template Setup] Firebase is not configured. Check VITE_FIREBASE_* env vars and rebuild.";
      onError?.(msg);
      return () => {};
    }
    const q = query(
      collection(db, APPOINTMENTS_COLLECTION),
      where('clientId', '==', CLIENT_ID),
      orderBy('createdAt', 'desc'),
      // Cap: los 500 turnos mas recientes — evita descargar todo el historial
      // en cada snapshot del panel admin.
      limit(500)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const appointments = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            staffId: data.staffId ?? (data as { barberId?: string }).barberId ?? '',
            createdAt: data.createdAt?.toDate() || new Date(),
          } as Appointment;
        });
        callback(appointments);
      },
      (error: unknown) => {
        console.error("[Firestore] appointments subscription:", error);
        const code = typeof error === "object" && error && "code" in error ? String((error as { code: string }).code) : "";
        const fallback = error instanceof Error ? error.message : String(error);
        const msg =
          code === "permission-denied"
            ? "Cannot read appointments: Firestore denied access. After signing in as admin, your account needs the custom claim clientId matching this deploy (same value as VITE_CLIENT_ID). Use the setTenantClaim Cloud Function if you changed tenant."
            : code === "failed-precondition"
              ? "Firestore index may be missing for appointments (clientId + createdAt). Deploy firestore.indexes for this database."
              : fallback;
        onError?.(msg);
      },
    );
  },

  getAppointments: async (): Promise<Appointment[]> => {
    if (!isFirebaseConfigured) return [];
    try {
      const q = query(
        collection(db, APPOINTMENTS_COLLECTION),
        where('clientId', '==', CLIENT_ID),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          staffId: data.staffId ?? (data as { barberId?: string }).barberId ?? '',
          createdAt: data.createdAt?.toDate() || new Date(),
        } as Appointment;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, APPOINTMENTS_COLLECTION);
    }
  },

  /**
   * N06 T4: intervalos ocupados de un staff en un día, leídos de daily_manifests (legible sin
   * sesión). Es lo que el visitante descuenta; las citas no son legibles para él.
   * Si la lectura falla se devuelve [] y se registra: el servidor sigue siendo el árbitro (409).
   */
  /** Disponibilidad pública atribuida; un fallo nunca se convierte en slots vacíos. */
  getPublicAvailability: async (staffId: string, serviceId: string, date: string): Promise<string[]> => {
    const query = new URLSearchParams({ staffId, serviceId, date });
    const response = await fetch('/api/booking-availability?' + query);
    if (!response.ok) throw new Error('Availability unavailable');
    const value = await response.json();
    if (!value || value.staffId !== staffId || value.serviceId !== serviceId || value.date !== date ||
        !Array.isArray(value.slots) || !value.slots.every((slot: unknown) => typeof slot === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(slot))) {
      throw new Error('Availability response invalid');
    }
    return value.slots;
  },

  getManifestIntervals: async (staffId: string, date: string): Promise<ManifestInterval[]> => {
    if (!isFirebaseConfigured) return [];
    try {
      const snap = await getDoc(doc(db, 'daily_manifests', `${CLIENT_ID}_${staffId}_${date}`));
      const intervals = snap.exists() ? snap.data().intervals : [];
      return Array.isArray(intervals) ? intervals.filter((i): i is ManifestInterval => !!i && typeof i.start === 'string' && typeof i.end === 'string') : [];
    } catch (error) {
      console.error(`[Firestore get] daily_manifests ${staffId} ${date}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  },

  getAppointmentsForDate: async (date: string): Promise<Appointment[]> => {
    if (!isFirebaseConfigured) return [];
    try {
      const q = query(
        collection(db, APPOINTMENTS_COLLECTION),
        where('clientId', '==', CLIENT_ID),
        where('date', '==', date),
        where('status', '!=', 'cancelled')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          staffId: data.staffId ?? (data as { barberId?: string }).barberId ?? '',
          createdAt: data.createdAt?.toDate() || new Date(),
        } as Appointment;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, APPOINTMENTS_COLLECTION);
    }
  },

  /**
   * Merges static siteConfig.staff with real-time Firestore overrides.
   * This ensures the scheduling logic always uses the most recent personnel parameters.
   */
  getStaff: async (): Promise<StaffMember[]> => {
    try {
      const overrides = await dbService.getStaffOverrides();
      return siteConfig.staff.map(b => {
        const override = overrides[b.id];
        if (!override) return b;
        return {
          ...b,
          schedule: override.schedule || b.schedule,
          blockedDates: override.blockedDates || b.blockedDates || [],
          blockedSlots: override.blockedSlots || b.blockedSlots || [],
          dateOverrides: override.dateOverrides || b.dateOverrides || {},
        };
      });
    } catch (error) {
      console.error("Failed to synchronize personnel registry:", error);
      return siteConfig.staff;
    }
  },
  
  // C-3: Public bookings now go through /api/book (Admin SDK). This method is
  // retained for admin-side use (authenticated users with Firestore claims).
  saveAppointment: async (appointment: Omit<Appointment, 'id' | 'createdAt' | 'clientId'>): Promise<string> => {
    assertFirebase();
    assertCompletedTime(appointment);
    try {
      // La solicitud y su intervalo permanecen iguales durante esperas y reintentos.
      appointment = { ...appointment };
      const { startMinutes, endMinutes, endTime } = computeManifestWindow(appointment.time, appointment.duration, getBufferMinutes());
      let appointmentId = '';
      appointmentId = await runTransaction(db, async (transaction) => {
        const dateStr = appointment.date;
        const staffId = appointment.staffId;
        
        // 1. Fetch current appointments for this staff member and date WITHIN THE TRANSACTION
        // Actually, since we can't query collections in transactions, we look at the daily manifest.
        const manifestRef = doc(db, 'daily_manifests', `${CLIENT_ID}_${staffId}_${dateStr}`);
        const manifestSnap = await transaction.get(manifestRef);
        
        // Fetch existing appointments using the manifest's tracking IDs if possible or just use the current appointments for validation
        // A better approach for 100% safety is to check the manifest's occupied intervals.
        const occupiedIntervals: { start: string, end: string }[] = manifestSnap.exists() ? manifestSnap.data().intervals : [];
        
        // 2. Fetch the latest personnel config (including overrides)
        const overrideRef = doc(db, 'staff_overrides', `${CLIENT_ID}_${staffId}`);
        const overrideDoc = await transaction.get(overrideRef);
        const staticStaff = siteConfig.staff.find(b => b.id === staffId);
        
        if (!staticStaff) throw new Error("Staff member not found. Please refresh and try again.");
        
        const staffMember: StaffMember = !overrideDoc.exists() ? staticStaff : {
          ...staticStaff,
          schedule: overrideDoc.data().schedule ?? staticStaff.schedule,
          blockedDates: overrideDoc.data().blockedDates ?? staticStaff.blockedDates ?? [],
          blockedSlots: overrideDoc.data().blockedSlots ?? staticStaff.blockedSlots ?? [],
          dateOverrides: overrideDoc.data().dateOverrides ?? staticStaff.dateOverrides ?? {},
        };

        // 3. Perform atomic cross-check validation
        // We need to verify if the new interval [time, time+duration+buffer] overlaps with any occupiedIntervals
        const date = parse(dateStr, "yyyy-MM-dd", new Date());
        const slotStart = setMinutes(setHours(startOfDay(date), Number(appointment.time.split(":")[0])), Number(appointment.time.split(":")[1]));
        const slotEndWithBuffer = addMinutes(slotStart, endMinutes - startMinutes);

        const conflict = occupiedIntervals.some(inv => {
          const invStart = setMinutes(setHours(startOfDay(date), Number(inv.start.split(":")[0])), Number(inv.start.split(":")[1]));
          const invEnd = setMinutes(setHours(startOfDay(date), Number(inv.end.split(":")[0])), Number(inv.end.split(":")[1]));
          
          // isOverlapping logic
          return isBefore(slotStart, invEnd) && isAfter(slotEndWithBuffer, invStart);
        });

        if (conflict) {
          throw new Error("This time slot is no longer available. Please select a different time.");
        }

        // Horarios y pausas usan la duración del servicio; la ocupación ya se comprobó arriba.
        // Con [] el buffer interno de checkAvailability no participa en conflictos.
        const validation = checkAvailability(appointment, staffMember, []);
        if (!validation.available) {
           throw new Error(validation.reason || "Slot no longer available.");
        }

        // 4. Update manifest and save appointment
        const docRef = doc(collection(db, APPOINTMENTS_COLLECTION));
        transaction.set(docRef, {
          clientId: CLIENT_ID,
          ...appointment,
          manifestEnd: endTime,
          createdAt: serverTimestamp(),
        });
        
        transaction.set(manifestRef, {
          clientId: CLIENT_ID,
          intervals: [...occupiedIntervals, { start: appointment.time, end: endTime }]
        });
        
        return docRef.id;
      });

      // Fire-and-forget customer upsert — does not block booking confirmation
      if (appointmentId) {
        customerService.upsertByEmail({
          email: appointment.customerEmail,
          fullName: appointment.customerName,
          phone: appointment.customerPhone,
          source: "booking",
        }).catch((err) => console.warn("[db] customer upsert failed (non-fatal):", err));
      }

      return appointmentId;
    } catch (error) {
      if (error instanceof BookingConflictError) throw error;
      handleFirestoreError(error, OperationType.CREATE, APPOINTMENTS_COLLECTION);
    }
  },

  getStaffOverrides: async (): Promise<Record<string, any>> => {
    if (!isFirebaseConfigured) return {};
    try {
      const snapshot = await getDocs(query(collection(db, 'staff_overrides'), where('clientId', '==', CLIENT_ID)));
      const overrides: Record<string, any> = {};
      snapshot.forEach(doc => {
        const raw = doc.data();
        const mappedId = typeof raw.staffId === "string" ? raw.staffId : doc.id.replace(`${CLIENT_ID}_`, "");
        overrides[mappedId] = raw;
      });
      return overrides;
    } catch (error) {
      console.error("Failed to fetch overrides:", error);
      return {};
    }
  },

  saveStaffOverride: async (staffId: string, data: Partial<StaffMember>): Promise<void> => {
    assertFirebase();
    try {
      await setDoc(
        doc(db, 'staff_overrides', `${CLIENT_ID}_${staffId}`),
        { ...data, clientId: CLIENT_ID, staffId },
        // Sustituir mapas entregados completos permite retirar una excepción; conservar otros campos.
        { mergeFields: [...Object.keys(data), 'clientId', 'staffId'] }
      );
    } catch (error) {
      console.error("Failed to commit personnel override:", error);
      throw error;
    }
  },

  /** Persist scheduling rules to `config/{clientId}` (tenant admin only via rules). */
  saveBusinessRules: async (rules: BusinessRules): Promise<void> => {
    assertFirebase();
    try {
      await setDoc(doc(db, "config", CLIENT_ID), { businessRules: rules }, { merge: true });
      applyTenantConfigOverride({ businessRules: rules });
    } catch (error) {
      console.error("Failed to save business rules:", error);
      throw error;
    }
  },

  updateAppointment: async (id: string, updates: Partial<Appointment>): Promise<void> => {
    assertFirebase();
    const docRef = doc(db, APPOINTMENTS_COLLECTION, id);
    const keys = Object.keys(updates);
    const statusOnly = keys.length === 1 && typeof updates.status === 'string';
    const moveOnly = keys.length === 2 && typeof updates.date === 'string' && typeof updates.time === 'string';
    if (statusOnly || moveOnly) {
      // N06 T3: misma lógica que el PATCH Admin (booking-validation.ts): cancelar libera UNA
      // ocurrencia en la misma transacción; mover libera el viejo y reclama el nuevo. Conflicto →
      // BookingConflictError tipado, sin escribir.
      try {
        const outcome = await runTransaction(db, async (transaction) => applyAppointmentPatchInTransaction({
          clientId: CLIENT_ID,
          appointmentRef: docRef,
          manifestRef: (staffId, date) => doc(db, 'daily_manifests', `${CLIENT_ID}_${staffId}_${date}`),
          read: async (ref) => { const snap = await transaction.get(ref as DocumentReference); return { exists: snap.exists(), data: snap.data() as Record<string, unknown> | undefined }; },
          update: (ref, data) => { transaction.update(ref as DocumentReference, data); },
          set: (ref, data) => { transaction.set(ref as DocumentReference, data); },
          decorate: (before, fields) => ({ ...fields, ...healImportedFields(id, before, updates) }),
        }, statusOnly ? { status: updates.status as string } : { date: updates.date as string, time: updates.time as string }));
        if (outcome === 'not-found') throw new Error('appointment_missing');
        return;
      } catch (error) {
        if (error instanceof BookingConflictError) throw error;
        handleFirestoreError(error, OperationType.UPDATE, `${APPOINTMENTS_COLLECTION}/${id}`);
      }
    }
    // La rama directa no implementa cambios de agenda ni operaciones mixtas.
    const agendaFields = ['status', 'date', 'time', 'staffId', 'barberId', 'serviceId', 'duration', 'manifestEnd'];
    if (keys.some(key => agendaFields.includes(key))) throw new Error('appointment_agenda_patch_invalid');
    // Otros campos (sin agenda): actualización directa con saneo de importadas, como antes.
    try {
      const snap = await getDoc(docRef);
      const stored: Record<string, any> | null = snap.exists() ? snap.data() : null;
      await updateDoc(docRef, { ...updates, ...healImportedFields(id, stored, updates) });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${APPOINTMENTS_COLLECTION}/${id}`);
    }
  },
  
  /**
   * Direct appointment creation — skips availability checks. For walk-in/external registration.
   * Pass `claimSlot` to also reserve the interval in daily_manifests (transactional) so a
   * later web booking can't take the same slot — use it only for future "confirmed" slots.
   * Throws SlotConflictError on manifest overlap unless `force` is set (admin overbooking).
   */
  createAppointment: async (
    data: Omit<Appointment, 'id' | 'createdAt' | 'clientId'>,
    options?: { claimSlot?: boolean; force?: boolean }
  ): Promise<string> => {
    assertFirebase();
    assertCompletedTime(data);
    try {
      if (!options?.claimSlot) {
        const docRef = await addDoc(collection(db, APPOINTMENTS_COLLECTION), {
          clientId: CLIENT_ID,
          ...data,
          createdAt: serverTimestamp(),
        });
        return docRef.id;
      }

      // Capturar antes de la primera lectura; el callback puede ejecutarse varias veces.
      data = { ...data };
      const { startMinutes, endMinutes, endTime } = computeManifestWindow(data.time, data.duration, getBufferMinutes());
      return await runTransaction(db, async (transaction) => {
        const manifestRef = doc(db, 'daily_manifests', `${CLIENT_ID}_${data.staffId}_${data.date}`);
        const manifestSnap = await transaction.get(manifestRef);
        const occupiedIntervals: { start: string; end: string }[] = manifestSnap.exists() ? (manifestSnap.data().intervals ?? []) : [];

        const date = parse(data.date, "yyyy-MM-dd", new Date());
        const slotStart = setMinutes(setHours(startOfDay(date), Number(data.time.split(":")[0])), Number(data.time.split(":")[1]));
        const slotEndWithBuffer = addMinutes(slotStart, endMinutes - startMinutes);

        const conflict = occupiedIntervals.some(inv => {
          const invStart = setMinutes(setHours(startOfDay(date), Number(inv.start.split(":")[0])), Number(inv.start.split(":")[1]));
          const invEnd = setMinutes(setHours(startOfDay(date), Number(inv.end.split(":")[0])), Number(inv.end.split(":")[1]));
          return isBefore(slotStart, invEnd) && isAfter(slotEndWithBuffer, invStart);
        });
        if (conflict && !options.force) throw new SlotConflictError();

        const docRef = doc(collection(db, APPOINTMENTS_COLLECTION));
        transaction.set(docRef, {
          clientId: CLIENT_ID,
          ...data,
          manifestEnd: endTime,
          createdAt: serverTimestamp(),
        });
        transaction.set(manifestRef, {
          clientId: CLIENT_ID,
          intervals: [...occupiedIntervals, { start: data.time, end: endTime }],
        });
        return docRef.id;
      });
    } catch (error) {
      if (error instanceof SlotConflictError || error instanceof BookingConflictError) throw error;
      handleFirestoreError(error, OperationType.CREATE, APPOINTMENTS_COLLECTION);
    }
  },

  deleteAppointment: async (id: string): Promise<void> => {
    assertFirebase();
    try {
      const docRef = doc(db, APPOINTMENTS_COLLECTION, id);

      // Read before deleting so we can clean the manifest
      const snap = await getDoc(docRef);
      const appointmentData = snap.exists() && snap.data().status !== 'cancelled' ? snap.data() : null;

      await deleteDoc(docRef);

      // Best-effort manifest cleanup
      if (appointmentData) {
        try {
          await removeIntervalFromManifest(appointmentData);
        } catch (err) {
          console.warn("[db] manifest cleanup failed (non-fatal):", err);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${APPOINTMENTS_COLLECTION}/${id}`);
    }
  }
};
