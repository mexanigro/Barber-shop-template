import { canonical } from './reg/schema.js';
import type { Command, Receipt } from './reg/types.js';

export type IntentScope={authorityId:string;clientId:string;environment:string;issuer:string;uid:string};
export type RegIntent={key:string;scope:IntentScope;command:Command;state:'prepared'|'uncertain'|'accepted'|'rejected';receipt:Receipt|null;error:string|null};
export const intentKey=(scope:IntentScope,commandId:string)=>JSON.stringify([scope.authorityId,scope.clientId,scope.environment,scope.issuer,scope.uid,commandId]);
function open():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{
  const req=indexedDB.open('merchant-reg-intents',1);
  req.onupgradeneeded=()=>req.result.createObjectStore('intents',{keyPath:'key'});
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(new Error('reg.journal_blocked'));
});}
export async function saveIntent(intent:RegIntent):Promise<void>{
  const db=await open();try{await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction('intents','readwrite'),store=tx.objectStore('intents'),req=store.get(intent.key);
    req.onsuccess=()=>{const old=req.result as RegIntent|undefined;if(old&&canonical(old.command)!==canonical(intent.command)){tx.abort();return;}
      // Otra pestaña puede haber confirmado: una respuesta atrasada no desconfirma el recibo.
      if(old?.state==='accepted'&&intent.state!=='accepted')return;store.put(intent);
    };
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error??new Error('reg.journal_failed'));tx.onabort=()=>reject(new Error('reg.intent_conflict'));
  });}finally{db.close();}
}
export async function listIntents(scope:IntentScope):Promise<RegIntent[]>{
  const db=await open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('intents','readonly'),req=tx.objectStore('intents').getAll();req.onsuccess=()=>resolve((req.result as RegIntent[]).filter(x=>canonical(x.scope)===canonical(scope)));req.onerror=()=>reject(req.error);});}finally{db.close();}
}
