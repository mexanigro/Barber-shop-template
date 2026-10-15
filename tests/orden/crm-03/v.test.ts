// CRM-03 · V1–V4 (T) · cada pantalla del CRM en el celular y en la computadora. Sesión A (2026-10-15): tests rojos.
//
// El CRM real (/admin) montado sin red por `_crm.ts` (D-309) con el salón de prueba; cada pestaña que ve la dueña se mide con
// `medirPantalla` (los criterios (a)–(g) de D-309). Medido en T 3aca12b (D-308): en las 12 pestañas hay controles de menos de 44 px,
// texto de menos de 12 px y contraste bajo; el Registro se sale de la pantalla a 390; el pie del menú tapa dos entradas a 1280 × 800.
import { test } from "node:test";
import assert from "node:assert/strict";
import { conCrm, medirPantalla, PESTANAS_DUENA, type Vista } from "./_crm.ts";

const CRITERIOS = ["fuera", "tapados", "letraChica", "contraste", "latin"] as const;
const resumir = (xs: string[]) => `${xs.slice(0, 3).join("; ")}${xs.length > 3 ? ` (+${xs.length - 3})` : ""}`;

test("en cada pestaña que ve la dueña —סקירה, תורים, תשלומים, לקוחות, צוות, משימות, מלאי, משתמשים, תיבת דואר, יומן מייל, זמנים y תמיכה—, a 390 y a 1280, en claro: la página no tiene scroll horizontal, ningún elemento queda cortado por el borde de la pantalla fuera de un contenedor con scroll, ningún control queda tapado en su centro por otro elemento, ningún texto visible mide menos de 12 px, todo texto tiene contraste 4,5 con su fondo (3 el grande), y no hay palabras en letras latinas salvo emails, CSV, CRM, Google, WhatsApp, Arzac Studio y Ctrl+Enter", async () => {
  const fallas: string[] = [];
  await conCrm(async (crm) => {
    for (const vista of ["telefono", "escritorio"] as Vista[]) {
      const a = await crm.abrir({ vista });
      try {
        for (const t of PESTANAS_DUENA) {
          await a.ir(t);
          const m = await medirPantalla(a.page);
          if (m.scrollAncho > m.ancho) fallas.push(`${vista} ${t} · scroll horizontal: ${m.scrollAncho} > ${m.ancho}`);
          for (const k of CRITERIOS) if (m[k].length) fallas.push(`${vista} ${t} · ${k}: ${resumir(m[k])}`);
        }
      } finally { await a.cerrar(); }
    }
  });
  assert.deepEqual(fallas, [], `D-309 (a)–(f) en cada pestaña a 390 y a 1280:\n${fallas.join("\n")}`);
});

test("en cada pestaña que ve la dueña, a 390 y a 768, cada botón, enlace, campo, selector, casilla, interruptor y pestaña mide al menos 44 × 44 px", async () => {
  const fallas: string[] = [];
  await conCrm(async (crm) => {
    for (const vista of ["telefono", "tableta"] as Vista[]) {
      const a = await crm.abrir({ vista });
      try {
        for (const t of PESTANAS_DUENA) {
          await a.ir(t);
          const m = await medirPantalla(a.page);
          if (m.chicos.length) fallas.push(`${vista} ${t} · ${m.chicos.length} controles < 44 × 44: ${resumir(m.chicos)}`);
        }
      } finally { await a.cerrar(); }
    }
  });
  assert.deepEqual(fallas, [], `tamaño táctil (D-309 (g)):\n${fallas.join("\n")}`);
});

test("el menú: a 390 el botón que lo abre tiene nombre accesible y mide 44 × 44, el menú se abre pegado al borde derecho (RTL) y cada una de sus entradas, traída a la vista, se puede tocar en su centro; a 1280 el menú está a la derecha y cada entrada se puede tocar en su centro con la ventana de 800 px de alto; y la entrada de la pestaña abierta lleva aria-current=\"page\"", async () => {
  await conCrm(async (crm) => {
    const tel = await crm.abrir({ vista: "telefono" });
    try {
      const boton = await tel.page.evaluate(() => {
        const vis = (e: Element) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"; };
        const enMenu = (e: Element) => (e.textContent ?? "").trim() === "תורים";
        const candidatos = [...document.querySelectorAll("button")].filter((b) => vis(b) && b.getBoundingClientRect().top < 80 && !enMenu(b) && b.querySelector("svg"));
        const b = candidatos.sort((x, y) => y.getBoundingClientRect().right - x.getBoundingClientRect().right)[0];
        if (!b) return null;
        const r = b.getBoundingClientRect();
        return { nombre: (b.getAttribute("aria-label") ?? "").trim() || (b.textContent ?? "").trim(), w: Math.round(r.width), h: Math.round(r.height) };
      });
      assert.ok(boton, "a 390 hay un botón con ícono arriba que abre el menú");
      assert.ok(boton.nombre.length > 0, `el botón del menú tiene nombre accesible (hoy: «${boton.nombre}»)`);
      assert.ok(boton.w >= 44 && boton.h >= 44, `el botón del menú mide 44 × 44 (hoy ${boton.w} × ${boton.h})`);
      await tel.page.getByRole("button", { name: boton.nombre }).first().click();
      await tel.page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => (b.textContent ?? "").trim() === "תורים" && b.getBoundingClientRect().right > 0 && b.getBoundingClientRect().left < innerWidth));
      const cajon = await tel.page.evaluate((pestanas: string[]) => {
        const out: string[] = [];
        let derecha = -1;
        for (const t of pestanas) {
          const b = [...document.querySelectorAll("button, a")].find((e) => (e.textContent ?? "").trim() === t && e.getBoundingClientRect().width > 0) as HTMLElement | undefined;
          if (!b) { out.push(`falta «${t}»`); continue; }
          b.scrollIntoView({ block: "center" });
          const r = b.getBoundingClientRect();
          derecha = Math.max(derecha, r.right);
          const arriba = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          if (!arriba || !(b === arriba || b.contains(arriba))) out.push(`«${t}» tapada por ${arriba?.tagName.toLowerCase()}«${(arriba?.textContent ?? "").trim().slice(0, 30)}»`);
        }
        return { out, derecha, ancho: innerWidth };
      }, ["סקירה", "תורים", "תשלומים", "לקוחות", "צוות", "משימות", "מלאי", "משתמשים", "תיבת דואר", "יומן מייל", "זמנים", "תמיכה"]);
      assert.ok(cajon.derecha >= cajon.ancho - 24, `el menú se abre pegado al borde derecho (su entrada más a la derecha termina en ${Math.round(cajon.derecha)} de ${cajon.ancho})`);
      assert.deepEqual(cajon.out, [], "a 390 cada entrada del menú, traída a la vista, se puede tocar en su centro");
    } finally { await tel.cerrar(); }

    const esc = await crm.abrir({ vista: "escritorio" });
    try {
      await esc.ir("תשלומים");
      const r = await esc.page.evaluate((pestanas: string[]) => {
        const out: string[] = [];
        let izquierda = Infinity;
        for (const t of pestanas) {
          const b = [...document.querySelectorAll("button, a")].find((e) => (e.textContent ?? "").trim() === t && e.getBoundingClientRect().width > 0) as HTMLElement | undefined;
          if (!b) { out.push(`falta «${t}»`); continue; }
          b.scrollIntoView({ block: "nearest" });
          const q = b.getBoundingClientRect();
          izquierda = Math.min(izquierda, q.left);
          const arriba = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
          if (!arriba || !(b === arriba || b.contains(arriba))) out.push(`«${t}» tapada por ${arriba?.tagName.toLowerCase()}«${(arriba?.textContent ?? "").trim().slice(0, 30)}»`);
        }
        const actual = [...document.querySelectorAll("button, a")].find((e) => (e.textContent ?? "").trim() === "תשלומים" && e.getBoundingClientRect().width > 0);
        return { out, izquierda, ancho: innerWidth, current: actual?.getAttribute("aria-current") ?? null };
      }, ["סקירה", "תורים", "תשלומים", "לקוחות", "צוות", "משימות", "מלאי", "משתמשים", "תיבת דואר", "יומן מייל", "זמנים", "תמיכה"]);
      assert.ok(r.izquierda > r.ancho / 2, `a 1280 el menú está a la derecha (empieza en x = ${Math.round(r.izquierda)})`);
      assert.deepEqual(r.out, [], "a 1280 × 800 cada entrada del menú se puede tocar en su centro");
      assert.equal(r.current, "page", "la entrada de la pestaña abierta (תשלומים) lleva aria-current=\"page\"");
    } finally { await esc.cerrar(); }
  });
});

test("en oscuro, a 390, en cada pestaña que ve la dueña, ningún texto visible mide menos de 12 px y todo texto tiene contraste 4,5 con su fondo (3 el grande)", async () => {
  const fallas: string[] = [];
  await conCrm(async (crm) => {
    const a = await crm.abrir({ vista: "telefono", modo: "dark" });
    try {
      const oscuro = await a.page.evaluate(async () => {
        if (document.documentElement.classList.contains("dark")) return true;
        const b = document.querySelector('button[aria-label="החלפת ערכת צבעים"]') as HTMLElement | null;
        b?.click();
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        return document.documentElement.classList.contains("dark");
      });
      assert.ok(oscuro, "el CRM pasa a oscuro (html.dark) con el botón «החלפת ערכת צבעים»");
      for (const t of PESTANAS_DUENA) {
        await a.ir(t);
        const m = await medirPantalla(a.page);
        for (const k of ["letraChica", "contraste"] as const) if (m[k].length) fallas.push(`oscuro ${t} · ${k}: ${resumir(m[k])}`);
      }
    } finally { await a.cerrar(); }
  });
  assert.deepEqual(fallas, [], `en oscuro a 390:\n${fallas.join("\n")}`);
});
