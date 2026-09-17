import type { Firestore } from '@google-cloud/firestore';
import type { ContactRegistration } from './crm-core-handler';
import { ContactError, type ContactActor } from './crm-core-types';

export type ContactFacadeMode =
  | { kind: 'legacy' }
  | { kind: 'core'; registration: ContactRegistration };

/** Decide la vía desde el control persistido y verifica que el runtime atribuido corresponda a esa fuente. */
export async function contactFacadeMode(db: Firestore, clientId: string, registration?: ContactRegistration): Promise<ContactFacadeMode> {
  const snap = await db.collection('crm_operations').doc('control_' + clientId).get();
  if (!snap.exists) return { kind: 'legacy' };
  const data = snap.data();
  if (!data || data.clientId !== clientId || data.state !== 'ready' || data.schemaVersion !== 2) {
    throw new ContactError(503, 'contact_partition_invalid');
  }
  const ctx = registration?.context;
  const runtimeDb = db as Firestore & { readonly projectId?: string; readonly databaseId?: string };
  if (!ctx?.enabled || ctx.clientId !== clientId || ctx.canonical.projectId !== runtimeDb.projectId || ctx.canonical.databaseId !== runtimeDb.databaseId) {
    throw new ContactError(503, 'contact_runtime_unavailable');
  }
  return { kind: 'core', registration: registration! };
}

/** Selecciona un único principal configurado; nunca fabrica identidad ni amplía operaciones. */
export function contactServiceActor(registration: ContactRegistration, entryPoint: string, operation = 'create'): ContactActor {
  const matches = registration.context.servicePrincipals?.filter(principal =>
    principal.operations.includes(operation) && principal.entryPoints.includes(entryPoint),
  ) ?? [];
  const principal = matches.length === 1 ? matches[0] : undefined;
  if (!principal?.email || !principal.email.trim()) throw new ContactError(503, 'contact_service_identity_unavailable');
  return { issuer: principal.issuer, uid: principal.uid, email: principal.email.trim().toLowerCase(), kind: 'service' };
}

/**
 * Las fachadas heredadas sólo pueden tocar `customers` mientras el tenant no
 * tenga una partición Core activa. Un control presente pero incoherente cierra
 * la vía: no se interpreta como permiso para volver al SDK directo.
 */
export async function legacyContactFacadeAllowed(db: Firestore, clientId: string): Promise<boolean> {
  const snap = await db.collection('crm_operations').doc('control_' + clientId).get();
  if (!snap.exists) return true;
  const data = snap.data();
  if (!data || data.clientId !== clientId || data.state !== 'ready' || data.schemaVersion !== 2) throw new ContactError(503, 'contact_partition_invalid');
  return false;
}
