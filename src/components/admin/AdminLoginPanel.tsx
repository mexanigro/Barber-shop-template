import React from "react";
import { Scissors, AlertCircle } from "lucide-react";
import { signInWithPopup } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { siteConfig } from "../../config/site";
import { createGoogleAuthProvider, firebaseAuthMessageEs } from "../../lib/google-auth";

type Props = {
  onExit: () => void;
};

function readFirebaseCode(err: unknown): string {
  if (err && typeof err === "object" && "code" in err && typeof (err as { code: unknown }).code === "string") {
    return (err as { code: string }).code;
  }
  return "";
}

export function AdminLoginPanel({ onExit }: Props) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleLogin = async () => {
    const provider = createGoogleAuthProvider();
    setBusy(true);
    setError(null);
    try {
      await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      const code = readFirebaseCode(err);
      if (code === "auth/popup-closed-by-user") {
        setError(firebaseAuthMessageEs(code));
        console.warn("[AdminLogin] Popup closed / code:", code, err);
        return;
      }
      console.error("[AdminLogin] Sign-in failed:", err);
      setError(firebaseAuthMessageEs(code || "unknown"));
    } finally {
      setBusy(false);
    }
  };

  const configMissing = !siteConfig.adminEmail?.trim();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 transition-colors duration-300">
      <div className="mb-8 flex h-20 w-20 rotate-3 items-center justify-center rounded-2xl bg-accent-light shadow-2xl shadow-accent-light/20">
        <Scissors className="text-zinc-950" size={40} />
      </div>

      {configMissing ? (
        <div className="mb-8 max-w-sm space-y-4 text-center">
          <div className="status-error rounded-xl p-4">
            <AlertCircle className="mx-auto mb-2" size={24} />
            <p className="text-xs font-black uppercase tracking-widest">Configuration error</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Set <span className="font-mono text-foreground">adminEmail</span> in{" "}
              <span className="font-mono">site.ts</span> or <span className="font-mono">VITE_ADMIN_EMAIL</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={onExit}
            className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground hover:text-accent-light"
          >
            Return to site
          </button>
        </div>
      ) : (
        <>
          <h2 className="mb-2 text-3xl font-black uppercase tracking-tighter text-foreground">
            Terminal <span className="text-accent-light">Access</span>
          </h2>
          <div className="mb-8 flex items-center justify-center gap-2">
            <div className="h-1 w-1 rounded-full bg-border" />
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground">
              Authorized personnel only
            </p>
            <div className="h-1 w-1 rounded-full bg-border" />
          </div>

          {error ? (
            <div className="mb-6 max-w-md space-y-2 text-left">
              <p className="text-sm leading-relaxed text-red-500">{error}</p>
              <p className="text-[10px] text-muted-foreground">
                Comprueba en Firebase Console: Authentication → Sign-in method (Google) y Settings → Authorized
                domains (<span className="font-mono">localhost</span> o tu dominio).
              </p>
            </div>
          ) : null}

          <button
            type="button"
            disabled={busy}
            onClick={() => void handleLogin()}
            className="flex w-full max-w-sm items-center justify-center gap-4 rounded-[20px] bg-card px-10 py-5 font-black uppercase tracking-widest text-card-foreground shadow-2xl transition-all active:scale-[0.98] disabled:opacity-60"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-muted">
              <img
                src="https://www.google.com/favicon.ico"
                className="h-3 w-3 grayscale"
                alt=""
              />
            </div>
            <span className="text-[11px]">{busy ? "Opening…" : "Secure sign-in with Google"}</span>
          </button>

          <button
            type="button"
            onClick={onExit}
            className="mt-12 text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground transition-colors hover:text-foreground"
          >
            Return to site
          </button>
        </>
      )}
    </div>
  );
}
