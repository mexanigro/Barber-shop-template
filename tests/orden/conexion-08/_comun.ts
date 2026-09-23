// Utilidades de la orden CONEXION-08 (sesión A, 2026-09-23). Se llama `_comun.ts` y no `_util.ts` (§ Interfaz de la HOJA y regla
// heredada de CONEXION-05/VERDAD-09): la copia promovida `tests/verdad-08-a.test.ts` recorre los `tests/orden/*/_util.ts` de las
// órdenes de APROBADAS.md, y un `_util.ts` nuevo cae en el pre-commit del propio commit rojo. COPIADO de
// `tests/orden/conexion-07/_comun.ts` (no importado: esa carpeta queda congelada al aprobarse la orden), recortado a lo que esta
// orden usa y ampliado con lo que le falta: `medirPng` (§ Interfaz A1), `SIN_FIREBASE`/`urlStorage`/`tokenDe`/`cuenta` (copiados de
// ../conexion-01/_util.ts, para C1) y `excluidas` (CONEXION-07 pieza 5, para D1). Fuera quedan el cargador de .tsx y `espiarWarn`:
// aquí nada importa un componente, y `src/lib/whatsapp.ts` es un .ts puro que `--experimental-strip-types` carga solo.
// Reusa de ../verdad-02 y ../verdad-05 lo que no cambia (spawnSync, git, repos temporales, borrado, procesos largos).
// Caja negra: nada importa src/*, tools/* ni scripts/* salvo lo que la hoja fija como interfaz (`toWhatsAppNumber` en B1); los
// imports de `tools/` y de `src/` sólo con `import()` dinámico dentro del test. Un mismo archivo en T y en H (cmp → 0): lo propio de
// cada repo va por `REPO`; el otro repo se lee por ruta fija (`RUTA`, como hueco.mjs); la identidad del repo (`REPO`) sale de
// package.json para sobrevivir al clon neutro. Toda carpeta temporal lleva el prefijo «conexion-08-» y se borra en `finally`, también
// si el test falla. Ningún test escribe en Storage ni en Firestore: C1 va con `--bucket-falso` y las FIREBASE_* en blanco, y C2 usa
// `b4-tenant.ts show`, que sólo lee.
//
// `medirPng` (§ Interfaz A1, ajuste de A 2026-09-23): T no tiene `sharp` (ni en package.json ni resoluble; el que lo tiene es H), así
// que el PNG se decodifica en Chromium con `playwright` —importado SÓLO dinámicamente, dentro de la función— como hace `diffPng` de
// `tools/verdad/recrear.mjs` («sin dependencias»): Image + canvas + getImageData, y de ahí el tamaño, el alfa de las cuatro esquinas
// y la luminancia media de los píxeles opacos.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { ROOT, SOY, borrar, git, repoTemporal, type Repo, type Salida } from "../verdad-02/_util.ts";
import { correrLargo } from "../verdad-05/_util.ts";

export { NODE, NOMBRE, OTRO, ROOT, SOY, borrar, correr, git, repoTemporal } from "../verdad-02/_util.ts";
export { correrLargo, nodeE } from "../verdad-05/_util.ts";
export type { Repo, Salida } from "../verdad-02/_util.ts";

/** Commit aprobado de CONEXION-07 en cada repo (Liam, 2026-09-23) y último rojo de su carpeta. */
export const CONEXION_07 = { aprobado: { T: "637ed2b", H: "9c0f1e9" }, rojo: { T: "3cde6db", H: "e8af546" } };

/** Raíces reales por ruta fija (como hueco.mjs): el repo propio es ROOT; el otro se lee de aquí. */
export const RUTA = { T: "C:/Users/liama/Desktop/Nichos/Barber-shop-template-main", H: "C:/Users/liama/Desktop/Nichos-hub" };
/** Repo propio, en este orden: (1) el `name` de package.json (`nichos-hub` / `react-example`), que sobrevive al clon neutro de
 *  rojo-verde; (2) sin package.json, la URL de `origin`; (3) la ruta, como verdad-02. */
function repoPropio(): "T" | "H" {
  try {
    const nombre = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).name;
    if (nombre === "nichos-hub") return "H";
    if (nombre === "react-example") return "T";
  } catch { /* sin package.json */ }
  const r = spawnSync("git", ["-C", ROOT, "remote", "get-url", "origin"], { encoding: "utf8", windowsHide: true });
  if (r.status === 0 && r.stdout.trim()) return /nichos-hub(\.git)?\/?$/i.test(r.stdout.trim().replace(/\\/g, "/")) ? "H" : "T";
  return SOY;
}
export const REPO = repoPropio();
export const RAIZ_T = REPO === "T" ? ROOT : RUTA.T;
export const RAIZ_H = REPO === "H" ? ROOT : RUTA.H;
/** Carpeta del bloque (CONTRATOS-HUECOS.md), como BLOQUE_DIR de tools/_git.mjs. */
export const BLOQUE = "C:/Users/liama/Desktop/Nichos/bloque-04";

/** Archivos de la interfaz (§ Interfaz de la HOJA). */
export const LOGO_GENERICO = "tools/material/logo-generico.mjs";
export const GUARD_LOGO = "tests/logo-generico.test.ts";
export const GUARD_CONTACTO = "tests/contacto-logo.test.ts";
export const WHATSAPP = "src/lib/whatsapp.ts";
export const SERVICES_V6 = "src/components/landing/services/services-v6.tsx";
export const NAVBAR_V6 = "src/components/layout/navbar/navbar-v6.tsx";
export const HERO_V6 = "src/components/landing/hero/hero-v6.tsx";
export const CONTRATOS = "verdad/contratos.json";
export const HUECO = "tools/verdad/hueco.mjs";
export const MATERIAL = "scripts/b4-material.ts";
export const TENANT = "scripts/b4-tenant.ts";
export const FIXTURES = "dev-fixtures";
export const NICHO = "peluqueria";
export const ID_A = "test-b4-peluqueria-a";
/** Bucket real de Storage (el de las urls de los fixtures desde CONEXION-01). */
export const BUCKET = "barbertemplate-madre.firebasestorage.app";

/** El teléfono y los logos genéricos de las plantillas A y C (D-79, D-80, D-81). */
export const TELEFONO = "+972 3-000-0000";
/** Lo que `toWhatsAppNumber` tiene que dar con ese teléfono (D-80). */
export const WA = "97230000000";
export const LOGO = "logo.png";
export const LOGO_DARK = "logo-dark.png";
/** Medidas del wordmark genérico (D-81). */
export const ANCHO = 600, ALTO = 160;
/** Luminancia media de los píxeles opacos: tinta oscura en `logo.png`, clara en `logo-dark.png` (A1). */
export const LUM_OSCURA = 0.4, LUM_CLARA = 0.6;

/** Las tres filas que esta orden hace (26/36 → 29/36) y el `guard` que B2 les declara. */
export const FILAS = ["contact.phone", "brand.logo", "brand.logoDark"] as const;
export const GUARDS: Record<string, { archivo: string; clave: string }> = {
  "contact.phone": { archivo: GUARD_CONTACTO, clave: "phone" },
  "brand.logo": { archivo: GUARD_CONTACTO, clave: "logo" },
  "brand.logoDark": { archivo: GUARD_CONTACTO, clave: "logoDark" },
};
/** Claves que `tests/contacto-logo.test.ts` tiene que nombrar literalmente (la `clave` de cada fila). */
export const CLAVES = ["phone", "logo", "logoDark"] as const;
/** Nota que CONTRATOS-HUECOS.md gana en la línea del contrato de cada una de las tres. */
export const NOTA = "material y guard (CONEXION-08)";
/** Nota que `features.themeToggle` gana en su `tipo` (D-82: sale de esta orden y va a DISEÑO-01). */
export const NOTA_TOGGLE = "diseño: DISEÑO-01 (D-82)";
export const TOGGLE = "features.themeToggle";
/** Los veintiséis huecos ya hechos al cerrar CONEXION-07 (línea base de esta orden, medida con `hueco.mjs --json` en HEAD). */
export const BASE_HECHOS = [
  "paleta", "branding.mode", "hero.video", "hero.video.portrait", "hero.video.poster", "hero.eyebrow",
  "hero.titular", "hero.subtitle", "hero.cta", "testimonials.rating", "staff.photoUrl", "navbar.variant",
  "services.catalogo", "services.priceMax", "services.mode", "services.images", "services.featured", "services.surface",
  "gallery.items", "gallery.items.alt", "gallery.selection", "gallery.variant", "gallery.surface",
  "branding.texture", "branding.localPhoto", "branding.localPhotoMobile",
];

/** Fixture real de T (peluqueria-paleta-<p>.json), leído por ruta fija. */
export function fixture(p: "a" | "c"): Record<string, unknown> {
  return JSON.parse(readFileSync(join(RAIZ_T, FIXTURES, `peluqueria-paleta-${p}.json`), "utf8"));
}
/** Valor anidado por ruta con puntos. */
export const get = (o: unknown, ruta: string): unknown => ruta.split(".").reduce<unknown>((a, k) => (a != null && typeof a === "object" ? (a as Record<string, unknown>)[k] : undefined), o);
/** Fuente de un archivo del repo propio. */
export const fuente = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
/** Apariciones de `aguja` en `texto` (copiado de ../conexion-01/_util.ts). */
export const cuenta = (texto: string, aguja: string) => texto.split(aguja).length - 1;
/** Url de descarga que produce `subirMaterial` (copiado de ../conexion-01/_util.ts). */
export const urlStorage = (bucket: string, path: string, token: string) => `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
/** Token de descarga: los 32 primeros hex del sha256 del contenido (copiado de ../conexion-01/_util.ts). */
export const tokenDe = (contenido: Buffer) => createHash("sha256").update(contenido).digest("hex").slice(0, 32);
/** Variables de Firebase Admin en blanco para los hijos: `getDb()` de H lanza antes de salir a la red (../conexion-01/_util.ts). */
export const SIN_FIREBASE = { FIREBASE_PROJECT_ID: "", FIREBASE_CLIENT_EMAIL: "", FIREBASE_PRIVATE_KEY: "", FIREBASE_DATABASE_ID: "" };
/** Ruta en Storage del material de una paleta (`clients/test-b4-peluqueria-<p>/media/<rol>/<nombre>`). */
export const rutaStorage = (p: string, rol: string, nombre: string) => `clients/test-b4-peluqueria-${p}/media/${rol}/${nombre}`;
/** Tokens de un script de package.json (los archivos que corre, sin comillas). */
export function tokensDeScript(nombre: string): string[] {
  const scripts = JSON.parse(fuente("package.json")).scripts ?? {};
  return String(scripts[nombre] ?? "").split(/\s+/).map((t) => t.replace(/^["']|["']$/g, ""));
}
/** Sección «## <titulo>» de un CLAUDE.md dado (hasta el siguiente «## »). */
export function seccionDeTexto(texto: string, titulo: string): string {
  const i = texto.search(new RegExp(`^## ${titulo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m"));
  if (i < 0) throw new Error(`CLAUDE.md sin sección «## ${titulo}»`);
  const resto = texto.slice(i + 3);
  const j = resto.search(/^## /m);
  return j < 0 ? resto : resto.slice(0, j);
}
/** Cuerpo del bloque ```ini de CONTRATO-DECLARADO en un CLAUDE.md dado. */
export function bloqueDe(texto: string): string {
  const m = texto.match(/<!--\s*CONTRATO-DECLARADO[\s\S]*?-->\s*```ini\r?\n([\s\S]*?)```/);
  if (!m) throw new Error("CLAUDE.md sin bloque CONTRATO-DECLARADO");
  return m[1];
}
/** Cuenta los `test(` de un archivo, incluidos los guardados por repo (`if (REPO === "H") test(`). */
export const cuentaTests = (src: string) => (src.match(/^(?:if \([^)]*\) )?test\(/gm) ?? []).length;
/** Cuenta los `test(` que CORREN en `repo`: los sueltos más los guardados con `if (REPO === "<repo>")`. */
export function cuentaTestsDe(src: string, repo: "T" | "H"): number {
  const lineas = src.split(/\r?\n/);
  const sueltos = lineas.filter((l) => /^test\(/.test(l)).length;
  const guardados = lineas.filter((l) => new RegExp(`^if \\(REPO === "${repo}"\\) test\\(`).test(l)).length;
  return sueltos + guardados;
}
/** Última línea no vacía de un stdout. */
export const ultimaLinea = (stdout: string) => stdout.split(/\r?\n/).filter((l) => l.trim()).pop() ?? "";
/** Líneas de CONTRATOS-HUECOS.md que contienen un texto literal (fila de tabla o párrafo). */
export const lineasCon = (md: string[], texto: string) => md.filter((l) => l.includes(texto));
/** Nombres de los tests que el TAP de una corrida declara (`ok N - <nombre>` / `not ok N - <nombre>`), sin los subtests. */
export const nombresTap = (stdout: string) => stdout.split(/\r?\n/).map((l) => l.match(/^(?:not )?ok \d+ - (.+?)\s*$/)).filter((m): m is RegExpMatchArray => !!m).map((m) => m[1]);

/** Carpeta temporal de esta orden: prefijo «conexion-08-» en os.tmpdir() (rojo-verde mide los restos en el TEMP propio de la corrida). */
export function carpetaTemporal(): string {
  return mkdtempSync(join(tmpdir(), "conexion-08-"));
}
/** Crea una carpeta temporal, corre `fn` y la borra SIEMPRE, también si `fn` lanza (el test falla y no deja restos). */
export function conTemporal<T>(fn: (base: string) => T): T {
  const base = carpetaTemporal();
  try { return fn(base); } finally { borrar(base); }
}
/** Igual, para un `fn` asíncrono (A1 abre Chromium; C1 no lo necesita pero comparte el patrón). */
export async function conTemporalAsync<T>(fn: (base: string) => Promise<T>): Promise<T> {
  const base = carpetaTemporal();
  try { return await fn(base); } finally { borrar(base); }
}

/** Medida de un PNG sin dependencias nuevas: se decodifica en Chromium (como `diffPng` de tools/verdad/recrear.mjs). Devuelve el
 *  tamaño, el alfa de las cuatro esquinas y la luminancia media (sRGB, 0–1) de los píxeles opacos (alfa > 200). */
export async function medirPng(archivo: string): Promise<{ w: number; h: number; esquinas: number[]; opacos: number; lum: number }> {
  const { chromium } = (await import("playwright")) as typeof import("playwright");
  const navegador = await chromium.launch();
  try {
    const p = await navegador.newPage();
    const datos = "data:image/png;base64," + readFileSync(archivo).toString("base64");
    return await p.evaluate(async (d: string) => {
      const img: HTMLImageElement = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = d; });
      const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
      const x = c.getContext("2d")!; x.drawImage(img, 0, 0);
      const A = x.getImageData(0, 0, img.width, img.height).data;
      const alfa = (cx: number, cy: number) => A[(cy * img.width + cx) * 4 + 3];
      let suma = 0, n = 0;
      for (let k = 0; k < A.length; k += 4) if (A[k + 3] > 200) { suma += (0.2126 * A[k] + 0.7152 * A[k + 1] + 0.0722 * A[k + 2]) / 255; n++; }
      return { w: img.width, h: img.height, esquinas: [alfa(0, 0), alfa(img.width - 1, 0), alfa(0, img.height - 1), alfa(img.width - 1, img.height - 1)], opacos: n, lum: n ? suma / n : -1 };
    }, datos);
  } finally { await navegador.close(); }
}

/** `rojo-verde --todas` sobre un repo dado (el temporal de D1). */
export function rojoVerdeTodas(repo: string): Salida {
  return correrLargo(["tools/verdad/rojo-verde.mjs", "--todas", "--repo", repo]);
}
/** Reproduce HEAD (APROBADAS.md + tests/orden/<id>/ salvo los excluidos) en un repo temporal, para correr `--todas` sin recursión. */
export function reproducirHead(base: string, excluir: string[]): { repo: Repo; ids: string[] } {
  const repo = repoTemporal(REPO, base);
  const ids = git(ROOT, "ls-tree", "--name-only", "-d", "HEAD:tests/orden/").split(/\r?\n/).filter(Boolean).filter((id) => !excluir.includes(id));
  const rutas = git(ROOT, "ls-tree", "-r", "--name-only", "HEAD", "tests/orden/APROBADAS.md", ...ids.map((id) => `tests/orden/${id}`)).split(/\r?\n/).filter(Boolean);
  for (const ruta of rutas) {
    const abs = join(repo.dir, ruta);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, git(ROOT, "show", `HEAD:${ruta}`) + "\n");
  }
  repo.commit(`HEAD de este repo: APROBADAS.md + ${ids.join(", ")}`);
  return { repo, ids };
}
/** La orden propia más toda orden que HEAD lleva VIVA (carpeta en `tests/orden/` sin su línea «- <id> · aprobada» en
 *  `HEAD:tests/orden/APROBADAS.md`): `--todas` correría entera cualquiera que quedara dentro de la reproducción, incluida la que
 *  está escribiendo esta misma suite. Se calcula en el momento (CONEXION-07, pieza 5): una lista de ids escrita a mano se rompe con
 *  cada orden nueva. */
export function excluidas(propia: string): string[] {
  const aprobadas = git(ROOT, "show", "HEAD:tests/orden/APROBADAS.md");
  const vivas = git(ROOT, "ls-tree", "--name-only", "-d", "HEAD:tests/orden/")
    .split(/\r?\n/).map((s) => s.trim().replace(/\/$/, "")).filter(Boolean)
    .filter((id) => !new RegExp(`^- ${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} · aprobada`, "m").test(aprobadas));
  return [...new Set([propia, ...vivas])];
}
/** Órdenes vivas de una raíz en disco (mismo criterio, sobre el árbol de trabajo). */
export function ordenesVivas(raiz: string): string[] {
  const dir = resolve(raiz, "tests", "orden");
  let aprobadas = "";
  try { aprobadas = readFileSync(join(dir, "APROBADAS.md"), "utf8"); } catch { /* sin APROBADAS.md: ninguna retirada */ }
  let entradas: string[] = [];
  try { entradas = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name); } catch { return []; }
  return entradas
    .filter((id) => existsSync(join(dir, id, "HOJA.md")))
    .filter((id) => !new RegExp(`^- ${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} · aprobada`, "m").test(aprobadas));
}
