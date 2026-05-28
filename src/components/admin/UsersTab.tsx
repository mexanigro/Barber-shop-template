import React from "react";
import {
  Users as UsersIcon,
  UserPlus,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  ShieldCheck,
  Shield,
  User as UserIcon,
} from "lucide-react";
import { auth as firebaseAuth } from "../../lib/firebase";
import { localeConfig } from "../../config/locale";
import { TOUR_CONFIG } from "../../config/tour.config";
import { cn } from "../../lib/utils";
import {
  ADMIN_ROLES,
  canAssignRole,
  canChangeRole,
  canRemoveRole,
  type AdminRole,
  type AdminUserStatus,
} from "../../lib/admin-users";

type ListedUser = {
  email: string;
  role: AdminRole;
  invitedBy: string;
  invitedAt: string | null;
  acceptedAt: string | null;
  status: AdminUserStatus;
};

type ListResponse = {
  users: ListedUser[];
  callerRole: AdminRole;
  callerEmail: string;
};

const DEMO_USERS: ListedUser[] = [
  {
    email: "demo-owner@arzac.studio",
    role: "owner",
    invitedBy: "system",
    invitedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
    acceptedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
    status: "active",
  },
  {
    email: "demo-manager@arzac.studio",
    role: "manager",
    invitedBy: "demo-owner@arzac.studio",
    invitedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    acceptedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 13).toISOString(),
    status: "active",
  },
  {
    email: "demo-staff@arzac.studio",
    role: "staff",
    invitedBy: "demo-manager@arzac.studio",
    invitedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    acceptedAt: null,
    status: "pending",
  },
];

async function getAdminAuthHeader(): Promise<Record<string, string>> {
  try {
    const user = firebaseAuth?.currentUser;
    if (!user) return {};
    const token = await user.getIdToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return "—";
  }
}

function RoleChip({
  role,
  t,
}: {
  role: AdminRole;
  t: typeof localeConfig.admin.users;
}) {
  const Icon = role === "owner" ? ShieldCheck : role === "manager" ? Shield : UserIcon;
  const cls =
    role === "owner"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
      : role === "manager"
        ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
        : "border-border bg-muted/60 text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest",
        cls,
      )}
      title={t.roleHelp[role]}
    >
      <Icon size={11} />
      {t.roles[role]}
    </span>
  );
}

function StatusBadge({
  status,
  t,
}: {
  status: AdminUserStatus;
  t: typeof localeConfig.admin.users;
}) {
  const label = status === "active" ? t.active : status === "pending" ? t.pending : t.removed;
  const cls =
    status === "active"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : status === "pending"
        ? "border-accent-light/30 bg-accent-light/10 text-accent-light"
        : "border-red-500/30 bg-red-500/10 text-red-500";
  return (
    <span
      className={cn(
        "rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest",
        cls,
      )}
    >
      {label}
    </span>
  );
}

export function UsersTab() {
  const t = localeConfig.admin.users;
  const [users, setUsers] = React.useState<ListedUser[]>([]);
  const [callerRole, setCallerRole] = React.useState<AdminRole>("staff");
  const [callerEmail, setCallerEmail] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);
  const [banner, setBanner] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<AdminRole>("staff");
  const [inviteSaving, setInviteSaving] = React.useState(false);

  const [removeTarget, setRemoveTarget] = React.useState<ListedUser | null>(null);
  const [removeSaving, setRemoveSaving] = React.useState(false);

  const [roleEditing, setRoleEditing] = React.useState<string | null>(null);
  const [roleDraft, setRoleDraft] = React.useState<AdminRole>("staff");
  const [roleSaving, setRoleSaving] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (TOUR_CONFIG.isDemoMode) {
      setUsers(DEMO_USERS);
      setCallerRole("owner");
      setCallerEmail("demo-owner@arzac.studio");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const headers = await getAdminAuthHeader();
      const res = await fetch("/api/admin/users", { headers });
      if (!res.ok) {
        setBanner({ tone: "error", text: t.loadError });
        return;
      }
      const data = (await res.json()) as ListResponse;
      setUsers(data.users ?? []);
      setCallerRole(data.callerRole ?? "staff");
      setCallerEmail((data.callerEmail ?? "").toLowerCase());
    } catch {
      setBanner({ tone: "error", text: t.loadError });
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const canInvite = callerRole === "owner" || callerRole === "manager";

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    if (TOUR_CONFIG.isDemoMode) {
      setUsers((prev) => [
        ...prev,
        {
          email,
          role: inviteRole,
          invitedBy: callerEmail,
          invitedAt: new Date().toISOString(),
          acceptedAt: null,
          status: "pending",
        },
      ]);
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("staff");
      setBanner({ tone: "ok", text: t.inviteSuccess });
      return;
    }
    setInviteSaving(true);
    try {
      const headers = await getAdminAuthHeader();
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({ error: t.mutateError }));
        setBanner({ tone: "error", text: detail.error ?? t.mutateError });
        return;
      }
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("staff");
      setBanner({ tone: "ok", text: t.inviteSuccess });
      await refresh();
    } catch {
      setBanner({ tone: "error", text: t.mutateError });
    } finally {
      setInviteSaving(false);
    }
  };

  const handleRoleSave = async (target: ListedUser) => {
    if (roleDraft === target.role) {
      setRoleEditing(null);
      return;
    }
    if (TOUR_CONFIG.isDemoMode) {
      setUsers((prev) =>
        prev.map((u) => (u.email === target.email ? { ...u, role: roleDraft } : u)),
      );
      setRoleEditing(null);
      return;
    }
    setRoleSaving(true);
    try {
      const headers = await getAdminAuthHeader();
      const res = await fetch(`/api/admin/users/${encodeURIComponent(target.email)}/role`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ role: roleDraft }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({ error: t.mutateError }));
        setBanner({ tone: "error", text: detail.error ?? t.mutateError });
        return;
      }
      setRoleEditing(null);
      await refresh();
    } catch {
      setBanner({ tone: "error", text: t.mutateError });
    } finally {
      setRoleSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    if (TOUR_CONFIG.isDemoMode) {
      setUsers((prev) => prev.filter((u) => u.email !== removeTarget.email));
      setRemoveTarget(null);
      return;
    }
    setRemoveSaving(true);
    try {
      const headers = await getAdminAuthHeader();
      const res = await fetch(`/api/admin/users/${encodeURIComponent(removeTarget.email)}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({ error: t.mutateError }));
        setBanner({ tone: "error", text: detail.error ?? t.mutateError });
        return;
      }
      setRemoveTarget(null);
      await refresh();
    } catch {
      setBanner({ tone: "error", text: t.mutateError });
    } finally {
      setRemoveSaving(false);
    }
  };

  const assignableRoles = ADMIN_ROLES.filter((r) => canAssignRole(callerRole, r));
  const isEmpty = !loading && users.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <UsersIcon size={16} className="text-accent-light" />
            <h3 className="text-base font-black uppercase tracking-tight text-foreground">{t.title}</h3>
          </div>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {t.subtitle}
          </p>
        </div>
        {canInvite && (
          <button
            type="button"
            onClick={() => {
              setInviteOpen(true);
              setInviteRole(callerRole === "manager" ? "staff" : "staff");
              setBanner(null);
            }}
            className="flex h-11 items-center gap-2 self-start rounded-xl border border-accent-light/30 bg-accent-light/10 px-4 text-[11px] font-black uppercase tracking-widest text-accent-light transition-all hover:bg-accent-light/20 active:scale-[0.97]"
          >
            <UserPlus size={14} />
            {t.invite}
          </button>
        )}
      </div>

      {banner && (
        <div
          className={cn(
            "flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm",
            banner.tone === "ok"
              ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
              : "border-red-500/20 bg-red-500/5 text-red-500",
          )}
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={14} />
            <span className="text-[12px] font-bold">{banner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="rounded-md p-1 hover:bg-foreground/5"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Invite modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => !inviteSaving && setInviteOpen(false)}>
          <div
            className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-5 shadow-elevated"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black uppercase tracking-tight text-foreground">{t.invite}</h4>
                <p className="mt-1 text-[10px] text-muted-foreground">{t.inviteHint}</p>
              </div>
              <button type="button" onClick={() => setInviteOpen(false)} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
                <X size={14} />
              </button>
            </div>
            <input
              type="email"
              autoFocus
              placeholder={t.invitePlaceholder}
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/40"
            />
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.roleLabel}</label>
              <div className="grid grid-cols-3 gap-2">
                {assignableRoles.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setInviteRole(r)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all",
                      inviteRole === r
                        ? "border-accent-light bg-accent-light/15 text-accent-light"
                        : "border-border bg-muted/60 text-muted-foreground hover:border-accent-light/30",
                    )}
                  >
                    {t.roles[r]}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">{t.roleHelp[inviteRole]}</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                disabled={inviteSaving}
                className="h-11 rounded-xl border border-border bg-muted/60 px-4 text-[11px] font-black uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              >
                {t.inviteCancel}
              </button>
              <button
                type="button"
                onClick={() => void handleInvite()}
                disabled={inviteSaving || !inviteEmail.trim()}
                className="flex h-11 items-center gap-2 rounded-xl bg-accent-light px-5 text-[11px] font-black uppercase tracking-widest text-zinc-950 transition-all hover:bg-accent-light/80 disabled:opacity-40 active:scale-[0.97]"
              >
                {inviteSaving && <Loader2 size={12} className="animate-spin" />}
                {inviteSaving ? t.inviteSaving : t.inviteSubmit}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove confirm modal */}
      {removeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => !removeSaving && setRemoveTarget(null)}>
          <div
            className="w-full max-w-sm space-y-4 rounded-2xl border border-red-500/30 bg-card p-5 shadow-elevated"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-red-500" />
              <h4 className="text-sm font-black uppercase tracking-tight text-foreground">{t.removeConfirmTitle}</h4>
            </div>
            <p className="text-sm text-muted-foreground">{t.removeConfirmBody}</p>
            <div className="rounded-xl border border-border bg-muted/40 px-3 py-2">
              <p className="text-sm font-bold text-foreground">{removeTarget.email}</p>
              <div className="mt-1">
                <RoleChip role={removeTarget.role} t={t} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                disabled={removeSaving}
                className="h-11 rounded-xl border border-border bg-muted/60 px-4 text-[11px] font-black uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              >
                {t.removeCancel}
              </button>
              <button
                type="button"
                onClick={() => void handleRemove()}
                disabled={removeSaving}
                className="flex h-11 items-center gap-2 rounded-xl bg-red-500 px-5 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:bg-red-600 disabled:opacity-40 active:scale-[0.97]"
              >
                {removeSaving && <Loader2 size={12} className="animate-spin" />}
                <Trash2 size={12} />
                {t.removeConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 size={14} className="animate-spin" />
          <span className="text-[11px] font-bold uppercase tracking-widest">{t.loading}</span>
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border py-16 text-center">
          <UsersIcon size={28} className="text-muted-foreground/30" />
          <p className="max-w-xs text-sm text-muted-foreground">
            {callerRole === "owner" ? t.emptyOwnerOnly : t.empty}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card/95">
          <div className="hidden grid-cols-[2fr_1fr_1fr_1.2fr_auto] gap-3 border-b border-border bg-muted/40 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground lg:grid">
            <span>{t.title}</span>
            <span>{t.roleLabel}</span>
            <span>Status</span>
            <span>{t.invitedBy}</span>
            <span className="text-right">—</span>
          </div>
          <ul className="divide-y divide-border">
            {users.map((u) => {
              const isSelf = u.email === callerEmail;
              const editing = roleEditing === u.email;
              const allowRoleEdit = canChangeRole(callerRole) && !isSelf;
              const allowRemove =
                !isSelf &&
                canRemoveRole(callerRole, u.role) &&
                (callerRole === "owner" || u.invitedBy === callerEmail);

              return (
                <li
                  key={u.email}
                  className="grid grid-cols-1 gap-3 px-5 py-4 lg:grid-cols-[2fr_1fr_1fr_1.2fr_auto] lg:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{u.email}</p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {isSelf ? t.callerIsYou : `${t.invitedAt}: ${fmtDate(u.invitedAt)}`}
                    </p>
                  </div>

                  <div>
                    {editing ? (
                      <select
                        value={roleDraft}
                        onChange={(e) => setRoleDraft(e.target.value as AdminRole)}
                        className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs font-bold text-foreground"
                      >
                        {ADMIN_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {t.roles[r]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <RoleChip role={u.role} t={t} />
                    )}
                  </div>

                  <div>
                    <StatusBadge status={u.status} t={t} />
                  </div>

                  <div className="text-[11px] text-muted-foreground">
                    <p className="truncate">{u.invitedBy || "—"}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {editing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setRoleEditing(null)}
                          disabled={roleSaving}
                          className="h-9 rounded-lg border border-border bg-muted/60 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground disabled:opacity-40"
                        >
                          {t.inviteCancel}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRoleSave(u)}
                          disabled={roleSaving}
                          className="flex h-9 items-center gap-1 rounded-lg bg-accent-light px-3 text-[10px] font-black uppercase tracking-widest text-zinc-950 hover:bg-accent-light/80 disabled:opacity-40"
                        >
                          {roleSaving && <Loader2 size={10} className="animate-spin" />}
                          {t.saveRole}
                        </button>
                      </>
                    ) : (
                      <>
                        {allowRoleEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setRoleEditing(u.email);
                              setRoleDraft(u.role);
                            }}
                            className="h-9 rounded-lg border border-border bg-muted/60 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:border-accent-light/30 hover:text-accent-light"
                          >
                            {t.roleChange}
                          </button>
                        )}
                        {allowRemove && (
                          <button
                            type="button"
                            onClick={() => setRemoveTarget(u)}
                            className="flex h-9 items-center gap-1 rounded-lg border border-border bg-muted/60 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:border-red-500/40 hover:text-red-500"
                          >
                            <Trash2 size={11} />
                            {t.remove}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
