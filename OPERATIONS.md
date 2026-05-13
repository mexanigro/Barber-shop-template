# Guía de Operaciones — Master Template

Guía definitiva para crear demos, convertir a producción, y mantener deployments.
Última actualización: 2026-05-13

---

## Arquitectura de deploys

```
GitHub repo (Barber-shop-template)
        │
        ├── Push a main → TODOS los proyectos Vercel rebuild automáticamente
        │
        ├── Vercel Project: demo-barberia-01     (VITE_DEMO_MODE=true)
        ├── Vercel Project: demo-tattoo-mizrahi   (VITE_DEMO_MODE=true)
        ├── Vercel Project: cliente-real-david     (VITE_DEMO_MODE=false)
        └── Vercel Project: cliente-real-sarah     (VITE_DEMO_MODE=false)
```

**Actualizaciones globales**: Push a `main` → todos los proyectos Vercel rebuildan automáticamente. Cada deploy lee SUS propias env vars de Vercel para personalizar nicho, idioma, client ID, demo mode, etc.

**Personalizaciones por cliente**: Se hacen en Vercel env vars (build-time) o en Firestore `config/{clientId}` (runtime). NUNCA en el código.

### Firestore config/{clientId} — campos disponibles

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `features.show*` | boolean | Toggle secciones (showHero, showServices, showTeam, etc.) |
| `visibleServices` | string[] | IDs de servicios a mostrar, en orden deseado |
| `serviceOverrides` | object | Parches por servicio: `{ "haircut": { name, price, image, ... } }` |
| `payment` | object | Modo de pago, montos, provider |
| `adminEmail` | string | Email del admin panel |
| `activeTheme` | string | ThemeId override |

Ejemplo completo en Firestore:
```json
{
  "features": { "showGallery": false, "showTestimonials": false },
  "visibleServices": ["haircut", "beard-trim"],
  "serviceOverrides": {
    "haircut": { "name": "Corte Premium", "price": "$45", "image": "https://..." }
  }
}
```

---

## Servicios externos requeridos

| Servicio | Para qué | Cuenta/proyecto |
|----------|----------|-----------------|
| **GitHub** | Repositorio del template | github.com/mexanigro/Barber-shop-template |
| **Vercel** | Hosting de cada deploy | Un proyecto por cliente/demo |
| **Firebase** | Base de datos + Auth admin | Proyecto: `barbertemplate-madre` |
| **Google Cloud** | OAuth para admin panel | Mismo proyecto Firebase |
| **Gemini AI** | Chatbot de la landing | API key de Google AI Studio |
| **Resend** | Emails de confirmación/notificación | Cuenta con dominio verificado |
| **Cardcom** | Pagos (solo Israel) | Terminal configurado en nichos-hub |
| **Cloudflare** | DNS para subdominios | arzac.studio nameservers |

---

## PARTE 1: Crear una demo nueva

### Paso 1 — Registrar el prospecto en nichos-hub

1. Ir a `arzac.studio/sales`
2. Click "Nuevo prospecto"
3. Llenar: nombre del negocio, ciudad, nicho target
4. El prospecto aparece en la columna "En seguimiento"

> **Prevención de duplicados**: Antes de crear, revisar visualmente si el negocio ya existe en el kanban (following, rejected, o closed). No hay detección automática.

### Paso 2 — Crear proyecto en Vercel

1. Ir a [vercel.com/new](https://vercel.com/new)
2. Importar el repo `mexanigro/Barber-shop-template`
3. Nombre del proyecto: `demo-{nicho}-{nombre}` (ej: `demo-barberia-david`)
4. Framework: **Vite**
5. Build command: `npm run build` (default)
6. Output directory: `dist` (default)

### Paso 3 — Configurar variables de entorno en Vercel

Ir a Settings → Environment Variables del proyecto. Agregar:

#### Variables OBLIGATORIAS para demo

```env
# ─── Identidad del tenant ───
VITE_CLIENT_ID=demo_barberia_david          # Identificador único, sin espacios
NEXT_PUBLIC_CLIENT_ID=demo_barberia_david    # Mismo valor (compatibilidad)

# ─── Nicho y idioma ───
VITE_ACTIVE_NICHE=barberia                  # barberia|estetica|tattoo|nails
VITE_UI_LANGUAGE=he                         # he|en|ru (idioma por defecto; el usuario puede cambiar en runtime)

# ─── Demo mode ───
VITE_DEMO_MODE=true                         # true = tour + bypass auth + datos demo

# ─── Firebase (base de datos) ───
VITE_FIREBASE_API_KEY=                      # Web API Key del proyecto Firebase
VITE_FIREBASE_AUTH_DOMAIN=                  # {proyecto}.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=barbertemplate-madre
VITE_FIREBASE_STORAGE_BUCKET=               # {proyecto}.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=          # Número del proyecto
VITE_FIREBASE_APP_ID=                       # ID de la app web
VITE_FIREBASE_DATABASE_ID=                  # Si usas DB secundaria, sino omitir

# ─── Admin panel ───
VITE_ADMIN_EMAIL=admin@example.com          # Email de Google del dueño del negocio
                                            # (en demo no importa, auth bypassed)

# ─── Gemini AI (chatbot) ───
GEMINI_API_KEY=                             # API key de Google AI Studio

# ─── App URL ───
APP_URL=https://demo-barberia-david.vercel.app
```

#### Variables OPCIONALES para demo (features deshabilitados sin ellas)

```env
# Stripe — dejar vacías en demo (no se necesitan pagos)
STRIPE_SECRET_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Resend — dejar vacías en demo (emails se logean a consola)
EMAIL_PROVIDER_API_KEY=
EMAIL_FROM_ADDRESS=
BUSINESS_OWNER_EMAIL=

# Firebase Admin (server-side) — necesarias para CRM real, no para demo
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
```

### Paso 4 — Configurar subdominio (opcional para demo)

Si querés que la demo tenga un subdominio bonito:

1. Vercel → Project → Settings → Domains
2. Agregar: `demo-david.arzac.studio`
3. Cloudflare → DNS → agregar CNAME: `demo-david` → `cname.vercel-dns.com`

### Paso 5 — Deploy

El deploy es automático al crear el proyecto. Verificar en Vercel que el build pase.

### Paso 6 — Personalizar contenido (si es necesario)

El contenido por defecto viene del preset del nicho (`src/config/presets/{nicho}.{lang}.ts`). Para personalizar sin tocar código:

**Opción A — Logo del negocio**: 
1. Crear SVG del logo y subirlo a `public/` en el repo
2. En el preset del nicho, agregar `logoDark: "/nombre-logo.svg"` al objeto `brand`
3. Push a main (afecta solo a este deploy si el logo tiene nombre único)

**Opción B — Override por Firestore** (sin rebuild):
1. Crear documento `config/{clientId}` en Firestore
2. Agregar campo `business.type` que COINCIDA con el nicho del deploy
3. Agregar los campos a overridear (brand.name, services, staff, etc.)
4. El merge es automático al cargar la app

### Paso 7 — Verificar la demo

Checklist:
- [ ] Landing carga correctamente
- [ ] Logo se muestra en el navbar
- [ ] Tour se auto-inicia la primera vez
- [ ] Chatbot responde (Gemini)
- [ ] Secciones correctas para el nicho
- [ ] Admin panel accesible (auth bypass en demo)
- [ ] CRM tiene datos de ejemplo
- [ ] Idioma por defecto correcto (he/en/ru)
- [ ] Language switcher funciona (3 idiomas, RTL/LTR)
- [ ] Mobile responsive

---

## PARTE 2: Convertir demo a producción (cliente compró)

### Paso 1 — Registro del pago en nichos-hub

1. El cliente visitó `arzac.studio/pago/{clientId}`
2. Firmó contrato → se creó payment "pending" en `hub_payments`
3. Pagó con Cardcom → payment se marcó como "paid"
4. `hub_clients.{clientId}.paymentStatus` se actualizó a "active"

### Paso 2 — Mover prospecto a "Cerrado" en nichos-hub

1. Ir a `arzac.studio/sales`
2. En el prospecto, click "Cerrado"
3. El prospecto se mueve a la columna "Cerrado"

### Paso 3 — Crear el cliente en nichos-hub (si no existe)

1. Ir a `arzac.studio/clients` → "Nuevo cliente"
2. Llenar:
   - `businessName`: nombre real del negocio
   - `niche`: barberia/estetica/tattoo/nails
   - `deployUrl`: URL del Vercel project
   - `clientId`: MISMO que `VITE_CLIENT_ID` del deploy
   - `adminEmail`: email del dueño del negocio
   - `vercelProjectId`: ID del proyecto en Vercel (para kill switch)

### Paso 4 — Cambiar variables de entorno en Vercel

Ir al proyecto Vercel → Settings → Environment Variables:

```env
# ─── CAMBIAR ───
VITE_DEMO_MODE=false                        # Desactiva tour, activa auth real, CRM real

# ─── CONFIGURAR (antes vacías) ───
VITE_ADMIN_EMAIL=email-real@gmail.com       # Email Google del dueño

# Firebase Admin (server-side, para CRM funcional)
FIREBASE_ADMIN_PROJECT_ID=barbertemplate-madre
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@barbertemplate-madre.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Emails reales
EMAIL_PROVIDER_API_KEY=re_xxxxxxxxxxxx       # Resend API key
EMAIL_FROM_ADDRESS=turnos@arzac.studio       # O dominio del cliente
BUSINESS_OWNER_EMAIL=email-real@gmail.com    # Notificaciones al dueño
BOOKING_NOTIFICATION_EMAIL=                  # Opcional, fallback a BUSINESS_OWNER_EMAIL

# Stripe (si aplica)
STRIPE_SECRET_KEY=sk_live_xxxxx
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### Paso 5 — Configurar Google OAuth para admin panel

El dueño del negocio necesita poder entrar al admin panel con su Google:

1. Ir a [Firebase Console](https://console.firebase.google.com) → proyecto `barbertemplate-madre`
2. Authentication → Sign-in method → Google → debe estar habilitado
3. Authentication → Settings → Authorized domains → agregar el dominio del deploy
   - Agregar: `demo-david.vercel.app` o `david.arzac.studio`
4. El email del `VITE_ADMIN_EMAIL` debe ser un Google account válido

### Paso 6 — Configurar Stripe webhook (si usa pagos)

1. Ir a [Stripe Dashboard](https://dashboard.stripe.com) → Developers → Webhooks
2. Agregar endpoint: `https://{dominio}/api/webhook`
3. Eventos: `checkout.session.completed`, `checkout.session.expired`
4. Copiar el Signing Secret → setear como `STRIPE_WEBHOOK_SECRET` en Vercel

### Paso 7 — Configurar dominio definitivo

1. Vercel → Project → Settings → Domains
2. Agregar: `{negocio}.arzac.studio`
3. Cloudflare → DNS → CNAME: `{negocio}` → `cname.vercel-dns.com`
4. Actualizar `APP_URL` en Vercel env vars
5. Actualizar `deployUrl` en nichos-hub clients

### Paso 8 — Redeploy

Después de cambiar env vars, Vercel NO rebuilda automáticamente.

1. Vercel → Project → Deployments → Redeploy (el último deploy)
2. O hacer un push vacío: `git commit --allow-empty -m "trigger redeploy" && git push`

### Paso 9 — Verificar producción

Checklist:
- [ ] Tour NO aparece
- [ ] Admin panel pide Google login
- [ ] Solo `VITE_ADMIN_EMAIL` puede entrar al admin
- [ ] CRM vacío (no datos demo), listo para datos reales
- [ ] Booking crea appointment en Firestore
- [ ] Email de confirmación se envía al cliente
- [ ] Email de notificación llega al dueño
- [ ] Chatbot responde
- [ ] Dominio correcto y SSL verde
- [ ] Stripe checkout funciona (si aplica)

---

## PARTE 3: Gestión en nichos-hub

### Estados de prospectos (kanban)

| Estado | Significado | Acciones |
|--------|------------|----------|
| **En seguimiento** | Prospecto activo, pendiente de contactar/demo | Agregar notas, mover a rechazado/cerrado |
| **Rechazado** | Dijo que no (requiere motivo) | Se puede volver a "En seguimiento" si cambia de opinión |
| **Cerrado** | Deal cerrado, se convirtió en cliente | Crear entrada en `/clients` manualmente |

### Flujo completo de un lead

```
1. Encuentro negocio interesante
   └→ Creo prospecto en /sales (status: following)

2. Construyo demo
   └→ Creo proyecto Vercel con VITE_DEMO_MODE=true
   └→ Agrego nota al prospecto con URL de la demo

3. Muestro demo al dueño del negocio
   └→ Si dice NO → Muevo a "Rechazado" con motivo
   └→ Si dice SÍ → Continúo al paso 4

4. Cliente acepta
   └→ Lo dirijo a arzac.studio/pago/{clientId}
   └→ Firma contrato + paga con Cardcom
   └→ Muevo prospecto a "Cerrado"

5. Activo la web
   └→ Creo entrada en /clients con datos del negocio
   └→ Cambio VITE_DEMO_MODE=false en Vercel
   └→ Configuro admin email, Firebase auth domain, emails
   └→ Redeploy

6. Mantenimiento mensual
   └→ Cobro automático via Cardcom (si está configurado)
   └→ Monitor-agent vigila uptime
   └→ Actualizaciones globales via push a main
```

### Evitar repetir leads

- Antes de crear un prospecto, buscar en el kanban (las 3 columnas)
- Los prospectos rechazados muestran el motivo → no contactar de nuevo si el motivo es definitivo
- Los prospectos cerrados ya son clientes → aparecen en `/clients`
- Agregar notas con fecha a cada interacción para tener historial

---

## PARTE 4: Referencia rápida de env vars

### Variables que cambian entre demo y producción

| Variable | Demo | Producción |
|----------|------|------------|
| `VITE_DEMO_MODE` | `true` | `false` |
| `VITE_ADMIN_EMAIL` | cualquiera | email real del dueño |
| `FIREBASE_ADMIN_*` | vacías | credenciales reales |
| `EMAIL_PROVIDER_API_KEY` | vacía | Resend API key |
| `BUSINESS_OWNER_EMAIL` | vacía | email del dueño |
| `STRIPE_*` | vacías | keys reales (si aplica) |

### Variables que NO cambian entre demo y producción

| Variable | Valor |
|----------|-------|
| `VITE_CLIENT_ID` | el mismo (identifica al tenant en Firestore) |
| `VITE_ACTIVE_NICHE` | el mismo (define el nicho) |
| `VITE_UI_LANGUAGE` | el mismo (idioma por defecto; usuario puede cambiar en runtime via switcher) |
| `GEMINI_API_KEY` | el mismo (chatbot funciona en ambos) |
| `VITE_FIREBASE_*` | el mismo (mismo proyecto Firebase) |
| `APP_URL` | puede cambiar si se asigna dominio definitivo |

---

## PARTE 5: robots.txt y SEO

### robots.txt (ya configurado)

Ubicación: `public/robots.txt`
```
User-agent: *
Allow: /
Disallow: /admin
```

Para agregar sitemap (cuando lo implementes):
```
User-agent: *
Allow: /
Disallow: /admin
Sitemap: https://{dominio}/sitemap.xml
```

### SEO automático

El template maneja SEO dinámicamente via `useSEO.ts`:
- **Título**: `brand.name` del preset
- **Descripción**: `brand.description` o `brand.tagline`
- **OG Image**: `brand.ogImage` → hero image → fallback
- **JSON-LD**: Schema `LocalBusiness` con tipo de negocio correcto
- **Canonical**: URL del deploy
- **Hreflang**: según idioma activo (VITE_UI_LANGUAGE por defecto, cambia con runtime switcher)

### OG Image por cliente

Para que el link preview (WhatsApp, social) se vea bien:
1. Crear imagen 1200x630px con branding del cliente
2. Subirla a `public/og-{clientId}.png`
3. En el preset o Firestore config, setear `brand.ogImage: "/og-{clientId}.png"`

---

## PARTE 6: Firestore — Qué se crea automáticamente

### Colecciones auto-creadas (no necesitan setup)

| Colección | Primer documento se crea cuando... |
|-----------|-----------------------------------|
| `appointments` | Se hace la primera reserva |
| `daily_manifests` | Se hace la primera reserva (transaccional) |
| `customers` | Se hace la primera reserva |
| `contact_inbox` | Alguien envía el formulario de contacto |
| `notification_logs` | Se envía el primer email |
| `staff_overrides` | El admin cambia horarios de un staff |
| `provider_messages` | El dueño envía un mensaje de soporte |

### Documentos que SÍ necesitan setup manual

| Documento | Quién lo crea | Cuándo |
|-----------|--------------|--------|
| `clients/{clientId}` | nichos-hub al crear cliente | Al activar producción |
| `config/{clientId}` | Manual en Firebase Console | Solo si se necesitan overrides runtime |

---

## PARTE 7: Troubleshooting

### Chatbot no responde
- Verificar `GEMINI_API_KEY` en Vercel env vars
- El modelo actual es `gemini-2.5-flash` — si Google lo depreca, actualizar en `server.ts` línea 46
- Revisar logs en Vercel → Functions → `/api/ai/chat`

### Admin panel no deja entrar
- Verificar que `VITE_DEMO_MODE=false` (si no, auth está bypassed)
- Verificar que `VITE_ADMIN_EMAIL` coincide exactamente con el Google account
- Verificar que el dominio está en Firebase → Authentication → Authorized domains
- Verificar que Google sign-in está habilitado en Firebase

### Emails no se envían
- Verificar `EMAIL_PROVIDER_API_KEY` (Resend)
- Verificar que `EMAIL_FROM_ADDRESS` usa un dominio verificado en Resend
- Sin API key, los emails se logean a la consola (no error, solo no se envían)

### Tour aparece en producción
- Verificar `VITE_DEMO_MODE=false` en Vercel
- Redeploy después de cambiar env vars
- Limpiar `localStorage` del browser: `tourCompleted_{clientId}`

### Datos demo aparecen en CRM real
- Mismo que arriba: `VITE_DEMO_MODE` debe ser `false`
- Los datos demo SOLO existen en memoria cuando `isDemoMode === true`

### Kill switch (pausar/reactivar web de cliente)
- Desde nichos-hub: `/clients/{clientId}` → botón "Pausar"
- Usa Vercel API para pause/unpause el proyecto
- Requiere `vercelProjectId` en `hub_clients`
