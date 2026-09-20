// Utilidades de la orden VERDAD-03 (sesión A, 2026-09-20). Reusa de ../verdad-02/_util.ts lo que no cambia (repos temporales con
// nombre real, spawnSync, hoja/test mínimos, transcripts en línea y reubicados, lectura de CLAUDE.md). Caja negra: nada importa tools/*.
// Toda carpeta temporal se crea con `conTemporal()` y se borra en `finally`, también cuando el test falla (D1 lo exige mecánicamente).
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { borrar, correr, planTemporal, repoTemporal, type Repo, type Salida } from "../verdad-02/_util.ts";

export { NODE, NOMBRE, OTRO, ROOT, SOY, bloqueContrato, borrar, candado, correr, git, hojaMinima, repoTemporal, rojoVerde, seccionPuertas, testMinimo, transcriptEnLinea, transcriptReubicado, usosDe } from "../verdad-02/_util.ts";
export type { Repo, Salida, Uso } from "../verdad-02/_util.ts";

export const FIXTURES = resolve(import.meta.dirname, "fixtures");

/** Carpeta temporal de esta orden: prefijo «verdad-03-» en os.tmpdir() (rojo-verde mide los restos por ese prefijo, D1). */
export function carpetaTemporal(): string {
  return mkdtempSync(join(tmpdir(), "verdad-03-"));
}

/** Crea una carpeta temporal, corre `fn` y la borra SIEMPRE, también si `fn` lanza (el test falla y no deja restos). */
export function conTemporal<T>(fn: (base: string) => T): T {
  const base = carpetaTemporal();
  try { return fn(base); } finally { borrar(base); }
}

/** `node tools/verdad/rojo-verde.mjs --todas --repo <repo>` del repo real sobre otro repo. */
export function rojoVerdeTodas(repo: string): Salida {
  return correr(["tools/verdad/rojo-verde.mjs", "--todas", "--repo", repo]);
}

/** Par temporal T/H limpio, con upstream y PLAN que cita los dos HEAD (como `par()` de VERDAD-02, pero dentro de una base dada). */
export function par(base: string): { T: Repo; H: Repo; plan: string; roots: [string, string] } {
  const T = repoTemporal("T", base), H = repoTemporal("H", base);
  const plan = planTemporal(base, [T.head(), H.head()]);
  return { T, H, plan, roots: [T.dir, H.dir] };
}

/** tools/cierre.mjs del repo real con roots, PLAN y transcript por entorno; `env` añade variables del entorno del hook (C1). */
export function cierre(o: { roots: [string, string]; plan: string; transcript?: string; stdin?: Record<string, unknown>; env?: Record<string, string | undefined> }): Salida {
  return correr(["tools/cierre.mjs"], {
    env: { ...(o.env ?? {}), HIGIENE_ROOTS: `${o.roots[0]};${o.roots[1]}`, HIGIENE_PLAN: o.plan, HIGIENE_TRANSCRIPT: o.transcript },
    input: JSON.stringify(o.stdin ?? { hook_event_name: "Stop" }),
  });
}

/** Raíces reales en sus grafías (misma técnica que VERDAD-02): barra invertida escapada n veces, `C:/…` y `/c/…`. */
const REAL = {
  T: { esc: /C:((?:\\\\)+)Users\1liama\1Desktop\1Nichos\1Barber-shop-template-main/gi, win: /C:\/Users\/liama\/Desktop\/Nichos\/Barber-shop-template-main/gi, msys: /\/c\/Users\/liama\/Desktop\/Nichos\/Barber-shop-template-main/gi },
  H: { esc: /C:((?:\\\\)+)Users\1liama\1Desktop\1Nichos-hub/gi, win: /C:\/Users\/liama\/Desktop\/Nichos-hub/gi, msys: /\/c\/Users\/liama\/Desktop\/Nichos-hub/gi },
};
const RESTO = [/desktop[\\/]+nichos-hub/i, /desktop[\\/]+nichos[\\/]+barber-shop-template-main/i];

/** Copia del fixture real del revisor (tests/orden/verdad-03/fixtures/transcript-revisor.jsonl) con las raíces T/H reubicadas a los repos temporales. */
export function transcriptRevisorReubicado(archivo: string, tempT: string, tempH: string): string {
  let texto = readFileSync(join(FIXTURES, "transcript-revisor.jsonl"), "utf8");
  for (const [et, dir] of [["T", tempT], ["H", tempH]] as const) {
    const segmentos = dir.replace(/\//g, "\\").split("\\");
    const win = segmentos.join("/");
    const msys = win.replace(/^([A-Za-z]):\//, (_, l) => `/${l.toLowerCase()}/`);
    texto = texto.replace(REAL[et].esc, (_, sep) => segmentos.join(sep)).replace(REAL[et].win, win).replace(REAL[et].msys, msys);
  }
  const resto = RESTO.find((re) => re.test(texto));
  if (resto) throw new Error(`quedó una raíz real sin reubicar en transcript-revisor.jsonl: ${resto}`);
  writeFileSync(archivo, texto);
  return archivo;
}
