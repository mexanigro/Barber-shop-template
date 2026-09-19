#!/usr/bin/env node
/**
 * paleta.mjs — envoltorio de src/lib/palette.ts para los fixtures (PALETA-01).
 * Uso: node tools/paleta.mjs <fixture>   p. ej. node tools/paleta.mjs peluqueria-paleta-a
 * Lee dev-fixtures/<fixture>.json, exige el bloque `palette: { source, origin, reason }` y escribe
 * SÓLO `branding.colors` y `branding.paletteMeta` con la salida de derivePalette; imprime el diff y los pares.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { derivePalette, failingPairs } from "../src/lib/palette.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const name = process.argv[2];
if (!name) { console.error("uso: node tools/paleta.mjs <fixture>"); process.exit(2); }
const file = path.join(ROOT, "dev-fixtures", `${name}.json`);
const fx = JSON.parse(fs.readFileSync(file, "utf8"));
if (!fx.palette?.source || !fx.palette?.origin || !fx.palette?.reason) { console.error(`${name}: falta palette { source, origin, reason }`); process.exit(2); }
const niche = fx.business?.type ?? "peluqueria";
const p = derivePalette({ ...fx.palette, niche });
const before = fx.branding?.colors ?? {};
fx.branding = { ...(fx.branding ?? {}), mode: p.meta.mode, colors: { ...p.colors }, paletteMeta: p.meta }; // D17: branding.mode viaja con la paleta
fs.writeFileSync(file, JSON.stringify(fx, null, 2) + "\n");
console.log(`${name} · fuente ${p.meta.source} (${p.meta.origin}) · modo ${p.meta.mode} · «${p.meta.reason}»`);
for (const [k, v] of Object.entries(p.colors)) console.log(`  ${k.padEnd(19)} ${(before[k] ?? "—").padEnd(7)} → ${v}${before[k] && before[k].toLowerCase() !== v ? "  (cambia)" : ""}`);
console.log("  pares:", Object.entries(p.contrast).map(([k, v]) => `${k} ${v}`).join(" · "));
const bad = failingPairs(p);
if (bad.length) { console.error("PARES BAJO 4,5:", bad); process.exit(1); }
