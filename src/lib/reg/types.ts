/** Contrato REG: declaraciones del comercio, nunca confirmación de un proveedor. */
export type Money = { amountMinor: string; currency: string; scale: number };
export type Actor = { issuer: string; uid: string; email: string };
export type Capability = 'read' | 'export' | 'register' | 'allocate' | 'correct' | 'refund' | 'evidence' | 'agreements' | 'methods' | 'grants';
export const CAPABILITIES: readonly Capability[] = ['read','export','register','allocate','correct','refund','evidence','agreements','methods','grants'];
export type Kind = 'operations' | 'agreements' | 'allocations' | 'methods' | 'grants' | 'evidence_links';
export type Source = { projectId: string; databaseId: string; collection: string; documentId: string };
export type PhysicalLink = { sourceIdentity: Source; objectId: string; kind: 'customer' | 'appointment'; state: 'confirmed' | 'historical_reference'; contactKey?: never };
export type ContactLink = { kind: 'customer'; contactKey: string; objectId: string; state: 'confirmed' | 'historical_reference'; sourceIdentity?: never };
export type Link = PhysicalLink | ContactLink;
export type EffectiveDate = { instant: string; local: string; zone: string; offset: string };
export type Evidence = { kind: 'operator_declaration'; attachmentState: 'none_declared' | 'reference_declared'; note: string; reference: string };
export type Base = { id: string; clientId: string; environment: string; purpose: 'merchant_customer_money'; schemaVersion: 1; revision: number; authoredBy: Actor; recordedAt: string };
export type Method = Base & { label: string; translations: Record<string,string>; state: 'enabled'|'suspended'; currencies: string[]; provider: string };
export type Operation = Base & {
  kind: 'receipt'|'refund'; parentReceiptId: string|null;
  state: 'pending'|'pending_normalization'|'received_declared'|'refund_pending'|'refund_declared'|'rejected'|'void'|'review';
  money: Money|null; raw: string; method: Method|null; effective: EffectiveDate|null;
  evidence: Evidence; links: Link[]; description: string; origin: 'operator_declaration';
  allocatedMinor: string; refundedMinor: string; reservedMinor: string; latestEventId: string;
  distribution: { unallocatedMinor: string; allocations: { allocationId: string; amountMinor: string }[] }|null;
  physicalId?: string;
};
export type Agreement = Base & { money: Money|null; currency: string; scale: number; description: string; links: Link[]; allocatedMinor: string };
export type Allocation = Base & { receiptId: string; agreementId: string; agreementRevision: number; money: Money; state: 'active'|'released' };
export type Grant = Base & { issuer: string; uid: string; email: string; role: 'owner'|'manager'|'staff'; state: 'active'|'revoked'; capabilities: Capability[]; scope: 'own'|'all'; membershipVersion: string; epoch: number };
export type EvidenceLink = Base & { receiptId: string; identity: string; description: string; sourceCut: string; state: 'declared'|'review'; relatedIds: string[]; aggregate: boolean };
export type Entity = Operation|Agreement|Allocation|Method|Grant|EvidenceLink;
export type Control = { clientId: string; environment: string; authorityId: string; schemaVersion: 1; epoch: number; dataRevision: number; mode: 'disabled'|'ready'|'read_only'; minClientVersion: number; currencies: Record<string,number> };
export type Event = { id: string; clientId: string; environment: string; commitRevision: number; aggregateKind: Kind|'control'; aggregateId: string; beforeRevision: number; after: Entity|Control; reason: string; actor: Actor; recordedAt: string; commandId: string };
export type CommandType = 'receipt.create'|'receipt.correct'|'refund.create'|'refund.correct'|'agreement.put'|'allocation.put'|'method.put'|'grant.put'|'evidence.put'|'control.mode';
export type Command = { schemaVersion: 1; epoch: number; commandId: string; operationId: string|null; type: CommandType; expectedRevisions: Record<string,number>; payload: Record<string,unknown> };
export type Receipt = { commandId: string; operationId: string|null; eventIds: string[]; revision: number; actor: Actor; semanticPayload: string; recordedAt: string };
export type Group = { currency: string; scale: number; grossMinor: string; refundedMinor: string; netMinor: string; receivedCount: number };
export type Projection = { authorityId: string; clientId:string; environment:string; actor:Actor; source: {projectId:string;databaseId:string}; schemaVersion: 1; epoch: number; cutRevision: number; operations: Operation[]; agreements: Agreement[]; allocations: Allocation[]; methods: Method[]; evidence: EvidenceLink[]; groups: Group[]; unknown: number; reconciliation: {review:number;excluded:string[];unresolved?:string[];support?:{operationId:string;terminalIds:string[];valid:boolean}[]}; coverage: 'complete'|'partial'|'error'; cursor: string|null; period?:{from?:string;to?:string} };
export class RegError extends Error { constructor(public status: number, public code: string) { super(code); this.name='RegError'; } }
