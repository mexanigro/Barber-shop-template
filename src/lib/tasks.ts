/**
 * Tasks module (Bloque J) — shared types + SDK-agnostic CRUD with role + tenant
 * gating, visibility logic (private/shared), fuzzy lookup for AI tool calls,
 * and relative-date parsing for `tomorrow` / `next week` / etc.
 *
 * Mirrors the layout of `src/lib/ai/admin-tools.ts`: the heavy I/O paths accept
 * an opaque firebase-admin `db` + `FieldValue` so the test suite can drive
 * everything with a small in-memory mock. Both `server.ts` and `api/index.ts`
 * import this module — and `api/index.ts` keeps an inline copy of the parts it
 * needs because Vercel's bundler doesn't cross-import from `src/`.
 *
 * Firestore layout (flat — CLAUDE.md rule):
 *   tasks/{taskId} → { clientId, title, status, priority, ... }
 */

import type { AdminRole } from "./admin-users";

// ── Types ────────────────────────────────────────────────────────────────────

export type TaskStatus = "pending" | "in_progress" | "done" | "archived";
export type TaskPriority = "high" | "medium" | "low";

export const TASK_STATUSES: readonly TaskStatus[] = [
  "pending",
  "in_progress",
  "done",
  "archived",
] as const;

export const TASK_PRIORITIES: readonly TaskPriority[] = [
  "high",
  "medium",
  "low",
] as const;

export type Task = {
  id: string;
  clientId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** ISO 8601 string (server serializes Firestore Timestamp). */
  dueDate?: string;
  assignedTo?: string;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
  shared: boolean;
  tags?: string[];
  relatedCustomerId?: string;
  relatedAppointmentId?: string;
  notes?: string;
};

export type TaskCreateInput = {
  title: string;
  description?: string;
  priority?: TaskPriority;
  /** Accepts ISO date, ISO datetime, or relative ("tomorrow", "next week"). */
  dueDate?: string;
  assignedTo?: string;
  shared?: boolean;
  tags?: string[];
  relatedCustomerId?: string;
  relatedAppointmentId?: string;
  notes?: string;
};

export type TaskUpdateInput = Partial<
  Pick<
    Task,
    | "title"
    | "description"
    | "status"
    | "priority"
    | "dueDate"
    | "assignedTo"
    | "shared"
    | "tags"
    | "relatedCustomerId"
    | "relatedAppointmentId"
    | "notes"
  >
>;

export type TaskListFilters = {
  status?: TaskStatus | "open"; // "open" = pending + in_progress
  assignedTo?: string;
  priority?: TaskPriority;
  tag?: string;
  relatedCustomerId?: string;
  limit?: number;
};

export function isTaskStatus(v: unknown): v is TaskStatus {
  return v === "pending" || v === "in_progress" || v === "done" || v === "archived";
}

export function isTaskPriority(v: unknown): v is TaskPriority {
  return v === "high" || v === "medium" || v === "low";
}

// ── Visibility logic ─────────────────────────────────────────────────────────
//
// Tasks are scoped per-tenant. Within a tenant:
//   - The CREATOR always sees their own task (shared or not).
//   - If a task is `shared: true`, every signed-in admin in the tenant sees it.
//   - If the task is assigned to me (`assignedTo === my email`), I can see it
//     even when it's private, so my work doesn't get hidden behind someone
//     else's privacy flag.
//   - OWNERS see everything in the tenant. The CRM dashboard is theirs.

export function canSeeTask(
  task: Pick<Task, "createdBy" | "assignedTo" | "shared">,
  viewer: { email: string; role: AdminRole },
): boolean {
  if (viewer.role === "owner") return true;
  if (task.createdBy === viewer.email) return true;
  if (task.shared) return true;
  if (task.assignedTo && task.assignedTo === viewer.email) return true;
  return false;
}

/**
 * Edit/delete permission.
 *   - Creator + owner: full edit.
 *   - Assignee: status-only changes (drag between kanban columns).
 *   - Everyone else: read-only or no access.
 */
export function canEditTask(
  task: Pick<Task, "createdBy" | "assignedTo">,
  viewer: { email: string; role: AdminRole },
): { kind: "full" } | { kind: "status_only" } | { kind: "none" } {
  if (viewer.role === "owner") return { kind: "full" };
  if (task.createdBy === viewer.email) return { kind: "full" };
  if (task.assignedTo && task.assignedTo === viewer.email)
    return { kind: "status_only" };
  return { kind: "none" };
}

export function canDeleteTask(
  task: Pick<Task, "createdBy">,
  viewer: { email: string; role: AdminRole },
): boolean {
  return viewer.role === "owner" || task.createdBy === viewer.email;
}

/** Allowed status transitions from any state — kept permissive, the UI gates. */
export function isValidStatusTransition(next: TaskStatus): boolean {
  return TASK_STATUSES.includes(next);
}

// ── Relative date parsing ────────────────────────────────────────────────────
//
// `create_task` from the AI assistant may receive natural-language dueDates
// like "mañana", "la próxima semana", "next monday". We support a small set of
// expressions; anything else falls through (caller may pass an ISO date).

const RELATIVE_DATE_PATTERNS: Array<{
  re: RegExp;
  resolve: (now: Date) => Date;
}> = [
  {
    re: /^(?:hoy|today)$/i,
    resolve: (now) => endOfDay(now),
  },
  {
    re: /^(?:mañana|manana|tomorrow)$/i,
    resolve: (now) => endOfDay(addDays(now, 1)),
  },
  {
    re: /^(?:pasado\s+mañana|pasado\s+manana|day\s+after\s+tomorrow)$/i,
    resolve: (now) => endOfDay(addDays(now, 2)),
  },
  {
    re: /^(?:la\s+pr[oó]xima\s+semana|pr[oó]xima\s+semana|next\s+week)$/i,
    resolve: (now) => endOfDay(addDays(now, 7)),
  },
  {
    re: /^(?:en\s+(\d+)\s+d[ií]as|in\s+(\d+)\s+days)$/i,
    resolve: (now) => endOfDay(addDays(now, 0)), // overridden below
  },
];

function addDays(d: Date, days: number): Date {
  const c = new Date(d.getTime());
  c.setDate(c.getDate() + days);
  return c;
}

function endOfDay(d: Date): Date {
  const c = new Date(d.getTime());
  c.setHours(23, 59, 0, 0);
  return c;
}

/**
 * Try to coerce a free-form dueDate string into an ISO 8601 datetime. Returns
 * null if the input doesn't look like a date at all.
 *
 * Accepted inputs:
 *   - Already-valid ISO: "2026-06-01" or "2026-06-01T18:00:00Z" → passed through.
 *   - Relative English/Spanish phrases (see RELATIVE_DATE_PATTERNS).
 *   - "en 3 dias" / "in 5 days" — number is extracted.
 */
export function parseTaskDueDate(
  raw: string | undefined,
  now: Date = new Date(),
): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // ISO date or datetime — let Date parse it.
  if (/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(trimmed)) {
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }

  // "en N días" / "in N days" — extract the number.
  const enDays = trimmed.match(/^(?:en\s+(\d+)\s+d[ií]as?|in\s+(\d+)\s+days?)$/i);
  if (enDays) {
    const n = Number(enDays[1] ?? enDays[2]);
    if (Number.isFinite(n) && n > 0 && n < 366) {
      return endOfDay(addDays(now, n)).toISOString();
    }
  }

  // Static relative phrases.
  for (const { re, resolve } of RELATIVE_DATE_PATTERNS) {
    if (re.test(trimmed)) return resolve(now).toISOString();
  }

  // Last-ditch: try Date parser. Mostly for "May 15, 2026" / "15/05/2026".
  const fallback = new Date(trimmed);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback.toISOString();
  }
  return null;
}

// ── Fuzzy task lookup (for complete_task tool) ───────────────────────────────
//
// The AI hands us a fragment of a task title ("limpiar local", "revisar
// equipo") and we have to map it to one of the open tasks. We do:
//   1. Normalize both sides (lowercase, strip accents).
//   2. Exact match first.
//   3. "Contains fragment" + "fragment contains title" — symmetric.
//   4. Score by overlapping word count; break ties by recency (createdAt DESC).
// Returns either one task, or an array if it's ambiguous so the AI can
// disambiguate with the admin.

export function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type FuzzyMatchResult =
  | { kind: "exact"; task: Task }
  | { kind: "unique"; task: Task }
  | { kind: "ambiguous"; tasks: Task[] }
  | { kind: "none" };

export function fuzzyFindTask(
  fragment: string,
  candidates: readonly Task[],
): FuzzyMatchResult {
  const q = normalizeTitle(fragment);
  if (!q) return { kind: "none" };

  const open = candidates.filter((t) => t.status !== "archived");

  // Exact-title match wins.
  const exact = open.filter((t) => normalizeTitle(t.title) === q);
  if (exact.length === 1) return { kind: "exact", task: exact[0] };
  if (exact.length > 1) return { kind: "ambiguous", tasks: exact };

  const qWords = q.split(" ").filter(Boolean);
  type Scored = { task: Task; score: number };
  const scored: Scored[] = [];

  for (const t of open) {
    const tn = normalizeTitle(t.title);
    if (!tn) continue;
    let score = 0;
    if (tn.includes(q) || q.includes(tn)) score += 5;
    const tWords = tn.split(" ").filter(Boolean);
    for (const w of qWords) {
      if (tWords.includes(w)) score += 2;
      else if (tWords.some((tw) => tw.startsWith(w) || w.startsWith(tw))) score += 1;
    }
    if (score > 0) scored.push({ task: t, score });
  }
  if (scored.length === 0) return { kind: "none" };
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aTime = a.task.createdAt ? Date.parse(a.task.createdAt) : 0;
    const bTime = b.task.createdAt ? Date.parse(b.task.createdAt) : 0;
    return bTime - aTime;
  });

  const top = scored[0];
  const tied = scored.filter((s) => s.score === top.score);
  if (tied.length === 1) return { kind: "unique", task: top.task };
  return { kind: "ambiguous", tasks: tied.map((t) => t.task) };
}

// ── Validation + sanitization ────────────────────────────────────────────────

const MAX_TITLE = 200;
const MAX_DESC = 4_000;
const MAX_NOTES = 8_000;
const MAX_TAGS = 20;

function trimString(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

export class TaskValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
    this.name = "TaskValidationError";
  }
}

export function validateCreateInput(raw: unknown): TaskCreateInput {
  if (!raw || typeof raw !== "object") {
    throw new TaskValidationError("body must be an object");
  }
  const o = raw as Record<string, unknown>;
  const title = trimString(o.title, MAX_TITLE);
  if (!title) throw new TaskValidationError("title is required");

  const priority = isTaskPriority(o.priority) ? o.priority : "medium";
  const description = trimString(o.description, MAX_DESC) || undefined;
  const dueDate =
    typeof o.dueDate === "string" && o.dueDate.trim()
      ? parseTaskDueDate(o.dueDate) ?? undefined
      : undefined;
  const assignedTo =
    typeof o.assignedTo === "string" && o.assignedTo.trim()
      ? o.assignedTo.trim().toLowerCase()
      : undefined;
  const shared = Boolean(o.shared);
  const tags = Array.isArray(o.tags)
    ? (o.tags as unknown[])
        .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
        .slice(0, MAX_TAGS)
        .map((t) => t.trim())
    : undefined;
  const relatedCustomerId =
    typeof o.relatedCustomerId === "string" && o.relatedCustomerId.trim()
      ? o.relatedCustomerId.trim()
      : undefined;
  const relatedAppointmentId =
    typeof o.relatedAppointmentId === "string" && o.relatedAppointmentId.trim()
      ? o.relatedAppointmentId.trim()
      : undefined;
  const notes = trimString(o.notes, MAX_NOTES) || undefined;

  return {
    title,
    description,
    priority,
    dueDate,
    assignedTo,
    shared,
    tags,
    relatedCustomerId,
    relatedAppointmentId,
    notes,
  };
}

export function validateUpdateInput(raw: unknown): TaskUpdateInput {
  if (!raw || typeof raw !== "object") {
    throw new TaskValidationError("body must be an object");
  }
  const o = raw as Record<string, unknown>;
  const patch: TaskUpdateInput = {};
  if (typeof o.title === "string") {
    const t = trimString(o.title, MAX_TITLE);
    if (!t) throw new TaskValidationError("title cannot be empty");
    patch.title = t;
  }
  if (typeof o.description === "string") {
    patch.description = trimString(o.description, MAX_DESC);
  }
  if (o.status !== undefined) {
    if (!isTaskStatus(o.status)) throw new TaskValidationError("invalid status");
    patch.status = o.status;
  }
  if (o.priority !== undefined) {
    if (!isTaskPriority(o.priority)) throw new TaskValidationError("invalid priority");
    patch.priority = o.priority;
  }
  if (typeof o.dueDate === "string") {
    if (!o.dueDate.trim()) {
      patch.dueDate = undefined;
    } else {
      const iso = parseTaskDueDate(o.dueDate);
      if (!iso) throw new TaskValidationError("could not parse dueDate");
      patch.dueDate = iso;
    }
  } else if (o.dueDate === null) {
    patch.dueDate = undefined;
  }
  if (typeof o.assignedTo === "string") {
    patch.assignedTo = o.assignedTo.trim().toLowerCase() || undefined;
  } else if (o.assignedTo === null) {
    patch.assignedTo = undefined;
  }
  if (typeof o.shared === "boolean") patch.shared = o.shared;
  if (Array.isArray(o.tags)) {
    patch.tags = (o.tags as unknown[])
      .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      .slice(0, MAX_TAGS)
      .map((t) => t.trim());
  }
  if (typeof o.relatedCustomerId === "string") {
    patch.relatedCustomerId = o.relatedCustomerId.trim() || undefined;
  } else if (o.relatedCustomerId === null) {
    patch.relatedCustomerId = undefined;
  }
  if (typeof o.relatedAppointmentId === "string") {
    patch.relatedAppointmentId = o.relatedAppointmentId.trim() || undefined;
  } else if (o.relatedAppointmentId === null) {
    patch.relatedAppointmentId = undefined;
  }
  if (typeof o.notes === "string") {
    patch.notes = trimString(o.notes, MAX_NOTES);
  }
  return patch;
}

// ── Firestore I/O (SDK-agnostic) ─────────────────────────────────────────────
//
// We accept `db` and `FieldValue` as opaque arguments so the test suite drives
// these with a minimal in-memory shim.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFieldValue = any;

export type TaskContext = {
  db: AnyDb;
  FieldValue: AnyFieldValue;
  clientId: string;
  caller: { email: string; role: AdminRole };
};

const COLLECTION = "tasks";

function serializeTaskDoc(id: string, data: Record<string, unknown>): Task {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ts = (v: any): string | undefined => {
    if (!v) return undefined;
    if (typeof v === "string") return v;
    if (v instanceof Date) {
      return Number.isNaN(v.getTime()) ? undefined : v.toISOString();
    }
    if (typeof v.toDate === "function") {
      try {
        return v.toDate().toISOString();
      } catch {
        return undefined;
      }
    }
    if (typeof v.seconds === "number") {
      return new Date(v.seconds * 1000).toISOString();
    }
    return undefined;
  };
  return {
    id,
    clientId: String(data.clientId ?? ""),
    title: typeof data.title === "string" ? data.title : "",
    description: typeof data.description === "string" ? data.description : undefined,
    status: isTaskStatus(data.status) ? data.status : "pending",
    priority: isTaskPriority(data.priority) ? data.priority : "medium",
    dueDate: ts(data.dueDate),
    assignedTo:
      typeof data.assignedTo === "string" && data.assignedTo
        ? data.assignedTo
        : undefined,
    createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
    createdAt: ts(data.createdAt),
    updatedAt: ts(data.updatedAt),
    completedAt: ts(data.completedAt),
    shared: Boolean(data.shared),
    tags: Array.isArray(data.tags)
      ? (data.tags as unknown[]).filter((t): t is string => typeof t === "string")
      : undefined,
    relatedCustomerId:
      typeof data.relatedCustomerId === "string" && data.relatedCustomerId
        ? data.relatedCustomerId
        : undefined,
    relatedAppointmentId:
      typeof data.relatedAppointmentId === "string" && data.relatedAppointmentId
        ? data.relatedAppointmentId
        : undefined,
    notes: typeof data.notes === "string" ? data.notes : undefined,
  };
}

export async function createTask(
  ctx: TaskContext,
  input: TaskCreateInput,
): Promise<Task> {
  const { db, FieldValue, clientId, caller } = ctx;
  const payload: Record<string, unknown> = {
    clientId,
    title: input.title,
    description: input.description,
    status: "pending" as TaskStatus,
    priority: input.priority ?? "medium",
    assignedTo: input.assignedTo,
    createdBy: caller.email,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    shared: input.shared ?? false,
    tags: input.tags,
    relatedCustomerId: input.relatedCustomerId,
    relatedAppointmentId: input.relatedAppointmentId,
    notes: input.notes,
  };
  // Drop undefined keys so the Firestore doc doesn't carry `field: undefined`.
  for (const k of Object.keys(payload)) {
    if (payload[k] === undefined) delete payload[k];
  }
  if (input.dueDate) {
    // Caller may pass an already-validated ISO string OR a free-form natural
    // phrase ("tomorrow"); be defensive and run it through the parser again.
    const iso = parseTaskDueDate(input.dueDate);
    if (iso) payload.dueDate = new Date(iso);
  }

  const ref = await db.collection(COLLECTION).add(payload);
  const snap = await ref.get();
  return serializeTaskDoc(ref.id, snap.data() ?? {});
}

export async function listTasks(
  ctx: TaskContext,
  filters: TaskListFilters = {},
): Promise<Task[]> {
  const { db, clientId, caller } = ctx;
  // Single equality filter on clientId then everything else in memory — keeps
  // index requirements to zero. The collection is per-tenant small (typically
  // <500 docs); fan-out is cheap.
  const snap = await db
    .collection(COLLECTION)
    .where("clientId", "==", clientId)
    .get();
  const all: Task[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  snap.forEach((doc: any) => {
    const data = doc.data() ?? {};
    all.push(serializeTaskDoc(doc.id, data));
  });

  const visible = all.filter((t) => canSeeTask(t, caller));
  const filtered = visible.filter((t) => {
    if (filters.status === "open") {
      if (t.status !== "pending" && t.status !== "in_progress") return false;
    } else if (filters.status) {
      if (t.status !== filters.status) return false;
    }
    if (filters.assignedTo && t.assignedTo !== filters.assignedTo) return false;
    if (filters.priority && t.priority !== filters.priority) return false;
    if (filters.tag) {
      if (!Array.isArray(t.tags) || !t.tags.includes(filters.tag)) return false;
    }
    if (filters.relatedCustomerId && t.relatedCustomerId !== filters.relatedCustomerId)
      return false;
    return true;
  });

  filtered.sort((a, b) => {
    // Pending/in-progress first; then due date asc; then createdAt desc.
    const statusRank: Record<TaskStatus, number> = {
      pending: 0,
      in_progress: 1,
      done: 2,
      archived: 3,
    };
    const sr = statusRank[a.status] - statusRank[b.status];
    if (sr !== 0) return sr;
    const aDue = a.dueDate ? Date.parse(a.dueDate) : Infinity;
    const bDue = b.dueDate ? Date.parse(b.dueDate) : Infinity;
    if (aDue !== bDue) return aDue - bDue;
    const aC = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bC = b.createdAt ? Date.parse(b.createdAt) : 0;
    return bC - aC;
  });

  return typeof filters.limit === "number" && filters.limit > 0
    ? filtered.slice(0, filters.limit)
    : filtered;
}

export async function getTask(
  ctx: TaskContext,
  taskId: string,
): Promise<Task | null> {
  const { db, clientId, caller } = ctx;
  const snap = await db.collection(COLLECTION).doc(taskId).get();
  if (!snap.exists) return null;
  const data = snap.data() ?? {};
  if (data.clientId !== clientId) throw new TaskValidationError("Forbidden", 403);
  const task = serializeTaskDoc(taskId, data);
  if (!canSeeTask(task, caller)) throw new TaskValidationError("Forbidden", 403);
  return task;
}

export async function updateTask(
  ctx: TaskContext,
  taskId: string,
  patch: TaskUpdateInput,
): Promise<Task> {
  const { db, FieldValue, clientId, caller } = ctx;
  const ref = db.collection(COLLECTION).doc(taskId);
  const snap = await ref.get();
  if (!snap.exists) throw new TaskValidationError("not found", 404);
  const data = snap.data() ?? {};
  if (data.clientId !== clientId) throw new TaskValidationError("Forbidden", 403);
  const existing = serializeTaskDoc(taskId, data);
  const perm = canEditTask(existing, caller);
  if (perm.kind === "none") throw new TaskValidationError("Forbidden", 403);

  const next: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (perm.kind === "status_only") {
    if (patch.status === undefined) {
      throw new TaskValidationError(
        "assignees can only change task status",
        403,
      );
    }
    const otherKeys = Object.keys(patch).filter((k) => k !== "status");
    if (otherKeys.length > 0) {
      throw new TaskValidationError(
        "assignees can only change task status",
        403,
      );
    }
    next.status = patch.status;
    if (patch.status === "done") next.completedAt = FieldValue.serverTimestamp();
  } else {
    if (patch.title !== undefined) next.title = patch.title;
    if (patch.description !== undefined) next.description = patch.description;
    if (patch.priority !== undefined) next.priority = patch.priority;
    if (patch.assignedTo !== undefined) next.assignedTo = patch.assignedTo ?? null;
    if (patch.shared !== undefined) next.shared = patch.shared;
    if (patch.tags !== undefined) next.tags = patch.tags;
    if (patch.relatedCustomerId !== undefined)
      next.relatedCustomerId = patch.relatedCustomerId ?? null;
    if (patch.relatedAppointmentId !== undefined)
      next.relatedAppointmentId = patch.relatedAppointmentId ?? null;
    if (patch.notes !== undefined) next.notes = patch.notes;
    if (patch.dueDate !== undefined) {
      next.dueDate = patch.dueDate ? new Date(patch.dueDate) : null;
    }
    if (patch.status !== undefined) {
      next.status = patch.status;
      if (patch.status === "done") next.completedAt = FieldValue.serverTimestamp();
      if (patch.status !== "done" && existing.status === "done") {
        next.completedAt = null;
      }
    }
  }

  await ref.update(next);
  const after = await ref.get();
  return serializeTaskDoc(taskId, after.data() ?? {});
}

export async function deleteTask(
  ctx: TaskContext,
  taskId: string,
): Promise<void> {
  const { db, clientId, caller } = ctx;
  const ref = db.collection(COLLECTION).doc(taskId);
  const snap = await ref.get();
  if (!snap.exists) throw new TaskValidationError("not found", 404);
  const data = snap.data() ?? {};
  if (data.clientId !== clientId) throw new TaskValidationError("Forbidden", 403);
  const existing = serializeTaskDoc(taskId, data);
  if (!canDeleteTask(existing, caller))
    throw new TaskValidationError("Forbidden", 403);
  await ref.delete();
}

/**
 * Mark a task done via either an explicit id OR a title fragment. Returns the
 * matched task on unique success, or an ambiguous list when multiple match.
 */
export type CompleteTaskOutcome =
  | { kind: "completed"; task: Task }
  | { kind: "ambiguous"; matches: Pick<Task, "id" | "title" | "status">[] }
  | { kind: "not_found" };

export async function completeTaskByQuery(
  ctx: TaskContext,
  query: { taskId?: string; titleOrFragment?: string },
): Promise<CompleteTaskOutcome> {
  if (query.taskId) {
    const t = await getTask(ctx, query.taskId);
    if (!t) return { kind: "not_found" };
    const updated = await updateTask(ctx, t.id, { status: "done" });
    return { kind: "completed", task: updated };
  }
  const frag = (query.titleOrFragment ?? "").trim();
  if (!frag) return { kind: "not_found" };

  const open = await listTasks(ctx, { status: "open" });
  const match = fuzzyFindTask(frag, open);
  if (match.kind === "none") return { kind: "not_found" };
  if (match.kind === "ambiguous") {
    return {
      kind: "ambiguous",
      matches: match.tasks.map((t) => ({ id: t.id, title: t.title, status: t.status })),
    };
  }
  const updated = await updateTask(ctx, match.task.id, { status: "done" });
  return { kind: "completed", task: updated };
}
