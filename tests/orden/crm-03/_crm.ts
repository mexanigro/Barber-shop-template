// CRM-03 (sesión A, 2026-10-15) · el CRM de T montado en un navegador SIN RED, para los tests de esta orden (sólo T).
// Un Vite sobre el árbol `raiz` (HEAD o el clon neutro del commit rojo) con `firebase/app`, `firebase/auth` y `firebase/firestore`
// reemplazados por los dobles de `./_firebase/` (alias): los servicios reales del CRM (db, crm-appointments, customers, stock,
// notificationLogs, inbox, support) corren contra un Firestore en memoria que el test siembra y del que lee lo escrito. Las rutas
// /api/* las responde el test (page.route); cualquier pedido fuera de 127.0.0.1 se corta. Reloj fijo: jueves 2026-10-15 10:00 en
// Asia/Jerusalem. Ninguna espera de tiempo fijo: cada espera es una condición (AUDITORIA-01).
// Caja negra: nada importa src/* de forma estática; playwright y vite se importan con `import()` dinámico.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ROOT } from "../verdad-02/_util.ts";

export const DIR = import.meta.dirname;
export const CLIENTE = "crm03-salon";
export const DUENA = { email: "duena@example.com", uid: "uid-duena" };
export const HOY = "2026-10-15"; // jueves
export const MANANA = "2026-10-16";
export const AHORA = new Date("2026-10-15T10:00:00+03:00");
export const ANCHOS = { telefono: { width: 390, height: 844 }, tableta: { width: 768, height: 1024 }, escritorio: { width: 1280, height: 800 } } as const;
export type Vista = keyof typeof ANCHOS;
/** Las pestañas que ve la dueña con el plan de hoy (sin «ידע»: es IA), por su texto en el menú. */
export const PESTANAS_DUENA = ["סקירה", "תורים", "תשלומים", "לקוחות", "צוות", "משימות", "מלאי", "משתמשים", "תיבת דואר", "יומן מייל", "זמנים", "תמיכה"];

const ts = (iso: string) => ({ __ts: new Date(iso).getTime() });
const leerJson = (raiz: string, rel: string) => JSON.parse(readFileSync(resolve(raiz, rel), "utf8"));

/** El salón de prueba: el config de la plantilla A (fixture del árbol) con la dueña, tres personas (una sin foto) y un día con
 *  turnos que se pisan, pagos con método, clientes en cada etapa, mensajes, avisos (uno con createdAt de texto, como lo escribe
 *  notify-booking-handler) y stock. Rutas de documento → campos; `{ __ts: ms }` es un Timestamp. */
export function salon(raiz = ROOT): Record<string, any> {
  const config = leerJson(raiz, "dev-fixtures/peluqueria-paleta-a.json");
  config.adminEmail = DUENA.email;
  config.staff = (config.staff ?? []).slice(0, 3);
  if (config.staff[2]) config.staff[2] = { ...config.staff[2], photoUrl: "" };
  const d: Record<string, any> = {
    [`clients/${CLIENTE}`]: { status: "active" },
    [`config/${CLIENTE}`]: config,
  };
  const staff = config.staff.map((s: any) => s.id);
  const turno = (id: string, o: Record<string, any>) => {
    d[`appointments/${id}`] = { clientId: CLIENTE, customerEmail: `${id}@example.com`, customerPhone: "050-000-0000", duration: 60, status: "confirmed", paymentStatus: "pending", type: "appointment", createdAt: ts("2026-10-10T09:00:00+03:00"), ...o };
  };
  turno("t1", { customerName: "גלית", serviceId: "blowdry", staffId: staff[1], date: HOY, time: "09:00", duration: 60 });
  turno("t2", { customerName: "מיכל", serviceId: "cut", staffId: staff[0], date: HOY, time: "09:30", duration: 90, paymentStatus: "paid", amountPaidCents: 18000, paymentMethod: "cash" });
  turno("t3", { customerName: "נועה", serviceId: "cut-blowdry", staffId: staff[0], date: HOY, time: "10:00", duration: 120 });
  turno("t4", { customerName: "רוני", serviceId: "root-color", staffId: staff[2], date: HOY, time: "12:00", duration: 120, status: "pending" });
  turno("t5", { customerName: "דנה", serviceId: "treatment", staffId: staff[1], date: HOY, time: "15:00", duration: 60, paymentStatus: "paid", amountPaidCents: 58000, paymentMethod: "card" });
  turno("t6", { customerName: "ליאת", serviceId: "event-style", staffId: staff[1], date: MANANA, time: "11:00", duration: 90 });
  turno("t7", { customerName: "שירה", serviceId: "full-color", staffId: staff[0], date: "2026-10-13", time: "16:00", duration: 150, status: "completed", paymentStatus: "paid", amountPaidCents: 26000, paymentMethod: "transfer" });
  turno("t8", { customerName: "יעל", serviceId: "kids-cut", staffId: staff[2], date: "2026-10-12", time: "10:00", duration: 30, status: "cancelled" });
  // Los extremos del día (como en la demo desplegada: el mapa de horas va de 7 a 21).
  turno("t9", { customerName: "הילה", serviceId: "bride", staffId: staff[0], date: "2026-10-11", time: "07:30", duration: 120, status: "completed", paymentStatus: "paid", amountPaidCents: 80000, paymentMethod: "card" });
  turno("t10", { customerName: "אור", serviceId: "blowdry", staffId: staff[1], date: "2026-10-08", time: "21:00", duration: 60, status: "completed", paymentStatus: "paid", amountPaidCents: 9000, paymentMethod: "other" });
  const cliente = (id: string, o: Record<string, any>) => { d[`customers/${CLIENTE}_${id}`] = { clientId: CLIENTE, email: `${id}@example.com`, phone: "050-000-0001", createdAt: ts("2026-09-01T10:00:00+03:00"), updatedAt: ts("2026-10-10T10:00:00+03:00"), visitCount: 1, ...o }; };
  cliente("galit", { fullName: "גלית", stage: "lead", source: "walkin" });
  cliente("liat", { fullName: "ליאת", stage: "contacted", source: "web" });
  cliente("roni", { fullName: "רוני", stage: "scheduled", source: "whatsapp" });
  cliente("michal", { fullName: "מיכל", stage: "converted", source: "booking", visitCount: 4, paymentMethod: "cash" });
  cliente("manual", { fullName: "טל", email: "manual_1760000000000@noemail.local", stage: "converted", source: "manual" }); // CRM-02: ese email no se muestra
  d[`contact_inbox/m1`] = { clientId: CLIENTE, name: "אור", email: "or@example.com", phone: "050-000-0002", subject: "שעות פתיחה", message: "האם אתן פתוחות ביום שישי?", source: "web", status: "new", createdAt: ts("2026-10-14T18:00:00+03:00") };
  d[`contact_inbox/m2`] = { clientId: CLIENTE, name: "רוני", email: "roni@example.com", phone: "050-000-0003", subject: "שאלה על החלקה", message: "כמה זמן מחזיקה ההחלקה?", source: "whatsapp", status: "read", createdAt: ts("2026-10-13T12:00:00+03:00") };
  d[`notification_logs/l1`] = { clientId: CLIENTE, channel: "email", recipient: "t1@example.com", subject: "אישור תור", type: "booking", status: "sent", refId: "t1", createdAt: "2026-10-10T09:01:00.000Z" };
  d[`notification_logs/l2`] = { clientId: CLIENTE, channel: "email", recipient: "t6@example.com", subject: "תזכורת", type: "reminder", status: "sent", refId: "t6", createdAt: ts("2026-10-14T18:00:00+03:00") };
  d[`notification_logs/l3`] = { clientId: CLIENTE, channel: "email", recipient: "duena@example.com", subject: "פנייה", type: "contact", status: "failed", error: "x", createdAt: ts("2026-10-13T08:00:00+03:00") };
  d[`notification_logs/l4`] = { clientId: CLIENTE, channel: "email", recipient: "t4@example.com", subject: "תזכורת", type: "reminder", status: "queued", refId: "t4", createdAt: ts("2026-10-14T18:00:00+03:00") };
  d[`stock_items/s1`] = { clientId: CLIENTE, name: "שמפו מקצועי", category: "טיפוח", unit: "unidades", quantity: 12, minStock: 3, createdAt: ts("2026-09-01T10:00:00+03:00"), updatedAt: ts("2026-10-01T10:00:00+03:00") };
  d[`stock_items/s2`] = { clientId: CLIENTE, name: "חמצן 6%", category: "צבע", unit: "ml", quantity: 2, minStock: 5, createdAt: ts("2026-09-01T10:00:00+03:00"), updatedAt: ts("2026-10-01T10:00:00+03:00") };
  return d;
}

export type Respuesta = { status: number; json: any };
export type Api = (metodo: string, ruta: string, cuerpo: any) => Respuesta | undefined;
export type Abierto = {
  page: any; ctx: any;
  /** Lo que se escribió en el Firestore en memoria, en orden. */
  escrituras(): Promise<{ op: string; ruta: string; datos?: any; merge?: boolean; tx?: boolean }[]>;
  /** El documento tal como quedó. */
  documento(ruta: string): Promise<any>;
  /** Los pedidos a /api/* que hizo la página. */
  pedidos: { metodo: string; ruta: string; cuerpo: any }[];
  /** Ir a una pestaña por su texto en el menú (clic en el botón del menú, abierto o no). */
  ir(etiqueta: string): Promise<void>;
  cerrar(): Promise<void>;
};
export type Opciones = { vista: Vista; datos?: Record<string, any>; usuario?: { email: string; uid: string } | null; rol?: "owner" | "manager" | "staff"; api?: Api; modo?: "light" | "dark"; ruta?: string; /** true: esperar el menú o la pantalla «הגישה נדחתה» (U1), no sólo el menú. */ oPantallaSinAcceso?: boolean };

type Crm = { abrir(o: Opciones): Promise<Abierto>; vite: any; navegador: any; raiz: string };

/** Un Vite y un Chromium para todos los `abrir` de `fn`; se cierran en `finally`. */
export async function conCrm(fn: (crm: Crm) => Promise<void>, raiz = ROOT): Promise<void> {
  const env = {
    VITE_ACTIVE_NICHE: "peluqueria", VITE_UI_LANGUAGE: "he", VITE_DEMO_MODE: "false", VITE_CLIENT_ID: CLIENTE, NEXT_PUBLIC_CLIENT_ID: CLIENTE,
    VITE_ADMIN_EMAIL: DUENA.email, VITE_FIREBASE_API_KEY: "crm03", VITE_FIREBASE_AUTH_DOMAIN: "crm03.local", VITE_FIREBASE_PROJECT_ID: "crm03-prueba",
    VITE_FIREBASE_APP_ID: "crm03", VITE_FIREBASE_STORAGE_BUCKET: "crm03.local", VITE_FIREBASE_MESSAGING_SENDER_ID: "0", VITE_FIREBASE_DATABASE_ID: "default",
    VITE_FIREBASE_MEASUREMENT_ID: "", VITE_TENANT_FIXTURE: "", VITE_HERO_CLIP: "",
  };
  const antes: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(env)) { antes[k] = process.env[k]; process.env[k] = v; }
  const vitePkg = "vite", pwPkg = "playwright";
  const { createServer } = await import(vitePkg);
  const vite = await createServer({
    configFile: resolve(raiz, "vite.config.ts"), root: raiz, logLevel: "silent",
    server: { port: 0, strictPort: false, host: "127.0.0.1", hmr: false, watch: null },
    resolve: { alias: [
      { find: /^firebase\/firestore$/, replacement: join(DIR, "_firebase/firestore.ts") },
      { find: /^firebase\/auth$/, replacement: join(DIR, "_firebase/auth.ts") },
      { find: /^firebase\/app$/, replacement: join(DIR, "_firebase/app.ts") },
    ] },
    optimizeDeps: { exclude: ["firebase"] },
  });
  await vite.listen();
  const base = vite.resolvedUrls.local[0] as string;
  const { chromium } = await import(pwPkg);
  const navegador = await chromium.launch({ args: ["--disable-lcd-text", "--font-render-hinting=none"] });
  const metricas: any = await vite.ssrLoadModule("/src/lib/crm-metrics.ts").catch((): null => null);
  const abrir = async (o: Opciones): Promise<Abierto> => {
    const tam = ANCHOS[o.vista];
    const movil = tam.width < 768;
    const ctx = await navegador.newContext({ viewport: tam, deviceScaleFactor: 1, isMobile: movil, hasTouch: movil, locale: "he-IL", timezoneId: "Asia/Jerusalem", colorScheme: o.modo ?? "light", reducedMotion: "reduce" });
    const page = await ctx.newPage();
    // tsx (npm test) compila con keepNames y mete `__name(...)` en las funciones que se pasan a evaluate: en la página es la identidad.
    await page.addInitScript("globalThis.__name = globalThis.__name || ((f) => f);");
    await page.clock.setFixedTime(AHORA);
    const datos = o.datos ?? salon(raiz);
    const usuario = o.usuario === undefined ? DUENA : o.usuario;
    await page.addInitScript(([d, u, m]: [any, any, string]) => {
      (globalThis as any).__CRM03 = { datos: d, usuario: u, escrituras: [] };
      try { localStorage.setItem("vite-ui-theme", m); localStorage.setItem("preferred_language", "he"); } catch { /* sin storage */ }
    }, [datos, usuario, o.modo ?? "light"]);
    const pedidos: Abierto["pedidos"] = [];
    const rol = o.rol ?? "owner";
    const porDefecto: Api = (metodo, ruta) => {
      if (metodo === "GET" && ruta.startsWith("/api/admin/users")) return { status: 200, json: { users: [{ email: DUENA.email, role: "owner", status: "active" }], callerRole: rol } };
      if (metodo === "GET" && ruta.startsWith("/api/crm/appointments")) return { status: 200, json: { source: { project: "crm03-prueba", database: "default", collection: "appointments" }, appointments: [] } };
      if (metodo === "GET" && ruta.startsWith("/api/crm-metrics")) {
        const range = new URL(ruta, "http://x").searchParams.get("range") ?? "30d";
        // Las métricas del servidor, calculadas con src/lib/crm-metrics.ts del árbol sobre lo sembrado (como /api/crm-metrics).
        const filas = (pref: string) => Object.entries(datos).filter(([k, v]) => k.startsWith(pref) && v?.clientId === CLIENTE).map(([k, v]) => ({ id: k.split("/").pop(), ...v, createdAtMs: v.createdAt?.__ts ?? (typeof v.createdAt === "string" ? Date.parse(v.createdAt) : undefined) }));
        const json = metricas?.computeCrmMetrics ? metricas.computeCrmMetrics({ range, now: AHORA, appointments: filas("appointments/"), customers: filas("customers/"), inbox: filas("contact_inbox/"), leads: [] }) : {};
        return { status: 200, json };
      }
      if (metodo === "GET" && ruta.startsWith("/api/tasks")) return { status: 200, json: { tasks: [] } };
      if (metodo === "GET" && ruta.startsWith("/api/whatsapp/config")) return { status: 200, json: { agent: false } };
      if (metodo === "GET" && ruta.startsWith("/api/knowledge/list")) return { status: 503, json: { error: "AI disabled" } };
      return undefined;
    };
    await ctx.route("**/*", async (r: any) => {
      const u = new URL(r.request().url());
      if (u.hostname !== "127.0.0.1" && u.hostname !== "localhost") return r.abort();
      if (!u.pathname.startsWith("/api/")) return r.continue();
      const metodo = r.request().method();
      let cuerpo: any = null;
      try { cuerpo = r.request().postDataJSON(); } catch { cuerpo = r.request().postData(); }
      const ruta = u.pathname + u.search;
      pedidos.push({ metodo, ruta, cuerpo });
      const res = o.api?.(metodo, ruta, cuerpo) ?? porDefecto(metodo, ruta, cuerpo) ?? { status: 404, json: { error: "crm03: sin respuesta" } };
      return r.fulfill({ status: res.status, contentType: "application/json", body: JSON.stringify(res.json) });
    });
    await page.goto(base.replace(/\/$/, "") + (o.ruta ?? "/admin"), { waitUntil: "domcontentloaded" });
    await page.waitForFunction((sinAcceso: boolean) => [...document.querySelectorAll("button")].some((b) => (b.textContent ?? "").trim() === "תורים") || (sinAcceso && document.body.innerText.includes("הגישה נדחתה")), !!o.oPantallaSinAcceso, { timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    return {
      page, ctx, pedidos,
      escrituras: () => page.evaluate(() => (globalThis as any).__CRM03.escrituras),
      documento: (ruta: string) => page.evaluate((r: string) => (globalThis as any).__CRM03.datos[r], ruta),
      async ir(etiqueta: string) {
        await page.evaluate((t: string) => {
          const b = [...document.querySelectorAll("button, a, [role=tab], [role=menuitem]")].find((e) => (e.textContent ?? "").trim() === t) as HTMLElement | undefined;
          if (!b) throw new Error(`no hay en el menú un botón «${t}»`);
          b.click();
        }, etiqueta);
        await quieta(page);
      },
      cerrar: () => ctx.close(),
    };
  };
  try { await fn({ abrir, vite, navegador, raiz }); }
  finally {
    await navegador.close().catch(() => {});
    await vite.close().catch(() => {});
    for (const [k, v] of Object.entries(antes)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
}

/** Los módulos de T (src/*, api/* no: se leen como texto) cargados por Vite (`ssrLoadModule`), como los resuelve la app: imports sin
 *  extensión, .tsx e `import.meta.env`. `cargar(rel)` da undefined si el archivo no existe. Se cierra en `finally`. */
export async function conModulos(fn: (cargar: (rel: string) => Promise<Record<string, any> | undefined>) => Promise<void>, raiz = ROOT): Promise<void> {
  const vitePkg = "vite";
  const { createServer } = await import(vitePkg);
  const vite = await createServer({ configFile: resolve(raiz, "vite.config.ts"), root: raiz, logLevel: "silent", appType: "custom", server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] } });
  const { existsSync } = await import("node:fs");
  try { await fn(async (rel) => (existsSync(resolve(raiz, rel)) ? vite.ssrLoadModule("/" + rel.replace(/^\//, "")) : undefined)); }
  finally { await vite.close().catch(() => {}); }
}

/** Toca el primer control visible cuyo texto (o nombre accesible) es exactamente `texto`; false si no hay ninguno (el test lo afirma). */
export async function tocar(page: any, texto: string, dentro?: string): Promise<boolean> {
  const ok = await page.evaluate(([t, sel]: [string, string | undefined]) => {
    const raiz = sel ? document.querySelector(sel) : document;
    if (!raiz) return false;
    const vis = (e: Element) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"; };
    const b = [...raiz.querySelectorAll("button, a, [role=button], [role=tab], [role=menuitem], [role=option]")].find((e) => vis(e) && ((e.textContent ?? "").trim() === t || (e.getAttribute("aria-label") ?? "").trim() === t)) as HTMLElement | undefined;
    if (!b) return false;
    b.scrollIntoView({ block: "center" });
    b.click();
    return true;
  }, [texto, dentro]);
  if (ok) await quieta(page);
  return ok;
}

/** Un locator del primer campo visible (input, select, textarea) cuyo nombre —su `<label>`, `aria-label` o `placeholder`— empieza con
 *  `nombre`, dentro de `dentro` (selector) si se da; null si no hay. */
export async function campo(page: any, nombre: string, dentro?: string): Promise<any | null> {
  const id = await page.evaluate(([n, sel]: [string, string | undefined]) => {
    const raiz = sel ? document.querySelector(sel) : document;
    if (!raiz) return null;
    const nombreDe = (e: Element) => {
      const lbl = (e as HTMLInputElement).labels?.[0]?.textContent ?? "";
      return [lbl, e.getAttribute("aria-label") ?? "", e.getAttribute("placeholder") ?? ""].map((x) => x.trim());
    };
    const e = [...raiz.querySelectorAll("input, select, textarea")].find((x) => x.getBoundingClientRect().width > 0 && nombreDe(x).some((s) => s.startsWith(n)));
    if (!e) return null;
    const marca = `crm03-${Math.random().toString(36).slice(2)}`;
    e.setAttribute("data-crm03", marca);
    return marca;
  }, [nombre, dentro]);
  return id ? page.locator(`[data-crm03="${id}"]`) : null;
}

/** La reserva pública de una web (W1): abre el asistente desde /servicios, elige el primer servicio y a `persona`, va al mes de
 *  `fecha` (AAAA-MM-DD) y toca ese día; devuelve las horas que ofrece y si dice que el día está cerrado (`booking.closedDay`).
 *  Sólo lee: no reserva. */
export async function reservaPublica(page: any, base: string, persona: string, fecha: string): Promise<{ horas: string[]; cerrado: boolean; paso: string }> {
  await page.goto(base.replace(/\/$/, "") + "/servicios", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => [...document.querySelectorAll("button, a")].some((e) => /קביעת תור/.test((e as HTMLElement).innerText ?? "")), null, { timeout: 60000 });
  await quieta(page);
  const abierto = await page.evaluate(() => { const b = [...document.querySelectorAll("main button, button")].find((e) => /קביעת תור/.test((e as HTMLElement).innerText ?? "") && e.getBoundingClientRect().width > 0) as HTMLElement | undefined; b?.click(); return !!b; });
  if (!abierto) return { horas: [], cerrado: false, paso: "sin botón de reservar en /servicios" };
  await page.waitForFunction(() => !!document.querySelector("[role=dialog]"), null, { timeout: 30000 });
  await quieta(page);
  // Si el asistente pide el servicio, el primero.
  await page.evaluate(() => { const d = document.querySelector("[role=dialog]")!; const t = d.textContent ?? ""; if (/שירות/.test(t) && !d.querySelector(".rdp, [class*=rdp], table")) { const b = [...d.querySelectorAll("button")].find((x) => /₪/.test(x.textContent ?? "")) as HTMLElement | undefined; b?.click(); } });
  await quieta(page);
  const conPersona = await page.evaluate((p: string) => { const b = [...document.querySelectorAll("[role=dialog] button")].find((x) => (x.textContent ?? "").includes(p)) as HTMLElement | undefined; b?.click(); return !!b; }, persona);
  if (!conPersona) return { horas: [], cerrado: false, paso: `sin «${persona}» en el asistente` };
  await quieta(page);
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const nombreMes = new Intl.DateTimeFormat("he-IL", { month: "long" }).format(new Date(anio, mes - 1, 1));
  for (let i = 0; i < 13; i++) {
    const enMes = await page.evaluate(([nm, a]: [string, number]) => (document.querySelector("[role=dialog]")?.textContent ?? "").includes(nm) && (document.querySelector("[role=dialog]")?.textContent ?? "").includes(String(a)), [nombreMes, anio]);
    if (enMes) break;
    const sig = await page.evaluate(() => { const b = [...document.querySelectorAll("[role=dialog] button")].find((x) => /next|הבא/i.test((x.getAttribute("aria-label") ?? "") + (x.getAttribute("name") ?? ""))) as HTMLElement | undefined; b?.click(); return !!b; });
    if (!sig) return { horas: [], cerrado: false, paso: "sin «mes siguiente» en el calendario de la reserva" };
    await quieta(page);
  }
  const tocado = await page.evaluate((d: number) => { const b = [...document.querySelectorAll("[role=dialog] button")].find((x) => (x.textContent ?? "").trim() === String(d) && !(x as HTMLButtonElement).disabled && !x.closest("[class*=outside]")) as HTMLElement | undefined; b?.click(); return !!b; }, dia);
  await quieta(page);
  const r = await page.evaluate(() => { const d = document.querySelector("[role=dialog]"); const t = d?.textContent ?? ""; return { cerrado: t.includes("ביום הזה אנחנו סגורים"), horas: [...(d?.querySelectorAll("button") ?? [])].map((b) => (b.textContent ?? "").trim()).filter((x) => /^\d{2}:\d{2}$/.test(x)) }; });
  return { ...r, paso: tocado ? "día tocado" : "el día no se puede tocar (deshabilitado)" };
}

/** La página quieta: sin animaciones vivas y con la caja del documento igual 6 cuadros seguidos. */
export async function quieta(page: any): Promise<void> {
  await page.waitForFunction(() => new Promise<boolean>((ok) => {
    let n = 0, prev = "";
    const paso = () => {
      const r = document.documentElement.getBoundingClientRect();
      const vivas = document.getAnimations().filter((a) => a.playState === "running" && (a.effect as any)?.getTiming?.().iterations !== Infinity).length;
      const firma = `${Math.round(r.height)}x${Math.round(r.width)}:${document.querySelectorAll("*").length}:${vivas}`;
      n = firma === prev && vivas === 0 ? n + 1 : 0; prev = firma;
      if (n >= 6) ok(true); else requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }), null, { timeout: 30000 });
}

/** Lo que se mide de una pantalla (en la página): ver la HOJA, afirmación V1. Devuelve listas con «qué · dónde». */
export async function medirPantalla(page: any): Promise<Record<string, string[]> & { ancho: number; scrollAncho: number }> {
  return page.evaluate(() => {
    const iw = innerWidth, ih = innerHeight;
    const vis = (el: Element) => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const cs = getComputedStyle(el); return cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.05; };
    const nom = (el: Element) => { const t = ((el as HTMLElement).getAttribute?.("aria-label") || (el as HTMLElement).innerText || (el as HTMLInputElement).value || "").trim().replace(/\s+/g, " "); return `${el.tagName.toLowerCase()}«${t.slice(0, 30)}»`; };
    const enScroll = (el: Element) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const ox = getComputedStyle(p).overflowX; if ((ox === "auto" || ox === "scroll") && p.scrollWidth > p.clientWidth + 1) return true; } return false; };
    const fueraDeCuadro = (el: Element) => { for (let p: Element | null = el; p && p !== document.body; p = p.parentElement) { const q = p.getBoundingClientRect(); if (q.left >= iw - 1 || q.right <= 1) return true; } return false; };
    const lum = (c: number[]) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    const rgba = (s: string) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
    const fondo = (el: Element): number[] => { for (let p: Element | null = el; p; p = p.parentElement) { const c = rgba(getComputedStyle(p).backgroundColor); if (c && c[3] > 0.95) return c; } const b = rgba(getComputedStyle(document.body).backgroundColor); return b && b[3] > 0.95 ? b : [255, 255, 255, 1]; };
    const out: Record<string, string[]> = { fuera: [], tapados: [], chicos: [], letraChica: [], contraste: [], latin: [] };
    const todos = [...document.body.querySelectorAll("*")].filter(vis);
    for (const el of todos) {
      const r = el.getBoundingClientRect();
      if (el.children.length === 0 && (r.right > iw + 1 || r.left < -1) && !enScroll(el) && !fueraDeCuadro(el)) out.fuera.push(`${nom(el)} [${Math.round(r.left)}, ${Math.round(r.right)}]`);
    }
    const inter = todos.filter((el) => el.matches("button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=switch], [role=checkbox]") && !fueraDeCuadro(el));
    for (const el of inter) {
      const r = el.getBoundingClientRect();
      if (r.width < 44 || r.height < 44) out.chicos.push(`${nom(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cy > 0 && cy < ih && cx > 0 && cx < iw) { const top = document.elementFromPoint(cx, cy); if (top && top !== el && !el.contains(top) && !top.contains(el)) out.tapados.push(`${nom(el)} bajo ${nom(top)}`); }
    }
    for (const el of todos) {
      if (fueraDeCuadro(el)) continue;
      const texto = [...el.childNodes].filter((n) => n.nodeType === 3 && (n.textContent ?? "").trim()).map((n) => (n.textContent ?? "").trim()).join(" ");
      if (!texto) continue;
      const cs = getComputedStyle(el);
      const tam = parseFloat(cs.fontSize);
      if (tam < 12) out.letraChica.push(`${nom(el)} ${cs.fontSize}`);
      const c = rgba(cs.color);
      if (c && c[3] > 0.05) {
        const f = fondo(el);
        const mezcla = [0, 1, 2].map((i) => c[i] * c[3] + f[i] * (1 - c[3]));
        const L1 = lum(mezcla), L2 = lum(f);
        const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        const grande = tam >= 24 || (tam >= 18.66 && Number(cs.fontWeight) >= 700);
        if (ratio < (grande ? 3 : 4.5) && !(el as HTMLElement).closest("[disabled], [aria-disabled=true]")) out.contraste.push(`${nom(el)} ${ratio.toFixed(2)}`);
      }
      const sinPermitidas = texto.replace(/[\w.+-]+@[\w.-]+/g, "").replace(/\b(CSV|Arzac Studio|Google|WhatsApp|Ctrl\+Enter|AM|PM)\b/g, "");
      if (/[A-Za-zÀ-ÿ]{3,}/.test(sinPermitidas)) out.latin.push(`«${texto.slice(0, 50)}»`);
    }
    for (const k of Object.keys(out)) out[k] = [...new Set(out[k])];
    return Object.assign(out, { ancho: iw, scrollAncho: document.documentElement.scrollWidth });
  });
}
