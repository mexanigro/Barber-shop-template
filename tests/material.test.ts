// MATERIAL-02 (2026-09-19): el conmutador VITE_HERO_CLIP (applyHeroClip en src/services/tenant.ts) y tools/material/tanda.mjs.
// Lo mínimo que se pone rojo si se rompen: el conmutador reescribe hero.*/hero-poster.* y deja hero-v.* y el resto intactos;
// tanda.mjs mide una carpeta con el rol pedido (servicio: serie + fondo; galería: sin F) y rechaza un rol desconocido.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { medirTanda, archivosDe } from "../tools/material/tanda.mjs";
import { paletaDe } from "../tools/gama.mjs";
import { png } from "./helpers/png.ts";

const ROOT = resolve(import.meta.dirname, "..");

test("VITE_HERO_CLIP: applyHeroClip reescribe hero.* y hero-poster.avif del fixture, no hero-v.*, y sin clip no toca nada", () => {
  // tenant.ts importa firebase e import.meta.env: se aísla la función por su texto, como hace tests/tenant-access.test.ts con vm.
  const src = readFileSync(join(ROOT, "src/services/tenant.ts"), "utf8");
  const m = src.match(/export function applyHeroClip[\s\S]*?\n}\n/);
  assert.ok(m, "applyHeroClip no está en src/services/tenant.ts");
  const js = ts.transpileModule(m[0].replace("export ", ""), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  const applyHeroClip = runInNewContext(`${js}; applyHeroClip`, {}) as (json: string, clip: string) => string;
  const fixture = readFileSync(join(ROOT, "dev-fixtures/peluqueria-paleta-a.json"), "utf8");
  const out = JSON.parse(applyHeroClip(fixture, "stock")).hero.video;
  assert.equal(out.mp4, "/dev-fixtures/media/paleta-a/hero-stock.mp4");
  assert.equal(out.webm, "/dev-fixtures/media/paleta-a/hero-stock.webm");
  assert.equal(out.poster, "/dev-fixtures/media/paleta-a/hero-stock-poster.avif");
  assert.equal(out.medium.mp4, "/dev-fixtures/media/paleta-a/hero-stock-1280.mp4", "el paisaje 1280 también cambia (MATERIAL-03)");
  assert.equal(out.medium.webm, "/dev-fixtures/media/paleta-a/hero-stock-1280.webm");
  assert.equal(out.portrait.webm, "/dev-fixtures/media/paleta-a/hero-v.webm", "el 9:16 no cambia");
  assert.equal(out.portrait.poster, "/dev-fixtures/media/paleta-a/hero-v-poster.avif");
  assert.equal(applyHeroClip(fixture, ""), fixture, "sin clip, idéntico");
  assert.equal(applyHeroClip(fixture, "  "), fixture, "clip en blanco, idéntico");
});

test("tanda.mjs: mide la carpeta con el rol pedido (servicio → S y F; galería → F no aplica) y rechaza un rol desconocido", async () => {
  const dir = mkdtempSync(join(tmpdir(), "tanda-"));
  writeFileSync(join(dir, "b.png"), png("#f6f7f2", "#5d7a57", 0.06));
  writeFileSync(join(dir, "a.png"), png("#f6f7f2", "#5d7a57", 0.06));
  writeFileSync(join(dir, "nota.txt"), "no es imagen");
  assert.deepEqual(archivosDe(dir), ["a.png", "b.png"], "ordena por nombre y omite lo que no es medible");
  const serv = await medirTanda(dir, paletaDe("a"), "servicio");
  assert.equal(serv.rows.length, 2);
  assert.deepEqual(serv.rows.map((r: { role: string }) => r.role), ["servicio 1", "servicio 2"]);
  for (const r of serv.rows as { S: boolean; F: boolean; pasa: boolean; dL: number }[]) { assert.equal(r.S, true); assert.equal(r.F, true); assert.equal(r.pasa, true); assert.equal(r.dL, 0); }
  const gal = await medirTanda(dir, paletaDe("a"), "galeria");
  for (const r of gal.rows as { S: boolean; F: boolean | null }[]) { assert.equal(r.S, true); assert.equal(r.F, null, "galería: F no aplica"); }
  await assert.rejects(() => medirTanda(dir, paletaDe("a"), "otro"), /rol desconocido/);
});
