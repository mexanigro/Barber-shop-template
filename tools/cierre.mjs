// HOOK Stop. No deja cerrar el turno (exit 2) si hay archivos sucios sin commit, commits sin push,
// o la fila abierta de PLAN.md § Estado no cita el último commit de este repo. Imprime qué falta.
// Falla cerrado: si no puede verificar, bloquea. No respeta stop_hook_active a propósito: el turno
// se cierra cuando el estado está limpio, no cuando el modelo insiste.
import { ROOT, estado, filaAbierta, filaCita } from "./_git.mjs";

const faltas = [];
try {
  const s = estado();
  if (s.sucios.length) faltas.push(`archivos sucios sin commit (${s.sucios.length}):\n  ${s.sucios.join("\n  ")}`);
  if (s.sinPush.length) faltas.push(`commits sin push (${s.sinPush.length}):\n  ${s.sinPush.join("\n  ")}`);
  let fila = null;
  try { fila = filaAbierta(); } catch (e) { faltas.push(`PLAN.md ilegible (${e.message})`); }
  if (fila && !filaCita(fila, s.head)) faltas.push(`PLAN.md § Estado · fila "${fila.bloque}" no cita el commit ${s.head.slice(0, 7)} de ${ROOT}`);
} catch (e) {
  faltas.push(`no se pudo verificar el estado (${e.message})`);
}
if (faltas.length) {
  console.error(`CIERRE BLOQUEADO · ${ROOT}\n- ${faltas.join("\n- ")}\nResolver (commit + push + PLAN.md § Estado) antes de cerrar el turno.`);
  process.exit(2);
}
