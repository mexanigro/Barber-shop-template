// Liam, 2026-10-09 (web de Yulia) · guard: en peluquería la pieza de galería no pinta una tarjeta propia detrás de la foto.
//
// Por qué existe. Las fotos «fuera de cuadro» de la galería (el marco y la persona que sale de él) llegan como PNG con fondo
// transparente: alrededor del marco tiene que verse la textura de la página, «exactamente igual», para que la pieza parezca
// estar realmente por encima. La pieza pintaba su propio fondo (`.gal-piece` → var(--card) en la home, `.gal-page-piece` →
// var(--surface-alt) en /galeria), que asomaba como una tarjeta clara. Con fotos opacas (A, C y la flota) ese fondo nunca se
// ve: la foto lo tapa entera.
//
// Qué vigila, en las dos direcciones:
//   (1) En peluquería, `.gal-piece` y `.gal-page-piece` llevan `background: transparent`, después de su regla base (misma
//       especificidad o más: gana por orden).
//   (2) Al apoyar o con hover en /galeria la sombra sigue la forma de la imagen (`filter: drop-shadow`) y no la caja
//       (`box-shadow: none`): una sombra de caja dibujaría el rectángulo alrededor del marco transparente. En la home la
//       sombra de caja ya queda recortada por `.gal-cell` (overflow: hidden).
//   (3) La flota no cambia: las reglas base conservan su fondo, y ninguna regla nueva sale de html[data-niche="peluqueria"].
// Corre en `test:unit` (D-57): lee el árbol, no abre navegador.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(import.meta.dirname, "..", "src/index.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const reglas = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim(), cuerpo: m[2], pos: m.index ?? 0 }));
const PEL = 'html[data-niche="peluqueria"]';
const base = (clase: string) => reglas.find((r) => r.sel === clase && /background:/.test(r.cuerpo));
const transparente = (clase: string) =>
  reglas.find((r) => r.sel.split(/,\s*/).some((p) => p.trim() === `${PEL} ${clase}`) && /background:\s*transparent/.test(r.cuerpo));

test("en peluquería la pieza de galería (home y /galeria) no pinta fondo propio, después de su regla base", () => {
  for (const clase of [".gal-piece", ".gal-page-piece"]) {
    const b = base(clase), t = transparente(clase);
    assert.ok(b, `falta la regla base de ${clase}`);
    assert.ok(t, `falta «${PEL} ${clase} { background: transparent }»`);
    assert.ok(t.pos > b.pos, `${clase}: la regla de peluquería va después de la base`);
  }
});

test("en /galeria de peluquería la sombra al apoyar o con hover sigue la forma de la imagen, no la caja", () => {
  const r = reglas.find((x) => x.sel.includes(`${PEL} .gal-page-piece[data-pressed]`) && /filter:\s*drop-shadow/.test(x.cuerpo));
  assert.ok(r, "falta la sombra drop-shadow de .gal-page-piece[data-pressed] en peluquería");
  assert.match(r.cuerpo, /box-shadow:\s*none/);
  const h = css.match(/@media \(hover: hover\)\s*\{[^{}]*html\[data-niche="peluqueria"\] \.gal-page-piece:hover\s*\{([^{}]*)\}/);
  assert.ok(h, "falta el :hover de .gal-page-piece en peluquería");
  assert.match(h[1], /filter:\s*drop-shadow/);
  assert.match(h[1], /box-shadow:\s*none/);
});

test("la flota no cambia: las reglas base conservan su fondo y lo nuevo es sólo de peluquería", () => {
  assert.match(base(".gal-piece")!.cuerpo, /background:\s*var\(--card\)/);
  assert.match(base(".gal-page-piece")!.cuerpo, /background:\s*var\(--surface-alt\)/);
  const nuevas = reglas.filter((r) => /gal-(page-)?piece/.test(r.sel) && /transparent|drop-shadow/.test(r.cuerpo));
  assert.ok(nuevas.length > 0);
  for (const r of nuevas) for (const p of r.sel.split(/,\s*/)) assert.ok(p.trim().startsWith(PEL), `regla sin peluquería: ${p}`);
});
