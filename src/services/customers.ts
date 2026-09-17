import { onIdTokenChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { env } from '../config/env';
import type { Customer, CustomerStage } from '../types';
import type { ContactFields, ContactView } from '../lib/api/crm-core-types';
import { createContactService, ContactRequestError, type ContactCapabilities, type ContactIntent, type ContactScope, type CoreContactService } from './core-contacts';

export const coreContacts = createContactService(() => {
  const user = auth?.currentUser;
  return user ? { uid: user.uid, handle: user, clientId: env.clientId, token: () => user.getIdToken() } : null;
});

function date(value: string | null | undefined): Date | null {
  return value && Number.isFinite(Date.parse(value)) ? new Date(value) : null;
}
/** Adaptación cerrada de la proyección API; no conserva documentos SDK brutos. */
export function contactToCustomer(view: ContactView, cap: ContactCapabilities): Customer {
  if (!cap.member || cap.member.status !== 'active') throw new ContactRequestError(403, 'contact_membership_inactive');
  return {
    id: view.key, clientId: cap.scope.clientId, fullName: view.fullName, email: view.email ?? '', phone: view.phone ?? '',
    source: view.channel, tags: view.tags ?? [], ...(view.stage ? { stage: view.stage as CustomerStage } : {}),
    createdAt: date(view.createdAt), updatedAt: date(view.updatedAt),
    ...('notes' in view ? { notes: view.notes } : {}),
    ...(view.attendance?.count !== null && view.attendance?.count !== undefined ? { visitCount: view.attendance.count } : {}),
    ...(view.attendance?.lastAt ? { lastVisitAt: date(view.attendance.lastAt)! } : {}),
    core: { scope: cap.scope, role: cap.member.role, revision: view.revision, version: view.version, archived: view.archived, attendance: view.attendance, legacy: view.legacy, legacyValues: view.legacyValues },
  };
}

export class CustomerOperationError extends Error {
  readonly code: 'invalid-argument' | 'recovery_pending';
  constructor(public intent: ContactIntent) {
    super(intent.error ?? 'contact_command_unknown');
    this.code = intent.state === 'rejected' ? 'invalid-argument' : 'recovery_pending';
  }
}
export type CustomerCreate = { operationId: string; fullName: string; email: string | null; phone: string | null; source?: Customer['source']; scope?: ContactScope; lastServiceId?: string; amountPaidCents?: number; paymentMethod?: Customer['paymentMethod'] };

/** Mismo servicio para lista, ficha y formularios; operación y revisión las aporta su intención. */
export function createCustomerService(client: CoreContactService) {
  const accepted = (intent: ContactIntent): ContactView => {
    if (intent.state !== 'accepted' || !intent.result) throw new CustomerOperationError(intent);
    return intent.result;
  };
  return {
    client,
    async listBundle(query: { search?: string; archived?: 'active' | 'archived' | 'all' } = {}) {
      const result = await client.bundle(query);
      return { customers: result.items.map(row => contactToCustomer(row, result.capabilities)), capabilities: result.capabilities };
    },
    async listCustomers(): Promise<Customer[]> { return (await this.listBundle()).customers; },
    async searchCustomers(search: string): Promise<Customer[]> { return (await this.listBundle({ search })).customers; },
    async getCustomer(key: string): Promise<Customer> { const result = await client.getBundle(key); return contactToCustomer(result.item, result.capabilities); },
    async prepareCreate(params: CustomerCreate): Promise<ContactIntent> {
      if (params.amountPaidCents !== undefined || params.paymentMethod !== undefined) throw new ContactRequestError(422, 'contact_use_reg');
      return client.prepare({ operationId: params.operationId, action: 'create', fields: { fullName: params.fullName, email: params.email || null, phone: params.phone || null, channel: params.source ?? 'manual' } }, params.scope);
    },
    async createCustomer(params: CustomerCreate): Promise<string> {
      if (params.amountPaidCents !== undefined || params.paymentMethod !== undefined) throw new ContactRequestError(422, 'contact_use_reg');
      const result = await client.execute({ operationId: params.operationId, action: 'create', fields: { fullName: params.fullName, email: params.email || null, phone: params.phone || null, channel: params.source ?? 'manual' } }, params.scope);
      return accepted(result).key;
    },
    /** Compatibilidad del call-site legacy; ya no busca ni fusiona por canal. */
    async upsertByEmail(params: CustomerCreate): Promise<string> { return this.createCustomer(params); },
    async updateCustomer(customer: Customer, updates: Partial<ContactFields>, operationId: string): Promise<Customer> {
      if (!customer.core) throw new ContactRequestError(409, 'contact_reload_required');
      const result = await client.execute({ operationId, action: 'update', key: customer.id, expectedRevision: customer.core.revision, expectedVersion: customer.core.version, fields: updates }, customer.core.scope);
      accepted(result);
      // La vista confirmada se vuelve a obtener con capacidades actuales para el consumidor.
      const current = await client.getBundle(customer.id);
      if (JSON.stringify(current.capabilities.scope) !== JSON.stringify(customer.core.scope)) throw new ContactRequestError(409, 'contact_policy_changed');
      return contactToCustomer(current.item, current.capabilities);
    },
    exportSelected: (keys: string[]) => client.exportSelected(keys),
    export: (query: { search?: string; archived?: 'active' | 'archived' | 'all' } = {}) => client.export(query),
  };
}
export const customerService = createCustomerService(coreContacts);

/** Cada consumidor descarta sus capturas al cambiar identidad o al rechazar el servidor. */
export function subscribeContactIdentity(listener: () => void): () => void {
  const offClient = coreContacts.subscribe(listener);
  let identity = auth?.currentUser;
  const offAuth = auth ? onIdTokenChanged(auth, user => { if (user !== identity) { identity = user; coreContacts.invalidate(); } }) : () => {};
  return () => { offClient(); offAuth(); };
}
