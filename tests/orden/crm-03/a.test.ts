// CRM-03 · A1–A3 (T) · Turnos: la lista, el calendario y mover o cobrar un turno desde el celular. Sesión A (2026-10-15): tests rojos.
//
// Medido (D-308): a 1280 la tabla parte palabras («07:4 / 1», «ללא תשלו / ם»); el error del backend sale en castellano; el mes y la
// semana empiezan el lunes; la semana a 390 deja días fuera; mover un turno es sólo arrastrar (no anda en táctil, ESTUDIO). CRM-02
// arregló la lista por hora, ₪, el hebreo, «Origen: navegador», los carriles del día y la cuenta del día: se vigilan acá.
import { test } from "node:test";
import assert from "node:assert/strict";
import { conCrm, quieta, tocar, MANANA } from "./_crm.ts";

/** Palabras partidas en dos renglones dentro de `sel`: cada palabra de cada texto, medida con un Range. */
const PARTIDAS = (sel: string) => `(() => {
  const out = [];
  const raiz = document.querySelector(${JSON.stringify(sel)});
  if (!raiz) return null;
  const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const el = n.parentElement; if (!el || el.getBoundingClientRect().width === 0) continue;
    const txt = n.textContent || ""; const re = /\\S+/g; let m;
    while ((m = re.exec(txt))) {
      const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
      const tops = new Set([...r.getClientRects()].filter((q) => q.width > 0).map((q) => Math.round(q.top)));
      if (tops.size > 1) out.push(m[0]);
    }
  }
  return out;
})()`;

/** El número que acompaña a una etiqueta («ממתינים», «הכנסה») en las tarjetas de arriba. */
const CIFRA = (etiqueta: string) => `(() => {
  const propio = (e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent || "").join("").trim();
  const lab = [...document.querySelectorAll("*")].find((e) => propio(e) === ${JSON.stringify(etiqueta)} && e.getBoundingClientRect().width > 0);
  if (!lab) return null;
  for (let p = lab.parentElement; p; p = p.parentElement) {
    const num = [...p.querySelectorAll("*")].map((e) => propio(e)).find((t) => /^[₪$]?\\s?[\\d.,]+\\s?[₪%]?$/.test(t));
    if (num) return num.replace(/[^\\d]/g, "");
  }
  return null;
})()`;

test("la lista de turnos: a 390 y a 1280 los turnos del día van por hora, los precios en ₪ y nunca en $, las fechas y el estado de pago en hebreo y sin «Origen» ni «navegador»; a 1280 la tabla no parte palabras —la hora, el nombre de la clienta y el estado de pago caben cada uno en un renglón—; los pendientes y el ingreso del día son los mismos que muestra el Resumen; y si el backend responde 503 el aviso está en hebreo y ofrece «רענון»", async () => {
  const fallas: string[] = [];
  await conCrm(async (crm) => {
    for (const vista of ["telefono", "escritorio"] as const) {
      const a = await crm.abrir({ vista });
      try {
        await a.ir("תורים");
        const lista = await a.page.evaluate(() => {
          const vis = (e: Element) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
          const horas = [...document.querySelectorAll("main *, body *")].filter((e) => vis(e) && (e.textContent ?? "").trim().replace(/\s+/g, "").match(/^\d{2}:\d{2}$/) && e.children.length <= 1).map((e) => (e.textContent ?? "").trim().replace(/\s+/g, ""));
          const texto = document.body.innerText;
          return { horas: [...new Set(horas)], dolar: /\$/.test(texto), origen: /Origen|navegador|backend/i.test(texto) };
        });
        if (lista.horas.length < 5) fallas.push(`${vista}: la lista del día muestra sus turnos (vi ${lista.horas.length} horas: ${lista.horas.join(" ")})`);
        if (lista.horas.join() !== [...lista.horas].sort().join()) fallas.push(`${vista}: CRM-02: la lista del día va por hora (${lista.horas.join(" ")})`);
        if (lista.dolar) fallas.push(`${vista}: ningún «$» (los precios en ₪)`);
        if (lista.origen) fallas.push(`${vista}: CRM-02: sin «Origen» ni «navegador»`);
        if (vista === "escritorio") {
          const partidas = await a.page.evaluate(PARTIDAS("table"));
          if (partidas === null) fallas.push("escritorio: a 1280 los turnos se ven en una tabla");
          else if (partidas.length) fallas.push(`escritorio: a 1280 la tabla no parte palabras: ${partidas.slice(0, 8).join(" | ")}`);
        }
        const turnos = { pend: await a.page.evaluate(CIFRA("ממתינים")), ingreso: await a.page.evaluate(CIFRA("הכנסה")) };
        await a.ir("סקירה");
        await a.page.waitForFunction(() => document.body.innerText.includes("היום"), null, { timeout: 30000 });
        const resumen = { pend: await a.page.evaluate(CIFRA("ממתינים")), ingreso: await a.page.evaluate(CIFRA("הכנסה")) };
        if (!turnos.pend || turnos.pend !== resumen.pend || !turnos.ingreso || turnos.ingreso !== resumen.ingreso) fallas.push(`${vista}: CRM-02: los pendientes y el ingreso del día de Turnos (${turnos.pend} · ₪${turnos.ingreso}) son los del Resumen (${resumen.pend} · ₪${resumen.ingreso})`);
      } finally { await a.cerrar(); }
    }
    const e = await crm.abrir({ vista: "telefono", api: (m, r) => (m === "GET" && r.startsWith("/api/crm/appointments") ? { status: 503, json: { error: "Database not available" } } : undefined) });
    try {
      await e.ir("תורים");
      await e.page.waitForFunction(() => document.querySelector("[role=alert]") || /503|Backend/.test(document.body.innerText), null, { timeout: 30000 });
      const aviso = await e.page.evaluate(() => {
        const al = [...document.querySelectorAll("[role=alert]")].find((x) => x.getBoundingClientRect().width > 0);
        const texto = (al ? (al as HTMLElement).innerText : [...document.querySelectorAll("*")].map((x) => x.childNodes.length && [...x.childNodes].some((n) => n.nodeType === 3 && /503/.test(n.textContent ?? "")) ? (x as HTMLElement).innerText : "").find(Boolean)) ?? "";
        const reintentar = [...document.querySelectorAll("button")].some((b) => (b.textContent ?? "").trim() === "רענון" && b.getBoundingClientRect().width > 0);
        return { rol: !!al, texto: texto.trim(), reintentar };
      });
      if (!aviso.rol) fallas.push(`503: el aviso del backend lleva role="alert" (hoy: «${aviso.texto}»)`);
      if (/[A-Za-zÁÉÍÓÚáéíóúñ]{3,}/.test(aviso.texto)) fallas.push(`503: el aviso está en hebreo (hoy: «${aviso.texto}»)`);
      if (!aviso.reintentar) fallas.push("503: el aviso ofrece «רענון»");
    } finally { await e.cerrar(); }
  });
  assert.deepEqual(fallas, [], `la lista de turnos:\n${fallas.join("\n")}`);
});

test("el calendario de turnos empieza el domingo en el mes y en la semana —la primera columna, la de la derecha, es א׳—; en la vista día, a 390 y a 1280, cada turno empieza en la fila de su hora y los que se pisan quedan lado a lado sin cubrirse; y a 390 la semana muestra sus siete días dentro de la pantalla", async () => {
  const fallas: string[] = [];
  const HORA: Record<string, string> = { t1: "09:00", t2: "09:30", t3: "10:00", t4: "12:00", t5: "15:00" };
  await conCrm(async (crm) => {
    for (const vista of ["telefono", "escritorio"] as const) {
      const a = await crm.abrir({ vista });
      try {
        await a.ir("תורים");
        if (!(await tocar(a.page, "לוח שנה"))) { fallas.push(`${vista}: hay «לוח שנה»`); continue; }
        if (await tocar(a.page, "חודש")) {
          const mes = await a.page.evaluate(() => {
            const labels = [...document.querySelectorAll("*")].filter((e) => e.children.length === 0 && /^[אבגדהוש]׳$/.test((e.textContent ?? "").trim()) && e.getBoundingClientRect().width > 0);
            // la grilla del mes es la de más abajo con 7 etiquetas seguidas (la de arriba puede ser el filtro por fecha)
            const grupos = new Map<Element, Element[]>();
            for (const l of labels) { const p = l.parentElement!; grupos.set(p, [...(grupos.get(p) ?? []), l]); }
            const fila = [...grupos.values()].filter((g) => g.length === 7).sort((x, y) => y[0].getBoundingClientRect().top - x[0].getBoundingClientRect().top)[0];
            if (!fila) return null;
            const derecha = [...fila].sort((x, y) => y.getBoundingClientRect().right - x.getBoundingClientRect().right)[0];
            return { primero: (fila[0].textContent ?? "").trim(), derecha: (derecha.textContent ?? "").trim() };
          });
          if (!mes) fallas.push(`${vista}: el mes tiene su fila de días`);
          else if (mes.primero !== "א׳" || mes.derecha !== "א׳") fallas.push(`${vista}: el mes empieza el domingo (primera: «${mes.primero}», a la derecha: «${mes.derecha}»)`);
        } else fallas.push(`${vista}: hay «חודש»`);
        if (await tocar(a.page, "שבוע")) {
          const semana = await a.page.evaluate(() => {
            const nums = [...document.querySelectorAll("*")].filter((e) => e.children.length === 0 && /^(1[0-9])$/.test((e.textContent ?? "").trim()) && e.getBoundingClientRect().width > 0 && getComputedStyle(e).fontSize !== "0px");
            // la cabecera de la semana: los números de día que comparten la misma altura
            const filas = new Map<number, Element[]>();
            for (const n of nums) { const t = Math.round(n.getBoundingClientRect().top / 4); filas.set(t, [...(filas.get(t) ?? []), n]); }
            const cab = [...filas.values()].filter((f) => f.length >= 3).sort((x, y) => y.length - x.length)[0] ?? [];
            const dias = cab.map((n) => Number((n.textContent ?? "").trim()));
            const fuera = cab.filter((n) => { const r = n.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth; }).length;
            return { dias, fuera };
          });
          if (semana.dias[0] !== 11) fallas.push(`${vista}: la semana empieza el domingo 11 (hoy la cabecera es ${semana.dias.join(", ")})`);
          if (vista === "telefono" && (semana.dias.length < 7 || semana.fuera > 0)) fallas.push(`telefono: la semana muestra sus siete días dentro de la pantalla (vi ${semana.dias.length}, ${semana.fuera} fuera)`);
        } else fallas.push(`${vista}: hay «שבוע»`);
        if (await tocar(a.page, "יום")) {
          const dia = await a.page.evaluate((hora: Record<string, string>) => {
            const filas = [...document.querySelectorAll("[data-hora]")] as HTMLElement[];
            const bloques = [...document.querySelectorAll("[data-turno]")] as HTMLElement[];
            if (!filas.length || !bloques.length) return { error: `la vista día marca sus filas (data-hora: ${filas.length}) y sus turnos (data-turno: ${bloques.length})` };
            const out: string[] = [];
            for (const b of bloques) {
              const h = hora[b.dataset.turno ?? ""]; if (!h) continue;
              const fila = filas.find((f) => f.dataset.hora === `${h.slice(0, 2)}:00`);
              if (!fila) { out.push(`sin fila ${h.slice(0, 2)}:00`); continue; }
              const fr = fila.getBoundingClientRect(), br = b.getBoundingClientRect();
              const esperado = fr.top + (Number(h.slice(3)) / 60) * fr.height;
              if (Math.abs(br.top - esperado) > 2) out.push(`${b.dataset.turno} (${h}) empieza en ${Math.round(br.top - fr.top)} px de su fila (esperado ${Math.round(esperado - fr.top)})`);
            }
            for (let i = 0; i < bloques.length; i++) for (let j = i + 1; j < bloques.length; j++) {
              const p = bloques[i].getBoundingClientRect(), q = bloques[j].getBoundingClientRect();
              const ix = Math.min(p.right, q.right) - Math.max(p.left, q.left), iy = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
              if (ix > 1 && iy > 1) out.push(`${bloques[i].dataset.turno} y ${bloques[j].dataset.turno} se cubren`);
            }
            return { out };
          }, HORA);
          if ("error" in dia) fallas.push(`${vista}: ${dia.error}`);
          else fallas.push(...(dia.out as string[]).map((x: string) => `${vista} día: ${x}`));
        } else fallas.push(`${vista}: hay «יום»`);
      } finally { await a.cerrar(); }
    }
  });
  assert.deepEqual(fallas, [], `el calendario de turnos:\n${fallas.join("\n")}`);
});

test("desde el celular, a 390, cada turno se puede mover sin arrastrar: «שינוי מועד» abre la fecha y la hora y guardar escribe la nueva fecha y hora en ese turno y pide el aviso de cambio a la clienta; y cada turno sin pagar ofrece «סמן כשולם»", async () => {
  await conCrm(async (crm) => {
    const a = await crm.abrir({ vista: "telefono" });
    try {
      await a.ir("תורים");
      const cuenta = await a.page.evaluate(() => {
        const vis = (e: Element) => e.getBoundingClientRect().width > 0;
        const n = (t: string) => [...document.querySelectorAll("button")].filter((b) => vis(b) && (b.textContent ?? "").trim() === t).length;
        return { mover: n("שינוי מועד"), pagar: n("סמן כשולם") };
      });
      // El día tiene 5 turnos: t1..t5; t2 y t5 ya pagados.
      assert.equal(cuenta.mover, 5, `cada turno del día ofrece «שינוי מועד» (hoy ${cuenta.mover} de 5)`);
      assert.equal(cuenta.pagar, 3, `cada turno sin pagar ofrece «סמן כשולם» (hoy ${cuenta.pagar} de 3)`);
      await tocar(a.page, "שינוי מועד");
      const dialogo = await a.page.evaluate(() => {
        const d = [...document.querySelectorAll("[role=dialog]")].find((x) => x.getBoundingClientRect().width > 0);
        return d ? { fecha: !!d.querySelector("input[type=date]"), hora: !!d.querySelector("input[type=time]") } : null;
      });
      assert.ok(dialogo && dialogo.fecha && dialogo.hora, "«שינוי מועד» abre un diálogo con la fecha y la hora");
      await a.page.locator("[role=dialog] input[type=date]").fill(MANANA);
      await a.page.locator("[role=dialog] input[type=time]").fill("13:00");
      assert.ok(await tocar(a.page, "שמירה", "[role=dialog]"), "el diálogo tiene «שמירה»");
      await a.page.waitForFunction(() => ((globalThis as any).__CRM03.escrituras as any[]).some((e) => e.ruta?.startsWith("appointments/") && e.datos?.time === "13:00"), null, { timeout: 15000 });
      const esc = (await a.escrituras()).filter((e) => e.ruta.startsWith("appointments/") && e.datos?.time === "13:00");
      assert.equal(esc.length, 1, "guardar escribe la nueva hora en un solo turno");
      assert.equal(esc[0].datos.date, MANANA, "y la nueva fecha");
      assert.ok(!(await a.escrituras()).some((e) => e.op === "add" && e.ruta.startsWith("appointments/")), "sin crear otro turno");
      await quieta(a.page);
      assert.ok(a.pedidos.some((p) => p.metodo === "POST" && p.ruta === "/api/appointment/notify" && p.cuerpo?.action === "rescheduled"), "y pide el aviso de cambio a la clienta (POST /api/appointment/notify, rescheduled)");
    } finally { await a.cerrar(); }
  });
});
