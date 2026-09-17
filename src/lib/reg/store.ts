import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import { authority, fence, membershipVersion, moneyMemberReference, physicalId, principalId, type RegContext } from './authority.js';
import { authorize, own } from './permissions.js';
import { applyCommand, capability, COLLECTIONS, type State } from './commands.js';
import { canonical, command, links, object } from './schema.js';
import { RegError, type Actor, type Control, type Entity, type Event, type Grant, type Link, type Receipt } from './types.js';
import { canAssignRole, canRemoveRole, isAdminRole } from '../admin-users.js';

async function access(db:Firestore,tx:Transaction,ctx:RegContext,actor:Actor,cap:Parameters<typeof authorize>[5],write:boolean,epoch?:number){
  const controlRef=db.collection('reg_control').doc(physicalId(ctx,'control'));
  const memberRef=await moneyMemberReference(db,tx,ctx.clientId,actor);
  const [controlSnap,memberSnap,grantSnap]=await tx.getAll(controlRef,memberRef,db.collection('reg_grants').doc(physicalId(ctx,principalId(actor))));
  const control=fence(ctx,controlSnap.data(),write,epoch);
  if(write){
    const cutover=await tx.get(db.collection('reg_legacy_fence').doc(ctx.clientId)),value=cutover.data();
    if(!cutover.exists||value?.authorityId!==ctx.authorityId||value?.environment!==ctx.environment||value?.epoch!==control.epoch||value?.manualMoney!=='blocked')throw new RegError(503,'reg.cutover_required');
  }
  const grant=authorize(ctx,actor,control,memberSnap.data(),grantSnap.data() as Grant|undefined,cap);
  return{controlRef,control,grant};
}
export async function regAccess(ctx:RegContext,actor:Actor,cap:'read'|'export'='read'){
  const db=await authority(ctx);return db.runTransaction(tx=>access(db,tx,ctx,actor,cap,false));
}
/** Gestión reservada al owner con concesión explícita; miembros y grants del mismo corte transaccional. */
export async function readGrantManagement(ctx:RegContext,actor:Actor){
  const db=await authority(ctx);
  return db.runTransaction(async tx=>{
    const {grant,control}=await access(db,tx,ctx,actor,'grants',false);
    if(grant.role!=='owner')throw new RegError(403,'reg.owner_required');
    const members=await tx.get(db.collection('admin_users').where('clientId','==',ctx.clientId));
    const grants=await tx.get(db.collection('reg_grants').where('clientId','==',ctx.clientId).where('environment','==',ctx.environment));
    const visible=[];
    for(const doc of members.docs){const data=doc.data(),email=typeof data.email==='string'?data.email:doc.id;
      const ref=await moneyMemberReference(db,tx,ctx.clientId,{issuer:ctx.issuer,email});
      if(ref.id===doc.id)visible.push({email,role:String(data.role),status:String(data.status),membershipVersion:membershipVersion(data)});}
    return{cutRevision:control.dataRevision,members:visible,grants:grants.docs.map(doc=>doc.data() as Grant)};
  });
}

/** Todas las lecturas (incluidos vínculos y membresía) preceden al primer write. */
export async function executeCommand(ctx:RegContext,actor:Actor,input:unknown):Promise<Receipt>{
  const cmd=command(input),db=await authority(ctx);
  return db.runTransaction(async tx=>{
    const {controlRef,control,grant}=await access(db,tx,ctx,actor,'read',false,cmd.epoch);
    const commandRef=db.collection('reg_commands').doc(physicalId(ctx,cmd.commandId));
    const previous=await tx.get(commandRef),semanticPayload=canonical(cmd);
    if(previous.exists){const saved=previous.data() as Receipt;if(saved.semanticPayload!==semanticPayload||canonical(saved.actor)!==canonical(actor))throw new RegError(409,'reg.command_conflict');return saved;}
    await access(db,tx,ctx,actor,capability(cmd.type),true,cmd.epoch);
    const state:State=new Map();
    // La revisión común serializa el conjunto. No se oculta una población mediante limit().
    for(const kind of COLLECTIONS){const snap=await tx.get(db.collection('reg_'+kind).where('clientId','==',ctx.clientId).where('environment','==',ctx.environment));
      for(const doc of snap.docs){const data=doc.data() as Entity;if(doc.id!==physicalId(ctx,data.id))throw new RegError(503,'reg.identity_corrupt');state.set(kind+':'+data.id,data);}}
    const now=ctx.now?.()??new Date().toISOString();
    const result=applyCommand(state,control,grant,actor,cmd,now);
    const referenced:Link[]=[];
    for(const change of result.changes){
      const after=change.after as Entity & {links?:Link[]},before=change.before as (Entity & {links?:Link[]})|undefined;
      // Conservar una relación registrada no equivale a crear un vínculo nuevo.
      const prior=new Set((before?.links??[]).map(canonical));
      if(after.links)referenced.push(...links(after.links).filter(link=>!prior.has(canonical(link))));
      if(change.kind==='grants'){
        const target=change.after as Grant;
        const member=await tx.get(await moneyMemberReference(db,tx,ctx.clientId,target));
        if(target.state==='active'&&(!member.exists||member.data()?.clientId!==ctx.clientId||member.data()?.status!=='active'||member.data()?.role!==target.role||membershipVersion(member.data()!)!==target.membershipVersion))throw new RegError(409,'reg.member_changed');
      }
    }
    const revalidateContacts:Array<()=>Promise<void>>=[];
    for(const link of referenced){
      if(link.contactKey!==undefined){
        if(!ctx.contactLinks)throw new RegError(503,'reg.contact_authority_required');
        revalidateContacts.push(await ctx.contactLinks.prepare(actor,link.contactKey,db,tx));
        continue;
      }
      if(link.kind==='customer'){
        const partition=await tx.get(db.collection('crm_operations').doc('control_'+ctx.clientId));
        if(partition.exists||ctx.contactLinks)throw new RegError(409,'reg.use_contact_key');
      }
      if(link.state==='historical_reference')continue;
      const source=link.sourceIdentity!;
      if(source.projectId!==ctx.projectId||source.databaseId!==ctx.databaseId)throw new RegError(409,'reg.link_source_unconfirmed');
      const target=await tx.get(db.collection(source.collection).doc(source.documentId));
      if(!target.exists||target.data()?.clientId!==ctx.clientId)throw new RegError(409,'reg.link_unconfirmed');
    }
    // Fuente separada: última lectura antes de efectos, sin promesa de commit distribuido.
    for(const validate of revalidateContacts)await validate();
    const revision=control.dataRevision+1;if(!Number.isSafeInteger(revision))throw new RegError(503,'reg.revision_exhausted');
    const eventIds:string[]=[];
    for(const [ordinal,change]of result.changes.entries()){
      const eventId=cmd.commandId+'_'+String(ordinal).padStart(3,'0');eventIds.push(eventId);
      if(change.kind==='operations')Object.assign(change.after,{latestEventId:eventId});
      const event:Event={id:eventId,clientId:ctx.clientId,environment:ctx.environment,commitRevision:revision,aggregateKind:change.kind,aggregateId:change.after.id,beforeRevision:change.before?.revision??0,after:change.after,reason:((cmd.payload.corrections as {operationId:string;reason:string}[]|undefined)?.find(v=>v.operationId===change.after.id)?.reason)??(typeof cmd.payload.reason==='string'?cmd.payload.reason:''),actor,recordedAt:now,commandId:cmd.commandId};
      tx.create(db.collection('reg_events').doc(physicalId(ctx,eventId)),event);
      tx.set(db.collection('reg_'+change.kind).doc(physicalId(ctx,change.after.id)),change.after);
    }
    const nextControl={...result.control,dataRevision:revision};
    if(cmd.type==='control.mode'){
      const eventId=cmd.commandId+'_control';eventIds.push(eventId);
      tx.create(db.collection('reg_events').doc(physicalId(ctx,eventId)),{id:eventId,clientId:ctx.clientId,environment:ctx.environment,commitRevision:revision,aggregateKind:'control',aggregateId:'control',beforeRevision:control.dataRevision,after:nextControl,reason:cmd.payload.reason as string,actor,recordedAt:now,commandId:cmd.commandId} satisfies Event);
    }
    const receipt:Receipt={commandId:cmd.commandId,operationId:cmd.operationId,eventIds,revision,actor,semanticPayload,recordedAt:now};
    tx.set(controlRef,nextControl);tx.create(commandRef,receipt);return receipt;
  });
}

export async function commandStatus(ctx:RegContext,actor:Actor,identifier:string):Promise<Receipt|null>{
  const db=await authority(ctx);return db.runTransaction(async tx=>{
    const {grant}=await access(db,tx,ctx,actor,'read',false);
    const snap=await tx.get(db.collection('reg_commands').doc(physicalId(ctx,identifier)));if(!snap.exists)return null;
    const receipt=snap.data() as Receipt;if(grant.role!=='owner'&&(receipt.actor.uid!==actor.uid||receipt.actor.issuer!==actor.issuer))throw new RegError(403,'reg.scope_forbidden');return receipt;
  });
}

export async function readEvents(ctx:RegContext,actor:Actor,options:{cutRevision?:number;pageSize?:number;cap?:'read'|'export'}={}):Promise<{events:Event[];control:Control;grant:Grant;cutRevision:number}>{
  const db=await authority(ctx),{control,grant}=await regAccess(ctx,actor,options.cap??'read');
  const cutRevision=options.cutRevision??control.dataRevision,pageSize=options.pageSize??250;
  if(!Number.isSafeInteger(cutRevision)||cutRevision<0||cutRevision>control.dataRevision||!Number.isInteger(pageSize)||pageSize<1||pageSize>1000)throw new RegError(400,'reg.cut_invalid');
  const events:Event[]=[];let last:{revision:number;id:string}|null=null;
  while(true){
    let query=db.collection('reg_events').where('clientId','==',ctx.clientId).where('environment','==',ctx.environment).where('commitRevision','<=',cutRevision).orderBy('commitRevision').orderBy('id').limit(pageSize);
    if(last)query=query.startAfter(last.revision,last.id);
    const page=await query.get();
    for(const doc of page.docs){const event=doc.data() as Event;if(event.clientId!==ctx.clientId||event.environment!==ctx.environment||doc.id!==physicalId(ctx,event.id))throw new RegError(503,'reg.event_corrupt');events.push(event);}
    if(page.size<pageSize)break;const end=events.at(-1)!;last={revision:end.commitRevision,id:end.id};
  }
  // Una revocación durante paginación impide entregar el resultado completo.
  const current=await regAccess(ctx,actor,options.cap??'read');if(current.control.epoch!==control.epoch||current.grant.revision!==grant.revision)throw new RegError(403,'reg.permission_changed');
  return{events,control,grant,cutRevision};
}

/** Miembro y revocación comparten commit: no existe una ventana para reconceder el grant antiguo. */
export async function mutateMemberMoney(db:Firestore,clientId:string,email:string,actor:Actor,mutation:{type:'invite'|'role'|'remove';data:Record<string,unknown>}):Promise<void>{
  const commandId='membership-'+randomUUID(),now=new Date().toISOString();
  await db.runTransaction(async tx=>{
    const partition=await tx.get(db.collection('crm_operations').doc('control_'+clientId));
    if(partition.exists)throw new RegError(409,'reg.use_contact_membership_api');
    const fenceRef=db.collection('reg_legacy_fence').doc(clientId),fenceSnap=await tx.get(fenceRef);
    const memberRef=db.collection('admin_users').doc(email);
    const [current,caller]=await tx.getAll(memberRef,db.collection('admin_users').doc(actor.email));
    const target=current.data(),callerData=caller.data();
    if(!callerData||callerData.clientId!==clientId||callerData.status==='removed'||!isAdminRole(callerData.role))throw new RegError(403,'reg.forbidden');
    if(fenceSnap.exists){const data=object(fenceSnap.data());if(data.manualMoney!=='blocked'||!actor.issuer||callerData.status!=='active')throw new RegError(503,'reg.legacy_fence_invalid');}
    if(mutation.type==='invite'){
      if(!isAdminRole(mutation.data.role)||!canAssignRole(callerData.role,mutation.data.role))throw new RegError(403,'reg.forbidden');
      if(target&&target.status!=='removed')throw new RegError(409,'reg.member_exists');
      if(mutation.data.clientId!==clientId||mutation.data.email!==email||mutation.data.status!=='pending')throw new RegError(400,'reg.member_invalid');
    }else{
      if(!target||target.clientId!==clientId||!isAdminRole(target.role))throw new RegError(409,'reg.member_changed');
      if(mutation.type==='role'){
        if(callerData.role!=='owner'||!isAdminRole(mutation.data.role)||email===actor.email&&mutation.data.role!=='owner')throw new RegError(403,'reg.forbidden');
      }else if(email===actor.email||!canRemoveRole(callerData.role,target.role)||callerData.role==='manager'&&target.invitedBy!==actor.email)throw new RegError(403,'reg.forbidden');
    }
    const writeMember=()=>{if(mutation.type==='remove')tx.delete(memberRef);else if(mutation.type==='invite')tx.set(memberRef,mutation.data,{merge:true});else tx.update(memberRef,mutation.data);};
    const revoke=await prepareMemberMoneyRevocation(db,tx,clientId,email,actor,commandId,now);
    writeMember();revoke();
  });
}

/** Lee la revocación existente antes de cualquier escritura; aplica dentro de la misma tx del miembro. */
export async function prepareMemberMoneyRevocation(db:Firestore,tx:Transaction,clientId:string,email:string,actor:Actor,commandId:string,now:string):Promise<()=>void>{
    const fenceSnap=await tx.get(db.collection('reg_legacy_fence').doc(clientId));
    if(!fenceSnap.exists)return()=>{};
    if(fenceSnap.data()?.manualMoney!=='blocked'||!actor.issuer)throw new RegError(503,'reg.legacy_fence_invalid');
    const snaps=await tx.get(db.collection('reg_grants').where('clientId','==',clientId).where('email','==',email));
    if(snaps.empty)return()=>{};
    const scopes=new Map<string,Control>();
    for(const snap of snaps.docs){const g=snap.data() as Grant;
      if(!scopes.has(g.environment)){const controlSnap=await tx.get(db.collection('reg_control').doc(physicalId(g,'control')));const control=controlSnap.data() as Control|undefined;if(!control||control.clientId!==clientId)throw new RegError(503,'reg.control_invalid');scopes.set(g.environment,control);}}
    // No lectura posterior a este punto: miembro, grants, eventos y control se confirman juntos.
    return()=>{
    for(const [environment,control]of scopes){
      const scope={clientId,environment},revision=control.dataRevision+1,eventIds:string[]=[];
      for(const snap of snaps.docs){const before=snap.data() as Grant;if(before.environment!==environment)continue;
        const after:Grant={...before,state:'revoked',revision:before.revision+1,recordedAt:now},eventId=commandId+'_'+eventIds.length;eventIds.push(eventId);
        tx.update(snap.ref,after);tx.create(db.collection('reg_events').doc(physicalId(scope,eventId)),{id:eventId,clientId,environment,commitRevision:revision,aggregateKind:'grants',aggregateId:before.id,beforeRevision:before.revision,after,reason:'Cambio de membresía: revocación previa de dinero',actor,recordedAt:now,commandId} satisfies Event);
      }
      tx.update(db.collection('reg_control').doc(physicalId(scope,'control')),{dataRevision:revision});
      tx.create(db.collection('reg_commands').doc(physicalId(scope,commandId)),{commandId,operationId:null,eventIds,revision,actor,semanticPayload:canonical({type:'membership.revoke',email}),recordedAt:now} satisfies Receipt);
    }
    };
}
