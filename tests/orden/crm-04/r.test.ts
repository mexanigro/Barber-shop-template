// CRM-04 · R1–R5 (T) · la reserva, el horario, la primera carga y el oscuro (D-345, D-346; REV 9, 13 y 14). Sesión A (2026-10-20).
// R6 (el gráfico de ingresos) salió de la orden: D-353 (Liam, 2026-10-20), no se reproduce en el DOM.
//
// Medido en T 47b53a6: `POST /api/book` acepta «2026-02-31», «09:07» y el pasado (`booking-validation.ts:24-39`, sólo forma); el CRM no
// copia a `config.staff` el horario de una persona del preset (`agenda.ts:51-55`) y la reserva sigue con el del preset; la rama
// `contact` de `sendNotification` en `api/index.ts` no escapa lo del visitante; la primera lectura de Firestore tiene 1,5 s y después
// el aviso «לא ניתן לאמת…» (con «טעינה מחדש»); el oscuro del panel se pierde al recargar con `themeToggle` en false.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CLIENTE, conCrm, conModulos, quieta, salon, tocar } from "./_crm.ts";
import { dbMemoria, fuente } from "./_comun.ts";

function res() {
  const r: any = { code: 200, cuerpo: undefined as any };
  r.status = (c: number) => { r.code = c; return r; };
  r.json = (b: any) => { r.cuerpo = b; return r; };
  r.send = (b: any) => { r.cuerpo = b; return r; };
  r.setHeader = () => r; r.set = () => r; r.end = () => r;
  return r;
}
/** Un domingo futuro (a más de 60 días del reloj real: la reserva compara con el reloj real). */
function domingoFuturo(): string {
  const d = new Date(Date.now() + 60 * 864e5);
  while (d.getUTCDay() !== 0) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
const FV: Record<string, (...x: any[]) => any> = { serverTimestamp: () => new Date(), increment: (n: number) => n, delete: () => undefined, arrayUnion: (...x: any[]) => x };
/** POST /api/book con `createBookingHandler` sobre un Firestore en memoria; devuelve el estado, el cuerpo y si escribió un turno. */
async function reservar(bh: any, config: any, cuerpo: Record<string, any>) {
  const mem = dbMemoria({ [`config/c1`]: config, [`clients/c1`]: { status: "active" } });
  const h = bh.createBookingHandler({ clientId: "c1", idiomaBase: "he", loadContext: async () => ({ db: mem.db, FieldValue: FV }) });
  const r = res();
  try { await h({ body: cuerpo, headers: {}, query: {}, ip: "127.0.0.1" }, r); } catch (e) { r.code = -1; r.cuerpo = String((e as Error).message); }
  return { code: r.code, cuerpo: r.cuerpo, escribio: mem.escritas.some((e) => e.ruta.startsWith("appointments/")) };
}

test("POST /api/book responde 4xx sin escribir con la fecha «2026-02-31», con la hora «09:07» en un servicio de grilla de media hora y con una fecha y hora pasadas", async () => {
  const fallas: string[] = [];
  await conModulos(async (cargar) => {
    const bh = await cargar("src/lib/api/booking-handler.ts");
    if (typeof bh?.createBookingHandler !== "function") { fallas.push("src/lib/api/booking-handler.ts exporta createBookingHandler"); return; }
    const dia = { isOpen: true, hours: { start: "09:00", end: "18:00" }, breaks: [] as any[] };
    const schedule = Object.fromEntries(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map((d) => [d, dia]));
    // Un servicio de 30 min: la grilla del día es 09:00, 09:30, 10:00…
    const config = { services: [{ id: "corte", name: "תספורת", price: 100, duration: 30 }], staff: [{ id: "noa", name: "נועה", schedule }] };
    const base = { customerName: "נועה", customerEmail: "n@example.com", customerPhone: "0500000000", serviceId: "corte", staffId: "noa", duration: 30, lang: "he" };
    const domingo = domingoFuturo();
    const ok = await reservar(bh, config, { ...base, date: domingo, time: "10:00" });
    if (ok.code !== 200 || !ok.escribio) fallas.push(`control: un turno válido (${domingo} 10:00) se acepta y se escribe (hoy ${ok.code} ${JSON.stringify(ok.cuerpo)})`);
    for (const [que, x] of [["la fecha «2026-02-31»", { date: "2026-02-31", time: "10:00" }], [`la hora «09:07» (${domingo})`, { date: domingo, time: "09:07" }], ["una fecha y hora pasadas (2020-01-05 10:00)", { date: "2020-01-05", time: "10:00" }]] as const) {
      const r = await reservar(bh, config, { ...base, ...x });
      if (r.code < 400 || r.code >= 500 || r.escribio) fallas.push(`con ${que} responde 4xx sin escribir (hoy ${r.code}${r.escribio ? ", y escribió el turno" : ""})`);
    }
  });
  assert.deepEqual(fallas, [], `R1 · la reserva rechaza lo imposible:\n${fallas.join("\n")}`);
});

test("guardar en el CRM el horario de una persona que no está en config.staff la agrega ahí con ese horario, y la reserva lo aplica", async () => {
  const fallas: string[] = [];
  // El salón sin `staff` en el config: el CRM muestra el equipo del preset.
  const datos = salon();
  delete datos[`config/${CLIENTE}`].staff;
  let config: any = null, persona: any = null;
  await conCrm(async (crm) => {
    try {
      const a = await crm.abrir({ vista: "telefono", datos });
      try {
        persona = await a.page.evaluate(async () => { const ruta = "/src/config/site.ts"; const { siteConfig } = await import(ruta); const p = siteConfig.staff?.[0]; return p ? { id: p.id, name: p.name } : null; });
        if (!persona) { fallas.push("el CRM muestra el equipo del preset cuando config no tiene staff"); return; }
        await a.irA("personnel");
        await tocar(a.page, persona.name.split(" ")[0]);
        // El domingo de esa persona, de 12:00.
        const marcado = await a.page.evaluate(() => {
          const et = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && (e.textContent || "").trim() === "יום ראשון" && e.getBoundingClientRect().width > 0);
          for (let p = et && et.parentElement; p; p = p.parentElement) { const ins = p.querySelectorAll("input[type=time]"); if (ins.length >= 2) { ins[0].setAttribute("data-crm04-hora", "1"); return true; } }
          return false;
        });
        if (!marcado) { fallas.push("el editor de horarios muestra la hora de inicio del domingo"); return; }
        await a.page.locator("[data-crm04-hora]").fill("12:00");
        if (!(await tocar(a.page, "שמירת לוח זמנים"))) { fallas.push("el editor tiene «שמירת לוח זמנים»"); return; }
        await a.page.waitForFunction(() => ((globalThis as any).__CRM03.escrituras as any[]).some((e) => e.ruta?.startsWith("staff_overrides/")), null, { timeout: 15000 }).catch(() => {});
        await quieta(a.page);
        config = await a.documento(`config/${CLIENTE}`);
        const esta = (config?.staff ?? []).find((s: any) => s.id === persona.id);
        if (!esta) fallas.push(`guardar agrega a ${persona.name} a config.staff (config.staff: ${JSON.stringify((config?.staff ?? []).map((s: any) => s.id))})`);
        else if (esta.schedule?.sunday?.hours?.start !== "12:00") fallas.push(`con el horario guardado (domingo desde ${esta.schedule?.sunday?.hours?.start})`);
      } finally { await a.cerrar(); }
    } catch (e) { fallas.push(`el CRM: ${(e as Error).message.split("\n")[0]}`); }
  });
  if (config && persona) {
    await conModulos(async (cargar) => {
      const bh = await cargar("src/lib/api/booking-handler.ts");
      const svc = (config.services ?? [])[0];
      const base = { customerName: "נועה", customerEmail: "n@example.com", customerPhone: "0500000000", serviceId: svc?.id, staffId: persona.id, duration: svc?.duration ?? 60, lang: "he", date: domingoFuturo() };
      const temprano = await reservar(bh, config, { ...base, time: "10:00" });
      if (temprano.code < 400 || temprano.escribio) fallas.push(`la reserva aplica el horario guardado: el domingo a las 10:00 se rechaza (hoy ${temprano.code})`);
      // 15:00 cae en la grilla desde las 12:00 y, con el primer servicio del salón (cut, 90 min), termina antes de las 20:00 sin pisar la pausa de 14:00 a 14:30 de la persona.
      const dentro = await reservar(bh, config, { ...base, time: "15:00" });
      if (dentro.code !== 200) fallas.push(`la reserva aplica el horario guardado: el domingo a las 15:00 se acepta (hoy ${dentro.code} ${JSON.stringify(dentro.cuerpo)})`);
    });
  }
  assert.deepEqual(fallas, [], `R2 · el horario de una persona del preset:\n${fallas.join("\n")}`);
});

test("la rama contact de sendNotification en api/index.ts escapa name, email, subject y message: un name «<a href=\"https://x\">Ver</a>» llega como texto", async () => {
  const fallas: string[] = [];
  const tsPkg = "typescript";
  const ts: any = (await import(tsPkg)).default;
  const texto = fuente("api/index.ts");
  const sf = ts.createSourceFile("api/index.ts", texto, ts.ScriptTarget.Latest, true);
  let fn: any = null;
  const buscar = (n: any) => { if (!fn && ((ts.isFunctionDeclaration(n) && n.name?.text === "sendNotification") || (ts.isVariableDeclaration(n) && n.name?.getText(sf) === "sendNotification"))) fn = n; ts.forEachChild(n, buscar); };
  buscar(sf);
  if (!fn) fallas.push("api/index.ts tiene sendNotification");
  else {
    // Las plantillas del aviso de contacto: las que usan data.name o data.message.
    const plantillas: any[] = [];
    const juntar = (n: any) => { if (ts.isTemplateExpression(n) && /data\.(name|message)/.test(n.getText(sf))) plantillas.push(n); ts.forEachChild(n, juntar); };
    juntar(fn);
    if (!plantillas.length) fallas.push("sendNotification arma el aviso de contacto con data.name y data.message");
    // Las funciones que llaman las plantillas, con su implementación: del mismo archivo o del módulo de donde se importan.
    const impl: Record<string, any> = {};
    const nombres = new Set<string>();
    for (const p of plantillas) { const ver = (n: any) => { if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) nombres.add(n.expression.text); ts.forEachChild(n, ver); }; ver(p); }
    await conModulos(async (cargar) => {
      for (const nombre of nombres) {
        let decl: any = null, origen: string | null = null;
        const ver = (n: any) => {
          if ((ts.isFunctionDeclaration(n) && n.name?.text === nombre) || (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === nombre && n.initializer)) decl = decl ?? n;
          if (ts.isImportDeclaration(n) && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings) && n.importClause.namedBindings.elements.some((e: any) => e.name.text === nombre)) origen = n.moduleSpecifier.text;
          ts.forEachChild(n, ver);
        };
        ver(sf);
        try {
          if (origen) { const m = await cargar(String(origen).replace(/^\.\.\//, "").replace(/\.js$/, ".ts")); impl[nombre] = m?.[nombre]; }
          else if (decl) { const js = ts.transpile(ts.isFunctionDeclaration(decl) ? decl.getText(sf) + `\nreturn ${nombre};` : `const ${decl.getText(sf)};\nreturn ${nombre};`, { target: ts.ScriptTarget.ES2022 }); impl[nombre] = new Function(js)(); }
        } catch { /* sin implementación: la evaluación de abajo lo dice */ }
      }
    });
    const data = { name: '<a href="https://x">Ver</a>', email: 'x@example.com"><b>', subject: "<b>asunto</b>", message: "<img src=x onerror=alert(1)>hola", phone: "050", details: {} };
    for (const p of plantillas) {
      let html = "";
      try {
        const nombresImpl = Object.keys(impl);
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        html = new Function("data", ...nombresImpl, `return ${p.getText(sf)};`)(data, ...nombresImpl.map((k) => impl[k]));
      } catch (e) { fallas.push(`no se pudo armar el aviso de contacto con un visitante de prueba: ${(e as Error).message}`); continue; }
      if (/<a href="https:\/\/x">/.test(html)) fallas.push("el name «<a href=\"https://x\">Ver</a>» llega como texto (llega como enlace)");
      if (/<b>asunto<\/b>|<b>/.test(html.replace(/<b[^>]*style[^>]*>/g, ""))) fallas.push("el subject y el email llegan como texto (llega <b>)");
      if (/<img src=x/.test(html)) fallas.push("el message llega como texto (llega <img>)");
      if (!/&lt;a href=/.test(html)) fallas.push("el name llega escapado («&lt;a href=…»)");
    }
  }
  assert.deepEqual([...new Set(fallas)], [], `R3 · el contacto escapado en api/index.ts:\n${[...new Set(fallas)].join("\n")}`);
});

const AVISO = "לא ניתן לאמת כרגע את זמינות השירות";
/** Registra en la página cuándo aparece el aviso de servicio no disponible (performance.now(), ms desde la navegación). */
const GRABAR_AVISO = `(() => {
  const w = globalThis; w.__aviso = null;
  const mirar = () => { if (w.__aviso === null && document.body && document.body.innerText.includes(${JSON.stringify(AVISO)})) w.__aviso = performance.now(); };
  new MutationObserver(mirar).observe(document, { subtree: true, childList: true, characterData: true });
})();`;

test("con la primera lectura de Firestore tardando 2,5 s, la web y /admin no muestran «לא ניתן לאמת כרגע את זמינות השירות» y terminan con su contenido; con la lectura sin responder, el aviso aparece recién a los 8 s, con «ניסיון נוסף»; un tenant apagado se sigue mostrando apagado", async () => {
  const fallas: string[] = [];
  const lentas = { demora: { [`clients/${CLIENTE}`]: 2500, [`config/${CLIENTE}`]: 2500 } };
  await conCrm(async (crm) => {
    // 2,5 s: /admin y la web terminan con su contenido, sin el aviso.
    for (const [ruta, contenido] of [["/admin", "aside nav button"], ["/", "#hero, main h1"]] as const) {
      try {
        const a = await crm.abrir({ vista: "telefono", ruta, estado: lentas, init: GRABAR_AVISO, esperar: "nada" });
        try {
          const llego = await a.page.waitForFunction((sel: string) => !!document.querySelector(sel) || (globalThis as any).__aviso !== null, contenido, { timeout: 60000 }).then(() => true, () => false);
          const aviso = await a.page.evaluate(() => (globalThis as any).__aviso);
          if (aviso !== null) fallas.push(`${ruta} · con la lectura en 2,5 s no aparece «${AVISO}» (apareció a los ${Math.round(aviso)} ms)`);
          else if (!llego) fallas.push(`${ruta} · con la lectura en 2,5 s termina con su contenido (${contenido})`);
        } finally { await a.cerrar(); }
      } catch (e) { fallas.push(`${ruta} · ${(e as Error).message.split("\n")[0]}`); }
    }
    // Sin respuesta: el aviso recién a los 8 s, con «ניסיון נוסף».
    try {
      const a = await crm.abrir({ vista: "telefono", estado: { demora: { [`clients/${CLIENTE}`]: "nunca", [`config/${CLIENTE}`]: "nunca" } }, init: GRABAR_AVISO, esperar: "nada" });
      try {
        await a.page.waitForFunction(() => (globalThis as any).__aviso !== null, null, { timeout: 30000 }).catch(() => {});
        // Desde que empezó la primera lectura (el doble lo anota), no desde la navegación: en frío Vite tarda en servir los módulos.
        const { aviso, inicio } = await a.page.evaluate(() => ({ aviso: (globalThis as any).__aviso, inicio: (globalThis as any).__CRM03?.inicioLectura ?? 0 }));
        if (aviso === null) fallas.push("con la lectura sin responder aparece el aviso");
        else if (aviso - inicio < 7500) fallas.push(`con la lectura sin responder el aviso aparece recién a los 8 s (apareció a los ${Math.round(aviso - inicio)} ms de empezar la lectura)`);
        const boton = await a.page.evaluate(() => [...document.querySelectorAll("button")].some((b) => (b.textContent ?? "").trim() === "ניסיון נוסף" && b.getBoundingClientRect().width > 0));
        if (!boton) fallas.push("el aviso trae «ניסיון נוסף»");
      } finally { await a.cerrar(); }
    } catch (e) { fallas.push(`sin respuesta · ${(e as Error).message.split("\n")[0]}`); }
    // Apagado (kill-switch) con la lectura en 2,5 s: se muestra apagado.
    try {
      const datos = salon();
      datos[`clients/${CLIENTE}`] = { status: "suspended" };
      const a = await crm.abrir({ vista: "telefono", ruta: "/", datos, estado: lentas, init: GRABAR_AVISO, esperar: "nada" });
      try {
        const apagado = await a.page.waitForFunction(() => document.body.innerText.includes("השירות אינו זמין זמנית") || (globalThis as any).__aviso !== null, null, { timeout: 30000 }).then(() => true, () => false);
        const aviso = await a.page.evaluate(() => (globalThis as any).__aviso);
        if (aviso !== null || !apagado || !(await a.page.evaluate(() => document.body.innerText.includes("השירות אינו זמין זמנית")))) fallas.push(`un tenant apagado se muestra apagado («השירות אינו זמין זמנית»)${aviso !== null ? `; apareció «${AVISO}» a los ${Math.round(aviso)} ms` : ""}`);
      } finally { await a.cerrar(); }
    } catch (e) { fallas.push(`apagado · ${(e as Error).message.split("\n")[0]}`); }
  });
  assert.deepEqual(fallas, [], `R4 · la primera carga:\n${fallas.join("\n")}`);
});

test("el oscuro elegido en el panel sigue oscuro al recargar /admin con features.themeToggle en false, y la web pública sigue en el modo del nicho", async () => {
  const fallas: string[] = [];
  const datos = salon();
  const cfg = datos[`config/${CLIENTE}`];
  cfg.features = { ...(cfg.features ?? {}), themeToggle: false };
  await conCrm(async (crm) => {
    try {
      const a = await crm.abrir({ vista: "escritorio", datos });
      try {
        const oscuro = await a.page.evaluate(async () => {
          (document.querySelector('aside button[aria-label="החלפת ערכת צבעים"]') as HTMLElement | null)?.click();
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          return document.documentElement.classList.contains("dark");
        });
        if (!oscuro) { fallas.push("el panel pasa a oscuro con «החלפת ערכת צבעים»"); return; }
        await a.page.reload({ waitUntil: "domcontentloaded" });
        await a.page.waitForFunction(() => document.querySelectorAll("aside nav button").length >= 3, null, { timeout: 60000 });
        await quieta(a.page);
        if (!(await a.page.evaluate(() => document.documentElement.classList.contains("dark")))) fallas.push("después de recargar /admin el panel sigue oscuro");
        await a.page.goto(crm.base + "/", { waitUntil: "domcontentloaded" });
        await a.page.waitForFunction(() => !!document.querySelector("#hero, main h1"), null, { timeout: 60000 }).catch(() => {});
        if (await a.page.evaluate(() => document.documentElement.classList.contains("dark"))) fallas.push("la web pública sigue en el modo del nicho (claro, el de la plantilla A)");
      } finally { await a.cerrar(); }
    } catch (e) { fallas.push((e as Error).message.split("\n")[0]); }
  });
  assert.deepEqual(fallas, [], `R5 · el oscuro del panel:\n${fallas.join("\n")}`);
});

