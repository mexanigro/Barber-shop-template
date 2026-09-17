import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { executeCommand, commandStatus } from '../src/lib/reg/store.js';
import { membershipVersion, principalId, physicalId, type RegContext } from '../src/lib/reg/authority.js';
import { CAPABILITIES, type Actor, type Command } from '../src/lib/reg/types.js';

export async function atomicNative(db:Firestore,base:RegContext,output:string){
  const ctx={...base,clientId:'tenant-atomic'},actor:Actor={issuer:ctx.issuer,uid:'atomic-owner',email:'atomic@example.invalid'},now=ctx.now!(),member={clientId:ctx.clientId,role:'owner',status:'active',invitedAt:now};
  await db.collection('admin_users').doc(actor.email).set(member);
  await db.collection('reg_legacy_fence').doc(ctx.clientId).set({authorityId:ctx.authorityId,environment:ctx.environment,epoch:1,manualMoney:'blocked'});
  await db.collection('reg_control').doc(physicalId(ctx,'control')).set({clientId:ctx.clientId,environment:ctx.environment,authorityId:ctx.authorityId,schemaVersion:1,epoch:1,dataRevision:0,mode:'ready',minClientVersion:1,currencies:{ILS:2}});
  await db.collection('reg_grants').doc(physicalId(ctx,principalId(actor))).set({id:principalId(actor),clientId:ctx.clientId,environment:ctx.environment,purpose:'merchant_customer_money',schemaVersion:1,revision:1,authoredBy:actor,recordedAt:now,...actor,role:'owner',state:'active',scope:'all',capabilities:CAPABILITIES,membershipVersion:membershipVersion(member),epoch:1});
  const command=(id:string,type:Command['type'],operationId:string|null,payload:Record<string,unknown>,expectedRevisions:Record<string,number>):Command=>({schemaVersion:1,epoch:1,commandId:id,type,operationId,payload,expectedRevisions});
  await executeCommand(ctx,actor,command('atomic-method','method.put',null,{aggregateId:'cash',label:'Cash',translations:{},state:'enabled',currencies:['ILS'],provider:''},{'methods:cash':0}));
  const payload={state:'received_declared',money:{amountMinor:'10000',currency:'ILS',scale:2},methodId:'cash',effective:{instant:'2026-09-13T07:00:00.000Z',local:'2026-09-13T10:00:00',zone:'Asia/Jerusalem',offset:'+03:00'},evidence:{kind:'operator_declaration',attachmentState:'none_declared',reference:'',note:'Fixture'},description:'Atomic parent',raw:'',links:[] as import('../src/lib/reg/types.js').Link[]};
  await executeCommand(ctx,actor,command('atomic-receipt','receipt.create','receipt',payload,{'operations:receipt':0}));
  await executeCommand(ctx,actor,command('atomic-agreement','agreement.put',null,{aggregateId:'agreement',money:{amountMinor:'9000',currency:'ILS',scale:2},currency:'ILS',scale:2,description:'Agreement',links:[]},{'agreements:agreement':0}));
  const target=command('atomic-package','receipt.correct','receipt',{...payload,reason:'Allocate atomically',allocations:[{aggregateId:'allocation',receiptId:'receipt',agreementId:'agreement',agreementRevision:1,money:{amountMinor:'4000',currency:'ILS',scale:2},state:'active'}]},{'operations:receipt':1,'agreements:agreement':1,'allocations:allocation':0});
  const collections=['reg_operations','reg_agreements','reg_allocations','reg_events','reg_commands','reg_control'];
  async function snapshot(){const rows:Record<string,unknown>={};for(const name of collections){const q=await db.collection(name).where('clientId','==',ctx.clientId).get();if(name==='reg_commands'){const all=await db.collection(name).get();rows[name]=all.docs.filter(doc=>JSON.parse(Buffer.from(doc.id,'base64url').toString())[0]===ctx.clientId).map(doc=>({id:doc.id,value:doc.data()})).sort((a,b)=>a.id.localeCompare(b.id));}else rows[name]=q.docs.map(doc=>({id:doc.id,value:doc.data()})).sort((a,b)=>a.id.localeCompare(b.id));}return rows;}
  const before=await snapshot(),prepared:string[]=[];
  const faulty=new Proxy(db,{get(target,key){
    if(key==='runTransaction')return(callback:(tx:Transaction)=>Promise<unknown>)=>target.runTransaction(async tx=>{
      const wrapped=new Proxy(tx,{get(transaction,method){const value=Reflect.get(transaction,method);if(['create','set','update','delete'].includes(String(method)))return(ref:{path:string},...args:unknown[])=>{prepared.push(ref.path);return value.call(transaction,ref,...args);};return typeof value==='function'?value.bind(transaction):value;}});
      await callback(wrapped);throw new Error('fixture_abort_after_preparing_all_writes');
    });const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
  }});
  await assert.rejects(()=>executeCommand({...ctx,loadDb:async()=>faulty},actor,target),(e:Error)=>e.message==='fixture_abort_after_preparing_all_writes');
  assert.equal(prepared.length,8);assert.deepEqual([...new Set(prepared.map(path=>path.split('/')[0]))].sort(),collections.slice().sort());assert.deepEqual(await snapshot(),before);
  await assert.rejects(()=>executeCommand(ctx,actor,{...target,expectedRevisions:{...target.expectedRevisions,'operations:receipt':0}}),(e:Error)=>e.message==='reg.revision_conflict');assert.deepEqual(await snapshot(),before);
  const accepted=await executeCommand(ctx,actor,target);assert.equal(accepted.eventIds.length,3);assert.deepEqual(await executeCommand(ctx,actor,target),accepted);assert.deepEqual(await commandStatus(ctx,actor,target.commandId),accepted);
  const positive=await snapshot();assert.equal((await db.collection('reg_allocations').doc(physicalId(ctx,'allocation')).get()).data()?.money.amountMinor,'4000');
  const mutant=createRequire(output+'/runner.cjs')(output+'/mutant-store.cjs') as {executeCommand:typeof executeCommand};
  prepared.length=0;const mutantCommand={...target,commandId:'atomic-outside-event',expectedRevisions:{'operations:receipt':2,'agreements:agreement':2,'allocations:allocation':1},payload:{...target.payload,allocations:[{aggregateId:'allocation',receiptId:'receipt',agreementId:'agreement',agreementRevision:2,money:{amountMinor:'2000',currency:'ILS',scale:2},state:'active'}]}};
  await assert.rejects(()=>mutant.executeCommand({...ctx,loadDb:async()=>faulty},actor,mutantCommand),(e:Error)=>e.message==='fixture_abort_after_preparing_all_writes');
  const after=await snapshot();assert.notDeepEqual(after.reg_events,positive.reg_events);for(const collection of collections.filter(name=>name!=='reg_events'))assert.deepEqual(after[collection],positive[collection]);
  const orphans=(await db.collection('reg_events').where('commandId','==',mutantCommand.commandId).get()).size;assert.equal(orphans,3);assert.equal((await db.collection('reg_commands').doc(physicalId(ctx,mutantCommand.commandId)).get()).exists,false);
  console.log(JSON.stringify({id:'R15-native-atomicity',result:'PASS',preparedWrites:8,abort:'zero persisted',staleRevision:'zero persisted',positiveEvents:3,retry:'same receipt',disarmed:'3 orphan events persist, no command; detected',mutantTenant:'isolated, deliberately inconsistent fixture'}));
}
