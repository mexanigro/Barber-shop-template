import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { generateKeyPairSync,sign } from 'node:crypto';
import fs from 'node:fs';
import type { Firestore } from 'firebase-admin/firestore';
import { verifyFirebaseIdToken } from '../src/lib/api/admin-auth.js';
import { membershipVersion, physicalId, principalId, type RegContext } from '../src/lib/reg/authority.js';
import { executeCommand } from '../src/lib/reg/store.js';
import { projectReg } from '../src/lib/reg/projection.js';
import { regText } from '../src/lib/reg/labels.js';
import { CAPABILITIES, type Actor, type Grant } from '../src/lib/reg/types.js';
import { seedPayments, testPayments } from './reg-payments-ui.js';
import { packageUi } from './reg-package-ui.js';
import { recoveryUi } from './reg-recovery-ui.js';

/** UI real de REG → HTTP atribuido → Firestore nativo. No bootstrap ni proveedores. */
export async function runUiNative(db:Firestore,base:RegContext,cfg:{httpPort:number;port?:number;browser:string;output:string;sessionOnly?:boolean;paymentsOnly?:boolean;recoveryOnly?:boolean}):Promise<void>{
  const req=createRequire(process.cwd()+'/package.json'),{chromium,expect}=req('@playwright/test'),express=req('express');
  const runtime=createRequire(cfg.output+'/CONFIG.json')('./runtimes.cjs');
  const ctx={...base,clientId:'tenant-ui',cursorKey:'LOCAL_CURSOR_FIXTURE_ONLY'},actor:Actor={issuer:ctx.issuer,uid:'ui-owner',email:'ui-owner@example.invalid'},now=ctx.now!();
  const member={clientId:ctx.clientId,role:'owner',status:'active',invitedAt:now};
  const grant:Grant={purpose:'merchant_customer_money',id:principalId(actor),clientId:ctx.clientId,environment:ctx.environment,schemaVersion:1,revision:1,authoredBy:actor,recordedAt:now,...actor,role:'owner',state:'active',scope:'all',capabilities:[...CAPABILITIES],membershipVersion:membershipVersion(member),epoch:1};
  await db.collection('admin_users').doc(actor.email).set(member);
  await db.collection('reg_legacy_fence').doc(ctx.clientId).set({authorityId:ctx.authorityId,environment:ctx.environment,epoch:1,manualMoney:'blocked'});
  await db.collection('reg_control').doc(physicalId(ctx,'control')).set({clientId:ctx.clientId,environment:ctx.environment,authorityId:ctx.authorityId,schemaVersion:1,epoch:1,dataRevision:0,mode:'ready',minClientVersion:1,currencies:{ILS:2,USD:2}});
  await db.collection('reg_grants').doc(physicalId(ctx,grant.id)).set(grant);
  await executeCommand(ctx,actor,{schemaVersion:1,epoch:1,commandId:'ui-method',operationId:null,type:'method.put',expectedRevisions:{'methods:cash':0},payload:{aggregateId:'cash',label:'Cash fixture',translations:{en:'Cash',he:'מזומן',ar:'نقد',ru:'Наличные'},state:'enabled',currencies:['ILS','USD'],provider:''}});
  if(cfg.paymentsOnly)await seedPayments(db,ctx,actor);
  const pair=generateKeyPairSync('rsa',{modulusLength:2048}),cert=pair.publicKey.export({type:'spki',format:'pem'}).toString();
  const b64=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url'),header=b64({alg:'RS256',kid:'local'}),body=b64({iss:actor.issuer,aud:ctx.projectId,sub:actor.uid,email:actor.email,email_verified:true,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+1200});
  const token=header+'.'+body+'.'+sign('RSA-SHA256',Buffer.from(header+'.'+body),pair.privateKey).toString('base64url');
  const verify=(value:string,projects:readonly string[])=>verifyFirebaseIdToken(value,projects,async()=>({local:cert}));
  const app=express();app.use(express.json({limit:'140kb'}));runtime.registerApiReg(app,ctx,verify);
  app.get('/fixture.json',async(q:{query:{catalog?:string;denied?:string}},res:{json:(v:unknown)=>void})=>res.json({uid:actor.uid,token,payments:!!cfg.paymentsOnly,project:ctx.projectId,clientId:ctx.clientId,host:'127.0.0.1',port:cfg.port,denied:!!q.query.denied,appointments:cfg.paymentsOnly?(await db.collection('appointments').where('clientId','==',ctx.clientId).get()).docs.map(doc=>({id:doc.id,...doc.data()})):[],services:[{id:'fixture-service',name:q.query.catalog==='changed'?'Catálogo cambiado':'Servicio actual',price:q.query.catalog==='changed'?999999:480}],staff:[{id:'fixture-professional',name:'Profesional actual'}]}));
  app.get('/ui.js',(_q:unknown,res:{type:(t:string)=>{send:(v:string)=>void}})=>res.type('text/javascript').send(fs.readFileSync(cfg.output+'/ui.js','utf8')));
  app.get('/ui.css',(_q:unknown,res:{type:(t:string)=>{send:(v:string)=>void}})=>res.type('text/css').send(fs.readFileSync(cfg.output+'/ui.css','utf8')));
  app.get('/',(_q:unknown,res:{send:(v:string)=>void})=>res.send('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/ui.css"><div id="root"></div><script src="/ui.js"></script>'));
  const server=await new Promise<import('node:http').Server>(resolve=>{const s=app.listen(cfg.httpPort,'127.0.0.1',()=>resolve(s));});
  const blocked:string[]=[],errors:string[]=[];let browser:import('playwright').BrowserContext|undefined;
  const processApi=req('node:child_process'),spawn=processApi.spawn,owned:{pid:number;exit:boolean}[]=[];
  async function open(){
    assert.equal(browser,undefined);const count=owned.length;
    processApi.spawn=function(executable:string,...args:unknown[]){const child=spawn.call(this,executable,...args);if(executable.replaceAll('\\','/').toLowerCase()===cfg.browser.toLowerCase()){const record={pid:child.pid,exit:false};owned.push(record);child.once('exit',()=>{record.exit=true;});}return child;};
    try{browser=await chromium.launchPersistentContext(cfg.output+'/profile',{executablePath:cfg.browser,headless:true,env:{SystemRoot:process.env.SystemRoot!,USERPROFILE:cfg.output,HOME:cfg.output,TEMP:cfg.output,TMP:cfg.output},args:['--disable-background-networking','--disable-component-update','--disable-sync','--proxy-server=socks5://127.0.0.1:9','--proxy-bypass-list=127.0.0.1','--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1']});}finally{processApi.spawn=spawn;}
    assert.equal(owned.length,count+1,'Chrome PID must be attributed');
    await browser!.route('**/*',async route=>{const u=new URL(route.request().url());if(u.protocol==='http:'&&u.hostname==='127.0.0.1'&&(u.port===String(cfg.httpPort)||cfg.paymentsOnly&&u.port===String(cfg.port)))await route.continue();else{blocked.push(u.origin);await route.abort();}});
    browser!.on('page',page=>{page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(12000);});return browser!;
  }
  async function close(){if(browser){await browser.close();browser=undefined;}}
  try{
    if(cfg.recoveryOnly){await recoveryUi(open,close,db,ctx,cfg,expect);assert.deepEqual(blocked,[]);assert.deepEqual(errors,[]);return;}
    await open();const page=await browser!.newPage();
    if(cfg.paymentsOnly){await testPayments(page,db,ctx,actor,cfg,expect);assert.deepEqual(blocked,[]);assert.deepEqual(errors,[]);return;}
    if(cfg.sessionOnly){
      await page.goto('http://127.0.0.1:'+cfg.httpPort+'/');
      const results=await page.evaluate(()=> (window as unknown as {runSessionCases:()=>Promise<Record<string,unknown>[]>}).runSessionCases());
      const tag='tabs-'+crypto.randomUUID(),other=await browser.newPage();await other.goto('http://127.0.0.1:'+cfg.httpPort+'/');
      const late=page.evaluate(tag=>(window as unknown as {startLateCase:(tag:string)=>Promise<{state:string;commandId:string}>}).startLateCase(tag),tag);
      await page.waitForFunction(()=>(window as unknown as {lateReady:()=>boolean}).lateReady());
      const recovered=await other.evaluate(tag=>(window as unknown as {recoverLateCase:(tag:string)=>Promise<{state:string;commandId:string}>}).recoverLateCase(tag),tag);
      await page.evaluate(()=>(window as unknown as {releaseLateResponse:()=>void}).releaseLateResponse());const delayed=await late;
      results.push({stage:'two_tabs_late_response',recovered,delayed,pass:recovered.state==='accepted'&&delayed.state==='accepted'&&recovered.commandId===tag&&delayed.commandId===tag});await other.close();
      fs.writeFileSync(cfg.output+'/SESSION-OBSERVATION.json',JSON.stringify({transport:'controlled responses, real Chromium and IndexedDB',results},null,2),{flag:'wx'});
      console.log(JSON.stringify({id:'SP03-session',results}));
      assert.ok(results.every(row=>row.pass),'SP03: changed session must not send or publish another identity');return;
    }
    let expected=0n;
    for(const language of ['en','he','ar','ru'])for(const mobile of [false,true]){
      const label=(key:Parameters<typeof regText>[1])=>regText(language,key),tag=language+(mobile?'-mobile':'-desktop');
      await page.setViewportSize({width:mobile?390:1440,height:mobile?844:1000});await page.goto('http://127.0.0.1:'+cfg.httpPort+'/?language='+language);
      const panel=page.getByRole('region',{name:label('title')}),form=panel.locator('form');
      await expect(panel.getByRole('button',{name:label('create'),exact:true})).toBeEnabled();
      const fill=async(amount:string,description:string)=>{
        await form.getByLabel(label('amount'),{exact:true}).fill(amount);await form.getByLabel(label('date'),{exact:true}).fill('2026-09-13T10:00');await form.getByLabel(label('offset'),{exact:true}).selectOption('+03:00');await form.getByLabel(label('description'),{exact:true}).fill(description);
      };
      const save=async()=>{await form.getByRole('button',{name:label('save'),exact:true}).click();await expect(form).toHaveCount(0);};
      await panel.getByRole('button',{name:label('create'),exact:true}).click();await fill('125.37',tag+' first');await save();
      await panel.getByRole('button',{name:label('create'),exact:true}).click();await fill('2.63',tag+' second');await save();
      const row=panel.locator('[data-operation-id]').filter({hasText:tag+' first'});const id=await row.getAttribute('data-operation-id');assert.ok(id);
      await row.getByRole('button',{name:label('correct'),exact:true}).click();await fill('120.00',tag+' first');await form.getByLabel(label('reason'),{exact:true}).fill('Fictitious correction');await save();
      await row.getByRole('button',{name:label('refund'),exact:true}).click();await fill('28.00',tag+' refund');await form.getByLabel(label('unallocated'),{exact:true}).fill('28.00');await save();
      expected+=9463n;
      const reading=await projectReg(ctx,actor);assert.equal(reading.groups[0].netMinor,String(expected));assert.equal(reading.operations.find(op=>op.id===id)?.revision,3);
      await page.reload();await expect(panel.getByRole('button',{name:label('create'),exact:true})).toBeEnabled();
      await expect(page.locator('[data-reg-net="'+expected+'"]')).toHaveCount(1);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'UI horizontal overflow');
      await row.getByRole('button',{name:label('history'),exact:true}).click();await expect(page.getByText(label('reason')+': Fictitious correction',{exact:true})).toBeVisible();
      await page.screenshot({path:cfg.output+'/'+tag+'.png',fullPage:true});
      assert.equal((await db.collection('appointments').where('clientId','==',ctx.clientId).get()).size,0);assert.equal((await db.collection('customers').where('clientId','==',ctx.clientId).get()).size,0);
      console.log(JSON.stringify({id:'R26-UI-subset',result:'PASS',language,viewport:mobile?'mobile':'desktop',netMinor:String(expected),operationId:id,source:'api registration + native Firestore',remaining:'complete readers/contacts/roles/recovery'}));
      await packageUi(page,db,ctx,actor,tag,language,cfg.output,expect);
    }
    assert.deepEqual(blocked,[]);assert.deepEqual(errors,[]);
  }finally{
    processApi.spawn=spawn;
    if(browser)await browser.close();await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
    fs.writeFileSync(cfg.output+'/UI-AUDIT.json',JSON.stringify({blocked,errors,owned,browserClosed:true,serverClosed:true}),{flag:'wx'});
    assert.ok(owned.every(child=>child.exit),'Chrome own process must exit');
  }
}
