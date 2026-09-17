import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readRecoveryData } from './reg-recovery-data.js';
import { projectReg } from '../src/lib/reg/projection.js';
import { commandStatus } from '../src/lib/reg/store.js';

export async function verifyImport(configFile:string,phase:string){
  const cfg=JSON.parse(fs.readFileSync(configFile,'utf8')),expected=JSON.parse(fs.readFileSync(cfg.output+'/SOURCE-EXPECTED.json','utf8'));
  assert.equal(cfg.project,'demo-dc07-reg-prep');assert.equal(cfg.database,'(default)');assert.equal(cfg.host,'127.0.0.1');assert.equal(process.env.FIRESTORE_EMULATOR_HOST,cfg.host+':'+cfg.port);
  const req=createRequire(process.cwd()+'/package.json'),{Firestore}=req('@google-cloud/firestore');
  const db=new Firestore({projectId:cfg.project,databaseId:cfg.database,host:cfg.host+':'+cfg.port,ssl:false,universeDomain:'googleapis.com',credentials:{client_email:'fixture@example.invalid',private_key:'EMULATOR_ONLY_NOT_A_KEY'}});
  try{
    const actual=await readRecoveryData(db);
    if(phase==='empty'){assert.equal(actual.counts.reg_operations,0);assert.notDeepEqual(actual,expected);console.log(JSON.stringify({id:'R22-empty-control',result:'PASS',recoveryRejected:true,operations:0,expected:4}));return;}
    assert.deepEqual(actual,expected);assert.equal(actual.counts.reg_operations,4);
    const actor={issuer:'https://securetoken.google.com/'+cfg.project,uid:'owner-a',email:'owner-a@example.invalid'},ctx={enabled:true,clientId:'tenant-bar-a',environment:'local-fixture',authorityId:'dc07-local-v1',projectId:cfg.project,databaseId:cfg.database,issuer:actor.issuer,loadDb:async()=>db,now:()=> '2026-09-14T12:00:00.000Z'};
    const reg=await projectReg(ctx,actor);assert.equal(reg.groups[0].netMinor,'12800');assert.equal(reg.operations.length,2);assert.ok(await commandStatus(ctx,actor,'receipt-one'));
    const uiActor={...actor,uid:'ui-owner',email:'ui-owner@example.invalid'},ui=await projectReg({...ctx,clientId:'tenant-ui'},uiActor);assert.equal(ui.groups[0].netMinor,'12537');assert.equal(ui.operations.find(op=>op.kind==='receipt')?.reservedMinor,'2800');
    console.log(JSON.stringify({id:'R22-import',result:'PASS',counts:actual.counts,totals:actual.totals,byteData:'all document values/IDs/events/commands equal',reservation:'2800',projection:'matches independent source oracle'}));
  }finally{await db.terminate();}
}
