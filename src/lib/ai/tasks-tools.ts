/**
 * Tasks chat tools (Bloque J) — Gemini function-call declarations plus
 * executors that delegate to src/lib/tasks.ts for storage + permissions.
 *
 * Mirrors the shape of src/lib/ai/stock-tools.ts so admin-tools.ts can
 * register both packs the same way (dispatcher accepts an extended ctx union).
 *
 * Executors return DispatchResult-shaped objects: ambiguous matches and
 * not-founds come back as `success: false` data, not thrown errors — the
 * model should react to them naturally.
 */

import type { GeminiFunctionDeclaration } from "./admin-tools.js";
import { AdminActionError } from "./admin-tools.js";
import {
  completeTaskByQuery,
  createTask as createTaskCore,
  listTasks as listTasksCore,
  parseTaskDueDate,
  isTaskPriority,
  isTaskStatus,
  type Task,
  type TaskListFilters,
  type TaskStatus,
} from "../tasks.js";
import type { AdminRole } from "../admin-users.js";

// ── Context ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminDb = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminFieldValue = any;

export type TasksActionCtx = {
  db: AdminDb;
  FieldValue: AdminFieldValue;
  clientId: string;
  /** Tasks need to know who's calling for visibility + createdBy attribution. */
  actorEmail?: string;
  actorRole?: AdminRole;
  demoMode?: boolean;
};

// ── Tool declarations ────────────────────────────────────────────────────────

export const TASKS_TOOL_DECLARATIONS: GeminiFunctionDeclaration[] = [
  {
    name: "create_task",
    description:
      "Create a new task / todo for the admin. Use when the admin asks to add a task, reminder, or pending item. If they mention a specific customer by name, set relatedCustomerId only when an id is known from prior context; otherwise leave it blank. dueDate may be a natural-language phrase like 'tomorrow', 'mañana', 'la próxima semana' or an ISO date — the executor parses it.",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING", description: "Short, imperative task title." },
        description: { type: "STRING", description: "Optional longer description / notes." },
        priority: {
          type: "STRING",
          enum: ["high", "medium", "low"],
          description: "Defaults to medium when not specified.",
        },
        dueDate: {
          type: "STRING",
          description:
            "Optional. Natural-language relative date (e.g. 'tomorrow', 'mañana', 'next week') OR an ISO 8601 date / datetime.",
        },
        assignedTo: {
          type: "STRING",
          description: "Optional lowercase email of the assignee. Omit for self-assign / unassigned.",
        },
        shared: {
          type: "BOOLEAN",
          description:
            "Default false (private). Set true ONLY when the admin explicitly says the task should be visible to the team.",
        },
        relatedCustomerId: {
          type: "STRING",
          description: "Optional customer id from the (id:xxx) tags when the task is about a known customer.",
        },
        tags: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Optional short tags (e.g. 'follow-up', 'inventory').",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "list_tasks",
    description:
      "List the admin's visible tasks. Defaults to open tasks (pending + in_progress) if no status is given. Visibility is auto-scoped to what the caller can see (own + shared + assigned-to-me; owners see everything).",
    parameters: {
      type: "OBJECT",
      properties: {
        status: {
          type: "STRING",
          enum: ["pending", "in_progress", "done", "archived", "open"],
          description: "Filter by status. 'open' = pending + in_progress (default).",
        },
        priority: {
          type: "STRING",
          enum: ["high", "medium", "low"],
        },
        assignedTo: { type: "STRING", description: "Lowercase email of the assignee." },
        limit: { type: "INTEGER", description: "Cap on results. Defaults to 10." },
      },
    },
  },
  {
    name: "complete_task",
    description:
      "Mark a task done. Provide either an exact taskId (from a prior tool response) OR a titleOrFragment for fuzzy lookup. If the fragment matches multiple open tasks, you'll get an ambiguous result — ask the admin which one.",
    parameters: {
      type: "OBJECT",
      properties: {
        taskId: { type: "STRING", description: "Exact task id from a previous tool response." },
        titleOrFragment: {
          type: "STRING",
          description:
            "Free-text fragment of the title (accent-insensitive). Used when the admin says 'marca completada limpiar local'.",
        },
      },
    },
  },
];

export const TASKS_TOOL_NAMES = ["create_task", "list_tasks", "complete_task"] as const;
export type TasksToolName = (typeof TASKS_TOOL_NAMES)[number];

export function isTasksAction(name: string): name is TasksToolName {
  return (TASKS_TOOL_NAMES as readonly string[]).includes(name);
}

// ── Result shapes (mirrors stock-tools DispatchResult union) ─────────────────

export type TasksActionResult =
  | { success: true; kind: "created"; task: SerializableTask }
  | { success: true; kind: "list"; tasks: SerializableTask[]; total: number }
  | { success: true; kind: "completed"; task: SerializableTask }
  | {
      success: false;
      kind: "ambiguous";
      candidates: { id: string; title: string; status: TaskStatus }[];
    }
  | { success: false; kind: "not_found"; query: string };

/** A trimmed task shape that's safe to hand back to Gemini (no FieldValues). */
export type SerializableTask = Task;

// ── Helpers ──────────────────────────────────────────────────────────────────

function requireCaller(ctx: TasksActionCtx): { email: string; role: AdminRole } {
  const email = ctx.actorEmail?.trim().toLowerCase();
  const role = ctx.actorRole ?? "staff";
  if (!email) throw new AdminActionError(401, "missing caller email for tasks action");
  return { email, role };
}

// ── Demo fixtures ────────────────────────────────────────────────────────────
//
// When ctx.demoMode is set, we don't touch Firestore. Returns plausible mock
// state so the tour can demonstrate the assistant's task-handling.

let demoTaskSeq = 1000;

function demoTask(partial: Partial<Task>): Task {
  demoTaskSeq += 1;
  return {
    id: partial.id ?? `demo-task-${demoTaskSeq}`,
    clientId: partial.clientId ?? "demo",
    title: partial.title ?? "Demo task",
    status: partial.status ?? "pending",
    priority: partial.priority ?? "medium",
    shared: partial.shared ?? false,
    createdBy: partial.createdBy ?? "demo@example.com",
    createdAt: partial.createdAt ?? new Date().toISOString(),
    updatedAt: partial.updatedAt ?? new Date().toISOString(),
    ...partial,
  };
}

// ── Executors ────────────────────────────────────────────────────────────────

export async function executeCreateTask(
  ctx: TasksActionCtx,
  args: Record<string, unknown>,
): Promise<TasksActionResult> {
  const caller = requireCaller(ctx);
  const title = typeof args.title === "string" ? args.title.trim() : "";
  if (!title) throw new AdminActionError(400, "title is required");
  const priority = isTaskPriority(args.priority) ? args.priority : "medium";
  const description =
    typeof args.description === "string" && args.description.trim()
      ? args.description.trim().slice(0, 4_000)
      : undefined;
  const dueDateIso =
    typeof args.dueDate === "string" && args.dueDate.trim()
      ? parseTaskDueDate(args.dueDate) ?? undefined
      : undefined;
  const assignedTo =
    typeof args.assignedTo === "string" && args.assignedTo.trim()
      ? args.assignedTo.trim().toLowerCase()
      : undefined;
  const shared = Boolean(args.shared);
  const relatedCustomerId =
    typeof args.relatedCustomerId === "string" && args.relatedCustomerId.trim()
      ? args.relatedCustomerId.trim()
      : undefined;
  const tags = Array.isArray(args.tags)
    ? (args.tags as unknown[])
        .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
        .map((t) => t.trim())
        .slice(0, 20)
    : undefined;

  if (ctx.demoMode) {
    return {
      success: true,
      kind: "created",
      task: demoTask({
        title,
        description,
        priority,
        shared,
        dueDate: dueDateIso,
        assignedTo,
        relatedCustomerId,
        tags,
        createdBy: caller.email,
      }),
    };
  }

  const created = await createTaskCore(
    { db: ctx.db, FieldValue: ctx.FieldValue, clientId: ctx.clientId, caller },
    {
      title,
      description,
      priority,
      dueDate: dueDateIso,
      assignedTo,
      shared,
      relatedCustomerId,
      tags,
    },
  );
  return { success: true, kind: "created", task: created };
}

export async function executeListTasks(
  ctx: TasksActionCtx,
  args: Record<string, unknown>,
): Promise<TasksActionResult> {
  const caller = requireCaller(ctx);
  const filters: TaskListFilters = {};
  if (typeof args.status === "string") {
    if (args.status === "open" || isTaskStatus(args.status)) {
      filters.status = args.status as TaskStatus | "open";
    }
  } else {
    filters.status = "open";
  }
  if (isTaskPriority(args.priority)) filters.priority = args.priority;
  if (typeof args.assignedTo === "string" && args.assignedTo.trim()) {
    filters.assignedTo = args.assignedTo.trim().toLowerCase();
  }
  const limitRaw = Number(args.limit);
  filters.limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(50, Math.trunc(limitRaw)) : 10;

  if (ctx.demoMode) {
    const mock: Task[] = [
      demoTask({ title: "Confirmar pedido cera", status: "pending", priority: "high" }),
      demoTask({ title: "Llamar proveedor de cintas", status: "in_progress", priority: "medium" }),
      demoTask({ title: "Revisar caja del viernes", status: "pending", priority: "low" }),
    ];
    return { success: true, kind: "list", tasks: mock, total: mock.length };
  }

  const tasks = await listTasksCore(
    { db: ctx.db, FieldValue: ctx.FieldValue, clientId: ctx.clientId, caller },
    filters,
  );
  return { success: true, kind: "list", tasks, total: tasks.length };
}

export async function executeCompleteTask(
  ctx: TasksActionCtx,
  args: Record<string, unknown>,
): Promise<TasksActionResult> {
  const caller = requireCaller(ctx);
  const taskId =
    typeof args.taskId === "string" && args.taskId.trim() ? args.taskId.trim() : undefined;
  const titleOrFragment =
    typeof args.titleOrFragment === "string" && args.titleOrFragment.trim()
      ? args.titleOrFragment.trim()
      : undefined;
  if (!taskId && !titleOrFragment) {
    throw new AdminActionError(400, "either taskId or titleOrFragment is required");
  }

  if (ctx.demoMode) {
    return {
      success: true,
      kind: "completed",
      task: demoTask({
        id: taskId ?? "demo-task-completed",
        title: titleOrFragment ?? "Tarea demo",
        status: "done",
        completedAt: new Date().toISOString(),
      }),
    };
  }

  const outcome = await completeTaskByQuery(
    { db: ctx.db, FieldValue: ctx.FieldValue, clientId: ctx.clientId, caller },
    { taskId, titleOrFragment },
  );
  if (outcome.kind === "not_found") {
    return {
      success: false,
      kind: "not_found",
      query: titleOrFragment ?? taskId ?? "",
    };
  }
  if (outcome.kind === "ambiguous") {
    return { success: false, kind: "ambiguous", candidates: outcome.matches };
  }
  return { success: true, kind: "completed", task: outcome.task };
}

// ── Tool-line copy for buildScopedToolsFragment ──────────────────────────────

export const TASKS_TOOL_LINES: Record<TasksToolName, string> = {
  create_task:
    "- create_task: add a new todo / pending item. Default shared=false (private). dueDate accepts 'tomorrow' / 'mañana' / ISO.",
  list_tasks:
    "- list_tasks: list the admin's visible tasks (default status=open). Filter by priority / assignedTo / limit.",
  complete_task:
    "- complete_task: mark a task done by id OR title fragment. If ambiguous you'll get candidates back — ask which one.",
};

// ── Localised result formatter for the chat handler ──────────────────────────

export type TasksLang = "en" | "he" | "ru" | "ar";

function relativeDateLabel(iso: string | undefined, lang: TasksLang): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) {
    return lang === "he" ? "היום" : lang === "ru" ? "сегодня" : lang === "ar" ? "اليوم" : "today";
  }
  if (diff === 1) {
    return lang === "he"
      ? "מחר"
      : lang === "ru"
        ? "завтра"
        : lang === "ar"
          ? "غدا"
          : "tomorrow";
  }
  if (diff > 1 && diff < 14) {
    return lang === "he"
      ? `בעוד ${diff} ימים`
      : lang === "ru"
        ? `через ${diff} дн.`
        : lang === "ar"
          ? `بعد ${diff} يوم`
          : `in ${diff} days`;
  }
  return d.toISOString().slice(0, 10);
}

export function formatTasksResult(result: TasksActionResult, lang: TasksLang = "en"): string {
  const t = {
    created:
      lang === "he"
        ? "✓ נוצרה משימה"
        : lang === "ru"
          ? "✓ Задача создана"
          : lang === "ar"
            ? "✓ تم إنشاء المهمة"
            : "✓ Task created",
    completed:
      lang === "he"
        ? "✓ סומן כהושלם"
        : lang === "ru"
          ? "✓ Помечено как выполнено"
          : lang === "ar"
            ? "✓ تم وضع علامة كمكتملة"
            : "✓ Marked as done",
    none:
      lang === "he"
        ? "אין משימות פתוחות תואמות"
        : lang === "ru"
          ? "Открытых задач нет"
          : lang === "ar"
            ? "لا توجد مهام مطابقة"
            : "No matching open tasks",
    listEmpty:
      lang === "he"
        ? "אין משימות לתצוגה"
        : lang === "ru"
          ? "Задач для отображения нет"
          : lang === "ar"
            ? "لا توجد مهام"
            : "No tasks to show",
    pickOne:
      lang === "he"
        ? "מצאתי כמה אפשרויות — איזו מהן?"
        : lang === "ru"
          ? "Нашёл несколько совпадений — какое из них?"
          : lang === "ar"
            ? "لقد وجدت عدة تطابقات — أيها؟"
            : "I found a few matches — which one?",
    notFound:
      lang === "he"
        ? "לא נמצאה משימה תואמת"
        : lang === "ru"
          ? "Совпадений не найдено"
          : lang === "ar"
            ? "لم يتم العثور على مهمة"
            : "No task found by that name",
  };

  if (result.success === false) {
    if (result.kind === "ambiguous") {
      const lines = result.candidates.map((c) => `• ${c.title} (${c.id})`).join("\n");
      return `${t.pickOne}\n${lines}`;
    }
    if (result.kind === "not_found") {
      return `${t.notFound} ("${result.query}").`;
    }
    return t.notFound;
  }
  if (result.kind === "created") {
    const due = relativeDateLabel(result.task.dueDate, lang);
    return due ? `${t.created}: ${result.task.title} (${due}).` : `${t.created}: ${result.task.title}.`;
  }
  if (result.kind === "completed") return `${t.completed}: ${result.task.title}.`;
  // list
  if (result.tasks.length === 0) return t.listEmpty;
  const lines = result.tasks.map((task) => {
    const due = relativeDateLabel(task.dueDate, lang);
    const dueText = due ? ` · ${due}` : "";
    return `• ${task.title}${dueText} [${task.priority}]`;
  });
  return lines.join("\n");
}
