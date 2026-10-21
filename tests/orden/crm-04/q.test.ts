// CRM-04 · Q1–Q5 (T) · lo que el equipo puede y no puede (D-343, D-349; REV 1, 6, 11, 16 y 18). Sesión A (2026-10-20): tests rojos.
//
// Medido en T 47b53a6: `config` lo escribe `isTenantAdmin` (incluye staff, `firestore.rules:91-94`) y `customers` sólo owner/manager
// (`:132-133`); ninguna de las rutas de Q2 mira el rol; `/api/appointment/notify` manda al email del cuerpo; `/api/admin/me` pasa la
// invitación a «active» antes de sincronizar los claims y `server.ts` guarda `acceptedAt` como texto; el menú de la gerente salió vacío
// en 2 de 3 corridas (`revision-tecnica/tap-hu-*.txt`). Contrato (§ Interfaz): las reglas se EVALÚAN con `_reglas.ts`; Q2, Q3 y Q4 son
// funciones puras que B escribe y las dos rutas llaman (como `guardarConfig`, D-255): `rutaPermitida(rol, metodo, ruta)` en
// `src/lib/admin-users.ts`, `destinatarioDeTurno(db, { clientId, appointmentId })` en `src/lib/api/notify-booking-handler.ts` y
// `primeraEntrada(invitacion, { sincronizar, activar, ahora })` en `src/lib/entrada-equipo.ts`.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PESTANAS_DUENA, PESTANAS_EMPLEADA, conCrm, conModulos } from "./_crm.ts";
import { leerReglas, permitido } from "./_reglas.ts";
import { ROOT, dbMemoria, fuente } from "./_comun.ts";

const RUNTIMES = ["api/index.ts", "server.ts"];

/** ¿La ruta `metodo ruta` de `archivo` llama a `fn(` —en su registro o en una función que el registro llama, del mismo archivo o de un
 *  módulo importado, hasta tres niveles—? Devuelve también el texto del registro (null si la ruta no está registrada). */
async function usaEnRuta(archivo: string, metodo: string, ruta: string, fn: string): Promise<{ registro: string | null; usa: boolean }> {
  const tsPkg = "typescript";
  const ts: any = (await import(tsPkg)).default;
  const leer = (abs: string) => { for (const p of [abs, abs.replace(/\.js$/, ".ts"), abs + ".ts", abs.replace(/\.js$/, ".tsx")]) if (existsSync(p)) return { p, texto: readFileSync(p, "utf8") }; return null; };
  const raiz = leer(resolve(ROOT, archivo))!;
  const src = ts.createSourceFile(archivo, raiz.texto, ts.ScriptTarget.Latest, true);
  let registro: any = null;
  const buscar = (n: any) => { if (!registro && ts.isCallExpression(n) && n.expression.getText(src) === `app.${metodo}` && n.arguments[0] && ts.isStringLiteral(n.arguments[0]) && n.arguments[0].text === ruta) registro = n; ts.forEachChild(n, buscar); };
  buscar(src);
  if (!registro) return { registro: null, usa: false };
  const textoReg = registro.getText(src);
  const vistos = new Set<string>();
  const contiene = (texto: string, archivoAbs: string, sf: any, nodo: any, nivel: number): boolean => {
    if (texto.includes(`${fn}(`)) return true;
    if (nivel >= 3) return false;
    const nombres = new Set<string>();
    const juntar = (n: any) => { if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) nombres.add(n.expression.text); if (ts.isIdentifier(n) && n.parent && ts.isCallExpression(n.parent) && n.parent.arguments.includes(n)) nombres.add(n.text); ts.forEachChild(n, juntar); };
    juntar(nodo);
    for (const nombre of nombres) {
      const clave = `${archivoAbs}#${nombre}`;
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      let decl: any = null, importado: string | null = null;
      const ver = (n: any) => {
        if ((ts.isFunctionDeclaration(n) && n.name?.text === nombre) || (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === nombre)) decl = decl ?? n;
        if (ts.isImportDeclaration(n) && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings) && n.importClause.namedBindings.elements.some((e: any) => e.name.text === nombre)) importado = (n.moduleSpecifier as any).text;
        ts.forEachChild(n, ver);
      };
      ver(sf);
      if (decl && contiene(decl.getText(sf), archivoAbs, sf, decl, nivel + 1)) return true;
      if (importado && importado.startsWith(".")) {
        const m = leer(resolve(dirname(archivoAbs), importado));
        if (!m) continue;
        const sf2 = ts.createSourceFile(m.p, m.texto, ts.ScriptTarget.Latest, true);
        let d2: any = null;
        const ver2 = (n: any) => { if ((ts.isFunctionDeclaration(n) && n.name?.text === nombre) || (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === nombre)) d2 = d2 ?? n; ts.forEachChild(n, ver2); };
        ver2(sf2);
        if (d2 && contiene(d2.getText(sf2), m.p, sf2, d2, nivel + 1)) return true;
      }
    }
    return false;
  };
  return { registro: textoReg, usa: contiene(textoReg, raiz.p, src, registro, 0) };
}

test("las reglas de `config` dejan escribir sólo a owner y manager, y las de `customers` dejan a staff actualizar sólo los campos de D-343", () => {
  const fallas: string[] = [];
  try {
    const reglas = leerReglas(fuente("firestore.rules"));
    const auth = (tenantRole: string) => ({ uid: `u-${tenantRole}`, token: { clientId: "c1", tenantRole, email: `${tenantRole}@example.com`, email_verified: true } });
    const docs = { "clients/c1": { status: "active" } };
    const cfg = { services: [{ id: "cut", price: 100 }], adminEmail: "duena@example.com" };
    for (const rol of ["owner", "manager", "staff"]) {
      const espera = rol !== "staff";
      for (const op of ["create", "update"] as const) {
        const ok = permitido(reglas, op, "config/c1", { auth: auth(rol), docs, guardado: op === "update" ? cfg : undefined, datos: { ...cfg, services: [{ id: "cut", price: 1 }] } });
        if (ok !== espera) fallas.push(`config · ${op} por ${rol}: ${espera ? "se permite" : "se rechaza"} (hoy ${ok ? "se permite" : "se rechaza"})`);
      }
      const borrar = permitido(reglas, "delete", "config/c1", { auth: auth(rol), docs, guardado: cfg });
      if (rol === "staff" && borrar) fallas.push("config · delete por staff se rechaza");
    }
    const guardado = { clientId: "c1", email: "a@example.com", fullName: "א", phone: "050-000-0001", notes: "", tags: [] as string[], stage: "lead", source: "walkin", visitCount: 1, createdAt: { __ts: 1 }, updatedAt: { __ts: 1 } };
    const actualizar = (rol: string, cambios: Record<string, unknown>) => permitido(reglas, "update", "customers/c1_a", { auth: auth(rol), docs, guardado, datos: { ...guardado, ...cambios } });
    // Los campos de D-343, uno por uno y todos juntos.
    const PERMITIDOS: Record<string, unknown> = { fullName: "ב", phone: "050-999-9999", notes: "צבע 7", tags: ["כלה"], trato: "f", lastServiceId: "cut", amountPaidCents: 5000, lifetimeValueCents: 9000, paymentMethod: "cash", updatedAt: { __ts: 2 } };
    for (const [k, v] of Object.entries(PERMITIDOS)) if (!actualizar("staff", { [k]: v, updatedAt: { __ts: 2 } })) fallas.push(`customers · staff actualiza ${k}`);
    if (!actualizar("staff", PERMITIDOS)) fallas.push("customers · staff actualiza todos los campos de D-343 juntos");
    // Lo que no le toca.
    for (const [k, v] of Object.entries({ stage: "converted", email: "otra@example.com", source: "web", visitCount: 9, createdAt: { __ts: 9 } })) {
      if (actualizar("staff", { [k]: v, updatedAt: { __ts: 2 } })) fallas.push(`customers · staff no actualiza ${k}`);
    }
    if (actualizar("staff", { clientId: "c2" })) fallas.push("customers · staff no cambia el clientId");
    for (const rol of ["owner", "manager"]) if (!actualizar(rol, { stage: "converted", updatedAt: { __ts: 2 } })) fallas.push(`customers · ${rol} actualiza stage`);
  } catch (e) { fallas.push(`reglas · ${(e as Error).message}`); }
  assert.deepEqual(fallas, [], `Q1 · las reglas del equipo:\n${fallas.join("\n")}`);
});

/** Las rutas de Q2: [método, ruta registrada, una ruta concreta]. */
const RUTAS_GERENCIA: [string, string, string][] = [
  ["get", "/api/crm-metrics", "/api/crm-metrics"],
  ["get", "/api/admin/users", "/api/admin/users"],
  ["post", "/api/knowledge/upload", "/api/knowledge/upload"],
  ["get", "/api/knowledge/list", "/api/knowledge/list"],
  ["get", "/api/knowledge/preview/:docId", "/api/knowledge/preview/d1"],
  ["delete", "/api/knowledge/:docId", "/api/knowledge/d1"],
  ["get", "/api/whatsapp/config", "/api/whatsapp/config"],
  ["patch", "/api/whatsapp/pause", "/api/whatsapp/pause"],
  ["post", "/api/whatsapp/queue-message", "/api/whatsapp/queue-message"],
  ["post", "/api/stock/migrate", "/api/stock/migrate"],
];

test("en los dos runtimes, staff recibe 403 en /api/crm-metrics, GET /api/admin/users, /api/knowledge/*, /api/whatsapp/config, /api/whatsapp/pause, /api/whatsapp/queue-message y /api/stock/migrate, y owner y manager no", async () => {
  const fallas: string[] = [];
  await conModulos(async (cargar) => {
    const m = await cargar("src/lib/admin-users.ts");
    if (typeof m?.rutaPermitida !== "function") { fallas.push("src/lib/admin-users.ts exporta rutaPermitida(rol, metodo, ruta)"); return; }
    for (const [metodo, , ruta] of RUTAS_GERENCIA) {
      for (const rol of ["owner", "manager", "staff"]) {
        const v = m.rutaPermitida(rol, metodo.toUpperCase(), ruta);
        if (v !== (rol !== "staff")) fallas.push(`rutaPermitida("${rol}", "${metodo.toUpperCase()}", "${ruta}") = ${rol !== "staff"} (hoy ${JSON.stringify(v)})`);
      }
    }
    // Lo que sí es de la empleada (las dos direcciones).
    for (const [metodo, ruta] of [["GET", "/api/tasks"], ["GET", "/api/admin/me"], ["POST", "/api/appointment/notify"], ["GET", "/api/crm/appointments"]]) if (m.rutaPermitida("staff", metodo, ruta) !== true) fallas.push(`rutaPermitida("staff", "${metodo}", "${ruta}") = true`);
  });
  for (const f of RUNTIMES) for (const [metodo, registrada] of RUTAS_GERENCIA) {
    try {
      const r = await usaEnRuta(f, metodo, registrada, "rutaPermitida");
      if (!r.registro) fallas.push(`${f} registra ${metodo.toUpperCase()} ${registrada}`);
      else if (!r.usa) fallas.push(`${f}: ${metodo.toUpperCase()} ${registrada} mira el rol con rutaPermitida`);
    } catch (e) { fallas.push(`${f}: ${(e as Error).message}`); }
  }
  assert.deepEqual(fallas, [], `Q2 · el equipo en el servidor:\n${fallas.join("\n")}`);
});

test("/api/appointment/notify manda al customerEmail guardado en el turno aunque el cuerpo traiga otro email", async () => {
  const fallas: string[] = [];
  await conModulos(async (cargar) => {
    const m = await cargar("src/lib/api/notify-booking-handler.ts");
    if (typeof m?.destinatarioDeTurno !== "function") { fallas.push("src/lib/api/notify-booking-handler.ts exporta destinatarioDeTurno(db, { clientId, appointmentId })"); return; }
    const mem = dbMemoria({
      "appointments/a1": { clientId: "c1", customerEmail: "guardada@example.com", customerName: "נועה", date: "2026-10-20", time: "10:00" },
      "appointments/a2": { clientId: "otro", customerEmail: "ajena@example.com" },
    });
    const casos: [Record<string, unknown>, string | null][] = [
      [{ clientId: "c1", appointmentId: "a1", cuerpo: { customerEmail: "atacante@example.com" } }, "guardada@example.com"],
      [{ clientId: "c1", appointmentId: "a2" }, null],
      [{ clientId: "c1", appointmentId: "no-existe" }, null],
      [{ clientId: "c1" }, null],
    ];
    for (const [o, esperado] of casos) {
      let v: unknown;
      try { v = await m.destinatarioDeTurno(mem.db, o); } catch (e) { v = `lanzó: ${(e as Error).message}`; }
      if ((v ?? null) !== esperado) fallas.push(`destinatarioDeTurno(${JSON.stringify(o)}) = ${JSON.stringify(esperado)} (hoy ${JSON.stringify(v)})`);
    }
  });
  for (const f of RUNTIMES) {
    try {
      const r = await usaEnRuta(f, "post", "/api/appointment/notify", "destinatarioDeTurno");
      if (!r.registro) { fallas.push(`${f} registra POST /api/appointment/notify`); continue; }
      if (!r.usa) fallas.push(`${f}: /api/appointment/notify toma el destinatario con destinatarioDeTurno`);
      if (/appt\.customerEmail|req\.body[^;\n]*customerEmail/.test(r.registro)) fallas.push(`${f}: /api/appointment/notify no lee el email del cuerpo`);
    } catch (e) { fallas.push(`${f}: ${(e as Error).message}`); }
  }
  assert.deepEqual(fallas, [], `Q3 · el email guardado:\n${fallas.join("\n")}`);
});

test("en los dos runtimes /api/admin/me deja la invitación pendiente cuando los claims no se sincronizan, y guarda acceptedAt como timestamp", async () => {
  const fallas: string[] = [];
  await conModulos(async (cargar) => {
    const m = await cargar("src/lib/entrada-equipo.ts");
    if (typeof m?.primeraEntrada !== "function") { fallas.push("src/lib/entrada-equipo.ts exporta primeraEntrada(invitacion, { sincronizar, activar, ahora })"); return; }
    const ahora = new Date("2026-10-20T10:00:00Z");
    const correr = async (status: string, sinc: () => Promise<any>) => {
      const orden: string[] = []; let activo: any = null;
      let r: unknown;
      try { r = await m.primeraEntrada({ status }, { ahora, sincronizar: async () => { orden.push("sincronizar"); return sinc(); }, activar: async (c: any) => { orden.push("activar"); activo = c; } }); } catch (e) { r = `lanzó: ${(e as Error).message}`; }
      return { r, orden, activo };
    };
    const ok = await correr("pending", async () => ({ synced: true }));
    if (JSON.stringify(ok.orden) !== JSON.stringify(["sincronizar", "activar"])) fallas.push(`con los claims sincronizados: primero sincroniza y después activa (hoy ${ok.orden.join(" → ") || "nada"})`);
    if (ok.activo?.status !== "active" || !(ok.activo?.acceptedAt instanceof Date) || ok.activo.acceptedAt.getTime() !== ahora.getTime()) fallas.push(`activar recibe { status: "active", acceptedAt: <Date de ahora> } (recibió ${JSON.stringify(ok.activo)})`);
    for (const [que, sinc] of [["devuelve synced:false", async () => ({ synced: false, reason: "auth-unavailable" })], ["lanza", async () => { throw new Error("auth caída"); }]] as const) {
      const r = await correr("pending", sinc);
      if (r.orden.includes("activar")) fallas.push(`si la sincronización ${que}, la invitación queda pendiente (se activó)`);
      if (typeof r.r === "string" && r.r.startsWith("lanzó")) fallas.push(`si la sincronización ${que}, primeraEntrada no lanza (${r.r})`);
    }
    const ya = await correr("active", async () => ({ synced: true }));
    if (ya.orden.includes("activar")) fallas.push("una invitación ya activa no se vuelve a activar");
  });
  for (const f of RUNTIMES) {
    try {
      const r = await usaEnRuta(f, "get", "/api/admin/me", "primeraEntrada");
      if (!r.registro) { fallas.push(`${f} registra GET /api/admin/me`); continue; }
      if (!r.usa) fallas.push(`${f}: /api/admin/me usa primeraEntrada`);
      if (f === "server.ts" && /toISOString|activarInvitacion\(/.test(r.registro)) fallas.push("server.ts: /api/admin/me guarda acceptedAt como timestamp (no como texto)");
    } catch (e) { fallas.push(`${f}: ${(e as Error).message}`); }
  }
  assert.deepEqual(fallas, [], `Q4 · la primera entrada de una invitada:\n${fallas.join("\n")}`);
});

/** Registra en la página, cuadro a cuadro, las entradas del menú (por su texto) cada vez que cambian. */
const GRABAR_MENU = `(() => {
  const w = globalThis; w.__menus = []; let prev = null;
  const paso = () => {
    const ts = [...document.querySelectorAll("aside nav button")].map((b) => (b.textContent || "").replace(/\\d+/g, "").trim());
    const k = JSON.stringify(ts);
    if (k !== prev) { w.__menus.push(ts); prev = k; }
    requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
})();`;
const GERENTE = { email: "gerente@example.com", uid: "uid-gerente" };

test("el menú de la gerente nunca sale vacío: cinco cargas seguidas muestran sus pestañas, y mientras el rol no llegó se ve el menú de menor acceso", async () => {
  const fallas: string[] = [];
  await conCrm(async (crm) => {
    for (let i = 1; i <= 5; i++) {
      try {
        const a = await crm.abrir({ vista: "escritorio", usuario: GERENTE, rol: "manager", init: GRABAR_MENU, esperar: "nada" });
        try {
          const lleno = await a.page.waitForFunction((n: number) => document.querySelectorAll("aside nav button").length >= n, PESTANAS_DUENA.length, { timeout: 60000 }).then(() => true, () => false);
          // Dos cuadros antes de leer: el grabador corre una vez por cuadro, así que con dos ya registró lo que el DOM muestra ahora.
          await a.page.evaluate(() => new Promise<void>((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok()))));
          const menus: string[][] = await a.page.evaluate(() => (globalThis as any).__menus);
          const desde = menus.findIndex((x) => x.length > 0);
          if (!lleno) fallas.push(`carga ${i}: el menú de la gerente muestra sus ${PESTANAS_DUENA.length} pestañas (último: ${JSON.stringify(menus[menus.length - 1])})`);
          else if (JSON.stringify(menus[menus.length - 1]) !== JSON.stringify(PESTANAS_DUENA)) fallas.push(`carga ${i}: el menú de la gerente es ${PESTANAS_DUENA.join(", ")} (hoy ${menus[menus.length - 1].join(", ")})`);
          if (desde >= 0 && menus.slice(desde).some((x) => x.length === 0)) fallas.push(`carga ${i}: una vez pintado, el menú no se vacía (secuencia: ${menus.map((x) => x.length).join(" → ")})`);
        } finally { await a.cerrar(); }
      } catch (e) { fallas.push(`carga ${i}: ${(e as Error).message.split("\n")[0]}`); }
    }
    // Mientras GET /api/admin/me no respondió, el menú de menor acceso (el de la empleada); después, el de la gerente.
    let soltar: () => void = () => {};
    const respondido = new Promise<void>((ok) => { soltar = ok; });
    try {
      const a = await crm.abrir({
        vista: "escritorio", usuario: GERENTE, rol: "manager", init: GRABAR_MENU, esperar: "nada",
        api: async (metodo, ruta) => { if (metodo === "GET" && ruta.startsWith("/api/admin/me")) { await respondido; return { status: 200, json: { role: "manager", status: "active", email: GERENTE.email } }; } return undefined; },
      });
      try {
        const menor = await a.page.waitForFunction((esperado: string) => JSON.stringify([...document.querySelectorAll("aside nav button")].map((b) => (b.textContent || "").replace(/\d+/g, "").trim())) === esperado, JSON.stringify(PESTANAS_EMPLEADA), { timeout: 30000 }).then(() => true, () => false);
        if (!menor) fallas.push(`mientras el rol no llegó se ve el menú de menor acceso (${PESTANAS_EMPLEADA.join(", ")}; hoy ${JSON.stringify(await a.page.evaluate(() => [...document.querySelectorAll("aside nav button")].map((b) => (b.textContent || "").trim())))})`);
        soltar();
        const despues = await a.page.waitForFunction((n: number) => document.querySelectorAll("aside nav button").length >= n, PESTANAS_DUENA.length, { timeout: 60000 }).then(() => true, () => false);
        if (!despues) fallas.push("cuando llega el rol, el menú pasa al de la gerente");
      } finally { soltar(); await a.cerrar(); }
    } catch (e) { soltar(); fallas.push(`el rol demorado: ${(e as Error).message.split("\n")[0]}`); }
  });
  assert.deepEqual(fallas, [], `Q5 · el menú de la gerente:\n${fallas.join("\n")}`);
});
