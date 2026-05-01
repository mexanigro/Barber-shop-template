# Micro CRM + Admin Ops Plan

Status: Approved architecture baseline for implementation.
Scope: Admin panel only (multi-tenant safe), phased rollout.
Owner model: Single-tenant deploys over shared Firestore with `clientId` scoping.

## 1) Goal

Add an admin-native micro CRM and operations layer without breaking current booking/admin flows:

1. Customer Directory + Profile
2. Availability and Business Rules configuration
3. Communication audit + inbox
4. Operational KPI dashboard

## 2) Constraints (Do Not Break)

- Keep strict tenant isolation (`clientId`) on all reads/writes.
- Do not alter kill-switch semantics or middleware trust chain.
- Keep i18n parity for any new admin copy (`en.ts` / `he.ts`).
- Prefer additive schema changes over migrations.
- Keep rollout phased and reversible.

## 3) Data Model

### 3.1 `customers/{customerId}` (existing collection, extend usage)

Existing typed fields include identity/contact and value metadata.

Add/ensure support for:
- `notes?: string` (internal admin note)
- `visitCount?: number`
- `source?: "booking" | "manual" | "import"`

MVP behavior:
- Upsert customer on booking save (match by `clientId + email`).

### 3.2 `contact_inbox/{docId}` (new)

Purpose:
- Persist contact submissions (and future chat-origin leads).

Fields:
- `clientId`
- `name`, `email`, `phone?`
- `subject`, `message`
- `source: "web" | "chat" | "manual"`
- `status: "new" | "read" | "replied" | "archived"`
- `customerId?`
- `repliedAt?`
- `createdAt`

### 3.3 `notification_logs/{docId}` (new)

Purpose:
- Immutable audit of outbound notifications.

Fields:
- `clientId`
- `channel: "email" | "sms" | "push"`
- `recipient`
- `subject?`
- `type: "booking" | "contact" | "reminder" | "marketing"`
- `status: "sent" | "failed" | "queued"`
- `refId?`
- `providerMessageId?`
- `error?`
- `createdAt`

### 3.4 `config/{clientId}` (extend existing document)

Add optional nested keys:
- `businessRules?: { bufferMinutes, maxAdvanceBookingDays, minAdvanceBookingHours, autoConfirm }`
- `crmSettings?: { autoCreateCustomer, defaultTags }`
- `notificationPrefs?: { bookingConfirmation, reminderHoursBefore, contactAutoReply }`

### 3.5 KPI storage strategy

MVP:
- Compute KPIs client-side from already available admin data.

Scale path:
- Add `kpi_snapshots` later if a tenant outgrows client-side aggregation.

## 4) Frontend vs Backend Split

Frontend (Firestore SDK under rules):
- Customer list/search/edit
- Inbox read/update status
- Notification log read
- Business rules config writes
- KPI aggregation (MVP)

Backend (`server.ts` / existing handlers):
- Persist inbox entries in `/api/contact`
- Persist notification log entries in notification send flow
- Customer upsert on booking when atomic write path is needed

Principle:
- Secrets and side-effect orchestration stay server-side.
- Real-time admin reads remain frontend + Firestore rules.

## 5) Rules and Indexes

### 5.1 Firestore rules (planned additions)

Add scoped rules for:
- `contact_inbox`
- `notification_logs`

Keep:
- Tenant admin read/update behavior scoped by `clientId`.
- Notification logs immutable after create.

### 5.2 Planned indexes

Add:
1. `contact_inbox`: `clientId ASC, createdAt DESC`
2. `contact_inbox`: `clientId ASC, status ASC, createdAt DESC`
3. `notification_logs`: `clientId ASC, createdAt DESC`

Existing customers index (`clientId + lastVisitAt DESC`) remains valid for MVP.

## 6) Admin UX Information Architecture

Current tabs:
- Appointments
- Staff

Target tabs:
- Appointments
- Staff
- Customers (new)
- Inbox (new)
- Dashboard (new)

### 6.1 Customers tab

- Searchable customer list
- Detail panel (identity/contact, tags, notes, history, lifetime value)
- Manual add (MVP optional)
- Empty state clarifies auto-creation via bookings

### 6.2 Inbox tab

- New/read/replied/archive workflow
- Detail panel with full message
- Customer linking by email when possible

### 6.3 Dashboard tab

- KPI cards (bookings, revenue, cancellation rate, new customers)
- Period filter
- Trends/charts
- Recent notification logs (read-only)

## 7) Phased Roadmap

## Phase 1 (MVP Customers) — Medium effort / low risk

- Extend customer type fields (`notes`, `visitCount`, `source`)
- Add `src/services/customers.ts`
- Upsert customer from booking flow
- Add Customers tab UI + search + notes + basic history view

Done criteria:
- Customer records auto-grow from bookings
- Admin can find and annotate customers

## Phase 2 (Inbox + Notification Logs) — Medium effort / low risk — **closed in repo**

- Add `contact_inbox` and `notification_logs` types/services
- Persist `/api/contact` submissions
- Persist notification send results
- Build Inbox tab + status lifecycle
- Add rules/indexes for new collections
- **Added:** Admin **Email log** tab (`notification_logs` read-only); server logs missing-recipient failures.

Done criteria:
- No lost contact submissions
- Notification outcomes are auditable

## Phase 3 (Business Rules Config) — Small effort / low risk — **started / MVP in repo**

- Business rules editor in admin (**Scheduling** tab)
- Persist to `config/{clientId}.businessRules` (merged via tenant bootstrap + safe overlay)
- Wire booking: buffer, max advance days, min same-day notice, auto-confirm without payments

Done criteria:
- Tenant can tune scheduling behavior without code edits *(MVP: UI + client-side booking; manifest transaction uses dynamic buffer)*

## Phase 4 (KPI Dashboard) — Medium effort / medium risk

- KPI cards + chart layer
- Date range filtering
- Notification log summary widget

Done criteria:
- Admin home reflects operational health, not only calendar view

## Phase 5 (Polish + AI insights) — Small effort / low risk

- Optional CRM insights via existing AI analysis path
- CSV export
- Optional reminder/auto-reply enhancements

## 8) Open Decisions (Track Before/While Build)

1. Customer dedupe key strategy (`email` only vs `email + phone`).
2. Inbox reply model (`mailto` MVP vs in-app thread).
3. Notification log write path (client SDK vs admin SDK on server).
4. KPI scaling threshold for snapshot migration.
5. Role granularity (`owner/manager/staff`) in CRM sections.
6. Customer deletion policy (soft delete vs hard delete).
7. Chat transcript persistence policy.
8. Charting library final choice and bundle impact.

## 9) Execution Rule for Implementation Chats

When implementing with Sonnet:
- Execute one phase at a time.
- Do not jump phases in one pass.
- Always include a short "done vs pending" section at the end.
- Run `npm run lint` after each phase.
- If locale keys are added/changed, preserve `en/he` parity.
