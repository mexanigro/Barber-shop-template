/**
 * Admin CRM tool declarations + lightweight schema validator + Firestore action
 * executors. The frontend never imports the executor code path (it has no
 * firebase-admin SDK); this module stays SDK-agnostic by accepting an opaque
 * `db` / `FieldValue` pair, which lets the test suite drive it with a mock.
 *
 * Used directly by `server.ts`. `api/index.ts` keeps an inline copy because
 * the Vercel `@vercel/node` bundler does not cross-import from `src/`
 * (see docs/ARCHITECTURE.md). Keep the two copies in sync.
 *
 * Gemini Function Calling reference:
 *   https://ai.google.dev/gemini-api/docs/function-calling
 */

// ── Schema types (Gemini v1beta REST shape) ──────────────────────────────────

export type GeminiSchemaType =
  | "OBJECT"
  | "STRING"
  | "INTEGER"
  | "NUMBER"
  | "BOOLEAN"
  | "ARRAY";

export type GeminiSchema = {
  type: GeminiSchemaType;
  description?: string;
  properties?: Record<string, GeminiSchema>;
  items?: GeminiSchema;
  required?: string[];
  enum?: string[];
};

export type GeminiFunctionDeclaration = {
  name: string;
  description: string;
  parameters?: GeminiSchema;
};

// ── Tool declarations ────────────────────────────────────────────────────────

// Note: STOCK_TOOL_DECLARATIONS are concatenated onto ADMIN_TOOL_DECLARATIONS
// at the end of this module (after the array is built). This avoids a circular
// import while keeping a single source of truth for validateActionArgs.
export const ADMIN_TOOL_DECLARATIONS: GeminiFunctionDeclaration[] = [
  {
    name: "walk_in",
    description:
      "Register a walk-in customer (someone who arrived without an online booking). Creates a customer record and an immediately-completed appointment for today's date and time.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "Customer's full name." },
        phone: { type: "STRING", description: "Customer's phone number (with or without dashes)." },
        serviceId: {
          type: "STRING",
          description:
            'Service ID taken from the SERVICES list in the system prompt. Use an empty string ("") if the admin did not specify one.',
        },
        staffId: {
          type: "STRING",
          description:
            'Staff member ID from the TEAM list. Use an empty string ("") if the admin did not specify one.',
        },
        duration: {
          type: "INTEGER",
          description: "Duration of the service in minutes. Default 30 if not provided.",
        },
      },
      required: ["name", "phone"],
    },
  },
  {
    name: "support_request",
    description:
      "Send a support / change request to Liam (the developer/owner of the platform). Use whenever the admin asks to change something on the website itself: photos, text, prices, service names, colors, etc. NOT for changing customer data.",
    parameters: {
      type: "OBJECT",
      properties: {
        message: {
          type: "STRING",
          description:
            "The full request message describing what needs to be changed, in clear plain English/Spanish.",
        },
      },
      required: ["message"],
    },
  },
  {
    name: "book_appointment",
    description:
      "Book a future appointment for a customer. Always check the UPCOMING APPOINTMENTS list in the system prompt first to avoid double-booking the same staff member at the same time.",
    parameters: {
      type: "OBJECT",
      properties: {
        customerName: { type: "STRING", description: "Customer's full name." },
        customerPhone: { type: "STRING", description: "Customer's phone." },
        customerEmail: { type: "STRING", description: "Customer's email (optional)." },
        date: { type: "STRING", description: "Appointment date in YYYY-MM-DD format." },
        time: { type: "STRING", description: "Appointment start time in HH:mm format (24h)." },
        serviceId: { type: "STRING", description: "Service ID from the SERVICES list." },
        staffId: { type: "STRING", description: "Staff member ID from the TEAM list." },
        duration: { type: "INTEGER", description: "Duration in minutes. Default 30." },
      },
      required: ["customerName", "date", "time"],
    },
  },
  {
    name: "update_appointment",
    description:
      'Edit or cancel an existing appointment. Identify the appointment with the (id:xxx) tag printed next to it in the live data. To reschedule: cancel first, then book a new slot in a follow-up turn.',
    parameters: {
      type: "OBJECT",
      properties: {
        appointmentId: { type: "STRING", description: "Exact appointment ID from the (id:xxx) tag." },
        updates: {
          type: "OBJECT",
          description:
            "Partial update payload. Allowed keys: status (confirmed|completed|cancelled), time, date, serviceId, staffId, duration, notes.",
          properties: {
            status: {
              type: "STRING",
              enum: ["confirmed", "completed", "cancelled"],
              description: "Lifecycle status.",
            },
            time: { type: "STRING", description: "New time HH:mm." },
            date: { type: "STRING", description: "New date YYYY-MM-DD." },
            serviceId: { type: "STRING" },
            staffId: { type: "STRING" },
            duration: { type: "INTEGER" },
            notes: { type: "STRING" },
          },
        },
      },
      required: ["appointmentId", "updates"],
    },
  },
  {
    name: "mark_paid",
    description:
      'Mark an existing appointment as paid. Use when the admin says things like "Juan pagó 50" or "marca como pagado el turno de las 3pm". Updates amountPaidCents, paymentStatus="paid" and paidAt.',
    parameters: {
      type: "OBJECT",
      properties: {
        appointmentId: { type: "STRING", description: "Exact appointment ID from the (id:xxx) tag." },
        amountCents: {
          type: "INTEGER",
          description:
            "Amount paid IN CENTS. If the admin says 'paid 50 dollars', send 5000. If 'paid 200 shekels', send 20000.",
        },
        paymentMethod: {
          type: "STRING",
          description: 'Optional method label, e.g. "cash", "card", "transfer".',
        },
      },
      required: ["appointmentId", "amountCents"],
    },
  },
  {
    name: "update_customer",
    description:
      "Update a customer record. Use when the admin asks to add a note, add a tag, or change the source attribution of a customer. Notes are appended, not replaced. Tags are added to the existing array (no duplicates).",
    parameters: {
      type: "OBJECT",
      properties: {
        customerId: { type: "STRING", description: "Exact customer ID from the (id:xxx) tag in the CUSTOMERS list." },
        notes: { type: "STRING", description: "Note text to append to the existing notes." },
        tags: { type: "ARRAY", items: { type: "STRING" }, description: "Tags to add (will be unioned with existing tags)." },
        source: { type: "STRING", description: 'Override the customer source (e.g. "referral", "instagram").' },
      },
      required: ["customerId"],
    },
  },
  {
    name: "add_walkin_count",
    description:
      'Increment an anonymous walk-in counter for a given date. Use when the admin says "entraron 3 clientes" or "had 5 walk-ins today" WITHOUT giving names. Does NOT create customer records or appointments.',
    parameters: {
      type: "OBJECT",
      properties: {
        count: { type: "INTEGER", description: "How many walk-ins to add to the day's tally." },
        date: { type: "STRING", description: "Date in YYYY-MM-DD format. Defaults to today if omitted." },
      },
      required: ["count"],
    },
  },
  {
    name: "bulk_update_status",
    description:
      "Update the status of many appointments at once. Use for commands like \"completá todos los turnos de hoy\" or \"cancel everything for tomorrow\". Capped at 100 appointments per call for safety.",
    parameters: {
      type: "OBJECT",
      properties: {
        status: {
          type: "STRING",
          enum: ["confirmed", "completed", "cancelled"],
          description: "Target status to set on every selected appointment.",
        },
        date: { type: "STRING", description: "YYYY-MM-DD; if appointmentIds is omitted, all appointments on this date are matched. Defaults to today." },
        appointmentIds: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Optional explicit list of appointment IDs. If provided, `date` is ignored.",
        },
      },
      required: ["status"],
    },
  },
];

// ── Validator ────────────────────────────────────────────────────────────────

export type ValidationError = { field?: string; message: string };

export class AdminToolValidationError extends Error {
  errors: ValidationError[];
  constructor(errors: ValidationError[]) {
    super(errors.map((e) => (e.field ? `${e.field}: ${e.message}` : e.message)).join("; "));
    this.errors = errors;
    this.name = "AdminToolValidationError";
  }
}

function validateValue(value: unknown, schema: GeminiSchema, path: string, errors: ValidationError[]): void {
  if (value === undefined || value === null) return;
  switch (schema.type) {
    case "STRING":
      if (typeof value !== "string") errors.push({ field: path, message: `must be a string` });
      break;
    case "INTEGER":
      if (typeof value !== "number" || !Number.isInteger(value))
        errors.push({ field: path, message: `must be an integer` });
      break;
    case "NUMBER":
      if (typeof value !== "number" || Number.isNaN(value))
        errors.push({ field: path, message: `must be a number` });
      break;
    case "BOOLEAN":
      if (typeof value !== "boolean") errors.push({ field: path, message: `must be a boolean` });
      break;
    case "ARRAY":
      if (!Array.isArray(value)) {
        errors.push({ field: path, message: `must be an array` });
      } else if (schema.items) {
        value.forEach((v, i) => validateValue(v, schema.items!, `${path}[${i}]`, errors));
      }
      break;
    case "OBJECT":
      if (typeof value !== "object" || Array.isArray(value)) {
        errors.push({ field: path, message: `must be an object` });
      } else if (schema.properties) {
        const obj = value as Record<string, unknown>;
        for (const [k, sub] of Object.entries(schema.properties)) {
          validateValue(obj[k], sub, `${path}.${k}`, errors);
        }
      }
      break;
  }
  if (schema.enum && value !== undefined && !schema.enum.includes(String(value))) {
    errors.push({ field: path, message: `must be one of: ${schema.enum.join(", ")}` });
  }
}

/**
 * Validate the args object against the function declaration's parameter schema.
 * Throws AdminToolValidationError if invalid. Returns the args unchanged on success.
 */
export function validateActionArgs(toolName: string, raw: unknown): Record<string, unknown> {
  const decl = ADMIN_TOOL_DECLARATIONS.find((d) => d.name === toolName);
  if (!decl) throw new AdminToolValidationError([{ message: `unknown tool: ${toolName}` }]);
  if (raw === null || raw === undefined) raw = {};
  if (typeof raw !== "object" || Array.isArray(raw))
    throw new AdminToolValidationError([{ message: "args must be an object" }]);
  const args = raw as Record<string, unknown>;
  const params = decl.parameters;
  if (!params) return args;

  const errors: ValidationError[] = [];
  for (const req of params.required ?? []) {
    const v = args[req];
    if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) {
      errors.push({ field: req, message: "is required" });
    }
  }
  if (params.properties) {
    for (const [k, sub] of Object.entries(params.properties)) {
      validateValue(args[k], sub, k, errors);
    }
  }
  if (errors.length > 0) throw new AdminToolValidationError(errors);
  return args;
}

// ── Executors ────────────────────────────────────────────────────────────────
//
// SDK-agnostic — accept an opaque `db` and `FieldValue` so the test suite can
// inject a mock. Both server.ts and api/index.ts pass the firebase-admin
// Firestore instance + FieldValue here. Each executor returns a JSON-friendly
// result object.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AdminDb = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AdminFieldValue = any;

export type AdminActionContext = {
  db: AdminDb;
  FieldValue: AdminFieldValue;
  clientId: string;
};

export type ActionOk = { success: true; [k: string]: unknown };

/**
 * Union return type used by the merged dispatcher. The classic CRM tools
 * always succeed (or throw), so they fit ActionOk. The Bloque I stock tools
 * encode "not found" and "ambiguous match" as data — `success: false` is a
 * valid value the model should react to, not an error.
 */
export type DispatchResult = { success: boolean; [k: string]: unknown };

export class AdminActionError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "AdminActionError";
  }
}

const simpleHash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const ALLOWED_APPT_UPDATE_FIELDS = ["status", "time", "date", "serviceId", "staffId", "duration", "notes"] as const;
const TERMINAL_STATUSES = new Set(["confirmed", "completed", "cancelled"]);

export async function executeWalkIn(
  ctx: AdminActionContext,
  args: Record<string, unknown>,
): Promise<ActionOk> {
  const { db, FieldValue, clientId } = ctx;
  const name = String(args.name).trim();
  const phone = String(args.phone).trim();
  const serviceId = typeof args.serviceId === "string" ? args.serviceId : "";
  const staffId = typeof args.staffId === "string" ? args.staffId : "";
  const duration = Number(args.duration) || 30;
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5);
  const email = `walkin_${Date.now()}@noemail.local`;

  const custDocId = `${clientId}_${simpleHash(email)}`;
  await db.collection("customers").doc(custDocId).set({
    clientId,
    fullName: name,
    email,
    phone,
    source: "manual",
    visitCount: FieldValue.increment(1),
    lastVisitAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  const apptRef = db.collection("appointments").doc();
  await apptRef.set({
    clientId,
    customerName: name,
    customerEmail: email,
    customerPhone: phone,
    serviceId,
    staffId,
    date: dateStr,
    time: timeStr,
    duration,
    status: "completed",
    type: "appointment",
    createdAt: FieldValue.serverTimestamp(),
  });

  return { success: true, appointmentId: apptRef.id, customerId: custDocId };
}

export async function executeSupportRequest(
  ctx: AdminActionContext,
  args: Record<string, unknown>,
): Promise<ActionOk> {
  const { db, FieldValue, clientId } = ctx;
  const message = String(args.message).trim();
  const ref = db.collection("provider_messages").doc();
  await ref.set({
    clientId,
    businessName: clientId,
    message,
    sender: "client",
    status: "new",
    category: "maintenance",
    categoryReason: "Sent via AI chat assistant",
    createdAt: FieldValue.serverTimestamp(),
  });
  return { success: true, messageId: ref.id };
}

export async function executeBookAppointment(
  ctx: AdminActionContext,
  args: Record<string, unknown>,
): Promise<ActionOk> {
  const { db, FieldValue, clientId } = ctx;
  const customerName = String(args.customerName).trim();
  const customerEmail = String(args.customerEmail ?? "").trim().toLowerCase();
  const customerPhone = String(args.customerPhone ?? "").trim();
  const date = String(args.date);
  const time = String(args.time);
  const serviceId = String(args.serviceId ?? "");
  const staffId = String(args.staffId ?? "");
  const duration = Number(args.duration) || 30;
  const bufferMinutes = 10;

  const manifestId = `${clientId}_${staffId}_${date}`;
  const manifestRef = db.collection("daily_manifests").doc(manifestId);

  const appointmentId = await db.runTransaction(async (transaction: any) => {
    const manifestSnap = await transaction.get(manifestRef);
    const intervals: { start: string; end: string }[] = manifestSnap.exists
      ? (manifestSnap.data()?.intervals ?? [])
      : [];
    const [startH, startM] = time.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = startMinutes + duration + bufferMinutes;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

    for (const inv of intervals) {
      const [iSH, iSM] = inv.start.split(":").map(Number);
      const [iEH, iEM] = inv.end.split(":").map(Number);
      const iStart = iSH * 60 + iSM;
      const iEnd = iEH * 60 + iEM;
      if (startMinutes < iEnd && endMinutes > iStart) {
        throw new AdminActionError(409, "CONFLICT: This time slot is no longer available.");
      }
    }

    const apptRef = db.collection("appointments").doc();
    transaction.set(apptRef, {
      clientId,
      customerName,
      customerEmail,
      customerPhone,
      serviceId,
      staffId,
      date,
      time,
      duration,
      manifestEnd: endTime,
      status: "confirmed",
      type: "appointment",
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.set(manifestRef, {
      clientId,
      intervals: [...intervals, { start: time, end: endTime }],
    });
    return apptRef.id;
  });

  // Fire-and-forget customer upsert
  const email = customerEmail || `booking_${Date.now()}@noemail.local`;
  const custDocId = `${clientId}_${simpleHash(email)}`;
  try {
    await db.collection("customers").doc(custDocId).set({
      clientId,
      fullName: customerName,
      email,
      phone: customerPhone,
      source: "chat-booking",
      visitCount: FieldValue.increment(1),
      lastVisitAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch {
    // non-fatal
  }

  return { success: true, appointmentId };
}

export async function executeUpdateAppointment(
  ctx: AdminActionContext,
  args: Record<string, unknown>,
): Promise<ActionOk> {
  const { db, FieldValue, clientId } = ctx;
  const appointmentId = String(args.appointmentId);
  const updates = (args.updates ?? {}) as Record<string, unknown>;

  const apptRef = db.collection("appointments").doc(appointmentId);
  const snap = await apptRef.get();
  if (!snap.exists) throw new AdminActionError(404, "Appointment not found");
  const data = snap.data();
  if (!data || data.clientId !== clientId) throw new AdminActionError(403, "Not authorized");

  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates)) {
    if ((ALLOWED_APPT_UPDATE_FIELDS as readonly string[]).includes(k)) safe[k] = v;
  }
  if (typeof safe.status === "string" && !TERMINAL_STATUSES.has(safe.status)) {
    throw new AdminActionError(400, `status must be one of confirmed|completed|cancelled`);
  }
  safe.updatedAt = FieldValue.serverTimestamp();
  await apptRef.update(safe);

  // Clean up manifest interval on cancellation
  if (safe.status === "cancelled" && data.status !== "cancelled") {
    try {
      const manifestId = `${clientId}_${data.staffId ?? ""}_${data.date}`;
      const mRef = db.collection("daily_manifests").doc(manifestId);
      const mSnap = await mRef.get();
      if (mSnap.exists) {
        const intervals = ((mSnap.data()?.intervals ?? []) as { start: string; end: string }[]).filter(
          (inv) => inv.start !== data.time,
        );
        await mRef.update({ intervals });
      }
    } catch {
      // non-fatal
    }
  }
  return { success: true };
}

export async function executeMarkPaid(
  ctx: AdminActionContext,
  args: Record<string, unknown>,
): Promise<ActionOk> {
  const { db, FieldValue, clientId } = ctx;
  const appointmentId = String(args.appointmentId);
  const amountCents = Math.trunc(Number(args.amountCents));
  if (!Number.isFinite(amountCents) || amountCents < 0 || amountCents > 100_000_000) {
    throw new AdminActionError(400, "amountCents must be a non-negative integer ≤ 100000000");
  }
  const paymentMethod = typeof args.paymentMethod === "string" ? args.paymentMethod.trim() : "";

  const ref = db.collection("appointments").doc(appointmentId);
  const snap = await ref.get();
  if (!snap.exists) throw new AdminActionError(404, "Appointment not found");
  const data = snap.data();
  if (!data || data.clientId !== clientId) throw new AdminActionError(403, "Not authorized");

  const payload: Record<string, unknown> = {
    amountPaidCents: amountCents,
    paymentStatus: "paid",
    paidAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (paymentMethod) payload.paymentMethod = paymentMethod;
  await ref.update(payload);

  return { success: true, appointmentId, amountCents };
}

export async function executeUpdateCustomer(
  ctx: AdminActionContext,
  args: Record<string, unknown>,
): Promise<ActionOk> {
  const { db, FieldValue, clientId } = ctx;
  const customerId = String(args.customerId);

  const ref = db.collection("customers").doc(customerId);
  const snap = await ref.get();
  if (!snap.exists) throw new AdminActionError(404, "Customer not found");
  const data = snap.data();
  if (!data || data.clientId !== clientId) throw new AdminActionError(403, "Not authorized");

  const payload: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (typeof args.notes === "string" && args.notes.trim()) {
    const incoming = args.notes.trim();
    const existing = typeof data.notes === "string" ? data.notes : "";
    payload.notes = existing ? `${existing}\n${incoming}` : incoming;
  }
  if (Array.isArray(args.tags) && args.tags.length > 0) {
    const tagList = (args.tags as unknown[]).filter((t): t is string => typeof t === "string" && t.trim().length > 0);
    if (tagList.length > 0) payload.tags = FieldValue.arrayUnion(...tagList);
  }
  if (typeof args.source === "string" && args.source.trim()) {
    payload.source = args.source.trim();
  }

  if (Object.keys(payload).length === 1) {
    // Only updatedAt — nothing meaningful to write
    throw new AdminActionError(400, "no fields to update");
  }
  await ref.update(payload);
  return { success: true, customerId };
}

export async function executeAddWalkinCount(
  ctx: AdminActionContext,
  args: Record<string, unknown>,
): Promise<ActionOk> {
  const { db, FieldValue, clientId } = ctx;
  const count = Math.trunc(Number(args.count));
  if (!Number.isFinite(count) || count <= 0 || count > 500) {
    throw new AdminActionError(400, "count must be a positive integer ≤ 500");
  }
  const date = typeof args.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(args.date) ? args.date : todayISO();
  const ref = db.collection("walk_in_stats").doc(`${clientId}_${date}`);
  await ref.set({
    clientId,
    date,
    count: FieldValue.increment(count),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { success: true, date, added: count };
}

export const BULK_UPDATE_STATUS_CAP = 100;

export async function executeBulkUpdateStatus(
  ctx: AdminActionContext,
  args: Record<string, unknown>,
): Promise<ActionOk> {
  const { db, FieldValue, clientId } = ctx;
  const status = String(args.status);
  if (!TERMINAL_STATUSES.has(status)) {
    throw new AdminActionError(400, `status must be one of confirmed|completed|cancelled`);
  }
  const date = typeof args.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(args.date) ? args.date : todayISO();

  let targetIds: string[];
  let docsCache: Array<{ id: string; data: Record<string, unknown> }> = [];
  if (Array.isArray(args.appointmentIds) && args.appointmentIds.length > 0) {
    targetIds = (args.appointmentIds as unknown[])
      .filter((v): v is string => typeof v === "string" && v.length > 0);
  } else {
    const snap = await db.collection("appointments")
      .where("clientId", "==", clientId)
      .where("date", "==", date)
      .get();
    const collected: Array<{ id: string; data: Record<string, unknown> }> = [];
    snap.forEach((doc: any) => collected.push({ id: doc.id, data: doc.data() }));
    docsCache = collected;
    targetIds = collected.map((d) => d.id);
  }

  if (targetIds.length === 0) {
    return { success: true, updated: 0, skipped: 0, status, date };
  }
  if (targetIds.length > BULK_UPDATE_STATUS_CAP) {
    throw new AdminActionError(400, `too many appointments (${targetIds.length}); cap is ${BULK_UPDATE_STATUS_CAP}`);
  }

  // Fetch any docs we didn't already have (when caller passed explicit IDs).
  // Need this to enforce per-doc ownership before writing.
  if (docsCache.length === 0) {
    for (const id of targetIds) {
      const docSnap = await db.collection("appointments").doc(id).get();
      if (!docSnap.exists) continue;
      docsCache.push({ id, data: docSnap.data() ?? {} });
    }
  }

  const batch = db.batch();
  let updated = 0;
  let skipped = 0;
  for (const { id, data } of docsCache) {
    if (data.clientId !== clientId) {
      skipped++;
      continue;
    }
    batch.update(db.collection("appointments").doc(id), {
      status,
      updatedAt: FieldValue.serverTimestamp(),
    });
    updated++;
  }
  if (updated > 0) await batch.commit();
  return { success: true, updated, skipped, status, date };
}

// ── Dispatcher ───────────────────────────────────────────────────────────────

import {
  STOCK_TOOL_DECLARATIONS,
  executeQueryStock,
  executeConsumeStock,
  executeAddStock,
  type StockActionCtx,
} from "./stock-tools";
import {
  TASKS_TOOL_DECLARATIONS,
  executeCreateTask,
  executeListTasks,
  executeCompleteTask,
  type TasksActionCtx,
} from "./tasks-tools";

// Append stock + tasks tool declarations to the master list so
// validateActionArgs can type-check them with the same schema validator used
// for CRM tools.
for (const decl of STOCK_TOOL_DECLARATIONS) ADMIN_TOOL_DECLARATIONS.push(decl);
for (const decl of TASKS_TOOL_DECLARATIONS) ADMIN_TOOL_DECLARATIONS.push(decl);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyExecutor = (ctx: any, args: Record<string, unknown>) => Promise<DispatchResult>;

export const ACTION_EXECUTORS: Record<string, AnyExecutor> = {
  walk_in: executeWalkIn,
  support_request: executeSupportRequest,
  book_appointment: executeBookAppointment,
  update_appointment: executeUpdateAppointment,
  mark_paid: executeMarkPaid,
  update_customer: executeUpdateCustomer,
  add_walkin_count: executeAddWalkinCount,
  bulk_update_status: executeBulkUpdateStatus,
  // Bloque I — stock tools share the same dispatch surface. Their executors
  // accept an extended context with optional actorEmail / demoMode / niche
  // fields, passed through transparently by the chat handler.
  query_stock: executeQueryStock as AnyExecutor,
  consume_stock: executeConsumeStock as AnyExecutor,
  add_stock: executeAddStock as AnyExecutor,
  // Bloque J — tasks tools share the same dispatch surface. ctx must carry
  // actorEmail + actorRole so the executor can compute visibility.
  create_task: executeCreateTask as AnyExecutor,
  list_tasks: executeListTasks as AnyExecutor,
  complete_task: executeCompleteTask as AnyExecutor,
};

export type AdminActionType = keyof typeof ACTION_EXECUTORS;

export function isKnownAction(name: string): boolean {
  return name in ACTION_EXECUTORS;
}

/**
 * Validate args against the declared schema and run the corresponding executor.
 * Throws AdminToolValidationError for bad args, AdminActionError for ownership /
 * domain errors. Stock tools may return success:false with structured data
 * (not_found / ambiguous / suggest_create) — callers should not treat those
 * as errors.
 */
export async function dispatchAdminAction(
  ctx: AdminActionContext & Partial<StockActionCtx> & Partial<TasksActionCtx>,
  toolName: string,
  rawArgs: unknown,
): Promise<DispatchResult> {
  if (!isKnownAction(toolName)) {
    throw new AdminToolValidationError([{ message: `unknown tool: ${toolName}` }]);
  }
  const args = validateActionArgs(toolName, rawArgs);
  const exec = ACTION_EXECUTORS[toolName];
  return exec(ctx, args);
}

// ── Lazy CRM snapshot tool ───────────────────────────────────────────────────
//
// Declared here but NOT in ACTION_EXECUTORS. The chat handler intercepts the
// function call directly and replies with a JSON snapshot built from the
// already-known liveData payload. This lets the model ask for the data only
// when it actually needs it, saving ~1.5-3k system-prompt tokens on the many
// queries that don't need a snapshot at all.

export const GET_CRM_SNAPSHOT_DECLARATION: GeminiFunctionDeclaration = {
  name: "get_crm_snapshot",
  description:
    "Fetch a structured snapshot of the current CRM state — KPIs, today's appointments, upcoming appointments, top customers and recent inbox messages. Call ONLY when the admin asks for an overview, summary, agenda of the day, or a question that genuinely requires aggregated data. Do not call for narrow questions that can be answered from prior conversation.",
  parameters: { type: "OBJECT", properties: {} },
};

// ── Scoped tools prompt fragment ─────────────────────────────────────────────
//
// When the intent router classifies a query as scope=stock|tasks|customers we
// emit a much shorter prompt fragment listing only the relevant tools. This
// trims ~300 prompt tokens on most queries vs the full fragment below.

import type { AdminIntentScope, AdminToolName } from "../intent-router";

const TOOL_LINES: Record<AdminToolName, string> = {
  walk_in: "- walk_in: register a walk-in customer + completed appointment for today.",
  support_request: "- support_request: forward a website-change request to Liam (developer).",
  book_appointment: "- book_appointment: create a future appointment for a customer.",
  update_appointment:
    "- update_appointment: change status / time / staff of an existing appointment (use the id from the (id:xxx) tag).",
  mark_paid:
    "- mark_paid: mark an appointment as paid (amount IN CENTS — multiply by 100 if the admin says dollars or shekels).",
  update_customer: "- update_customer: append a note, add tags, or change source for a customer.",
  add_walkin_count: "- add_walkin_count: anonymous walk-in counter — use only when no name was given.",
  bulk_update_status: "- bulk_update_status: set status on many appointments at once (capped at 100).",
  get_crm_snapshot:
    "- get_crm_snapshot: fetch KPIs + today/upcoming appointments + recent customers when you need aggregated data.",
  query_stock:
    "- query_stock: look up how much of an item is in stock by name (fuzzy) or id.",
  consume_stock:
    "- consume_stock: deduct N units of an item when the admin says they used / consumed / spent something.",
  add_stock:
    "- add_stock: add N units (or create a new item) when the admin received / bought / restocked something. Pass createIfMissing=true ONLY after the admin confirms creating a brand-new item.",
  create_task:
    "- create_task: add a new todo / pending item. Default shared=false (private). dueDate accepts 'tomorrow' / 'mañana' / ISO.",
  list_tasks:
    "- list_tasks: list the admin's visible tasks (default status=open). Filter by priority / assignedTo / limit.",
  complete_task:
    "- complete_task: mark a task done by id OR title fragment. If ambiguous you'll get candidates back — ask which one.",
};

const SCOPE_HEADERS: Record<AdminIntentScope, string> = {
  stock: "STOCK SCOPE — the admin is asking about inventory. You have access to:",
  tasks: "TASKS SCOPE — the admin is asking about tasks/todos. You have access to:",
  customers: "CUSTOMERS SCOPE — the admin is asking about customers or appointments. You have access to:",
  general: "FULL SCOPE — the admin's query is open-ended. You have access to:",
};

export function buildScopedToolsFragment(
  scope: AdminIntentScope,
  toolNames: readonly AdminToolName[],
): string {
  const lines = toolNames
    .filter((name) => TOOL_LINES[name])
    .map((name) => TOOL_LINES[name]);
  return `${SCOPE_HEADERS[scope]}
${lines.join("\n")}

RULES:
- Ask for any missing REQUIRED field in natural language — NEVER invent values.
- Use IDs only from the (id:xxx) tags in the live data; never fabricate them.
- Money in mark_paid is in CENTS (multiply by 100).
- One tool call per turn. After the result comes back, write a short confirmation in the admin's language.`;
}

// ── System prompt fragment ───────────────────────────────────────────────────

/**
 * Short fragment to append to the admin chat system prompt explaining the
 * function-calling contract. Kept in this module so both backend copies and
 * any documentation render the same text.
 */
export const ADMIN_TOOLS_PROMPT_FRAGMENT = `
SPECIAL CAPABILITIES — TOOL CALLS:
You have access to function calls (tools) that perform real, persistent actions in the CRM database. The tools are:
- walk_in: register a walk-in customer + completed appointment for today.
- support_request: forward a website-change request to Liam (developer).
- book_appointment: create a future appointment for a customer.
- update_appointment: change status / time / staff of an existing appointment (use the id from the (id:xxx) tag).
- mark_paid: mark an appointment as paid (amount IN CENTS — multiply by 100 if the admin says dollars or shekels).
- update_customer: append a note, add tags, or change source for a customer.
- add_walkin_count: anonymous walk-in counter — use only when no name was given.
- bulk_update_status: set status on many appointments at once (capped at 100).
- get_crm_snapshot: when you need aggregated data (KPIs, today/upcoming appointments, top customers) call this FIRST. Avoid calling it for narrow questions you can already answer.

CRITICAL RULES:
1. If the user describes an intent but you are missing a REQUIRED field, ASK for it in natural language. NEVER call the function with placeholder, made-up, or invented values.
2. Use IDs from the live data above (the (id:xxx) tags). Never fabricate IDs.
3. Money is always in CENTS in mark_paid. Convert from whatever unit the admin used.
4. For rescheduling, first call update_appointment with status=cancelled, then book_appointment in a follow-up turn.
5. Only one tool call per turn. After the tool runs you will receive its result — then write a short confirmation to the admin in their language.
`.trim();
