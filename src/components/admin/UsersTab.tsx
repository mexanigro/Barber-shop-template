import React from "react";
import {
  Users as UsersIcon,
  UserPlus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
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
    return new Date(iso).toLocaleDateString("he-IL");
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
  // D-14c: el alta y el cambio de rol responden con `claimsSynced`, y hasta ahora
  // nadie lo miraba: la invitación se mostraba correcta aunque el permiso de
  // lectura por SDK cliente no se hubiera propagado. El tono "warn" existe para eso.
  const [banner, setBanner] = React.useState<{ tone: "ok" | "warn" | "error"; text: React.ReactNode } | null>(null);

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
        const detail = await res.json().catch(() => ({}));
        setBanner({ tone: "error", text: errorEnHebreo(res.status, detail.error) });
        return;
      }
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("staff");
      const body = await res.json().catch(() => ({}));
      // CRM-03 (D-305): el mail lo manda la web; si no salió (sin clave de email), el link para mandarlo a mano. Los permisos se
      // completan solos en la primera entrada (GET /api/admin/me): ya no hace falta «guardar el rol otra vez».
      setBanner(
        body.invitationEmail === "sent"
          ? { tone: "ok", text: <>שלחנו הזמנה במייל אל <bdi dir="ltr">{email}</bdi>, עם קישור לכניסה. נכנסים עם חשבון הגוגל של הכתובת הזאת.</> }
          : { tone: "warn", text: <>ההזמנה נשמרה, אבל המייל לא יצא. שלחי את הקישור <bdi dir="ltr" className="font-semibold">{window.location.origin}/admin</bdi> אל <bdi dir="ltr">{email}</bdi>. נכנסים עם חשבון הגוגל של הכתובת הזאת.</> },
      );
      await refresh();
    } catch {
      setBanner({ tone: "error", text: t.mutateError });
    } finally {
      setInviteSaving(false);
    }
  };

  /** Los errores del servidor vienen en inglés: a la dueña, en hebreo y con qué hacer. */
  const errorEnHebreo = (status: number, error?: string) => {
    if (status === 409) return /another business/i.test(error ?? "") ? "הכתובת הזאת כבר מנהלת עסק אחר. אפשר להזמין כתובת אחרת." : "הכתובת הזאת כבר ברשימה.";
    if (status === 400) return "כתובת המייל לא נראית תקינה. בדקי אותה ונסי שוב.";
    if (status === 403) return "אין לך הרשאה לתת את התפקיד הזה.";
    return t.mutateError;
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
        const detail = await res.json().catch(() => ({}));
        setBanner({ tone: "error", text: errorEnHebreo(res.status, detail.error) });
        return;
      }
      setRoleEditing(null);
      const body = await res.json().catch(() => ({}));
      if (body.claimsSynced === false) setBanner({ tone: "warn", text: t.claimPendingRole });
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
        const detail = await res.json().catch(() => ({}));
        setBanner({ tone: "error", text: errorEnHebreo(res.status, detail.error) });
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

  // CRM-03 diseño: lo que ve cada rol, en palabras de la dueña (D-305).
  const QUE_VE: Record<AdminRole, string> = {
    owner: "הכל, כמוך: תשלומים, משתמשים והגדרות. לשותפה או למי שמחליפה אותך.",
    manager: "הכל חוץ מניהול בעלים. יכולה להזמין עובדות.",
    staff: "תורים, לקוחות, משימות, מלאי ותיבת הדואר. בלי תשלומים ובלי הגדרות.",
  };
  // En el selector de invitación la dueña elige «otra dueña»; en la lista, cada fila dice lo que es.
  const NOMBRE: Record<AdminRole, string> = { owner: "בעלים נוספת", manager: "מנהלת", staff: "עובדת" };
  const NOMBRE_FILA: Record<AdminRole, string> = { owner: "בעלים", manager: "מנהלת", staff: "עובדת" };
  const QUE_VE_FILA: Record<AdminRole, string> = { ...QUE_VE, owner: "הכל: תשלומים, משתמשים והגדרות." };
  const boton = "flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium";
  const quien = (v: string) => (!v || v === "system" ? "" : v);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">מי יכול להיכנס לניהול העסק, ומה כל אחת רואה.</p>
        {canInvite && (
          <button type="button" onClick={() => { setInviteOpen(true); setInviteRole("staff"); setBanner(null); }} className={cn(boton, "bg-primary font-semibold text-primary-foreground")}>
            <UserPlus size={18} aria-hidden />הזמנה לצוות
          </button>
        )}
      </div>

      {banner && (
        <div role={banner.tone === "error" ? "alert" : "status"} className={cn("flex items-start justify-between gap-3 rounded-xl border px-4 py-3",
          banner.tone === "ok" ? "border-emerald-600/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200" : banner.tone === "warn" ? "border-amber-600/40 bg-amber-500/10 text-amber-900 dark:text-amber-200" : "border-red-600/30 bg-red-500/10 text-red-900 dark:text-red-200")}>
          <p className="flex items-start gap-2 text-sm">{banner.tone === "ok" ? <CheckCircle2 size={18} aria-hidden className="mt-0.5 shrink-0" /> : <AlertCircle size={18} aria-hidden className="mt-0.5 shrink-0" />}<span className="min-w-0">{banner.text}</span></p>
          <button type="button" aria-label="סגירה" onClick={() => setBanner(null)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-foreground/5"><X size={18} aria-hidden /></button>
        </div>
      )}

      {inviteOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center" onClick={() => !inviteSaving && setInviteOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="crm03-invitar" onClick={(e) => e.stopPropagation()} className="w-full max-w-md space-y-4 rounded-t-3xl border border-border bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:pb-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="crm03-invitar" className="text-lg font-bold text-foreground">הזמנה לצוות</h2>
                <p className="mt-1 text-sm text-muted-foreground">תישלח הזמנה במייל. עד שתיכנס בפעם הראשונה תופיע כ״ממתינה״.</p>
              </div>
              <button type="button" aria-label="סגירה" onClick={() => setInviteOpen(false)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"><X size={20} aria-hidden /></button>
            </div>
            <div>
              <label htmlFor="crm03-invitar-email" className="mb-1.5 block text-sm font-medium text-foreground">אימייל של גוגל</label>
              <input id="crm03-invitar-email" type="email" inputMode="email" autoComplete="off" autoFocus dir="ltr" placeholder={t.invitePlaceholder} value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                className="h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" />
              <p className="mt-1 text-xs text-muted-foreground">הכניסה היא עם החשבון של גוגל של המייל הזה.</p>
            </div>
            <fieldset className="space-y-2">
              <legend className="mb-1.5 text-sm font-medium text-foreground">{t.roleLabel}</legend>
              {[...assignableRoles].sort((a, b) => (a === "owner" ? 1 : b === "owner" ? -1 : 0)).map((r) => (
                <label key={r} className={cn("flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3", inviteRole === r ? "border-primary bg-primary/5" : "border-border")}>
                  <input type="radio" name="crm03-rol" value={r} checked={inviteRole === r} onChange={() => setInviteRole(r)} className="mt-1 h-5 w-5 accent-[var(--color-primary)]" />
                  <span><span className="block text-base font-semibold text-foreground">{NOMBRE[r]}</span><span className="block text-sm text-muted-foreground">רואה: {QUE_VE[r]}</span></span>
                </label>
              ))}
            </fieldset>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setInviteOpen(false)} disabled={inviteSaving} className={cn(boton, "border border-border text-foreground hover:bg-muted")}>{t.inviteCancel}</button>
              <button type="button" onClick={() => void handleInvite()} disabled={inviteSaving || !inviteEmail.trim()} className={cn(boton, "bg-primary font-semibold text-primary-foreground disabled:opacity-50")}>
                {inviteSaving && <Loader2 size={16} className="animate-spin" aria-hidden />}{inviteSaving ? t.inviteSaving : t.inviteSubmit}
              </button>
            </div>
          </div>
        </div>
      )}

      {removeTarget && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center" onClick={() => !removeSaving && setRemoveTarget(null)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="crm03-quitar" aria-describedby="crm03-quitar-d" onClick={(e) => e.stopPropagation()} className="w-full max-w-sm space-y-4 rounded-t-3xl border border-border bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:pb-5">
            <h2 id="crm03-quitar" className="text-lg font-bold text-foreground">{t.removeConfirmTitle}</h2>
            <p id="crm03-quitar-d" className="text-sm text-muted-foreground"><span dir="ltr" className="font-semibold text-foreground">{removeTarget.email}</span> לא תוכל להיכנס יותר. אפשר להזמין שוב בכל זמן.</p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" autoFocus onClick={() => setRemoveTarget(null)} disabled={removeSaving} className={cn(boton, "border border-border text-foreground hover:bg-muted")}>{t.removeCancel}</button>
              <button type="button" onClick={() => void handleRemove()} disabled={removeSaving} className={cn(boton, "bg-red-700 font-semibold text-white hover:bg-red-800 disabled:opacity-50")}>
                {removeSaving ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Trash2 size={16} aria-hidden />}{t.removeConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 size={18} className="animate-spin" aria-hidden />{t.loading}</p>
      ) : isEmpty ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <UsersIcon size={28} aria-hidden className="mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">רק את נכנסת כרגע. אפשר להזמין עובדת או מנהלת.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {users.map((u) => {
            const isSelf = u.email === callerEmail;
            const editing = roleEditing === u.email;
            const allowRoleEdit = canChangeRole(callerRole) && !isSelf && u.role !== "owner";
            const allowRemove = !isSelf && u.role !== "owner" && canRemoveRole(callerRole, u.role) && (callerRole === "owner" || u.invitedBy === callerEmail);
            const por = quien(u.invitedBy);
            return (
              <li key={u.email} className="space-y-3 px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p dir="ltr" className="truncate text-end text-base font-semibold text-foreground">{u.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {isSelf ? "זו את" : u.status === "pending" ? `הוזמנה ${fmtDate(u.invitedAt)}${por ? ` · על ידי ${por}` : ""}` : `${t.invitedAt} ${fmtDate(u.invitedAt)}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground">{NOMBRE_FILA[u.role]}</span>
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", u.status === "active" ? "bg-emerald-600/10 text-emerald-800 dark:text-emerald-300" : u.status === "pending" ? "bg-amber-500/15 text-amber-900 dark:text-amber-200" : "bg-red-600/10 text-red-800 dark:text-red-300")}>
                      {u.status === "active" ? "פעילה" : u.status === "pending" ? "ממתינה לכניסה" : "הוסרה"}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">רואה: {QUE_VE_FILA[u.role]}</p>
                {editing ? (
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[10rem] flex-1">
                      <label htmlFor={`rol-${u.email}`} className="mb-1.5 block text-sm font-medium text-foreground">{t.roleLabel}</label>
                      <select id={`rol-${u.email}`} value={roleDraft} onChange={(e) => setRoleDraft(e.target.value as AdminRole)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground">
                        {ADMIN_ROLES.filter((r) => canAssignRole(callerRole, r)).map((r) => <option key={r} value={r}>{NOMBRE[r]}</option>)}
                      </select>
                    </div>
                    <button type="button" onClick={() => setRoleEditing(null)} disabled={roleSaving} className={cn(boton, "border border-border text-foreground hover:bg-muted")}>{t.inviteCancel}</button>
                    <button type="button" onClick={() => void handleRoleSave(u)} disabled={roleSaving} className={cn(boton, "bg-primary font-semibold text-primary-foreground disabled:opacity-50")}>{roleSaving && <Loader2 size={16} className="animate-spin" aria-hidden />}{t.saveRole}</button>
                  </div>
                ) : (allowRoleEdit || allowRemove) && (
                  <div className="flex flex-wrap gap-2">
                    {allowRoleEdit && <button type="button" onClick={() => { setRoleEditing(u.email); setRoleDraft(u.role); }} className={cn(boton, "border border-border text-foreground hover:bg-muted")}>{t.roleChange}</button>}
                    {allowRemove && <button type="button" onClick={() => setRemoveTarget(u)} className={cn(boton, "border border-border text-red-800 hover:bg-red-500/10 dark:text-red-300")}><Trash2 size={16} aria-hidden />{t.remove}</button>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
