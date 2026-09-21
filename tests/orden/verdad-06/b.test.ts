// VERDAD-06 · B · candado sobre shells (tools/candado.mjs, D-25): B1 el hook registrado también para Bash|PowerShell y declarado en
// CLAUDE.md; B2 veto por segmento que nombra tests/orden/<id>/ con rojo en la historia, salvo lectura reconocida o
// HIGIENE_PERMITIR_TESTS=1; B3 falla cerrado (sin `command` string → ROTO), `command` vacío → 0, fuera de tests/orden → 0.
// Sesión A (2026-09-21): tests rojos (hoy el candado exige `file_path` y responde «CANDADO ROTO» a cualquier Bash). Caja negra: el
// candado real por stdin, con HIGIENE_ROOT sobre un repo temporal (vieja-01 con rojo en main, nueva-99 sin rojo); nada se escribe.
// Un mismo archivo en T y en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT, bloqueContrato, candadoJson, conTemporal, correr, repoTemporal, type Salida } from "./_util.ts";

const MATCHER = "Edit|Write|MultiEdit|Bash|PowerShell";

test(".claude/settings.json registra candado.mjs en PreToolUse con matcher `Edit|Write|MultiEdit|Bash|PowerShell`, el bloque CONTRATO-DECLARADO de CLAUDE.md dice `hook.PreToolUse = Edit|Write|MultiEdit|Bash|PowerShell :: candado.mjs`, y tests/contrato-hooks.test.ts pasa", () => {
  const hooks = JSON.parse(readFileSync(resolve(ROOT, ".claude/settings.json"), "utf8")).hooks ?? {};
  const pre = (hooks.PreToolUse ?? []) as { matcher?: string; hooks: { command: string }[] }[];
  const candado = pre.find((e) => e.hooks.some((h) => /candado\.mjs$/.test(String(h.command))));
  assert.ok(candado, `PreToolUse debe registrar candado.mjs:\n${JSON.stringify(pre, null, 2)}`);
  assert.equal(candado.matcher, MATCHER, `el matcher de candado.mjs debe ser «${MATCHER}» (es «${candado.matcher}»)`);
  assert.match(bloqueContrato(), /^hook\.PreToolUse\s+= Edit\|Write\|MultiEdit\|Bash\|PowerShell :: candado\.mjs$/m, `CLAUDE.md debe declarar «hook.PreToolUse = ${MATCHER} :: candado.mjs»:\n${bloqueContrato()}`);
  const r = correr(["--experimental-strip-types", "--test", "tests/contrato-hooks.test.ts"], { env: { NODE_TEST_CONTEXT: undefined } });
  assert.equal(r.status, 0, `tests/contrato-hooks.test.ts debe pasar (salió ${r.status})\n${r.out.slice(-2000)}`);
});

/** Repo temporal con la orden vieja-01 (HOJA.md añadida en main: rojo en la historia) y sin nueva-99. Devuelve dir y el sha base. */
function repoConOrden(base: string) {
  const repo = repoTemporal("H", base);
  const sha = repo.head();
  repo.commit("rojo vieja-01", { "tests/orden/vieja-01/HOJA.md": "# HOJA · vieja-01\n\n- [A1] (T+H) frase · fuente: prueba.\n", "tests/orden/vieja-01/c.test.ts": "// test\n", "tests/orden/APROBADAS.md": "# aprobadas\n" });
  return { dir: repo.dir, sha };
}

const veto = (r: Salida, que: string) => {
  assert.equal(r.status, 2, `${que} → veto (exit 2), salió ${r.status}\n${r.out}`);
  assert.match(r.stderr, /^CANDADO · /m, `${que} → el veto se explica como «CANDADO · …»\n${r.out}`);
  assert.doesNotMatch(r.stderr, /CANDADO ROTO/, `${que} → un veto no es un candado roto\n${r.out}`);
  assert.match(r.stderr, /vieja-01/, `${que} → el veto nombra la orden\n${r.out}`);
};
const pasa = (r: Salida, que: string) => {
  assert.equal(r.status, 0, `${que} → debe pasar (exit 0), salió ${r.status}\n${r.out}`);
  assert.doesNotMatch(r.stderr, /CANDADO/, `${que} → sin veto ni roto\n${r.out}`);
};

test("candado.mjs con `tool_name` Bash o PowerShell y `tool_input.command` string veta (exit 2, «CANDADO · …») todo segmento del comando que nombre `tests/orden/<id>/` cuando `tests/orden/<id>/HOJA.md` está en la historia de main, salvo que el segmento sea una lectura reconocida (`cat`, `head`, `tail`, `sed -n`, `grep`, `rg`, `wc`, `ls`, `diff`, `cmp`, `sha256sum`, `node … --test`, `npx tsx --test`, `git diff|log|show|status|ls-files|blame|check-ignore`) o `HIGIENE_PERMITIR_TESTS` sea exactamente «1»; casos: `node -e \"require('fs').writeFileSync('tests/orden/<id>/c.test.ts','x')\"`, `sed -i s/a/b/ tests/orden/<id>/c.test.ts`, `cp x tests/orden/<id>/y`, `git checkout <sha> -- tests/orden/<id>/`, `echo x > tests/orden/<id>/HOJA.md` y `cd tests/orden/<id> && node -e …` → veto; `node --experimental-strip-types --test tests/orden/<id>/*.test.ts`, `git diff <sha> HEAD -- tests/orden/<id>/`, `cat tests/orden/<id>/HOJA.md`, `echo x > tests/orden/nueva-99/HOJA.md` (sin rojo) y `sed -i … tests/orden/APROBADAS.md` → pasan; Edit/Write siguen igual que hoy", () => {
  conTemporal((base) => {
    const { dir, sha } = repoConOrden(base);
    const env = { HIGIENE_ROOT: dir };
    const bash = (command: string, extra: Record<string, string | undefined> = {}) => candadoJson({ tool_name: "Bash", tool_input: { command }, cwd: dir }, { ...env, ...extra });
    const ps = (command: string) => candadoJson({ tool_name: "PowerShell", tool_input: { command }, cwd: dir }, env);
    // Veto: escrituras sobre tests/orden/vieja-01/ (HOJA.md en la historia de main) por Bash y por PowerShell.
    const vetados: [string, Salida][] = [
      ["node -e writeFileSync", bash("node -e \"require('fs').writeFileSync('tests/orden/vieja-01/c.test.ts','x')\"")],
      ["sed -i", bash("sed -i s/a/b/ tests/orden/vieja-01/c.test.ts")],
      ["cp", bash("cp x tests/orden/vieja-01/y")],
      ["git checkout <sha> --", bash(`git checkout ${sha} -- tests/orden/vieja-01/`)],
      ["echo >", bash("echo x > tests/orden/vieja-01/HOJA.md")],
      ["cd && node -e", bash("cd tests/orden/vieja-01 && node -e \"require('fs').writeFileSync('c.test.ts','x')\"")],
      ["lectura && escritura en el segundo segmento", bash("cat tests/orden/vieja-01/HOJA.md && cp x tests/orden/vieja-01/y")],
      ["PowerShell Set-Content", ps("Set-Content -Path tests/orden/vieja-01/c.test.ts -Value x")],
      ["ruta absoluta", bash(`echo x > ${resolve(dir, "tests/orden/vieja-01/HOJA.md").replace(/\\/g, "/")}`)],
    ];
    for (const [que, r] of vetados) veto(r, que);
    // Pasan: lecturas reconocidas, otra orden sin rojo, APROBADAS.md, y la variable exacta «1» (no «0»).
    const permitidos: [string, Salida][] = [
      ["node --test", bash("node --experimental-strip-types --test tests/orden/vieja-01/*.test.ts")],
      ["npx tsx --test", bash("npx tsx --test tests/orden/vieja-01/c.test.ts")],
      ["git diff", bash(`git diff ${sha} HEAD -- tests/orden/vieja-01/`)],
      ["git log", bash("git log --oneline -3 -- tests/orden/vieja-01/HOJA.md")],
      ["cat", bash("cat tests/orden/vieja-01/HOJA.md")],
      ["sed -n", bash("sed -n 1,20p tests/orden/vieja-01/c.test.ts")],
      ["grep", bash("grep -n frase tests/orden/vieja-01/HOJA.md")],
      ["ls", bash("ls tests/orden/vieja-01/")],
      ["sha256sum", bash("sha256sum tests/orden/vieja-01/HOJA.md")],
      ["echo > orden sin rojo", bash("echo x > tests/orden/nueva-99/HOJA.md")],
      ["sed -i APROBADAS.md", bash("sed -i s/a/b/ tests/orden/APROBADAS.md")],
      ["HIGIENE_PERMITIR_TESTS=1", bash("echo x > tests/orden/vieja-01/HOJA.md", { HIGIENE_PERMITIR_TESTS: "1" })],
    ];
    for (const [que, r] of permitidos) pasa(r, que);
    veto(bash("echo x > tests/orden/vieja-01/HOJA.md", { HIGIENE_PERMITIR_TESTS: "0" }), "HIGIENE_PERMITIR_TESTS=0 no abre");
    // Edit/Write siguen igual que hoy: file_path bajo la orden con rojo → veto; bajo una orden sin rojo → pasa; con la variable → pasa.
    const write = (file_path: string, extra: Record<string, string | undefined> = {}) => candadoJson({ tool_name: "Write", tool_input: { file_path }, cwd: dir }, { ...env, ...extra });
    veto(write(resolve(dir, "tests/orden/vieja-01/d.test.ts")), "Write bajo vieja-01");
    pasa(write(resolve(dir, "tests/orden/nueva-99/HOJA.md")), "Write bajo nueva-99");
    pasa(write(resolve(dir, "tests/orden/vieja-01/d.test.ts"), { HIGIENE_PERMITIR_TESTS: "1" }), "Write con HIGIENE_PERMITIR_TESTS=1");
  });
});

test("candado.mjs falla cerrado con shells: `tool_name` Bash sin `tool_input.command` string → exit 2 «CANDADO ROTO»; con `command` vacío → exit 0; un comando Bash que escribe fuera de tests/orden (por ejemplo `echo x > src/nota.txt`) → exit 0 (fuera del alcance de D-25, declarado)", () => {
  // Sobre el repo real, sin HIGIENE_ROOT: el candado sólo inspecciona, no escribe src/nota.txt ni nada.
  for (const tool_name of ["Bash", "PowerShell"]) {
    const vacio = candadoJson({ tool_name, tool_input: { command: "" }, cwd: ROOT });
    assert.equal(vacio.status, 0, `${tool_name} con command vacío → 0 (salió ${vacio.status})\n${vacio.out}`);
    assert.doesNotMatch(vacio.stderr, /CANDADO/, `${tool_name} con command vacío: ni veto ni roto\n${vacio.out}`);
  }
  const rotos: [string, Record<string, unknown>][] = [
    ["Bash sin command", { tool_name: "Bash", tool_input: {}, cwd: ROOT }],
    ["Bash con command que no es string", { tool_name: "Bash", tool_input: { command: 5 }, cwd: ROOT }],
    ["PowerShell sin tool_input", { tool_name: "PowerShell", cwd: ROOT }],
  ];
  for (const [que, entrada] of rotos) {
    const r = candadoJson(entrada);
    assert.equal(r.status, 2, `${que} → falla cerrado con 2 (salió ${r.status})\n${r.out}`);
    assert.match(r.stderr, /CANDADO ROTO/, `${que} → «CANDADO ROTO» en stderr\n${r.out}`);
  }
  for (const command of ["echo x > src/nota.txt", "sed -i s/a/b/ package.json", "git commit -m x"]) {
    const r = candadoJson({ tool_name: "Bash", tool_input: { command }, cwd: ROOT });
    assert.equal(r.status, 0, `«${command}» está fuera del alcance de D-25 → 0 (salió ${r.status})\n${r.out}`);
    assert.doesNotMatch(r.stderr, /CANDADO/, `«${command}»: el candado no opina fuera de tests/orden\n${r.out}`);
  }
});
