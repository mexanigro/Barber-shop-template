# Audit Report: Micro-CRM Phases 2 & 3

**Date:** 2026-05-01  
**Scope:** Phase 2 (Inbox + Notification Logs) and Phase 3 (Business Rules + Scheduling) as defined in `MICRO_CRM_PLAN.md`.  
**Method:** Static code analysis of Firestore rules, services, server endpoints, admin components, locales, and type definitions.

---

## 1. Executive Summary

The Phase 2 implementation (contact inbox, notification logs, inbox UI) is **solid and production-usable**. Types, rules, indexes, services, and UI are aligned. Phase 3 (Business Rules configuration) is **not yet implemented** — there is no `BusinessRules` type, no `schedulingRules.ts`, no admin Scheduling tab, and no wiring of dynamic rules into booking logic. The scheduling system works correctly but uses hardcoded constants (`src/constants.ts`). The biggest risk is a **multi-tenant security gap**: `daily_manifests` and `notification_logs` accept unauthenticated writes, meaning an attacker who knows a `clientId` can corrupt appointment manifests or inject fake audit log entries without any credentials.

---

## 2. Findings by Severity

### CRITICAL

#### C1. `daily_manifests` is writable without authentication
**File:** `firestore.rules:141-148`  
**What:** The `daily_manifests` rule allows any unauthenticated client to create/overwrite manifest documents. The only guards are `clientId is string`, `isClientStatusAllowed`, `intervals is list`, and `intervals.size() <= 96`. There is no `isAuthenticated()` check.  
**Why it matters:** An attacker with knowledge of a tenant's `clientId` (public in the config doc) can:
- Inject fake occupied intervals to block all booking slots (denial of service).
- Overwrite a legitimate manifest with empty intervals, enabling double-bookings that bypass the transaction guard in `db.ts:184-248`.

**Root cause:** The booking transaction in `db.ts` runs under the end-user's unauthenticated Firebase context (public booking flow), so the rule was intentionally left open. However, there is no validation that the write comes from a legitimate booking transaction vs. a raw Firestore client call.

**Recommendation:** Either:
1. Move `saveAppointment` to server.ts (Express) using the server's Firebase instance, so the server can be the only writer (then add `isAuthenticated()` to the rule), or
2. Add structural validation: require `manifestId` format matches `{clientId}_{staffId}_{date}` and validate each interval object has `start`/`end` strings matching `HH:mm`.

---

#### C2. `notification_logs` writable without authentication
**File:** `firestore.rules:130-139`  
**What:** The comment says "Write only from authenticated context (server-side client SDK or admin)" but the rule does **not** check `isAuthenticated()`. Any anonymous client can insert documents.  
**Why it matters:** An attacker can flood the notification_logs collection with fake entries, polluting the audit trail and potentially causing admin confusion about what emails were actually sent vs. fabricated.

**Root cause:** `server.ts` uses the Firebase client SDK without signing in, so writes are unauthenticated. The rule was left open to accommodate this, but the comment is misleading.

**Recommendation:** If the server can't authenticate (no service account / Admin SDK), add at minimum:
- Field-level validation (require `channel`, `type`, `status`, `recipient` match patterns).
- Rate limiting at the Firestore level is not possible, but consider adding a `createdAt` server timestamp requirement and rejecting docs with excessive sizes.
- Long-term: use Firebase Admin SDK on the server so these writes are authenticated and the rule can enforce `isAuthenticated()`.

---

### HIGH

#### H1. Phase 3 (Business Rules) is NOT implemented
**Files:** Not found: `src/lib/schedulingRules.ts`, `BusinessRules` type, admin Scheduling tab.  
**What:** `MICRO_CRM_PLAN.md` Phase 3 specifies a `BusinessRules` type (`bufferMinutes`, `maxAdvanceBookingDays`, `minAdvanceBookingHours`, `autoConfirm`), persistence to `config/{clientId}.businessRules`, an admin UI editor, and wiring into booking availability. None of this exists.  
**What does exist:** Hardcoded `SCHEDULING_CONFIG` in `src/constants.ts` with `BUFFER_TIME: 10`, `SLOT_INTERVAL: 15`, `DEFAULT_MISSION_DURATION: 30`. The `tenant.ts` overlay does NOT include `businessRules` in its `SAFE_FIRESTORE_TOP_LEVEL` list.  
**Why it matters:** The plan states Phase 3 as "done" in the hypothesis, but it hasn't been built. Tenants cannot tune scheduling behavior without code edits.

---

#### H2. `daily_manifests` document ID lacks validation — cross-tenant data poisoning possible
**File:** `firestore.rules:141-148`  
**What:** The rule matches `daily_manifests/{manifestId}` without constraining the `manifestId` format. The `clientId` field in the document must be a string and pass `isClientStatusAllowed`, but there's no rule ensuring `manifestId` starts with the correct `clientId`.  
**Why it matters:** Tenant A could theoretically write a document with ID `tenantB_staff1_2026-05-01` as long as the `clientId` field inside is set to Tenant A's ID. While this wouldn't corrupt Tenant B's reads (the transaction in `db.ts` reads by the correct composite key), it creates orphan documents and potential confusion.

**Recommendation:** Add a rule: `manifestId.split('_')[0] == request.resource.data.clientId` or validate the ID prefix.

---

#### H3. Customer upsert race condition under concurrent bookings
**File:** `src/services/customers.ts:97-141`  
**What:** `upsertByEmail` does a query-then-write outside of a transaction. If two bookings for the same email arrive simultaneously, both queries may return empty, creating two separate customer documents for the same email.  
**Why it matters:** Duplicate customer records break the CRM's "single view of customer" premise. Admin would see the same person twice with split visit counts.

**Recommendation:** Use a deterministic document ID based on `clientId + email` hash, and use `setDoc` with `merge: true` to make the operation idempotent.

---

### MEDIUM

#### M1. `tenant.ts` overlay does NOT merge `businessRules` even when niche matches
**File:** `src/services/tenant.ts:41-47`  
**What:** `SAFE_FIRESTORE_TOP_LEVEL` lists `features`, `payment`, `notifications`, `adminEmail`, `splash`. When the niche matches, the full `data` is merged via `applyTenantConfigOverride`, so `businessRules` would merge if present in Firestore and niche matches. But when niche mismatches, only the safe keys merge — `businessRules` would be silently dropped.  
**Why it matters:** If Phase 3 is implemented later, a cross-niche deployment (e.g., testing barberia config on a tattoo build) would silently lose scheduling overrides. Not critical now since Phase 3 doesn't exist yet, but the safe-keys list should be preemptively updated to include `businessRules`.

---

#### M2. No admin UI for notification logs
**Files:** No `NotificationLogsTab` or similar component in `src/components/admin/`.  
**What:** `MICRO_CRM_PLAN.md` Phase 2 specifies "Notification log read" in the admin frontend and the type + rules + indexes exist, but there is no UI component to view logs. The "Email log" tab mentioned in the task hypothesis does not exist.  
**Why it matters:** Notification outcomes are auditable at the Firestore level but not visible to the admin. The plan's Phase 2 done criteria ("Notification outcomes are auditable") is only half-met.

---

#### M3. Booking flow does not enforce `minAdvanceBookingHours`
**File:** `src/lib/booking.ts:54`  
**What:** `generateSlots()` checks `isBefore(slotStart, now)` (past check only). There is no minimum advance booking window. A user can book a slot 1 minute from now.  
**Why it matters:** Many businesses need lead time (e.g., 2h minimum). This is a Phase 3 feature that isn't wired, but even independent of Phase 3, the current "is in the past" check has no buffer.

---

#### M4. Booking flow does not enforce `maxAdvanceBookingDays`
**File:** `src/lib/booking.ts` and booking UI components.  
**What:** There is no limit on how far into the future a client can book. The calendar is unbounded.  
**Why it matters:** Without a cap, clients could book months in advance, creating operational uncertainty and preventing schedule changes.

---

#### M5. `contact_inbox` create rule allows arbitrary extra fields
**File:** `firestore.rules:114-118`  
**What:** The rule uses `keys().hasAll(...)` but not `keys().hasOnly(...)`. An attacker could add arbitrary fields (e.g., `isAdmin: true`, `customerId: "..."`) to a contact_inbox document at creation time.  
**Why it matters:** While extra fields don't grant privileges (reads are admin-gated), injected fields could confuse the admin UI or future code that reads these fields.

**Recommendation:** Change to `keys().hasOnly(["clientId", "name", "email", "phone", "subject", "message", "source", "status", "createdAt"])`.

---

#### M6. `sendNotification` silently skips when no recipient email is configured
**File:** `server.ts:~380-405`  
**What:** The `sendNotification` function resolves recipient from env vars (`BUSINESS_OWNER_EMAIL`, `CONTACT_NOTIFICATION_EMAIL`, `BOOKING_NOTIFICATION_EMAIL`). If none are set, the flow continues without sending, logging only to console. The notification log records status `queued`.  
**Why it matters:** The admin has no visibility that notifications are being silently dropped. `queued` status is misleading — nothing will process the queue.

**Recommendation:** Use status `failed` with error `"no recipient configured"` when the email target is missing.

---

### LOW

#### L1. `docToInboxItem` and `docToCustomer` use spread + cast
**Files:** `src/services/inbox.ts:21-28`, `src/services/customers.ts:22-29`  
**What:** Both functions do `{ ...data, id, <overrides> } as ContactInboxItem` / `as Customer`. The spread copies any arbitrary Firestore fields into the typed object. Combined with M5 (extra fields allowed), this means injected fields flow into the UI.  
**Impact:** Low — no security risk, but violates type safety principles.

---

#### L2. Hebrew typo in locale
**File:** `src/config/locales/he.ts:249`  
**What:** `analyzing: "מנתחז…"` — likely a typo, should be `"מנתח…"` (analyzing) not `"מנתחז…"` (extra ז).  
**Impact:** Minor UX — visible to Hebrew admin users during AI analysis.

---

#### L3. `checkAvailability` called with empty appointments array in transaction
**File:** `src/services/db.ts:230`  
**What:** Inside the booking transaction, `checkAvailability(appointment, staffMember, [])` passes an empty array for existing appointments. The comment explains this is intentional since the manifest was already checked. However, `checkAvailability` also validates breaks, blocked dates, and work hours — which is valuable. The empty-appointments approach is correct but the code should make the intent clearer.  
**Impact:** No bug, but the dual validation path (manifest intervals + checkAvailability with empty array) could confuse future maintainers.

---

## 3. Explicit Checks Summary

| Check | Status | Notes |
|-------|--------|-------|
| Firestore rules for `contact_inbox` | **Mostly OK** | Public create works; admin read/update scoped. Missing `hasOnly` (see M5). |
| Firestore rules for `notification_logs` | **WARNING** | No auth required for create (see C2). Comment is misleading. |
| Firestore rules for `config` | **OK** | Public read, admin write. Appropriate for Phase 3 when implemented. |
| `saveBusinessRules` admin writes | **N/A** | Phase 3 not implemented (H1). |
| Notification log reads respect tenant + admin | **Partial** | Rules enforce tenant admin for reads. No admin UI exists (M2). |
| Booking UI vs. `daily_manifests` validation gap | **RISK** | Manifest writes are unauthenticated (C1). Transaction logic is correct but depends on rules trust. |
| `minAdvanceBookingHours` coherence | **MISSING** | Not implemented anywhere (M3). |
| `maxAdvanceBookingDays` coherence | **MISSING** | Not implemented anywhere (M4). |
| Locale string parity `en.ts` / `he.ts` | **OK** | Full key parity confirmed for all admin sections (inbox, customers, staffSchedule, auth, dashboard). Minor typo in `he.ts` (L2). |
| `CLAUDE.md` accuracy | **OK** | Accurately describes architecture. Does not claim Phase 3 is done. |
| `MICRO_CRM_PLAN.md` vs. reality | **DIVERGENT** | Phase 2 matches implementation. Phase 3 is fully pending. Plan should be annotated. |

---

## 4. Prioritized Improvements (max 10)

| # | Priority | Item | Effort |
|---|----------|------|--------|
| 1 | Critical | Add auth or structural validation to `daily_manifests` rules (C1) | Medium |
| 2 | Critical | Add auth or field validation to `notification_logs` rules (C2) | Small |
| 3 | High | Implement Phase 3: `BusinessRules` type, admin Scheduling tab, overlay wiring, booking integration (H1) | Large |
| 4 | High | Fix customer upsert race condition with deterministic doc ID (H3) | Small |
| 5 | Medium | Add `hasOnly` to `contact_inbox` create rule (M5) | Small |
| 6 | Medium | Build notification logs read UI in admin (M2) | Medium |
| 7 | Medium | Add `minAdvanceBookingHours` guard to slot generation (M3) | Small |
| 8 | Medium | Add `maxAdvanceBookingDays` guard to calendar/slot generation (M4) | Small |
| 9 | Medium | Fix notification status from `queued` to `failed` when no recipient (M6) | Small |
| 10 | Low | Fix Hebrew typo `"מנתחז…"` → `"מנתח…"` (L2) | Trivial |

---

## 5. What NOT to Touch

These areas are well-designed and should not be over-engineered:

- **Firestore overlay safety** (`tenant.ts`): The niche-aware merge with `SAFE_FIRESTORE_TOP_LEVEL` is correctly designed. The cross-niche guard preventing brand/content clobbering is sound.
- **Booking transaction** (`db.ts:184-248`): The dual-validation pattern (manifest intervals + `checkAvailability`) is correct. The transaction ensures atomicity for the appointment + manifest write.
- **Inbox service** (`inbox.ts`): Clean separation of concerns, real-time subscription, proper Timestamp handling.
- **Customer service** (`customers.ts`): The upsert-by-email logic is the right pattern (modulo the race condition in H3 which needs a deterministic ID, not a redesign).
- **Locale parity**: Both `en.ts` and `he.ts` have identical key structures for all admin sections. No i18n gaps.
- **Admin auth flow**: `ProtectedRoute` → Google sign-in → email check against `siteConfig.adminEmail` is appropriate for the current single-admin model.
- **Express middleware chain**: `requireTrustedOrigin` → `rateLimit` → `attachTenantContext` → `enforceClientActive` follows correct order and separation of concerns.
- **Firestore indexes**: All declared indexes match the queries in the codebase. No missing composite indexes detected.

---

*Generated by technical audit, 2026-05-01. Findings require verification in runtime for items marked as such.*
