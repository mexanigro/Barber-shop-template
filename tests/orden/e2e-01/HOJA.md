# HOJA · E2E-01 · dos webs reales de peluquería creadas desde el hub, iguales a A y a C en lo hecho; retiro de CONEXION-09 · 2026-09-24

Escrita por la **sesión A** (desde 2026-09-24 la hoja la escribe A, no el revisor: el segundo pensamiento sólo escribe en el chat, inciso p). Línea base: CONEXION-09 aprobada por Liam 2026-09-24, T cc154fb · H b25f1e7. Estado esperado al abrir A: T cc154fb = origin, H b25f1e7 = origin.
Fuentes: `H:`/`T:` = archivos en HEAD; `medido` = lectura de A del 2026-09-24 con su salida citada; `Liam` = decisiones del 2026-09-24; `CH` = bloque-04/CONTRATOS-HUECOS.md.
Formato: cada afirmación es una línea `- [ID] (repo) frase · fuente: …`. El nombre del test es la frase exacta entre `(repo) ` y ` · fuente:`. `(T)` sólo en T; `(H)` sólo en H; `(T+H)` en los dos.
Circuito: PLAN.md § Cómo se trabaja, incisos i) a p). Decisiones vigentes: D-1..D-5, D-9..D-11, D-13, D-14, D-16..D-95. Decisiones para esta hoja:

- **D-96 (Liam, 2026-09-24) el hub se prueba de punta a punta con dos webs reales.** Se crean DOS webs de peluquería **desde la ficha del hub en producción** (alta real → proyecto de Vercel → dominio `<clientId>.arzac.studio`), se cargan **sólo con las casillas de la ficha** y el material local de las plantillas (`dev-fixtures/media/paleta-a|c`), y se comprueba que salen **iguales a A y a C** en lo que ya está hecho para peluquería. Toda diferencia en lo juzgado se explica y se arregla en B antes de que Liam vuelva a editar.
- **D-97 (Liam, 2026-09-24) qué se juzga y qué no.** Se juzga: **navbar v6**, **hero v6 con su vídeo**, **servicios v6** en el home y en `/servicios`, **galería v6** en el home y en `/galeria`, y el **fondo** (foto del local, textura, velo), la **paleta en su modo** y la **tipografía**. No se juzgan: equipo, testimonios, FAQ, Instagram, contacto (con o sin formulario) y footer — pueden salir genéricos, se excluyen de la comparación y no se corrige nada ahí.
- **D-98 (A, medido) el slug lo genera el hub, no se elige.** `H src/app/api/clients/provision/route.ts:54` arma `slug = demo-${slugify(businessName)}-${crypto.randomUUID().slice(0,8)}`: las dos webs **no** pueden llamarse `test-e2e-peluqueria-a|c`. Se identifican por el `businessName` que Liam escribe en la ficha (que deja el slug reconocible) y por el registro que B escribe en el árbol (D-99), no por un slug fijo.
- **D-99 (A) el rojo de una afirmación de punta a punta se lee del árbol (inciso l).** Una web creada en producción no es estado del árbol: sin una condición que se lea del repo, `rojo-verde` diría «nunca estuvo en rojo». B escribe **`H tests/e2e-01-webs.json`** con las dos webs (`clientId`, `hubDocId`, `vercelProjectId`, `domain`, `deploymentId`, `commitSha`, `paleta`) y, si hace falta, `huecosDeFicha`. Ese archivo es la condición del árbol; los tests de la orden lo leen y **además** comprueban contra lo real (Vercel y Firestore en lectura). Al promoverse, las copias que salen a la red se recortan, como hicieron D-89 y D-95.
- **D-100 (A, medido) cómo se renderiza la referencia para que la comparación sea justa.** `T src/services/tenant.ts:173–174, 214` — el camino del fixture (`VITE_TENANT_FIXTURE`) **sólo existe en `import.meta.env.DEV`**: «un build de producción sin Firebase sigue siendo `unavailable`». Y `recrear.mjs:90` levanta `server.ts` con `tsx`, que es **dev**. Comparar una web desplegada (build de producción servido por Vercel) contra un render de dev no sería justo. La referencia de esta orden es: **`vite build` de T en el MISMO commit que Vercel desplegó** (`deployment.meta.githubCommitSha`), servido en local, con **`VITE_CLIENT_ID=test-b4-peluqueria-<paleta>`** y las `VITE_FIREBASE_*` — el mismo código y el mismo camino de datos que la web desplegada, y la única diferencia es qué `config/{id}` se lee: el tenant de la plantilla contra el cliente creado desde la ficha. Eso es exactamente lo que la orden quiere juzgar.
- **D-101 (A, medido) captura por elemento, no página entera.** `H src/lib/niche-defaults.ts:41–48` pone en el alta `showWhyChooseUs: false` y `showInquiry: false`, y los fixtures no declaran `features` (toman el `true` del template, `T src/config/site.ts:64–83`). Medido: las **únicas** tres diferencias de `features` entre el alta del hub y el render del fixture son `showWhyChooseUs` (false/true), `showInquiry` (false/true) y `showWhatsAppInChat` (true/false) — ninguna toca una zona juzgada, pero las dos primeras cambian el flujo de la página. Por eso cada zona se captura **por su elemento** (`element.screenshot()`), no la página entera: así una sección no juzgada no desplaza nada. `showChat`, `whatsappFab`, `scrollToTop` y `themeToggle` **coinciden**, porque el bloque de peluquería del template los pone con `??=` (`T src/config/site.ts:179–185`).
- **D-102 (A, medido) los 36 px de todas las páginas tienen causa.** El último `recrear` (`bloque-04/verdad/capturas/dabc36c…/recrear-{a,c}.json`, 2026-09-24 08:21) da «diff ≠ 0» por tamaño en las 6 páginas de A y de C: el tenant es **36 px más corto** en las seis, y **598 px** más corto en el home 375. Hipótesis con evidencia: los 36 px son la fila de nav del pie que `T src/components/layout/Footer.tsx:79` monta con `enabled: siteConfig.features.showWhyChooseUs` (el pie está en todas las páginas, y una captura de CONEXION-08 mostró ese enlace presente en el fixture y ausente en el tenant); los 598 − 36 = 562 px del home 375 son el formulario de `showInquiry`. **El pie y el contacto no se juzgan (D-97)**, así que esta orden no los arregla: B mide y cierra la explicación en su informe. Medido también: el home 375 de **A** sale **1300 px de ancho** en las dos capturas (el de C sale 375) — desborde horizontal en móvil, que **sí** puede tocar zonas juzgadas y B declara o arregla.
- **D-103 (A, medido por mutación) al guard de la transición le falta el primer caso de `adjacent-hue`.** `T tests/transicion.test.ts` cubre ΔH 10, 10 con ΔL 0,11, 35 y 36, pero no **ΔH 11°**. Con `MISMO_TONO = 20` en `T tools/material/relacion.mjs` el guard pasa **4/4** (medido; árbol restaurado): el umbral puede subir de 10 a 20 sin que nada caiga. El guard gana el caso ΔH 11° → `adjacent-hue`.
- **D-104** CONEXION-09 se promueve como las anteriores (T y H, con las copias que salen a la red recortadas y declaradas).

Por qué: todo lo hecho hasta CONEXION-09 se probó por partes — contrato, validador, casilla, material y guard, fila por fila, con `hueco.mjs` en **29/36** (medido hoy) y `recrear` comparando fixture contra tenant. Nunca se probó el camino entero: que Liam abra la ficha del hub, cargue una web de peluquería con las casillas y el material, y le salga la plantilla. Esta orden lo prueba con dos webs reales, una por paleta.

## A · Las dos webs existen y salieron del alta del hub (H)

- [A1] (H) tests/e2e-01-webs.json declara las dos webs (paletas a y c) con `clientId` que empieza por `demo-`, `hubDocId`, `vercelProjectId`, `domain` = `<clientId>.arzac.studio`, `deploymentId`, `commitSha` y `paleta`; y para cada una el documento `hub_clients/{hubDocId}` existe en Firestore con esos mismos `clientId`, `domain`, `vercelProjectId` y `deployUrl`, con `status` `demo` o `active`, y con `notes` que NO nombra «tenant de recreación» ni «tenant de prueba»: salieron del alta del hub y no de `scripts/b4-tenant.ts` · fuente: H:src/lib/provisioning.ts:42–62 (los campos que deja el alta: `deployUrl`, `domain`, `status: "demo"`, `notes: ""`); H:scripts/b4-tenant.ts:73, :106 (las dos notas que deja el script, y que no toca Vercel); D-98, D-99.
- [A2] (H) para cada web, la API de Vercel en lectura (`/v13/deployments/{deploymentId}`) da `readyState` `READY`, `meta.githubRepo` `Barber-shop-template` y `meta.githubCommitSha` igual al `commitSha` declarado, que es un commit de `main` de T; y un GET a `https://{domain}/` responde 200 con el HTML del template · fuente: H:src/lib/deploy-flow.ts:83 (`gitSource: { type: "github", org, repo, ref: "main" }`); H:src/lib/deploy.ts:8 (`mexanigro/Barber-shop-template`); medido (T `git remote get-url origin` = ese repo); D-96.

## B · El config de cada web dice lo mismo que su fixture (H)

- [B1] (H) el documento `config/{clientId}` de cada web tiene, en las claves juzgadas (D-97), el mismo valor efectivo que el fixture de su paleta; el material se compara por **nombre de archivo y token** (el token de la url de Storage es el sha256 del contenido, D-20), nunca por url, porque el `clientId` cambia · fuente: T:dev-fixtures/peluqueria-paleta-{a,c}.json; H:src/lib/media-upload.ts (la url lleva `clients/<id>/media/<rol>/<nombre>?alt=media&token=<sha256[0..32)>`); D-97.
- [B2] (H) el conjunto de claves juzgadas cuyo valor efectivo NO coincide y que ninguna casilla de la ficha puede poner está **vacío**, o cada una está declarada en `tests/e2e-01-webs.json` bajo `huecosDeFicha` con su clave y su motivo; y ninguna de las declaradas tiene `ui` distinto de `null` en `verdad/contratos.json` (si la tiene, la casilla existe y el hueco no es de la ficha) · fuente: medido (las seis filas con `ui: null` son los cinco derivados y `branding.heroToBackdrop`, D-90; todas las demás claves juzgadas tienen casilla); D-97.

## C · La página desplegada es la plantilla (T)

- [C1] (T) tools/verdad/e2e.mjs existe, corre con `--web a|c [--puerto <n>] [--zonas …] [--vistas …]` y escribe un informe JSON con una entrada por zona y vista, cada una con `zona`, `vista`, `pixels` y `size`; levanta la referencia con un **build de producción** de T en el commit que declara `tests/e2e-01-webs.json` y `VITE_CLIENT_ID=test-b4-peluqueria-<paleta>`, nunca con `server.ts` en dev; y nunca escribe en Firestore, en Storage ni en Vercel · fuente: T:tools/verdad/recrear.mjs (patrón de la herramienta y de su informe); D-100.
- [C2] (T) el informe de `e2e.mjs` para las dos webs da **0 píxeles de diferencia y ningún cambio de tamaño** en las seis zonas juzgadas —`nav[data-nav-v6]`, `#hero`, `#services` y `#gallery` en `/`, y `#main-content` en `/servicios` y en `/galeria`— a 375 y a 1280, con el vídeo del hero congelado en el mismo cuadro y las fuentes cargadas; y los tokens computados de `:root` (`--surface`, `--text`, `--accent`, `--accent-strong`, `--font-sans`, `--font-serif`) son iguales en la web desplegada y en la referencia, en las dos vistas · fuente: T:src/components/layout/navbar/navbar-v6.tsx:154, landing/hero/hero-v6.tsx:200, landing/services/services-v6.tsx:133, landing/gallery/gallery-v6.tsx:70, App.tsx (`main#main-content`); D-97, D-101.

## D · El caso que le falta al guard de la transición (T)

- [D1] (T) tests/transicion.test.ts afirma que ΔH 11° da `adjacent-hue` (el primer grado fuera de `same-hue`), y con `MISMO_TONO = 20` en tools/material/relacion.mjs el guard FALLA · fuente: medido por mutación 2026-09-24 (con `MISMO_TONO = 20` el guard pasa 4/4 y el árbol se restauró); D-103.

## E · Retiro de CONEXION-09 (D-104)

- [E1] (T+H) conexion-09 figura en tests/orden/APROBADAS.md con fecha 2026-09-24, T cc154fb y H b25f1e7, y rojo-verde --todas en HEAD imprime «conexion-09 · retirada (aprobada 2026-09-24)» y no «orden conexion-09 ·» · fuente: aprobación de Liam 2026-09-24.
- [E2] (T+H) npm test corre las copias de conexion-09 que su hoja promueve, que importan ./orden/conexion-09/_comun.ts, sin volver a correr copias anteriores (la copia `d` excluye las órdenes vivas con `excluidas()`, sin nombrarlas); en T van a `test:unit` salvo que abran Chromium; y tests/orden/conexion-09/ no cambia desde su último rojo (ce8f56f en T, cb43704 en H) · fuente: CONEXION-09 (aprobada); D-104.

## F · Registro

- [F1] (T+H) CLAUDE.md § Puertas de T y de H tiene un párrafo E2E-01 que nombra «punta a punta», «desde la ficha», «por elemento» y «D-97»; el bloque CONTRATO-DECLARADO es idéntico al del commit aprobado de CONEXION-09 (T cc154fb / H b25f1e7) · fuente: E1 anteriores.
- Sin test (Nichos): PLAN.md § Estado fila 4 «E2E-01-A (2026-09-24): hoja + 10 afirmaciones (T 6 tests: C1, C2, D1, E1, E2, F1; H 7: A1, A2, B1, B2, E1, E2, F1), tests rojos (T <sha>, H <sha>); B pendiente del «andá»»; PLAN.md § Cómo se trabaja gana los incisos **o)** y **p)** (Liam, 2026-09-24); `4.3.md` § E2E-01 · A.

## Interfaz de prueba (contrato entre los tests de A y el código de B)

Como en CONEXION-09: `node --experimental-strip-types --test`; utilidad `_comun.ts` (copia, no import, del cargador de `tests/orden/conexion-09/_comun.ts`); imports de `tools/` y de `src/` sólo con `import()` dinámico dentro del test; ninguna afirmación cuenta órdenes (inciso m); cada afirmación en el repo cuyo árbol la pone en rojo (inciso n): A1, A2, B1, B2 en H; C1, C2, D1 en T. Guards anidados con el runner de su fase (`tsx --test`, `NODE_TEST_CONTEXT` borrado). Ningún test escribe fuera de `tests/orden/e2e-01/`; **ninguno escribe en Firestore, en Storage ni en Vercel**: sólo GET, la API de Vercel en lectura y `b4-tenant.ts show`/lectura Admin. Toda carpeta temporal lleva el prefijo «e2e-01-» y se borra en `finally`. `_comun.ts`, `d` y `e` idénticos T/H por `cmp`; `a`, `b` sólo en H; `c`, `g` sólo en T.

**El registro que B escribe (D-99), `H tests/e2e-01-webs.json`:**

```json
{
  "webs": [
    { "paleta": "a", "clientId": "demo-…-xxxxxxxx", "hubDocId": "…", "vercelProjectId": "prj_…",
      "domain": "demo-…-xxxxxxxx.arzac.studio", "deploymentId": "dpl_…", "commitSha": "<40 hex de main de T>" },
    { "paleta": "c", "…": "…" }
  ],
  "huecosDeFicha": [ { "clave": "…", "motivo": "…" } ]
}
```

`huecosDeFicha` puede ser una lista vacía. `commitSha` es el que Vercel desplegó y el que `e2e.mjs` usa para construir la referencia (D-100).

**El informe de `tools/verdad/e2e.mjs`** (lo lee C1 y C2): la última línea de `--json` es un objeto `{ web, paleta, commitSha, zonas: [{ zona, vista, pixels, size, total }], tokens: [{ vista, iguales, distintos }] }`. `pixels` es el número de píxeles distintos (`0` = idénticas), `size` es `true` si las dos capturas no miden lo mismo.

## Notas para las sesiones A y B

A: al commit rojo, los tests (10 afirmaciones; T 6, H 7) fallan por su primera aserción: A1 y A2 por «no existe tests/e2e-01-webs.json»; B1 y B2 por lo mismo; C1 por «no existe tools/verdad/e2e.mjs»; C2 por lo mismo; D1 por el caso ΔH 11° que `tests/transicion.test.ts` no nombra; E1, E2 y F1 como siempre. Nombre del test = frase de la hoja.

B: lo que necesita de Liam, en este orden — (1) el **login con Google** en el hub (no hay bypass: `H src/proxy.ts`, `src/auth.config.ts`, `src/lib/auth.ts`), en un navegador con su sesión; (2) la **autorización en el momento** para crear los DOS proyectos de Vercel y sus dos altas (es una acción real en producción); (3) el `businessName` de cada web, que deja el slug reconocible. Después: cargar las dos fichas **sólo con las casillas** y el material local de `dev-fixtures/media/paleta-a|c`, escribir `tests/e2e-01-webs.json`, escribir `tools/verdad/e2e.mjs`, correrlo para las dos webs y cerrar a 0 toda diferencia en lo juzgado (D-97). Lo no juzgado no se toca. Los 36 px y los 598 px de `recrear` (D-102) se explican en el informe, no se arreglan aquí; el desborde de 1300 px del home 375 de A sí, si toca una zona juzgada. `hueco.mjs` sigue en 29/36: esta orden no mueve el contrato. La línea de APROBADAS.md de conexion-09 la escribe B (E1).

## Fuera de esta hoja

DISEÑO-01 (`features.themeToggle`, D-82). FLOTA-01 (D-88). El pie, el contacto, el equipo, los testimonios, la FAQ y el Instagram de las dos webs (D-97: pueden salir genéricos). AUDITORIA-01 (flake de navegador). El cobro, el CRM y los emails de las dos webs: esta orden mira la página pública.
