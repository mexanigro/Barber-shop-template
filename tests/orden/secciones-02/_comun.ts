// Utilidades de la orden SECCIONES-02 (sesión A, 2026-10-06). Se llama `_comun.ts` y no `_util.ts` (regla heredada de CONEXION-05 y
// VERDAD-09: la copia promovida `tests/verdad-08-a.test.ts` recorre los `tests/orden/*/_util.ts` de las aprobadas).
// Lo de leer CLAUDE.md, el repo propio y las raíces está COPIADO de `tests/orden/contacto-pie-01/_comun.ts` (no importado: esa carpeta
// quedó congelada al aprobarse su orden). Lo propio de esta orden es el arnés de páginas EN ESTE PROCESO, sin instrumentos aparte:
//  - `conPlantillasEn(raiz, …)`: un Vite por plantilla (A y C, con su fixture, sin Firebase) sobre el árbol `raiz` —HEAD o el clon del
//    commit rojo de esta orden—, con las variables de `diseno/ver-a.ps1` / `ver-c.ps1`;
//  - `Paginas`: un Chromium con las banderas de `e2e.mjs` (ARGS_CHROMIUM, D-158) y cada contexto con el material de Storage respondido
//    desde `dev-fixtures/media/` del T real por ruta fija (no está en git: un clon no lo tiene), el mapa de Google respondido con una
//    página vacía (D-203) y las fuentes de Google bajadas UNA vez y respondidas iguales a todos los contextos (D-124): así dos árboles
//    se comparan por píxel sin que la red, las teselas ni la caché de fuentes cuenten;
//  - `conFixture`: el fixture que pide la página, con un cambio (el formulario apagado, N personas);
//  - NINGUNA ESPERA DE TIEMPO FIJO (AUDITORIA-01): cada espera es una condición —`listo()` (fuentes, el splash ido, la red quieta, las
//    imágenes no diferidas cargadas, la sección quieta) y `quieta()` (la caja y el scroll iguales 6 cuadros seguidos, sin animaciones
//    vivas ni imágenes en pantalla sin cargar)—, sondeada cuadro a cuadro.
// Caja negra: nada importa src/*, tools/* ni scripts/* de forma estática; playwright y vite se importan con `import()` dinámico y un
// especificador en variable (H no los tiene y su `tsc` no tiene que resolverlos). Un mismo archivo en T y en H (cmp → 0). Toda carpeta
// temporal lleva el prefijo «secciones-02-» y se borra en `finally`. Ningún test sale a las webs desplegadas, a Firestore, a Storage ni a
// Vercel (las fuentes de Google sí se piden, una vez por url).
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import { ROOT, SOY, borrar, git } from "../verdad-02/_util.ts";

export { ROOT, borrar, git } from "../verdad-02/_util.ts";

/** Esta orden. */
export const ORDEN = "secciones-02";
/** Commit aprobado de VENTA-01 en cada repo (Liam, 2026-10-06; VENTA-01 no tocó T) y último rojo de su carpeta en H. */
export const VENTA_01 = { aprobado: { T: "3222922", H: "fa5674e" }, rojo: { H: "6c6854b" } };

/** Raíces reales por ruta fija (como hueco.mjs): el repo propio es ROOT; el otro se lee de aquí. */
export const RUTA = { T: "C:/Users/liama/Desktop/Nichos/Barber-shop-template-main", H: "C:/Users/liama/Desktop/Nichos-hub" };
/** Repo propio: el `name` de package.json (`nichos-hub` / `react-example`), que sobrevive al clon neutro de rojo-verde; si no, la ruta. */
function repoPropio(): "T" | "H" {
  try {
    const nombre = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).name;
    if (nombre === "nichos-hub") return "H";
    if (nombre === "react-example") return "T";
  } catch { /* sin package.json */ }
  return SOY;
}
export const REPO = repoPropio();
export const RAIZ_T = REPO === "T" ? ROOT : RUTA.T;
export const RAIZ_H = REPO === "H" ? ROOT : RUTA.H;

/** Fuente de un archivo del repo propio, y si existe. */
export const fuente = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
export const existe = (rel: string) => existsSync(resolve(ROOT, rel));

/** Sección «## <titulo>» de un texto markdown (hasta el siguiente «## »), o undefined. */
export function seccionDeTexto(texto: string, titulo: string): string | undefined {
  const i = texto.search(new RegExp(`^## ${titulo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m"));
  if (i < 0) return undefined;
  const resto = texto.slice(i + 3);
  const j = resto.search(/^## /m);
  return j < 0 ? resto : resto.slice(0, j);
}
/** El párrafo «**<ID> (AAAA-MM-DD):** …» de § Puertas automáticas de un CLAUDE.md, o undefined. */
export function parrafoDe(texto: string, id: string): string | undefined {
  const puertas = seccionDeTexto(texto, "Puertas automáticas");
  if (!puertas) throw new Error("CLAUDE.md sin sección «## Puertas automáticas»");
  return puertas.split(/\r?\n/).find((l) => new RegExp(`^\\*\\*${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\(\\d{4}-\\d{2}-\\d{2}\\):\\*\\*`).test(l));
}
/** Cuerpo del bloque ```ini de CONTRATO-DECLARADO en un CLAUDE.md dado. */
export function bloqueDe(texto: string): string {
  const m = texto.match(/<!--\s*CONTRATO-DECLARADO[\s\S]*?-->\s*```ini\r?\n([\s\S]*?)```/);
  if (!m) throw new Error("CLAUDE.md sin bloque CONTRATO-DECLARADO");
  return m[1];
}

/** Carpeta temporal de esta orden (prefijo «secciones-02-»), borrada SIEMPRE al salir de `fn`. */
export async function conTemporalAsync<T>(fn: (base: string) => Promise<T>): Promise<T> {
  const base = mkdtempSync(join(tmpdir(), "secciones-02-"));
  try { return await fn(base); } finally { borrar(base); }
}
/** El commit rojo de esta orden: el último que añade su HOJA.md. */
export const rojoDeEstaOrden = () => git(ROOT, "log", "-1", "--format=%H", "--diff-filter=A", "HEAD", "--", `tests/orden/${ORDEN}/HOJA.md`);
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

// ─── El arnés de páginas de T (sólo lo usa T; en H no se llama) ─────────────────────────────────────────────────────────────
export type P = "a" | "c";
export type Urls = Record<P, string>;
/** Las dos plantillas de peluquería y su fixture. */
export const PLANTILLAS: Record<P, string> = { a: "peluqueria-paleta-a", c: "peluqueria-paleta-c" };
export const IDIOMAS = ["he", "en", "ru", "ar"] as const;
export type Fx = Record<string, any>;

/** Un Vite por plantilla sobre el árbol `raiz`, en ESTE proceso (127.0.0.1, puerto libre), con las variables de `diseno/ver-a.ps1` /
 *  `ver-c.ps1` —peluquería, hebreo, sin demo, sin Firebase (el fixture manda), sin clip local— y su caché de dependencias dentro de
 *  `base`; corre `fn(urls)` y cierra los dos SIEMPRE. */
export async function conPlantillasEn<T>(raiz: string, base: string, fn: (urls: Urls) => Promise<T>): Promise<T> {
  const s = await abrirPlantillas(raiz, base);
  try { return await fn(s.urls); } finally { await s.cerrar(); }
}
/** Lo mismo sin callback: devuelve las url y `cerrar()` (para abrirlas una vez en `before` y cerrarlas en `after`). Vite toma
 *  `VITE_TENANT_FIXTURE` al crearse; las variables comunes (el nicho y el idioma, que el plugin de SEO lee en cada pedido del HTML)
 *  quedan puestas mientras sirve, y `cerrar()` devuelve el entorno como estaba (cerrar en orden inverso al abrir). */
export async function abrirPlantillas(raiz: string, base: string): Promise<{ urls: Urls; cerrar: () => Promise<void> }> {
  const VITE = "vite";
  const { createServer } = (await import(VITE)) as { createServer: (o: Record<string, unknown>) => Promise<any> };
  const abiertos: any[] = [];
  const antes = { ...process.env };
  const cerrar = async () => {
    for (const v of abiertos) await v.close().catch(() => {});
    for (const k of Object.keys(process.env)) if (!(k in antes)) delete process.env[k];
    Object.assign(process.env, antes);
  };
  const etiqueta = raiz === ROOT ? "head" : "otro";
  const urls: Record<string, string> = {};
  try {
    for (const [p, fixture] of Object.entries(PLANTILLAS)) {
      Object.assign(process.env, { VITE_ACTIVE_NICHE: "peluqueria", VITE_UI_LANGUAGE: "he", VITE_DEMO_MODE: "false", VITE_FIREBASE_API_KEY: "", VITE_TENANT_FIXTURE: fixture, VITE_HERO_CLIP: "" });
      const vite = await createServer({ configFile: resolve(raiz, "vite.config.ts"), root: raiz, cacheDir: join(base, `vite-${etiqueta}-${p}`), logLevel: "error", server: { host: "127.0.0.1", port: 0, strictPort: false } });
      abiertos.push(vite);
      await vite.listen();
      urls[p] = vite.resolvedUrls.local[0];
    }
  } catch (e) { await cerrar(); throw e; }
  return { urls: urls as Urls, cerrar };
}
/** Un Vite de UN nicho de la flota sobre el árbol `raiz` (preset, sin fixture, sin Firebase, hebreo); corre `fn(url)` y lo cierra SIEMPRE. */
export async function conNicho<T>(raiz: string, nicho: string, base: string, fn: (url: string) => Promise<T>): Promise<T> {
  const VITE = "vite";
  const { createServer } = (await import(VITE)) as { createServer: (o: Record<string, unknown>) => Promise<any> };
  const antes = { ...process.env };
  Object.assign(process.env, { VITE_ACTIVE_NICHE: nicho, VITE_UI_LANGUAGE: "he", VITE_DEMO_MODE: "false", VITE_FIREBASE_API_KEY: "", VITE_FIREBASE_PROJECT_ID: "", VITE_CLIENT_ID: "qa-regresion", VITE_TENANT_FIXTURE: "", VITE_HERO_CLIP: "" });
  let vite: any;
  try {
    vite = await createServer({ configFile: resolve(raiz, "vite.config.ts"), root: raiz, cacheDir: join(base, `vite-seis-${raiz === ROOT ? "head" : "rojo"}`), logLevel: "error", server: { host: "127.0.0.1", port: 0, strictPort: false } });
    await vite.listen();
    return await fn(vite.resolvedUrls.local[0]);
  } finally {
    if (vite) await vite.close().catch(() => {});
    for (const k of Object.keys(process.env)) if (!(k in antes)) delete process.env[k];
    Object.assign(process.env, antes);
  }
}
/** Los seis nichos de la flota que mide `scripts/qa-regresion-seis.mjs`. */
export const SEIS = ["barberia", "estetica", "tattoo", "nails", "cafeteria", "remodelaciones"] as const;

const TIPOS: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif", ".mp4": "video/mp4", ".webm": "video/webm" };
/** Archivo local de una url de Storage de las plantillas (la regla de `deStorage` de tools/gama.mjs), en el T real por ruta fija. */
function deStorage(u: string): string | null {
  const m = /clients%2Ftest-b4-peluqueria-([a-z0-9]+)%2Fmedia%2F[^%?]+%2F([^%?]+)\?/.exec(u);
  return m ? join(RUTA.T, "dev-fixtures", "media", `paleta-${m[1]}`, decodeURIComponent(m[2])) : null;
}

/** Un Chromium y sus contextos. Las fuentes de Google se bajan una vez por url y se responden iguales a todos los contextos. */
export class Paginas {
  nav: any;
  private fuentes: Record<string, { status: number; headers: Record<string, string>; body: Buffer }> = Object.create(null);
  sinMaterial = new Set<string>();
  static async abrir(): Promise<Paginas> {
    const PW = "playwright";
    const { chromium } = (await import(PW)) as any;
    const p = new Paginas();
    p.nav = await chromium.launch({ args: ["--disable-lcd-text", "--font-render-hinting=none"] });
    return p;
  }
  async cerrar() { await this.nav?.close().catch(() => {}); }
  /** Un contexto de `w`×`h` (móvil con toque < 768), con o sin menos movimiento, y las tres respuestas locales. */
  async contexto(w: number, h: number, reducido = true): Promise<any> {
    const ctx = await this.nav.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768, reducedMotion: reducido ? "reduce" : "no-preference" });
    await ctx.route(/^https:\/\/firebasestorage\.googleapis\.com\//, (r: any) => {
      const f = deStorage(r.request().url());
      if (f && existsSync(f)) {
        // el vídeo se pide por rangos: sin un 206 Chromium deja la petición colgada y la red nunca queda quieta
        const todo = readFileSync(f), tipo = TIPOS[extname(f).toLowerCase()] || "application/octet-stream";
        const cab = { "cache-control": "max-age=31536000", "access-control-allow-origin": "*", "accept-ranges": "bytes" };
        const rango = /^bytes=(\d*)-(\d*)$/.exec(r.request().headers()["range"] ?? "");
        if (!rango) return r.fulfill({ status: 200, body: todo, contentType: tipo, headers: cab });
        const ini = rango[1] ? Number(rango[1]) : Math.max(0, todo.length - Number(rango[2]));
        const fin = rango[1] && rango[2] ? Math.min(Number(rango[2]), todo.length - 1) : todo.length - 1;
        return r.fulfill({ status: 206, body: todo.subarray(ini, fin + 1), contentType: tipo, headers: { ...cab, "content-range": `bytes ${ini}-${fin}/${todo.length}` } });
      }
      this.sinMaterial.add(r.request().url().slice(0, 140));
      return r.abort();
    });
    await ctx.route(/^https:\/\/(www\.)?google\.[a-z.]+\/maps/, (r: any) => r.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>mapa</title>" }));
    await ctx.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, async (r: any) => {
      const u = r.request().url();
      let g = this.fuentes[u];
      if (!g) {
        const res = await r.fetch();
        const headers = Object.fromEntries(Object.entries(res.headers() as Record<string, string>).filter(([k]) => !/^(content-encoding|content-length)$/i.test(k)));
        g = { status: res.status(), headers, body: await res.body() };
        this.fuentes[u] = g;
      }
      await r.fulfill({ status: g.status, headers: g.headers, body: g.body });
    });
    return ctx;
  }
  /** Abre la plantilla en `url` en el idioma `lang` con el fixture cambiado por `cambio`, espera `listo` y lleva `sel` a la vista. */
  async abrirEn(url: string, lang: string, w: number, h: number, sel: string, o: { cambio?: (fx: Fx) => void; reducido?: boolean } = {}): Promise<{ ctx: any; pg: any }> {
    const ctx = await this.contexto(w, h, o.reducido ?? true);
    if (o.cambio) await conFixture(ctx, o.cambio);
    const pg = await ctx.newPage();
    await pg.addInitScript((l: string) => { try { localStorage.setItem("preferred_language", l); } catch { /* sin storage */ } }, lang);
    await pg.goto(url, { waitUntil: "load", timeout: 120000 });
    await listo(pg, sel);
    await pg.evaluate((s: string) => document.querySelector(s)?.scrollIntoView({ behavior: "instant", block: "center" }), sel);
    await quieta(pg, sel);
    return { ctx, pg };
  }
}

/** Vite recarga la página la primera vez que optimiza una dependencia que descubre tarde («Execution context was destroyed», medido
 *  por A en la primera corrida de una mutación): entonces se vuelve a abrir y a medir desde cero, hasta tres veces. Cualquier otro error
 *  (una aserción) sale tal cual. */
export async function reintentar<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; ; i++) {
    try { return await fn(); } catch (e: any) { if (i >= 2 || !/context was destroyed|navigat/i.test(String(e?.message))) throw e; }
  }
}
/** El fixture de la plantilla que pide la página, con `cambio(fx)` aplicado. */
export async function conFixture(ctx: any, cambio: (fx: Fx) => void): Promise<void> {
  await ctx.route(/\/dev-fixtures\/peluqueria-paleta-[a-z]\.json(\?.*)?$/, async (r: any) => {
    const res = await r.fetch(); const fx = JSON.parse(await res.text());
    cambio(fx);
    await r.fulfill({ response: res, json: fx });
  });
}
/** `features.showInquiry` del fixture (el formulario de contacto). */
export const conFormulario = (si: boolean) => (fx: Fx) => { fx.features = { ...(fx.features || {}), showInquiry: si }; };
/** El equipo del fixture con `n` personas: las del fixture en orden y, desde la cuarta, copias con otro id y otro slug (y su texto en
 *  cada idioma, copiado del original), así cada idioma tiene el mismo equipo. */
export const conPersonas = (n: number) => (fx: Fx) => {
  const base: Fx[] = fx.staff;
  const out: Fx[] = [];
  for (let i = 0; i < n; i++) {
    const o = { ...base[i % base.length] };
    if (i >= base.length) { o.id = `${o.id}-${i}`; o.slug = `${o.slug}-${i}`; }
    out.push(o);
  }
  fx.staff = out;
  for (const capa of Object.values((fx.translations ?? {}) as Record<string, Fx>)) {
    const t = capa?.staff;
    if (t && !Array.isArray(t)) for (const o of out) if (!t[o.id]) t[o.id] = { ...t[String(o.id).split("-")[0]] };
  }
};

/** Después de cargar: fuentes listas, el splash ido, la red quieta, las imágenes no diferidas cargadas y decodificadas y `sel` quieta.
 *  Si Vite recarga la página a mitad (optimiza una dependencia: «Execution context was destroyed»), vuelve a empezar. */
export async function listo(pg: any, sel = "body"): Promise<void> {
  for (let intento = 0; ; intento++) {
    try {
      await pg.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});
      await pg.waitForFunction(() => document.fonts.status === "loaded", null, { timeout: 30000 });
      // el splash (`[role="dialog"]`) tapa la página y al salir la vuelve a scrollY 0 (App.tsx, handleSplashExitComplete)
      await pg.waitForFunction(() => !document.querySelector('[role="dialog"]') && document.body.style.overflow !== "hidden", null, { timeout: 30000 });
      await pg.waitForSelector(sel, { state: "attached", timeout: 30000 });
      await pg.waitForFunction(() => [...document.images].every((i) => i.complete || i.loading === "lazy"), null, { timeout: 30000 });
      await pg.evaluate(() => Promise.all([...document.images].filter((i) => i.complete && i.naturalWidth).map((i) => i.decode().catch(() => {}))));
      await quieta(pg, sel);
      return;
    } catch (e: any) {
      if (intento >= 3 || !/context was destroyed|navigat/i.test(String(e?.message))) throw e;
      await pg.waitForLoadState("load", { timeout: 60000 }).catch(() => {});
    }
  }
}
/** La caja de `sel` y el scroll sin moverse durante `cuadros` cuadros seguidos, sin animaciones vivas en ella y con las imágenes que
 *  quedaron en pantalla ya cargadas (la cuenta empieza de cero en cada llamada). */
export async function quieta(pg: any, sel = "body", cuadros = 6): Promise<void> {
  await pg.evaluate((s: string) => { const w = window as any; if (w.__quieta) delete w.__quieta[s]; }, sel);
  await pg.waitForFunction(([s, n]: [string, number]) => {
    const e = document.querySelector(s); if (!e) return false;
    const r = e.getBoundingClientRect();
    const firma = `${r.x},${r.y},${r.width},${r.height},${scrollX},${scrollY}`;
    const enPantalla = (i: HTMLImageElement) => { const q = i.getBoundingClientRect(); return q.width > 0 && q.bottom > 0 && q.top < innerHeight && q.right > 0 && q.left < innerWidth; };
    const vivas = [...document.images].some((i) => !i.complete && enPantalla(i)) || e.getAnimations({ subtree: true }).some((a) => a.playState === "running" && (a.effect as any)?.getComputedTiming?.().iterations !== Infinity);
    const w = ((window as any).__quieta ??= {});
    const prev = w[s];
    w[s] = { firma, n: !vivas && prev && prev.firma === firma ? prev.n + 1 : 0 };
    return w[s].n >= n;
  }, [sel, cuadros], { polling: "raf", timeout: 30000 });
}
/** Las imágenes de `sel` cargadas y decodificadas, también las diferidas (se pasan a `eager`), y `sel` quieta. */
export async function imagenesDe(pg: any, sel: string): Promise<void> {
  await pg.evaluate((s: string) => { for (const i of document.querySelectorAll<HTMLImageElement>(`${s} img`)) i.loading = "eager"; }, sel);
  await pg.waitForFunction((s: string) => [...document.querySelectorAll<HTMLImageElement>(`${s} img`)].every((i) => i.complete), sel, { timeout: 30000 });
  await pg.evaluate((s: string) => Promise.all([...document.querySelectorAll<HTMLImageElement>(`${s} img`)].filter((i) => i.naturalWidth).map((i) => i.decode().catch(() => {}))), sel);
  await quieta(pg, sel);
}

/** La captura de `sel` para compararla por píxel con la del otro árbol: sus imágenes cargadas, los elementos fijos de la página
 *  (navbar, botón flotante) ocultos —tapan una franja distinta según dónde quedó el scroll, no son de la sección— y la sección quieta. */
export async function capturaDe(pg: any, sel: string): Promise<Buffer> {
  await imagenesDe(pg, sel);
  await pg.evaluate((s: string) => {
    const dentro = document.querySelector(s);
    for (const e of document.querySelectorAll<HTMLElement>("body *")) {
      if (dentro?.contains(e)) continue;
      const pos = getComputedStyle(e).position;
      if (pos === "fixed" || pos === "sticky") e.style.visibility = "hidden";
    }
  }, sel);
  await quieta(pg, sel);
  return await pg.locator(sel).first().screenshot({ animations: "disabled" });
}
/** Píxeles distintos entre dos PNG (decodificados en la página `pg`); -1 si cambian de tamaño. */
export async function pixelesDistintos(pg: any, a: Buffer, b: Buffer): Promise<number> {
  if (a.equals(b)) return 0;
  return await pg.evaluate(async ([x, y]: [string, string]) => {
    const leer = async (src: string) => { const i = new Image(); i.src = src; await i.decode(); const c = document.createElement("canvas"); c.width = i.width; c.height = i.height; const g = c.getContext("2d")!; g.drawImage(i, 0, 0); return { w: i.width, h: i.height, d: g.getImageData(0, 0, i.width, i.height).data }; };
    const [p, q] = [await leer(x), await leer(y)];
    if (p.w !== q.w || p.h !== q.h) return -1;
    let n = 0;
    for (let k = 0; k < p.d.length; k += 4) if (p.d[k] !== q.d[k] || p.d[k + 1] !== q.d[k + 1] || p.d[k + 2] !== q.d[k + 2] || p.d[k + 3] !== q.d[k + 3]) n++;
    return n;
  }, [`data:image/png;base64,${a.toString("base64")}`, `data:image/png;base64,${b.toString("base64")}`]);
}

/** El peor contraste (WCAG) de cada texto visible de `sel` contra el píxel de fondo más desfavorable detrás de él: el texto se vuelve
 *  transparente para fotografiar sólo el fondo (como `diseno/secciones-02/instrumentos/contraste-solo.mjs`). */
export async function peorContraste(pg: any, sel: string): Promise<{ texto: string; ratio: number }[]> {
  const lineas: { x: number; y: number; w: number; h: number; color: string; op: string; texto: string }[] = await pg.evaluate((s: string) =>
    [...document.querySelectorAll<HTMLElement>(s)].filter((e) => getComputedStyle(e).display !== "none" && e.textContent!.trim()).map((e) => {
      const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, color: getComputedStyle(e).color, op: getComputedStyle(e).opacity, texto: e.textContent!.trim().slice(0, 40) };
    }), sel);
  const estilo = await pg.addStyleTag({ content: `${sel}, ${sel} * { color: transparent !important; text-shadow: none !important; }` });
  await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const png: Buffer = await pg.screenshot({ animations: "disabled" });
  await estilo.evaluate((n: Element) => n.remove());
  return await pg.evaluate(async ([src, ls]: [string, typeof lineas]) => {
    const i = new Image(); i.src = src; await i.decode();
    const c = document.createElement("canvas"); c.width = i.width; c.height = i.height; const g = c.getContext("2d")!; g.drawImage(i, 0, 0);
    const d = g.getImageData(0, 0, i.width, i.height).data;
    const lum = (r: number, gg: number, b: number) => { const f = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(gg) + 0.0722 * f(b); };
    return ls.map((L) => {
      const m = L.color.match(/\d+(\.\d+)?/g)!.map(Number); const op = Number(L.op) * (m[3] ?? 1);
      let peor = 99;
      for (let y = Math.max(0, Math.floor(L.y)); y < Math.min(i.height, L.y + L.h); y++) for (let x = Math.max(0, Math.floor(L.x)); x < Math.min(i.width, L.x + L.w); x++) {
        const k = (y * i.width + x) * 4; const bg = [d[k], d[k + 1], d[k + 2]];
        const fg = m.slice(0, 3).map((v, j) => v * op + bg[j] * (1 - op));
        const a = lum(fg[0], fg[1], fg[2]), b = lum(bg[0], bg[1], bg[2]);
        peor = Math.min(peor, (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05));
      }
      return { texto: L.texto, ratio: peor };
    });
  }, [`data:image/png;base64,${png.toString("base64")}`, lineas]);
}

/** Crea una subcarpeta de `base`. */
export function subcarpeta(base: string, nombre: string): string {
  const d = join(base, nombre);
  mkdirSync(d, { recursive: true });
  return d;
}
