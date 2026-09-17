import { createRegService, type RegCapabilities } from '../src/services/reg';
import { listIntents, type IntentScope } from '../src/lib/reg-intents';
import type { Command, Receipt } from '../src/lib/reg/types';

const originalScope=(tag:string):IntentScope=>({authorityId:tag,clientId:'tenant-a',environment:'fixture',issuer:'fixture-issuer',uid:'A'});
const caps=(scope:IntentScope):RegCapabilities=>{const actor={issuer:scope.issuer,uid:scope.uid,email:scope.uid+'@example.invalid'};return{...scope,actor,source:{projectId:'demo-local',databaseId:'(default)'},epoch:1,mode:'ready',schemaVersion:1,currencies:{ILS:2},grant:{...actor,id:'fixture-grant',clientId:scope.clientId,environment:scope.environment,purpose:'merchant_customer_money',schemaVersion:1,authoredBy:actor,recordedAt:'2026-09-14T12:00:00Z',role:'owner',state:'active',membershipVersion:'fixture',epoch:1,scope:'all',capabilities:['read','register'],revision:1}};};
const headers=(s:IntentScope)=>({'X-Reg-Authority':s.authorityId,'X-Reg-Tenant':s.clientId,'X-Reg-Environment':s.environment,'X-Reg-Issuer':s.issuer,'X-Reg-Uid':s.uid});
const command=(tag:string):Command=>({schemaVersion:1,epoch:1,commandId:tag,operationId:tag,type:'receipt.create',expectedRevisions:{['operations:'+tag]:0},payload:{}});
const receipt=(tag:string):Receipt=>({commandId:tag,operationId:tag,eventIds:[tag],revision:1,actor:caps(originalScope(tag)).actor,semanticPayload:'fixture',recordedAt:'2026-09-14T12:00:00.000Z'});

/** Chromium e IndexedDB reales; el transporte controlado interrumpe cada espera exacta. */
export async function runSessionCases(){
  const observations:Record<string,unknown>[]=[];
  for(const dimension of ['uid','clientId','authorityId'] as const)for(const stage of ['stable','token','capabilities','durable','send','parse','accepted','publication'] as const){
    // El fence sincrónico de publicación observa la sesión del navegador; tenant/autoridad se contrastan en la respuesta y la última lectura de capabilities.
    if(stage==='publication'&&dimension!=='uid')continue;
    const tag='session-'+stage+'-'+crypto.randomUUID(),scope=originalScope(tag),handles={A:{},B:{}};let active={...scope},changed=false;
    const switchScope=()=>{if(!changed){active={...scope,[dimension]:dimension==='uid'?'B':scope[dimension]+'-other'};changed=true;}};
    const sent:IntentScope[]=[];
    const request:typeof fetch=async(input,init)=>{
      const path=String(input),atRequest={...active},responseHeaders=headers(atRequest),expected=new Headers(init?.headers);
      if(Object.entries(responseHeaders).some(([k,v])=>expected.has(k)&&expected.get(k)!==v))return new Response(JSON.stringify({error:'reg.session_changed'}),{status:409,headers:responseHeaders});
      if(path.endsWith('/capabilities')){
        const response=new Response(JSON.stringify(caps(atRequest)),{headers:responseHeaders});
        if(stage==='capabilities'&&!changed){const parse=response.json.bind(response);response.json=async()=>{const data=await parse();switchScope();return data;};}return response;
      }
      if(init?.method==='POST'){
        sent.push(atRequest);const response=new Response(JSON.stringify(receipt(tag)),{headers:responseHeaders});
        if(stage==='send')switchScope();
        if(stage==='parse'){const parse=response.json.bind(response);response.json=async()=>{const data=await parse();switchScope();return data;};}return response;
      }
      return new Response('null',{headers:responseHeaders});
    };
    const client=createRegService(()=>({uid:active.uid,handle:handles[active.uid as 'A'|'B'],token:async()=>{const who=active.uid;if(stage==='token')switchScope();return 'fixture-'+who;}}),request);
    const original=IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put=function(value:unknown,key?:IDBValidKey){const result=key===undefined?original.call(this,value):original.call(this,value,key);const v=value as {state?:string;scope?:IntentScope};if(v.scope?.authorityId===tag&&((stage==='durable'&&v.state==='prepared')||(stage==='accepted'&&v.state==='accepted')))switchScope();return result;};
    let returned:string|null=null,published=false,error:string|null=null;
    try{const check=client.fence(),result=await client.execute(command(tag),caps(scope));returned=result.state;if(stage==='publication')switchScope();check();published=true;}catch(e){error=e instanceof Error?e.message:String(e);}finally{IDBObjectStore.prototype.put=original;}
    const stored=await listIntents(scope),expectedCount=['token','capabilities'].includes(stage)?0:1;
    const stable=stage==='stable',pass=sent.every(s=>JSON.stringify(s)===JSON.stringify(scope))&&(stable?published&&returned==='accepted':!published)&&stored.length===(stable?1:expectedCount)&&stored.every(i=>i.command.commandId===tag&&i.scope.uid==='A'&&['accepted','uncertain','prepared'].includes(i.state));
    observations.push({dimension,stage,sent,returned,published,error,storedState:stored[0]?.state,storedCount:stored.length,pass});
  }
  return observations;
}

let releaseLate:(()=>void)|null=null;
export const lateReady=()=>releaseLate!==null;
export const releaseLateResponse=()=>releaseLate?.();
/** Primera pestaña: el POST llega; la respuesta se pierde después de que otra pestaña recupera. */
export async function startLateCase(tag:string){
  const scope=originalScope(tag),handle={};
  const request:typeof fetch=async(input,init)=>{
    if(String(input).endsWith('/capabilities'))return new Response(JSON.stringify(caps(scope)),{headers:headers(scope)});
    if(init?.method==='POST'){await new Promise<void>(resolve=>{releaseLate=resolve;});throw new Error('fixture_late_network_failure');}
    return new Response('null',{headers:headers(scope)});
  };
  const client=createRegService(()=>({uid:'A',handle,token:async()=>'fixture-A'}),request),result=await client.execute(command(tag),caps(scope));
  return{state:result.state,commandId:result.command.commandId,scope:result.scope};
}
/** Otra pestaña/proceso de navegador consulta el mismo journal, sin regenerar comando. */
export async function recoverLateCase(tag:string){
  const scope=originalScope(tag),handle={},request:typeof fetch=async(input)=>new Response(JSON.stringify(String(input).endsWith('/capabilities')?caps(scope):receipt(tag)),{headers:headers(scope)});
  const client=createRegService(()=>({uid:'A',handle,token:async()=>'fixture-A'}),request),rows=await listIntents(scope);
  if(rows.length!==1)throw new Error('fixture_original_intent_missing');const result=await client.recover(rows[0]);return{state:result.state,commandId:result.command.commandId,scope:result.scope};
}
