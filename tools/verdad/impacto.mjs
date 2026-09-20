#!/usr/bin/env node
/**
 * impacto.mjs — regresión por impacto (VERDAD-01, R-V2). Grafo de imports de T (resolución propia de import/export/@import,
 * sin dependencias) → cada archivo tocado y todo lo que lo importa (cierre inverso) se clasifica en {secciones, páginas,
 * paletas, nichos} → pruebas y capturas obligatorias. Archivos compartidos (index.css, site.ts, section-variants.ts, App.tsx,
 * main.tsx, types.ts, themes.ts, motion.ts) o cualquier componente de la flota (variantes v1–v5 y originales) → regresión de
 * los seis obligatoria. Lo tocado no se omite; lo no tocado no se prueba por las dudas.
 *
 *   node tools/verdad/impacto.mjs --staged            lo que está en el índice (pre-commit)
 *   node tools/verdad/impacto.mjs --archivos a,b,c    lista explícita (relativa a T)
 *   [--json]                                          salida JSON; siempre exit 0 (informa, veredicto decide)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT, HERMANO, etiqueta, git } from "../_git.mjs";

export const T = etiqueta(ROOT) === "T" ? ROOT : HERMANO;
const EXT = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".css"];
export const COMPARTIDOS = ["src/index.css", "src/config/site.ts", "src/lib/section-variants.ts", "src/App.tsx", "src/main.tsx", "src/types.ts", "src/config/presets/themes.ts", "src/lib/motion.ts", "src/config/locale.ts"];
const SECCIONES = ["hero", "services", "gallery", "team", "testimonials", "faq", "instagram", "contact", "why-choose-us", "before-after", "navbar", "fondo", "footer", "whatsapp-fab"];
const ORIGINALES = { Hero: "hero", Services: "services", Gallery: "gallery", GalleryTeaser: "gallery", Team: "team", Testimonials: "testimonials", FAQ: "faq", InstagramFeed: "instagram", InstagramTeaser: "instagram", ContactHub: "contact", WhyChooseUs: "why-choose-us", BeforeAfter: "before-after", LocalBackdrop: "fondo", LandingBackdrop: "fondo", Ambience: "fondo", Location: "contact", BusinessHours: "contact", QuickInquiry: "contact", Menu: "services", Philosophy: "why-choose-us", Portfolio: "gallery", Process: "services", SectionDivider: "fondo" };
const SEIS = ["barberia", "estetica", "tattoo", "nails", "cafeteria", "remodelaciones"];
const rel = (abs) => path.relative(T, abs).replace(/\\/g, "/");

function resolver(desde, spec) {
  let basePath;
  if (spec.startsWith("@/")) basePath = path.join(T, spec.slice(2));
  else if (spec.startsWith(".")) basePath = path.resolve(path.dirname(desde), spec);
  else return null; // paquete
  const cands = [basePath, ...EXT.map((e) => basePath + e), ...EXT.map((e) => path.join(basePath, "index" + e))];
  for (const c of cands) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  return null;
}
const RE_IMPORT = /(?:^|\n)\s*(?:import|export)\s+(?:[^'"`;]*?\s+from\s+)?['"]([^'"]+)['"]|\bimport\(\s*['"]([^'"]+)['"]\s*\)|@import\s+(?:url\()?['"]([^'"]+)['"]/g;

/** Grafo: { importa: Map<archivo, Set<archivo>>, importadoPor: Map<archivo, Set<archivo>> } con rutas relativas a T. */
export function grafo(root = T) {
  const archivos = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== "node_modules") walk(p); } else if (EXT.some((x) => e.name.endsWith(x))) archivos.push(p); } };
  walk(path.join(root, "src"));
  for (const extra of ["server.ts", "vite.config.ts"]) { const p = path.join(root, extra); if (fs.existsSync(p)) archivos.push(p); }
  const importa = new Map(), importadoPor = new Map();
  for (const abs of archivos) {
    const src = fs.readFileSync(abs, "utf8"); const a = rel(abs); if (!importa.has(a)) importa.set(a, new Set());
    for (const m of src.matchAll(RE_IMPORT)) { const spec = m[1] ?? m[2] ?? m[3]; const dest = spec && resolver(abs, spec); if (!dest) continue; const b = rel(dest); importa.get(a).add(b); if (!importadoPor.has(b)) importadoPor.set(b, new Set()); importadoPor.get(b).add(a); }
  }
  return { importa, importadoPor, archivos: archivos.map(rel) };
}

/** Clasifica un archivo por su ruta. */
export function clasificar(f) {
  const c = { secciones: [], paginas: [], paletas: [], nichos: [], compartido: false, flota: false };
  if (COMPARTIDOS.includes(f)) { c.compartido = true; return c; }
  let m;
  if ((m = f.match(/^src\/config\/presets\/([a-z]+)\.(en|he|ru|ar)\.ts$/))) { c.nichos.push(m[1]); return c; }
  if (/^src\/lib\/(palette|site-theme|oklab)\.ts$/.test(f)) { c.paletas.push("a", "b", "c"); return c; }
  if ((m = f.match(/^src\/components\/landing\/([a-z-]+)\/(.+)$/))) {
    const sec = SECCIONES.includes(m[1]) ? m[1] : m[1];
    c.secciones.push(sec);
    const v = m[2].match(/-v(\d+)\.tsx$/); const fam = /^(estetica|aura)\//.test(m[2]);
    if (fam || (v && +v[1] <= 5) || (!v && !/piece|lightbox/.test(m[2]))) c.flota = true; // v1–v5, familias y auxiliares viejos sirven a los seis
    if (v && +v[1] >= 6) c.nichos.push("peluqueria");
    return c;
  }
  if ((m = f.match(/^src\/components\/landing\/([A-Za-z0-9-]+)\.tsx$/))) { const sec = ORIGINALES[m[1]] ?? m[1].toLowerCase(); c.secciones.push(sec); c.flota = true; return c; }
  if (/^src\/components\/gallery\//.test(f)) { c.paginas.push("galeria"); c.nichos.push("peluqueria"); return c; }
  if (/^src\/components\/services\//.test(f)) { c.paginas.push("servicios"); if (/-v6|ServicesPage/.test(f)) c.nichos.push("peluqueria"); return c; }
  if (/^src\/components\/admin\//.test(f)) { c.paginas.push("admin"); c.flota = true; return c; }
  if (/^src\/components\/(navbar|Navbar|WhatsAppFab|floating)/i.test(f)) { c.secciones.push(/whatsapp/i.test(f) ? "whatsapp-fab" : "navbar"); c.flota = true; return c; }
  if (/^src\/lib\/gallery\.ts$/.test(f)) { c.secciones.push("gallery"); c.paginas.push("galeria"); c.nichos.push("peluqueria"); return c; }
  return c; // sin clasificar: cuenta por lo que lo importa
}

/** Impacto de una lista de archivos tocados (relativos a T). */
export function impactoDe(tocados, g = grafo()) {
  const vistos = new Set(), cola = [...tocados];
  while (cola.length) { const f = cola.pop(); if (vistos.has(f)) continue; vistos.add(f); for (const p of g.importadoPor.get(f) ?? []) cola.push(p); }
  const r = { tocados, alcanzados: [...vistos], secciones: new Set(), paginas: new Set(), paletas: new Set(), nichos: new Set(), compartido: false };
  let flota = false;
  for (const f of vistos) {
    const c = clasificar(f);
    c.secciones.forEach((s) => r.secciones.add(s)); c.paginas.forEach((s) => r.paginas.add(s)); c.paletas.forEach((s) => r.paletas.add(s)); c.nichos.forEach((s) => r.nichos.add(s));
  }
  // «seis» sólo por lo TOCADO: un compartido tocado, un componente de la flota tocado, o un archivo sin clasificar (helper) cuyo
  // cierre alcanza la flota. Que un despachador de la flota (Hero.tsx) importe hero-v6 no hace que tocar v6 toque a los seis.
  for (const f of tocados) {
    const c = clasificar(f);
    if (c.compartido) r.compartido = true;
    else if (c.flota) flota = true;
    else if (!c.secciones.length && !c.paginas.length && !c.paletas.length && !c.nichos.length) {
      // sube por los importadores; en el primer nodo clasificado se detiene (su `flota` decide; no se sigue hasta el despachador)
      const cola = [...(g.importadoPor.get(f) ?? [])], vis = new Set();
      while (cola.length && !flota) {
        const x = cola.pop(); if (vis.has(x)) continue; vis.add(x);
        const cx = clasificar(x);
        if (cx.flota || cx.compartido) flota = true;
        else if (!cx.secciones.length && !cx.paginas.length && !cx.nichos.length) for (const p of g.importadoPor.get(x) ?? []) cola.push(p);
      }
    }
  }
  if (r.compartido) { r.nichos.add("seis"); r.nichos.add("peluqueria"); SECCIONES.slice(0, 8).forEach((s) => r.secciones.add(s)); }
  else if (flota) r.nichos.add("seis");
  // tests obligatorios: los que importan o nombran (cadena "src/…" o "tools/…") algún archivo alcanzado, más los test tocados
  const testsDir = path.join(T, "tests"); const tests = fs.existsSync(testsDir) ? fs.readdirSync(testsDir).filter((f) => f.endsWith(".test.ts")).map((f) => `tests/${f}`) : [];
  const menciona = new Set([...vistos, ...tocados]);
  r.pruebas = tests.filter((t) => { if (tocados.includes(t)) return true; const s = fs.readFileSync(path.join(T, t), "utf8"); for (const f of menciona) { if (s.includes(f) || s.includes(f.replace(/\.tsx?$/, ""))) return true; } for (const sec of r.secciones) if (new RegExp(`\\b${sec.replace("-", "[-_ ]?")}\\b`, "i").test(path.basename(t)) || (sec === "gallery" && /galeria/.test(t))) return true; return false; });
  if (["hero", "gallery", "services"].some((s) => r.secciones.has(s)) && tests.includes("tests/webkit-ios.test.ts")) r.pruebas.push("tests/webkit-ios.test.ts");
  for (const f of tocados) { const m = f.match(/^tests\/mutaciones\/(.+)\.mjs$/); if (m && tests.includes(`tests/${m[1]}.test.ts`)) r.pruebas.push(`tests/${m[1]}.test.ts`); } // una mutación tocada re-prueba su suite
  r.pruebas = [...new Set(r.pruebas)].sort();
  // capturas obligatorias: por página impactada × paleta {a,c} × vista {375,1280}; las secciones de la home caen en "home"
  const paginas = new Set([...r.paginas]); if (r.secciones.size) paginas.add("home");
  r.capturas = [];
  for (const pg of paginas) if (pg !== "admin") for (const pal of ["a", "c"]) for (const v of [375, 1280]) r.capturas.push(`recrear-${pal}-${v}-${pg}.png`);
  for (const k of ["secciones", "paginas", "paletas", "nichos"]) r[k] = [...r[k]].sort();
  return r;
}

export function staged(cwd = T) {
  return git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"], cwd).split("\n").filter(Boolean);
}
export function impactoStaged(cwd = ROOT) {
  if (etiqueta(cwd) !== "T") return { tocados: staged(cwd), alcanzados: [], secciones: [], paginas: [], paletas: [], nichos: [], pruebas: [], capturas: [], nota: "impacto sólo grafica T; en H no hay secciones" };
  return impactoDe(staged(cwd));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const i = args.indexOf("--archivos");
  const tocados = i >= 0 ? args[i + 1].split(",").map((s) => s.trim()).filter(Boolean) : staged();
  const r = impactoDe(tocados);
  if (args.includes("--json")) console.log(JSON.stringify(r, null, 1));
  else {
    console.log(`impacto · tocados ${r.tocados.length}: ${r.tocados.join(", ") || "—"}`);
    console.log(`  alcanzados ${r.alcanzados.length} · secciones [${r.secciones}] · páginas [${r.paginas}] · paletas [${r.paletas}] · nichos [${r.nichos}]${r.compartido ? " · COMPARTIDO → regresión seis" : ""}`);
    console.log(`  pruebas obligatorias (${r.pruebas.length}): ${r.pruebas.join(", ") || "—"}`);
    console.log(`  capturas obligatorias (${r.capturas.length}): ${r.capturas.join(", ") || "—"}${r.nichos.includes("seis") ? " + regresion-seis/report.txt" : ""}`);
  }
}
