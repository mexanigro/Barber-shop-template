// CRM-04 · M1–M10 (T) · el celular y la agenda (D-336, prototipo 3). Sesión A (2026-10-20): tests rojos.
//
// Medido en T 47b53a6 (`PASO-2.md` y el arnés de esta orden): el menú del celular no toma el foco, Tab sigue atrás y Escape no lo cierra;
// tema 38 × 38 e idioma 45 × 31; a 1280 × 674 el menú tiene scroll; el botón de accesibilidad flota sobre el contenido; un servicio de ₪0
// ofrece «סמן כשולם»; un turno de 15 min es una tira de ~19 px; la semana del celular tiene 210 huecos de 44 × 32; el mes desplegable
// tiene días de 41 × 36 y flechas de 36 × 36 al revés en hebreo; los huecos se llaman «2026-10-15 07:00»; no hay `<main>`.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CLAVES, abrirMenu, conCrm, flechas, medirPantalla, quieta, vistaCalendario, type Idioma, type Vista } from "./_crm.ts";

async function paso(fallas: string[], que: string, fn: () => Promise<void>) {
  try { await fn(); } catch (e) { fallas.push(`${que}: ${String((e as Error)?.message ?? e).split("\n")[0]}`); }
}
const SIGUIENTE = "next|הבא|следующ|التالي";
const ANTERIOR = "prev|קודם|предыдущ|السابق";

test("a 390 el menú abierto es un diálogo: `role=\"dialog\"` y `aria-modal=\"true\"`, toma el foco al abrir, 25 Tab seguidos quedan adentro, Escape lo cierra y el foco vuelve al botón «תפריט»; a 1280 el menú no es un diálogo", async () => {
  const fallas: string[] = [];
  await conCrm(async (crm) => {
    await paso(fallas, "390", async () => {
      const a = await crm.abrir({ vista: "telefono" });
      try {
        if (!(await abrirMenu(a.page))) { fallas.push("390 · hay un botón con aria-expanded que abre el menú"); return; }
        const abierto = await a.page.evaluate(() => {
          const aside = document.querySelector("aside")!;
          return { role: aside.getAttribute("role"), modal: aside.getAttribute("aria-modal"), foco: aside === document.activeElement || aside.contains(document.activeElement) };
        });
        if (abierto.role !== "dialog" || abierto.modal !== "true") fallas.push(`390 · el menú abierto lleva role="dialog" y aria-modal="true" (hoy role=${abierto.role}, aria-modal=${abierto.modal})`);
        if (!abierto.foco) fallas.push("390 · el menú toma el foco al abrir");
        let fuera = 0;
        for (let i = 0; i < 25; i++) {
          await a.page.keyboard.press("Tab");
          if (!(await a.page.evaluate(() => !!document.querySelector("aside")?.contains(document.activeElement)))) fuera++;
        }
        if (fuera) fallas.push(`390 · 25 Tab seguidos quedan adentro del menú (${fuera} salieron)`);
        await a.page.keyboard.press("Escape");
        await quieta(a.page);
        const despues = await a.page.evaluate(() => {
          const b = [...document.querySelectorAll("header button[aria-expanded], #admin-content button[aria-expanded]")].find((x) => !x.closest("#admin-content > aside")) as HTMLElement | undefined;
          return { expandido: b?.getAttribute("aria-expanded"), foco: !!b && document.activeElement === b, nombre: (b?.getAttribute("aria-label") ?? b?.textContent ?? "").trim() };
        });
        if (despues.expandido !== "false") fallas.push(`390 · Escape cierra el menú (aria-expanded: ${despues.expandido})`);
        if (!despues.foco || despues.nombre !== "תפריט") fallas.push(`390 · tras Escape el foco vuelve al botón «תפריט» (foco en él: ${despues.foco}; su nombre: «${despues.nombre}»)`);
      } finally { await a.cerrar(); }
    });
    await paso(fallas, "1280", async () => {
      const a = await crm.abrir({ vista: "escritorio" });
      try {
        const r = await a.page.evaluate(() => { const aside = document.querySelector("aside")!; return { role: aside.getAttribute("role"), modal: aside.getAttribute("aria-modal") }; });
        if (r.role === "dialog" || r.modal === "true") fallas.push(`1280 · el menú no es un diálogo (role=${r.role}, aria-modal=${r.modal})`);
      } finally { await a.cerrar(); }
    });
  });
  assert.deepEqual(fallas, [], `M1 · el menú del celular como diálogo:\n${fallas.join("\n")}`);
});

test("los botones de tema e idioma del pie del menú miden al menos 44 × 44", async () => {
  const fallas: string[] = [];
  await conCrm(async (crm) => {
    for (const vista of ["telefono", "escritorio"] as Vista[]) {
      await paso(fallas, vista, async () => {
        const a = await crm.abrir({ vista });
        try {
          if (vista === "telefono" && !(await abrirMenu(a.page))) fallas.push("390 · hay un botón que abre el menú");
          // El pie: los botones del menú que vienen después de la navegación, menos el último («התנתקות»).
          const pie = await a.page.evaluate(() => {
            const aside = document.querySelector("aside"), nav = aside?.querySelector("nav");
            if (!aside || !nav) return null;
            const bs = [...aside.querySelectorAll("button")].filter((b) => !nav.contains(b) && (nav.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) && b.getBoundingClientRect().width > 0);
            return bs.slice(0, -1).map((b) => { const r = b.getBoundingClientRect(); return { nombre: (b.getAttribute("aria-label") || b.textContent || "").trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) }; });
          });
          if (!pie || pie.length < 2) fallas.push(`${vista} · el pie del menú tiene los botones de tema e idioma (hoy ${JSON.stringify(pie)})`);
          else for (const b of pie) if (b.w < 44 || b.h < 44) fallas.push(`${vista} · «${b.nombre}» mide ${b.w} × ${b.h}`);
        } finally { await a.cerrar(); }
      });
    }
  });
  assert.deepEqual(fallas, [], `M2 · tema e idioma de 44 × 44:\n${fallas.join("\n")}`);
});

test("el menú de escritorio entra entero, sin scroll propio, a 1280 × 674, 1280 × 720, 1366 × 768 y 1920 × 945", async () => {
  const fallas: string[] = [];
  await conCrm(async (crm) => {
    for (const [width, height] of [[1280, 674], [1280, 720], [1366, 768], [1920, 945]]) {
      await paso(fallas, `${width} × ${height}`, async () => {
        const a = await crm.abrir({ tam: { width, height } });
        try {
          const r = await a.page.evaluate(() => {
            const nav = document.querySelector("aside nav") as HTMLElement | null;
            if (!nav) return null;
            const ultima = [...nav.querySelectorAll("button")].pop()!.getBoundingClientRect();
            return { scroll: nav.scrollHeight, alto: nav.clientHeight, ultimaAbajo: Math.round(ultima.bottom), ventana: innerHeight };
          });
          if (!r) fallas.push(`${width} × ${height} · el menú (aside nav)`);
          else if (r.scroll > r.alto + 1 || r.ultimaAbajo > r.ventana) fallas.push(`${width} × ${height} · el menú tiene scroll propio (${r.scroll} > ${r.alto}; la última entrada termina en ${r.ultimaAbajo} de ${r.ventana})`);
        } finally { await a.cerrar(); }
      });
    }
  });
  assert.deepEqual(fallas, [], `M3 · el menú de escritorio entra entero:\n${fallas.join("\n")}`);
});

test("a 1280 el botón de accesibilidad está dentro del encabezado y no tapa ningún control", async () => {
  const fallas: string[] = [];
  await conCrm(async (crm) => {
    await paso(fallas, "1280", async () => {
      const a = await crm.abrir({ vista: "escritorio" });
      try {
        for (const k of ["overview", "missions", "customers"] as const) {
          await a.irA(k);
          const r = await a.page.evaluate(() => {
            const t = document.querySelector(".a11y-trigger") as HTMLElement | null;
            if (!t) return null;
            const q = t.getBoundingClientRect();
            const dentro = (x: DOMRect) => q.left >= x.left - 1 && q.right <= x.right + 1 && q.top >= x.top - 1 && q.bottom <= x.bottom + 1;
            const encabezados = [...document.querySelectorAll("#admin-content header, header")].filter((h) => h.getBoundingClientRect().width > 0);
            const cruza = (x: DOMRect) => x.left < q.right && x.right > q.left && x.top < q.bottom && x.bottom > q.top;
            const tapados = [...document.querySelectorAll("button, a[href], input, select, textarea, [role=button], [role=tab]")].filter((e) => e !== t && !t.contains(e) && !e.contains(t) && e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility !== "hidden" && cruza(e.getBoundingClientRect())).map((e) => (e.getAttribute("aria-label") || e.textContent || e.tagName).trim().slice(0, 30));
            return { enEncabezado: encabezados.some((h) => dentro(h.getBoundingClientRect())), tapados, donde: `${Math.round(q.left)},${Math.round(q.top)}` };
          });
          if (!r) { fallas.push(`${k} · hay botón de accesibilidad (.a11y-trigger)`); continue; }
          if (!r.enEncabezado) fallas.push(`${k} · el botón de accesibilidad está dentro del encabezado (está en ${r.donde})`);
          if (r.tapados.length) fallas.push(`${k} · el botón de accesibilidad tapa ${r.tapados.join(", ")}`);
        }
      } finally { await a.cerrar(); }
    });
  });
  assert.deepEqual(fallas, [], `M4 · el botón de accesibilidad:\n${fallas.join("\n")}`);
});

test("un turno de un servicio con precio 0 no ofrece «סמן כשולם» y dice «ללא עלות» (en «Free», ru «Бесплатно», ar «بلا تكلفة»)", async () => {
  const fallas: string[] = [];
  const GRATIS: Record<Idioma, string> = { he: "ללא עלות", en: "Free", ru: "Бесплатно", ar: "بلا تكلفة" };
  // «סמן כשולם» y sus pares del prototipo 1 (`crm03/textos.ts`): en «Mark as paid», ru «Оплата», ar «تسجيل الدفع».
  const COBRAR = /סמן כשולם|Mark as paid|Оплата|تسجيل الدفع/;
  await conCrm(async (crm) => {
    for (const idioma of ["he", "en", "ru", "ar"] as Idioma[]) for (const vista of ["telefono", "escritorio"] as Vista[]) {
      await paso(fallas, `${idioma} ${vista}`, async () => {
        const a = await crm.abrir({ vista, idioma, extra: true });
        try {
          await a.irA("missions");
          const r = await a.page.evaluate(() => {
            // La tarjeta (o la fila) del turno t11: «אור» a las 13:00.
            const hojas = [...document.querySelectorAll("#admin-content *")].filter((e) => !e.closest("#admin-content > aside") && e.children.length === 0 && (e.textContent ?? "").trim() === "אור" && e.getBoundingClientRect().width > 0);
            for (const h of hojas) for (let p = h.parentElement; p && p.id !== "admin-content"; p = p.parentElement) {
              if (/13:00/.test((p as HTMLElement).innerText) && p.querySelectorAll("button").length) return { texto: (p as HTMLElement).innerText, botones: [...p.querySelectorAll("button")].map((b) => (b.textContent || b.getAttribute("aria-label") || "").trim()) };
            }
            return null;
          });
          if (!r) { fallas.push(`${idioma} ${vista} · la agenda de hoy muestra el turno de «אור» a las 13:00 (servicio de ₪0)`); return; }
          if (!r.texto.includes(GRATIS[idioma])) fallas.push(`${idioma} ${vista} · el turno de ₪0 dice «${GRATIS[idioma]}»`);
          const cobrar = r.botones.filter((b: string) => COBRAR.test(b));
          if (cobrar.length) fallas.push(`${idioma} ${vista} · el turno de ₪0 no ofrece cobrar (ofrece «${cobrar.join("», «")}»)`);
        } finally { await a.cerrar(); }
      });
    }
  });
  assert.deepEqual(fallas, [], `M5 · el servicio sin precio:\n${fallas.join("\n")}`);
});

test("un turno de 15 minutos en las vistas semana y día mide al menos 22 px de alto y su nombre se ve entero; la hora queda en el nombre accesible", async () => {
  const fallas: string[] = [];
  await conCrm(async (crm) => {
    for (const [vista, cuales] of [["escritorio", [1, 2]], ["telefono", [2]]] as [Vista, (1 | 2)[]][]) {
      await paso(fallas, vista, async () => {
        const a = await crm.abrir({ vista, extra: true });
        try {
          await a.irA("missions");
          for (const c of cuales) {
            const nombreVista = c === 1 ? "semana" : "día";
            if (!(await vistaCalendario(a.page, c))) { fallas.push(`${vista} · Turnos tiene la vista ${nombreVista}`); continue; }
            const r = await a.page.evaluate(() => {
              const b = [...document.querySelectorAll('[data-turno="t11"]')].find((x) => x.getBoundingClientRect().width > 0) as HTMLElement | undefined;
              if (!b) return null;
              const q = b.getBoundingClientRect();
              const n = [...b.querySelectorAll("*")].find((e) => e.children.length === 0 && (e.textContent ?? "").trim() === "אור") as HTMLElement | undefined;
              const nq = n?.getBoundingClientRect();
              const entero = !!n && !!nq && nq.height > 0 && n.scrollWidth <= n.clientWidth + 1 && nq.bottom <= q.bottom + 1 && nq.top >= q.top - 1 && getComputedStyle(n).visibility !== "hidden";
              return { alto: Math.round(q.height * 10) / 10, entero, nombre: `${b.getAttribute("aria-label") ?? ""} ${b.getAttribute("title") ?? ""}` };
            });
            if (!r) { fallas.push(`${vista} ${nombreVista} · se ve el turno de 15 min (data-turno="t11")`); continue; }
            if (r.alto < 22) fallas.push(`${vista} ${nombreVista} · el turno de 15 min mide ${r.alto} px de alto`);
            if (!r.entero) fallas.push(`${vista} ${nombreVista} · el nombre «אור» se ve entero en el turno de 15 min`);
            if (!/13:00/.test(r.nombre)) fallas.push(`${vista} ${nombreVista} · la hora 13:00 está en el nombre accesible del turno («${r.nombre.trim()}»)`);
          }
        } finally { await a.cerrar(); }
      });
    }
  });
  assert.deepEqual(fallas, [], `M6 · el turno corto:\n${fallas.join("\n")}`);
});

test("a 390 la semana es una vista de conjunto: tocar cualquier punto de un día abre ese día y no queda ningún control de menos de 44 × 44 en la semana", async () => {
  const fallas: string[] = [];
  const DEL_DIA = ["t1", "t2", "t3", "t4", "t5"];
  const turnosVisibles = (page: any) => page.evaluate(() => [...new Set([...document.querySelectorAll("[data-turno]")].filter((x) => x.getBoundingClientRect().width > 0).map((x) => x.getAttribute("data-turno")))]);
  await conCrm(async (crm) => {
    await paso(fallas, "390", async () => {
      const a = await crm.abrir({ vista: "telefono" });
      try {
        await a.irA("missions");
        if (!(await vistaCalendario(a.page, 1))) { fallas.push("390 · Turnos tiene la vista semana"); return; }
        const chicos = (await medirPantalla(a.page)).chicos;
        if (chicos.length) fallas.push(`390 · en la semana ningún control mide menos de 44 × 44 (${chicos.length}: ${chicos.slice(0, 3).join("; ")})`);
        const antes: string[] = await turnosVisibles(a.page);
        if (!antes.includes("t7")) fallas.push(`390 · la semana muestra los turnos de la semana (sin t7 del 13: ${antes.join(", ")})`);
        // Dos puntos del jueves 15: un lugar vacío (la fila de las 20:00) y encima de un turno (t3).
        const puntos = await a.page.evaluate(() => {
          const t1 = document.querySelector('[data-turno="t1"]')?.getBoundingClientRect();
          const fila = [...document.querySelectorAll('[data-hora="20:00"]')].find((x) => x.getBoundingClientRect().width > 0)?.getBoundingClientRect();
          const t3 = document.querySelector('[data-turno="t3"]')?.getBoundingClientRect();
          if (!t1 || !fila || !t3) return null;
          return [{ que: "un lugar vacío del jueves", x: t1.left + t1.width / 2, y: fila.top + fila.height / 2 }, { que: "un turno del jueves", x: t3.left + t3.width / 2, y: t3.top + t3.height / 2 }];
        });
        if (!puntos) { fallas.push("390 · la semana tiene los turnos t1 y t3 y la fila de las 20:00"); return; }
        for (const p of puntos) {
          await a.page.evaluate(([x, y]: [number, number]) => { const el = document.elementFromPoint(x, y); el?.scrollIntoView({ block: "center" }); }, [p.x, p.y]);
          const pos = await a.page.evaluate(([x0, y0]: [number, number]) => ({ x: x0, y: y0 }), [p.x, p.y]);
          await a.page.mouse.click(pos.x, Math.min(Math.max(pos.y, 5), 839));
          await quieta(a.page);
          const dialogo = await a.page.evaluate(() => [...document.querySelectorAll("[role=dialog]")].some((d) => d.getBoundingClientRect().width > 0));
          const despues: string[] = await turnosVisibles(a.page);
          if (dialogo || !despues.includes("t1") || despues.some((t) => !DEL_DIA.includes(t))) fallas.push(`390 · tocar ${p.que} abre el día 15 (se ven: ${despues.join(", ") || "ninguno"}${dialogo ? "; se abrió un diálogo" : ""})`);
          if (dialogo) { await a.page.keyboard.press("Escape"); await quieta(a.page); }
          await vistaCalendario(a.page, 1);
        }
      } finally { await a.cerrar(); }
    });
  });
  assert.deepEqual(fallas, [], `M7 · la semana del celular:\n${fallas.join("\n")}`);
});

test("el mes desplegable de la agenda tiene días y flechas de 44 × 44 y sus flechas apuntan en el sentido de la lectura", async () => {
  const fallas: string[] = [];
  await conCrm(async (crm) => {
    for (const idioma of ["he", "en"] as Idioma[]) {
      await paso(fallas, idioma, async () => {
        const a = await crm.abrir({ vista: "telefono", idioma });
        try {
          await a.irA("missions");
          const abierto = await a.page.evaluate(() => { const b = [...document.querySelectorAll("#admin-content button[aria-expanded]")].find((x) => x.getBoundingClientRect().width > 0 && !x.closest("#admin-content > aside") && !x.closest("header")) as HTMLElement | undefined; b?.click(); return !!b; });
          await quieta(a.page);
          if (!abierto) { fallas.push(`${idioma} · la agenda tiene el botón del mes (aria-expanded)`); return; }
          const dias = await a.page.evaluate(() => {
            return [...document.querySelectorAll("#admin-content button")].filter((b) => !b.closest("#admin-content > aside") && /^\d{1,2}$/.test((b.textContent ?? "").trim()) && b.getBoundingClientRect().width > 0).map((b) => { const r = b.getBoundingClientRect(); return { t: (b.textContent ?? "").trim(), w: Math.round(r.width), h: Math.round(r.height) }; });
          });
          if (!dias || dias.length < 28) fallas.push(`${idioma} · el mes desplegable muestra los días del mes (${dias?.length ?? 0})`);
          else { const chicos = dias.filter((d: { w: number; h: number }) => d.w < 44 || d.h < 44); if (chicos.length) fallas.push(`${idioma} · ${chicos.length} días del mes miden menos de 44 × 44 (p. ej. ${chicos[0].w} × ${chicos[0].h})`); }
          const ltr = idioma === "en";
          for (const [re, nombre, esperado] of [[SIGUIENTE, "siguiente", ltr ? "derecha" : "izquierda"], [ANTERIOR, "anterior", ltr ? "izquierda" : "derecha"]] as const) {
            const fs = (await flechas(a.page, re, "#admin-content")).filter((f) => !/week|שבוע|недел|أسبوع/i.test(f.nombre));
            if (!fs.length) fallas.push(`${idioma} · el mes desplegable tiene la flecha «${nombre}»`);
            for (const f of fs) {
              if (f.ancho < 44 || f.alto < 44) fallas.push(`${idioma} · la flecha «${f.nombre}» mide ${f.ancho} × ${f.alto}`);
              if (f.sentido !== esperado) fallas.push(`${idioma} · la flecha «${f.nombre}» apunta a la ${f.sentido} (debe: ${esperado})`);
            }
          }
        } finally { await a.cerrar(); }
      });
    }
  });
  assert.deepEqual(fallas, [], `M8 · el mes desplegable:\n${fallas.join("\n")}`);
});

test("cada hueco del calendario tiene un nombre accesible con la fecha y la hora legibles en el idioma del panel («יום חמישי, 15 באוקטובר · 07:00 · תור חדש»), no «2026-10-15 07:00»", async () => {
  const fallas: string[] = [];
  const ESPERADO: Partial<Record<Idioma, (n: string) => boolean>> = { he: (n) => n === "יום חמישי, 15 באוקטובר · 07:00 · תור חדש", en: (n) => n.startsWith("Thursday, October 15th · 07:00 · ") };
  await conCrm(async (crm) => {
    for (const idioma of ["he", "en"] as Idioma[]) {
      await paso(fallas, idioma, async () => {
        const a = await crm.abrir({ vista: "escritorio", idioma });
        try {
          await a.irA("missions");
          for (const [c, nombreVista] of [[1, "semana"], [2, "día"]] as const) {
            if (!(await vistaCalendario(a.page, c))) { fallas.push(`${idioma} · Turnos tiene la vista ${nombreVista}`); continue; }
            const huecos: string[] = await a.page.evaluate(() => [...document.querySelectorAll("#admin-content button[aria-label]")].filter((b) => !b.closest("#admin-content > aside") && !b.closest("[data-turno]") && /\d{2}:\d{2}/.test(b.getAttribute("aria-label") ?? "")).map((b) => b.getAttribute("aria-label")!));
            if (huecos.length < 14) { fallas.push(`${idioma} ${nombreVista} · los huecos del calendario tienen nombre accesible con la hora (${huecos.length})`); continue; }
            const iso = huecos.filter((h) => /\d{4}-\d{2}-\d{2}/.test(h));
            if (iso.length) fallas.push(`${idioma} ${nombreVista} · ${iso.length} huecos se llaman con la fecha en ISO («${iso[0]}»)`);
            if (!huecos.some(ESPERADO[idioma]!)) fallas.push(`${idioma} ${nombreVista} · el hueco del jueves 15 a las 07:00 se llama ${idioma === "he" ? "«יום חמישי, 15 באוקטובר · 07:00 · תור חדש»" : "«Thursday, October 15th · 07:00 · …»"} (p. ej. hoy «${huecos.find((h) => /07:00/.test(h)) ?? huecos[0]}»)`);
          }
        } finally { await a.cerrar(); }
      });
    }
  });
  assert.deepEqual(fallas, [], `M9 · los huecos del calendario:\n${fallas.join("\n")}`);
});

test("el panel tiene un solo `<main>`, Clientes no anida otro, y a 1280 el título de la pestaña es un `<h1>`", async () => {
  const fallas: string[] = [];
  await conCrm(async (crm) => {
    for (const vista of ["telefono", "escritorio"] as Vista[]) {
      await paso(fallas, vista, async () => {
        const a = await crm.abrir({ vista });
        try {
          for (const k of CLAVES) {
            await a.irA(k);
            const r = await a.page.evaluate(() => {
              const actual = document.querySelector('aside nav button[aria-current="page"]');
              const titulo = (actual?.textContent ?? "").replace(/\d+/g, "").trim();
              const h1s = [...document.querySelectorAll("h1")].filter((h) => h.getBoundingClientRect().width > 0).map((h) => (h.textContent ?? "").trim());
              return { mains: document.querySelectorAll("main").length, anidado: !!document.querySelector("main main"), titulo, h1s };
            });
            if (r.mains !== 1) fallas.push(`${vista} ${k} · el panel tiene ${r.mains} <main>`);
            if (r.anidado) fallas.push(`${vista} ${k} · un <main> anidado`);
            if (vista === "escritorio" && !r.h1s.includes(r.titulo)) fallas.push(`1280 ${k} · el título «${r.titulo}» es un <h1> (h1 visibles: ${JSON.stringify(r.h1s)})`);
          }
        } finally { await a.cerrar(); }
      });
    }
  });
  assert.deepEqual(fallas, [], `M10 · <main> y <h1>:\n${fallas.join("\n")}`);
});
