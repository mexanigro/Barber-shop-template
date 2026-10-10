// El texto sobre foto o vídeo (`--on-media`) se lee en los dos modos de peluquería (Liam, 2026-10-10, web de Maestro: orden de
// arreglar «Menú invisible») · guard.
//
// Por qué existe. En peluquería `--on-media` valía `var(--surface)`: en claro la superficie es clara y el texto del navbar sobre el
// hero se lee; en oscuro la superficie es casi negra, así que arriba del todo el ícono del menú, los enlaces y el selector de idioma
// se pintaban casi del color del hero. Medido a 375 en Maestro, la web C y Evyatar (botón «פתיחת תפריט» en rgb(32,25,20) sobre el
// hero oscuro); en Yulia (clara) se ve. `--on-scrim` ya tenía su corrección de oscuro (`html.dark … { --on-scrim: var(--text) }`).
//
// Qué vigila, en las dos direcciones, con los colores reales de las plantillas A (clara) y C (oscura):
//   (1) en oscuro, `--on-media` contrasta ≥ 4,5:1 con el scrim de la paleta (es texto sobre media oscurecida por el scrim);
//   (2) en claro sigue siendo `--surface` (lo aprobado no cambia) y también contrasta ≥ 4,5:1 con el scrim;
//   (3) el navbar v6 sobre el hero pinta con `text-on-media` (el ícono del menú, los enlaces y la marca de texto).
// Corre en `test:unit` (D-57): lee el árbol, no abre navegador.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { contrastRatio } from "../src/lib/oklab.ts";

const css = readFileSync("src/index.css", "utf8");
const nav = readFileSync("src/components/layout/navbar/navbar-v6.tsx", "utf8");
const paleta = (p: string) => JSON.parse(readFileSync(`dev-fixtures/peluqueria-paleta-${p}.json`, "utf8")).branding.colors as Record<string, string>;

/** El último valor de `--on-media` declarado en un bloque cuyo selector es exactamente `sel`. */
function onMedia(sel: string): string | undefined {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const vals = [...css.matchAll(new RegExp(`(?:^|\\})\\s*${esc}\\s*\\{([^}]*)\\}`, "g"))]
    .map((m) => m[1].match(/--on-media:\s*var\(--([\w-]+)\)/)?.[1]).filter(Boolean) as string[];
  return vals.at(-1);
}
const rol = (r: string) => ({ surface: "surface", text: "text", "text-muted": "textMuted", scrim: "scrim" } as Record<string, string>)[r] ?? r;

test("(1) en oscuro, el texto sobre media contrasta con el scrim (plantilla C)", () => {
  const r = onMedia('html.dark[data-niche="peluqueria"]') ?? onMedia('html[data-niche="peluqueria"]');
  assert.ok(r, "index.css declara --on-media para peluquería");
  const c = paleta("c"); const color = c[rol(r!)];
  const k = contrastRatio(color, c.scrim);
  assert.ok(k >= 4.5, `oscuro: --on-media = var(--${r}) = ${color} sobre el scrim ${c.scrim} da ${k.toFixed(2)}:1 (< 4,5): el menú no se ve sobre el hero`);
});

test("(2) en claro sigue siendo la superficie y contrasta con el scrim (plantilla A)", () => {
  const r = onMedia('html[data-niche="peluqueria"]');
  assert.equal(r, "surface", "en claro --on-media sigue siendo var(--surface) (aprobado)");
  const a = paleta("a"); const k = contrastRatio(a[rol(r!)], a.scrim);
  assert.ok(k >= 4.5, `claro: ${a.surface} sobre ${a.scrim} da ${k.toFixed(2)}:1`);
});

test("(3) el navbar v6 sobre el hero pinta el menú y los enlaces con text-on-media", () => {
  assert.match(nav, /overHero \? "text-on-media" : "text-foreground hover:bg-muted"/, "el botón del menú");
  assert.match(nav, /overHero \? "text-on-media\/85 hover:text-on-media"/, "los enlaces");
});
