import { RegError, type Command, type CommandType, type Evidence, type Link } from './types.js';
const TYPES: CommandType[]=['receipt.create','receipt.correct','refund.create','refund.correct','agreement.put','allocation.put','method.put','grant.put','evidence.put','control.mode'];
export function object(value: unknown): Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw new RegError(400,'reg.object_invalid');return value as Record<string,unknown>;}
export function text(value: unknown,max=1000,empty=false): string{if(typeof value!=='string'||value.length>max||(!empty&&!value.trim()))throw new RegError(400,'reg.text_invalid');return value;}
export function id(value: unknown): string{const s=text(value,128);if(!/^[a-zA-Z0-9_-]+$/.test(s))throw new RegError(400,'reg.id_invalid');return s;}
export function canonical(value: unknown): string{
  if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
  if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
  if(Array.isArray(value))return'['+value.map(canonical).join(',')+']';
  const o=object(value);return'{'+Object.keys(o).sort().map(k=>JSON.stringify(k)+':'+canonical(o[k])).join(',')+'}';
}
export function command(value: unknown): Command{
  const v=object(value);
  if(Object.keys(v).sort().join(',')!=='commandId,epoch,expectedRevisions,operationId,payload,schemaVersion,type'||v.schemaVersion!==1||!Number.isSafeInteger(v.epoch)||!TYPES.includes(v.type as CommandType))throw new RegError(400,'reg.command_invalid');
  id(v.commandId);if(v.operationId!==null)id(v.operationId);
  const revs=object(v.expectedRevisions);for(const [k,n]of Object.entries(revs))if(!/^[a-z_]+:[a-zA-Z0-9_-]+$/.test(k)||!Number.isSafeInteger(n)||(n as number)<0)throw new RegError(400,'reg.revision_invalid');
  object(v.payload);if(new TextEncoder().encode(canonical(v)).length>128*1024)throw new RegError(413,'reg.payload_limit');
  return v as unknown as Command;
}
export function evidence(value: unknown): Evidence{
  const v=object(value);if(v.kind!=='operator_declaration'||!['none_declared','reference_declared'].includes(v.attachmentState as string))throw new RegError(400,'reg.evidence_invalid');
  const note=text(v.note,2000,true),reference=text(v.reference,500,true);
  if(v.attachmentState==='reference_declared'&&!reference.trim())throw new RegError(400,'reg.reference_required');
  return{kind:'operator_declaration',attachmentState:v.attachmentState as Evidence['attachmentState'],note,reference};
}
export function links(value: unknown): Link[]{
  if(!Array.isArray(value)||value.length>10)throw new RegError(400,'reg.links_invalid');
  return value.map(x=>{
    const v=object(x);
    if(!['customer','appointment'].includes(v.kind as string)||!['confirmed','historical_reference'].includes(v.state as string))throw new RegError(400,'reg.link_invalid');
    if('contactKey' in v){
      if(Object.keys(v).sort().join(',')!=='contactKey,kind,objectId,state'||v.kind!=='customer'||typeof v.contactKey!=='string'||!/^c2_[A-Za-z0-9_-]{43}$/.test(v.contactKey)||v.objectId!==v.contactKey)throw new RegError(400,'reg.link_invalid');
      return{kind:'customer',contactKey:v.contactKey,objectId:v.contactKey,state:v.state} as Link;
    }
    const s=object(v.sourceIdentity);
    for(const key of ['projectId','databaseId','collection','documentId'])text(s[key],250);
    if(s.collection!==(v.kind==='customer'?'customers':'appointments')||v.objectId!==s.documentId||String(s.documentId).includes('/'))throw new RegError(400,'reg.link_invalid');
    return{sourceIdentity:s as unknown as NonNullable<Link['sourceIdentity']>,objectId:v.objectId as string,kind:v.kind as Link['kind'],state:v.state as Link['state']};
  });
}
