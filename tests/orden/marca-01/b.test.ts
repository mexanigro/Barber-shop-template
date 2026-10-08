// MARCA-01 · B1, B2, B3 (T) · la graduación del material de una plantilla a la paleta de la clienta (M1-4). Sesión A (2026-10-07):
// tests rojos — no existe `tools/material/graduar.mjs`.
//
// Medido (D-287, con el prototipo de A sobre `instrumentos/lut.mjs`): el LUT deja la L (|ΔL| ≤ 0,0100 en la red, el recorte al gamut),
// no toca lo saturado ni la piel, y lleva cada neutro al tinte de la rampa; los 12 archivos salen en 261 s, dos corridas byte a byte
// iguales, con los mismos cuadros, la misma duración y la misma luz que la plantilla; el webm 9:16 pesa 6 132 292 B (< 6 MiB, D-285 (1)).
// Lo que se mira de la salida se mide aquí con ffmpeg (`_comun.ts`), sin pasar por gama.mjs. Caja negra: `import()` dinámico de
// graduar.mjs para B1; B2 y B3 la corren como la corre una persona. Sólo en T (inciso n).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  A, A_DIR, PALETA_YULIA, ROOT, YULIA_DIR, YULIA_FOTOS, conTemporal, cuadro, deltaEMedio, difTono, hex2lab, lMedia, material, medidaN,
  paletaDeFixture, rampaDe, rgb2lab, sha256De, sondaVideo, tono, type Cfg,
} from "./_comun.ts";

const GRADUAR = "tools/material/graduar.mjs";
const MIB = 1024 * 1024;
const VIDEOS = ["hero.mp4", "hero.webm", "hero-1280.mp4", "hero-1280.webm", "hero-v.mp4", "hero-v.webm"];
const DOCE = [...VIDEOS, "hero-poster.avif", "hero-v-poster.avif", "textura.jpg", "local.jpg", "local-v.jpg", "og.jpg"];
const REALES = ["servicio-1.jpg", "servicio-5.jpg", "galeria-1.jpg", "galeria-6.jpg", "retrato-1.jpg"];

/** Corre graduar.mjs (hasta 40 min: una graduación entera, con un hilo, son ≈ 4,5 min). */
function graduar(args: string[]): { status: number | null; out: string } {
  const r = spawnSync(process.execPath, [resolve(ROOT, GRADUAR), ...args], { cwd: ROOT, encoding: "utf8", timeout: 40 * 60 * 1000, windowsHide: true, maxBuffer: 64 * MIB });
  return { status: r.status, out: `${r.stdout ?? ""}\n${r.stderr ?? ""}` };
}
/** El JSON de la paleta que lee --colores (la forma del config: `branding.colors`). */
function paletaJson(base: string): string {
  const f = join(base, "paleta.json");
  writeFileSync(f, JSON.stringify({ branding: { mode: "light", colors: PALETA_YULIA } }));
  return f;
}

test("tools/material/graduar.mjs exporta cuboNeutros(colores, tinteMedio), que devuelve el texto .cube de un LUT 3D de 33 × 33 × 33 en el que, en OKLab, ningún color cambia su L en más de 0,015; los saturados (C ≥ 0,09) y los de la banda de piel y pelo (H 30–100° con C ≥ 0,035) salen iguales; cada neutro (C ≤ 0,03 fuera de esa banda, con 0,1 ≤ L ≤ 0,95) sale, a 0,002, con el tinte de la rampa neutra de la paleta a su misma L más la mitad de su desvío del tinte medio, sin cambiar su L en más de 0,001; y la misma entrada da el mismo texto", async () => {
  // (1) El módulo. Hoy no existe: aquí está el rojo.
  assert.ok(existsSync(resolve(ROOT, GRADUAR)), `falta ${GRADUAR} (M1-4): hoy no hay cómo llevar el material de la plantilla a la paleta de la clienta`);
  const mod = (await import(pathToFileURL(resolve(ROOT, GRADUAR)).href)) as Cfg;
  assert.equal(typeof mod.cuboNeutros, "function", `${GRADUAR} exporta cuboNeutros(colores, tinteMedio)`);

  for (const [nombre, colores, medio] of [["Yulia", PALETA_YULIA, [-0.001, -0.007]], ["C", paletaDeFixture("c"), [0.004, 0.003]]] as [string, Record<string, string>, [number, number]][]) {
    const texto = String(mod.cuboNeutros(colores, medio));
    assert.equal(String(mod.cuboNeutros(colores, medio)), texto, `${nombre}: la misma entrada da el mismo texto`);
    const lineas = texto.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
    assert.ok(lineas.some((l) => /^LUT_3D_SIZE\s+33$/.test(l)), `${nombre}: el .cube declara LUT_3D_SIZE 33`);
    const datos = lineas.filter((l) => /^[-\d.]+\s+[-\d.]+\s+[-\d.]+$/.test(l)).map((l) => l.split(/\s+/).map(Number));
    assert.equal(datos.length, 33 ** 3, `${nombre}: 33³ = 35 937 filas «r g b»`);
    const tinte = rampaDe(colores), faltas: string[] = [];
    for (let bi = 0; bi < 33; bi++) for (let gi = 0; gi < 33; gi++) for (let ri = 0; ri < 33; ri++) {
      const ent = [ri / 32, gi / 32, bi / 32], sal = datos[ri + gi * 33 + bi * 33 * 33];
      const [L, a, b] = rgb2lab(ent[0], ent[1], ent[2]), [L2, a2, b2] = rgb2lab(sal[0], sal[1], sal[2]);
      const C = Math.hypot(a, b), H = tono(a, b), donde = `(${ri},${gi},${bi}) L ${L.toFixed(3)} C ${C.toFixed(3)} H ${H.toFixed(0)}°`;
      if (Math.abs(L2 - L) > 0.015) faltas.push(`${donde}: su L cambia ${(L2 - L).toFixed(4)}`);
      const igual = Math.max(...sal.map((v, i) => Math.abs(v - ent[i])));
      if (C >= 0.09 && igual > 2e-4) faltas.push(`${donde}: saturado y cambia (Δrgb ${igual.toFixed(5)})`);
      else if (H >= 30 && H <= 100 && C >= 0.035 && igual > 2e-4) faltas.push(`${donde}: piel/pelo y cambia (Δrgb ${igual.toFixed(5)})`);
      else if (C <= 0.03 && !(H >= 30 && H <= 100 && C > 0.015) && L >= 0.1 && L <= 0.95) {
        const [ta, tb] = tinte(L), ea = ta + (a - medio[0]) * 0.5, eb = tb + (b - medio[1]) * 0.5;
        if (Math.hypot(a2 - ea, b2 - eb) > 0.002) faltas.push(`${donde}: neutro con tinte (${a2.toFixed(4)}, ${b2.toFixed(4)}) y no el de la rampa (${ea.toFixed(4)}, ${eb.toFixed(4)})`);
        if (Math.abs(L2 - L) > 0.001) faltas.push(`${donde}: neutro y su L cambia ${(L2 - L).toFixed(4)}`);
      }
    }
    assert.deepEqual(faltas.slice(0, 12), [], `${nombre}: ${faltas.length} colores fuera del LUT de M1-4`);
  }
});

test("node tools/material/graduar.mjs --colores <json> --plantilla a --local <foto> --local-v <foto> --salida <dir> escribe en <dir> los 12 archivos del material graduado —hero.mp4, hero.webm, hero-1280.mp4, hero-1280.webm, hero-v.mp4, hero-v.webm, hero-poster.avif, hero-v-poster.avif, textura.jpg, local.jpg, local-v.jpg y og.jpg—: cada vídeo con el ancho, el alto, la duración y la cantidad de cuadros del archivo de la plantilla con su nombre, la misma luz (L media a ±0,01 en cuatro cuadros) y no más de 6 MiB; cada póster, el primer cuadro de su clip graduado (ΔE medio ≤ 0,01) y no el de la plantilla (ΔE medio > 0,01); og.jpg de 1200 × 630; con la paleta de Yulia, todo archivo con al menos 15 % de neutros da dN ≤ 0,020 y su tono a ±60° del de textMuted; y dos corridas con la misma entrada dan los 12 archivos byte a byte iguales", async () => {
  assert.ok(existsSync(resolve(ROOT, GRADUAR)), `falta ${GRADUAR} (M1-4)`);
  for (const n of DOCE.filter((n) => n in A)) material(A_DIR, A, n);
  await conTemporal(async (base) => {
    const colores = paletaJson(base), local = material(YULIA_DIR, YULIA_FOTOS, "local.jpg"), localV = material(YULIA_DIR, YULIA_FOTOS, "local-v.jpg");
    const salidas = [join(base, "uno"), join(base, "dos")];
    for (const s of salidas) {
      const r = graduar(["--colores", colores, "--plantilla", "a", "--local", local, "--local-v", localV, "--salida", s]);
      assert.equal(r.status, 0, `graduar.mjs sale 0 (sale ${r.status})\n${r.out.slice(-1500)}`);
      const faltan = DOCE.filter((n) => !existsSync(join(s, n)));
      assert.deepEqual(faltan, [], `graduar.mjs escribe los 12 archivos en ${s}`);
    }
    const d = salidas[0], faltas: string[] = [];
    for (const v of VIDEOS) {
      const tpl = sondaVideo(join(A_DIR, v)), sal = sondaVideo(join(d, v)), peso = statSync(join(d, v)).size;
      if (sal.w !== tpl.w || sal.h !== tpl.h) faltas.push(`${v}: ${sal.w}×${sal.h}, la plantilla ${tpl.w}×${tpl.h}`);
      if (Math.abs(sal.dur - tpl.dur) > 0.05 || sal.cuadros !== tpl.cuadros) faltas.push(`${v}: ${sal.dur} s y ${sal.cuadros} cuadros, la plantilla ${tpl.dur} s y ${tpl.cuadros}`);
      if (peso > 6 * MIB) faltas.push(`${v}: ${peso} B, más de 6 MiB (${6 * MIB})`);
      for (const t of [1, 3, 5, 7]) { const dl = lMedia(cuadro(join(d, v), t)) - lMedia(cuadro(join(A_DIR, v), t)); if (Math.abs(dl) > 0.01) faltas.push(`${v}: en ${t} s la L media cambia ${dl.toFixed(4)}`); }
    }
    for (const [p, clip] of [["hero-poster.avif", "hero.mp4"], ["hero-v-poster.avif", "hero-v.mp4"]]) {
      const pos = cuadro(join(d, p), null), propio = deltaEMedio(pos, cuadro(join(d, clip), 0)), ajeno = deltaEMedio(pos, cuadro(join(A_DIR, p), null));
      if (propio > 0.01) faltas.push(`${p}: ΔE ${propio.toFixed(4)} contra el primer cuadro de ${clip} graduado (> 0,01)`);
      if (ajeno <= 0.01) faltas.push(`${p}: ΔE ${ajeno.toFixed(4)} contra el póster de la plantilla: no está graduado`);
    }
    const og = sondaVideo(join(d, "og.jpg"));
    if (og.w !== 1200 || og.h !== 630) faltas.push(`og.jpg: ${og.w}×${og.h}, no 1200×630`);
    const Hp = tono(hex2lab(PALETA_YULIA.textMuted)[1], hex2lab(PALETA_YULIA.textMuted)[2]);
    for (const n of DOCE) {
      const m = medidaN(join(d, n), PALETA_YULIA);
      if (m.N === false) faltas.push(`${n}: N no pasa con la paleta de Yulia (neutros ${(m.neutros * 100).toFixed(0)} %, dN ${m.dN.toFixed(4)}, tono ${m.Hn.toFixed(0)}° a ${difTono(m.Hn, Hp).toFixed(0)}° de textMuted)`);
    }
    for (const n of DOCE) if (sha256De(join(salidas[0], n)) !== sha256De(join(salidas[1], n))) faltas.push(`${n}: dos corridas con la misma entrada dan bytes distintos (el token de Storage sale del contenido)`);
    assert.deepEqual(faltas, [], "el material graduado cumple M1-4");
  });
});

test("graduar.mjs sube el CRF hasta entrar en el tope —con --tope 5 ningún vídeo pasa de 5 MiB y la salida dice el CRF de cada uno, más alto en hero-v.webm que en hero.webm— y con --fotos <foto…> gradúa cada foto sólo en los neutros, con su mismo nombre en <dir>: los trabajos reales de Yulia que hoy no pasan N —servicio 1 y 5, galería 1 y 6, y su retrato— dan N verdadero, y sus píxeles saturados (C ≥ 0,09: el pelo azul, rosa y violeta) cambian ΔE medio ≤ 0,015", async () => {
  assert.ok(existsSync(resolve(ROOT, GRADUAR)), `falta ${GRADUAR} (M1-4)`);
  await conTemporal(async (base) => {
    const colores = paletaJson(base), faltas: string[] = [];
    // (1) El escalón de CRF: con un tope de 5 MiB el 9:16 (5,48 MB y 6,13 MB con el CRF de partida) tiene que subir.
    const tope = join(base, "tope");
    const r = graduar(["--colores", colores, "--plantilla", "a", "--tope", "5", "--salida", tope]);
    assert.equal(r.status, 0, `graduar.mjs --tope 5 sale 0 (sale ${r.status})\n${r.out.slice(-1500)}`);
    const crf: Record<string, number> = {};
    for (const v of VIDEOS) {
      const f = join(tope, v);
      if (!existsSync(f)) { faltas.push(`${v}: no está en la salida`); continue; }
      if (statSync(f).size > 5 * MIB) faltas.push(`${v}: ${statSync(f).size} B, más de 5 MiB con --tope 5`);
      const m = [...r.out.matchAll(new RegExp(`${v.replace(/[.-]/g, "\\$&")}\\b[^\\n]*?CRF\\s+(\\d+)`, "g"))].pop();
      if (!m) faltas.push(`${v}: la salida no dice su CRF («${v} … CRF <n>»)`); else crf[v] = +m[1];
    }
    if (crf["hero-v.webm"] !== undefined && crf["hero.webm"] !== undefined && !(crf["hero-v.webm"] > crf["hero.webm"])) faltas.push(`hero-v.webm sale con CRF ${crf["hero-v.webm"]} y hero.webm con ${crf["hero.webm"]}: el 9:16 no subió el CRF para entrar en 5 MiB`);
    // (2) Los trabajos reales: sólo los neutros.
    const fotos = REALES.map((n) => material(YULIA_DIR, YULIA_FOTOS, n)), dir = join(base, "fotos");
    for (const f of fotos) { const m = medidaN(f, PALETA_YULIA); assert.equal(m.N, false, `precondición: ${f} hoy no pasa N (dN ${m.dN.toFixed(4)}, ${m.Hn.toFixed(0)}°)`); }
    const r2 = graduar(["--colores", colores, "--fotos", ...fotos, "--salida", dir]);
    assert.equal(r2.status, 0, `graduar.mjs --fotos sale 0 (sale ${r2.status})\n${r2.out.slice(-1500)}`);
    for (const [i, n] of REALES.entries()) {
      const f = join(dir, n);
      if (!existsSync(f)) { faltas.push(`${n}: no está en la salida con su mismo nombre`); continue; }
      const m = medidaN(f, PALETA_YULIA);
      if (m.N !== true) faltas.push(`${n}: graduada, N=${m.N} (dN ${m.dN.toFixed(4)}, ${m.Hn.toFixed(0)}°)`);
      const de = deltaEMedio(cuadro(fotos[i]), cuadro(f), 0.09);
      if (de > 0.015) faltas.push(`${n}: sus píxeles saturados cambian ΔE ${de.toFixed(4)} (> 0,015): se tocó el pelo`);
    }
    assert.deepEqual(faltas, [], "el escalón de CRF y la graduación de los trabajos reales");
  });
});
