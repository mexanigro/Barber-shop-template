/**
 * Functional tests for src/lib/tasks.ts.
 *
 * Run with: npx tsx --test src/lib/tasks.test.ts
 *
 * Driven by the same in-memory Firestore fake style used by
 * src/lib/ai/stock-tools.test.ts. Each test seeds documents directly and
 * asserts on what the module reads / writes back.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  canDeleteTask,
  canEditTask,
  canSeeTask,
  completeTaskByQuery,
  createTask,
  deleteTask,
  fuzzyFindTask,
  getTask,
  listTasks,
  parseTaskDueDate,
  TaskValidationError,
  updateTask,
  validateCreateInput,
  type Task,
} from "./tasks.ts";

// ─── In-memory Firestore fake ────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
type DocData = Record<string, any>;

class FakeDocRef {
  collection: FakeCollection;
  id: string;
  constructor(collection: FakeCollection, id: string) {
    this.collection = collection;
    this.id = id;
  }
  async get() {
    const exists = this.collection.docs.has(this.id);
    const data = this.collection.docs.get(this.id);
    return {
      exists,
      id: this.id,
      data: () => (exists ? { ...data } : undefined),
    };
  }
  async set(data: DocData, opts?: { merge?: boolean }) {
    const existing = this.collection.docs.get(this.id);
    if (opts?.merge && existing) {
      this.collection.docs.set(this.id, { ...existing, ...expandFieldValues(data) });
    } else {
      this.collection.docs.set(this.id, expandFieldValues(data));
    }
  }
  async update(data: DocData) {
    const existing = this.collection.docs.get(this.id);
    if (!existing) throw new Error(`update on non-existent doc ${this.id}`);
    this.collection.docs.set(this.id, { ...existing, ...expandFieldValues(data) });
  }
  async delete() {
    this.collection.docs.delete(this.id);
  }
}

class FakeQuery {
  constructor(public collection: FakeCollection, public filters: Array<[string, string, any]>) {}
  where(field: string, op: string, value: any): FakeQuery {
    return new FakeQuery(this.collection, [...this.filters, [field, op, value]]);
  }
  async get() {
    const results: Array<{ id: string; data: () => DocData }> = [];
    for (const [id, data] of this.collection.docs.entries()) {
      const ok = this.filters.every(([f, op, v]) => (op === "==" ? data[f] === v : false));
      if (ok) results.push({ id, data: () => ({ ...data }) });
    }
    return {
      empty: results.length === 0,
      size: results.length,
      docs: results,
      forEach: (cb: (doc: { id: string; data: () => DocData }) => void) => results.forEach(cb),
    };
  }
}

class FakeCollection {
  docs = new Map<string, DocData>();
  nextAutoId = 1;
  constructor(public name: string) {}
  doc(id?: string): FakeDocRef {
    const docId = id ?? `auto_${this.name}_${this.nextAutoId++}`;
    return new FakeDocRef(this, docId);
  }
  where(field: string, op: string, value: any): FakeQuery {
    return new FakeQuery(this, [[field, op, value]]);
  }
  async add(data: DocData): Promise<FakeDocRef> {
    const id = `auto_${this.name}_${this.nextAutoId++}`;
    this.docs.set(id, expandFieldValues(data));
    return new FakeDocRef(this, id);
  }
}

class FakeDb {
  collections = new Map<string, FakeCollection>();
  collection(name: string): FakeCollection {
    let c = this.collections.get(name);
    if (!c) {
      c = new FakeCollection(name);
      this.collections.set(name, c);
    }
    return c;
  }
}

const FAKE_FIELD_VALUE = {
  serverTimestamp: () => ({ __op: "serverTimestamp" }),
};

function expandFieldValues(data: DocData): DocData {
  const out: DocData = {};
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === "object" && (v as any).__op === "serverTimestamp") {
      out[k] = new Date("2026-05-28T00:00:00Z");
    } else {
      out[k] = v;
    }
  }
  return out;
}

function makeCtx(clientId = "tenant_a", email = "owner@a.com", role: "owner" | "manager" | "staff" = "owner") {
  const db = new FakeDb();
  return {
    db: db as any,
    FieldValue: FAKE_FIELD_VALUE as any,
    clientId,
    caller: { email, role },
  };
}

function seedTask(db: FakeDb, partial: Partial<Task> & { id: string; clientId: string }) {
  db.collection("tasks").docs.set(partial.id, {
    clientId: partial.clientId,
    title: partial.title ?? "Untitled",
    status: partial.status ?? "pending",
    priority: partial.priority ?? "medium",
    shared: partial.shared ?? false,
    createdBy: partial.createdBy ?? "owner@a.com",
    assignedTo: partial.assignedTo,
    dueDate: partial.dueDate ? new Date(partial.dueDate) : undefined,
    tags: partial.tags,
    relatedCustomerId: partial.relatedCustomerId,
    notes: partial.notes,
    createdAt: partial.createdAt ? new Date(partial.createdAt) : new Date("2026-05-20T00:00:00Z"),
    updatedAt: partial.updatedAt ? new Date(partial.updatedAt) : new Date("2026-05-20T00:00:00Z"),
  });
}

// ─── parseTaskDueDate ───────────────────────────────────────────────────────

describe("parseTaskDueDate", () => {
  const now = new Date("2026-05-28T12:00:00Z");

  test("ISO date passes through", () => {
    const iso = parseTaskDueDate("2026-06-15", now);
    assert.ok(iso);
    assert.ok(iso?.startsWith("2026-06-15"));
  });

  // Note: parseTaskDueDate uses local-time setHours(23,59) for "end of day",
  // so the precise UTC offset bounces with timezone. We assert windows that are
  // wide enough to survive any TZ but tight enough to catch off-by-week bugs.
  const DAY = 1000 * 60 * 60 * 24;

  test("tomorrow → roughly +1 day", () => {
    const iso = parseTaskDueDate("tomorrow", now);
    assert.ok(iso);
    const ms = new Date(iso!).getTime() - now.getTime();
    assert.ok(ms > 0 && ms < 2 * DAY, `expected within (0, 2 days), got ${ms / DAY}d`);
  });

  test("mañana with accent → roughly +1 day", () => {
    const iso = parseTaskDueDate("mañana", now);
    assert.ok(iso);
    const ms = new Date(iso!).getTime() - now.getTime();
    assert.ok(ms > 0 && ms < 2 * DAY);
  });

  test("la próxima semana → roughly +7 days", () => {
    const iso = parseTaskDueDate("la próxima semana", now);
    assert.ok(iso);
    const ms = new Date(iso!).getTime() - now.getTime();
    assert.ok(ms > 5 * DAY && ms < 8 * DAY, `expected ~7d, got ${ms / DAY}d`);
  });

  test("en 3 dias → roughly +3 days", () => {
    const iso = parseTaskDueDate("en 3 dias", now);
    assert.ok(iso);
    const ms = new Date(iso!).getTime() - now.getTime();
    assert.ok(ms > 1.5 * DAY && ms < 4 * DAY, `expected ~3d, got ${ms / DAY}d`);
  });

  test("gibberish → null", () => {
    const iso = parseTaskDueDate("zzzzz");
    assert.equal(iso, null);
  });

  test("empty → null", () => {
    assert.equal(parseTaskDueDate(""), null);
    assert.equal(parseTaskDueDate(undefined), null);
  });
});

// ─── Validation ─────────────────────────────────────────────────────────────

describe("validateCreateInput", () => {
  test("requires a title", () => {
    assert.throws(
      () => validateCreateInput({ description: "no title" }),
      TaskValidationError,
    );
  });

  test("trims title + drops empty strings", () => {
    const input = validateCreateInput({ title: "  buy supplies  " });
    assert.equal(input.title, "buy supplies");
  });

  test("defaults priority to medium", () => {
    const input = validateCreateInput({ title: "x" });
    assert.equal(input.priority, "medium");
  });

  test("parses relative dueDate", () => {
    const input = validateCreateInput({ title: "x", dueDate: "tomorrow" });
    assert.ok(input.dueDate);
  });

  test("lowercases assignedTo", () => {
    const input = validateCreateInput({ title: "x", assignedTo: "JOE@HOST.COM" });
    assert.equal(input.assignedTo, "joe@host.com");
  });

  test("filters empty tags + caps at 20", () => {
    const input = validateCreateInput({
      title: "x",
      tags: ["a", "", "  b  ", ...Array.from({ length: 25 }, (_, i) => `t${i}`)],
    });
    assert.ok(input.tags);
    assert.equal(input.tags!.length, 20);
    assert.ok(input.tags!.includes("b"));
  });
});

// ─── Visibility ─────────────────────────────────────────────────────────────

describe("canSeeTask", () => {
  test("owner sees everything", () => {
    assert.equal(
      canSeeTask(
        { createdBy: "other@a.com", assignedTo: undefined, shared: false },
        { email: "owner@a.com", role: "owner" },
      ),
      true,
    );
  });

  test("staff sees own private task", () => {
    assert.equal(
      canSeeTask(
        { createdBy: "me@a.com", assignedTo: undefined, shared: false },
        { email: "me@a.com", role: "staff" },
      ),
      true,
    );
  });

  test("staff does NOT see another staff's private task", () => {
    assert.equal(
      canSeeTask(
        { createdBy: "other@a.com", assignedTo: undefined, shared: false },
        { email: "me@a.com", role: "staff" },
      ),
      false,
    );
  });

  test("staff sees shared task", () => {
    assert.equal(
      canSeeTask(
        { createdBy: "other@a.com", assignedTo: undefined, shared: true },
        { email: "me@a.com", role: "staff" },
      ),
      true,
    );
  });

  test("staff sees private task assigned to them", () => {
    assert.equal(
      canSeeTask(
        { createdBy: "other@a.com", assignedTo: "me@a.com", shared: false },
        { email: "me@a.com", role: "staff" },
      ),
      true,
    );
  });
});

describe("canEditTask", () => {
  test("owner gets full edit on anyone's task", () => {
    const perm = canEditTask(
      { createdBy: "other@a.com", assignedTo: undefined },
      { email: "owner@a.com", role: "owner" },
    );
    assert.equal(perm.kind, "full");
  });

  test("creator gets full edit on own task", () => {
    const perm = canEditTask(
      { createdBy: "me@a.com", assignedTo: undefined },
      { email: "me@a.com", role: "staff" },
    );
    assert.equal(perm.kind, "full");
  });

  test("assignee gets status_only on someone else's task", () => {
    const perm = canEditTask(
      { createdBy: "other@a.com", assignedTo: "me@a.com" },
      { email: "me@a.com", role: "staff" },
    );
    assert.equal(perm.kind, "status_only");
  });

  test("uninvolved staff gets none", () => {
    const perm = canEditTask(
      { createdBy: "other@a.com", assignedTo: "another@a.com" },
      { email: "me@a.com", role: "staff" },
    );
    assert.equal(perm.kind, "none");
  });
});

describe("canDeleteTask", () => {
  test("only creator and owner can delete", () => {
    assert.equal(
      canDeleteTask({ createdBy: "me@a.com" }, { email: "me@a.com", role: "staff" }),
      true,
    );
    assert.equal(
      canDeleteTask({ createdBy: "other@a.com" }, { email: "owner@a.com", role: "owner" }),
      true,
    );
    assert.equal(
      canDeleteTask({ createdBy: "other@a.com" }, { email: "me@a.com", role: "manager" }),
      false,
    );
  });
});

// ─── Fuzzy match ────────────────────────────────────────────────────────────

describe("fuzzyFindTask", () => {
  const tasks: Task[] = [
    {
      id: "t1",
      clientId: "a",
      title: "Limpiar local",
      status: "pending",
      priority: "medium",
      shared: false,
      createdBy: "me@a.com",
      createdAt: "2026-05-26T00:00:00Z",
    },
    {
      id: "t2",
      clientId: "a",
      title: "Revisar equipo de tatuar",
      status: "in_progress",
      priority: "high",
      shared: false,
      createdBy: "me@a.com",
      createdAt: "2026-05-27T00:00:00Z",
    },
    {
      id: "t3",
      clientId: "a",
      title: "Limpiar baños",
      status: "pending",
      priority: "low",
      shared: false,
      createdBy: "me@a.com",
      createdAt: "2026-05-28T00:00:00Z",
    },
  ];

  test("exact title → unique exact", () => {
    const r = fuzzyFindTask("revisar equipo de tatuar", tasks);
    assert.equal(r.kind, "exact");
    if (r.kind === "exact") assert.equal(r.task.id, "t2");
  });

  test("substring 'limpiar' → ambiguous between two limpiars", () => {
    const r = fuzzyFindTask("limpiar", tasks);
    assert.equal(r.kind, "ambiguous");
    if (r.kind === "ambiguous") assert.equal(r.tasks.length, 2);
  });

  test("specific 'limpiar local' → unique", () => {
    const r = fuzzyFindTask("limpiar local", tasks);
    assert.ok(r.kind === "unique" || r.kind === "exact");
  });

  test("no match → none", () => {
    const r = fuzzyFindTask("verb totally absent", tasks);
    assert.equal(r.kind, "none");
  });

  test("ignores archived tasks", () => {
    const tasksWithArchived: Task[] = [
      ...tasks,
      {
        id: "t-old",
        clientId: "a",
        title: "Limpiar todo el viejo local",
        status: "archived",
        priority: "low",
        shared: false,
        createdBy: "me@a.com",
        createdAt: "2026-01-01T00:00:00Z",
      },
    ];
    const r = fuzzyFindTask("viejo", tasksWithArchived);
    assert.equal(r.kind, "none");
  });
});

// ─── createTask + listTasks ────────────────────────────────────────────────

describe("createTask + listTasks", () => {
  test("create writes a doc with the expected shape", async () => {
    const ctx = makeCtx();
    const task = await createTask(ctx, { title: "Buy supplies" });
    assert.equal(task.title, "Buy supplies");
    assert.equal(task.status, "pending");
    assert.equal(task.priority, "medium");
    assert.equal(task.shared, false);
    assert.equal(task.createdBy, "owner@a.com");
    // Doc actually landed in the fake collection.
    assert.equal((ctx.db as any).collection("tasks").docs.size, 1);
  });

  test("create respects dueDate (relative)", async () => {
    const ctx = makeCtx();
    const task = await createTask(ctx, { title: "x", dueDate: "tomorrow" });
    assert.ok(task.dueDate);
  });

  test("list filters by status", async () => {
    const ctx = makeCtx();
    seedTask(ctx.db, { id: "t1", clientId: "tenant_a", title: "a", status: "pending" });
    seedTask(ctx.db, { id: "t2", clientId: "tenant_a", title: "b", status: "done" });
    const tasks = await listTasks(ctx, { status: "pending" });
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].title, "a");
  });

  test("list status='open' = pending + in_progress", async () => {
    const ctx = makeCtx();
    seedTask(ctx.db, { id: "t1", clientId: "tenant_a", title: "a", status: "pending" });
    seedTask(ctx.db, { id: "t2", clientId: "tenant_a", title: "b", status: "in_progress" });
    seedTask(ctx.db, { id: "t3", clientId: "tenant_a", title: "c", status: "done" });
    const tasks = await listTasks(ctx, { status: "open" });
    assert.equal(tasks.length, 2);
  });

  test("staff list excludes other users' private tasks", async () => {
    const ctx = makeCtx("tenant_a", "staff@a.com", "staff");
    seedTask(ctx.db, {
      id: "private-owner",
      clientId: "tenant_a",
      title: "Owner's private task",
      createdBy: "owner@a.com",
      shared: false,
    });
    seedTask(ctx.db, {
      id: "shared",
      clientId: "tenant_a",
      title: "Shared task",
      createdBy: "owner@a.com",
      shared: true,
    });
    seedTask(ctx.db, {
      id: "mine",
      clientId: "tenant_a",
      title: "My own task",
      createdBy: "staff@a.com",
      shared: false,
    });
    const tasks = await listTasks(ctx);
    const titles = tasks.map((t) => t.title).sort();
    assert.deepEqual(titles, ["My own task", "Shared task"]);
  });

  test("owner sees everything", async () => {
    const ctx = makeCtx("tenant_a", "owner@a.com", "owner");
    seedTask(ctx.db, {
      id: "p1",
      clientId: "tenant_a",
      title: "Anybody's private",
      createdBy: "other@a.com",
      shared: false,
    });
    seedTask(ctx.db, {
      id: "p2",
      clientId: "tenant_a",
      title: "Yet another",
      createdBy: "staff@a.com",
      shared: false,
    });
    const tasks = await listTasks(ctx);
    assert.equal(tasks.length, 2);
  });

  test("cross-tenant tasks are invisible", async () => {
    const ctx = makeCtx("tenant_a", "owner@a.com", "owner");
    seedTask(ctx.db, { id: "ours", clientId: "tenant_a", title: "Ours" });
    seedTask(ctx.db, { id: "theirs", clientId: "tenant_b", title: "Theirs" });
    const tasks = await listTasks(ctx);
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].title, "Ours");
  });
});

// ─── getTask cross-tenant ──────────────────────────────────────────────────

describe("getTask cross-tenant", () => {
  test("403 when reading a task from another tenant", async () => {
    const ctx = makeCtx("tenant_a", "owner@a.com", "owner");
    seedTask(ctx.db, { id: "t-other", clientId: "tenant_b", title: "Other tenant" });
    await assert.rejects(
      () => getTask(ctx, "t-other"),
      (err: unknown) => err instanceof TaskValidationError && err.status === 403,
    );
  });
});

// ─── updateTask / deleteTask permissions ───────────────────────────────────

describe("updateTask permissions", () => {
  test("creator (staff) can change anything", async () => {
    const ctx = makeCtx("tenant_a", "me@a.com", "staff");
    seedTask(ctx.db, { id: "t1", clientId: "tenant_a", title: "x", createdBy: "me@a.com" });
    const next = await updateTask(ctx, "t1", { title: "renamed" });
    assert.equal(next.title, "renamed");
  });

  test("assignee can only change status", async () => {
    const ctx = makeCtx("tenant_a", "assignee@a.com", "staff");
    seedTask(ctx.db, {
      id: "t1",
      clientId: "tenant_a",
      title: "x",
      createdBy: "other@a.com",
      assignedTo: "assignee@a.com",
      shared: true,
    });
    const next = await updateTask(ctx, "t1", { status: "done" });
    assert.equal(next.status, "done");
    assert.ok(next.completedAt);
    // Trying to also change title should be rejected.
    await assert.rejects(
      () => updateTask(ctx, "t1", { title: "new", status: "done" }),
      TaskValidationError,
    );
  });

  test("uninvolved staff cannot edit at all", async () => {
    const ctx = makeCtx("tenant_a", "bystander@a.com", "staff");
    seedTask(ctx.db, {
      id: "t1",
      clientId: "tenant_a",
      title: "x",
      createdBy: "other@a.com",
      shared: true,
    });
    await assert.rejects(
      () => updateTask(ctx, "t1", { status: "done" }),
      (err: unknown) => err instanceof TaskValidationError && err.status === 403,
    );
  });
});

describe("deleteTask permissions", () => {
  test("creator can delete", async () => {
    const ctx = makeCtx("tenant_a", "me@a.com", "staff");
    seedTask(ctx.db, { id: "t1", clientId: "tenant_a", title: "x", createdBy: "me@a.com" });
    await deleteTask(ctx, "t1");
    assert.equal((ctx.db as any).collection("tasks").docs.size, 0);
  });

  test("non-creator non-owner cannot delete (manager-level included)", async () => {
    const ctx = makeCtx("tenant_a", "mgr@a.com", "manager");
    seedTask(ctx.db, { id: "t1", clientId: "tenant_a", title: "x", createdBy: "other@a.com" });
    await assert.rejects(
      () => deleteTask(ctx, "t1"),
      (err: unknown) => err instanceof TaskValidationError && err.status === 403,
    );
  });

  test("cross-tenant delete is 403", async () => {
    const ctx = makeCtx("tenant_a", "owner@a.com", "owner");
    seedTask(ctx.db, { id: "t1", clientId: "tenant_b", title: "x", createdBy: "owner@a.com" });
    await assert.rejects(
      () => deleteTask(ctx, "t1"),
      (err: unknown) => err instanceof TaskValidationError && err.status === 403,
    );
  });
});

// ─── completeTaskByQuery ───────────────────────────────────────────────────

describe("completeTaskByQuery", () => {
  test("by taskId marks done", async () => {
    const ctx = makeCtx("tenant_a", "owner@a.com", "owner");
    seedTask(ctx.db, { id: "t1", clientId: "tenant_a", title: "x", status: "pending" });
    const out = await completeTaskByQuery(ctx, { taskId: "t1" });
    assert.equal(out.kind, "completed");
    if (out.kind === "completed") assert.equal(out.task.status, "done");
  });

  test("unique title fragment marks done", async () => {
    const ctx = makeCtx("tenant_a", "owner@a.com", "owner");
    seedTask(ctx.db, { id: "t1", clientId: "tenant_a", title: "Limpiar local", status: "pending" });
    seedTask(ctx.db, { id: "t2", clientId: "tenant_a", title: "Buy paint", status: "pending" });
    const out = await completeTaskByQuery(ctx, { titleOrFragment: "limpiar" });
    assert.equal(out.kind, "completed");
    if (out.kind === "completed") assert.equal(out.task.title, "Limpiar local");
  });

  test("ambiguous title fragment returns matches list", async () => {
    const ctx = makeCtx("tenant_a", "owner@a.com", "owner");
    seedTask(ctx.db, { id: "t1", clientId: "tenant_a", title: "Limpiar local", status: "pending" });
    seedTask(ctx.db, { id: "t2", clientId: "tenant_a", title: "Limpiar baños", status: "pending" });
    const out = await completeTaskByQuery(ctx, { titleOrFragment: "limpiar" });
    assert.equal(out.kind, "ambiguous");
    if (out.kind === "ambiguous") assert.equal(out.matches.length, 2);
  });

  test("no match returns not_found", async () => {
    const ctx = makeCtx("tenant_a", "owner@a.com", "owner");
    seedTask(ctx.db, { id: "t1", clientId: "tenant_a", title: "Buy paint", status: "pending" });
    const out = await completeTaskByQuery(ctx, { titleOrFragment: "absolutely-nothing-like-this" });
    assert.equal(out.kind, "not_found");
  });
});
