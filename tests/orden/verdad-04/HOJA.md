# HOJA · VERDAD-04 · clasificador sin `>=` ni `stash list`, candado que falla cerrado, copias limpias, fallas acumuladas, retiro de verdad-03 · 2026-09-21

Escrita por el segundo pensamiento (sólo lectura) desde su corrida en limpio de VERDAD-03 (aprobada por Liam el 2026-09-21: T 0d8c51f, H c852e89) y de la entrega de la sesión B. Ninguna afirmación nace de la ejecutora.
Fuentes: `H:` / `T:` = archivos en c852e89 / 0d8c51f (idénticos en lo citado); `revisor` = hallazgos de la corrida en limpio, con salida citada en el chat del 2026-09-21; `B` = entrega VERDAD-03-B § «Observado, sin tocar».
Formato: cada afirmación es una línea `- [ID] (repo) frase · fuente: …`. El nombre del test es la frase exacta entre `(repo) ` y ` · fuente:`. `T+H` = el mismo test en los dos repos.
Circuito: PLAN.md:30 (inciso i). Decisiones vigentes: D-1, D-2, D-4, D-5 (VERDAD-02); D-9, D-10, D-11 (VERDAD-03). Decisiones de Liam para esta hoja (2026-09-21): D-13 se promueven los 12 tests de verdad-03, con la copia `d` recortada · D-14 entra el inciso j) de PLAN.md (una llamada Bash por repo y en secuencia). El push del rojo va por el hook: A3 de VERDAD-03 («rojo pendiente de B») ya existe.

## A · Clasificador (cierre por transcript)

- [A1] (T+H) Un «>» seguido de «=» no es redirección: `i>=0` dentro de un comando cuenta como comparación, no como escritura. Casos con cwd de la sesión en H: cat > /tmp/x.cjs <<'EOF' … console.log(i>=0?a:b) … EOF → lectura · printf 'if (i>=0) x' >> /tmp/x.txt → lectura · echo x > a.txt → escritura · echo x >> a.txt → escritura · fuente: H:tools/_transcript.mjs:29 (REDIR excluye `=>` por lookbehind, no `>=`); revisor (transcript real, 71 tool_use, marcado «console.log(i>=0?t43.slice…»).
- [A2] (T+H) `git stash` cuenta como escritura sólo sin subcomando o con push, pop, apply, drop, clear o branch; `git stash list` y `git stash show` son lectura. Casos con cwd en H: git stash list → lectura · git stash show -p → lectura · git stash → escritura · git stash push -m x → escritura · git stash pop → escritura · git stash drop → escritura · fuente: H:tools/_transcript.mjs:27 y :119 (`stash` en GIT_MUTA sin mirar el subcomando); revisor (marcado «git stash list»).
- [A3] (T+H) El transcript real del revisor al cierre de VERDAD-03 (sesión a616bd1a-e396-45e0-a96c-67d58fe5222b, proyecto H; sólo líneas con tool_use; ≥ 71 tool_use, 0 Edit/Write/MultiEdit/NotebookEdit, 0 Agent/Task/Workflow), reubicado a repos temporales, clasifica como sólo lectura, y con T sucio cierre.mjs sale 0 con aviso. Fixture: tests/orden/verdad-04/fixtures/transcript-revisor-2.jsonl · fuente: revisor (hoy: «escribio | 71 tool_use, 2 escritura(s)», las de A1 y A2); VERDAD-03 C3 (mismo método).

## B · Candado que falla cerrado

- [B1] (T+H) candado.mjs con stdin vacío, con stdin que no es JSON, o con JSON sin `tool_input.file_path` de tipo string, sale 2 con «CANDADO ROTO»; con JSON válido y una ruta permitida sigue saliendo 0, y con una ruta vetada sigue saliendo 2 · fuente: H:tools/candado.mjs:58–59 (`catch {}` → «{}» → ruta vacía → 0); B («con un stdin que no es JSON válido deja pasar»); T:CLAUDE.md:69 («las dos direcciones»).

## C · Copias promovidas limpias y fallas acumuladas

- [C1] (T+H) tests/verdad-02-a.test.ts, -b, -c y -e borran sus carpetas temporales también cuando fallan (finally o after), y tras correr las cuatro copias en verde no queda ninguna carpeta «verdad-02-…» nueva en el directorio temporal · fuente: H:tests/verdad-02-a.test.ts:33,44,62 (`borrar` sólo en el camino feliz; 0 `finally`/`after` en las cuatro); revisor (una carpeta `verdad-02-*` tras `npm test` en verde); B.
- [C2] (T+H) rojo-verde acumula en una sola salida todas las fallas de una orden (tests tocados desde el rojo, nombres sin afirmación o sin test, archivos que no cargan, tests que fallan en HEAD, tests que nunca estuvieron en rojo, carpetas temporales sin borrar) en vez de parar en la primera, y borra las carpetas temporales que detectó tras listarlas; con --orden verdad-02 sale 2 y la salida nombra «tests que fallan en HEAD» con el A1 de verdad-02 (exige «primer commit»), además de lo demás que haya · fuente: H:tools/verdad/rojo-verde.mjs:128,137,138 (retornos tempranos); revisor («--orden verdad-02» → sólo «carpetas temporales sin borrar: verdad-02-gisJW3», exit 2, sin mención del A1).

## D · Retiro de verdad-03

- [D1] (T+H) verdad-03 figura en tests/orden/APROBADAS.md con fecha 2026-09-21, T 0d8c51f y H c852e89, y la salida de rojo-verde --todas en HEAD contiene «verdad-03 · retirada (aprobada 2026-09-21)» y no contiene «orden verdad-03 ·» · fuente: chat 2026-09-21 («Aprobado»); H:tests/orden/APROBADAS.md; VERDAD-03 A1/A2.
- [D2] (T+H) npm test corre tests/verdad-03-a.test.ts, -b, -c, -d, -e y -f (copias editables de los 12 tests de la orden, que importan ./orden/verdad-03/_util.ts; en la copia d, el test D2 comprueba existencia, import, package.json y git log sin volver a correr las copias de verdad-02, que npm test ya corre) y pasan 12/12; tests/orden/verdad-03/ no cambia · fuente: VERDAD-03 D2 (patrón de promoción, decisión D-10); H:tests/orden/verdad-03/d.test.ts:70–73 (corre las 18 copias: ≈ 60 s repetidos dentro de npm test); D-13.

## E · Registro

- [E1] (T+H) CLAUDE.md § Puertas tiene un párrafo VERDAD-04 que nombra «>=», «stash», «CANDADO ROTO», «carpetas temporales» y «todas las fallas»; y el bloque CONTRATO-DECLARADO no cambia · fuente: PLAN.md:23 (e: registro); H:CLAUDE.md:52–54.
- Sin test (Nichos, sin repo): PLAN.md § Estado fila 4: «VERDAD-03 aprobada por Liam 2026-09-21 (T 0d8c51f, H c852e89)» y las filas de VERDAD-04 (rojo y verde); PLAN.md § Cómo se trabaja inciso j) (D-14); `4.3.md` § VERDAD-04.

## Interfaz de prueba (contrato entre los tests de A y el código de B)
`_transcript.mjs`: `escrituraShell(cmd, cwd, roots, env)` sigue decidiendo por comando; A1/A2 se prueban por `cierre.mjs` con `HIGIENE_ROOTS` y transcripts en línea, como en VERDAD-03. `candado.mjs`: stdin JSON `{ "tool_name", "tool_input": { "file_path" } }`; cualquier otra cosa → exit 2 y «CANDADO ROTO» en stderr. `rojo-verde.mjs --orden <id>`: con fallas, stderr lleva una línea «- <id>: …» por cada falla encontrada, todas; las carpetas detectadas se borran y se declara «borradas: …». `tests/orden/APROBADAS.md`: nueva línea «- verdad-03 · aprobada 2026-09-21 · T 0d8c51f · H c852e89». Copias de verdad-03 en `tests/verdad-03-<letra>.test.ts`; T las añade a la lista `test` de `package.json`, H las toma por glob.

## Fuera de esta hoja
Retención de capturas e informe con hash, hueco.mjs, recrear.mjs, contratos.json, impacto.mjs (VERDAD-05/06); AUDITORIA-01 después, bajo el mismo circuito; el flaky de `tests/services-v6.test.ts` («Element is not attached to the DOM», 1 de 3 corridas en T) se anota para la auditoría, no aquí.

## Notas para las sesiones A y B
A: carpetas temporales con prefijo «verdad-04-» y borradas en `finally`; el fixture de A3 se extrae del transcript real como en VERDAD-03 (sólo líneas con tool_use) y se reubica con la misma técnica; C1 corre las cuatro copias con `node --experimental-strip-types --test` (≈ 60 s) midiendo el directorio temporal antes y después; C2 se prueba sobre un repo temporal con una orden que junta tres fallas (un test que pasa en el rojo, uno que falla en HEAD y uno que deja carpeta) y, contra lo real, con `--orden verdad-02` (≈ 60 s; deja restos que rojo-verde borra tras B). B1 se prueba sobre el candado real con stdin vacío, «esto no es json», `{}` y `{"tool_name":"Edit","tool_input":{"file_path":123}}`. Al commit rojo, los 9 tests de A fallan; el push va por el hook (verdad-04 «rojo pendiente de B», verdad-02 retirada, verdad-03 verificada entera hasta que B la retire). B: APROBADAS.md, las copias de verdad-03 y C2 van en el mismo commit; el pre-push corre el rojo-verde nuevo.
