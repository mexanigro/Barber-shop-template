// GAMA-02 (2026-09-18): la medida T de tools/gama.mjs juzga los píxeles con color, no el promedio.
// Tres sintéticos (PNG generados aquí, sin dependencias): fondo --surface + rectángulo del 6 % en el acento (T sí),
// en lila fuera de paleta (T NO) y del 30 % en tono de piel/pelo 60° (T sí: la banda 40–80° no cuenta).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync, readdirSync } from "node:fs";
import { medir, paletaDe, OUT_MAX, F_MAX } from "../tools/gama.mjs";
import { png, pngSplit } from "./helpers/png.ts";

// MATERIAL-04: la banda de piel/pelo pasa de 40–80° a 30–80° (el pelo castaño bajo luz fría mide 35–40° y tumbaba fotos de B):
// un rectángulo del 6 % en #aa6f5f (OKLCH H 36°, C 0,08 — pelo cálido) queda excluido y T sigue sí; el lila (H 311°) sigue NO.
test("GAMA-02: T mira los píxeles con color — acento 6 % pasa, lila 6 % tumba, piel 30 % no cuenta, pelo cálido 36° no cuenta", async () => {
  const dir = mkdtempSync(join(tmpdir(), "gama-"));
  const files = [
    { role: "acento 6 %", src: join(dir, "acento.png"), kind: "image" as const, esperado: true, png: png("#f6f7f2", "#5d7a57", 0.06) },
    { role: "lila 6 %", src: join(dir, "lila.png"), kind: "image" as const, esperado: false, png: png("#f6f7f2", "#b48ad0", 0.06) },
    { role: "piel 30 %", src: join(dir, "piel.png"), kind: "image" as const, esperado: true, png: png("#f6f7f2", "#c9a27a", 0.3) },
    { role: "pelo cálido 36° 6 %", src: join(dir, "pelo.png"), kind: "image" as const, esperado: true, png: png("#f6f7f2", "#aa6f5f", 0.06) },
  ];
  for (const f of files) writeFileSync(f.src, f.png);
  const { rows } = await medir(files.map(({ role, src, kind }) => ({ role, src, kind })), paletaDe("a"));
  for (const [i, f] of files.entries()) {
    const r = rows[i] as { T: boolean; fuera: number; sat: number; dHue: number | null; error?: string };
    assert.equal(r.error, undefined, `${f.role}: ${r.error}`);
    assert.equal(r.T, f.esperado, `${f.role}: T=${r.T} sat=${r.sat} fuera=${r.fuera} ΔH=${r.dHue}`);
  }
  const lila = rows[1] as { fuera: number };
  assert.ok(lila.fuera > OUT_MAX, `lila: fuera ${lila.fuera} debe superar ${OUT_MAX}`);
  const piel = rows[2] as { sat: number; fuera: number };
  assert.ok(piel.sat < 0.15 && piel.fuera <= OUT_MAX, `piel: sat ${piel.sat} fuera ${piel.fuera}`);
  const pelo = rows[3] as { sat: number; fuera: number };
  assert.ok(pelo.fuera <= OUT_MAX && pelo.sat < 0.01, `pelo 36°: debe quedar en la banda de piel (sat ${pelo.sat} fuera ${pelo.fuera}); con la banda en 40–80° daría fuera ≈ 0,06`);
});

// MATERIAL-02/03 (2026-09-19): F mide la pared (la mejor de las dos esquinas superiores), no el borde entero, y juzga su tono:
// ΔE ≤ 0,12 Y (pared neutra, C ≤ 0,01, o tono a ±35° del acento). Sintéticos partidos y, si están instaladas, las tandas reales de
// MATERIAL-01/02 (dev-fixtures/media/paleta-a/_material-01/tanda{1,2,3}, ignoradas por git). Motivo del tono: la crema #f3ead8
// queda a ΔE 0,019 de surface-alt (menos que las paredes correctas, 0,016–0,049) y antes pasaba; por tono (H ≈ 90° vs 140°) NO.
test("F por tono: crema arriba NO (ΔE sola la dejaba pasar); gris neutro pasa; arena NO; surface + hombros oscuros pasa; tandas reales de A pasan F", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "gama-f-"));
  const files = [
    { role: "crema arriba", src: join(dir, "crema.png"), esperado: false, png: pngSplit("#f3ead8", "#f6f7f2") },
    { role: "gris neutro arriba", src: join(dir, "gris.png"), esperado: true, png: pngSplit("#ececec", "#f6f7f2") },
    { role: "arena arriba", src: join(dir, "arena.png"), esperado: false, png: pngSplit("#d4c3a1", "#f6f7f2") },
    { role: "surface arriba + hombros", src: join(dir, "hombros.png"), esperado: true, png: pngSplit("#f6f7f2", "#3a2e26", 0.4) },
  ];
  for (const f of files) writeFileSync(f.src, f.png);
  const { rows } = await medir(files.map(({ role, src }) => ({ role, src, kind: "image" as const, fondo: true })), paletaDe("a"));
  for (const [i, f] of files.entries()) {
    const r = rows[i] as { F: boolean | null; dEfondo: number | null; Hpared: number | null; Cpared: number | null; error?: string };
    assert.equal(r.error, undefined, `${f.role}: ${r.error}`);
    assert.equal(r.F, f.esperado, `${f.role}: F=${r.F} ΔE pared=${r.dEfondo} (umbral ${F_MAX}) Hpared=${r.Hpared} C=${r.Cpared}`);
  }
  const crema = rows[0] as { dEfondo: number; Hpared: number | null }; assert.ok(crema.dEfondo <= F_MAX && crema.Hpared !== null, `crema: cae por tono, no por ΔE (ΔE ${crema.dEfondo}, H ${crema.Hpared})`);
  const gris = rows[1] as { Hpared: number | null }; assert.equal(gris.Hpared, null, "gris: neutra, sin tono que juzgar");
  const base = join(import.meta.dirname, "..", "dev-fixtures", "media", "paleta-a", "_material-01");
  const tandas = ["tanda1", "tanda2", "tanda3"].map((n) => join(base, n)).filter(existsSync);
  if (!tandas.length) { t.diagnostic(`sin ${base}: las tandas reales no se comprueban en esta máquina`); return; }
  let n = 0;
  for (const td of tandas) {
    const fotos = readdirSync(td).filter((f) => /\.jpe?g$/i.test(f)).sort().map((f) => ({ role: f, src: join(td, f), kind: "image" as const, fondo: true, serie: "servicio" }));
    const res = await medir(fotos, paletaDe("a"));
    for (const r of res.rows as { role: string; F: boolean | null; dEfondo: number | null; Hpared: number | null }[]) { n++; assert.equal(r.F, true, `${td}/${r.role}: F=${r.F} ΔE pared=${r.dEfondo} Hpared=${r.Hpared}`); }
  }
  t.diagnostic(`tandas reales de A: ${n}/${n} pasan F`);
});

// MATERIAL-04 B2 (2026-09-19): K se mide sobre los mismos píxeles que T (sin la banda de piel/pelo 30–80° con C > 0,04), no sobre el
// cuadro entero: en 9:16 el pelo domina el recorte (B 7281027, rubio cálido, b +0,019 con cualquier foco) y tumbaba K aunque la
// escena fuera fría. Contra la paleta B (acento ciruela, b < 0): pared neutra-fría + pelo rubio al 40 % → K sí (antes: NO, el pelo
// calienta el promedio); pared crema cálida + acento ciruela frío al 6 % → K NO (la pared cuenta: es baja en croma, no es piel).
test("K sin piel/pelo: pared neutra + pelo rubio 40 % → K sí; pared teñida cálida + acento frío 6 % → K NO (paleta B)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "gama-k-"));
  const files = [
    { role: "pared B + pelo rubio 40 %", src: join(dir, "rubio.png"), esperado: true, png: png("#faf5f7", "#c9a27a", 0.4) },
    { role: "pared crema + ciruela 6 %", src: join(dir, "crema-ciruela.png"), esperado: false, png: png("#f3ead8", "#8a4b6b", 0.06) },
  ];
  for (const f of files) writeFileSync(f.src, f.png);
  const { rows } = await medir(files.map(({ role, src }) => ({ role, src, kind: "image" as const })), paletaDe("b"));
  for (const [i, f] of files.entries()) {
    const r = rows[i] as { K: boolean; b: number; bAll: number; error?: string };
    assert.equal(r.error, undefined, `${f.role}: ${r.error}`);
    assert.equal(r.K, f.esperado, `${f.role}: K=${r.K} b(sin piel)=${r.b} b(cuadro)=${r.bAll}`);
  }
  const rubio = rows[0] as { b: number; bAll: number };
  assert.ok(rubio.bAll > 0.01 && Math.abs(rubio.b) < 0.01, `rubio: el cuadro entero es cálido (b ${rubio.bAll}) y sin pelo queda neutro (b ${rubio.b}); medido sobre el cuadro entero K daría NO`);
  const crema = rows[1] as { b: number };
  assert.ok(crema.b > 0.01, `crema: la pared cálida cuenta aunque el acento sea frío (b ${crema.b})`);
});
