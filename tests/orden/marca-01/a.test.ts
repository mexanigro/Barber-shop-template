// MARCA-01 · A1, A2 (T) · la medida N en tools/gama.mjs y las excepciones de M1-3. Sesión A (2026-10-07): tests rojos.
//
// Medido (D-286): `gama.mjs` da por buena cualquier escena neutra con cualquier paleta (M1-1); el material de la plantilla A que sirve
// la web de Yulia pasa T y K con su paleta carmesí. N mide el tinte de los grises contra la rampa neutra de la paleta. Este test usa
// el `medir()` de gama.mjs (Chromium, los mismos cuadros que T y K) y el material real, por su ruta fija y atado por sha256 (D-297).
// Caja negra: `import()` dinámico de `tools/gama.mjs`. Sólo en T (inciso n).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { deflateSync } from "node:zlib";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { A, A_DIR, CHATGPT, CHATGPT_DIR, GRADUADO, GRADUADO_DIR, PALETA_YULIA, ROOT, YULIA_DIR, YULIA_FOTOS, borrar, material, paletaDeFixture, type Cfg } from "./_comun.ts";

type Fila = Cfg & { role: string; N?: boolean | null; dN?: number | null; neutros?: number; Hn?: number; pasa?: boolean; T?: boolean | null; K?: boolean; error?: string };
const gama = async () => (await import(pathToFileURL(resolve(ROOT, "tools/gama.mjs")).href)) as Cfg;
const SERV_A = [2, 3, 4, 7, 8, 9, 10, 12];
const fila = (filas: Fila[], role: string) => { const f = filas.find((r) => r.role === role); assert.ok(f, `falta la fila «${role}»`); assert.equal(f.error, undefined, `${role}: ${f.error}`); return f; };
const desc = (f: Fila) => `N=${f.N} dN=${f.dN} neutros=${f.neutros} Hn=${f.Hn} T=${f.T} K=${f.K} pasa=${f.pasa}`;

test("gama.mjs mide N en cada archivo y la usa como gate igual que T y K: exporta N_DN_MAX = 0,020, N_DH_MAX = 60, N_C_NEUTRO = 0,004 y N_MIN_NEUTROS = 0,15; cada fila de medir() trae neutros, dN, Hn y N, que es null con menos del 15 % de neutros y entonces no gatea, y pasa es falso cuando N es falso; con la paleta de Yulia, el material de la plantilla A que hoy sirve su web —el clip 16:9, el 9:16, la textura y las 8 fotos de servicio— da N falso en los 11 y ninguno pasa, y lo graduado por la sesión de diseño —los dos clips, la textura, el local vertical y la imagen del link— y las 8 fotos de ChatGPT dan N verdadero; con la paleta A, la textura, el local, el local vertical, las 11 fotos de servicio, las 6 de galería y los 3 retratos de la plantilla A dan N verdadero; y una imagen sin neutros da N null", async () => {
  const g = await gama();
  // (1) Los umbrales de M1-2, exportados. Hoy no existen: aquí está el rojo.
  assert.equal(g.N_DN_MAX, 0.02, "gama.mjs exporta N_DN_MAX = 0.02 (M1-2: dN ≤ 0,020)");
  assert.equal(g.N_DH_MAX, 60, "gama.mjs exporta N_DH_MAX = 60 (tono del tinte medio a ±60° del de textMuted)");
  assert.equal(g.N_C_NEUTRO, 0.004, "gama.mjs exporta N_C_NEUTRO = 0.004 (con menos croma el tono no se juzga)");
  assert.equal(g.N_MIN_NEUTROS, 0.15, "gama.mjs exporta N_MIN_NEUTROS = 0.15 (con menos neutros N no aplica)");

  // (2) Con la paleta de Yulia: el material de A que sirve su web, N falso en los 11 y ninguno pasa.
  const hoy = [
    { role: "clip 16:9", src: material(A_DIR, A, "hero.webm"), kind: "video", v: true },
    { role: "clip 9:16", src: material(A_DIR, A, "hero-v.webm"), kind: "video", v: true },
    { role: "textura", src: material(A_DIR, A, "textura.jpg"), kind: "image", quietud: true },
    ...SERV_A.map((i) => ({ role: `servicio ${i}`, src: material(A_DIR, A, `servicio-${i}.jpg`), kind: "image", serie: "servicio" })),
  ];
  const r1 = (await g.medir(hoy, PALETA_YULIA)).rows as Fila[];
  const malos = hoy.map((h) => fila(r1, h.role)).filter((f) => f.N !== false || f.pasa !== false);
  assert.deepEqual(malos.map((f) => `${f.role}: ${desc(f)}`), [], "con la paleta de Yulia, el material de la plantilla A da N falso y no pasa (11 de 11)");
  for (const f of r1) assert.ok(typeof f.dN === "number" && typeof f.neutros === "number" && typeof f.Hn === "number", `${f.role}: la fila trae dN, neutros y Hn (${desc(f)})`);

  // (3) Lo graduado por la sesión de diseño y las 8 de ChatGPT: N verdadero.
  const bien = [
    { role: "clip 16:9", src: material(GRADUADO_DIR, GRADUADO, "hero.webm"), kind: "video", v: true },
    { role: "clip 9:16", src: material(GRADUADO_DIR, GRADUADO, "hero-v.webm"), kind: "video", v: true },
    { role: "textura", src: material(GRADUADO_DIR, GRADUADO, "textura.jpg"), kind: "image", quietud: true },
    { role: "local 9:16", src: material(GRADUADO_DIR, GRADUADO, "local-v.jpg"), kind: "image", excepcion: "su salón" },
    { role: "og", src: material(GRADUADO_DIR, GRADUADO, "og.jpg"), kind: "image", excepcion: "su salón" },
    ...SERV_A.map((i) => ({ role: `chatgpt ${i}`, src: material(CHATGPT_DIR, CHATGPT, `servicio-${i}.jpg`), kind: "image", serie: "servicio" })),
  ];
  const r2 = (await g.medir(bien, PALETA_YULIA)).rows as Fila[];
  const noN = bien.map((h) => fila(r2, h.role)).filter((f) => f.N !== true);
  assert.deepEqual(noN.map((f) => `${f.role}: ${desc(f)}`), [], "lo graduado (5) y lo de ChatGPT (8) dan N verdadero con la paleta de Yulia");

  // (4) Con la paleta A, el material aprobado de la plantilla A: N verdadero.
  const nombresA = ["textura.jpg", "local.jpg", "local-v.jpg", ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12].map((i) => `servicio-${i}.jpg`), ...[1, 2, 3, 4, 5, 6].map((i) => `galeria-${i}.jpg`), "retrato-1.jpg", "retrato-2.jpg", "retrato-3.jpg"];
  const deA = nombresA.map((n) => ({ role: n, src: material(A_DIR, A, n), kind: "image" }));
  const r3 = (await g.medir(deA, paletaDeFixture("a"))).rows as Fila[];
  const noA = deA.map((h) => fila(r3, h.role)).filter((f) => f.N !== true);
  assert.deepEqual(noA.map((f) => `${f.role}: ${desc(f)}`), [], "con la paleta A, el material de la plantilla A (24 archivos) da N verdadero");

  // (5) Sin neutros, N es null y no gatea: un rojo saturado entero.
  const dir = mkdtempSync(join(tmpdir(), "marca-01-n-"));
  try {
    const png = join(dir, "saturado.png");
    writeFileSync(png, pngLleno(0x8d, 0x2b, 0x2c));
    const r4 = (await g.medir([{ role: "saturado", src: png, kind: "image" }], PALETA_YULIA)).rows as Fila[];
    const f = fila(r4, "saturado");
    assert.equal(f.N, null, `una imagen sin neutros da N null (${desc(f)})`);
    assert.ok(f.neutros !== undefined && f.neutros < 0.15, `y sus neutros son menos del 15 % (${f.neutros})`);
    assert.equal(f.pasa, [f.T, f.K].every((x) => x !== false), "y su pasa no depende de N");
  } finally { borrar(dir); }
});

test("las excepciones de M1-3: un archivo con excepcion —trabajo real de la clienta, su salón, su retrato o la estilista que es ella— no se juzga por T, que queda null, y sí por K y por N; la foto 12 de ChatGPT, con la estilista de pelo violeta, no pasa sin excepción (T falso) y pasa con excepcion «es ella»; el servicio 1 de Yulia, un trabajo real suyo de pelo azul, con excepcion «trabajo real» sigue sin pasar porque N es falso; e imprimir pone la excepción de cada archivo en su fila", async () => {
  const g = await gama();
  assert.equal(g.N_DN_MAX, 0.02, "precondición: gama.mjs mide N (A1)");
  const doce = material(CHATGPT_DIR, CHATGPT, "servicio-12.jpg"), azul = material(YULIA_DIR, YULIA_FOTOS, "servicio-1.jpg");
  const files = [
    { role: "sin excepción", src: doce, kind: "image" },
    { role: "es ella", src: doce, kind: "image", excepcion: "es ella" },
    { role: "trabajo real", src: azul, kind: "image", excepcion: "trabajo real" },
  ];
  const res = await g.medir(files, PALETA_YULIA);
  const rows = res.rows as Fila[];
  const sin = fila(rows, "sin excepción"), ella = fila(rows, "es ella"), real = fila(rows, "trabajo real");
  assert.equal(sin.T, false, `la foto 12 sin excepción no pasa T (9 % de violeta fuera de ±35°): ${desc(sin)}`);
  assert.equal(sin.pasa, false, "y no pasa");
  assert.equal(ella.T, null, `con «es ella», T no se juzga (null): ${desc(ella)}`);
  assert.equal(ella.N, true, "N se sigue midiendo, y pasa");
  assert.equal(ella.pasa, true, "y la foto pasa");
  assert.equal(real.T, null, `con «trabajo real», T no se juzga: ${desc(real)}`);
  assert.equal(real.N, false, "pero N sí, y el pelo azul de Yulia sobre su salón no pasa N (dN 0,0229 a 291°, D-285 (4))");
  assert.equal(real.pasa, false, "la excepción no salva a N: el archivo no pasa");
  // imprimir pone la excepción en la fila del archivo.
  const lineas: string[] = [];
  const log = console.log;
  console.log = (...a: unknown[]) => { lineas.push(a.map(String).join(" ")); };
  try { g.imprimir("marca-01", res); } finally { console.log = log; }
  for (const [rol, motivo] of [["es ella", "es ella"], ["trabajo real", "trabajo real"]]) {
    const l = lineas.find((x) => x.startsWith(rol));
    assert.ok(l && l.slice(rol.length).includes(motivo), `imprimir pone la excepción «${motivo}» en la fila «${rol}» (fila: ${l ?? "ninguna"})`);
  }
});

/** PNG de 64 × 64 de un solo color, sin dependencias (zlib de node). */
function pngLleno(r: number, g: number, b: number): Buffer {
  const w = 64, h = 64, fila = Buffer.alloc(1 + w * 3);
  for (let x = 0; x < w; x++) { fila[1 + x * 3] = r; fila[2 + x * 3] = g; fila[3 + x * 3] = b; }
  const crudo = Buffer.concat(Array.from({ length: h }, () => fila));
  const crc = (buf: Buffer) => { let c = ~0; for (const x of buf) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return (~c) >>> 0; };
  const trozo = (tipo: string, datos: Buffer) => { const t = Buffer.from(tipo); const l = Buffer.alloc(4); l.writeUInt32BE(datos.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([t, datos]))); return Buffer.concat([l, t, datos, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), trozo("IHDR", ihdr), trozo("IDAT", deflateSync(crudo)), trozo("IEND", Buffer.alloc(0))]);
}
