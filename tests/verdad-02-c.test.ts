// VERDAD-02 · C · cierre por transcript (HIGIENE-03 rehecho con transcripts reales): tools/cierre.mjs decide por el transcript
// de la sesión si la suciedad es suya. Sesión A (2026-09-20): tests rojos. Caja negra: `node tools/cierre.mjs` del repo real con
// HIGIENE_ROOTS=<T>;<H> (repos temporales), HIGIENE_PLAN (PLAN temporal que cita los HEAD) y HIGIENE_TRANSCRIPT o stdin.transcript_path.
// Fixtures (decisión D-4): líneas con tool_use de dos transcripts reales, con las raíces reales reubicadas a los repos temporales.
// VERDAD-04 C1 (2026-09-21): toda carpeta temporal se crea con `conTemporal()` y se borra en `finally`, también cuando el test falla.
// VERDAD-09 D-61 (2026-09-22): el guard de paridad de tools/ lee las dos raíces de tools/_git.mjs (HIGIENE_ROOTS incluido) y sólo exige
// bytes iguales EN REPOSO: con una orden viva en cualquiera de los dos repos difiere la exigencia con un diagnóstico y pasa.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { ROOT, borrar, carpetaTemporal, cierre, correr, planTemporal, repoTemporal, transcriptEnLinea, transcriptReubicado, usosDe, type Repo, type Uso } from "./orden/verdad-02/_util.ts";

const EDITORES = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
const AGENTES = new Set(["Agent", "Task", "Workflow"]);
const barra = (p: string) => p.replace(/\\/g, "/");

/** Crea una carpeta temporal «verdad-02-…», corre `fn` y la borra SIEMPRE, también si `fn` lanza (VERDAD-04 C1). */
function conTemporal<T>(fn: (base: string) => T): T {
  const base = carpetaTemporal();
  try { return fn(base); } finally { borrar(base); }
}

/** Par temporal T/H limpio, con upstream y PLAN que cita los dos HEAD: el único motivo de bloqueo posible es la suciedad que cada test añade. */
function par(base: string): { T: Repo; H: Repo; plan: string; roots: [string, string] } {
  const T = repoTemporal("T", base), H = repoTemporal("H", base);
  const plan = planTemporal(base, [T.head(), H.head()]);
  return { T, H, plan, roots: [T.dir, H.dir] };
}

test("Con T o H sucios y un transcript en el que la sesión sólo leyó, cierre.mjs imprime aviso y sale 0", () => {
  conTemporal((base) => {
    const { T, H, plan, roots } = par(base);
    const lectura = transcriptReubicado("lectura", join(base, "lectura.jsonl"), T.dir, H.dir);
    // Lo que el fixture real contiene: 32 tool_use, ningún editor, ningún subagente (medido al generarlo).
    const usos = usosDe(lectura);
    assert.equal(usos.length, 32, "fixture de lectura: 32 tool_use");
    assert.equal(usos.filter((u) => EDITORES.has(u.name)).length, 0, "fixture de lectura: sin Edit/Write/MultiEdit/NotebookEdit");
    assert.equal(usos.filter((u) => AGENTES.has(u.name)).length, 0, "fixture de lectura: sin Agent/Task/Workflow");
    // T sucio, H limpio; el transcript llega por el canal real (stdin.transcript_path).
    T.escribir({ "sucio.txt": "x\n" });
    const r1 = cierre({ roots, plan, stdin: { hook_event_name: "Stop", transcript_path: lectura } });
    assert.equal(r1.status, 0, `T sucio + sesión que sólo leyó debe salir 0 (salió ${r1.status})\n${r1.out}`);
    assert.match(r1.out, /aviso/i, `debe imprimir un aviso\n${r1.out}`);
    // H sucio, T limpio.
    rmSync(join(T.dir, "sucio.txt"));
    H.escribir({ "sucio.txt": "x\n" });
    const r2 = cierre({ roots, plan, stdin: { hook_event_name: "Stop", transcript_path: lectura } });
    assert.equal(r2.status, 0, `H sucio + sesión que sólo leyó debe salir 0 (salió ${r2.status})\n${r2.out}`);
    assert.match(r2.out, /aviso/i, `debe imprimir un aviso\n${r2.out}`);
  });
});

test("Con un transcript en el que la sesión escribió en T o H, cierre.mjs sale 2 y cita la primera escritura", () => {
  conTemporal((base) => {
    const { T, H, plan, roots } = par(base);
    const escritura = transcriptReubicado("escritura", join(base, "escritura.jsonl"), T.dir, H.dir);
    const usos = usosDe(escritura);
    const editores = usos.filter((u) => EDITORES.has(u.name));
    assert.ok(editores.length >= 80, `fixture de escritura: ≥ 80 editores (hay ${editores.length})`);
    // La primera escritura del transcript real: Write de tools/_transcript.mjs en T (tool_use 23; antes sólo hay lecturas y dos `=>` de node -e).
    const primera = editores[0];
    assert.equal(primera.name, "Write");
    const relDe = (u: Uso) => { const fp = String(u.input.file_path ?? u.input.notebook_path ?? ""); const raiz = [T.dir, H.dir].find((r) => barra(fp).toLowerCase().startsWith(barra(r).toLowerCase())); return raiz ? barra(relative(raiz, fp)) : barra(fp); };
    assert.equal(relDe(primera), "tools/_transcript.mjs");
    T.escribir({ "sucio.txt": "x\n" });
    const r = cierre({ roots, plan, transcript: escritura });
    assert.equal(r.status, 2, `T sucio + sesión que escribió debe salir 2 (salió ${r.status})\n${r.out}`);
    const salida = barra(r.out);
    assert.ok(salida.includes("tools/_transcript.mjs"), `debe citar la primera escritura (tools/_transcript.mjs)\n${r.out}`);
    assert.match(r.out, /Write/, "debe citar la herramienta de la primera escritura");
    // Y la cita primero: ninguna otra ruta editada aparece antes en la salida.
    const rutas = [...new Set(editores.map(relDe))];
    const posiciones = rutas.map((p) => [p, salida.indexOf(p)] as const).filter(([, i]) => i >= 0).sort((a, b) => a[1] - b[1]);
    assert.equal(posiciones[0]?.[0], "tools/_transcript.mjs", `la primera escritura citada debe ser tools/_transcript.mjs; orden visto: ${posiciones.slice(0, 3).map(([p]) => p).join(" · ")}`);
  });
});

test("Sin transcript_path, con archivo inexistente, ilegible o sin ningún tool_use, cierre.mjs sale 2", () => {
  conTemporal((base) => {
    const { T, H, plan, roots } = par(base);
    T.escribir({ "sucio.txt": "x\n" });
    const a = cierre({ roots, plan, stdin: { hook_event_name: "Stop" } });
    assert.equal(a.status, 2, `sin transcript_path debe salir 2 (salió ${a.status})\n${a.out}`);
    const b = cierre({ roots, plan, transcript: join(base, "no-existe.jsonl") });
    assert.equal(b.status, 2, `transcript inexistente debe salir 2 (salió ${b.status})\n${b.out}`);
    const ilegible = join(base, "ilegible.jsonl");
    writeFileSync(ilegible, "esto no es json\n\u0000\u0001{\n");
    const c = cierre({ roots, plan, stdin: { hook_event_name: "Stop", transcript_path: ilegible } });
    assert.equal(c.status, 2, `transcript ilegible debe salir 2 (salió ${c.status})\n${c.out}`);
    const sinUsos = join(base, "sin-tool-use.jsonl");
    writeFileSync(sinUsos, [
      JSON.stringify({ type: "user", cwd: H.dir, message: { role: "user", content: "hola" } }),
      JSON.stringify({ type: "assistant", cwd: H.dir, message: { role: "assistant", content: [{ type: "text", text: "sólo texto" }] } }),
    ].join("\n") + "\n");
    const d = cierre({ roots, plan, transcript: sinUsos });
    assert.equal(d.status, 2, `transcript sin tool_use debe salir 2 (salió ${d.status})\n${d.out}`);
    // Control: la misma suciedad con un transcript de sólo lectura sale 0 (el 2 de arriba es por el transcript, no por el estado).
    const lectura = transcriptReubicado("lectura", join(base, "lectura.jsonl"), T.dir, H.dir);
    const e = cierre({ roots, plan, transcript: lectura });
    assert.equal(e.status, 0, `control: sólo lectura debe salir 0 (salió ${e.status})\n${e.out}`);
  });
});

test("Ninguna de estas órdenes cuenta como escritura, cada una como caso propio y con el cwd de la sesión dentro de H: node tools/gama.mjs peluqueria-paleta-a >/dev/null 2>&1 · echo \"HEAD=$(git rev-parse --short HEAD)\" · git config --get core.hooksPath · git status --short; git log --oneline -3; git diff --stat; git branch -a; git fetch · node -e 'const f = (x) => x' · node -e 'const s = \"git commit -m x\"' · printf x >> C:/Users/liama/.claude/projects/C--Users-liama-Desktop-Nichos-hub/memory/MEMORY.md · npx tsx --test tests/x.test.ts 2>&1 | tail -5", () => {
  conTemporal((base) => {
    const { T, H, plan, roots } = par(base);
    T.escribir({ "sucio.txt": "x\n" });
    const lecturas = [
      "node tools/gama.mjs peluqueria-paleta-a >/dev/null 2>&1",
      'echo "HEAD=$(git rev-parse --short HEAD)"',
      "git config --get core.hooksPath",
      "git status --short; git log --oneline -3; git diff --stat; git branch -a; git fetch",
      "node -e 'const f = (x) => x'",
      "node -e 'const s = \"git commit -m x\"'",
      "printf x >> C:/Users/liama/.claude/projects/C--Users-liama-Desktop-Nichos-hub/memory/MEMORY.md",
      "npx tsx --test tests/x.test.ts 2>&1 | tail -5",
    ];
    lecturas.forEach((command, i) => {
      const t = transcriptEnLinea(join(base, `lectura-${i}.jsonl`), [{ name: "Bash", input: { command } }], H.dir);
      const r = cierre({ roots, plan, transcript: t });
      assert.equal(r.status, 0, `no es escritura y debe salir 0: ${command} (salió ${r.status})\n${r.out}`);
      assert.match(r.out, /aviso/i, `debe avisar, no bloquear: ${command}\n${r.out}`);
    });
    // Control (dirección contraria): una escritura con el mismo cwd sí bloquea.
    const t = transcriptEnLinea(join(base, "control.jsonl"), [{ name: "Bash", input: { command: "git commit -m x" } }], H.dir);
    const r = cierre({ roots, plan, transcript: t });
    assert.equal(r.status, 2, `control: git commit con cwd en H debe salir 2 (salió ${r.status})\n${r.out}`);
  });
});

test("Cada una de estas cuenta como escritura cuando su ruta resuelta cae en T o H: Edit/Write/MultiEdit/NotebookEdit con file_path en T/H; git commit|add|rm|mv|checkout|switch|restore|reset|stash|merge|rebase|cherry-pick|revert|apply|clean|push|pull|tag; git branch -d|-D|-m; git config sin --get|--list|-l; > ruta, >> ruta, tee ruta, sed -i ruta, rm|mv|cp|mkdir|touch ruta, npm install|ci|uninstall|update, Set-Content|Out-File|Add-Content|New-Item|Remove-Item|Move-Item|Copy-Item|Rename-Item ruta, con ruta relativa al cwd de la orden si está en T/H o absoluta dentro de T/H; Agent/Task/Workflow siempre", () => {
  conTemporal((base) => {
    const { T, H, plan, roots } = par(base);
    T.escribir({ "sucio.txt": "x\n" });
    const tWin = barra(T.dir); // C:/… absoluta dentro de T
    const fuera = base; // cwd fuera de T y H
    const bash = (command: string, cwd = H.dir) => ({ uso: { name: "Bash", input: { command } }, cwd, etiqueta: `Bash cwd=${cwd === H.dir ? "H" : "fuera"}: ${command}` });
    const ps = (command: string) => ({ uso: { name: "PowerShell", input: { command } }, cwd: H.dir, etiqueta: `PowerShell cwd=H: ${command}` });
    const casos = [
      // Editores con file_path en T o H (NotebookEdit lleva también notebook_path, que es el nombre real de su campo).
      { uso: { name: "Edit", input: { file_path: join(H.dir, "src", "x.ts"), old_string: "a", new_string: "b" } }, cwd: fuera, etiqueta: "Edit file_path en H" },
      { uso: { name: "Write", input: { file_path: join(T.dir, "nota.md"), content: "x" } }, cwd: fuera, etiqueta: "Write file_path en T" },
      { uso: { name: "MultiEdit", input: { file_path: join(H.dir, "z.ts"), edits: [] as unknown[] } }, cwd: fuera, etiqueta: "MultiEdit file_path en H" },
      { uso: { name: "NotebookEdit", input: { file_path: join(H.dir, "n.ipynb"), notebook_path: join(H.dir, "n.ipynb"), new_source: "x" } }, cwd: fuera, etiqueta: "NotebookEdit en H" },
      // git que muta, con cwd en H.
      ...["git commit -m x", "git add -A", "git rm x.txt", "git mv a b", "git checkout -- x.txt", "git switch -c rama", "git restore x.txt", "git reset --hard", "git stash", "git merge otra", "git rebase main", "git cherry-pick abc1234", "git revert abc1234", "git apply parche.diff", "git clean -fd", "git push", "git pull", "git tag v1", "git branch -d rama", "git branch -D rama", "git branch -m rama", "git config core.hooksPath .githooks"].map((c) => bash(c)),
      // Redirecciones y verbos de disco con ruta relativa al cwd (H).
      ...["echo x > nota.txt", "echo x >> nota.txt", "echo x | tee nota.txt", "sed -i 's/a/b/' nota.txt", "rm nota.txt", "mv a.txt b.txt", "cp a.txt b.txt", "mkdir carpeta", "touch nota.txt", "npm install", "npm ci", "npm uninstall x", "npm update"].map((c) => bash(c)),
      // PowerShell con ruta relativa al cwd (H).
      ...["Set-Content -Path nota.txt -Value x", "'x' | Out-File nota.txt", "Add-Content nota.txt x", "New-Item nota.txt", "Remove-Item nota.txt", "Move-Item a.txt b.txt", "Copy-Item a.txt b.txt", "Rename-Item a.txt b.txt"].map((c) => ps(c)),
      // Ruta absoluta dentro de T con cwd fuera.
      bash(`echo x > ${tWin}/nota.txt`, fuera),
      bash(`cd ${tWin} && git commit -m x`, fuera),
      // Subagentes: siempre, aun con cwd fuera.
      { uso: { name: "Agent", input: { prompt: "hacé algo", subagent_type: "general-purpose" } }, cwd: fuera, etiqueta: "Agent" },
      { uso: { name: "Task", input: { prompt: "hacé algo" } }, cwd: fuera, etiqueta: "Task" },
      { uso: { name: "Workflow", input: { script: "x" } }, cwd: fuera, etiqueta: "Workflow" },
    ];
    casos.forEach((caso, i) => {
      const t = transcriptEnLinea(join(base, `escritura-${i}.jsonl`), [caso.uso], caso.cwd);
      const r = cierre({ roots, plan, transcript: t });
      assert.equal(r.status, 2, `es escritura y debe salir 2: ${caso.etiqueta} (salió ${r.status})\n${r.out}`);
    });
    // Control (dirección contraria): una lectura con el mismo cwd no bloquea.
    const t = transcriptEnLinea(join(base, "control.jsonl"), [{ name: "Bash", input: { command: "git status" } }], H.dir);
    const r = cierre({ roots, plan, transcript: t });
    assert.equal(r.status, 0, `control: git status con cwd en H debe salir 0 (salió ${r.status})\n${r.out}`);
  });
});

/** Órdenes vivas de una raíz: carpetas `tests/orden/<id>/` con HOJA.md y sin línea «- <id> · aprobada» en su APROBADAS.md. */
function ordenesVivas(raiz: string): string[] {
  const dir = resolve(raiz, "tests", "orden");
  let aprobadas = "";
  try { aprobadas = readFileSync(join(dir, "APROBADAS.md"), "utf8"); } catch { /* sin APROBADAS.md: ninguna retirada */ }
  let entradas: string[] = [];
  try { entradas = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name); } catch { return []; }
  return entradas
    .filter((id) => existsSync(join(dir, id, "HOJA.md")))
    .filter((id) => !new RegExp(`^- ${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} · aprobada`, "m").test(aprobadas));
}

test("tools/_transcript.mjs y tools/cierre.mjs son idénticos byte a byte en T y en H, comprobado desde cada repo contra el hermano por la ruta fija de tools/_git.mjs", (t) => {
  // Las dos raíces salen de tools/_git.mjs en un proceso aparte (el test no importa tools/*): las fijas, o las de HIGIENE_ROOTS
  // cuando se prueba contra repos temporales, igual que cierre.mjs (VERDAD-09 D-61).
  const h = correr(["--input-type=module", "-e", "import('./tools/_git.mjs').then((g) => process.stdout.write(g.ROOTS.join(';')))"], { env: { HIGIENE_ROOTS: process.env.HIGIENE_ROOTS } });
  assert.equal(h.status, 0, `tools/_git.mjs debe exportar ROOTS\n${h.out}`);
  const [propio, hermano] = h.stdout.trim().split(";");
  assert.ok(hermano && barra(hermano).toLowerCase() !== barra(propio).toLowerCase(), `las dos raíces deben ser repos distintos (${propio} / ${hermano})`);
  // D-61: la paridad de tools/ es un invariante de REPOSO. Con una orden viva en cualquiera de los dos repos, el circuito avanza repo
  // por repo (el verde de B en uno antes que el rojo de A en el otro) y los tools/ difieren a propósito: se difiere y se avisa.
  const vivas = [...new Set([...ordenesVivas(propio), ...ordenesVivas(hermano)])].sort();
  if (vivas.length) { t.diagnostic(`paridad de tools/ diferida: orden viva ${vivas.join(", ")}`); return; }
  for (const f of ["tools/_transcript.mjs", "tools/cierre.mjs"]) {
    const a = readFileSync(resolve(propio, f));
    const b = readFileSync(resolve(hermano, f));
    assert.ok(a.length > 0, `${f} no puede estar vacío`);
    assert.ok(a.equals(b), `${f} difiere byte a byte entre ${propio} y ${hermano}`);
  }
});

test("Con los dos repos limpios y PLAN.md citando HEAD, cierre.mjs sale 0 cualquiera sea el transcript; con escritura y suciedad sale 2: el cierre por transcript no afloja HIGIENE-02", () => {
  conTemporal((base) => {
    const { T, H, plan, roots } = par(base);
    const lectura = transcriptReubicado("lectura", join(base, "lectura.jsonl"), T.dir, H.dir);
    const escritura = transcriptReubicado("escritura", join(base, "escritura.jsonl"), T.dir, H.dir);
    const limpio = [
      ["sólo lectura", cierre({ roots, plan, transcript: lectura })],
      ["escritura", cierre({ roots, plan, transcript: escritura })],
      ["sin transcript", cierre({ roots, plan, stdin: { hook_event_name: "Stop" } })],
    ] as const;
    for (const [nombre, r] of limpio) assert.equal(r.status, 0, `limpio + PLAN al día debe salir 0 con transcript «${nombre}» (salió ${r.status})\n${r.out}`);
    // Dirección positiva: escritura + suciedad → 2 (HIGIENE-02 no se afloja).
    T.escribir({ "sucio.txt": "x\n" });
    const r = cierre({ roots, plan, transcript: escritura });
    assert.equal(r.status, 2, `escritura + suciedad debe salir 2 (salió ${r.status})\n${r.out}`);
  });
});
