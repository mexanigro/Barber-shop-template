// Probe which production URLs respond for every known demo project.
// Output: scripts/regression/sites.json with the canonical reachable URL per site.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const PROJECTS = [
  "demo-santi-mq3luclw",
  "demo-lekt-grigori-mpyhjweg",
  "demo-martellin-mpfwij1m",
  "demo-future-tattoo",
  "barber-shop-template",
  "demo-pintureria-el-paolo-mpfwkvuh",
  "demo-future-tattoo-piercing-mq743hl4",
  "demo-cafe-aristano-mpfwjz7c",
  "demo-estetica-prueba-mpfvpl5u",
  "demo-igal-tattz",
  "demo-velvet-muse",
  "demo-marganink",
  "demo-gooli-ink",
  "barber-shop-template-en",
  "demo-u-as-de-mar-mpfynv07",
  "demo-dari-inks",
  "remodelaciones-template",
  "cafeteria-soft-template",
  "nails-template",
  "tattoo-template",
];

// Vercel prod URLs as reported by `vercel project ls` (some names get truncated by Vercel)
const VERCEL_URL = {
  "demo-future-tattoo-piercing-mq743hl4": "https://demo-future-tattoo-piercing-mq743hl.vercel.app/",
  "barber-shop-template": "https://barber-shop-template-ten.vercel.app/",
  "nails-template": "https://nails-template-zeta.vercel.app/",
  "tattoo-template": "https://tattoo-template-lac.vercel.app/",
};

// extra arzac.studio candidates the user mentioned that don't match a project name 1:1
const EXTRA = [
  "https://demo-barberia.arzac.studio/",
  "https://demo-estetica.arzac.studio/",
  "https://demo-nails.arzac.studio/",
  "https://demo-cafeteria.arzac.studio/",
  "https://demo-remodelaciones.arzac.studio/",
  "https://demo-tattoo.arzac.studio/",
];

async function probe(url) {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 15000);
    const res = await fetch(url, { redirect: "follow", signal: ctl.signal });
    clearTimeout(t);
    const html = await res.text();
    const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] ?? null;
    const niche = (html.match(/data-niche="([^"]+)"/) || [])[1] ?? null;
    return { url, status: res.status, finalUrl: res.url, title, niche, isSpa: html.includes('id="root"') };
  } catch (e) {
    return { url, status: 0, error: String(e.cause?.code || e.message || e).slice(0, 80) };
  }
}

const results = [];
for (const name of PROJECTS) {
  const candidates = [
    `https://${name}.arzac.studio/`,
    VERCEL_URL[name] || `https://${name}.vercel.app/`,
  ];
  const probes = await Promise.all(candidates.map(probe));
  const ok = probes.find((p) => p.status === 200 && p.isSpa);
  results.push({ project: name, canonical: ok?.url ?? null, probes });
  console.log(name.padEnd(40), probes.map((p) => `${p.url.replace("https://", "").split("/")[0]}=${p.status}`).join("  "));
}
console.log("--- extras ---");
const extraResults = await Promise.all(EXTRA.map(probe));
for (const p of extraResults) console.log(p.url.padEnd(50), p.status, p.title ?? p.error ?? "");

fs.writeFileSync(
  path.join(ROOT, "scripts", "regression", "sites.json"),
  JSON.stringify({ results, extras: extraResults }, null, 2)
);
console.log("WROTE scripts/regression/sites.json");
