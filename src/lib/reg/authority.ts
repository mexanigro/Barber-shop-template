import type { Firestore } from 'firebase-admin/firestore';
import { RegError, type Actor, type Control } from './types.js';
import { canonical } from './schema.js';
export interface RegContext {
  enabled: boolean; clientId: string; environment: string; authorityId: string;
  projectId: string; databaseId: string; issuer: string;
  loadDb: ()=>Promise<Firestore|null>;
  now?: ()=>string;
  cursorKey?: string;
}
export function physicalId(ctx: Pick<RegContext,'clientId'|'environment'>,id: string): string {
  return Buffer.from(JSON.stringify([ctx.clientId,ctx.environment,id]),'utf8').toString('base64url');
}
export function principalId(actor: Pick<Actor,'issuer'|'uid'>): string {return Buffer.from(JSON.stringify([actor.issuer,actor.uid])).toString('base64url');}
export function membershipVersion(data: Record<string,unknown>): string {return canonical({clientId:data.clientId??null,role:data.role??null,invitedAt:JSON.parse(JSON.stringify(data.invitedAt??null))});}
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
