import React from 'react';
import { regService, type RegCapabilities } from '../../services/reg';
import { CAPABILITIES, type Capability, type Command } from '../../lib/reg/types';
import type { RegIntent } from '../../lib/reg-intents';
import { regText, type RegLabel } from '../../lib/reg/labels';

const names:Record<Capability,RegLabel>={read:'history',export:'export',register:'create',allocate:'allocate',correct:'correct',refund:'refund',evidence:'evidenceManage',agreements:'agreements',methods:'methods',grants:'grants'};
/** Cambiar un rol de equipo no concede dinero: esta acción lo hace explícitamente. */
export function RegGrants({client=regService,cap,language,onChanged}:{client?:typeof regService;cap:RegCapabilities;language:string;onChanged:()=>void}){
  const t=(key:RegLabel)=>regText(language,key),[data,setData]=React.useState<Awaited<ReturnType<typeof client.grants>>|null>(null);
  const [email,setEmail]=React.useState(''),[uid,setUid]=React.useState(''),[scope,setScope]=React.useState<'own'|'all'>('own'),[state,setState]=React.useState<'active'|'revoked'>('active');
  const [caps,setCaps]=React.useState<Capability[]>(['read']),[reason,setReason]=React.useState(''),[busy,setBusy]=React.useState(false),[error,setError]=React.useState(false),[intent,setIntent]=React.useState<RegIntent|null>(null);
  const command=React.useRef<Command|null>(null),inFlight=React.useRef(false);
  const generation=React.useRef(0);
  const load=React.useCallback(async()=>{const n=++generation.current;try{const check=client.fence(),result=await client.grants(cap);check();if(n!==generation.current)return;setData(result);setError(false);}catch{if(n!==generation.current)return;setData(null);setError(true);}},[client,cap]);
  React.useEffect(()=>{void load();return()=>{generation.current++;};},[load]);
  const member=data?.members.find(m=>m.email===email),old=data?.grants.find(g=>g.issuer===cap.actor.issuer&&g.uid===uid);
  function select(email:string){setEmail(email);const g=data?.grants.find(g=>g.email===email);setUid(g?.uid??'');setScope(g?.scope??'own');setState(g?.state??'active');setCaps(g?.capabilities??['read']);command.current=null;setIntent(null);}
  async function finish(result:RegIntent){setIntent(result);if(result.state==='accepted'){command.current=null;await load();onChanged();}else if(result.state==='rejected')setError(true);}
  async function save(event:React.FormEvent){event.preventDefault();if(inFlight.current||!member)return;inFlight.current=true;setBusy(true);
    try{
      const id=btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify([cap.actor.issuer,uid])))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
      command.current??={schemaVersion:1,epoch:cap.epoch,commandId:crypto.randomUUID(),operationId:null,type:'grant.put',expectedRevisions:{['grants:'+id]:old?.revision??0},payload:{issuer:cap.actor.issuer,uid,email,role:member.role,state,scope,capabilities:caps,membershipVersion:member.membershipVersion,reason}};
      const check=client.fence(),n=generation.current,result=await client.execute(command.current,cap);check();if(n===generation.current)await finish(result);
    }catch{setError(true);}finally{inFlight.current=false;setBusy(false);}
  }
  async function recover(){if(!intent||inFlight.current)return;inFlight.current=true;setBusy(true);try{const check=client.fence(),n=generation.current,result=await client.recover(intent);check();if(n===generation.current)await finish(result);}catch{setError(true);}finally{inFlight.current=false;setBusy(false);}}
  async function retry(){if(!intent||inFlight.current)return;inFlight.current=true;setBusy(true);try{const check=client.fence(),n=generation.current,result=await client.submit(intent);check();if(n===generation.current)await finish(result);}catch{setError(true);}finally{inFlight.current=false;setBusy(false);}}
  return <section className="rounded border border-border p-4 space-y-3" aria-label={t('grants')}>
    <h3>{t('grants')}</h3>{!data&&!error&&<p>{t('loading')}</p>}{error&&<p role="alert">{t('error')}</p>}
    {intent?.state==='accepted'&&<p role="status">{t('accepted')}</p>}
    {intent?.state==='uncertain'&&<p role="alert">{t('uncertain')} <button type="button" disabled={busy} onClick={()=>void recover()}>{t('recover')}</button> <button type="button" disabled={busy} onClick={()=>void retry()}>{t('retry')}</button></p>}
    {intent?.state==='rejected'&&<button type="button" disabled={busy} onClick={()=>{command.current=null;setIntent(null);void load();}}>{t('newAttempt')}</button>}
    {data&&<form onSubmit={save}><fieldset disabled={busy||!!intent&&intent.state!=='accepted'||cap.mode!=='ready'} className="space-y-3">
      <label className="block">{t('email')}<select className="block w-full border p-2" aria-label={t('email')} value={email} onChange={e=>select(e.target.value)}><option value="">—</option>{data.members.filter(m=>m.status==='active').map(m=><option key={m.email} value={m.email}>{m.email} · {m.role}</option>)}</select></label>
      <label className="block">{t('uid')}<input className="block w-full border p-2" aria-label={t('uid')} value={uid} onChange={e=>setUid(e.target.value)} required/></label>
      <label className="block">{t('scope')}<select aria-label={t('scope')} value={scope} onChange={e=>setScope(e.target.value as 'own'|'all')}><option value="own">{t('ownScope')}</option><option value="all">{t('allScope')}</option></select></label>
      <label className="block">{t('state')}<select aria-label={t('state')} value={state} onChange={e=>setState(e.target.value as 'active'|'revoked')}><option value="active">{t('active')}</option><option value="revoked">{t('revoked')}</option></select></label>
      <div className="flex flex-wrap gap-3">{CAPABILITIES.map(c=><label key={c}><input type="checkbox" checked={caps.includes(c)} onChange={e=>setCaps(old=>e.target.checked?[...old,c]:old.filter(v=>v!==c))}/>{t(names[c])}</label>)}</div>
      <label className="block">{t('reason')}<input className="block w-full border p-2" aria-label={t('reason')} value={reason} onChange={e=>setReason(e.target.value)} required/></label>
      <button type="submit" disabled={!member||!uid}>{t('save')}</button>
    </fieldset></form>}
    {data?.grants.map(g=><p key={g.id} className="break-words">{g.email} · {t(g.state==='active'?'active':'revoked')} · {t(g.scope==='all'?'allScope':'ownScope')} · {g.capabilities.map(c=>t(names[c])).join(', ')} · {t('revision')} {g.revision}</p>)}
  </section>;
}
