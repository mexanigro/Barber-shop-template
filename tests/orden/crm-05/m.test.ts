// CRM-05 · M1, M2 (T) · el contraste que la verificadora de CRM-04 midió con `medirPantalla` (D-348): el asterisco de «requerido» de
// «תור חדש» en oscuro y los días de otro mes del mes desplegable de la agenda (D-384; Liam da el sí a cambiar ese detalle del tablero
// aprobado de proto3, inciso ac). Sesión A2 (2026-10-25): tests rojos.
//
// Medido en T 351a33e (src/ = 6a8dbb2), en un clon, con el arnés corregido (`modo: "dark"` siembra `crm-panel-theme`, que es lo que lee
// el panel desde D-345): el asterisco es `text-red-700` sin variante oscura (`crm03/TurnoNuevo.tsx:73-74`, `:98`) y mide 2,38 sobre la
// tarjeta oscura; los días de otro mes son `text-muted-foreground/50` (`ui/calendar.tsx:151`) y miden 2,11 en claro y 3,64 en oscuro.
// El contraste es el de `medirPantalla` (la misma cuenta que su lista `contraste`), sobre los textos marcados con `data-crm05-medir`.
// «Más tenues» es la otra dirección: cada día de otro mes mide menos que el día del mes con menos contraste (sin el elegido). El reloj
// del arnés es el jueves 2026-10-15: el mes desplegable muestra octubre de 2026 desde el domingo 27 de septiembre. Ninguna espera es de
// tiempo fijo.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from "node:test";
import assert from "node:assert/strict";
import { conCrm, medirPantalla, quieta, tocar, type Idioma, type Vista } from "./_crm.ts";

/** Corre `fn` y anota lo que lance como falla, con su contexto. */
async function paso(fallas: string[], que: string, fn: () => Promise<void>) {
  try { await fn(); } catch (e) { fallas.push(`${que} · ${((e as Error).message ?? String(e)).split("\n")[0]}`); }
}
const enOscuro = (page: any) => page.evaluate(() => document.documentElement.classList.contains("dark"));

test("en oscuro, el asterisco de «requerido» de «תור חדש» mide ≥ 4,5 de contraste a 390, 768 y 1280", async () => {
  const fallas: string[] = [];
  await conCrm(async (crm) => {
    for (const vista of ["telefono", "tableta", "escritorio"] as Vista[]) {
      await paso(fallas, vista, async () => {
        const a = await crm.abrir({ vista, modo: "dark" });
        try {
          if (!(await enOscuro(a.page))) { fallas.push(`${vista} · el panel está en oscuro (<html class="dark">)`); return; }
          await a.irA("missions");
          if (!(await tocar(a.page, "תור חדש"))) { fallas.push(`${vista} · «תור חדש» en Turnos`); return; }
          const n = await a.page.evaluate(() => {
            const d = [...document.querySelectorAll("[role=dialog]")].find((x) => x.getBoundingClientRect().width > 0);
            if (!d) return 0;
            const es = [...d.querySelectorAll("*")].filter((e) => e.getBoundingClientRect().width > 0 && [...e.childNodes].some((x) => x.nodeType === 3 && (x.textContent ?? "").trim() === "*"));
            es.forEach((e) => e.setAttribute("data-crm05-medir", "asterisco"));
            return es.length;
          });
          if (!n) { fallas.push(`${vista} · «תור חדש» marca los campos requeridos con «*»`); return; }
          const medidos = (await medirPantalla(a.page)).ratios.filter((r) => r.marca === "asterisco");
          if (medidos.length !== n) fallas.push(`${vista} · se midieron los ${n} asteriscos (se midieron ${medidos.length})`);
          for (const r of medidos) if (r.ratio < 4.5) fallas.push(`${vista} · el asterisco ${r.nombre} mide ≥ 4,5 (hoy ${r.ratio})`);
        } finally { await a.cerrar(); }
      });
    }
  });
  assert.deepEqual(fallas, [], `M1 · el asterisco de «requerido» en oscuro:\n${fallas.join("\n")}`);
});

test("los días de otro mes del mes desplegable de la agenda miden ≥ 4,5 de contraste en claro y en oscuro, en los cuatro idiomas, y siguen más tenues que los días del mes", async () => {
  const fallas: string[] = [];
  await conCrm(async (crm) => {
    for (const modo of ["light", "dark"] as const) for (const idioma of ["he", "en", "ru", "ar"] as Idioma[]) {
      const que = `${modo === "dark" ? "oscuro" : "claro"} · ${idioma}`;
      await paso(fallas, que, async () => {
        const a = await crm.abrir({ vista: "telefono", modo, idioma });
        try {
          if ((await enOscuro(a.page)) !== (modo === "dark")) { fallas.push(`${que} · el panel está en ${modo === "dark" ? "oscuro" : "claro"}`); return; }
          await a.irA("missions");
          // El botón del mes: el que se despliega (aria-expanded, sin menú) en la tarjeta de la semana (7 días con aria-pressed).
          const hay = await a.page.evaluate(() => {
            const vis = (e: Element) => e.getBoundingClientRect().width > 0;
            const b = [...document.querySelectorAll("#admin-content button[aria-expanded]:not([aria-haspopup])")].find((x) => {
              if (!vis(x) || x.closest("aside, header")) return false;
              for (let p = x.parentElement; p; p = p.parentElement) if (p.querySelectorAll("button[aria-pressed]").length >= 7) return true;
              return false;
            });
            b?.setAttribute("data-crm05-mes", "1");
            return !!b;
          });
          if (!hay) { fallas.push(`${que} · la agenda tiene el botón del mes`); return; }
          await a.page.locator("[data-crm05-mes]").click();
          await quieta(a.page);
          const dias = await a.page.evaluate(() => {
            const digitos = (s: string) => s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
            const b = document.querySelector("[data-crm05-mes]")!;
            if (b.getAttribute("aria-expanded") !== "true") return null;
            // La grilla del mes: el contenedor con más botones con aria-pressed (la semana tiene 7) dentro de la tarjeta del botón.
            let tarjeta: Element | null = b.parentElement;
            while (tarjeta && tarjeta.querySelectorAll("button[aria-pressed]").length < 28 + 7) tarjeta = tarjeta.parentElement;
            if (!tarjeta) return null;
            const grupos = new Map<Element, HTMLButtonElement[]>();
            for (const x of tarjeta.querySelectorAll<HTMLButtonElement>("button[aria-pressed]")) if (x.parentElement && x.getBoundingClientRect().width > 0) grupos.set(x.parentElement, [...(grupos.get(x.parentElement) ?? []), x]);
            const grilla = [...grupos.values()].sort((p, q) => q.length - p.length)[0] ?? [];
            const nums = grilla.map((x) => Number(digitos((x.textContent ?? "").trim())));
            const i1 = nums.indexOf(1), i2 = nums.indexOf(1, i1 + 1);
            if (grilla.length < 28 || i1 < 0) return { total: grilla.length, fuera: 0, dentro: 0 };
            let fuera = 0, dentro = 0;
            grilla.forEach((x, i) => {
              const otro = i < i1 || (i2 >= 0 && i >= i2);
              if (otro) { x.setAttribute("data-crm05-medir", "fuera"); fuera++; }
              else if (x.getAttribute("aria-pressed") !== "true" && !x.disabled) { x.setAttribute("data-crm05-medir", "dentro"); dentro++; }
            });
            return { total: grilla.length, fuera, dentro };
          });
          if (!dias) { fallas.push(`${que} · el botón del mes despliega la grilla del mes`); return; }
          if (!dias.fuera || dias.dentro < 27) { fallas.push(`${que} · el mes desplegable muestra días de otro mes y del mes (hoy ${JSON.stringify(dias)})`); return; }
          const r = (await medirPantalla(a.page)).ratios;
          const fuera = r.filter((x) => x.marca === "fuera"), dentro = r.filter((x) => x.marca === "dentro");
          if (fuera.length !== dias.fuera || !dentro.length) { fallas.push(`${que} · se midieron los ${dias.fuera} días de otro mes y los del mes (se midieron ${fuera.length} y ${dentro.length})`); return; }
          for (const x of fuera) if (x.ratio < 4.5) fallas.push(`${que} · el día de otro mes ${x.nombre} mide ≥ 4,5 (hoy ${x.ratio})`);
          const menosDelMes = Math.min(...dentro.map((x) => x.ratio)), masDeOtro = Math.max(...fuera.map((x) => x.ratio));
          if (!(masDeOtro < menosDelMes)) fallas.push(`${que} · los días de otro mes se ven más tenues que los del mes (el de otro mes con más contraste mide ${masDeOtro}; el del mes con menos, ${menosDelMes})`);
        } finally { await a.cerrar(); }
      });
    }
  });
  assert.deepEqual(fallas, [], `M2 · los días de otro mes del mes desplegable:\n${fallas.join("\n")}`);
});
