// VERDAD-07 · A · el rojo se reconstruye en un clon neutro (D-29): A1 clon (no worktree) con entorno mínimo, sin config de sistema/global/
// local, sin `npm run prepare`, node_modules por junction, tabla «rojo en <sha> (clon neutro)» y sin restos; A2 el rojo es del árbol
// (fixture con `* -text` → 0; fixture que sólo depende de la config → «nunca estuvo en rojo»); A3 el «rojo pendiente de B» también corre en
// el clon neutro (ni el entorno del que llama ni los ignorados del repo llegan); A4 pre-push y contrato-hooks sin cambios, --todas medido.
// Sesión A (2026-09-21): tests rojos (hoy rojo-verde usa `git worktree add` con el entorno heredado y corre el pendiente en el repo).
// Caja negra: `node tools/verdad/rojo-verde.mjs --orden <id> --repo <tmp>` del repo real sobre repos temporales bajo «verdad-07-»; el test
// de cada fixture anota lo que ve (registro.jsonl, § Interfaz). Un mismo archivo en T y en H (cmp → 0). Secuencia (inciso j): un archivo.
// CONEXION-02 D2 (2026-09-22): copia editable promovida a npm test (VERDAD-07 está aprobada y retirada de rojo-verde --todas; el original
// en tests/orden/verdad-07/ queda congelado).
import { test } from "node:test";
import assert from "node:assert/strict";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { NOMBRE, ROOT, SOY, conTemporal, correr, fuenteFixture, leerRegistro, norm, repoConRojo, reproducirHead, rojoVerde, rojoVerdeTodas, type Registro } from "./orden/verdad-07/_util.ts";

const CLON_NEUTRO = /rojo en [0-9a-f]{7} \(clon neutro\)/;
const bajoTmp = (id: string, p: string) => norm(p).startsWith(`${norm(tmpdir())}/${id}-neutro-`);
const restos = (id: string) => readdirSync(tmpdir()).filter((d) => d.startsWith(`${id}-neutro-`));

test("`rojo-verde --orden <id>` corre los tests del árbol rojo en un clon neutro y no en un worktree: `git clone --no-checkout <repo> <tmp>/<id>-neutro-…` + `checkout <rojo>`, con entorno mínimo (`PATH`, `SystemRoot`, `TEMP`/`TMP`, `HOME`=<tmp>; sin ninguna variable `HIGIENE_*`, `GIT_*` ni `NODE_*`), `GIT_CONFIG_NOSYSTEM=1` y `GIT_CONFIG_GLOBAL`=<tmp>/vacio (ni config de sistema, ni global, ni la local del repo), sin `npm run prepare`, con `node_modules` enlazado por junction desde el repo; la tabla dice «rojo en <sha> (clon neutro)»; el clon se borra al final y «<id> · carpetas temporales borradas: …» lo lista si quedó", () => {
  const id = "neutra-01";
  conTemporal((base) => {
    const dir = join(base, NOMBRE[SOY]), registro = join(base, "registro.jsonl");
    const frase = "pasa sólo si existe verde.txt";
    const { repo, rojo } = repoConRojo(base, id, frase, fuenteFixture(frase, dir, registro, `  assert.ok(existe("verde.txt"), "falta verde.txt");`));
    const verde = repo.commit("verde", { "verde.txt": "verde\n" });
    const r = rojoVerde(id, repo.dir);
    assert.ok(r.status === 0 && CLON_NEUTRO.test(r.stdout), `rojo-verde debe salir 0 con «rojo en ${rojo.slice(0, 7)} (clon neutro)» en la tabla (salió ${r.status})\n${r.out.slice(-2500)}`);
    assert.match(r.stdout, new RegExp(`rojo en ${rojo.slice(0, 7)} \\(clon neutro\\) · verde en ${verde.slice(0, 7)}`), `la tabla cita el rojo y el verde\n${r.stdout}`);
    // Lo que vio el test del fixture en la corrida del rojo (verde: false) y en la de HEAD (verde: true, en el repo).
    const entradas = leerRegistro(registro);
    const enRojo = entradas.find((e) => !e.verde), enHead = entradas.find((e) => e.verde);
    assert.ok(enRojo, `el fixture debe haber corrido en el árbol rojo (sin verde.txt); registro: ${JSON.stringify(entradas.map((e) => ({ raiz: e.raiz, verde: e.verde })))}`);
    assert.ok(enHead && norm(enHead.raiz) === norm(repo.dir), "el verde sigue corriendo en el repo (techo declarado)");
    assert.ok(bajoTmp(id, enRojo.raiz), `el rojo corre en <tmp>/${id}-neutro-… (corrió en ${enRojo.raiz})`);
    assert.ok(enRojo.gitEsCarpeta, "el árbol rojo es un clon (.git es carpeta), no un worktree (.git sería un archivo)");
    const worktrees = enRojo.worktrees.split(/\r?\n/).filter((l) => l.startsWith("worktree "));
    assert.equal(worktrees.length, 1, `durante el rojo, git worktree list del repo temporal muestra sólo el principal:\n${enRojo.worktrees}`);
    assert.equal(enRojo.worktreesDir, false, "durante el rojo no existe <repo>/.git/worktrees");
    // Entorno mínimo: presentes PATH, SystemRoot, HOME (dentro de tmp) y TEMP/TMP; GIT_CONFIG_NOSYSTEM=1 y GIT_CONFIG_GLOBAL=<tmp>/vacio;
    // nada HIGIENE_*, GIT_* (salvo esas dos) ni NODE_* (salvo NODE_TEST_CONTEXT, que pone el propio runner de node en sus hijos).
    const env = enRojo.env, claves = Object.keys(env);
    for (const k of ["PATH", "SystemRoot", "HOME"]) assert.ok(claves.includes(k), `el entorno del clon lleva ${k}: ${claves.join(" ")}`);
    assert.ok(claves.includes("TEMP") || claves.includes("TMP"), `el entorno del clon lleva TEMP o TMP: ${claves.join(" ")}`);
    assert.ok(norm(String(env.HOME)).startsWith(norm(tmpdir())), `HOME dentro de os.tmpdir() (es «${env.HOME}»)`);
    assert.equal(env.GIT_CONFIG_NOSYSTEM, "1", "GIT_CONFIG_NOSYSTEM=1 (sin config de sistema)");
    assert.ok(norm(String(env.GIT_CONFIG_GLOBAL)).startsWith(norm(tmpdir())) && /\/vacio$/.test(norm(String(env.GIT_CONFIG_GLOBAL))), `GIT_CONFIG_GLOBAL=<tmp>/vacio (es «${env.GIT_CONFIG_GLOBAL}»)`);
    const sobran = claves.filter((k) => /^HIGIENE_/.test(k) || (/^GIT_/.test(k) && !/^GIT_CONFIG_(NOSYSTEM|GLOBAL)$/.test(k)) || (/^NODE_/.test(k) && k !== "NODE_TEST_CONTEXT"));
    assert.deepEqual(sobran, [], `el entorno del clon no lleva HIGIENE_*, GIT_* ni NODE_*: sobran ${sobran.join(" ")}`);
    assert.doesNotMatch(enRojo.configLocal, /core\.(hookspath|autocrlf)/i, `sin npm run prepare ni config local heredada en el clon:\n${enRojo.configLocal}`);
    assert.ok(enRojo.enlace, "node_modules del clon es un junction al del repo (ve node_modules/verdad-07-marca)");
    // El clon se borra al final: no queda ninguna carpeta <id>-neutro-… en os.tmpdir() (si quedó y se borró, stderr lo lista).
    assert.deepEqual(restos(id), [], `no debe quedar ningún <tmp>/${id}-neutro-… (stderr: ${r.stderr.trim() || "(vacío)"})`);
  });
});

/** Cuerpo del fixture de A2: pasa si core.autocrlf efectivo es false o está sin fijar (lo que ve un clon neutro); con `arbol`, además `* -text`. */
function cuerpoA2(arbol: boolean): string {
  return `  let v = ""; try { v = execFileSync("git", ["-C", RAIZ, "config", "--get", "core.autocrlf"], { encoding: "utf8", windowsHide: true }).trim(); } catch (e) { if (e.status !== 1) throw e; }
  assert.ok(v === "false" || v === "", "core.autocrlf efectivo debe ser false o estar sin fijar (es «" + v + "»)");
${arbol ? `  assert.equal(readFileSync(resolve(RAIZ, ".gitattributes"), "utf8").split(/\\r?\\n/)[0], "* -text", ".gitattributes debe empezar por «* -text»");` : ""}`;
}
const PREPARE = JSON.stringify({ name: "verdad-07-a2", private: true, scripts: { prepare: "git config core.hooksPath .githooks && git config core.autocrlf false" } }, null, 2) + "\n";
const SIN_PREPARE = JSON.stringify({ name: "verdad-07-a2", private: true, scripts: { prepare: "git config core.hooksPath .githooks" } }, null, 2) + "\n";

test("sobre un repo temporal (`git init` + rojo con HOJA.md y un test que pasa sólo si `core.autocrlf` local es `false` + verde que fija eso en package.json `prepare` y lo aplica a `.git/config`), `rojo-verde --orden` sale 2 con «nunca estuvo en rojo» ANTES de D-29 (worktree hereda la config) y sale 0 DESPUÉS sólo si el test del rojo cae también por algo del árbol; el fixture con la aserción del árbol (`.gitattributes` empieza por `* -text`) sale 0 y el fixture sin ella sale 2", () => {
  conTemporal((base) => {
    const corrida = (nombre: string, arbol: boolean) => {
      const sub = join(base, nombre), id = `${nombre}-01`;
      mkdirSync(sub, { recursive: true });
      const dir = join(sub, NOMBRE[SOY]), frase = "pasa sólo si core.autocrlf es false" + (arbol ? " y .gitattributes empieza por * -text" : "");
      const { repo } = repoConRojo(sub, id, frase, fuenteFixture(frase, dir, join(sub, "registro.jsonl"), cuerpoA2(arbol)), { "package.json": SIN_PREPARE });
      repo.git("config", "--unset", "core.autocrlf"); // en el rojo nadie fijó nada
      repo.commit("verde: prepare fija autocrlf" + (arbol ? " y .gitattributes * -text" : ""), { "package.json": PREPARE, ...(arbol ? { ".gitattributes": "* -text\n" } : {}) });
      repo.git("config", "core.autocrlf", "false"); // lo que hace `npm run prepare` en el repo
      const r = rojoVerde(id, repo.dir);
      assert.deepEqual(restos(id), [], `no debe quedar ningún <tmp>/${id}-neutro-…`);
      return r;
    };
    const arbol = corrida("arbol", true);
    assert.ok(arbol.status === 0 && CLON_NEUTRO.test(arbol.stdout), `el fixture con «* -text» sale 0 y la tabla dice «(clon neutro)» (salió ${arbol.status})\n${arbol.out.slice(-2500)}`);
    const maquina = corrida("maquina", false);
    assert.equal(maquina.status, 2, `el fixture que sólo depende de la config sale 2: en un clon neutro pasa igual (salió ${maquina.status})\n${maquina.out.slice(-2500)}`);
    assert.match(maquina.stderr, /nunca estuvo en rojo/, `debe decir «nunca estuvo en rojo»\n${maquina.stderr}`);
  });
});

test("con rojo == HEAD («rojo pendiente de B»), los tests corren en el clon neutro de HEAD, no en el repo: un test que pasa sólo si `process.env.HIGIENE_MARCA === \"1\"` cuenta como rojo aunque el que llama tenga `HIGIENE_MARCA=1`; y ningún archivo ignorado del repo (`.git/info/exclude` + un `marca.txt` ignorado) existe en el clon", () => {
  const id = "neutra-03";
  conTemporal((base) => {
    const dir = join(base, NOMBRE[SOY]), registro = join(base, "registro.jsonl");
    const frase = "pasa sólo si HIGIENE_MARCA es 1";
    const { repo, rojo } = repoConRojo(base, id, frase, fuenteFixture(frase, dir, registro, `  assert.equal(process.env.HIGIENE_MARCA, "1", "HIGIENE_MARCA debe ser 1");`));
    appendFileSync(join(repo.dir, ".git", "info", "exclude"), "marca.txt\n");
    writeFileSync(join(repo.dir, "marca.txt"), "ignorado\n");
    // Control (las dos direcciones): en el repo, con la variable, el fixture pasa; rojo-verde con la misma variable debe verlo rojo igual.
    const control = correr(["--experimental-strip-types", "--test", `tests/orden/${id}/a.test.ts`], { cwd: repo.dir, env: { HIGIENE_MARCA: "1", NODE_TEST_CONTEXT: undefined } });
    const r = rojoVerde(id, repo.dir, { HIGIENE_MARCA: "1" });
    assert.ok(r.status === 0 && new RegExp(`^${id} · rojo pendiente de B$`, "m").test(r.stdout), `con HIGIENE_MARCA=1 en el que llama, el pendiente sigue rojo en el clon neutro: exit 0 y «${id} · rojo pendiente de B» (salió ${r.status})\n${r.out.slice(-2500)}`);
    assert.equal(control.status, 0, `control: el fixture pasa en el repo con la variable (salió ${control.status})\n${control.out.slice(-1500)}`);
    assert.equal(repo.git("status", "--porcelain"), "", "marca.txt está ignorado por .git/info/exclude (el repo sigue limpio)");
    assert.equal(repo.head(), rojo, "precondición: el rojo es HEAD");
    const corridas = leerRegistro(registro).filter((e) => norm(e.raiz) !== norm(repo.dir));
    assert.equal(corridas.length, 1, `una sola corrida fuera del repo (el pendiente, en el clon); registro: ${JSON.stringify(leerRegistro(registro).map((e) => e.raiz))}`);
    const clon: Registro = corridas[0];
    assert.ok(bajoTmp(id, clon.raiz), `el pendiente corre en <tmp>/${id}-neutro-… (corrió en ${clon.raiz})`);
    assert.equal(clon.env.HIGIENE_MARCA, undefined, "el entorno del que llama no llega al clon");
    assert.equal(clon.marca, false, "marca.txt (ignorado en el repo) no existe en el clon");
    assert.ok(clon.gitEsCarpeta, "el clon es un clon (.git carpeta)");
    assert.deepEqual(restos(id), [], `no debe quedar ningún <tmp>/${id}-neutro-…`);
  });
});

test("`.githooks/pre-push` sigue corriendo `rojo-verde --todas` y `tests/contrato-hooks.test.ts` pasa sin cambios; el tiempo de `--todas` en HEAD (las órdenes de APROBADAS.md salen «retirada»; las vivas no se cuentan, inciso m) se imprime al final («tiempo: N s»)", (t) => {
  const prePush = readFileSync(resolve(ROOT, ".githooks/pre-push"), "utf8");
  assert.match(prePush, /^node tools\/verdad\/rojo-verde\.mjs --todas/m, `.githooks/pre-push sigue corriendo rojo-verde --todas:\n${prePush}`);
  const contrato = correr(["--experimental-strip-types", "--test", "tests/contrato-hooks.test.ts"], { env: { NODE_TEST_CONTEXT: undefined } });
  assert.equal(contrato.status, 0, `tests/contrato-hooks.test.ts debe pasar (salió ${contrato.status})\n${contrato.out.slice(-2000)}`);
  // --todas «en HEAD» sin correrse a sí misma: HEAD se reproduce en un repo temporal (APROBADAS.md + todas las órdenes menos verdad-07).
  conTemporal((base) => {
    const { repo, ids } = reproducirHead(base, ["verdad-07"]);
    const t0 = Date.now();
    const r = rojoVerdeTodas(repo.dir);
    const segundos = ((Date.now() - t0) / 1000).toFixed(1);
    t.diagnostic(`tiempo: ${segundos} s`);
    // Inciso m) (Liam, 2026-09-22; adaptado en CONEXION-02 D2): una afirmación no cuenta órdenes ni fija el estado de otras. Las órdenes
    // de HEAD que figuran en APROBADAS.md salen «retirada»; las vivas (con rojo o pendientes de B) corren y no se cuentan aquí.
    const aprobadas = new Set([...readFileSync(resolve(ROOT, "tests/orden/APROBADAS.md"), "utf8").matchAll(/^- (\S+) · aprobada /gm)].map((m) => m[1]));
    const retiradas = [...r.stdout.matchAll(/^(\S+) · retirada \(aprobada \d{4}-\d{2}-\d{2}\)$/gm)].map((m) => m[1]).sort();
    const esperadas = ids.filter((id) => aprobadas.has(id)).sort();
    assert.deepEqual(retiradas, esperadas, `las órdenes de HEAD aprobadas (${esperadas.join(", ")}) salen «retirada» (exit ${r.status}):\n${r.out.slice(-2500)}`);
    assert.equal(r.status, 0, `--todas sale 0 (salió ${r.status})\n${r.out.slice(-2000)}`);
  });
  assert.ok(existsSync(resolve(ROOT, "tests/orden/verdad-07/HOJA.md")), "verdad-07: su HOJA.md sigue (congelada)");
  assert.match(readFileSync(resolve(ROOT, "tests/orden/APROBADAS.md"), "utf8"), /^- verdad-07 · aprobada /m, "verdad-07 figura en APROBADAS.md (retirada, D-38)");
});
