// VERDAD-01 (2026-09-20): el mecanismo se audita a sí mismo. Cada test de aquí es la «prueba» de una afirmación de
// verdad/entregas/VERDAD-01.json y tiene su mutación en tests/mutaciones/verdad.mjs (la que lo pone rojo).
// Sin navegador: esquema, motor de mutación (con una prueba temporal real), evidencia, impacto, hueco, recrear (brechas),
// gama 1.7 (F «—» bajo R24 + excepciones), HIGIENE-03 (transcript) y candado (verdad/ texto sí, capturas no).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { validar, esquema, leerEntrega, capturasExigidas, evidenciaDe, correrPrueba, mutar, mutacionesDe, evaluar } from "../tools/verdad/veredicto.mjs";
import { clasificar, impactoDe, COMPARTIDOS } from "../tools/verdad/impacto.mjs";
import { comprobarFila } from "../tools/verdad/hueco.mjs";
import { hojas, sinContrato, huecoDe } from "../tools/verdad/recrear.mjs";
import { archivosDeFixture, aplicarExcepciones } from "../tools/gama.mjs";
import { clasificar as clasificarTranscript, escribioEn } from "../tools/_transcript.mjs";
import { veto } from "../tools/candado.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const T_ROOT = "C:/Users/liama/Desktop/Nichos/Barber-shop-template-main";
const H_ROOT = "C:/Users/liama/Desktop/Nichos-hub";
const AF = (extra: Record<string, unknown> = {}): any => ({ id: "x", texto: "afirmación de prueba larga", repo: "T", prueba: { archivo: "tests/x.test.ts", nombre: "nombre" }, vistas: [], paletas: [], evidencia: [], hueco: null, ...extra });
const ENTREGA = (afs: unknown[]) => ({ orden: "PRUEBA-00", fecha: "2026-09-20", capturas: "C:/x", afirmaciones: afs });

test("esquema: una afirmación sin prueba, con vista fuera de {375,1280,webkit} o sin hueco declarado no pasa; la de ejemplo sí", () => {
  const es = esquema();
  assert.deepEqual(validar(ENTREGA([AF()]), es), []);
  const { prueba: _p, ...sinPrueba } = AF();
  assert.ok(validar(ENTREGA([sinPrueba]), es).some((e: string) => /afirmaciones\[0\]\.prueba: falta/.test(e)), "sin prueba → error que la nombra");
  assert.ok(validar(ENTREGA([AF({ vistas: [768] })]), es).some((e: string) => /vistas\[0\]/.test(e)), "vista 768 no existe");
  const { hueco: _h, ...sinHueco } = AF();
  assert.ok(validar(ENTREGA([sinHueco]), es).some((e: string) => /hueco: falta/.test(e)), "hueco debe declararse (null vale)");
  assert.ok(validar(ENTREGA([]), es).some((e: string) => /afirmaciones: menos de 1/.test(e)), "una entrega sin afirmaciones no afirma nada");
  assert.ok(validar(ENTREGA([AF({ prueba: { archivo: "tests/x.mjs", nombre: "nombre" } })]), es).some((e: string) => /prueba\.archivo: "tests\/x\.mjs" no cumple/.test(e)), "la prueba es un .test.ts");
  const ejemplo = JSON.parse(readFileSync(resolve(ROOT, "tools/verdad/entrega.ejemplo.json"), "utf8"));
  assert.deepEqual(validar(ejemplo, es), [], "entrega.ejemplo.json cumple el esquema");
  const dir = mkdtempSync(join(tmpdir(), "verdad-e-"));
  writeFileSync(join(dir, "e.json"), JSON.stringify(ENTREGA([sinPrueba])));
  assert.match(String(leerEntrega(join(dir, "e.json")).error), /prueba: falta/, "leerEntrega devuelve el error del esquema");
});

test("mutación: la prueba debe correr (0 tests = no existe), la mutación debe poner rojo y volver verde; una que no pone rojo es FALSO; sin archivo de mutación → null", async () => {
  const tmp = "tests/_tmp-verdad-motor.test.ts"; // dentro de tests/ para que tsx lo resuelva igual que una suite real
  const fuente = `import { test } from "node:test"; import assert from "node:assert/strict";\ntest("motor verde", () => { assert.equal(1 + 1, 2); });\n`;
  writeFileSync(resolve(ROOT, tmp), fuente);
  try {
    const ok = correrPrueba("T", tmp, "motor verde");
    assert.equal(ok.tests, 1, `debe correr 1 test: ${ok.salida.slice(0, 300)}`); assert.equal(ok.fail, 0); assert.equal(ok.exit, 0);
    const nada = correrPrueba("T", tmp, "no existe");
    assert.equal(nada.tests, 0, "un nombre que no existe corre 0 tests (y no vale como prueba)");
    const prueba = { archivo: tmp, nombre: "motor verde" };
    const buena = mutar("T", { prueba: "motor verde", archivo: tmp, descripcion: "1+1=3", aplicar: (s: string) => s.replace("2);", "3);") }, prueba);
    assert.equal(buena.ok, true, buena.detalle); assert.match(buena.detalle, /\d\d:\d\d:\d\d rojo → \d\d:\d\d:\d\d verde/);
    assert.equal(readFileSync(resolve(ROOT, tmp), "utf8"), fuente, "el archivo queda restaurado byte a byte");
    const inutil = mutar("T", { prueba: "motor verde", archivo: tmp, descripcion: "sólo un comentario", aplicar: (s: string) => s + "// nada\n" }, prueba);
    assert.equal(inutil.ok, false); assert.equal(inutil.falso, true, "una mutación que no pone rojo es FALSO: la prueba no prueba nada");
    const vacia = mutar("T", { prueba: "motor verde", archivo: tmp, descripcion: "identidad", aplicar: (s: string) => s }, prueba);
    assert.equal(vacia.falso, true, "una mutación que no cambia el archivo es FALSO");
    assert.equal(await mutacionesDe("T", tmp, "motor verde"), null, "sin tests/mutaciones/_tmp-verdad-motor.mjs → null");
    const fila = await evaluar({ ...AF({ prueba }), id: "motor" }, join(tmpdir(), "no-existe"), { log: () => {} });
    assert.equal(fila.veredicto, "NO VERIFICADO"); assert.ok(fila.motivo.some((m: string) => /sin tests\/mutaciones\/_tmp-verdad-motor\.mjs/.test(m)), JSON.stringify(fila.motivo));
  } finally { rmSync(resolve(ROOT, tmp), { force: true }); }
});

test("evidencia: capturas exigidas = id × paleta × vista; la que falta se marca FALTA y la presente lleva su sha256", () => {
  assert.deepEqual(capturasExigidas(AF({ vistas: [375, 1280], paletas: ["a", "c"] })), ["x-a-375.png", "x-a-1280.png", "x-c-375.png", "x-c-1280.png"]);
  assert.deepEqual(capturasExigidas(AF({ vistas: ["webkit"] })), ["x-webkit.png"]);
  assert.deepEqual(capturasExigidas(AF()), []);
  const dir = mkdtempSync(join(tmpdir(), "verdad-ev-"));
  writeFileSync(join(dir, "x-a-375.png"), "png");
  const ev = evidenciaDe(AF({ vistas: [375], paletas: ["a", "c"], evidencia: ["extra.json"] }), dir);
  assert.equal(ev.length, 3);
  assert.match(ev[0].hash, /^[0-9a-f]{64}$/, "x-a-375.png presente → sha256");
  assert.equal(ev[1].falta, true, "x-c-375.png falta"); assert.equal(ev[2].falta, true, "extra.json falta");
});

test("impacto: compartido tocado → seis + todas las secciones; v6 tocado → sólo peluquería y su sección; helper sin clasificar sube hasta el primer clasificado; tests y capturas obligatorias por lo alcanzado", () => {
  assert.equal(clasificar("src/index.css").compartido, true);
  assert.ok(COMPARTIDOS.includes("src/config/site.ts") && COMPARTIDOS.includes("src/App.tsx") && COMPARTIDOS.includes("src/lib/section-variants.ts"));
  assert.deepEqual(clasificar("src/components/landing/hero/hero-v6.tsx").secciones, ["hero"]);
  assert.equal(clasificar("src/components/landing/hero/hero-v6.tsx").flota, false, "v6 no es de la flota");
  assert.equal(clasificar("src/components/landing/hero/hero-v3.tsx").flota, true, "v3 sirve a los seis");
  assert.deepEqual(clasificar("src/config/presets/tattoo.he.ts").nichos, ["tattoo"]);
  assert.deepEqual(clasificar("src/components/gallery/gallery-page-v6.tsx").paginas, ["galeria"]);
  // grafo sintético: helper ← v6 ← dispatcher(flota); helper2 ← v3(flota)
  const g = { importadoPor: new Map<string, Set<string>>([
    ["src/lib/x.ts", new Set(["src/components/landing/hero/hero-v6.tsx"])],
    ["src/components/landing/hero/hero-v6.tsx", new Set(["src/components/landing/Hero.tsx"])],
    ["src/components/landing/Hero.tsx", new Set(["src/App.tsx"])],
    ["src/lib/y.ts", new Set(["src/components/landing/services/services-v3.tsx"])],
  ]), importa: new Map(), archivos: [] as string[] };
  const v6: any = impactoDe(["src/components/landing/hero/hero-v6.tsx"], g);
  assert.deepEqual(v6.secciones, ["hero"]); assert.deepEqual(v6.nichos, ["peluqueria"], "tocar v6 no toca a los seis aunque Hero.tsx lo importe");
  assert.ok(v6.pruebas.includes("tests/hero-viewport.test.ts") && v6.pruebas.includes("tests/webkit-ios.test.ts"), `pruebas: ${v6.pruebas}`);
  assert.deepEqual(v6.capturas, ["recrear-a-375-home.png", "recrear-a-1280-home.png", "recrear-c-375-home.png", "recrear-c-1280-home.png"]);
  const helper: any = impactoDe(["src/lib/x.ts"], g);
  assert.deepEqual(helper.nichos, ["peluqueria"], "helper que sólo alcanza v6 → peluquería");
  const helper2: any = impactoDe(["src/lib/y.ts"], g);
  assert.ok(helper2.nichos.includes("seis"), "helper que alcanza v3 (flota) → seis");
  const css: any = impactoDe(["src/index.css"], g);
  assert.equal(css.compartido, true); assert.ok(css.nichos.includes("seis") && css.secciones.length >= 8, `${css.secciones}`);
  const tool: any = impactoDe(["tools/gama.mjs"], g);
  assert.ok(tool.pruebas.includes("tests/gama.test.ts"), "tocar gama.mjs obliga a tests/gama.test.ts"); assert.deepEqual(tool.capturas, []);
});

test("hueco: una fila con UI del hub inexistente, validador sin la función o material bajo /dev-fixtures no está hecha; una fila con los cinco reales sí", () => {
  const dir = mkdtempSync(join(tmpdir(), "verdad-hueco-"));
  const ctx = { contratosMd: "| `campo.real` |", fixtureA: { campo: { real: "texto", foto: "/dev-fixtures/media/x.jpg" } }, npmTest: ["tests/verdad.test.ts"] };
  const base = { id: "campo.real", seccion: "x", ruta: "campo.real", contrato: { campo: "`campo.real`" }, validador: { archivo: "src/lib/config-validator.ts", funcion: "validateConfig" }, ui: { ruta: "/clients/[clientId]", componente: "src/components/client-config-tab.tsx", campo: "phone" }, material: { vive: "config" }, guard: { archivo: "tests/verdad.test.ts", clave: "hueco" } };
  const ok = comprobarFila(base, ctx);
  assert.equal(ok.hecho, true, JSON.stringify(ok.checks));
  const uiFalsa = comprobarFila({ ...base, ui: { ruta: "/no-existe", componente: "src/components/client-config-tab.tsx" } }, ctx);
  assert.equal(uiFalsa.checks.ui.ok, false); assert.match(uiFalsa.checks.ui.detalle, /sin page\.tsx/); assert.equal(uiFalsa.hecho, false);
  const compFalso = comprobarFila({ ...base, ui: { ruta: "/clients/[clientId]", componente: "src/components/no-existe.tsx" } }, ctx);
  assert.equal(compFalso.checks.ui.ok, false);
  const fnFalsa = comprobarFila({ ...base, validador: { archivo: "src/lib/config-validator.ts", funcion: "validateNada" } }, ctx);
  assert.equal(fnFalsa.checks.validador.ok, false); assert.match(fnFalsa.checks.validador.detalle, /no exporta validateNada/);
  const dev = comprobarFila({ ...base, id: "campo.foto", ruta: "campo.foto", material: { vive: "storage" } }, ctx);
  assert.equal(dev.checks.material.ok, false); assert.match(dev.checks.material.detalle, /producción no sirve dev-fixtures/);
  const sinGuard = comprobarFila({ ...base, guard: { archivo: "tests/verdad.test.ts", clave: "palabra-que-no-esta-aqui-" + "zz" } }, ctx);
  assert.equal(sinGuard.checks.guard.ok, false, "el guard debe nombrar la clave");
  rmSync(dir, { recursive: true, force: true });
});

test("recrear: un campo sólo del fixture (sin fila en contratos.json) es una brecha con hueco null; los cubiertos no; huecoDe encuentra el hueco por el valor del material", () => {
  const contratos = { huecos: [{ id: "hero.video", ruta: "hero.video.mp4" }, { id: "branding.texture", ruta: "branding.texture" }, { id: "gallery.items", ruta: "sections.gallery.items" }] };
  const fx = { business: { type: "peluqueria" }, hero: { video: { mp4: "/dev-fixtures/media/a/hero.mp4", webm: "/x.webm" }, inventado: "sí" }, branding: { texture: "/dev-fixtures/media/a/textura.jpg", colors: {} }, sections: { gallery: { items: [{ src: "/dev-fixtures/media/a/g1.jpg" }] } } };
  assert.ok(hojas(fx).includes("hero.inventado") && hojas(fx).includes("branding.colors"));
  const b = sinContrato(fx, contratos);
  assert.deepEqual(b.map((x) => x.campo).sort(), ["branding.colors", "hero.inventado"], JSON.stringify(b));
  assert.ok(b.every((x) => x.tipo === "sin contrato" && x.hueco === null));
  assert.equal(huecoDe(fx, contratos, "/dev-fixtures/media/a/textura.jpg"), "branding.texture");
  assert.equal(huecoDe(fx, contratos, "/dev-fixtures/media/a/g1.jpg"), "gallery.items");
  assert.equal(huecoDe(fx, contratos, "/no-esta.jpg"), null);
});

test("gama 1.7: con foto del local (R24) servicio y retrato no miden F («—»); sin ella sí; una excepción de Liam convierte una medida NO en exc y la fila pasa; incompleta no cuenta", () => {
  const conLocal = archivosDeFixture({ branding: { localPhoto: "/l.jpg" }, sections: { services: { images: ["/s1.jpg"] } }, staff: [{ photoUrl: "/r1.jpg" }], gallery: ["/g1.jpg"] });
  assert.equal(conLocal.find((f) => f.role === "servicio 1")!.fondo, false, "servicio bajo R24: F no aplica");
  assert.equal(conLocal.find((f) => f.role === "retrato 1")!.fondo, false, "retrato bajo R24: F no aplica");
  assert.equal(conLocal.find((f) => f.role === "galería 1")!.fondo, undefined);
  const sinLocal = archivosDeFixture({ sections: { services: { images: ["/s1.jpg"] } }, staff: [{ photoUrl: "/r1.jpg" }] });
  assert.equal(sinLocal.find((f) => f.role === "servicio 1")!.fondo, true, "sin foto del local F sigue midiendo");
  assert.equal(sinLocal.find((f) => f.role === "retrato 1")!.fondo, true);
  const rows: any[] = [
    { role: "servicio 2", src: "/dev-fixtures/media/paleta-a/servicio-2.jpg", T: true, K: false, S: true, F: null, Q: undefined, E: undefined },
    { role: "servicio 3", src: "/dev-fixtures/media/paleta-a/servicio-3.jpg", T: false, K: true, S: true, F: null },
  ];
  const aplicadas = aplicarExcepciones(rows, [
    { archivo: "servicio-2.jpg", medida: "K", motivo: "luz cálida aprobada por Liam", fecha: "2026-09-20" },
    { archivo: "servicio-3.jpg", medida: "T" }, // incompleta: sin motivo ni fecha → no cuenta
  ]);
  assert.equal(aplicadas.length, 1); assert.equal(rows[0].K, "exc"); assert.equal(rows[0].pasa, true, "la excepción aprobada cuenta como aprobada");
  assert.equal(rows[1].T, false); assert.equal(rows[1].pasa, false, "sin motivo y fecha la excepción no vale");
});

test("higiene-03: Edit/Write dentro de T o H = escribió; git commit en shell = escribió; cat/grep/git status = sólo lectura; sin transcript = sin-transcript (falla cerrado)", () => {
  const roots = [T_ROOT, H_ROOT];
  const edit = { name: "Edit", input: { file_path: "C:\\Users\\liama\\Desktop\\Nichos-hub\\CLAUDE.md" }, cwd: "C:\\Users\\liama\\Desktop\\Nichos-hub" };
  const editFuera = { name: "Edit", input: { file_path: "C:\\Users\\liama\\Desktop\\otro\\x.md" }, cwd: "C:\\Users\\liama\\Desktop\\otro" };
  const lectura = { name: "Bash", input: { command: "cd /c/Users/liama/Desktop/Nichos-hub && git status --short && cat CLAUDE.md | grep -n hook" }, cwd: "C:\\Users\\liama\\Desktop\\Nichos-hub" };
  const commit = { name: "Bash", input: { command: "git commit -m x" }, cwd: "C:\\Users\\liama\\Desktop\\Nichos\\Barber-shop-template-main" };
  const redir = { name: "Bash", input: { command: "echo hola > C:/Users/liama/Desktop/Nichos-hub/x.txt" }, cwd: "C:\\Users\\liama" };
  const read = { name: "Read", input: { file_path: "C:\\Users\\liama\\Desktop\\Nichos-hub\\CLAUDE.md" }, cwd: "" };
  assert.equal(clasificarTranscript([lectura, read, editFuera], roots).escribio.length, 0, "leer y editar fuera de T/H no es escribir");
  assert.equal(clasificarTranscript([lectura, edit], roots).escribio.length, 1);
  assert.equal(clasificarTranscript([commit], roots).escribio[0].repo, T_ROOT, "git commit con cwd en T");
  assert.equal(clasificarTranscript([redir], roots).escribio[0].repo, H_ROOT, "redirección a una ruta de H aunque el cwd sea otro");
  assert.equal(clasificarTranscript([{ name: "Agent", input: {}, cwd: "" }], roots).escribio.length, 1, "un subagente cuenta como escritura (fail closed)");
  const dir = mkdtempSync(join(tmpdir(), "verdad-tr-"));
  const linea = (u: unknown, cwd: string) => JSON.stringify({ type: "assistant", cwd, message: { content: [{ type: "tool_use", ...(u as object) }] } });
  writeFileSync(join(dir, "lee.jsonl"), [linea({ name: "Bash", input: lectura.input }, lectura.cwd), linea({ name: "Read", input: read.input }, "")].join("\n"));
  writeFileSync(join(dir, "escribe.jsonl"), [linea({ name: "Bash", input: lectura.input }, lectura.cwd), linea({ name: "Edit", input: edit.input }, edit.cwd)].join("\n"));
  assert.equal(escribioEn(join(dir, "lee.jsonl"), roots).estado, "solo-lectura");
  assert.equal(escribioEn(join(dir, "escribe.jsonl"), roots).estado, "escribio");
  assert.equal(escribioEn(join(dir, "no-existe.jsonl"), roots).estado, "sin-transcript");
  assert.equal(escribioEn("", roots).estado, "sin-transcript");
  writeFileSync(join(dir, "ilegible.jsonl"), '{"type":"assistant","cwd":"C:\\Users\\x"}\nno es json\n');
  assert.equal(escribioEn(join(dir, "ilegible.jsonl"), roots).estado, "sin-transcript", "sin tool_use legibles no se acredita lectura (falla cerrado)");
});

test("candado: verdad/*.md y verdad/*.json se pueden escribir; una captura .png en verdad/ sigue vetada (capturas sólo en public/)", () => {
  const noRastreado = () => false;
  assert.equal(veto("verdad/VERDAD-abc1234.md", {}, noRastreado), "");
  assert.equal(veto("verdad/entregas/VERDAD-01.json", {}, noRastreado), "");
  assert.equal(veto("verdad/contratos.json", {}, noRastreado), "");
  assert.match(veto("verdad/captura.png", {}, noRastreado), /capturas y media sólo en public\//);
  assert.match(veto("tests/mutaciones/x.png", {}, noRastreado), /capturas y media sólo en public\//);
});
