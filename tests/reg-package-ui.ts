import assert from 'node:assert/strict';
import type { Page } from 'playwright';
import type { Firestore } from 'firebase-admin/firestore';
import type { Actor, Command, Entity } from '../src/lib/reg/types.js';
import { executeCommand } from '../src/lib/reg/store.js';
import { projectReg } from '../src/lib/reg/projection.js';
import type { RegContext } from '../src/lib/reg/authority.js';
import { regText } from '../src/lib/reg/labels.js';

export async function packageUi(page:Page,db:Firestore,ctx:RegContext,actor:Actor,tag:string,language:string,output:string,expect:typeof import('@playwright/test').expect){
  const ids={receipt:tag+'-package',refund:tag+'-refund',allocation:tag+'-allocated',ils:tag+'-ils',usd:tag+'-usd'};
  let sequence=0;
  async function send(type:Command['type'],operationId:string|null,payload:Record<string,unknown>){
    const expectedRevisions:Record<string,number>={};
    for(const kind of ['operations','agreements','allocations','methods']){const docs=await db.collection('reg_'+kind).where('clientId','==',ctx.clientId).get();for(const doc of docs.docs){const row=doc.data() as Entity;expectedRevisions[kind+':'+row.id]=row.revision;}}
    if(operationId)expectedRevisions['operations:'+operationId]??=0;
    if(payload.aggregateId)expectedRevisions[(type==='agreement.put'?'agreements':'allocations')+':'+payload.aggregateId]??=0;
    return executeCommand(ctx,actor,{schemaVersion:1,epoch:1,commandId:tag+'-seed-'+(++sequence),operationId,type,expectedRevisions,payload});
  }
  const money=(amountMinor:string,currency='ILS')=>({amountMinor,currency,scale:2});
  const payload={state:'received_declared',money:money('10000'),methodId:'cash',effective:{instant:'2026-09-13T07:00:00.000Z',local:'2026-09-13T10:00:00',zone:'Asia/Jerusalem',offset:'+03:00'},evidence:{kind:'operator_declaration',attachmentState:'none_declared',reference:'',note:'Fixture'},description:ids.receipt,raw:'',links:[] as import('../src/lib/reg/types.js').Link[]};
  await send('receipt.create',ids.receipt,payload);
  for(const [id,currency]of [[ids.ils,'ILS'],[ids.usd,'USD']])await send('agreement.put',null,{aggregateId:id,money:money('30000',currency),currency,scale:2,description:id,links:[]});
  await send('allocation.put',null,{aggregateId:ids.allocation,receiptId:ids.receipt,agreementId:ids.ils,agreementRevision:1,money:money('5000'),state:'active'});
  await send('refund.create',ids.refund,{...payload,money:money('1000'),state:'refund_pending',parentReceiptId:ids.receipt,description:ids.refund,distribution:{unallocatedMinor:'1000',allocations:[]}});
  await page.reload();const t=(key:Parameters<typeof regText>[1])=>regText(language,key),panel=page.getByRole('region',{name:t('title')}),form=panel.locator('form'),row=panel.locator('[data-operation-id="'+ids.receipt+'"]');
  await expect(panel.getByRole('button',{name:t('create'),exact:true})).toBeEnabled();await row.getByRole('button',{name:t('correct'),exact:true}).click();
  await form.getByLabel(t('currency'),{exact:true}).selectOption('USD');await form.getByLabel(t('amount'),{exact:true}).fill('200.00');await form.getByLabel(t('reason'),{exact:true}).fill('Explicit package correction');
  const allocation=form.locator('[data-dependent-allocation="'+ids.allocation+'"]');await allocation.getByLabel(t('dependencies')+' '+ids.allocation,{exact:true}).fill('70.00');await allocation.getByLabel(t('agreement'),{exact:true}).selectOption(ids.usd);
  const refund=form.locator('[data-dependent-refund="'+ids.refund+'"]');await refund.getByRole('checkbox').check();await refund.getByLabel(t('amount'),{exact:true}).fill('50.00');await refund.getByLabel(t('unallocated'),{exact:true}).fill('50.00');await refund.getByLabel(t('reason'),{exact:true}).fill('Explicit pending refund correction');
  await form.screenshot({path:output+'/package-'+tag+'.png'});await form.getByRole('button',{name:t('save'),exact:true}).click();await expect(form).toHaveCount(0);await expect(panel.getByRole('button',{name:t('create'),exact:true})).toBeEnabled();
  const corrected=await projectReg(ctx,actor),parent=corrected.operations.find(op=>op.id===ids.receipt)!;
  assert.deepEqual([parent.money?.currency,parent.money?.amountMinor,parent.allocatedMinor,parent.reservedMinor],['USD','20000','7000','5000']);assert.equal(corrected.agreements.find(agreement=>agreement.id===ids.ils)?.allocatedMinor,'0');assert.equal(corrected.agreements.find(agreement=>agreement.id===ids.usd)?.allocatedMinor,'7000');
  await row.getByRole('button',{name:t('correct'),exact:true}).click();await form.getByLabel(t('state'),{exact:true}).selectOption('void');await form.getByLabel(t('reason'),{exact:true}).fill('Void erroneous package');await allocation.getByLabel(t('dependencies')+' '+ids.allocation,{exact:true}).fill('0');
  await refund.getByRole('checkbox').check();await refund.getByLabel(t('amount'),{exact:true}).fill('50.00');await refund.getByLabel(t('state'),{exact:true}).selectOption('void');await refund.getByLabel(t('unallocated'),{exact:true}).fill('50.00');await refund.getByLabel(t('reason'),{exact:true}).fill('Void erroneous child declaration');
  await form.getByRole('button',{name:t('save'),exact:true}).click();await expect(form).toHaveCount(0);await expect(panel.getByRole('button',{name:t('create'),exact:true})).toBeEnabled();
  const final=await projectReg(ctx,actor),voided=final.operations.find(op=>op.id===ids.receipt)!;assert.deepEqual([voided.state,voided.allocatedMinor,voided.refundedMinor,voided.reservedMinor],['void','0','0','0']);assert.equal(final.operations.find(op=>op.id===ids.refund)?.state,'void');assert.equal(final.allocations.find(a=>a.id===ids.allocation)?.state,'released');
  console.log(JSON.stringify({id:'R14-UI',result:'PASS',tag,language,explicitUnit:'USD',amountMinor:'20000',allocatedMinor:'7000',reservedMinor:'5000',void:'parent + child + allocation, atomic native commit',limits:'declarations, no provider'}));
}
