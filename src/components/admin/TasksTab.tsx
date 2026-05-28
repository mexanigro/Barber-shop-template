import React from "react";
import {
  CheckSquare,
  Plus,
  Loader2,
  X,
  AlertCircle,
  Search,
  Trash2,
  Tag as TagIcon,
  Flag,
  CalendarDays,
  User as UserIcon,
  Users as UsersIcon,
  Eye,
  EyeOff,
} from "lucide-react";
import { auth as firebaseAuth } from "../../lib/firebase";
import { localeConfig } from "../../config/locale";
import { TOUR_CONFIG } from "../../config/tour.config";
import { DEMO_TASKS, DEMO_CUSTOMERS } from "../../config/demo-data";
import { cn } from "../../lib/utils";
import { useModalA11y } from "../../hooks/useModalA11y";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "../../lib/tasks";
import type { AdminRole } from "../../lib/admin-users";

type Filter = "mine" | "team" | "all";

type ListResponse = { tasks: Task[]; total: number };

async function authHeader(): Promise<Record<string, string>> {
  try {
    const user = firebaseAuth?.currentUser;
    if (!user) return {};
    const token = await user.getIdToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

function priorityClasses(p: TaskPriority): string {
  if (p === "high") return "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400";
  if (p === "medium")
    return "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400";
  return "border-border bg-muted/60 text-muted-foreground";
}

function relativeDue(iso: string | undefined, t: typeof localeConfig.admin.tasks): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return t.due.today;
  if (diff === 1) return t.due.tomorrow;
  if (diff < 0) return `${Math.abs(diff)}d ${t.due.overdueLabel}`;
  if (diff < 7) return `${diff}d`;
  return d.toISOString().slice(0, 10);
}

function initialsOf(email: string | undefined): string {
  if (!email) return "·";
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (local.slice(0, 2) || "·").toUpperCase();
}

export function TasksTab({
  currentRole = "owner",
  currentEmail = "",
}: {
  currentRole?: AdminRole;
  currentEmail?: string;
}) {
  const t = localeConfig.admin.tasks;
  const isDemoMode = TOUR_CONFIG.isDemoMode;

  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [priorityFilter, setPriorityFilter] = React.useState<TaskPriority | "all">("all");
  const [assigneeFilter, setAssigneeFilter] = React.useState<string>("all");
  const [tagFilter, setTagFilter] = React.useState<string>("all");
  const [ownerFilter, setOwnerFilter] = React.useState<Filter>("all");
  const [showArchived, setShowArchived] = React.useState(false);
  const [showCreate, setShowCreate] = React.useState(false);
  const [detail, setDetail] = React.useState<Task | null>(null);
  const [dragId, setDragId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    if (isDemoMode) {
      setTasks(DEMO_TASKS);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (showArchived) {
        // No status filter — get everything visible.
      } else {
        // Server returns all by default; UI hides archived unless toggled on.
      }
      const headers = await authHeader();
      const res = await fetch(`/api/tasks?${params.toString()}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ListResponse;
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    } catch (err) {
      console.error("[TasksTab] load failed:", err);
      setError(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, showArchived, t.loadError]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // ── Filters + grouping ─────────────────────────────────────────────────────
  const assignees = React.useMemo(() => {
    const set = new Set<string>();
    for (const task of tasks) {
      if (task.assignedTo) set.add(task.assignedTo);
    }
    return Array.from(set).sort();
  }, [tasks]);

  const tags = React.useMemo(() => {
    const set = new Set<string>();
    for (const task of tasks) {
      for (const tag of task.tags ?? []) set.add(tag);
    }
    return Array.from(set).sort();
  }, [tasks]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((task) => {
      if (!showArchived && task.status === "archived") return false;
      if (q && !task.title.toLowerCase().includes(q)) return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      if (assigneeFilter !== "all" && task.assignedTo !== assigneeFilter) return false;
      if (tagFilter !== "all" && !(task.tags ?? []).includes(tagFilter)) return false;
      if (ownerFilter === "mine" && task.createdBy !== currentEmail && task.assignedTo !== currentEmail)
        return false;
      if (ownerFilter === "team" && !task.shared) return false;
      return true;
    });
  }, [
    tasks,
    search,
    priorityFilter,
    assigneeFilter,
    tagFilter,
    ownerFilter,
    showArchived,
    currentEmail,
  ]);

  const byStatus = React.useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      pending: [],
      in_progress: [],
      done: [],
      archived: [],
    };
    for (const task of filtered) map[task.status].push(task);
    return map;
  }, [filtered]);

  const visibleStatuses: TaskStatus[] = showArchived
    ? [...TASK_STATUSES]
    : (["pending", "in_progress", "done"] as TaskStatus[]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const mutateTask = React.useCallback(
    async (taskId: string, patch: Partial<Task>) => {
      if (isDemoMode) {
        setTasks((prev) => prev.map((t0) => (t0.id === taskId ? { ...t0, ...patch } : t0)));
        return;
      }
      try {
        const headers = { "Content-Type": "application/json", ...(await authHeader()) };
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { task: Task };
        setTasks((prev) => prev.map((tt) => (tt.id === taskId ? data.task : tt)));
        setDetail((cur) => (cur && cur.id === taskId ? data.task : cur));
      } catch (err) {
        console.error("[TasksTab] update failed:", err);
        setError(t.mutateError);
      }
    },
    [isDemoMode, t.mutateError],
  );

  const deleteCurrent = React.useCallback(
    async (taskId: string) => {
      if (isDemoMode) {
        setTasks((prev) => prev.filter((tt) => tt.id !== taskId));
        setDetail(null);
        return;
      }
      try {
        const headers = await authHeader();
        const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE", headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setTasks((prev) => prev.filter((tt) => tt.id !== taskId));
        setDetail(null);
      } catch (err) {
        console.error("[TasksTab] delete failed:", err);
        setError(t.mutateError);
      }
    },
    [isDemoMode, t.mutateError],
  );

  // ── Drag-and-drop status change ────────────────────────────────────────────
  const handleDrop = (status: TaskStatus) => (e: React.DragEvent) => {
    e.preventDefault();
    const id = dragId ?? e.dataTransfer.getData("text/plain");
    setDragId(null);
    if (!id) return;
    const task = tasks.find((tt) => tt.id === id);
    if (!task || task.status === status) return;
    void mutateTask(id, { status });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CheckSquare size={18} className="text-accent" />
          <h2 className="text-lg font-bold text-foreground">{t.title}</h2>
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
            {filtered.length}
          </span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-accent/90"
        >
          <Plus size={14} />
          {t.newTask}
        </button>
      </div>

      <p className="text-xs text-muted-foreground">{t.subtitle}</p>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/5 p-3">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={14}
            className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.search}
            className="w-full rounded-lg border border-border bg-card py-2 ps-9 pe-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
          />
        </div>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | "all")}
          className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
        >
          <option value="all">{t.filters.priorityAll}</option>
          {TASK_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {t.priority[p]}
            </option>
          ))}
        </select>
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
        >
          <option value="all">{t.filters.assigneeAll}</option>
          {assignees.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        {tags.length > 0 && (
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
          >
            <option value="all">{t.filters.tagAll}</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        )}
        <div className="flex overflow-hidden rounded-lg border border-border">
          {(["mine", "team", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setOwnerFilter(f)}
              className={cn(
                "px-3 py-2 text-xs font-semibold transition-colors",
                ownerFilter === f
                  ? "bg-accent text-white"
                  : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {t.filters[f]}
            </button>
          ))}
        </div>
        <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="h-3.5 w-3.5 accent-accent"
          />
          {t.filters.showArchived}
        </label>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 size={20} className="me-2 animate-spin" />
          <span className="text-sm">{t.loading}</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <CheckSquare size={32} className="mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">{t.empty}</p>
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-3",
            visibleStatuses.length === 4
              ? "md:grid-cols-2 xl:grid-cols-4"
              : "md:grid-cols-3",
          )}
        >
          {visibleStatuses.map((status) => (
            <div
              key={status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop(status)}
              className="flex flex-col gap-2 rounded-xl border border-border bg-card/50 p-3"
            >
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  {t.columns[status]}
                </h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                  {byStatus[status].length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {byStatus[status].map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    t={t}
                    isMine={task.createdBy === currentEmail}
                    canDrag={
                      currentRole === "owner" ||
                      task.createdBy === currentEmail ||
                      task.assignedTo === currentEmail
                    }
                    onDragStart={() => setDragId(task.id)}
                    onClick={() => setDetail(task)}
                  />
                ))}
                {byStatus[status].length === 0 && (
                  <p className="px-1 py-3 text-[11px] italic text-muted-foreground/60">
                    —
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateTaskModal
          t={t}
          assignees={assignees}
          onClose={() => setShowCreate(false)}
          onCreated={(task) => {
            setTasks((prev) => [task, ...prev]);
            setShowCreate(false);
          }}
          currentEmail={currentEmail}
        />
      )}

      {detail && (
        <DetailPanel
          task={detail}
          t={t}
          canEdit={detail.createdBy === currentEmail || currentRole === "owner"}
          canDelete={detail.createdBy === currentEmail || currentRole === "owner"}
          onClose={() => setDetail(null)}
          onSave={(patch) => mutateTask(detail.id, patch)}
          onDelete={() => deleteCurrent(detail.id)}
        />
      )}
    </div>
  );
}

// ── Card ────────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  t,
  canDrag,
  onDragStart,
  onClick,
}: {
  task: Task;
  t: typeof localeConfig.admin.tasks;
  isMine: boolean;
  canDrag: boolean;
  onDragStart: () => void;
  onClick: () => void;
}) {
  const due = relativeDue(task.dueDate, t);
  return (
    <button
      draggable={canDrag}
      onDragStart={(e) => {
        if (!canDrag) return;
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onClick={onClick}
      className={cn(
        "group flex flex-col gap-1.5 rounded-lg border border-border bg-background p-3 text-start transition-all hover:border-accent/50 hover:shadow-sm",
        canDrag && "cursor-grab active:cursor-grabbing",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-semibold text-foreground">{task.title}</p>
        {task.shared ? (
          <Eye size={12} className="mt-0.5 shrink-0 text-muted-foreground/60" />
        ) : (
          <EyeOff size={12} className="mt-0.5 shrink-0 text-muted-foreground/60" />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-black uppercase tracking-wider",
            priorityClasses(task.priority),
          )}
        >
          <Flag size={9} />
          {t.priority[task.priority]}
        </span>
        {due && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <CalendarDays size={10} />
            {due}
          </span>
        )}
        {task.assignedTo && (
          <span
            title={task.assignedTo}
            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 text-[9px] font-black text-accent"
          >
            {initialsOf(task.assignedTo)}
          </span>
        )}
        {task.tags?.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground"
          >
            <TagIcon size={9} />
            {tag}
          </span>
        ))}
      </div>
    </button>
  );
}

// ── Create modal ────────────────────────────────────────────────────────────

function CreateTaskModal({
  t,
  assignees,
  onClose,
  onCreated,
  currentEmail,
}: {
  t: typeof localeConfig.admin.tasks;
  assignees: string[];
  onClose: () => void;
  onCreated: (task: Task) => void;
  currentEmail: string;
}) {
  const modalRef = useModalA11y(true, onClose);
  const isDemoMode = TOUR_CONFIG.isDemoMode;

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [priority, setPriority] = React.useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = React.useState("");
  const [assignedTo, setAssignedTo] = React.useState<string>("");
  const [shared, setShared] = React.useState(false);
  const [tagInput, setTagInput] = React.useState("");
  const [tagList, setTagList] = React.useState<string[]>([]);
  const [relatedCustomerId, setRelatedCustomerId] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!title.trim()) {
      setErr(t.form.title);
      return;
    }
    setSaving(true);
    try {
      if (isDemoMode) {
        const task: Task = {
          id: `demo-task-${Date.now()}`,
          clientId: "demo",
          title: title.trim(),
          description: description.trim() || undefined,
          status: "pending",
          priority,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          assignedTo: assignedTo || undefined,
          createdBy: currentEmail || "demo@local",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          shared,
          tags: tagList.length > 0 ? tagList : undefined,
          relatedCustomerId: relatedCustomerId || undefined,
        };
        onCreated(task);
        return;
      }
      const headers = { "Content-Type": "application/json", ...(await authHeader()) };
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          dueDate: dueDate || undefined,
          assignedTo: assignedTo || undefined,
          shared,
          tags: tagList.length > 0 ? tagList : undefined,
          relatedCustomerId: relatedCustomerId || undefined,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { task: Task };
      onCreated(data.task);
    } catch (e) {
      console.error("[TasksTab] create failed:", e);
      setErr(t.mutateError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-black text-foreground">{t.newTask}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">{t.form.title}</span>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.form.titlePlaceholder}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">{t.form.description}</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.form.descriptionPlaceholder}
              rows={3}
              className="mt-1 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">{t.form.priority}</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {t.priority[p]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">{t.form.dueDate}</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">{t.form.assignee}</span>
            <input
              list="tasks-assignee-list"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value.trim().toLowerCase())}
              placeholder={t.form.assigneeNone}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
            />
            <datalist id="tasks-assignee-list">
              {assignees.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">{t.form.tags}</span>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1.5">
              {tagList.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs text-foreground"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => setTagList((prev) => prev.filter((x) => x !== tag))}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && tagInput.trim()) {
                    e.preventDefault();
                    const next = tagInput.trim();
                    if (!tagList.includes(next)) setTagList((prev) => [...prev, next]);
                    setTagInput("");
                  }
                }}
                placeholder={t.form.tagsPlaceholder}
                className="min-w-[80px] flex-1 bg-transparent px-1 py-0.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </label>

          <DemoAwareCustomerPicker
            value={relatedCustomerId}
            onChange={setRelatedCustomerId}
            t={t}
          />

          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border bg-muted/30 p-2">
            <input
              type="checkbox"
              checked={shared}
              onChange={(e) => setShared(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-accent"
            />
            <div>
              <p className="text-xs font-semibold text-foreground">{t.form.shared}</p>
              <p className="text-[10px] text-muted-foreground">{t.form.sharedHint}</p>
            </div>
          </label>

          {err && <p className="text-xs text-red-500">{err}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
              {t.form.cancel}
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={saving || !title.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              {saving ? t.form.submitSaving : t.form.submit}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple typeahead — demo mode reads from DEMO_CUSTOMERS, real mode would
// hook into /api/customers but for now we just accept a raw id. Keeping it
// simple keeps the modal lean.
function DemoAwareCustomerPicker({
  value,
  onChange,
  t,
}: {
  value: string;
  onChange: (v: string) => void;
  t: typeof localeConfig.admin.tasks;
}) {
  const isDemoMode = TOUR_CONFIG.isDemoMode;
  const customerOptions = isDemoMode
    ? DEMO_CUSTOMERS.slice(0, 20).map((c) => ({ id: c.id, label: c.fullName }))
    : [];
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{t.form.relatedCustomer}</span>
      {customerOptions.length > 0 ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
        >
          <option value="">—</option>
          {customerOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="customer id"
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
        />
      )}
    </label>
  );
}

// ── Detail panel ────────────────────────────────────────────────────────────

function DetailPanel({
  task,
  t,
  canEdit,
  canDelete,
  onClose,
  onSave,
  onDelete,
}: {
  task: Task;
  t: typeof localeConfig.admin.tasks;
  canEdit: boolean;
  canDelete: boolean;
  onClose: () => void;
  onSave: (patch: Partial<Task>) => void;
  onDelete: () => void;
}) {
  const modalRef = useModalA11y(true, onClose);
  const [notes, setNotes] = React.useState(task.notes ?? "");
  const [pendingDelete, setPendingDelete] = React.useState(false);

  React.useEffect(() => setNotes(task.notes ?? ""), [task.id, task.notes]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/60 p-0 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        className="flex w-full max-w-md flex-col overflow-y-auto border-s border-border bg-card p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <h3 className="text-base font-black text-foreground">{task.title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* Status + priority + due */}
        <div className="mb-3 flex flex-wrap gap-1.5 text-[10px]">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-black uppercase tracking-wider",
              priorityClasses(task.priority),
            )}
          >
            <Flag size={9} />
            {t.priority[task.priority]}
          </span>
          {task.dueDate && (
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-muted-foreground">
              <CalendarDays size={9} />
              {relativeDue(task.dueDate, t)}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-muted-foreground">
            {task.shared ? <UsersIcon size={9} /> : <UserIcon size={9} />}
            {task.shared ? t.filters.team : t.filters.mine}
          </span>
        </div>

        <label className="mb-3 block">
          <span className="text-xs font-semibold text-muted-foreground">{t.status[task.status]}</span>
          <select
            value={task.status}
            onChange={(e) => onSave({ status: e.target.value as TaskStatus })}
            disabled={!canEdit && task.status === "archived"}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none disabled:opacity-60"
          >
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t.status[s]}
              </option>
            ))}
          </select>
        </label>

        {task.description && (
          <p className="mb-3 whitespace-pre-line rounded-lg border border-border bg-muted/30 p-3 text-xs text-foreground">
            {task.description}
          </p>
        )}

        <div className="mb-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <div>
            <p className="font-bold">{t.detail.createdBy}</p>
            <p className="truncate">{task.createdBy}</p>
          </div>
          {task.assignedTo && (
            <div>
              <p className="font-bold">{t.form.assignee}</p>
              <p className="truncate">{task.assignedTo}</p>
            </div>
          )}
          {task.createdAt && (
            <div>
              <p className="font-bold">{t.detail.createdAt}</p>
              <p>{new Date(task.createdAt).toLocaleDateString()}</p>
            </div>
          )}
          {task.completedAt && (
            <div>
              <p className="font-bold">{t.detail.completedAt}</p>
              <p>{new Date(task.completedAt).toLocaleDateString()}</p>
            </div>
          )}
        </div>

        {(task.tags?.length ?? 0) > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {task.tags?.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                <TagIcon size={9} />
                {tag}
              </span>
            ))}
          </div>
        )}

        <label className="mb-3 block">
          <span className="text-xs font-semibold text-muted-foreground">{t.form.notes}</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== (task.notes ?? "") && onSave({ notes })}
            rows={4}
            disabled={!canEdit}
            className="mt-1 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none disabled:opacity-60"
          />
        </label>

        {canDelete && (
          <div className="mt-auto border-t border-border pt-3">
            {pendingDelete ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-red-500">
                  {t.detail.deleteConfirmTitle}
                </p>
                <p className="text-[11px] text-muted-foreground">{t.detail.deleteConfirmBody}</p>
                <div className="flex gap-2">
                  <button
                    onClick={onDelete}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500/90"
                  >
                    <Trash2 size={12} />
                    {t.detail.deleteConfirm}
                  </button>
                  <button
                    onClick={() => setPendingDelete(false)}
                    className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                  >
                    {t.detail.deleteCancel}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setPendingDelete(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:underline"
              >
                <Trash2 size={12} />
                {t.detail.delete}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
