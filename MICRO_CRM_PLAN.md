# Micro CRM + Admin Ops Plan

Status: **MVP cerrado** — funcionando en producción (Vercel + Firestore).
Scope: Admin panel only (multi-tenant safe), phased rollout.
Owner model: Single-tenant deploys over shared Firestore con `clientId` scoping.
Última revisión: 2026-05-02

---

## 1) Goal

Add an admin-native micro CRM and operations layer without breaking current booking/admin flows:

1. Customer Directory + Profile
2. Availability and Business Rules configuration
3. Communication audit + inbox
4. Operational KPI dashboard
5. AI-powered business snapshot

---

## 2) Constraints (Do Not Break)

- Strict tenant isolation (`clientId`) on all reads/writes.
- Do not alter kill-switch semantics or middleware trust chain.
- i18n parity for any new admin copy (`en.ts` / `he.ts`).
- Prefer additive schema changes over migrations.
- Keep rollout phased and reversible.

---

## 3) Data Model

### 3.1 `customers/{customerId}` ✅ implementado

Campos activos:
- `clientId`, `name`, `email`, `phone?`, `notes?`, `visitCount?`
- `source: "booking" | "manual" | "import"`
- `createdAt`, `lastVisitAt`

Limitación documentada: `createdAt` = fecha de primer upsert en CRM (primer turno registrado), no necesariamente la primera visita física del cliente.

Upsert automático al guardar un turno (match por `clientId + email`).

### 3.2 `contact_inbox/{docId}` ✅ implementado

- `clientId`, `name`, `email`, `phone?`, `subject`, `message`
- `source: "web" | "chat" | "manual"`
- `status: "new" | "read" | "replied" | "archived"`
- `customerId?`, `repliedAt?`, `createdAt`

### 3.3 `notification_logs/{docId}` ✅ implementado

- `clientId`, `channel: "email" | "sms" | "push"`, `recipient`
- `subject?`, `type: "booking" | "contact" | "reminder" | "marketing"`
- `status: "sent" | "failed" | "queued"`
- `refId?`, `providerMessageId?`, `error?`, `createdAt`

### 3.4 `config/{clientId}` ✅ implementado (extensión)

- `businessRules?: { bufferMinutes, maxAdvanceBookingDays, minAdvanceBookingHours, autoConfirm }`
- `crmSettings?: { autoCreateCustomer, defaultTags }` (definido, UI pendiente)
- `notificationPrefs?: { bookingConfirmation, reminderHoursBefore, contactAutoReply }` (definido, lógica pendiente)

### 3.5 KPI storage strategy

MVP activo: KPIs computados client-side desde appointments suscritos en tiempo real.
Ruta de escala: colección `kpi_snapshots` cuando un tenant supere la agregación client-side (backlog).

---

## 4) Frontend vs Backend Split

Frontend (Firestore SDK bajo reglas):
- Customer list/search/edit/notes
- Inbox read/update status
- Notification log read
- Business rules config writes
- KPI aggregation (MVP client-side)

Backend (`api/index.ts` — handler nativo Vercel, sin serverless-http):
- `/api/contact` → persiste inbox entries
- `/api/notify-booking` → persiste notification logs
- `/api/ai/analyze?type=crm` → CRM AI Snapshot (Gemini REST, modelo cascade)
- `/api/ai/chat` → chatbot
- `/api/health` → healthcheck (registrado ANTES del kill-switch middleware)

Notas de arquitectura Vercel:
- `api/index.ts` es self-contained (no importa `server.ts`).
- Handler exportado como `export default function handler(req, res) { app(req, res) }`.
- Variables `VITE_*` son build-time only — NO disponibles en serverless runtime. Usar `CLIENT_ID` y `FIREBASE_DATABASE_ID` (sin prefijo) para el servidor.
- Firebase Admin SDK omitido temporalmente (gRPC hang en Vercel). Kill-switch retorna `active` hardcoded. Pendiente: Firestore REST API + JWT para restaurar kill-switch real.

---

## 5) Rules and Indexes ✅ implementado en repo

Reglas activas en `firestore.rules`:
- `appointments`, `customers`, `contact_inbox`, `notification_logs`, `config`, `clients`
- Tenant scoping: `request.auth.token.clientId == resource.data.clientId`
- Notification logs: inmutables post-creación (no update/delete)

Índices compuestos definidos:
1. `contact_inbox`: `clientId ASC, createdAt DESC`
2. `contact_inbox`: `clientId ASC, status ASC, createdAt DESC`
3. `notification_logs`: `clientId ASC, createdAt DESC`

Deploy: `npm run firebase:deploy:firestore` (no usar `--only firestore:indexes` con named databases).

---

## 6) Admin UX — Estado actual ✅

Tabs implementadas:
- **Appointments** — lista en tiempo real con Firestore subscription
- **Staff** — gestión de staff + logistics
- **Customers** — lista searchable, detalle, notes, historial de citas
- **Inbox** — contact_inbox con lifecycle new/read/replied/archived
- **Notification Logs** — audit log de emails enviados (read-only)
- **Scheduling** — business rules editor (buffer, advance days, auto-confirm)
- **Overview** — KPI dashboard + CRM AI Snapshot + CSV export de citas

---

## 7) Phased Roadmap — Estado final

### Phase 1 — Customers MVP ✅ CERRADA

- Tipos extendidos (`notes`, `visitCount`, `source`)
- `src/services/customers.ts`
- Upsert automático desde booking flow
- Customers tab: búsqueda, notas, historial de citas por cliente

### Phase 2 — Inbox + Notification Logs ✅ CERRADA

- `contact_inbox` y `notification_logs`: tipos, servicios, reglas, índices
- `/api/contact` persiste en inbox
- Notification log escrito en flujo de envío
- Inbox tab con lifecycle completo
- Email log tab (read-only)

### Phase 3 — Business Rules Config ✅ CERRADA (MVP)

- Business rules editor en tab Scheduling
- Persiste en `config/{clientId}.businessRules`
- Booking flow respeta buffer, advance days, min notice, auto-confirm

### Phase 4 — KPI Dashboard ✅ CERRADA

- Overview tab (`DashboardTab.tsx`)
- KPI cards: total turnos, confirmados, cancelados, tasa de cancelación, revenue estimado, nuevos clientes
- Date range filter: 7 días / 30 días / rango custom
- Staff utilization breakdown (tabla por staff)
- Notification logs widget (últimas 10 entradas)
- i18n: `en.ts` + `he.ts` completos

Backlog (no bloqueante):
- Gráfico de tendencia (bar/line chart) — decisión de librería pendiente (ver §8)
- `kpi_snapshots` para tenants de alto volumen

### Phase 5 — Polish + AI Insights ✅ CERRADA

Lo que está funcionando en producción:
- **CSV export — Appointments**: botón en Overview, exporta citas del rango seleccionado a `appointments-YYYY-MM-DD.csv` (UTF-8 BOM para Excel Windows)
- **CRM AI Snapshot**: endpoint `/api/ai/analyze?type=crm`; prompt con KPIs pre-agregados + hasta 20 citas recientes (sin PII). Respuesta: `{ summary, opportunities[], churnRisk }`. Renderizado en Overview con botón "Run CRM analysis"
- **Gemini model cascade**: prueba `gemini-2.5-flash-preview-04-17` → `gemini-2.5-flash` → `gemini-2.5-pro-*`. Compatible con API keys nuevas (post-2025) que no tienen acceso a modelos 1.5/2.0
- **Utilidad CSV**: `src/lib/exportCsv.ts` compartida (`buildCsvBlob` + `downloadBlob`)

Corrección vs versión anterior del plan:
- **CSV export — Customers**: marcado como hecho en el plan anterior pero NO implementado en el código. Movido a backlog. La utilidad `buildCsvBlob` existe y lo haría trivial si se necesita.

Backlog (no bloqueante para MVP):
- CSV export en tab Customers (trivial con `buildCsvBlob` existente)
- Auto-reply / email reminders
- Granular roles (`owner/manager/staff`)
- Chart layer (ver §8)

---

## 8) Open Decisions — Estado actual

| # | Decisión | Estado |
|---|----------|--------|
| 1 | Customer dedupe key (`email` vs `email + phone`) | **Resuelto: `clientId + email`** — implementado en upsert |
| 2 | Inbox reply model (`mailto` vs in-app thread) | Abierto — MVP usa `mailto` implícito |
| 3 | Notification log write path (client SDK vs admin SDK) | **Resuelto: server-side** en `/api/contact` y `/api/notify-booking` |
| 4 | KPI scaling threshold para snapshot migration | Abierto — sin datos de volumen real aún |
| 5 | Role granularity (`owner/manager/staff`) | Abierto — backlog |
| 6 | Customer deletion policy (soft vs hard delete) | Abierto — no hay UI de borrado implementada |
| 7 | Chat transcript persistence | Abierto — chat actual es stateless |
| 8 | Charting library (bundle impact) | Abierto — candidatos: Recharts (ya en proyecto vía deps transitivas), Chart.js, o CSS-only sparklines |

---

## 9) Mejoras posibles (post-MVP, ordenadas por impacto/esfuerzo)

### Alta prioridad si escala el negocio

**A. Gráfico de tendencia en Overview**
- Bar chart de citas por día/semana dentro del rango seleccionado
- Recharts es la opción más limpia: ya está disponible en el stack React, cero bundle extra si se importa lazy
- Esfuerzo: ~2h. Impacto: el panel se vuelve visualmente accionable, no solo numérico

**B. Restaurar kill-switch real (firebase-admin)**
- Actualmente `enforceClientActive` retorna `active` hardcoded
- Fix: Firestore REST API + JWT de service account (sin gRPC, sin hang en Vercel)
- Esfuerzo: ~3h. Impacto: crítico para multi-tenant real — sin esto no se puede suspender un tenant remotamente

**C. CSV export en tab Customers**
- Usa `buildCsvBlob` ya existente, igual que Appointments
- Esfuerzo: ~30min. Impacto: operacional para tenants que quieren exportar su base de clientes

### Media prioridad

**D. `kpi_snapshots` collection**
- Cron job (Cloud Function o Vercel cron) que escribe un snapshot diario de KPIs
- Desacopla el dashboard del tamaño de la colección `appointments`
- Solo necesario cuando un tenant supere ~5.000 citas/mes

**E. Email reminders automáticos**
- Lógica: Cloud Function con trigger `onUpdate` en `appointments` cuando `status → confirmed`
- Envía recordatorio N horas antes (configurable en `notificationPrefs.reminderHoursBefore`)
- Requiere Resend key + `EMAIL_PROVIDER_API_KEY` seteado

**F. Roles granulares (owner / manager / staff)**
- Actualmente el panel solo distingue admin/no-admin
- Requiere claims adicionales en Firebase Auth + Firestore rules por rol
- Complejidad media, alto valor para negocios con equipo grande

### Baja prioridad / largo plazo

**G. Inbox reply in-app**
- Actualmente el inbox muestra mensajes pero no permite responder desde el panel
- Requiere integración con Resend para envío outbound + thread model en Firestore

**H. Chat transcript persistence**
- El chatbot actual es stateless (no guarda conversaciones)
- Si se quiere historial: colección `chat_sessions/{sessionId}` con `clientId` + mensajes

**I. Customer merge / dedupe UI**
- Si un cliente reserva con emails distintos, quedan como registros separados
- UI para hacer merge manual de dos registros en uno

---

## 10) Checklist de deploy por tenant

Antes de dar un tenant por operativo:

- [ ] `npm run lint` pasa sin errores
- [ ] `npm run firebase:deploy:firestore` ejecutado con el proyecto correcto
- [ ] `clients/{clientId}` existe en Firestore con `status: "active"`
- [ ] `config/{clientId}` existe con branding y servicios del tenant
- [ ] Vercel env vars seteadas: `CLIENT_ID`, `FIREBASE_DATABASE_ID`, `GEMINI_API_KEY`, `VITE_CLIENT_ID`, `NEXT_PUBLIC_CLIENT_ID`, `VITE_FIREBASE_*`
- [ ] Admin user tiene custom claim `clientId` + `tenantRole: "admin"` (vía `setTenantClaim`)
- [ ] Prueba de reserva end-to-end → documento en Firestore con `clientId` correcto
- [ ] Overview → "Run CRM analysis" devuelve snapshot (Gemini vivo)
- [ ] CSV export de citas descarga archivo con datos del rango

---

## 11) Reglas de ejecución para chats futuros

- Una fase / feature a la vez. No saltar items en un solo pass.
- Siempre incluir "hecho vs pendiente" al final de cada implementación.
- `npm run lint` después de cada cambio de código.
- Si se agregan/renombran locale keys: actualizar `en.ts` + `he.ts`, luego `npm run verify:locales`.
- `api/index.ts` es self-contained — cambios de API van ahí, no en `server.ts` (que es solo para dev local).
- Al agregar modelos Gemini nuevos: actualizar `GEMINI_MODEL_CANDIDATES` en `api/index.ts`.
