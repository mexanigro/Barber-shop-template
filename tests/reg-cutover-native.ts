import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import type { Firestore } from 'firebase-admin/firestore';
import { executeMarkPaid } from '../src/lib/ai/admin-tools.js';
import { executeCommand, mutateMemberMoney } from '../src/lib/reg/store.js';
import { membershipVersion, physicalId, principalId, type RegContext } from '../src/lib/reg/authority.js';
import { CAPABILITIES, type Actor, type Grant, type Command } from '../src/lib/reg/types.js';

export async function runCutoverNative(db:Firestore,base:RegContext,port:number):Promise<void>{
  const ctx={...base,clientId:'tenant-cutover'},actor:Actor={issuer:ctx.issuer,uid:'cut-owner',email:'cut-owner@example.invalid'},now=ctx.now!();
  const req=createRequire(process.cwd()+'/package.json'),appSdk=req('firebase/app'),web=req('firebase/firestore');
  const member={clientId:ctx.clientId,role:'owner',status:'active',invitedAt:now};
  const grant:Grant={purpose:"merchant_customer_money",id:principalId(actor),clientId:ctx.clientId,environment:ctx.environment,schemaVersion:1,revision:1,authoredBy:actor,recordedAt:now,...actor,role:'owner',state:'active',scope:'all',capabilities:[...CAPABILITIES],membershipVersion:membershipVersion(member),epoch:1};
  await db.collection('clients').doc(ctx.clientId).set({status:'active'});
  await db.collection('admin_users').doc(actor.email).set(member);
  await db.collection('reg_control').doc(physicalId(ctx,'control')).set({clientId:ctx.clientId,environment:ctx.environment,authorityId:ctx.authorityId,schemaVersion:1,epoch:1,dataRevision:0,mode:'disabled',minClientVersion:1,currencies:{ILS:2}});
  await db.collection('reg_grants').doc(physicalId(ctx,grant.id)).set(grant);
  const appointment={clientId:ctx.clientId,customerName:'Fixture',customerEmail:'fixture@example.invalid',customerPhone:'0500000000',serviceId:'cut',staffId:'staff',date:'2026-09-13',time:'10:00',duration:30,status:'completed',createdAt:now};
  await db.collection('appointments').doc('cut-history').set(appointment);
  await executeMarkPaid({db,clientId:ctx.clientId,FieldValue:{serverTimestamp:()=>new Date(now)}},{appointmentId:'cut-history',amountCents:12537,paymentMethod:'manual'});
  const history=(await db.collection('appointments').doc('cut-history').get()).data()!;
  await db.collection('reg_legacy_fence').doc(ctx.clientId).set({authorityId:ctx.authorityId,environment:ctx.environment,epoch:1,manualMoney:'blocked'});
  const app=appSdk.initializeApp({projectId:ctx.projectId,apiKey:'local-fixture',appId:'local-fixture'},'reg-cutover'),client=web.getFirestore(app,ctx.databaseId);
  web.connectFirestoreEmulator(client,'127.0.0.1',port,{mockUserToken:{sub:actor.uid,user_id:actor.uid,email:actor.email,email_verified:true,clientId:ctx.clientId,tenantRole:'owner'}});
  const denied=async(work:()=>Promise<unknown>)=>assert.rejects(work,(e:{code?:string})=>e.code==='permission-denied');
  try{
    await denied(()=>web.setDoc(web.doc(client,'appointments','old-money'),{...appointment,amountPaidCents:263,paymentStatus:'paid'}));
    await denied(()=>web.setDoc(web.doc(client,'customers','old-money'),{clientId:ctx.clientId,amountPaidCents:263}));
    await web.setDoc(web.doc(client,'appointments','nonmoney'),{...appointment,paymentStatus:'pending'});
    await web.setDoc(web.doc(client,'customers','nonmoney'),{clientId:ctx.clientId,fullName:'Contacto',visitCount:0});
    await web.updateDoc(web.doc(client,'appointments','cut-history'),{status:'cancelled',time:'11:00'});
    const changed=(await db.collection('appointments').doc('cut-history').get()).data()!;
    for(const field of ['amountPaidCents','paidAt','paymentStatus','paymentMethod'])assert.deepEqual(changed[field],history[field]);
    await denied(()=>web.updateDoc(web.doc(client,'appointments','cut-history'),{amountPaidCents:999}));
    await denied(()=>web.updateDoc(web.doc(client,'appointments','cut-history'),{amountPaidCents:web.deleteField()}));
    await denied(()=>web.getDoc(web.doc(client,'reg_operations',physicalId(ctx,'forbidden'))));
    await denied(()=>web.setDoc(web.doc(client,'reg_operations',physicalId(ctx,'forbidden')),{clientId:ctx.clientId}));
    await assert.rejects(()=>executeMarkPaid({db,clientId:ctx.clientId,FieldValue:{serverTimestamp:()=>new Date(now)}},{appointmentId:'cut-history',amountCents:999}),(e:Error)=>e.message==='reg.legacy_writer_blocked');
    assert.equal((await db.collection('appointments').doc('cut-history').get()).data()?.amountPaidCents,12537);
    await db.collection('reg_control').doc(physicalId(ctx,'control')).update({mode:'ready'});
    await executeCommand(ctx,actor,{schemaVersion:1,epoch:1,commandId:'cut-method',operationId:null,type:'method.put',expectedRevisions:{'methods:cash':0},payload:{aggregateId:'cash',label:'Manual',translations:{},state:'enabled',currencies:['ILS'],provider:''}});
    console.log(JSON.stringify({result:'PASS',id:'R25-subset',nativeRules:true,oldMoney:'denied',nonmonetary:'allowed',historyPreserved:12537,adminManual:'denied',regApi:'allowed',remaining:'actual UI producer, mutants and all fields'}));
    const staff:Actor={issuer:ctx.issuer,uid:'cut-staff',email:'cut-staff@example.invalid'},staffMember={...member,role:'staff',invitedBy:actor.email};
    await db.collection('admin_users').doc(staff.email).set(staffMember);
    const staffGrant:Grant={...grant,...staff,id:principalId(staff),role:'staff',capabilities:['read','register'],scope:'own',membershipVersion:membershipVersion(staffMember)};
    await db.collection('reg_grants').doc(physicalId(ctx,staffGrant.id)).set(staffGrant);
    const payment:Command={schemaVersion:1,epoch:1,commandId:'staff-payment',operationId:'staff-payment',type:'receipt.create',expectedRevisions:{'operations:staff-payment':0},payload:{state:'received_declared',money:{amountMinor:'100',currency:'ILS',scale:2},methodId:'cash',effective:{instant:'2026-09-13T07:00:00.000Z',local:'2026-09-13T10:00:00',zone:'Asia/Jerusalem',offset:'+03:00'},evidence:{kind:'operator_declaration',attachmentState:'none_declared',note:'',reference:''},links:[],raw:'',description:'Fixture'}};
    const race=await Promise.allSettled([executeCommand(ctx,staff,payment),mutateMemberMoney(db,ctx.clientId,staff.email,actor,{type:'remove',data:{}})]);
    assert.equal(race[1].status,'fulfilled');
    assert.equal((await db.collection('reg_grants').doc(physicalId(ctx,staffGrant.id)).get()).data()?.state,'revoked');
    assert.equal((await db.collection('admin_users').doc(staff.email).get()).exists,false);
    await assert.rejects(()=>executeCommand(ctx,staff,{...payment,commandId:'after-removal',operationId:'after-removal',expectedRevisions:{'operations:after-removal':0}}),(e:Error)=>e.message==='reg.forbidden');
    await mutateMemberMoney(db,ctx.clientId,staff.email,actor,{type:'invite',data:{...staffMember,email:staff.email,status:'pending'}});
    await assert.rejects(()=>executeCommand(ctx,staff,{...payment,commandId:'pending-member'}),(e:Error)=>e.message==='reg.forbidden');
    console.log(JSON.stringify({result:'PASS',id:'R23/R24-membership-subset',concurrentPayment:race[0].status,revocation:'atomic with member removal',pendingReinvite:'denied',remaining:'all roster runtime paths and full scope/capability matrix'}));
  }finally{await web.terminate(client);await appSdk.deleteApp(app);}
}
