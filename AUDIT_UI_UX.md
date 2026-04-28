# Auditoría UI/UX — Barber Master Template (Nichos)

**Fecha:** 2026-04-26  
**Alcance:** Landing completa → Reserva → Contacto → Galería → Legal → Login Admin → Dashboard Admin  
**Criterios:** Impeccable design laws + ui-ux-pro-max (10 prioridades) + restricciones multi-tenant/i18n del proyecto  
**Regla:** Cero cambios que rompan multi-tenant, i18n paired (en/he), build-per-language, o los 10 preset files.

---

## Tabla de hallazgos por severidad

### CRÍTICO — Rompe contrato de arquitectura o accesibilidad fundamental

| # | Hallazgo | Archivo(s) | Impacto |
|---|----------|-----------|---------|
| C1 | **Admin panel 100% hardcoded en inglés** — Todo el texto del dashboard está en strings literales dentro del JSX. No usa `localeConfig`. Un deploy `he` muestra admin en inglés con `dir="rtl"`, rompiendo completamente la experiencia hebrea. | `AdminDashboard.tsx`, `StaffLogistics.tsx` | i18n roto; deploy hebreo inutilizable en admin |
| C2 | **Idiomas mezclados en auth admin** — `UnauthorizedAdmin.tsx` tiene "Cerrar sesión" (español), `AdminLoginPanel.tsx` tiene "Comprueba en Firebase Console" (español). El resto del admin está en inglés. Tres idiomas en una misma pantalla para un sistema que solo soporta en/he. | `AdminLoginPanel.tsx`, `UnauthorizedAdmin.tsx` | Incoherencia de idioma; strings en español no pertenecen al sistema |
| C3 | **Tenant suspendido: fallback hardcoded en inglés** — `main.tsx` inyecta HTML inline con "Service Temporarily Unavailable" sin pasar por `localeConfig`. Un cliente hebreo suspendido ve inglés. | `main.tsx` | i18n roto en estado crítico de tenant |
| C4 | **Formularios sin `<label>` — solo placeholder** — `QuickInquiry.tsx` y `BookingWizard.tsx` (paso de detalles) usan `placeholder` como única identificación de campos. Sin `<label>`, sin `aria-label`. | `QuickInquiry.tsx`, `BookingWizard.tsx` | WCAG 2.1 violación nivel A (1.3.1, 3.3.2); screen readers no identifican campos |
| C5 | **`<Suspense fallback={null}>` en todas las rutas lazy** — Booking, Admin, Gallery, Legal, StaffProfile, Chatbot: todos cargan con `fallback={null}`. El usuario ve vacío blanco durante la carga del chunk. | `App.tsx` | UX degradada; sin feedback de carga; percepciones de "roto" |

### ALTO — Degradación significativa de UX o inconsistencia de producto

| # | Hallazgo | Archivo(s) | Impacto |
|---|----------|-----------|---------|
| A1 | **Brecha de voz visual: landing vs admin** — Landing usa lenguaje de lujo/premium (tipografía serif, gradientes suaves, tonos dorados). Admin usa temática militar/sci-fi ("Sector Missions", "Tactical Personnel", "Execute Intelligence Sync", "Decommission Slot"). Son dos productos distintos en el mismo deploy. | `AdminDashboard.tsx`, `StaffLogistics.tsx` vs `Hero.tsx`, `Services.tsx` | Experiencia fragmentada; el admin no se siente parte del mismo producto |
| A2 | **Hero stats hardcoded** — Los valores `500+`, `10`, `5.0`, `3` están literales en el JSX. No provienen de `siteConfig` ni de Firestore. Cada tenant muestra los mismos números falsos. | `Hero.tsx` | Multi-tenant: datos genéricos; credibilidad cuestionable |
| A3 | **Signo `$` hardcoded en precios** — Services.tsx y BookingWizard.tsx imprimen `$` directamente. Un deploy israelí debería mostrar `₪`. No hay token de moneda en `siteConfig` ni en `localeConfig`. | `Services.tsx`, `BookingWizard.tsx` | i18n/localización rota para moneda |
| A4 | **Sin estados de error con acción de recuperación** — Booking: error de pago muestra texto rojo sin botón de retry. Admin: fallo de suscripción Firestore no muestra nada. AI analysis: fallo silencioso. QuickInquiry: error genérico sin acción. | `BookingWizard.tsx`, `AdminDashboard.tsx`, `QuickInquiry.tsx` | Usuario atrapado sin camino de salida |
| A5 | **"Verified Mastery" hardcoded** — String literal en Team.tsx, no existe en `en.ts` ni `he.ts`. | `Team.tsx` | i18n: texto inglés aparece en deploy hebreo |
| A6 | **Chatbot FAB sin `aria-label`** — El botón flotante del chat solo tiene un ícono SVG. Sin label accesible. | `Chatbot.tsx` | Accesibilidad: botón invisible para screen readers |
| A7 | **Admin: sin estado de error para suscripciones Firestore fallidas** — `onSnapshot` tiene handler de error que solo hace `console.error`. La UI no refleja el fallo. | `AdminDashboard.tsx` | Admin opera con datos potencialmente stale sin saberlo |
| A8 | **Contraste insuficiente en estados disabled/muted** — Varios componentes usan `opacity-50` o `text-white/60` sobre fondos oscuros, cayendo por debajo de 4.5:1. | `BookingWizard.tsx`, `BusinessHours.tsx`, `AdminDashboard.tsx` | WCAG AA violación (1.4.3) |

### MEDIO — Mejora necesaria, no bloquea funcionalidad core

| # | Hallazgo | Archivo(s) | Impacto |
|---|----------|-----------|---------|
| M1 | **`border-l-2` accent en Team cards** — Violación directa del ban absoluto de Impeccable: "Side-stripe borders > 1px as colored accent on cards." | `Team.tsx` | Patrón de diseño prohibido por framework de diseño |
| M2 | **Admin auth loading: spinner sin texto** — `ProtectedRoute.tsx` muestra solo un spinner animado durante verificación de auth. Sin texto explicativo. | `ProtectedRoute.tsx` | UX ambigua; el usuario no sabe qué espera |
| M3 | **Empty state admin insuficiente** — "No active signals detected for this sector" sin CTA ni guía. Un admin nuevo no sabe qué hacer. | `AdminDashboard.tsx` | Onboarding deficiente |
| M4 | **Mapa es imagen estática** — Location.tsx usa una imagen de Unsplash con un pin SVG overlay. No es un mapa real ni interactivo. | `Location.tsx` | Funcionalidad incompleta; expectativa de usuario no cumplida |
| M5 | **Calendar en admin: sin indicador de "hoy"** — El calendario del sidebar no resalta visualmente el día actual. | `AdminDashboard.tsx` | Orientación temporal reducida |
| M6 | **Toast/notificaciones: sin sistema unificado** — Cada componente maneja feedback inline (divs condicionales). No hay sistema de toast global. | Varios | Inconsistencia de patrones de feedback |
| M7 | **Booking wizard: back navigation pierde estado parcialmente** — Al retroceder pasos, algunos estados se resetean (ej: AI consultation panel). | `BookingWizard.tsx` | Frustración en flujo multi-step |
| M8 | **`cursor-pointer` faltante en elementos clickeables** — Varias cards interactivas y links no tienen `cursor-pointer` explícito. | `Services.tsx`, `Gallery.tsx`, `Team.tsx` | Affordance visual reducida |
| M9 | **ThemeToggle solo visible en mobile** — Desktop no tiene acceso al toggle dark/light. Solo aparece en el menú hamburguesa mobile. | `Navbar.tsx` | Funcionalidad de tema inaccesible en desktop |

### BAJO — Polish, mejoras menores

| # | Hallazgo | Archivo(s) | Impacto |
|---|----------|-----------|---------|
| B1 | **Splash screen: animación letter-by-letter en nombres largos** — Con nombres de negocio largos, la animación se extiende demasiado. Sin cap de duración. | `SplashScreen.tsx` | Micro-interacción subóptima en edge case |
| B2 | **Gallery preview: 6 items fijos** — Siempre muestra exactamente 6 imágenes en preview. Si hay menos, layout roto. | `Gallery.tsx` | Edge case con contenido insuficiente |
| B3 | **Social links: hardcoded `target="_blank"` sin `rel="noopener"`** — En varios componentes con links sociales. | `Team.tsx`, `Footer.tsx`, `QuickInquiry.tsx` | Seguridad menor (tab-nabbing) |
| B4 | **Niche CSS overrides usan `!important`** — Tattoo niche fuerza `border-radius: 0.125rem !important` globalmente. Dificulta customización futura. | `index.css` | Mantenibilidad CSS reducida |

---

## Acciones por archivo

### `src/main.tsx`
- **[C3]** Extraer el bloque de tenant suspendido a un componente `SuspendedTenant.tsx` que consuma `localeConfig`. Agregar keys `suspended.title` y `suspended.message` a `en.ts` y `he.ts`.

### `src/App.tsx`
- **[C5]** Reemplazar `fallback={null}` con un componente `<RouteLoader />` ligero (spinner centrado + texto de `localeConfig`). Mantener la firma `<Suspense fallback={<RouteLoader />}>`.

### `src/components/landing/Hero.tsx`
- **[A2]** Mover stats a `siteConfig.hero.stats` (array de `{ value, label }`). Agregar al tipo `NichePreset`. Actualizar los 10 preset files. Fallback: si no hay stats en config, no renderizar la sección.

### `src/components/landing/Services.tsx`
- **[A3]** Agregar `siteConfig.payment.currencySymbol` (o `localeConfig.currency.symbol`). Reemplazar `$` literal por el token. Actualizar los 10 presets con el símbolo correcto por niche/idioma.
- **[M8]** Agregar `cursor-pointer` a las service cards si son clickeables.

### `src/components/landing/Team.tsx`
- **[A5]** Mover "Verified Mastery" a `localeConfig.team.verifiedBadge`. Agregar key en `en.ts` ("Verified Mastery") y `he.ts` (traducción hebrea).
- **[M1]** Reemplazar `border-l-2 border-[accent]` por un approach alternativo: background tint sutil, leading icon, o eliminar el acento lateral.
- **[M8]** `cursor-pointer` en cards con `onClick`.
- **[B3]** Agregar `rel="noopener noreferrer"` a social links.

### `src/components/landing/QuickInquiry.tsx`
- **[C4]** Agregar `<label>` elements (pueden ser `sr-only` si se quiere mantener el diseño actual). Cada `<input>`/`<textarea>` debe tener un `<label htmlFor>` asociado o `aria-label`.
- **[A4]** Estado de error: agregar mensaje específico + botón de retry.

### `src/components/landing/Gallery.tsx`
- **[M8]** `cursor-pointer` en items de galería.
- **[B2]** Manejar caso de `< 6` imágenes: ajustar grid o mostrar las disponibles sin huecos.

### `src/components/landing/Location.tsx`
- **[M4]** Opción 1: embed Google Maps/Mapbox con coordenadas de `siteConfig.business.coordinates`. Opción 2: si se mantiene imagen, agregar link "Open in Google Maps" con las coordenadas.

### `src/components/booking/BookingWizard.tsx`
- **[C4]** Agregar `<label>` o `aria-label` a todos los inputs del paso de detalles del cliente.
- **[A3]** Reemplazar `$` hardcoded por token de moneda.
- **[A4]** Payment error: agregar botón "Reintentar pago" que vuelva a llamar a `createCheckoutSession`.
- **[M7]** Preservar estado de AI consultation al navegar entre pasos.

### `src/components/admin/AdminDashboard.tsx`
- **[C1]** Extraer TODOS los strings a `localeConfig.admin.*`. Esto implica agregar una sección `admin` completa en `en.ts` y `he.ts`. Reemplazar cada literal por `localeConfig.admin.xxx`.
- **[A1]** Reemplazar terminología militar/sci-fi por lenguaje profesional neutral: "Appointments" en vez de "Sector Missions", "Staff" en vez de "Tactical Personnel", "Run Analysis" en vez de "Execute Intelligence Sync", etc.
- **[A4]** `onSnapshot` error handler: mostrar banner de error en la UI con retry.
- **[A7]** Mismo que A4 — hacer visible el estado de error de suscripción.
- **[M3]** Empty state: agregar CTA contextual ("No hay citas para esta fecha. ¿Revisar otro día?" con botón).
- **[M5]** Resaltar visualmente el día actual en el calendario sidebar.

### `src/components/admin/StaffLogistics.tsx`
- **[C1]** Extraer todos los strings hardcoded ("Commence", "Cease", "Tactical Breaks", "Inactive Sector", etc.) a `localeConfig.admin.staff.*`. Traducir a hebreo en `he.ts`.
- **[A1]** Renombrar terminología: "Start" en vez de "Commence", "End" en vez de "Cease", "Breaks" en vez de "Tactical Breaks".

### `src/components/admin/AdminLoginPanel.tsx`
- **[C2]** Eliminar strings en español ("Comprueba en Firebase Console..."). Mover a `localeConfig.admin.auth.configError`. Traducir en ambos archivos.

### `src/components/admin/UnauthorizedAdmin.tsx`
- **[C2]** Reemplazar "Cerrar sesión" por `localeConfig.admin.auth.signOut`. Agregar key en `en.ts` y `he.ts`.

### `src/components/admin/ProtectedRoute.tsx`
- **[M2]** Agregar texto al loading state: `localeConfig.admin.auth.verifying` ("Verifying access..." / "מאמת גישה...").

### `src/components/chat/Chatbot.tsx`
- **[A6]** Agregar `aria-label={localeConfig.chat.openChat}` al FAB button. Agregar key en ambos locale files.

### `src/components/layout/Navbar.tsx`
- **[M9]** Mover `ThemeToggle` fuera del menú mobile. Opciones: agregarlo al navbar desktop (ícono discreto al final), o al footer.

### `src/components/layout/Footer.tsx`
- **[B3]** `rel="noopener noreferrer"` en links externos.

### `src/components/layout/SplashScreen.tsx`
- **[B1]** Cap máximo de duración total: `Math.min(name.length * delay, 2000)`.

### `src/config/locales/en.ts` y `he.ts`
- **[C1][C2][C3][A5][A6]** Agregar secciones: `admin` (dashboard, staff, auth), `suspended` (title, message), `team.verifiedBadge`, `chat.openChat`, `currency.symbol`. Mantener paridad estricta entre ambos archivos. Correr `verify:locales` después.

### `src/index.css`
- **[B4]** Reemplazar `!important` en niche overrides por mayor especificidad de selector (ej: `html[data-niche="tattoo"] .card` en vez de override global).

---

## Resumen ejecutivo

| Severidad | Cantidad | Tema principal |
|-----------|----------|---------------|
| Crítico | 5 | i18n roto en admin + accesibilidad de formularios + loading states ausentes |
| Alto | 8 | Voz visual inconsistente + hardcoded values + sin error recovery |
| Medio | 9 | Patrones de diseño + feedback + funcionalidad incompleta |
| Bajo | 4 | Polish y edge cases |

**Patrón dominante:** El admin panel es el área más dañada — concentra C1, C2, A1, A4, A7, M3, M5. Un sprint dedicado a "admin i18n + normalización de voz" resolvería ~40% de los hallazgos.

**Segundo patrón:** Los formularios (booking + contacto) necesitan labels accesibles y estados de error con recovery — C4 + A4 cubren el flujo principal de conversión del negocio.

**Restricción respetada:** Ninguna acción propuesta modifica la lógica de multi-tenant, el middleware chain, las Firestore rules, ni la estructura de los 10 preset files (solo se proponen adiciones de keys, no reestructuración).
