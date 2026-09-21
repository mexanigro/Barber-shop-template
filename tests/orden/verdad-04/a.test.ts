// VERDAD-04 · A · clasificador (tools/_transcript.mjs vía tools/cierre.mjs): un «>» seguido de «=» no es redirección, `git stash list|show`
// son lectura, y el transcript real del revisor al cierre de VERDAD-03 clasifica como sólo lectura. Sesión A (2026-09-21): tests rojos.
// Caja negra: `node tools/cierre.mjs` con HIGIENE_ROOTS (par temporal), HIGIENE_PLAN y HIGIENE_TRANSCRIPT; transcripts en línea con cwd
// en el H temporal (misma técnica que VERDAD-03 C1–C3). Toda carpeta temporal se borra en `finally` (conTemporal).
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { cierre, conTemporal, par, transcriptEnLinea, transcriptRevisorReubicado, usosDe } from "./_util.ts";

const EDITORES = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
const AGENTES = new Set(["Agent", "Task", "Workflow"]);

type Caso = { command: string; esperado: "lectura" | "escritura" };

/** Un transcript por caso, T sucio, cwd de la sesión en el H temporal: lectura → 0 con aviso; escritura → 2. */
function comprobar(base: string, casos: Caso[]) {
  const { T, H, plan, roots } = par(base);
  T.escribir({ "sucio.txt": "x\n" });
  casos.forEach((c, i) => {
    const t = transcriptEnLinea(join(base, `caso-${i}.jsonl`), [{ name: "Bash", input: { command: c.command } }], H.dir);
    const r = cierre({ roots, plan, transcript: t });
    const etiqueta = `Bash ${JSON.stringify(c.command)}`;
    if (c.esperado === "lectura") {
      assert.equal(r.status, 0, `es lectura y debe salir 0: ${etiqueta} (salió ${r.status})\n${r.out}`);
      assert.match(r.out, /aviso/i, `debe avisar, no bloquear: ${etiqueta}\n${r.out}`);
    } else {
      assert.equal(r.status, 2, `es escritura y debe salir 2: ${etiqueta} (salió ${r.status})\n${r.out}`);
    }
  });
}

test("Un «>» seguido de «=» no es redirección: `i>=0` dentro de un comando cuenta como comparación, no como escritura. Casos con cwd de la sesión en H: cat > /tmp/x.cjs <<'EOF' … console.log(i>=0?a:b) … EOF → lectura · printf 'if (i>=0) x' >> /tmp/x.txt → lectura · echo x > a.txt → escritura · echo x >> a.txt → escritura", () => {
  conTemporal((base) => comprobar(base, [
    // El caso del revisor (heredoc a /tmp con una comparación adentro), en dos grafías: líneas reales y la del enunciado con «…».
    { command: "cat > /tmp/x.cjs <<'EOF'\nconst t43 = [1, 2];\nconsole.log(i>=0?a:b);\nEOF", esperado: "lectura" },
    { command: "cat > /tmp/x.cjs <<'EOF' … console.log(i>=0?a:b) … EOF", esperado: "lectura" },
    { command: "printf 'if (i>=0) x' >> /tmp/x.txt", esperado: "lectura" },
    // Control (dirección contraria): las redirecciones de verdad al cwd (H) siguen siendo escritura, con > y con >>.
    { command: "echo x > a.txt", esperado: "escritura" },
    { command: "echo x >> a.txt", esperado: "escritura" },
    // Y una comparación seguida de una redirección real al cwd sigue siendo escritura (el «>=» no oculta lo que sigue).
    { command: "node -e 'console.log(i>=0)' > a.txt", esperado: "escritura" },
  ]));
});

test("`git stash` cuenta como escritura sólo sin subcomando o con push, pop, apply, drop, clear o branch; `git stash list` y `git stash show` son lectura. Casos con cwd en H: git stash list → lectura · git stash show -p → lectura · git stash → escritura · git stash push -m x → escritura · git stash pop → escritura · git stash drop → escritura", () => {
  conTemporal((base) => comprobar(base, [
    // Los seis casos del enunciado.
    { command: "git stash list", esperado: "lectura" },
    { command: "git stash show -p", esperado: "lectura" },
    { command: "git stash", esperado: "escritura" },
    { command: "git stash push -m x", esperado: "escritura" },
    { command: "git stash pop", esperado: "escritura" },
    { command: "git stash drop", esperado: "escritura" },
    // El resto de subcomandos de la afirmación, y `show` sin opciones.
    { command: "git stash show", esperado: "lectura" },
    { command: "git stash apply", esperado: "escritura" },
    { command: "git stash clear", esperado: "escritura" },
    { command: "git stash branch rama-x", esperado: "escritura" },
    // Control (dirección contraria): el resto de git no cambia.
    { command: "git status", esperado: "lectura" },
    { command: "git commit -m x", esperado: "escritura" },
  ]));
});

test("El transcript real del revisor al cierre de VERDAD-03 (sesión a616bd1a-e396-45e0-a96c-67d58fe5222b, proyecto H; sólo líneas con tool_use; ≥ 71 tool_use, 0 Edit/Write/MultiEdit/NotebookEdit, 0 Agent/Task/Workflow), reubicado a repos temporales, clasifica como sólo lectura, y con T sucio cierre.mjs sale 0 con aviso. Fixture: tests/orden/verdad-04/fixtures/transcript-revisor-2.jsonl", () => {
  conTemporal((base) => {
    const { T, H, plan, roots } = par(base);
    const revisor = transcriptRevisorReubicado(join(base, "revisor-2.jsonl"), T.dir, H.dir);
    const usos = usosDe(revisor);
    assert.ok(usos.length >= 71, `fixture del revisor: ≥ 71 tool_use (hay ${usos.length})`);
    assert.equal(usos.filter((u) => EDITORES.has(u.name)).length, 0, "fixture del revisor: sin Edit/Write/MultiEdit/NotebookEdit");
    assert.equal(usos.filter((u) => AGENTES.has(u.name)).length, 0, "fixture del revisor: sin Agent/Task/Workflow");
    const comandos = usos.map((u) => String(u.input.command ?? ""));
    assert.ok(comandos.some((c) => c.includes("i>=0")), "el fixture contiene el comando con «i>=0» que hoy se marca (A1)");
    assert.ok(comandos.some((c) => /git stash list/.test(c)), "el fixture contiene «git stash list», que hoy se marca (A2)");
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
