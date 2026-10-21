# HOJA · CRM-04 · el CRM en los cuatro idiomas, en el celular y sin suponer el género de nadie —los cinco prototipos aprobados—, y lo que la revisión de CRM-03 encontró: el equipo sin escribir lo que no le toca, avisos que no se duplican ni rebotan, cobros que no se pisan, la primera carga sin el aviso falso, el oscuro que se queda; el push de T destrabado · 2026-10-20

Escrita por la **sesión de diseño CRM-04** (iniciada desde la sesión principal; Liam, 2026-10-20: **«Dale, hacé la hoja de CRM-04»**). La sesión A la toma tal cual, escribe los tests rojos, completa § Interfaz con su elección y la copia a `tests/orden/crm-04/HOJA.md` (incisos i, p y q).

Línea base: **T `main` 47b53a6** (CRM-03 B) y **H `main` 6247cd9** (SIN-ALTA-01 B), los dos iguales a `origin/main` y limpios (hook de arranque, 2026-10-20). **Prototipo visto por Liam:** el clon de diseño `diseno/crm-04/t` (T 47b53a6) con el parche acumulado **`diseno/crm-04/PROTO-5-acumulado.patch`** (29 archivos de T, prototipos 1 a 5). Nada de esta orden está escrito en T ni en H.
Fuentes:
- `P1`…`P5` = `diseno/crm-04/PROTO-<n>.md` y sus tableros `proto<n>/`.
- `PASO1` y `PASO2` = `diseno/crm-04/PASO-1.md` y `PASO-2.md`: el mapa del CRM en T main y la comparación con el mapa de CRM-03, con la demo real vista con el login de Liam (`dpl_6vwqgkxdY74QtvMY8DAMLedyb6o9`, READY, T 47b53a6).
- `REV` = `diseno/crm-04/revision-tecnica/INFORME.md`: la revisión de código de CRM-03 hecha por un revisor aparte, de sólo lectura, con 18 defectos. Las sondas que corrió están en esa carpeta.
- `DEC` = `diseno/crm-04/DECISIONES.md`, las frases de Liam.
- `T:` y `H:` = archivos en la línea base.

Formato: cada afirmación es una línea `- [ID] (repo) frase · fuente: …`. El nombre del test es la frase exacta entre `(repo) ` (o `(repo, webs) `) y ` · fuente:`. `(T)` sólo en T, `(H)` sólo en H, `(T+H)` en los dos. **W1 y W2 llevan `, webs`** (inciso s, D-151): `rojo-verde --todas` no las corre en HEAD, y `rojo-verde --orden crm-04` entero es obligatorio al cierre de B y en la verificadora.
Circuito: PLAN.md § Cómo se trabaja, incisos i) a ae), o-bis y o-ter. Las decisiones vigentes llegan hasta D-331 (SIN-ALTA-01). Esta hoja usa **D-332 a D-351**: nadie más las usó (grep sobre `bloque-04/`, `PLAN.md` y `archivo-landing-01/`, 2026-10-20). La sesión A suma **D-352 a D-354** (decisiones de Liam del 2026-10-20 durante el rojo; libres por el mismo grep).

- **D-332 (Liam, 2026-10-20) todo lo nombrado se arregla, en una sola orden.**
  - La sesión de diseño propuso un paso 0, una orden técnica y una de diseño. Liam: **«bien, todo lo que nombras hay que arreglar»** y **«Bien, empeza por favor»** (`DEC`).
  - La hoja junta lo técnico y los prototipos porque tocan los mismos archivos de T (`AdminDashboard.tsx`, `AgendaDia.tsx`, `CustomerDetailPanel.tsx`, `cobros.ts`, los locales). Dos órdenes seguidas sobre los mismos archivos serían dos escritores, uno detrás del otro.
- **D-333 (Liam, 2026-10-16) el push de T se destraba retirando CRM-03.**
  - El problema: `tests/orden/crm-03/h.test.ts:98` (H2) calcula horas para el domingo 2026-10-18 con `generateSlots`, que compara contra el reloj real (`T src/lib/booking.ts:69`). Desde el 18-10 no hay horas: H2 cae 3 de 3.
  - Como CRM-03 no figura en `T tests/orden/APROBADAS.md`, el `rojo-verde --todas` del pre-push la corre. **El próximo push de T cae** (`PASO2`).
  - CRM-03 está aprobada desde el 2026-10-16: la línea «- crm-03 · aprobada 2026-10-16 · T 47b53a6 · H 1bdbcb2» ya está en `H tests/orden/APROBADAS.md`. La escribió la sesión A de SIN-ALTA-01 «sin promover sus copias, Liam» (PLAN.md, fila abierta).
  - **La sesión A de CRM-04 escribe esa misma línea en `T tests/orden/APROBADAS.md` en su commit rojo** (precedente D-38/…/D-299). Por eso no es una afirmación. Las copias de CRM-03 no se promueven (Liam).
- **D-334 (Liam, 2026-10-20) prototipo 1, el panel en los cuatro idiomas** (agenda, sus diálogos, «תור חדש» y Resumen; `P1`): **«Aprobado, seguí con las demás pantallas en los cuatro idiomas»**.
- **D-335 (Liam, 2026-10-20) prototipo 2, el resto del panel en los cuatro idiomas** (calendario, Pagos, Clientes, Equipo, Inventario, Usuarios, Mensajes, Registro, Reglas y las pantallas de entrada; las flechas en LTR, los datos aislados con `<bdi>`, «Управление»; `P2`): **«Aprobado, seguí con el celular y la agenda»**.
- **D-336 (Liam, 2026-10-20) prototipo 3, el celular y la agenda** (el menú del celular como diálogo, el menú de escritorio sin scroll, el servicio sin precio, el turno corto, la semana del celular, el mes desplegable, los huecos legibles, `<main>` y `<h1>`; `P3`): **«si, lo apruebo.»**
- **D-337 (Liam, 2026-10-20) prototipo 4, los textos** (Clientes sin jerga, Tareas sin IA, el motivo del error de un aviso, Usuarios sin el doble «dos puntos»; `P4`): **«Si apruebo»**.
- **D-338 (Liam, 2026-10-20) R31: el género de un texto sale de la persona.**
  - La pregunta: el panel habla de la clientela en femenino desde CRM-03, y el CRM es el mismo en los siete nichos. Liam: **«De la persona, no del nicho»**.
  - A la regla propuesta con la frase fija, y a las dos formas de modelarla, Liam: **«Va, opción 1»**. Escrita como R31 en `bloque-04/DISENO-REGLAS.md`.
  - La opción 1: cada clienta o cliente lleva «cómo le hablamos» (femenino, masculino o sin indicar). Sin indicar, el texto usa una forma sin género. Lo que habla de un grupo, o de quien usa el panel, no supone el género.
- **D-339 (Liam, 2026-10-20) prototipo 5, «לשון הפנייה»** (`P5`): **«Si, lo apruebo.»**
  - **El dato:** `customers/{id}.trato` ∈ `"f" | "m" | "n"`, y si falta vale `"n"`. Los datos que ya existen no se tocan.
  - Se guarda `"n"` explícito, no un borrado: pasar a «sin indicar» es una escritura común.
  - Equipo e invitaciones no llevan el dato: el panel les habla sin género.
- **D-340 (Liam, 2026-10-20) `admin_users` sigue con el email como id.** Un email administra una sola web (`H src/lib/admin-bootstrap.ts:38-44`, D-21). Liam: **«Queda así»**.
- **D-341 (Liam, 2026-10-20) el alta no registra emails de plantilla, y la segunda dueña de la demo se quita.**
  - La demo tiene dos dueñas: el mail de Liam y `hello@example.com`, el email genérico de PRESET-01 (D-86), registrado por el alta del 5-10 (`PASO2`). Liam: **«Arreglar el alta y quitarla»**.
  - El documento se borra con el «sí» de Liam en el momento, porque es una escritura en Firestore de producción.
- **D-342 (sesión de diseño, dentro de D-332) los avisos** (`REV` 2, 3, 4, 5, 10 y 15). Todo en `T src/lib/api/avisos-handler.ts` y en sus dos rutas.
  1. **Sin dirección real no hay aviso.** Un turno sin email, o con un email de `@noemail.local` (el que pone «תור חדש», `T AdminDashboard.tsx:199`), no es candidato: ni se envía ni deja registro.
  2. **Como mucho un recordatorio por turno.** Antes de enviar, la corrida crea la marca con id fijo `reminder_<turnoId>`, con `create`, que falla si ya existe. Si no la puede crear, no envía. **Techo declarado:** si la función se corta entre la marca y el envío, ese recordatorio no sale.
  3. **La clave antes que Firestore, y sin promesas sueltas.** Una petición sin `Authorization` válida responde 401 sin cargar firebase-admin. Cualquier error de lo que el handler llama sale como 500 con JSON. Ninguna promesa queda sin manejar (en Express 4 tumbaba `server.ts`, `REV` 4).
  4. **Un 429 corta la corrida.** Cuando el proveedor responde 429, se deja de enviar en esa corrida y los turnos que faltaban quedan sin registrar: salen a la hora siguiente. Nunca quedan en «failed» por 429. El límite real de Resend no está verificado; esto vale con cualquier límite.
  5. **«En cola» se registra una vez.** Sin clave de email, un turno queda «queued» una sola vez por noche (antes eran 6) y el resumen una sola vez por día (antes 16).
  6. **`?fecha=` no dice «mañana».** Con una fecha pedida distinta de mañana, el asunto nombra esa fecha.
  7. **El resumen diario no lista turnos `expired` ni `cancelled`.**
- **D-343 (sesión de diseño, dentro de D-332) lo que el equipo puede y no puede** (`REV` 1, 6, 11, 16 y 18).
  - **`config/{id}` lo escriben sólo `owner` y `manager`** (`T firestore.rules:91-94`; hoy `isTenantAdmin` incluye a `staff`, `:30-33`).
  - **La empleada actualiza clientes**, porque ve «לקוחות» y da turnos. Puede tocar estos campos: `fullName`, `phone`, `notes`, `tags`, `trato`, `lastServiceId`, `amountPaidCents`, `lifetimeValueCents`, `paymentMethod` y `updatedAt` (`:132-133`). Así «תור חדש» para una clienta que ya existe y sus notas dejan de fallar.
  - **Del lado del servidor, en los dos runtimes**, `staff` recibe 403 en estas rutas: `/api/crm-metrics`, `GET /api/admin/users`, `/api/knowledge/*`, `/api/whatsapp/config`, `/api/whatsapp/pause`, `/api/whatsapp/queue-message` y `/api/stock/migrate`.
  - **`/api/appointment/notify`** manda sólo al `customerEmail` guardado en el turno (lo lee el servidor), nunca a un email que venga en el cuerpo.
  - **`/api/admin/me`** sincroniza los claims antes de pasar la invitación a `active`. Si la sincronización falla, la invitación queda pendiente y la próxima entrada lo reintenta.
  - **`acceptedAt`** se guarda como timestamp en los dos runtimes (`server.ts:3253` lo guardaba como texto).
  - **Las reglas las despliega Liam desde T** (`firebase deploy --only firestore:rules`, regla 1 y CLAUDE.md de H). Se verifica por el estado de lo desplegado, no por el archivo.
- **D-344 (sesión de diseño, dentro de D-332) el dinero** (`REV` 7, 8 y 17).
  - **El cobro suma en el servidor.** El navegador manda el monto que entra ahora (no el total). El servidor lo suma, en una transacción, a lo que ya está guardado. `crmAppointments.cobrar` deja de escribir directo por el SDK.
  - **`leerMonto` sigue la costumbre de Israel:** la coma separa miles y el punto separa decimales.

    | Entrada | Resultado |
    |---|---|
    | «1,500» | 1500 |
    | «1500» | 1500 |
    | «150.5» | 150,5 |
    | «1.500» (tres decimales) | inválido, con el mensaje de error del diálogo |
    | «1,50» (comas mal agrupadas) | inválido, con el mensaje de error del diálogo |

  - **Las cuentas cierran.** Un turno pagado cuenta como ingreso lo cobrado, no el precio: ingreso = cobrado + pendiente en la agenda, el Resumen y Pagos.
- **D-345 (sesión de diseño, dentro de D-332) la primera carga y el oscuro** (`PASO2`).
  - **La primera carga.** Hoy la web y `/admin` muestran «לא ניתן לאמת כרגע את זמינות השירות» en 2 de 3 primeras cargas. La causa es el plazo de 1,5 s de cada lectura (`T src/services/tenant.ts:151-161`, de N03, 2026-09-09).
    - Pasados los 1,5 s se sigue esperando con la pantalla de carga hasta **8 s en total**. Recién entonces aparece el aviso, con «ניסיון נוסף».
    - Un tenant apagado (el kill-switch) se sigue mostrando apagado en cuanto llega la lectura.
  - **El oscuro del panel sobrevive a recargar.** El panel guarda su tema en una clave propia, que no depende de `features.themeToggle`. Hoy, con el toggle en `false` (R12, peluquería), `initialTheme` ignora lo guardado (`T src/components/theme/ThemeProvider.tsx:35-39`). La web pública sigue con R12.
  - **El gráfico de ingresos del Resumen.** A 390 salía diminuto en 1 de 6 cargas (`PASO2`, intermitente). Mide lo mismo en cargas seguidas. **Fuera de la orden desde D-353** (no se reproduce en el DOM).
- **D-346 (sesión de diseño, dentro de D-332) la reserva, el horario y el hub** (`REV` 9, 12, 13 y 14).
  - **`POST /api/book`** rechaza, sin escribir, una fecha que no existe («2026-02-31»), una hora fuera de la grilla del servicio («09:07») y una fecha y hora pasadas.
  - **Una persona del equipo del preset.** Si no está en `config.staff`, el CRM la copia ahí al guardar su horario, y la reserva aplica ese horario (`T src/lib/agenda.ts:51-55`).
  - **El contacto de `api/index.ts`** (la rama `contact` de `sendNotification`, `:1217-1228`) escapa `name`, `email`, `subject` y `message`, como ya hace `server.ts:1015-1021`.
  - **`H guardarConfig`** lee y escribe `config/{id}` en una transacción. Así el horario que la dueña guarda en el CRM entre la lectura y la escritura no se pierde (`H src/lib/guardar-config.ts:189-210`).
- **D-347 (sesión de diseño, dentro de D-332) el texto de los prototipos se queda donde está.**
  - Los textos del panel siguen en `crm03/textos.ts` (agenda, diálogos, «תור חדש», Resumen) y en `crm03/textos-pantallas.ts` (el resto, con `segun` y `motivoDeAviso`), más lo que los prototipos cambiaron en `src/config/locales/*.ts`. Son los módulos aprobados: moverlos a los locales sería un cambio sin pedido (inciso ac).
  - Los cuatro idiomas están escritos como originales (R24).
- **D-348 (sesión de diseño) lo que dejó a la vista la medición de CRM-03.** `medirPantalla` de `T tests/orden/crm-03/_crm.ts:279` tiene dos huecos (`P1`):
  - No ve una caja más ancha que la pantalla cuando `html` y `body` llevan `overflow-x: clip`. Así se escapó una tarjeta rusa de 406 px a 390.
  - No lee colores `oklch()`, los de Tailwind v4. Mide contra el fondo de atrás: el botón rojo «ביטול התור» da 1,04 cuando su contraste real es de unos 6:1.
  - El arnés de esta orden, `tests/orden/crm-04/_crm.ts`, cierra los dos. Es herramienta de A, no afirmación: se prueba con las mutaciones de § Interfaz.
- **D-349 (sesión de diseño) U1 de CRM-03, intermitente.** El menú de la gerente salió vacío en 2 de 3 corridas (`PASO2`, `revision-tecnica/tap-hu-*.txt`): el rol llega después de pintar el menú. Mientras el rol no llegó, el menú muestra el de menor acceso, nunca nada. La afirmación nueva corre cinco veces seguidas.
- **D-350 (sesión de diseño, regla o-ter) los cinco lugares de `trato`.**
  - **Contrato:** D-339.
  - **Validador:** las reglas de `customers` aceptan `trato` sólo con `"f"`, `"m"` o `"n"`, en create y en update. Los tipos (`T src/types.ts`) y `customerService.upsertByEmail` / `updateCustomer` (`T src/services/customers.ts`) lo llevan.
  - **Casilla:** la ficha y «תור חדש».
  - **Material:** no tiene.
  - **Guard:** las afirmaciones G.
  - No es un dato del hub (vive en `customers`, no en `config`), así que no entra en `verdad/contratos.json` ni en `hueco.mjs`.
- **D-351 (sesión de diseño) la demo de punta a punta.**
  - **Hoy no sale ningún aviso:** la demo responde 500 «CRON_SECRET not configured» en `/api/cron/avisos` (`PASO2`). Se arregla con dos pasos de Liam, en este orden:
    1. desplegar H en Railway, con `CRON_SECRET` en sus variables (no verificable desde acá: el token de `.env.local` de H da 403);
    2. el Redeploy de la demo desde la ficha, con su «sí».
  - Con eso, un GET sin clave da **401**.
  - W1 lo mide junto con el deployment. W2 mide que la segunda dueña ya no está (D-341).
- **D-352 (Liam, 2026-10-20, sesión A) G4 con la lista tal cual.** Con el parche de los prototipos, G4 marca dos textos árabes que el prototipo 5 no revisó (`genero.cjs` no miraba `SupportTab` y su `\b` no funciona con letras árabes): en Soporte «اكتب رسالتك الأولى أدناه» (`ar.ts`, un imperativo masculino) y en el Registro «…أو حاول إرساله» (`crm03/textos-pantallas.ts`, pasado con sujeto «el sitio»: un falso positivo, como «מנהלת»). Liam: **«Lista tal cual; B reescribe»**. B reescribe los dos como originales y sin imperativo; G4 no pasa con el parche solo, pasa con el parche y esos dos textos.
- **D-353 (Liam, 2026-10-20, sesión A) R6 sale de esta orden.** El gráfico de ingresos no se achica en el DOM (36 cargas en el arnés de esta orden, siempre 340 × 200, también cambiando el alto de la ventana). Sólo se vio diminuto en capturas de página entera, 2 de 16, con el DOM medido justo después en 340 × 200. Un test que no puede caer en rojo de forma segura rompe el pre-push (`rojo-verde` exige el rojo). Liam: **«Sacar R6 de esta orden»**. Queda en § Fuera de esta hoja.
- **D-354 (Liam, 2026-10-20, sesión A) el token de Vercel.** El `VERCEL_TOKEN` del `.env.local` de H da 403 también para leer (tres GET, 2026-10-20: el proyecto, el alias y el deployment de la demo). Liam: **«Lo renuevo antes del cierre de B»**. W1 queda como está.

Por qué: el CRM que se vende hoy se ve a medias en hebreo para una clienta rusa o árabe y le habla en femenino a un barbero. Además, la empleada puede reescribir los precios de la web, un turno dado por teléfono dispara recordatorios a una dirección que no existe y dos cobros se pisan.

## I · El panel en los cuatro idiomas (T)

- [I1] (T) en en, ru y ar cada pestaña del panel a 390 y a 1280 no muestra ningún texto del panel en hebreo: las letras hebreas que se ven son sólo datos del salón de prueba (nombres, servicios, productos y asuntos) · fuente: D-334, D-335, P1, P2
- [I2] (T) los plurales y las fechas van por el idioma: «1 запись», «2 записи», «5 записей»; «موعد واحد», «موعدان», «3 مواعيد»; la fecha de la agenda en inglés es «Thursday, October 15th» y ningún texto de en, ru o ar mezcla un mes inglés con una letra hebrea («15 בOctober») · fuente: D-334, P1
- [I3] (T) en en y ru el ícono de «siguiente» de la agenda, del calendario (mes, semana y día) y de las páginas del Registro apunta a la derecha y el de «volver» de Mensajes a la izquierda; en he y ar al revés · fuente: D-335, P2
- [I4] (T) un nombre en hebreo dentro de una frase en otro idioma va en `<bdi>`: el de la clienta en la pregunta de cancelar y en la nota de cambiar la hora, y el del producto en la línea de stock bajo · fuente: D-335, P2
- [I5] (T) Clientes habla sin jerga: las etapas son he «פניות · בקשר · עם תור · לקוחות · הפסיקו להגיע», en «New · In touch · Booked · Clients · Not returning», ru «Новые · На связи · Записаны · Клиенты · Не вернутся» y ar «استفسارات · على تواصل · بموعد · زبائن · توقّفت الزيارات»; ninguna se corta a 390, y ningún texto visible de Clientes dice «לידים», «הומר», «אבוד», «עملاء محتملون» ni «arrastrar» en ningún idioma · fuente: D-337, D-338, P4, P5
- [I6] (T) un aviso que no salió muestra en el Registro el motivo en el idioma del panel —para el rebote «550 5.1.1 The email account does not exist.», «הכתובת לא קיימת או שכתובה לא נכון.» y sus pares en en, ru y ar— y el texto del proveedor sólo dentro de un `<details>` cerrado, «פרטים טכניים» · fuente: D-337, P4
- [I7] (T) el subtítulo de Tareas no promete IA en ningún idioma («עוזר», «assistant», «ассистент», «مساعد») y la fila de la dueña en Usuarios no lleva dos «:» seguidos · fuente: D-337, P4
- [I8] (T) en ru el encabezado del menú dice «Управление» en una sola línea · fuente: D-335, P2

## M · El celular y la agenda (T)

- [M1] (T) a 390 el menú abierto es un diálogo: `role="dialog"` y `aria-modal="true"`, toma el foco al abrir, 25 Tab seguidos quedan adentro, Escape lo cierra y el foco vuelve al botón «תפריט»; a 1280 el menú no es un diálogo · fuente: D-336, P3
- [M2] (T) los botones de tema e idioma del pie del menú miden al menos 44 × 44 · fuente: D-336, P3
- [M3] (T) el menú de escritorio entra entero, sin scroll propio, a 1280 × 674, 1280 × 720, 1366 × 768 y 1920 × 945 · fuente: D-336, P3, PASO2 (a 674 de alto había que desplazarse para «זמנים» y «תמיכה»)
- [M4] (T) a 1280 el botón de accesibilidad está dentro del encabezado y no tapa ningún control · fuente: D-336, P3
- [M5] (T) un turno de un servicio con precio 0 no ofrece «סמן כשולם» y dice «ללא עלות» (en «Free», ru «Бесплатно», ar «بلا تكلفة») · fuente: D-336, P3
- [M6] (T) un turno de 15 minutos en las vistas semana y día mide al menos 22 px de alto y su nombre se ve entero; la hora queda en el nombre accesible · fuente: D-336, P3
- [M7] (T) a 390 la semana es una vista de conjunto: tocar cualquier punto de un día abre ese día y no queda ningún control de menos de 44 × 44 en la semana · fuente: D-336, P3
- [M8] (T) el mes desplegable de la agenda tiene días y flechas de 44 × 44 y sus flechas apuntan en el sentido de la lectura · fuente: D-336, P3
- [M9] (T) cada hueco del calendario tiene un nombre accesible con la fecha y la hora legibles en el idioma del panel («יום חמישי, 15 באוקטובר · 07:00 · תור חדש»), no «2026-10-15 07:00» · fuente: D-336, P3
- [M10] (T) el panel tiene un solo `<main>`, Clientes no anida otro, y a 1280 el título de la pestaña es un `<h1>` · fuente: D-336, P1, P3

## G · Cómo le hablamos a cada persona (T)

- [G1] (T) la ficha de una clienta con trato "f", la de un cliente con "m" y la de alguien con "n" o sin el campo muestran, en he, en, ru y ar, las formas de la tabla de G (fecha de alta, «sus turnos», «sin turnos que coincidan», el ejemplo de notas) y la tarjeta de Clientes la de «todavía no vino» · fuente: D-338, D-339, P5
- [G2] (T) la ficha tiene el grupo «לשון הפנייה» con tres botones `aria-pressed` («נקבה», «זכר», «בלי לציין», con sus pares en en, ru y ar), marcado según el trato; tocar uno escribe `trato` con `customerService.updateCustomer` y, si la escritura falla, la ficha vuelve al trato anterior y muestra un `role="alert"` · fuente: D-339, D-350, P5
- [G3] (T) «תור חדש» trae el mismo grupo, marcado en «בלי לציין»; con "f" o "m" el contacto se guarda con ese trato, y con "n" no se escribe `trato`, así un turno nuevo no le borra el trato a alguien que ya lo tenía · fuente: D-339, D-350, P5
- [G4] (T) con el salón de prueba (clientela sin trato), ninguna pestaña del panel a 390 en he, ru ni ar muestra un texto que suponga el género de quien no se conoce, según la lista de G · fuente: D-338, P5
- [G5] (T) las reglas de `customers` aceptan `trato` sólo con "f", "m" o "n" en create y en update, y `customerService.upsertByEmail` y `updateCustomer` lo aceptan · fuente: D-350

**La tabla de G1** (`segun` en `crm03/textos-pantallas.ts`, `P5`; `{d}` es la fecha):

| idioma | clave | f | m | n |
|---|---|---|---|---|
| he | alta | נוספה {d} | נוסף {d} | ברשימה מ־{d} |
| he | sus turnos | התורים שלה | התורים שלו | תורים |
| he | sin coincidencias | עוד אין תורים שתואמים לפרטים שלה. | …שלו. | …האלה. |
| he | ejemplo de notas | מה חשוב לזכור עליה: … | …עליו: … | מה חשוב לזכור: … |
| he | todavía no vino | עוד לא הגיעה | עוד לא הגיע | עוד אין ביקור |
| en | sus turnos · sin coincidencias · notas | Her bookings · …her details… · …about her… | His bookings · …his details… · …about him… | Bookings · …these details… · Things to remember: … |
| ru | alta · sus turnos · todavía no vino | Добавлена {d} · Её записи · Ещё не приходила | Добавлен {d} · Его записи · Ещё не приходил | В списке с {d} · Записи · Визитов пока нет |
| ar | alta · sus turnos · todavía no vino | أُضيفت {d} · مواعيدها · لم تأتِ بعد | أُضيف {d} · مواعيده · لم يأتِ بعد | في القائمة منذ {d} · المواعيد · لا زيارات بعد |

**La lista de G4.** Es la de `diseno/crm-04/genero.cjs`, sobre el texto visible y fuera de los datos:
- **he:** לקוחה, הגיעה, שלחי, בדקי, נסי, היכנסי, בקשי, עובדת, מנהלת, «זו את», «אף אחת», «כל אחת»; además, los imperativos masculinos נסה, בדוק, התחבר, כתוב, בחר.
- **ru:** клиентк-, сотрудниц-, владелиц-, управляющ-, Приглашена, Добавлена.
- **ar:** زبونة, زبونات, اللواتي, موظفة, مديرة, مالكة, لكِ; además, los imperativos اختر, تحقق, حاول, اكتب.

## N · Los avisos (T)

- [N1] (T) un turno de mañana sin email o con un email de @noemail.local no recibe recordatorio ni deja ningún registro · fuente: D-342 (1), REV 2
- [N2] (T) dos corridas a la vez sobre los mismos turnos de mañana envían un solo recordatorio por turno · fuente: D-342 (2), REV 3 (la sonda dio 2 envíos)
- [N3] (T) una petición sin Authorization válida responde 401 sin cargar la base, y cuando la base o el envío lanzan, la respuesta es 500 con JSON y ninguna promesa queda sin manejar · fuente: D-342 (3), REV 4
- [N4] (T) cuando el envío responde 429 la corrida deja de enviar, los turnos que faltaban no quedan registrados y la corrida siguiente los envía · fuente: D-342 (4), REV 5
- [N5] (T) sin clave de email, seis corridas de una misma noche dejan un solo «queued» por turno, y dieciséis corridas de un día dejan un solo «queued» del resumen · fuente: D-342 (5), REV 10
- [N6] (T) con ?fecha= distinta de mañana el asunto del recordatorio nombra esa fecha y no dice «מחר», y el resumen diario no lista turnos expired ni cancelled · fuente: D-342 (6, 7), REV 15, REV 17

## Q · El equipo (T)

- [Q1] (T) las reglas de `config` dejan escribir sólo a owner y manager, y las de `customers` dejan a staff actualizar sólo los campos de D-343 · fuente: D-343, REV 1, REV 6
- [Q2] (T) en los dos runtimes, staff recibe 403 en /api/crm-metrics, GET /api/admin/users, /api/knowledge/*, /api/whatsapp/config, /api/whatsapp/pause, /api/whatsapp/queue-message y /api/stock/migrate, y owner y manager no · fuente: D-343, REV 1
- [Q3] (T) /api/appointment/notify manda al customerEmail guardado en el turno aunque el cuerpo traiga otro email · fuente: D-343, REV 18
- [Q4] (T) en los dos runtimes /api/admin/me deja la invitación pendiente cuando los claims no se sincronizan, y guarda acceptedAt como timestamp · fuente: D-343, REV 11, REV 16
- [Q5] (T) el menú de la gerente nunca sale vacío: cinco cargas seguidas muestran sus pestañas, y mientras el rol no llegó se ve el menú de menor acceso · fuente: D-349, PASO2 (U1 cayó 2 de 3)

## P · El dinero (T)

- [P1] (T) dos cobros casi juntos de 50 y de 100 sobre el mismo turno dejan 150 cobrado: el servidor suma el monto que entra a lo guardado, en una transacción, y el cobro no escribe por el SDK del navegador · fuente: D-344, REV 7
- [P2] (T) leerMonto da 1500 con «1,500» y con «1500», 150.5 con «150.5», e inválido con «1.500» y con «1,50» · fuente: D-344, REV 8 (corrido: «1,500» daba 1,5)
- [P3] (T) un turno pagado con menos que el precio cuenta como ingreso lo cobrado, y en la agenda, el Resumen y Pagos el ingreso es lo cobrado más lo pendiente · fuente: D-344, REV 17

## R · La reserva, el horario, la primera carga y el oscuro (T)

- [R1] (T) POST /api/book responde 4xx sin escribir con la fecha «2026-02-31», con la hora «09:07» en un servicio de grilla de media hora y con una fecha y hora pasadas · fuente: D-346, REV 14 (corrido: «2026-02-31» pasaba)
- [R2] (T) guardar en el CRM el horario de una persona que no está en config.staff la agrega ahí con ese horario, y la reserva lo aplica · fuente: D-346, REV 13
- [R3] (T) la rama contact de sendNotification en api/index.ts escapa name, email, subject y message: un name «<a href="https://x">Ver</a>» llega como texto · fuente: D-346, REV 9
- [R4] (T) con la primera lectura de Firestore tardando 2,5 s, la web y /admin no muestran «לא ניתן לאמת כרגע את זמינות השירות» y terminan con su contenido; con la lectura sin responder, el aviso aparece recién a los 8 s, con «ניסיון נוסף»; un tenant apagado se sigue mostrando apagado · fuente: D-345, PASO2 (2 de 3 primeras cargas), T src/services/tenant.ts:151-161
- [R5] (T) el oscuro elegido en el panel sigue oscuro al recargar /admin con features.themeToggle en false, y la web pública sigue en el modo del nicho · fuente: D-345, PASO2, T src/components/theme/ThemeProvider.tsx:35-39

## H · El hub (H)

- [H1] (H) guardarConfig lee y escribe config/{id} en una transacción: un horario que el CRM guarda entre la lectura y la escritura queda guardado · fuente: D-346, REV 12
- [H2] (H) bootstrapTenantOwner responde 400 sin escribir con un email de un dominio reservado (example.com, example.org, example.net y sus subdominios; .example, .test, .invalid, .localhost) y resolveOwnerNotificationEmail no devuelve un email así · fuente: D-341, PASO2, H src/lib/admin-bootstrap.ts:33, H src/lib/provisioning.ts:86-92

## W · La demo de punta a punta (T, H; webs)

- [W1] (T, webs) la demo de prueba está desplegada con el commit de B de esta orden (readyState READY) y GET /api/cron/avisos sin Authorization responde 401 · fuente: D-351, PASO2 (hoy 500 «CRON_SECRET not configured»)
- [W2] (H, webs) en el Firestore de producción no hay ningún admin_users con email de un dominio reservado y clientId de la demo · fuente: D-341

## E · Registro (T+H)

- [E1] (T+H) CLAUDE.md de T y de H tienen el párrafo CRM-04 con D-332 a D-351 · fuente: D-332

## Interfaz de prueba (contrato entre los tests de A y el código de B)

`node --experimental-strip-types --test` en T y en H. **Caja negra**, como CRM-03: nada importa `src/*`, `api/*` ni `scripts/*` de forma estática.
- En T, el CRM se carga por Vite con un arnés propio, `tests/orden/crm-04/_crm.ts`, copia editable de la de CRM-03 con los dos huecos de D-348 cerrados. Ya trae el reloj fijo, el salón de prueba y Firebase en memoria. Le suma lo de `diseno/crm-04/abrir.mts`:
  - el parámetro de idioma, por `preferred_language`;
  - el oscuro, por el botón del pie;
  - los datos de `CRM04_EXTRA`: el servicio de precio 0, el turno t11 de 15 min y el rebote l5;
  - los de `CRM04_TRATO`: גלית "f", יוסי "m", טל sin trato.
- Ningún test sale a la red salvo W1 y W2.

| hueco del contrato | forma |
|---|---|
| `T src/components/admin/crm03/textos-pantallas.ts` | `segun(formas: { f, m, n }, trato?: "f"\|"m"\|"n"\|null, d?: string) → string`; `tp().cust.trato` = `{ label, help, f, m, n }`; `motivoDeAviso(error) → string` |
| `T src/types.ts` · `src/services/customers.ts` | `Customer.trato?: "f"\|"m"\|"n"`; `upsertByEmail({ …, trato? })`; `updateCustomer(id, Partial<Pick<Customer, "notes"\|"tags"\|"phone"\|"trato">>)` |
| `T src/lib/api/avisos-handler.ts` | `manejarAvisos(req, deps)` como en CRM-03. Cambian dos cosas: `deps.enviar` devuelve `{ id } \| null \| { limite: true }` (429); `deps.marcar(refId) → Promise<boolean>` crea la marca y da `false` si ya existía |
| `T src/lib/cobros.ts` | `leerMonto(texto) → number \| null` (null = inválido); el cobro manda `{ montoCents }` (lo que entra ahora) y el servidor suma |
| `H src/lib/admin-bootstrap.ts` · `src/lib/provisioning.ts` | `bootstrapTenantOwner` y `resolveOwnerNotificationEmail` como hoy, con el rechazo de H2 |
| `H src/lib/guardar-config.ts` | `guardarConfig(clientId, body, { db?, quien? })` como hoy, sobre `db.runTransaction` |

A elige, y lo escribe acá antes del rojo, cómo se afirma cada una de estas:
- Q1, G5 y la parte de reglas de D-343: no hay emulador, así que se lee la fuente de `firestore.rules`, como `tests/contacto-pie-casillas.test.ts` lee el árbol.
- Q2 y Q4, que viven en `api/index.ts` y `server.ts`: leer la fuente o pedirle a B una función pura que las dos rutas llamen (como `guardarConfig`, D-255).
- I3 y M8, el sentido de una flecha.
- R4, la demora de la primera lectura, con el doble de Firestore.

### La elección de A (sesión A, 2026-10-20)

**Los archivos.** En T, `tests/orden/crm-04/`: `_crm.ts` (el arnés), `_reglas.ts` (las reglas evaluadas), `_firebase/{app,auth,firestore}.ts` (copias editables de los dobles de CRM-03), `_comun.ts`, `i`, `m`, `g`, `n`, `q`, `p`, `r`, `w` y `e.test.ts`. En H: `_comun.ts`, `h`, `w` y `e.test.ts`. `_comun.ts`, `e.test.ts` y `HOJA.md` son iguales en T y en H (`cmp`). Ningún test importa `src/*`, `api/*` ni `scripts/*` de forma estática: en T los módulos se cargan por Vite (`ssrLoadModule` o `import()` dentro de la página), y en H con el cargador de `.ts`/`.tsx` copiado de CRM-03. Cada test junta sus fallas y termina con UNA aserción (`ERR_ASSERTION`); un paso que lanza queda escrito como falla, nunca como error suelto.

**El parche no trae dos archivos.** `PROTO-5-acumulado.patch` (sha256 `f92ab8b9…ad30c`) es el `git diff` del clon de diseño y no lleva los dos archivos nuevos que importa: `src/components/admin/crm03/textos.ts` (sha256 `2a7b62c9…ab834d`) y `src/components/admin/crm03/textos-pantallas.ts` (sha256 `fa7219aa…b9331`). Están en `diseno/crm-04/t/` y son los del prototipo aprobado: el `git diff` de ese clon es igual byte a byte al parche (`cmp`, 2026-10-20) y los dos archivos son anteriores al parche. B aplica el parche y copia esos dos archivos tal cual, y lo dice con su sha256 en el commit.

**El arnés (`_crm.ts`).** Es una copia de `../crm-03/_crm.ts` con los dos huecos de D-348 cerrados en `medirPantalla`:
1. Una caja que se pasa del ancho de la pantalla cuenta aunque `html` y `body` la recorten con `overflow-x: clip`. Sólo la esconde un ancestro de la página que recorta en x y está él mismo dentro de la pantalla (un carrusel, una tira con scroll).
2. Lee `oklch()`, `oklab()` y `color(srgb | srgb-linear | display-p3 …)`.

Le suma lo de `abrir.mts`:
- el idioma, por `preferred_language`;
- el oscuro;
- `extra` (CRM04_EXTRA) y `trato` (CRM04_TRATO);

y lo que piden estos tests:
- un tamaño de ventana cualquiera;
- respuestas de `/api/*` demoradas;
- un script propio al cargar;
- el estado del Firestore en memoria: `demora` (ruta → ms | "nunca", sobre `getDoc` y `getDocFromServer`) y `fallar` (rutas cuyas escrituras se rechazan).

El almacenamiento se siembra una vez por pestaña, así recargar conserva lo que guardó el panel (R5). El menú se recorre por posición (las doce entradas de la dueña, en el orden de `AdminDashboard`), en cualquier idioma.

Probado con las dos mutaciones, en un clon de T con el parche (inciso ae), 2026-10-20:
- **La tarjeta rusa de 406 px a 390.** Con el parche, quitar sólo `grid-cols-1` ya no ensancha la tarjeta: queda en 358 px, porque la sostienen las otras correcciones del prototipo (la pastilla que baja de línea, la fila de acciones en grilla). Por eso la mutación es la caja de 406 px forzada (`[&>li:first-child]:min-w-[406px]` en la `<ol>` de la agenda). `medirPantalla` de CRM-04 la marca (`li … [16, 422]`). La de CRM-03 sólo marca tres precios sueltos y no la tarjeta.
- **«ביטול התור» con el texto del color de su fondo** (`text-white` → `text-red-700`). CRM-04 lo marca: 1,00. CRM-03 no lo marca. Sin la mutación, CRM-04 no marca nada y CRM-03 marca el falso 1,04.

**Q1 y G5, las reglas.** No hay emulador. `_reglas.ts` interpreta el lenguaje de reglas sobre `firestore.rules` y responde `permitido(op, ruta, { auth, datos, guardado, docs })`:
- la estructura: `match` con comodines, `function` con `let`;
- las expresiones: `&& || ! == != < <= > >= in is + - * / % ?:`, rutas con `exists()`/`get()`;
- los métodos de mapas, listas y textos: `keys`, `values`, `size`, `hasAll`, `hasAny`, `hasOnly`, `get(k, d)`, `diff().affectedKeys()…`, `toSet`, `matches`.

Un error de evaluación niega, como en Firestore. Algo que el intérprete no entiende lanza con su nombre y el test lo registra como falla. Probado en las dos direcciones:
- con las reglas de hoy, la empleada escribe `config` y `trato: "x"` pasa;
- con una corrección escrita a mano (`isOwnerOrManager` en config, `diff(...).affectedKeys().hasOnly([...])` para staff, `'trato' in d`), es al revés.

Q1 afirma:
- `config`: create y update de owner y manager se aceptan; los de staff, y el delete de staff, se rechazan;
- `customers`: staff actualiza cada campo de D-343 y todos juntos; no actualiza `stage`, `email`, `source`, `visitCount`, `createdAt` ni `clientId`;
- owner y manager actualizan `stage`.

G5 afirma: create y update con `trato` "f", "m" o "n" se aceptan; sin `trato`, el create se acepta; con "x", "F", "", 1, null o ["f"], los dos se rechazan.

**Q2, Q3 y Q4: funciones puras que B escribe y las dos rutas llaman** (como `guardarConfig`, D-255):
- **Q2:** `T src/lib/admin-users.ts` exporta `rutaPermitida(rol, metodo, ruta) → boolean`.
  - `staff` → false en GET `/api/crm-metrics`, GET `/api/admin/users`, `/api/knowledge/*` (los cuatro registros), GET `/api/whatsapp/config`, PATCH `/api/whatsapp/pause`, POST `/api/whatsapp/queue-message` y POST `/api/stock/migrate`.
  - `staff` → true en GET `/api/tasks`, GET `/api/admin/me`, POST `/api/appointment/notify` y GET `/api/crm/appointments`.
  - `owner` y `manager` → true.
- **Q3:** `T src/lib/api/notify-booking-handler.ts` exporta `destinatarioDeTurno(db, { clientId, appointmentId }) → Promise<string | null>`: el `customerEmail` guardado en `appointments/{appointmentId}` si es de ese cliente; si no, null.
- **Q4:** `T src/lib/entrada-equipo.ts` exporta `primeraEntrada(invitacion, { sincronizar, activar, ahora })`.
  - Con `status: "pending"`, sincroniza primero; sólo si eso no lanza ni da `synced: false`, llama `activar({ status: "active", acceptedAt: <Date> })`.
  - Una invitación activa no se toca.
  - No lanza.

**El cableado (Q2, Q3, Q4).** En `api/index.ts` y en `server.ts`, la llamada `app.<método>("<ruta>", …)` de cada ruta llama la función: directo, o por una función que el registro llama, del mismo archivo o de un módulo importado, hasta tres niveles. Se lee con el AST de TypeScript, como CRM-03 N5. Además:
- `/api/appointment/notify` no lee `appt.customerEmail` ni un `customerEmail` de `req.body`;
- en `server.ts`, `/api/admin/me` no usa `toISOString` ni `activarInvitacion(`, porque la fecha va como timestamp.

Probado en un clon con un arreglo mínimo (Q1 a Q4 en verde): `rutaPermitida` dentro de `requireAdminAuth` alcanza, porque las diez rutas de Q2 lo llaman en los dos runtimes.

**I3 y M8, el sentido de una flecha.** Se muestrean los trazos del SVG del control (`getPointAtLength`) y se pasan a la pantalla con `getScreenCTM()`, que incluye las transformaciones CSS (`rotate-180` incluido). La punta es la x media de los puntos de la mitad vertical frente a la de los extremos.

Los controles se buscan por su nombre (`aria-label` + texto, con el `sr-only`):
- «siguiente»: `next|הבא|следующ|التالي`;
- «anterior»: `prev|קודם|предыдущ|السابق`;
- «volver»: `back to|חזרה|назад|К сообщениям|العودة`.

Siguiente apunta a la derecha en en y ru, y a la izquierda en he y ar; volver, al revés. Hay 45 avisos sembrados para que el Registro tenga páginas.

**R4, la demora de la primera lectura.** El doble demora `getDoc`/`getDocFromServer` de `clients/<id>` y `config/<id>` 2500 ms, o no responde nunca («nunca»). Anota cuándo empezó la primera lectura (`inicioLectura`), y la página anota cuándo apareció el aviso (`MutationObserver`). «Recién a los 8 s» es aviso − inicio ≥ 7500 ms, medido desde la lectura y no desde la navegación: en frío Vite tarda varios segundos en servir los módulos.

El apagado es `clients/<id>.status = "suspended"` con la lectura en 2,5 s, y su texto es `admin.suspended.title` («השירות אינו זמין זמנית»). El contenido es `aside nav button` en /admin y `#hero, main h1` en la web. Probado en un clon con un arreglo mínimo (plazo de 8 s y «ניסיון נוסף»): pasa.

**Otras elecciones:**
- **N.** `deps.marcar(refId)` recibe un id por aviso (el test acepta cualquiera que termine en `_<turnoId>` o sea el id del turno).
  - El modelo de `avisosDe` en el test cuenta como hecho sólo «sent», como la ruta de hoy: lo único que evita duplicados es la marca.
  - N3 y N5 corren `crearRutaAvisos` con un Firestore en memoria (`dbMemoria` de `_comun.ts`) y el reloj de `node:test` (`mock.timers`, sólo `Date`).
  - N4 no afirma nada del turno que recibió el 429 (la hoja no lo dice; con la marca antes del envío queda marcado, el techo de D-342 2).
  - N6: «nombra esa fecha» = el asunto lleva «20.10», «20/10», «20 באוקטובר» o «2026-10-20».
  - Probado en un clon con un arreglo mínimo: N1 a N6 en verde.
- **P1.** El PATCH de cobro manda `{ montoCents, paymentMethod }`. `dbMemoria` corre las transacciones como Firestore: optimistas, y se repiten si un documento leído cambió antes del commit. Fuera de una transacción, dos cobros a la vez se pisan.
- **P3.** La agenda se mide en pantalla (el «הכנסה» del día). El Resumen y Pagos se miden por las funciones de `cobros.ts` que leen (`cuentas`; `cobradoDe` y `saldoDe`).
- **R1.** La grilla es la de la reserva: un servicio de 30 min con el día desde las 09:00. «09:07» no cae en ninguna grilla de 5, 10, 15 ni 30 min. El control es un domingo a más de 60 días del reloj real, a las 10:00, y se acepta.
- **R2.** El config sin `staff`, así el CRM muestra el equipo del preset. Se guarda el domingo de la primera persona desde las 12:00, y con el config que quedó, la reserva rechaza las 10:00 y acepta las 13:00.
- **R3.** Se arma, con un visitante de prueba, cada plantilla de `sendNotification` que usa `data.name` o `data.message`. Las funciones que llama se toman de su declaración en `api/index.ts` o del módulo de donde se importan.
- **I5.** La frase escribe «עملاء محتملون» con la primera letra hebrea (ע). El test busca la palabra árabe «عملاء محتملون». «arrastrar» es arrastrar en cada idioma (`גרר|גרירה|drag|перетащ|اسحب`). Las cuatro primeras etapas se leen como pestañas a 390 y como columnas a 1280; las cinco, en el selector de etapa de la ficha. La quinta sólo se ve con su filtro, como en CRM-03.
- **I2.** «3 مواعيد» se compara con los dígitos pasados a occidentales («٣ مواعيد» cuenta).
- **I1 y G4.** Los datos del salón son las palabras hebreas de los documentos sembrados (de `config`: el catálogo, el equipo y la marca). Una letra sola vale si es la inicial de un dato. G4 busca palabras enteras: en hebreo con un prefijo de una letra (`והשבלמכ`), en ruso por raíz y en árabe con `و`/`ف` delante.
- **Q5.** «El rol no llegó» = `GET /api/admin/me` sin responder. La página graba el menú cuadro a cuadro. Una vez pintado, no se vacía nunca: en el rojo pasó «0 → 12 → 0» en 2 de 5 cargas.
- **M6.** «El nombre accesible» del turno es su `aria-label` o su `title`.
- **W1.** B escribe el registro `T tests/crm-04-demo.json` `{ clientId, deployment, commitT }`. Precondición del árbol (inciso l): el registro existe y su `commitT` desciende del rojo de esta orden y no es el rojo. Después se leen por la API de Vercel el deployment (READY, el commit, el proyecto) y el alias del dominio de la demo, y se hace el GET sin clave (401).
- **W2.** Precondición del árbol: `bootstrapTenantOwner` rechaza `hello@example.com`. Después se lee, sólo lectura, `admin_users` de la demo en el Firestore de producción.

**Satisfacibilidad comprobada fuera de T y de H.** En los clones de prueba, con arreglos mínimos escritos por A sólo para esto, que ni se guardan ni se commitean, pasan: I, M, G1–G3 (con el parche y los dos archivos), G4 (además, con los dos textos de D-352), G5, N, P2, P3, la parte de servidor de P1, Q1–Q4, R1, R4, H1 y H2.

No se comprobó la satisfacibilidad de la parte de navegador de P1, Q5, R2, R5, W1 ni W2: son de pantalla o de la demo, y las escribe B.

**Mutaciones previstas** (para el verde de B y la verificadora; cada una restaurada byte a byte):

| guard | qué se rompe | qué cae |
|---|---|---|
| arnés (D-348) | la tarjeta de la agenda de 406 px en ruso a 390 (con el parche, quitar sólo `grid-cols-1` la deja en 358 px: `[&>li:first-child]:min-w-[406px]` en la `<ol>`, ver § La elección de A) | la medición de «nada fuera» |
| arnés (D-348) | el botón «ביטול התור» con el texto del color de su fondo | la medición de contraste |
| I1 | un texto de la agenda de vuelta en hebreo fijo | I1 en en |
| I5 | «לידים» de vuelta en `he.ts` | I5 |
| M1 | `useModalA11y` fuera del menú | M1 «Escape» |
| G1 | `segun` devolviendo siempre `f` | G1 con "m" |
| G3 | `trato: "n"` mandado al guardar | G3 «no le borra el trato» |
| N2 | la marca después del envío | N2 |
| N3 | `loadDb` antes de mirar la clave | N3 |
| P1 | el total calculado en el navegador | P1 |
| P2 | `parseFloat(texto.replace(",", "."))` de vuelta | P2 |
| R4 | el plazo de 1,5 s sin espera | R4 |
| R5 | `initialTheme` del panel por `themeToggle` | R5 |
| H1 | `set` fuera de la transacción | H1 |
| H2 | el rechazo de dominios reservados quitado | H2 |

**Lo que B escribe:**

| afirmación | archivo | qué |
|---|---|---|
| I, M, G1–G4 | aplicar `diseno/crm-04/PROTO-5-acumulado.patch` sobre T (`git apply`, desde la línea base 47b53a6) y copiar los dos archivos nuevos que el parche no trae (ver § La elección de A); en G4, además, los dos textos árabes de D-352 | D-334..D-339, D-352 |
| G5 | `T firestore.rules`, `src/types.ts`, `src/services/customers.ts` | D-350 |
| N1–N6 | `T src/lib/api/avisos-handler.ts`, `api/index.ts`, `server.ts` | D-342 |
| Q1–Q5 | `T firestore.rules`, `api/index.ts`, `server.ts`, `src/components/admin/AdminDashboard.tsx` | D-343, D-349 |
| P1–P3 | `T src/lib/cobros.ts`, `src/lib/api/crm-appointments-handler.ts`, `src/services/crm-appointments.ts` | D-344 |
| R1–R3 | `T src/lib/booking-validation.ts`, `src/lib/agenda.ts`, `api/index.ts` | D-346 |
| R4, R5 | `T src/services/tenant.ts`, `src/components/theme/ThemeProvider.tsx` (o el tema propio del panel) | D-345 |
| H1, H2 | `H src/lib/guardar-config.ts`, `src/lib/admin-bootstrap.ts`, `src/lib/provisioning.ts` | D-341, D-346 |
| W1, W2 | el Redeploy de la demo y el borrado del documento de la segunda dueña, cada uno con el «sí» de Liam | D-341, D-351 |
| E1 | `CLAUDE.md` de T y de H | el párrafo CRM-04 |

## Notas para las sesiones A y B

**A:**
- **El orden con SIN-ALTA-01.** SIN-ALTA-01 sigue abierta en H: B terminó y faltan la verificadora y la aprobación de Liam. A de CRM-04 abre cuando Liam lo diga. Con dos órdenes vivas en H, la paridad de `tools/` queda diferida (D-61) y `rojo-verde` corre las dos.
- **El commit rojo de T** lleva la línea de crm-03 en `T tests/orden/APROBADAS.md` (D-333). Sin esa línea, el pre-push de T cae en H2 de CRM-03 y no en esta orden.
- **Cada test cae por una aserción** con `ERR_ASSERTION` en el árbol rojo.
- **Las afirmaciones de pantalla** (I, M, G) caen contra T 47b53a6 y pasan con el parche aplicado. A puede comprobarlo antes del rojo en un clon con el parche (inciso ae), nunca en un worktree.

**B:**
- **El parche primero.** B aplica el parche de los prototipos y después escribe lo técnico. T y H van cada uno en su commit, pusheados en el mismo turno.
- **El commit de T tarda unos 40 minutos, y `qa-regresion-seis` necesita el puerto 3000 libre:** B avisa a Liam antes de ocuparlo.
- **La pantalla entera** (incisos ab y ad) se mira con el arnés, en he claro y oscuro a 390, 768 y 1280 y en en/ru/ar a 390, contra los tableros aprobados `diseno/crm-04/proto1…proto5`. Además, con la demo real y el login de Liam (lo hace Liam).
- **Lo que hace Liam, cada paso con su «sí»:** desplegar las reglas de Firestore desde T y H en Railway con `CRON_SECRET`, después el Redeploy de la demo desde la ficha, y por último el borrado de `admin_users/hello@example.com`. B los verifica por estado, no por hash.
- **Lo que no se toca:** CARDCOM-01 sigue abierta en H, así que no se tocan `src/lib/cobro-mensual.ts`, `scripts/cobro-mensual-uno.ts` ni `scripts/cardcom-01.ts`. Los datos de VIDEOS-01 de la demo no se borran ni se cambian.

## Fuera de esta hoja

- **`admin_users` por email** (D-340).
- **R31 fuera del panel.** No se revisaron la web pública y el asistente de reserva, ni los textos del agente de WhatsApp y de la base de conocimiento (fuera de la oferta, D-325). Los mails a la clientela sí se revisaron, y no suponen género en he, ru ni ar (`P5`).
- **El trato del equipo y de las invitaciones** (D-339).
- **El arrastre táctil del calendario.** La salida es «שינוי מועד» (D-313).
- **Las copias promovidas de CRM-03:** no se promueven (Liam, D-333).
- **Los otros seis nichos.** El CRM es el mismo componente y se prueba con el salón de prueba.
- **El gráfico de ingresos diminuto (R6, D-353).** No se reproduce en el DOM; sólo en 2 de 16 capturas de página entera, sin causa verificada.
- **Textos sin uso** en los locales (`accessDeniedDesc`, `newCustomersHint`): no se tocan.
- **El límite real de la cuenta de Resend** (D-342 4) y **la entrega en la bandeja de Gmail.**
