import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { Page } from 'playwright';
import type { Firestore } from 'firebase-admin/firestore';
import { executeCommand } from '../src/lib/reg/store.js';
import { projectReg } from '../src/lib/reg/projection.js';
import type { RegContext } from '../src/lib/reg/authority.js';
import type { Actor, Command } from '../src/lib/reg/types.js';
import { regText } from '../src/lib/reg/labels.js';

export async function seedPayments(db:Firestore,ctx:RegContext,actor:Actor){
  const send=(id:string,payload:Record<string,unknown>,type:Command['type']='receipt.create',expected:Record<string,number>={})=>executeCommand(ctx,actor,{schemaVersion:1,epoch:1,commandId:id,operationId:id,type,expectedRevisions:{['operations:'+id]:0,...expected},payload});
  const evidence={kind:'operator_declaration',attachmentState:'none_declared',reference:'',note:'Fixture'};
  for(const [id,day,amountMinor]of [['period-today','2026-09-14','10000'],['period-seven','2026-09-08','2000'],['period-previous','2026-09-07','3000'],['period-old','2026-08-15','4000']])await send(id,{state:'received_declared',money:{amountMinor,currency:'ILS',scale:2},methodId:'cash',effective:{instant:day+'T07:00:00.000Z',local:day+'T10:00:00',zone:'Asia/Jerusalem',offset:'+03:00'},evidence,description:id,links:[],raw:''});
  await send('period-unknown',{state:'pending_normalization',money:null,methodId:'cash',effective:null,evidence,description:'period-unknown',links:[],raw:'Original uncertain amount'});
  await send('period-refund',{parentReceiptId:'period-today',state:'refund_declared',money:{amountMinor:'500',currency:'ILS',scale:2},methodId:'cash',effective:{instant:'2026-09-13T07:00:00.000Z',local:'2026-09-13T10:00:00',zone:'Asia/Jerusalem',offset:'+03:00'},distribution:{unallocatedMinor:'500',allocations:[]},evidence,description:'period-refund',links:[],raw:''},'refund.create',{'operations:period-today':1});
  await db.collection('appointments').doc('period-legacy').set({clientId:ctx.clientId,customerName:'Cliente histórico',customerPhone:'fixture-phone',serviceId:'fixture-service',staffId:'fixture-professional',serviceName:'Servicio conservado',date:'2026-09-14',time:'12:00',status:'cancelled',amountPaidCents:12537,paymentMethod:'cash'});
  await db.collection('appointments').doc('period-reference').set({clientId:ctx.clientId,customerName:'Cliente referencia',serviceId:'fixture-service',staffId:'missing-professional',date:'2026-09-14',amountPaidCents:263});
  await db.collection('customers').doc('period-contact').set({clientId:ctx.clientId,fullName:'Contacto conservado',email:'contact@example.invalid',phone:'fixture-contact-phone',lastServiceId:'fixture-service',lifetimeValueCents:70000,createdAt:new Date('2026-09-01T12:00:00Z'),updatedAt:new Date('2026-09-01T12:00:00Z')});
}

/** Parser de CSV independiente del serializador: comillas dobles, campos y saltos conservados. */
function csvRows(csv:string):Record<string,string>[] {
  const rows:string[][]=[];let row:string[]=[],field='',quoted=false;
  for(let i=0;i<csv.length;i++){const c=csv[i];if(c==='"'){if(quoted&&csv[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(!quoted&&(c===','||c==='\n')){row.push(field);field='';if(c==='\n'){rows.push(row);row=[];}}else if(c!=='\r'||quoted)field+=c;}
  row.push(field);rows.push(row);assert.equal(quoted,false);const keys=rows.shift()!;return rows.map(values=>{assert.equal(values.length,keys.length);return Object.fromEntries(keys.map((key,i)=>[key,values[i]]));});
}

export async function testPayments(page:Page,db:Firestore,ctx:RegContext,actor:Actor,cfg:{httpPort:number;output:string},expect:typeof import('@playwright/test').expect){
  await page.clock.setFixedTime(new Date('2026-09-14T12:00:00Z'));
  const cases=[{key:'days7',from:'2026-09-08',to:'2026-09-14',net:'11500',ids:['period-today','period-seven','period-refund','period-unknown']},{key:'days30',from:'2026-08-16',to:'2026-09-14',net:'14500',ids:['period-today','period-seven','period-previous','period-refund','period-unknown']},{key:'custom',from:'2026-09-07',to:'2026-09-07',net:'3000',ids:['period-previous','period-unknown']},{key:'allDates',from:'',to:'',net:'18500',ids:['period-today','period-seven','period-previous','period-old','period-refund','period-unknown']}] as const;
  for(const language of ['en','he','ar','ru'])for(const mobile of [false,true]){
    const t=(key:Parameters<typeof regText>[1])=>regText(language,key),tag=language+(mobile?'-mobile':'-desktop');
    await page.setViewportSize({width:mobile?390:1440,height:mobile?844:1000});await page.goto('http://127.0.0.1:'+cfg.httpPort+'/?language='+language);
    const panel=page.getByRole('region',{name:t('title')});await expect(panel.getByRole('button',{name:t('create'),exact:true})).toBeEnabled();
    await expect(page.locator('p').filter({hasText:'Contacto conservado'})).toHaveCount(1);
    await expect(panel.locator('[data-period-net="14500"]')).toHaveCount(1);
    for(const test of cases){
      await panel.getByRole('button',{name:t(test.key),exact:true}).click();
      if(test.key==='custom'){await expect(panel.getByRole('button',{name:t('export'),exact:true})).toBeDisabled();await panel.getByLabel(t('from'),{exact:true}).fill(test.from);await panel.getByLabel(t('to'),{exact:true}).fill(test.to);}
      await expect(panel.locator('[data-period-net="'+test.net+'"]')).toHaveCount(1);
      assert.deepEqual((await panel.locator('[data-operation-id]').evaluateAll(rows=>rows.map(row=>row.getAttribute('data-operation-id')))).sort(),[...test.ids].sort());
      const downloadPromise=page.waitForEvent('download');await panel.getByRole('button',{name:t('export'),exact:true}).click();const download=await downloadPromise,path=cfg.output+'/'+tag+'-'+test.key+'.csv';await download.saveAs(path);
      const csv=csvRows(fs.readFileSync(path,'utf8')),operations=csv.filter(row=>['receipt','refund'].includes(row.type));assert.deepEqual(operations.map(row=>row.operationId).sort(),[...test.ids].sort());
      const net=operations.filter(row=>['received_declared','refund_declared'].includes(row.state)).reduce((sum,row)=>sum+BigInt(row.amountMinor)*(row.type==='refund'?-1n:1n),0n);assert.equal(String(net),test.net);
      assert.ok(operations.every(row=>row.periodFrom===test.from&&row.periodTo===test.to&&row.unknownCount==='1'));
      const historical=csv.filter(row=>row.type==='legacy');assert.equal(historical.length,3);assert.ok(historical.every(row=>row.coverage==='legacy_unlinked'&&row.excludedFromTotal==='true'&&row.projectId===ctx.projectId&&row.databaseId===ctx.databaseId&&row.documentId));assert.ok(historical.some(row=>row.raw.includes('Cliente histórico')));assert.ok(historical.some(row=>row.raw.includes('Contacto conservado')&&row.raw.includes('70000')));
      const native=await projectReg(ctx,actor,{from:test.from||undefined,to:test.to||undefined});assert.deepEqual(native.operations.map(row=>row.id).sort(),[...test.ids].sort());assert.equal(native.groups[0].netMinor,test.net);
    }
    await page.getByText(t('legacy'),{exact:true}).click();await expect(page.locator('p').filter({hasText:'Servicio conservado'})).toHaveCount(1);await expect(page.getByText('Profesional actual',{exact:false})).toHaveCount(1);await expect(page.getByText(t('legacyPeriod'),{exact:true})).toBeVisible();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Payments overflow');await page.screenshot({path:cfg.output+'/payments-'+tag+'.png',fullPage:true});
    console.log(JSON.stringify({id:'SP02-Payments',result:'PASS',language,viewport:mobile?'mobile':'desktop',periods:4,source:'native REG HTTP/Firestore; native browser customer SDK/mock claims; legacy appointments fixture endpoint',limits:'fictitious local authority only'}));
  }
  await page.goto('http://127.0.0.1:'+cfg.httpPort+'/?language=en&catalog=changed');await expect(page.locator('[data-period-net="14500"]')).toHaveCount(1);await page.getByText(regText('en','legacy'),{exact:true}).click();await expect(page.getByText('Catálogo cambiado',{exact:false})).toHaveCount(2);await expect(page.locator('p').filter({hasText:'Servicio conservado'})).toHaveCount(1);
  const history=await db.collection('appointments').where('clientId','==',ctx.clientId).get();assert.equal(history.size,2);assert.equal(history.docs.find(doc=>doc.id==='period-legacy')!.data().amountPaidCents,12537);
  await page.goto('http://127.0.0.1:'+cfg.httpPort+'/?language=en&denied=1');await page.getByText(regText('en','legacy'),{exact:true}).click();await expect(page.getByText(regText('en','historyIncomplete'),{exact:true})).toBeVisible();await expect(page.locator('p').filter({hasText:'Contacto conservado'})).toHaveCount(0);
  const downloading=page.waitForEvent('download');await page.getByRole('button',{name:regText('en','export'),exact:true}).click();const file=cfg.output+'/source-denied.csv';await(await downloading).saveAs(file);const rows=csvRows(fs.readFileSync(file,'utf8'));assert.equal(rows.filter(row=>row.type==='legacy').length,2);assert.equal(rows.filter(row=>row.state==='legacy_source_incomplete'&&row.coverage==='partial').length,1);assert.ok(rows.filter(row=>row.type==='legacy').every(row=>row.limitations.includes('incomplete')));
  console.log(JSON.stringify({id:'SP04-legacy-source-denied',result:'PASS',retainedAppointments:2,unavailableCustomers:'explicit partial coverage in UI and CSV',source:'native Firestore rules deny wrong tenant claim'}));
}
