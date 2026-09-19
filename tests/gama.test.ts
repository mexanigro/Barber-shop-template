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

test("GAMA-02: T mira los píxeles con color — acento 6 % pasa, lila 6 % tumba, piel 30 % no cuenta", async () => {
  const dir = mkdtempSync(join(tmpdir(), "gama-"));
  const files = [
    { role: "acento 6 %", src: join(dir, "acento.png"), kind: "image" as const, esperado: true, png: png("#f6f7f2", "#5d7a57", 0.06) },
    { role: "lila 6 %", src: join(dir, "lila.png"), kind: "image" as const, esperado: false, png: png("#f6f7f2", "#b48ad0", 0.06) },
    { role: "piel 30 %", src: join(dir, "piel.png"), kind: "image" as const, esperado: true, png: png("#f6f7f2", "#c9a27a", 0.3) },
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
});

// MATERIAL-02 (2026-09-19): F mide la pared (la mejor de las dos esquinas superiores), no el borde entero. Sintéticos partidos y,
// si están instaladas, las tandas reales de MATERIAL-01 (dev-fixtures/media/paleta-a/_material-01/tanda{1,2}, ignoradas por git).
// Hallazgo de calibración (hueco 6): la crema #f3ead8 pedida como «pared equivocada» queda a ΔE 0,019 de surface-alt, MENOS que las
// paredes reales correctas (0,024–0,049): con ΔE OKLab ningún umbral la separa; se fija como aserción documental y la pared que
// tumba es arena #d4c3a1 (0,129 de surface-alt).
test("F recalibrada: pared arena arriba tumba (crema no es separable: documentado); surface + hombros oscuros pasa; tandas 1 y 2 de A pasan F", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "gama-f-"));
  const files = [
    { role: "arena arriba", src: join(dir, "arena.png"), esperado: false, png: pngSplit("#d4c3a1", "#f6f7f2") },
    { role: "surface arriba + hombros", src: join(dir, "hombros.png"), esperado: true, png: pngSplit("#f6f7f2", "#3a2e26", 0.4) },
    { role: "crema arriba (no separable)", src: join(dir, "crema.png"), esperado: true, png: pngSplit("#f3ead8", "#f6f7f2") },
  ];
  for (const f of files) writeFileSync(f.src, f.png);
  const { rows } = await medir(files.map(({ role, src }) => ({ role, src, kind: "image" as const, fondo: true })), paletaDe("a"));
  for (const [i, f] of files.entries()) {
    const r = rows[i] as { F: boolean | null; dEfondo: number | null; error?: string };
    assert.equal(r.error, undefined, `${f.role}: ${r.error}`);
    assert.equal(r.F, f.esperado, `${f.role}: F=${r.F} ΔE pared=${r.dEfondo} (umbral ${F_MAX})`);
  }
  const crema = rows[2] as { dEfondo: number }; assert.ok(crema.dEfondo < 0.03, `crema: ΔE ${crema.dEfondo}; si esto sube, la calibración cambió y hay que revisar la nota`);
  const base = join(import.meta.dirname, "..", "dev-fixtures", "media", "paleta-a", "_material-01");
  const tandas = ["tanda1", "tanda2"].map((n) => join(base, n)).filter(existsSync);
  if (!tandas.length) { t.diagnostic(`sin ${base}: las tandas reales no se comprueban en esta máquina`); return; }
  for (const td of tandas) {
    const fotos = readdirSync(td).filter((f) => /\.jpe?g$/i.test(f)).sort().map((f) => ({ role: f, src: join(td, f), kind: "image" as const, fondo: true, serie: "servicio" }));
    const res = await medir(fotos, paletaDe("a"));
    for (const r of res.rows as { role: string; F: boolean | null; dEfondo: number | null }[]) assert.equal(r.F, true, `${td}/${r.role}: F=${r.F} ΔE pared=${r.dEfondo}`);
  }
});
