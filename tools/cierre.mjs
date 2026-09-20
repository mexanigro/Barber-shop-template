// HOOK Stop. No deja cerrar el turno (exit 2) si hay archivos sucios sin commit o commits sin push EN T O EN H
// (HIGIENE-02, 2026-09-19: un trabajo que toca ambos no cierra con uno limpio y el otro sucio), o si la fila abierta
// de PLAN.md § Estado no cita el último commit de este repo (y el del hermano, si su HEAD se movió desde la última
// cita). Imprime qué falta y en cuál. Hermano ausente en disco: se declara y se sigue con el propio.
// HIGIENE-03 (VERDAD-01, 2026-09-20): distingue por el transcript de la sesión (stdin `transcript_path`, o
// HIGIENE_TRANSCRIPT=<ruta> para las mutaciones) si la sesión ESCRIBIÓ en T/H (Edit/Write/git/shell que muta/subagente)
// → bloquea; si SÓLO LEYÓ → aviso y exit 0 (la suciedad no es suya); sin transcript → bloquea (fail closed).
// Falla cerrado: si no puede verificar, bloquea. No respeta stop_hook_active a propósito: el turno
// se cierra cuando el estado está limpio, no cuando el modelo insiste.
import { readFileSync } from "node:fs";
import { ROOT, ROOTS, estados, filaAbierta, filaCita, headMovido } from "./_git.mjs";
import { escribioEn } from "./_transcript.mjs";

const faltas = [];
try {
  let fila = null;
  try { fila = filaAbierta(); } catch (e) { faltas.push(`PLAN.md ilegible (${e.message})`); }
  for (const s of estados()) {
    if (s.ausente) { console.error(`${s.etiqueta}: hermano no encontrado en ${s.root}: se sigue con el propio`); continue; }
    if (s.error) { faltas.push(`${s.etiqueta}: no se pudo verificar ${s.root} (${s.error})`); continue; }
    if (s.sucios.length) faltas.push(`${s.etiqueta}: archivos sucios sin commit (${s.sucios.length}) en ${s.root}:\n  ${s.sucios.join("\n  ")}`);
    if (s.sinPush.length) faltas.push(`${s.etiqueta}: commits sin push (${s.sinPush.length}) en ${s.root}:\n  ${s.sinPush.join("\n  ")}`);
    const propio = s.root === ROOT;
    if (fila && propio && !filaCita(fila, s.head)) faltas.push(`PLAN.md § Estado · fila "${fila.bloque}" no cita el commit ${s.head.slice(0, 7)} de ${s.etiqueta} (${s.root})`);
    if (fila && !propio && headMovido(fila, s.root, s.head)) faltas.push(`PLAN.md § Estado · fila "${fila.bloque}" cita un commit anterior de ${s.etiqueta} pero no su HEAD ${s.head.slice(0, 7)} (${s.root})`);
  }
} catch (e) {
  faltas.push(`no se pudo verificar el estado (${e.message})`);
}
if (faltas.length) {
  // HIGIENE-03: ¿esta sesión escribió? Sólo una sesión de lectura pura cierra con aviso.
  let transcript = process.env.HIGIENE_TRANSCRIPT || "";
  if (!transcript) { try { transcript = JSON.parse(readFileSync(0, "utf8") || "{}").transcript_path ?? ""; } catch {} }
  const t = escribioEn(transcript, ROOTS);
  if (t.estado === "solo-lectura") {
    console.error(`CIERRE AVISO · ${ROOT} (revisa T y H) · HIGIENE-03: la sesión sólo leyó (${t.detalle}); la suciedad no es suya y no bloquea\n- ${faltas.join("\n- ")}`);
    process.exit(0);
  }
  const motivo = t.estado === "escribio" ? `HIGIENE-03: la sesión escribió (${t.detalle}): ${t.escribio.slice(0, 3).map((e) => `${e.tool} ${e.que}`).join(" · ")}` : `HIGIENE-03: ${t.detalle} → se bloquea (fail closed)`;
  console.error(`CIERRE BLOQUEADO · ${ROOT} (revisa T y H)\n- ${faltas.join("\n- ")}\n- ${motivo}\nResolver (commit + push + PLAN.md § Estado, en el repo que corresponda) antes de cerrar el turno.`);
  process.exit(2);
}
