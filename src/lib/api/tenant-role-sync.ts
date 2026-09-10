/**
 * Propagación del rol del roster al custom claim `tenantRole` (Bloque E · L13).
 *
 * El CRM tiene DOS autoridades de rol y hasta ahora no se hablaban:
 *   · `admin_users/{email}.role` gobierna los endpoints `/api/` y la UI, vía
 *     `requireAdminAuth`;
 *   · el claim `tenantRole` del idToken gobierna TODA escritura por SDK cliente,
 *     vía `firestore.rules`.
 * `PATCH /api/admin/users/:id/role` sólo tocaba el documento, de modo que un
 * ascenso staff→manager cambiaba lo que la API permitía y no lo que permitían las
 * rules; y un invitado nunca recibía claim alguna, así que podía usar `/api/` pero
 * no leer la agenda, los clientes, el inbox ni el stock desde el navegador.
 *
 * Este módulo hace del documento la fuente única: cuando el roster cambia, el
 * claim se pone al día y se revocan los refresh tokens para que la próxima sesión
 * lo tome. Lo comparten `server.ts` y `api/index.ts` con dependencias inyectadas,
 * igual que el resto de `src/lib/api/`.
 *
 * FUSIONA, no reemplaza. El camino de `DELETE` usa `setCustomUserClaims(uid, null)`
 * para expulsar, que borra TODAS las claims incluida `clientId`; copiar ese patrón
 * aquí dejaría al usuario sin tenant y, por las rules, sin acceso a nada que no sea
 * público. Aquí se conserva lo demás y se fija `clientId` + `tenantRole`.
 *
 * Límite conocido: las rules no miran `auth_time`, así que un idToken ya emitido
 * conserva el rol anterior hasta expirar (hasta 1 h). La revocación acorta la
 * ventana para sesiones nuevas; no invalida un token en vuelo.
 */
import type { AdminRole } from "../admin-users.js";

/** Superficie mínima de `firebase-admin/auth` que este módulo necesita. */
export interface TenantRoleAuth {
  getUserByEmail(email: string): Promise<{ uid: string; customClaims?: Record<string, unknown> | null }>;
  setCustomUserClaims(uid: string, claims: Record<string, unknown> | null): Promise<void>;
  revokeRefreshTokens(uid: string): Promise<void>;
}

export type TenantRoleSyncReason = "auth-user-absent" | "auth-unavailable" | "failed";

/**
 * Un solo tipo con campos opcionales, no una unión discriminada: este `tsconfig`
 * no activa `strict` ni `strictNullChecks`, y sin ellos TypeScript no estrecha de
 * forma fiable por un discriminante booleano. `reason` sólo viene cuando
 * `synced === false`.
 */
export interface TenantRoleSyncResult {
  synced: boolean;
  uid?: string;
  reason?: TenantRoleSyncReason;
  detail?: string;
}

/**
 * Pone `clientId` + `tenantRole` en las claims del usuario y revoca sus refresh
 * tokens. No lanza: devuelve el resultado para que el endpoint pueda informarlo.
 *
 * `auth-user-absent` no es un error: un invitado que todavía no entró nunca no
 * existe en Auth, y su claim se pondrá cuando el roster vuelva a sincronizarse.
 */
export async function syncTenantRoleClaim(params: {
  loadAuth: () => Promise<TenantRoleAuth | null>;
  email: string;
  clientId: string;
  tenantRole: AdminRole;
}): Promise<TenantRoleSyncResult> {
  const { loadAuth, email, clientId, tenantRole } = params;
  try {
    const auth = await loadAuth();
    if (!auth) return { synced: false, reason: "auth-unavailable" };

    let user: { uid: string; customClaims?: Record<string, unknown> | null };
    try {
      user = await auth.getUserByEmail(email);
    } catch {
      return { synced: false, reason: "auth-user-absent" };
    }

    const previas = (user.customClaims ?? {}) as Record<string, unknown>;
    await auth.setCustomUserClaims(user.uid, { ...previas, clientId, tenantRole });
    await auth.revokeRefreshTokens(user.uid);
    return { synced: true, uid: user.uid };
  } catch (err) {
    return { synced: false, reason: "failed", detail: err instanceof Error ? err.message : String(err) };
  }
}
