// VERDAD-05 · A · verdad/contratos.json: el gemelo legible por máquina de CONTRATOS-HUECOS.md (36 filas, campos fijos, ids de 2016255,
// cada contrato.campo literal en el .md). Sesión A (2026-09-21): test rojo (hoy T no tiene verdad/). Lee el JSON y el .md real con fs.
// CONEXION-01 D2 (2026-09-21): copia editable promovida a npm test (la orden está aprobada y retirada de rojo-verde --todas; el original
// en tests/orden/verdad-05/ queda congelado).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BLOQUE_REAL, ROOT } from "./orden/verdad-05/_util.ts";

/** Los 36 ids de 2016255:verdad/contratos.json, en su orden (la hoja los lista; el test compara el conjunto y exige que no se repitan). */
const IDS = ["paleta", "branding.mode", "hero.video", "hero.video.portrait", "hero.video.poster", "hero.eyebrow", "hero.titular", "hero.subtitle", "hero.cta", "hero.mask", "hero.alto", "contact.phone", "testimonials.rating", "staff.photoUrl", "services.catalogo", "services.priceMax", "services.mode", "services.images", "services.featured", "services.surface", "pagina.servicios", "gallery.items", "gallery.items.alt", "gallery.selection", "gallery.variant", "gallery.surface", "gallery.presion", "pagina.galeria", "branding.texture", "branding.localPhoto", "branding.localPhotoMobile", "branding.heroToBackdrop", "brand.logo", "brand.logoDark", "navbar.variant", "features.themeToggle"];
const VIVE = ["config", "locale", "public", "storage"];

const esTexto = (v: unknown): v is string => typeof v === "string" && v.length > 0;

test("verdad/contratos.json existe con `{ \"$comment\", \"huecos\": [36 filas] }`, cada fila con id, seccion, ruta, tipo, clave, contrato.campo, validador (null o {archivo, funcion}), ui (null o {ruta, componente, campo?}), material.vive ∈ config|locale|public|storage y guard (null o {archivo, clave?}); los 36 ids son exactamente los de 2016255 (paleta, branding.mode, hero.video, hero.video.portrait, hero.video.poster, hero.eyebrow, hero.titular, hero.subtitle, hero.cta, hero.mask, hero.alto, contact.phone, testimonials.rating, staff.photoUrl, services.catalogo, services.priceMax, services.mode, services.images, services.featured, services.surface, pagina.servicios, gallery.items, gallery.items.alt, gallery.selection, gallery.variant, gallery.surface, gallery.presion, pagina.galeria, branding.texture, branding.localPhoto, branding.localPhotoMobile, branding.heroToBackdrop, brand.logo, brand.logoDark, navbar.variant, features.themeToggle); ningún id repetido; y cada `contrato.campo` aparece literal en CONTRATOS-HUECOS.md", () => {
  assert.equal(IDS.length, 36, "precondición: la hoja lista 36 ids");
  const ruta = resolve(ROOT, "verdad/contratos.json");
  assert.ok(existsSync(ruta), "falta T verdad/contratos.json");
  const j = JSON.parse(readFileSync(ruta, "utf8")) as { $comment?: unknown; huecos?: unknown };
  assert.deepEqual(Object.keys(j).sort(), ["$comment", "huecos"], "sólo { \"$comment\", \"huecos\" }");
  assert.ok(esTexto(j.$comment), "$comment es un texto");
  assert.ok(Array.isArray(j.huecos), "huecos es un array");
  const filas = j.huecos as Record<string, unknown>[];
  assert.equal(filas.length, 36, `36 filas (hay ${filas.length})`);
  const ids = filas.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length, `ningún id repetido: ${ids.filter((id, i) => ids.indexOf(id) !== i).join(", ")}`);
  assert.deepEqual([...ids].sort(), [...IDS].sort(), "los 36 ids son exactamente los de 2016255");
  const md = readFileSync(resolve(BLOQUE_REAL, "CONTRATOS-HUECOS.md"), "utf8");
  for (const f of filas) {
    const id = String(f.id);
    for (const k of ["id", "seccion", "ruta", "tipo", "clave"]) assert.ok(esTexto(f[k]), `${id}: «${k}» debe ser un texto (hay ${JSON.stringify(f[k])})`);
    const contrato = f.contrato as { campo?: unknown } | null | undefined;
    assert.ok(contrato && esTexto(contrato.campo), `${id}: contrato.campo debe ser un texto`);
    const validador = f.validador as { archivo?: unknown; funcion?: unknown } | null;
    assert.ok(validador === null || (validador && esTexto(validador.archivo) && esTexto(validador.funcion)), `${id}: validador es null o {archivo, funcion} (hay ${JSON.stringify(f.validador)})`);
    const ui = f.ui as { ruta?: unknown; componente?: unknown; campo?: unknown } | null;
    assert.ok(ui === null || (ui && esTexto(ui.ruta) && esTexto(ui.componente) && (ui.campo === undefined || esTexto(ui.campo))), `${id}: ui es null o {ruta, componente, campo?} (hay ${JSON.stringify(f.ui)})`);
    const material = f.material as { vive?: unknown } | null | undefined;
    assert.ok(material && VIVE.includes(String(material.vive)), `${id}: material.vive ∈ ${VIVE.join("|")} (hay ${JSON.stringify(f.material)})`);
    const guard = f.guard as { archivo?: unknown; clave?: unknown } | null;
    assert.ok(guard === null || (guard && esTexto(guard.archivo) && (guard.clave === undefined || esTexto(guard.clave))), `${id}: guard es null o {archivo, clave?} (hay ${JSON.stringify(f.guard)})`);
    // (1) el contrato: el texto `campo` está literal en el .md real (es lo que hueco.mjs comprueba como primer lugar).
    assert.ok(md.includes(contrato.campo), `${id}: «${contrato.campo}» no aparece literal en CONTRATOS-HUECOS.md`);
  }
});
