// CRM-03 · K1–K4 (T) · Clientes y Tareas, Inventario, Mensajes y el Registro de avisos. Sesión A (2026-10-15): tests rojos.
//
// Medido (D-308): la fila de etapas se corta a 390 y la cuarta columna a 1280; los orígenes en inglés; − y + del inventario de 28 px
// y sin nombre; «שלח מה-CRM» en un mensaje de whatsapp (una cola que sólo lee el agente); el Registro como tabla que se sale a 390,
// «BOOKING», y la hora de un aviso de reserva (createdAt de texto) es la de ahora. Cada test vigila además lo que dejó CRM-02.
import { test } from "node:test";
import assert from "node:assert/strict";
import { campo, conCrm, medirPantalla, quieta, tocar, CLIENTE, salon } from "./_crm.ts";

const ETAPAS = ["לידים", "נוצר קשר", "מתוזמן", "הומר"];

test("Clientes: a 390, el selector de etapas muestra las cuatro etapas enteras y debajo sólo las clientas de la elegida, sin scroll horizontal; a 1280, las cuatro columnas enteras a la vista; los orígenes en hebreo; y, como dejó CRM-02, ninguna clienta muestra un email @noemail.local y en Tareas la clienta vinculada se elige de una lista", async () => {
  const fallas: string[] = [];
  await conCrm(async (crm) => {
    const tel = await crm.abrir({ vista: "telefono" });
    try {
      await tel.ir("לקוחות");
      const sel = await tel.page.evaluate((etapas: string[]) => {
        const tl = [...document.querySelectorAll("[role=tablist]")].find((x) => etapas.every((e) => (x.textContent ?? "").includes(e)));
        if (!tl) return null;
        const tabs = [...tl.querySelectorAll("[role=tab]")];
        const fuera = tabs.filter((t) => { const r = t.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth; }).map((t) => (t.textContent ?? "").trim());
        return { tabs: tabs.length, fuera };
      }, ETAPAS);
      if (!sel) fallas.push("390: un selector de etapas (role=tablist) con לידים, נוצר קשר, מתוזמן y הומר");
      else {
        if (sel.tabs !== 4 || sel.fuera.length) fallas.push(`390: las cuatro etapas enteras a la vista (pestañas ${sel.tabs}; cortadas: ${sel.fuera.join(", ")})`);
        await tel.page.evaluate(() => { const t = [...document.querySelectorAll("[role=tab]")].find((x) => (x.textContent ?? "").includes("נוצר קשר")) as HTMLElement | undefined; t?.click(); });
        await quieta(tel.page);
        const nombres = await tel.page.evaluate(() => ["גלית", "ליאת", "רוני", "מיכל"].filter((n) => [...document.querySelectorAll("*")].some((e) => e.children.length === 0 && (e.textContent ?? "").trim() === n && e.getBoundingClientRect().width > 0)));
        if (nombres.join() !== "ליאת") fallas.push(`390: con «נוצר קשר» elegida se ven sólo sus clientas (ליאת); hoy: ${nombres.join(", ")}`);
      }
      const m = await medirPantalla(tel.page);
      if (m.scrollAncho > m.ancho || m.fuera.length) fallas.push(`390: sin scroll horizontal ni nada cortado (${m.fuera.slice(0, 3).join("; ")})`);
    } finally { await tel.cerrar(); }

    const esc = await crm.abrir({ vista: "escritorio" });
    try {
      await esc.ir("לקוחות");
      const vista = await esc.page.evaluate(() => {
        const vis = (e: Element) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.left >= 0 && r.right <= innerWidth; };
        const nombres = ["גלית", "ליאת", "רוני", "מיכל"].map((n) => ({ n, ok: [...document.querySelectorAll("*")].some((e) => e.children.length === 0 && (e.textContent ?? "").trim() === n && vis(e)) }));
        const texto = document.body.innerText;
        return { cortadas: nombres.filter((x) => !x.ok).map((x) => x.n), noemail: texto.includes("@noemail.local"), origenes: (texto.match(/\b(walkin|web|whatsapp|booking|manual|instagram|google|referral)\b/gi) ?? []) };
      });
      if (vista.cortadas.length) fallas.push(`1280: las cuatro columnas enteras a la vista (cortadas o fuera: ${vista.cortadas.join(", ")})`);
      if (vista.origenes.length) fallas.push(`los orígenes en hebreo (hoy: ${[...new Set(vista.origenes)].join(", ")})`);
      if (vista.noemail) fallas.push("CRM-02: ninguna clienta muestra un email @noemail.local");
      await esc.ir("משימות");
      if (!(await tocar(esc.page, "משימה חדשה"))) fallas.push("Tareas tiene «משימה חדשה»");
      else {
        const lista = await esc.page.evaluate(() => [...document.querySelectorAll("select")].some((s) => [...s.options].some((o) => o.textContent?.trim() === "גלית")));
        if (!lista) fallas.push("CRM-02: en Tareas la clienta vinculada se elige de una lista (un selector con sus nombres)");
      }
    } finally { await esc.cerrar(); }
  });
  assert.deepEqual(fallas, [], `Clientes y Tareas:\n${fallas.join("\n")}`);
});

test("Inventario: a 390 los botones de sumar y descontar miden 44 × 44; y, como dejó CRM-02, descontar sin escribir un motivo guarda el movimiento sin ningún campo indefinido, y el primer producto de un negocio sin productos se guarda en stock_items con su clientId", async () => {
  await conCrm(async (crm) => {
    const a = await crm.abrir({ vista: "telefono" });
    try {
      await a.ir("מלאי");
      const botones = await a.page.evaluate(() => [...document.querySelectorAll("button")].filter((b) => ["הפחת", "הוסף"].includes((b.getAttribute("aria-label") ?? "").trim()) && b.getBoundingClientRect().width > 0).map((b) => { const r = b.getBoundingClientRect(); return `${b.getAttribute("aria-label")} ${Math.round(r.width)}×${Math.round(r.height)}`; }));
      assert.ok(botones.length >= 4, `cada producto tiene «הפחת» y «הוסף» con nombre accesible (hoy ${botones.length})`);
      const chicos = (botones as string[]).filter((b: string) => { const [w, h] = b.split(" ")[1].split("×").map(Number); return w < 44 || h < 44; });
      assert.deepEqual(chicos, [], "a 390 «הפחת» y «הוסף» miden 44 × 44");
      // CRM-02: descontar sin motivo.
      await a.page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.getAttribute("aria-label") === "הפחת") as HTMLElement; b.click(); });
      await quieta(a.page);
      assert.ok(await tocar(a.page, "הפחת", "[role=dialog]"), "el diálogo de descontar confirma con «הפחת»");
      await a.page.waitForFunction(() => ((globalThis as any).__CRM03.escrituras as any[]).some((e) => /stock_movements|movements/.test(e.ruta)), null, { timeout: 15000 });
      const mov = (await a.escrituras()).find((e) => /stock_movements|movements/.test(e.ruta));
      assert.ok(mov && !Object.values(mov.datos ?? {}).includes(undefined), "CRM-02: el movimiento se guarda sin ningún campo indefinido");
    } finally { await a.cerrar(); }
    // CRM-02: el primer producto de un negocio sin productos.
    const datos = salon();
    for (const k of Object.keys(datos)) if (k.startsWith("stock_items/")) delete datos[k];
    const b = await crm.abrir({ vista: "telefono", datos });
    try {
      await b.ir("מלאי");
      assert.ok(await tocar(b.page, "הוסף מוצר"), "Inventario tiene «הוסף מוצר»");
      const nombre = await campo(b.page, "שם", "[role=dialog]");
      assert.ok(nombre, "el diálogo de un producto nuevo tiene «שם»");
      await nombre.fill("מסכה");
      assert.ok(await tocar(b.page, "שמור", "[role=dialog]"), "el diálogo guarda con «שמור»");
      await b.page.waitForFunction(() => ((globalThis as any).__CRM03.escrituras as any[]).some((e) => e.op === "add" || e.op === "set"), null, { timeout: 15000 });
      const alta = (await b.escrituras()).find((e) => (e.op === "add" || e.op === "set") && e.datos?.name === "מסכה");
      assert.ok(alta && alta.ruta.startsWith("stock_items/") && alta.datos.clientId === CLIENTE, `CRM-02: el primer producto va a stock_items con su clientId (hoy: ${alta?.ruta})`);
    } finally { await b.cerrar(); }
  });
});

test("Mensajes sin WhatsApp ni IA: sin agente, ningún mensaje ofrece enviar desde el CRM ni pausar al agente, y un mensaje con teléfono ofrece su enlace wa.me con ese número; el menú no tiene «ידע» y /admin no monta un chat de IA; y, como dejó CRM-02, no aparece el aviso de pausa de WhatsApp", async () => {
  const fallas: string[] = [];
  await conCrm(async (crm) => {
    const a = await crm.abrir({ vista: "telefono" });
    try {
      await a.ir("תיבת דואר");
      for (const [n, tel] of [["אור", "500000002"], ["רוני", "500000003"]] as const) {
        const abierto = await a.page.evaluate((nombre: string) => { const e = [...document.querySelectorAll("*")].find((x) => x.children.length === 0 && (x.textContent ?? "").trim() === nombre && x.getBoundingClientRect().width > 0) as HTMLElement | undefined; (e?.closest("button, [role=button], li, a") as HTMLElement | null ?? e)?.click(); return !!e; }, n);
        if (!abierto) { fallas.push(`la lista tiene el mensaje de ${n}`); continue; }
        await quieta(a.page);
        const r = await a.page.evaluate((num: string) => {
          const vis = (e: Element) => e.getBoundingClientRect().width > 0;
          const texto = document.body.innerText;
          return { cola: [...document.querySelectorAll("button")].some((b) => vis(b) && (b.textContent ?? "").includes("שלח מה-CRM")), pausa: /השהה סוכן|סוכן WhatsApp/.test(texto), wame: [...document.querySelectorAll("a[href*='wa.me/']")].some((x) => vis(x) && (x.getAttribute("href") ?? "").replace(/\D/g, "").includes(num)) };
        }, tel);
        if (r.cola) fallas.push(`${n}: no ofrece «שלח מה-CRM» (la cola del agente)`);
        if (r.pausa) fallas.push(`${n}: CRM-02: no aparece la pausa del agente de WhatsApp`);
        if (!r.wame) fallas.push(`${n}: ofrece su enlace wa.me con su número (…${tel})`);
      }
      const ia = await a.page.evaluate(() => ({ conocimiento: [...document.querySelectorAll("button, a")].some((b) => (b.textContent ?? "").trim() === "ידע"), chat: !!document.querySelector('[aria-label="פתיחת עוזר צאט"]') }));
      if (ia.conocimiento) fallas.push("el menú no tiene «ידע»");
      if (ia.chat) fallas.push("/admin no monta el chat de IA");
    } finally { await a.cerrar(); }
  });
  assert.deepEqual(fallas, [], `Mensajes:\n${fallas.join("\n")}`);
});

test("el registro de avisos: a 390 se lee como lista, sin nada fuera de la pantalla; cada tipo y cada estado en hebreo —ningún «BOOKING»—; un aviso de reserva guardado con su fecha como texto muestra su hora y no la de ahora; y un aviso en cola dice en hebreo que no salió", async () => {
  const fallas: string[] = [];
  await conCrm(async (crm) => {
    const a = await crm.abrir({ vista: "telefono" });
    try {
      await a.ir("יומן מייל");
      const m = await medirPantalla(a.page);
      const r = await a.page.evaluate(() => {
        const vis = (e: Element) => e.getBoundingClientRect().width > 0;
        const fila = (correo: string) => { const h = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && (e.textContent ?? "").trim() === correo && vis(e)); let fila: HTMLElement | null = null; for (let p = h?.parentElement; p && p !== document.body; p = p.parentElement) { if (((p as HTMLElement).innerText.match(/@/g) ?? []).length > 1) break; fila = p as HTMLElement; } return fila ? fila.innerText.replace(/\s+/g, " ") : null; };
        return { tabla: [...document.querySelectorAll("table")].some(vis), reserva: fila("t1@example.com"), cola: fila("t4@example.com"), latin: (document.body.innerText.match(/\b(booking|reminder|contact|marketing|sent|failed|queued)\b/gi) ?? []) };
      });
      if (r.tabla) fallas.push("a 390 se lee como lista, no como tabla");
      if (m.fuera.length || m.scrollAncho > m.ancho) fallas.push(`a 390 nada fuera de la pantalla (${m.fuera.slice(0, 3).join("; ")})`);
      if (r.latin.length) fallas.push(`cada tipo y cada estado en hebreo (hoy: ${[...new Set(r.latin)].join(", ")})`);
      if (!r.reserva || !r.reserva.includes("12:01") || r.reserva.includes("10:00")) fallas.push(`el aviso de reserva de t1 (createdAt «2026-10-10T09:01:00.000Z») muestra 12:01 y no la hora de ahora (fila: ${r.reserva})`);
      if (!r.cola || !r.cola.includes("לא נשלח")) fallas.push(`el aviso en cola dice «לא נשלח» (fila: ${r.cola})`);
    } finally { await a.cerrar(); }
  });
  assert.deepEqual(fallas, [], `el registro de avisos:\n${fallas.join("\n")}`);
});

