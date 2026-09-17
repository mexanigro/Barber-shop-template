import { auth, db } from '../lib/firebase';
import { intentKey, listIntents, saveIntent, type IntentScope, type RegIntent } from '../lib/reg-intents';
import type { Actor, Command, Control, Event, Grant, Link, Operation, Projection, Receipt } from '../lib/reg/types';

export type RegCapabilities={authorityId:string;clientId:string;environment:string;source:{projectId:string;databaseId:string};schemaVersion:1;epoch:number;mode:Control['mode'];currencies:Record<string,number>;actor:Actor;grant:Grant};
type Session={uid:string;handle:object;token:()=>Promise<string>};
export class RegRequestError extends Error{constructor(public status:number,message:string){super(message);}}

/** Una sesión fija gobierna todo el recorrido, incluido journal, parseo y publicación. */
export function createRegService(session:()=>Session|null,request:typeof fetch=fetch){
  const scope=(c:RegCapabilities):IntentScope=>({authorityId:c.authorityId,clientId:c.clientId,environment:c.environment,issuer:c.actor.issuer,uid:c.actor.uid});
  function capture(){const current=session();if(!current)throw new RegRequestError(401,'reg.identity_required');return current;}
  function check(current:Session){if(session()?.handle!==current.handle||session()?.uid!==current.uid)throw new RegRequestError(401,'reg.session_changed');}
  const sameScope=(a:IntentScope,b:IntentScope)=>intentKey(a,'scope')===intentKey(b,'scope');
  async function call<T>(current:Session,path:string,method='GET',body?:unknown,text=false,bound?:IntentScope):Promise<T>{
    check(current);const credential=await current.token();check(current);
    const headers:Record<string,string>={Authorization:'Bearer '+credential,'Content-Type':'application/json'};
    if(bound)Object.assign(headers,{'X-Reg-Authority':bound.authorityId,'X-Reg-Tenant':bound.clientId,'X-Reg-Environment':bound.environment,'X-Reg-Issuer':bound.issuer,'X-Reg-Uid':bound.uid});
    const response=await request('/api/crm/reg/'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})});check(current);
    if(!response.ok){const result=await response.json().catch(()=>({}));check(current);throw new RegRequestError(response.status,result.error??'reg.request_failed');}
    const result=text?await response.text():await response.json();check(current);
    if(bound)for(const name of ['X-Reg-Authority','X-Reg-Tenant','X-Reg-Environment','X-Reg-Issuer','X-Reg-Uid'])if(response.headers.get(name)!==headers[name])throw new RegRequestError(409,'reg.session_changed');
    return result as T;
  }
  async function capabilitiesFor(current:Session,expected?:IntentScope){
    const c=await call<RegCapabilities>(current,'capabilities','GET',undefined,false,expected);check(current);
    if(c.actor.uid!==current.uid||expected&&!sameScope(scope(c),expected))throw new RegRequestError(409,'reg.session_changed');return c;
  }
  const capabilities=()=>capabilitiesFor(capture());
  async function stored(intent:RegIntent,current:Session){const rows=await listIntents(intent.scope);check(current);await capabilitiesFor(current,intent.scope);return rows.find(row=>row.key===intent.key)??intent;}
  async function recoverFor(intent:RegIntent,current:Session):Promise<RegIntent>{
    await capabilitiesFor(current,intent.scope);check(current);
    const receipt=await call<Receipt|null>(current,'commands/'+encodeURIComponent(intent.command.commandId),'GET',undefined,false,intent.scope);
    if(receipt&&(receipt.commandId!==intent.command.commandId||receipt.actor.uid!==intent.scope.uid||receipt.actor.issuer!==intent.scope.issuer))throw new RegRequestError(409,'reg.receipt_identity');
    const next:RegIntent={...intent,...(receipt?{state:'accepted' as const,receipt,error:null}:{state:'uncertain' as const,error:'reg.command_unknown'})};
    await saveIntent(next);check(current);return stored(next,current);
  }
  async function submitFor(intent:RegIntent,current:Session):Promise<RegIntent>{
    await capabilitiesFor(current,intent.scope);check(current);await saveIntent(intent);
    try{
      check(current);await capabilitiesFor(current,intent.scope);check(current);
      const receipt=await call<Receipt>(current,'commands','POST',intent.command,false,intent.scope);
      if(receipt.commandId!==intent.command.commandId||receipt.actor.uid!==intent.scope.uid||receipt.actor.issuer!==intent.scope.issuer)throw new RegRequestError(409,'reg.receipt_identity');
      const next:RegIntent={...intent,state:'accepted',receipt,error:null};await saveIntent(next);check(current);return stored(next,current);
    }
    catch(error){
      const unknown={...intent,state:'uncertain' as const,error:error instanceof Error?error.message:'reg.request_failed'};await saveIntent(unknown);
      check(current);if(error instanceof RegRequestError&&['reg.session_changed','reg.receipt_identity'].includes(error.message))throw error;
      try{const result=await recoverFor(unknown,current);if(result.state==='accepted')return result;
        if(error instanceof RegRequestError&&error.status>=400&&error.status<500){const rejected={...result,state:'rejected' as const,error:error.message};await saveIntent(rejected);check(current);return stored(rejected,current);}
      }catch{/* Sin lectura fiable la intención conserva incertidumbre en su ámbito original. */}
      check(current);return stored(unknown,current);
    }
  }
  async function read<T>(path:string,text=false,expected?:RegCapabilities){const current=capture(),c=await capabilitiesFor(current,expected?scope(expected):undefined);return call<T>(current,path,'GET',undefined,text,scope(c));}
  async function readBundle(){
    const current=capture(),cap=await capabilitiesFor(current),s=scope(cap),projection=await call<Projection>(current,'summary','GET',undefined,false,s);
    const intents=await listIntents(s);check(current);await capabilitiesFor(current,s);
    if(projection.authorityId!==cap.authorityId||projection.clientId!==cap.clientId||projection.environment!==cap.environment||projection.actor.uid!==cap.actor.uid||projection.actor.issuer!==cap.actor.issuer||projection.epoch!==cap.epoch)throw new RegRequestError(409,'reg.session_changed');
    return{cap,projection,intents,assertCurrent:()=>check(current)};
  }
  return{
    capabilities,scope,readBundle,
    fence:()=>{const current=capture();return()=>check(current);},
    grants:(expected?:RegCapabilities)=>read<{cutRevision:number;members:{email:string;role:string;status:string;membershipVersion:string}[];grants:Grant[]}>('grants',false,expected),
    summary:(query='')=>read<Projection>('summary'+query),
    detail:(id:string,expected?:RegCapabilities)=>read<Projection&{operation:Operation;history:Event[]}>('operations/'+encodeURIComponent(id),false,expected),
    export:(cut:number,period:{from?:string;to?:string}={},expected?:RegCapabilities)=>read<string>('export?'+new URLSearchParams({cutRevision:String(cut),...period}),true,expected),
    intents:async()=>{const current=capture(),c=await capabilitiesFor(current),rows=await listIntents(scope(c));check(current);return rows;},
    recover:(intent:RegIntent)=>recoverFor(intent,capture()),submit:(intent:RegIntent)=>submitFor(intent,capture()),
    async execute(command:Command,expected?:RegCapabilities):Promise<RegIntent>{const current=capture(),c=await capabilitiesFor(current,expected?scope(expected):undefined),s=scope(c);return submitFor({key:intentKey(s,command.commandId),scope:s,command,state:'prepared',receipt:null,error:null},current);},
  };
}
export const regService=createRegService(()=>{const user=auth?.currentUser;return user?{uid:user.uid,handle:user,token:()=>user.getIdToken()}:null;});

/** Sólo se llama con IDs cuya escritura en esta fuente fue confirmada. REG vuelve a comprobarlos. */
export function browserRegSource(collection:string){
  if(!db)return null;
  const source=(db.toJSON() as {databaseId:{projectId:string;database:string}}).databaseId;
  return{projectId:source.projectId,databaseId:source.database,collection};
}
export function browserRegLinks(customerId:string,appointmentId?:string):Link[]{
  if(!db)throw new Error('reg.source_unavailable');
  const source=(db.toJSON() as {databaseId:{projectId:string;database:string}}).databaseId;
  const link=(kind:Link['kind'],documentId:string):Link=>({kind,objectId:documentId,state:'confirmed',sourceIdentity:{projectId:source.projectId,databaseId:source.database,collection:kind==='customer'?'customers':'appointments',documentId}});
  return[link('customer',customerId),...(appointmentId?[link('appointment',appointmentId)]:[])];
}
