import { CAPABILITIES, RegError, type Actor, type Allocation, type Agreement, type Base, type Capability, type Command, type Control, type Entity, type EvidenceLink, type Grant, type Kind, type Method, type Operation } from './types.js';
import { canonical, evidence, id, links, object, text } from './schema.js';
import { effectiveDate, minor, money, sameUnit } from './money.js';
import { own } from './permissions.js';
import { principalId } from './authority.js';
import { introducesEvidenceCycle } from './reconciliation.js';

export const COLLECTIONS: Kind[]=['operations','agreements','allocations','methods','grants','evidence_links'];
export type State = Map<string,Entity>;
export type Change = {kind:Kind;before:Entity|null;after:Entity};
export function capability(type: Command['type']): Capability{
  const capabilities:Record<Command['type'],Capability>={'receipt.create':'register','receipt.correct':'correct','refund.create':'refund','refund.correct':'refund','agreement.put':'agreements','allocation.put':'allocate','method.put':'methods','grant.put':'grants','evidence.put':'evidence','control.mode':'grants'};
  return capabilities[type];
}
function rows<T extends Entity>(state:State,kind:Kind):T[]{return [...state].filter(([key])=>key.startsWith(kind+':')).map(([,v])=>v as T);}
export function get<T extends Entity>(state:State,kind:Kind,identifier:string):T{
  const v=state.get(kind+':'+identifier);if(!v)throw new RegError(404,'reg.not_found');return v as T;
}

/** Calcula cambios completos en memoria. El store los confirma juntos o no escribe nada. */
export function applyCommand(state:State,control:Control,grant:Grant,actor:Actor,cmd:Command,now:string):{changes:Change[];control:Control}{
  const original=new Map(state);
  const changes=new Map<string,Change>(),p=cmd.payload;
  const base=(identifier:string,old?:Base):Base=>({id:identifier,clientId:control.clientId,environment:control.environment,purpose:'merchant_customer_money',schemaVersion:1,revision:(old?.revision??0)+1,authoredBy:old?.authoredBy??actor,recordedAt:now});
  const put=(kind:Kind,identifier:string,data:Entity,check=true)=>{
    const key=kind+':'+identifier,old=changes.has(key)?changes.get(key)!.before:state.get(key)??null;
    if(check){if(cmd.expectedRevisions[key]!== (old?.revision??0))throw new RegError(409,'reg.revision_conflict');if(old)own(grant,old);}
    const after={...data,...base(identifier,old??undefined)} as Entity;
    state.set(key,after);changes.set(key,{kind,before:old,after});
  };
  const allowed=(keys:string[])=>{if(Object.keys(p).some(k=>!keys.includes(k)))throw new RegError(400,'reg.payload_field');};
  const requireCap=(cap:Capability)=>{if(!grant.capabilities.includes(cap))throw new RegError(403,'reg.forbidden');};
  const buildOperation=(old:Operation|null,kind:'receipt'|'refund',identifier:string,payload:Record<string,unknown>):Operation=>{
    const stateValue=payload.state;
    const states=kind==='receipt'?['pending','pending_normalization','received_declared','void','review']:['refund_pending','refund_declared','rejected','void'];
    if(!states.includes(String(stateValue)))throw new RegError(400,'reg.state_invalid');
    const incomplete=stateValue==='pending_normalization';
    const m=incomplete?null:money(payload.money,control.currencies);
    const methodId=payload.methodId===null?null:id(payload.methodId);
    const method=methodId?get<Method>(state,'methods',methodId):null;
    if(!incomplete&&!method)throw new RegError(400,'reg.method_required');
    if(method&&m&&!method.currencies.includes(m.currency))throw new RegError(422,'reg.method_currency');
    if(method?.state==='suspended'&&(!old||old.method?.id!==method.id)&&kind==='receipt')throw new RegError(409,'reg.method_suspended');
    const savedMethod=old?.method&&method&&old.method.id===method.id?old.method:method;
    let distribution:Operation['distribution']=null;
    if(kind==='refund'){
      const d=object(payload.distribution);
      if(Object.keys(d).some(k=>!['unallocatedMinor','allocations'].includes(k))||!Array.isArray(d.allocations)||d.allocations.length>50)throw new RegError(400,'reg.distribution_invalid');
      const seen=new Set<string>();
      distribution={unallocatedMinor:minor(d.unallocatedMinor,true),allocations:d.allocations.map(v=>{const row=object(v),allocationId=id(row.allocationId);if(seen.has(allocationId))throw new RegError(400,'reg.distribution_duplicate');seen.add(allocationId);return{allocationId,amountMinor:minor(row.amountMinor)};})};
      const sum=distribution.allocations.reduce((n,v)=>n+BigInt(v.amountMinor),BigInt(distribution.unallocatedMinor));
      if(!m||sum!==BigInt(m.amountMinor))throw new RegError(409,'reg.distribution_sum');
    }
    return{...base(identifier,old??undefined),kind,parentReceiptId:kind==='refund'?id(payload.parentReceiptId):null,state:stateValue as Operation['state'],money:m,raw:text(payload.raw??'',2000,!incomplete),method:savedMethod,distribution,
      effective:incomplete&&payload.effective===null?null:effectiveDate(payload.effective,now,['pending','refund_pending','review'].includes(String(stateValue))),
      evidence:evidence(payload.evidence),links:links(payload.links??[]),description:text(payload.description??'',1000,true),origin:'operator_declaration',allocatedMinor:old?.allocatedMinor??'0',refundedMinor:old?.refundedMinor??'0',reservedMinor:old?.reservedMinor??'0',latestEventId:old?.latestEventId??''};
  };
  const allocation=(payload:Record<string,unknown>)=>{
    const identifier=id(payload.aggregateId),old=state.get('allocations:'+identifier) as Allocation|undefined;
    const receipt=get<Operation>(state,'operations',id(payload.receiptId)),agreement=get<Agreement>(state,'agreements',id(payload.agreementId));
    own(grant,receipt);own(grant,agreement);
    const release=payload.state==='released';
    if(receipt.kind!=='receipt'||!release&&(receipt.state!=='received_declared'||!receipt.money))throw new RegError(409,'reg.receipt_not_available');
    const m=money(payload.money,control.currencies);
    if(release){
      if(!old||old.receiptId!==receipt.id||old.agreementId!==agreement.id||canonical(old.money)!==canonical(m))throw new RegError(409,'reg.release_identity');
    }else if(!sameUnit(receipt.money!,m)||!sameUnit(agreement,m))throw new RegError(409,'reg.unit_mismatch');
    if(!['active','released'].includes(String(payload.state)))throw new RegError(400,'reg.allocation_state');
    if(payload.agreementRevision!==agreement.revision)throw new RegError(409,'reg.agreement_changed');
    put('allocations',identifier,{...base(identifier,old),receiptId:receipt.id,agreementId:agreement.id,agreementRevision:agreement.revision,money:m,state:payload.state as Allocation['state']});
  };
  switch(cmd.type){
    case 'receipt.create':case 'receipt.correct':case 'refund.create':case 'refund.correct':{
      allowed(['state','money','methodId','effective','evidence','links','description','raw','reason','parentReceiptId','allocations','corrections','distribution']);
      const identifier=id(cmd.operationId),old=state.get('operations:'+identifier) as Operation|undefined,create=cmd.type.endsWith('.create'),kind=cmd.type.startsWith('receipt')?'receipt':'refund';
      if(create&&old)throw new RegError(409,'reg.operation_exists');if(!create&&!old)throw new RegError(404,'reg.not_found');
      if(old&&old.kind!==kind)throw new RegError(409,'reg.kind_immutable');
      if(!create)text(p.reason,1000);
      if(kind==='refund'){
        const parent=get<Operation>(state,'operations',id(p.parentReceiptId));own(grant,parent);
        if(parent.kind!=='receipt'||parent.state!=='received_declared'||!parent.money)throw new RegError(409,'reg.parent_invalid');
        if(old&&old.parentReceiptId!==parent.id)throw new RegError(409,'reg.parent_immutable');
      }
      put('operations',identifier,buildOperation(old??null,kind,identifier,p));
      const extra=p.corrections??[],allocs=p.allocations??[];
      if(!Array.isArray(extra)||!Array.isArray(allocs)||extra.length+allocs.length>50)throw new RegError(413,'reg.dependents_limit');
      for(const value of extra){requireCap('correct');const v=object(value),other=get<Operation>(state,'operations',id(v.operationId));own(grant,other);text(v.reason,1000);
        if(other.id===identifier)throw new RegError(400,'reg.repeated_target');
        if(other.kind==='refund'){requireCap('refund');if(v.parentReceiptId!==other.parentReceiptId)throw new RegError(409,'reg.parent_immutable');}
        put('operations',other.id,buildOperation(other,other.kind,other.id,v));}
      if(allocs.length)requireCap('allocate');for(const value of allocs)allocation(object(value));
      break;
    }
    case 'allocation.put':allowed(['aggregateId','receiptId','agreementId','agreementRevision','money','state','reason']);allocation(p);break;
    case 'agreement.put':{
      allowed(['aggregateId','money','currency','scale','description','links','reason']);const identifier=id(p.aggregateId),old=state.get('agreements:'+identifier) as Agreement|undefined;if(old)text(p.reason,1000);
      const unit=money({amountMinor:'0',currency:p.currency,scale:p.scale},control.currencies,true),total=p.money===null?null:money(p.money,control.currencies,true);
      if(total&&!sameUnit(unit,total))throw new RegError(409,'reg.unit_mismatch');
      put('agreements',identifier,{...base(identifier,old),money:total,currency:unit.currency,scale:unit.scale,description:text(p.description,1000),links:links(p.links??[]),allocatedMinor:old?.allocatedMinor??'0'});break;
    }
    case 'method.put':{
      allowed(['aggregateId','label','translations','state','currencies','provider','reason']);const identifier=id(p.aggregateId),old=state.get('methods:'+identifier) as Method|undefined;
      if(!['enabled','suspended'].includes(String(p.state))||!Array.isArray(p.currencies)||!p.currencies.length||p.currencies.some(x=>typeof x!=='string'||!Object.hasOwn(control.currencies,x)))throw new RegError(400,'reg.method_invalid');
      const translations=object(p.translations);for(const [key,value]of Object.entries(translations)){if(!['he','en','ar','ru'].includes(key))throw new RegError(400,'reg.language_invalid');text(value,120);}
      put('methods',identifier,{...base(identifier,old),label:text(p.label,120),translations:translations as Record<string,string>,state:p.state as Method['state'],currencies:p.currencies as string[],provider:text(p.provider??'',120,true)});break;
    }
    case 'grant.put':{
      allowed(['issuer','uid','email','role','state','scope','capabilities','membershipVersion','reason']);if(grant.role!=='owner')throw new RegError(403,'reg.owner_required');
      const issuer=text(p.issuer,250),uid=text(p.uid,128),identifier=principalId({issuer,uid}),old=state.get('grants:'+identifier) as Grant|undefined;
      if(issuer!==actor.issuer||!['owner','manager','staff'].includes(String(p.role))||!['active','revoked'].includes(String(p.state))||!['own','all'].includes(String(p.scope))||!Array.isArray(p.capabilities)||p.capabilities.some(x=>!CAPABILITIES.includes(x as Capability)))throw new RegError(400,'reg.grant_invalid');
      if(uid===actor.uid&&(p.state!=='active'||!(p.capabilities as string[]).includes('grants')||!(p.capabilities as string[]).includes('read')))throw new RegError(409,'reg.self_revoke');
      put('grants',identifier,{...base(identifier,old),issuer,uid,email:text(p.email,250).toLowerCase(),role:p.role as Grant['role'],state:p.state as Grant['state'],scope:p.scope as Grant['scope'],capabilities:p.capabilities as Capability[],membershipVersion:text(p.membershipVersion,2000),epoch:control.epoch});break;
    }
    case 'evidence.put':{
      allowed(['aggregateId','receiptId','identity','description','sourceCut','state','relatedIds','aggregate','reason']);const identifier=id(p.aggregateId),old=state.get('evidence_links:'+identifier) as EvidenceLink|undefined;
      const op=get<Operation>(state,'operations',id(p.receiptId));own(grant,op);
      const external=object(p.identity);
      if(external.clientId!==control.clientId||external.purpose!=='merchant_customer_money'||external.environment!==control.environment||Object.keys(external).some(k=>!['clientId','purpose','environment','provider','account','externalId','type'].includes(k)))throw new RegError(400,'reg.evidence_identity');
      for(const k of ['provider','account','externalId','type'])text(external[k],150);
      const identity=canonical(external);if(!['declared','review'].includes(String(p.state))||!Array.isArray(p.relatedIds)||p.relatedIds.length>50||typeof p.aggregate!=='boolean')throw new RegError(400,'reg.evidence_link_invalid');
      for(const other of rows<EvidenceLink>(state,'evidence_links'))if(other.identity===identity&&other.id!==identifier)throw new RegError(409,'reg.evidence_duplicate');
      for(const target of p.relatedIds){const related=get<Operation>(state,'operations',id(target));own(grant,related);if(related.id===op.id)throw new RegError(400,'reg.evidence_self');}
      put('evidence_links',identifier,{...base(identifier,old),receiptId:op.id,identity,description:text(p.description,1000,true),sourceCut:text(p.sourceCut,1000),state:p.state as EvidenceLink['state'],relatedIds:p.relatedIds as string[],aggregate:p.aggregate});break;
    }
    case 'control.mode':allowed(['mode','reason']);if(grant.role!=='owner')throw new RegError(403,'reg.owner_required');text(p.reason,1000);if(!['read_only','disabled'].includes(String(p.mode)))throw new RegError(400,'reg.mode_invalid');control={...control,mode:p.mode as Control['mode']};break;
  }

  if(cmd.type==='evidence.put'&&introducesEvidenceCycle(rows<EvidenceLink>(original,'evidence_links'),rows<EvidenceLink>(state,'evidence_links')))throw new RegError(409,'reg.evidence_cycle');
  // Las proyecciones de disponibilidad se recalculan; los eventos no son ingresos nuevos.
  const operations=rows<Operation>(state,'operations'),allocations=rows<Allocation>(state,'allocations');
  // El operador decide de qué asignaciones sale cada devolución; la transacción verifica ese reparto.
  const releaseDelta=new Map<string,bigint>();
  for(const change of changes.values())if(change.kind==='operations'){
    for(const [operation,sign] of [[change.before,-1n],[change.after,1n]] as const){
      const refund=operation as Operation|null;
      if(refund?.kind==='refund'&&refund.state==='refund_declared')for(const part of refund.distribution!.allocations)releaseDelta.set(part.allocationId,(releaseDelta.get(part.allocationId)??0n)+sign*BigInt(part.amountMinor));
    }
  }
  for(const [identifier,delta]of releaseDelta){
    if(delta===0n)continue;
    const before=original.get('allocations:'+identifier) as Allocation|undefined,after=state.get('allocations:'+identifier) as Allocation|undefined;
    const amount=(v:Allocation|undefined)=>v?.state==='active'?BigInt(v.money.amountMinor):0n;
    if(!changes.has('allocations:'+identifier)||amount(before)-amount(after)!==delta)throw new RegError(409,'reg.distribution_release_required');
  }
  for(const receipt of operations.filter(o=>o.kind==='receipt')){
    let allocated=0n,refunded=0n,reserved=0n,reservedUnallocated=0n;
    const reservedAllocations=new Map<string,bigint>();
    for(const refund of operations.filter(o=>o.parentReceiptId===receipt.id&&['refund_declared','refund_pending'].includes(o.state))){
      if(receipt.state!=='received_declared'||!receipt.money||!refund.money||!sameUnit(receipt.money,refund.money))throw new RegError(409,'reg.refund_invariant');
      if(refund.state==='refund_declared')refunded+=BigInt(refund.money.amountMinor);else reserved+=BigInt(refund.money.amountMinor);
      if(!refund.distribution)throw new RegError(409,'reg.distribution_invalid');
      if(refund.state==='refund_pending')reservedUnallocated+=BigInt(refund.distribution.unallocatedMinor);
      for(const part of refund.distribution.allocations){
        const target=get<Allocation>(state,'allocations',part.allocationId);
        if(target.receiptId!==receipt.id)throw new RegError(409,'reg.distribution_parent');
        if(refund.state==='refund_pending')reservedAllocations.set(target.id,(reservedAllocations.get(target.id)??0n)+BigInt(part.amountMinor));
      }
    }
    for(const allocation of allocations.filter(o=>o.receiptId===receipt.id&&o.state==='active')){
      if(receipt.state!=='received_declared'||!receipt.money||!sameUnit(receipt.money,allocation.money))throw new RegError(409,'reg.allocation_invariant');allocated+=BigInt(allocation.money.amountMinor);
    }
    const total=receipt.state==='received_declared'&&receipt.money?BigInt(receipt.money.amountMinor):0n;
    if(refunded+reserved>total||allocated+refunded+reservedUnallocated>total)throw new RegError(409,'reg.insufficient_amount');
    for(const [identifier,amount]of reservedAllocations){const target=get<Allocation>(state,'allocations',identifier);if(target.state!=='active'||amount>BigInt(target.money.amountMinor))throw new RegError(409,'reg.insufficient_reservation');}
    if(receipt.allocatedMinor!==String(allocated)||receipt.refundedMinor!==String(refunded)||receipt.reservedMinor!==String(reserved))put('operations',receipt.id,{...receipt,allocatedMinor:String(allocated),refundedMinor:String(refunded),reservedMinor:String(reserved)},!changes.has('operations:'+receipt.id));
  }
  for(const agreement of rows<Agreement>(state,'agreements')){
    let sum=0n;for(const v of allocations.filter(x=>x.agreementId===agreement.id&&x.state==='active')){
      if(!sameUnit(agreement,v.money))throw new RegError(409,'reg.agreement_unit');sum+=BigInt(v.money.amountMinor);
    }
    if(agreement.allocatedMinor!==String(sum))put('agreements',agreement.id,{...agreement,allocatedMinor:String(sum)},!changes.has('agreements:'+agreement.id));
  }
  return{changes:[...changes.values()],control};
}
