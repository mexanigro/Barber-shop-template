// CRM-03 · S1 (T) · el Resumen a 390, con los arreglos de CRM-02 vigilados. Sesión A (2026-10-15): test rojo.
//
// Medido en el desplegado (D-308): a 390 las cifras se parten («₪2 / 100», «10 / 0 / %»), los íconos de fondo de las tarjetas se
// cruzan con el texto, el mapa de días y horas se corta y el gráfico dice «Thu», «Fri»… CRM-02 arregló los colores del mapa y de la
// dona (hsl(var(--x)) sobre tokens hex) y sacó «שיעור המרה»: sin guard, cualquier commit lo rompe sin que nadie se entere.
import { test } from "node:test";
import assert from "node:assert/strict";
import { conCrm, quieta } from "./_crm.ts";

test("el Resumen a 390: cada cifra de sus tarjetas —turnos, ingresos, clientas nuevas, terminados— se lee en un solo renglón y ningún ícono de fondo se cruza con un texto; el mapa de días y horas entra entero en su tarjeta, empieza el domingo y sus días están en hebreo; los días del gráfico están en hebreo; y, como dejó CRM-02, las celdas del mapa con turnos tienen otro color de fondo que las vacías, la dona no es negra y no aparece «שיעור המרה»", async () => {
  await conCrm(async (crm) => {
    const a = await crm.abrir({ vista: "telefono" });
    try {
      await a.ir("סקירה");
      await a.page.waitForFunction(() => document.body.innerText.includes("ימים ושעות עמוסים"), null, { timeout: 30000 });
      await quieta(a.page);
      const m = await a.page.evaluate(() => {
        const out = { partidas: [] as string[], cruces: [] as string[], mapa: null as null | { scroll: number; ancho: number; primerDia: string; dias: string[]; conTurno: string[]; vacias: string[] }, ingles: [] as string[], dona: [] as string[], conversion: document.body.innerText.includes("שיעור המרה") };
        const lineas = (el: Element) => { const r = document.createRange(); r.selectNodeContents(el); return new Set([...r.getClientRects()].filter((q) => q.width > 0).map((q) => Math.round(q.top))).size; };
        // Cifras: los textos grandes (≥ 20 px) que son sólo un número, un monto o un porcentaje.
        for (const el of document.querySelectorAll("main *, body *")) {
          if (el.children.length > 2) continue;
          const t = (el.textContent ?? "").trim();
          if (!/^[₪$]?\s?[\d.,]+\s?[₪%]?$/.test(t)) continue;
          const tam = parseFloat(getComputedStyle(el).fontSize);
          if (tam < 20 || el.getBoundingClientRect().width === 0) continue;
          if (lineas(el) > 1) out.partidas.push(`«${t}» en ${lineas(el)} renglones`);
        }
        // Íconos de fondo: un svg dentro de una tarjeta que se cruza con un texto de la misma tarjeta.
        for (const svg of document.querySelectorAll("svg")) {
          const caja = svg.closest("[class*='rounded']");
          if (!caja) continue;
          const pos = getComputedStyle(svg.parentElement ?? svg).position;
          if (pos !== "absolute") continue;
          const s = svg.getBoundingClientRect();
          for (const t of caja.querySelectorAll("p, h1, h2, h3, h4, span")) {
            if (!(t.textContent ?? "").trim() || t.contains(svg)) continue;
            const q = t.getBoundingClientRect();
            const ix = Math.min(s.right, q.right) - Math.max(s.left, q.left), iy = Math.min(s.bottom, q.bottom) - Math.max(s.top, q.top);
            if (ix > 2 && iy > 2) out.cruces.push(`ícono sobre «${(t.textContent ?? "").trim().slice(0, 20)}»`);
          }
        }
        // El mapa de días y horas.
        const propio = (e: Element) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent ?? "").join("").trim();
        const titulo = [...document.querySelectorAll("*")].find((e) => propio(e) === "ימים ושעות עמוסים");
        let tarjeta: Element | null = titulo ?? null;
        while (tarjeta && !tarjeta.querySelector("[title]")) tarjeta = tarjeta.parentElement;
        const celdas = tarjeta ? [...tarjeta.querySelectorAll("[title]")].filter((c) => /\d{1,2}:00/.test(c.getAttribute("title") ?? "")) : [];
        if (tarjeta && celdas.length) {
          let scroll = 0;
          for (const e of tarjeta.querySelectorAll("*")) if (e.scrollWidth > e.clientWidth + 1 && ["auto", "scroll", "hidden"].includes(getComputedStyle(e).overflowX)) scroll = Math.max(scroll, e.scrollWidth - e.clientWidth);
          const caja = tarjeta.getBoundingClientRect();
          const fuera = celdas.filter((c) => { const r = c.getBoundingClientRect(); return r.left < caja.left - 1 || r.right > caja.right + 1; }).length;
          const dias = [...new Set(celdas.map((c) => (c.getAttribute("title") ?? "").split(" ")[0]))];
          const fondo = (c: Element) => getComputedStyle(c).backgroundColor;
          out.mapa = { scroll: scroll + fuera, ancho: Math.round(caja.width), primerDia: dias[0] ?? "", dias, conTurno: [...new Set(celdas.filter((c) => (c.getAttribute("title") ?? "").includes("—")).map(fondo))], vacias: [...new Set(celdas.filter((c) => !(c.getAttribute("title") ?? "").includes("—")).map(fondo))] };
        }
        for (const e of document.querySelectorAll("text, tspan, span, p, div")) {
          if (e.children.length) continue;
          const t = (e.textContent ?? "").trim();
          if (/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)/.test(t)) out.ingles.push(t);
        }
        for (const p of document.querySelectorAll(".recharts-pie-sector path, path.recharts-sector")) {
          const f = getComputedStyle(p).fill;
          if (!f || f === "none" || f === "rgb(0, 0, 0)") out.dona.push(f || "(sin fill)");
        }
        return out;
      });
      const fallas: string[] = [];
      const exigir = (ok: boolean, msg: string) => { if (!ok) fallas.push(msg); };
      exigir(m.partidas.length === 0, `cada cifra de las tarjetas del Resumen se lee en un solo renglón a 390: ${m.partidas.join("; ")}`);
      exigir(m.cruces.length === 0, `ningún ícono de fondo de una tarjeta se cruza con su texto: ${[...new Set(m.cruces)].join("; ")}`);
      assert.ok(m.mapa, "el Resumen muestra el mapa «ימים ושעות עמוסים» con sus celdas");
      exigir(m.mapa.scroll === 0, `el mapa de días y horas entra entero en su tarjeta a 390 (hoy desborda ${m.mapa.scroll} px de ${m.mapa.ancho})`);
      exigir(/^א/.test(m.mapa.primerDia), `el mapa empieza el domingo (א׳); hoy: «${m.mapa.primerDia}»`);
      exigir(m.mapa.dias.every((d: string) => /^[֐-׿]/.test(d)), `los días del mapa en hebreo: ${m.mapa.dias.join(", ")}`);
      exigir(m.ingles.length === 0, `los días del gráfico en hebreo, no ${[...new Set(m.ingles)].join(", ")}`);
      exigir(m.mapa.conTurno.length > 0 && m.mapa.conTurno.every((c: string) => !m.mapa!.vacias.includes(c)), `CRM-02: las celdas con turnos tienen otro color de fondo que las vacías (con turnos ${m.mapa.conTurno.join(" | ")}; vacías ${m.mapa.vacias.join(" | ")})`);
      exigir(m.dona.length === 0, `CRM-02: la dona no es negra ni sin color: ${m.dona.join(", ")}`);
      exigir(!m.conversion, "CRM-02: no aparece «שיעור המרה»");
      assert.deepEqual(fallas, [], `el Resumen a 390:\n${fallas.join("\n")}`);
    } finally { await a.cerrar(); }
  });
});
