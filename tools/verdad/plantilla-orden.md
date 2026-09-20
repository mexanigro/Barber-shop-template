# <ORDEN-ID> · <título> · <fecha>

Toda orden futura nace de esta plantilla (VERDAD-01, R-V1). Antes de tocar nada: copiar `tools/verdad/entrega.ejemplo.json` a `verdad/entregas/<ORDEN-ID>.json` y escribir UNA afirmación por cosa que la entrega vaya a afirmar. Lo que no está en ese archivo no se escribe como hecho.

## 1 · Afirmaciones (van a `verdad/entregas/<ORDEN-ID>.json`)

| id | texto (tal como se afirmará) | repo | prueba (archivo · nombre del test) | vistas | paletas | evidencia | hueco |
|---|---|---|---|---|---|---|---|
| `<id>` | … | T/H | `tests/<x>.test.ts` · «<nombre exacto>» | 375, 1280, webkit | a, c | … | `<id de contratos.json>` o null |

Reglas del archivo: `tools/verdad/esquema.json`. Cada prueba citada lleva su mutación en `tests/mutaciones/<base>.mjs` (`{ prueba, archivo, descripcion, aplicar(src) }`): el cambio que DEBE ponerla roja. Sin mutación registrada rojo→verde la afirmación queda NO VERIFICADO.

## 2 · Impacto (antes del primer commit)

`node tools/verdad/impacto.mjs --staged` → secciones, páginas, paletas, nichos tocados → pruebas y capturas obligatorias. Lo tocado no se omite; lo no tocado no se prueba por las dudas (R-V2). Si sale «seis», la regresión de los seis va a `<capturas>/<árbol>/regresion-seis/` (`scripts/qa-regresion-seis.mjs --out … --baseline …`).

## 3 · Evidencia

Capturas en `Nichos/bloque-04/verdad/capturas/<árbol>/` con el nombre que exige `veredicto` (`<id>-<paleta>-<vista>.png`). `node tools/verdad/recrear.mjs --paleta a|c` las produce para las páginas (home, /servicios, /galeria; 375 y 1280).

## 4 · Cierre

1. commit (pre-commit: lint + suites + `impacto` + `veredicto --commit`) → push.
2. `node tools/verdad/veredicto.mjs --cierre` → `verdad/VERDAD-<sha>.md` (exit 0 sólo con todas las filas VERIFICADO).
3. commit `docs(verdad): VERDAD-<sha>.md` → push. `veredicto --stop` acepta ese commit porque sólo toca `verdad/`.
4. PLAN.md § Estado con los SHAs de T y H; registro en `bloque-04/<ORDEN-ID>.md`.

## 5 · Entrega

El mensaje de entrega PEGA `verdad/VERDAD-<sha>.md` íntegro; no lo redacta. Lo que quedó NO VERIFICADO o FALSO se entrega así, con esa palabra. «Aprobado» sólo con `node tools/verdad/hueco.mjs --id <hueco>` verde para cada hueco citado (R-V3).
