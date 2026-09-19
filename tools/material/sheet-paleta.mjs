#!/usr/bin/env node
/**
 * sheet-paleta.mjs — hoja de una paleta de prueba (roles + ocho pares WCAG + botón/muestras), desde el fixture.
 * Uso: node tools/material/sheet-paleta.mjs <fixture> --out <png> [--titulo "…"]
 */
import { chromium } from "playwright"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { derivePalette } from "../../src/lib/palette.ts";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2); const fxName = args.find((a) => !a.startsWith("--")); const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
if (!fxName || !opt("out")) { console.error("uso: node tools/material/sheet-paleta.mjs <fixture> --out <png> [--titulo]"); process.exit(2); }
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, "dev-fixtures", `${fxName}.json`), "utf8"));
const p = derivePalette({ ...fx.palette, niche: fx.business?.type ?? "peluqueria" });
const roles = ["surface", "surfaceAlt", "text", "textMuted", "accent", "accentStrong", "accentForeground", "highlight", "highlightOnDark", "scrim"];
const c = p.colors;
const html = `<html><body style="margin:0;background:${c.surface};color:${c.text};font:14px system-ui;padding:24px;width:1100px">
<h1 style="font:600 22px system-ui;margin:0 0 6px">${opt("titulo", fxName)} · fuente ${p.meta.source} (${p.meta.origin}) · mode ${p.meta.mode}</h1>
<div style="opacity:.8;margin-bottom:16px;max-width:1000px">${fx.palette.reason}</div>
<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px">${roles.map((r) => `<div style="border:1px solid ${c.border};border-radius:8px;overflow:hidden"><div style="height:64px;background:${c[r]}"></div><div style="padding:6px 8px;background:${c.surfaceAlt}"><b>${r}</b><br>${c[r]}</div></div>`).join("")}</div>
<h2 style="font:600 16px system-ui;margin:20px 0 8px">Pares WCAG (mínimo 4,5)</h2>
<table style="border-collapse:collapse">${Object.entries(p.contrast).map(([k, v]) => `<tr><td style="padding:4px 12px;border-bottom:1px solid ${c.border}">${k}</td><td style="padding:4px 12px;border-bottom:1px solid ${c.border};font-weight:600;color:${v >= 4.5 ? c.highlight : "#f66"}">${v}</td></tr>`).join("")}</table>
<div style="margin-top:20px;display:flex;gap:12px;align-items:center"><button style="background:${c.accentStrong};color:${c.accentForeground};border:0;border-radius:8px;padding:12px 20px;font:600 15px system-ui">לקביעת תור</button><span style="color:${c.textMuted}">texto secundario</span><span style="color:${c.highlight};font-weight:600">resalte</span><span style="background:${c.card};border:1px solid ${c.border};border-radius:8px;padding:10px 14px">tarjeta</span></div>
</body></html>`;
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1150, height: 700 } }); await pg.setContent(html); await pg.screenshot({ path: opt("out"), fullPage: true }); await b.close(); console.log("hoja →", opt("out"));
