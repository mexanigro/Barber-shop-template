// CRM-03 · diseño (clon de diseño): la puerta del panel. La marca del negocio, «כניסה עם Google» y, si falla, qué pasó y qué hacer
// en palabras de la dueña; el detalle técnico (Firebase, dominios autorizados) va a la consola, no a ella.
import React from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { signInWithPopup } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { siteConfig } from "../../config/site";
import { localeConfig } from "../../config/locale";
import { createGoogleAuthProvider, firebaseAuthMessage } from "../../lib/google-auth";

type Props = { onExit: () => void };

function readFirebaseCode(err: unknown): string {
  if (err && typeof err === "object" && "code" in err && typeof (err as { code: unknown }).code === "string") return (err as { code: string }).code;
  return "";
}

/** La «G» de Google en sus colores, en línea: sin pedir nada a la red. */
function LogoGoogle() {
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function AdminLoginPanel({ onExit }: Props) {
  const t = localeConfig.admin.auth;
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const brand = siteConfig.brand;
  const logo = brand.logo || brand.logoDark;
  const [sinLogo, setSinLogo] = React.useState(false);

  const handleLogin = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithPopup(auth, createGoogleAuthProvider());
    } catch (err: unknown) {
      const code = readFirebaseCode(err);
      // El detalle para quien instala la web: el dominio autorizado y el proveedor de Google en Firebase.
      console.warn(`[AdminLogin] ${code || "unknown"} · revisar Firebase Authentication (Google) y dominios autorizados (${window.location.hostname})`, err);
      setError(
        code === "auth/popup-closed-by-user" ? "החלון של גוגל נסגר לפני שהכניסה הסתיימה. אפשר לנסות שוב."
        : code === "auth/unauthorized-domain" || code === "auth/operation-not-allowed" ? "הכניסה לניהול עוד לא מוגדרת באתר הזה. דברו עם מי שבנה את האתר."
        : firebaseAuthMessage(code || "unknown", localeConfig.admin.firebaseErrors),
      );
    } finally {
      setBusy(false);
    }
  };

  const configMissing = !siteConfig.adminEmail?.trim();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm text-center">
        {logo && !sinLogo ? (
          <img src={logo} alt={brand.name} onError={() => setSinLogo(true)} className="mx-auto mb-4 h-14 w-auto max-w-[14rem] object-contain" />
        ) : (
          <span aria-hidden className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground">{brand.name.charAt(0)}</span>
        )}
        {(!logo || sinLogo) && <p className="text-sm text-muted-foreground">{brand.name}</p>}
        <h1 className="mt-1 text-2xl font-bold text-foreground">ניהול העסק</h1>

        {configMissing ? (
          <div role="alert" className="mt-8 rounded-2xl border border-red-600/30 bg-red-500/10 p-4 text-start">
            <p className="flex items-center gap-2 font-semibold text-red-900 dark:text-red-200"><AlertCircle size={18} aria-hidden />הכניסה לניהול עוד לא הוגדרה</p>
            <p className="mt-1 text-sm text-red-900 dark:text-red-200">צריך להגדיר את כתובת המייל של הבעלים בהגדרות האתר. דברו עם מי שבנה את האתר.</p>
          </div>
        ) : (
          <>
            <p className="mt-3 text-base text-muted-foreground">נכנסים עם חשבון הגוגל שהוזמן לניהול.</p>
            {error && (
              <p role="alert" className="mt-6 flex items-start gap-2 rounded-xl border border-red-600/30 bg-red-500/10 p-3 text-start text-sm text-red-900 dark:text-red-200">
                <AlertCircle size={18} aria-hidden className="mt-0.5 shrink-0" />{error}
              </p>
            )}
            <button type="button" disabled={busy} onClick={() => void handleLogin()}
              className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 text-base font-semibold text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-60">
              {busy ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <LogoGoogle />}
              {busy ? t.signingIn : t.signInGoogle}
            </button>
          </>
        )}
        <button type="button" onClick={onExit} className="mt-6 h-11 rounded-xl px-4 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
          {t.returnToSite}
        </button>
      </div>
    </main>
  );
}
