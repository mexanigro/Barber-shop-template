// D17 / R8 (TRANSICION-02, 2026-09-19): el modo (claro/oscuro) es de la paleta (`branding.mode`), nunca del nicho.
// Incumplimiento detectado en TRANSICION-01: main.tsx forzaba `html.light` para peluquería por lista de nichos y la paleta C
// (oscura) se servía en claro. Guard: (i) unidad de applyBootMode; (ii) estático: main.tsx sin lista de nichos, decide por
// getNicheDefaultMode(); (iii) Playwright sobre la página real (Vite en proceso): fixture C → html.dark, A → html.light,
// y un nicho de la flota sin fixture (barberia) → sigue en dark (sin cambio de comportamiento).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { applyBootMode } from "../src/lib/boot-mode";

const ROOT = resolve(import.meta.dirname, "..");
const fakeRoot = () => { const set = new Set<string>(["dark"]); return { classList: { remove: (...c: string[]) => c.forEach((x) => set.delete(x)), add: (c: string) => set.add(c) }, has: (c: string) => set.has(c) }; };

test("applyBootMode: pone la clase del modo real y respeta la preferencia guardada", () => {
  const a = fakeRoot(); assert.equal(applyBootMode(a, "light", null), "light"); assert.ok(a.has("light") && !a.has("dark"));
  const b = fakeRoot(); assert.equal(applyBootMode(b, "dark", null), "dark"); assert.ok(b.has("dark") && !b.has("light"));
  const c = fakeRoot(); assert.equal(applyBootMode(c, "light", "dark"), null); assert.ok(c.has("dark") && !c.has("light"), "con preferencia guardada no toca nada");
});

test("main.tsx decide el modo por getNicheDefaultMode() (branding.mode), sin lista de nichos", () => {
  const main = readFileSync(resolve(ROOT, "src/main.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");
  assert.ok(!/lightNiches|\["estetica", "nails", "peluqueria"\]/.test(main), "main.tsx sigue decidiendo el modo por nicho");
  assert.match(main, /const bootMode = getNicheDefaultMode\(\)/, "main.tsx no toma el modo de getNicheDefaultMode()");
  assert.match(main, /applyBootMode\(document\.documentElement, bootMode, localStorage\.getItem\("vite-ui-theme"\)\)/);
  assert.match(main, /defaultTheme=\{bootMode\}/);
  const theme = readFileSync(resolve(ROOT, "src/lib/site-theme.ts"), "utf8");
  assert.match(theme, /const m = siteConfig\.branding\?\.mode;\s*if \(m === "dark" \|\| m === "light"\) return m;/, "getNicheDefaultMode no lee branding.mode primero");
});

test("página real: fixture C (mode dark) → html.dark; A (light) → html.light; barberia sin fixture → dark", async () => {
  const { createServer } = await import("vite");
  const b = await chromium.launch();
  const casos: [string, string, "dark" | "light"][] = [["peluqueria", "peluqueria-paleta-c", "dark"], ["peluqueria", "peluqueria-paleta-a", "light"], ["barberia", "", "dark"]];
  try {
    for (const [niche, fixture, esperado] of casos) {
      process.env.VITE_ACTIVE_NICHE = niche; process.env.VITE_UI_LANGUAGE = "he"; process.env.VITE_DEMO_MODE = "false"; process.env.VITE_FIREBASE_API_KEY = ""; process.env.VITE_TENANT_FIXTURE = fixture; process.env.VITE_HERO_CLIP = "";
      const vite = await createServer({ configFile: resolve(ROOT, "vite.config.ts"), root: ROOT, server: { port: 0, strictPort: false, host: "127.0.0.1" }, logLevel: "silent" });
      await vite.listen();
      const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
      const p = await ctx.newPage();
      try {
        await p.goto(vite.resolvedUrls!.local[0], { waitUntil: "networkidle" });
        await p.waitForSelector("#hero"); await p.waitForTimeout(400);
        const m = await p.evaluate(`({ dark: document.documentElement.classList.contains("dark"), light: document.documentElement.classList.contains("light"), niche: document.documentElement.dataset.niche })`) as { dark: boolean; light: boolean; niche: string };
        assert.equal(m.niche, niche, `nicho servido ${m.niche}`);
        assert.equal(m.dark, esperado === "dark", `${niche}/${fixture || "sin fixture"}: html.dark=${m.dark}, esperado ${esperado}`);
        assert.equal(m.light, esperado === "light", `${niche}/${fixture || "sin fixture"}: html.light=${m.light}, esperado ${esperado}`);
      } finally { await ctx.close(); await vite.close(); }
    }
  } finally { await b.close(); }
});
