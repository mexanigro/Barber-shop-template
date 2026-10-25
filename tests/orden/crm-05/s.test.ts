// CRM-05 · S1–S6, S8–S11 (T) · la puerta: lo que las reglas de Firestore dejan hacer por el SDK (D-361, D-362, D-366, D-368).
// Sesión A (2026-10-25): tests rojos. S7 (el PATCH de cobro) vive en `p.test.ts`, con el handler.
//
// Medido en T 8b2859c (= 6a8dbb2): `clients/{id}` lo escriben owner y manager (`firestore.rules:112-115`); ninguna regla de lectura
// llama `isClientStatusAllowed`; el update de `appointments` no mira qué campos cambian (`:130-133`); el delete de `daily_manifests` es
// de `isTenantAdmin` y el update no mira los intervalos (`:321-330`); `payments`, `invoices`, `notification_logs`, `staff_overrides` y
// `provider_messages` los lee `isTenantAdmin` (staff incluido); `isStaffCustomerUpdate` incluye `amountPaidCents` y
// `lifetimeValueCents` (`:82-87`); `config` y `daily_manifests` se leen con `allow read: if true` (listar incluido); `contact_inbox` se
// crea sin sesión (`:227-232`); y `isTenantAdmin` mira sólo los claims (`:30-33`). Sin emulador: `_reglas.ts` (copia editable del de
// CRM-04) EVALÚA `firestore.rules` del árbol. Toda pregunta lleva `clients/c1` con un estado y el `admin_users/<email>` de cada rol
// activo (salvo S11, que lo quita), así S2 y S11 no se pisan con las otras.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from "node:test";
import assert from "node:assert/strict";
import { leerReglas, permitido } from "./_reglas.ts";
import { ASHKELON, ROOT, fuente, git } from "./_comun.ts";

const C = "c1";
const ROLES = ["owner", "manager", "staff"] as const;
type Rol = (typeof ROLES)[number];
const correo = (rol: string) => `${rol}@salon.co.il`;
const ts = (ms: number) => ({ __ts: ms });
const auth = (rol: Rol, o: { email?: string; clientId?: string } = {}) => ({ uid: `u-${rol}`, token: { clientId: o.clientId ?? C, tenantRole: rol, email: o.email ?? correo(rol), email_verified: true } });
/** `clients/c1` con `status` y el `admin_users` de los tres roles, activos (D-368). */
const docsCon = (status = "active", extra: Record<string, any> = {}) => ({
  [`clients/${C}`]: { status },
  ...Object.fromEntries(ROLES.map((r) => [`admin_users/${correo(r)}`, { email: correo(r), clientId: C, role: r, status: "active" }])),
  ...extra,
});
const turno = (x: Record<string, any> = {}): Record<string, any> => ({ clientId: C, customerName: "נועה", customerEmail: "noa@salon.co.il", customerPhone: "050-000-0001", serviceId: "cut", staffId: "s1", date: "2026-10-30", time: "10:00", duration: 60, status: "confirmed", type: "appointment", manifestEnd: "11:00", createdAt: ts(1), ...x });
const sin = (o: Record<string, any>, ...ks: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !ks.includes(k)));
const cliente = (x: Record<string, any> = {}): Record<string, any> => ({ clientId: C, email: "noa@salon.co.il", fullName: "נועה", phone: "050-000-0001", source: "booking", stage: "lead", visitCount: 0, tags: [] as string[], notes: "", createdAt: ts(1), updatedAt: ts(1), ...x });
const CFG = { services: [{ id: "cut", name: "תספורת", price: 100, duration: 60 }], adminEmail: correo("owner"), businessRules: { bufferMinutes: 0 } };
const intervalo = (start: string, end: string) => ({ start, end });
const manifiesto = (intervals: { start: string; end: string }[]) => ({ clientId: C, intervals });
const MANIF = `daily_manifests/${C}_s1_2026-10-30`;

type Pregunta = { op: "create" | "update" | "delete" | "get" | "list"; ruta: string; auth?: any; datos?: any; guardado?: any; docs?: Record<string, any> };
/** Corre una pregunta y anota la falla si la respuesta no es la esperada. Un error del intérprete («reglas: no entiendo …») se anota. */
function preguntar(reglas: any, fallas: string[], desc: string, espera: boolean, p: Pregunta) {
  let ok: boolean;
  try { ok = permitido(reglas, p.op, p.ruta, { auth: p.auth, datos: p.datos, guardado: p.guardado, docs: p.docs }); }
  catch (e) { fallas.push(`${desc}: ${(e as Error).message}`); return; }
  if (ok !== espera) fallas.push(`${desc}: ${espera ? "se permite" : "se rechaza"} (hoy ${ok ? "se permite" : "se rechaza"})`);
}
function conReglas(fallas: string[], fn: (reglas: any) => void) {
  try { fn(leerReglas(fuente("firestore.rules"))); } catch (e) { fallas.push(`firestore.rules: ${(e as Error).message}`); }
}

test("las reglas de `clients/{id}` no dejan escribir a ningún rol del negocio: owner y manager no pueden cambiar `status` de \"suspended\" a \"active\"", () => {
  const fallas: string[] = [];
  conReglas(fallas, (reglas) => {
    const docs = docsCon("suspended");
    for (const rol of ROLES) {
      preguntar(reglas, fallas, `${rol} cambia clients/c1 de suspended a active`, false, { op: "update", ruta: `clients/${C}`, auth: auth(rol), docs, guardado: { status: "suspended" }, datos: { status: "active" } });
      preguntar(reglas, fallas, `${rol} crea clients/c1`, false, { op: "create", ruta: `clients/${C}`, auth: auth(rol), docs: sin(docs, `clients/${C}`), datos: { status: "active" } });
      preguntar(reglas, fallas, `${rol} borra clients/c1`, false, { op: "delete", ruta: `clients/${C}`, auth: auth(rol), docs, guardado: { status: "suspended" } });
      // Tampoco con el negocio activo (que S2 no lo tape): ningún cambio de estado ni de otro campo, ni borrarlo.
      const activo = docsCon("active");
      preguntar(reglas, fallas, `${rol} cambia clients/c1 (activo) a trial`, false, { op: "update", ruta: `clients/${C}`, auth: auth(rol), docs: activo, guardado: { status: "active" }, datos: { status: "trial" } });
      preguntar(reglas, fallas, `${rol} escribe otro campo de clients/c1 (activo)`, false, { op: "update", ruta: `clients/${C}`, auth: auth(rol), docs: activo, guardado: { status: "active" }, datos: { status: "active", plan: "pro" } });
      preguntar(reglas, fallas, `${rol} borra clients/c1 (activo)`, false, { op: "delete", ruta: `clients/${C}`, auth: auth(rol), docs: activo, guardado: { status: "active" } });
    }
    // La otra dirección: la dueña sigue leyendo su estado (CRM-04 R4: un tenant apagado se muestra apagado). D-361 sólo cierra la escritura.
    preguntar(reglas, fallas, "owner lee clients/c1 (activo)", true, { op: "get", ruta: `clients/${C}`, auth: auth("owner"), docs: docsCon("active"), guardado: { status: "active" } });
  });
  assert.deepEqual(fallas, [], `S1 · clients/{id} sin escrituras del negocio:\n${fallas.join("\n")}`);
});

test("con `clients/{id}.status` en \"suspended\" o \"archived\", owner, manager y staff no leen ni escriben `appointments`, `customers`, `config` ni `daily_manifests` por el SDK, y con \"active\", \"trial\" o \"maintenance\" sí", () => {
  const fallas: string[] = [];
  conReglas(fallas, (reglas) => {
    for (const status of ["suspended", "archived", "active", "trial", "maintenance"]) {
      const espera = ["active", "trial", "maintenance"].includes(status);
      const docs = docsCon(status);
      for (const rol of ROLES) {
        const a = auth(rol);
        const q = (desc: string, p: Omit<Pregunta, "auth" | "docs">) => preguntar(reglas, fallas, `${status} · ${rol} · ${desc}`, espera, { ...p, auth: a, docs });
        q("lee un turno", { op: "get", ruta: "appointments/a1", guardado: turno() });
        q("lista los turnos", { op: "list", ruta: "appointments/a1", guardado: turno() });
        q("crea un turno", { op: "create", ruta: "appointments/a2", datos: turno() });
        q("cancela un turno", { op: "update", ruta: "appointments/a1", guardado: turno(), datos: turno({ status: "cancelled" }) });
        q("lee una clienta", { op: "get", ruta: `customers/${C}_h1`, guardado: cliente() });
        q("lista las clientas", { op: "list", ruta: `customers/${C}_h1`, guardado: cliente() });
        q("crea una clienta", { op: "create", ruta: `customers/${C}_h2`, datos: cliente({ email: "dana@salon.co.il" }) });
        q(rol === "staff" ? "escribe la nota de una clienta" : "cambia la etapa de una clienta", { op: "update", ruta: `customers/${C}_h1`, guardado: cliente(), datos: cliente(rol === "staff" ? { notes: "צבע 7", updatedAt: ts(2) } : { stage: "converted", updatedAt: ts(2) }) });
        q("lee config/c1", { op: "get", ruta: `config/${C}`, guardado: CFG });
        if (rol !== "staff" || !espera) q("escribe config/c1", { op: "update", ruta: `config/${C}`, guardado: CFG, datos: { ...CFG, businessRules: { bufferMinutes: 10 } } });
        q("lee un manifiesto", { op: "get", ruta: MANIF, guardado: manifiesto([intervalo("10:00", "11:00")]) });
        q("crea un manifiesto", { op: "create", ruta: `daily_manifests/${C}_s1_2026-10-31`, datos: manifiesto([intervalo("10:00", "11:00")]) });
        q("agrega un intervalo a un manifiesto", { op: "update", ruta: MANIF, guardado: manifiesto([intervalo("10:00", "11:00")]), datos: manifiesto([intervalo("10:00", "11:00"), intervalo("12:00", "13:00")]) });
      }
    }
  });
  assert.deepEqual(fallas, [], `S2 · el negocio suspendido no lee ni escribe:\n${fallas.join("\n")}`);
});

test("las reglas de `appointments` no dejan cambiar por el SDK `amountPaidCents`, `paymentStatus`, `paymentMethod`, `paidAt`, `cobros`, `precioCents` ni `priceCents` a ningún rol; `customerEmail` sólo cambia cuando el guardado no es un email válido y el nuevo es `import_<id>@noemail.local` de ese turno; y sí dejan cambiar `status`, `date` y `time` dentro de lo que hoy valida `isValidAppointment`", () => {
  const fallas: string[] = [];
  conReglas(fallas, (reglas) => {
    const docs = docsCon();
    const conDinero = turno({ amountPaidCents: 3000, paymentStatus: "deposit_paid", paymentMethod: "cash", paidAt: ts(5), cobros: [{ id: "k1", montoCents: 3000, metodo: "cash", at: ts(5), por: correo("owner") }], precioCents: 10000, priceCents: 10000 });
    const cambios: Record<string, any> = { amountPaidCents: 9000, paymentStatus: "paid", paymentMethod: "card", paidAt: ts(9), cobros: [...conDinero.cobros, { id: "k2", montoCents: 6000, metodo: "card", at: ts(9), por: correo("owner") }], precioCents: 1, priceCents: 1 };
    for (const rol of ROLES) {
      const q = (desc: string, espera: boolean, guardado: any, datos: any) => preguntar(reglas, fallas, `${rol} · ${desc}`, espera, { op: "update", ruta: "appointments/a1", auth: auth(rol), docs, guardado, datos });
      for (const [k, v] of Object.entries(cambios)) {
        q(`cambia ${k} de un turno que lo tiene`, false, conDinero, { ...conDinero, [k]: v });
        q(`pone ${k} en un turno que no lo tiene`, false, turno(), turno({ [k]: v }));
      }
      // El saneo del email de un turno importado (D-362): sólo a `import_<id>@noemail.local` de ese turno, y sólo si el guardado no es válido.
      const importado = turno({ customerEmail: "o'neil@x.co.il" });
      q("cancela un turno de «o'neil@x.co.il» saneando el email a import_a1@noemail.local", true, importado, { ...importado, status: "cancelled", customerEmail: "import_a1@noemail.local" });
      q("mueve un turno de «o'neil@x.co.il» saneando el email a import_a1@noemail.local", true, importado, { ...importado, date: "2026-10-31", time: "12:00", customerEmail: "import_a1@noemail.local" });
      q("sanea «o'neil@x.co.il» al import de OTRO turno (import_a9@noemail.local)", false, importado, { ...importado, status: "cancelled", customerEmail: "import_a9@noemail.local" });
      q("cambia «o'neil@x.co.il» por otro email válido", false, importado, { ...importado, status: "cancelled", customerEmail: "otra@salon.co.il" });
      q("cambia un email válido por import_a1@noemail.local", false, turno(), turno({ customerEmail: "import_a1@noemail.local" }));
      q("cambia un email válido por otro", false, turno(), turno({ customerEmail: "otra@salon.co.il" }));
      // Lo que sí: el estado, la fecha y la hora, dentro de lo que valida isValidAppointment.
      q("cancela un turno", true, turno(), turno({ status: "cancelled" }));
      q("marca un turno como realizado", true, turno(), turno({ status: "completed" }));
      q("mueve un turno de fecha y hora", true, turno(), turno({ date: "2026-11-02", time: "12:30" }));
      q("pone un estado que no existe", false, turno(), turno({ status: "borrado" }));
      q("pone una hora mal escrita", false, turno(), turno({ time: "9:5" }));
      q("pone una fecha mal escrita", false, turno(), turno({ date: "30/10/2026" }));
    }
  });
  assert.deepEqual(fallas, [], `S3 · el dinero y el email de un turno no cambian por el SDK:\n${fallas.join("\n")}`);
});

test("las reglas de `daily_manifests` dejan borrar sólo a owner y manager, y a staff le dejan actualizar un manifiesto sólo si conserva cada intervalo que tenía", () => {
  const fallas: string[] = [];
  conReglas(fallas, (reglas) => {
    const docs = docsCon();
    const a = intervalo("10:00", "11:00"), b = intervalo("12:00", "13:00");
    const m0 = manifiesto([a, b]);
    for (const rol of ROLES) preguntar(reglas, fallas, `${rol} borra un manifiesto`, rol !== "staff", { op: "delete", ruta: MANIF, auth: auth(rol), docs, guardado: m0 });
    const staff = (desc: string, espera: boolean, intervals: { start: string; end: string }[]) => preguntar(reglas, fallas, `staff · ${desc}`, espera, { op: "update", ruta: MANIF, auth: auth("staff"), docs, guardado: m0, datos: manifiesto(intervals) });
    staff("agrega un intervalo", true, [a, b, intervalo("15:00", "16:00")]);
    staff("saca un intervalo", false, [a]);
    staff("vacía el manifiesto", false, []);
    staff("cambia un intervalo por otro", false, [a, intervalo("14:00", "15:00")]);
    // La otra dirección: la dueña y la gerente siguen liberando un intervalo (cancelar y mover por el SDK, el CRM viejo).
    for (const rol of ["owner", "manager"] as const) preguntar(reglas, fallas, `${rol} saca un intervalo`, true, { op: "update", ruta: MANIF, auth: auth(rol), docs, guardado: m0, datos: manifiesto([a]) });
  });
  assert.deepEqual(fallas, [], `S4 · los manifiestos y la empleada:\n${fallas.join("\n")}`);
});

test("staff no lee `payments`, `invoices`, `notification_logs`, `staff_overrides` ni `provider_messages`, y owner y manager sí", () => {
  const fallas: string[] = [];
  conReglas(fallas, (reglas) => {
    const docs = docsCon();
    const guardados: Record<string, any> = {
      payments: { clientId: C, amountCents: 25000, status: "paid", createdAt: ts(1) },
      invoices: { clientId: C, number: "1001", totalCents: 25000, createdAt: ts(1) },
      notification_logs: { clientId: C, channel: "email", recipient: "noa@salon.co.il", type: "reminder", status: "sent", createdAt: ts(1) },
      staff_overrides: { clientId: C, staffId: "s1", schedule: {} },
      provider_messages: { clientId: C, businessName: "סלון", message: "שלום", sender: "provider", status: "new", createdAt: ts(1) },
    };
    for (const [col, g] of Object.entries(guardados)) for (const rol of ROLES) for (const op of ["get", "list"] as const) {
      preguntar(reglas, fallas, `${rol} · ${op === "get" ? "lee" : "lista"} ${col}`, rol !== "staff", { op, ruta: `${col}/${C}_x`, auth: auth(rol), docs, guardado: g });
    }
  });
  assert.deepEqual(fallas, [], `S5 · lo que la empleada no lee:\n${fallas.join("\n")}`);
});

test("staff no escribe `amountPaidCents` ni `lifetimeValueCents` de `customers`, y sigue pudiendo los demás campos de D-343", () => {
  const fallas: string[] = [];
  conReglas(fallas, (reglas) => {
    const docs = docsCon();
    const guardado = cliente();
    const q = (desc: string, espera: boolean, cambios: Record<string, any>) => preguntar(reglas, fallas, `staff · ${desc}`, espera, { op: "update", ruta: `customers/${C}_h1`, auth: auth("staff"), docs, guardado, datos: { ...guardado, ...cambios } });
    q("escribe amountPaidCents", false, { amountPaidCents: 5000, updatedAt: ts(2) });
    q("escribe lifetimeValueCents", false, { lifetimeValueCents: 9000, updatedAt: ts(2) });
    const D343: Record<string, any> = { fullName: "נועה כהן", phone: "050-999-9999", notes: "צבע 7", tags: ["כלה"], trato: "f", lastServiceId: "cut", paymentMethod: "cash", updatedAt: ts(2) };
    for (const [k, v] of Object.entries(D343)) q(`escribe ${k}`, true, { [k]: v, updatedAt: ts(2) });
    q("escribe todos los demás campos de D-343 juntos", true, D343);
  });
  assert.deepEqual(fallas, [], `S6 · la empleada y el dinero de una clienta:\n${fallas.join("\n")}`);
});

test("un usuario sin sesión no puede listar `config` ni `daily_manifests`, y sí puede leer `config/<id>` y `daily_manifests/<id>` por id", () => {
  const fallas: string[] = [];
  conReglas(fallas, (reglas) => {
    const docs = docsCon();
    const man = manifiesto([intervalo("10:00", "11:00")]);
    preguntar(reglas, fallas, "sin sesión · lista config", false, { op: "list", ruta: `config/${C}`, auth: null, docs, guardado: CFG });
    preguntar(reglas, fallas, "sin sesión · lista daily_manifests", false, { op: "list", ruta: MANIF, auth: null, docs, guardado: man });
    preguntar(reglas, fallas, "sin sesión · lee config/c1", true, { op: "get", ruta: `config/${C}`, auth: null, docs, guardado: CFG });
    preguntar(reglas, fallas, `sin sesión · lee ${MANIF}`, true, { op: "get", ruta: MANIF, auth: null, docs, guardado: man });
  });
  assert.deepEqual(fallas, [], `S8 · lo público sólo por id:\n${fallas.join("\n")}`);
});

test("nadie crea `contact_inbox` por el SDK, ni con sesión ni sin ella", () => {
  const fallas: string[] = [];
  conReglas(fallas, (reglas) => {
    const docs = docsCon();
    const consulta = { clientId: C, name: "אור", email: "or@salon.co.il", phone: "050-000-0002", subject: "שעות פתיחה", message: "האם אתן פתוחות ביום שישי?", source: "web", status: "new", createdAt: ts(1) };
    preguntar(reglas, fallas, "sin sesión · crea una consulta", false, { op: "create", ruta: "contact_inbox/m1", auth: null, docs, datos: consulta });
    for (const rol of ROLES) preguntar(reglas, fallas, `${rol} · crea una consulta`, false, { op: "create", ruta: "contact_inbox/m1", auth: auth(rol), docs, datos: consulta });
    // La otra dirección: la bandeja se sigue leyendo.
    preguntar(reglas, fallas, "owner · lista la bandeja", true, { op: "list", ruta: "contact_inbox/m1", auth: auth("owner"), docs, guardado: consulta });
  });
  assert.deepEqual(fallas, [], `S9 · la bandeja sin altas por el SDK:\n${fallas.join("\n")}`);
});

// ─── S10: los accesos por el SDK del CRM de Ashkelon ──────────────────────────────────────────────────────────────────────────────
// El catálogo sale de leer, en las cuatro versiones (`git show <sha>:<ruta>`; los servicios y las pestañas del CRM son iguales en las
// cuatro, `git diff --stat 43177c8 b3a97e9 -- src/services src/components/admin` vacío), cada llamada de lectura o escritura por el SDK
// de `src/services/{tenant,db,customers,stock,inbox,support,notificationLogs}.ts` y las dos altas con monto de `PaymentsTab.tsx` y
// `CustomersTab.tsx`. Cada acceso lleva su ancla: el texto de la versión que lo hace (si no está, el catálogo no es el de esa versión y
// se anota). Quedan fuera, porque las reglas de hoy ya los niegan y la web los trata así: la lectura anónima de `clients/{id}` (la web
// la toma como activa), `system/ping` (`firebase.ts`, la prueba de conexión) y la colección vieja `stock/{id}/items` (el catch-all).
type Acceso = { archivo: string; ancla: RegExp; desc: string; quien: "anonimo" | "duena"; op: Pregunta["op"]; ruta: string; datos?: any; guardado?: any };
const DUENA = auth("owner");
const IMPORTADO = turno({ customerEmail: "o'neil@x.co.il" });
const SIN_STAFF = turno({ staffId: null, customerEmail: null, manifestEnd: undefined });
const ITEM = { clientId: C, name: "שמפו", category: "טיפוח", unit: "unidades", quantity: 12, minStock: 3, createdAt: ts(1), updatedAt: ts(1) };
const MOV = { clientId: C, itemId: "s1", type: "add", quantity: 2, previousQuantity: 12, reason: "קנייה", performedBy: correo("owner"), createdAt: ts(2) };
const CONSULTA = { clientId: C, name: "אור", email: "or@salon.co.il", subject: "שאלה", message: "שלום", source: "web", status: "new", createdAt: ts(1) };
const MENSAJE = { clientId: C, businessName: "סלון", message: "שלום", sender: "provider", status: "new", createdAt: ts(1) };
const OVERRIDE = { clientId: C, staffId: "s1", schedule: { sunday: { isOpen: true } } };
const limpio = (o: any) => JSON.parse(JSON.stringify(o)); // sin las claves undefined
const ACCESOS: Acceso[] = [
  { archivo: "src/services/tenant.ts", ancla: /getDoc\(doc\(db, "config", clientId\)\)/, desc: "la web lee config/{id}", quien: "anonimo", op: "get", ruta: `config/${C}`, guardado: CFG },
  { archivo: "src/services/tenant.ts", ancla: /getDoc\(doc\(db, "config", clientId\)\)/, desc: "el CRM lee config/{id}", quien: "duena", op: "get", ruta: `config/${C}`, guardado: CFG },
  { archivo: "src/services/tenant.ts", ancla: /getDocFromServer\(doc\(db, "clients", clientId\)\)/, desc: "el CRM lee clients/{id}", quien: "duena", op: "get", ruta: `clients/${C}`, guardado: { status: "active" } },
  { archivo: "src/services/db.ts", ancla: /getDoc\(doc\(db, 'daily_manifests'/, desc: "la web lee un manifiesto por id", quien: "anonimo", op: "get", ruta: MANIF, guardado: manifiesto([intervalo("10:00", "11:00")]) },
  { archivo: "src/services/db.ts", ancla: /where\('clientId', '==', CLIENT_ID\),\s*orderBy\('createdAt', 'desc'\)/, desc: "el CRM lista los turnos", quien: "duena", op: "list", ruta: "appointments/a1", guardado: turno() },
  { archivo: "src/services/db.ts", ancla: /where\('date', '==', date\)/, desc: "el CRM lista los turnos de un día", quien: "duena", op: "list", ruta: "appointments/a1", guardado: turno() },
  { archivo: "src/services/db.ts", ancla: /addDoc\(collection\(db, APPOINTMENTS_COLLECTION\)/, desc: "el CRM crea un turno sin reservar la hora (visita)", quien: "duena", op: "create", ruta: "appointments/a2", datos: sin(turno({ status: "completed", customerEmail: "walkin_1760000000000@noemail.local" }), "manifestEnd") },
  { archivo: "src/services/db.ts", ancla: /transaction\.set\(docRef, \{\s*clientId: CLIENT_ID,\s*\.\.\.data,\s*manifestEnd: endTime/, desc: "el CRM crea un turno reservando la hora", quien: "duena", op: "create", ruta: "appointments/a3", datos: turno() },
  { archivo: "src/services/db.ts", ancla: /transaction\.set\(manifestRef, \{\s*clientId: CLIENT_ID,\s*intervals: \[\.\.\.occupiedIntervals/, desc: "el CRM crea el manifiesto de un día sin turnos", quien: "duena", op: "create", ruta: `daily_manifests/${C}_s1_2026-10-31`, datos: manifiesto([intervalo("10:00", "11:00")]) },
  { archivo: "src/services/db.ts", ancla: /transaction\.set\(manifestRef, \{\s*clientId: CLIENT_ID,\s*intervals: \[\.\.\.occupiedIntervals/, desc: "el CRM agrega un intervalo a un manifiesto", quien: "duena", op: "update", ruta: MANIF, guardado: manifiesto([intervalo("10:00", "11:00")]), datos: manifiesto([intervalo("10:00", "11:00"), intervalo("12:00", "13:00")]) },
  { archivo: "src/services/db.ts", ancla: /decorate: \(before, fields\) => \(\{ \.\.\.fields, \.\.\.healImportedFields\(id, before, updates\) \}\)/, desc: "el CRM cancela un turno", quien: "duena", op: "update", ruta: "appointments/a1", guardado: turno(), datos: turno({ status: "cancelled" }) },
  { archivo: "src/services/db.ts", ancla: /manifestRef: \(staffId, date\) => doc\(db, 'daily_manifests'/, desc: "el CRM libera el intervalo al cancelar o mover", quien: "duena", op: "update", ruta: MANIF, guardado: manifiesto([intervalo("10:00", "11:00")]), datos: manifiesto([]) },
  { archivo: "src/services/db.ts", ancla: /heal\.customerEmail = `import_\$\{id\}@noemail\.local`/, desc: "el CRM cancela un turno de «o'neil@x.co.il» saneando el email", quien: "duena", op: "update", ruta: "appointments/a1", guardado: IMPORTADO, datos: { ...IMPORTADO, status: "cancelled", customerEmail: "import_a1@noemail.local" } },
  { archivo: "src/services/db.ts", ancla: /decorate: \(before, fields\) => \(\{ \.\.\.fields, \.\.\.healImportedFields\(id, before, updates\) \}\)/, desc: "el CRM mueve un turno (fecha, hora y fin del intervalo)", quien: "duena", op: "update", ruta: "appointments/a1", guardado: turno(), datos: turno({ date: "2026-10-31", time: "12:00", manifestEnd: "13:00" }) },
  { archivo: "src/services/db.ts", ancla: /heal\.customerEmail = `import_\$\{id\}@noemail\.local`/, desc: "el CRM mueve un turno de «o'neil@x.co.il» saneando el email", quien: "duena", op: "update", ruta: "appointments/a1", guardado: IMPORTADO, datos: { ...IMPORTADO, date: "2026-10-31", time: "12:00", manifestEnd: "13:00", customerEmail: "import_a1@noemail.local" } },
  { archivo: "src/services/db.ts", ancla: /if \(typeof staffId !== 'string'\) heal\.staffId = ''/, desc: "el CRM cancela un turno importado sin persona ni email, saneando los dos", quien: "duena", op: "update", ruta: "appointments/a1", guardado: limpio(SIN_STAFF), datos: limpio({ ...SIN_STAFF, status: "cancelled", customerEmail: "import_a1@noemail.local", staffId: "" }) },
  { archivo: "src/services/db.ts", ancla: /await deleteDoc\(docRef\)/, desc: "el CRM borra un turno", quien: "duena", op: "delete", ruta: "appointments/a1", guardado: turno() },
  { archivo: "src/services/db.ts", ancla: /transaction\.update\(manifestRef, \{ intervals: filtered \}\)/, desc: "el CRM limpia el manifiesto al borrar un turno", quien: "duena", op: "update", ruta: MANIF, guardado: manifiesto([intervalo("10:00", "11:00")]), datos: manifiesto([]) },
  { archivo: "src/services/db.ts", ancla: /getDocs\(query\(collection\(db, 'staff_overrides'\), where\('clientId', '==', CLIENT_ID\)\)\)/, desc: "el CRM lista los horarios del equipo (staff_overrides)", quien: "duena", op: "list", ruta: `staff_overrides/${C}_s1`, guardado: OVERRIDE },
  { archivo: "src/services/db.ts", ancla: /\{ \.\.\.data, clientId: CLIENT_ID, staffId \},\s*\{ merge: true \}/, desc: "el CRM crea el horario de una persona", quien: "duena", op: "create", ruta: `staff_overrides/${C}_s1`, datos: OVERRIDE },
  { archivo: "src/services/db.ts", ancla: /\{ \.\.\.data, clientId: CLIENT_ID, staffId \},\s*\{ merge: true \}/, desc: "el CRM cambia el horario de una persona", quien: "duena", op: "update", ruta: `staff_overrides/${C}_s1`, guardado: OVERRIDE, datos: { ...OVERRIDE, schedule: { sunday: { isOpen: false } } } },
  { archivo: "src/services/db.ts", ancla: /setDoc\(doc\(db, "config", CLIENT_ID\), \{ businessRules: rules \}, \{ merge: true \}\)/, desc: "el CRM guarda las reglas del negocio en config/{id}", quien: "duena", op: "update", ruta: `config/${C}`, guardado: CFG, datos: { ...CFG, businessRules: { bufferMinutes: 10 } } },
  { archivo: "src/services/customers.ts", ancla: /getDocs\(query\(\s*collection\(db, CUSTOMERS_COLLECTION\),\s*where\("clientId", "==", CLIENT_ID\)/, desc: "el CRM lista las clientas", quien: "duena", op: "list", ruta: `customers/${C}_h1`, guardado: cliente() },
  { archivo: "src/services/customers.ts", ancla: /getDoc\(doc\(db, CUSTOMERS_COLLECTION, id\)\)/, desc: "el CRM lee una clienta", quien: "duena", op: "get", ruta: `customers/${C}_h1`, guardado: cliente() },
  { archivo: "src/services/customers.ts", ancla: /await setDoc\(ref, \{\s*clientId: CLIENT_ID,/, desc: "el CRM da de alta una clienta con monto", quien: "duena", op: "create", ruta: `customers/${C}_h2`, datos: cliente({ email: "dana@salon.co.il", source: "manual", lastServiceId: "cut", amountPaidCents: 15000, lifetimeValueCents: 15000, paymentMethod: "cash" }) },
  { archivo: "src/services/customers.ts", ancla: /lifetimeValueCents: \(data\.lifetimeValueCents \?\? 0\) \+ params\.amountPaidCents/, desc: "el CRM actualiza una clienta que ya está, con monto", quien: "duena", op: "update", ruta: `customers/${C}_h1`, guardado: cliente(), datos: cliente({ fullName: "נועה כהן", phone: "050-999-9999", updatedAt: ts(2), lastServiceId: "cut", amountPaidCents: 15000, lifetimeValueCents: 15000, paymentMethod: "card" }) },
  { archivo: "src/services/customers.ts", ancla: /await updateDoc\(doc\(db, CUSTOMERS_COLLECTION, id\), \{\s*\.\.\.updates,\s*updatedAt: serverTimestamp\(\)/, desc: "el CRM guarda las notas de una clienta", quien: "duena", op: "update", ruta: `customers/${C}_h1`, guardado: cliente(), datos: cliente({ notes: "צבע 7", tags: ["כלה"], updatedAt: ts(2) }) },
  { archivo: "src/components/admin/PaymentsTab.tsx", ancla: /amountPaidCents: Math\.round\(amt \* 100\),\s*paymentStatus: "paid"/, desc: "el CRM registra un pago manual (un turno con monto)", quien: "duena", op: "create", ruta: "appointments/a4", datos: sin(turno({ customerEmail: "manual_1760000000000@noemail.local", status: "completed", amountPaidCents: 15000, paymentStatus: "paid" }), "manifestEnd") },
  { archivo: "src/components/admin/CustomersTab.tsx", ancla: /\{ amountPaidCents: cents \} : \{\}\),\s*\.\.\.\(addForm\.paymentMethod && cents \? \{ paymentStatus: "paid" as const \} : \{\}\)/, desc: "el CRM da de alta la visita de una clienta con monto (un turno)", quien: "duena", op: "create", ruta: "appointments/a5", datos: sin(turno({ customerEmail: "walkin_1760000000000@noemail.local", status: "completed", amountPaidCents: 15000, paymentStatus: "paid" }), "manifestEnd") },
  { archivo: "src/services/inbox.ts", ancla: /collection\(db, INBOX_COLLECTION\),\s*where\("clientId", "==", CLIENT_ID\)/, desc: "el CRM lista la bandeja", quien: "duena", op: "list", ruta: "contact_inbox/m1", guardado: CONSULTA },
  { archivo: "src/services/inbox.ts", ancla: /await updateDoc\(doc\(db, INBOX_COLLECTION, id\), updates\)/, desc: "el CRM marca una consulta como leída", quien: "duena", op: "update", ruta: "contact_inbox/m1", guardado: CONSULTA, datos: { ...CONSULTA, status: "read" } },
  { archivo: "src/services/inbox.ts", ancla: /if \(status === "replied"\) updates\.repliedAt = serverTimestamp\(\)/, desc: "el CRM marca una consulta como respondida", quien: "duena", op: "update", ruta: "contact_inbox/m1", guardado: CONSULTA, datos: { ...CONSULTA, status: "replied", repliedAt: ts(3) } },
  { archivo: "src/services/notificationLogs.ts", ancla: /collection\(db, COLLECTION\),\s*where\("clientId", "==", CLIENT_ID\)/, desc: "el CRM lista el registro de mails", quien: "duena", op: "list", ruta: `notification_logs/${C}_x`, guardado: { clientId: C, channel: "email", type: "reminder", status: "sent", createdAt: ts(1) } },
  { archivo: "src/services/support.ts", ancla: /collection\(db, COLLECTION\),\s*where\("clientId", "==", CLIENT_ID\)/, desc: "el CRM lista los mensajes de soporte", quien: "duena", op: "list", ruta: "provider_messages/p1", guardado: MENSAJE },
  { archivo: "src/services/support.ts", ancla: /updateDoc\(doc\(db, COLLECTION, id\), \{ status: "read" \}\)/, desc: "el CRM marca un mensaje de soporte como leído", quien: "duena", op: "update", ruta: "provider_messages/p1", guardado: MENSAJE, datos: { ...MENSAJE, status: "read" } },
  { archivo: "src/services/stock.ts", ancla: /onSnapshot\(flatQ/, desc: "el CRM lista el inventario", quien: "duena", op: "list", ruta: "stock_items/s1", guardado: ITEM },
  { archivo: "src/services/stock.ts", ancla: /const ref = await addDoc\(target, payload\)/, desc: "el CRM agrega un producto", quien: "duena", op: "create", ruta: "stock_items/s2", datos: ITEM },
  { archivo: "src/services/stock.ts", ancla: /await addDoc\(movementsTargetRef\(\), movPayload\)/, desc: "el CRM registra el movimiento inicial de un producto", quien: "duena", op: "create", ruta: "stock_movements/m1", datos: MOV },
  { archivo: "src/services/stock.ts", ancla: /await updateDoc\(itemDocRef\(itemId\), \{ \.\.\.patch, updatedAt: Timestamp\.now\(\) \}\)/, desc: "el CRM edita un producto", quien: "duena", op: "update", ruta: "stock_items/s1", guardado: ITEM, datos: { ...ITEM, minStock: 5, updatedAt: ts(2) } },
  { archivo: "src/services/stock.ts", ancla: /tx\.update\(itemRef, \{ quantity: newQty/, desc: "el CRM cambia la cantidad de un producto", quien: "duena", op: "update", ruta: "stock_items/s1", guardado: ITEM, datos: { ...ITEM, quantity: 14, updatedAt: ts(2) } },
  { archivo: "src/services/stock.ts", ancla: /tx\.set\(movRef, movPayload\)/, desc: "el CRM registra el movimiento de una cantidad", quien: "duena", op: "create", ruta: "stock_movements/m2", datos: MOV },
  { archivo: "src/services/stock.ts", ancla: /where\("clientId", "==", CLIENT_ID\), where\("itemId", "==", itemId\)/, desc: "el CRM lista los movimientos de un producto", quien: "duena", op: "list", ruta: "stock_movements/m1", guardado: MOV },
  { archivo: "src/services/stock.ts", ancla: /await deleteDoc\(itemDocRef\(itemId\)\)/, desc: "el CRM borra un producto", quien: "duena", op: "delete", ruta: "stock_items/s1", guardado: ITEM },
];

test("con `clients/{id}` en un estado permitido y la dueña con su `admin_users`, en ninguna versión del CRM de las cuatro webs de Ashkelon (`b3a97e9`, `ae3c7ec`, `a99b725`, `43177c8`) una lectura o escritura por el SDK que la web pública o el CRM de la dueña hacen queda negada por las reglas nuevas, cancelar y mover un turno con un email que hay que sanear incluidos", () => {
  const fallas: string[] = [];
  conReglas(fallas, (reglas) => {
    // Precondición del árbol (inciso l): las reglas son las de CRM-05. Con las de hoy, nada del CRM de Ashkelon se niega, así que sin esta
    // condición el test no tendría rojo; con ella, afirma que las reglas NUEVAS siguen dejando hacer todo lo del catálogo.
    const docs = docsCon("active");
    const clientsCerrado = !permitido(reglas, "update", `clients/${C}`, { auth: DUENA, docs, guardado: { status: "suspended" }, datos: { status: "active" } });
    const dineroCerrado = !permitido(reglas, "update", "appointments/a1", { auth: DUENA, docs, guardado: turno(), datos: turno({ amountPaidCents: 5000 }) });
    if (!clientsCerrado || !dineroCerrado) fallas.push(`precondición del árbol: firestore.rules son las de CRM-05 (la dueña no escribe clients/{id}: ${clientsCerrado ? "sí" : "hoy lo escribe"}; nadie cambia amountPaidCents de un turno por el SDK: ${dineroCerrado ? "sí" : "hoy se cambia"})`);
    for (const sha of ASHKELON) {
      const textos = new Map<string, string | null>();
      const texto = (rel: string) => {
        if (!textos.has(rel)) { try { textos.set(rel, git(ROOT, "show", `${sha}:${rel}`)); } catch { textos.set(rel, null); } }
        return textos.get(rel)!;
      };
      for (const a of ACCESOS) {
        const t = texto(a.archivo);
        if (t === null) { fallas.push(`${sha} · no se pudo leer ${a.archivo} (git show)`); continue; }
        if (!a.ancla.test(t)) { fallas.push(`${sha} · ${a.archivo} hace «${a.desc}» (su ancla no está: el catálogo no es el de esa versión)`); continue; }
        for (const status of ["active", "trial", "maintenance"]) {
          let ok = false;
          try { ok = permitido(reglas, a.op, a.ruta, { auth: a.quien === "duena" ? DUENA : null, docs: docsCon(status), guardado: a.guardado, datos: a.datos }); }
          catch (e) { fallas.push(`${sha} · ${status} · ${a.desc}: ${(e as Error).message}`); continue; }
          if (!ok) fallas.push(`${sha} · ${status} · ${a.desc} (${a.op} ${a.ruta}): se permite (hoy se rechaza)`);
        }
      }
    }
  });
  assert.deepEqual([...new Set(fallas)], [], `S10 · el CRM de Ashkelon con las reglas nuevas:\n${[...new Set(fallas)].join("\n")}`);
});

test("staff sin documento `admin_users/<email>` de ese cliente, o con su estado distinto de \"pending\" y \"active\", no lee `appointments` aunque sus claims digan staff", () => {
  const fallas: string[] = [];
  conReglas(fallas, (reglas) => {
    const email = "empleada@salon.co.il";
    const a = auth("staff", { email });
    const base = { [`clients/${C}`]: { status: "active" } };
    const casos: [string, Record<string, any> | null, boolean][] = [
      ["sin admin_users", null, false],
      ["con admin_users de otro cliente", { email, clientId: "c2", role: "staff", status: "active" }, false],
      ["con admin_users «removed»", { email, clientId: C, role: "staff", status: "removed" }, false],
      ["con admin_users sin estado", { email, clientId: C, role: "staff" }, false],
      ["con admin_users «pending»", { email, clientId: C, role: "staff", status: "pending" }, true],
      ["con admin_users «active»", { email, clientId: C, role: "staff", status: "active" }, true],
    ];
    for (const [desc, doc, espera] of casos) {
      const docs = doc ? { ...base, [`admin_users/${email}`]: doc } : base;
      for (const op of ["get", "list"] as const) preguntar(reglas, fallas, `staff ${desc} · ${op === "get" ? "lee un turno" : "lista los turnos"}`, espera, { op, ruta: "appointments/a1", auth: a, docs, guardado: turno() });
    }
  });
  assert.deepEqual(fallas, [], `S11 · la revocación corta también en el SDK:\n${fallas.join("\n")}`);
});
