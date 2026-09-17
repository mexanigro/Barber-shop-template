import React from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { regService, type RegCapabilities } from '../../services/reg';
import { regText, type RegLabel } from '../../lib/reg/labels';
import { decimalToMinor, formatMoney, effectiveDate } from '../../lib/reg/money';
import { agreementBalance, appendLegacyCsv } from '../../lib/reg/view';
import type { LegacyMoneyRow } from '../../lib/reg/legacy-view';
import { RegGrants } from './RegGrants';
import type { RegIntent } from '../../lib/reg-intents';
import type { Allocation, Command, Event, Link, Operation, Projection } from '../../lib/reg/types';
import { RegHistory } from './RegHistory';
import { regForPeriod, regPeriod, type RegRange } from '../../lib/reg/totals';
import { RegDependentCorrections, type RefundCorrectionDraft } from './RegDependentCorrections';

type Mode='receipt'|'refund'|'correct'|'method'|'agreement'|'allocation'|'evidence';
type Form={amount:string;currency:string;methodId:string;local:string;offset:string;state:string;description:string;reference:string;reason:string;raw:string;label:string;agreementId:string;receiptId:string;aggregateId:string;unallocated:string;provider:string;account:string;externalId:string;referenceType:string;sourceCut:string;related:string;aggregate:boolean};
const initial=():Form=>({amount:'',currency:'',methodId:'',local:new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date()).replace(' ','T'),offset:'',state:'received_declared',description:'',reference:'',reason:'',raw:'',label:'',agreementId:'',receiptId:'',aggregateId:'',unallocated:'',provider:'',account:'',externalId:'',referenceType:'',sourceCut:'',related:'',aggregate:false});
const inputClass='w-full min-w-0 rounded border border-border bg-background p-2 text-foreground';
const buttonClass='rounded border border-border px-3 py-2 disabled:opacity-40';

export function RegOperationPanel({language='en',client=regService,links=[],legacy=[],legacyComplete=true,onAccepted,showPeriods=false}:{language?:string;client?:typeof regService;links?:Link[];legacy?:LegacyMoneyRow[];legacyComplete?:boolean;onAccepted?:()=>void;showPeriods?:boolean}){
  const t=(key:RegLabel)=>regText(language,key);
  const [showGrants,setShowGrants]=React.useState(false);
  const [projection,setProjection]=React.useState<Projection|null>(null),[cap,setCap]=React.useState<RegCapabilities|null>(null);
  const [range,setRange]=React.useState<RegRange>(showPeriods?'30d':'all'),[from,setFrom]=React.useState(''),[to,setTo]=React.useState('');
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),period=regPeriod(range,today,from,to),visible=projection&&period?regForPeriod(projection,period):null;
  const [loading,setLoading]=React.useState(true),[error,setError]=React.useState(false),[busy,setBusy]=React.useState(false),[mode,setMode]=React.useState<Mode|null>(null);
  const [form,setForm]=React.useState<Form>(initial),[selected,setSelected]=React.useState<Operation|null>(null),[history,setHistory]=React.useState<Event[]>([]);
  const [intent,setIntent]=React.useState<RegIntent|null>(null),[savedIntents,setSavedIntents]=React.useState<RegIntent[]>([]);
  const [parts,setParts]=React.useState<Record<string,string>>({}),[allocationChanges,setAllocationChanges]=React.useState<Record<string,string>>({});
  const [allocationTargets,setAllocationTargets]=React.useState<Record<string,string>>({}),[refundChanges,setRefundChanges]=React.useState<Record<string,RefundCorrectionDraft>>({});
  const inFlight=React.useRef(false),intentCommand=React.useRef<Command|null>(null);
  const generation=React.useRef(0);
  const load=React.useCallback(async()=>{
    const current=++generation.current;setLoading(true);setError(false);setCap(null);setProjection(null);setSavedIntents([]);setHistory([]);setIntent(null);setMode(null);setShowGrants(false);intentCommand.current=null;
    try{const bundle=await client.readBundle();bundle.assertCurrent();if(generation.current!==current)return;setCap(bundle.cap);setProjection(bundle.projection);setSavedIntents(bundle.intents);}
    catch{if(generation.current!==current)return;setProjection(null);setCap(null);setError(true);}
    finally{if(generation.current===current)setLoading(false);}
  },[client]);
  React.useEffect(()=>{
    const changed=()=>{void load();};window.addEventListener('reg:changed',changed);window.addEventListener('focus',changed);
    const unsubscribe=client===regService&&auth?onAuthStateChanged(auth,changed):null;if(!unsubscribe)changed();
    return()=>{generation.current++;unsubscribe?.();window.removeEventListener('reg:changed',changed);window.removeEventListener('focus',changed);};
  },[load,client]);
  const change=(key:keyof Form,value:Form[typeof key])=>setForm(old=>{
    const next={...old,[key]:value};if(key!=='aggregateId'||!value)return next;
    if(mode==='method'){const m=projection?.methods.find(m=>m.id===value);if(m)Object.assign(next,{label:m.translations[language]??m.label,state:m.state,provider:m.provider,currency:m.currencies[0]});}
    if(mode==='agreement'){const a=projection?.agreements.find(a=>a.id===value);if(a)Object.assign(next,{description:a.description,currency:a.currency,amount:a.money?formatMoney(a.money).split(' ')[0]:''});}
    if(mode==='allocation'){const a=projection?.allocations.find(a=>a.id===value);if(a)Object.assign(next,{receiptId:a.receiptId,agreementId:a.agreementId,state:a.state,currency:a.money.currency,amount:formatMoney(a.money).split(' ')[0]});}
    if(mode==='evidence'){const e=projection?.evidence.find(e=>e.id===value);if(e){const identity=JSON.parse(e.identity);Object.assign(next,{receiptId:e.receiptId,description:e.description,state:e.state,sourceCut:e.sourceCut,related:e.relatedIds.join(','),aggregate:e.aggregate,provider:identity.provider,account:identity.account,externalId:identity.externalId,referenceType:identity.type});}}
    return next;
  });
  const can=(capability:string)=>cap?.mode==='ready'&&cap.grant.capabilities.includes(capability as never);
  const start=(next:Mode,operation:Operation|null=null)=>{
    setMode(next);setSelected(operation);setError(false);setIntent(null);intentCommand.current=null;setHistory([]);setParts({});setAllocationChanges({});setAllocationTargets({});setRefundChanges({});
    const f=initial();f.currency=operation?.money?.currency??Object.keys(cap?.currencies??{})[0]??'';
    f.methodId=operation?.method?.id??projection?.methods.find(m=>m.state==='enabled')?.id??'';
    if(operation){f.receiptId=operation.kind==='refund'?operation.parentReceiptId!:operation.id;
      if(next==='correct'){f.amount=operation.money?formatMoney(operation.money).split(' ')[0]:'';f.state=operation.state;f.description=operation.description;f.reference=operation.evidence.reference;f.raw=operation.raw;f.local=operation.effective?.local??'';f.offset=operation.effective?.offset??'';
        if(operation.distribution){f.unallocated=operation.money?formatMoney({...operation.money,amountMinor:operation.distribution.unallocatedMinor}).split(' ')[0]:'';setParts(Object.fromEntries(operation.distribution.allocations.map(p=>[p.allocationId,formatMoney({...operation.money!,amountMinor:p.amountMinor}).split(' ')[0]])));}
      }
    }
    if(next==='refund')f.state='refund_declared';if(next==='method')f.state='enabled';if(next==='allocation')f.state='active';if(next==='evidence')f.state='review';
    setForm(f);
  };
  const revisions=()=>{
    const result:Record<string,number>={};if(!projection)return result;
    for(const [kind,rows]of Object.entries({operations:projection.operations,agreements:projection.agreements,allocations:projection.allocations,methods:projection.methods,evidence_links:projection.evidence}))for(const row of rows)result[kind+':'+row.id]=row.revision;
    return result;
  };
  const parseAmount=(value:string,zero=false)=>zero&&/^0(?:\.0+)?$/.test(value)?'0':decimalToMinor(value,cap!.currencies[form.currency]);
  const allocationsForReceipt=projection?.allocations.filter(a=>a.receiptId===(form.receiptId||selected?.id))??[];
  const allocationPayload=(allocation:Allocation,value:string)=>{
    const released=/^0(?:\.0+)?$/.test(value),agreement=projection!.agreements.find(a=>a.id===(released?allocation.agreementId:allocationTargets[allocation.id]||allocation.agreementId))!;
    return{aggregateId:allocation.id,receiptId:allocation.receiptId,agreementId:agreement.id,agreementRevision:agreement.revision,money:released?allocation.money:{currency:agreement.currency,scale:agreement.scale,amountMinor:decimalToMinor(value,agreement.scale)},state:released?'released':'active'};
  };
  function command():Command{
    if(!cap||!projection||!mode)throw new Error('reg.unavailable');
    const commandId=crypto.randomUUID(),identifier=form.aggregateId||crypto.randomUUID(),expectedRevisions=revisions();
    const required=['receipt','refund','correct','allocation'].includes(mode)&&form.state!=='pending_normalization';
    const m=!required&&!form.amount?null:{amountMinor:parseAmount(form.amount,mode==='agreement'),currency:form.currency,scale:cap.currencies[form.currency]};
    let type:Command['type'],operationId:string|null=null,payload:Record<string,unknown>;
    if(mode==='receipt'||mode==='refund'||mode==='correct'){
      const refund=mode==='refund'||selected?.kind==='refund';operationId=mode==='correct'?selected!.id:identifier;
      type=mode==='correct'?(refund?'refund.correct':'receipt.correct'):(refund?'refund.create':'receipt.create');
      const incomplete=form.state==='pending_normalization';
      // datetime-local representa los segundos cero omitiendo ese segmento.
      const local=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(form.local)?form.local+':00':form.local;
      const effective=incomplete?null:effectiveDate({local,offset:form.offset,zone:'Asia/Jerusalem',instant:new Date(local+form.offset).toISOString()},new Date().toISOString(),['pending','refund_pending','review'].includes(form.state));
      payload={money:incomplete?null:m,methodId:incomplete?null:form.methodId,effective,state:form.state,description:form.description,raw:form.raw,reason:form.reason,links:mode==='correct'?selected!.links:links,evidence:{kind:'operator_declaration',attachmentState:form.reference?'reference_declared':'none_declared',note:form.description,reference:form.reference}};
      if(refund){payload.parentReceiptId=form.receiptId;payload.distribution={unallocatedMinor:parseAmount(form.unallocated||'0',true),allocations:Object.entries(parts).filter(([,value])=>value&&!/^0(?:\.0+)?$/.test(value)).map(([allocationId,value])=>({allocationId,amountMinor:parseAmount(value)}))};}
      payload.allocations=Object.entries(allocationChanges).filter(([,value])=>value!=='').map(([id,value])=>allocationPayload(projection.allocations.find(a=>a.id===id)!,value));
      payload.corrections=Object.entries(refundChanges).filter(([,draft])=>draft.enabled).map(([id,draft])=>{
        const previous=projection.operations.find(op=>op.id===id)!;
        return{operationId:id,parentReceiptId:previous.parentReceiptId,money:{amountMinor:parseAmount(draft.amount),currency:form.currency,scale:cap.currencies[form.currency]},methodId:previous.method?.id??null,effective:previous.effective,state:draft.state,description:previous.description,raw:previous.raw,links:previous.links,evidence:previous.evidence,reason:draft.reason,distribution:{unallocatedMinor:parseAmount(draft.unallocated,true),allocations:Object.entries(draft.parts).filter(([,value])=>value&&!/^0(?:\.0+)?$/.test(value)).map(([allocationId,value])=>({allocationId,amountMinor:parseAmount(value)}))}};
      });
      expectedRevisions['operations:'+operationId]??=0;
    }else if(mode==='method'){
      const old=projection.methods.find(m=>m.id===identifier);
      type='method.put';payload={aggregateId:identifier,label:form.label,translations:{...old?.translations,[language]:form.label},state:form.state,currencies:[...new Set([...(old?.currencies??[]),form.currency])],provider:form.provider,reason:form.reason};expectedRevisions['methods:'+identifier]??=0;
    }else if(mode==='agreement'){
      type='agreement.put';payload={aggregateId:identifier,money:form.amount?m:null,currency:form.currency,scale:cap.currencies[form.currency],description:form.description,links:projection.agreements.find(a=>a.id===identifier)?.links??links,reason:form.reason};expectedRevisions['agreements:'+identifier]??=0;
    }else if(mode==='allocation'){
      type='allocation.put';const agreement=projection.agreements.find(a=>a.id===form.agreementId);if(!agreement)throw new Error('reg.agreement_required');
      payload={aggregateId:identifier,receiptId:form.receiptId,agreementId:agreement.id,agreementRevision:agreement.revision,money:m,state:form.state,reason:form.reason};expectedRevisions['allocations:'+identifier]??=0;
    }else{
      type='evidence.put';payload={aggregateId:identifier,receiptId:form.receiptId,identity:{clientId:cap.clientId,environment:cap.environment,purpose:'merchant_customer_money',provider:form.provider,account:form.account,externalId:form.externalId,type:form.referenceType},description:form.description,sourceCut:form.sourceCut,state:form.state,relatedIds:form.related.split(',').map(s=>s.trim()).filter(Boolean),aggregate:form.aggregate,reason:form.reason};expectedRevisions['evidence_links:'+identifier]??=0;
    }
    return{schemaVersion:1,epoch:cap.epoch,commandId,operationId,type,expectedRevisions,payload};
  }
  function finish(next:RegIntent,check:()=>void,current:number){check();if(generation.current!==current)return;setIntent(next);if(next.state==='accepted'){setMode(null);intentCommand.current=null;window.dispatchEvent(new CustomEvent('reg:changed'));onAccepted?.();}else if(next.state==='rejected')setError(true);}
  async function submit(event:React.FormEvent){event.preventDefault();if(inFlight.current)return;inFlight.current=true;setBusy(true);setError(false);
    const current=generation.current;try{const check=client.fence();intentCommand.current??=command();finish(await client.execute(intentCommand.current,cap!),check,current);}catch{if(generation.current===current)setError(true);}finally{inFlight.current=false;setBusy(false);}}
  async function recover(saved:RegIntent,retry=false){if(inFlight.current)return;inFlight.current=true;setBusy(true);const current=generation.current;try{const check=client.fence();finish(await(retry?client.submit(saved):client.recover(saved)),check,current);}catch{if(generation.current===current)setError(true);}finally{setBusy(false);inFlight.current=false;}}
  async function exportData(){if(!projection||!cap||!period)return;const current=generation.current;try{
    const check=client.fence(),csv=await client.export(projection.cutRevision,period,cap);check();if(generation.current!==current)return;
    const url=URL.createObjectURL(new Blob([appendLegacyCsv(csv,legacy,legacyComplete)],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='reg-'+projection.cutRevision+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch{if(generation.current===current)setError(true);}}
  async function showHistory(op:Operation){if(!cap)return;const current=generation.current;try{const check=client.fence(),detail=await client.detail(op.id,cap);check();if(generation.current!==current)return;setHistory(detail.history);setSelected(op);}catch{if(generation.current===current)setError(true);}}
  const field=(key:keyof Form,label:RegLabel,type='text')=><label className="block min-w-0 space-y-1">{t(label)}<input aria-label={t(label)} className={inputClass} type={type} step={type==='datetime-local'?1:undefined} value={String(form[key])} onChange={e=>change(key,e.target.value)}/></label>;
  const select=(key:keyof Form,label:RegLabel,options:{value:string;label:string}[])=><label className="block min-w-0 space-y-1">{t(label)}<select aria-label={t(label)} className={inputClass} value={String(form[key])} onChange={e=>change(key,e.target.value)}><option value="">—</option>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
  const action=(label:RegLabel,work:()=>void,disabled=false)=><button type="button" className={buttonClass} disabled={busy||disabled} onClick={work}>{t(label)}</button>;
  return <section dir={language==='he'||language==='ar'?'rtl':'ltr'} className="space-y-4 min-w-0" aria-label={t('title')}>
    <h2 className="text-xl font-bold">{t('title')}</h2><p>{t('declaration')}</p>
    {showPeriods&&<fieldset className="flex flex-wrap gap-3" aria-label={t('period')}><legend>{t('period')}</legend>
      {(['7d','30d','custom','all'] as const).map(value=><button type="button" className={buttonClass} aria-pressed={range===value} key={value} onClick={()=>{setRange(value);setHistory([]);}}>{t(({ '7d':'days7','30d':'days30',custom:'custom',all:'allDates'} as const)[value])}</button>)}
      {range==='custom'&&<><label>{t('from')}<input type="date" aria-label={t('from')} value={from} onChange={e=>{setFrom(e.target.value);setHistory([]);}}/></label><label>{t('to')}<input type="date" aria-label={t('to')} value={to} onChange={e=>{setTo(e.target.value);setHistory([]);}}/></label></>}
      <p>{t('periodBasis')}</p>{!period&&<p role="alert">{t('invalidPeriod')}</p>}
    </fieldset>}
    {loading&&<p role="status">{t('loading')}</p>}{error&&<p role="alert">{cap?t('error'):t('unavailable')}</p>}
    {cap?.mode==='read_only'&&<p role="status">{t('readOnly')}</p>}
    <div className="flex flex-wrap gap-2">{action('reload',()=>void load())}{action('create',()=>start('receipt'),!can('register'))}{action('methods',()=>start('method'),!can('methods'))}{action('agreements',()=>start('agreement'),!can('agreements'))}
      {cap?.grant.role==='owner'&&action('grants',()=>setShowGrants(v=>!v),!can('grants'))}
      {action('export',()=>void exportData(),!period||!cap?.grant.capabilities.includes('export'))}
    </div>
    {showGrants&&cap&&<RegGrants client={client} cap={cap} language={language} onChanged={()=>{void load();window.dispatchEvent(new CustomEvent('reg:changed'));}}/>}
    {intent?.state==='uncertain'&&<aside role="alert">{t('uncertain')}{action('recover',()=>void recover(intent))}{action('retry',()=>void recover(intent,true))}</aside>}
    {intent?.state==='accepted'&&<p role="status">{t('accepted')}</p>}
    {intent?.state==='rejected'&&action('newAttempt',()=>{intentCommand.current=null;setIntent(null);void load();})}
    {projection?.coverage==='partial'&&<p role="alert">{t('partial')}</p>}
    {savedIntents.filter(i=>i.state==='uncertain'||i.state==='prepared').map(i=><aside key={i.key}>{t('uncertain')} <bdi>{i.command.commandId}</bdi>{action('recover',()=>void recover(i))}{action('retry',()=>void recover(i,true))}</aside>)}
    {visible&&<div className="space-y-2" data-testid="reg-totals" data-cut={visible.cutRevision} data-from={period?.from??''} data-to={period?.to??''}>{visible.groups.map(g=><p key={g.currency+g.scale}><bdi>{g.currency}</bdi> · {t('received')}: <bdi>{formatMoney({...g,amountMinor:g.grossMinor})}</bdi> · {t('refunded')}: <bdi>{formatMoney({...g,amountMinor:g.refundedMinor})}</bdi> · {t('net')}: <strong data-period-net={g.netMinor}><bdi>{formatMoney({...g,amountMinor:g.netMinor})}</bdi></strong></p>)}<p>{t('unknown')}: {visible.unknown} · {t('reviewCount')}: {visible.reconciliation.review} · {t('revision')}: {visible.cutRevision}</p></div>}
    {mode&&cap&&projection&&<form onSubmit={submit} className="space-y-4 rounded border border-border p-4" aria-label={t(mode==='correct'?'correct':mode==='method'?'method':mode==='allocation'?'allocate':mode)}>
      <fieldset disabled={busy||intent?.state==='uncertain'||intent?.state==='rejected'} className="grid min-w-0 gap-3 sm:grid-cols-2">
        {select('currency','currency',Object.keys(cap.currencies).map(value=>({value,label:value})))}
        {['receipt','refund','correct','agreement','allocation'].includes(mode)&&field('amount',mode==='agreement'?'total':'amount')}
        {['receipt','refund','correct'].includes(mode)&&<>{select('methodId','method',projection.methods.map(m=>({value:m.id,label:m.translations[language]??m.label})))}{select('state','state',(mode==='refund'||selected?.kind==='refund'?['refund_pending','refund_declared','rejected','void']:['received_declared','pending','pending_normalization','review','void']).map(value=>({value,label:t(value as RegLabel)})))}{field('local','date','datetime-local')}{select('offset','offset',['+02:00','+03:00'].map(value=>({value,label:value})))}{field('reference','reference')}{form.state==='pending_normalization'&&field('raw','raw')}</>}
        {field('description','description')}{(mode==='correct'||form.aggregateId)&&field('reason','reason')}
        {mode==='method'&&<>{field('label','label')}{field('provider','provider')}{select('state','state',['enabled','suspended'].map(value=>({value,label:t(value as RegLabel)})))}
          {select('aggregateId','method',projection.methods.map(m=>({value:m.id,label:m.label})))}</>}
        {mode==='agreement'&&select('aggregateId','agreement',projection.agreements.map(a=>({value:a.id,label:a.description})))}
        {['allocation','evidence'].includes(mode)&&select('receiptId','receipt',projection.operations.filter(o=>o.kind==='receipt').map(o=>({value:o.id,label:o.description+' · '+(o.money?formatMoney(o.money):t('unknown'))})))}
        {mode==='allocation'&&<>{select('agreementId','agreement',projection.agreements.map(a=>({value:a.id,label:a.description})))}{select('state','state',['active','released'].map(value=>({value,label:t(value as RegLabel)})))}{select('aggregateId','allocate',projection.allocations.map(a=>({value:a.id,label:a.id+' · '+formatMoney(a.money)})))}</>}
        {mode==='evidence'&&<>{select('aggregateId','evidence',projection.evidence.map(e=>({value:e.id,label:e.description})))}{field('provider','provider')}{field('account','account')}{field('externalId','externalId')}{field('referenceType','type')}{field('sourceCut','cut')}{field('related','related')}{select('state','state',[{value:'review',label:t('review')},{value:'declared',label:t('declaration')}])}<label><input type="checkbox" checked={form.aggregate} onChange={e=>change('aggregate',e.target.checked)}/>{t('aggregate')}</label></>}
        {(mode==='refund'||mode==='correct'&&selected?.kind==='refund')&&<fieldset className="sm:col-span-2 space-y-3"><legend>{t('distribution')}</legend>{field('unallocated','unallocated')}{allocationsForReceipt.map(a=><label key={a.id} className="block">{a.agreementId} · <bdi>{formatMoney(a.money)}</bdi><input className={inputClass} aria-label={t('distribution')+' '+a.id} value={parts[a.id]??''} onChange={e=>setParts(old=>({...old,[a.id]:e.target.value}))}/></label>)}</fieldset>}
        {(mode==='correct'||mode==='refund')&&<fieldset className="sm:col-span-2 space-y-3"><legend>{t('dependencies')}</legend><p>{t('limit')}</p>{allocationsForReceipt.map(a=><div key={a.id} data-dependent-allocation={a.id}>
          <label className="block">{a.agreementId} · <bdi>{formatMoney(a.money)}</bdi><input className={inputClass} aria-label={t('dependencies')+' '+a.id} value={allocationChanges[a.id]??''} onChange={e=>setAllocationChanges(old=>({...old,[a.id]:e.target.value}))}/></label>
          <label>{t('agreement')}<select className={inputClass} aria-label={t('agreement')} value={allocationTargets[a.id]??a.agreementId} disabled={/^0(?:\.0+)?$/.test(allocationChanges[a.id]??'')} onChange={e=>setAllocationTargets(old=>({...old,[a.id]:e.target.value}))}>{projection.agreements.map(agreement=><option key={agreement.id} value={agreement.id}>{agreement.description} · {agreement.currency}</option>)}</select></label>
        </div>)}</fieldset>}
        {mode==='correct'&&selected?.kind==='receipt'&&can('refund')&&<RegDependentCorrections refunds={projection.operations.filter(op=>op.parentReceiptId===selected.id)} allocations={allocationsForReceipt} drafts={refundChanges} onChange={(id,draft)=>setRefundChanges(old=>({...old,[id]:draft}))} language={language} currency={form.currency} scale={cap.currencies[form.currency]}/>}
      </fieldset>
      <p>{links.length?t('links')+': '+links.map(l=>l.kind+' '+l.objectId).join(', '):t('noLink')}</p>
      <button className={buttonClass} disabled={busy||intent?.state==='uncertain'||intent?.state==='rejected'}>{t('save')}</button> {action('cancel',()=>{setMode(null);setIntent(null);intentCommand.current=null;})}
    </form>}
    {visible?.operations.map(op=><article key={op.id} className="space-y-2 rounded border border-border p-3 break-words" data-operation-id={op.id}>
      <p>{t(op.kind)} · <bdi>{op.money?formatMoney(op.money):t('unknown')}</bdi> · {t(op.state)}</p><p>{op.description}</p><p>{op.method?.translations[language]??op.method?.label??t('unknown')} · <bdi>{op.effective?.local??t('unknown')}</bdi></p>
      <p>{t('evidence')}: {op.evidence.reference||t('noEvidence')}</p><p>{t('source')}: <bdi>{projection.source.projectId}/{projection.source.databaseId}/{op.physicalId}</bdi></p>
      {projection.reconciliation.excluded.includes(op.id)&&<p>{t('exclude')}</p>}
      <div className="flex flex-wrap gap-2">{action('correct',()=>start('correct',op),!can(op.kind==='refund'?'refund':'correct'))}{op.kind==='receipt'&&<>{action('refund',()=>start('refund',op),!can('refund'))}{action('allocate',()=>start('allocation',op),!can('allocate'))}{action('evidenceManage',()=>start('evidence',op),!can('evidence'))}</>}{action('history',()=>void showHistory(op))}</div>
    </article>)}
    {!!projection?.agreements.length&&<p>{t('allAgreements')}</p>}
    {projection?.agreements.map(a=>{const balance=agreementBalance(a);return <article key={a.id} className="rounded border border-border p-3"><p>{t('agreement')}: {a.description}</p><p>{t('balance')}: <bdi>{balance.pendingMinor===null?t('unknown'):formatMoney({...a,amountMinor:balance.pendingMinor})}</bdi> · {t('credit')}: <bdi>{balance.creditMinor===null?t('unknown'):formatMoney({...a,amountMinor:balance.creditMinor})}</bdi></p></article>;})}
    {!loading&&visible?.operations.length===0&&<p>{t('empty')}</p>}
    {history.length>0&&<RegHistory events={history} language={language}/>}
  </section>;
}
