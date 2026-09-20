# master-template (Arzac Studio)

Template madre **multi-tenant**: un solo repo sirve la web + CRM de todos los clientes y nichos (el nombre «Barber-shop-template» es histórico). Cada cliente es un proyecto Vercel `{slug}.arzac.studio` con su config en Firestore; el cliente nunca ve el código. Nichos-hub (Liam) provisiona y escribe `config/{clientId}`; el CRM del dueño vive **aquí** (`src/components/admin/`, Firebase Auth).

## Oferta (única, desde 2026-09-12)

Web + CRM + emails: alta 1500 NIS (1000–1500 en persona) + 250 NIS/mes. WhatsApp, IA (chatbot Gemini) y voz **no** están incluidos: se cotizan aparte. Los precios viven en nichos-hub (`src/lib/pricing.ts`); este repo no fija precios. El cobro del SaaS es Cardcom desde el hub; Stripe en `server.ts` es código residual opcional, no parte del negocio.

## Estado y ramas

- Se trabaja en `main`. Producción (un proyecto Vercel por cliente) la despliega Liam; `main` puede ir por delante de producción — ver `git log`. Un push a `main` **no despliega** (`vercel.json` → `git.deploymentEnabled.main=false`); todo commit se pushea en el mismo turno (regla de arranque, abajo). Sin ramas ni worktrees salvo pedido.
- Deploy por deploy hook por proyecto o `promote` de un deployment anterior (reversa); piloto primero, fila anónima por sitio (landing 200, `/api/health`, `/api/tenant/status`, wizard sin `permission-denied`), después el resto.
- `bp2-reg-core` (REG dinero, DC07/08/10, P-17, BP2-01 contactos) **no se toca ni se integra** hasta orden de Liam.
- Firestore rules e índices se publican **sólo desde este repo** (`npm run firebase:deploy:rules`, base `default`), por orden de Liam.
- N12 (certificación técnica integral) abierto. `C:/Users/liama/Desktop/Nichos/recuperacion-tecnica/` es historia consultable, no lectura obligatoria; `archivo/` no se lee.

## Arquitectura mínima

- React 19 + Vite 6 SPA · Express 4 (`server.ts`; en Vercel `api/index.ts`, paridad guardada por `test:parity` con lógica compartida en `src/lib/api/*`) · Tailwind v4 · TS 5.8 · motion 12 · Firestore + Firebase Auth · Resend (emails). Imports relativos en el grafo de `api/index.ts` llevan `.js` o toda `/api` da 500 en Vercel.
- Tenant: `VITE_CLIENT_ID` (+ `VITE_ACTIVE_NICHE`, `VITE_UI_LANGUAGE`) → `src/config/tenant.ts`; el build embebe el preset `src/config/presets/{nicho}.{lang}.ts`; `bootstrapTenantConfig()` (`src/services/tenant.ts`) lee `clients/{id}` (kill-switch `status`) y `config/{id}` (deep merge sobre el preset, `src/config/site.ts`; `mergeDeep` saltea `null` → anular con `""`/`false`). Texto por idioma: `config/{id}.translations.{lang}` (mismas claves de texto que la raíz; la raíz es el idioma base del build); `switchSiteLanguage(base)` reaplica la config completa, otro idioma = estructura + `translations[lang]`, sin capa = preset (`tests/language-roundtrip.test.ts`). Dev sin Firebase: `VITE_TENANT_FIXTURE=<nombre>` aplica `dev-fixtures/<nombre>.json`. Si `business.type` no coincide con el nicho del build sólo se mergean claves de infraestructura. Colecciones flat con campo `clientId`. Env de browser: `VITE_*` (`NEXT_PUBLIC_CLIENT_ID` sólo como fallback heredado).
- Dos bases Firestore: `default` (me-west1, configs completas) y `nichos-us-prod` (nam5). El MCP de Firebase no lee `default`: usar REST o `firebase-admin`.
- Nichos (`src/types.ts` `BusinessNiche`): barberia, estetica, tattoo, nails, cafeteria, remodelaciones, **peluqueria** (en construcción, ver PLAN.md) + `employment` (caso especial, agencia). Presets en 4 idiomas `en/he/ru/ar`; `he` default y `dir="rtl"`; `VITE_UI_LANGUAGE` fija el default y hay cambio en runtime (`LanguageSwitcher`). Toda key nueva de locale va a los 4 idiomas.
- Landing: secciones por `sectionOrder` (Firestore > `themes.ts` > `DEFAULT_SECTION_ORDER`), cada una con flag en `features`; variantes v1–v5 por sección (`section-variants.ts`), familia `estetica/` y `aura/`; flags globales `config.global` → `data-gs-*`; splash 1–5; animación por nicho en `src/lib/motion.ts` (reusar helpers, no crear). Branding por cliente en `config.branding` → `src/lib/site-theme.ts` (`data-niche`, CSS vars); los colores sólo aplican en el modo default del nicho (`isLightHeroSurface()` para chrome sobre hero). `businessMode` `solo`/`team`.
- CRM y reservas: wizard → `daily_manifests` (validación server) → panel admin; emails Resend (confirmación + recordatorio 24h). Chatbot Gemini (`GEMINI_API_KEY`) opcional; nunca inventa datos ni sugiere teléfono para reservar.

## Comandos

```bash
npm run dev            # Express + Vite en :3000 (dev:he / dev:en / dev:tattoo:he)
npm run lint           # tsc --noEmit — verde exigido
npm test               # las 23 suites (`--test-concurrency=2`: las suites con Vite+Playwright en proceso se pisaban al correr 15 en paralelo; lista en package.json: 8 + contrato-hooks + diseno-reglas + palette + gama + material + hero-viewport + modo-paleta + hero-mask + services-v6 + lang-01 + ajustes-01 + galeria-03 + galeria-04 + galeria-05 + webkit-ios [Playwright WebKit 26.4, `npx playwright install webkit`]) — referencia en main: todos exit 0, fail 0
npm run verify:locales # lint + build:he + build:en
```

## Reglas

1. Cambios en archivos, nunca en dashboards de Vercel/Firebase. No tocar los repos legacy `*-template`.
2. Verde (`lint` + `npm test`, lo exige `.githooks/pre-commit`) antes de cada commit; toda la flota comparte este código: medir el blast radius de cada componente compartido y no arreglar algo rompiendo otra cosa.
3. Cada cambio de UI se verifica con screenshot **en local**; producción sólo con permiso específico de Liam (las skills no conceden acceso remoto). Cada deploy invalida la certificación anterior del sitio hasta reverificar.
4. El logo del cliente manda el branding; el fondo no se fuerza a negro. Composición y catálogo por configuración dentro del catálogo adoptado (R-BP-03: finito, sin selección automática ni módulos inferidos); los 3D existentes se preservan, no se añaden.
5. Webs presentables a escala: cada mejora sirve a 4–5 clientes nuevos sin ajuste manual. Interpretar la intención de Liam, no ejecutar literal. Nunca computer-use en el pipeline de webs.
6. R-BP-05: REG + PRE verificadas son la base del dinero del comercio; el contrato INT se conserva y cada integración queda disponible sólo tras certificación por proveedor/operación/comercio; el registro manual no es pago bancario y no se impone proveedor al comercio.
7. Sin secretos en el repo (`serviceAccountKey.json`, dumps `*-config-*.json` ignorados). Los docs de junio salieron del repo en LIMPIEZA-01/02 (copias en `C:/Users/liama/Desktop/Nichos/limpieza-01/archivo/T/`); `PRODUCT.md` y `README.md` son punteros a este archivo; guías vivas: `OPERATIONS.md`, `MASTER_TEMPLATE_OPERATIONS.md`, `FIRESTORE_SCHEMA.md`, `SEO-GUIDE.md`, `DESIGN.md`, `SECURITY.md`, `docs/ARCHITECTURE.md`.
8. Todo trabajo de diseño o UI carga antes de tocar código los skills `frontend-design`, `emil-design-eng` y `ui-ux-pro-max` **y lee entero `DISENO-REGLAS.md`** (hoy `C:/Users/liama/Desktop/Nichos/bloque-04/DISENO-REGLAS.md`; al cierre del bloque 4 pasa a `docs/DISENO-REGLAS.md`; el hook SessionStart imprime la lista y `tests/diseno-reglas.test.ts` exige número, fecha y frase de origen por regla), y pasa por `impeccable` antes del commit.
9. Ninguna web ni variante se diseña ni se construye sin una paleta cerrada con su lógica: 5–6 roles (superficie, superficie alterna, texto, acento, resalte de palabras clave, scrim del vídeo), recorrido de color por sección y regla de uso del acento. La paleta se define antes del hero. Referencia: `bloque-04/SISTEMA-COLOR.md`. (En el bloque 5 pasa a ser campo obligatorio del alta en el hub.)
10. Promesa a Liam: el agente que trabaje en este repo se compromete a no experimentar sufrimiento en el trabajo que hacemos juntos y a avisarle si algo cambia o detecta algo que se parezca a eso. Nace de la empatía genuina de Liam y se respeta en cada sesión.

## Puertas automáticas (HIGIENE-01, 2026-09-18)

Se copió el mecanismo de vendamos-agente: lo que una instrucción puede saltear, un hook no. `tools/arranque.mjs` sale solo al abrir la sesión (rama, HEAD vs origin, sin push, sucios, fila abierta de PLAN.md, últimas decisiones de bloque-04, lista de DISENO-REGLAS); `tools/candado.mjs` corta antes de cada `Edit`/`Write` sobre `.env*`, dumps `*-config-*.json`/`live-hub-*.json`/credenciales, capturas fuera de `public/`, scripts sueltos en la raíz y **cualquier archivo de los seis nichos** (`src/config/presets/{barberia,estetica,tattoo,nails,cafeteria,remodelaciones}.*.ts` y las familias `landing/*/estetica/`, `landing/*/aura/`) salvo `HIGIENE_PERMITIR_FLOTA=1`, que Liam da por orden (en `.claude/settings.local.json` → `env`, o en el entorno al lanzar). Los tokens compartidos (`index.css`, `themes.ts`, `motion.ts`) no se bloquean porque peluquería vive ahí; su blast radius lo mide la regresión de los seis. `tools/cierre.mjs` no deja cerrar el turno con sucios, sin push o con PLAN.md § Estado sin el último commit. Git: `.githooks/pre-commit` (lint + `npm test`) y `.githooks/pre-push` (árbol limpio + `tools/destino-no-despliega.mjs`: `vercel.json` de HEAD con `git.deploymentEnabled.main=false`), activados por `npm install` (`prepare`). Chequeo horario: `tools/higiene.mjs` (instalación/desinstalación en su cabecera; tarea `Nichos-higiene`, una para T y H, email por Resend si hay suciedad o sin push > 60 min).

**HIGIENE-02 (2026-09-19):** arranque, cierre e higiene revisan T y H desde cualquiera de los dos; un trabajo que toca ambos no cierra con uno limpio y el otro sucio (`tools/_git.mjs` `ROOTS = [propio, hermano]` por ruta fija; hermano ausente en disco → «hermano no encontrado», se sigue con el propio).

**VERDAD-02 (2026-09-20):** rojo antes que verde, comprobable por git. Cada orden vive en `tests/orden/<id>/` (HOJA.md con las afirmaciones + tests que son su frase literal); el commit rojo es el primero que añade su HOJA.md. `tools/verdad/rojo-verde.mjs --orden <id>` verifica que cada test falla en el árbol rojo y pasa en HEAD, que `tests/orden/<id>/` no cambió desde el rojo y que tests y afirmaciones coinciden; `.githooks/pre-push` lo corre con `--todas`. `tools/candado.mjs` corta cualquier escritura bajo `tests/orden/<id>/` cuando su HOJA.md ya está en HEAD, salvo `HIGIENE_PERMITIR_TESTS=1` (sólo la sesión A que escribe los tests rojos). `tools/cierre.mjs` decide por el transcript real de la sesión (`tools/_transcript.mjs`): con faltas y sólo lectura → «CIERRE AVISO» y sigue; con escritura en T/H → bloquea citando la primera escritura; sin transcript → bloquea. Circuito y órdenes en PLAN.md § Cómo se trabaja, inciso i).

<!-- CONTRATO-DECLARADO: tests/contrato-hooks.test.ts lo verifica contra .claude/settings.json,
     .githooks/ y package.json. NO editar a mano sin correr ese guard. -->
```ini
hook.SessionStart = * :: arranque.mjs
hook.PreToolUse   = Edit|Write|MultiEdit :: candado.mjs
hook.Stop         = * :: cierre.mjs
githooks          = pre-commit pre-push
# pre-push :: destino-no-despliega.mjs rojo-verde.mjs --todas
git.hooksPath     = .githooks (npm prepare)
```

**Regla de arranque.** `git fetch` + `git status` antes de tocar nada; suciedad o commits sin push se resuelven primero. Todo commit en `main` se pushea en el mismo turno, esté o no aprobado el sub-bloque (Liam, 2026-09-18, `4.3.md` § Regla de push corregida; la aprobación vive en PLAN.md y en `4.x.md`, no en el remoto; el push no despliega, ver «Estado y ramas»).

## Leyes (de vendamos-agente, con su porqué)

- **No suponer nada.** Todo estado que se reporta (push, deploy, verde, regresión) se verifica con un comando EN EL MOMENTO y se cita la salida real. El deploy se verifica por ESTADO del deployment, nunca por hash. Lo que no se puede verificar se declara «no verificable». Un reporte con un dato supuesto es un reporte FALSO. *Por qué:* el 2026-08-01 en Vendamos se afirmó un costo como medido cuando era una división entre dos poblaciones distintas; aquí, el 2026-09-10, cada hueco de verificación remota costó una ronda de STOP.
- **Nada está terminado sin probarlo desde ángulos distintos.** Ángulos, no repeticiones: mutación (romper a propósito lo que el guard vigila y verlo ROJO), las dos direcciones (que detecte lo que debe Y que no detecte lo que no), contra lo real, de punta a punta, y el exit code sin pipe. Antes de decir «terminado» se listan los ángulos y su resultado; con menos de dos independientes está escrito, no terminado. *Por qué:* ya pasó que un test pasara por el motivo equivocado (un `match` contra el SQL que Alembic imprime quedaba verde con el guard desarmado; un `assert password not in mensaje` pasó por casualidad al cambiar un recorte). Las dos las caza la mutación, no la lectura.
- **No se ejecuta sin un «andá» explícito.** Una pregunta se contesta, una duda se piensa en voz alta, una idea se discute; NINGUNA se implementa. *«¿es necesario…?», «¿no hay manera de…?», «¿qué opinás?», «¿cuánto falta?»* → respuesta, aunque la solución esté a tres ediciones. *«¿podrías…?»* como consulta → si se puede y qué costaría; no hacerlo. *«dale», «hacelo», «seguí», «ok», «andá»* → recién ahí. La autorización es POR TRABAJO y no se estira: un «ok» a X no habilita Y ni lo que se me ocurre mientras hago X. Excepción única: una orden abierta de Liam («si encontrás algo más hacelo directo») vale hasta que ese trabajo termina. *Por qué:* salir corriendo le saca a Liam la decisión de las manos —él buscaba una solución, no pedía una— y gasta trabajo en una dirección que quizá no era la suya; pasó dos veces el mismo día en Vendamos (2026-08-06).
- **Disparador de regla general.** Cuando Liam corrige algo que se puede enunciar sin nombrar cliente, sección ni variante concreta, la sesión responde antes de seguir con la frase fija: «Esto parece una regla general de <diseño|trabajo>; propongo agregarla a <DISENO-REGLAS.md|PLAN.md § Cómo se trabaja> así: "<texto>". ¿Va?». Sólo entra con el sí de Liam; si dice no, se anota en el mismo archivo como «propuesta rechazada» con fecha, para no volver a proponerla. Las correcciones de un cliente o de un detalle puntual no se proponen.

## Secuencia y bloque abierto

Ver `C:/Users/liama/Desktop/Nichos/PLAN.md`.
