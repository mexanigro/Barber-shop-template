// VELOCIDAD-02 · C1–C6 (T+H, mismo archivo en los dos repos): rojo-verde acepta el commit de corrección (D-395..D-398). Cada test
// arma un repo temporal con una orden de juguete «x» y corre tools/verdad/rojo-verde.mjs del repo real sobre él (--repo); ninguno
// toca el repo real. Las carpetas temporales las crea y borra `conTemporal` de VERDAD-03, también si el test falla.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { SOY, conTemporal, hojaMinima, repoTemporal, rojoVerde, testMinimo } from "../verdad-03/_util.ts";

const sha7 = (s: string) => s.slice(0, 7);
const DIR = "tests/orden/x";
const HOJA = `${DIR}/HOJA.md`, X = `${DIR}/x.test.ts`, Y = `${DIR}/y.test.ts`;
const HOJA0 = hojaMinima([["X1", "T+H", "frase uno"], ["X2", "T+H", "frase dos"]]);
const ORDEN0 = { [HOJA]: HOJA0, [X]: testMinimo([["frase uno", "verde.txt"]]), [Y]: testMinimo([["frase dos", "verde.txt"]]) };
/** La línea de una corrección, como la pide D-395. */
const linea = (n: number, archivos: string, afirmaciones: string) =>
  `- C${n} · 2026-10-27 · archivos: ${archivos} · afirmaciones: ${afirmaciones} · prueba · Liam: «sí»\n`;
const conCorreccion = (hoja: string, ...lineas: string[]) => `${hoja}\n## Correcciones\n\n${lineas.join("")}`;
/** X1 corregida: sigue pidiendo `archivo` (verde.txt: sólo existe desde el verde), con una línea de más. */
const xCorregido = (archivo = "verde.txt") => testMinimo([["frase uno", archivo]]) + "// corregido en C1\n";
const lineasDe = (s: string) => s.split(/\r?\n/).filter((l) => l.trim());

test("Un commit posterior al rojo que toca sólo tests/orden/<id>/ y suma bajo «## Correcciones» de HOJA.md una línea «- C<n> · …» que nombra cada archivo y cada afirmación que cambia es una corrección: rojo-verde --orden <id> sale 0 y su tabla lleva, antes de «rojos anteriores», la línea «correcciones: <sha7>»", () => conTemporal((base) => {
  // rojo 1 → revert → rojo 2 → verde → C1: la tabla cita el rojo 2, el verde, la corrección y, al final, el rojo 1.
  const repo = repoTemporal(SOY, join(base, "c1"));
  const rojo1 = repo.commit("rojo 1", ORDEN0);
  repo.git("rm", "-r", "-q", DIR);
  repo.git("commit", "-q", "-m", "revert del rojo 1");
  const rojo2 = repo.commit("rojo 2", ORDEN0);
  const verde = repo.commit("verde", { "verde.txt": "verde\n" });
  const c1 = repo.commit("corrección C1", { [HOJA]: conCorreccion(HOJA0, linea(1, "x.test.ts", "[X1]")), [X]: xCorregido() });
  const r = rojoVerde("x", repo.dir);
  assert.equal(r.status, 0, `una corrección nombrada debe salir 0 (salió ${r.status})\n${r.out}`);
  const lineas = lineasDe(r.stdout);
  const i = lineas.indexOf(`correcciones: ${sha7(c1)}`);
  assert.ok(i >= 0, `la tabla lleva «correcciones: ${sha7(c1)}»\n${r.stdout}`);
  assert.equal(lineas.at(-1), `rojos anteriores: ${sha7(rojo1)}`, `«rojos anteriores» sigue siendo la última línea\n${r.stdout}`);
  assert.ok(i < lineas.length - 1, `«correcciones:» va antes de «rojos anteriores»\n${r.stdout}`);
  for (const frase of ["frase uno", "frase dos"]) {
    assert.ok(lineas.includes(`[${frase === "frase uno" ? "X1" : "X2"}] ${frase} · rojo en ${sha7(rojo2)} (clon neutro) · verde en ${sha7(verde)}`),
      `la fila de «${frase}» cita el rojo ${sha7(rojo2)} y el verde ${sha7(verde)}\n${r.stdout}`);
  }
}));

test("El árbol rojo de una orden corregida es el código del commit rojo con la carpeta tests/orden/<id>/ de la última corrección: una afirmación corregida que pasa con el código del rojo sale «nunca estuvo en rojo», también cuando la corrección es posterior al verde", () => conTemporal((base) => {
  // (a) La corrección hace que X1 pida README.md, que ya está en el código del rojo: nunca estuvo en rojo.
  const a = repoTemporal(SOY, join(base, "a"));
  const rojo = a.commit("rojo", ORDEN0);
  a.commit("verde", { "verde.txt": "verde\n" });
  const ca = a.commit("corrección C1", { [HOJA]: conCorreccion(HOJA0, linea(1, "x.test.ts", "[X1]")), [X]: xCorregido("README.md") });
  const ra = rojoVerde("x", a.dir);
  assert.equal(ra.status, 2, `una afirmación corregida que pasa con el código del rojo debe salir 2 (salió ${ra.status})\n${ra.out}`);
  assert.ok(ra.stderr.includes(`frase uno: nunca estuvo en rojo (pasa en el árbol de ${sha7(rojo)} con la carpeta de ${sha7(ca)})`),
    `stderr dice que «frase uno» nunca estuvo en rojo en el árbol de ${sha7(rojo)} con la carpeta de ${sha7(ca)}\n${ra.stderr}`);
  // (b) La corrección, posterior al verde, pide verde.txt: está en su árbol, no en el código del rojo → estuvo en rojo, sale 0.
  const b = repoTemporal(SOY, join(base, "b"));
  b.commit("rojo", ORDEN0);
  b.commit("verde", { "verde.txt": "verde\n" });
  b.commit("corrección C1", { [HOJA]: conCorreccion(HOJA0, linea(1, "x.test.ts", "[X1]")), [X]: xCorregido() });
  const rb = rojoVerde("x", b.dir);
  assert.equal(rb.status, 0, `la corrección posterior al verde se corre contra el código del rojo, donde falla: debe salir 0 (salió ${rb.status})\n${rb.out}`);
}));

test("Una corrección que toca un archivo fuera de tests/orden/<id>/ hace salir 2 a rojo-verde con «la corrección <sha7> toca fuera de tests/orden/<id>/» y el archivo", () => conTemporal((base) => {
  const repo = repoTemporal(SOY, join(base, "c3"));
  repo.commit("rojo", ORDEN0);
  repo.commit("verde", { "verde.txt": "verde\n" });
  const c = repo.commit("corrección que toca fuera", {
    [HOJA]: conCorreccion(HOJA0, linea(1, "x.test.ts", "[X1]")), [X]: xCorregido(), "README.md": "tocado por la corrección\n",
  });
  const r = rojoVerde("x", repo.dir);
  assert.equal(r.status, 2, `una corrección que toca fuera de la carpeta debe salir 2 (salió ${r.status})\n${r.out}`);
  assert.ok(r.stderr.includes(`la corrección ${sha7(c)} toca fuera de tests/orden/x/`), `stderr nombra la corrección ${sha7(c)} que toca fuera\n${r.stderr}`);
  assert.match(r.stderr, /README\.md/, `stderr nombra el archivo de afuera\n${r.stderr}`);
}));

test("Una corrección que cambia un archivo o una afirmación que su línea «C<n>» no nombra, o una línea de HOJA.md que no es la de una afirmación nombrada ni la línea «C<n>» nueva, hace salir 2 a rojo-verde nombrando cada uno", () => conTemporal((base) => {
  // (a) Cambia y.test.ts y la línea sólo nombra x.test.ts.
  const a = repoTemporal(SOY, join(base, "a"));
  a.commit("rojo", ORDEN0);
  a.commit("verde", { "verde.txt": "verde\n" });
  const ca = a.commit("corrección", {
    [HOJA]: conCorreccion(HOJA0, linea(1, "x.test.ts", "[X1]")), [X]: xCorregido(), [Y]: testMinimo([["frase dos", "verde.txt"]]) + "// sin nombrar\n",
  });
  const ra = rojoVerde("x", a.dir);
  assert.equal(ra.status, 2, `un archivo cambiado sin nombrar debe salir 2 (salió ${ra.status})\n${ra.out}`);
  assert.ok(ra.stderr.includes(`la corrección ${sha7(ca)} cambia y.test.ts y su línea C1 no lo nombra`), `stderr nombra y.test.ts\n${ra.stderr}`);
  // (b) Cambia la frase de X2 (y su test) y la línea sólo nombra [X1].
  const b = repoTemporal(SOY, join(base, "b"));
  b.commit("rojo", ORDEN0);
  b.commit("verde", { "verde.txt": "verde\n" });
  const hojaB = hojaMinima([["X1", "T+H", "frase uno"], ["X2", "T+H", "frase dos corregida"]]);
  const cb = b.commit("corrección", {
    [HOJA]: conCorreccion(hojaB, linea(1, "x.test.ts, y.test.ts", "[X1]")), [X]: xCorregido(), [Y]: testMinimo([["frase dos corregida", "verde.txt"]]),
  });
  const rb = rojoVerde("x", b.dir);
  assert.equal(rb.status, 2, `una afirmación cambiada sin nombrar debe salir 2 (salió ${rb.status})\n${rb.out}`);
  assert.ok(rb.stderr.includes(`la corrección ${sha7(cb)} cambia la afirmación [X2] y su línea C1 no la nombra`), `stderr nombra [X2]\n${rb.stderr}`);
  // (c) Cambia una línea de la hoja que no es de ninguna afirmación.
  const c = repoTemporal(SOY, join(base, "c"));
  c.commit("rojo", ORDEN0);
  c.commit("verde", { "verde.txt": "verde\n" });
  const hojaC = HOJA0.replace("## A · Prueba", "## A · Prueba (otro título)");
  const cc = c.commit("corrección", { [HOJA]: conCorreccion(hojaC, linea(1, "x.test.ts", "[X1]")), [X]: xCorregido() });
  const rc = rojoVerde("x", c.dir);
  assert.equal(rc.status, 2, `una línea de la hoja sin nombrar debe salir 2 (salió ${rc.status})\n${rc.out}`);
  assert.ok(rc.stderr.includes(`la corrección ${sha7(cc)} cambia una línea de HOJA.md que no es de una afirmación nombrada ni su línea C1`), `stderr nombra la línea de la hoja\n${rc.stderr}`);
  assert.match(rc.stderr, /## A · Prueba \(otro título\)/, `stderr cita la línea\n${rc.stderr}`);
}));

test("Un commit posterior a una corrección que toca tests/orden/<id>/ sin línea «C<n>» nueva hace salir 2 a rojo-verde con «cambió entre el rojo <sha7 de la corrección> y HEAD»; y una corrección del rojo anterior a un revert + rojo nuevo no cuenta: la tabla no lleva «correcciones:»", () => conTemporal((base) => {
  // (a) rojo → verde → C1 → un commit que toca la carpeta sin línea C2: A4 desde la corrección.
  const a = repoTemporal(SOY, join(base, "a"));
  a.commit("rojo", ORDEN0);
  a.commit("verde", { "verde.txt": "verde\n" });
  const c1 = a.commit("corrección C1", { [HOJA]: conCorreccion(HOJA0, linea(1, "x.test.ts", "[X1]")), [X]: xCorregido() });
  a.commit("toca tests sin línea", { [X]: xCorregido() + "// tocado sin corrección\n" });
  const ra = rojoVerde("x", a.dir);
  assert.equal(ra.status, 2, `un cambio en la carpeta sin línea C<n> nueva debe salir 2 (salió ${ra.status})\n${ra.out}`);
  assert.ok(ra.stderr.includes(`cambió entre el rojo ${sha7(c1)} y HEAD`), `A4 compara desde la corrección ${sha7(c1)}\n${ra.stderr}`);
  // (b) rojo 1 → C1 → revert → rojo 2 → verde: C1 era del rojo 1 y no cuenta.
  const b = repoTemporal(SOY, join(base, "b"));
  const rojo1 = b.commit("rojo 1", ORDEN0);
  b.commit("corrección C1 del rojo 1", { [HOJA]: conCorreccion(HOJA0, linea(1, "x.test.ts", "[X1]")), [X]: xCorregido() });
  b.git("rm", "-r", "-q", DIR);
  b.git("commit", "-q", "-m", "revert del rojo 1");
  b.commit("rojo 2", ORDEN0);
  b.commit("verde", { "verde.txt": "verde\n" });
  const rb = rojoVerde("x", b.dir);
  assert.equal(rb.status, 0, `revert + rojo nuevo + verde debe salir 0 (salió ${rb.status})\n${rb.out}`);
  assert.doesNotMatch(rb.stdout, /^correcciones:/m, `la corrección del rojo anterior no cuenta\n${rb.stdout}`);
  assert.equal(lineasDe(rb.stdout).at(-1), `rojos anteriores: ${sha7(rojo1)}`, `la tabla termina con «rojos anteriores»\n${rb.stdout}`);
}));

test("Con la última corrección en HEAD y ningún commit fuera de tests/orden/<id>/ desde el rojo, rojo-verde sale 0 con «<id> · rojo pendiente de B»; con un verde antes de la corrección, la verifica entera y su tabla cita ese verde", () => conTemporal((base) => {
  // (a) rojo → C1 (HEAD), sin verde: rojo pendiente de B.
  const a = repoTemporal(SOY, join(base, "a"));
  a.commit("rojo", ORDEN0);
  a.commit("corrección C1", { [HOJA]: conCorreccion(HOJA0, linea(1, "x.test.ts", "[X1]")), [X]: xCorregido() });
  const ra = rojoVerde("x", a.dir);
  assert.equal(ra.status, 0, `una corrección sin verde debe salir 0 (salió ${ra.status})\n${ra.out}`);
  assert.match(ra.stdout, /^x · rojo pendiente de B$/m, `«x · rojo pendiente de B»\n${ra.stdout}`);
  // (b) rojo → verde → C1 (HEAD): se verifica entera y cita el verde.
  const b = repoTemporal(SOY, join(base, "b"));
  b.commit("rojo", ORDEN0);
  const verde = b.commit("verde", { "verde.txt": "verde\n" });
  const c1 = b.commit("corrección C1", { [HOJA]: conCorreccion(HOJA0, linea(1, "x.test.ts", "[X1]")), [X]: xCorregido() });
  const rb = rojoVerde("x", b.dir);
  assert.equal(rb.status, 0, `una corrección después del verde debe salir 0 (salió ${rb.status})\n${rb.out}`);
  assert.doesNotMatch(rb.stdout, /rojo pendiente de B/, `con un verde no está pendiente\n${rb.stdout}`);
  assert.ok(rb.stdout.includes(`verde en ${sha7(verde)}`), `la tabla cita el verde ${sha7(verde)}\n${rb.stdout}`);
  assert.ok(lineasDe(rb.stdout).includes(`correcciones: ${sha7(c1)}`), `y la corrección ${sha7(c1)}\n${rb.stdout}`);
}));
