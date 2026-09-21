// VERDAD-05 · B · hueco.mjs: los cinco lugares de verdad y no por nombre (B1 sobre un par temporal T/H por HIGIENE_ROOTS + HIGIENE_BLOQUE,
// B2 sobre los repos reales en HEAD, B3 --id / --json y la función exportada comprobarFila por node -e). Sesión A (2026-09-21): tests
// rojos (hoy T no tiene tools/verdad/hueco.mjs ni verdad/contratos.json). Caja negra: `node tools/verdad/hueco.mjs …` con spawnSync.
// CONEXION-01 D2 (2026-09-21): copia editable promovida a npm test (la orden está aprobada y retirada de rojo-verde --todas; el original
// en tests/orden/verdad-05/ queda congelado).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, conTemporal, correr, nodeE, par, ultimoJson, valorEn } from "./orden/verdad-05/_util.ts";

const HUECO = "tools/verdad/hueco.mjs";
const LUGARES = ["contrato", "validador", "ui", "material", "guard"] as const;
type Check = { ok: boolean; detalle: string };
type Fila = { id: string; seccion: string; checks: Record<(typeof LUGARES)[number], Check>; hecho: boolean };

/** Ids de 2016255 (los mismos que A1 exige). */
const IDS36 = ["paleta", "branding.mode", "hero.video", "hero.video.portrait", "hero.video.poster", "hero.eyebrow", "hero.titular", "hero.subtitle", "hero.cta", "hero.mask", "hero.alto", "contact.phone", "testimonials.rating", "staff.photoUrl", "services.catalogo", "services.priceMax", "services.mode", "services.images", "services.featured", "services.surface", "pagina.servicios", "gallery.items", "gallery.items.alt", "gallery.selection", "gallery.variant", "gallery.surface", "gallery.presion", "pagina.galeria", "branding.texture", "branding.localPhoto", "branding.localPhotoMobile", "branding.heroToBackdrop", "brand.logo", "brand.logoDark", "navbar.variant", "features.themeToggle"];

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Líneas de la tabla (una por fila: «<id> | …»), sin la cabecera «hueco | …». */
const filasTabla = (stdout: string) => stdout.split(/\r?\n/).filter((l) => /^[\w.-]+\s*\|/.test(l) && !/^hueco\s*\|/.test(l));
const ultimaLinea = (stdout: string) => stdout.split(/\r?\n/).filter((l) => l.trim()).pop() ?? "";
const comprobarForma = (f: Fila) => {
  assert.equal(typeof f.id, "string", "id");
  assert.equal(typeof f.seccion, "string", `${f.id}: seccion`);
  assert.equal(typeof f.hecho, "boolean", `${f.id}: hecho`);
  assert.deepEqual(Object.keys(f.checks).sort(), [...LUGARES].sort(), `${f.id}: checks son exactamente ${LUGARES.join(", ")}`);
  for (const l of LUGARES) { assert.equal(typeof f.checks[l].ok, "boolean", `${f.id}.${l}.ok`); assert.equal(typeof f.checks[l].detalle, "string", `${f.id}.${l}.detalle`); }
  assert.equal(f.hecho, LUGARES.every((l) => f.checks[l].ok), `${f.id}: hecho = los cinco ok`);
};

// ── B1: par temporal con dos filas HECHAS (storage https, public en T/public/) y una fila por cada «no» ─────────────────────────────
const VALIDADOR = "src/lib/config-validator.ts", COMPONENTE = "src/components/client-content-tab.tsx", RUTA_UI = "/clients/[clientId]";
const base = (id: string, ruta: string, vive: string, extra: Record<string, unknown> = {}) => ({
  id, seccion: "prueba", ruta, tipo: "prueba", clave: id,
  contrato: { campo: `\`${ruta}\`` },
  validador: { archivo: VALIDADOR, funcion: "validateVariantContracts" },
  ui: { ruta: RUTA_UI, componente: COMPONENTE, campo: id },
  material: { vive },
  guard: { archivo: "tests/uno.test.ts", clave: id },
  ...extra,
});
const FILAS = [
  base("hero.video", "hero.video.mp4", "storage"),                                                    // HECHO: https en el fixture A
  base("brand.logo", "brand.logo", "public"),                                                         // HECHO: archivo bajo T/public/
  base("hero.eyebrow", "hero.eyebrow", "config", { contrato: { campo: "`hero.eyebrow.inexistente`" } }), // no: contrato ausente en el .md
  base("contact.phone", "contact.phone", "config", { validador: { archivo: VALIDADOR, funcion: "noExportada" } }), // no: función no exportada
  base("navbar.variant", "navbar.variant", "config", { ui: { ruta: `${RUTA_UI}/inexistente`, componente: COMPONENTE, campo: "navbar.variant" } }), // no: page.tsx ausente
  base("hero.video.poster", "hero.video.poster", "storage"),                                          // no: valor bajo /dev-fixtures/
  base("hero.subtitle", "hero.subtitle", "config", { guard: { archivo: "tests/fuera.test.ts", clave: "hero.subtitle" } }), // no: guard fuera de npm test
];
const NO: Record<string, (typeof LUGARES)[number]> = { "hero.eyebrow": "contrato", "contact.phone": "validador", "navbar.variant": "ui", "hero.video.poster": "material", "hero.subtitle": "guard" };
const CLAVES = "hero.video brand.logo hero.eyebrow contact.phone navbar.variant hero.video.poster hero.subtitle";

test("node tools/verdad/hueco.mjs [--id <id>] [--json] comprueba por fila los cinco lugares: (1) contrato = `contrato.campo` literal en CONTRATOS-HUECOS.md; (2) validador = el archivo de H existe, exporta la función (`export function|const <nombre>`) y su texto nombra la clave; (3) UI = `H/src/app/<ui.ruta>/page.tsx` existe y `H/<ui.componente>` existe y nombra `ui.campo` o la clave; (4) material = el valor de `ruta` está en el fixture A y, según `material.vive`: config|locale presente, storage = URL https, public = archivo bajo T/public/, y cualquier `/dev-fixtures/` es «producción no sirve dev-fixtures/media»; (5) guard = el archivo de T existe, está en el script `test` de package.json y nombra `guard.clave` o la clave; una fila está HECHA sólo con los cinco; exit 0 si todas las filas pedidas están hechas, 2 si no, con un detalle por cada «no» que nombra el lugar; HIGIENE_ROOTS=<T>;<H> sustituye las raíces sólo para pruebas", () => {
  conTemporal((tmp) => {
    const { T, H } = par(tmp);
    const bloque = join(tmp, "bloque");
    mkdirSync(bloque, { recursive: true });
    // (1) el .md temporal nombra los campos de las filas menos «hero.eyebrow.inexistente».
    writeFileSync(join(bloque, "CONTRATOS-HUECOS.md"), "# CONTRATOS-HUECOS temporal\n\n| `hero.video.mp4` | `brand.logo` | `hero.eyebrow` | `contact.phone` | `navbar.variant` | `hero.video.poster` | `hero.subtitle` |\n");
    // (2) y (3) en el H temporal: validador exportado que nombra las claves, otra función sin exportar, ruta montada y componente.
    H.escribir({
      [VALIDADOR]: `// nombra: ${CLAVES}\nexport function validateVariantContracts(config: unknown) { return []; }\nfunction noExportada(config: unknown) { return []; }\n`,
      "src/app/clients/[clientId]/page.tsx": "export default function Page() { return null; }\n",
      [COMPONENTE]: `// nombra: ${CLAVES}\nexport function ClientContentTab() { return null; }\n`,
    });
    // (4) y (5) en el T temporal: contratos.json, fixture A, public/, guards y package.json con el script test.
    T.escribir({
      "verdad/contratos.json": JSON.stringify({ $comment: "temporal VERDAD-05 B1", huecos: FILAS }, null, 1),
      "dev-fixtures/peluqueria-paleta-a.json": JSON.stringify({
        hero: { video: { mp4: "https://storage.googleapis.com/prueba/hero.mp4", poster: "/dev-fixtures/media/paleta-a/hero-poster.avif" }, eyebrow: "טקסט", subtitle: "כותרת" },
        brand: { logo: "/logo.svg" }, contact: { phone: "03-612-4477" }, navbar: { variant: "floating" },
      }),
      "public/logo.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\"/>\n",
      "package.json": JSON.stringify({ name: "t-temporal", private: true, scripts: { test: "tsx --test tests/uno.test.ts" } }),
      "tests/uno.test.ts": `// guard en npm test; nombra: ${CLAVES}\n`,
      "tests/fuera.test.ts": "// guard que existe pero no está en npm test; nombra: hero.subtitle\n",
    });
    const env = { HIGIENE_ROOTS: `${T.dir};${H.dir}`, HIGIENE_BLOQUE: bloque };
    // Texto: exit 2, dos hechas de siete y un detalle por cada «no» que nombra el lugar.
    const r = correr([HUECO], { env });
    assert.equal(r.status, 2, `con cinco filas sin hacer debe salir 2 (salió ${r.status})\n${r.out}`);
    assert.equal(filasTabla(r.stdout).length, FILAS.length, `una línea de tabla por fila\n${r.stdout}`);
    assert.equal(ultimaLinea(r.stdout), "2/7 huecos hechos", `termina con «2/7 huecos hechos»\n${r.stdout}`);
    for (const [id, lugar] of Object.entries(NO)) assert.match(r.stdout, new RegExp(`^.*\\b${escapar(id)}\\b.*\\b${lugar}\\b`, "m"), `un detalle nombra «${id}» y el lugar «${lugar}»\n${r.stdout}`);
    assert.match(r.stdout, /producción no sirve dev-fixtures\/media/, "el material bajo /dev-fixtures/ se explica como «producción no sirve dev-fixtures/media»");
    // JSON: en cada fila «no» falla sólo su lugar; las dos hechas tienen los cinco.
    const j = correr([HUECO, "--json"], { env });
    assert.equal(j.status, 2, `--json también sale 2 (salió ${j.status})\n${j.out}`);
    const filas = JSON.parse(j.stdout) as Fila[];
    assert.deepEqual(filas.map((f) => f.id), FILAS.map((f) => f.id), "las siete filas, en su orden");
    for (const f of filas) {
      comprobarForma(f);
      const lugar = NO[f.id];
      if (!lugar) { assert.ok(f.hecho, `${f.id} debe estar HECHA: ${JSON.stringify(f.checks)}`); continue; }
      assert.equal(f.checks[lugar].ok, false, `${f.id}: «${lugar}» debe ser no`);
      for (const otro of LUGARES) if (otro !== lugar) assert.ok(f.checks[otro].ok, `${f.id}: «${otro}» debe ser sí (${f.checks[otro].detalle})`);
      assert.equal(f.hecho, false);
    }
    assert.match(filas.find((f) => f.id === "hero.video.poster")!.checks.material.detalle, /producción no sirve dev-fixtures\/media/);
    // --id: exit 0 con una fila hecha, 2 con una fila sin hacer.
    const hecha = correr([HUECO, "--id", "hero.video"], { env });
    assert.equal(hecha.status, 0, `--id hero.video (los cinco) debe salir 0 (salió ${hecha.status})\n${hecha.out}`);
    assert.equal(ultimaLinea(hecha.stdout), "1/1 huecos hechos", `--id hero.video termina con «1/1 huecos hechos»\n${hecha.stdout}`);
    const noHecha = correr([HUECO, "--id", "hero.eyebrow"], { env });
    assert.equal(noHecha.status, 2, `--id hero.eyebrow (sin contrato) debe salir 2 (salió ${noHecha.status})\n${noHecha.out}`);
  });
});

// ── B2: los repos reales en HEAD (línea base, no objetivo) ───────────────────────────────────────────────────────────────────────────
test("Sobre los repos reales en HEAD, hueco.mjs sale 2, imprime 36 filas y termina con «N/36 huecos hechos»; N se registra en la entrega como línea base, no como objetivo; la fila paleta tiene contrato, material y guard en «sí» y UI en «no» («sin UI en el hub (CONEXION-01)»); ninguna fila con `/dev-fixtures/media` en el fixture A tiene material en «sí»", (t) => {
  const r = correr([HUECO]);
  assert.equal(r.status, 2, `hueco.mjs real debe salir 2 (salió ${r.status})\n${r.out.slice(-3000)}`);
  const tabla = filasTabla(r.stdout);
  assert.equal(tabla.length, 36, `36 filas de tabla (hay ${tabla.length})\n${r.stdout}`);
  for (const id of IDS36) assert.ok(tabla.some((l) => new RegExp(`^${escapar(id)}\\s*\\|`).test(l)), `falta la fila «${id}»`);
  const m = ultimaLinea(r.stdout).match(/^(\d+)\/36 huecos hechos$/);
  assert.ok(m, `termina con «N/36 huecos hechos» (última línea: «${ultimaLinea(r.stdout)}»)`);
  t.diagnostic(`línea base hueco.mjs: ${m[1]}/36 huecos hechos (no es objetivo)`);
  const j = correr([HUECO, "--json"]);
  assert.equal(j.status, 2, `--json real debe salir 2 (salió ${j.status})`);
  const filas = JSON.parse(j.stdout) as Fila[];
  assert.equal(filas.length, 36);
  for (const f of filas) comprobarForma(f);
  assert.equal(filas.filter((f) => f.hecho).length, Number(m[1]), "N del texto = filas hechas del JSON");
  const paleta = filas.find((f) => f.id === "paleta");
  assert.ok(paleta, "fila paleta");
  for (const l of ["contrato", "material", "guard"] as const) assert.ok(paleta.checks[l].ok, `paleta.${l} debe ser sí (${paleta.checks[l].detalle})`);
  assert.equal(paleta.checks.ui.ok, false, "paleta.ui debe ser no");
  assert.ok(paleta.checks.ui.detalle.includes("sin UI en el hub (CONEXION-01)"), `paleta.ui: «${paleta.checks.ui.detalle}»`);
  // Ninguna fila cuyo valor en el fixture A real cae bajo /dev-fixtures/media tiene material en «sí» (D-18).
  const fixtureA = JSON.parse(readFileSync(resolve(ROOT, "dev-fixtures/peluqueria-paleta-a.json"), "utf8"));
  const contratos = JSON.parse(readFileSync(resolve(ROOT, "verdad/contratos.json"), "utf8")) as { huecos: { id: string; ruta: string }[] };
  let devFixtures = 0;
  for (const h of contratos.huecos) {
    const valor = JSON.stringify(valorEn(fixtureA, h.ruta) ?? "");
    if (!valor.includes("/dev-fixtures/media")) continue;
    devFixtures++;
    const f = filas.find((x) => x.id === h.id);
    assert.ok(f, `fila ${h.id} en el JSON`);
    assert.equal(f.checks.material.ok, false, `${h.id}: valor bajo /dev-fixtures/media (${valor.slice(0, 60)}) no puede tener material en «sí»`);
  }
  // CONEXION-01 (2026-09-21): el material de A vive en Storage; el fixture A ya no referencia /dev-fixtures/media (la precondición de la
  // hoja de VERDAD-05, «37 rutas», era el estado anterior). El bucle de arriba sigue vigilando que ninguna ruta local cuente como material.
  assert.equal(devFixtures, 0, "CONEXION-01: el fixture A real ya no tiene material bajo /dev-fixtures/media");
});

// ── B3: --id inexistente, --id paleta, --json y la función exportada comprobarFila ───────────────────────────────────────────────────
test("hueco.mjs --id <id inexistente> sale 2 con «sin filas»; --id paleta imprime una sola fila; --json devuelve un array con {id, seccion, checks: {contrato, validador, ui, material, guard} cada uno {ok, detalle}, hecho}", () => {
  const nada = correr([HUECO, "--id", "no-existe"]);
  assert.equal(nada.status, 2, `--id inexistente debe salir 2 (salió ${nada.status})\n${nada.out}`);
  assert.match(nada.out, /sin filas/, `debe decir «sin filas»\n${nada.out}`);
  const una = correr([HUECO, "--id", "paleta"]);
  const tabla = filasTabla(una.stdout);
  assert.equal(tabla.length, 1, `--id paleta imprime una sola fila (hay ${tabla.length})\n${una.stdout}`);
  assert.match(tabla[0], /^paleta\s*\|/);
  assert.match(ultimaLinea(una.stdout), /^[01]\/1 huecos hechos$/);
  const j = correr([HUECO, "--id", "paleta", "--json"]);
  const filas = JSON.parse(j.stdout) as Fila[];
  assert.ok(Array.isArray(filas) && filas.length === 1, "--json --id paleta: array de una fila");
  comprobarForma(filas[0]);
  assert.equal(filas[0].id, "paleta");
  // La función exportada, en proceso aparte: comprobarFila(fila, contexto()) da lo mismo que --json para esa fila.
  const url = JSON.stringify(pathToFileURL(resolve(ROOT, HUECO)).href);
  const r = nodeE(`import { comprobarFila, contexto, leerContratos } from ${url};\nconst fila = leerContratos().huecos.find((h) => h.id === "paleta");\nconsole.log(JSON.stringify(comprobarFila(fila, contexto())));`);
  assert.equal(r.status, 0, `comprobarFila/contexto/leerContratos deben importarse y correr (exit ${r.status})\n${r.out.slice(-2000)}`);
  assert.deepEqual(ultimoJson(r), filas[0], "comprobarFila(fila, contexto()) = la fila de --json");
});
