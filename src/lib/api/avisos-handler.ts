// CRM-03 (D-300, D-301): /api/cron/avisos, el cron de cada web (cada hora). Mira la hora de Asia/Jerusalem —el cron corre en UTC y
// Israel cambia de hora dos veces por año— y:
//   · desde las 18:00, un recordatorio a cada turno de mañana (confirmado o pendiente, con email) que todavía no lo tenga, en el idioma
//     del turno (o el base), con el remitente de la web; idempotente por turno (notification_logs type "reminder", refId = id del turno);
//   · desde las 08:00, una vez por fecha local, el resumen del día a la dueña en el idioma base (refId "digest-AAAA-MM-DD").
// Sin clave de email (enviar devuelve null) el aviso queda «queued». Con la clave del cron, `?fecha=AAAA-MM-DD` manda los recordatorios
// de esa fecha a cualquier hora (lo usa la prueba de punta a punta; el cron nunca lo pasa). Pura: todo lo de afuera entra por `deps`.
import { timingSafeEqual } from "node:crypto";
import { emailTurno, idiomaBaseDe, idiomaDe, negocioDe, nombreEnIdioma, type Idioma } from "../emails-turno.js";

export type TurnoAviso = { id: string; date: string; time: string; status: string; customerEmail?: string; customerName: string; serviceId: string; lang?: string };
export type RegistroAviso = { type: "reminder" | "digest"; refId: string; status: "sent" | "queued" | "failed"; providerMessageId?: string; error?: string; channel: "email"; recipient: string; createdAt: Date };
export type DepsAvisos = {
  secreto: string | undefined;
  ahora: Date;
  idiomaBase: Idioma;
  negocio: { nombre: string };
  remitente: string;
  emailDuena: string | undefined;
  nombreServicio: (id: string, idioma: Idioma) => string;
  turnosDe: (fecha: string) => Promise<TurnoAviso[]>;
  /** De `refs`, los que ya tienen un aviso enviado de ese tipo. */
  avisosDe: (tipo: "reminder" | "digest", refs: string[]) => Promise<string[]>;
  /** El id del proveedor, o null si no hay clave de email; lanza si el proveedor lo rechazó (queda «failed» y se reintenta a la hora siguiente). */
  enviar: (m: { from: string; to: string; subject: string; html: string }) => Promise<{ id: string } | null>;
  registrar: (l: RegistroAviso) => Promise<void>;
};
type Req = { headers?: Record<string, unknown>; query?: Record<string, unknown> };

const ZONA = "Asia/Jerusalem";
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
/** ponytail: tope fijo por corrida (≈12 × 0,8 s entra en los 15 s de Vercel con la pausa de Resend). Seis corridas por noche = 72
 *  recordatorios; si un negocio pasa de eso, subir maxDuration de la función en vercel.json y este tope. */
export const TOPE_POR_CORRIDA = 12;

/** La fecha (AAAA-MM-DD) y la hora de Asia/Jerusalem en ese instante. */
export function horaLocal(ahora: Date): { fecha: string; hora: number } {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(ahora).map((x) => [x.type, x.value]));
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora: Number(p.hour) };
}
const diaSiguiente = (fecha: string) => { const [y, m, d] = fecha.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10); };

function autorizado(req: Req, secreto: string | undefined): boolean {
  const h = req.headers?.authorization;
  if (!secreto || typeof h !== "string") return false;
  const a = Buffer.from(h), b = Buffer.from(`Bearer ${secreto}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function manejarAvisos(req: Req, deps: DepsAvisos): Promise<{ status: number; json: Record<string, unknown> }> {
  if (!autorizado(req, deps.secreto)) return { status: 401, json: { error: "Unauthorized" } };
  const { fecha: hoy, hora } = horaLocal(deps.ahora);
  const pedida = typeof req.query?.fecha === "string" && FECHA_RE.test(req.query.fecha) ? req.query.fecha : null;

  const mandar = async (tipo: RegistroAviso["type"], refId: string, to: string, e: { subject: string; html: string }) => {
    const base = { type: tipo, refId, channel: "email" as const, recipient: to, createdAt: new Date(deps.ahora) };
    try {
      const r = await deps.enviar({ from: deps.remitente, to, ...e });
      await deps.registrar({ ...base, status: r ? "sent" : "queued", ...(r ? { providerMessageId: r.id } : {}) });
      return true;
    } catch (err) {
      await deps.registrar({ ...base, status: "failed", error: String(err instanceof Error ? err.message : err) });
      return false;
    }
  };

  // Recordatorios: mañana (fecha local), desde las 18:00; o la fecha pedida.
  const recordatorios: string[] = [];
  const fechaRec = pedida ?? diaSiguiente(hoy);
  const candidatos = (await deps.turnosDe(fechaRec)).filter((t) => (t.status === "confirmed" || t.status === "pending") && t.customerEmail);
  if ((pedida || hora >= 18) && candidatos.length) {
    const ya = new Set(await deps.avisosDe("reminder", candidatos.map((t) => t.id)));
    for (const t of candidatos.filter((x) => !ya.has(x.id)).slice(0, TOPE_POR_CORRIDA)) {
      const idioma = idiomaDe(t.lang, deps.idiomaBase);
      if (await mandar("reminder", t.id, t.customerEmail!, emailTurno("recordatorio", idioma, { negocio: deps.negocio.nombre, cliente: t.customerName, servicio: deps.nombreServicio(t.serviceId, idioma), fecha: t.date, hora: t.time }))) recordatorios.push(t.id);
    }
  }

  // Resumen del día a la dueña: desde las 08:00, una vez por fecha local. Un día sin turnos no manda nada.
  let resumen = false;
  if (!pedida && hora >= 8 && deps.emailDuena) {
    const ref = `digest-${hoy}`;
    const turnos = (await deps.turnosDe(hoy)).filter((t) => t.status !== "cancelled").sort((a, b) => a.time.localeCompare(b.time));
    if (turnos.length && !(await deps.avisosDe("digest", [ref])).includes(ref)) {
      const l = deps.idiomaBase;
      resumen = await mandar("digest", ref, deps.emailDuena, emailTurno("resumen", l, { negocio: deps.negocio.nombre, fecha: hoy, turnos: turnos.map((t) => ({ hora: t.time, cliente: t.customerName, servicio: deps.nombreServicio(t.serviceId, l) })) }));
    }
  }
  return { status: 200, json: { recordatorios, resumen } };
}

// ─── La ruta, igual en los dos runtimes ────────────────────────────────────────────────────────────────────────────────────────
type DbMin = { collection: (n: string) => any; doc: (ruta: string) => { get: () => Promise<{ exists: boolean; data: () => any }> } };
type Enviar = (m: { from: string; to: string; subject: string; html: string }) => Promise<{ id: string } | null>;

export function crearRutaAvisos(o: { clientId: string; loadDb: () => Promise<DbMin | null>; enviar: Enviar; env?: Record<string, string | undefined> }) {
  const env = o.env ?? process.env;
  return async (req: Req, res: { status: (c: number) => { json: (b: unknown) => unknown } }) => {
    if (!env.CRON_SECRET) return res.status(500).json({ error: "CRON_SECRET not configured." });
    const db = await o.loadDb();
    if (!db) return res.status(503).json({ error: "Firestore unavailable." });
    const config = (await db.doc(`config/${o.clientId}`).get().catch((): null => null))?.data?.() ?? {};
    const base = idiomaBaseDe(env);
    const nombre = negocioDe(config, env);
    const r = await manejarAvisos(req, {
      secreto: env.CRON_SECRET,
      ahora: new Date(),
      idiomaBase: base,
      negocio: { nombre },
      remitente: env.EMAIL_FROM_ADDRESS || "onboarding@resend.dev",
      emailDuena: env.BUSINESS_OWNER_EMAIL || undefined,
      nombreServicio: (id, idioma) => nombreEnIdioma(config, "services", id, idioma, base),
      async turnosDe(fecha) {
        const s = await db.collection("appointments").where("clientId", "==", o.clientId).where("date", "==", fecha).get();
        // El orden de la agenda: si el tope corta, salen primero los de más temprano.
        return s.docs.map((d: any) => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => String(a.time).localeCompare(String(b.time)));
      },
      async avisosDe(tipo, refs) {
        const ya: string[] = [];
        for (let i = 0; i < refs.length; i += 30) {
          const s = await db.collection("notification_logs").where("clientId", "==", o.clientId).where("refId", "in", refs.slice(i, i + 30)).get();
          s.docs.forEach((d: any) => { const x = d.data(); if (x.type === tipo && x.status === "sent") ya.push(x.refId); });
        }
        return ya;
      },
      // Resend: ≈2 por segundo; la pausa va después de cada envío real.
      enviar: async (m) => { const r = await o.enviar(m); await new Promise((ok) => setTimeout(ok, 550)); return r; },
      registrar: async (l) => { await db.collection("notification_logs").add({ clientId: o.clientId, ...l }); },
    });
    return res.status(r.status).json(r.json);
  };
}
