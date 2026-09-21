// Utilidades de la orden CONEXION-01 (sesión A, 2026-09-21). Reusa de ../verdad-02/_util.ts y ../verdad-05/_util.ts lo que no cambia
// (repos temporales con nombre real, spawnSync, nodeE, sockets, lectura de CLAUDE.md). Caja negra: nada importa src/*, tools/* ni
// scripts/*; la interfaz de B (subirMaterial, resolveContentType, gama.mjs) se prueba por `nodeE` en proceso aparte.
// Toda carpeta temporal se crea con `conTemporal()` / `conTemporalAsync()` (prefijo «conexion-01-») y se borra en `finally`, también si
// el test falla. Ningún test escribe en Storage ni en Firestore: bucket en memoria (A1), --bucket-falso (A3), --sin-firestore (C3) y las
// variables FIREBASE_* en blanco en cada proceso hijo (`SIN_FIREBASE`): un intento contra el bucket real falla en getDb() antes de la red.
// Un mismo archivo en T y en H (cmp → 0): lo que sólo usa un repo (conServidor, puertoLibreEn en T) es inofensivo en el otro.
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, mkdtempSync, openSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { NODE, ROOT, borrar } from "../verdad-02/_util.ts";
import { conecta, escuchar } from "../verdad-05/_util.ts";

export { NODE, NOMBRE, OTRO, ROOT, SOY, bloqueContrato, borrar, correr, git, repoTemporal } from "../verdad-02/_util.ts";
export { conecta, correrLargo, escuchar, nodeE, puertoLibre, ultimoJson } from "../verdad-05/_util.ts";
export type { Repo, Salida } from "../verdad-02/_util.ts";

/** Bucket real de Storage (H src/lib/firebase-admin.ts:88, D-20) y la forma de la url de descarga que fija A1. */
export const BUCKET = "barbertemplate-madre.firebasestorage.app";
export const urlStorage = (bucket: string, path: string, token: string) => `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
/** Token de descarga de subirMaterial: los 32 primeros hex del sha256 del contenido (A1). */
export const tokenDe = (contenido: Buffer) => createHash("sha256").update(contenido).digest("hex").slice(0, 32);
/** Content-type por extensión: lo que Storage debe responder para cada url (C1). */
const TIPOS: Record<string, string> = { mp4: "video/mp4", webm: "video/webm", avif: "image/avif", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
export const tipoDe = (nombre: string) => TIPOS[nombre.toLowerCase().split(".").pop() ?? ""] ?? "";

/** Variables de Firebase Admin en blanco para los hijos: `getDb()` de H lanza «credentials not configured» ante cualquier intento real. */
export const SIN_FIREBASE = { FIREBASE_PROJECT_ID: "", FIREBASE_CLIENT_EMAIL: "", FIREBASE_PRIVATE_KEY: "", FIREBASE_DATABASE_ID: "" };

/** Carpeta temporal de esta orden: prefijo «conexion-01-» en os.tmpdir() (rojo-verde mide los restos por ese prefijo, VERDAD-03 D1). */
export function carpetaTemporal(): string {
  return mkdtempSync(join(tmpdir(), "conexion-01-"));
}

/** Crea una carpeta temporal, corre `fn` y la borra SIEMPRE, también si `fn` lanza (el test falla y no deja restos). */
export function conTemporal<T>(fn: (base: string) => T): T {
  const base = carpetaTemporal();
  try { return fn(base); } finally { borrar(base); }
}

/** Igual que `conTemporal`, para un `fn` asíncrono (servidores, Playwright, GET a Storage). */
export async function conTemporalAsync<T>(fn: (base: string) => Promise<T>): Promise<T> {
  const base = carpetaTemporal();
  try { return await fn(base); } finally { borrar(base); }
}

/** Sección «## <titulo>» de CLAUDE.md del repo real (hasta el siguiente «## »). */
export function seccionDe(titulo: string): string {
  const texto = readFileSync(resolve(ROOT, "CLAUDE.md"), "utf8");
  const i = texto.search(new RegExp(`^## ${titulo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m"));
  if (i < 0) throw new Error(`CLAUDE.md sin sección «## ${titulo}»`);
  const resto = texto.slice(i + 3);
  const j = resto.search(/^## /m);
  return j < 0 ? resto : resto.slice(0, j);
}

/** Apariciones de `aguja` en `texto`. */
export const cuenta = (texto: string, aguja: string) => texto.split(aguja).length - 1;

/** Puerto libre al azar dentro de [desde, hasta]. B1 (b.test.ts) y C3 (c.test.ts) levantan servidores desde archivos distintos, que el
 *  runner corre en paralelo: cada uno toma su rango (30000–39999 y 40000–49151) para no pisarse; el rango efímero de Windows queda fuera. */
export async function puertoLibreEn(desde: number, hasta: number): Promise<number> {
  for (let i = 0; i < 50; i++) {
    const p = desde + Math.floor(Math.random() * (hasta - desde + 1));
    if (await conecta(p)) continue;
    try { const s = await escuchar(p); await s.cerrar(); return p; } catch { /* ocupado sin responder: se prueba otro */ }
  }
  throw new Error(`sin puerto libre en ${desde}–${hasta}`);
}

/** Levanta `server.ts` de T como recrear (node --import tsx server.ts, PORT=<puerto>, peluquería/he) con `env`, espera a que `/` responda,
 *  corre `fn(base)` y mata al hijo por su PID (árbol entero en Windows), nunca por puerto. Puerto ya ocupado → lanza sin levantar nada. */
export async function conServidor<T>(cwd: string, env: Record<string, string>, puerto: number, log: string, fn: (base: string) => Promise<T>): Promise<T> {
  if (await conecta(puerto)) throw new Error(`puerto ocupado: :${puerto} ya responde antes de levantar el servidor (no se mata a nadie)`);
  const fd = openSync(log, "w");
  const srv = spawn(NODE, ["--import", "tsx", "server.ts"], { cwd, env: { ...process.env, PORT: String(puerto), VITE_ACTIVE_NICHE: "peluqueria", VITE_UI_LANGUAGE: "he", VITE_DEMO_MODE: "false", VITE_HERO_CLIP: "", ...env }, stdio: ["ignore", fd, fd], windowsHide: true });
  const base = `http://localhost:${puerto}`;
  const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
  let arriba = false;
  for (let i = 0; i < 90 && !arriba && srv.exitCode === null; i++) { try { arriba = (await fetch(base + "/")).ok; } catch { /* todavía no */ } if (!arriba) await dormir(1000); }
  try {
    if (!arriba) throw new Error(`server.ts no respondió en :${puerto} (ver ${basename(log)})`);
    return await fn(base);
  } finally {
    if (srv.exitCode === null) { if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(srv.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true }); else srv.kill("SIGKILL"); }
    for (let i = 0; i < 40 && (await conecta(puerto)); i++) await dormir(250);
    closeSync(fd);
  }
}
