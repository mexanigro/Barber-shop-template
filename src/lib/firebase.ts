import { initializeApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import rawConfig from '../../firebase-applet-config.json';

// Firebase config is read from `firebase-applet-config.json` at the project root.
// When deploying this template for a new client, replace that file with the config
// from the new Firebase project (Firebase Console → Project Settings → Your Apps).
const firebaseConfig = rawConfig as Record<string, string>;

// ─── Validate config before initialising ─────────────────────────────────────
const REQUIRED_KEYS = ["apiKey", "authDomain", "projectId", "appId"] as const;
const hasValidConfig = REQUIRED_KEYS.every(
  (k) => typeof firebaseConfig[k] === "string" && firebaseConfig[k].trim() !== ""
);

// ─── Internal nullable instances ─────────────────────────────────────────────
let _db: Firestore | null = null;
let _auth: Auth | null = null;

if (!hasValidConfig) {
  console.warn(
    "[Template Setup] firebase-applet-config.json is missing required fields " +
    `(${REQUIRED_KEYS.join(", ")}). ` +
    "Database and authentication features are disabled until a valid config is provided."
  );
} else {
  try {
    const app = initializeApp(firebaseConfig);
    _db   = getFirestore(app, (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId || "(default)");
    _auth = getAuth(app);

    // Analytics is optional — load lazily so it does not bloat the initial JS bundle.
    if (typeof window !== "undefined" && firebaseConfig.measurementId) {
      void import("firebase/analytics")
        .then(({ isSupported, getAnalytics }) =>
          isSupported().then((ok) => {
            if (ok) getAnalytics(app);
          }),
        )
        .catch(() => {});
    }

    // Verify connectivity at startup. A "not found" error is expected and healthy.
    void (async () => {
      try {
        await getDocFromServer(doc(_db!, "system", "ping"));
        console.log("[Firebase] Connection established successfully.");
      } catch (err: any) {
        if (err?.message?.includes("offline")) {
          console.error("[Firebase] Offline — check your network or Firebase configuration.");
        }
      }
    })();

  } catch (err) {
    console.error(
      "[Template Setup] Firebase failed to initialize. " +
      "Verify that firebase-applet-config.json contains valid credentials.\n",
      err
    );
    _db   = null;
    _auth = null;
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────
// Asserted as their concrete types so downstream code (db.ts, etc.) needs no
// changes. When Firebase is not configured these are null at runtime — all
// callers already wrap operations in try/catch so failures are caught, not fatal.
export const db   = _db   as Firestore;
export const auth = _auth as Auth;

/** True when Firebase initialised successfully. Use for conditional UI rendering. */
export const isFirebaseConfigured = _db !== null && _auth !== null;
