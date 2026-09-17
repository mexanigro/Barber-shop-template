import type { Group, Projection } from './types';

export type RegRange='7d'|'30d'|'custom'|'all';
/** Días civiles inclusivos del negocio; no utiliza la fecha de una cita. */
export function regPeriod(range:RegRange,today:string,from='',to=''):{from?:string;to?:string}|null{
  const valid=(day:string)=>/^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(Date.parse(day))&&new Date(day+'T12:00:00Z').toISOString().slice(0,10)===day;
  if(range==='all')return{};
  if(range==='custom')return valid(from)&&valid(to)&&from<=to?{from,to}:null;
  if(!valid(today))return null;
  const start=new Date(today+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-(range==='7d'?6:29));return{from:start.toISOString().slice(0,10),to:today};
}

/** Una fecha desconocida permanece visible como desconocida, sin asignarle el día de una cita. */
export function inRegPeriod(operation:Projection['operations'][number],period:{from?:string;to?:string}={}):boolean{
  const day=operation.effective?.local.slice(0,10);
  return !day||!(period.from&&day<period.from||period.to&&day>period.to);
}

/** La selección temporal conserva el corte y la cobertura; nunca consulta tarifas. */
export function regTotals(operations:Projection['operations'], excluded:readonly string[], period:{from?:string;to?:string}={}):{groups:Group[];unknown:number}{
  const groups=new Map<string,Group>();let unknown=0;
  for(const operation of operations){
    if(!inRegPeriod(operation,period))continue;
    if(excluded.includes(operation.id))continue;
    if(operation.state==='pending_normalization'||operation.state==='review'){unknown++;continue;}
    if(!['received_declared','refund_declared'].includes(operation.state))continue;
    if(!operation.money||!operation.effective){unknown++;continue;}
    const day=operation.effective.local.slice(0,10);
    if((period.from&&day<period.from)||(period.to&&day>period.to))continue;
    const {currency,scale,amountMinor}=operation.money,key=currency+':'+scale;
    const group=groups.get(key)??{currency,scale,grossMinor:'0',refundedMinor:'0',netMinor:'0',receivedCount:0};
    if(operation.kind==='receipt'){group.grossMinor=String(BigInt(group.grossMinor)+BigInt(amountMinor));group.receivedCount++;}
    else group.refundedMinor=String(BigInt(group.refundedMinor)+BigInt(amountMinor));
    group.netMinor=String(BigInt(group.grossMinor)-BigInt(group.refundedMinor));groups.set(key,group);
  }
  return{groups:[...groups.values()].sort((a,b)=>a.currency.localeCompare(b.currency)||a.scale-b.scale),unknown};
}

export function regForPeriod(projection:Projection,period:{from?:string;to?:string}):Projection{
  return{...projection,operations:projection.operations.filter(op=>inRegPeriod(op,period)),...regTotals(projection.operations,projection.reconciliation.excluded,period),period};
}
