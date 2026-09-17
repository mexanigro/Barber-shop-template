import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import type {Firestore} from 'firebase-admin/firestore';
import type {Request,Response} from 'express';
import {membershipVersion,physicalId,principalId,type RegContext} from '../src/lib/reg/authority.js';
import {CAPABILITIES,type Actor,type Grant,type Command} from '../src/lib/reg/types.js';
import {executeCommand,commandStatus} from '../src/lib/reg/store.js';

/** Seis handlers intactos con DB nativa; Auth es borde ficticio declarado. */
export async function runRosterNative(db:Firestore,base:RegContext,configFile:string,port:number):Promise<void>{
  const req=createRequire(process.cwd()+'/package.json'),local=createRequire(configFile),express=req('express');
  const results:Record<string,unknown>[]=[];
  for(const name of ['serverRoster','apiRoster']){
    const ctx={...base,clientId:'tenant-'+name},now=ctx.now!();
    const owner:Actor={issuer:ctx.issuer,uid:name+'-owner',email:name.toLowerCase()+'-owner@example.invalid'};
    const staff:Actor={issuer:ctx.issuer,uid:name+'-staff',email:name.toLowerCase()+'-staff@example.invalid'};
    const target:Actor={issuer:ctx.issuer,uid:name+'-target',email:name.toLowerCase()+'-target@example.invalid'};
    const member=(who:Actor,role:string,status='active')=>({clientId:ctx.clientId,email:who.email,role,status,invitedBy:owner.email,invitedAt:now});
    const grant=(who:Actor,m:ReturnType<typeof member>):Grant=>({purpose:'merchant_customer_money',id:principalId(who),clientId:ctx.clientId,environment:ctx.environment,schemaVersion:1,revision:1,authoredBy:owner,recordedAt:now,...who,role:m.role as Grant['role'],state:'active',scope:'all',capabilities:[...CAPABILITIES],membershipVersion:membershipVersion(m),epoch:1});
    for(const [who,role]of [[owner,'owner'],[staff,'staff']] as const){const m=member(who,role);await db.collection('admin_users').doc(who.email).set(m);await db.collection('reg_grants').doc(physicalId(ctx,principalId(who))).set(grant(who,m));}
    await db.collection('reg_legacy_fence').doc(ctx.clientId).set({authorityId:ctx.authorityId,environment:ctx.environment,epoch:1,manualMoney:'blocked'});
    await db.collection('reg_control').doc(physicalId(ctx,'control')).set({clientId:ctx.clientId,environment:ctx.environment,authorityId:ctx.authorityId,schemaVersion:1,epoch:1,dataRevision:0,mode:'ready',minClientVersion:1,currencies:{ILS:2}});
    await executeCommand(ctx,owner,{schemaVersion:1,epoch:1,commandId:'method',operationId:null,type:'method.put',expectedRevisions:{'methods:cash':0},payload:{aggregateId:'cash',label:'Manual',translations:{},state:'enabled',currencies:['ILS'],provider:''}});
    const authCalls:unknown[]=[],logs:unknown[]=[];
    const fixtureAuth={getUserByEmail:async(email:string)=>({uid:email,customClaims:{fixture:true}}),setCustomUserClaims:async(uid:string,claims:unknown)=>{authCalls.push({uid,claims});},revokeRefreshTokens:async(uid:string)=>{authCalls.push({revoked:uid});}};
    Object.assign(globalThis,{__rosterFixtureAuth:fixtureAuth});
    const encode=(value:unknown):unknown=>typeof value==='string'?{stringValue:value}:typeof value==='boolean'?{booleanValue:value}:typeof value==='number'?{integerValue:String(value)}:value&&typeof value==='object'&&'toDate'in value?{timestampValue:(value as {toDate():Date}).toDate().toISOString()}:{nullValue:null};
    const restRow=(doc:FirebaseFirestore.DocumentSnapshot)=>({id:doc.id,fields:Object.fromEntries(Object.entries(doc.data()??{}).map(([k,v])=>[k,encode(v)]))});
    const dependencies={CLIENT_ID:ctx.clientId,console:{log:(...x:unknown[])=>logs.push(x),warn:(...x:unknown[])=>logs.push(x),error:(...x:unknown[])=>logs.push(x)},
      requireAdminAuth:async(request:Request,response:Response)=>{
        const who=request.headers.authorization==='Bearer owner'?owner:request.headers.authorization==='Bearer staff'?staff:null;
        if(!who){response.status(401).json({error:'fixture credentials required'});return null;}
        const data=(await db.collection('admin_users').doc(who.email).get()).data();
        if(!data||data.clientId!==ctx.clientId||data.status!=='active'){response.status(403).json({error:'fixture membership denied'});return null;}
        return{...who,role:data.role};
      },getAdminDb:async()=>db,loadAdminFirestore:async()=>({db}),loadAdminAuth:async()=>fixtureAuth,loadAdminAuthForRoles:async()=>fixtureAuth,
      firestoreRestGetDocument:async(collection:string,id:string)=>{const doc=await db.collection(collection).doc(id).get();return doc.exists?restRow(doc):null;},
      adminUsersRunQuery:async()=>{const snap=await db.collection('admin_users').where('clientId','==',ctx.clientId).where('role','==','owner').get();return snap.docs.map(restRow);}};
    const app=express();app.use(express.json());local('./'+name+'.cjs').register(app,dependencies);
    const server=await new Promise<import('node:http').Server>(resolve=>{const s=app.listen(port,'127.0.0.1',()=>resolve(s));});
    const call=async(method:string,path:string,body?:unknown,credential='owner')=>{const r=await fetch('http://127.0.0.1:'+port+'/api/admin/users'+path,{method,headers:{Authorization:'Bearer '+credential,'Content-Type':'application/json',Connection:'close'},...(body?{body:JSON.stringify(body)}:{})});return{status:r.status,body:await r.json()};};
    const snapshot=async()=>{const names=['admin_users','reg_grants','reg_control','reg_events','reg_commands','reg_operations'];return Promise.all(names.map(async name=>{const snap=await db.collection(name).get();return[name,snap.docs.map(d=>[d.id,d.data()]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])))];}));};
    const payment=(id:string):Command=>({schemaVersion:1,epoch:1,commandId:id,operationId:id,type:'receipt.create',expectedRevisions:{['operations:'+id]:0},payload:{state:'received_declared',money:{amountMinor:'100',currency:'ILS',scale:2},methodId:'cash',effective:{instant:'2026-09-13T07:00:00.000Z',local:'2026-09-13T10:00:00',zone:'Asia/Jerusalem',offset:'+03:00'},evidence:{kind:'operator_declaration',attachmentState:'none_declared',note:'',reference:''},links:[],description:'Ficticio',raw:''}});
    const assertRevoked=async()=>{assert.equal((await db.collection('reg_grants').doc(physicalId(ctx,principalId(target))).get()).data()?.state,'revoked');await assert.rejects(()=>executeCommand(ctx,target,payment('forbidden')),/reg.forbidden|reg.grant_inactive/);};
    try{
      const removed=member(target,'staff','removed');await db.collection('admin_users').doc(target.email).set(removed);await db.collection('reg_grants').doc(physicalId(ctx,principalId(target))).set(grant(target,removed));
      const before=await snapshot();
      for(const [method,path,body]of [['POST','',{email:target.email,role:'staff'}],['PATCH','/'+target.email+'/role',{role:'manager'}],['DELETE','/'+target.email,undefined]] as const){assert.equal((await call(method,path,body,'staff')).status,403);assert.deepEqual(await snapshot(),before);}
      assert.equal((await call('POST','',{email:target.email,role:'staff'})).status,201);assert.equal((await db.collection('admin_users').doc(target.email).get()).data()?.status,'pending');await assertRevoked();
      const active=member(target,'staff');await db.collection('admin_users').doc(target.email).set(active);await db.collection('reg_grants').doc(physicalId(ctx,principalId(target))).set(grant(target,active));
      const accepted=await executeCommand(ctx,target,payment('before-role'));
      assert.equal((await call('PATCH','/'+target.email+'/role',{role:'manager'})).status,200);assert.equal((await db.collection('admin_users').doc(target.email).get()).data()?.role,'manager');await assertRevoked();assert.deepEqual(await commandStatus(ctx,owner,'before-role'),accepted);
      const manager=member(target,'manager');await db.collection('reg_grants').doc(physicalId(ctx,principalId(target))).set(grant(target,manager));
      assert.equal((await call('DELETE','/'+target.email)).status,200);assert.equal((await db.collection('admin_users').doc(target.email).get()).exists,false);await assertRevoked();assert.deepEqual(await commandStatus(ctx,owner,'before-role'),accepted);
      const foreign=name.toLowerCase()+'-foreign@example.invalid';await db.collection('admin_users').doc(foreign).set({clientId:'foreign-tenant',role:'staff',status:'active'});const foreignBefore=await snapshot();
      for(const [method,path,body,expected]of [['POST','',{email:foreign,role:'staff'},409],['PATCH','/'+foreign+'/role',{role:'manager'},403],['DELETE','/'+foreign,undefined,403]] as const){assert.equal((await call(method,path,body)).status,expected);assert.deepEqual(await snapshot(),foreignBefore);}
      const events=(await db.collection('reg_events').where('clientId','==',ctx.clientId).get()).docs.map(d=>d.data());const revoked=events.filter(e=>e.aggregateKind==='grants');assert.equal(revoked.length,3);assert.deepEqual(revoked.map(e=>e.after.state),['revoked','revoked','revoked']);
      for(const event of revoked){const receipt=(await db.collection('reg_commands').doc(physicalId(ctx,event.commandId)).get()).data();assert.ok(receipt?.eventIds.includes(event.id));assert.equal(receipt?.revision,event.commitRevision);}
      assert.equal(authCalls.length,6);results.push({runtime:name,handlers:3,roleAdverses:3,tenantAdverses:3,revocations:3,ownerAudit:'original receipt preserved',auth:'mock only',logs:logs.length});
    }catch(error){console.error(JSON.stringify({runtime:name,handlerLogs:logs},(_key,value)=>value instanceof Error?{message:value.message,stack:value.stack}:value));throw error;
    }finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));delete(globalThis as Record<string,unknown>).__rosterFixtureAuth;}
  }
  console.log(JSON.stringify({id:'R23/R24-six-roster-handlers',result:'PASS',results,limit:'Auth and REST boundary injected; real handler code and native transactional DB. Full capability matrix remains separate.'}));
}
