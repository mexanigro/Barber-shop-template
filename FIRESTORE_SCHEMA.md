# Firestore Schema (Master Template SaaS)

This schema is designed for multi-tenant operation with one Firebase project.
Every tenant-scoped document must include `clientId`.

## 1) `clients/{clientId}`

Purpose: tenant lifecycle, kill switch, billing controls.

```json
{
  "clientId": "client_barber_01",
  "status": "active",
  "legalName": "Barber Demo LLC",
  "timezone": "America/New_York",
  "country": "US",
  "currency": "usd",
  "allowedPaymentProviders": ["stripe"],
  "defaultPaymentProvider": "stripe",
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

Status semantics:
- `active`: normal operation
- `trial`: operation enabled, can be metered differently
- `maintenance`: operation enabled with possible UX warnings
- `suspended`: fully blocked (kill switch)
- `archived`: fully blocked + historical retention

## 2) `config/{clientId}`

Purpose: dynamic visual/business personalization loaded by frontend.

```json
{
  "tenant": { "clientId": "client_barber_01" },
  "brand": {
    "name": "Barber Prime",
    "tagline": "Precision Grooming",
    "logo": "https://...",
    "logoDark": "https://..."
  },
  "contact": {
    "phone": "+1 555 000 1111",
    "email": "hello@barberprime.com"
  },
  "payment": {
    "enabled": true,
    "provider": "stripe",
    "mode": "deposit",
    "depositAmount": 2500,
    "currency": "usd"
  },
  "features": {
    "showBooking": true,
    "showGallery": true
  }
}
```

## 3) `appointments/{appointmentId}`

Purpose: bookings and schedule operations.

```json
{
  "clientId": "client_barber_01",
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "+1 555 000 2222",
  "serviceId": "fade_01",
  "staffId": "staff_01",
  "date": "2026-05-01",
  "time": "14:30",
  "duration": 45,
  "status": "confirmed",
  "paymentStatus": "paid",
  "stripeSessionId": "cs_xxx_optional",
  "createdAt": "serverTimestamp"
}
```

## 4) `customers/{customerId}`

Purpose: CRM base.

```json
{
  "clientId": "client_barber_01",
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+1 555 000 2222",
  "tags": ["vip", "beard"],
  "preferences": ["low fade", "beard trim"],
  "lifetimeValueCents": 129900,
  "lastVisitAt": "timestamp",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

## 5) `invoices/{invoiceId}`

Purpose: invoicing lifecycle.

```json
{
  "clientId": "client_barber_01",
  "appointmentId": "appt_123_optional",
  "customerId": "cust_123_optional",
  "provider": "stripe",
  "externalInvoiceId": "in_123_optional",
  "currency": "usd",
  "subtotalCents": 5000,
  "taxCents": 450,
  "totalCents": 5450,
  "status": "issued",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

## 6) `payments/{paymentId}`

Purpose: provider-agnostic payment transactions.

```json
{
  "clientId": "client_barber_01",
  "appointmentId": "appt_123_optional",
  "invoiceId": "inv_123_optional",
  "provider": "stripe",
  "intentId": "pi_123_optional",
  "externalPaymentId": "ch_123_optional",
  "currency": "usd",
  "amountCents": 2500,
  "status": "authorized",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

## 7) `staff_overrides/{clientId_staffId}`

Purpose: runtime schedule overrides for personnel.

```json
{
  "clientId": "client_barber_01",
  "staffId": "staff_01",
  "blockedDates": ["2026-05-10"],
  "blockedSlots": [
    { "id": "blk_1", "date": "2026-05-10", "start": "10:00", "end": "12:00", "reason": "training" }
  ]
}
```

## 8) `daily_manifests/{clientId_staffId_yyyy-mm-dd}`

Purpose: fast collision checks for booking slots.

```json
{
  "clientId": "client_barber_01",
  "intervals": [
    { "start": "10:00", "end": "11:00" },
    { "start": "12:30", "end": "13:15" }
  ]
}
```

## 9) `provider_messages/{docId}`

Purpose: bidirectional messaging between client admin and nichos-hub (provider). Clients send support requests; the hub replies. Messages are threaded via `parentId`.

```json
{
  "clientId": "client_barber_01",
  "businessName": "Demo Barbershop",
  "message": "Necesito cambiar el horario de apertura los sábados",
  "sender": "client",
  "status": "new",
  "parentId": null,
  "category": "maintenance",
  "categoryReason": "Solicitud de cambio de configuración",
  "createdAt": "serverTimestamp"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `clientId` | string | yes | Tenant scope |
| `businessName` | string | yes | Display name from `siteConfig.brand.name` |
| `message` | string | yes | 1–5000 chars |
| `sender` | `"client"` \| `"provider"` | yes | Who wrote it |
| `status` | `"new"` \| `"read"` | yes | Read state |
| `parentId` | string \| null | no | Original message ID for threading |
| `category` | `"maintenance"` \| `"support"` \| `"conversation"` | no | AI-classified by nichos-hub |
| `categoryReason` | string | no | AI classification rationale |
| `createdAt` | Timestamp | yes | Server timestamp |

Indexes: `(clientId, createdAt ASC)`, `(sender, createdAt DESC)`, `(sender, category, createdAt DESC)`, `(parentId, createdAt ASC)`

## Editable Fields Reference — `config/{clientId}` → Frontend

How nichos-hub edits flow into the master-template SPA. The template loads
`config/{clientId}` on every page load and deep-merges it over the built-in
preset. When `business.type` matches, the full doc merges. When it doesn't
(the normal case — most clients don't have `business.type` set), only
**SAFE_FIRESTORE_TOP_LEVEL** keys merge (marked ⚡ below).

| Section | Firestore path | Editable | Notes |
|---|---|---|---|
| **Brand** | `brand.name` | ✅ ⚡ | Business display name |
| | `brand.tagline` | ✅ ⚡ | Subtitle shown in header/hero |
| | `brand.logo` | ✅ ⚡ | Logo URL (light bg) |
| | `brand.logoDark` | ✅ ⚡ | Logo URL (dark bg) |
| | `brand.description` | ✅ ⚡ | SEO meta description |
| | `brand.ogImage` | ✅ ⚡ | Open Graph preview image |
| | `brand.aiPersona` | ✅ ⚡ | Chatbot personality prompt |
| **Contact** | `contact.phone` | ✅ ⚡ | Phone (also drives WhatsApp) |
| | `contact.email` | ✅ ⚡ | Contact email |
| | `contact.address.*` | ✅ ⚡ | Street, district, cityStateZip |
| | `contact.social.*` | ✅ ⚡ | Instagram, Facebook, etc. |
| **Business mode** | `businessMode` | ✅ ⚡ | `"solo"` or `"team"` — hides team section in solo |
| **Hero** | `hero.titlePrefix` | ✅ ⚡ | Hero heading parts |
| | `hero.titleHighlight` | ✅ ⚡ | Colored keyword in hero |
| | `hero.titleSuffix` | ✅ ⚡ | Trailing hero text |
| | `hero.subtitle` | ✅ ⚡ | Hero subheading |
| | `hero.ctaPrimary` | ✅ ⚡ | Primary CTA button text |
| | `hero.ctaSecondary` | ✅ ⚡ | Secondary CTA button text |
| | `hero.backgroundImage` | ✅ ⚡ | Hero background URL |
| | `hero.stats[]` | ✅ ⚡ | Counter badges (value + label) |
| **Features** | `features.showBooking` | ✅ ⚡ | Toggle booking system |
| | `features.showGallery` | ✅ ⚡ | Toggle gallery section |
| | `features.showTeam` | ✅ ⚡ | Toggle team section |
| | `features.showHero` | ✅ ⚡ | Toggle hero section |
| | `features.show*` | ✅ ⚡ | All other section toggles |
| **Payment** | `payment.enabled` | ✅ ⚡ | Enable/disable payments |
| | `payment.provider` | ✅ ⚡ | `"stripe"` / `"cardcom"` |
| | `payment.mode` | ✅ ⚡ | `"deposit"` / `"full"` |
| | `payment.depositAmount` | ✅ ⚡ | Deposit in cents |
| **Notifications** | `notifications.*` | ✅ ⚡ | Email/SMS notification config |
| **Splash** | `splash.*` | ✅ ⚡ | Loading screen customization |
| **Theme** | `activeTheme` | ✅ ⚡ | Visual theme ID |
| **Staff** | `staff[].name` | ✅ ⚡ | Staff member names |
| | `staff[].specialty` | ✅ ⚡ | Staff specialty text |
| | `staff[].bio` | ✅ ⚡ | Staff bio |
| | `staff[].photoUrl` | ✅ ⚡ | Staff photo URL |
| | `staff[].schedule` | ✅ ⚡ | Weekly schedule |
| **Gallery** | `gallery[]` | ✅ ⚡ | Gallery image URLs |
| **Services** | `visibleServices[]` | ✅ | Filter + reorder services by ID |
| | `serviceOverrides.{id}.*` | ✅ | Patch name, price, image per service |
| **Section headings** | `sections.services.heading` | ✅ ⚡ | Section title text |
| | `sections.team.heading` | ✅ ⚡ | All sections follow same pattern |
| | `sections.*.heading` | ✅ ⚡ | heading + subheading per section |
| **Business hours** | `hours.{day}.*` | ✅ | isOpen, start, end per day |
| **Business rules** | `businessRules.*` | ✅ ⚡ | bufferMinutes, maxAdvanceDays, etc. |
| **Admin email** | `adminEmail` | ✅ ⚡ | Notification recipient |

**⚡ = SAFE_FIRESTORE_TOP_LEVEL** — merges even when `business.type` is missing/mismatched.

Fields NOT marked ⚡ (`visibleServices`, `serviceOverrides`, `hours`, `business.*`, full `services[]` replacement) only merge when `business.type` in Firestore matches the deployed niche.

## Required bootstrap docs for each new tenant

1. `clients/{clientId}` with `status: "active"`
2. `config/{clientId}` minimal branding and payment mode

