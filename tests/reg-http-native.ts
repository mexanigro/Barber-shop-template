import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { generateKeyPairSync, sign } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { verifyFirebaseIdToken } from '../src/lib/api/admin-auth.js';
import { membershipVersion, physicalId, principalId, type RegContext } from '../src/lib/reg/authority.js';
import { CAPABILITIES, type Actor, type Command, type Grant } from '../src/lib/reg/types.js';
import { executeCommand } from '../src/lib/reg/store.js';

export async function runHttpNative(db:Firestore,base:RegContext,configFile:string,port:number):Promise<void>{
  const req=createRequire(process.cwd()+'/package.json'),runtime=createRequire(configFile)('./runtimes.cjs'),express=req('express');
  const ctx={...base,clientId:'tenant-http',cursorKey:'LOCAL_CURSOR_FIXTURE_ONLY'},now=ctx.now!();
  const actor:Actor={issuer:ctx.issuer,uid:'http-owner',email:'http-owner@example.invalid'},member={clientId:ctx.clientId,role:'owner',status:'active',invitedAt:now};
  const grant:Grant={purpose:"merchant_customer_money",id:principalId(actor),clientId:ctx.clientId,environment:ctx.environment,schemaVersion:1,revision:1,authoredBy:actor,recordedAt:now,...actor,role:'owner',state:'active',scope:'all',capabilities:[...CAPABILITIES],membershipVersion:membershipVersion(member),epoch:1};
  await db.collection('admin_users').doc(actor.email).set(member);
  await db.collection('reg_legacy_fence').doc(ctx.clientId).set({authorityId:ctx.authorityId,environment:ctx.environment,epoch:1,manualMoney:'blocked'});
  await db.collection('reg_control').doc(physicalId(ctx,'control')).set({clientId:ctx.clientId,environment:ctx.environment,authorityId:ctx.authorityId,schemaVersion:1,epoch:1,dataRevision:0,mode:'ready',minClientVersion:1,currencies:{ILS:2}});
  await db.collection('reg_grants').doc(physicalId(ctx,grant.id)).set(grant);
  await executeCommand(ctx,actor,{schemaVersion:1,epoch:1,commandId:'http-method',operationId:null,type:'method.put',expectedRevisions:{'methods:cash':0},payload:{aggregateId:'cash',label:'Efectivo',translations:{en:'Cash',he:'מזומן',ar:'نقد',ru:'Наличные'},state:'enabled',currencies:['ILS'],provider:''}});
  const pair=generateKeyPairSync('rsa',{modulusLength:2048}),cert=pair.publicKey.export({type:'spki',format:'pem'}).toString();
  const encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url');
  function token(changes:Record<string,unknown>={}){const header=encode({alg:'RS256',kid:'local'}),payload=encode({iss:actor.issuer,aud:ctx.projectId,sub:actor.uid,email:actor.email,email_verified:true,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+600,...changes});return header+'.'+payload+'.'+sign('RSA-SHA256',Buffer.from(header+'.'+payload),pair.privateKey).toString('base64url');}
  const verify=(value:string,projects:readonly string[])=>verifyFirebaseIdToken(value,projects,async()=>({local:cert}));
  const command:Command={schemaVersion:1,epoch:1,commandId:'http-receipt',operationId:'http-receipt',type:'receipt.create',expectedRevisions:{'operations:http-receipt':0},payload:{state:'received_declared',money:{amountMinor:'12537',currency:'ILS',scale:2},methodId:'cash',effective:{instant:'2026-09-13T07:00:00.000Z',local:'2026-09-13T10:00:00',zone:'Asia/Jerusalem',offset:'+03:00'},description:'Sin cita',raw:'',links:[],evidence:{kind:'operator_declaration',attachmentState:'none_declared',note:'Ficticio',reference:''}}};
  let first:unknown;
  for(const name of ['registerServerReg','registerApiReg']){
    const app=express();app.use(express.json({limit:'140kb'}));runtime[name](app,ctx,verify);
    const server=await new Promise<import('node:http').Server>(resolve=>{const s=app.listen(port,'127.0.0.1',()=>resolve(s));});
    assert.equal((server.address() as import('node:net').AddressInfo).address,'127.0.0.1');
    const call=async(path:string,method='GET',body?:unknown,credential=token(),scope:Record<string,string>={})=>{
      try{return await fetch(`http://127.0.0.1:${port}/api/crm/reg/${path}`,{method,headers:{Authorization:'Bearer '+credential,'Content-Type':'application/json',Connection:'close',...scope},...(body?{body:JSON.stringify(body)}:{})});}
      catch(error){const cause=(error as {cause?:{code?:string;message?:string}}).cause;throw new Error(JSON.stringify({runtime:name,path,code:cause?.code,message:cause?.message}));}
    };
    try{
      assert.equal((await call('capabilities')).status,200);
      assert.equal((await call('capabilities','GET',undefined,token({sub:'unknown'}))).status,403);
      assert.equal((await call('capabilities','GET',undefined,token({email_verified:false}))).status,403);
      assert.equal((await call('capabilities','GET',undefined,token({aud:'other'}))).status,401);
      assert.equal((await call('capabilities','GET',undefined,token({exp:0}))).status,401);
      const bound={'X-Reg-Authority':ctx.authorityId,'X-Reg-Tenant':ctx.clientId,'X-Reg-Environment':ctx.environment,'X-Reg-Issuer':actor.issuer,'X-Reg-Uid':actor.uid};
      const valid=await call('capabilities','GET',undefined,token(),bound);assert.equal(valid.status,200);for(const [key,value]of Object.entries(bound))assert.equal(valid.headers.get(key),value);
      const before=(await db.collection('reg_events').where('clientId','==',ctx.clientId).get()).docs.map(doc=>doc.data());
      for(const key of Object.keys(bound)){const invalid=await call('commands','POST',{...command,commandId:'forbidden-'+key},token(),{...bound,[key]:'foreign'});assert.equal(invalid.status,409);assert.equal((await invalid.json()).error,'reg.session_changed');}
      assert.deepEqual((await db.collection('reg_events').where('clientId','==',ctx.clientId).get()).docs.map(doc=>doc.data()),before);
      const accepted=await call('commands','POST',command);assert.equal(accepted.status,200);const result=await accepted.json();
      if(first)assert.deepEqual(result,first);else first=result;
      const summary=await(await call('summary')).json();assert.equal(summary.groups[0].netMinor,'12537');assert.equal(summary.operations.length,1);
      assert.equal((await call('commands','POST',{...command,payload:{...command.payload,description:'otro'}})).status,409);
      assert.deepEqual(await(await call('commands/http-receipt')).json(),first);
      const detail=await(await call('operations/http-receipt')).json();assert.equal(detail.history.length,1);assert.equal(detail.operation.evidence.attachmentState,'none_declared');
      const csv=await(await call('export')).text();assert.ok(csv.includes('12537'));assert.ok(csv.includes('demo-dc07-reg-prep'));
      const page=await(await call('events?limit=1')).json();assert.equal(page.coverage,'partial');assert.ok(page.cursor);
      assert.equal((await call('events?cursor='+encodeURIComponent(page.cursor.slice(0,-1)+'!'))).status,400);
      console.log(JSON.stringify({result:'PASS',id:'R26-HTTP',runtime:name,pid:process.pid,port,signature:'RS256 local',netMinor:'12537',history:1,remaining:'UI/cutover/complete role matrix'}));
    }finally{await new Promise<void>((resolve,reject)=>server.close((error:Error|undefined)=>error?reject(error):resolve()));}
  }
  await executeCommand(ctx,actor,{...command,commandId:'http-aggregate',operationId:'http-aggregate',expectedRevisions:{'operations:http-aggregate':0}});
  await executeCommand(ctx,actor,{schemaVersion:1,epoch:1,commandId:'http-evidence',operationId:null,type:'evidence.put',expectedRevisions:{'evidence_links:http-partial':0},payload:{aggregateId:'http-partial',receiptId:'http-aggregate',identity:{clientId:ctx.clientId,environment:ctx.environment,purpose:'merchant_customer_money',provider:'fixture',account:'fixture',externalId:'partial',type:'declaration'},description:'Missing detail',sourceCut:'fixture',state:'review',relatedIds:[],aggregate:true}});
  await executeCommand(ctx,actor,{schemaVersion:1,epoch:1,commandId:'http-read-only',operationId:null,type:'control.mode',expectedRevisions:{},payload:{mode:'read_only',reason:'Export available history'}});
  for(const name of ['registerServerReg','registerApiReg']){
    const app=express();app.use(express.json({limit:'140kb'}));runtime[name](app,ctx,verify);const server=await new Promise<import('node:http').Server>(resolve=>{const s=app.listen(port,'127.0.0.1',()=>resolve(s));});
    const call=(path:string,body?:unknown)=>fetch('http://127.0.0.1:'+port+'/api/crm/reg/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token(),'Content-Type':'application/json',Connection:'close'},...(body?{body:JSON.stringify(body)}:{})});
    try{
      const summary=await(await call('summary')).json();assert.equal(summary.coverage,'partial');assert.equal(summary.operations.length,2);assert.equal(summary.groups[0].netMinor,'12537');
      const detail=await(await call('operations/http-aggregate')).json();assert.equal(detail.operation.id,'http-aggregate');assert.equal(detail.history.length,1);
      const exported=await call('export');assert.equal(exported.status,200);const csv=await exported.text();assert.ok(csv.includes('"http-aggregate"')&&csv.includes('"http-partial"')&&csv.includes('"partial"')&&csv.includes('no complete balance'));
      assert.equal((await call('commands',{...command,commandId:'after-readonly',operationId:'after-readonly',expectedRevisions:{'operations:after-readonly':0}})).status,409);
      const ref=db.collection('reg_grants').doc(physicalId(ctx,grant.id));await ref.update({capabilities:CAPABILITIES.filter(cap=>cap!=='export')});assert.equal((await call('export')).status,403);await ref.update({capabilities:CAPABILITIES});
      console.log(JSON.stringify({id:'SP03-SP04-HTTP',result:'PASS',runtime:name,scopeHeaders:'five mismatches reject without writes; valid response bound',mode:'read_only',partialExport:'2 original operations and history',unauthorizedExport:403}));
    }finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
  }
}
