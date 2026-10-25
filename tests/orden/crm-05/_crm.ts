// CRM-05 (sesión A, 2026-10-25) · copia editable de `../crm-04/_crm.ts` (CRM-04 queda congelada al aprobarse). Sesión A2 (2026-10-25):
// `modo` siembra también `crm-panel-theme` (desde D-345 el panel no lee `vite-ui-theme`, así `modo: "dark"` no oscurecía /admin) y
// `medirPantalla` da además, en `ratios`, el contraste de cada texto dentro de un elemento marcado con `data-crm05-medir` (M1, M2).
// CRM-04 (sesión A, 2026-10-20) · el CRM de T montado en un navegador SIN RED, para los tests de esta orden (sólo T).
// Copia editable de `../crm-03/_crm.ts` (congelado al aprobarse CRM-03) con los dos huecos de D-348 cerrados en `medirPantalla`:
//   (1) una caja más ancha que la pantalla cuenta aunque `html` y `body` lleven `overflow-x: clip` (antes sólo se miraban las hojas y el
//       scroll del documento: así se escapó la tarjeta rusa de 406 px a 390);
//   (2) los colores `oklch()`, `oklab()` y `color(srgb|srgb-linear|display-p3 …)` se leen (Tailwind v4); antes un color así no se
//       entendía y el contraste se medía contra el fondo de atrás («ביטול התור» daba 1,04 siendo ~6:1).
// Y le suma lo de `diseno/crm-04/abrir.mts`: el idioma del panel (por `preferred_language`), el oscuro, los datos de `CRM04_EXTRA` (el
// servicio de precio 0, el turno t11 de 15 min y el rebote l5) y los de `CRM04_TRATO` (גלית "f", יוסי "m", טל sin trato), más lo que
// piden los tests de esta orden: un tamaño de ventana cualquiera, respuestas de /api/* demoradas (Q5) y un script propio al cargar.
// Un Vite sobre el árbol `raiz` (HEAD o el clon neutro del commit rojo) con `firebase/app`, `firebase/auth` y `firebase/firestore`
// reemplazados por los dobles de `./_firebase/` (alias). Las rutas /api/* las responde el test; todo pedido fuera de 127.0.0.1 se corta.
// Reloj fijo: jueves 2026-10-15 10:00 en Asia/Jerusalem. Ninguna espera de tiempo fijo: cada espera es una condición (AUDITORIA-01).
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
export type Idioma = "he" | "en" | "ru" | "ar";
/** Las pestañas que ve la dueña, en el orden del menú (claves de AdminDashboard) y su nombre en hebreo. */
export const CLAVES = ["overview", "missions", "payments", "customers", "personnel", "tasks", "stock", "users", "inbox", "logs", "rules", "support"] as const;
export type Clave = (typeof CLAVES)[number];
export const PESTANAS_DUENA = ["סקירה", "תורים", "תשלומים", "לקוחות", "צוות", "משימות", "מלאי", "משתמשים", "תיבת דואר", "יומן מייל", "זמנים", "תמיכה"];
export const PESTANAS_EMPLEADA = ["תורים", "לקוחות", "משימות", "מלאי", "תיבת דואר"];

const ts = (iso: string) => ({ __ts: new Date(iso).getTime() });
const leerJson = (raiz: string, rel: string) => JSON.parse(readFileSync(resolve(raiz, rel), "utf8"));

/** El salón de prueba de CRM-03 (`../crm-03/_crm.ts`, copiado) y, con `extra` y `trato`, lo de CRM04_EXTRA y CRM04_TRATO (abrir.mts). */
export function salon(raiz = ROOT, o: { extra?: boolean; trato?: boolean } = {}): Record<string, any> {
  const config = leerJson(raiz, "dev-fixtures/peluqueria-paleta-a.json");
  config.adminEmail = DUENA.email;
  config.staff = (config.staff ?? []).slice(0, 3);
  if (config.staff[2]) config.staff[2] = { ...config.staff[2], photoUrl: "" };
  const d: Record<string, any> = {
    [`clients/${CLIENTE}`]: { status: "active" },
    [`config/${CLIENTE}`]: config,
  };
  const staff = config.staff.map((s: any) => s.id);
  const turno = (id: string, x: Record<string, any>) => {
    d[`appointments/${id}`] = { clientId: CLIENTE, customerEmail: `${id}@example.com`, customerPhone: "050-000-0000", duration: 60, status: "confirmed", paymentStatus: "pending", type: "appointment", createdAt: ts("2026-10-10T09:00:00+03:00"), ...x };
  };
  turno("t1", { customerName: "גלית", serviceId: "blowdry", staffId: staff[1], date: HOY, time: "09:00", duration: 60 });
  turno("t2", { customerName: "מיכל", serviceId: "cut", staffId: staff[0], date: HOY, time: "09:30", duration: 90, paymentStatus: "paid", amountPaidCents: 18000, paymentMethod: "cash" });
  turno("t3", { customerName: "נועה", serviceId: "cut-blowdry", staffId: staff[0], date: HOY, time: "10:00", duration: 120 });
  turno("t4", { customerName: "רוני", serviceId: "root-color", staffId: staff[2], date: HOY, time: "12:00", duration: 120, status: "pending" });
  turno("t5", { customerName: "דנה", serviceId: "treatment", staffId: staff[1], date: HOY, time: "15:00", duration: 60, paymentStatus: "paid", amountPaidCents: 58000, paymentMethod: "card" });
  turno("t6", { customerName: "ליאת", serviceId: "event-style", staffId: staff[1], date: MANANA, time: "11:00", duration: 90 });
  turno("t7", { customerName: "שירה", serviceId: "full-color", staffId: staff[0], date: "2026-10-13", time: "16:00", duration: 150, status: "completed", paymentStatus: "paid", amountPaidCents: 26000, paymentMethod: "transfer" });
  turno("t8", { customerName: "יעל", serviceId: "kids-cut", staffId: staff[2], date: "2026-10-12", time: "10:00", duration: 30, status: "cancelled" });
  turno("t9", { customerName: "הילה", serviceId: "bride", staffId: staff[0], date: "2026-10-11", time: "07:30", duration: 120, status: "completed", paymentStatus: "paid", amountPaidCents: 80000, paymentMethod: "card" });
  turno("t10", { customerName: "אור", serviceId: "blowdry", staffId: staff[1], date: "2026-10-08", time: "21:00", duration: 60, status: "completed", paymentStatus: "paid", amountPaidCents: 9000, paymentMethod: "other" });
  const cliente = (id: string, x: Record<string, any>) => { d[`customers/${CLIENTE}_${id}`] = { clientId: CLIENTE, email: `${id}@example.com`, phone: "050-000-0001", createdAt: ts("2026-09-01T10:00:00+03:00"), updatedAt: ts("2026-10-10T10:00:00+03:00"), visitCount: 1, ...x }; };
  cliente("galit", { fullName: "גלית", stage: "lead", source: "walkin" });
  cliente("liat", { fullName: "ליאת", stage: "contacted", source: "web" });
  cliente("roni", { fullName: "רוני", stage: "scheduled", source: "whatsapp" });
  cliente("michal", { fullName: "מיכל", stage: "converted", source: "booking", visitCount: 4, paymentMethod: "cash" });
  cliente("manual", { fullName: "טל", email: "manual_1760000000000@noemail.local", stage: "converted", source: "manual" });
  d[`contact_inbox/m1`] = { clientId: CLIENTE, name: "אור", email: "or@example.com", phone: "050-000-0002", subject: "שעות פתיחה", message: "האם אתן פתוחות ביום שישי?", source: "web", status: "new", createdAt: ts("2026-10-14T18:00:00+03:00") };
  d[`contact_inbox/m2`] = { clientId: CLIENTE, name: "רוני", email: "roni@example.com", phone: "050-000-0003", subject: "שאלה על החלקה", message: "כמה זמן מחזיקה ההחלקה?", source: "whatsapp", status: "read", createdAt: ts("2026-10-13T12:00:00+03:00") };
  d[`notification_logs/l1`] = { clientId: CLIENTE, channel: "email", recipient: "t1@example.com", subject: "אישור תור", type: "booking", status: "sent", refId: "t1", createdAt: "2026-10-10T09:01:00.000Z" };
  d[`notification_logs/l2`] = { clientId: CLIENTE, channel: "email", recipient: "t6@example.com", subject: "תזכורת", type: "reminder", status: "sent", refId: "t6", createdAt: ts("2026-10-14T18:00:00+03:00") };
  d[`notification_logs/l3`] = { clientId: CLIENTE, channel: "email", recipient: "duena@example.com", subject: "פנייה", type: "contact", status: "failed", error: "x", createdAt: ts("2026-10-13T08:00:00+03:00") };
  d[`notification_logs/l4`] = { clientId: CLIENTE, channel: "email", recipient: "t4@example.com", subject: "תזכורת", type: "reminder", status: "queued", refId: "t4", createdAt: ts("2026-10-14T18:00:00+03:00") };
  d[`stock_items/s1`] = { clientId: CLIENTE, name: "שמפו מקצועי", category: "טיפוח", unit: "unidades", quantity: 12, minStock: 3, createdAt: ts("2026-09-01T10:00:00+03:00"), updatedAt: ts("2026-10-01T10:00:00+03:00") };
  d[`stock_items/s2`] = { clientId: CLIENTE, name: "חמצן 6%", category: "צבע", unit: "ml", quantity: 2, minStock: 5, createdAt: ts("2026-09-01T10:00:00+03:00"), updatedAt: ts("2026-10-01T10:00:00+03:00") };
  if (o.extra) { // CRM04_EXTRA (prototipo 3): un servicio sin precio de 15 minutos, un turno hoy con él y un aviso rebotado.
    config.services = [...config.services, { id: "consulta", name: "ייעוץ ואבחון", price: 0, duration: 15, category: config.services[0]?.category }];
    config.translations = config.translations ?? {};
    for (const [l, n] of [["en", "Consultation"], ["ru", "Консультация"], ["ar", "استشارة"]] as const) { const tr = config.translations[l] ?? (config.translations[l] = {}); if (tr.services && !Array.isArray(tr.services)) tr.services.consulta = { name: n }; }
    d[`notification_logs/l5`] = { clientId: CLIENTE, channel: "email", recipient: "walkin_0500000000@noemail.local", subject: "תזכורת", type: "reminder", status: "failed", error: "550 5.1.1 The email account does not exist.", refId: "t11", createdAt: ts("2026-10-14T18:00:00+03:00") };
    turno("t11", { customerName: "אור", customerEmail: "t11@example.com", serviceId: "consulta", staffId: staff[2], date: HOY, time: "13:00", duration: 15 });
  }
  if (o.trato) { // CRM04_TRATO (prototipo 5, R31): una clienta, un cliente y alguien sin indicar, ninguno con visitas todavía.
    const k = (id: string) => `customers/${CLIENTE}_${id}`;
    Object.assign(d[k("galit")], { trato: "f", visitCount: 0 });
    Object.assign(d[k("manual")], { visitCount: 0, stage: "lead" });
    d[k("yossi")] = { ...d[k("galit")], fullName: "יוסי", email: "yossi@example.com", phone: "050-000-0002", trato: "m", stage: "lead", source: "walkin", visitCount: 0 };
  }
  return d;
}

/** Las palabras hebreas de los DATOS del salón (nombres, servicios, equipo, productos, asuntos, mensajes): todo string de los documentos
 *  sembrados salvo `config`, y de `config` el catálogo, el equipo y la marca. Lo que el panel muestra con letras hebreas y no está acá
 *  es texto del panel (I1, G4). */
export function palabrasDeDatos(datos: Record<string, any>): string[] {
  const out = new Set<string>();
  const juntar = (v: any) => {
    if (typeof v === "string") for (const w of v.match(/[א-ת]+/g) ?? []) out.add(w);
    else if (Array.isArray(v)) v.forEach(juntar);
    else if (v && typeof v === "object") Object.values(v).forEach(juntar);
  };
  for (const [ruta, doc] of Object.entries(datos)) {
    if (!ruta.startsWith("config/")) { juntar(doc); continue; }
    juntar(doc.services); juntar(doc.staff); juntar(doc.brand?.name); juntar(doc.business?.name); juntar(doc.business?.legalName);
  }
  return [...out];
}

export type Respuesta = { status: number; json: any };
export type Api = (metodo: string, ruta: string, cuerpo: any) => Respuesta | undefined | Promise<Respuesta | undefined>;
export type Abierto = {
  page: any; ctx: any;
  escrituras(): Promise<{ op: string; ruta: string; datos?: any; merge?: boolean; tx?: boolean }[]>;
  documento(ruta: string): Promise<any>;
  pedidos: { metodo: string; ruta: string; cuerpo: any }[];
  /** Ir a una pestaña por su clave (el botón del menú en esa posición, en cualquier idioma). */
  irA(clave: Clave): Promise<void>;
  cerrar(): Promise<void>;
};
export type Opciones = {
  vista?: Vista; tam?: { width: number; height: number };
  idioma?: Idioma; modo?: "light" | "dark";
  datos?: Record<string, any>; extra?: boolean; trato?: boolean;
  usuario?: { email: string; uid: string } | null; rol?: "owner" | "manager" | "staff";
  api?: Api; ruta?: string;
  /** JS que corre en la página antes que la app (addInitScript). */
  init?: string;
  /** Lo que se suma al estado del Firestore en memoria: `demora` (ruta → ms | "nunca") y `fallar` (expresiones de rutas). */
  estado?: Record<string, any>;
  /** Qué esperar antes de devolver: el menú del panel (por defecto en /admin), el menú o «הגישה נדחתה», o nada. */
  esperar?: "menu" | "menuOSinAcceso" | "nada";
};
type Crm = { abrir(o: Opciones): Promise<Abierto>; vite: any; navegador: any; raiz: string; base: string };

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
  const base = (vite.resolvedUrls.local[0] as string).replace(/\/$/, "");
  const { chromium } = await import(pwPkg);
  const navegador = await chromium.launch({ args: ["--disable-lcd-text", "--font-render-hinting=none"] });
  const metricas: any = await vite.ssrLoadModule("/src/lib/crm-metrics.ts").catch((): null => null);
  const abrir = async (o: Opciones): Promise<Abierto> => {
    const tam = o.tam ?? ANCHOS[o.vista ?? "escritorio"];
    const movil = tam.width < 768;
    const ctx = await navegador.newContext({ viewport: tam, deviceScaleFactor: 1, isMobile: movil, hasTouch: tam.width < 1024, locale: "he-IL", timezoneId: "Asia/Jerusalem", colorScheme: o.modo ?? "light", reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.addInitScript("globalThis.__name = globalThis.__name || ((f) => f);");
    await page.clock.setFixedTime(AHORA);
    const datos = o.datos ?? salon(raiz, { extra: o.extra, trato: o.trato });
    const usuario = o.usuario === undefined ? DUENA : o.usuario;
    // El almacenamiento se siembra UNA vez por pestaña (recargar conserva lo que el panel guardó: R5); los datos, en cada carga.
    await page.addInitScript(([d, u, m, l, e]: [any, any, string, string, any]) => {
      (globalThis as any).__CRM03 = { datos: d, usuario: u, escrituras: [], ...e };
      try {
        if (!sessionStorage.getItem("__crm04_sembrado")) {
          localStorage.setItem("vite-ui-theme", m); localStorage.setItem("crm-panel-theme", m); localStorage.setItem("preferred_language", l);
          sessionStorage.setItem("__crm04_sembrado", "1");
        }
      } catch { /* sin storage */ }
    }, [datos, usuario, o.modo ?? "light", o.idioma ?? "he", o.estado ?? {}]);
    if (o.init) await page.addInitScript(o.init);
    const pedidos: Abierto["pedidos"] = [];
    const rol = o.rol ?? "owner";
    const porDefecto: Api = (metodo, ruta) => {
      if (metodo === "GET" && ruta.startsWith("/api/admin/me")) return { status: 200, json: { role: rol, status: "active", email: (usuario ?? DUENA).email } };
      if (metodo === "GET" && ruta.startsWith("/api/admin/users")) return { status: 200, json: { users: [{ email: DUENA.email, role: "owner", status: "active" }], callerRole: rol } };
      if (metodo === "GET" && ruta.startsWith("/api/crm/appointments")) return { status: 200, json: { source: { project: "crm03-prueba", database: "default", collection: "appointments" }, appointments: [] } };
      if (metodo === "GET" && ruta.startsWith("/api/crm-metrics")) {
        const range = new URL(ruta, "http://x").searchParams.get("range") ?? "30d";
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
      const res = (await o.api?.(metodo, ruta, cuerpo)) ?? (await porDefecto(metodo, ruta, cuerpo)) ?? { status: 404, json: { error: "crm04: sin respuesta" } };
      return r.fulfill({ status: res.status, contentType: "application/json", body: JSON.stringify(res.json) }).catch(() => {});
    });
    const ruta = o.ruta ?? "/admin";
    await page.goto(base + ruta, { waitUntil: "domcontentloaded" });
    const esperar = o.esperar ?? (ruta.startsWith("/admin") ? "menu" : "nada");
    if (esperar !== "nada") {
      await page.waitForFunction((sinAcceso: boolean) => document.querySelectorAll("aside nav button").length >= 3 || (sinAcceso && document.body.innerText.includes("הגישה נדחתה")), esperar === "menuOSinAcceso", { timeout: 90000 });
      await page.evaluate(() => document.fonts.ready);
      await quieta(page);
    }
    return {
      page, ctx, pedidos,
      escrituras: () => page.evaluate(() => (globalThis as any).__CRM03.escrituras),
      documento: (r: string) => page.evaluate((x: string) => (globalThis as any).__CRM03.datos[x], r),
      async irA(clave: Clave) {
        const i = CLAVES.indexOf(clave);
        await page.evaluate((k: number) => {
          const b = document.querySelectorAll("aside nav button")[k] as HTMLElement | undefined;
          if (!b) throw new Error(`el menú no tiene la entrada ${k}`);
          b.click();
        }, i);
        await quieta(page);
        await page.evaluate(() => scrollTo(0, 0));
      },
      cerrar: () => ctx.close(),
    };
  };
  try { await fn({ abrir, vite, navegador, raiz, base }); }
  finally {
    await navegador.close().catch(() => {});
    await vite.close().catch(() => {});
    for (const [k, v] of Object.entries(antes)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
}

/** Los módulos de T cargados por Vite (`ssrLoadModule`), como los resuelve la app. `cargar(rel)` da undefined si el archivo no existe. */
export async function conModulos(fn: (cargar: (rel: string) => Promise<Record<string, any> | undefined>) => Promise<void>, raiz = ROOT): Promise<void> {
  const vitePkg = "vite";
  const { createServer } = await import(vitePkg);
  const vite = await createServer({ configFile: resolve(raiz, "vite.config.ts"), root: raiz, logLevel: "silent", appType: "custom", server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] } });
  const { existsSync } = await import("node:fs");
  try { await fn(async (rel) => (existsSync(resolve(raiz, rel)) ? vite.ssrLoadModule("/" + rel.replace(/^\//, "")) : undefined)); }
  finally { await vite.close().catch(() => {}); }
}

/** Toca el primer control visible cuyo texto (o nombre accesible) es exactamente `texto`; false si no hay ninguno. */
export async function tocar(page: any, texto: string, dentro?: string): Promise<boolean> {
  const ok = await page.evaluate(([t, sel]: [string, string | undefined]) => {
    const raiz = sel ? document.querySelector(sel) : document;
    if (!raiz) return false;
    const vis = (e: Element) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"; };
    const b = [...raiz.querySelectorAll("button, a, [role=button], [role=tab], [role=menuitem], [role=option], [role=radio]")].find((e) => vis(e) && ((e.textContent ?? "").trim() === t || (e.getAttribute("aria-label") ?? "").trim() === t)) as HTMLElement | undefined;
    if (!b) return false;
    b.scrollIntoView({ block: "center" });
    b.click();
    return true;
  }, [texto, dentro]);
  if (ok) await quieta(page);
  return ok;
}

/** Un locator del primer campo visible cuyo nombre —su `<label>`, `aria-label` o `placeholder`— empieza con `nombre`; null si no hay. */
export async function campo(page: any, nombre: string, dentro?: string): Promise<any | null> {
  const id = await page.evaluate(([n, sel]: [string, string | undefined]) => {
    const raiz = sel ? document.querySelector(sel) : document;
    if (!raiz) return null;
    const nombreDe = (e: Element) => [((e as HTMLInputElement).labels?.[0]?.textContent ?? ""), e.getAttribute("aria-label") ?? "", e.getAttribute("placeholder") ?? ""].map((x) => x.trim());
    const e = [...raiz.querySelectorAll("input, select, textarea")].find((x) => x.getBoundingClientRect().width > 0 && nombreDe(x).some((s) => s.startsWith(n)));
    if (!e) return null;
    const marca = `crm04-${Math.random().toString(36).slice(2)}`;
    e.setAttribute("data-crm04", marca);
    return marca;
  }, [nombre, dentro]);
  return id ? page.locator(`[data-crm04="${id}"]`) : null;
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

/** Los textos visibles de la página con letras hebreas que no son datos del salón: cada nodo de texto visible (fuera de `<select>`,
 *  `<option>`, `<script>`, `<style>`) cuyas palabras hebreas no están todas en `palabras`; una letra sola vale si es la inicial de un
 *  dato (el avatar sin foto). */
export async function hebreoDelPanel(page: any, palabras: string[], dentro = "body"): Promise<string[]> {
  return page.evaluate(([ps, sel]: [string[], string]) => {
    const datos = new Set(ps);
    const iniciales = new Set(ps.map((p) => p[0]));
    const raiz = document.querySelector(sel) ?? document.body;
    const out = new Set<string>();
    const it = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    for (let n = it.nextNode(); n; n = it.nextNode()) {
      const t = (n.textContent ?? "").trim();
      if (!/[א-ת]/.test(t)) continue;
      const el = n.parentElement;
      if (!el || el.closest("select, option, script, style, template")) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      let visible = true;
      for (let p: Element | null = el; p; p = p.parentElement) { const cs = getComputedStyle(p); if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.05) { visible = false; break; } }
      if (!visible) continue;
      const palabras = t.match(/[א-ת]+/g) ?? [];
      if (palabras.every((w) => datos.has(w) || (w.length === 1 && iniciales.has(w)))) continue;
      out.add(t.slice(0, 80));
    }
    return [...out];
  }, [palabras, dentro]);
}

/** El sentido (hacia dónde apunta) del ícono de flecha dentro de un control: se muestrean los trazos del SVG (`getPointAtLength`) y se
 *  pasan a la pantalla con `getScreenCTM()` (que incluye las transformaciones CSS del ícono y de sus ancestros); la punta es la x de los
 *  puntos de la mitad vertical frente a la de los extremos. "derecha" | "izquierda" | null (sin ícono). Se evalúa EN la página sobre el
 *  elemento marcado con `data-crm04-flecha`. */
export const SENTIDO_DE_FLECHA = `(() => {
  const ctrl = document.querySelector("[data-crm04-flecha]");
  if (!ctrl) return null;
  const formas = [...ctrl.querySelectorAll("svg path, svg polyline, svg line")].filter((e) => typeof e.getTotalLength === "function");
  const pts = [];
  for (const f of formas) {
    const m = f.getScreenCTM(); if (!m) continue;
    const L = f.getTotalLength();
    for (let i = 0; i <= 20; i++) { const p = f.getPointAtLength((L * i) / 20); pts.push({ x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f }); }
  }
  if (pts.length < 3) return null;
  const ys = pts.map((p) => p.y), y0 = Math.min(...ys), y1 = Math.max(...ys), alto = y1 - y0 || 1, medio = (y0 + y1) / 2;
  const media = (xs) => xs.reduce((s, x) => s + x, 0) / (xs.length || 1);
  const extremos = media(pts.filter((p) => p.y - y0 < alto * 0.15 || y1 - p.y < alto * 0.15).map((p) => p.x));
  const centro = media(pts.filter((p) => Math.abs(p.y - medio) < alto * 0.15).map((p) => p.x));
  return centro > extremos ? "derecha" : "izquierda";
})()`;

/** Lo que se mide de una pantalla (en la página): «qué · dónde» por criterio (V1 de CRM-03), con los dos huecos de D-348 cerrados. */
export async function medirPantalla(page: any): Promise<Record<string, string[]> & { ancho: number; scrollAncho: number; ratios: { marca: string; nombre: string; ratio: number }[] }> {
  return page.evaluate(() => {
    const iw = innerWidth, ih = innerHeight;
    const vis = (el: Element) => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const cs = getComputedStyle(el); return cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.05; };
    const nom = (el: Element) => { const t = ((el as HTMLElement).getAttribute?.("aria-label") || (el as HTMLElement).innerText || (el as HTMLInputElement).value || "").trim().replace(/\s+/g, " "); return `${el.tagName.toLowerCase()}«${t.slice(0, 30)}»`; };
    const fueraDeCuadro = (el: Element) => { for (let p: Element | null = el; p && p !== document.body; p = p.parentElement) { const q = p.getBoundingClientRect(); if (q.left >= iw - 1 || q.right <= 1) return true; } return false; };
    // D-348 (1): una caja que se pasa del ancho de la pantalla cuenta aunque html/body la recorten (overflow-x: clip); sólo la esconde un
    // ancestro de la página (debajo de body) que recorta en x y queda él mismo dentro de la pantalla (un carrusel, una tira con scroll).
    const escondida = (el: Element) => {
      for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX;
        if (ox === "hidden" || ox === "clip" || ox === "auto" || ox === "scroll") { const q = p.getBoundingClientRect(); if (q.left >= -1 && q.right <= iw + 1) return true; }
      }
      return false;
    };
    // D-348 (2): los colores de Tailwind v4 (oklch, oklab, color(...)) a sRGB 0–255.
    const lin2srgb = (v: number) => { const a = Math.abs(v); const s = a <= 0.0031308 ? 12.92 * a : 1.055 * a ** (1 / 2.4) - 0.055; return Math.max(0, Math.min(1, Math.sign(v) * s)) * 255; };
    const srgb2lin = (v: number) => (Math.abs(v) <= 0.04045 ? v / 12.92 : Math.sign(v) * ((Math.abs(v) + 0.055) / 1.055) ** 2.4);
    const num = (s: string, pct = 1) => (s === "none" ? 0 : s.endsWith("%") ? (parseFloat(s) / 100) * pct : parseFloat(s));
    const color = (s: string): number[] | null => {
      const m = s.trim().match(/^([a-z-]+)\((.*)\)$/);
      if (!m) return null;
      const [cuerpo, alfa] = m[2].split("/").map((x) => x.trim());
      const p = cuerpo.split(/[\s,]+/).filter(Boolean);
      const A = alfa === undefined ? (p.length === 4 && (m[1] === "rgba" || m[1] === "rgb") ? num(p[3]) : 1) : num(alfa);
      if (m[1] === "rgb" || m[1] === "rgba") return [num(p[0], 255), num(p[1], 255), num(p[2], 255), A];
      const deOklab = (L: number, a: number, b: number) => {
        const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, ss = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
        return [lin2srgb(4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * ss), lin2srgb(-1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * ss), lin2srgb(-0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * ss), A];
      };
      if (m[1] === "oklab") return deOklab(num(p[0]), num(p[1], 0.4), num(p[2], 0.4));
      if (m[1] === "oklch") { const C = num(p[1], 0.4), H = (num(p[2]) * Math.PI) / 180; return deOklab(num(p[0]), C * Math.cos(H), C * Math.sin(H)); }
      if (m[1] === "color") {
        const [esp, r, g, b] = p; const v = [r, g, b].map((x) => num(x));
        if (esp === "srgb") return [...v.map((x) => Math.max(0, Math.min(1, x)) * 255), A];
        if (esp === "srgb-linear") return [...v.map(lin2srgb), A];
        if (esp === "display-p3") {
          const [R, G, B] = v.map(srgb2lin);
          const X = 0.4865709 * R + 0.2656677 * G + 0.1982173 * B, Y = 0.2289746 * R + 0.6917385 * G + 0.0792869 * B, Z = 0.0451134 * G + 1.0439444 * B;
          return [lin2srgb(3.2409699 * X - 1.5373832 * Y - 0.4986108 * Z), lin2srgb(-0.9692436 * X + 1.8759675 * Y + 0.0415551 * Z), lin2srgb(0.0556301 * X - 0.203977 * Y + 1.0569715 * Z), A];
        }
      }
      return null;
    };
    const lum = (c: number[]) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    const fondo = (el: Element): number[] => { for (let p: Element | null = el; p; p = p.parentElement) { const c = color(getComputedStyle(p).backgroundColor); if (c && c[3] > 0.95) return c; } const b = color(getComputedStyle(document.body).backgroundColor); return b && b[3] > 0.95 ? b : [255, 255, 255, 1]; };
    const out: Record<string, string[]> = { fuera: [], tapados: [], chicos: [], letraChica: [], contraste: [], latin: [] };
    // CRM-05 A2: el contraste de cada texto de un elemento marcado (`data-crm05-medir="<marca>"`), con la misma cuenta que `contraste`.
    const ratios: { marca: string; nombre: string; ratio: number }[] = [];
    const todos = [...document.body.querySelectorAll("*")].filter(vis);
    const marcados = new Set<Element>();
    for (const el of todos) {
      const r = el.getBoundingClientRect();
      if ((r.right > iw + 1 || r.left < -1) && !fueraDeCuadro(el) && !escondida(el)) marcados.add(el);
    }
    for (const el of marcados) if (!el.parentElement || !marcados.has(el.parentElement)) out.fuera.push(`${nom(el)} [${Math.round(el.getBoundingClientRect().left)}, ${Math.round(el.getBoundingClientRect().right)}]`);
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
      const c = color(cs.color);
      if (c && c[3] > 0.05) {
        const f = fondo(el);
        const mezcla = [0, 1, 2].map((i) => c[i] * c[3] + f[i] * (1 - c[3]));
        const L1 = lum(mezcla), L2 = lum(f);
        const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        const grande = tam >= 24 || (tam >= 18.66 && Number(cs.fontWeight) >= 700);
        if (ratio < (grande ? 3 : 4.5) && !(el as HTMLElement).closest("[disabled], [aria-disabled=true]")) out.contraste.push(`${nom(el)} ${ratio.toFixed(2)}`);
        const marcado = (el as HTMLElement).closest("[data-crm05-medir]");
        if (marcado) ratios.push({ marca: marcado.getAttribute("data-crm05-medir") ?? "", nombre: nom(el), ratio: Math.round(ratio * 100) / 100 });
      }
      const sinPermitidas = texto.replace(/[\w.+-]+@[\w.-]+/g, "").replace(/\b(CSV|Arzac Studio|Google|WhatsApp|Ctrl\+Enter|AM|PM)\b/g, "");
      if (/[A-Za-zÀ-ÿ]{3,}/.test(sinPermitidas)) out.latin.push(`«${texto.slice(0, 50)}»`);
    }
    for (const k of Object.keys(out)) out[k] = [...new Set(out[k])];
    return Object.assign(out, { ancho: iw, scrollAncho: document.documentElement.scrollWidth, ratios });
  });
}

/** En Turnos: la vista calendario (el 2.º botón del grupo de dos de `main`) y, dentro, mes (0), semana (1) o día (2) (el grupo de tres).
 *  Por posición, en cualquier idioma. false si falta alguno de los dos grupos. */
export async function vistaCalendario(page: any, cual: 0 | 1 | 2): Promise<boolean> {
  const ok = await page.evaluate((i: number) => {
    const vis = (e: Element) => e.getBoundingClientRect().width > 0;
    const grupos = () => [...document.querySelectorAll("main [role=group], #admin-content [role=group]")].filter((g) => vis(g) && !g.closest("#admin-content > aside"));
    const dos = grupos().find((g) => g.querySelectorAll("button").length === 2);
    if (!dos) return false;
    (dos.querySelectorAll("button")[1] as HTMLElement).click();
    return true;
  }, cual);
  if (!ok) return false;
  await quieta(page);
  const ok2 = await page.evaluate((i: number) => {
    const g = [...document.querySelectorAll("[role=group]")].filter((x) => x.getBoundingClientRect().width > 0 && !x.closest("#admin-content > aside")).find((x) => x.querySelectorAll("button").length === 3);
    if (!g) return false;
    (g.querySelectorAll("button")[i] as HTMLElement).click();
    return true;
  }, cual);
  if (ok2) await quieta(page);
  return ok2;
}

/** Los controles visibles cuyo nombre (aria-label + texto, que incluye el sr-only) cumple `re`, marcados de a uno para medir su flecha:
 *  devuelve el sentido de cada uno (ver SENTIDO_DE_FLECHA). */
export async function flechas(page: any, re: string, dentro = "body"): Promise<{ nombre: string; sentido: string | null; ancho: number; alto: number }[]> {
  const n = await page.evaluate(([r, sel]: [string, string]) => {
    document.querySelectorAll("[data-crm04-cand]").forEach((e) => e.removeAttribute("data-crm04-cand"));
    const raiz = document.querySelector(sel) ?? document.body;
    const cs = [...raiz.querySelectorAll("button, a, [role=button]")].filter((e) => !e.closest("#admin-content > aside") && e.getBoundingClientRect().width > 0 && new RegExp(r, "i").test(`${e.getAttribute("aria-label") ?? ""} ${e.textContent ?? ""}`) && e.querySelector("svg"));
    cs.forEach((e, i) => e.setAttribute("data-crm04-cand", String(i)));
    return cs.length;
  }, [re, dentro]);
  const out: { nombre: string; sentido: string | null; ancho: number; alto: number }[] = [];
  for (let i = 0; i < n; i++) {
    const r = await page.evaluate((k: number) => {
      document.querySelectorAll("[data-crm04-flecha]").forEach((e) => e.removeAttribute("data-crm04-flecha"));
      const e = document.querySelector(`[data-crm04-cand="${k}"]`)!;
      e.setAttribute("data-crm04-flecha", "1");
      const q = e.getBoundingClientRect();
      return { nombre: `${e.getAttribute("aria-label") ?? ""} ${(e.textContent ?? "").trim()}`.trim().slice(0, 40), ancho: Math.round(q.width), alto: Math.round(q.height) };
    }, i);
    out.push({ ...r, sentido: await page.evaluate(SENTIDO_DE_FLECHA) });
  }
  return out;
}

/** Abre el menú del celular (el botón con aria-expanded del encabezado) y espera a que sus entradas estén a la vista. false si no hay. */
export async function abrirMenu(page: any): Promise<boolean> {
  // Con un clic de verdad (no element.click()): el botón queda con el foco, como cuando se toca (M1: el foco vuelve a él).
  const ok = await page.evaluate(() => {
    document.querySelectorAll("[data-crm04-menu]").forEach((e) => e.removeAttribute("data-crm04-menu"));
    const b = [...document.querySelectorAll("header button[aria-expanded], #admin-content button[aria-expanded]")].find((x) => x.getBoundingClientRect().width > 0 && !x.closest("#admin-content > aside") && !x.closest("main"));
    b?.setAttribute("data-crm04-menu", "1");
    return !!b;
  });
  if (!ok) return false;
  await page.locator("[data-crm04-menu]").click();
  await page.waitForFunction(() => { const b = document.querySelector("aside nav button"); if (!b) return false; const r = b.getBoundingClientRect(); return r.width > 0 && r.right > 0 && r.left < innerWidth; }, null, { timeout: 15000 }).catch(() => {});
  await quieta(page);
  return true;
}

/** Convierte los dígitos árabe-índicos y persas a los occidentales (I2: «٣ مواعيد» es «3 مواعيد»). */
export const digitos = (s: string) => s.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
