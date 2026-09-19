// TRANSICION-02 (T-B, 2026-09-19): el vídeo y el póster del hero se disuelven por MÁSCARA ALFA en --surface del modo; el hero
// de peluquería tiene fondo --surface y texto --text; el scrim es del mismo tono --surface; no queda banda --hero-foot, ni
// traspaso, ni costura clara a prueba (hero-seam.ts / ?seam). Guard estático: rojo si vuelve el tercer tono.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const rd = (p: string) => readFileSync(resolve(ROOT, p), "utf8").replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");

test("T-B: máscara alfa del vídeo y del póster hacia --surface, alto por --hero-mask-h; hero con fondo --surface y texto --text", () => {
  const css = rd("src/index.css"); const hero = rd("src/components/landing/hero/hero-v6.tsx");
  assert.match(css, /\.hero-v6-media\s*\{\s*-webkit-mask-image:\s*linear-gradient\(to bottom, #000 calc\(100% - var\(--hero-mask-h, 25%\)\), transparent 100%\);\s*mask-image:\s*linear-gradient\(to bottom, #000 calc\(100% - var\(--hero-mask-h, 25%\)\), transparent 100%\);\s*\}/, "index.css: .hero-v6-media sin la máscara alfa (con prefijo -webkit-)");
  assert.match(css, /--hero-mask-h:\s*(12|15|20|25)%;/, "index.css: token --hero-mask-h (12–25 %) en peluquería");
  assert.match(hero, /const mediaCls = centered \? "hero-v6-media absolute/, "hero-v6: el vídeo/póster no llevan .hero-v6-media en peluquería");
  assert.equal((hero.match(/className=\{mediaCls\}/g) || []).length, 2, "hero-v6: mediaCls debe ir en <video> y en <img>");
  assert.match(hero, /centered \? "hero-v6-box relative overflow-hidden bg-\[color:var\(--surface,#111\)\] text-foreground"/, "hero-v6: en peluquería el fondo es --surface y el texto --text");
  assert.match(hero, /const ink = centered;/, "hero-v6: el texto en peluquería siempre en --text");
});

test("sin tercer tono: el scrim de peluquería sólo usa --surface; no hay --hero-foot, traspaso, hero-seam ni ?seam", () => {
  const css = rd("src/index.css"); const hero = rd("src/components/landing/hero/hero-v6.tsx"); const backdrop = rd("src/components/landing/LocalBackdrop.tsx");
  const scrimCentered = hero.slice(hero.indexOf("const scrim = centered"), hero.indexOf(": `linear-gradient(to top, ${s(1)} 0"));
  assert.match(hero, /const l = \(a: number\) => `color-mix\(in srgb, var\(--surface, #fff\)/, "hero-v6: l() debe mezclar --surface");
  assert.ok(/\$\{l\(/.test(scrimCentered) && !/var\(--scrim|var\(--hero-foot|\$\{s\(/.test(scrimCentered), "hero-v6: el scrim de peluquería debe ser sólo --surface (l), sin --scrim ni --hero-foot");
  for (const [name, src] of [["index.css", css], ["hero-v6", hero], ["LocalBackdrop", backdrop]] as const) {
    assert.ok(!/var\(--hero-foot|--hero-handoff-h|--hero-foot-h|data-handoff/.test(src), `${name}: vuelve la banda --hero-foot / el traspaso`);
  }
  assert.ok(!existsSync(resolve(ROOT, "src/lib/hero-seam.ts")), "hero-seam.ts debe estar retirado");
  assert.ok(!/heroSeam|\?seam|data-hero-foot/.test(hero + backdrop), "quedan restos de la costura clara a prueba (S6)");
  assert.match(css, /--veil-color:\s*var\(--surface\);/, "index.css: el velo debe ser --surface sin teñir");
});
