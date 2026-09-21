// CONEXION-01 · C (T) · el material de A y C por la puerta, y la promesa medida: C1 lee los fixtures reales y hace un GET con Range a cada
// url distinta de Storage (≤ 10 s por url, cinco a la vez); C2 corre hueco.mjs --json real; C3 reutiliza el e2e de VERDAD-05 C1
// (`recrear --paleta a --sin-firestore --paginas home --vistas 375 --puerto <libre>`) y exige cero brechas de material. Sesión A
// (2026-09-21): tests rojos (hoy los fixtures llevan 37 y 32 rutas /dev-fixtures/media/ y recrear A da 25 brechas de material). C3 levanta
// servidores en un puerto de 40000–49151 (B1 usa 30000–39999). Ningún test escribe en Storage ni en Firestore (--sin-firestore siempre).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { BUCKET, ROOT, conTemporalAsync, correr, correrLargo, cuenta, puertoLibreEn, tipoDe } from "./_util.ts";

const HUECO = "tools/verdad/hueco.mjs";
const RECREAR = "tools/verdad/recrear.mjs";
const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ultimaLinea = (stdout: string) => stdout.split(/\r?\n/).filter((l) => l.trim()).pop() ?? "";

test("dev-fixtures/peluqueria-paleta-a.json y -c.json no contienen ninguna referencia a /dev-fixtures/media/; las 37 y 32 referencias de la línea base son urls `https://firebasestorage.googleapis.com/v0/b/…/o/clients%2Ftest-b4-peluqueria-<p>%2Fmedia%2F…?alt=media&token=…`; y cada url distinta responde 200 a un GET con `Range: bytes=0-0` y el content-type de su extensión", async () => {
  const urls = new Set<string>();
  for (const [p, minimo] of [["a", 37], ["c", 32]] as const) {
    const texto = readFileSync(resolve(ROOT, `dev-fixtures/peluqueria-paleta-${p}.json`), "utf8");
    assert.equal(cuenta(texto, "/dev-fixtures/media/"), 0, `peluqueria-paleta-${p}.json no referencia /dev-fixtures/media/ (hay ${cuenta(texto, "/dev-fixtures/media/")})`);
    const prefijo = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/clients%2Ftest-b4-peluqueria-${p}%2Fmedia%2F`;
    const refs = texto.match(new RegExp(`${escapar(prefijo)}[A-Za-z0-9._%-]+\\?alt=media&token=[A-Za-z0-9-]+`, "g")) ?? [];
    assert.ok(refs.length >= minimo, `peluqueria-paleta-${p}.json: ≥ ${minimo} urls con el prefijo exacto «${prefijo}» (hay ${refs.length})`);
    assert.equal(cuenta(texto, prefijo), refs.length, "cada aparición del prefijo es una url completa (<rol>%2F<nombre>?alt=media&token=…)");
    for (const u of refs) urls.add(u);
  }
  // Cada url distinta: GET con Range bytes=0-0 → 200 o 206 y content-type de su extensión; ≤ 10 s por url, cinco a la vez.
  const lista = [...urls], fallos: string[] = [];
  let i = 0;
  await Promise.all(Array.from({ length: 5 }, async () => {
    while (i < lista.length) {
      const u = lista[i++];
      const nombre = decodeURIComponent(u.slice(0, u.indexOf("?")).split("%2F").pop() ?? "");
      try {
        const r = await fetch(u, { headers: { Range: "bytes=0-0" }, signal: AbortSignal.timeout(10000) });
        await r.arrayBuffer();
        const tipo = (r.headers.get("content-type") ?? "").split(";")[0].trim();
        if (r.status !== 200 && r.status !== 206) fallos.push(`${nombre}: status ${r.status}`);
        else if (tipo !== tipoDe(nombre)) fallos.push(`${nombre}: content-type «${tipo}», esperado «${tipoDe(nombre)}»`);
      } catch (e) { fallos.push(`${nombre}: ${(e as Error).message}`); }
    }
  }));
  assert.ok(lista.length >= 1, "precondición: hay urls que comprobar");
  assert.deepEqual(fallos, [], `cada url de Storage responde 200/206 al GET con Range y con el content-type de su extensión (${lista.length} urls)`);
});

const NUEVE = ["hero.video", "hero.video.portrait", "hero.video.poster", "staff.photoUrl", "services.images", "gallery.items", "branding.texture", "branding.localPhoto", "branding.localPhotoMobile"];
type Check = { ok: boolean; detalle: string };
type Fila = { id: string; checks: { contrato: Check; validador: Check; ui: Check; material: Check; guard: Check }; hecho: boolean };

test("hueco.mjs --json da material «sí» en hero.video, hero.video.portrait, hero.video.poster, staff.photoUrl, services.images, gallery.items, branding.texture, branding.localPhoto y branding.localPhotoMobile (nueve filas, vive=storage), y el total pasa de 2/36 a N/36 con N ≥ 2 (las nueve siguen sin UI: no cuentan como hechas)", (t) => {
  const contratos = JSON.parse(readFileSync(resolve(ROOT, "verdad/contratos.json"), "utf8")) as { huecos: { id: string; material?: { vive?: string } }[] };
  for (const id of NUEVE) assert.equal(contratos.huecos.find((h) => h.id === id)?.material?.vive, "storage", `precondición: ${id} vive=storage en contratos.json`);
  const j = correr([HUECO, "--json"]);
  assert.ok(j.status === 0 || j.status === 2, `hueco.mjs --json sale 0 o 2 (salió ${j.status})\n${j.out.slice(-2000)}`);
  const filas = JSON.parse(j.stdout) as Fila[];
  assert.equal(filas.length, 36);
  for (const id of NUEVE) {
    const f = filas.find((x) => x.id === id);
    assert.ok(f, `fila ${id}`);
    assert.equal(f.checks.material.ok, true, `${id}: material debe ser «sí» (${f.checks.material.detalle})`);
    assert.match(f.checks.material.detalle, /^https:\/\/firebasestorage\.googleapis\.com\//, `${id}: el material vive en Storage (${f.checks.material.detalle})`);
    assert.equal(f.checks.ui.ok, false, `${id}: sigue sin UI en el hub (CONEXION-02)`);
    assert.equal(f.hecho, false, `${id}: no cuenta como hecha`);
  }
  const n = filas.filter((f) => f.hecho).length;
  assert.ok(n >= 2, `N ≥ 2 huecos hechos (hay ${n})`);
  t.diagnostic(`línea base hueco.mjs: ${n}/36 huecos hechos (no es objetivo)`);
  const r = correr([HUECO]);
  assert.equal(ultimaLinea(r.stdout), `${n}/36 huecos hechos`, `el texto termina con «${n}/36 huecos hechos» (última línea: «${ultimaLinea(r.stdout)}»)`);
});

type Brecha = { tipo: string; campo: string; hueco: string | null; detalle?: string };
type Informe = { firestore?: string; brechas: Brecha[]; diffs: { pagina: string; vista: number; pixels: number; size?: boolean }[]; bootstrap?: { fixture?: string; clientId?: string } };

test("recrear.mjs --paleta a --sin-firestore --paginas home --vistas 375 --puerto <libre> no produce ninguna brecha «material que producción no sirve» ni registra petición alguna a /dev-fixtures/media/; las brechas que queden son de otro tipo (diff, sin contrato)", async () => {
  const puerto = await puertoLibreEn(40000, 49151);
  await conTemporalAsync(async (tmp) => {
    const out = join(tmp, "out");
    const r = correrLargo([RECREAR, "--paleta", "a", "--sin-firestore", "--paginas", "home", "--vistas", "375", "--puerto", String(puerto), "--out", out]);
    assert.ok(r.status === 0 || r.status === 2, `recrear sale 0 (sin brechas) o 2 (con brechas de otro tipo); salió ${r.status}\n${r.out.slice(-4000)}`);
    const ruta = join(out, "recrear-a.json");
    assert.ok(existsSync(ruta), `recrear-a.json escrito en --out\n${r.out.slice(-3000)}`);
    const informe = JSON.parse(readFileSync(ruta, "utf8")) as Informe;
    assert.equal(informe.firestore, "saltado (--sin-firestore): declarado");
    // El e2e corrió entero: los dos servidores levantaron (bootstrap del fixture y del clientId), las dos capturas están y el diff se calculó.
    assert.ok(informe.bootstrap && /peluqueria-paleta-a\.json/.test(informe.bootstrap.fixture ?? ""), `el servidor con fixture aplicó dev-fixtures/peluqueria-paleta-a.json: ${JSON.stringify(informe.bootstrap)}`);
    for (const f of ["fixture-a-375-home.png", "recrear-a-375-home.png"]) assert.ok(existsSync(join(out, f)) && statSync(join(out, f)).size > 0, `captura ${f} escrita`);
    const diff = informe.diffs.find((d) => d.pagina === "home" && d.vista === 375);
    assert.ok(diff && typeof diff.pixels === "number", `diff home 375 calculado: ${JSON.stringify(informe.diffs)}`);
    assert.ok(!r.out.includes("puerto ocupado") && !/captura con .* falló/.test(r.out), `ninguna brecha de servidor\n${r.out.slice(-3000)}`);
    // Cero brechas de material y ningún campo bajo /dev-fixtures/media/; lo que quede es diff o sin contrato.
    const material = informe.brechas.filter((b) => b.tipo === "material que producción no sirve");
    assert.equal(material.length, 0, `ninguna brecha «material que producción no sirve»: ${JSON.stringify(material.slice(0, 10))}`);
    assert.ok(informe.brechas.every((b) => !String(b.campo).startsWith("/dev-fixtures/media/")), `ninguna petición a /dev-fixtures/media/: ${JSON.stringify(informe.brechas.filter((b) => String(b.campo).startsWith("/dev-fixtures/media/")).slice(0, 10))}`);
    const otros = informe.brechas.filter((b) => !["diff ≠ 0", "sin contrato"].includes(b.tipo));
    assert.deepEqual(otros, [], `las brechas que queden son «diff ≠ 0» o «sin contrato» (tipos: ${[...new Set(informe.brechas.map((b) => b.tipo))].join(", ")})`);
  });
});
