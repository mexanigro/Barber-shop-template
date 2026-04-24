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

## Required bootstrap docs for each new tenant

1. `clients/{clientId}` with `status: "active"`
2. `config/{clientId}` minimal branding and payment mode

