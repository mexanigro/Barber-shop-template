import { createHmac, timingSafeEqual } from 'node:crypto';
import { authority, physicalId, type RegContext } from './authority.js';
import { regAccess } from './store.js';
import { RegError, type Actor, type Event } from './types.js';

type Cursor={authorityId:string;clientId:string;environment:string;epoch:number;cutRevision:number;lastRevision:number;lastId:string;issuer:string;uid:string};
function sign(ctx:RegContext,body:string):string{if(!ctx.cursorKey)throw new RegError(503,'reg.cursor_unavailable');return createHmac('sha256',ctx.cursorKey).update(body).digest('base64url');}
function decode(ctx:RegContext,token:string):Cursor{
  const [body,signature,...extra]=token.split('.');if(!body||!signature||extra.length||token.length>3000)throw new RegError(400,'reg.cursor_invalid');
  const wanted=Buffer.from(sign(ctx,body)),actual=Buffer.from(signature);if(actual.length!==wanted.length||!timingSafeEqual(actual,wanted))throw new RegError(400,'reg.cursor_invalid');
  try{return JSON.parse(Buffer.from(body,'base64url').toString('utf8'));}catch{throw new RegError(400,'reg.cursor_invalid');}
}
/** Cursor firmado: el cliente no puede cambiar autoridad, sesión ni corte entre páginas. */
export async function eventPage(ctx:RegContext,actor:Actor,token:string|null,limit=250){
  if(!Number.isInteger(limit)||limit<1||limit>1000)throw new RegError(400,'reg.page_invalid');
  const db=await authority(ctx),{control,grant}=await regAccess(ctx,actor);
  const cursor:Cursor=token?decode(ctx,token):{authorityId:ctx.authorityId,clientId:ctx.clientId,environment:ctx.environment,epoch:control.epoch,cutRevision:control.dataRevision,lastRevision:0,lastId:'',issuer:actor.issuer,uid:actor.uid};
  if(cursor.authorityId!==ctx.authorityId||cursor.clientId!==ctx.clientId||cursor.environment!==ctx.environment||cursor.epoch!==control.epoch||cursor.issuer!==actor.issuer||cursor.uid!==actor.uid)throw new RegError(409,'reg.cursor_context');
  let query=db.collection('reg_events').where('clientId','==',ctx.clientId).where('environment','==',ctx.environment).where('commitRevision','<=',cursor.cutRevision).orderBy('commitRevision').orderBy('id').limit(limit);
  if(cursor.lastId)query=query.startAfter(cursor.lastRevision,cursor.lastId);
  const page=await query.get(),events:Event[]=[];
  for(const doc of page.docs){
    const event=doc.data() as Event;
    if(doc.id!==physicalId(ctx,event.id))throw new RegError(503,'reg.event_corrupt');
    const author='authoredBy' in event.after?event.after.authoredBy:null;
    if(grant.scope==='all'||author?.uid===actor.uid&&author.issuer===actor.issuer)events.push(event);
  }
  const last=page.docs.at(-1)?.data() as Event|undefined;
  const next=last&&page.size===limit?{...cursor,lastId:last.id,lastRevision:last.commitRevision}:null;
  const body=next?Buffer.from(JSON.stringify(next)).toString('base64url'):null;
  const current=await regAccess(ctx,actor);if(current.control.epoch!==control.epoch||current.grant.revision!==grant.revision)throw new RegError(403,'reg.permission_changed');
  return{authorityId:ctx.authorityId,epoch:control.epoch,cutRevision:cursor.cutRevision,events,cursor:body?body+'.'+sign(ctx,body):null,coverage:next?'partial':'complete'};
}
