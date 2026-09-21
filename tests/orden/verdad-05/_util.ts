// Utilidades de la orden VERDAD-05 (sesión A, 2026-09-21). Reusa de ../verdad-02/_util.ts y ../verdad-03/_util.ts lo que no cambia
// (repos temporales con nombre real, spawnSync, par T/H, lectura de CLAUDE.md). Caja negra: nada importa tools/* ni scripts/*; las
// funciones exportadas de la interfaz (comprobarFila, hojas, sinContrato, huecoDe, diffPng) se prueban por `nodeE` en proceso aparte.
// Toda carpeta temporal se crea con `conTemporal()` / `conTemporalAsync()` (prefijo «verdad-05-») y se borra en `finally`, también si
// el test falla. Los sockets (`escuchar`, `conecta`, `puertoLibre`) son de C2: un proceso ajeno en :3000 que recrear no debe matar.
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { type AddressInfo, type Server, connect, createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NODE, ROOT, borrar, type Salida } from "../verdad-02/_util.ts";

export { NODE, NOMBRE, OTRO, ROOT, SOY, bloqueContrato, borrar, correr, git, repoTemporal, seccionPuertas } from "../verdad-02/_util.ts";
export { par } from "../verdad-03/_util.ts";
export type { Repo, Salida } from "../verdad-02/_util.ts";

/** CONTRATOS-HUECOS.md real (BLOQUE_DIR de tools/_git.mjs; los tests de A lo leen con fs, no lo escriben). */
export const BLOQUE_REAL = "C:/Users/liama/Desktop/Nichos/bloque-04";

/** Carpeta temporal de esta orden: prefijo «verdad-05-» en os.tmpdir() (rojo-verde mide los restos por ese prefijo, VERDAD-03 D1). */
export function carpetaTemporal(): string {
  return mkdtempSync(join(tmpdir(), "verdad-05-"));
}

/** Crea una carpeta temporal, corre `fn` y la borra SIEMPRE, también si `fn` lanza (el test falla y no deja restos). */
export function conTemporal<T>(fn: (base: string) => T): T {
  const base = carpetaTemporal();
  try { return fn(base); } finally { borrar(base); }
}

/** Igual que `conTemporal`, para un `fn` asíncrono (el e2e de C1/C2 espera sockets). */
export async function conTemporalAsync<T>(fn: (base: string) => Promise<T>): Promise<T> {
  const base = carpetaTemporal();
  try { return await fn(base); } finally { borrar(base); }
}

/** Sólo pisa fs y console; nada de PLAN/roots/transcript/candado por la sesión que corre los tests (como `correr` de VERDAD-02). */
const ENV_PROPIO = ["HIGIENE_ROOTS", "HIGIENE_PLAN", "HIGIENE_TRANSCRIPT", "HIGIENE_PERMITIR_TESTS", "HIGIENE_PERMITIR_FLOTA", "HIGIENE_BLOQUE"];

/** Como `correr`, para corridas largas (recrear con dos servidores, las copias promovidas, --todas): 10 minutos y 64 MB de salida. */
export function correrLargo(args: string[], o: { cwd?: string; env?: Record<string, string | undefined> } = {}): Salida {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const k of ENV_PROPIO) delete env[k];
  for (const [k, v] of Object.entries(o.env ?? {})) { if (v === undefined) delete env[k]; else env[k] = v; }
  const r = spawnSync(NODE, args, { cwd: o.cwd ?? ROOT, env, input: "", encoding: "utf8", timeout: 600000, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  const stdout = r.stdout ?? "", stderr = r.stderr ?? "";
  return { status: r.status, stdout, stderr, out: `${stdout}\n${stderr}` };
}

/** `node --experimental-strip-types --input-type=module -e <código>` en proceso aparte (cwd = este repo): importa la interfaz sin traerla al test. */
export function nodeE(codigo: string, o: { cwd?: string; env?: Record<string, string | undefined> } = {}): Salida {
  return correrLargo(["--experimental-strip-types", "--input-type=module", "-e", codigo], o);
}

/** Última línea no vacía de stdout parseada como JSON (lo que imprime el `console.log(JSON.stringify(...))` final de un `nodeE`). */
export function ultimoJson(salida: Salida): unknown {
  const linea = salida.stdout.split(/\r?\n/).filter((l) => l.trim()).pop();
  if (!linea) throw new Error(`sin salida JSON (exit ${salida.status})\n${salida.out.slice(-2000)}`);
  return JSON.parse(linea);
}

/** Puerto TCP libre elegido por el sistema (se cierra antes de devolverlo). */
export function puertoLibre(): Promise<number> {
  return new Promise((ok, ko) => {
    const s = createServer();
    s.once("error", ko);
    s.listen(0, "127.0.0.1", () => { const { port } = s.address() as AddressInfo; s.close(() => ok(port)); });
  });
}

/** Servidor TCP propio en `puerto` (0.0.0.0, como server.ts). Falla si el puerto ya está ocupado: precondición, no se mata a nadie. */
export function escuchar(puerto: number): Promise<{ server: Server; cerrar: () => Promise<void> }> {
  return new Promise((ok, ko) => {
    const server = createServer((socket) => socket.end());
    server.once("error", ko);
    server.listen(puerto, "0.0.0.0", () => ok({ server, cerrar: () => new Promise((fin) => server.close(() => fin())) }));
  });
}

/** ¿Hay algo que acepte una conexión TCP en 127.0.0.1:`puerto`? */
export function conecta(puerto: number): Promise<boolean> {
  return new Promise((ok) => {
    const s = connect({ port: puerto, host: "127.0.0.1" });
    const fin = (v: boolean) => { s.destroy(); ok(v); };
    s.once("connect", () => fin(true));
    s.once("error", () => fin(false));
    s.setTimeout(3000, () => fin(false));
  });
}

/** Valor de una ruta con puntos en un objeto; `[]` toma el primer elemento y `[n]` el n-ésimo (como `ruta` en contratos.json). */
export function valorEn(obj: unknown, ruta: string): unknown {
  return ruta.replace(/\[\]/g, ".0").replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean)
    .reduce<unknown>((a, k) => (a == null ? undefined : (a as Record<string, unknown>)[k]), obj);
}
