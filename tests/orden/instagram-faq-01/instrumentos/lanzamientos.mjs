// INSTAGRAM-FAQ-01 · lanzamientos (sesión A, 2026-10-02): se carga con `node --import <este archivo> scripts/qa-regresion-seis.mjs …` y
// anota en QA_LOG (una línea JSON por evento) cada Chromium que el script lanza y cierra, y cada página que abre contra el servidor del
// nicho (http://localhost:3000/): {ev: "launch" | "close" | "goto", navegador: n, url?}. No cambia lo que el script hace: envuelve
// `chromium.launch` del playwright del árbol (el mismo objeto que importa el script) y deja pasar todo. Sólo escribe en QA_LOG.
import { appendFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
const LOG = process.env.QA_LOG;
if (!LOG) throw new Error("lanzamientos.mjs: falta QA_LOG");
const anotar = (x) => appendFileSync(LOG, JSON.stringify(x) + "\n");
const require = createRequire(join(process.cwd(), "package.json"));
const { chromium } = require("playwright");
const lanzar = chromium.launch.bind(chromium);
let n = 0;
chromium.launch = async (...args) => {
  const navegador = ++n;
  const b = await lanzar(...args);
  anotar({ ev: "launch", navegador });
  const cerrar = b.close.bind(b);
  b.close = async (...a) => { anotar({ ev: "close", navegador }); return cerrar(...a); };
  const nuevoContexto = b.newContext.bind(b);
  b.newContext = async (...a) => {
    const ctx = await nuevoContexto(...a);
    const nuevaPagina = ctx.newPage.bind(ctx);
    ctx.newPage = async (...p) => {
      const pg = await nuevaPagina(...p);
      const ir = pg.goto.bind(pg);
      pg.goto = async (u, ...o) => { if (/^http:\/\/localhost:3000\//.test(String(u))) anotar({ ev: "goto", navegador, url: String(u) }); return ir(u, ...o); };
      return pg;
    };
    return ctx;
  };
  return b;
};
