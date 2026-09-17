import { randomUUID } from 'node:crypto';
import { FieldPath, type DocumentSnapshot, type Firestore, type Transaction } from '@google-cloud/firestore';
import { contactDb, contactDigest, contactKey, contactSources, openContactCursor, sealContactCursor, sameContactKey, sourceId } from './crm-core-identity';
import { contactAccessId, contactGrantActive, listContactMembers, readContactMember, requireContactManager, requireContactPartition, requireContactService } from './crm-core-members';
import { ContactError, type ContactActor, type ContactAccessView, type ContactCommand, type ContactContext, type ContactFields, type ContactGrantCommand, type ContactIdentity, type ContactMember, type ContactSource, type ContactView } from './crm-core-types';

type Data = Record<string, any>;
type Located = { source: ContactSource; db: Firestore; snap: DocumentSnapshot; identity: ContactIdentity; key: string };
const locations = new WeakMap<ContactContext, Map<string, { source: ContactSource; id: string }>>();
const stages = new Set(['lead', 'contacted', 'scheduled', 'converted', 'lost']);
const channels = new Set(['web', 'whatsapp', 'instagram', 'google', 'referral', 'manual', 'walkin', 'booking', 'import', 'unknown']);
const notFound = (): never => { throw new ContactError(404, 'contact_not_found'); };

function closed(value: unknown, keys: string[]): asserts value is Data {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !keys.includes(k))) throw new ContactError(422, 'contact_payload_invalid');
}
function text(value: unknown, max: number, required = false): string {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new ContactError(422, 'contact_field_invalid');
  return value.trim().normalize('NFC');
}
function fields(input: unknown, creating: boolean, staff: boolean): Partial<ContactFields> {
  closed(input, staff ? ['fullName', 'channel', 'email', 'phone'] : ['fullName', 'channel', 'email', 'phone', 'notes', 'tags', 'stage']);
  const out: Partial<ContactFields> = {};
  if (creating || 'fullName' in input) out.fullName = text(input.fullName, 200, true);
  if (creating || 'channel' in input) {
    out.channel = text(input.channel, 30, true);
    if (!channels.has(out.channel) || out.channel === 'unknown') throw new ContactError(422, 'contact_channel_invalid');
  }
  for (const key of ['phone', 'email'] as const) if (key in input) {
    out[key] = input[key] === null || input[key] === '' ? null : text(input[key], key === 'phone' ? 60 : 254, true);
    if (out[key] && key === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out[key]!)) throw new ContactError(422, 'contact_email_invalid');
    if (out[key] && key === 'phone' && !/^\+?[\d\s().-]{5,60}$/.test(out[key]!)) throw new ContactError(422, 'contact_phone_invalid');
  }
  if ('notes' in input) out.notes = text(input.notes, 10000);
  if ('stage' in input) {
    if (input.stage !== null && !stages.has(input.stage)) throw new ContactError(422, 'contact_stage_invalid');
    out.stage = input.stage;
  }
  if ('tags' in input) {
    if (!Array.isArray(input.tags) || input.tags.length > 20) throw new ContactError(422, 'contact_tags_invalid');
    out.tags = [...new Set<string>(input.tags.map(t => text(t, 50, true)))];
  }
  if (!creating && Object.keys(out).length === 0) throw new ContactError(422, 'contact_patch_empty');
  return out;
}
function command(input: ContactCommand, staff: boolean): ContactCommand {
  closed(input, ['operationId', 'action', 'key', 'expectedRevision', 'expectedVersion', 'fields', 'reason', 'entryPoint']);
  if (!/^[a-zA-Z0-9_-]{16,160}$/.test(input.operationId) || !['create', 'update', 'archive', 'restore'].includes(input.action)) throw new ContactError(422, 'contact_command_invalid');
  const result = { ...input };
  if (input.action === 'create') {
    if (input.key !== undefined || input.expectedRevision !== undefined || input.expectedVersion !== undefined) throw new ContactError(422, 'contact_create_reference_invalid');
    result.fields = fields(input.fields, true, staff);
  } else {
    if (typeof input.key !== 'string' || !/^c2_[A-Za-z0-9_-]{43}$/.test(input.key) || !Number.isInteger(input.expectedRevision) || input.expectedRevision! < 0 || typeof input.expectedVersion !== 'string') throw new ContactError(422, 'contact_revision_required');
    if (input.action === 'update') result.fields = fields(input.fields, false, staff);
    else {
      if (input.fields !== undefined) throw new ContactError(422, 'contact_archive_fields');
      result.reason = text(input.reason, 500, true);
    }
  }
  if (input.entryPoint !== undefined) result.entryPoint = text(input.entryPoint, 100, true);
  if (input.reason !== undefined) result.reason = text(input.reason, 500, true);
  return result;
}
function identity(ctx: ContactContext, source: ContactSource, snap: DocumentSnapshot): ContactIdentity {
  const data = snap.data();
  if (!data || data.clientId !== ctx.clientId) return notFound();
  const original = data.core?.identity ?? [ctx.clientId, source.projectId, source.databaseId, 'customers', snap.id];
  if (!Array.isArray(original) || original.length !== 5 || original.some(v => typeof v !== 'string' || !v) || original[0] !== ctx.clientId || original[3] !== 'customers') throw new ContactError(503, 'contact_identity_invalid');
  return original as ContactIdentity;
}
function remember(ctx: ContactContext, source: ContactSource, snap: DocumentSnapshot): Located {
  const original = identity(ctx, source, snap), key = contactKey(ctx, original);
  let cache = locations.get(ctx); if (!cache) { cache = new Map(); locations.set(ctx, cache); }
  cache.set(key, { source, id: snap.id });
  return { source, db: snap.ref.firestore, snap, identity: original, key };
}
async function locate(ctx: ContactContext, key: string): Promise<Located> {
  if (!/^c2_[A-Za-z0-9_-]{43}$/.test(key)) return notFound();
  const cached = locations.get(ctx)?.get(key);
  if (cached) {
    const db = await contactDb(ctx, cached.source), snap = await db.collection('customers').doc(cached.id).get();
    if (snap.exists && snap.data()?.clientId === ctx.clientId) {
      const row = remember(ctx, cached.source, snap);
      if (sameContactKey(row.key, key)) return row;
    }
    locations.get(ctx)?.delete(key);
  }
  for (const source of contactSources(ctx)) {
    const db = await contactDb(ctx, source); await requireContactPartition(ctx, db);
    let after = '';
    while (true) {
      let query = db.collection('customers').where('clientId', '==', ctx.clientId).orderBy(FieldPath.documentId()).limit(500);
      if (after) query = query.startAfter(after);
      const batch = await query.get();
      for (const snap of batch.docs) { const row = remember(ctx, source, snap); if (sameContactKey(row.key, key)) return row; }
      if (batch.size < 500) break;
      after = batch.docs[batch.size - 1].id;
    }
  }
  return notFound();
}
function date(value: unknown): string | null {
  if (typeof value === 'string') return Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
  if (value && typeof (value as any).toDate === 'function') return date((value as any).toDate().toISOString());
  return value instanceof Date && Number.isFinite(value.getTime()) ? value.toISOString() : null;
}
function revision(data: Data): number { return Number.isInteger(data.core?.revision) && data.core.revision >= 1 ? data.core.revision : 0; }
function version(ctx: ContactContext, snap: DocumentSnapshot): string {
  const db = snap.ref.firestore as Firestore & { readonly projectId: string };
  return contactDigest(ctx, 'native-version', [snap.ref.path, db.projectId, db.databaseId, snap.updateTime?.seconds, snap.updateTime?.nanoseconds]);
}
function project(ctx: ContactContext, row: Located, member: ContactMember): ContactView {
  const d = row.snap.data()!, core = d.core ?? {}, contact = core.contact ?? {};
  const view: ContactView = {
    key: row.key, revision: revision(d), version: version(ctx, row.snap),
    fullName: typeof d.fullName === 'string' ? d.fullName : typeof d.name === 'string' ? d.name : '',
    phone: typeof d.phone === 'string' && d.phone ? d.phone : null,
    email: typeof d.email === 'string' && d.email ? d.email : null,
    channel: channels.has(contact.channel ?? d.source) ? contact.channel ?? d.source : 'unknown',
    tags: Array.isArray(d.tags) ? d.tags.filter((t: unknown) => typeof t === 'string') : [],
    stage: stages.has(d.stage) ? d.stage : null,
    archived: core.archive?.archived === true,
  };
  if (member.role !== 'staff') Object.assign(view, {
    notes: typeof d.notes === 'string' ? d.notes : '', createdAt: date(d.createdAt), updatedAt: date(d.updatedAt),
    attendance: core.attendance ? { count: core.attendance.count ?? null, lastAt: date(core.attendance.lastAt), coverage: core.attendance.coverage } : { count: null, lastAt: null, coverage: 'unknown' },
    legacy: revision(d) === 0, syntheticEmail: typeof d.email === 'string' && /@noemail\.local$/i.test(d.email),
  });
  if (member.role !== 'staff') {
    const values: Record<string, string | number> = {};
    for (const key of ['lifetimeValueCents', 'amountPaidCents', 'visitCount']) if (typeof d[key] === 'number' && Number.isFinite(d[key])) values[key] = d[key];
    for (const key of ['lastServiceId', 'paymentMethod']) if (typeof d[key] === 'string') values[key] = d[key];
    for (const key of ['lastVisitAt', 'lastContactedAt']) { const value = date(d[key]); if (value) values[key] = value; }
    if (Object.keys(values).length) view.legacyValues = { source: row.identity, unit: 'unknown', attendance: 'unverified', values };
  }
  return view;
}
async function visible(ctx: ContactContext, row: Located, member: ContactMember, tx?: Transaction): Promise<boolean> {
  await requireContactPartition(ctx, row.db, tx);
  if (member.role !== 'staff') return true;
  const ref = row.db.collection('crm_access').doc(contactAccessId(ctx, member, row.key));
  return contactGrantActive((tx ? await tx.get(ref) : await ref.get()).data(), ctx, member, row.key);
}
async function revalidate(ctx: ContactContext, actor: ContactActor, prior: ContactMember, rows: Located[]): Promise<void> {
  await ctx.observe?.('before-response-authorization');
  const current = await readContactMember(ctx, actor);
  if (current.epoch !== prior.epoch || current.revision !== prior.revision || current.role !== prior.role) throw new ContactError(403, 'contact_policy_changed');
  for (const row of rows) if (!await visible(ctx, row, current)) return notFound();
  await ctx.observe?.('response-authorized');
}
export async function readContact(ctx: ContactContext, actor: ContactActor, key: string): Promise<ContactView> {
  const member = await readContactMember(ctx, actor), row = await locate(ctx, key);
  if (!await visible(ctx, row, member)) return notFound();
  const view = project(ctx, row, member); await revalidate(ctx, actor, member, [row]); return view;
}
/**
 * Resuelve una referencia física heredada únicamente dentro de la fuente
 * canónica declarada. La fachada obtiene así la clave opaca y la versión de
 * una misma lectura antes de construir el comando Core.
 */
export async function readCanonicalContact(ctx: ContactContext, actor: ContactActor, documentId: string): Promise<ContactView> {
  if (!/^[a-zA-Z0-9_-]{1,1500}$/.test(documentId)) throw new ContactError(422, 'contact_reference_invalid');
  const member = await readContactMember(ctx, actor), db = await contactDb(ctx, ctx.canonical);
  await requireContactPartition(ctx, db);
  const snap = await db.collection('customers').doc(documentId).get();
  if (!snap.exists || snap.data()?.clientId !== ctx.clientId) return notFound();
  const row = remember(ctx, ctx.canonical, snap);
  if (!await visible(ctx, row, member)) return notFound();
  const view = project(ctx, row, member);
  await revalidate(ctx, actor, member, [row]);
  return view;
}
/** Consulta un recibo propio sin reejecutar el comando ni revelar datos sin permiso actual. */
export async function contactCommandResult(ctx: ContactContext, actor: ContactActor, operation: string): Promise<ContactView | null> {
  if (!/^[a-zA-Z0-9_-]{16,160}$/.test(operation)) throw new ContactError(422, 'contact_command_invalid');
  const member = await readContactMember(ctx, actor), scope = [ctx.clientId, actor.issuer, actor.uid, operation];
  const id = 'op_' + contactDigest(ctx, 'operation', scope);
  let result: ContactView | null = null;
  const rows: Located[] = [];
  for (const source of contactSources(ctx)) {
    const db = await contactDb(ctx, source); await requireContactPartition(ctx, db);
    const receipt = (await db.collection('crm_operations').doc(id).get()).data();
    if (!receipt) continue;
    if (receipt.state !== 'committed' || JSON.stringify(receipt.scope) !== JSON.stringify(scope) || !['create', 'update', 'archive', 'restore'].includes(receipt.action) || typeof receipt.documentId !== 'string') throw new ContactError(503, 'contact_recovery_pending');
    const snap = await db.collection('customers').doc(receipt.documentId).get();
    if (!snap.exists || snap.data()?.clientId !== ctx.clientId) throw new ContactError(503, 'contact_recovery_pending');
    const row = remember(ctx, source, snap);
    if (row.key !== receipt.key || result && result.key !== row.key) throw new ContactError(503, 'contact_recovery_pending');
    if (!await visible(ctx, row, member)) return notFound();
    result = project(ctx, row, member); rows.push(row);
  }
  await revalidate(ctx, actor, member, rows); return result;
}

/** Recuperación acotada para productores servidor a servidor; no devuelve PII. */
export async function contactServiceCommandResult(ctx: ContactContext, actor: ContactActor, operation: string, entryPoint: string): Promise<{ key: string; revision: number } | null> {
  if (!/^[a-zA-Z0-9_-]{16,160}$/.test(operation)) throw new ContactError(422, 'contact_command_invalid');
  requireContactService(ctx, actor, 'recover', entryPoint);
  const scope = [ctx.clientId, actor.issuer, actor.uid, operation];
  const id = 'op_' + contactDigest(ctx, 'operation', scope);
  let result: { key: string; revision: number } | null = null;
  for (const source of contactSources(ctx)) {
    const db = await contactDb(ctx, source); await requireContactPartition(ctx, db);
    const receipt = (await db.collection('crm_operations').doc(id).get()).data();
    if (!receipt) continue;
    if (receipt.state !== 'committed' || JSON.stringify(receipt.scope) !== JSON.stringify(scope) || typeof receipt.key !== 'string' || !Number.isInteger(receipt.revision) || result) throw new ContactError(503, 'contact_recovery_pending');
    result = { key: receipt.key, revision: receipt.revision };
  }
  requireContactService(ctx, actor, 'recover', entryPoint);
  return result;
}

/** Conteo sin PII para H; incluye cada identidad física permitida y separa archivo. */
export async function contactServiceSummary(ctx: ContactContext, actor: ContactActor, entryPoint: string): Promise<{ active: number; archived: number; total: number; coverage: 'all-allowlisted-sources' }> {
  requireContactService(ctx, actor, 'read-summary', entryPoint);
  let active = 0, archived = 0;
  for (const source of contactSources(ctx)) {
    const db = await contactDb(ctx, source); await requireContactPartition(ctx, db);
    const rows = await db.collection('customers').where('clientId', '==', ctx.clientId).get();
    for (const row of rows.docs) row.data().core?.archive?.archived === true ? archived++ : active++;
  }
  requireContactService(ctx, actor, 'read-summary', entryPoint);
  return { active, archived, total: active + archived, coverage: 'all-allowlisted-sources' };
}
export async function assertContactLinkable(ctx: ContactContext, actor: ContactActor, key: string): Promise<void> {
  const view = await readContact(ctx, actor, key);
  if (view.archived) throw new ContactError(409, 'contact_archived');
}
/** Vínculo REG: autorización core y archivo se comprueban antes de escribir dinero.
 * En la misma fuente, el contacto entra en la transacción REG; en otra fuente se
 * revalida al último punto previo a efectos, sin simular atomicidad entre bases.
 */
export async function prepareContactLink(ctx: ContactContext, actor: ContactActor, key: string, targetDb: Firestore, tx: Transaction): Promise<() => Promise<void>> {
  const projectId = (targetDb as Firestore & { readonly projectId: string }).projectId;
  const sameAuthority = ctx.canonical.projectId === projectId && ctx.canonical.databaseId === targetDb.databaseId;
  const member = await readContactMember(ctx, actor, sameAuthority ? tx : undefined, sameAuthority ? targetDb : undefined);
  const row = await locate(ctx, key);
  const same = row.source.projectId === projectId && row.source.databaseId === targetDb.databaseId;
  const checkRow = async (): Promise<Located> => {
    const snap = same ? await tx.get(targetDb.collection('customers').doc(row.snap.id)) : await row.snap.ref.get();
    if (!snap.exists || snap.data()?.clientId !== ctx.clientId) return notFound();
    const current = remember(ctx, row.source, snap);
    if (current.key !== key || !await visible(ctx, current, member, same ? tx : undefined)) return notFound();
    if (snap.data()?.core?.archive?.archived === true) throw new ContactError(409, 'contact_archived');
    return current;
  };
  await checkRow();
  return async () => { const current = await checkRow(); await revalidate(ctx, actor, member, [current]); };
}
export interface ContactListQuery { cursor?: string; search?: string; archived?: 'active' | 'archived' | 'all'; limit?: number }
export async function listContacts(ctx: ContactContext, actor: ContactActor, input: ContactListQuery = {}): Promise<{ items: ContactView[]; cursor: string | null; consistency: 'live' }> {
  closed(input, ['cursor', 'search', 'archived', 'limit']);
  const member = await readContactMember(ctx, actor), sources = contactSources(ctx);
  const limit = input.limit ?? 100, search = (input.search ?? '').trim().toLocaleLowerCase();
  const archived = input.archived ?? 'active';
  if (!Number.isInteger(limit) || limit < 1 || limit > 500 || search.length > 200 || !['active', 'archived', 'all'].includes(archived)) throw new ContactError(422, 'contact_query_invalid');
  const scope = contactDigest(ctx, 'list-scope', [actor.issuer, actor.uid, member.epoch, member.revision, member.role, search, archived, sources.map(sourceId)]);
  let sourceIndex = 0, after = '';
  if (input.cursor) {
    const cursor = openContactCursor(ctx, input.cursor) as Data;
    if (cursor.scope !== scope || !Number.isInteger(cursor.sourceIndex) || cursor.sourceIndex < 0 || cursor.sourceIndex >= sources.length || typeof cursor.after !== 'string') throw new ContactError(403, 'contact_cursor_scope');
    sourceIndex = cursor.sourceIndex; after = cursor.after;
  }
  const items: ContactView[] = [], rows: Located[] = [];
  while (sourceIndex < sources.length && items.length < limit) {
    const source = sources[sourceIndex], db = await contactDb(ctx, source); await requireContactPartition(ctx, db);
    const collection = member.role === 'staff' ? 'crm_access' : 'customers';
    let query = db.collection(collection).where('clientId', '==', ctx.clientId).orderBy(FieldPath.documentId()).limit(100);
    if (member.role === 'staff') query = query.where('uid', '==', member.uid).where('issuer', '==', member.issuer).where('epoch', '==', member.epoch).where('kind', '==', 'contact').where('active', '==', true);
    if (after) query = query.startAfter(after);
    const batch = await query.get(); let exhausted = true;
    for (const snap of batch.docs) {
      after = snap.id;
      let row: Located;
      if (member.role === 'staff') {
        const grant = snap.data(); if (!contactGrantActive(grant, ctx, member, grant.key)) continue;
        try { row = await locate(ctx, grant.key); } catch (error) { if (error instanceof ContactError && error.status === 404) continue; throw error; }
        if (sourceId(row.source) !== sourceId(source) || !await visible(ctx, row, member)) continue;
      } else row = remember(ctx, source, snap);
      const view = project(ctx, row, member);
      if (archived !== 'all' && view.archived !== (archived === 'archived')) continue;
      if (search && ![view.fullName, view.email, view.phone, ...(view.tags ?? [])].some(v => v?.toLocaleLowerCase().includes(search))) continue;
      items.push(view); rows.push(row);
      if (items.length === limit) { exhausted = false; break; }
    }
    if (exhausted && batch.size < 100) { sourceIndex++; after = ''; }
  }
  await revalidate(ctx, actor, member, rows);
  return { items, cursor: sourceIndex < sources.length ? sealContactCursor(ctx, { scope, sourceIndex, after }) : null, consistency: 'live' };
}
async function selectAllContacts(ctx: ContactContext, actor: ContactActor, input: Omit<ContactListQuery, 'cursor' | 'limit'>) {
  const prior = await readContactMember(ctx, actor), rows: ContactView[] = [];
  let cursor: string | null = null;
  do { const page = await listContacts(ctx, actor, { ...input, ...(cursor ? { cursor } : {}), limit: 500 }); rows.push(...page.items); cursor = page.cursor; } while (cursor);
  // También se comprueban concesiones de las primeras páginas al terminar el archivo.
  await revalidate(ctx, actor, prior, await Promise.all(rows.map(r => locate(ctx, r.key))));
  return { items: rows, member: prior };
}
/** Paginación interna completa, misma selección y última revalidación que el CSV. */
export async function allContacts(ctx: ContactContext, actor: ContactActor, input: Omit<ContactListQuery, 'cursor' | 'limit'> = {}) {
  const { items } = await selectAllContacts(ctx, actor, input);
  return { items, consistency: 'live' as const };
}
export async function exportContacts(ctx: ContactContext, actor: ContactActor, input: Omit<ContactListQuery, 'cursor' | 'limit'>, selected?: unknown): Promise<string> {
  if (selected !== undefined && (!Array.isArray(selected) || selected.some(key => typeof key !== 'string' || !/^c2_[A-Za-z0-9_-]{43}$/.test(key)) || new Set(selected).size !== selected.length)) throw new ContactError(422, 'contact_selection_invalid');
  const { items, member: prior } = await selectAllContacts(ctx, actor, input);
  const requested = selected === undefined ? null : new Set(selected as string[]);
  const rows = requested ? items.filter(row => requested.has(row.key)) : items;
  if (requested && rows.length !== requested.size) throw new ContactError(409, 'contact_selection_changed');
  const columns: (keyof ContactView)[] = ['key', 'fullName', 'phone', 'email', 'channel', 'tags', 'stage', 'archived', 'revision'];
  if (prior.role !== 'staff') columns.push('notes', 'createdAt', 'updatedAt');
  const cell = (v: unknown): string => { let s = v === null || v === undefined ? '' : Array.isArray(v) ? v.join(' | ') : String(v); if (/^[\s]*[=+@-]/.test(s)) s = "'" + s; return '"' + s.replaceAll('"', '""') + '"'; };
  return [columns.join(','), ...rows.map(row => columns.map(k => cell(row[k])).join(','))].join('\r\n');
}
export async function executeContact(ctx: ContactContext, actor: ContactActor, input: ContactCommand): Promise<ContactView | { key: string; revision: number }> {
  const service = actor.kind === 'service';
  const initial = service ? null : await readContactMember(ctx, actor);
  const serviceGrant = service ? requireContactService(ctx, actor, input.action, input.entryPoint ?? '') : null;
  if (service && input.action !== 'create') throw new ContactError(403, 'contact_service_command');
  if (initial?.role === 'staff' && input.action !== 'create') throw new ContactError(403, 'contact_manager_required');
  const normalized = command(input, initial?.role === 'staff' || (service && serviceGrant?.fields !== 'manager'));
  const target = normalized.action === 'create' ? null : await locate(ctx, normalized.key!);
  const source = target?.source ?? ctx.canonical, db = await contactDb(ctx, source);
  const scope = [ctx.clientId, actor.issuer, actor.uid, normalized.operationId];
  const operationId = 'op_' + contactDigest(ctx, 'operation', scope), operationRef = db.collection('crm_operations').doc(operationId);
  const fingerprint = contactDigest(ctx, 'command', normalized);
  // Fijado fuera del callback: los reintentos de la transacción conservan el ID.
  const newRef = db.collection('customers').doc(randomUUID());
  const result = await db.runTransaction(async tx => {
    await requireContactPartition(ctx, db, tx);
    const member = service ? null : await readContactMember(ctx, actor, sourceId(source) === sourceId(ctx.canonical) ? tx : undefined, sourceId(source) === sourceId(ctx.canonical) ? db : undefined);
    if (member && (member.epoch !== initial!.epoch || member.role !== initial!.role || member.revision !== initial!.revision)) throw new ContactError(403, 'contact_policy_changed');
    let capacity: Data | undefined;
    if (member?.role === 'staff') {
      const cap = await tx.get(db.collection('crm_access').doc(contactAccessId(ctx, member, 'create-contact'))); capacity = cap.data();
      if (!contactGrantActive(capacity, ctx, member, 'create-contact')) throw new ContactError(403, 'contact_create_not_allowed');
    }
    const receipt = await tx.get(operationRef);
    if (receipt.exists) {
      const saved = receipt.data()!;
      if (saved.fingerprint !== fingerprint || JSON.stringify(saved.scope) !== JSON.stringify(scope)) throw new ContactError(409, 'contact_operation_payload_conflict');
      if (saved.state !== 'committed') throw new ContactError(503, 'contact_recovery_pending');
      const current = await tx.get(db.collection('customers').doc(saved.documentId));
      if (!current.exists || current.data()?.clientId !== ctx.clientId) throw new ContactError(503, 'contact_recovery_pending');
      const row = remember(ctx, source, current);
      if (member && !await visible(ctx, row, member, tx)) return notFound();
      return { key: row.key, revision: saved.revision };
    }
    const ref = target?.snap.ref ?? newRef, snap = await tx.get(ref), before = snap.data();
    if (normalized.action !== 'create') {
      if (!before || before.clientId !== ctx.clientId || contactKey(ctx, identity(ctx, source, snap)) !== normalized.key) return notFound();
      if (revision(before) !== normalized.expectedRevision || version(ctx, snap) !== normalized.expectedVersion) throw new ContactError(409, 'contact_revision_conflict');
    } else if (snap.exists) throw new ContactError(409, 'contact_id_collision');
    const original: ContactIdentity = before ? identity(ctx, source, snap) : [ctx.clientId, source.projectId, source.databaseId, 'customers', ref.id];
    const key = contactKey(ctx, original), now = new Date(ctx.now()).toISOString(), nextRevision = before ? revision(before) + 1 : 1;
    const base: Data = before ?? { clientId: ctx.clientId, fullName: '', email: null, phone: null, notes: '', tags: [], stage: null, visitCount: 0, lastVisitAt: null, createdAt: now };
    const next: Data = { ...base, ...(normalized.fields ?? {}), updatedAt: now };
    if (normalized.fields?.channel !== undefined) { next.source = normalized.fields.channel; delete next.channel; }
    next.core = {
      ...base.core, schemaVersion: 2, identity: original,
      storageRef: [source.projectId, source.databaseId, 'customers', ref.id], legacyRefs: base.core?.legacyRefs ?? [],
      revision: nextRevision, createdBy: base.core?.createdBy ?? (before ? null : actor), updatedBy: actor,
      origin: base.core?.origin ?? { channel: normalized.fields?.channel ?? base.source ?? 'unknown', entryPoint: normalized.entryPoint ?? 'crm', operationId: normalized.operationId },
      contact: { channel: normalized.fields?.channel ?? base.core?.contact?.channel ?? base.source ?? 'unknown', email: next.email ?? null, phone: next.phone ?? null },
      attendance: base.core?.attendance ?? { count: before ? null : 0, lastAt: null, coverage: before ? 'unknown' : 'complete' },
      archive: normalized.action === 'archive' || normalized.action === 'restore' ? { archived: normalized.action === 'archive', changedAt: now, changedBy: actor, reason: normalized.reason } : base.core?.archive ?? { archived: false },
    };
    // Última comprobación de la autoridad separada antes del primer efecto.
    if (member && sourceId(source) !== sourceId(ctx.canonical)) {
      const current = await readContactMember(ctx, actor);
      if (current.epoch !== member.epoch || current.revision !== member.revision || current.role !== member.role) throw new ContactError(403, 'contact_policy_changed');
    }
    await ctx.observe?.('before-contact-writes');
    tx.set(ref, next);
    if (member?.role === 'staff') tx.create(db.collection('crm_access').doc(contactAccessId(ctx, member, key)), {
      clientId: ctx.clientId, kind: 'contact', issuer: member.issuer, uid: member.uid, epoch: member.epoch, key, active: true, revision: 1,
      grantor: actor, reason: 'Alta con capacidad explícita', capacityRevision: capacity!.revision, operationId, createdAt: now, updatedAt: now,
    });
    tx.create(db.collection('crm_changes').doc(operationId), { clientId: ctx.clientId, key, action: normalized.action, before: before ?? null, after: next, previousRevision: before ? revision(before) : 0, revision: nextRevision, actor, reason: normalized.reason ?? null, operationId, recordedAt: now });
    tx.create(operationRef, { clientId: ctx.clientId, scope, fingerprint, state: 'committed', key, documentId: ref.id, revision: nextRevision, action: normalized.action, createdAt: now, schemaVersion: 2 });
    return { key, revision: nextRevision };
  });
  await ctx.observe?.('after-contact-commit');
  if (service) { requireContactService(ctx, actor, normalized.action, normalized.entryPoint ?? ''); return result; }
  const row = await locate(ctx, result.key); await revalidate(ctx, actor, initial!, [row]); return project(ctx, row, initial!);
}
export async function grantContactAccess(ctx: ContactContext, actor: ContactActor, input: ContactGrantCommand): Promise<{ revision: number }> {
  closed(input, ['operationId', 'action', 'key', 'principal', 'expectedRevision', 'reason']);
  closed(input.principal, ['issuer', 'uid', 'email']);
  if (!/^[a-zA-Z0-9_-]{16,160}$/.test(input.operationId) || !['grant', 'revoke', 'allow-create', 'deny-create'].includes(input.action) || !Number.isInteger(input.expectedRevision) || input.expectedRevision < 0) throw new ContactError(422, 'contact_grant_invalid');
  const reason = text(input.reason, 500, true), member = await readContactMember(ctx, actor); requireContactManager(member);
  const targetMember = await readContactMember(ctx, input.principal);
  if (targetMember.role !== 'staff') throw new ContactError(422, 'contact_grantee_not_staff');
  const capacity = input.action === 'allow-create' || input.action === 'deny-create';
  if (capacity && input.key !== undefined) throw new ContactError(422, 'contact_capacity_scope');
  const row = capacity ? null : await locate(ctx, input.key ?? ''), source = row?.source ?? ctx.canonical;
  const db = await contactDb(ctx, source), key = row?.key ?? 'create-contact';
  const ref = db.collection('crm_access').doc(contactAccessId(ctx, targetMember, key));
  const scope = [ctx.clientId, actor.issuer, actor.uid, input.operationId], fingerprint = contactDigest(ctx, 'grant', { ...input, reason });
  const opId = 'op_' + contactDigest(ctx, 'operation', scope), opRef = db.collection('crm_operations').doc(opId);
  const result = await db.runTransaction(async tx => {
    await requireContactPartition(ctx, db, tx);
    const same = sourceId(source) === sourceId(ctx.canonical);
    const current = await readContactMember(ctx, actor, same ? tx : undefined, same ? db : undefined); requireContactManager(current);
    const target = await readContactMember(ctx, input.principal, same ? tx : undefined, same ? db : undefined);
    if (current.epoch !== member.epoch || current.revision !== member.revision || target.epoch !== targetMember.epoch || target.revision !== targetMember.revision || target.role !== 'staff') throw new ContactError(403, 'contact_policy_changed');
    const receipt = await tx.get(opRef), prior = await tx.get(ref);
    if (row) { const snap = await tx.get(row.snap.ref); if (!snap.exists || contactKey(ctx, identity(ctx, source, snap)) !== row.key) return notFound(); }
    if (receipt.exists) { if (receipt.data()!.fingerprint !== fingerprint) throw new ContactError(409, 'contact_operation_payload_conflict'); return { revision: receipt.data()!.revision as number }; }
    if ((prior.data()?.revision ?? 0) !== input.expectedRevision) throw new ContactError(409, 'contact_grant_revision_conflict');
    const nextRevision = input.expectedRevision + 1, now = new Date(ctx.now()).toISOString();
    const after = { clientId: ctx.clientId, kind: capacity ? 'create-contact' : 'contact', issuer: target.issuer, uid: target.uid, epoch: target.epoch, key, active: input.action === 'grant' || input.action === 'allow-create', revision: nextRevision, grantor: actor, reason, operationId: opId, createdAt: prior.data()?.createdAt ?? now, updatedAt: now };
    tx.set(ref, after);
    tx.create(db.collection('crm_changes').doc(opId), { clientId: ctx.clientId, key, action: input.action, before: prior.data() ?? null, after, actor, reason, revision: nextRevision, operationId: opId, recordedAt: now });
    tx.create(opRef, { clientId: ctx.clientId, scope, fingerprint, state: 'committed', revision: nextRevision, action: input.action, createdAt: now, schemaVersion: 2 });
    return { revision: nextRevision };
  });
  await revalidate(ctx, actor, member, row ? [row] : []); return result;
}
/** Recupera un recibo propio de concesión; el resultado no concede acceso actual. */
export async function contactGrantResult(ctx: ContactContext, actor: ContactActor, operation: string): Promise<{ revision: number } | null> {
  if (!/^[a-zA-Z0-9_-]{16,160}$/.test(operation)) throw new ContactError(422, 'contact_command_invalid');
  const member = await readContactMember(ctx, actor); requireContactManager(member);
  const scope = [ctx.clientId, actor.issuer, actor.uid, operation], id = 'op_' + contactDigest(ctx, 'operation', scope);
  let result: { revision: number } | null = null;
  for (const source of contactSources(ctx)) {
    const db = await contactDb(ctx, source); await requireContactPartition(ctx, db);
    const receipt = (await db.collection('crm_operations').doc(id).get()).data();
    if (!receipt || !['grant', 'revoke', 'allow-create', 'deny-create'].includes(receipt.action)) continue;
    if (receipt.state !== 'committed' || JSON.stringify(receipt.scope) !== JSON.stringify(scope) || !Number.isInteger(receipt.revision) || result) throw new ContactError(503, 'contact_recovery_pending');
    result = { revision: receipt.revision };
  }
  await revalidate(ctx, actor, member, []); return result;
}
/** Revisión actual de cada concesión; nunca adopta grants de epochs anteriores. */
export async function readContactAccess(ctx: ContactContext, actor: ContactActor, key: string): Promise<ContactAccessView[]> {
  const caller = await readContactMember(ctx, actor); requireContactManager(caller);
  const row = key === 'create-contact' ? null : await locate(ctx, key), db = row?.db ?? await contactDb(ctx, ctx.canonical);
  await requireContactPartition(ctx, db);
  const members = (await listContactMembers(ctx, actor)).filter(member => member.status === 'active' && member.role === 'staff' && member.uid);
  const result: ContactAccessView[] = [];
  for (const member of members) {
    const data = (await db.collection('crm_access').doc(contactAccessId(ctx, member, key)).get()).data();
    result.push({ member, active: contactGrantActive(data, ctx, member, key), revision: data?.revision ?? 0 });
  }
  await revalidate(ctx, actor, caller, row ? [row] : []);
  for (const member of members) {
    const current = await readContactMember(ctx, { issuer: member.issuer, uid: member.uid!, email: member.email });
    if (current.epoch !== member.epoch || current.revision !== member.revision) throw new ContactError(409, 'contact_policy_changed');
  }
  return result;
}
/** Snapshots públicos de contacto; no proyecta payloads de concesiones como contactos. */
function historyFields(data: Data | null): Data | null {
  if (!data) return null;
  return {
    fullName: typeof data.fullName === 'string' ? data.fullName : typeof data.name === 'string' ? data.name : '',
    phone: typeof data.phone === 'string' ? data.phone : null,
    email: typeof data.email === 'string' ? data.email : null,
    channel: channels.has(data.core?.contact?.channel ?? data.source) ? data.core?.contact?.channel ?? data.source : 'unknown',
    tags: Array.isArray(data.tags) ? data.tags.filter((tag: unknown) => typeof tag === 'string') : [],
    stage: stages.has(data.stage) ? data.stage : null,
    archived: data.core?.archive?.archived === true,
    revision: revision(data),
  };
}
export async function contactHistory(ctx: ContactContext, actor: ContactActor, key: string, after = ''): Promise<{ items: Data[]; cursor: string | null }> {
  const member = await readContactMember(ctx, actor), row = await locate(ctx, key);
  if (!await visible(ctx, row, member)) return notFound();
  const scope = contactDigest(ctx, 'history-scope', [actor.issuer, actor.uid, member.epoch, member.revision, member.role, key]);
  let afterId = '';
  if (after) {
    const cursor = openContactCursor(ctx, after) as Data;
    if (cursor.scope !== scope || typeof cursor.after !== 'string') throw new ContactError(403, 'contact_cursor_scope');
    afterId = cursor.after;
  }
  let query = row.db.collection('crm_changes').where('clientId', '==', ctx.clientId).where('key', '==', key).orderBy(FieldPath.documentId()).limit(100);
  if (afterId) query = query.startAfter(afterId);
  const batch = await query.get();
  const items = batch.docs.map(s => {
    const data = s.data();
    if (member.role !== 'staff') return { id: s.id, ...data };
    const contact = ['create', 'update', 'archive', 'restore'].includes(data.action);
    return { id: s.id, key, action: data.action, recordedAt: date(data.recordedAt), revision: data.revision ?? null, ...(contact ? { before: historyFields(data.before), after: historyFields(data.after) } : {}) };
  });
  await revalidate(ctx, actor, member, [row]);
  return { items, cursor: batch.size === 100 ? sealContactCursor(ctx, { scope, after: batch.docs[99].id }) : null };
}
