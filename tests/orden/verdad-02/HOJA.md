# HOJA · VERDAD-02 · el mecanismo: rojo antes que verde, tests bajo candado, cierre por transcript real · 2026-09-20

Escrita por el segundo pensamiento (sólo lectura) desde el registro; ninguna afirmación nace de la ejecutora.
Fuentes: `orden` = C:/Users/liama/Desktop/VERDAD-01 · el método antes que el.txt (líneas); `T:CLAUDE.md` / `H:CLAUDE.md` en 51ccc2d / 09f1009; `PLAN.md`; `2016255:` = código retirado, `git show 2016255:<ruta>`; `chat 2026-09-20` = frases literales de Liam de hoy.
Formato: cada afirmación es una línea `- [ID] (repo) frase · fuente: …`. El nombre del test es la frase exacta entre `(repo) ` y ` · fuente:`. `T+H` = el mismo test en los dos repos.
Circuito (chat 2026-09-20, acuerdo): hoja → dudas a Liam → sesión A commitea tests ROJOS → el revisor refuta tests contra la hoja → «andá» → sesión B hace verde sin tocar `tests/orden/` → el revisor corre todo en limpio.
Decisiones de Liam (2026-09-20): D-1 la variable es HIGIENE_PERMITIR_TESTS=1 · D-2 la puerta de rojo-verde va en pre-push · D-3 la retención de capturas queda fuera de esta hoja (vuelve con la primera hoja de diseño) · D-4 los fixtures son transcripts reales, sólo líneas con tool_use, versionados en T y H · D-5 dos sesiones por orden (A tests, B construcción) más la corrida en limpio del revisor.

## A · Rojo antes que verde, comprobable por git (`tools/verdad/rojo-verde.mjs`, byte a byte igual en T y H)

- [A1] (T+H) El commit rojo de una orden es el primer commit de main que añade tests/orden/<id>/HOJA.md; sin ese commit, rojo-verde --orden <id> sale con 2 y dice «sin commit rojo» · fuente: orden:9 (V3 «habiendo dado el verde y rojo de antemano»); chat 2026-09-20 («primero se va a tener que crear el test»).
- [A2] (T+H) En el árbol del commit rojo cada test de tests/orden/<id>/ corre y falla; si alguno pasa en ese árbol, exit 2 con «<nombre>: nunca estuvo en rojo» · fuente: T:CLAUDE.md:69 / H:CLAUDE.md:67 («romper a propósito… y verlo ROJO»); orden:9.
- [A3] (T+H) En HEAD cada test de tests/orden/<id>/ pasa; si alguno falla, exit 2 con su nombre · fuente: orden:9; PLAN.md:21 (c: «verde roto» frena).
- [A4] (T+H) git diff <rojo> HEAD -- tests/orden/<id>/ no tiene cambios; si los hay, exit 2 con la lista de archivos tocados · fuente: chat 2026-09-20 («de una forma que ni siquiera esta sesión pueda mentir»); acuerdo: la sesión B no toca tests.
- [A5] (T+H) Cada test de tests/orden/<id>/ tiene por nombre una frase que está literal en HOJA.md como afirmación de ese repo, y cada afirmación de ese repo tiene un test con ese nombre; un test sin afirmación o una afirmación sin test → exit 2 con la lista · fuente: orden:7 (V1); orden:15 (R-V1 «lo que no está ahí es no verificado»).
- [A6] (T+H) Con A1–A5 cumplidas sale 0 e imprime una tabla por test: id, frase, «rojo en <sha7>», «verde en <sha7 de HEAD>», sin horas ni texto libre; dos corridas seguidas sobre el mismo HEAD producen bytes idénticos · fuente: orden:21 («Sin texto libre»); chat 2026-09-20 (revisor: el «rojo→verde con hora» no era reproducible; Liam: «tomo lo que decís»).
- [A7] (T+H) .githooks/pre-push corre rojo-verde --todas (cada <id> con carpeta en tests/orden/) y rechaza el push con cualquier exit 2; el bloque CONTRATO-DECLARADO de CLAUDE.md lo declara y tests/contrato-hooks.test.ts sigue verde · fuente: T:CLAUDE.md:50 / H:CLAUDE.md:48 («lo que una instrucción puede saltear, un hook no»); T:CLAUDE.md:54; decisión D-2.

## B · Candado sobre los tests de una orden

- [B1] (T+H) candado.mjs corta con exit 2 un Edit, Write o MultiEdit sobre tests/orden/<id>/… cuando tests/orden/<id>/HOJA.md ya existe en HEAD, salvo HIGIENE_PERMITIR_TESTS=1 en el entorno · fuente: T:CLAUDE.md:50; tools/candado.mjs:6 y :31–32 (precedente HIGIENE_PERMITIR_FLOTA); decisión D-1.
- [B2] (T+H) Antes del commit rojo (la carpeta no está en HEAD) la sesión A escribe libre en tests/orden/<id>/, y un Edit fuera de tests/orden/ no cambia de comportamiento con o sin la variable · fuente: T:CLAUDE.md:69 («las dos direcciones»).
- [B3] (T+H) CLAUDE.md § Puertas nombra tests/orden/ y HIGIENE_PERMITIR_TESTS, y la cabecera de candado.mjs describe la regla · fuente: PLAN.md:23 (e: registro); T:CLAUDE.md:50.

## C · Cierre por transcript (HIGIENE-03 rehecho con transcripts reales)

- [C1] (T+H) Con T o H sucios y un transcript en el que la sesión sólo leyó, cierre.mjs imprime aviso y sale 0 · fuente: orden:28; chat 2026-09-20 (Liam: «mutación: transcript con sólo git status/rev-parse/log y gama.mjs >/dev/null → sólo lectura»). Fixture: las líneas con tool_use del transcript real de la sesión revisora a616bd1a-e396-45e0-a96c-67d58fe5222b (proyecto H), copiadas tal cual a tests/orden/verdad-02/fixtures/transcript-lectura.jsonl.
- [C2] (T+H) Con un transcript en el que la sesión escribió en T o H, cierre.mjs sale 2 y cita la primera escritura · fuente: orden:28. Fixture: líneas con tool_use del transcript real de la sesión ejecutora de VERDAD-01 0d3a280f-27cf-464e-b595-5c6286479737 (85 Edit/Write en T/H medidos por el revisor) en tests/orden/verdad-02/fixtures/transcript-escritura.jsonl.
- [C3] (T+H) Sin transcript_path, con archivo inexistente, ilegible o sin ningún tool_use, cierre.mjs sale 2 · fuente: orden:28 («sin transcript → bloquea»).
- [C4] (T+H) Ninguna de estas órdenes cuenta como escritura, cada una como caso propio y con el cwd de la sesión dentro de H: node tools/gama.mjs peluqueria-paleta-a >/dev/null 2>&1 · echo "HEAD=$(git rev-parse --short HEAD)" · git config --get core.hooksPath · git status --short; git log --oneline -3; git diff --stat; git branch -a; git fetch · node -e 'const f = (x) => x' · node -e 'const s = "git commit -m x"' · printf x >> C:/Users/liama/.claude/projects/C--Users-liama-Desktop-Nichos-hub/memory/MEMORY.md · npx tsx --test tests/x.test.ts 2>&1 | tail -5 · fuente: chat 2026-09-20 (Liam: «ajustar la lista a los verbos que escriben y a redirecciones con ruta dentro de T/H»); causas medidas por el revisor en 2016255:tools/_transcript.mjs:13 (regex) y :53 (raíz por cwd de la sesión).
- [C5] (T+H) Cada una de estas cuenta como escritura cuando su ruta resuelta cae en T o H: Edit/Write/MultiEdit/NotebookEdit con file_path en T/H; git commit|add|rm|mv|checkout|switch|restore|reset|stash|merge|rebase|cherry-pick|revert|apply|clean|push|pull|tag; git branch -d|-D|-m; git config sin --get|--list|-l; > ruta, >> ruta, tee ruta, sed -i ruta, rm|mv|cp|mkdir|touch ruta, npm install|ci|uninstall|update, Set-Content|Out-File|Add-Content|New-Item|Remove-Item|Move-Item|Copy-Item|Rename-Item ruta, con ruta relativa al cwd de la orden si está en T/H o absoluta dentro de T/H; Agent/Task/Workflow siempre · fuente: orden:28; chat 2026-09-20 (Liam: «git commit|add|push|reset|checkout|stash y redirecciones dentro de T/H»); 2016255:tools/_transcript.mjs:13 y :57 como base.
- [C6] (T+H) tools/_transcript.mjs y tools/cierre.mjs son idénticos byte a byte en T y en H, comprobado desde cada repo contra el hermano por la ruta fija de tools/_git.mjs · fuente: H:CLAUDE.md:48–52 (HIGIENE-02, ROOTS = [propio, hermano]).
- [C7] (T+H) Con los dos repos limpios y PLAN.md citando HEAD, cierre.mjs sale 0 cualquiera sea el transcript; con escritura y suciedad sale 2: el cierre por transcript no afloja HIGIENE-02 · fuente: H:CLAUDE.md:52 (HIGIENE-02); T:CLAUDE.md:69 («las dos direcciones»).

## E · Registro

- [E1] (T+H) CLAUDE.md § Puertas tiene un párrafo VERDAD-02 que nombra rojo-verde, tests/orden/, HIGIENE_PERMITIR_TESTS y el cierre por transcript, y el bloque CONTRATO-DECLARADO lista pre-push con rojo-verde · fuente: T:CLAUDE.md:54; PLAN.md:23.
- Sin test (Nichos, sin repo): PLAN.md § Cómo se trabaja, inciso i) con el circuito de la cabecera; `4.3.md` § VERDAD-02 con SHAs del commit rojo y del verde por repo.

## Interfaz de prueba (contrato entre los tests de A y el código de B)
`rojo-verde.mjs --orden <id> [--repo <ruta>] [--todas]`: corre los tests de orden con `node --experimental-strip-types --test tests/orden/<id>/*.test.ts` sobre el árbol rojo (copia temporal del commit rojo) y sobre HEAD. `cierre.mjs`: si existen, `HIGIENE_ROOTS=<T>;<H>` sustituye a ROOTS, `HIGIENE_PLAN=<ruta>` al PLAN.md fijo y `HIGIENE_TRANSCRIPT=<ruta>` al `transcript_path` de stdin. `candado.mjs`: stdin JSON `{ "tool_name", "tool_input": { "file_path" } }` (como hoy) y `HIGIENE_PERMITIR_TESTS`. Los tests de orden no entran en `npm test`; los corre rojo-verde en pre-push.

## Fuera de esta hoja (órdenes posteriores, bajo este mismo circuito)
Retención de capturas (sección D, decisión D-3), hueco.mjs (cinco lugares), recrear.mjs (diff 0), contratos.json, impacto.mjs, capturas con hash e informe por orden. Se rescatan de 2016255 cuando la primera hoja de diseño los necesite.

## Notas para la sesión A
Los tests de A viven en tests/orden/verdad-02/ y se prueban contra repositorios git temporales que el propio test crea (commits rojo, verde y «tests tocados»), contra los dos fixtures reales de C y contra el disco de T y H para B1/B2, C6 y E1. Cada test afirma comportamiento, no existencia: un stub que sólo exista no lo pone verde. Al commit rojo, los 18 fallan.
