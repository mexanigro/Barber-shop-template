import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { BrowserContext, Page, Route } from 'playwright';
import type { Firestore } from 'firebase-admin/firestore';
import type { Command } from '../src/lib/reg/types.js';
import type { RegIntent } from '../src/lib/reg-intents.js';
import { regText } from '../src/lib/reg/labels.js';
import { physicalId, type RegContext } from '../src/lib/reg/authority.js';

/** La respuesta se pierde después de leerla del servidor real; el journal sobrevive al proceso de Chromium. */
export async function recoveryUi(open:()=>Promise<BrowserContext>,close:()=>Promise<void>,db:Firestore,ctx:RegContext,cfg:{httpPort:number;output:string},expect:typeof import('@playwright/test').expect){
  let browser=await open(),page=await browser.newPage();const url='http://127.0.0.1:'+cfg.httpPort+'/',t=(key:Parameters<typeof regText>[1])=>regText('en',key);
  const journal=(page:Page)=>page.evaluate(()=>(window as unknown as {fixtureRegClient:{intents:()=>Promise<RegIntent[]>}}).fixtureRegClient.intents());
  await page.goto(url);let parentId='';const observations:unknown[]=[];
  for(const kind of ['receipt','refund'] as const){
    const panel=page.getByRole('region',{name:t('title')});await expect(panel.getByRole('button',{name:t('create'),exact:true})).toBeEnabled();
    let sent:Command|undefined,postCount=0;const lost:((route:Route)=>Promise<void>)=async route=>{
      if(route.request().method()==='POST'){
        sent=route.request().postDataJSON() as Command;postCount++;const response=await route.fetch();assert.equal(response.status(),200);await response.body();await route.abort('failed');
      }else await route.abort('failed');
    };
    await page.route('**/api/crm/reg/commands**',lost);
    if(kind==='receipt')await panel.getByRole('button',{name:t('create'),exact:true}).click();else await panel.locator('[data-operation-id="'+parentId+'"]').getByRole('button',{name:t('refund'),exact:true}).click();
    const form=panel.locator('form');await form.getByLabel(t('amount'),{exact:true}).fill(kind==='receipt'?'125.37':'28.00');await form.getByLabel(t('date'),{exact:true}).fill('2026-09-13T10:00');await form.getByLabel(t('offset'),{exact:true}).selectOption('+03:00');await form.getByLabel(t('description'),{exact:true}).fill('Recovery '+kind);
    if(kind==='refund'){await form.getByLabel(t('state'),{exact:true}).selectOption('refund_pending');await form.getByLabel(t('unallocated'),{exact:true}).fill('28.00');}
    await form.getByRole('button',{name:t('save'),exact:true}).click();await expect(panel.getByRole('button',{name:t('recover'),exact:true})).toHaveCount(1);
    assert.ok(sent);const identifier=sent.operationId!;if(kind==='receipt')parentId=identifier;
    const before=await journal(page);assert.equal(before.find(row=>row.command.commandId===sent!.commandId)?.state,'uncertain');assert.equal(postCount,1);
    const physical=await db.collection('reg_operations').doc(physicalId(ctx,identifier)).get();assert.equal(physical.data()?.state,kind==='receipt'?'received_declared':'refund_pending');
    await close();browser=await open();page=await browser.newPage();await page.goto(url);
    const restarted=page.getByRole('region',{name:t('title')});await expect(restarted.getByRole('button',{name:t('recover'),exact:true})).toHaveCount(1);assert.deepEqual((await journal(page)).find(row=>row.command.commandId===sent!.commandId),before.find(row=>row.command.commandId===sent!.commandId));
    await restarted.getByRole('button',{name:t('recover'),exact:true}).click();await expect(restarted.getByRole('button',{name:t('recover'),exact:true})).toHaveCount(0);await expect(restarted.getByRole('button',{name:t('create'),exact:true})).toBeEnabled();
    const accepted=(await journal(page)).find(row=>row.command.commandId===sent!.commandId)!;assert.equal(accepted.state,'accepted');assert.deepEqual(accepted.command,sent);
    const count=(await db.collection('reg_commands').where('commandId','==',sent.commandId).get()).size;assert.equal(count,1);
    if(kind==='refund')assert.equal((await db.collection('reg_operations').doc(physicalId(ctx,parentId)).get()).data()?.reservedMinor,'2800');
    observations.push({kind,commandId:sent.commandId,operationId:identifier,stateBeforeRestart:'uncertain',stateAfterRecovery:accepted.state,posts:postCount,commands:count,scope:accepted.scope});
  }
  await close();browser=await open();page=await browser.newPage();await page.goto(url);await expect(page.getByRole('button',{name:t('create'),exact:true})).toBeEnabled();assert.equal((await journal(page)).filter(row=>row.state==='accepted').length,2);
  fs.writeFileSync(cfg.output+'/RECOVERY-BROWSER.json',JSON.stringify({result:'PASS',observations,restarts:3,refundReservation:'2800 preserved, no timeout release'},null,2),{flag:'wx'});console.log(JSON.stringify({id:'R12-R21-R22-browser',result:'PASS',restarts:3,operations:2,uncertainRecovered:2,actualPostCommitResponseLoss:true,reservation:'2800'}));
}
