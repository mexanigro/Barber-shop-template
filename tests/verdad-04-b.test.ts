// VERDAD-04 · B · candado que falla cerrado (tools/candado.mjs): stdin vacío, no JSON o sin `tool_input.file_path` string → exit 2 con
// «CANDADO ROTO»; con JSON válido, permitido → 0 y vetado → 2 como hasta ahora. Sesión A (2026-09-21): test rojo. Caja negra: el candado
// real por stdin crudo (no sólo JSON).
// VERDAD-05 D2 (2026-09-21): copia editable promovida a npm test (la orden está aprobada y retirada de rojo-verde --todas; el original
// en tests/orden/verdad-04/ queda congelado).
// VERDAD-09 D-60 (2026-09-22): las rutas y la raíz del candado son una carpeta TEMPORAL (HIGIENE_ROOT), no el repo real: el candado no
// escribe nada, pero con `.git/permitir-tests` abierto en T o en H una copia que mira el repo real cambia de resultado y pone `npm test`
// en rojo. Nada de lo que este test afirma depende del contenido del repo: son rutas.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { conTemporal, correr } from "./orden/verdad-04/_util.ts";

/** tools/candado.mjs del repo real con el stdin tal cual (bytes crudos), como lo recibiría de Claude Code o de una llamada rota,
 *  y con `raiz` (una carpeta temporal) como única raíz vigilada. */
const candadoCrudo = (stdin: string, raiz: string) => correr(["tools/candado.mjs"], { input: stdin, env: { HIGIENE_ROOT: raiz } });

test("candado.mjs con stdin vacío, con stdin que no es JSON, o con JSON sin `tool_input.file_path` de tipo string, sale 2 con «CANDADO ROTO»; con JSON válido y una ruta permitida sigue saliendo 0, y con una ruta vetada sigue saliendo 2", () => {
  conTemporal((base) => {
    const rotos: [string, string][] = [
      ["stdin vacío", ""],
      ["stdin que no es JSON", "esto no es json"],
      ["JSON sin tool_input", "{}"],
      ["file_path que no es string", JSON.stringify({ tool_name: "Edit", tool_input: { file_path: 123 } })],
    ];
    for (const [que, stdin] of rotos) {
      const r = candadoCrudo(stdin, base);
      assert.equal(r.status, 2, `${que} → el candado debe fallar cerrado con 2 (salió ${r.status})\n${r.out}`);
      assert.match(r.stderr, /CANDADO ROTO/, `${que} → debe decir «CANDADO ROTO» en stderr\n${r.out}`);
    }
    // Dirección contraria: JSON válido con una ruta permitida → 0 y sin veto; con una ruta vetada → 2 por veto (CANDADO ·, no ROTO).
    const permitida = candadoCrudo(JSON.stringify({ tool_name: "Write", tool_input: { file_path: join(base, "src/lib/verdad-04-permitida.ts") } }), base);
    assert.equal(permitida.status, 0, `src/lib/… con JSON válido debe seguir pasando (salió ${permitida.status})\n${permitida.out}`);
    assert.doesNotMatch(permitida.stderr, /CANDADO/, "una ruta permitida no se veta ni se declara rota");
    const vetada = candadoCrudo(JSON.stringify({ tool_name: "Write", tool_input: { file_path: join(base, ".env.local") } }), base);
    assert.equal(vetada.status, 2, `.env.local debe seguir vetado (salió ${vetada.status})\n${vetada.out}`);
    assert.match(vetada.stderr, /CANDADO · /, "el veto se explica como «CANDADO · …»");
    assert.doesNotMatch(vetada.stderr, /CANDADO ROTO/, "un veto no es un candado roto");
  });
});
