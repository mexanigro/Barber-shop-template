import { membershipVersion, type RegContext } from './authority.js';
import { RegError, type Actor, type Capability, type Grant, type Base, type Control } from './types.js';
export function authorize(ctx: RegContext,actor: Actor,control: Control,member: Record<string,unknown>|undefined,grant: Grant|undefined,capability: Capability): Grant{
  if(!grant||!['own','all'].includes(grant.scope)||!['owner','manager','staff'].includes(grant.role)||!Array.isArray(grant.capabilities))throw new RegError(403,'reg.forbidden');
  if(actor.issuer!==ctx.issuer||!actor.uid||!actor.email||!member||member.clientId!==ctx.clientId||member.status!=='active'||!grant||grant.clientId!==ctx.clientId||grant.environment!==ctx.environment||grant.issuer!==actor.issuer||grant.uid!==actor.uid||grant.email!==actor.email||grant.role!==member.role||grant.state!=='active'||grant.epoch!==control.epoch||grant.membershipVersion!==membershipVersion(member)||!grant.capabilities.includes(capability))throw new RegError(403,'reg.forbidden');
  if(member.epoch!==undefined&&(member.issuer!==actor.issuer||member.uid!==actor.uid||!member.epoch))throw new RegError(403,'reg.forbidden');
  return grant;
}
export function own(grant: Grant,entity: Base): void{
  if(grant.scope==='own'&&(entity.authoredBy.issuer!==grant.issuer||entity.authoredBy.uid!==grant.uid))throw new RegError(403,'reg.scope_forbidden');
}
