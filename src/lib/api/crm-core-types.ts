import type { Firestore } from '@google-cloud/firestore';

/** Autoridad explícita del núcleo. Ningún valor se toma de una referencia del navegador. */
export interface ContactSource {
  projectId: string;
  databaseId: string;
  loadDb: () => Promise<Firestore>;
}
export interface ContactActor {
  issuer: string;
  uid: string;
  email: string;
  kind?: 'user' | 'service';
}
export interface ContactContext {
  enabled: boolean;
  clientId: string;
  issuer: string;
  authorityId: string;
  canonical: ContactSource;
  sources: ContactSource[];
  identityKey: Buffer;
  now: () => number;
  servicePrincipals?: Array<{
    issuer: string;
    uid: string;
    /** Identidad auditable del productor servidor a servidor. */
    email?: string;
    operations: string[];
    entryPoints: string[];
    fields?: 'minimal' | 'manager';
  }>;
  /** Barrera observable del banco; nunca concede derechos ni sustituye lecturas. */
  observe?: (event: string) => void | Promise<void>;
}
export interface ContactMember {
  clientId: string;
  issuer: string;
  uid: string | null;
  email: string;
  role: 'owner' | 'manager' | 'staff';
  status: 'pending' | 'active' | 'removed';
  epoch: string;
  revision: number;
  invitedBy?: string;
  invitedAt?: string;
  acceptedAt?: string | null;
}
export interface ContactMemberCommand {
  operationId: string;
  action: 'invite' | 'accept' | 'role' | 'remove';
  email: string;
  role?: ContactMember['role'];
  expectedRevision: number;
  reason: string;
}
export type ContactIdentity = [string, string, string, 'customers', string];
export interface ContactFields {
  fullName: string;
  channel: string;
  email: string | null;
  phone: string | null;
  notes: string;
  tags: string[];
  stage: string | null;
}
export interface ContactCommand {
  operationId: string;
  action: 'create' | 'update' | 'archive' | 'restore';
  key?: string;
  expectedRevision?: number;
  expectedVersion?: string;
  fields?: Partial<ContactFields>;
  reason?: string;
  entryPoint?: string;
}
export interface ContactGrantCommand {
  operationId: string;
  action: 'grant' | 'revoke' | 'allow-create' | 'deny-create';
  key?: string;
  principal: { issuer: string; uid: string; email: string };
  expectedRevision: number;
  reason: string;
}
export interface ContactAccessView {
  member: ContactMember;
  active: boolean;
  revision: number;
}
export interface ContactView {
  key: string;
  revision: number;
  version: string;
  fullName: string;
  channel: string;
  email: string | null;
  phone: string | null;
  archived: boolean;
  // El resto pertenece exclusivamente a la proyección de owner/manager.
  notes?: string;
  tags?: string[];
  stage?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  attendance?: { count: number | null; lastAt: string | null; coverage: string };
  legacy?: boolean;
  syntheticEmail?: boolean;
  /** Valores heredados sin convertirlos en cobros ni asistencia acreditada. Sólo owner/manager. */
  legacyValues?: { source: ContactIdentity; unit: 'unknown'; attendance: 'unverified'; values: Record<string, string | number> };
}
export class ContactError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
