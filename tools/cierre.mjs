// HOOK Stop. No deja cerrar el turno (exit 2) si hay archivos sucios sin commit o commits sin push EN T O EN H
// (HIGIENE-02, 2026-09-19: un trabajo que toca ambos no cierra con uno limpio y el otro sucio), o si la fila abierta
// de PLAN.md § Estado no cita el último commit de este repo (y el del hermano, si su HEAD se movió desde la última
// cita). Imprime qué falta y en cuál. Hermano ausente en disco: se declara y se sigue con el propio.
// Falla cerrado: si no puede verificar, bloquea. No respeta stop_hook_active a propósito: el turno
// se cierra cuando el estado está limpio, no cuando el modelo insiste.
import { ROOT, estados, filaAbierta, filaCita, headMovido } from "./_git.mjs";

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
  console.error(`CIERRE BLOQUEADO · ${ROOT} (revisa T y H)\n- ${faltas.join("\n- ")}\nResolver (commit + push + PLAN.md § Estado, en el repo que corresponda) antes de cerrar el turno.`);
  process.exit(2);
}
