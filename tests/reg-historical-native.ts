import assert from 'node:assert/strict';
import type { Firestore } from 'firebase-admin/firestore';
import { physicalId, principalId, membershipVersion, type RegContext } from '../src/lib/reg/authority.js';
import { projectReg } from '../src/lib/reg/projection.js';
import { readEvents } from '../src/lib/reg/store.js';
import { CAPABILITIES, type Actor, type EvidenceLink, type Operation, type Event } from '../src/lib/reg/types.js';

/** Estado histórico circular literal en tenant aislado. No usa writer ni writer mutado para producirlo. */
export async function historicalCircular(db:Firestore,base:RegContext){
  const ctx={...base,clientId:'tenant-historical-circular'},actor:Actor={issuer:ctx.issuer,uid:'historical-owner',email:'historical@example.invalid'},now='2026-09-14T12:00:00.000Z';
  const member={clientId:ctx.clientId,role:'owner',status:'active',invitedAt:now};
  const fields={clientId:ctx.clientId,environment:ctx.environment,purpose:'merchant_customer_money' as const,schemaVersion:1 as const,revision:1,authoredBy:actor,recordedAt:now};
  const operations:Operation[]=['historical-a','historical-b'].map((id):Operation=>({...fields,id,kind:'receipt',parentReceiptId:null,state:'received_declared',money:{amountMinor:'6000',currency:'ILS',scale:2},raw:'original fixture',method:null,effective:{instant:'2026-09-13T07:00:00.000Z',local:'2026-09-13T10:00:00',zone:'Asia/Jerusalem',offset:'+03:00'},evidence:{kind:'operator_declaration',attachmentState:'none_declared',note:'Historical original',reference:''},links:[],description:id,origin:'operator_declaration',allocatedMinor:'0',refundedMinor:'0',reservedMinor:'0',latestEventId:'event-'+id,distribution:null}));
  const links:EvidenceLink[]=operations.map((op,i)=>({...fields,id:'link-'+op.id,receiptId:op.id,relatedIds:[operations[1-i].id],identity:JSON.stringify({fixture:op.id}),description:'Original circular claim',sourceCut:'historical-fixture',state:'declared',aggregate:true}));
  const events:Event[]=[...operations,...links].map((after,i)=>({id:'event-'+after.id,clientId:ctx.clientId,environment:ctx.environment,commitRevision:i+1,aggregateKind:i<2?'operations':'evidence_links',aggregateId:after.id,beforeRevision:0,after,reason:'Historical fixture, not a new REG command',actor,recordedAt:now,commandId:'historical-source-'+i}));
  const batch=db.batch();batch.set(db.collection('admin_users').doc(actor.email),member);
  batch.set(db.collection('reg_legacy_fence').doc(ctx.clientId),{authorityId:ctx.authorityId,environment:ctx.environment,epoch:1,manualMoney:'blocked'});
  batch.set(db.collection('reg_control').doc(physicalId(ctx,'control')),{clientId:ctx.clientId,environment:ctx.environment,authorityId:ctx.authorityId,schemaVersion:1,epoch:1,dataRevision:4,mode:'read_only',minClientVersion:1,currencies:{ILS:2}});
  batch.set(db.collection('reg_grants').doc(physicalId(ctx,principalId(actor))),{...fields,id:principalId(actor),...actor,role:'owner',state:'active',scope:'all',capabilities:CAPABILITIES,membershipVersion:membershipVersion(member),epoch:1});
  for(const op of operations)batch.create(db.collection('reg_operations').doc(physicalId(ctx,op.id)),op);
  for(const link of links)batch.create(db.collection('reg_evidence_links').doc(physicalId(ctx,link.id)),link);
  for(const event of events)batch.create(db.collection('reg_events').doc(physicalId(ctx,event.id)),event);await batch.commit();
  const current=await projectReg(ctx,actor),before=await projectReg(ctx,actor,{cutRevision:2});
  assert.equal(before.coverage,'complete');assert.equal(before.groups[0].netMinor,'12000');assert.equal(current.coverage,'partial');assert.equal(current.operations.length,2);assert.deepEqual(current.reconciliation.unresolved,links.map(link=>link.id).sort());assert.deepEqual(current.groups,[]);
  assert.deepEqual((await readEvents(ctx,actor)).events,events);
  for(const original of [...operations,...links]){const collection=original.id.startsWith('link-')?'reg_evidence_links':'reg_operations';assert.deepEqual((await db.collection(collection).doc(physicalId(ctx,original.id)).get()).data(),original);}
  console.log(JSON.stringify({id:'SP01-independent-historical-cycle',result:'PASS',fixture:'literal native records, no command producer',originals:4,events:4,cut2:'complete 12000',cut4:'partial, no invented balance'}));
}
