// CRM-03 (D-305): con qué rol entra una cuenta y la primera entrada de una invitada. Puro y sin la config del navegador: lo importan
// el panel (por admin-auth.ts) y los dos servidores (GET /api/admin/me).
const normalizar = (email: string | null | undefined) => (email ?? "").trim().toLowerCase();

/**
 * CRM-03 (D-305): con qué rol entra una cuenta. La dueña (adminEmail) es owner; si no, vale su invitación de `admin_users` si es de
 * este cliente y no está quitada; si no, ninguno. Pura: el servidor la usa con lo que leyó de Firestore.
 */
export function rolDeEntrada(o: {
  email: string | null | undefined;
  adminEmail: string | null | undefined;
  clientId: string;
  invitacion?: { clientId?: string; role?: unknown; status?: unknown } | null;
}): "owner" | "manager" | "staff" | null {
  const email = normalizar(o.email);
  if (!email) return null;
  const duena = normalizar(o.adminEmail);
  if (duena && email === duena) return "owner";
  const inv = o.invitacion;
  // Pendiente (todavía no entró) o activa; quitada o cualquier otro estado, nada.
  if (!inv || inv.clientId !== o.clientId || (inv.status !== "pending" && inv.status !== "active")) return null;
  return inv.role === "owner" || inv.role === "manager" || inv.role === "staff" ? inv.role : null;
}

/** La primera entrada de una invitada: pendiente → activa, con la fecha. Una activa queda igual. */
export function activarInvitacion<T extends { status?: unknown; acceptedAt?: unknown }>(inv: T, ahora: Date): T & { status: "active"; acceptedAt: string } {
  if (inv.status === "active" && typeof inv.acceptedAt === "string") return inv as T & { status: "active"; acceptedAt: string };
  return { ...inv, status: "active", acceptedAt: ahora.toISOString() };
}

/**
 * CRM-04 (D-343, REV 11 y 16): la primera entrada de una invitada en los dos runtimes. Con la invitación pendiente, primero se
 * sincronizan los claims; sólo si eso salió (`synced` distinto de false y sin lanzar) se activa, con `acceptedAt` como fecha (el
 * runtime la guarda como timestamp). Si la sincronización falla, la invitación queda pendiente y la próxima entrada lo reintenta.
 * Una invitación activa no se toca. No lanza: devuelve si quedó activa.
 */
export async function primeraEntrada(
  invitacion: { status?: unknown } | null | undefined,
  o: { sincronizar: () => Promise<{ synced?: boolean } | void>; activar: (c: { status: "active"; acceptedAt: Date }) => Promise<unknown>; ahora: Date },
): Promise<boolean> {
  if (invitacion?.status !== "pending") return invitacion?.status === "active";
  try {
    const r = await o.sincronizar();
    if (r && r.synced === false) return false;
    await o.activar({ status: "active", acceptedAt: new Date(o.ahora) });
    return true;
  } catch {
    return false;
  }
}
