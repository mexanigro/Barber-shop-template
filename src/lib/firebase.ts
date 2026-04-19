import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId || '(default)');
export const auth = getAuth(app);

/** Analytics solo en entornos que lo soportan (evita errores fuera del navegador). */
void isSupported()
  .then((ok) => {
    const mid = (firebaseConfig as { measurementId?: string }).measurementId;
    if (ok && mid) {
      getAnalytics(app);
    }
  })
  .catch(() => {});
/** Pantallas de Google OAuth en español cuando el SDK lo permite */
auth.languageCode = "es";

// Connectivity Test
async function testConnection() {
  try {
    // We use getDocFromServer to force a network request and verify config
    await getDocFromServer(doc(db, 'system', 'ping'));
    console.log("Firebase connection established successfully.");
  } catch (error: any) {
    if (error.message && error.message.includes('the client is offline')) {
      console.error("Firebase is offline. Check your configuration or network.");
    }
    // Other errors are expected if 'system/ping' doesn't exist, but connection is still tested
  }
}

testConnection();
