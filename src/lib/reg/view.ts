import type { Agreement, Projection, Event } from './types.js';
import type { LegacyMoneyRow } from './legacy-view.js';
import { inRegPeriod } from './totals.js';

export function agreementBalance(agreement:Agreement):{pendingMinor:string|null;creditMinor:string|null}{
  if(!agreement.money)return{pendingMinor:null,creditMinor:null};
  const balance=BigInt(agreement.money.amountMinor)-BigInt(agreement.allocatedMinor);
  return{pendingMinor:String(balance>0n?balance:0n),creditMinor:String(balance<0n?-balance:0n)};
}
const csvCell=(v:unknown)=>{const s=String(v??'');return'"'+(/^[=+@\t\r]/.test(s)?"'":"")+s.replaceAll('"','""')+'"';};
const csvRow=(row:unknown[])=>row.map(csvCell).join(',');
export function appendLegacyCsv(csv:string,legacy:LegacyMoneyRow[],complete=true):string{
  const limitation='No confirmed monetary date or combined REG total'+(complete?'':'; historical source unavailable or loading; retained rows incomplete');
  const rows=legacy.map(row=>'\r\n'+csvRow(['legacy',row.source?.projectId,row.source?.databaseId,row.source?.collection,row.source?.documentId,'','','','','',row.raw.paymentMethod,'','legacy','historical','',row.raw.providerSessionId??row.raw.stripeSessionId,'','',JSON.stringify(row.raw),row.unknown.join('|'),'','','','','legacy_unlinked','true','','','',limitation])).join('');
  return csv+rows+(complete?'':'\r\n'+csvRow(['coverage','','','','','','','','','','','','legacy_source_incomplete','','','','','','','','','','','','partial','true','','','',limitation]));
}
export function regCsv(projection:Projection,events:Event[]=[],eventDocumentId:(event:Event)=>string=()=>''):string{
  const rows:unknown[][]=[['type','projectId','databaseId','collection','documentId','operationId','revision','amountMinor','currency','scale','method','effectiveAt','state','origin','author','evidence','authority','cutRevision','raw','unknown','eventId','commandId','reason','recordedAt']];
  rows[0].push('coverage','excludedFromTotal','unknownCount','periodFrom','periodTo','limitations');
  const limits=projection.coverage==='complete'?'Operator declarations; no bank verification; legacy not combined':'Partial data; no complete balance; unresolved: '+(projection.reconciliation.unresolved??[]).join('|');
  const meta=(excluded:boolean)=>[projection.coverage,String(excluded),projection.unknown,projection.period?.from,projection.period?.to,limits];
  const visible=projection.operations.filter(op=>inRegPeriod(op,projection.period));
  const selected=new Set(visible.map(op=>op.id));
  for(const op of visible)rows.push([op.kind,projection.source.projectId,projection.source.databaseId,'reg_operations',op.physicalId,op.id,op.revision,op.money?.amountMinor,op.money?.currency,op.money?.scale,op.method?.label,op.effective?.instant,op.state,op.origin,op.authoredBy.uid,op.evidence.reference||op.evidence.attachmentState,projection.authorityId,projection.cutRevision,op.raw,[...(!op.money?['amount','currency','scale']:[]),...(!op.effective?['effectiveDate']:[])].join('|'),'','','',op.recordedAt,...meta(projection.reconciliation.excluded.includes(op.id))]);
  for(const event of events){if(event.aggregateKind==='operations'&&!selected.has(event.aggregateId))continue;rows.push(['event',projection.source.projectId,projection.source.databaseId,'reg_events',eventDocumentId(event),event.aggregateId,event.beforeRevision+1,'','','','','','audit','operator_declaration',event.actor.uid,'',projection.authorityId,projection.cutRevision,JSON.stringify(event.after),eventDocumentId(event)?'':'physicalDocumentId',event.id,event.commandId,event.reason,event.recordedAt,...meta(projection.reconciliation.excluded.includes(event.aggregateId))]);}
  if(rows.length===1)rows.push(['coverage',projection.source.projectId,projection.source.databaseId,'','','','','','','','','','empty_or_unavailable','','','',projection.authorityId,projection.cutRevision,'','','','','','',...meta(false)]);
  return rows.map(csvRow).join('\r\n');
}
