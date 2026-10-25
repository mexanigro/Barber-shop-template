# HOJA · CRM-05 · la puerta (kill-switch, la empleada, lo público), el cobro que no se duplica y se puede corregir, cancelar y mover por el servidor, los índices y el hub · 2026-10-25

Escrita por la **sesión A de CRM-05** (2026-10-25) desde la hoja de diseño `bloque-04/CRM-05-HOJA.md`, cerrada por Liam el 2026-10-25 (incisos i, p y q). Lo copiado de esa hoja va tal cual: § Afirmaciones · CRM-05 (S1–S11, P1–P7, X1, H1–H2, W1–W2, E1), D-360 a D-369, § Lo que hoy no se puede hacer y § Notas. Lo propio de A: D-380 y § Interfaz (la elección de A, la satisfacibilidad y las mutaciones). Igual byte a byte en T y en H (`cmp`), como `_comun.ts` y `e.test.ts`.

Línea base: **T `main` 8b2859c** (= 6a8dbb2, el verde de CRM-04, + `.gitignore`) y **H `main` 89cfb98** (= 6e453e2 + `.gitignore`), los dos iguales a `origin/main` y limpios (`git fetch` + `git status`, 2026-10-25). Las referencias archivo:línea de T de las afirmaciones son las de 6a8dbb2; las de H, las de 89cfb98.

Fuentes (de la hoja de diseño):
- `AUD`: `auditoria-crm-2026-10-21/INFORME.md`. AUD n es su hallazgo n.
- `VER`: la verificación de la sesión de diseño contra a603dac (`git show a603dac:<ruta>`) y su revisión contra 6a8dbb2 (§ Revisión contra 6a8dbb2 de la hoja de diseño).
- `PROD`: lecturas de producción de la sesión de diseño, sólo lectura: índices de Firestore, el proyecto de Vercel de la demo, los logs.
- `CONTRATO`: el contrato v9.0, `H src/lib/contracts.ts`.
- L1…L17: las preguntas de la hoja de diseño (§ Preguntas para Liam), contestadas por Liam el 2026-10-25.

Formato: cada afirmación es una línea `- [ID] (repo) frase · fuente: …`. El nombre del test es la frase exacta entre `(repo) ` (o `(repo, webs) `) y ` · fuente:`. `(T)` sólo en T, `(H)` sólo en H, `(T+H)` en los dos. **W1 y W2 llevan `, webs`** (inciso s, D-151): `rojo-verde --todas` no las corre en HEAD, y `rojo-verde --orden crm-05` entero es obligatorio al cierre de B y en la verificadora.

Circuito: PLAN.md § Cómo se trabaja, incisos i) a ae), o-bis y o-ter. Las decisiones de la hoja de diseño son D-360 a D-379 (D-370 a D-379 son de CRM-06 y CRM-07, propuestas: no van en esta orden). La sesión A suma **D-380** (libre: `grep -rhoE "D-3[5-9][0-9]" bloque-04 PLAN.md`, 2026-10-25, llega hasta D-379).

## Decisiones (Liam, 2026-10-25; copiadas de la hoja de diseño, § Decisiones, D-360 a D-369)

Cada D lleva entre comillas la opción que eligió Liam, tal como la marcó. Las que no tienen pregunta propia son de la sesión de diseño **dentro de D-360**.

- **D-360 (L1, L2, L16) tres órdenes, CRM-05 aparte de CRM-04, y CRM-05 sin esperar a Railway.**
  - L1, Liam: **«No, CRM-05 aparte (Recomendado)»**. CRM-04 no cambia. A cambio, ninguna web de clienta se redespliega con CRM-04 sin CRM-05.
  - L2, Liam: **«Tres, en ese orden (Recomendado)»**. Esta hoja es la de las tres; A de cada orden copia su parte.
  - L16, Liam: **«CRM-05 sin esperar (Recomendado)»**. El orden de la hoja (aprobar CRM-04 primero) quedó trabado: W1 de CRM-04 necesita H en Railway con `CRON_SECRET` (D-351), y Railway no deja entrar (§ Lo que hoy no se puede hacer). Las reglas y los índices se despliegan desde T con Firebase y no dependen de Railway. El orden vigente:
    1. A y B de CRM-05, ya.
    2. Liam despliega reglas e índices desde T, en `default` y en `nichos-us-prod`: protegen las cinco webs en ese momento.
    3. Cuando Railway vuelva: H en producción, W1 de CRM-04, aprobar CRM-04 y CRM-05.
    4. Redesplegar una por una, con el sí de Liam, las cuatro webs de Ashkelon con CRM-04 y CRM-05.
    5. CRM-06 y CRM-07.
  - El índice de turnos por rango de fechas (`appointments (clientId, date)`) se despliega con CRM-05, antes de que una web corra la consulta de CRM-06 (X1).
- **D-361 (L3) lo que es «suspendida»: la web y el CRM apagados**, como dice el contrato v9.0, 2.4. Liam: **«Web y CRM apagados (Recomendado)»**.
  - `clients/{id}` con `allow write: if false` (S1). T no lo escribe nunca; lo escribe H con el Admin SDK.
  - `isTenantAdmin` y `isOwnerOrManager` exigen `isClientStatusAllowed(clientId)` (S2).
  - En H, `PUT /api/clients` con estado `suspended` o `archived` pausa el proyecto de Vercel, como `kill/route.ts:63-75`. Volver a `active` lo despausa (H1). H1 queda en CRM-05 aunque su efecto en producción espere a Railway.
- **D-362 (L4, L17 y las dos preguntas de compatibilidad) lo que nadie escribe por el SDK.**
  - L4, Liam: **«Cobra, no corrige (Recomendado)»**. La empleada cobra; no corrige ni deshace un cobro, no ve Pagos ni facturas y no borra ni achica manifiestos.
  - L17, Liam: **«No, se sacan (Recomendado)»**. `amountPaidCents` y `lifetimeValueCents` salen de D-343 y de `isStaffCustomerUpdate` (S6). Corrige D-343, aprobada en CRM-04.
  - En `appointments`, el update por el SDK no cambia `amountPaidCents`, `paymentStatus`, `paymentMethod`, `paidAt`, `cobros`, `precioCents` ni `priceCents`, para ningún rol (S3).
  - **`customerEmail`, sólo el saneo.** Liam: **«S3 deja sólo el saneo (Recomendado)»**. Por el SDK, `customerEmail` cambia sólo cuando el guardado no pasa `isValidEmail` y el nuevo es `import_<id>@noemail.local` de ese mismo turno; un email válido no lo cambia nadie. Por qué: el CRM de las cuatro webs de Ashkelon (`b3a97e9`, `ae3c7ec`, `a99b725`, `43177c8`) cancela y mueve por el SDK con `healImportedFields` (`db.ts:120-129` y `:449` en esas versiones), y sin el saneo la regla ya niega ese update. Así las webs viejas siguen cancelando; el CRM nuevo cancela por el servidor (D-365).
  - **La demo no cobra hasta su Redeploy.** Liam: **«Aceptado, la demo espera (Recomendado)»**. La demo corre CRM-03 (T 47b53a6), que cobra con un update por el SDK (`crm-appointments.ts:137-142` en 47b53a6). Con S3 desplegada, «סמן כשולם» de la demo falla hasta su Redeploy con CRM-04 y CRM-05. S10 no mira 47b53a6. Las cuatro de Ashkelon no cobran por update: su pago manual y el alta con monto son un `create` (`PaymentsTab.tsx:77-91`, `CustomersTab.tsx:160-172` en esas versiones), y sus únicos updates de turnos son `status`, `date` y `time` (`crm-appointments.ts:136-141`, `AdminDashboard.tsx:590`, `:625`).
  - **Los `create` con monto siguen abiertos en CRM-05.** Cerrarlos rompería el pago manual de Ashkelon. Pasan al servidor con los manifiestos (D-370, CRM-06), y la regla de create se cierra cuando ninguna web corra un CRM anterior a CRM-06. Techo declarado: hasta entonces, staff puede crear por el SDK un turno con monto.
  - `daily_manifests`: el `delete` es de owner y manager. Un update de staff sólo puede **agregar** intervalos (S4).
  - `payments`, `invoices`, `notification_logs`, `staff_overrides` y `provider_messages`: `isOwnerOrManager` (S5). T no lee ni escribe `payments` ni `invoices` (VER).
- **D-363 (L5) el registro de cobros.** Liam: **«Lista de cobros (Recomendado)»**.
  - Vive en `appointments/{id}.cobros`, una lista de `{ id, montoCents, metodo, at, por, revierte?, motivo? }`. Es una lista y no una subcolección: un turno tiene pocos cobros y la transacción del PATCH ya lee el documento.
  - `amountPaidCents`, `paymentStatus`, `paymentMethod` (el del último) y `paidAt` (el del último) se recalculan desde la lista. Las pantallas que ya los leen no cambian.
  - El navegador genera el `id` (`crypto.randomUUID()`) al abrir el diálogo y lo conserva en los reintentos. Un `id` que ya está en la lista devuelve el turno sin cambiar nada.
  - Corregir es otro cobro con `montoCents` negativo, `revierte` y `motivo`; lo hacen owner y manager (S7). Nada se borra.
  - Un turno viejo sin `cobros` se lee como un cobro heredado `{ montoCents: amountPaidCents, metodo: paymentMethod, at: paidAt }`.
- **D-364 (L5, AUD 3; sesión de diseño, dentro de D-360) los montos fuera del diálogo.** El alta de clienta y el pago sin turno usan `leerMonto` (D-344) y su mensaje de error en el campo. Un monto que no se puede leer no guarda en silencio.
- **D-365 (VER; sesión de diseño, dentro de D-360) cancelar y mover van siempre por el PATCH del servidor.**
  - El CRM nuevo no cambia el estado ni la fecha de un turno por el SDK, y `healImportedFields` (`db.ts:121-135`) deja de reescribir el email.
  - Por qué, en 6a8dbb2: cancelar escribe por el SDK con el saneo (`AdminDashboard.tsx:593`, `crm-appointments.ts:157-158`, `db.ts:443`) y después el servidor lee el email guardado (`notify-booking-handler.ts:213-215`), que da `null` con `@noemail.local`. Una clienta con «o'neil@…» no recibe la cancelación. Antes de CRM-04 sí la recibía, porque el email llegaba en el cuerpo.
- **D-366 (AUD 8; sesión de diseño, dentro de D-360) lo público.**
  - `config` y `daily_manifests` quedan con `allow get: if true; allow list: if false`. La web lee los dos sólo por id (`tenant.ts:226-229` y `BookingWizard.tsx:113` → `db.ts:219`; también en las cuatro versiones de Ashkelon, PROD).
  - `contact_inbox` queda con `allow create: if false`. Todos los formularios van a `/api/contact` (VER), que escribe con la cuenta de servicio.
  - `adminEmail` sigue en `config`: ya es público en el bundle (`VITE_ADMIN_EMAIL`, `admin-auth.ts:13`). Lo que se cierra es el directorio entero.
- **D-367 (VER; sesión de diseño, dentro de D-360) en H, el email de la dueña sale sólo de `hub_clients`.**
  - Hoy `resolveOwnerNotificationEmail` prefiere el `config.adminEmail` que escribe el negocio (`H provisioning.ts:92-95` en 89cfb98: `[configData.adminEmail, hubData?.adminEmail].find(…)`; CRM-04 H2 sólo le quitó los dominios reservados).
  - `deploy.ts` y `reprovision/route.ts:36-37` lo usan como `BUSINESS_OWNER_EMAIL`, que en T recibe los avisos de reservas y de contacto (`api/index.ts:729`, `:1192-1198` en 6a8dbb2).
  - Quien escriba `config` desviaría esos avisos en el próximo redespliegue: desde CRM-04, la gerente.
- **D-368 (L6) la revocación en las reglas.** Liam: **«Sí, en CRM-05 (Recomendado)»**. `isTenantAdmin` exige además `get(/admin_users/$(request.auth.token.email.lower())).data` con `clientId == clientId` y `status in ["pending","active"]` (S11). Toda dueña necesita su documento en `admin_users`: B lo lee en las cinco webs antes del despliegue, y si falta alguno se crea con el sí de Liam.
- **D-369 (AUD 10; sesión de diseño, dentro de D-360) los índices en los dos JSON.**
  - `stock_items (clientId ASC, name ASC)`.
  - `stock_movements (clientId ASC, itemId ASC, createdAt DESC)`.
  - `appointments (clientId ASC, date ASC)`, para CRM-06 (D-371, D-360).
  - Los despliega Liam en `default` y en `nichos-us-prod` (regla 1).

## La decisión de Liam durante el rojo (sesión A, 2026-10-25)

- **D-380 (Liam, 2026-10-25, sesión A) CRM-04 se aprueba antes del verde de CRM-05.**
  - El choque, medido en un clon de T con las reglas mínimas de esta orden (§ Interfaz): **S6** pide que la empleada no escriba `amountPaidCents` ni `lifetimeValueCents` de una clienta, y **Q1 de CRM-04** (congelado) pide que sí (D-343, que L17 corrige). Además **S11** (`admin_users` en `isTenantAdmin`, D-368) hace caer **Q1 y G5 de CRM-04**, que no siembran `admin_users`. Con las reglas mínimas, `tests/orden/crm-04/q.test.ts` Q1 y `g.test.ts` G5 caen («reglas · create con trato "f" se acepta»…). Como `crm-04` no está en `APROBADAS.md`, el pre-push (`rojo-verde --todas`) la corre: el verde de CRM-05 no se puede pushear mientras CRM-04 siga viva. El rojo de CRM-05 no cambia nada de CRM-04 y se pushea igual.
  - Liam (AskUserQuestion de la sesión A): **«Aprobar CRM-04 antes del verde (Recomendado)»**. El rojo de CRM-05 no toca CRM-04. Antes de que la sesión B de CRM-05 pushee, una verificadora corre CRM-04 sin W1 ni W2 (que esperan a Railway, D-360) y Liam la aprueba; la sesión B de CRM-05 escribe la línea de `crm-04` en `tests/orden/APROBADAS.md` de T y de H, sin copias promovidas (como CRM-03, D-333). Cuando vuelva Railway, W1 (T) y W2 (H) de CRM-04 se miden archivo por archivo (`node --experimental-strip-types --test tests/orden/crm-04/w.test.ts`), porque `rojo-verde --orden crm-04` entero caería en Q1 y G5.
  - Lo que cuesta: una sesión verificadora más, y CRM-04 se aprueba antes de lo que dice D-360 (que la aprobaba después de Railway).
  - El cobro (P) no choca: el PATCH nuevo acepta el cuerpo de CRM-04 (`{ montoCents, paymentMethod, precioCents? }`, sin `id`) y le pone un id el servidor; `tests/orden/crm-04/p.test.ts` P1–P3 pasan con el arreglo mínimo (§ Interfaz). H2 de CRM-04 tampoco choca si `resolveOwnerNotificationEmail` toma el del config cuando el hub no tiene ninguno (lo medido: `tests/orden/crm-04/h.test.ts` 2/2 con el arreglo mínimo); que con el hub vacío no devuelva el del config (D-367, «sólo de hub_clients») no lo afirma H2.

## Afirmaciones (copiadas de la hoja de diseño, § Afirmaciones · CRM-05)

### CRM-05 · S · La puerta (T)

- [S1] (T) las reglas de `clients/{id}` no dejan escribir a ningún rol del negocio: owner y manager no pueden cambiar `status` de "suspended" a "active" · fuente: D-361, L3, AUD 1, VER (6a8dbb2 `firestore.rules:112-115`: `allow write: if isOwnerOrManager(clientId)`), CONTRATO 2.4
- [S2] (T) con `clients/{id}.status` en "suspended" o "archived", owner, manager y staff no leen ni escriben `appointments`, `customers`, `config` ni `daily_manifests` por el SDK, y con "active", "trial" o "maintenance" sí · fuente: D-361, L3, AUD 1, VER (6a8dbb2: ninguna regla de lectura llama `isClientStatusAllowed`)
- [S3] (T) las reglas de `appointments` no dejan cambiar por el SDK `amountPaidCents`, `paymentStatus`, `paymentMethod`, `paidAt`, `cobros`, `precioCents` ni `priceCents` a ningún rol; `customerEmail` sólo cambia cuando el guardado no es un email válido y el nuevo es `import_<id>@noemail.local` de ese turno; y sí dejan cambiar `status`, `date` y `time` dentro de lo que hoy valida `isValidAppointment` · fuente: D-362, L4, AUD 2, VER (6a8dbb2 `firestore.rules:130-133`, sin `affectedKeys`; el saneo, `db.ts:121-135`)
- [S4] (T) las reglas de `daily_manifests` dejan borrar sólo a owner y manager, y a staff le dejan actualizar un manifiesto sólo si conserva cada intervalo que tenía · fuente: D-362, AUD 2, VER (6a8dbb2 `firestore.rules:321-330`; un manifiesto vacío produce turnos dobles, `booking-validation.ts:184-189`)
- [S5] (T) staff no lee `payments`, `invoices`, `notification_logs`, `staff_overrides` ni `provider_messages`, y owner y manager sí · fuente: D-362, AUD 2, VER (6a8dbb2 `firestore.rules:162-164`, `:178-180`, `:248`, `:217`, `:267`)
- [S6] (T) staff no escribe `amountPaidCents` ni `lifetimeValueCents` de `customers`, y sigue pudiendo los demás campos de D-343 · fuente: D-362, L17, VER (6a8dbb2 `isStaffCustomerUpdate`, `firestore.rules:82-87`, uso `:150`)
- [S7] (T) el PATCH de cobro rechaza con 403 a staff cuando el cobro revierte otro (montoCents negativo), y lo acepta de owner y manager · fuente: D-363, L4, L5 (6a8dbb2: el PATCH no mira el rol, `admin-users.ts:78-86` no lo nombra)
- [S8] (T) un usuario sin sesión no puede listar `config` ni `daily_manifests`, y sí puede leer `config/<id>` y `daily_manifests/<id>` por id · fuente: D-366, AUD 8, VER (6a8dbb2 `firestore.rules:105`, `:314`), PROD (Ashkelon lee por id)
- [S9] (T) nadie crea `contact_inbox` por el SDK, ni con sesión ni sin ella · fuente: D-366, AUD 8, VER (6a8dbb2 `firestore.rules:227-232`; todos los formularios van a /api/contact)
- [S10] (T) con `clients/{id}` en un estado permitido y la dueña con su `admin_users`, en ninguna versión del CRM de las cuatro webs de Ashkelon (`b3a97e9`, `ae3c7ec`, `a99b725`, `43177c8`) una lectura o escritura por el SDK que la web pública o el CRM de la dueña hacen queda negada por las reglas nuevas, cancelar y mover un turno con un email que hay que sanear incluidos · fuente: D-362, § Notas, PROD (`tenant.ts:219`, `:223`; `db.ts:77`, `:291`, `:407`, `:449`, `:481`; `PaymentsTab.tsx:77-91`; `CustomersTab.tsx:160-172` en esas versiones)
- [S11] (T) staff sin documento `admin_users/<email>` de ese cliente, o con su estado distinto de "pending" y "active", no lee `appointments` aunque sus claims digan staff · fuente: D-368, L6, AUD 22, VER (6a8dbb2 `firestore.rules:23-38`: sólo los claims; `tenant-role-sync.ts:24-26`)

### CRM-05 · P · El cobro (T)

- [P1] (T) el mismo cobro `{ id: "k1", montoCents: 5000 }` mandado dos veces, en serie y a la vez, deja 5000 cobrado y un solo cobro en el turno; "k1" y "k2" de 5000 dejan 10000 · fuente: D-363, L5, AUD 3, VER (6a8dbb2 `crm-appointments-handler.ts:52`, `:69-70`, `cobros.ts:34`: suma sin id; en a603dac el reintento no sumaba)
- [P2] (T) un turno con una seña de 5000 en efectivo y un resto de 10000 con tarjeta guarda los dos cobros con su método y su fecha, y la agenda muestra los dos en el turno · fuente: D-363, L5, AUD 3
- [P3] (T) la dueña revierte un cobro con un motivo: el turno queda con lo cobrado menos ese monto, la lista conserva los dos cobros, repetir la reversión no cambia nada y revertir más de lo cobrado responde 409 · fuente: D-363, L5, AUD 3 (6a8dbb2 `AgendaDia.tsx:235`: pagado = sin acciones)
- [P4] (T) un turno sin `cobros` y con `amountPaidCents` 8000 se lee como un cobro heredado de 8000 con su `paymentMethod` y `paidAt`, y un cobro nuevo de 2000 lo deja en 10000 · fuente: D-363
- [P5] (T) el alta de clienta y el pago sin turno con «1,500» guardan 150000 agorot, y con «1.500» o «abc» no guardan y muestran el error en el campo con `aria-invalid` · fuente: D-364, AUD 3, VER (6a8dbb2 `CustomersTab.tsx:141`, `PaymentsTab.tsx:217`)
- [P6] (T) el PATCH de cobro responde 409 sobre un turno cancelled y no escribe · fuente: VER (6a8dbb2 `crm-appointments-handler.ts:63-72`: no mira `status`)
- [P7] (T) cancelar y mover desde la agenda van al PATCH del servidor; con un turno de email «o'neil@x.co.il» o sin teléfono, los dos responden 200, el `customerEmail` guardado no cambia y el aviso de cancelación va a ese email · fuente: D-365, AUD 14, VER (6a8dbb2 `db.ts:121-135`, `:443`; `AdminDashboard.tsx:593-608`; `crm-appointments.ts:157-158`; `notify-booking-handler.ts:213-215`)

### CRM-05 · X · Los índices (T)

- [X1] (T) `firestore.indexes.json` y `firestore.nichos-us-prod.indexes.json` declaran `stock_items (clientId, name)`, `stock_movements (clientId, itemId, createdAt desc)` y `appointments (clientId, date)` · fuente: D-369, D-360, AUD 10, PROD

### CRM-05 · H · El hub (H)

- [H1] (H) suspender o archivar un cliente desde el hub pausa su proyecto de Vercel, y volver a "active" lo despausa · fuente: D-361, L3, VER (H 89cfb98 `src/app/clients/[clientId]/page.tsx:224`, `src/app/api/clients/route.ts:113-150`: el PUT escribe `clients/{clientId}.status` con `merge` y no pausa nada; `kill/route.ts:63-75` sí pausa), T 6a8dbb2 `tenant.ts:128-145` (el visitante anónimo entra como «active» por diseño)
- [H2] (H) `resolveOwnerNotificationEmail` devuelve el `adminEmail` de `hub_clients` aunque `config.adminEmail` diga otro · fuente: D-367, VER (H 89cfb98 `src/lib/provisioning.ts:92-95`: el del config primero; CRM-04 H2 sólo le quitó los dominios reservados)

### CRM-05 · W · Producción (T; webs)

- [W1] (T, webs) en el Firestore de producción una consulta anónima que lista `config` responde PERMISSION_DENIED y la lectura anónima de `config/<demo>` responde el documento · fuente: D-366, S8 (se mide sin credenciales, por REST)
- [W2] (T, webs) las bases `default` y `nichos-us-prod` tienen en estado READY los índices de X1 · fuente: D-369, PROD (hoy ninguno de stock)

### CRM-05 · E · Registro (T+H)

- [E1] (T+H) CLAUDE.md de T y de H tienen el párrafo CRM-05 con D-360 a D-369 · fuente: D-360

## Interfaz de prueba (contrato entre los tests de A y el código de B)

`node --experimental-strip-types --test` en T y en H. **Caja negra**, como CRM-04: nada importa `src/*`, `api/*` ni `scripts/*` de forma estática. Ningún test sale a la red salvo W1 y W2. Cada test junta sus fallas y termina con UNA aserción (`ERR_ASSERTION` en el árbol rojo); un paso que lanza queda escrito como falla. Ninguna espera es de tiempo fijo: cada espera es una condición (con un tope).

| hueco del contrato | forma |
|---|---|
| `T firestore.rules` | las reglas que cumplen S1–S11, evaluadas por `_reglas.ts` (sin emulador) |
| `T firestore.indexes.json` · `firestore.nichos-us-prod.indexes.json` | `stock_items (clientId ASC, name ASC)`, `stock_movements (clientId ASC, itemId ASC, createdAt DESC)` y `appointments (clientId ASC, date ASC)`, `queryScope: COLLECTION` (D-369) |
| `T src/lib/api/crm-appointments-handler.ts` | `createCrmAppointmentsHandlers({ clientId, loadDb, authenticate })` como hoy (lo llaman los dos runtimes); el PATCH de cobro acepta `{ id?, montoCents, paymentMethod, precioCents?, revierte?, motivo? }`: `montoCents > 0` es un cobro, `< 0` una reversión (con `revierte` = el id de un cobro del turno y `motivo`); `id` es el del cobro (sin `id`, lo pone el servidor: el cuerpo de CRM-04 sigue valiendo); un `id` que ya está devuelve 200 sin cambiar nada; reversión de `staff` → 403; turno `cancelled` → 409; revertir más de lo cobrado → 409; todo sin escribir. `authenticate` devuelve `{ email, uid, role }` (`AdminAuthResult`) |
| `T appointments/{id}.cobros` | lista de `{ id, montoCents, metodo, at, por, revierte?, motivo? }` (D-363); `amountPaidCents`, `paymentStatus`, `paymentMethod` y `paidAt` salen de la lista |
| `T src/lib/cobros.ts` | `cobrosDe(turno) → { id, montoCents, metodo, at, … }[]`: la lista, o un cobro heredado `{ montoCents: amountPaidCents, metodo: paymentMethod, at: paidAt }` para un turno viejo sin lista |
| `T` el diálogo de cobro de la agenda | genera el `id` al abrirse y lo manda en cada reintento; otro diálogo, otro `id` |
| `T` la agenda (`[data-turno="<id>"]`) | muestra los cobros del turno (monto, método, fecha) en su tarjeta, o detrás de un control suyo con `aria-expanded="false"` |
| `T` Pagos → «רישום תשלום» · Clientes («רשימה») → «הוסף לקוח» | el monto con `leerMonto`; si no se lee, no guarda nada, el campo lleva `aria-invalid="true"` y su error (por `aria-describedby`, `aria-errormessage` o un `role="alert"` del formulario) |
| `T` cancelar («עוד פעולות» → «ביטול התור») y mover («שינוי מועד») | siempre `PATCH /api/crm/appointments/<id>` con `{ status }` o `{ date, time }`; nada por el SDK (ni el turno ni los manifiestos) |
| `H src/lib/estado-cliente.ts` | `accionDeEstado(antes, despues) → "pausar" \| "despausar" \| null` (pura) y `aplicarAccionEnVercel(accion, { vercelProjectId, token, teamId?, fetch }) → Promise<{ ok, status }>` (POST `https://api.vercel.com/v1/projects/<id>/pause\|unpause[?teamId=…]` con `Authorization: Bearer <token>`); el `PUT` de `src/app/api/clients/route.ts` las llama |
| `H src/lib/provisioning.ts` | `resolveOwnerNotificationEmail(configData, hubData?)` como hoy, con el del hub primero |

### La elección de A (sesión A, 2026-10-25)

**Los archivos.** En T, `tests/orden/crm-05/`: `_comun.ts`, `_reglas.ts`, `_crm.ts`, `_firebase/{app,auth,firestore}.ts`, `_indices.ts`, `s.test.ts` (S1–S6, S8–S11), `p.test.ts` (S7, P1–P7), `x.test.ts` (X1), `w.test.ts` (W1, W2) y `e.test.ts` (E1). En H: `_comun.ts`, `h.test.ts` (H1, H2) y `e.test.ts`. `HOJA.md`, `_comun.ts` y `e.test.ts` son iguales en T y en H (`cmp`). `_reglas.ts`, `_crm.ts` y `_firebase/*` son copias editables de las de CRM-04, sin cambios (sólo una primera línea que lo dice); `_comun.ts` es la de CRM-04 con `dbMemoria` sobre `structuredClone` (para que un `Date` sembrado siga siendo `Date`: P4), sin lo de Vercel y con `tokenDeGoogle` y `firestoreRest` (W1, W2). S7 vive en `p.test.ts` porque prueba el PATCH, como los P.

**Las reglas (S1–S6, S8–S11).** `_reglas.ts` evalúa `firestore.rules` del árbol. Toda pregunta lleva `clients/c1` con un estado y el `admin_users/<email>` de cada rol (`owner|manager|staff@salon.co.il`, `clientId: "c1"`, `status: "active"`), así S2 y S11 no tapan a las otras; S11 los quita o los cambia. Lo que afirma cada una, más allá de la frase, para tener las dos direcciones:
- **S1:** create, update y delete de `clients/c1` por los tres roles se rechazan con el negocio suspendido **y con el negocio activo** (cambiar a `trial`, escribir otro campo, borrar): medido, con la regla de S2 puesta, la mutación «`allow write: if isOwnerOrManager`» pasaba S1 si sólo se probaba el negocio suspendido. La otra dirección: la dueña lee `clients/c1` activo (CRM-04 R4 muestra el apagado).
- **S2:** con `suspended` y `archived`, los tres roles no leen ni escriben (get, list, create, update) turnos, clientas, `config/c1` (get y, owner/manager, update) ni manifiestos (get, create, update); con `active`, `trial` y `maintenance` sí. Listar `config` y `daily_manifests` no entra (S8 lo cierra para todos).
- **S3:** los siete campos de dinero, cambiados y puestos donde no estaban, se rechazan para los tres roles; el saneo de «o'neil@x.co.il» a `import_a1@noemail.local` (el id del documento es `a1`) se acepta al cancelar y al mover; a `import_a9@…`, a otro email válido, o desde un email válido, se rechaza; `status`, `date` y `time` cambian, y un estado, una hora o una fecha fuera de `isValidAppointment` se rechazan.
- **S4:** borrar: owner y manager sí, staff no. Staff: agregar un intervalo sí; sacar uno, vaciar o cambiar uno por otro, no. Owner y manager siguen sacando un intervalo (el CRM viejo cancela y mueve por el SDK).
- **S5:** get y list de las cinco colecciones: staff no, owner y manager sí.
- **S6:** staff no escribe `amountPaidCents` ni `lifetimeValueCents`; sí cada uno de los otros ocho campos de D-343 y todos juntos.
- **S8:** sin sesión: listar `config` y `daily_manifests` no; leer `config/c1` y `daily_manifests/c1_s1_2026-10-30` sí, con `clients/c1` activo (B puede atar la lectura pública al estado: D-361).
- **S9:** el alta de una consulta válida por la regla de hoy, sin sesión y con los tres roles, se rechaza; la otra dirección: la dueña lista la bandeja.
- **S11:** staff sin `admin_users`, con el de otro cliente, con `status: "removed"` o sin `status` no lee (get ni list) turnos; con `pending` o `active`, sí. El email del token va en minúsculas, como el id del documento (la hoja de diseño dice `email.lower()`).

**S10, las cuatro versiones de Ashkelon.** El catálogo de accesos está escrito en `s.test.ts` (`ACCESOS`, 44 entradas) y sale de leer, en las cuatro versiones (`git show <sha>:<ruta>`; los servicios y las pestañas del CRM son iguales en las cuatro: `git diff --stat 43177c8 b3a97e9 -- src/services src/components/admin` vacío), cada llamada por el SDK de `src/services/{tenant,db,customers,stock,inbox,support,notificationLogs}.ts` y las dos altas con monto de `PaymentsTab.tsx` y `CustomersTab.tsx`. Cada entrada lleva su **ancla**, el texto de la versión que hace ese acceso: el test la busca en cada versión y, si no está, lo anota. Entran la web pública (lee `config/{id}` y un manifiesto por id) y el CRM de la dueña: lee `clients`, `config`, turnos (todos y por día), clientas, la bandeja, el registro de mails, soporte, el inventario y sus movimientos y los horarios del equipo; crea un turno con y sin reserva de la hora, el manifiesto de un día, el pago manual y la visita con monto (`create`, D-362); cancela, mueve (con `manifestEnd`), sanea el email de «o'neil@…» al cancelar y al mover, sanea `staffId` y email de un importado, borra un turno y limpia el manifiesto; escribe `businessRules` en `config`, los horarios del equipo, una clienta nueva y una existente con monto, sus notas, el estado de una consulta y de un mensaje, y el inventario. Cada acceso se pregunta con `clients/c1` en `active`, `trial` y `maintenance`. Quedan fuera, porque las reglas de hoy ya los niegan y la web lo trata así: la lectura anónima de `clients/{id}` (la web la toma como activa), `system/ping` (la prueba de conexión de `firebase.ts`) y la colección vieja `stock/{id}/items` (el catch-all).
- **Precondición del árbol (inciso l):** con las reglas de hoy, ningún acceso del catálogo se niega (medido: el rojo cae sólo en la precondición), así que sin ella S10 no tendría rojo. La precondición es que las reglas son las de CRM-05: la dueña no escribe `clients/c1` y nadie cambia `amountPaidCents` de un turno por el SDK. Con eso afirma que las reglas **nuevas** siguen dejando hacer todo lo del catálogo.

**El cobro (S7, P1–P4, P6, P7 servidor).** `createCrmAppointmentsHandlers` cargado por Vite (`conModulos` de `_crm.ts`) sobre `dbMemoria` (transacciones optimistas: si un documento leído cambió antes del commit, la transacción se vuelve a correr), con `authenticate` que da el rol. «A la vez» es `Promise.all`. P1 y P2 leen la lista guardada (`cobros`); P4 la lee con `cobrosDe`. P3: la seña `k1` (5000, efectivo) y el resto `k2` (10000, tarjeta) ya guardados; la reversión es `{ id: "r1", montoCents: -5000, paymentMethod: "cash", revierte: "k1", motivo }`; «más de lo cobrado» es `-20000` sobre 10000. P6 prueba el cuerpo con `id` y el de CRM-04 sin `id`, y la otra dirección (un turno confirmado se cobra). S7 tiene la otra dirección de D-362: staff cobra (`montoCents` positivo).

**La pantalla (P1 navegador, P2, P5, P7).** El arnés `_crm.ts` (Vite + Chromium, Firebase en memoria, reloj fijo el jueves 2026-10-15 10:00 en Asia/Jerusalem, `/api/*` respondido por el test).
- **P1:** «סמן כשולם» de גלית (t1), monto 50; el primer PATCH responde 503, el diálogo sigue abierto y se guarda otra vez: los dos cuerpos llevan el mismo `id` (un texto no vacío); el cobro de נועה (t3), en otro diálogo, lleva otro.
- **P2:** t1 con la seña del 12.10 en efectivo y el resto del 15.10 con tarjeta; la tarjeta de t1 en la agenda del teléfono muestra 50, 100, «מזומן», «כרטיס», «12.10» y «15.10» (también «12/10» o «12 באוק…»), en su texto o después de tocar un control suyo con `aria-expanded="false"`.
- **P5:** a 1280. Pagos → «רישום תשלום» (שם, טלפון, סכום, «שמירה»); Clientes → «רשימה» → «הוסף לקוח» (שם מלא, טלפון, el servicio `cut`, su confirmación, la hora 09:00, «סכום ששולם», «שמור»). «1.500» y «abc» no escriben nada en `appointments` (ni en `customers`, el alta) y el campo queda con `aria-invalid="true"` y su error; «1,500» escribe un turno con `amountPaidCents` 150000.
- **P7:** a 390. t3 (נועה) con «o'neil@x.co.il» se cancela con «עוד פעולות» → «ביטול התור» → «ביטול התור» del diálogo; t4 (רוני) sin `customerPhone` se mueve con «שינוי מועד» al 16.10 a las 13:00. Ninguna escritura por el SDK en el turno ni en `daily_manifests`; el PATCH lleva `{ status: "cancelled" }` y `{ date, time }`; el email guardado no cambia; el aviso (`POST /api/appointment/notify`) sale con el turno t3 (`appointmentId`, o `appointment.appointmentId` como hoy). El servidor: cancelar y mover los dos turnos responde 200 sin cambiar `customerEmail`, y `destinatarioDeTurno` (CRM-04 Q3) da «o'neil@x.co.il».

**X1 y W.** `_indices.ts` tiene los tres índices de D-369 y la lectura de los dos JSON (`queryScope` COLLECTION y los campos en orden). W1: `runQuery` sin credenciales sobre `config` en `default` responde 403 con `PERMISSION_DENIED`, y `GET documents/config/<demo>?mask.fieldPaths=adminEmail` sin credenciales responde el documento. W2: la lista de índices de `default` y de `nichos-us-prod` (`collectionGroups/-/indexes`, con el token de la cuenta de servicio del `.env.local` de H, sólo lectura) tiene los tres, sin contar `__name__`, en `READY`; el mensaje dice qué índice falta o en qué estado está, por base. Cada una lleva su precondición del árbol (inciso l): W1, que las reglas no dejan listar `config` sin sesión (S8); W2, X1. En el rojo caen ahí y no salen a la red.

**H1 y H2.** H1: `accionDeEstado` con nueve transiciones (`active|trial|maintenance → suspended|archived` = pausar; `suspended|archived → active` = despausar; sin cambio = null); `aplicarAccionEnVercel` con un `fetch` falso (la url, el método, el token y `{ ok, status }`, también con un 403); y el cableado: el `PUT` de `src/app/api/clients/route.ts` llama a las dos, directo o por una función que llama (del mismo archivo o importada), un nivel. H2: con el hub y el config distintos, mayúsculas incluidas, y con el config vacío, devuelve el del hub.

**E1.** El párrafo «**CRM-05 (AAAA-MM-DD):**» en § Puertas automáticas de cada CLAUDE.md, con D-360 y D-369.

**Satisfacibilidad comprobada fuera de T y de H** (incisos ae y l; 2026-10-25). Dos clones (`git clone --no-hardlinks` de T en 8b2859c y de H en 89cfb98, `node_modules` por junction al de cada repo, nunca un worktree), con los tests de esta orden copiados y arreglos mínimos escritos por A sólo para esto, que no se guardan ni se commitean (scripts `reglas-min.mjs`, `t-min.mjs` y `h-min.mjs` en el scratchpad de la sesión):
- **T, con las reglas y el arreglo mínimo:** `tsc --noEmit` exit 0; `tests/orden/crm-05/*.test.ts` → 22 tests, 20 pass, 2 fail = W1 y W2, que miden producción sin desplegar (W1: «listar config sin credenciales responde 403 PERMISSION_DENIED (hoy 200 …)»; W2: «default · falta el índice stock_items (clientId ASCENDING, name ASCENDING) (hay de stock_items: ninguno)», y así los tres en las dos bases). `tests/orden/crm-04/p.test.ts` (P1–P3 de CRM-04) 3/3: el cuerpo de CRM-04 sigue valiendo.
- **H, con el arreglo mínimo:** `tsc --noEmit` exit 0; `tests/orden/crm-05/*.test.ts` 3/3; `tests/orden/crm-04/h.test.ts` 2/2.
- **No se comprobó** que W1 y W2 pasen: dependen de que Liam despliegue reglas e índices (D-360, § Lo que hoy no se puede hacer). Sí se comprobó que sus mensajes dicen qué difiere.

**Mutaciones** (para el verde de B y la verificadora; probadas por A en los dos sentidos en los clones: con el arreglo mínimo el test pasa, con la mutación cae; cada una restaurada):

| guard | qué se rompe | qué cae (la primera falla) |
|---|---|---|
| S1 | `clients`: `allow write: if isOwnerOrManager(clientId)` | S1 «owner cambia clients/c1 (activo) a trial: se rechaza (hoy se permite)» y S10 (precondición) |
| S2 | `isTenantAdmin` e `isOwnerOrManager` sin `isClientStatusAllowed` | S2 |
| S3 | el update de `appointments` sin el cierre del dinero ni del email | S3 y S10 (precondición) |
| S4 | staff actualiza un manifiesto sin conservar sus intervalos, y lo borra | S4 |
| S5 | `payments` e `invoices` leídos por `isTenantAdmin` | S5 |
| S6 | `isStaffCustomerUpdate` con `amountPaidCents` y `lifetimeValueCents` | S6 |
| S8 | `config`: `allow list: if true` | S8 |
| S9 | `contact_inbox`: `allow create` por la forma, sin sesión | S9 |
| S10 | el update de `appointments` con `affectedKeys().hasOnly(["status", "date", "time", "customerEmail"])` (deja fuera `manifestEnd` y `staffId`: mover y sanear del CRM viejo) | S10 |
| S11 | `isTenantAdmin` sin `admin_users` | S11 |
| S7 | el PATCH no mira el rol en una reversión | «staff revierte un cobro: 403 (hoy 200 {"success":true})» |
| P1 | el servidor no deduplica por `id` | «k1 dos veces en serie: 5000 cobrado (hoy 10000)» |
| P1 | el diálogo no manda el `id` | «el navegador manda el id del cobro (mandó {"montoCents":5000,"paymentMethod":"cash","precioCents":9000})» |
| P2 | la tarjeta del turno sin la lista de cobros | «el turno de גלית muestra los dos cobros: ₪50 · מזומן · 12.10 y ₪100 · כרטיס · 15.10 (hoy «09:00 60 דק׳ גלית …»)» |
| P3 | revertir sin el tope de lo cobrado | «revertir 20000 con 10000 cobrado responde 409 (hoy 200 {"success":true})» |
| P4 | `cobrosDe` sin el cobro heredado | «cobrosDe(turno viejo) da un cobro heredado { montoCents: 8000, metodo: card, at: paidAt } (hoy [])» |
| P5 | el pago sin turno con `Number()` | «pago sin turno · con «1.500» no guarda (guardó amountPaidCents 150)» |
| P6 | el PATCH cobra un turno cancelado | «cobrar {"id":"k1",…} sobre un turno cancelado responde 409 (hoy 200 {"success":true})» |
| P7 | `crmAppointments.update` por el SDK con el turno del navegador | «agenda · cancelar no escribe por el SDK (escribió ["update appointments/t3 {"status":"cancelled","customerEmail":"import_t3@noemail.local"}"])» |
| X1 | `firestore.nichos-us-prod.indexes.json` sin `appointments (clientId, date)` | «firestore.nichos-us-prod.indexes.json declara appointments (clientId ASCENDING, date ASCENDING)» |
| H1 | el PUT no llama a `aplicarAccionEnVercel` | «el PUT de src/app/api/clients/route.ts llama a aplicarAccionEnVercel» |
| H1 | `archived` no pausa | «accionDeEstado("active", "archived") = "pausar" (hoy null)» |
| H2 | el config primero | «resolveOwnerNotificationEmail({"adminEmail":"intrusa@gmail.com"}, {"adminEmail":"duena@salon.co.il"}) = "duena@salon.co.il" (hoy "intrusa@gmail.com")» |

**Lo que B escribe:**

| afirmación | archivo | qué |
|---|---|---|
| S1–S6, S8–S11 | `T firestore.rules` | D-361, D-362, D-366, D-368 |
| S7, P1, P3, P4, P6 | `T src/lib/api/crm-appointments-handler.ts`, `src/lib/cobros.ts` | D-362, D-363 |
| P1 (navegador), P2 | `T src/components/admin/crm03/AgendaDia.tsx`, `src/services/crm-appointments.ts` (y los textos nuevos en `crm03/textos.ts`, en los cuatro idiomas y con trato, § Notas) | D-363 |
| P5 | `T src/components/admin/CustomersTab.tsx`, `src/components/admin/PaymentsTab.tsx` | D-364 |
| P7 | `T src/services/crm-appointments.ts`, `src/services/db.ts`, `src/components/admin/AdminDashboard.tsx` | D-365 |
| X1 | `T firestore.indexes.json`, `firestore.nichos-us-prod.indexes.json` | D-369 |
| H1 | `H src/lib/estado-cliente.ts`, `src/app/api/clients/route.ts` | D-361 |
| H2 | `H src/lib/provisioning.ts` (y `src/lib/provisioning.test.ts:55`, editable, que hoy fija el del config primero: medido en el clon, cae con el arreglo de H2) | D-367 |
| W1, W2 | el despliegue de reglas e índices desde T, en `default` y en `nichos-us-prod`, que hace Liam con su «sí» (B lee antes `clients/*` y `admin_users` de las cinco webs, § Notas) | D-360, D-366, D-369 |
| E1 | `CLAUDE.md` de T y de H | el párrafo CRM-05 |
| D-380 | `tests/orden/APROBADAS.md` de T y de H | la línea de `crm-04`, cuando Liam la apruebe y antes del push de B |

## Lo que hoy no se puede hacer (2026-10-25)

- **Railway está trabado.** La cuenta no deja entrar sin pagar, y la CLI responde «Unauthorized» (`railway status`, 2026-10-25: «Warning: failed to refresh OAuth token … Unauthorized. Please run `railway login` again.»). Por eso, hasta que Liam pueda desplegar H:
  - **H1 y H2** se escriben, se prueban y se pushean en H, pero no llegan a producción: «Suspender» sigue sin apagar la web y el email de la dueña sigue saliendo del `config`.
  - **El Redeploy de cualquier web** sale de H (las variables de `variablesDeDeploy`, `CRON_SECRET` incluido), así que no se redespliega ninguna: ni la demo (W1 de CRM-04) ni las cuatro de Ashkelon. CRM-04 no se puede aprobar (D-360).
  - **CRM-07 V1–V2** (el disparador del hub) dependen de H en producción.
- **El pre-push de H frena en `tools/destino-no-despliega.mjs`**: sin `railway status` no se puede probar por estado que el push no despliega. Pasa sólo con `HIGIENE_DESTINO_VERIFICADO=1` y el «va» de Liam **en cada push** (inciso x: excepción, no costumbre; el último, 89cfb98, 2026-10-25). La sesión A y la sesión B de CRM-05 le piden ese «va» a Liam con AskUserQuestion (inciso w) antes de cada push de H.
- **Lo que sí se puede, sin Railway:**
  - todo lo de T (S, P, X y E1 en T): el push de T no pasa por Railway;
  - **desplegar reglas e índices**: es Firebase, desde T (`npm run firebase:deploy:rules`), con el sí de Liam;
  - **W1 y W2 de CRM-05** («, webs»): miden el Firestore de producción, no Railway ni Vercel. Se miden con `rojo-verde --orden crm-05` después de que Liam despliegue reglas e índices (inciso s).
- **La demo pierde «סמן כשולם» desde el despliegue de reglas hasta su Redeploy** (D-362): corre CRM-03, que cobra por el SDK.

## Notas para las sesiones A y B

- **Las reglas son una sola para todas las webs.** Las cinco webs leen y escriben la misma base con las mismas reglas: la demo con CRM-03 y las cuatro de Ashkelon con T del 9–10/10. Lo que se despliega vale para todas en ese momento. Por eso S10 se vuelve una afirmación. Lo leído:
  - en las versiones de Ashkelon, la web pública lee `config` y `clients` por id (`tenant.ts:219`, `:223`);
  - el CRM viejo escribe `daily_manifests` por el SDK (dueña) y `config.businessRules` (dueña);
  - antes de CRM-03 no hay empleadas (la entrada del equipo es D-305), así que lo de staff no rompe ninguna web vieja;
  - **cerrar del todo la escritura de manifiestos por el SDK rompería el CRM viejo.** Por eso CRM-05 sólo limita a la empleada (S4), y el cierre total va cuando ninguna web corra un CRM anterior a CRM-06 (D-370);
  - el CRM viejo cobra el pago manual y el alta con monto con un `create`, y cancela y mueve con un update de `status`, `date` y `time` más el saneo del email: por eso los `create` con monto siguen abiertos y S3 deja el saneo (D-362, leído en las cuatro versiones el 2026-10-25);
  - la demo (CRM-03, 47b53a6) cobra con un update por el SDK y queda fuera de S10 (D-362).
- **Lo que hace Liam, cada paso con su sí:**
  - desplegar reglas e índices desde T, en `default` y en `nichos-us-prod`;
  - desplegar H en Railway (H1, H2 y, en CRM-07, V);
  - redesplegar cada web.
  
  Se verifica por estado (W1, W2, el deployment READY), no por hash.
- **Antes del despliegue de reglas de CRM-05, B lee (sólo lectura):**
  - `clients/{id}` de las cinco webs: que exista y tenga un estado permitido (S2);
  - `admin_users` de cada dueña (S11). Si alguno falta, se le pregunta a Liam antes de crearlo.
- **Lo que no se toca:**
  - `bp2-reg-core` (L15);
  - CARDCOM-01 en H: `cobro-mensual.ts`, `cobro-mensual-uno.ts` y `cardcom-01.ts`;
  - los datos de VIDEOS-01 de la demo.
- **Los textos nuevos de la pantalla** (el historial de cobros, «הגיעה»/«לא הגיעה», el error de stock, «última revisión») van en los cuatro idiomas como originales (R24) y con trato (R31). Se escriben en los módulos de CRM-04 (`crm03/textos.ts`, `textos-pantallas.ts`, D-347).
- **El commit de T tarda unos 40 min y necesita el 3000 libre:** B avisa a Liam antes.
