import assert from 'node:assert/strict';
import type { Firestore } from 'firebase-admin/firestore';

const collections=['admin_users','reg_legacy_fence','reg_control','reg_operations','reg_agreements','reg_allocations','reg_methods','reg_grants','reg_evidence_links','reg_events','reg_commands'];
/** Segundo oráculo: lectura de documentos, sin importar reducer, validaciones ni proyección de REG. */
export async function readRecoveryData(db:Firestore){
  const data:Record<string,{id:string;value:Record<string,any>}[]>={};
  for(const name of collections){const snapshot=await db.collection(name).get();data[name]=snapshot.docs.map(doc=>({id:doc.id,value:doc.data()})).sort((a,b)=>a.id.localeCompare(b.id));}
  const operations=data.reg_operations.map(row=>row.value),events=data.reg_events.map(row=>row.value),commands=data.reg_commands.map(row=>row.value);
  const amounts=new Map<string,bigint>(),latest=new Map<string,Record<string,any>>();
  for(const event of [...events].sort((a,b)=>a.commitRevision-b.commitRevision))if(event.aggregateKind==='operations')latest.set(JSON.stringify([event.clientId,event.environment,event.aggregateId]),event.after);
  for(const operation of operations){
    assert.deepEqual(latest.get(JSON.stringify([operation.clientId,operation.environment,operation.id])),operation);
    if(operation.state==='received_declared'||operation.state==='refund_declared'){
      assert.match(operation.money.amountMinor,/^\d+$/);const unit=JSON.stringify([operation.clientId,operation.money.currency,operation.money.scale]);amounts.set(unit,(amounts.get(unit)??0n)+BigInt(operation.money.amountMinor)*(operation.kind==='refund'?-1n:1n));
    }
  }
  for(const command of commands)for(const id of command.eventIds)assert.equal(events.filter(event=>event.commandId===command.commandId&&event.id===id&&event.actor.uid===command.actor.uid).length,1);
  return{data,counts:Object.fromEntries(collections.map(name=>[name,data[name].length])),totals:Object.fromEntries([...amounts].sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>[key,String(value)]))};
}
