// R25 (Liam, 2026-10-08, web de Evyatar) · guard: dos secciones de velo seguidas no llevan fundido entre ellas.
//
// Por qué existe. Team, instagram y contacto v6 dejan ver la MISMA foto del local (velo) y cada una trae su rampa hacia --surface
// (::after abajo, ::before arriba), pensadas para pegar con la sección de textura que va en medio (reseñas o faq). Con reseñas
// ocultas, team queda pegada a instagram y las dos rampas pintaban una franja oscura entre dos fondos iguales: «una transición
// donde hay dos imágenes iguales» (R25). La regla de index.css las apaga sólo cuando dos de esas secciones son contiguas.
//
// Qué vigila, en las dos direcciones:
//   (1) Existe la regla y apaga (display: none) el ::after de la de arriba y el ::before de la de abajo, sólo en peluquería.
//   (2) Cubre los tres pares que pueden quedar contiguos en el orden de peluquería: team→instagram, instagram→contacto, team→contacto.
//   (3) No toca un velo contiguo a una textura: ninguna de las secciones de textura (galería, reseñas, faq) entra en la regla.
//   (4) Va después de las rampas que apaga (misma especificidad: gana por orden).
// Medido en la web de Evyatar (sin reseñas) a 375 y 1280: sin la regla, franja oscura de 48 + 128 px entre team e instagram sobre
// la misma foto; con la regla, la foto corre entera. Con las reseñas a la vista (A y C) no hay dos velos seguidos y no cambia nada.
// Corre en `test:unit` (D-57): lee el árbol, no abre navegador.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(import.meta.dirname, "..", "src/index.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const VELOS = { team: 'section#team[data-team="v6"]', instagram: 'section#instagram[data-ig="v6"]', contact: 'section#contact[data-ct="v6"]' };
const reglas = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim(), cuerpo: m[2], pos: m.index ?? 0 }));
const regla = reglas.find((r) => /display:\s*none/.test(r.cuerpo) && r.sel.includes(":has(+") && r.sel.includes(VELOS.team) && r.sel.includes(VELOS.instagram));

test("R25 · existe la regla que apaga las rampas entre dos velos seguidos, sólo en peluquería", () => {
  assert.ok(regla, "falta la regla «display: none» de los velos contiguos en src/index.css");
  const partes = regla.sel.split(/,\s*(?![^()]*\))/).map((s) => s.trim());
  assert.equal(partes.length, 2, `dos selectores (::after de arriba, ::before de abajo), hay ${partes.length}`);
  assert.ok(partes.every((p) => p.startsWith('html[data-niche="peluqueria"]')), "cada selector empieza por html[data-niche=\"peluqueria\"]");
  assert.ok(partes.some((p) => p.endsWith("::after") && p.includes(":has(+")), "el ::after de la sección de arriba, por :has(+ …)");
  assert.ok(partes.some((p) => p.endsWith("::before") && /\)\s*\+\s*:is\(/.test(p)), "el ::before de la sección de abajo, por «+»");
});

test("R25 · cubre team→instagram, instagram→contacto y team→contacto", () => {
  assert.ok(regla);
  const arriba = regla.sel.match(/:is\(([^()]*(?:\([^()]*\)[^()]*)*)\)\s*:has/)?.[1] ?? "";
  const abajo = regla.sel.match(/:has\(\+\s*:is\(([^()]*)\)\)/)?.[1] ?? "";
  for (const s of [VELOS.team, VELOS.instagram]) assert.ok(arriba.includes(s), `arriba falta ${s}`);
  for (const s of [VELOS.instagram, VELOS.contact]) assert.ok(abajo.includes(s), `abajo falta ${s}`);
});

test("R25 · no toca un velo pegado a una textura (galería, reseñas, faq quedan fuera)", () => {
  assert.ok(regla);
  for (const id of ["#gallery", "#testimonials", "#faq", "#services"]) assert.ok(!regla.sel.includes(`section${id}`), `la regla nombra ${id}`);
});

test("R25 · va después de las rampas que apaga (gana por orden)", () => {
  assert.ok(regla);
  const rampas = reglas.filter((r) => /::(before|after)\s*$/.test(r.sel) && Object.values(VELOS).some((v) => r.sel.endsWith(`${v}::before`) || r.sel.endsWith(`${v}::after`)));
  assert.ok(rampas.length >= 6, `esperaba las 6 rampas de team, instagram y contacto, hay ${rampas.length}`);
  for (const r of rampas) assert.ok(r.pos < regla.pos, `la rampa «${r.sel.slice(-60)}» va después de la regla`);
});
