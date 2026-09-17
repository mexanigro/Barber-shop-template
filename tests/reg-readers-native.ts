import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import type { Firestore } from 'firebase-admin/firestore';
import { physicalId,principalId,membershipVersion,type RegContext } from '../src/lib/reg/authority.js';
import { projectReg } from '../src/lib/reg/projection.js';
import { eventPage } from '../src/lib/reg/pagination.js';
import { executeCommand,readEvents } from '../src/lib/reg/store.js';
import { regCsv,appendLegacyCsv } from '../src/lib/reg/view.js';
import { legacyMoneyRows } from '../src/lib/reg/legacy-view.js';
import { regForPeriod } from '../src/lib/reg/totals.js';
import { readMetricsReg } from '../src/lib/api/crm-reg-handler.js';
import { CAPABILITIES,type Actor,type Operation,type Grant,type Event } from '../src/lib/reg/types.js';

/** Población literal de 5001 operaciones; escritura fixture nativa, sin fuentes remotas. */
export async function runReadersNative(db:Firestore,base:RegContext,configFile:string):Promise<void>{
  const ctx={...base,clientId:'tenant-readers',cursorKey:'READERS_CURSOR_FIXTURE'},now=ctx.now!(),actor:Actor={issuer:ctx.issuer,uid:'reader-owner',email:'reader-owner@example.invalid'};
  const member={clientId:ctx.clientId,role:'owner',status:'active',invitedAt:now};
  const grant:Grant={purpose:'merchant_customer_money',id:principalId(actor),clientId:ctx.clientId,environment:ctx.environment,schemaVersion:1,revision:1,authoredBy:actor,recordedAt:now,...actor,role:'owner',state:'active',scope:'all',capabilities:[...CAPABILITIES],membershipVersion:membershipVersion(member),epoch:1};
  await db.collection('admin_users').doc(actor.email).set(member);await db.collection('reg_grants').doc(physicalId(ctx,grant.id)).set(grant);
  const core={clientId:ctx.clientId,environment:ctx.environment,purpose:'merchant_customer_money' as const,schemaVersion:1 as const,revision:1,authoredBy:actor,recordedAt:now};
  const method={...core,id:'cash',label:'Cash',translations:{en:'Cash'},state:'enabled' as const,currencies:['ILS','USD'],provider:''};
  await db.collection('reg_methods').doc(physicalId(ctx,'cash')).set(method);
  const date={instant:'2026-09-13T07:00:00.000Z',local:'2026-09-13T10:00:00',zone:'Asia/Jerusalem',offset:'+03:00'};
  let first:Operation|undefined;
  for(let start=0;start<5001;start+=200){const batch=db.batch();
    for(let i=start;i<Math.min(start+200,5001);i++){
      const id='known-'+String(i).padStart(5,'0'),op:Operation={...core,id,kind:'receipt',parentReceiptId:null,state:'received_declared',money:{amountMinor:i===5000?'500':'100',currency:i===5000?'USD':'ILS',scale:2},raw:'',method,effective:date,evidence:{kind:'operator_declaration',attachmentState:'none_declared',note:'Dataset ficticio',reference:''},links:[],description:'Ficticio '+i,origin:'operator_declaration',allocatedMinor:'0',refundedMinor:'0',reservedMinor:'0',latestEventId:'event-'+id,distribution:null};
      if(i===0)first=op;
      const event:Event={id:op.latestEventId,clientId:ctx.clientId,environment:ctx.environment,commitRevision:i+1,aggregateKind:'operations',aggregateId:id,beforeRevision:0,after:op,reason:'Fixture de paginación; no comando de producto',actor,recordedAt:now,commandId:'seed-'+id};
      batch.create(db.collection('reg_operations').doc(physicalId(ctx,id)),op);batch.create(db.collection('reg_events').doc(physicalId(ctx,event.id)),event);
    }await batch.commit();
  }
  await db.collection('reg_legacy_fence').doc(ctx.clientId).set({authorityId:ctx.authorityId,environment:ctx.environment,epoch:1,manualMoney:'blocked'});
  await db.collection('reg_control').doc(physicalId(ctx,'control')).set({clientId:ctx.clientId,environment:ctx.environment,authorityId:ctx.authorityId,schemaVersion:1,epoch:1,dataRevision:5001,mode:'ready',minClientVersion:1,currencies:{ILS:2,USD:2}});
  const small=await projectReg(ctx,actor,{pageSize:17}),large=await projectReg(ctx,actor,{pageSize:1000});
  assert.equal(small.operations.length,5001);assert.deepEqual(small,large);assert.deepEqual(small.groups.map(g=>[g.currency,g.netMinor]),[['ILS','500000'],['USD','500']]);
  const firstPage=await eventPage(ctx,actor,null,17);assert.equal(firstPage.coverage,'partial');
  const p={state:first!.state,money:{amountMinor:'12537',currency:'ILS',scale:2},methodId:'cash',effective:date,evidence:first!.evidence,links:[] as Operation['links'],description:'Corregido después del corte',raw:'',reason:'Cambio concurrente con paginación'};
  await executeCommand(ctx,actor,{schemaVersion:1,epoch:1,commandId:'after-cut',operationId:first!.id,type:'receipt.correct',expectedRevisions:{['operations:'+first!.id]:1},payload:p});
  const ids=firstPage.events.map(e=>e.id);let cursor=firstPage.cursor;
  while(cursor){const page=await eventPage(ctx,actor,cursor,1000);assert.equal(page.cutRevision,5001);ids.push(...page.events.map(e=>e.id));cursor=page.cursor;}
  assert.equal(ids.length,5001);assert.equal(new Set(ids).size,5001);assert.ok(!ids.includes('after-cut_000'));
  const historical=await projectReg(ctx,actor,{cutRevision:5001});assert.deepEqual(historical.groups,small.groups);
  const current=await projectReg(ctx,actor);assert.equal(current.groups[0].netMinor,'512437');
  assert.deepEqual(regForPeriod(historical,{from:'2026-09-13',to:'2026-09-13'}).groups,historical.groups);
  assert.deepEqual(regForPeriod(historical,{from:'2026-09-12',to:'2026-09-12'}).groups,[]);
  // Fallo real del acceso de lectura de la segunda página: no devuelve una cartera vacía.
  const collection=db.collection.bind(db);let reads=0;
  const wrap=(query:any):any=>new Proxy(query,{get(target,key){if(key==='get')return async()=>{if(++reads===2)throw new Error('PAGE_UNAVAILABLE');return target.get();};if(['where','orderBy','startAfter','limit'].includes(String(key)))return(...args:unknown[])=>wrap(target[key](...args));const value=target[key];return typeof value==='function'?value.bind(target):value;}});
  db.collection=((name:string)=>name==='reg_events'?wrap(collection(name)):collection(name)) as typeof db.collection;
  try{await assert.rejects(()=>projectReg(ctx,actor,{pageSize:17}),/PAGE_UNAVAILABLE/);}finally{db.collection=collection;}
  assert.equal(reads,2);
  const events=(await readEvents(ctx,actor,{cutRevision:5001})).events,history=legacyMoneyRows([{id:'old-paid',paymentStatus:'paid'},{id:'old-amount',amountPaidCents:0},{id:'old-money',amountPaidCents:7777,paymentMethod:'old',providerSessionId:'declared-reference'}],{projectId:ctx.projectId,databaseId:ctx.databaseId,collection:'appointments'});
  const csv=appendLegacyCsv(regCsv(historical,events,e=>physicalId(ctx,e.id)),history);
  assert.ok(csv.includes('"known-00000","1","100","ILS","2"'));assert.ok(!csv.includes('after-cut'));assert.equal(history[1].raw.amountPaidCents,0);assert.ok(history[1].unknown.includes('currency'));assert.ok(csv.includes('old-money'));assert.ok(csv.includes('declared-reference'));
  const runtime=createRequire(configFile)('./runtimes.cjs'),req=createRequire(process.cwd()+'/package.json'),app=req('express')();
  // Usa los mismos helpers reales de ambos runtimes; mantiene null/reason de DC06.
  const input:import('../src/lib/crm-metrics.js').CrmMetricsInput={range:'mtd',now:new Date(now),appointments:[{id:'old',status:'completed',serviceId:'hair',customerName:'Fixture',date:'2026-09-13',time:'10:00',amountPaidCents:9999999,paymentStatus:'paid'}],customers:[],inbox:[],leads:[]};
  for(const compute of [runtime.sharedMetrics,runtime.inlineMetrics]){const result=compute(input);assert.equal(result.revenue,null);assert.equal(result.noShowRate,null);assert.equal(result.noShowRateReason,'attendance_not_recorded');assert.equal(result.topServices[0].revenueCents,null);}
  runtime.registerServerReg(app,ctx,async()=>({iss:actor.issuer,sub:actor.uid,email:actor.email,email_verified:true}));
  const period={rangeStart:'2026-09-01',rangeEnd:'2026-09-14'},reading=await runtime.readMetricsReg(app,{headers:{authorization:'Bearer LOCAL_FIXTURE'}},period);
  assert.equal(reading.reg.groups[0].netMinor,'512437');assert.equal(reading.coverage,'complete');
  const denied=await runtime.readMetricsReg(app,{headers:{}},period);assert.equal(denied.reg,null);assert.equal(denied.coverage,'error');
  console.log(JSON.stringify({id:'R06/R19/R26-readers',result:'PASS',population:5001,smallPage:17,largePage:1000,oldCut:5001,currentCut:5002,oldILS:'500000',currentILS:'512437',USD:'500',failedSecondPage:'reject',csvLegacy:3,metricsCopies:2,noShowRate:null,remaining:'actual route cache + snapshot + all UI readers + restoration'}));
}
