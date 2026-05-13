# master-template — CLAUDE.md

Web template madre para Arzac Studio. Cada cliente recibe un deploy de este template en Vercel con su propio subdominio. Propietario: Liam Arzac | website@arzac.studio Empresa: Arzac Studio | arzac.studio

## Convenciones de trabajo

- No crear worktrees ni ramas separadas salvo que se pida explícitamente.
- Todos los cambios deben aplicarse directamente en los archivos del proyecto.

## Contexto del negocio

Template base para webs de negocios locales en Israel. Cada deploy es una web independiente para un nicho comercial específico. El cliente NO tiene acceso al código — recibe acceso a su web y panel admin. Modelo de venta: Liam construye la web primero, la muestra al cliente con tour interactivo, luego la vende.

## Stack técnico

* Frontend: React 19 + Vite 6 (SPA, NO Next.js)
* Server: Express 4 (server.ts, ejecutado con tsx)
* Estilos: Tailwind CSS v4 (^4.1.14) con @tailwindcss/vite
* IA Chatbot: Gemini (via GEMINI_API_KEY, responde 24/7)
* Pagos: Stripe (checkout sessions + webhooks)
* CRM / Turnos: sistema de reservas integrado con validación server-side
* Emails: Resend (confirmaciones de turno, recordatorios)
* Base de datos: Firebase Firestore (colecciones flat con campo clientId)
* Auth admin: Google OAuth via Firebase Auth (email match contra VITE_ADMIN_EMAIL)
* Deploy: Vercel — cada cliente es un proyecto separado
* Dominio cliente: [negocio].arzac.studio (subdominio)
* Tour interactivo: driver.js (^1.4.0)
* Animaciones: motion (^12.23.24)
* Charts: recharts (^3.8.1)

## Concepto de personalización

El template usa un sistema de temas visuales por nicho:

### Temas disponibles (src/config/presets/themes.ts)

* **Barbería**: barberia-classic (default), barberia-urban, barberia-vintage
* **Tattoo**: tattoo-ink (default), tattoo-neo-traditional, tattoo-fine-line
* **Nails**: nails-rose (default), nails-lavender, nails-noir
* **Estética**: estetica-lumiere (default), estetica-frost, estetica-botanical

* isDemoMode: controlado por `VITE_DEMO_MODE` env var (default true). Demo = tour + auth bypass + datos CRM ficticios. Producción (false) = auth real + Firestore real
* businessMode: "solo" (un profesional) o "team" (varios). Solo mode oculta staff tab en admin, muestra "About" en vez de "Team" en nav, y elimina columna staff de la tabla de turnos

## Nichos implementados

4 nichos, cada uno con presets en inglés, hebreo y ruso (src/config/presets/):

* **barberia** — servicios, galería, sistema de turnos, precios
* **estetica** — tratamientos, equipo, antes/después
* **tattoo** — portfolio, artistas, estilos, reservas
* **nails** — galería, servicios, agenda

Cada nicho tiene secciones que se activan/desactivan con booleanos en config.

## Variables de entorno

### Build-time (VITE_*, disponibles en el browser)

```
VITE_ACTIVE_NICHE=            # barberia|estetica|tattoo|nails
VITE_UI_LANGUAGE=             # he|en|ru (idioma por defecto; el usuario puede cambiar en runtime)
VITE_CLIENT_ID=               # identificador del tenant
VITE_DEMO_MODE=               # true (default)|false — controla tour, auth bypass, datos demo
VITE_ADMIN_EMAIL=             # email con acceso al admin panel
VITE_STRIPE_PUBLISHABLE_KEY=  # Stripe frontend key
VITE_THEME=                   # override de tema (ej: barberia-urban)
VITE_FIREBASE_DATABASE_ID=    # ID de base Firestore
```

### Runtime (process.env, solo server.ts)

```
CLIENT_ID=                    # (alt: NEXT_PUBLIC_CLIENT_ID, VITE_CLIENT_ID)
GEMINI_API_KEY=               # Google Gemini AI
STRIPE_SECRET_KEY=            # Stripe backend
STRIPE_WEBHOOK_SECRET=        # Stripe webhook verification
EMAIL_PROVIDER_API_KEY=       # Resend API key
EMAIL_FROM_ADDRESS=           # dirección de envío (default: onboarding@resend.dev)
BUSINESS_OWNER_EMAIL=         # destinatario notificaciones
BOOKING_NOTIFICATION_EMAIL=   # fallback a BUSINESS_OWNER_EMAIL
CONTACT_NOTIFICATION_EMAIL=   # fallback a BUSINESS_OWNER_EMAIL
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
FIREBASE_DATABASE_ID=         # (alt: VITE_FIREBASE_DATABASE_ID)
PAYMENT_PROVIDER=             # stripe|meshulam|yaadpay|authorize_net|square|other
APP_URL=                      # base URL del deploy
ALLOWED_ORIGINS=              # CORS whitelist (comma/space separated)
```

## Rutas del server (Express, server.ts)

```
GET  /api/health              → health check + clientId
GET  /api/tenant/status       → estado del cliente, payment provider
POST /api/ai/analyze          → análisis IA (strategic/style/crm)
POST /api/ai/chat             → chat conversacional con Gemini
POST /api/contact             → formulario contacto → contact_inbox + email
POST /api/notify-booking      → notificación de reserva (non-Stripe)
POST /api/create-checkout-session → sesión Stripe checkout
POST /api/webhook             → Stripe webhook (checkout.session.completed/expired)
```

## Colecciones Firestore (FLAT, no nested)

Todas las colecciones son root-level con campo `clientId` para filtrar por tenant:

* `appointments` — reservas/turnos
* `customers` — perfiles de clientes del negocio
* `contact_inbox` — mensajes del formulario de contacto
* `provider_messages` — mensajes soporte entre cliente y Liam
* `notification_logs` — audit trail de emails enviados
* `staff_overrides` — overrides de horarios por miembro de staff
* `clients` — metadata/status del tenant (leído por server para kill-switch)
* `config` — overrides de configuración por cliente (deep merge sobre preset)
* `tenantConfig` — configuración de negocio por cliente

## Services (src/services/)

* `db.ts` — CRUD de appointments, disponibilidad, staff, business rules, booking transaccional
* `customers.ts` — CRUD clientes del negocio, IDs basados en hash de email
* `inbox.ts` — suscripción real-time a contact_inbox, CRUD mensajes
* `support.ts` — suscripción real-time a provider_messages, CRUD
* `notificationLogs.ts` — suscripción real-time a notification_logs, archive
* `ai.ts` — llamadas a /api/ai/* para análisis estratégico, estilo, CRM
* `tenant.ts` — carga config desde Firestore, detección de niche

## Product Tour (driver.js)

Archivo de configuración: `src/config/tour.config.ts`

```typescript
export const TOUR_CONFIG = {
  isDemoMode: true,        // false cuando el cliente compra
  language: "he",          // viene de VITE_UI_LANGUAGE
  showTourButton: true,    // botón flotante para repetir
}
```

Traducciones: `src/config/tour.translations.ts` — hebreo, inglés, español

Pasos del tour:
0. Modal bienvenida — explica que es una demo, no parte de la web final
1. Hero — cara del negocio en internet
2. Servicios — cada servicio editable con precio
3. Sistema de turnos — click en "הזמן תור", CRM explicado
4. Secciones landing (whyChooseUs, team, gallery, testimonials, contact, businessHours, location)
5. IA chatbot — interacción real, responde 24/7
6. Transición a admin — "veamos lo que pasa detrás de escena"
7. Tour CRM — overview, appointments, customers, inbox, staff, rules
8. Cierre — botón "Quiero esta web" → redirige a arzac.studio/pago/[clientId]

localStorage key: `tourCompleted_[clientId]`
Botón flotante: ícono Compass, bottom-right, solo si isDemoMode === true

## Admin Panel (/admin)

* Auth: Google OAuth via Firebase Auth
* Acceso: email del usuario debe coincidir con `VITE_ADMIN_EMAIL` (case-insensitive)
* Si no coincide: muestra componente UnauthorizedAdmin
* Firebase Console requiere: Google sign-in habilitado + dominio autorizado
* En demo mode (isDemoMode === true): bypass de auth, Firestore subscriptions deshabilitadas

## CRM y sistema de turnos

* Cliente reserva desde la web → llega al panel admin del negocio
* Validación server-side con daily_manifests para evitar colisiones
* Email de confirmación via Resend al cliente
* Recordatorio 24hs antes via Resend
* Cancelación notifica al cliente
* Vista de agenda del día en panel admin
* Base de datos de clientes se actualiza con cada reserva

## Gemini Chatbot

* Modelo: `gemini-2.5-flash` (actualizado desde 1.5-flash, que fue deprecado por Google)
* Endpoint: `POST /api/ai/chat` en server.ts
* Responde preguntas sobre el negocio (horarios, servicios, precios)
* Entrenado con info específica del negocio (nombre, servicios, horarios, ubicación)
* Recibe `businessContext` completo: services, staff, hours, contact, cancellationPolicy
* Soporte opcional de `brand.aiPersona` para personalidad custom
* Responde en el idioma del cliente (detecta automáticamente)
* Si no sabe algo, lo dice — no inventa información
* Si `GEMINI_API_KEY` no está configurada, retorna HTTP 503 y el chatbot muestra mensaje amigable

## i18n (runtime language switching)

* **3 idiomas soportados**: English (`en`), עברית (`he`), Русский (`ru`).
* `VITE_UI_LANGUAGE` define el idioma por defecto al cargar. El usuario puede cambiar en runtime via el LanguageSwitcher.
* La preferencia del usuario se guarda en `localStorage("preferred_language")` y se restaura en recargas.
* **Locale files**: `src/config/locales/en.ts`, `he.ts`, `ru.ts`. Keys deben mantenerse en sync entre los 3.
* **Presets por nicho**: `src/config/presets/*.{en,he,ru}.ts` (5 nichos x 3 idiomas = 15 archivos)
* **RTL/LTR dinámico**: Hebreo setea `dir="rtl"` en `<html>`, English y Russian setean `dir="ltr"`. Cambia en runtime.
* **Mecanismo de switching**: `setLocale()` muta `localeConfig` (singleton mutable), `switchSiteLanguage()` muta `siteConfig`. `LanguageContext` dispara re-render del árbol React completo.
* **LanguageSwitcher**: Componente globe dropdown en Navbar (landing) y AdminDashboard (CRM). Prop `variant` controla colores light/dark.

## Firestore tenant customization (config/{clientId})

El documento `config/{clientId}` en Firestore permite personalizar cada deploy sin tocar código. Se aplica via `applyTenantConfigOverride()` al bootstrap y sobrevive cambios de idioma en runtime.

### Campos seguros para override

* `features` — toggles de secciones (showHero, showServices, showTeam, etc.)
* `payment` — modo de pago, montos, provider
* `notifications` — toggles de alertas
* `adminEmail` — email del admin
* `splash` — splash screen config (enabled, durationMs, variant 1-5)
* `activeTheme` — ThemeId override

### visibleServices

Array de IDs de servicio. Filtra qué servicios se muestran y en qué orden. Las imágenes se sincronizan automáticamente (services[i] ↔ images[i]).

```
// Firestore: config/{clientId}
{ visibleServices: ["haircut", "beard-trim", "hot-towel"] }
```

### serviceOverrides

Parches individuales por servicio (keyed by service ID). Permite cambiar nombre, precio, descripción, duración o imagen sin reemplazar todo el array.

```
// Firestore: config/{clientId}
{
  serviceOverrides: {
    "haircut": { name: "Corte Premium", price: "$45", image: "https://..." },
    "beard-trim": { duration: "20 min" }
  }
}
```

El campo `image` patchea `sections.services.images[i]` (array paralelo).

Orden de aplicación: primero `visibleServices` filtra, luego `serviceOverrides` patchea.

### Splash screen variants

5 variantes de splash seleccionables por cliente (`splash.variant: 1-5` en Firestore). Archivos en `src/components/layout/splash/`:

1. **Classic** (SplashClassic) — logo clip-path reveal + letras staggered + línea accent
2. **Curtain** (SplashCurtain) — dos paneles se abren como telón revelando la marca
3. **Pulse** (SplashPulse) — onda radial desde el centro + logo materializa
4. **Typewriter** (SplashTypewriter) — nombre escrito carácter a carácter con cursor
5. **Vortex** (SplashVortex) — partículas orbitales que convergen hacia el logo

Todas leen branding de `siteConfig` (logo, brand.name, colores accent). El router está en `SplashScreen.tsx` que delega al componente correspondiente.

## Reglas de desarrollo

1. El template es la base — cada nicho extiende sin romper la estructura
2. Las secciones se activan/desactivan con booleanos en config, nunca con código condicional complejo
3. Los design tokens van en variables CSS, nunca hardcodeados
4. isDemoMode === false elimina completamente el tour — ni rastro en el DOM
5. El chatbot de Gemini NUNCA inventa información — solo responde con lo que tiene configurado
6. Todos los emails salen via Resend (EMAIL_PROVIDER_API_KEY)
7. El panel admin del negocio es independiente del dashboard de Liam (nichos-hub)
8. Cada cliente es un proyecto Vercel separado con sus propias env vars
9. Env vars del browser usan prefijo VITE_*, nunca NEXT_PUBLIC_*
10. Colecciones Firestore son flat (root-level), no nested bajo clients/

## Archivos clave

### Config
* `src/config/env.ts` — resuelve VITE_* env vars en objeto `env`
* `src/config/site.ts` — merge de niche preset + BASE_CONFIG → `siteConfig`
* `src/config/tenant.ts` — resolución de clientId y estado del tenant
* `src/config/locale.ts` — singleton mutable `localeConfig` + `setLocale()` para runtime switching
* `src/config/localeTypes.ts` — tipo `LocaleConfig` unificado de los 3 locales
* `src/config/uiLanguage.ts` — tipo `UiLanguage` ("he"|"en"|"ru") + resolver build-time
* `src/contexts/LanguageContext.tsx` — LanguageProvider + useLanguage hook (runtime switching)
* `src/components/ui/LanguageSwitcher.tsx` — dropdown globe para cambiar idioma
* `src/config/legalContent.ts` — templates legales por nicho
* `src/config/presets/themes.ts` — registro de 12 temas (THEME_REGISTRY)
* `src/config/tour.config.ts` — configuración del product tour
* `src/config/tour.translations.ts` — traducciones del tour (he/en/es)

### Componentes
* `src/components/ProductTour.tsx` — componente principal del tour
* `src/components/TourButton.tsx` — botón flotante para repetir
* `src/components/chat/Chatbot.tsx` — chatbot de IA (panel flotante)
* `src/components/ui/BrandLogo.tsx` — logo con soporte `logo`/`logoDark` + fallback Lucide icon
* `src/components/layout/Navbar.tsx` — nav con soporte solo mode (label override)
* `src/components/admin/AdminDashboard.tsx` — CRM con tabs condicionales por businessMode

### Server
* `server.ts` — Express server con API routes, middleware, rate limiting, CORS

### Design System
* `PRODUCT.md` — contexto de producto, usuarios, principios estratégicos, workflow de branding
* `DESIGN.md` — sistema de diseño completo: tokens, tipografía, elevación, componentes, reglas
* `DESIGN.json` — sidecar con snippets de componentes, ramps tonales, motion tokens

### Operaciones
* `OPERATIONS.md` — guía definitiva: crear demos, convertir a producción, env vars, troubleshooting

## Responsive design

Breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px).

### Reglas obligatorias

1. **Mobile-first**: todo componente debe funcionar en 320px. Usar breakpoints progresivos `sm:` → `md:` → `lg:`, nunca saltar de mobile directo a `lg:`
2. **Touch targets**: mínimo 44x44px (`h-11 w-11`) para botones interactivos (iconos, social links, hamburger menu, close buttons)
3. **Padding progresivo**: usar `px-3 py-5 sm:px-6 sm:py-6 md:p-12` en lugar de padding fijo grande
4. **Tablas en mobile**: agregar `overflow-x-auto` al wrapper + `min-w-[600px]` a la tabla para scroll horizontal
5. **Grids adaptativos**: usar `grid-cols-1 sm:grid-cols-2 md:grid-cols-3` en vez de saltar a 3 columnas
6. **Chatbot mobile**: fullscreen con `w-[calc(100vw-1.5rem)] h-[calc(100vh-5rem)]`, desktop con dimensiones fijas `sm:w-[380px] sm:h-[600px]`
7. **CRM mobile-counter**: el CRM se usa desde el celular detrás del mostrador. Priorizar usabilidad con una mano

### Patrones establecidos

* Admin tabs: `text-[9px] px-2.5 sm:text-[10px] sm:px-4` con `gap-1 p-1 sm:gap-1.5 sm:p-1.5`
* Action buttons (icon-only mobile): `h-11 w-11 items-center justify-center` con `size={15}`
* Chart margins: `left: -16` mobile, `left: -24` desktop
* Booking time slots: `grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3`

## CRM features

### Registro walk-in (sin reserva)
* `CustomersTab.tsx` permite registrar clientes que llegan sin turno web
* Formulario inline con nombre, email, teléfono
* Crea customer + appointment con `source: "walk-in"` y `status: "completed"`
* Labels i18n: `walkInCustomer`, `registerWalkIn`, `walkInName/Email/Phone`, `walkInRegistered`

### AI enrichment
* `ai.ts` exporta `analyzeForCRM()` que incluye contexto enriquecido del negocio
* Incluye: servicios activos, miembros del equipo, horarios, reglas de negocio
* El chatbot de la landing recibe contexto completo del negocio para respuestas precisas

### Manifest cleanup
* `db.ts` incluye `cleanupStaleManifests()` para limpiar daily_manifests expirados
* Previene accumulation de datos stale en Firestore

### Demo data (demo mode)
* En demo mode, el CRM se pre-carga con datos de ejemplo realistas
* Appointments: turnos de ejemplo con distintos estados (confirmed, completed, cancelled)
* Customers: clientes ficticios con historial de visitas y notas
* Inbox: mensajes de ejemplo mostrando tipos de consultas típicas
* Overview: métricas calculadas a partir de los datos demo
* Los datos demo NO se persisten en Firestore — solo existen en memoria

### Brand logo system
* Preset brand config soporta: `logo` (fondo claro), `logoDark` (fondo oscuro), `logoIconName` (fallback Lucide)
* BrandLogo component resuelve: logoDark/logo → img tag, sino → Lucide icon
* Logos SVG se sirven desde `public/` (ej: `public/logo-onyx-steel.svg`)
* Demo barbería usa logo "ONYX & STEEL" con icono de tijeras en amber (#d97706)
