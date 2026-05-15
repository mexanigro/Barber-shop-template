# master-template — CLAUDE.md

Web template madre para Arzac Studio. Cada cliente recibe un deploy de este template en Vercel con su propio subdominio. Propietario: Liam Arzac | website@arzac.studio Empresa: Arzac Studio | arzac.studio

## Convenciones de trabajo

- No crear worktrees ni ramas separadas salvo que se pida explicitamente.
- Todos los cambios deben aplicarse directamente en los archivos del proyecto.
- No enviar screenshots al chat salvo que el usuario lo pida explicitamente.
- El idioma del usuario es espanol; comentarios de codigo y commits pueden ser en ingles.

## Contexto del negocio

Template base para webs de negocios locales en Israel. Cada deploy es una web independiente para un nicho comercial especifico. El cliente NO tiene acceso al codigo -- recibe acceso a su web y panel admin. Modelo de venta: Liam construye la web primero, la muestra al cliente con tour interactivo, luego la vende.

## Stack tecnico

* Frontend: React 19 + Vite 6 (SPA, NO Next.js)
* Server: Express 4 (server.ts, ejecutado con tsx)
* Estilos: Tailwind CSS v4 (^4.1.14) con @tailwindcss/vite, CSS custom properties con `data-niche` y `data-theme`
* IA Chatbot: Gemini (via GEMINI_API_KEY, responde 24/7)
* Pagos: Stripe (checkout sessions + webhooks)
* CRM / Turnos: sistema de reservas integrado con validacion server-side
* Emails: Resend (confirmaciones de turno, recordatorios)
* Base de datos: Firebase Firestore (colecciones flat con campo clientId)
* Auth admin: Google OAuth via Firebase Auth (email match contra VITE_ADMIN_EMAIL)
* Deploy: Vercel -- cada cliente es un proyecto separado
* Dominio cliente: [negocio].arzac.studio (subdominio)
* Tour interactivo: driver.js (^1.4.0)
* Animaciones: motion (^12.23.24) aka Framer Motion v12
* Charts: recharts (^3.8.1)

## Concepto de personalizacion

El template usa un sistema de temas visuales por nicho + feature flags:

### Temas disponibles (src/config/presets/themes.ts)

* **Barberia**: barberia-classic (default), barberia-urban, barberia-vintage
* **Tattoo**: tattoo-ink (default), tattoo-neo-traditional, tattoo-fine-line
* **Nails**: nails-rose (default), nails-lavender, nails-noir
* **Estetica**: estetica-lumiere (default), estetica-frost, estetica-botanical

* isDemoMode: controlado por `VITE_DEMO_MODE` env var (default true). Demo = tour + auth bypass + datos CRM ficticios. Produccion (false) = auth real + Firestore real
* businessMode: "solo" (un profesional) o "team" (varios). Solo mode oculta staff tab en admin, muestra "About" en vez de "Team" en nav, y elimina columna staff de la tabla de turnos

### Theme system architecture

Cada tema define: CSS custom properties (colores, radii, shadows), section order, y font families. Los tokens se aplican via `data-niche` y `data-theme` attributes en `<html>`. El tema activo se resuelve en `src/config/site.ts` desde `VITE_THEME` env var o el default del nicho.

### Niche-specific visual differences

| Aspecto | Barberia | Tattoo | Nails | Estetica |
|---------|----------|--------|-------|----------|
| Border radius | rounded-3xl | rounded-xl | rounded-3xl | minimal |
| Heading weight | font-black tracking-tight | font-black tracking-tight | font-black tracking-wide | font-normal tracking-wide (serif) |
| Card hover | scale 1.01, -4px lift | scale 1.005, -2px lift | scale 1.01, -4px lift | no hover scale |
| Animation flavor | bold | sharp | soft | clinical |
| Default theme | dark | dark | light | light |
| Font family | sans | gothic | script | serif |
| Landing layout | full | full | full | compact (fewer services, teaser sections) |

## Nichos implementados

4 nichos, cada uno con presets en ingles, hebreo y ruso (src/config/presets/):

* **barberia** -- servicios, galeria, sistema de turnos, precios
* **estetica** -- tratamientos, equipo, antes/despues, compact teasers linking to dedicated pages
* **tattoo** -- portfolio, artistas, estilos, reservas
* **nails** -- galeria, servicios, agenda

Cada nicho tiene secciones que se activan/desactivan con booleanos en config.

## Variables de entorno

### Build-time (VITE_*, disponibles en el browser)

```
VITE_ACTIVE_NICHE=            # barberia|estetica|tattoo|nails
VITE_UI_LANGUAGE=             # he|en|ru (idioma por defecto; el usuario puede cambiar en runtime)
VITE_CLIENT_ID=               # identificador del tenant
VITE_DEMO_MODE=               # true (default)|false -- controla tour, auth bypass, datos demo
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
EMAIL_FROM_ADDRESS=           # direccion de envio (default: onboarding@resend.dev)
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
GET  /api/health              -> health check + clientId
GET  /api/tenant/status       -> estado del cliente, payment provider
POST /api/ai/analyze          -> analisis IA (strategic/style/crm)
POST /api/ai/chat             -> chat conversacional con Gemini
POST /api/contact             -> formulario contacto -> contact_inbox + email
POST /api/notify-booking      -> notificacion de reserva (non-Stripe)
POST /api/create-checkout-session -> sesion Stripe checkout
POST /api/webhook             -> Stripe webhook (checkout.session.completed/expired)
```

## Colecciones Firestore (FLAT, no nested)

Todas las colecciones son root-level con campo `clientId` para filtrar por tenant:

* `appointments` -- reservas/turnos
* `customers` -- perfiles de clientes del negocio
* `contact_inbox` -- mensajes del formulario de contacto
* `provider_messages` -- mensajes soporte entre cliente y Liam
* `notification_logs` -- audit trail de emails enviados
* `staff_overrides` -- overrides de horarios por miembro de staff
* `clients` -- metadata/status del tenant (leido por server para kill-switch)
* `config` -- overrides de configuracion por cliente (deep merge sobre preset)
* `tenantConfig` -- configuracion de negocio por cliente

## Services (src/services/)

* `db.ts` -- CRUD de appointments, disponibilidad, staff, business rules, booking transaccional
* `customers.ts` -- CRUD clientes del negocio, IDs basados en hash de email
* `inbox.ts` -- suscripcion real-time a contact_inbox, CRUD mensajes
* `support.ts` -- suscripcion real-time a provider_messages, CRUD
* `notificationLogs.ts` -- suscripcion real-time a notification_logs, archive
* `ai.ts` -- llamadas a /api/ai/* para analisis estrategico, estilo, CRM
* `tenant.ts` -- carga config desde Firestore, deteccion de niche

## Landing page architecture

### Section ordering system

Las secciones del landing se renderizan segun el array `sectionOrder` definido en cada tema (`src/config/presets/themes.ts`). El componente `App.tsx` itera ese array y renderiza el componente correspondiente a cada ID.

```typescript
type LandingSectionId =
  | "hero" | "services" | "whyChooseUs" | "team"
  | "gallery" | "testimonials" | "instagram"
  | "inquiry" | "businessHours" | "location"
  | "contactHub";
```

### ContactHub -- Seccion unificada de contacto

**Archivo**: `src/components/landing/ContactHub.tsx`

Reemplaza las 3 secciones sueltas (QuickInquiry + BusinessHours + Location) en un layout unificado de 3 columnas:

1. **Columna izquierda**: Formulario de contacto (si `showInquiry`)
2. **Columna central**: Horarios + datos de contacto (si `showBusinessHours`)
3. **Columna derecha**: Mapa + direccion (si `showLocation`)

Caracteristicas:
- Feature-flag aware: cada columna se muestra/oculta segun flags
- `activeCols` determina el grid template (1, 2, o 3 columnas)
- Hours column tiene width fijo en desktop (`lg:w-72 xl:w-80`) para no estirarse
- Niche-aware cardRadius y headingClass
- Backward-compatible: los IDs legacy `inquiry`, `businessHours`, `location` siguen funcionando en `renderSection`
- El `DEFAULT_SECTION_ORDER` y todos los theme section orders usan `"contactHub"` al final

### Compact service cards + ServicesPage

El landing muestra un preview compacto de servicios (2 cards para estetica, 4 para los demas). Todos los nichos tienen un `ServicesPage.tsx` (`/services` route) con el catalogo completo:

- **Landing Services**: Cards con imagen, precio, duracion. Click abre booking o navega a ServicesPage
- **ServicesPage**: Pagina dedicada con todos los servicios, niche-styled, filterable
- Nav link "Services" + footer link apuntan a `/services` si hay mas servicios que los mostrados

### Pages internas

| Pagina | Ruta | Feature flag | Archivo |
|--------|------|-------------|---------|
| Services | `/services` | `onNavigateToServices` prop | `src/components/services/ServicesPage.tsx` |
| About | `/about` | `enableAboutPage` | `src/components/about/AboutPage.tsx` |
| Staff Profile | `/staff/:id` | `enableStaffPages` | `src/components/staff/StaffProfilePage.tsx` |

Todas las paginas internas son niche-aware: border-radius, heading fonts, card hover, y animation timings varian segun `siteConfig.business.type`.

## Niche animation system (src/lib/motion.ts)

Cada nicho tiene un "flavor" de animacion con timing y easing propios:

| Flavor | Nicho | Duration | Easing | Card hover |
|--------|-------|----------|--------|------------|
| bold | barberia | 0.7s | [0.16, 1, 0.3, 1] | y: -4, scale: 1.01 |
| sharp | tattoo | 0.5s | [0.22, 0.68, 0, 1] | y: -2, scale: 1.005 |
| soft | nails | 0.8s | [0.25, 0.46, 0.45, 0.94] | y: -4, scale: 1.01 |
| clinical | estetica | 0.65s | [0.33, 1, 0.68, 1] | y: -3, scale: 1.008 |

Motion helpers disponibles (reusar, no crear nuevos):
- `nicheFadeUp(niche)` -- fade + slide con easing por nicho
- `nicheStagger(niche)` -- stagger intervals por nicho
- `nicheScaleIn(niche)` -- scale con rotacion sutil por nicho
- `nicheClipReveal(niche)` -- horizontal wipe (ink-like para tattoo)
- `textWordVariants(niche)` -- reveal palabra por palabra
- `NICHE_CARD_HOVER[flavor]` -- hover states por nicho
- `NICHE_DURATION[flavor]` / `NICHE_EASING[flavor]` -- timing por nicho

## Product Tour (driver.js)

Archivo de configuracion: `src/config/tour.config.ts`

Traducciones: `src/config/tour.translations.ts` -- hebreo, ingles, espanol

Pasos del tour:
0. Modal bienvenida -- explica que es una demo
1. Hero -- cara del negocio en internet
2. Servicios -- cada servicio editable con precio
3. Sistema de turnos -- click en booking CTA, CRM explicado
4. Secciones landing (whyChooseUs, team, gallery, testimonials, contact)
5. IA chatbot -- interaccion real, responde 24/7
6. Transicion a admin -- "veamos lo que pasa detras de escena"
7. Tour CRM -- overview, appointments, customers, inbox, staff, rules
8. Cierre -- boton "Quiero esta web" -> redirige a arzac.studio/pago/[clientId]

localStorage key: `tourCompleted_[clientId]`
Boton flotante: icono Compass, bottom-right, solo si isDemoMode === true

## Admin Panel (/admin)

* Auth: Google OAuth via Firebase Auth
* Acceso: email del usuario debe coincidir con `VITE_ADMIN_EMAIL` (case-insensitive)
* Si no coincide: muestra componente UnauthorizedAdmin
* Firebase Console requiere: Google sign-in habilitado + dominio autorizado
* En demo mode (isDemoMode === true): bypass de auth, Firestore subscriptions deshabilitadas

## CRM y sistema de turnos

* Cliente reserva desde la web -> llega al panel admin del negocio
* Validacion server-side con daily_manifests para evitar colisiones
* Email de confirmacion via Resend al cliente
* Recordatorio 24hs antes via Resend
* Cancelacion notifica al cliente
* Vista de agenda del dia en panel admin
* Base de datos de clientes se actualiza con cada reserva

## Gemini Chatbot (dual mode: public + admin)

El chatbot usa Gemini (`gemini-2.5-flash`) via `POST /api/ai/chat` en server.ts. Opera en dos modos:

### Modo publico (landing page)

* Responde preguntas sobre el negocio (horarios, servicios, precios, ubicacion)
* Recibe `businessContext` completo: services, staff, hours, contact, cancellationPolicy, bookingRules
* Soporte opcional de `brand.aiPersona` para personalidad custom
* **Regla critica de booking**: NUNCA sugiere telefono/email para reservar. Siempre dirige al boton "Book" de la web. El sistema de turnos online es el unico canal de reservas
* Si `showWhatsAppInChat` esta activo, menciona WhatsApp solo para preguntas que la IA no puede responder, no para booking
* Responde en el idioma del cliente (detecta automaticamente)
* Si no sabe algo, lo dice -- no inventa informacion
* Si `GEMINI_API_KEY` no esta configurada, retorna HTTP 503 y el chatbot muestra mensaje amigable
* WhatsApp link compacto aparece en el header del chatbot junto a "Powered by Gemini"

### Modo admin (CRM panel)

* Se activa cuando el chatbot se abre desde `/admin` (detectado via `window.location.pathname`)
* El frontend envia `mode: "admin"` al endpoint
* System prompt diferente: CRM Assistant que ayuda al owner/admin a gestionar su negocio
* Puede explicar cada tab del dashboard, interpretar metricas, sugerir acciones, y troubleshootear
* Recibe el mismo `businessContext` para dar respuestas contextualizadas
* Tabs que conoce: Dashboard (overview), Appointments (calendario), Customers (clientes), Inbox (mensajes), Staff (equipo), Settings (configuracion)

## i18n (runtime language switching)

* **3 idiomas soportados**: English (`en`), Hebrew (`he`), Russian (`ru`).
* `VITE_UI_LANGUAGE` define el idioma por defecto al cargar. El usuario puede cambiar en runtime via el LanguageSwitcher.
* La preferencia del usuario se guarda en `localStorage("preferred_language")` y se restaura en recargas.
* **Locale files**: `src/config/locales/en.ts`, `he.ts`, `ru.ts`. Keys deben mantenerse en sync entre los 3.
* **Presets por nicho**: `src/config/presets/*.{en,he,ru}.ts` (4 nichos x 3 idiomas = 12 archivos)
* **RTL/LTR dinamico**: Hebreo setea `dir="rtl"` en `<html>`, English y Russian setean `dir="ltr"`. Cambia en runtime.
* **Mecanismo de switching**: `setLocale()` muta `localeConfig` (singleton mutable), `switchSiteLanguage()` muta `siteConfig`. `LanguageContext` dispara re-render del arbol React completo.
* **LanguageSwitcher**: Componente globe dropdown en Navbar (landing) y AdminDashboard (CRM). Prop `variant` controla colores light/dark.
* **Regla critica**: Al agregar una key nueva a cualquier locale, agregarla a los 3 (en, he, ru). Buscar hardcoded `localeConfig.lang ===` checks y reemplazar con keys dedicadas.

## Firestore tenant customization (config/{clientId})

El documento `config/{clientId}` en Firestore permite personalizar cada deploy sin tocar codigo. Se aplica via `applyTenantConfigOverride()` al bootstrap y sobrevive cambios de idioma en runtime.

### Campos seguros para override

* `features` -- toggles de secciones (showHero, showServices, showTeam, etc.)
* `payment` -- modo de pago, montos, provider
* `notifications` -- toggles de alertas
* `adminEmail` -- email del admin
* `splash` -- splash screen config (enabled, durationMs, variant 1-5, image)
* `activeTheme` -- ThemeId override

### visibleServices

Array de IDs de servicio. Filtra que servicios se muestran y en que orden. Las imagenes se sincronizan automaticamente (services[i] <-> images[i]).

```
// Firestore: config/{clientId}
{ visibleServices: ["haircut", "beard-trim", "hot-towel"] }
```

### serviceOverrides

Parches individuales por servicio (keyed by service ID). Permite cambiar nombre, precio, descripcion, duracion o imagen sin reemplazar todo el array.

```
// Firestore: config/{clientId}
{
  serviceOverrides: {
    "haircut": { name: "Corte Premium", price: "$45", image: "https://..." },
    "beard-trim": { duration: "20 min" }
  }
}
```

Orden de aplicacion: primero `visibleServices` filtra, luego `serviceOverrides` patchea.

### Splash screen variants

5 variantes de splash seleccionables por cliente (`splash.variant: 1-5` en Firestore). Archivos en `src/components/layout/splash/`:

1. **Classic** (SplashClassic) -- logo clip-path reveal + letras staggered + linea accent
2. **Curtain** (SplashCurtain) -- dos paneles se abren como telon revelando la marca
3. **Pulse** (SplashPulse) -- onda radial desde el centro + logo materializa
4. **Typewriter** (SplashTypewriter) -- nombre escrito caracter a caracter con cursor
5. **Vortex** (SplashVortex) -- particulas orbitales que convergen hacia el logo

Defaults por nicho: barberia=Classic, tattoo=Vortex, nails=Pulse, estetica=Typewriter.
`splash.durationMs` controla la duracion total real en todas las variantes.
`splash.image` soporta background image opcional debajo de la animacion.
Todas leen branding de `siteConfig` (logo, brand.name, colores accent).

## Reglas de desarrollo

1. El template es la base -- cada nicho extiende sin romper la estructura
2. Las secciones se activan/desactivan con booleanos en config, nunca con codigo condicional complejo
3. Los design tokens van en variables CSS, nunca hardcodeados
4. isDemoMode === false elimina completamente el tour -- ni rastro en el DOM
5. El chatbot de Gemini NUNCA inventa informacion -- solo responde con lo que tiene configurado
6. Todos los emails salen via Resend (EMAIL_PROVIDER_API_KEY)
7. El panel admin del negocio es independiente del dashboard de Liam (nichos-hub)
8. Cada cliente es un proyecto Vercel separado con sus propias env vars
9. Env vars del browser usan prefijo VITE_*, nunca NEXT_PUBLIC_*
10. Colecciones Firestore son flat (root-level), no nested bajo clients/
11. No usar side-stripe borders (`border-l-*` / `border-s-*` como accent). Usar full borders, background tints, o nada
12. No usar gradient text (`background-clip: text`). Usar colores solidos
13. Nails y estetica arrancan en light mode por defecto; barberia y tattoo en dark mode
14. Navbar responsive breakpoint es `lg` (1024px), no `md` (768px)

## Archivos clave

### Config
* `src/config/env.ts` -- resuelve VITE_* env vars en objeto `env`
* `src/config/site.ts` -- merge de niche preset + BASE_CONFIG -> `siteConfig`
* `src/config/tenant.ts` -- resolucion de clientId y estado del tenant
* `src/config/locale.ts` -- singleton mutable `localeConfig` + `setLocale()` para runtime switching
* `src/config/localeTypes.ts` -- tipo `LocaleConfig` unificado de los 3 locales
* `src/config/uiLanguage.ts` -- tipo `UiLanguage` ("he"|"en"|"ru") + resolver build-time
* `src/contexts/LanguageContext.tsx` -- LanguageProvider + useLanguage hook (runtime switching)
* `src/components/ui/LanguageSwitcher.tsx` -- dropdown globe para cambiar idioma
* `src/config/legalContent.ts` -- templates legales por nicho
* `src/config/presets/themes.ts` -- registro de 12 temas (THEME_REGISTRY), DEFAULT_SECTION_ORDER, ThemeDefinition type
* `src/config/tour.config.ts` -- configuracion del product tour
* `src/config/tour.translations.ts` -- traducciones del tour (he/en/es)

### Componentes landing
* `src/components/landing/Hero.tsx` -- hero con parallax, counters, text reveal
* `src/components/landing/Services.tsx` -- compact service preview (2-4 cards)
* `src/components/landing/WhyChooseUs.tsx` -- benefits grid + image (estetica: compact teaser)
* `src/components/landing/Team.tsx` -- staff cards + social links
* `src/components/landing/Gallery.tsx` -- masonry gallery + lightbox
* `src/components/landing/Testimonials.tsx` -- horizontal scroll testimonials
* `src/components/landing/ContactHub.tsx` -- unified contact section (form + hours + map)
* `src/components/landing/BusinessHours.tsx` -- legacy standalone hours (kept for backward compat)
* `src/components/landing/QuickInquiry.tsx` -- legacy standalone form (kept for backward compat)
* `src/components/landing/Location.tsx` -- legacy standalone map (kept for backward compat)
* `src/components/landing/InstagramFeed.tsx` -- instagram grid preview

### Componentes internos
* `src/components/services/ServicesPage.tsx` -- full service catalog page (/services)
* `src/components/about/AboutPage.tsx` -- about page (/about), niche-styled
* `src/components/staff/StaffProfilePage.tsx` -- individual staff page (/staff/:id), niche-styled

### Layout
* `src/components/layout/Navbar.tsx` -- nav principal, responsive at lg breakpoint, overlayNav mode for hero overlay
* `src/components/layout/Footer.tsx` -- footer con links, social, legal
* `src/components/layout/SplashScreen.tsx` -- splash router (delegates to variant components)
* `src/components/layout/LandingBackdrop.tsx` -- shared sticky hero image for backdrop-mode sections

### Tour + Chat
* `src/components/ProductTour.tsx` -- componente principal del tour
* `src/components/TourButton.tsx` -- boton flotante para repetir
* `src/components/chat/Chatbot.tsx` -- chatbot de IA (panel flotante)

### UI
* `src/components/ui/BrandLogo.tsx` -- logo con soporte `logo`/`logoDark` + fallback Lucide icon
* `src/lib/motion.ts` -- all niche animation helpers, flavors, stagger, easing, duration
* `src/lib/utils.ts` -- cn() (clsx + twMerge), general utilities
* `src/lib/lucide-icons.ts` -- dynamic Lucide icon resolver from string names
* `src/lib/interpolate.ts` -- simple string template interpolation for locale strings

### Server
* `server.ts` -- Express server con API routes, middleware, rate limiting, CORS

### Design System
* `PRODUCT.md` -- contexto de producto, usuarios, principios estrategicos, workflow de branding
* `DESIGN.md` -- sistema de diseno completo: tokens, tipografia, elevacion, componentes, reglas
* `DESIGN.json` -- sidecar con snippets de componentes, ramps tonales, motion tokens

### Operaciones
* `OPERATIONS.md` -- guia definitiva: crear demos, convertir a produccion, env vars, troubleshooting

## Responsive design

Breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px).

### Reglas obligatorias

1. **Mobile-first**: todo componente debe funcionar en 320px. Usar breakpoints progresivos `sm:` -> `md:` -> `lg:`, nunca saltar de mobile directo a `lg:`
2. **Touch targets**: minimo 44x44px (`h-11 w-11`) para botones interactivos
3. **Padding progresivo**: usar `px-3 py-5 sm:px-6 sm:py-6 md:p-12` en lugar de padding fijo grande
4. **Tablas en mobile**: agregar `overflow-x-auto` al wrapper + `min-w-[600px]` a la tabla
5. **Grids adaptativos**: usar `grid-cols-1 sm:grid-cols-2 md:grid-cols-3` en vez de saltar a 3 columnas
6. **Chatbot mobile**: fullscreen con `w-[calc(100vw-1.5rem)] h-[calc(100vh-5rem)]`, desktop con `sm:w-[380px] sm:h-[600px]`
7. **CRM mobile-counter**: el CRM se usa desde el celular detras del mostrador. Priorizar usabilidad con una mano

## CRM features

### Registro walk-in (sin reserva)
* `CustomersTab.tsx` permite registrar clientes que llegan sin turno web
* Formulario inline con nombre, email, telefono
* Crea customer + appointment con `source: "walk-in"` y `status: "completed"`

### AI enrichment
* `ai.ts` exporta `analyzeForCRM()` que incluye contexto enriquecido del negocio
* Incluye: servicios activos, miembros del equipo, horarios, reglas de negocio

### Demo data (demo mode)
* En demo mode, el CRM se pre-carga con datos de ejemplo realistas
* Appointments, Customers, Inbox, Overview con metricas
* Los datos demo NO se persisten en Firestore -- solo existen en memoria

### Brand logo system
* Preset brand config soporta: `logo` (fondo claro), `logoDark` (fondo oscuro), `logoIconName` (fallback Lucide)
* BrandLogo component resuelve: logoDark/logo -> img tag, sino -> Lucide icon
* Logos SVG se sirven desde `public/`

## Custom CSS utilities

* `shadow-elevated` -- custom box-shadow utility con overrides por nicho en el CSS. Nails usa shadows mas suaves para no contrastar con fondos claros
* CSS custom properties se definen en `src/styles/` y se aplican via `data-niche`/`data-theme` selectors
