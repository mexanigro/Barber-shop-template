// PALETA-01 (2026-09-18): la derivación de SISTEMA-COLOR § 5 vive en src/lib/palette.ts.
// Aserciones de la verificación 2b/2c: pares WCAG ≥ 4,5 en A y B, mutaciones (amarillo, negro) y cuatro tonos más.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { derivePalette, failingPairs, CONTRAST_PAIRS, MIN_CONTRAST } from "../src/lib/palette.ts";
import { hexToLch, hexToOklab, deltaE } from "../src/lib/oklab.ts";

const reason = "prueba: paleta con lógica para el test";
const A = derivePalette({ source: "#5d7a57", origin: "eleccion", reason, niche: "peluqueria" });
const B = derivePalette({ source: "#8a4b6b", origin: "eleccion", reason, niche: "peluqueria" });

test("A y B: los ocho pares WCAG ≥ 4,5, citados", () => {
  for (const [name, p] of [["A", A], ["B", B]] as const) {
    for (const pair of CONTRAST_PAIRS) assert.ok(p.contrast[pair] >= MIN_CONTRAST, `${name} ${pair} = ${p.contrast[pair]}`);
    assert.deepEqual(failingPairs(p), []);
  }
});

test("A y B: los diez roles derivados coinciden con los ejemplos aprobados de SISTEMA-COLOR (ΔE ≤ 0,03)", () => {
  const roles = ["surface", "surfaceAlt", "text", "textMuted", "accent", "accentStrong", "accentForeground", "highlight", "highlightOnDark", "scrim"] as const;
  const ejemplo = {
    A: { surface: "#f6f7f2", surfaceAlt: "#ebeee6", text: "#1b1f1a", textMuted: "#5f665a", accent: "#5d7a57", accentStrong: "#4f6b4a", accentForeground: "#f6f7f2", highlight: "#3f5a3b", highlightOnDark: "#c9d9c3", scrim: "#141813" },
    B: { surface: "#faf5f7", surfaceAlt: "#f1e9ee", text: "#221720", textMuted: "#6f5f69", accent: "#8a4b6b", accentStrong: "#7d3f60", accentForeground: "#faf5f7", highlight: "#6e3a58", highlightOnDark: "#e8c6d8", scrim: "#1e141c" },
  };
  for (const [name, p] of [["A", A], ["B", B]] as const) for (const k of roles) {
    const d = deltaE(hexToOklab(ejemplo[name][k]), hexToOklab(p.colors[k]));
    assert.ok(d <= 0.03, `${name} ${k}: ΔE ${d.toFixed(3)} (${ejemplo[name][k]} vs ${p.colors[k]})`);
  }
});

test("mutación: amarillo puro → paleta válida con accentStrong de L bajada; negro/blanco/gris → error explícito", () => {
  const y = derivePalette({ source: "#ffff00", origin: "eleccion", reason, niche: "peluqueria" });
  assert.deepEqual(failingPairs(y), []);
  assert.ok(hexToLch(y.colors.accentStrong).L < 0.6, `accentStrong L ${hexToLch(y.colors.accentStrong).L}`);
  assert.ok(hexToLch(y.colors.accentStrong).L < hexToLch("#ffff00").L);
  for (const s of ["#000000", "#ffffff", "#808080"]) {
    assert.throws(() => derivePalette({ source: s, origin: "logo", reason, niche: "peluqueria" }), /color fuente negro\/blanco: elegir con lógica \(§ 5\.1\)/);
  }
  assert.throws(() => derivePalette({ source: "#5d7a57", origin: "logo", reason: "", niche: "peluqueria" }), /reason obligatorio/);
});

test("cuatro tonos más (rojo, azul, naranja, verde-azulado): todos los pares ≥ 4,5 y scrim ≠ #000", () => {
  for (const s of ["#c0392b", "#2c5aa0", "#e67e22", "#1f8a8a"]) {
    const p = derivePalette({ source: s, origin: "eleccion", reason, niche: "peluqueria" });
    assert.deepEqual(failingPairs(p), [], s);
    assert.notEqual(p.colors.scrim, "#000000", s);
    assert.ok(hexToLch(p.colors.scrim).C >= 0.01, `${s} scrim con tono`);
    assert.equal(p.meta.source, s);
  }
});

test("los fixtures A y B son salidas de la función (branding.colors == derivePalette(palette))", () => {
  for (const f of ["peluqueria-paleta-a", "peluqueria-paleta-b"]) {
    const fx = JSON.parse(readFileSync(new URL(`../dev-fixtures/${f}.json`, import.meta.url), "utf8"));
    assert.ok(fx.palette?.source && fx.palette?.reason, `${f} sin bloque palette`);
    const p = derivePalette({ ...fx.palette, niche: "peluqueria" });
    for (const [k, v] of Object.entries(p.colors)) assert.equal(fx.branding.colors[k], v, `${f} branding.colors.${k}`);
    assert.equal(fx.branding.paletteMeta?.source, p.meta.source);
  }
});
