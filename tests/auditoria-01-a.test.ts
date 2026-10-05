// AUDITORIA-01 · copia promovida (ALTA-IDIOMAS-01, 2026-10-05, D-244) de tests/orden/auditoria-01/a.test.ts: A1 (services v6 conserva sus tarjetas al repintarse), en
// `test:browser` (abre Chromium, en este proceso o como proceso hijo: D-57, D-230). La orden quedó aprobada por Liam el 2026-10-05
// (T 907f5dc · H 76b1535) y su carpeta está congelada; esto es la copia editable que corre `npm test`. Recorte: entera (ninguna de
// sus afirmaciones sale a las webs desplegadas).
// AUDITORIA-01 · A1 (T) · services v6 conserva sus tarjetas cuando la página se repinta. Sesión A (2026-10-04): test rojo.
//
// La caída de `tests/services-v6.test.ts:133` («locator.scrollIntoViewIfNeeded: Element is not attached to the DOM», dos veces dentro
// de la suite, 5 de 5 corrida sola), medida por A (`C:/t/au01/remonta.mjs`, MutationObserver desde el arranque, 3 de 3 cargas): las
// `.svc-card` de la home se DESMONTAN Y VUELVEN A MONTAR enteras dos veces en cada carga, cuando el splash empieza a irse y cuando se
// va (`App.tsx:316`, `setSplashExiting`; `:324`, `setShowSplash(false)`). La causa: `services-v6.tsx` declara `Card` (y `Price`)
// DENTRO de su render, así que cada vez que App se repinta React ve un tipo de componente nuevo y reemplaza todos sus nodos. Si el
// test toma la tarjeta justo antes de un repintado, la tarjeta que tiene ya no está en el documento. Mismo mecanismo, defecto de la
// página (`C:/t/au01/foco.mjs`): Enter sobre una tarjeta abre el asistente (`showBooking`, estado de App) y Escape lo cierra;
// `useModalA11y` devuelve el foco a la tarjeta que lo abrió, pero ese nodo ya no existe y el foco cae en <body> (WCAG 2.4.3).
// Liam (2026-10-04): se arregla en producción (B saca `Card` y `Price` del render SIN cambiar el HTML que pintan); el rojo es
// determinista —un repintado forzado y el foco tras Enter/Escape—, nada que dependa de en qué momento se va el splash.
// Cómo es determinista: se espera la CONDICIÓN «el splash ya no está y hay tarjetas» (no un tiempo), y el repintado lo provoca el test
// abriendo y cerrando el asistente con el botón del hero, que no es una tarjeta (dos cambios de estado de App).
// Sólo en T (inciso n). No escribe nada: dos Vite en este proceso (fixtures A y C), un Chromium y, para el HTML, un clon del rojo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ROOT, conPlantillas, conTemporalAsync, clonDe, correrNode, entornoLimpio, instrumento, quitarEnlace, rojoDeEstaOrden, PLANTILLAS } from "./orden/auditoria-01/_comun.ts";

const ASISTENTE = '[data-testid="booking-wizard"]';
/** La condición de arranque: el splash (`fixed` con `z-[200]`) ya no está y la sección pintó sus tarjetas y el botón del hero. */
const LISTA = `!document.querySelector('.fixed[class~="z-[200]"]') && document.querySelectorAll("#services .svc-card").length > 1 && !!document.querySelector("#hero button")`;

test("services v6 conserva sus tarjetas cuando la página se repinta: en la página real de las plantillas A y C a 375 con menos movimiento, ya ido el splash, abrir y cerrar el asistente con el botón del hero deja en el documento las mismas `.svc-card` —los mismos nodos— y la misma `.svc-carousel`; con el foco en una tarjeta de reserva, Enter abre el asistente y Escape lo cierra y devuelve el foco a esa misma tarjeta; y el HTML que pinta `ServicesV6` es el mismo que en el commit rojo de esta orden", async () => {
  const { chromium } = await import("playwright");
  await conTemporalAsync(async (base) => {
    await conPlantillas(base, async (urls) => {
      const navegador = await chromium.launch();
      try {
        for (const p of Object.keys(PLANTILLAS) as ("a" | "c")[]) {
          const ctx = await navegador.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
          try {
            const pg = await ctx.newPage();
            await pg.goto(urls[p], { waitUntil: "domcontentloaded" });
            await pg.waitForFunction(LISTA, null, { timeout: 120000 });

            // (1) Repintado forzado: el asistente se abre y se cierra con el botón del hero. Hoy: ninguna tarjeta sobrevive.
            await pg.evaluate(() => { const w = window as any; w.__tarjetas = [...document.querySelectorAll("#services .svc-card")]; w.__pista = document.querySelector("#services .svc-carousel"); });
            await pg.locator("#hero button").first().click();
            await pg.waitForSelector(ASISTENTE);
            await pg.keyboard.press("Escape");
            await pg.waitForFunction(`!document.querySelector('${ASISTENTE}')`);
            const r = await pg.evaluate(() => { const w = window as any; const ahora = [...document.querySelectorAll("#services .svc-card")]; return { antes: w.__tarjetas.length, vivas: w.__tarjetas.filter((t: Element) => t.isConnected && ahora.includes(t)).length, ahora: ahora.length, pista: w.__pista.isConnected }; });
            assert.ok(r.antes > 1, `precondición (${p}): la sección pintó tarjetas (${r.antes})`);
            assert.equal(r.pista, true, `control (${p}): la .svc-carousel sigue siendo el mismo nodo`);
            assert.equal(r.vivas, r.antes, `plantilla ${p}: tras abrir y cerrar el asistente con el botón del hero, ${r.vivas} de ${r.antes} tarjetas siguen siendo el mismo nodo (las otras se desmontaron y se volvieron a montar: ${r.ahora} nuevas)`);

            // (2) El foco vuelve a la tarjeta que abrió el asistente.
            const reserva = pg.locator("#services button.svc-card").first();
            await reserva.focus();
            await pg.evaluate(() => { (window as any).__origen = document.activeElement; });
            assert.equal(await pg.evaluate(() => (document.activeElement as Element | null)?.classList.contains("svc-card") ?? false), true, `precondición (${p}): el foco está en una tarjeta de reserva`);
            await pg.keyboard.press("Enter");
            await pg.waitForSelector(ASISTENTE);
            await pg.keyboard.press("Escape");
            await pg.waitForFunction(`!document.querySelector('${ASISTENTE}')`);
            const f = await pg.evaluate(() => { const o = (window as any).__origen as HTMLElement; const a = document.activeElement as HTMLElement | null; return { misma: a === o, conectada: o.isConnected, activo: a ? `${a.tagName.toLowerCase()}.${String(a.className).split(" ")[0]}` : "null" }; });
            assert.ok(f.misma && f.conectada, `plantilla ${p}: Escape devuelve el foco a la tarjeta que abrió el asistente (la tarjeta ${f.conectada ? "sigue" : "ya no está"} en el documento; el foco está en ${f.activo})`);
          } finally { await ctx.close(); }
        }
      } finally { await navegador.close(); }
    });

    // (3) El HTML de `ServicesV6` (renderToString, config por defecto) es el mismo en el commit rojo de esta orden y en HEAD.
    const rojo = rojoDeEstaOrden();
    assert.ok(rojo, "precondición: hay un commit que añade tests/orden/auditoria-01/HOJA.md");
    const html = (raiz: string) => {
      const s = correrNode(["--experimental-strip-types", instrumento("html-servicios.ts"), raiz], { cwd: ROOT, env: entornoLimpio(), minutos: 5 });
      assert.equal(s.status, 0, `html-servicios.ts sobre ${raiz} salió ${s.status}\n${s.out.slice(-1500)}`);
      return (JSON.parse(s.stdout.trim().split(/\r?\n/).pop() ?? "{}") as { html: string }).html;
    };
    const clon = clonDe(base, "rojo", rojo);
    try {
      const enRojo = html(clon), enHead = html(ROOT);
      assert.ok(enHead.includes("svc-card"), "precondición: el HTML de HEAD trae tarjetas");
      assert.equal(enHead, enRojo, "ServicesV6 pinta el mismo HTML que en el commit rojo de esta orden");
    } finally { quitarEnlace(clon); }
  });
});
