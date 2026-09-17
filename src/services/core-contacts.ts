import type { ContactAccessView, ContactCommand, ContactGrantCommand, ContactMember, ContactMemberCommand, ContactView } from '../lib/api/crm-core-types';

export type ContactScope = { clientId: string; authorityId: string; issuer: string; uid: string; epoch: string };
export type ContactCapabilities = { scope: ContactScope; member: ContactMember | null; create: boolean };
export type ContactSession = { uid: string; handle: object; clientId: string; token: () => Promise<string> };
export type ContactIntent = { id: string; scope: ContactScope; command: ContactCommand; state: 'prepared' | 'uncertain' | 'accepted' | 'rejected'; result: ContactView | null; error: string | null };
export type ContactGrantIntent = { id: string; scope: ContactScope; command: ContactGrantCommand; state: ContactIntent['state']; result: { revision: number } | null; error: string | null };
export interface ContactGrantJournal { save: (intent: ContactGrantIntent) => Promise<void>; list: (scope: ContactScope) => Promise<ContactGrantIntent[]> }
export interface ContactJournal { save: (intent: ContactIntent) => Promise<void>; list: (scope: ContactScope) => Promise<ContactIntent[]> }
export class ContactRequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => JSON.stringify(k) + ':' + canonical(v)).join(',') + '}';
  return JSON.stringify(value);
}
function journalKey(scope: ContactScope, operationId: string): string { return canonical([scope, operationId]); }
function openJournal(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('intents', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new ContactRequestError(503, 'contact_journal_unavailable'));
    request.onblocked = () => reject(new ContactRequestError(503, 'contact_journal_blocked'));
  });
}
/** Journal separado de REG; no confirma una operación por haberla guardado en el navegador. */
function createIntentJournal<T extends ContactIntent | ContactGrantIntent>(name: string) { return {
  async save(intent: T) {
    const db = await openJournal(name);
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('intents', 'readwrite'), store = tx.objectStore('intents'), get = store.get(intent.id);
        get.onsuccess = () => {
          const prior = get.result as T | undefined;
          if (prior && canonical(prior.command) !== canonical(intent.command)) { tx.abort(); return; }
          if (prior?.state === 'accepted' && intent.state !== 'accepted') return;
          store.put(intent);
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(new ContactRequestError(503, 'contact_journal_unavailable'));
        tx.onabort = () => reject(new ContactRequestError(409, 'contact_intent_conflict'));
      });
    } finally { db.close(); }
  },
  async list(scope: ContactScope) {
    const db = await openJournal(name);
    try {
      return await new Promise<T[]>((resolve, reject) => {
        const request = db.transaction('intents', 'readonly').objectStore('intents').getAll();
        request.onsuccess = () => resolve((request.result as T[]).filter(intent => canonical(intent.scope) === canonical(scope)));
        request.onerror = () => reject(new ContactRequestError(503, 'contact_journal_unavailable'));
      });
    } finally { db.close(); }
  },
}; }
export const contactJournal: ContactJournal = createIntentJournal<ContactIntent>('arzac-contact-intents');
export const contactGrantJournal: ContactGrantJournal = createIntentJournal<ContactGrantIntent>('arzac-contact-grant-intents');

/** Cada recorrido fija sesión y ámbito; el servidor vuelve a decidir permisos en cada petición. */
export function createContactService(session: () => ContactSession | null, request: typeof fetch = fetch, journal: ContactJournal = contactJournal, grants: ContactGrantJournal = contactGrantJournal) {
  const listeners = new Set<() => void>();
  const invalidate = () => { for (const listener of listeners) listener(); };
  function capture(): ContactSession {
    const current = session();
    if (!current) { invalidate(); throw new ContactRequestError(401, 'contact_identity_required'); }
    return current;
  }
  function check(current: ContactSession): void {
    const actual = session();
    if (!actual || actual.handle !== current.handle || actual.uid !== current.uid || actual.clientId !== current.clientId) {
      invalidate(); throw new ContactRequestError(409, 'contact_session_changed');
    }
  }
  const headersFor = (scope: ContactScope) => ({ 'X-Contact-Tenant': scope.clientId, 'X-Contact-Authority': scope.authorityId, 'X-Contact-Issuer': scope.issuer, 'X-Contact-Uid': scope.uid });
  async function call<T>(current: ContactSession, path: string, method = 'GET', body?: unknown, scope?: ContactScope, csv = false): Promise<{ value: T; headers: Headers }> {
    check(current); const token = await current.token(); check(current);
    const response = await request('/api/crm/contacts' + path, { method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', 'X-Contact-Tenant': current.clientId, ...(scope ? headersFor(scope) : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    check(current);
    if (!response.ok) {
      const failure = await response.json().catch(() => ({})); check(current);
      if ([401, 403, 404].includes(response.status) || response.status === 409 && ['contact_session_changed', 'contact_policy_changed'].includes(failure.error)) invalidate();
      throw new ContactRequestError(response.status, failure.error ?? 'contact_request_failed');
    }
    if (response.headers.get('X-Contact-Tenant') !== current.clientId || response.headers.get('X-Contact-Uid') !== current.uid) { invalidate(); throw new ContactRequestError(409, 'contact_session_changed'); }
    if (scope) for (const [name, value] of Object.entries(headersFor(scope))) if (response.headers.get(name) !== value) { invalidate(); throw new ContactRequestError(409, 'contact_session_changed'); }
    const value = csv ? await response.text() : await response.json(); check(current);
    return { value, headers: response.headers };
  }
  async function capabilitiesFor(current: ContactSession, expected?: ContactScope): Promise<ContactCapabilities> {
    const result = await call<{ member: ContactMember | null; create: boolean }>(current, '/capabilities', 'GET', undefined, expected);
    const authorityId = result.headers.get('X-Contact-Authority'), issuer = result.headers.get('X-Contact-Issuer');
    if (!authorityId || !issuer) throw new ContactRequestError(503, 'contact_authority_unavailable');
    const member = result.value.member;
    const scope = { clientId: current.clientId, authorityId, issuer, uid: current.uid, epoch: member?.epoch ?? '' };
    if (expected && canonical(expected) !== canonical(scope)) { invalidate(); throw new ContactRequestError(409, 'contact_policy_changed'); }
    return { ...result.value, scope };
  }
  function active(cap: ContactCapabilities): void {
    if (cap.member?.status !== 'active' || cap.member.uid !== cap.scope.uid) { invalidate(); throw new ContactRequestError(403, 'contact_membership_inactive'); }
  }
  async function revalidate(current: ContactSession, before: ContactCapabilities): Promise<void> {
    const after = await capabilitiesFor(current, before.scope);
    if (canonical([after.member?.revision, after.member?.role, after.member?.status, after.create]) !== canonical([before.member?.revision, before.member?.role, before.member?.status, before.create])) { invalidate(); throw new ContactRequestError(409, 'contact_policy_changed'); }
  }
  async function read<T>(path: string, csv = false): Promise<T> {
    const current = capture(), cap = await capabilitiesFor(current); active(cap);
    const result = await call<T>(current, path, 'GET', undefined, cap.scope, csv);
    await revalidate(current, cap); return result.value;
  }
  async function save(current: ContactSession, intent: ContactIntent): Promise<ContactIntent> {
    await journal.save(intent); check(current);
    const rows = await journal.list(intent.scope); check(current);
    const saved = rows.find(row => row.id === intent.id) ?? intent;
    if (saved.state !== 'accepted') return saved;
    const cap = await capabilitiesFor(current, saved.scope); active(cap);
    const visible = await call<ContactView>(current, '/' + encodeURIComponent(saved.result!.key), 'GET', undefined, saved.scope);
    await revalidate(current, cap); return { ...saved, result: visible.value };
  }
  async function recoverFor(current: ContactSession, intent: ContactIntent): Promise<ContactIntent> {
    const cap = await capabilitiesFor(current, intent.scope); active(cap);
    const result = await call<ContactView | null>(current, '/commands/' + encodeURIComponent(intent.command.operationId), 'GET', undefined, intent.scope);
    await revalidate(current, cap);
    return save(current, { ...intent, state: result.value ? 'accepted' : 'uncertain', result: result.value, error: result.value ? null : 'contact_command_unknown' });
  }
  async function submitFor(current: ContactSession, intent: ContactIntent): Promise<ContactIntent> {
    const cap = await capabilitiesFor(current, intent.scope); active(cap);
    await save(current, intent);
    try {
      const result = await call<ContactView>(current, '', 'POST', intent.command, intent.scope);
      await revalidate(current, cap);
      return save(current, { ...intent, state: 'accepted', result: result.value, error: null });
    } catch (error) {
      const unknown: ContactIntent = { ...intent, state: 'uncertain', result: null, error: error instanceof Error ? error.message : 'contact_request_failed' };
      await journal.save(unknown); check(current);
      try {
        const recovered = await recoverFor(current, unknown);
        if (recovered.state === 'accepted') return recovered;
        if (error instanceof ContactRequestError && error.status >= 400 && error.status < 500) return save(current, { ...recovered, state: 'rejected', error: error.message });
      } catch { check(current); }
      return save(current, unknown);
    }
  }
  async function grantAuthority(current: ContactSession, scope?: ContactScope): Promise<ContactCapabilities> {
    const cap = await capabilitiesFor(current, scope); active(cap);
    if (cap.member!.role === 'staff') throw new ContactRequestError(403, 'contact_manager_required');
    return cap;
  }
  async function saveGrant(current: ContactSession, intent: ContactGrantIntent): Promise<ContactGrantIntent> {
    await grants.save(intent); check(current);
    const rows = await grants.list(intent.scope); check(current);
    return rows.find(row => row.id === intent.id) ?? intent;
  }
  async function recoverGrantFor(current: ContactSession, intent: ContactGrantIntent): Promise<ContactGrantIntent> {
    const cap = await grantAuthority(current, intent.scope);
    const result = await call<{ revision: number } | null>(current, '/grants/commands/' + encodeURIComponent(intent.command.operationId), 'GET', undefined, intent.scope);
    await revalidate(current, cap);
    return saveGrant(current, { ...intent, state: result.value ? 'accepted' : 'uncertain', result: result.value, error: result.value ? null : 'contact_command_unknown' });
  }
  async function submitGrantFor(current: ContactSession, intent: ContactGrantIntent): Promise<ContactGrantIntent> {
    const cap = await grantAuthority(current, intent.scope);
    await saveGrant(current, intent);
    try {
      const result = await call<{ revision: number }>(current, '/grants', 'POST', intent.command, intent.scope);
      await revalidate(current, cap);
      return saveGrant(current, { ...intent, state: 'accepted', result: result.value, error: null });
    } catch (error) {
      const unknown: ContactGrantIntent = { ...intent, state: 'uncertain', result: null, error: error instanceof Error ? error.message : 'contact_request_failed' };
      await grants.save(unknown); check(current);
      try {
        const result = await recoverGrantFor(current, unknown);
        if (result.state === 'accepted') return result;
        if (error instanceof ContactRequestError && error.status >= 400 && error.status < 500) return saveGrant(current, { ...result, state: 'rejected', error: error.message });
      } catch { check(current); }
      return saveGrant(current, unknown);
    }
  }
  return {
    async prepareGrant(command: ContactGrantCommand, expected?: ContactScope): Promise<ContactGrantIntent> {
      const current = capture(), cap = await grantAuthority(current, expected);
      const intent: ContactGrantIntent = { id: journalKey(cap.scope, command.operationId), scope: cap.scope, command, state: 'prepared', result: null, error: null };
      return saveGrant(current, intent);
    },
    async prepare(command: ContactCommand, expected?: ContactScope): Promise<ContactIntent> {
      const current = capture(), cap = await capabilitiesFor(current, expected); active(cap);
      const intent: ContactIntent = { id: journalKey(cap.scope, command.operationId), scope: cap.scope, command, state: 'prepared', result: null, error: null };
      return save(current, intent);
    },
    async pendingCreates() {
      const current = capture(), cap = await capabilitiesFor(current); active(cap);
      const rows = await journal.list(cap.scope); check(current); await revalidate(current, cap);
      return rows.filter(row => row.command.action === 'create' && (row.state === 'prepared' || row.state === 'uncertain'));
    },
    async executeGrant(command: ContactGrantCommand, expected?: ContactScope) {
      const current = capture(), cap = await grantAuthority(current, expected);
      return submitGrantFor(current, { id: journalKey(cap.scope, command.operationId), scope: cap.scope, command, state: 'prepared', result: null, error: null });
    },
    recoverGrant: (intent: ContactGrantIntent) => recoverGrantFor(capture(), intent),
    retryGrant: (intent: ContactGrantIntent) => submitGrantFor(capture(), intent),
    async grantIntents(key?: string) {
      const current = capture(), cap = await grantAuthority(current), rows = await grants.list(cap.scope); check(current);
      await revalidate(current, cap);
      return rows.filter(row => key === undefined || row.command.key === key || row.command.key === undefined);
    },
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }, invalidate,
    fence() { const current = capture(); return () => check(current); },
    capabilities: () => capabilitiesFor(capture()),
    list: (query: { cursor?: string; search?: string; archived?: 'active' | 'archived' | 'all'; limit?: number } = {}) => read<{ items: ContactView[]; cursor: string | null; consistency: 'live' }>('?' + new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)]))),
    get: (key: string) => read<ContactView>('/' + encodeURIComponent(key)),
    async bundle(query: { search?: string; archived?: 'active' | 'archived' | 'all' } = {}) {
      const current = capture(), cap = await capabilitiesFor(current); active(cap);
      const result = await call<{ items: ContactView[]; consistency: 'live' }>(current, '/all?' + new URLSearchParams(query), 'GET', undefined, cap.scope);
      await revalidate(current, cap); return { ...result.value, capabilities: cap };
    },
    async getBundle(key: string) {
      const current = capture(), cap = await capabilitiesFor(current); active(cap);
      const result = await call<ContactView>(current, '/' + encodeURIComponent(key), 'GET', undefined, cap.scope);
      await revalidate(current, cap); return { item: result.value, capabilities: cap };
    },
    history: (key: string, cursor?: string) => read<{ items: Record<string, unknown>[]; cursor: string | null }>('/' + encodeURIComponent(key) + '/history' + (cursor ? '?cursor=' + encodeURIComponent(cursor) : '')),
    export: (query: { search?: string; archived?: 'active' | 'archived' | 'all' } = {}) => read<string>('/export?' + new URLSearchParams(query), true),
    async exportSelected(keys: string[]): Promise<string> {
      const current = capture(), cap = await capabilitiesFor(current); active(cap);
      const result = await call<string>(current, '/export', 'POST', { keys }, cap.scope, true);
      await revalidate(current, cap); return result.value;
    },
    async execute(command: ContactCommand, expected?: ContactScope) {
      const current = capture(), cap = await capabilitiesFor(current, expected); active(cap);
      const intent: ContactIntent = { id: journalKey(cap.scope, command.operationId), scope: cap.scope, command, state: 'prepared', result: null, error: null };
      return submitFor(current, intent);
    },
    recover: (intent: ContactIntent) => recoverFor(capture(), intent),
    retry: (intent: ContactIntent) => submitFor(capture(), intent),
    async intents(key?: string) {
      const current = capture(), cap = await capabilitiesFor(current); active(cap);
      const stored = await journal.list(cap.scope); check(current); await revalidate(current, cap);
      const rows = stored.filter(intent => key === undefined || intent.command.key === key || intent.result?.key === key);
      if (key) await call<ContactView>(current, '/' + encodeURIComponent(key), 'GET', undefined, cap.scope);
      // Los resultados guardados se vuelven a leer con permiso vigente antes de mostrarlos.
      return Promise.all(rows.map(async intent => intent.state === 'accepted' ? { ...intent, result: (await call<ContactView>(current, '/' + encodeURIComponent(intent.result!.key), 'GET', undefined, cap.scope)).value } : intent));
    },
    access: (key: string) => read<ContactAccessView[]>('/' + encodeURIComponent(key) + '/access'),
    members: () => read<ContactMember[]>('/members'),
    async membership(command: ContactMemberCommand) {
      const current = capture(), cap = await capabilitiesFor(current);
      return (await call<ContactMember>(current, '/members/commands', 'POST', command, cap.scope)).value;
    },
    async grant(command: ContactGrantCommand) {
      const current = capture(), cap = await capabilitiesFor(current); active(cap);
      const result = await call<{ revision: number }>(current, '/grants', 'POST', command, cap.scope);
      await revalidate(current, cap); return result.value;
    },
  };
}
export type CoreContactService = ReturnType<typeof createContactService>;
