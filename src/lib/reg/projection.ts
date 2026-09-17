import { own } from './permissions.js';
import type { Actor, Agreement, Allocation, Entity, EvidenceLink, Method, Operation, Projection } from './types.js';
import { readEvents } from './store.js';
import { physicalId, type RegContext } from './authority.js';
import { inRegPeriod, regTotals } from './totals.js';
import { reconcileEvidence } from './reconciliation.js';

/** Vista a una revisión estable: sólo la última versión de cada agregado cuenta. */
export async function projectReg(ctx:RegContext,actor:Actor,options:{cutRevision?:number;pageSize?:number;from?:string;to?:string;cap?:'read'|'export'}={}):Promise<Projection>{
  const {events,control,grant,cutRevision}=await readEvents(ctx,actor,options),state=new Map<string,Entity>();
  for(const event of events)if(event.aggregateKind!=='control')state.set(event.aggregateKind+':'+event.aggregateId,event.after as Entity);
  const rows=<T extends Entity>(kind:string):T[]=>[...state].filter(([k])=>k.startsWith(kind+':')).map(([,v])=>v as T);
  const visible=(entity:Entity)=>{try{own(grant,entity);return true;}catch{return false;}};
  const operations=rows<Operation>('operations').filter(visible),evidence=rows<EvidenceLink>('evidence_links').filter(visible);
  const reconciliation=reconcileEvidence(operations,evidence);
  for(const operation of operations)operation.physicalId=physicalId(ctx,operation.id);
  const totals=regTotals(operations,reconciliation.excluded,options);
  return{authorityId:control.authorityId,clientId:ctx.clientId,environment:ctx.environment,actor,source:{projectId:ctx.projectId,databaseId:ctx.databaseId},schemaVersion:1,epoch:control.epoch,cutRevision,operations:operations.filter(op=>inRegPeriod(op,options)),agreements:rows<Agreement>('agreements').filter(visible),allocations:rows<Allocation>('allocations').filter(visible),methods:rows<Method>('methods'),evidence,...totals,reconciliation,coverage:reconciliation.unresolved.length?'partial':'complete',cursor:null,period:{...(options.from?{from:options.from}:{}),...(options.to?{to:options.to}:{})}};
}
export { agreementBalance, regCsv } from './view.js';
