import React from "react";
import { pl, tp } from "./crm03/textos-pantallas";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { isAdminUser, normalizeEmail } from "../../lib/admin-auth";
import { isAdminRole, type AdminRole } from "../../lib/admin-users";
import { localeConfig } from "../../config/locale";
import { UnauthorizedAdmin } from "./UnauthorizedAdmin";
import { AdminLoginPanel } from "./AdminLoginPanel";

type Props = {
  children: React.ReactNode;
  /** Navigate away from admin (e.g. back to public site) */
  onExit: () => void;
};

/** CRM-03 (D-305): con qué rol entró quien abre el panel. Fuera del panel, el menor (staff): nada se muestra de más por error. */
export type RolAdmin = { rol: AdminRole; email: string };
const RolAdminContext = React.createContext<RolAdmin>({ rol: "staff", email: "" });
export const useRolAdmin = () => React.useContext(RolAdminContext);

function AuthLoading() {
  return (
    <div role="status" className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background">
      <div aria-hidden className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary motion-reduce:animate-none" />
      <p className="text-sm text-muted-foreground">{localeConfig.admin.auth.verifying}</p>
    </div>
  );
}

/**
 * Bunker gate: Firebase session required. Entra la dueña (siteConfig.adminEmail) o quien `GET /api/admin/me` acepta (su invitación
 * de admin_users: empleada o gerente, CRM-03 D-305). Es sólo la puerta de la pantalla: cada llamada al servidor se vuelve a verificar.
 * C-1 FIX: Demo mode NEVER bypasses auth. Auth is always enforced.
 */
export function ProtectedRoute({ children, onExit }: Props) {
  const [user, setUser] = React.useState<User | null>(() => auth?.currentUser ?? null);
  const [loading, setLoading] = React.useState(true);
  const [acceso, setAcceso] = React.useState<RolAdmin | "negado" | "error" | null>(null);
  const [intento, setIntento] = React.useState(0);

  React.useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  React.useEffect(() => {
    if (!user) { setAcceso(null); return; }
    const email = normalizeEmail(user.email);
    if (isAdminUser(user)) { setAcceso({ rol: "owner", email }); return; }
    let vivo = true;
    // CRM-04 (D-349): el rol que ya llegó para esta cuenta se queda mientras se vuelve a pedir (el modo estricto de React corre este
    // efecto dos veces al aparecer el panel; antes eso vaciaba el menú). Otra cuenta, o un reintento después de un error, vuelve a cero.
    setAcceso((previo) => (previo && typeof previo === "object" && previo.email === email ? previo : null));
    void (async () => {
      try {
        const token = await user.getIdToken();
        const r = await fetch("/api/admin/me", { headers: { Authorization: `Bearer ${token}` } });
        if (!vivo) return;
        if (r.status === 401 || r.status === 403) { setAcceso("negado"); return; }
        const d = r.ok ? ((await r.json()) as { role?: unknown }) : null;
        // La primera entrada le pone los claims (clientId, tenantRole): un token nuevo los trae; sin él, la agenda (SDK cliente) le
        // respondería «sin permiso» hasta que el token se renueve solo.
        if (d && isAdminRole(d.role)) await user.getIdToken(true).catch((): undefined => undefined);
        if (!vivo) return;
        setAcceso(d && isAdminRole(d.role) ? { rol: d.role, email } : r.ok ? "negado" : "error");
      } catch {
        if (vivo) setAcceso("error");
      }
    })();
    return () => { vivo = false; };
    // CRM-04 (D-349): por la cuenta (uid), no por el objeto: un `user` nuevo de la misma cuenta no vuelve a la pantalla de carga.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, intento]);

  const salir = async () => {
    // B-2: Clear any CRM data from memory on logout to prevent PII leakage.
    try { sessionStorage.clear(); } catch {}
    if (auth) await signOut(auth);
  };

  if (loading) {
    return <AuthLoading />;
  }

  if (!user) {
    return <AdminLoginPanel onExit={onExit} />;
  }

  if (acceso === "negado") {
    // CRM-03 diseño: «כניסה עם חשבון אחר» sale de la cuenta y deja la pantalla de entrada (no manda a la web).
    return <UnauthorizedAdmin email={user.email} onSignOut={salir} />;
  }

  if (acceso === "error") {
    // Una caída de red no es «no tenés acceso»: lo dice y deja volver a probar.
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
        <div role="alert" className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-xl font-bold text-foreground">{tp().login.checkFailTitle}</h1>
          <p className="text-base text-muted-foreground">{tp().login.checkFailBody}</p>
          <button type="button" onClick={() => setIntento((n) => n + 1)} className="h-12 w-full rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground">
            {tp().common.retry}
          </button>
          <button type="button" onClick={() => void salir()} className="h-11 w-full rounded-xl px-6 text-sm font-semibold text-muted-foreground hover:text-foreground">
            {tp().login.otherAccount}
          </button>
        </div>
      </main>
    );
  }

  if (!acceso) {
    // CRM-04 (D-349): mientras GET /api/admin/me no respondió, el panel con el menú de menor acceso (el de la empleada), nunca
    // vacío; cuando llega el rol, el suyo. Cada llamada al servidor se sigue verificando por su cuenta.
    return <RolAdminContext.Provider value={{ rol: "staff", email: normalizeEmail(user.email) }}>{children}</RolAdminContext.Provider>;
  }

  return <RolAdminContext.Provider value={acceso}>{children}</RolAdminContext.Provider>;
}
