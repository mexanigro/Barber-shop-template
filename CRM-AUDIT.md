# CRM Audit Report — Admin Panel (`/admin`)

> **Date:** 2026-06-01
> **Scope:** All 13 tabs, services layer, libs layer, admin shell
> **Method:** Code review + UX evaluation using Impeccable, Emil Design Eng, and UI/UX Pro Max design principles

---

## Executive Summary

The CRM is **functionally solid** — all 13 tabs render, connect to Firestore/API correctly, and cover the core use cases for a local business owner. The services and libs layers are well-typed, complete, and follow consistent patterns (flat Firestore collections, role-based access, demo mode fallback).

**Key findings:**
- **11/13 tabs are fully functional**, 2 are functional but limited in scope
- No broken endpoints or empty stub functions
- UX is generally good but inconsistent across tabs (some have excellent feedback, others are bare)
- Mobile responsiveness varies — sidebar shell is solid, but several tab interiors need work
- The biggest gap is the lack of a unified notification/toast system across all tabs

---

## Part 1 — Tab Functionality Audit

### Status Legend
- **Functional** — Connected, reads/writes correctly, complete feature set
- **Functional (Limited)** — Works but missing features that a business owner would expect
- **Partial** — Has gaps, stubs, or broken logic
- **Broken** — Non-functional or critically flawed

---

### 1. DashboardTab.tsx — `FUNCTIONAL`

| Aspect | Status |
|--------|--------|
| Firestore reads | `notification_logs` subscription + `customers` list |
| Firestore writes | None (read-only) |
| Error handling | Basic `.catch(() => {})` on customer fetch |
| Loading states | Subscription-based |
| Empty states | "No data" for appointments, "No recent notifications" for logs |

**What works well:**
- KPI calculations (bookings, confirmed, cancelled, cancellation rate, estimated revenue)
- Daily trend analytics, revenue by service, bookings by staff
- CSV export with localized headers
- Date range filtering (7d, 30d, custom)
- "Today at-a-glance" always shows current day regardless of range

**Issues found:**
- Silent error swallowing on customer fetch (`.catch(() => {})`) — should at least log or show a fallback
- No delta/comparison with previous period (e.g., "+12% vs last week")
- Revenue is estimated from service prices, not actual payments — could mislead

---

### 2. AppointmentCalendar.tsx — `FUNCTIONAL`

| Aspect | Status |
|--------|--------|
| Firestore reads | Props (delegated to parent) |
| Firestore writes | Props callbacks (`onReschedule`, `onStatusChange`) |
| Error handling | Conflict detection on drag-drop, error auto-clear (3.5s) |
| Loading states | None (data via props) |
| Empty states | Empty day cells, "no appointments" in side panel |

**What works well:**
- Three views: month/week/day with smooth transitions
- Drag-and-drop reschedule with conflict detection
- Optimistic updates with rollback on failure
- Quick-add on empty slot click (week/day views)
- Status color coding (confirmed, pending, cancelled, completed, expired)
- Staff filtering support

**Issues found:**
- No undo for drag-drop reschedule — once dropped, user must drag again to revert
- Week/day views don't show break times from StaffLogistics
- No visual indicator for "today" in month view header
- Quick-add only works in week/day views, not month view

---

### 3. CustomersTab.tsx — `FUNCTIONAL`

| Aspect | Status |
|--------|--------|
| Firestore reads | `customers` + `appointments` |
| Firestore writes | `updateCustomer`, `upsertByEmail`, `createAppointment` |
| Error handling | Try-catch with console.error, silent catch on save notes |
| Loading states | Initial spinner, "Saving" text on notes |
| Empty states | "No customers" icon, search prompt, "no results" |

**What works well:**
- Kanban + list view toggle
- Walk-in customer creation with optional payment/service
- Auto-generated email for walk-ins (`walkin_{ts}@noemail.local`)
- Phone number required for new customers
- Notes editor with async save
- Customer history (all appointments by email match)
- CSV export

**Issues found:**
- Silent catch on `handleSaveNotes()` — user gets no feedback if save fails
- Walk-in appointment creation failure is logged but not surfaced to user
- No customer merge/dedup flow for when the same person books via different channels
- No way to delete a customer from the UI

---

### 4. CustomersKanban.tsx — `FUNCTIONAL`

| Aspect | Status |
|--------|--------|
| API reads | Customers/appointments via props |
| API writes | `PATCH /api/customers/{id}/stage` |
| Error handling | Optimistic updates with rollback, toast notifications |
| Loading states | Toast "updating...", spinner on pause toggle |
| Empty states | Per-stage empty messages, empty customer list |

**What works well:**
- Five-stage pipeline: lead → contacted → scheduled → converted → lost
- Drag-and-drop between stages with real-time API sync
- Bulk operations (up to 20 customers): stage change, CSV export
- Source filtering (9 sources) and tag filtering
- Mobile single-column view with stage navigation
- WhatsApp and email quick-contact links on cards
- Detail panel for in-depth customer view

**Issues found:**
- MAX_BULK_CUSTOMERS = 20 — no explanation to user why limit exists
- "Lost" stage toggle (show/hide) is not persisted — resets on page reload
- No drag handle visual affordance — cards look draggable only because cursor changes

---

### 5. InboxTab.tsx — `FUNCTIONAL`

| Aspect | Status |
|--------|--------|
| Firestore reads | `contact_inbox` subscription |
| Firestore writes | `updateStatus` |
| API calls | WhatsApp config, conversation, queue, pause |
| Error handling | Try-catch with cancellation support |
| Loading states | Spinner for initial load, "Loading" for WA thread, "Sending" for reply |
| Empty states | "Empty inbox", "Select an item", WA thread error fallback |

**What works well:**
- Multi-source inbox: chat, WhatsApp, manual, web
- Status tracking: new → read → replied → archived (with tab counts)
- WhatsApp integration: conversation history, message queue, bot pause control
- Reply options: wa.me link (always works) or queue via API
- Queue state tracking: idle → sending → queued → delayed (60s) → error
- Relative timestamps

**Issues found:**
- No search/filter by customer name or message content
- No way to manually create an inbox item (e.g., phone call note)
- WhatsApp pause confirmation dialog is basic `confirm()` — should be a modal
- Archived messages can't be unarchived back to a previous status

---

### 6. StaffLogistics.tsx — `FUNCTIONAL`

| Aspect | Status |
|--------|--------|
| Firestore reads | `staff_overrides` |
| Firestore writes | `saveStaffOverride` |
| Error handling | Try-catch with error message, retry button |
| Loading states | Spinner on save, unsaved changes indicator (orange dot) |
| Empty states | "Select staff" message |

**What works well:**
- Seven-day schedule editing (Mon–Sun) with per-day on/off toggle
- Start/end time configuration per day
- Multiple breaks per day with add/remove
- Date exceptions: block as "day off" or set "custom hours"
- Calendar widget with visual indicators (red=day off, amber=custom hours)
- Past dates disabled in calendar
- Unsaved changes indicator

**Issues found:**
- No bulk "copy schedule to all days" shortcut
- No recurring exception support (e.g., "closed every Sunday")
- Break times don't validate against work hours (break could exceed work day)
- No visual preview of resulting availability for the week

---

### 7. PaymentsTab.tsx — `FUNCTIONAL (LIMITED)`

| Aspect | Status |
|--------|--------|
| Firestore reads | Appointments via props |
| Firestore writes | None (read-only) |
| Error handling | None |
| Loading states | None |
| Empty states | "No data" icon |

**What works well:**
- Payment method tracking: cash, card, transfer, other, stripe
- Summary metrics: total revenue, today's revenue, stripe revenue, pending count
- Desktop table / mobile card layout
- CSV export with formatted amounts
- Stripe session detection

**Issues found:**
- **No manual payment recording** — can only view payments attached to appointments
- **No refund tracking** — once paid, there's no way to record a refund
- **No payment editing** — can't change payment method or amount after creation
- Revenue is derived from appointment data, not a dedicated payments collection
- No loading or error states (relies entirely on parent props)
- No invoice generation or receipt printing

---

### 8. BusinessRulesTab.tsx — `FUNCTIONAL`

| Aspect | Status |
|--------|--------|
| Firestore reads | `siteConfig.businessRules` |
| Firestore writes | `saveBusinessRules` |
| Error handling | Try-catch with message state |
| Loading states | Saving spinner |
| Empty states | N/A (form always populated) |

**What works well:**
- Four clear business rules: buffer, max advance days, min advance hours, auto-confirm
- Numeric bounds validation (buffer: 0-120, advance: 1-365, min hours: 0-168)
- Clean, simple form layout

**Issues found:**
- Only 4 rules — missing common settings like: max appointments per day, cancellation policy window, deposit requirements
- No explanation of what each rule does in practical terms (e.g., "Buffer: time between appointments for cleanup")
- Changes take effect immediately — no preview or "what would change" indication

---

### 9. SupportTab.tsx — `FUNCTIONAL`

| Aspect | Status |
|--------|--------|
| Firestore reads | `provider_messages` subscription |
| Firestore writes | `sendMessage`, `markAsRead` |
| Error handling | Firebase config check, graceful no-Firebase UI |
| Loading states | Spinner |
| Empty states | "Empty" message |

**What works well:**
- Two-way messaging (provider ↔ client)
- Quick action buttons for common requests (photo, price, text, service, fix)
- Auto-mark provider messages as read
- Auto-scroll to latest message
- Demo mode with realistic timestamps
- Success state with checkmark icon

**Issues found:**
- No message categories or tagging
- No file/image attachment support
- No notification when Liam replies (user must check tab manually)
- Quick actions insert predefined text but user can't customize them

---

### 10. StockTab.tsx — `FUNCTIONAL`

| Aspect | Status |
|--------|--------|
| Firestore reads | `stock_items` + `stock_movements` (real-time) |
| Firestore writes | `addItem`, `updateItem`, `adjustQuantity`, `deleteItem` |
| Error handling | Try-catch in modals, error state with retry |
| Loading states | Modal `busy` flag |
| Empty states | "No items" message |

**What works well:**
- Full CRUD for stock items
- Movement tracking with reason and timestamp
- Low stock alerts (yellow border + count)
- Unit types: unidades, ml, gr, oz, kg, litros
- Category presets via datalist
- History modal per item
- Dual-layout fallback (flat + legacy nested collections)

**Issues found:**
- No barcode/SKU field for items
- No supplier tracking
- No reorder alerts or auto-reorder suggestions
- No cost tracking (purchase price vs. selling price)
- Category management is free-text — no predefined categories to enforce consistency
- Movement history doesn't show who performed the action (only has `performedBy` field but UI doesn't prominently display it)

---

### 11. TasksTab.tsx — `FUNCTIONAL`

| Aspect | Status |
|--------|--------|
| API reads | `GET /api/tasks` |
| API writes | `POST`, `PATCH`, `DELETE /api/tasks` |
| Error handling | Error banner with retry, auth error check |
| Loading states | Spinner |
| Empty states | Dashed border + "no tasks" message |

**What works well:**
- Four statuses: pending → in_progress → done → archived
- Three priorities: low, medium, high
- Drag-and-drop between status columns
- Rich filtering: search + priority + assignee + tag + owner scope + archived toggle
- Task assignment with sharing flag
- Related customer link
- Role-based permissions (creator or owner can edit/delete)
- Notes field with blur-save in detail panel

**Issues found:**
- Customer picker is simplified — in real mode just accepts raw ID, not searchable
- No due date reminders or overdue indicators
- No recurring tasks
- No task templates for common workflows
- No comments/activity log per task (only notes field)

---

### 12. KnowledgeTab.tsx — `FUNCTIONAL`

| Aspect | Status |
|--------|--------|
| API reads | `GET /api/knowledge/list`, `GET /api/knowledge/preview/{id}` |
| API writes | `POST /api/knowledge/upload`, `DELETE /api/knowledge/{id}` |
| Error handling | Try-catch with banner messages |
| Loading states | Spinner + progress bar in upload |
| Empty states | BookOpen icon + explanatory text |

**What works well:**
- File upload: drag-and-drop with validation (10MB limit, .txt/.md/.csv/.pdf)
- Paste raw text content (min 10 chars)
- Status tracking: processing → indexed → failed
- Capacity limits: 50 docs max, 10 MB total with progress bars (red at 90%+)
- Chunk preview (semantic split fragments)
- Base64 encoding for file upload

**Issues found:**
- Owner-only access — managers can't contribute knowledge
- No way to edit uploaded content (must delete and re-upload)
- No search within uploaded documents
- No indication of which documents the chatbot has actually used
- Failed documents show status but no re-process action

---

### 13. NotificationLogsTab.tsx — `FUNCTIONAL (LIMITED)`

| Aspect | Status |
|--------|--------|
| Firestore reads | `notification_logs` subscription |
| Firestore writes | None (read-only) |
| Error handling | None needed |
| Loading states | Loading text |
| Empty states | Bell icon + "empty" message |

**What works well:**
- Real-time log subscription
- Status icons: check (sent), alert (failed), clock (queued)
- Table display: when, status, type, recipient, subject
- Error text shown inline with hover title

**Issues found:**
- **No filtering or search** — can't filter by status, type, date range, or recipient
- **No pagination** — all logs loaded at once, will degrade with scale
- **No retry action for failed notifications**
- **No export capability**
- Only shows email channel — no SMS/WhatsApp/push log entries
- No click-to-view-detail for individual log entries

---

## Part 2 — UX Audit

Evaluated against Impeccable design laws, Emil Design Eng interaction principles, and UI/UX Pro Max 99 guidelines.

### 2.1 Cross-Tab UX Issues

| Issue | Severity | Affected Tabs | Design Principle Violated |
|-------|----------|---------------|--------------------------|
| **No unified toast/notification system** | HIGH | All | UX Pro Max §8: `submit-feedback`, `success-feedback` |
| **Inconsistent error feedback** | HIGH | Dashboard, Customers, Inbox | UX Pro Max §8: `error-clarity`, `error-recovery` |
| **No confirmation dialogs for destructive actions** in some tabs | HIGH | Stock (delete), Tasks (delete) | UX Pro Max §8: `confirmation-dialogs`, Impeccable: `destructive-emphasis` |
| **Silent failures** (console.error only) | HIGH | CustomersTab, DashboardTab | UX Pro Max §8: `error-feedback`, `timeout-feedback` |
| **No skeleton/shimmer loading** — only spinners | MEDIUM | All | UX Pro Max §3: `progressive-loading`, §7: `loading-states` |
| **Inconsistent empty states** — some are informative, some are bare | MEDIUM | Various | UX Pro Max §8: `empty-states` |
| **No keyboard shortcuts** for common actions | MEDIUM | All | Impeccable: efficiency, Emil: power user patterns |
| **Tab navigation not URL-routed** — no deep linking | MEDIUM | Shell | UX Pro Max §9: `deep-linking`, `back-behavior` |
| **No breadcrumbs or tab title in browser tab** | LOW | Shell | UX Pro Max §9: `breadcrumb-web` |

### 2.2 Mobile-Specific Issues

| Issue | Severity | Affected Tabs |
|-------|----------|---------------|
| **Calendar week/day views are cramped** on small screens | HIGH | AppointmentCalendar |
| **Tables don't adapt** — horizontal scroll needed | HIGH | NotificationLogs, Users |
| **Kanban columns require scrolling** — no swipe navigation | MEDIUM | CustomersKanban, Tasks |
| **Modals may extend beyond viewport** on small screens | MEDIUM | Stock, Knowledge, Users |
| **Touch targets on +/- stock buttons** may be too small | MEDIUM | StockTab |
| **No pull-to-refresh** pattern | LOW | All |

### 2.3 Per-Tab UX Assessment

#### DashboardTab
- **Clarity:** Good — KPIs are well-labeled with icons
- **Feedback:** Weak — no loading skeleton for KPI cards, error is silently swallowed
- **Mobile:** Good — stats grid adapts from 4→2 columns
- **Improvement:** Add sparkline trends to KPI cards, show delta vs. previous period

#### AppointmentCalendar
- **Clarity:** Excellent — color-coded statuses, clear view switcher
- **Feedback:** Good — drag-drop shows error on conflict
- **Mobile:** Weak — week/day views are hard to use on small screens
- **Improvement:** Default to day view on mobile, add swipe between days

#### CustomersTab / CustomersKanban
- **Clarity:** Good — pipeline stages are intuitive
- **Feedback:** Good — toast notifications on stage changes, optimistic updates
- **Mobile:** Kanban adapts to single-column with stage nav — well done
- **Improvement:** Add customer avatar/initials, show LTV metric on cards

#### InboxTab
- **Clarity:** Good — tab filters with counts, source icons
- **Feedback:** Good — loading/sending/queue states all handled
- **Mobile:** Needs work — conversation thread + sidebar may not fit
- **Improvement:** Add search, mark-all-as-read button, manual note creation

#### StaffLogistics
- **Clarity:** Good — day toggles and time inputs are straightforward
- **Feedback:** Good — unsaved changes indicator, save error with retry
- **Mobile:** Acceptable — form stacks vertically
- **Improvement:** Add "copy to all days" shortcut, weekly availability summary

#### PaymentsTab
- **Clarity:** Good — summary cards are clear
- **Feedback:** Weak — no loading state, no error state
- **Mobile:** Good — switches to card layout
- **Improvement:** Add manual payment recording, refund tracking

#### BusinessRulesTab
- **Clarity:** Weak — rules lack explanatory descriptions
- **Feedback:** Adequate — saving spinner + success/error message
- **Mobile:** Good — simple form
- **Improvement:** Add helper text explaining each rule's practical effect

#### SupportTab
- **Clarity:** Good — chat-style layout is intuitive
- **Feedback:** Good — success banner after send
- **Mobile:** Good — full-width chat
- **Improvement:** Add new-message notification, file attachments

#### StockTab
- **Clarity:** Good — item cards with low-stock alerts
- **Feedback:** Good — modal busy states, error retry
- **Mobile:** Good — card layout
- **Improvement:** Add barcode scanning, supplier tracking, cost analysis

#### TasksTab
- **Clarity:** Good — kanban with priority colors and assignee initials
- **Feedback:** Good — error banner with retry, drag-drop
- **Mobile:** Acceptable — columns stack but may feel cramped
- **Improvement:** Add overdue indicators, due date reminders, recurring tasks

#### KnowledgeTab
- **Clarity:** Good — capacity bars, status indicators
- **Feedback:** Good — upload progress, success/error banners
- **Mobile:** Good — file upload may need larger drop zone
- **Improvement:** Allow manager access, add search, show usage stats

#### NotificationLogsTab
- **Clarity:** Weak — bare table with no filtering
- **Feedback:** Minimal — just a loading text
- **Mobile:** Weak — table doesn't adapt well
- **Improvement:** Add filters, pagination, retry for failed, export

#### UsersTab
- **Clarity:** Good — role chips color-coded, permission checks clear
- **Feedback:** Good — banner for success/error, spinner on actions
- **Mobile:** Good — stacks on mobile
- **Improvement:** Add activity log per user, last login timestamp

---

## Part 3 — Services & Libs Assessment

### Services Layer

| Service | Status | Collections | Notes |
|---------|--------|-------------|-------|
| `customers.ts` | Complete | `customers` | Deterministic doc IDs via email hash, upsert-merge semantics |
| `inbox.ts` | Complete | `contact_inbox` | Real-time subscription with cleanup, repliedAt tracking |
| `stock.ts` | Complete | `stock_items`, `stock_movements` | Dual-layout fallback (flat + legacy), transaction-based adjustments |
| `support.ts` | Complete | `provider_messages` | Deferred import to avoid circular deps |
| `ai.ts` | Complete | None (API calls) | Excellent error handling, no PII sent to AI |
| `notificationLogs.ts` | Read-only | `notification_logs` | Only subscribe — writes happen server-side (by design) |

### Libs Layer

| Lib | Status | Quality | Notes |
|-----|--------|---------|-------|
| `crm-store.ts` | Complete | Good | Lightweight in-memory store shared between dashboard and chatbot |
| `crm-metrics.ts` | Complete | Excellent | Pure functions, 4 range types, doc cap (5000), demo data generator |
| `customer-pipeline.ts` | Complete | Excellent | 5-stage pipeline logic, tag validation (max 20/50 chars), source palette |
| `booking.ts` | Complete | Excellent | Full slot generation with all constraints, reject reasons |
| `tasks.ts` | Complete | Excellent | SDK-agnostic I/O, role-based access, natural language dates, fuzzy lookup |
| `admin-users.ts` | Complete | Excellent | Hierarchical roles, O(1) lookup by email, invite flow |
| `schedulingRules.ts` | Complete | Good | Centralized rule getters with clamping, Firestore overlay pattern |

### Firestore Collection Map

All collections follow the flat root-level layout rule with `clientId` field:

| Collection | Read by | Written by | Real-time |
|------------|---------|------------|-----------|
| `customers` | CustomersTab, Dashboard | CustomersTab, API | No (poll) |
| `contact_inbox` | InboxTab | InboxTab, Server | Yes |
| `stock_items` | StockTab | StockTab | Yes |
| `stock_movements` | StockTab | StockTab | Yes |
| `provider_messages` | SupportTab | SupportTab | Yes |
| `notification_logs` | NotificationLogsTab, Dashboard | Server only | Yes |
| `tasks` | TasksTab | TasksTab (via API) | No (poll) |
| `admin_users` | UsersTab | UsersTab (via API) | No (poll) |
| `staff_overrides` | StaffLogistics | StaffLogistics | No (fetch on mount) |

---

## Part 4 — Improvement Proposals (Priority-Ordered)

### P0 — Critical (fix before next deploy)

| # | Tab | Proposal | Rationale |
|---|-----|----------|-----------|
| 1 | All | **Unified toast system** — Replace ad-hoc error/success patterns with a single toast provider (e.g., Sonner or a shared `<Toast>` context) | 6 different feedback patterns across 13 tabs. Users can't predict where feedback will appear. UX Pro Max §8: `submit-feedback`, `toast-dismiss` |
| 2 | CustomersTab | **Surface save errors to user** — Replace silent `.catch(() => {})` with toast/banner | User thinks notes saved when they didn't. Data loss risk |
| 3 | DashboardTab | **Surface customer fetch errors** — Show fallback banner instead of silent swallow | Dashboard shows partial data with no indication something is missing |

### P1 — High Priority (next sprint)

| # | Tab | Proposal | Rationale |
|---|-----|----------|-----------|
| 4 | NotificationLogs | **Add filtering** (status, type, date range) + **pagination** (25/50/100 per page) | Currently unusable at scale — all logs loaded at once with no filtering |
| 5 | PaymentsTab | **Add manual payment recording** — Allow entering cash/card payments outside of appointments | Business owners receive payments in person that aren't tied to bookings |
| 6 | Shell | **URL-route each tab** — Map `activeTab` to URL hash (`/admin#customers`) for deep linking and back button | UX Pro Max §9: `deep-linking`, `back-behavior`. Currently pressing back exits the entire admin panel |
| 7 | AppointmentCalendar | **Default to day view on mobile** — Detect `< lg` breakpoint and default to day view | Week view is cramped on small screens, making appointments hard to read |
| 8 | BusinessRulesTab | **Add helper text** to each rule explaining its practical effect | Non-technical users don't understand "buffer minutes" or "min advance booking hours" |
| 9 | InboxTab | **Add search** by customer name, email, or message content | Can't find a specific conversation in a growing inbox |

### P2 — Medium Priority (next month)

| # | Tab | Proposal | Rationale |
|---|-----|----------|-----------|
| 10 | PaymentsTab | **Refund tracking** — Add ability to mark payments as refunded with reason | Common business need, currently no way to track |
| 11 | TasksTab | **Overdue indicators** — Highlight tasks past due date in red, add badge count | Business owners lose track of overdue tasks |
| 12 | TasksTab | **Customer picker with search** — Replace raw ID input with searchable dropdown | Current simplified picker hurts usability |
| 13 | CustomersTab | **Customer merge/dedup** — Detect potential duplicates by phone/email and offer merge | Same person booking via WhatsApp and web creates duplicates |
| 14 | StaffLogistics | **"Copy schedule to all days" shortcut** | Common pattern: same hours Mon-Fri, reduced Sat, closed Sun — currently requires 7 manual entries |
| 15 | KnowledgeTab | **Allow manager access** — Not just owner | Managers often manage the chatbot knowledge base |
| 16 | All | **Skeleton/shimmer loading** — Replace spinners with content-shaped skeletons | UX Pro Max §3: `progressive-loading`. Reduces perceived load time |
| 17 | StockTab | **Barcode/SKU field** + cost tracking (purchase price vs selling price) | Professional inventory management needs |
| 18 | SupportTab | **New message notification** — Badge on Support tab when Liam replies | User currently has no way to know there's a new reply without checking |

### P3 — Nice to Have (backlog)

| # | Tab | Proposal | Rationale |
|---|-----|----------|-----------|
| 19 | AppointmentCalendar | **Show break times** from StaffLogistics as grayed-out blocks | Prevents scheduling during breaks |
| 20 | NotificationLogs | **Retry failed notifications** — Add retry button per failed entry | Currently no recovery path for failed emails |
| 21 | All | **Keyboard shortcuts** — `N` for new, `S` for save, arrow keys for navigation | Power user efficiency |
| 22 | UsersTab | **Activity log per user** — Last login, last action | Security and team management |
| 23 | StockTab | **Reorder alerts** — Notification when item drops below threshold | Proactive inventory management |
| 24 | TasksTab | **Recurring tasks** — Weekly/monthly task templates | Common for maintenance, cleaning, restocking |
| 25 | CustomersKanban | **Persist "show lost" toggle** in localStorage | Resets on every page load |
| 26 | InboxTab | **Manual note creation** — Record phone call notes as inbox items | Not all interactions come through digital channels |
| 27 | AppointmentCalendar | **Undo for drag-drop** — Toast with "Undo" button after reschedule | Emil Design Eng: `undo-support`, prevents accidental changes |
| 28 | DashboardTab | **Period comparison** — Show delta vs previous period ("+12% revenue vs last week") | Business owners want to see trends, not just absolute numbers |

---

## Part 5 — Hub Integration Notes

### Current Hub → Template Data Flow

The nichos-hub controls the CRM configuration via Firestore `config/{clientId}`:

| Hub Control | Template Reads | Notes |
|-------------|---------------|-------|
| `features.*` | Section toggles, stock enable/disable | Boolean flags |
| `activeTheme` | Visual theme | Via `data-theme` attribute |
| `visibleServices` | Service list | Filters available services |
| `serviceOverrides` | Price/duration changes | Deep merged over preset |
| `staff` | Staff list | Used by StaffLogistics, Calendar |
| `sections` | Section ordering | Landing page layout |
| `hero`, `gallery` | Content | Landing customization |
| `owner` | Admin email | Auth gating |
| `payment` | Stripe config | PaymentsTab integration |
| `notifications` | Email config | NotificationLogsTab |

### Integration Gaps

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| **No hub control over business rules** | Hub admin can't set buffer/advance booking rules remotely | Add `businessRules` to hub config schema |
| **No hub visibility into CRM metrics** | Hub admin can't see client's dashboard KPIs | Add API endpoint for hub to pull metrics |
| **Stock management not hub-configurable** | Can't pre-populate stock items or categories per niche | Add niche-specific stock presets |
| **Knowledge base not synced to hub** | Hub can't push shared knowledge docs to multiple clients | Add hub-side knowledge management |
| **Task templates not per-niche** | Each business starts with empty task board | Add niche-specific task templates (e.g., barberia: "Clean station", "Restock pomade") |

---

## Summary Table

| Tab | Status | UX Grade | Mobile | Priority Fix |
|-----|--------|----------|--------|-------------|
| DashboardTab | Functional | B | Good | Surface errors (P0) |
| AppointmentCalendar | Functional | A- | Weak | Day view default on mobile (P1) |
| CustomersTab | Functional | B+ | Good | Surface save errors (P0) |
| CustomersKanban | Functional | A- | Good | — |
| InboxTab | Functional | B+ | Needs work | Add search (P1) |
| StaffLogistics | Functional | B | Acceptable | Copy schedule shortcut (P2) |
| PaymentsTab | Functional (Limited) | C+ | Good | Manual payment entry (P1) |
| BusinessRulesTab | Functional | C+ | Good | Helper text (P1) |
| SupportTab | Functional | B | Good | New message notification (P2) |
| StockTab | Functional | B | Good | SKU/cost fields (P2) |
| TasksTab | Functional | B+ | Acceptable | Overdue indicators (P2) |
| KnowledgeTab | Functional | B | Good | Manager access (P2) |
| NotificationLogsTab | Functional (Limited) | D+ | Weak | Filters + pagination (P1) |
| UsersTab | Functional | B+ | Good | — |

**Overall CRM Grade: B**
Functionally complete for MVP. No broken features. Main gaps are in UX consistency (error feedback, loading patterns) and a few tabs that are too limited for real-world use (PaymentsTab, NotificationLogsTab). The services and libs layers are excellent — well-typed, well-structured, and production-ready.
