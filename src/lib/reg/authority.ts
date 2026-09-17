import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { RegError, type Actor, type Control } from './types.js';
import { canonical } from './schema.js';
export interface RegContext {
  enabled: boolean; clientId: string; environment: string; authorityId: string;
  projectId: string; databaseId: string; issuer: string;
  loadDb: ()=>Promise<Firestore|null>;
  now?: ()=>string;
  cursorKey?: string;
  /** Autoridad de contactos atribuida por el runtime; no concede capacidades REG. */
  contactLinks?: { prepare: (actor: Actor, key: string, db: Firestore, tx: Transaction) => Promise<() => Promise<void>> };
}
export function physicalId(ctx: Pick<RegContext,'clientId'|'environment'>,id: string): string {
  return Buffer.from(JSON.stringify([ctx.clientId,ctx.environment,id]),'utf8').toString('base64url');
}
export function principalId(actor: Pick<Actor,'issuer'|'uid'>): string {return Buffer.from(JSON.stringify([actor.issuer,actor.uid])).toString('base64url');}
export function membershipVersion(data: Record<string,unknown>): string {
  const legacy={clientId:data.clientId??null,role:data.role??null,invitedAt:JSON.parse(JSON.stringify(data.invitedAt??null))};
  return canonical(data.epoch===undefined?legacy:{...legacy,issuer:data.issuer,uid:data.uid,epoch:data.epoch,revision:data.revision});
}
/** La partición protegida no cae al roster legacy si falta su miembro atribuido. */
export async function moneyMemberReference(db:Firestore,tx:Transaction,clientId:string,actor:Pick<Actor,'issuer'|'email'>){
  const partition=await tx.get(db.collection('crm_operations').doc('control_'+clientId));
  if(!partition.exists)return db.collection('admin_users').doc(actor.email);
  const control=partition.data();
  if(control?.clientId!==clientId||control.schemaVersion!==2||control.state!=='ready')throw new RegError(503,'reg.membership_unavailable');
  const id='core_'+Buffer.from(JSON.stringify([clientId,actor.issuer,actor.email.trim().toLowerCase()])).toString('base64url');
  return db.collection('admin_users').doc(id);
}
export async function authority(ctx: RegContext): Promise<Firestore>{
  if(!ctx.enabled||!ctx.clientId||!ctx.environment||!ctx.authorityId||!ctx.projectId||!ctx.databaseId||!ctx.issuer)throw new RegError(503,'reg.disabled');
  const db=await ctx.loadDb();if(!db||(db as Firestore & {readonly projectId:string}).projectId!==ctx.projectId||db.databaseId!==ctx.databaseId)throw new RegError(503,'reg.source_unavailable');
  return db;
}
export function fence(ctx: RegContext,value: unknown,write: boolean,epoch?: number): Control{
  const c=value as Control|undefined;
  if(!c||c.clientId!==ctx.clientId||c.environment!==ctx.environment||c.authorityId!==ctx.authorityId||c.schemaVersion!==1||c.minClientVersion>1||c.mode==='disabled'||!['ready','read_only'].includes(c.mode))throw new RegError(503,'reg.authority_unavailable');
  if(write&&c.mode!=='ready')throw new RegError(409,'reg.read_only');
  if(epoch!==undefined&&epoch!==c.epoch)throw new RegError(409,'reg.epoch_changed');
  if(!Number.isSafeInteger(c.dataRevision)||c.dataRevision<0||!Number.isSafeInteger(c.epoch)||c.epoch<1||!Number.isSafeInteger(c.minClientVersion)||c.minClientVersion<1)throw new RegError(503,'reg.control_invalid');
  return c;
}
