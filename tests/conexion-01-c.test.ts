// CONEXION-01 · C (T) · el material de A y C por la puerta, y la promesa medida: C1 lee los fixtures reales; C2 corre hueco.mjs --json
// real. Sesión A (2026-09-21): tests rojos (hoy los fixtures llevan 37 y 32 rutas /dev-fixtures/media/). Ningún test escribe en Storage
// ni en Firestore.
// VERDAD-06 D2 (2026-09-21, D-28 / D-19): copia editable promovida a npm test (la orden está aprobada y retirada de rojo-verde --todas;
// el original en tests/orden/conexion-01/ queda congelado). Recortada: C1 conserva sólo la lectura de los fixtures (cero
// /dev-fixtures/media/, urls con el prefijo de Storage) sin el GET con Range a cada url; C2 entera; el e2e de C3 (dos servidores,
// ≈ 2 min, sin Firestore) no se levanta desde npm test: lo cubre la orden congelada.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BUCKET, ROOT, correr, cuenta } from "./orden/conexion-01/_util.ts";

const HUECO = "tools/verdad/hueco.mjs";
const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ultimaLinea = (stdout: string) => stdout.split(/\r?\n/).filter((l) => l.trim()).pop() ?? "";

test("dev-fixtures/peluqueria-paleta-a.json y -c.json no contienen ninguna referencia a /dev-fixtures/media/; las 37 y 32 referencias de la línea base son urls `https://firebasestorage.googleapis.com/v0/b/…/o/clients%2Ftest-b4-peluqueria-<p>%2Fmedia%2F…?alt=media&token=…`", () => {
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
  assert.ok(urls.size >= 1, "precondición: hay urls de Storage en los fixtures");
});

const NUEVE = ["hero.video", "hero.video.portrait", "hero.video.poster", "staff.photoUrl", "services.images", "gallery.items", "branding.texture", "branding.localPhoto", "branding.localPhotoMobile"];
type Check = { ok: boolean; detalle: string };
type Fila = { id: string; checks: { contrato: Check; validador: Check; ui: Check; material: Check; guard: Check }; hecho: boolean };

test("hueco.mjs --json da material «sí» en hero.video, hero.video.portrait, hero.video.poster, staff.photoUrl, services.images, gallery.items, branding.texture, branding.localPhoto y branding.localPhotoMobile (nueve filas, vive=storage), y el total pasa de 2/36 a N/36 con N ≥ 2 (ocho siguen sin UI; staff.photoUrl tiene UI desde VERDAD-05 pero no guard: ninguna de las nueve cuenta como hecha)", (t) => {
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
    assert.equal(f.checks.ui.ok, id === "staff.photoUrl", id === "staff.photoUrl" ? `${id}: tiene UI en el hub desde VERDAD-05 (staff-editor.tsx)` : `${id}: sigue sin UI en el hub (CONEXION-02)`);
    assert.equal(f.hecho, false, `${id}: no cuenta como hecha`);
  }
  const n = filas.filter((f) => f.hecho).length;
  assert.ok(n >= 2, `N ≥ 2 huecos hechos (hay ${n})`);
  t.diagnostic(`línea base hueco.mjs: ${n}/36 huecos hechos (no es objetivo)`);
  const r = correr([HUECO]);
  assert.equal(ultimaLinea(r.stdout), `${n}/36 huecos hechos`, `el texto termina con «${n}/36 huecos hechos» (última línea: «${ultimaLinea(r.stdout)}»)`);
});
