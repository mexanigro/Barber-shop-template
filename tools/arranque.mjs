// HOOK SessionStart. Lo primero que ve el modelo: rama, HEAD vs origin/main, commits sin push,
// archivos sucios, fila abierta de PLAN.md y últimas decisiones de bloque-04. Si hay suciedad o
// commits sin push lo dice en ROJO y exige resolverlo antes de avanzar (regla de arranque, CLAUDE.md).
// Nunca falla: si algo no se puede leer, lo dice y sigue (exit 0 siempre, o no entra al contexto).
import { existsSync, readFileSync } from "node:fs";
import { BLOQUE_DIR, ROOT, ROJO, estado, filaAbierta, git, ultimasDecisiones } from "./_git.mjs";

const out = [];
try {
  let fetch = "ok";
  try { git(["fetch", "-q"], ROOT, 15000); } catch (e) { fetch = `FALLÓ (${String(e.message).split("\n")[0]}) — origin/main puede estar viejo`; }
  const s = estado();
  out.push(`ARRANQUE · ${ROOT}`);
  out.push(`rama ${s.rama} · HEAD ${s.head.slice(0, 7)} · fetch ${fetch} · detrás de origin: ${s.detras} · sin push: ${s.sinPush.length} · sucios: ${s.sucios.length}`);
  if (s.sinPush.length) out.push(ROJO(`ROJO · commits sin push:\n  ${s.sinPush.join("\n  ")}`));
  if (s.sucios.length) out.push(ROJO(`ROJO · archivos sucios:\n  ${s.sucios.join("\n  ")}`));
  if (s.sinPush.length || s.sucios.length) {
    out.push(ROJO("ROJO · NO SE AVANZA con suciedad o commits sin push: se resuelven PRIMERO (commit + push, o revert). Regla de arranque en CLAUDE.md."));
  }
  try {
    const f = filaAbierta();
    out.push(f ? `PLAN.md fila abierta · ${f.bloque} · ${f.estado.slice(0, 400)}` : "PLAN.md: ninguna fila abierta (todas cerradas)");
  } catch (e) { out.push(`PLAN.md: no se pudo leer (${e.message})`); }
  const d = ultimasDecisiones();
  if (d.length) out.push(`bloque-04 · últimas decisiones:\n  ${d.join("\n  ")}`);
  // Sólo en T (regla 8 ampliada): las reglas generales de diseño, antes de tocar diseño.
  const reglas = [`${ROOT}/docs/DISENO-REGLAS.md`, `${BLOQUE_DIR}/DISENO-REGLAS.md`].find(existsSync);
  if (reglas && existsSync(`${ROOT}/src/config/presets/barberia.he.ts`)) {
    const titulos = readFileSync(reglas, "utf8").match(/^### R\d+ .*$/gm) ?? [];
    out.push(`DISENO-REGLAS (${reglas}) · leer entero antes de tocar diseño:\n  ${titulos.map((t) => t.slice(4)).join("\n  ")}`);
  }
} catch (e) {
  out.push(`ARRANQUE: error (${e.message}) — verificar a mano: git fetch && git status -sb`);
}
console.log(out.join("\n"));
