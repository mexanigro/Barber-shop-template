// CRM-03 · W1 (T, webs) · la demo de prueba redesplegada, de punta a punta, con el login de Liam (D-310). Sesión A (2026-10-15): test rojo.
//
// Lo corre B al cierre y la verificadora (`rojo-verde --orden crm-03` entero, inciso s); `--todas` no lo corre en HEAD (D-151).
// El login, cada vez (Liam: «No, login cada vez»): una ventana de Chromium CON VENTANA en /admin de la demo; el test espera, por
// condición y hasta 5 minutos, a que Liam inicie sesión con su Google; la sesión no se guarda en disco (pasa a la vista de 390 en
// memoria). Escribe en la demo sólo con `seed: "crm-03"` y deshace todo en `finally`; los datos `videos-01` no se tocan (pedido).
/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { DEMO, EMAIL_PRUEBA, SEMILLA, envDeH, existe, fuente, firestoreReal, vercel } from "./_comun.ts";
import { ANCHOS, PESTANAS_DUENA, medirPantalla, quieta, reservaPublica, tocar } from "./_crm.ts";

const REGISTRO = "tests/crm-03-demo.json";
/** La fecha local de Asia/Jerusalem `dias` días después de hoy (AAAA-MM-DD). */
function fechaIL(dias: number): string {
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
  const [a, m, d] = hoy.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

test("la demo de prueba redesplegada: tests/crm-03-demo.json registra su clientId, su deployment, el commit de T y el email de prueba; el deployment está READY con ese commit y su proyecto tiene CRON_SECRET; con la sesión de Liam, cada pestaña del CRM desplegado cumple V1 a 390 y a 1280; un recordatorio real a ese email sale de /api/cron/avisos, queda registrado como enviado con su id de Resend, Resend lo da por enviado o entregado y el registro de avisos del CRM lo muestra «נשלח»; y un día libre cargado en el CRM hace que la reserva pública no ofrezca ese día con esa persona y que POST /api/book lo rechace", async () => {
  assert.ok(existe(REGISTRO), `falta ${REGISTRO} (D-310): la demo de prueba todavía no se redesplegó con el CRM de esta orden`);
  const reg = JSON.parse(fuente(REGISTRO));
  assert.equal(reg.clientId, DEMO.clientId, "el registro es de la demo de prueba");
  assert.equal(reg.email, EMAIL_PRUEBA, "con el email de prueba de Liam");
  assert.match(String(reg.deployment), /^dpl_/, "con el id del deployment");
  assert.match(String(reg.commitT), /^[0-9a-f]{7,40}$/, "con el commit de T");

  const dep = await vercel(`/v13/deployments/${reg.deployment}`);
  assert.equal(dep.status, 200, `Vercel responde por el deployment ${reg.deployment}`);
  assert.equal(dep.json.readyState, "READY", "el deployment está READY");
  assert.equal(dep.json.projectId, DEMO.proyecto, "es del proyecto de la demo");
  assert.ok(String(dep.json.meta?.githubCommitSha ?? "").startsWith(reg.commitT), `con el commit de T del registro (${dep.json.meta?.githubCommitSha})`);
  const vars = await vercel(`/v9/projects/${DEMO.proyecto}/env`);
  assert.ok((vars.json.envs ?? []).some((e: any) => e.key === "CRON_SECRET"), "el proyecto de la demo tiene CRON_SECRET (D-300)");

  const env = envDeH();
  const secreto = createHmac("sha256", env.CRON_SECRET ?? "").update(DEMO.clientId).digest("hex");
  const db = await firestoreReal();
  const pw = "playwright";
  const { chromium } = await import(pw);
  const navegador = await chromium.launch({ headless: false, args: ["--disable-lcd-text", "--font-render-hinting=none"] });
  const deshacer: (() => Promise<unknown>)[] = [];
  const fallas: string[] = [];
  try {
    // El login de Liam, en una ventana.
    const esc = await navegador.newContext({ viewport: ANCHOS.escritorio, locale: "he-IL", timezoneId: "Asia/Jerusalem" });
    const p = await esc.newPage();
    await p.addInitScript("globalThis.__name = globalThis.__name || ((f) => f);");
    await p.goto(`${DEMO.url}/admin`, { waitUntil: "domcontentloaded" });
    console.log("W1 · esperando que Liam inicie sesión con su Google en la ventana de Chromium (hasta 5 minutos)…");
    await p.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => (b.textContent ?? "").trim() === "תורים"), null, { timeout: 5 * 60 * 1000 });
    const sesion = await esc.storageState({ indexedDB: true });
    const tel = await navegador.newContext({ viewport: ANCHOS.telefono, isMobile: true, hasTouch: true, locale: "he-IL", timezoneId: "Asia/Jerusalem", storageState: sesion });
    const pt = await tel.newPage();
    await pt.addInitScript("globalThis.__name = globalThis.__name || ((f) => f);");
    await pt.goto(`${DEMO.url}/admin`, { waitUntil: "domcontentloaded" });
    await pt.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => (b.textContent ?? "").trim() === "תורים"), null, { timeout: 60000 });

    // V1 sobre lo desplegado, a 390 y a 1280.
    for (const [vista, pg] of [["390", pt], ["1280", p]] as const) {
      for (const t of PESTANAS_DUENA) {
        await pg.evaluate((x: string) => { const b = [...document.querySelectorAll("button, a")].find((e) => (e.textContent ?? "").trim() === x) as HTMLElement | undefined; b?.click(); }, t);
        await quieta(pg);
        const m = await medirPantalla(pg);
        if (m.scrollAncho > m.ancho) fallas.push(`${vista} ${t} · scroll horizontal`);
        for (const k of ["fuera", "tapados", "letraChica", "contraste", "latin"] as const) if (m[k].length) fallas.push(`${vista} ${t} · ${k}: ${m[k].slice(0, 3).join("; ")}`);
      }
    }

    // Un recordatorio real.
    const cfg = (await db.collection("config").doc(DEMO.clientId).get()).data();
    const manana = fechaIL(1);
    const ref = db.collection("appointments").doc();
    await ref.set({ clientId: DEMO.clientId, customerName: "בדיקת CRM-03", customerEmail: reg.email, customerPhone: "050-000-0099", serviceId: cfg.services?.[0]?.id, staffId: cfg.staff?.[0]?.id, date: manana, time: "12:00", duration: 30, status: "confirmed", lang: "he", createdAt: new Date(), seed: SEMILLA });
    deshacer.push(() => ref.delete());
    const r = await fetch(`${DEMO.url}/api/cron/avisos?fecha=${manana}`, { headers: { Authorization: `Bearer ${secreto}` }, signal: AbortSignal.timeout(60000) });
    const cuerpo = await r.json().catch(() => ({}));
    if (r.status !== 200 || !(cuerpo.recordatorios ?? []).includes(ref.id)) fallas.push(`/api/cron/avisos?fecha=${manana} manda el recordatorio del turno de prueba (status ${r.status}: ${JSON.stringify(cuerpo)})`);
    const logs = await db.collection("notification_logs").where("clientId", "==", DEMO.clientId).where("refId", "==", ref.id).get();
    for (const d of logs.docs) deshacer.push(() => d.ref.delete());
    const log = logs.docs.map((d: any) => d.data()).find((l: any) => l.type === "reminder");
    if (!log || log.status !== "sent" || !log.providerMessageId) fallas.push(`queda registrado como reminder enviado con su id de Resend (${JSON.stringify(log)})`);
    else {
      const rs = await fetch(`https://api.resend.com/emails/${log.providerMessageId}`, { headers: { Authorization: `Bearer ${env.RESEND_API_KEY || env.EMAIL_PROVIDER_API_KEY}` }, signal: AbortSignal.timeout(20000) });
      const em = await rs.json().catch(() => ({}));
      if (!["sent", "delivered"].includes(em.last_event)) fallas.push(`Resend lo da por enviado o entregado (last_event: ${em.last_event})`);
      await p.evaluate(() => { const b = [...document.querySelectorAll("button, a")].find((e) => (e.textContent ?? "").trim() === "יומן מייל") as HTMLElement | undefined; b?.click(); });
      await p.waitForFunction((correo: string) => document.body.innerText.includes(correo), reg.email, { timeout: 30000 }).catch(() => {});
      const fila = await p.evaluate((correo: string) => { const h = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && (e.textContent ?? "").trim() === correo); let f: HTMLElement | null = null; for (let q = h?.parentElement; q && q !== document.body; q = q.parentElement) { if (((q as HTMLElement).innerText.match(/@/g) ?? []).length > 1) break; f = q as HTMLElement; } return f?.innerText ?? ""; }, reg.email);
      if (!fila.includes("נשלח") || !fila.includes("תזכורת")) fallas.push(`el registro de avisos del CRM lo muestra «תזכורת» «נשלח» (fila: ${fila.replace(/\s+/g, " ")})`);
    }

    // El horario: un día libre cargado en el CRM, con la sesión de Liam.
    const persona = cfg.staff?.find((s: any) => s.name === "עדי") ?? cfg.staff?.[cfg.staff.length - 1];
    let dia = fechaIL(3);
    for (let i = 3; i < 14; i++) { const f = fechaIL(i); const dow = new Date(`${f}T12:00:00Z`).getUTCDay(); const key = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][dow]; if (persona.schedule?.[key]?.isOpen && !persona.dateOverrides?.[f]) { dia = f; break; } }
    const ovRef = db.collection("staff_overrides").doc(`${DEMO.clientId}_${persona.id}`);
    const ovAntes = await ovRef.get();
    const cfgRef = db.collection("config").doc(DEMO.clientId);
    deshacer.push(async () => { if (ovAntes.exists) await ovRef.set(ovAntes.data()); else await ovRef.delete(); await cfgRef.update({ staff: cfg.staff }); });
    await p.evaluate(() => { const b = [...document.querySelectorAll("button, a")].find((e) => (e.textContent ?? "").trim() === "צוות") as HTMLElement | undefined; b?.click(); });
    await quieta(p);
    await tocar(p, persona.name);
    const [a, m] = dia.split("-").map(Number);
    const mes = new Intl.DateTimeFormat("he-IL", { month: "long" }).format(new Date(a, m - 1, 1));
    for (let i = 0; i < 3 && !(await p.evaluate((nm: string) => document.body.innerText.includes(nm), mes)); i++) await p.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /next|הבא/i.test(x.getAttribute("aria-label") ?? "")) as HTMLElement | undefined; b?.click(); });
    const ok = (await tocar(p, String(Number(dia.slice(8))))) && (await tocar(p, "יום חופש")) && (await tocar(p, "שמירת לוח זמנים"));
    if (!ok) fallas.push(`en el CRM, un día libre para ${persona.name} el ${dia} (el día, «יום חופש» y «שמירת לוח זמנים»)`);
    else {
      await p.waitForFunction(() => [...document.querySelectorAll("[role=status]")].some((x) => (x.textContent ?? "").includes("נשמר")), null, { timeout: 30000 }).catch(() => {});
      const pub = await navegador.newContext({ viewport: ANCHOS.telefono, locale: "he-IL", timezoneId: "Asia/Jerusalem" });
      const pp = await pub.newPage();
      await pp.addInitScript("globalThis.__name = globalThis.__name || ((f) => f);");
      const rsv = await reservaPublica(pp, DEMO.url, persona.name, dia);
      if (!rsv.cerrado || rsv.horas.length) fallas.push(`la reserva pública no ofrece el ${dia} con ${persona.name} (${JSON.stringify(rsv)})`);
      await pub.close();
      const book = await fetch(`${DEMO.url}/api/book`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerName: "בדיקת CRM-03", customerEmail: reg.email, customerPhone: "0500000099", serviceId: cfg.services?.[0]?.id, staffId: persona.id, date: dia, time: "10:00", duration: 30, lang: "he" }), signal: AbortSignal.timeout(30000) });
      if (book.status < 400) {
        fallas.push(`POST /api/book rechaza el ${dia} con ${persona.name} (hoy ${book.status})`);
        const creados = await db.collection("appointments").where("clientId", "==", DEMO.clientId).where("customerEmail", "==", reg.email).where("date", "==", dia).get();
        for (const d of creados.docs) deshacer.push(() => d.ref.delete());
      }
    }
  } finally {
    for (const f of deshacer.reverse()) await f().catch((e: unknown) => fallas.push(`no se pudo deshacer: ${String(e)}`));
    await navegador.close().catch(() => {});
  }
  assert.deepEqual(fallas, [], `la demo de prueba, de punta a punta:\n${fallas.join("\n")}`);
});
