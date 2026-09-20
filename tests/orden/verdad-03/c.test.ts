// VERDAD-03 · C · clasificador (tools/_transcript.mjs vía tools/cierre.mjs) sin falsos positivos ni huecos conocidos: variables en
// rutas (D-9), comilla suelta, y el transcript real del revisor. Sesión A (2026-09-20): tests rojos. Caja negra: `node tools/cierre.mjs`
// con HIGIENE_ROOTS (par temporal), HIGIENE_PLAN y HIGIENE_TRANSCRIPT; transcripts en línea con cwd en el H temporal.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join, relative } from "node:path";
import { cierre, conTemporal, par, transcriptEnLinea, transcriptRevisorReubicado, transcriptReubicado, usosDe, type Uso } from "./_util.ts";

const EDITORES = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
const AGENTES = new Set(["Agent", "Task", "Workflow"]);
const barra = (p: string) => p.replace(/\\/g, "/");
/** Variables de los casos: ausentes del entorno salvo que el caso las ponga (el entorno del hook es parte del enunciado). */
const SIN: Record<string, string | undefined> = { S: undefined, D: undefined, NOEXISTE: undefined };

type Caso = { tool?: "Bash" | "PowerShell"; command: string; esperado: "lectura" | "escritura"; env?: Record<string, string> };

/** Un transcript por caso, T sucio, cwd de la sesión en el H temporal: lectura → 0 con aviso; escritura → 2. */
function comprobar(base: string, casos: Caso[]) {
  const { T, H, plan, roots } = par(base);
  T.escribir({ "sucio.txt": "x\n" });
  casos.forEach((c, i) => {
    const t = transcriptEnLinea(join(base, `caso-${i}.jsonl`), [{ name: c.tool ?? "Bash", input: { command: c.command } }], H.dir);
    const r = cierre({ roots, plan, transcript: t, env: { ...SIN, ...(c.env ?? {}) } });
    const etiqueta = `${c.tool ?? "Bash"} ${JSON.stringify(c.command)}${c.env ? ` con entorno ${JSON.stringify(c.env)}` : ""}`;
    if (c.esperado === "lectura") {
      assert.equal(r.status, 0, `es lectura y debe salir 0: ${etiqueta} (salió ${r.status})\n${r.out}`);
      assert.match(r.out, /aviso/i, `debe avisar, no bloquear: ${etiqueta}\n${r.out}`);
    } else {
      assert.equal(r.status, 2, `es escritura y debe salir 2: ${etiqueta} (salió ${r.status})\n${r.out}`);
    }
  });
}

test("Las variables $X, ${X} y %X% dentro de rutas y destinos se resuelven primero con las asignaciones «X=valor» del mismo comando, después con el entorno del hook, y si no existen valen vacío como en bash; cuenta como escritura sólo lo que resuelve dentro de T/H. Casos, con cwd de la sesión en H: S=/tmp/x; mkdir -p \"$S\" → lectura · S=src; mkdir -p \"$S\" → escritura · node x.mjs > \"$S/a.txt\" con S=/tmp/x → lectura · rm -rf \"$D\" con D=/tmp/y → lectura · node x.mjs > \"$NOEXISTE/a.txt\" → lectura · mkdir -p \"$NOEXISTE\" → lectura · echo x > \"$S/a.txt\" con S=. → escritura", () => {
  conTemporal((base) => comprobar(base, [
    // Los siete casos del enunciado (asignación en el mismo comando; NOEXISTE no existe en ningún lado → vacío).
    { command: 'S=/tmp/x; mkdir -p "$S"', esperado: "lectura" },
    { command: 'S=src; mkdir -p "$S"', esperado: "escritura" },
    { command: 'S=/tmp/x; node x.mjs > "$S/a.txt"', esperado: "lectura" },
    { command: 'D=/tmp/y; rm -rf "$D"', esperado: "lectura" },
    { command: 'node x.mjs > "$NOEXISTE/a.txt"', esperado: "lectura" },
    { command: 'mkdir -p "$NOEXISTE"', esperado: "lectura" },
    { command: 'S=.; echo x > "$S/a.txt"', esperado: "escritura" },
    // ${X}, y la asignación también vale con && y en la línea anterior.
    { command: 'S=/tmp/x; mkdir -p "${S}/y"', esperado: "lectura" },
    { command: 'S=src && mkdir -p "${S}/y"', esperado: "escritura" },
    { command: 'S=/tmp/x\nmkdir -p "$S"', esperado: "lectura" },
    // Después, el entorno del hook; la asignación del comando gana al entorno.
    { command: 'mkdir -p "$S"', esperado: "lectura", env: { S: "/tmp/x" } },
    { command: 'mkdir -p "$S"', esperado: "escritura", env: { S: "src" } },
    { command: 'S=/tmp/x; mkdir -p "$S"', esperado: "lectura", env: { S: "src" } },
    { command: 'echo x > "$S/a.txt"', esperado: "lectura", env: { S: "/tmp/x" } },
    // %X% (PowerShell/cmd): entorno del hook o vacío.
    { tool: "PowerShell", command: 'New-Item -ItemType Directory "%S%"', esperado: "lectura", env: { S: "/tmp/x" } },
    { tool: "PowerShell", command: 'New-Item -ItemType Directory "%S%"', esperado: "escritura", env: { S: "src" } },
    { tool: "PowerShell", command: 'Set-Content "%NOEXISTE%/a.txt" x', esperado: "lectura" },
    // Control (dirección contraria): sin variables, lo de siempre sigue igual.
    { command: "mkdir -p src", esperado: "escritura" },
    { command: "mkdir -p /tmp/x", esperado: "lectura" },
  ]));
});

test("Una comilla sin cerrar no oculta lo que sigue: quitadas las cadenas balanceadas, una comilla suelta se descarta y el resto del comando se analiza como fuera de comillas. Casos con cwd en H: cat <<EOF … don't … EOF; git commit -m 'x' → escritura · cat <<EOF … don't … EOF; git status → lectura · echo \"it's\" > /dev/null; git status → lectura; y el fixture de escritura de VERDAD-02 (tests/orden/verdad-02/fixtures/transcript-escritura.jsonl, reubicado a repos temporales) sigue clasificando como escribió con la misma primera escritura, Write tools/_transcript.mjs", () => {
  conTemporal((base) => {
    comprobar(base, [
      // Heredoc con apóstrofo suelto (bash real: el terminador va solo en su línea) y la variante escrita en el enunciado.
      { command: "cat <<EOF\nit don't matter\nEOF\ngit commit -m 'x'", esperado: "escritura" },
      { command: "cat <<EOF … don't … EOF; git commit -m 'x'", esperado: "escritura" },
      { command: "cat <<EOF\nit don't matter\nEOF\ngit status", esperado: "lectura" },
      { command: "cat <<EOF … don't … EOF; git status", esperado: "lectura" },
      { command: 'echo "it\'s" > /dev/null; git status', esperado: "lectura" },
      // Una comilla suelta y después una escritura real dentro de comillas balanceadas: la balanceada sigue siendo cadena.
      { command: "echo don't; git commit -m 'x'", esperado: "escritura" },
      { command: "echo don't; echo 'git commit -m x'", esperado: "lectura" },
    ]);
    // El fixture real de escritura de VERDAD-02 (por ruta, sin copiarlo) sigue clasificando igual: 2 y primera escritura Write tools/_transcript.mjs.
    const { T, H, plan, roots } = par(join(base, "fixture"));
    const escritura = transcriptReubicado("escritura", join(base, "escritura.jsonl"), T.dir, H.dir);
    const editores = usosDe(escritura).filter((u) => EDITORES.has(u.name));
    assert.ok(editores.length >= 80, `fixture de escritura de VERDAD-02: ≥ 80 editores (hay ${editores.length})`);
    const relDe = (u: Uso) => { const fp = String(u.input.file_path ?? u.input.notebook_path ?? ""); const raiz = [T.dir, H.dir].find((r) => barra(fp).toLowerCase().startsWith(barra(r).toLowerCase())); return raiz ? barra(relative(raiz, fp)) : barra(fp); };
    assert.equal(editores[0].name, "Write");
    assert.equal(relDe(editores[0]), "tools/_transcript.mjs");
    T.escribir({ "sucio.txt": "x\n" });
    const r = cierre({ roots, plan, transcript: escritura });
    assert.equal(r.status, 2, `T sucio + fixture de escritura debe salir 2 (salió ${r.status})\n${r.out}`);
    const salida = barra(r.out);
    assert.match(r.out, /Write/, "debe citar la herramienta de la primera escritura");
    const posiciones = [...new Set(editores.map(relDe))].map((p) => [p, salida.indexOf(p)] as const).filter(([, i]) => i >= 0).sort((a, b) => a[1] - b[1]);
    assert.equal(posiciones[0]?.[0], "tools/_transcript.mjs", `la primera escritura citada debe seguir siendo tools/_transcript.mjs; orden visto: ${posiciones.slice(0, 3).map(([p]) => p).join(" · ")}\n${r.out}`);
  });
});

test("El transcript real del revisor de hoy (sesión a616bd1a-e396-45e0-a96c-67d58fe5222b, proyecto H; sólo líneas con tool_use; ≥ 51 tool_use, 0 Edit/Write/MultiEdit/NotebookEdit, 0 Agent/Task/Workflow), reubicado a repos temporales, clasifica como sólo lectura, y con T sucio cierre.mjs sale 0 con aviso. Fixture: tests/orden/verdad-03/fixtures/transcript-revisor.jsonl", () => {
  conTemporal((base) => {
    const { T, H, plan, roots } = par(base);
    const revisor = transcriptRevisorReubicado(join(base, "revisor.jsonl"), T.dir, H.dir);
    const usos = usosDe(revisor);
    assert.ok(usos.length >= 51, `fixture del revisor: ≥ 51 tool_use (hay ${usos.length})`);
    assert.equal(usos.filter((u) => EDITORES.has(u.name)).length, 0, "fixture del revisor: sin Edit/Write/MultiEdit/NotebookEdit");
    assert.equal(usos.filter((u) => AGENTES.has(u.name)).length, 0, "fixture del revisor: sin Agent/Task/Workflow");
    assert.ok(usos.some((u) => /\$CLAUDE_SCRATCHPAD_DIR|"\$S\/|"\$D"/.test(String(u.input.command ?? ""))), "el fixture contiene los comandos con «\"$VAR/…\"» que hoy se marcan (hallazgo 1)");
    T.escribir({ "sucio.txt": "x\n" });
    // Por el canal real (stdin.transcript_path) y por HIGIENE_TRANSCRIPT.
    const r1 = cierre({ roots, plan, stdin: { hook_event_name: "Stop", transcript_path: revisor } });
    assert.equal(r1.status, 0, `T sucio + revisor que sólo leyó debe salir 0 (salió ${r1.status})\n${r1.out}`);
    assert.match(r1.out, /aviso/i, `debe imprimir un aviso\n${r1.out}`);
    const r2 = cierre({ roots, plan, transcript: revisor });
    assert.equal(r2.status, 0, `ídem por HIGIENE_TRANSCRIPT (salió ${r2.status})\n${r2.out}`);
    assert.match(r2.out, /aviso/i);
    // Control (dirección contraria): el mismo par con una escritura real bloquea.
    const t = transcriptEnLinea(join(base, "control.jsonl"), [{ name: "Bash", input: { command: "git commit -m x" } }], H.dir);
    const r3 = cierre({ roots, plan, transcript: t });
    assert.equal(r3.status, 2, `control: git commit con cwd en H debe salir 2 (salió ${r3.status})\n${r3.out}`);
  });
});
