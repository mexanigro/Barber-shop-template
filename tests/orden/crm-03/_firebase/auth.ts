// CRM-03 (sesión A) · doble de `firebase/auth` (alias de Vite en `_crm.ts`): la sesión es `window.__CRM03.usuario`
// ({ email, uid }) o nadie. getIdToken devuelve «token-<email>»: las rutas /api/* las responde el test por page.route.
/* eslint-disable @typescript-eslint/no-explicit-any */

function usuario(): any {
  const u = (globalThis as any).__CRM03?.usuario;
  if (!u) return null;
  return { ...u, emailVerified: true, getIdToken: async () => `token-${u.email}`, getIdTokenResult: async () => ({ token: `token-${u.email}`, claims: u.claims ?? {} }) };
}
const AUTH: any = { get currentUser() { return usuario(); } };

export function getAuth(..._a: any[]): any { return AUTH; }
export function onAuthStateChanged(_auth: any, cb: (u: any) => void): () => void {
  queueMicrotask(() => cb(usuario()));
  return () => {};
}
export async function signOut(_auth: any): Promise<void> { const w = globalThis as any; if (w.__CRM03) w.__CRM03.usuario = null; }
export async function signInWithPopup(_auth: any, _p: any): Promise<any> { return { user: usuario() }; }
export class GoogleAuthProvider { setCustomParameters(_p: any) {} addScope(_s: string) {} }
export type User = any;
export type Auth = any;
