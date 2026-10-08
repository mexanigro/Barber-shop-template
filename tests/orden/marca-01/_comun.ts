// Utilidades de la orden MARCA-01 (sesión A, 2026-10-07). Igual byte a byte en T y en H (`cmp`). Se llama `_comun.ts` y no `_util.ts`
// (regla heredada de CONEXION-05 y VERDAD-09: la copia promovida `tests/verdad-08-a.test.ts` recorre los `tests/orden/*/_util.ts`).
// COPIADO (no importado: esas carpetas quedan congeladas al aprobarse su orden) y RECORTADO de `../plantilla-01/_comun.ts` (los dobles
// de Firestore y de Storage, el cargador de .ts/.tsx de H, la lectura de CLAUDE.md, `envDe`, `dbReal`) y de `../venta-01/_comun.ts`
// (`vercel`, sólo lectura); el clon de un commit, de `../secciones-02/_comun.ts`. Lo suyo: el material de prueba atado por sha256
// (D-297), la paleta de Yulia, OKLab y la medida N con ffmpeg (para mirar lo que escribe `graduar.mjs` sin pasar por `gama.mjs`).
// Caja negra: nada importa src/*, tools/* ni scripts/* de forma estática; cada test importa lo suyo con `import()` dinámico.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { register } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, SOY, borrar, git } from "../verdad-02/_util.ts";

export { ROOT, borrar, correr, git } from "../verdad-02/_util.ts";

/** Esta orden. */
export const ORDEN = "marca-01";
/** SECCIONES-02: aprobada por Liam (2026-10-07) y su rojo en T (55cc9e8) y en H (574f33a). */
export const SECCIONES_02 = { aprobado: { T: "80fa0d7", H: "43b0384" }, rojo: { T: "55cc9e8", H: "574f33a" } };
/** Rutas fijas de los dos repos y del registro (fuera de git). */
export const RUTA = { T: "C:/Users/liama/Desktop/Nichos/Barber-shop-template-main", H: "C:/Users/liama/Desktop/Nichos-hub", NICHOS: "C:/Users/liama/Desktop/Nichos" };
/** Repo propio: el `name` de package.json (`nichos-hub` / `react-example`), que sobrevive al clon neutro de rojo-verde; si no, la
 *  ruta (copiado de ../secciones-02/_comun.ts). */
function repoPropio(): "T" | "H" {
  try {
    const nombre = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).name;
    if (nombre === "nichos-hub") return "H";
    if (nombre === "react-example") return "T";
  } catch { /* sin package.json */ }
  return SOY;
}
export const REPO = repoPropio();
/** La web de Yulia (D-293, D-294): su clientId, el id de su documento en hub_clients y su proyecto de Vercel (`DEMOS-ASHKELON.md` § 1). */
export const YULIA = { clientId: "demo--50af4398", hubDoc: "jDPjEmwXtYXDzEewOokO", proyecto: "prj_lcHDkOkhgf3VRSkkfRzzyiNKUoNp" };
/** La guía de una web nueva (registro, fuera de los repos). */
export const GUIA = `${RUTA.NICHOS}/bloque-05/GUIA-WEB-NUEVA.md`;

export const fuente = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
export const existe = (rel: string) => existsSync(resolve(ROOT, rel));
export type Cfg = Record<string, any>;
export const porJson = <T>(c: T): T => JSON.parse(JSON.stringify(c));

// ─── CLAUDE.md ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Sección «## <titulo>» de un texto markdown (hasta el siguiente «## »). */
export function seccionDeTexto(texto: string, titulo: string): string | undefined {
  const i = texto.search(new RegExp(`^## ${titulo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "m"));
  if (i < 0) return undefined;
  const resto = texto.slice(i + 3);
  const j = resto.search(/^## /m);
  return j < 0 ? resto : resto.slice(0, j);
}
/** El párrafo «**<ID> (AAAA-MM-DD):** …» de § Puertas automáticas de un CLAUDE.md, o undefined. */
export function parrafoDe(texto: string, id: string): string | undefined {
  const puertas = seccionDeTexto(texto, "Puertas automáticas (HIGIENE-01, 2026-09-18)") ?? "";
  return puertas.split(/\r?\n/).find((l) => new RegExp(`^\\*\\*${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\(\\d{4}-\\d{2}-\\d{2}\\):\\*\\*`).test(l));
}
/** Cuerpo del bloque ```ini de CONTRATO-DECLARADO en un CLAUDE.md dado. */
export function bloqueDe(texto: string): string {
  const m = texto.match(/<!--\s*CONTRATO-DECLARADO[\s\S]*?-->\s*```ini\r?\n([\s\S]*?)```/);
  if (!m) throw new Error("CLAUDE.md sin bloque CONTRATO-DECLARADO");
  return m[1];
}

// ─── Carpetas temporales y clones ───────────────────────────────────────────────────────────────────────────────────────────────
/** Carpeta temporal de esta orden (prefijo «marca-01-»), borrada SIEMPRE al salir de `fn`. */
export async function conTemporal<T>(fn: (base: string) => Promise<T>): Promise<T> {
  const base = mkdtempSync(join(tmpdir(), `${ORDEN}-`));
  try { return await fn(base); } finally { borrar(base); }
}
/** Clon del commit `sha` del repo propio en `<base>/<nombre>`, con `node_modules` enlazado por junction al del repo (nada se instala). */
export function clonDe(base: string, nombre: string, sha: string): string {
  const dir = join(base, nombre);
  const clon = spawnSync("git", ["clone", "-q", "--no-checkout", ROOT, dir], { encoding: "utf8", windowsHide: true });
  if (clon.status !== 0) throw new Error(`git clone ${ROOT} → exit ${clon.status}\n${clon.stderr}`);
  git(dir, "checkout", "-q", "--detach", sha);
  const nm = resolve(ROOT, "node_modules");
  if (existsSync(nm)) symlinkSync(nm, join(dir, "node_modules"), "junction");
  return dir;
}
/** Quita el junction de `node_modules` de un clon sin entrar en el real (antes de borrar el clon). */
export function quitarEnlace(clon: string): void {
  try { rmSync(join(clon, "node_modules")); } catch { /* sin enlace, o ya quitado */ }
}

// ─── El material de prueba, por su ruta fija y atado por sha256 (D-297) ─────────────────────────────────────────────────────────
export const sha256 = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
export const sha256De = (archivo: string) => sha256(readFileSync(archivo));
/** El material de la plantilla A (T `dev-fixtures/media/paleta-a/`, fuera de git) que la web de Yulia sirve hoy y que se mide con la paleta A. */
export const A_DIR = `${RUTA.T}/dev-fixtures/media/paleta-a`;
export const A: Record<string, string> = {
  "hero.mp4": "1183ab2201bb8aeaac6ee20f4a0d5729fb526f839dd44cb05df335d3e88ee5c0",
  "hero.webm": "0230c5b1a8f947797001598cb50cb142d1a8930817ce18d994319e8d44f6992e",
  "hero-1280.mp4": "4cd5652df80ffa7ad57e102081fa9a4b1b75da047de3cfafccc13d9f598eada2",
  "hero-1280.webm": "803fad48aa09efa7ff34261e933c013d6cb337eebc75bed37bcda67214111556",
  "hero-v.mp4": "b176b63310c87d6520465302ab5f3161b751001d5d73954420d67aead1e0a8c2",
  "hero-v.webm": "917de3200720cd7a921dbe740341e6abe1a8691e7bfb659a22932281c1017a99",
  "hero-poster.avif": "373f4adfb861c2f8d05219f4e610fd184cc0fcf64405eded5999dfccac2fdde9",
  "hero-v-poster.avif": "5a787138aca315b54fe65208b38a4cd1e6629c53efccb7e15bfa0724fbc1a6e2",
  "textura.jpg": "aa97b2e37f28390190e307bbabe4c8f2036a0f8d0d20ce2e57fc68a2dfc88caf",
  "local.jpg": "1ea302b03c247bfdbed152e7eadb2abbe42954fce1b8106eb7a114bb6fad6db6",
  "local-v.jpg": "830b916fdf81c6ff0446ee5bc4e8cd8085c8558a2dfbae76cbf4646c8cfe03fd",
  "servicio-1.jpg": "645f31153f4b899980489566c3eb42ff4b2409d58a82a0f65dc8b9d10c81fa6c",
  "servicio-2.jpg": "74f95f52beead99e23f6368b9ecd6e379b4030456d8aa0ef914237cd476b98a9",
  "servicio-3.jpg": "23f6fceaca5448962859849c5ae93021b08ccb801821fa0c3e1f739ab39a29a8",
  "servicio-4.jpg": "7d7eafef688f589eda06a1a9467dc31153e8d117972f34c3f1769cf32cb6ce37",
  "servicio-5.jpg": "205e66ec88cf80eb7e69637577ca3784f31226a5dab90725dbe6c505e504875b",
  "servicio-6.jpg": "3e47fcbcad93f8305917eac06b3b16d37caaf545ea81e8ce68fffb40d9f05302",
  "servicio-7.jpg": "092722cc71a2adf85f1b0bd9ca8adf0cd732ddf26ef0eb254627eacee5beba1a",
  "servicio-8.jpg": "75ee5c983c91228a2493969448069da942a30f12a5d202ce703d6389925271e1",
  "servicio-9.jpg": "b668cd4ab837190e1c14dc1322115fcabcd1004726d7f5af080b2b61f1410c5b",
  "servicio-10.jpg": "adf8f6646536ccd138e1c727633dfe7c9e87a50391c3437bbf34e8c2f1a07efa",
  "servicio-12.jpg": "6be848636f876f2d33d511d56a4e11be9ce07c20026adb5c66ff15c3c2986434",
  "galeria-1.jpg": "3ea4613f0c70f63b0dd0dce251115ebd9ac8adf155f8fb02cd8c68b24e51d719",
  "galeria-2.jpg": "3d420897c063889eb8df43cd95f48c9a1db23d489aadcda18eec1eace8c61657",
  "galeria-3.jpg": "a9bf5c5040bce627393024f33a2364fe839345e9405a3c6283bb9cdeedcd9064",
  "galeria-4.jpg": "d11d4fc0cd092a34f31092377be576dc3ec21c0bb05a316bc7864c700c01df11",
  "galeria-5.jpg": "316eee13f9436b7a7a720b791b9aae5deed8c488fbbc64d8d60bad29c505f7e1",
  "galeria-6.jpg": "903e5c55110928f933a8fb87dea9ed46d3ee376036e20927cbc57908df9cf900",
  "retrato-1.jpg": "39d42802d3b3974aca12f03e53a0a1f4dc666985a081dc07e0e6958516de5ff2",
  "retrato-2.jpg": "f2a6c5f15dc718202667537d8be4887eb7409ed55e6c27570b05ae6689fc4d7b",
  "retrato-3.jpg": "d5c7a0793f5665459d10cbf3ff573a74e34237d302bb6008b00990aa084979bd",
};
/** Lo graduado por la sesión de diseño (2026-10-06) con la paleta de Yulia, copiado por A de su scratchpad (temporal). */
export const GRADUADO_DIR = `${RUTA.NICHOS}/diseno/marca-01/material/graduado-diseno`;
export const GRADUADO: Record<string, string> = {
  "hero.webm": "0fb4225d34570eca319c9db05016f7133c2c764804b180f399b0a1f82e885fb1",
  "hero-v.webm": "60530c7ba206a2e7af7a31ab73d0950a44bc5a16ab0293725ff90ed897f8eb5f",
  "textura.jpg": "420ade768270642b4c7f068f8e38b03d55bea82bf2427146622e01314c7e0192",
  "local-v.jpg": "e6331c64f20c07aaac928c0908058d607cfa2a5070c2d6f4d57caef24bf0be82",
  "og.jpg": "0c601385c43ef0bb394c3e67e446d6d0bf1715b5983cce4f7c84bdf6ad818f6a",
};
/** Las fotos reales de Yulia (Google Maps retocadas en ChatGPT, `DEMOS-ASHKELON.md` § 1) que sirve hoy su web, sin graduar. */
export const YULIA_DIR = `${RUTA.NICHOS}/diseno/marca-01/material/yulia`;
export const YULIA_FOTOS: Record<string, string> = {
  "servicio-1.jpg": "c975f749f76683d7e6f19bff52f9eeb196f5e073d107e1abcb0eca021cf5c172",
  "servicio-5.jpg": "1f95a522033defd32a51a95e1bd6bd863399e74cd712ca3fee27d8895ee02a47",
  "galeria-1.jpg": "ac0223c15de2aa7d54f994531cfc12b88c380c67f0231834b339b3c91c6b3299",
  "galeria-6.jpg": "45e23ef2b55e25a638043e2e5bfa5bf8957b265f2fdb26f94f49227879273684",
  "retrato-1.jpg": "a08ca591e44c87f8b9135f9448983e729518ec30a6e0afdc7084fe714fd0e9f5",
  "local.jpg": "2355da78bbf36e49386b4121c58be20b57664fedac16eb951b0d29feb2550b86",
  "local-v.jpg": "ee787181183dd40ab7951daf83d0e28d32b5d85c21b09829f5ed63e9905923b0",
};
/** Las 8 fotos de servicio que la sesión de diseño pidió a ChatGPT con el pedido parametrizado (`pedidos-yulia.md`). */
export const CHATGPT_DIR = `${RUTA.NICHOS}/diseno/secciones-02/material-yulia`;
export const CHATGPT: Record<string, string> = {
  "servicio-2.jpg": "eecff7b775650cc0cf8f05d02aca60295213f59136d447d8219b01815f5a84ff",
  "servicio-3.jpg": "a518a3f86c413c33ea871454f7e5ac7cde0648b2a0f87aec79f6afc8d2a477ec",
  "servicio-4.jpg": "16e2d5d94095404e290d5ce30190dc2eaca7fdcfb99ef3bcdafa87d4abbd6c6a",
  "servicio-7.jpg": "d42ab84be7e57121c6aac7985d87f20cfebd6e4edf5847e34c36e8aafc1466c5",
  "servicio-8.jpg": "2d9804d2783bbd5bb07694c60f8bb8d1e4e051728ce18082452e7fa7843c42fc",
  "servicio-9.jpg": "6b443422b8d83ccd4735f867a9f503d53114e07c302e4a4701a1aea0e883d5cd",
  "servicio-10.jpg": "e6a02bf8d622684f05bbb3d816997a9157d352b34242669ed05458b8c74174f4",
  "servicio-12.jpg": "abca2f3e162eb4eb8a080572c5380df6efdc11d2843609525a6698af8bbfa63f",
};
/** Ruta de un archivo del material después de comprobar que existe y que es el atado (si no, lanza con el porqué). */
export function material(dir: string, mapa: Record<string, string>, nombre: string): string {
  const f = `${dir}/${nombre}`;
  if (!existsSync(f)) throw new Error(`falta el material de prueba ${f} (D-297)`);
  const h = sha256De(f);
  if (h !== mapa[nombre]) throw new Error(`el material de prueba ${f} cambió: sha256 ${h}, atado ${mapa[nombre]} (D-297)`);
  return f;
}

/** La paleta de la web de Yulia (`config/demo--50af4398`, paleta derivada de su logo #730f16; `diseno/marca-01/yulia-branding.json`). */
export const PALETA_YULIA: Record<string, string> = {
  border: "#ddd2d1", mutedForeground: "#715e5c", highlightOnDark: "#f2c7c3", primaryForeground: "#fbf5f5", surface: "#fbf5f5",
  cardForeground: "#261918", scrim: "#201312", accentForeground: "#fbf5f5", foreground: "#261918", accent: "#8d2b2c", secondary: "#f4eae9",
  highlight: "#89302f", secondaryForeground: "#261918", surfaceAlt: "#f4eae9", accentStrong: "#7d1b1e", textMuted: "#715e5c",
  background: "#fbf5f5", accentLight: "#b26964", surfaceDark: "#201312", text: "#261918", muted: "#f4eae9", card: "#fdf9f9", primary: "#7d1b1e",
};
/** La paleta A (T `dev-fixtures/peluqueria-paleta-a.json`, `branding.colors`). */
export const paletaDeFixture = (p: "a" | "c"): Record<string, string> =>
  JSON.parse(readFileSync(`${RUTA.T}/dev-fixtures/peluqueria-paleta-${p}.json`, "utf8")).branding.colors;

// ─── OKLab (Björn Ottosson) y la medida N con ffmpeg (M1-2), independiente de gama.mjs ──────────────────────────────────────────
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export function rgb2lab(r: number, g: number, b: number): [number, number, number] { // 0..1
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
export const hex2lab = (h: string) => rgb2lab(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
export const tono = (a: number, b: number) => ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
export const difTono = (x: number, y: number) => { const d = Math.abs(x - y) % 360; return d > 180 ? 360 - d : d; };
/** Rampa neutra de una paleta (scrim, textMuted, surfaceAlt, surface por L) y su tinte (a, b) a una L (M1-2). */
export function rampaDe(colores: Record<string, string>): (L: number) => [number, number] {
  const r = ["scrim", "textMuted", "surfaceAlt", "surface"].map((k) => hex2lab(colores[k])).sort((x, y) => x[0] - y[0]);
  return (L: number) => {
    if (L <= r[0][0]) return [r[0][1], r[0][2]];
    for (let i = 1; i < r.length; i++) if (L <= r[i][0]) { const t = (L - r[i - 1][0]) / (r[i][0] - r[i - 1][0]); return [r[i - 1][1] + (r[i][1] - r[i - 1][1]) * t, r[i - 1][2] + (r[i][2] - r[i - 1][2]) * t]; }
    const u = r[r.length - 1]; return [u[1], u[2]];
  };
}
/** Un cuadro de 160 px de ancho en rgb24 (vídeo en t = 1 s, como `medir-n.mjs`). */
export function cuadro(archivo: string, t: number | null = /\.(webm|mp4)$/i.test(archivo) ? 1 : null, ancho = 160): Buffer {
  const r = spawnSync("ffmpeg", ["-v", "error", ...(t === null ? [] : ["-ss", String(t)]), "-i", archivo, "-frames:v", "1", "-vf", `scale=${ancho}:-2`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 1 << 26, windowsHide: true });
  if (r.status !== 0) throw new Error(`ffmpeg no pudo leer ${archivo}: ${String(r.stderr).slice(0, 300)}`);
  return r.stdout as Buffer;
}
export type MedidaN = { neutros: number; dN: number; Cn: number; Hn: number; N: boolean | null };
/** N de M1-2 sobre un cuadro (ffmpeg): `null` con menos del 15 % de neutros. */
export function medidaN(archivo: string, colores: Record<string, string>): MedidaN {
  const raw = cuadro(archivo), tinte = rampaDe(colores), tm = hex2lab(colores.textMuted), Hp = tono(tm[1], tm[2]);
  let n = 0, d = 0, sa = 0, sb = 0;
  for (let i = 0; i < raw.length; i += 3) {
    const [L, a, b] = rgb2lab(raw[i] / 255, raw[i + 1] / 255, raw[i + 2] / 255), C = Math.hypot(a, b), H = tono(a, b);
    if (C >= 0.04 || (C > 0.015 && H >= 30 && H <= 100) || L < 0.08 || L > 0.99) continue;
    const [ta, tb] = tinte(L); d += Math.hypot(a - ta, b - tb); sa += a; sb += b; n++;
  }
  const frac = n / (raw.length / 3), ma = sa / n, mb = sb / n, Cn = Math.hypot(ma, mb), Hn = tono(ma, mb);
  return { neutros: frac, dN: d / n, Cn, Hn, N: frac < 0.15 ? null : d / n <= 0.02 && (Cn < 0.004 || difTono(Hn, Hp) <= 60) };
}
/** Ancho, alto, duración (s) y cuadros de un vídeo (ffprobe). */
export function sondaVideo(archivo: string): { w: number; h: number; dur: number; cuadros: number } {
  const r = spawnSync("ffprobe", ["-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=width,height,nb_read_frames:format=duration", "-of", "json", archivo], { encoding: "utf8", windowsHide: true });
  if (r.status !== 0) throw new Error(`ffprobe no pudo leer ${archivo}`);
  const j = JSON.parse(r.stdout) as Cfg;
  return { w: +j.streams[0].width, h: +j.streams[0].height, dur: +j.format.duration, cuadros: +j.streams[0].nb_read_frames };
}
/** L media de un cuadro rgb24. */
export function lMedia(raw: Buffer): number {
  let s = 0; for (let i = 0; i < raw.length; i += 3) s += rgb2lab(raw[i] / 255, raw[i + 1] / 255, raw[i + 2] / 255)[0];
  return s / (raw.length / 3);
}
/** ΔE OKLab medio entre dos cuadros rgb24 del mismo tamaño; con `minC`, sólo en los píxeles de `x` con C ≥ minC. */
export function deltaEMedio(x: Buffer, y: Buffer, minC = 0): number {
  let s = 0, n = 0;
  for (let i = 0; i < Math.min(x.length, y.length); i += 3) {
    const p = rgb2lab(x[i] / 255, x[i + 1] / 255, x[i + 2] / 255);
    if (Math.hypot(p[1], p[2]) < minC) continue;
    const q = rgb2lab(y[i] / 255, y[i + 1] / 255, y[i + 2] / 255);
    s += Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); n++;
  }
  return n ? s / n : 0;
}

// ─── El cargador de .ts/.tsx de H (copiado de ../plantilla-01/_comun.ts) ────────────────────────────────────────────────────────
export function fuenteCargadorTsx(raiz: string, dev = false): string {
  const ts = resolve(raiz, "node_modules/typescript/lib/typescript.js");
  if (!existsSync(ts)) throw new Error(`no existe ${ts}: el cargador de .tsx necesita typescript en node_modules`);
  return `import ts from ${JSON.stringify(pathToFileURL(ts).href)};
import { readFile } from "node:fs/promises";
import { statSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import { resolve as res, dirname } from "node:path";
const RAIZ = ${JSON.stringify(raiz.replace(/\\/g, "/"))};
const EXT = ["", ".tsx", ".ts", "/index.tsx", "/index.ts"];
const VITE = 'import.meta.env ??= { DEV: ${dev ? "true" : "false"}, PROD: ${dev ? "false" : "true"}, SSR: false, MODE: "test" };\\n';
function probar(base) {
  for (const e of EXT) { try { if (statSync(base + e).isFile()) return base + e; } catch {} }
  return null;
}
export async function resolve(spec, context, next) {
  if (spec.startsWith("@/")) { const p = probar(res(RAIZ, "src", spec.slice(2))); if (p) return { url: pathToFileURL(p).href, shortCircuit: true }; }
  if (spec.startsWith(".") && context.parentURL && context.parentURL.startsWith("file:")) {
    const p = probar(res(dirname(fileURLToPath(context.parentURL)), spec));
    if (p) return { url: pathToFileURL(p).href, shortCircuit: true };
  }
  return next(spec, context);
}
export async function load(url, context, next) {
  const tsx = /\\.tsx$/i.test(url);
  if (!tsx && !/\\.ts$/i.test(url)) return next(url, context);
  const source = await readFile(new URL(url), "utf8");
  if (!tsx && !source.includes("import.meta.env")) return next(url, context);
  const { outputText } = ts.transpileModule(tsx ? source : VITE + source, { fileName: url, compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, verbatimModuleSyntax: tsx } });
  return { format: "module", source: outputText, shortCircuit: true };
}
`;
}
let registrado = false;
/** El módulo de `rel` (relativo al repo propio), con el cargador de H. */
export async function importarModulo(rel: string): Promise<Record<string, any>> {
  if (!registrado) { register("data:text/javascript," + encodeURIComponent(fuenteCargadorTsx(ROOT)), { parentURL: pathToFileURL(ROOT + "/").href }); registrado = true; }
  return (await import(pathToFileURL(resolve(ROOT, rel)).href)) as Record<string, any>;
}

// ─── Storage: urls, tokens y un bucket en memoria (de ../plantilla-01/_comun.ts, con el token de cada archivo) ─────────────────
export const tokenDe = (b: Buffer) => sha256(b).slice(0, 32);
export const BUCKET = "barbertemplate-madre.firebasestorage.app";
/** La url de descarga que arma `subirMaterial` (D-22): el token es el sha256[0..32) del contenido. */
export const urlDe = (path: string, bytes: Buffer, bucket = BUCKET) => `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${tokenDe(bytes)}`;
/** `{ bucket, path, token }` de una url de descarga de Firebase Storage, o undefined. */
export function deStorage(url: unknown): { bucket: string; path: string; token: string } | undefined {
  if (typeof url !== "string") return undefined;
  const m = url.match(/^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/([^/]+)\/o\/([^?]+)\?alt=media&token=([0-9a-f]+)$/);
  return m ? { bucket: m[1], path: decodeURIComponent(m[2]), token: m[3] } : undefined;
}
/** Bytes falsos y distintos por path. */
export const bytesDe = (path: string) => Buffer.from(`bytes de prueba de ${path}`);
export type Subida = { path: string; buffer: Buffer; metadata: Cfg };
/** Un Storage en memoria con la forma de `BucketMinimo` (`src/lib/media-upload.ts`) más `download()`. Guarda el token vigente de cada
 *  archivo (el de `metadata.metadata.firebaseStorageDownloadTokens`, o el sha256 del contenido si la subida no lo dice): `sirve(url)`
 *  es lo que respondería Storage —200 con los bytes si el token es el vigente, 403 si es otro, 404 si no hay archivo—. */
export function bucketFalso(inicial: Record<string, Buffer> = {}) {
  const archivos = new Map<string, Buffer>(Object.entries(inicial));
  const tokens = new Map<string, string>(Object.entries(inicial).map(([p, b]) => [p, tokenDe(b)]));
  const subidas: Subida[] = [], bajadas: string[] = [];
  const bucket = {
    name: BUCKET,
    file(path: string) {
      return {
        async save(buffer: Buffer, opts: { metadata: Cfg }) {
          subidas.push({ path, buffer, metadata: opts?.metadata ?? {} });
          archivos.set(path, Buffer.from(buffer));
          tokens.set(path, String(opts?.metadata?.metadata?.firebaseStorageDownloadTokens ?? tokenDe(buffer)));
        },
        async download(): Promise<[Buffer]> { bajadas.push(path); const b = archivos.get(path); if (!b) throw new Error(`No such object: ${path}`); return [Buffer.from(b)]; },
        async exists(): Promise<[boolean]> { return [archivos.has(path)]; },
        async setMetadata(m: Cfg): Promise<undefined> { const t = m?.metadata?.firebaseStorageDownloadTokens; if (t) tokens.set(path, String(t)); return undefined; },
      };
    },
  };
  const sirve = (url: string): { status: number; bytes?: Buffer } => {
    const s = deStorage(url);
    if (!s || !archivos.has(s.path)) return { status: 404 };
    return tokens.get(s.path) === s.token ? { status: 200, bytes: Buffer.from(archivos.get(s.path)!) } : { status: 403 };
  };
  return { bucket, archivos, tokens, subidas, bajadas, sirve };
}

// ─── Firestore en memoria (la forma `DbMinima` de D-255; de ../plantilla-01/_comun.ts) ──────────────────────────────────────────
const esMapa = (v: unknown): v is Cfg => !!v && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
/** `set(data, { merge: true })` de Firestore sobre `doc`; `esBorrar` reconoce `FieldValue.delete()`. */
export function fusionar(doc: Cfg, data: Cfg, esBorrar: (v: unknown) => boolean): Cfg {
  const out = structuredClone(doc);
  for (const [k, v] of Object.entries(data)) {
    if (esBorrar(v)) delete out[k];
    else if (esMapa(v) && Object.keys(v).length) out[k] = fusionar(esMapa(out[k]) ? out[k] : {}, v, esBorrar);
    else out[k] = clonar(v);
  }
  return out;
}
function clonar(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(clonar);
  if (v && typeof v === "object") {
    if (!esMapa(v)) return Object.getPrototypeOf(v)?.constructor?.name === "Timestamp" || "methodName" in (v as Cfg) ? `centinela:${String((v as Cfg).methodName ?? "")}` : structuredClone(v);
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clonar(x)]));
  }
  return v;
}
export type Escritura = { coleccion: string; id: string; data: Cfg; opts?: Cfg };
/** Un Firestore en memoria: `docs` es «<colección>/<id>» → datos. Cuenta cada `set` en `escrituras`. */
export async function dbFalsa(inicial: Record<string, Cfg>) {
  const ESPEC = "firebase-admin/firestore";
  const { FieldValue } = (await import(ESPEC)) as { FieldValue: { delete: () => unknown } };
  const borrarCampo = FieldValue.delete() as { isEqual: (o: unknown) => boolean };
  const esBorrar = (v: unknown) => !!v && typeof v === "object" && typeof (v as Cfg).isEqual === "function" && borrarCampo.isEqual(v);
  const docs = new Map<string, Cfg>(Object.entries(porJson(inicial)));
  const escrituras: Escritura[] = [], agregados: { coleccion: string; data: Cfg }[] = [];
  const snap = (coleccion: string, id: string) => {
    const d = docs.get(`${coleccion}/${id}`);
    return { exists: d !== undefined, id, data: () => (d === undefined ? undefined : structuredClone(d)) };
  };
  const coleccion = (nombre: string) => ({
    doc(id: string) {
      return {
        id,
        async get() { return snap(nombre, id); },
        async set(data: Cfg, opts?: Cfg) {
          escrituras.push({ coleccion: nombre, id, data: clonar(data) as Cfg, opts });
          const previo = docs.get(`${nombre}/${id}`) ?? {};
          docs.set(`${nombre}/${id}`, opts?.merge ? fusionar(previo, data, esBorrar) : (clonar(data) as Cfg));
        },
        collection(sub: string) {
          return { async add(data: Cfg) { agregados.push({ coleccion: `${nombre}/${id}/${sub}`, data: clonar(data) as Cfg }); return { id: `auto${agregados.length}` }; } };
        },
      };
    },
    where(campo: string, _op: string, valor: unknown) {
      return {
        limit(n: number) {
          return {
            async get() {
              const hits = [...docs.entries()].filter(([k, d]) => k.startsWith(`${nombre}/`) && k.split("/").length === 2 && d?.[campo] === valor).slice(0, n);
              const ds = hits.map(([k, d]) => ({ id: k.split("/")[1], data: () => structuredClone(d) }));
              return { empty: ds.length === 0, size: ds.length, docs: ds };
            },
          };
        },
      };
    },
  });
  return { db: { collection: coleccion }, docs, escrituras, agregados, doc: (c: string, id: string) => docs.get(`${c}/${id}`) };
}

// ─── Las plantillas y un cliente recién dado de alta (de ../plantilla-01/_comun.ts) ─────────────────────────────────────────────
export type Paleta = "a" | "c";
export const PLANTILLAS: Record<Paleta, string> = { a: "test-b4-peluqueria-a", c: "test-b4-peluqueria-c" };
export const CLIENTE = "demo-salon-de-prueba-0001";
export const HUB_DOC = "hubDocAzar0001";
/** El fixture de la paleta `p`, copiado byte a byte de `T dev-fixtures/peluqueria-paleta-<p>.json` (T 80fa0d7) a la carpeta de esta
 *  orden en H. */
export const fixture = (p: Paleta): Cfg => JSON.parse(readFileSync(resolve(ROOT, "tests", "orden", ORDEN, `peluqueria-paleta-${p}.json`), "utf8"));
/** Recorre las hojas de un valor con su ruta («a.b.0.c»). */
export function hojas(v: unknown, ruta = ""): [string, unknown][] {
  if (Array.isArray(v)) return v.flatMap((x, i) => hojas(x, ruta ? `${ruta}.${i}` : String(i)));
  if (esMapa(v)) return Object.entries(v).flatMap(([k, x]) => hojas(x, ruta ? `${ruta}.${k}` : k));
  return [[ruta, v]];
}
export const leer = (o: unknown, ruta: string) => ruta.split(".").reduce<any>((a, k) => (a != null && typeof a === "object" ? a[k] : undefined), o);
/** Cada url de Storage de un config pasa a la de los bytes falsos de su path (token = sha256 de esos bytes): un mundo coherente. */
export function coherente(c: Cfg): Cfg {
  const fn = (v: unknown): unknown => {
    if (typeof v === "string") { const s = deStorage(v); return s ? urlDe(s.path, bytesDe(s.path), s.bucket) : v; }
    if (Array.isArray(v)) return v.map(fn);
    if (esMapa(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fn(x)]));
    return v;
  };
  return fn(c) as Cfg;
}
/** `config/test-b4-peluqueria-<p>` como lo deja `b4-tenant.ts create --fixture`, con sus urls coherentes con el bucket falso. */
export async function tenantDePlantilla(p: Paleta): Promise<Cfg> {
  const { buildProvisionDocs } = await importarModulo("src/lib/provisioning.ts");
  const fx = fixture(p), id = PLANTILLAS[p];
  const docs = buildProvisionDocs({
    businessName: fx.brand?.name ?? id, niche: "peluqueria", mode: fx.business?.mode === "solo" ? "solo" : "team", slug: id,
    domain: `${id}.arzac.studio`, language: "he", phone: fx.contact?.phone ?? "+972 3-000-0000", email: "website@arzac.studio",
    address: fx.contact?.address ?? "", tagline: fx.brand?.tagline ?? "", description: "tenant de prueba",
  });
  return coherente(porJson({ ...docs.config, ...fx, business: { ...docs.config.business, ...(fx.business ?? {}) } }));
}
/** El cliente de peluquería recién dado de alta (`buildProvisionDocs`). */
export async function clienteDeAlta(id = CLIENTE): Promise<{ hub: Cfg; config: Cfg }> {
  const { buildProvisionDocs } = await importarModulo("src/lib/provisioning.ts");
  const docs = buildProvisionDocs({
    businessName: "סלון הבדיקה", niche: "peluqueria", mode: "team", slug: id, domain: `${id}.arzac.studio`, language: "he",
    phone: "+972 3-000-0001", email: "salon@example.com", address: "רחוב הבדיקה 1", tagline: "", description: "", adminEmail: "duena@example.com",
  });
  return { hub: porJson({ ...docs.hubClient, createdAt: "2026-10-07T00:00:00.000Z", activationDate: "2026-10-07T00:00:00.000Z" }), config: porJson(docs.config) };
}
/** El mundo de un test: los dos tenants de plantilla con su material en el bucket (tokens coherentes) y el cliente recién dado de alta. */
export async function mundo(extraCliente: Cfg = {}) {
  const inicial: Record<string, Cfg> = {};
  const archivos: Record<string, Buffer> = {};
  const tenants: Record<Paleta, Cfg> = { a: {}, c: {} };
  for (const p of Object.keys(PLANTILLAS) as Paleta[]) {
    const t = await tenantDePlantilla(p);
    tenants[p] = t;
    inicial[`config/${PLANTILLAS[p]}`] = t;
    inicial[`hub_clients/${PLANTILLAS[p]}`] = { clientId: PLANTILLAS[p], niche: "peluqueria", businessName: t.brand?.name, language: "he", status: "demo" };
    for (const [, v] of hojas(t)) { const s = deStorage(v); if (s) archivos[s.path] = bytesDe(s.path); }
  }
  const alta = await clienteDeAlta();
  inicial[`config/${CLIENTE}`] = { ...alta.config, ...extraCliente };
  inicial[`hub_clients/${HUB_DOC}`] = alta.hub;
  const db = await dbFalsa(inicial);
  const st = bucketFalso(archivos);
  return { ...db, ...st, tenants };
}

// ─── Lo remoto, sólo en LECTURA (W1, «, webs») ──────────────────────────────────────────────────────────────────────────────────
/** Las variables de `.env.local` de H (sin imprimirlas). */
export function envDe(raiz: string): Record<string, string> {
  const abs = join(raiz, ".env.local");
  if (!existsSync(abs)) throw new Error(`falta ${abs}: sin él no se puede leer Firestore ni la API de Vercel`);
  const out: Record<string, string> = {};
  for (const linea of readFileSync(abs, "utf8").split(/\r?\n/)) {
    const t = linea.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[t.slice(0, i).trim()] = v;
  }
  return out;
}
/** El Firestore real por el Admin SDK de H: sólo `.get()`. */
export async function dbReal(): Promise<any> {
  for (const [k, v] of Object.entries(envDe(ROOT))) if (k.startsWith("FIREBASE_") || k.startsWith("NEXT_PUBLIC_FIREBASE_")) process.env[k] ??= v;
  return (await importarModulo("src/lib/firebase-admin.ts")).db;
}
/** GET a la API de Vercel (SÓLO lectura), con el team del `.env.local` de H. */
export async function vercel(ruta: string): Promise<{ status: number; json: Cfg }> {
  const env = envDe(ROOT);
  if (!env.VERCEL_TOKEN) throw new Error("falta VERCEL_TOKEN en el .env.local de H: sin él no se puede leer el estado del deploy");
  const url = new URL(ruta, "https://api.vercel.com");
  if (env.VERCEL_TEAM_ID) url.searchParams.set("teamId", env.VERCEL_TEAM_ID);
  const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${env.VERCEL_TOKEN}` }, signal: AbortSignal.timeout(20000) });
  const texto = await r.text();
  let json: Cfg = {};
  try { json = JSON.parse(texto) as Cfg; } catch { json = { _texto: texto.slice(0, 400) }; }
  return { status: r.status, json };
}
