# HOJA · VELOCIDAD-02 · `rojo-verde` acepta el commit de corrección · 2026-10-27

Escrita por la sesión de VELOCIDAD-02 (2026-10-27), sin tocar T ni H. Viene de **D-394** (Liam, «Orden aparte»): la Parte 4 de `bloque-04/VELOCIDAD-01-PROPUESTA.md` (D-390, PLAN.md inciso af (4): «una corrección del rojo es un commit de corrección; el revert y el rojo nuevo quedan para una hoja que cambia de fondo») quedó escrita en CLAUDE.md con su techo, porque la herramienta no la acepta.

Línea base: **T `main` e6512d5** y **H `main` 6f77557**, los dos iguales a `origin/main` y limpios (arranque de la sesión, 2026-10-27). Las referencias `archivo:línea` son de esos commits.

Formato de las afirmaciones: el de siempre, `- [ID] (repo) frase · fuente: …`. Las de esta orden son `(T+H)` y los archivos de `tests/orden/velocidad-02/` son iguales en T y en H (`cmp`).

## Qué pasa hoy (medido, 2026-10-27)

- `rojo-verde` toma por rojo el último commit de `main` que **añade** `tests/orden/<id>/HOJA.md` (`tools/verdad/rojo-verde.mjs:223`, `--diff-filter=A`). Su A4 da exit 2 si `git diff <rojo> HEAD -- tests/orden/<id>/` no está vacío (`rojo-verde.mjs:239-240`).
- Por eso hoy la única corrección que pasa es **revert del rojo + rojo nuevo** (inciso i), dos commits más. Por cómo se escribe, el rojo nuevo vuelve a meter la carpeta entera aunque cambie una línea. El «camino (b)» del inciso i (una corrección acotada a líneas nombradas, en commit propio, que el revisor compara con el rojo) **no lo acepta ninguna herramienta**: con un commit así, A4 sale 2.
- `tools/candado.mjs:75` usa la misma definición (`--diff-filter=A`) para saber si una carpeta está congelada. Una corrección no vuelve a añadir `HOJA.md`, así que **el candado no cambia**: escribir en la carpeta de una orden con rojo sigue pidiendo `.git/permitir-tests` = 1.
- **Las copias promovidas.** D-394 decía que «unas treinta copias promovidas por repo fijan esa definición». Medido con `git grep -l "diff-filter=A" -- tests ':!tests/orden'`, son **26 por repo, las mismas en T y en H**:
  - **25** miran **una** orden aprobada fija (`CARPETA` o un id escrito) y afirman que su carpeta sigue congelada desde su último rojo. Ninguna orden aprobada se corrige, así que no cambian.
  - **1**, `tests/verdad-08-a.test.ts:83`, recorre **todas** las órdenes de `APROBADAS.md` y exige que su `_util.ts` no cambió desde el rojo. Ésa se rompería la primera vez que se apruebe una orden con una corrección que toque su `_util.ts` (M1).
- **Pasar del «último que añade `HOJA.md`» al «último que toca la carpeta» hoy da lo mismo.** Para cada orden con `HOJA.md`, `git log -1 --diff-filter=A main -- tests/orden/<id>/HOJA.md` y `git log -1 main -- tests/orden/<id>/` dan el mismo commit: **H 39 de 39, T 36 de 36** (2026-10-27).

## Qué cambia

1. **La corrección (D-395).**
   - **Qué es.** Un commit de `main` posterior al rojo que toca **sólo** `tests/orden/<id>/`, no borra ni vuelve a añadir `HOJA.md`, y suma al final de `HOJA.md`, bajo `## Correcciones`, **una** línea:
     ```
     - C<n> · AAAA-MM-DD · archivos: <a.test.ts, …> · afirmaciones: [ID] [ID] · <porqué> · Liam: «<su sí>»
     ```
     `<n>` cuenta las correcciones de la orden (1, 2, …).
   - **Qué comprueba `rojo-verde`, por cada corrección** (con `git diff -U0 <corrección>^ <corrección>`):
     - todo archivo que cambia, salvo `HOJA.md`, está en `archivos:`;
     - toda afirmación de este repo que se agrega, se quita o cambia de frase, de repo o de marca «, webs» (comparada por ID con `afirmaciones()` de los dos lados) está en `afirmaciones:`;
     - toda línea de `HOJA.md` que cambia es la afirmación de un ID nombrado, la línea `C<n>` nueva o el título `## Correcciones` la primera vez.
   - Si algo de eso no se cumple, sale 2 con una línea por falla, como C2 de VERDAD-04.
   - **Qué no comprueba.** Dentro de un archivo nombrado, la herramienta no sabe qué líneas tocan qué afirmación; eso lo lee la verificadora, en un diff acotado.
2. **El rojo efectivo (D-396).** Es la última corrección; si no hay, el rojo de siempre.
   - El rojo de siempre sigue siendo el último commit que añade `HOJA.md`. El camino revert + rojo nuevo no cambia, y los rojos anteriores se siguen citando.
   - Las correcciones son los commits de `<rojo>..HEAD` que tocan `tests/orden/<id>/`. Uno que toca la carpeta sin línea `C<n>` nueva sigue siendo la falla de A4 de hoy, con el mismo mensaje («cambió entre el rojo … y HEAD …»). Así `tests/verdad-02-a.test.ts:101` y los demás que la fijan no cambian.
   - A4 compara desde el rojo efectivo.
   - Hay «rojo pendiente de B» cuando ningún commit desde el rojo toca algo fuera de la carpeta, así que no hay verde. Si el rojo efectivo es HEAD pero ya hubo un verde antes de la corrección, la orden se verifica entera y la tabla cita ese verde. Así una corrección no tapa la verificación del verde.
3. **El árbol rojo de una orden corregida (D-397).** En el clon neutro de siempre (VERDAD-07) es el **código del rojo** con la **carpeta de la última corrección**: `checkout --detach <rojo>` + `git checkout <rojo efectivo> -- tests/orden/<id>/`.
   - Así una afirmación corregida tiene que fallar contra el código de antes del verde, aunque la corrección llegue después del verde.
   - El mensaje de «nunca estuvo en rojo» lo dice: «pasa en el árbol de <rojo> con la carpeta de <corrección>».
   - Techo: si entre el rojo y la corrección otra orden cambió el código que la afirmación corregida mira, el árbol rojo no lo ve.
4. **La salida (D-398).**
   - Las líneas de la tabla no cambian: «… · rojo en <rojo> (clon neutro) · verde en <verde>».
   - Con correcciones se suma **antes** de «rojos anteriores» una línea `correcciones: <sha7> …`. «Rojos anteriores» sigue siendo la última línea, como fijan `verdad-02-a` y `verdad-03-b`.
   - Sin correcciones, la salida es byte a byte la de hoy.
5. **La copia que recorre todas las aprobadas (M1, D-399).** `tests/verdad-08-a.test.ts` toma el rojo de cada orden aprobada como **el último commit de `main` que toca su carpeta**. Hoy da lo mismo (H 39/39, T 36/36); después de la primera orden corregida, no.
6. **Lo que no cambia.**
   - `tools/candado.mjs`: la corrección pide el permiso de siempre.
   - `tools/tests-del-commit.mjs`: un commit que toca la carpeta de la orden no corre sus tests, que tienen que fallar.
   - Los hooks y el bloque CONTRATO-DECLARADO.
   - Las 25 copias de una orden fija.
   - `rojo-verde.mjs` sigue igual byte a byte en T y en H.
7. **Textos (E1).**
   - Un párrafo «**VELOCIDAD-02 (AAAA-MM-DD):**» en § Puertas automáticas de CLAUDE.md de T y de H.
   - La cabecera de `rojo-verde.mjs` (A1, A2, A4) dice lo de 1 a 4.
   - Al cerrar, el inciso i) de PLAN.md cambia «Corrección de A tras el rojo: revert…» por la corrección de D-395, y el revert queda para la hoja que cambia de fondo, como dice af (4).
   - El techo de D-394 en el párrafo VELOCIDAD-01 **no se edita**: lo vigila `tests/orden/velocidad-01/e.test.ts`, de una orden viva. El párrafo de VELOCIDAD-02 dice que ese techo se levantó.

## Riesgo (inciso af (2))

**Bajo**, propuesto: es el mecanismo de verificación, no reglas, dinero, autenticación, datos de producción ni borrados. Una sola sesión escribe el rojo y el verde, y después va la verificadora. Liam lo confirma (L3).

Pero `rojo-verde` es lo que decide si una orden está en verde. Un error suyo deja pasar órdenes sin rojo, así que las mutaciones son obligatorias (abajo).

## Afirmaciones · VELOCIDAD-02

Cada test arma un repo temporal propio con `tools/verdad/rojo-verde.mjs` de HEAD y una orden de juguete, como `tests/verdad-03-b.test.ts`, y corre `node tools/verdad/rojo-verde.mjs --orden x --repo <tmp>`. Ninguno toca el repo real.

- [C1] (T+H) Un commit posterior al rojo que toca sólo tests/orden/<id>/ y suma bajo «## Correcciones» de HOJA.md una línea «- C<n> · …» que nombra cada archivo y cada afirmación que cambia es una corrección: rojo-verde --orden <id> sale 0 y su tabla lleva, antes de «rojos anteriores», la línea «correcciones: <sha7>» · fuente: D-395, D-396, D-398
- [C2] (T+H) El árbol rojo de una orden corregida es el código del commit rojo con la carpeta tests/orden/<id>/ de la última corrección: una afirmación corregida que pasa con el código del rojo sale «nunca estuvo en rojo», también cuando la corrección es posterior al verde · fuente: D-397
- [C3] (T+H) Una corrección que toca un archivo fuera de tests/orden/<id>/ hace salir 2 a rojo-verde con «la corrección <sha7> toca fuera de tests/orden/<id>/» y el archivo · fuente: D-395
- [C4] (T+H) Una corrección que cambia un archivo o una afirmación que su línea «C<n>» no nombra, o una línea de HOJA.md que no es la de una afirmación nombrada ni la línea «C<n>» nueva, hace salir 2 a rojo-verde nombrando cada uno · fuente: D-395
- [C5] (T+H) Un commit posterior a una corrección que toca tests/orden/<id>/ sin línea «C<n>» nueva hace salir 2 a rojo-verde con «cambió entre el rojo <sha7 de la corrección> y HEAD»; y una corrección del rojo anterior a un revert + rojo nuevo no cuenta: la tabla no lleva «correcciones:» · fuente: D-396, `tests/verdad-02-a.test.ts:101`, `tests/verdad-03-b.test.ts`
- [C6] (T+H) Con la última corrección en HEAD y ningún commit fuera de tests/orden/<id>/ desde el rojo, rojo-verde sale 0 con «<id> · rojo pendiente de B»; con un verde antes de la corrección, la verifica entera y su tabla cita ese verde · fuente: D-396
- [M1] (T+H) tests/verdad-08-a.test.ts toma el rojo de cada orden aprobada como el último commit de main que toca su carpeta, no como el último que añade su HOJA.md · fuente: D-399, `tests/verdad-08-a.test.ts:83`
- [E1] (T+H) CLAUDE.md § Puertas automáticas tiene un párrafo VELOCIDAD-02 que nombra «commit de corrección», «## Correcciones», «árbol rojo» y «D-394», y el bloque CONTRATO-DECLARADO es idéntico al de T e6512d5 · H 6f77557 · fuente: D-398, inciso af

Sin test: que `rojo-verde.mjs` sea igual byte a byte en T y en H y que sin correcciones su salida no cambie. Las dos pasarían ya en el árbol rojo (A2: «nunca estuvo en rojo»). Las vigilan `tests/verdad-02-c.test.ts` (paridad en reposo y la línea «paridad de tools/» del pre-push) y `tests/verdad-02-a.test.ts` / `tests/verdad-03-b.test.ts` (la última línea de la tabla sin correcciones, byte a byte).

## Mutaciones (obligatorias en el verde; cada una cae y se restaura, sha256 igual)

1. Sin la comprobación de «archivos:» → cae C4.
2. Sin la comprobación de líneas de `HOJA.md` → cae C4.
3. El árbol rojo con el código de la corrección y no el del rojo → cae C2.
4. A4 desde el rojo de siempre y no desde el efectivo → caen C1 y C5.
5. Aceptar una corrección que toca fuera de la carpeta → cae C3.
6. La línea «correcciones:» después de «rojos anteriores» → cae C1.
7. Una corrección sin línea `C<n>` cuenta como corrección → cae C5.
8. `verdad-08-a` vuelve a `--diff-filter=A` → cae M1.

## Preguntas para Liam

- **L1. ¿Cuándo vale una corrección?**
  - **«Hasta aprobar (Recomendado)»**: antes o después del verde. El árbol rojo de D-397 hace que el orden no importe: una afirmación corregida tiene que fallar contra el código de antes del verde. La línea `C<n>` dice el porqué y lleva tu sí.
  - **«Sólo antes del primer verde»**: como el camino (b) original, «antes de construir». Una corrección después del verde sale 2 y obliga a revert + rojo nuevo.
- **L2. ¿La corrección sigue pidiendo `.git/permitir-tests` = 1?**
  - **«Sí, el permiso de siempre (Recomendado)»**: el candado no cambia. Lo único humano entre una sesión y sus propios tests es ese archivo, que creás vos.
  - **«No, basta tu sí en la línea C<n>»**: el candado deja escribir en la carpeta si el commit… no lo puede saber antes de commitear. Habría que mover el control al pre-commit. Más trabajo y más débil.
- **L3. Riesgo de VELOCIDAD-02.**
  - **«Bajo (Recomendado)»**: una sesión, rojo y verde, con las 8 mutaciones obligatorias, y después la verificadora.
  - **«Alto»**: A → B → verificadora.

## Decisiones

- **D-395** la corrección: qué es y qué comprueba `rojo-verde` (§ Qué cambia 1).
- **D-396** el rojo efectivo, A4 desde él y la corrección en HEAD = «rojo pendiente de B».
- **D-397** el árbol rojo de una orden corregida: el código del rojo con la carpeta de la última corrección.
- **D-398** la salida: la línea «correcciones:» antes de «rojos anteriores»; sin correcciones, la de hoy byte a byte.
- **D-399** `verdad-08-a` toma el rojo como el último commit que toca la carpeta.
- **L1, Liam (2026-10-27): «Hasta aprobar (Recomendado)».** Una corrección vale antes o después del verde.
- **L2, Liam: «Sí, el de siempre (Recomendado)».** La corrección pide `.git/permitir-tests` = 1, y el candado no cambia.
- **L3, Liam: «Bajo (Recomendado)».** Una sola sesión escribe el rojo y el verde, con las 8 mutaciones obligatorias, y después va la verificadora.

Hoja cerrada. Falta el «andá» de Liam para escribir el rojo en `tests/orden/velocidad-02/` de T y de H.
