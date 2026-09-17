import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { executeCommand, commandStatus } from '../src/lib/reg/store.js';
import { projectReg } from '../src/lib/reg/projection.js';
import { decimalToMinor, effectiveDate } from '../src/lib/reg/money.js';
import { authority, membershipVersion, physicalId, principalId, type RegContext } from '../src/lib/reg/authority.js';
import { CAPABILITIES, type Actor, type Command, type Control, type Grant, type Link } from '../src/lib/reg/types.js';
import { runDomainNative } from './reg-domain-native.js';
import { runHttpNative } from './reg-http-native.js';
import { runCutoverNative } from './reg-cutover-native.js';
import { runUiNative } from './reg-ui-native.js';
import { runReadersNative } from './reg-readers-native.js';
import { runReconciliationNative } from './reg-reconciliation-native.js';
import { readRecoveryData } from './reg-recovery-data.js';
import { atomicNative } from './reg-atomic-native.js';
import { runRosterNative } from './reg-roster-native.js';

/** Entry explícito del banco; no lo ejecuta la recolección ordinaria de tests. */
export async function runRegNative(configFile:string,mode:string):Promise<void>{
  const cfg=JSON.parse(fs.readFileSync(configFile,'utf8')) as {project:string;database:string;host:string;port:number;httpPort:number;browser:string;output:string};
  assert.equal(cfg.project,'demo-dc07-reg-prep');assert.equal(cfg.database,'(default)');assert.equal(cfg.host,'127.0.0.1');
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST,`${cfg.host}:${cfg.port}`);
  const req=createRequire(process.cwd()+'/package.json');
  const {Firestore}=req('@google-cloud/firestore');
  const db=new Firestore({projectId:cfg.project,databaseId:cfg.database,host:`${cfg.host}:${cfg.port}`,ssl:false,universeDomain:'googleapis.com',credentials:{client_email:'fixture@example.invalid',private_key:'EMULATOR_ONLY_NOT_A_KEY'}});
  const now='2026-09-14T12:00:00.000Z';
  const actor:Actor={issuer:'https://securetoken.google.com/'+cfg.project,uid:'owner-a',email:'owner-a@example.invalid'};
  const ctx:RegContext={enabled:true,clientId:'tenant-bar-a',environment:'local-fixture',authorityId:'dc07-local-v1',projectId:cfg.project,databaseId:cfg.database,issuer:actor.issuer,loadDb:async()=>db,now:()=>now};
    const cases:Array<Record<string,unknown>>=[];
  const expectedError=async(work:()=>Promise<unknown>,code:string)=>{await assert.rejects(work,(e:Error)=>e.message===code);};
  try{
    if(mode==='read'){
      const p=await projectReg(ctx,actor);assert.equal(p.groups[0].netMinor,'12800');assert.equal(p.operations.length,2);
      assert.ok(await commandStatus(ctx,actor,'receipt-one'));console.log(JSON.stringify({result:'PASS',mode,netMinor:p.groups[0].netMinor,operations:p.operations.length,source:cfg}));return;
    }
    assert.ok(['g1','g2','g3','g4','readers','reconciliation','session','payments','recovery','atomic','roster'].includes(mode));
    let effects=0;await expectedError(()=>authority({...ctx,enabled:false,loadDb:async()=>{effects++;return db;}}),'reg.disabled');assert.equal(effects,0);
    await expectedError(()=>authority({...ctx,projectId:'wrong-project'}),'reg.source_unavailable');
    cases.push({id:'G1-PRE',result:'PASS',disabledEffects:effects,sourceMismatch:'REJECTED'});
    const control:Control={clientId:ctx.clientId,environment:ctx.environment,authorityId:ctx.authorityId,schemaVersion:1,epoch:1,dataRevision:0,mode:'ready',minClientVersion:1,currencies:{ILS:2,USD:2}};
    const member={clientId:ctx.clientId,email:actor.email,role:'owner',status:'active',invitedAt:now};
    const grant:Grant={purpose:"merchant_customer_money",id:principalId(actor),clientId:ctx.clientId,environment:ctx.environment,schemaVersion:1,revision:1,authoredBy:actor,recordedAt:now,...actor,role:'owner',state:'active',scope:'all',capabilities:[...CAPABILITIES],membershipVersion:membershipVersion(member),epoch:1};
    await db.collection('admin_users').doc(actor.email).set(member);
    await db.collection('reg_legacy_fence').doc(ctx.clientId).set({authorityId:ctx.authorityId,environment:ctx.environment,epoch:1,manualMoney:'blocked'});
  await db.collection('reg_control').doc(physicalId(ctx,'control')).set(control);
    await db.collection('reg_grants').doc(physicalId(ctx,grant.id)).set(grant);
    const make=(commandId:string,type:Command['type'],operationId:string|null,payload:Record<string,unknown>,expectedRevisions:Record<string,number>):Command=>({schemaVersion:1,epoch:1,commandId,type,operationId,payload,expectedRevisions});
    const cutoverRef=db.collection('reg_legacy_fence').doc(ctx.clientId);
    const guardedMethod=make('cutover-negative','method.put',null,{aggregateId:'negative',label:'Must not persist',translations:{},currencies:['ILS'],state:'enabled',provider:''},{'methods:negative':0});
    await cutoverRef.delete();
    await expectedError(()=>executeCommand(ctx,actor,guardedMethod),'reg.cutover_required');
    const validCutover={authorityId:ctx.authorityId,environment:ctx.environment,epoch:1,manualMoney:'blocked'};
    for(const invalid of [{authorityId:'wrong-authority'},{environment:'other-environment'},{epoch:2},{manualMoney:'enabled'}]){
      await cutoverRef.set({...validCutover,...invalid});
      await expectedError(()=>executeCommand(ctx,actor,guardedMethod),'reg.cutover_required');
      assert.equal((await db.collection('reg_commands').get()).size,0);assert.equal((await db.collection('reg_events').get()).size,0);
      assert.equal((await db.collection('reg_methods').get()).size,0);
    }
    await cutoverRef.set({authorityId:ctx.authorityId,environment:ctx.environment,epoch:1,manualMoney:'blocked'});
    cases.push({id:'R23-cutover-precondition',result:'PASS',absent:'rejected',mismatches:['authority','environment','epoch','manualMoney'],writes:0});
    await executeCommand(ctx,actor,make('method-one','method.put',null,{aggregateId:'transfer',label:'Transferencia manual',translations:{he:'העברה',en:'Transfer',ar:'تحويل',ru:'Перевод'},currencies:['ILS','USD'],state:'enabled',provider:''},{'methods:transfer':0}));
    const payload=(amount:string)=>({state:'received_declared',money:{amountMinor:amount,currency:'ILS',scale:2},methodId:'transfer',effective:{instant:'2026-09-13T07:00:00.000Z',local:'2026-09-13T10:00:00',zone:'Asia/Jerusalem',offset:'+03:00'},evidence:{kind:'operator_declaration',attachmentState:'none_declared',note:'Ficticio',reference:''},description:'Cobro sin cita',links:[] as Link[],raw:''});
    const first=make('receipt-one','receipt.create','one',payload('12537'),{'operations:one':0});
    const results=await Promise.all(Array.from({length:8},()=>executeCommand(ctx,actor,first)));
    assert.ok(results.every(x=>x.revision===results[0].revision));
    let projection=await projectReg(ctx,actor);assert.equal(projection.operations.length,1);assert.equal(projection.operations[0].revision,1);assert.equal(projection.groups[0].netMinor,'12537');
    assert.equal((await db.collection('appointments').get()).size,0);assert.equal((await db.collection('customers').get()).size,0);
    cases.push({id:'R01/R21',result:'PASS',competitors:8,operations:1,netMinor:'12537',appointmentWrites:0,customerWrites:0});
    await expectedError(()=>executeCommand(ctx,actor,{...first,payload:payload('12538')}),'reg.command_conflict');
    await executeCommand(ctx,actor,make('receipt-two','receipt.create','two',payload('263'),{'operations:two':0}));
    projection=await projectReg(ctx,actor);assert.equal(projection.groups[0].netMinor,'12800');assert.equal(projection.operations.length,2);
    cases.push({id:'R02',result:'PASS',netMinor:'12800',operations:2});
    assert.equal(decimalToMinor('125.37',2),'12537');assert.equal(decimalToMinor('12',0),'12');assert.equal(decimalToMinor('1.234',3),'1234');assert.equal(decimalToMinor('9007199254740993',0),'9007199254740993');
    for(const bad of ['1.234','NaN','1e2','-1','1000000000000000000'])assert.throws(()=>decimalToMinor(bad,2));
    cases.push({id:'R04',result:'PASS',scales:[0,2,3],large:'9007199254740993'});
    assert.throws(()=>effectiveDate({instant:'2026-03-27T00:30:00.000Z',local:'2026-03-27T02:30:00',zone:'Asia/Jerusalem',offset:'+02:00'},now));
    await expectedError(()=>executeCommand(ctx,{...actor,uid:'intruder'},make('intruder','receipt.create','three',payload('500'),{'operations:three':0})),'reg.forbidden');
    await expectedError(()=>executeCommand({...ctx,clientId:'tenant-pel-b'},actor,first),'reg.authority_unavailable');
    await expectedError(()=>executeCommand(ctx,actor,{...first,commandId:'bad-epoch',epoch:2}),'reg.epoch_changed');
    const commands=await db.collection('reg_commands').get();assert.equal(commands.size,3);
    cases.push({id:'R23/R24',result:'PASS',unauthorizedWrites:0,acceptedCommands:3});
    if(mode==='g2'||mode==='g3')await runDomainNative(db,ctx);
    if(mode==='g3')await runHttpNative(db,ctx,configFile,cfg.httpPort);
    if(mode==='g3')await runCutoverNative(db,ctx,cfg.port);
    if(mode==='g4')await runUiNative(db,ctx,cfg);
    if(mode==='session')await runUiNative(db,ctx,{...cfg,sessionOnly:true});
    if(mode==='atomic')await atomicNative(db,ctx,cfg.output);
    if(mode==='roster')await runRosterNative(db,ctx,configFile,cfg.httpPort);
    if(mode==='payments')await runUiNative(db,ctx,{...cfg,paymentsOnly:true});
    if(mode==='recovery'){
      await runUiNative(db,ctx,{...cfg,recoveryOnly:true});
      const source=await readRecoveryData(db);assert.equal(source.counts.reg_operations,4);assert.equal(source.totals[JSON.stringify(['tenant-bar-a','ILS',2])],'12800');assert.equal(source.totals[JSON.stringify(['tenant-ui','ILS',2])],'12537');
      fs.writeFileSync(cfg.output+'/SOURCE-DATA.json',JSON.stringify(source,null,2),{flag:'wx'});
      const exportResponse=await fetch('http://'+cfg.host+':'+cfg.port+'/emulator/v1/projects/'+cfg.project+':export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({database:'projects/'+cfg.project+'/databases/(default)',export_directory:cfg.output,export_name:'firestore_export'})});assert.equal(exportResponse.status,200);assert.ok(fs.existsSync(cfg.output+'/firestore_export/firestore_export.overall_export_metadata'));
      console.log(JSON.stringify({id:'R22-native-export',result:'PASS',operations:source.counts.reg_operations,counts:source.counts,totals:source.totals}));
    }
    if(mode==='readers')await runReadersNative(db,ctx,configFile);
    if(mode==='reconciliation')await runReconciliationNative(db,ctx,cfg.output);
    console.log(JSON.stringify({result:'PASS_G1_SUBSET',cases,source:cfg,remaining:'G1 instrument mutants/HTTP and complete AC1-7/R01-28 remain required'}));
  }finally{await db.terminate();}
}
