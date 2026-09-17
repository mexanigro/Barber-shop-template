import type { Express, Request, RequestHandler } from 'express';
import { verifyFirebaseIdToken, type FirebaseIdTokenPayload } from './admin-auth.js';
import { physicalId, type RegContext } from '../reg/authority.js';
import { executeCommand, commandStatus, regAccess, readEvents, readGrantManagement } from '../reg/store.js';
import { projectReg, regCsv } from '../reg/projection.js';
import { eventPage } from '../reg/pagination.js';
import { id } from '../reg/schema.js';
import { RegError, type Actor } from '../reg/types.js';
import type { RegReading } from '../reg/reading.js';
import { legacyMoneyRows } from '../reg/legacy-view.js';

export type RegTokenVerifier=(token:string,projects:readonly string[])=>Promise<FirebaseIdTokenPayload|null>;
export const disabledRegContext:RegContext={enabled:false,clientId:'',environment:'',authorityId:'',projectId:'',databaseId:'',issuer:'',loadDb:async()=>null};
const registrations=new WeakMap<object,{ctx:RegContext;verify:RegTokenVerifier}>();

/** El dinero no entra en la caché general de métricas ni hereda su permiso genérico. */
export async function readMetricsReg(app:object,req:Pick<Request,'headers'>,period:{rangeStart:string|null;rangeEnd:string},legacy:Record<string,unknown>[]=[],source?:{projectId:string;databaseId:string}):Promise<RegReading>{
  const historical=legacyMoneyRows(legacy,source?{...source,collection:'appointments'}:null);
  try{
    const registration=registrations.get(app);if(!registration?.ctx.enabled)throw new RegError(503,'reg.disabled');
    const {ctx,verify}=registration,match=/^Bearer\s+(.+)$/i.exec(req.headers.authorization??'');
    if(!match)throw new RegError(401,'reg.identity_required');
    const token=await verify(match[1],[ctx.projectId]);if(!token?.email||token.iss!==ctx.issuer||!token.email_verified)throw new RegError(403,'reg.identity_invalid');
    const reg=await projectReg(ctx,{issuer:token.iss,uid:token.sub,email:token.email.trim().toLowerCase()},{from:period.rangeStart??undefined,to:period.rangeEnd});
    return{reg,legacy:historical,coverage:reg.coverage,error:null};
  }catch(error){return{reg:null,legacy:historical,coverage:'error',error:error instanceof RegError?error.code:'reg.source_unavailable'};}
}

/** Sin configuración atribuida no consulta certificados, entorno ni DB. */
export function registerCrmRegRoutes(app:Pick<Express,'get'|'post'>,ctx:RegContext=disabledRegContext,verify:RegTokenVerifier=verifyFirebaseIdToken):void{
  registrations.set(app,{ctx,verify});
  const wrap=(action:(req:Request,actor:Actor)=>Promise<unknown>,csv=false):RequestHandler=>async(req,res)=>{
    try{
      if(!ctx.enabled)throw new RegError(503,'reg.disabled');
      const match=/^Bearer\s+(.+)$/i.exec(req.headers.authorization??'');if(!match)throw new RegError(401,'reg.identity_required');
      const token=await verify(match[1],[ctx.projectId]);if(!token||!token.email)throw new RegError(401,'reg.identity_invalid');
      if(token.iss!==ctx.issuer||!token.email_verified)throw new RegError(403,'reg.identity_invalid');
      const actor={issuer:token.iss,uid:token.sub,email:token.email.trim().toLowerCase()};
      const expectedHeaders={'x-reg-authority':ctx.authorityId,'x-reg-tenant':ctx.clientId,'x-reg-environment':ctx.environment,'x-reg-issuer':actor.issuer,'x-reg-uid':actor.uid};
      for(const [name,value]of Object.entries(expectedHeaders))if(req.headers[name]!==undefined&&req.headers[name]!==value)throw new RegError(409,'reg.session_changed');
      const result=await action(req,actor);res.setHeader('Cache-Control','no-store');
      for(const [name,value]of Object.entries(expectedHeaders))res.setHeader(name,value);
      if(csv){res.setHeader('Content-Type','text/csv; charset=utf-8');res.send(result);}else res.json(result);
    }catch(error){const e=error instanceof RegError?error:new RegError(503,'reg.source_unavailable');res.status(e.status).json({error:e.code});}
  };
  const options=(req:Request)=>{
    const allowed=['from','to','cutRevision'];if(Object.keys(req.query).some(k=>!allowed.includes(k)))throw new RegError(400,'reg.query_invalid');
    const from=req.query.from===undefined?undefined:String(req.query.from),to=req.query.to===undefined?undefined:String(req.query.to);
    for(const date of [from,to])if(date!==undefined&&!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new RegError(400,'reg.date_invalid');
    if(from&&to&&from>to)throw new RegError(400,'reg.date_invalid');
    return{from,to,cutRevision:req.query.cutRevision===undefined?undefined:Number(req.query.cutRevision)};
  };
  app.get('/api/crm/reg/capabilities',wrap(async(_req,actor)=>{const {control,grant}=await regAccess(ctx,actor);return{authorityId:ctx.authorityId,clientId:ctx.clientId,environment:ctx.environment,source:{projectId:ctx.projectId,databaseId:ctx.databaseId},schemaVersion:1,epoch:control.epoch,mode:control.mode,currencies:control.currencies,actor,grant};}));
  app.post('/api/crm/reg/commands',wrap((req,actor)=>executeCommand(ctx,actor,req.body)));
  app.get('/api/crm/reg/grants',wrap((_req,actor)=>readGrantManagement(ctx,actor)));
  app.get('/api/crm/reg/commands/:id',wrap((req,actor)=>commandStatus(ctx,actor,id(req.params.id))));
  for(const route of ['summary','operations'])app.get('/api/crm/reg/'+route,wrap((req,actor)=>projectReg(ctx,actor,options(req))));
  app.get('/api/crm/reg/methods',wrap(async(req,actor)=>(await projectReg(ctx,actor,options(req))).methods));
  app.get('/api/crm/reg/events',wrap((req,actor)=>eventPage(ctx,actor,req.query.cursor?String(req.query.cursor):null,req.query.limit?Number(req.query.limit):250)));
  app.get('/api/crm/reg/operations/:id',wrap(async(req,actor)=>{
    const identifier=id(req.params.id),projection=await projectReg(ctx,actor),operation=projection.operations.find(op=>op.id===identifier);
    if(!operation)throw new RegError(404,'reg.not_found');
    const {events}=await readEvents(ctx,actor,{cutRevision:projection.cutRevision});
    return{...projection,operation,history:events.filter(e=>e.aggregateKind==='operations'&&e.aggregateId===identifier)};
  }));
  app.get('/api/crm/reg/export',wrap(async(req,actor)=>{
    const projection=await projectReg(ctx,actor,{...options(req),cap:'export'});
    const {events,grant}=await readEvents(ctx,actor,{cutRevision:projection.cutRevision,cap:'export'});
    const visible=events.filter(event=>grant.scope==='all'||'authoredBy' in event.after&&event.after.authoredBy.uid===actor.uid&&event.after.authoredBy.issuer===actor.issuer);
    return regCsv(projection,visible,event=>physicalId(ctx,event.id));
  },true));
}
