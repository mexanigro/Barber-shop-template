// Utilidades de la orden VERDAD-04 (sesión A, 2026-09-21). Reusa de ../verdad-03/_util.ts y ../verdad-02/_util.ts lo que no cambia
// (repos temporales con nombre real, spawnSync, hoja/test mínimos, par T/H, cierre por entorno, lectura de CLAUDE.md). Caja negra: nada
// importa tools/*. Toda carpeta temporal se crea con `conTemporal()` (prefijo «verdad-04-») y se borra en `finally`, también si el test falla.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { NODE, ROOT, borrar, type Salida } from "../verdad-02/_util.ts";

export { NODE, NOMBRE, OTRO, ROOT, SOY, bloqueContrato, borrar, candado, correr, git, hojaMinima, planTemporal, repoTemporal, rojoVerde, seccionPuertas, testMinimo, transcriptEnLinea, usosDe } from "../verdad-02/_util.ts";
export { cierre, par, rojoVerdeTodas } from "../verdad-03/_util.ts";
export type { Repo, Salida, Uso } from "../verdad-02/_util.ts";

export const FIXTURES = resolve(import.meta.dirname, "fixtures");

/** Carpeta temporal de esta orden: prefijo «verdad-04-» en os.tmpdir() (rojo-verde mide los restos por ese prefijo, VERDAD-03 D1). */
export function carpetaTemporal(): string {
  return mkdtempSync(join(tmpdir(), "verdad-04-"));
}

/** Crea una carpeta temporal, corre `fn` y la borra SIEMPRE, también si `fn` lanza (el test falla y no deja restos). */
export function conTemporal<T>(fn: (base: string) => T): T {
  const base = carpetaTemporal();
  try { return fn(base); } finally { borrar(base); }
}

/** Sólo pisa fs y console; nada de PLAN/roots/transcript/candado por la sesión que corre los tests (como `correr` de VERDAD-02). */
const ENV_PROPIO = ["HIGIENE_ROOTS", "HIGIENE_PLAN", "HIGIENE_TRANSCRIPT", "HIGIENE_PERMITIR_TESTS", "HIGIENE_PERMITIR_FLOTA"];

/** Como `correr`, para corridas largas (las copias promovidas, `--orden verdad-02`): 10 minutos y 64 MB de salida. */
export function correrLargo(args: string[], o: { cwd?: string; env?: Record<string, string | undefined> } = {}): Salida {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const k of ENV_PROPIO) delete env[k];
  for (const [k, v] of Object.entries(o.env ?? {})) { if (v === undefined) delete env[k]; else env[k] = v; }
  const r = spawnSync(NODE, args, { cwd: o.cwd ?? ROOT, env, input: "", encoding: "utf8", timeout: 600000, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  const stdout = r.stdout ?? "", stderr = r.stderr ?? "";
  return { status: r.status, stdout, stderr, out: `${stdout}\n${stderr}` };
}

/** Raíces reales en sus grafías (misma técnica que VERDAD-02/03): barra invertida escapada n veces, `C:/…` y `/c/…`. */
const REAL = {
  T: { esc: /C:((?:\\\\)+)Users\1liama\1Desktop\1Nichos\1Barber-shop-template-main/gi, win: /C:\/Users\/liama\/Desktop\/Nichos\/Barber-shop-template-main/gi, msys: /\/c\/Users\/liama\/Desktop\/Nichos\/Barber-shop-template-main/gi },
  H: { esc: /C:((?:\\\\)+)Users\1liama\1Desktop\1Nichos-hub/gi, win: /C:\/Users\/liama\/Desktop\/Nichos-hub/gi, msys: /\/c\/Users\/liama\/Desktop\/Nichos-hub/gi },
};
const RESTO = [/desktop[\\/]+nichos-hub/i, /desktop[\\/]+nichos[\\/]+barber-shop-template-main/i];

/** Copia del fixture real del revisor (tests/orden/verdad-04/fixtures/transcript-revisor-2.jsonl) con las raíces T/H reubicadas a los repos temporales. */
export function transcriptRevisorReubicado(archivo: string, tempT: string, tempH: string): string {
  let texto = readFileSync(join(FIXTURES, "transcript-revisor-2.jsonl"), "utf8");
  for (const [et, dir] of [["T", tempT], ["H", tempH]] as const) {
    const segmentos = dir.replace(/\//g, "\\").split("\\");
    const win = segmentos.join("/");
    const msys = win.replace(/^([A-Za-z]):\//, (_, l) => `/${l.toLowerCase()}/`);
    texto = texto.replace(REAL[et].esc, (_, sep) => segmentos.join(sep)).replace(REAL[et].win, win).replace(REAL[et].msys, msys);
  }
  const resto = RESTO.find((re) => re.test(texto));
  if (resto) throw new Error(`quedó una raíz real sin reubicar en transcript-revisor-2.jsonl: ${resto}`);
  writeFileSync(archivo, texto);
  return archivo;
}
