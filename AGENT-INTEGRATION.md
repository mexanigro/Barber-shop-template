# Agent Integration — master-template ↔ whatsapp-agentkit

How this template talks to the WhatsApp agentkit (sibling repo `whatsapp-agentkit`)
so that every customer interaction — web form, booking, walk-in, cancellation —
fans out to WhatsApp without manual work.

This is the **CRM → Agent** direction. The reverse (Agent writes appointments back
to Firestore) is handled by **nichos-hub** acting as a Firestore bridge between
the agentkit and this CRM.

---

## Why this exists

Before this integration, the master-template only sent **email notifications**
via Resend. Customers booking on the web got an email confirmation, but:

- The business owner only learned about new leads/bookings via email (easy to miss).
- The staff member assigned to a turn got nothing.
- The customer didn't get a WhatsApp confirmation.
- No 24h reminder, no review request.
- When the admin cancelled a turn in the CRM, the customer wasn't notified.

The integration closes those gaps by POSTing to the agentkit's internal endpoints
whenever something happens in the CRM. The agentkit then handles the WhatsApp
delivery, follow-up scheduling and review requests.

---

## Architecture

```
┌──────────────────────────┐      ┌─────────────────────────────┐
│ master-template (this)   │      │ whatsapp-agentkit (Railway) │
│ ─ Vercel SPA + Express   │      │ ─ FastAPI + Twilio          │
│ ─ Firestore CRM          │      │ ─ Claude API + SQLite       │
└─────────────┬────────────┘      └──────────────┬──────────────┘
              │                                  │
   /api/contact, /api/notify-booking,            │  Inbound WhatsApp
   /api/appointment/notify                       │  (Twilio webhook)
              │                                  │
              │  POST /webhook/lead              │
              │  POST /notify                    │
              ├─────────────────────────────────►│
              │  x-agent-secret header           │
              │                                  │
              │                                  │  Outbound WhatsApp
              │                                  │  (typing + delays)
              │                                  ▼
              │
              ▼
     Firestore (whatsapp_conversations,
                whatsapp_outbox,
                whatsapp_config)
              ▲
              │
              │  nichos-hub bridges Firestore
              │  ↔ agentkit (separate repo)
```

The agent does NOT read this template's Firestore directly. nichos-hub mirrors
WhatsApp conversations into `whatsapp_conversations` so the CRM InboxTab can
display them.

---

## What flows where

### 1. Lead from web form → `/api/contact`

| Step | Effect |
|---|---|
| User submits ContactHub / QuickInquiry form | `POST /api/contact` |
| Server writes to Firestore `contact_inbox` | shows in CRM InboxTab |
| Server sends Resend email to `BUSINESS_OWNER_EMAIL` | existing path |
| Server POSTs to agentkit `/webhook/lead` (new) | admin gets WhatsApp |

### 2. Booking from web → `BookingWizard` → `/api/notify-booking`

| Step | Effect |
|---|---|
| Frontend `dbService.saveAppointment(...)` | Firestore appointments + manifest |
| Frontend `POST /api/notify-booking` | email + WhatsApp |
| Server Resend email | existing path |
| Server POSTs agentkit `/notify` (new) with `type=appointment_booked` | admin + staff + customer get WhatsApp |
| Agentkit auto-schedules reminder 24h pre + review 4h post | runs from agentkit cron |

### 3. Admin cancels → CRM UI → Firestore + `/api/appointment/notify`

| Step | Effect |
|---|---|
| `AdminDashboard.handleStatusChange(id, "cancelled")` | `dbService.updateAppointment` |
| Frontend `POST /api/appointment/notify` (action=cancelled) | new |
| Server POSTs agentkit `/notify` with `type=appointment_cancelled` | customer gets WhatsApp |
| Agentkit cancels pending reminder + review for that customer | follow-ups never fire |

### 4. Admin reschedules → drag-drop calendar → Firestore + `/api/appointment/notify`

| Step | Effect |
|---|---|
| `AdminDashboard.handleReschedule(id, date, time)` | optimistic update + Firestore |
| Frontend `POST /api/appointment/notify` (action=rescheduled) | new |
| Server cancels old + books new on agentkit | customer notified of new datetime; reminders re-programmed |

### 5. Admin walk-in (Dashboard or CustomersTab) → Firestore + `/api/appointment/notify`

| Step | Effect |
|---|---|
| Frontend `dbService.createAppointment(...)` | Firestore |
| If date >= today + `type=appointment`, frontend `POST /api/appointment/notify` (action=booked) | only future turns trigger |
| Server POSTs agentkit `/notify` | confirmation + reminder + review |

---

## Endpoints added

| Method | Path | Used by | Purpose |
|---|---|---|---|
| POST | `/api/appointment/notify` | CRM admin actions | Cancel / reschedule / walk-in notifier |

Plus extensions to existing:

| Endpoint | What changed |
|---|---|
| `/api/contact` | accepts optional `phone`, fires agentkit `/webhook/lead` |
| `/api/notify-booking` | accepts `staffId`, `businessName`, `duration`; fires agentkit `/notify` with full appointment context |

---

## Configuration (env)

All three are required for the integration to activate. When any is missing
the CRM works exactly as before (email-only path).

```env
WHATSAPP_AGENT_URL=https://your-agent.up.railway.app
AGENT_API_SECRET=<same secret as agentkit>
CLIENT_ID=client_barber_01   # same as VITE_CLIENT_ID
BUSINESS_OWNER_PHONE=+972...   # admin's WhatsApp (E.164)
STAFF_PHONES=+972...,+972...   # optional comma-separated staff
```

`AGENT_API_SECRET` and `CLIENT_ID` must match the values in the agentkit's
`.env`. The agentkit rejects calls with mismatched `clientId` (403).

---

## What's NOT in this integration (and why)

| Gap | Where it lives |
|---|---|
| **Google Calendar sync** | nichos-hub. When the agentkit reserves a turn it POSTs to nichos-hub `/api/appointments/book`; nichos-hub writes both Firestore and Calendar. |
| **WhatsApp → Firestore mirror** | nichos-hub. The agentkit writes locally to SQLite; nichos-hub reads the agent's outbox and mirrors conversations into Firestore `whatsapp_conversations` so the CRM InboxTab sees them. |
| **Cron that fires follow-ups in agentkit** | Railway cron job (external to both repos). Documented in `whatsapp-agentkit/AUTOMATION-FLOWS.md`. |
| **Staff phones in Firestore config** | Out of scope here. For now `STAFF_PHONES` env var is the source of truth; surfacing per-staff phones from `config.staff[i].phone` is a future improvement. |

---

## Pending — recommended follow-ups

These are NOT blockers but would close further gaps:

1. **Staff phones in Firestore** — extend the `staff` schema with `phone` and
   read from there instead of env. Lets the hub manage staff per-client.
2. **CRM dashboard agent metrics** — pull `/analytics/stats` from the agentkit
   and surface "leads from WhatsApp", "conversion via WhatsApp" in `DashboardTab`.
3. **Bidirectional ack** — when the agent sends a WhatsApp notification, write
   an entry to `notification_logs` so the CRM's `NotificationLogsTab` shows the
   WhatsApp channel (currently only shows email).
4. **Phone field on contact form** — `QuickInquiry` and `ContactHub` don't
   collect phone yet. The endpoint accepts it, but the UI doesn't ask.
5. **Per-staff notification routing** — `/api/appointment/notify` always
   sends to ALL `STAFF_PHONES`. A real per-staff lookup keyed on `staffId`
   would only notify the assigned barber.
6. **Idempotency** — repeated calls to `/api/appointment/notify` for the same
   appointment id will send duplicate WhatsApps. The agentkit could dedup by
   appointmentId+type+timestamp.

---

## Smoke test (manual)

1. Set the 5 env vars in `.env`.
2. Start the dev server: `npm run dev`. Watch the startup log — it should
   show `✓ WHATSAPP_AGENT_URL` and `✓ AGENT_API_SECRET` etc.
3. Submit the ContactHub form. Check:
   - `BUSINESS_OWNER_EMAIL` inbox: receives Resend email
   - `BUSINESS_OWNER_PHONE`: receives WhatsApp ("Nuevo lead (web_contact)...")
4. Book a turn via the BookingWizard. Check:
   - Admin: receives WhatsApp + email
   - Customer: receives WhatsApp confirmation
   - In agentkit: `seguimientos_programados` has 2 rows (recordatorio + review)
5. From CRM admin, cancel that turn. Check:
   - Customer: receives WhatsApp cancellation
   - In agentkit: the 2 follow-ups are marked `cancelado`
6. From CRM admin, drag-drop another turn to a new time. Check:
   - Customer: receives WhatsApp with new datetime
   - Admin: receives WhatsApp ("Turno reprogramado...")
