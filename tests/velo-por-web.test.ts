// El velo sobre la foto del local se puede bajar por web desde el config (Liam, 2026-10-10, web de Hair by Flo: «el fondo, la
// imagen que está clavada, quiero que se vea un poco más… sacale el 60 % del filtro»; elegido «por web, sólo Flo») · guard.
//
// Por qué existe. El velo de las secciones en velo (services, team —e Instagram, que usa el de team—, faq y contact) es
// `color-mix(--surface, --veil-<id>)` con `--veil-<id>` fijo en index.css (0,65 en claro, 0,20 en oscuro) para toda peluquería.
// H ya validaba `sections.<id>.veil` (0–1) y site.ts lo deja pasar, pero ningún componente lo leía: un dato con validador y sin
// página. Ahora LocalBackdrop (que monta la foto del local) pone `--veil-<id>` en <html> cuando el config lo trae; sin el dato,
// nada cambia (las demás webs siguen en 0,65 / 0,20).
//
// Qué vigila, en las dos direcciones:
//   (1) `velosDeSecciones` da la variable de cada sección con un número 0–1 y deja fuera lo que no lo es (o no existe).
//   (2) LocalBackdrop la aplica en <html> y la quita al desmontar.
//   (3) Cada variable que puede escribir es la que lee index.css (si se renombra una, el dato dejaría de actuar en silencio).
// Corre en `test:unit` (D-57): lee el árbol, no abre navegador.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { velosDeSecciones, VARIABLE_DE_VELO } from "../src/lib/velos.ts";

test("velosDeSecciones: un número 0–1 por sección con velo; lo demás no se escribe", () => {
  assert.deepEqual(velosDeSecciones({ services: { veil: 0.26 }, team: { veil: 0.26 }, faq: { veil: 0 }, contact: { veil: 1 } }), {
    "--veil-services": "0.26", "--veil-team": "0.26", "--veil-faq": "0", "--veil-contact": "1",
  });
  assert.deepEqual(velosDeSecciones({ services: { veil: 1.5 }, team: { veil: "0.3" }, faq: { veil: -0.1 }, contact: {} }), {});
  assert.deepEqual(velosDeSecciones({ gallery: { veil: 0.2 } }), {}, "una sección sin velo propio no escribe nada");
  assert.deepEqual(velosDeSecciones(undefined), {});
});

test("LocalBackdrop aplica los velos del config en <html> y los quita al desmontar", () => {
  const src = readFileSync("src/components/landing/LocalBackdrop.tsx", "utf8");
  assert.match(src, /velosDeSecciones\(siteConfig\.sections\)/, "lee sections del config");
  assert.match(src, /root\.style\.setProperty\(k, v\)/, "pone cada variable en <html>");
  assert.match(src, /root\.style\.removeProperty\(k\)/, "la quita al desmontar");
});

test("cada variable que escribe es la que lee index.css", () => {
  const css = readFileSync("src/index.css", "utf8");
  for (const v of Object.values(VARIABLE_DE_VELO)) assert.match(css, new RegExp(`var\\(${v}[,)]`), `${v} no se lee en index.css`);
});
