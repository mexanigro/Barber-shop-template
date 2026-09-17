import type { Firestore, Transaction } from '@google-cloud/firestore';
import { randomUUID } from 'node:crypto';
import { contactDb, contactDigest, contactSources, sourceId } from './crm-core-identity';
import { ContactError, type ContactActor, type ContactContext, type ContactMember, type ContactMemberCommand } from './crm-core-types';
import { canAssignRole, canRemoveRole, isAdminRole } from '../admin-users';
import { prepareMemberMoneyRevocation } from '../reg/store';

export function contactMemberId(clientId: string, issuer: string, email: string): string {
  return 'core_' + Buffer.from(JSON.stringify([clientId, issuer, email.trim().toLowerCase()])).toString('base64url');
}
export function contactControlId(ctx: ContactContext): string {
  return 'control_' + ctx.clientId;
}
export async function readContactMember(ctx: ContactContext, actor: ContactActor, tx?: Transaction, db?: Firestore): Promise<ContactMember> {
  if (actor.kind === 'service') throw new ContactError(403, 'contact_membership_required');
  if (actor.issuer !== ctx.issuer || !actor.uid || !actor.email) throw new ContactError(403, 'contact_principal_invalid');
  const authority = db ?? await contactDb(ctx, ctx.canonical);
  const ref = authority.collection('admin_users').doc(contactMemberId(ctx.clientId, actor.issuer, actor.email));
  const snap = tx ? await tx.get(ref) : await ref.get();
  const member = snap.data() as ContactMember | undefined;
  if (!member || member.clientId !== ctx.clientId || member.issuer !== actor.issuer || member.email !== actor.email.trim().toLowerCase() || member.uid !== actor.uid || member.status !== 'active' || !member.epoch || !Number.isInteger(member.revision) || !['owner', 'manager', 'staff'].includes(member.role)) throw new ContactError(403, 'contact_membership_inactive');
  return member;
}
export async function requireContactPartition(ctx: ContactContext, db: Firestore, tx?: Transaction): Promise<void> {
  const ref = db.collection('crm_operations').doc(contactControlId(ctx));
  const snap = tx ? await tx.get(ref) : await ref.get();
  const data = snap.data();
  if (!data || data.clientId !== ctx.clientId || data.authorityId !== ctx.authorityId || data.state !== 'ready' || data.schemaVersion !== 2) throw new ContactError(503, 'contact_partition_unavailable');
}
export function contactAccessId(ctx: ContactContext, member: ContactMember, key: string): string {
  return 'access_' + contactDigest(ctx, 'access', [ctx.clientId, member.issuer, member.uid, member.epoch, key]);
}
export function contactGrantActive(data: Record<string, unknown> | undefined, ctx: ContactContext, member: ContactMember, key: string): boolean {
  return !!data && data.clientId === ctx.clientId && data.issuer === member.issuer && data.uid === member.uid && data.epoch === member.epoch && data.key === key && data.active === true;
}
export function requireContactManager(member: ContactMember): void {
  if (member.role !== 'owner' && member.role !== 'manager') throw new ContactError(403, 'contact_manager_required');
}
/** La autorización del retiro también rige al recuperar su recibo. */
function requireMemberRemoval(caller: ContactMember, target: ContactMember, actor: ContactActor): void {
  if (target.email === actor.email || !canRemoveRole(caller.role, target.role) || caller.role === 'manager' && target.invitedBy !== actor.email) throw new ContactError(403, 'contact_member_remove_forbidden');
}
export function requireContactService(ctx: ContactContext, actor: ContactActor, action: string, entryPoint: string): NonNullable<ContactContext['servicePrincipals']>[number] {
  const principal = actor.kind === 'service'
    ? ctx.servicePrincipals?.find(s => s.issuer === actor.issuer && s.uid === actor.uid && s.operations.includes(action) && s.entryPoints.includes(entryPoint))
    : undefined;
  if (!principal) throw new ContactError(403, 'contact_service_scope');
  return principal;
}

/** Invitación atribuida: todavía no concede acceso y no necesita que exista un usuario Auth. */
export async function contactMembership(ctx: ContactContext, actor: ContactActor): Promise<ContactMember | null> {
  if (actor.kind === 'service' || actor.issuer !== ctx.issuer || !actor.uid || !actor.email) throw new ContactError(403, 'contact_principal_invalid');
  const db = await contactDb(ctx, ctx.canonical); await requireContactPartition(ctx, db);
  const snap = await db.collection('admin_users').doc(contactMemberId(ctx.clientId, actor.issuer, actor.email)).get();
  const member = snap.data() as ContactMember | undefined;
  if (!member || member.clientId !== ctx.clientId || member.issuer !== actor.issuer || member.email !== actor.email.trim().toLowerCase()) return null;
  if (member.uid !== null && member.uid !== actor.uid) throw new ContactError(403, 'contact_principal_changed');
  return member;
}

export async function contactCapabilities(ctx: ContactContext, actor: ContactActor) {
  const member = await contactMembership(ctx, actor);
  if (!member || member.status !== 'active') return { member, create: false };
  const current = await readContactMember(ctx, actor), db = await contactDb(ctx, ctx.canonical);
  const capacity = await db.collection('crm_access').doc(contactAccessId(ctx, current, 'create-contact')).get();
  const final = await readContactMember(ctx, actor);
  if (final.epoch !== current.epoch || final.revision !== current.revision) throw new ContactError(403, 'contact_policy_changed');
  return { member: current, create: current.role !== 'staff' || contactGrantActive(capacity.data(), ctx, current, 'create-contact') };
}

export async function listContactMembers(ctx: ContactContext, actor: ContactActor): Promise<ContactMember[]> {
  const member = await readContactMember(ctx, actor); requireContactManager(member);
  const db = await contactDb(ctx, ctx.canonical); await requireContactPartition(ctx, db);
  const rows = await db.collection('admin_users').where('clientId', '==', ctx.clientId).where('issuer', '==', ctx.issuer).get();
  const result = rows.docs.filter(s => s.id === contactMemberId(ctx.clientId, ctx.issuer, String(s.data().email))).map(s => s.data() as ContactMember);
  const current = await readContactMember(ctx, actor);
  if (current.epoch !== member.epoch || current.revision !== member.revision) throw new ContactError(403, 'contact_policy_changed');
  return result;
}

/** Miembro, historia, recibo y revocación REG se confirman juntos en la autoridad declarada. */
export async function executeContactMembership(ctx: ContactContext, actor: ContactActor, input: ContactMemberCommand): Promise<ContactMember> {
  if (!input || Object.keys(input).some(k => !['operationId', 'action', 'email', 'role', 'expectedRevision', 'reason'].includes(k)) || !/^[a-zA-Z0-9_-]{16,160}$/.test(input.operationId) || !['invite', 'accept', 'role', 'remove'].includes(input.action) || typeof input.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || !Number.isInteger(input.expectedRevision) || input.expectedRevision < 0 || typeof input.reason !== 'string' || !input.reason.trim() || input.reason.length > 500) throw new ContactError(422, 'contact_member_command_invalid');
  if (actor.kind === 'service' || actor.issuer !== ctx.issuer || !actor.uid || !actor.email) throw new ContactError(403, 'contact_principal_invalid');
  const email = input.email.trim().toLowerCase(), reason = input.reason.trim(), normalized = { ...input, email, reason };
  if (input.action === 'invite' || input.action === 'role') { if (!isAdminRole(input.role)) throw new ContactError(422, 'contact_member_role_invalid'); }
  else if (input.role !== undefined) throw new ContactError(422, 'contact_member_role_unexpected');
  if (input.action === 'accept' && email !== actor.email.trim().toLowerCase()) throw new ContactError(403, 'contact_invitation_not_owned');
  const db = await contactDb(ctx, ctx.canonical), epoch = randomUUID(), now = new Date(ctx.now()).toISOString();
  // No se simula un commit distribuido si REG sigue en otra autoridad.
  for (const source of contactSources(ctx)) if (sourceId(source) !== sourceId(ctx.canonical)) {
    const other = await contactDb(ctx, source);
    if ((await other.collection('reg_legacy_fence').doc(ctx.clientId).get()).exists) throw new ContactError(503, 'contact_money_membership_authority_required');
  }
  const ref = db.collection('admin_users').doc(contactMemberId(ctx.clientId, ctx.issuer, email));
  const scope = [ctx.clientId, actor.issuer, actor.uid, input.operationId], opId = 'op_' + contactDigest(ctx, 'operation', scope);
  const opRef = db.collection('crm_operations').doc(opId), fingerprint = contactDigest(ctx, 'membership', normalized);
  return db.runTransaction(async tx => {
    await requireContactPartition(ctx, db, tx);
    const [snap, receipt] = await tx.getAll(ref, opRef), before = snap.data() as ContactMember | undefined;
    const caller = input.action === 'accept' ? null : await readContactMember(ctx, actor, tx, db);
    if (caller) requireContactManager(caller);
    if (receipt.exists) {
      if (receipt.data()?.fingerprint !== fingerprint) throw new ContactError(409, 'contact_operation_payload_conflict');
      if (!before || before.status === 'removed' && input.action !== 'remove' || input.action === 'accept' && (before.uid !== actor.uid || before.status !== 'active')) throw new ContactError(403, 'contact_membership_inactive');
      if (input.action === 'remove') requireMemberRemoval(caller!, before, actor);
      return before;
    }
    if ((before?.revision ?? 0) !== input.expectedRevision) throw new ContactError(409, 'contact_member_revision_conflict');
    if (before && (before.clientId !== ctx.clientId || before.issuer !== ctx.issuer || before.email !== email)) throw new ContactError(503, 'contact_member_identity_invalid');
    let next: ContactMember;
    if (input.action === 'invite') {
      if (!canAssignRole(caller!.role, input.role!)) throw new ContactError(403, 'contact_member_role_forbidden');
      if (before && before.status !== 'removed') throw new ContactError(409, 'contact_member_exists');
      next = { clientId: ctx.clientId, issuer: ctx.issuer, email, uid: null, role: input.role!, status: 'pending', epoch, revision: input.expectedRevision + 1, invitedBy: actor.email, invitedAt: now, acceptedAt: null };
    } else {
      if (!before || before.status === 'removed') throw new ContactError(404, 'contact_member_not_found');
      next = { ...before, revision: before.revision + 1 };
      if (input.action === 'accept') {
        if (before.status !== 'pending' || before.uid !== null) throw new ContactError(409, 'contact_invitation_state');
        next.uid = actor.uid; next.status = 'active'; next.acceptedAt = now;
      } else if (input.action === 'role') {
        if (caller!.role !== 'owner' || email === actor.email && input.role !== 'owner') throw new ContactError(403, 'contact_member_role_forbidden');
        next.role = input.role!; next.epoch = epoch;
      } else {
        requireMemberRemoval(caller!, before, actor);
        next.status = 'removed'; next.epoch = epoch; next.uid = null;
      }
    }
    const revoke = await prepareMemberMoneyRevocation(db, tx, ctx.clientId, email, actor, opId, now);
    await ctx.observe?.('before-member-writes');
    tx.set(ref, next);
    tx.create(db.collection('crm_changes').doc(opId), { clientId: ctx.clientId, key: ref.id, action: 'member-' + input.action, before: before ?? null, after: next, actor, reason, operationId: opId, recordedAt: now });
    tx.create(opRef, { clientId: ctx.clientId, scope, fingerprint, state: 'committed', revision: next.revision, action: 'member-' + input.action, createdAt: now, schemaVersion: 2 });
    revoke(); return next;
  });
}
