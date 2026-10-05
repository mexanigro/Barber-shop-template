// AUDITORIA-01 · B1 · precarga (`node --import <este archivo> --test tests/modo-paleta.test.ts`): toda página que abra ese test deja
// SIN CONTESTAR la petición del vídeo del hero que sirve Firebase Storage (`…/media/hero/<nombre>.mp4|webm`). Ningún tiempo: la petición
// queda abierta hasta que se cierra el contexto. Medido por A (2026-10-04): con los fixtures A y C, `waitUntil: "networkidle"` espera a
// que termine de bajar `hero-v.mp4` (~6 MB) de Storage, que la afirmación del modo no usa; su duración es la de la red de ese momento.
// No toca el test: envuelve `chromium.launch` del mismo módulo `playwright` que importa el test (una sola instancia por proceso).
import { chromium } from "playwright";

const VIDEO = /media(?:%2F|\/)hero(?:%2F|\/)[^?#]*\.(?:mp4|webm)(?:[?#]|$)/i;
const lanzar = chromium.launch.bind(chromium);
chromium.launch = async (...a) => {
  const navegador = await lanzar(...a);
  const nuevo = navegador.newContext.bind(navegador);
  navegador.newContext = async (...o) => {
    const ctx = await nuevo(...o);
    await ctx.route(VIDEO, (ruta) => { process.stderr.write(`SIN-VIDEO retenida ${ruta.request().url().slice(0, 160)}\n`); });
    return ctx;
  };
  return navegador;
};
