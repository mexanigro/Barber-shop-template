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

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const APPOINTMENTS_COLLECTION = 'appointments';
const CLIENT_ID = env.clientId;

export const dbService = {
  // Real-time listener for appointments
  subscribeToAppointments: (callback: (appointments: Appointment[]) => void) => {
    if (!isFirebaseConfigured) {
      console.warn("[Template Setup] Firebase not configured — appointment subscription skipped.");
      return () => {};
    }
    const q = query(
      collection(db, APPOINTMENTS_COLLECTION),
      where('clientId', '==', CLIENT_ID),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const appointments = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          staffId: data.staffId ?? (data as { barberId?: string }).barberId ?? '',
          createdAt: data.createdAt?.toDate() || new Date(),
        } as Appointment;
      });
      callback(appointments);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, APPOINTMENTS_COLLECTION);
    });
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
      return [];
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
          schedule: overrideDoc.data().schedule || staticStaff.schedule,
          blockedDates: overrideDoc.data().blockedDates || staticStaff.blockedDates || [],
          blockedSlots: overrideDoc.data().blockedSlots || staticStaff.blockedSlots || [],
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
      return '';
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

  saveStaffOverride: async (staffId: string, data: any): Promise<void> => {
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
      await updateDoc(doc(db, "config", CLIENT_ID), { businessRules: rules });
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
      await updateDoc(docRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${APPOINTMENTS_COLLECTION}/${id}`);
    }
  },
  
  deleteAppointment: async (id: string): Promise<void> => {
    assertFirebase();
    try {
      const docRef = doc(db, APPOINTMENTS_COLLECTION, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${APPOINTMENTS_COLLECTION}/${id}`);
    }
  }
};
