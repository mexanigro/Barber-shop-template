import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
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

type ManifestInterval = { start: string; end: string };

function isManifestBlockingStatus(status: unknown): boolean {
  return status === "pending" || status === "confirmed";
}

function getManifestRef(staffId: string, dateStr: string) {
  return doc(db, 'daily_manifests', `${CLIENT_ID}_${staffId}_${dateStr}`);
}

function getAppointmentInterval(appointmentData: Record<string, any>): { staffId: string; date: string; interval: ManifestInterval } | null {
  const staffId = appointmentData.staffId ?? appointmentData.barberId ?? '';
  const dateStr = appointmentData.date;
  const time = appointmentData.time;
  if (!isManifestBlockingStatus(appointmentData.status) || !staffId || !dateStr || !time) return null;

  const date = parse(dateStr, "yyyy-MM-dd", new Date());
  const slotStart = setMinutes(setHours(startOfDay(date), Number(time.split(":")[0])), Number(time.split(":")[1]));
  const slotEndWithBuffer = addMinutes(slotStart, (Number(appointmentData.duration) || 30) + getBufferMinutes());
  return {
    staffId,
    date: dateStr,
    interval: {
      start: time,
      end: appointmentData.manifestEnd ?? format(slotEndWithBuffer, "HH:mm"),
    },
  };
}

function withoutInterval(intervals: ManifestInterval[], target: ManifestInterval | null): ManifestInterval[] {
  if (!target) return intervals;
  return intervals.filter((inv) => !(inv.start === target.start && inv.end === target.end));
}

function intervalsOverlap(a: ManifestInterval, b: ManifestInterval, dateStr: string): boolean {
  const date = parse(dateStr, "yyyy-MM-dd", new Date());
  const aStart = setMinutes(setHours(startOfDay(date), Number(a.start.split(":")[0])), Number(a.start.split(":")[1]));
  const aEnd = setMinutes(setHours(startOfDay(date), Number(a.end.split(":")[0])), Number(a.end.split(":")[1]));
  const bStart = setMinutes(setHours(startOfDay(date), Number(b.start.split(":")[0])), Number(b.start.split(":")[1]));
  const bEnd = setMinutes(setHours(startOfDay(date), Number(b.end.split(":")[0])), Number(b.end.split(":")[1]));
  return isBefore(aStart, bEnd) && isAfter(aEnd, bStart);
}

/** Remove an appointment's interval from the daily manifest (transactional). */
async function removeIntervalFromManifest(appointmentData: Record<string, any>): Promise<void> {
  const manifestEntry = getAppointmentInterval({ ...appointmentData, status: "confirmed" });
  if (!manifestEntry) return;

  const manifestRef = getManifestRef(manifestEntry.staffId, manifestEntry.date);

  await runTransaction(db, async (transaction) => {
    const manifestSnap = await transaction.get(manifestRef);
    if (!manifestSnap.exists()) return;

    const intervals: ManifestInterval[] = manifestSnap.data().intervals ?? [];
    const filtered = withoutInterval(intervals, manifestEntry.interval);
    if (filtered.length < intervals.length) {
      transaction.update(manifestRef, { intervals: filtered });
    }
  });
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
      orderBy('createdAt', 'desc')
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
  
  saveAppointment: async (appointment: Omit<Appointment, 'id' | 'createdAt' | 'clientId'>): Promise<string> => {
    assertFirebase();
    try {
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
        const slotEndWithBuffer = addMinutes(slotStart, appointment.duration + getBufferMinutes());

        const conflict = occupiedIntervals.some(inv => {
          const invStart = setMinutes(setHours(startOfDay(date), Number(inv.start.split(":")[0])), Number(inv.start.split(":")[1]));
          const invEnd = setMinutes(setHours(startOfDay(date), Number(inv.end.split(":")[0])), Number(inv.end.split(":")[1]));
          
          // isOverlapping logic
          return isBefore(slotStart, invEnd) && isAfter(slotEndWithBuffer, invStart);
        });

        if (conflict) {
          throw new Error("This time slot is no longer available. Please select a different time.");
        }

        // Basic availability check (breaks, opening hours, etc)
        const validation = checkAvailability(appointment, staffMember, []); // Pass empty existing since we checked manifestation already
        if (!validation.available) {
           throw new Error(validation.reason || "Slot no longer available.");
        }

        // 4. Update manifest and save appointment
        const docRef = doc(collection(db, APPOINTMENTS_COLLECTION));
        transaction.set(docRef, {
          clientId: CLIENT_ID,
          ...appointment,
          manifestEnd: format(slotEndWithBuffer, "HH:mm"),
          createdAt: serverTimestamp(),
        });
        
        transaction.set(manifestRef, {
          clientId: CLIENT_ID,
          intervals: [...occupiedIntervals, { start: appointment.time, end: format(slotEndWithBuffer, "HH:mm") }]
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
        { merge: true }
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
    try {
      const docRef = doc(db, APPOINTMENTS_COLLECTION, id);

      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(docRef);
        if (!snap.exists()) throw new Error("Appointment not found");

        const before = snap.data() as Record<string, any>;
        const after = { ...before, ...updates };
        const previous = getAppointmentInterval(before);
        const next = getAppointmentInterval(after);
        const previousRef = previous ? getManifestRef(previous.staffId, previous.date) : null;
        const nextRef = next ? getManifestRef(next.staffId, next.date) : null;
        const sameManifest = !!previousRef && !!nextRef && previousRef.path === nextRef.path;

        const previousSnap = previousRef ? await transaction.get(previousRef) : null;
        const nextSnap = nextRef && !sameManifest ? await transaction.get(nextRef) : previousSnap;

        const previousIntervals: ManifestInterval[] = previousSnap?.exists()
          ? (previousSnap.data().intervals ?? [])
          : [];
        const nextIntervalsRaw: ManifestInterval[] = nextSnap?.exists()
          ? (nextSnap.data().intervals ?? [])
          : [];
        const previousAfterRemoval = withoutInterval(previousIntervals, previous?.interval ?? null);
        const nextBaseIntervals = sameManifest ? previousAfterRemoval : nextIntervalsRaw;

        if (next) {
          const conflict = nextBaseIntervals.some((interval) => intervalsOverlap(next.interval, interval, next.date));
          if (conflict) {
            throw new Error("This time slot is no longer available. Please select a different time.");
          }
        }

        transaction.update(docRef, {
          ...updates,
          ...(next ? { manifestEnd: next.interval.end } : {}),
        });

        if (previousRef && previousAfterRemoval.length !== previousIntervals.length) {
          transaction.set(previousRef, { clientId: CLIENT_ID, intervals: previousAfterRemoval }, { merge: true });
        }

        if (nextRef && next) {
          transaction.set(
            nextRef,
            { clientId: CLIENT_ID, intervals: [...nextBaseIntervals, next.interval] },
            { merge: true },
          );
        }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${APPOINTMENTS_COLLECTION}/${id}`);
    }
  },
  
  /** Direct appointment creation for admin/manual paths. Active future slots reserve the public manifest. */
  createAppointment: async (data: Omit<Appointment, 'id' | 'createdAt' | 'clientId'>): Promise<string> => {
    assertFirebase();
    try {
      const manifestEntry = getAppointmentInterval(data as Record<string, any>);
      if (!manifestEntry) {
        const docRef = await addDoc(collection(db, APPOINTMENTS_COLLECTION), {
          clientId: CLIENT_ID,
          ...data,
          createdAt: serverTimestamp(),
        });
        return docRef.id;
      }

      const docRef = doc(collection(db, APPOINTMENTS_COLLECTION));
      const manifestRef = getManifestRef(manifestEntry.staffId, manifestEntry.date);
      await runTransaction(db, async (transaction) => {
        const manifestSnap = await transaction.get(manifestRef);
        const intervals: ManifestInterval[] = manifestSnap.exists() ? (manifestSnap.data().intervals ?? []) : [];
        const conflict = intervals.some((interval) => intervalsOverlap(manifestEntry.interval, interval, manifestEntry.date));
        if (conflict) {
          throw new Error("This time slot is no longer available. Please select a different time.");
        }

        transaction.set(docRef, {
          clientId: CLIENT_ID,
          ...data,
          manifestEnd: manifestEntry.interval.end,
          createdAt: serverTimestamp(),
        });
        transaction.set(manifestRef, {
          clientId: CLIENT_ID,
          intervals: [...intervals, manifestEntry.interval],
        }, { merge: true });
      });
      return docRef.id;
    } catch (error) {
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
