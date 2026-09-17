import type { Express, Request, RequestHandler } from 'express';
import { verifyFirebaseIdToken, type FirebaseIdTokenPayload } from './admin-auth';
import { ContactError, type ContactActor, type ContactContext } from './crm-core-types';
import { contactCapabilities, executeContactMembership, listContactMembers } from './crm-core-members';
import { allContacts, contactCommandResult, contactGrantResult, contactHistory, contactServiceCommandResult, contactServiceSummary, executeContact, exportContacts, grantContactAccess, listContacts, readContact, readContactAccess, type ContactListQuery } from './crm-core-service';

export type ContactTokenVerifier = (token: string, projects: readonly string[]) => Promise<FirebaseIdTokenPayload | null>;
export type ContactServiceVerifier = (request: Pick<Request, 'headers'>) => Promise<ContactActor | null>;
export interface ContactRegistration { context: ContactContext; verify?: ContactTokenVerifier; verifyService?: ContactServiceVerifier }

/** Autentica el emisor configurado; nunca selecciona tenant/base desde el payload. */
export async function authenticateContactRequest(req: Pick<Request, 'headers'>, registration: ContactRegistration): Promise<ContactActor> {
  const ctx = registration.context;
  if (!ctx.enabled) throw new ContactError(503, 'contacts_unavailable');
  if (/^Service\s+/i.test(req.headers.authorization ?? '')) {
    const actor = await registration.verifyService?.(req);
    if (!actor || actor.kind !== 'service' || !actor.issuer || !actor.uid || !actor.email) throw new ContactError(401, 'contact_service_identity_invalid');
    if (req.headers['x-contact-tenant'] !== ctx.clientId || req.headers['x-contact-issuer'] !== actor.issuer || req.headers['x-contact-uid'] !== actor.uid) throw new ContactError(403, 'contact_service_scope');
    return actor;
  }
  const project = /^https:\/\/securetoken\.google\.com\/([^/]+)$/.exec(ctx.issuer)?.[1];
  if (!project) throw new ContactError(503, 'contact_issuer_unavailable');
  const token = /^Bearer\s+(.+)$/i.exec(req.headers.authorization ?? '')?.[1];
  if (!token) throw new ContactError(401, 'contact_identity_required');
  const decoded = await (registration.verify ?? verifyFirebaseIdToken)(token, [project]);
  if (!decoded || decoded.iss !== ctx.issuer || !decoded.sub || !decoded.email_verified || !decoded.email) throw new ContactError(401, 'contact_identity_invalid');
  for (const [name, value] of Object.entries({ 'x-contact-tenant': ctx.clientId, 'x-contact-authority': ctx.authorityId, 'x-contact-issuer': ctx.issuer, 'x-contact-uid': decoded.sub })) {
    if (req.headers[name] !== undefined && req.headers[name] !== value) throw new ContactError(409, 'contact_session_changed');
  }
  return { issuer: decoded.iss, uid: decoded.sub, email: decoded.email.trim().toLowerCase() };
}

function query(req: Request): ContactListQuery {
  if (Object.keys(req.query).some(k => !['cursor', 'search', 'archived', 'limit'].includes(k)) || Object.values(req.query).some(v => typeof v !== 'string')) throw new ContactError(422, 'contact_query_invalid');
  return {
    ...(req.query.cursor === undefined ? {} : { cursor: String(req.query.cursor) }),
    ...(req.query.search === undefined ? {} : { search: String(req.query.search) }),
    ...(req.query.archived === undefined ? {} : { archived: String(req.query.archived) as ContactListQuery['archived'] }),
    ...(req.query.limit === undefined ? {} : { limit: Number(req.query.limit) }),
  };
}

/** Registra las mismas rutas en ambos runtimes. Sin catálogo no consulta Auth ni DB. */
export function registerCrmContactRoutes(app: Pick<Express, 'get' | 'post' | 'patch' | 'delete'>, current?: ContactRegistration | (() => ContactRegistration | undefined)): void {
  const wrap = (action: (req: Request, actor: ContactActor, ctx: ContactContext) => Promise<unknown>, csv = false): RequestHandler => async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const registration = typeof current === 'function' ? current() : current;
      if (!registration?.context.enabled) throw new ContactError(503, 'contacts_unavailable');
      const actor = await authenticateContactRequest(req, registration), ctx = registration.context;
      const result = await action(req, actor, ctx);
      res.setHeader('X-Contact-Tenant', ctx.clientId); res.setHeader('X-Contact-Authority', ctx.authorityId); res.setHeader('X-Contact-Uid', actor.uid);
      res.setHeader('X-Contact-Issuer', actor.issuer);
      if (csv) { res.setHeader('Content-Type', 'text/csv; charset=utf-8'); res.send(result); } else res.json(result);
    } catch (error) {
      const failure = error instanceof ContactError ? error : new ContactError(503, 'contact_source_unavailable');
      res.status(failure.status).json({ error: failure.code });
    }
  };
  app.get('/api/crm/contacts/capabilities', wrap((_req, actor, ctx) => contactCapabilities(ctx, actor)));
  app.get('/api/crm/contacts/commands/:operationId', wrap((req, actor, ctx) => actor.kind === 'service'
    ? contactServiceCommandResult(ctx, actor, String(req.params.operationId), String(req.headers['x-contact-entry-point'] ?? ''))
    : contactCommandResult(ctx, actor, String(req.params.operationId))));
  app.get('/api/crm/contacts/service/summary', wrap((req, actor, ctx) => contactServiceSummary(ctx, actor, String(req.headers['x-contact-entry-point'] ?? ''))));
  app.get('/api/crm/contacts/members', wrap((_req, actor, ctx) => listContactMembers(ctx, actor)));
  app.post('/api/crm/contacts/members/commands', wrap((req, actor, ctx) => executeContactMembership(ctx, actor, req.body)));
  app.get('/api/crm/contacts/grants/commands/:operationId', wrap((req, actor, ctx) => contactGrantResult(ctx, actor, String(req.params.operationId))));
  app.post('/api/crm/contacts/grants', wrap((req, actor, ctx) => grantContactAccess(ctx, actor, req.body)));
  app.get('/api/crm/contacts/export', wrap((req, actor, ctx) => {
    const options = query(req); if (options.cursor !== undefined || options.limit !== undefined) throw new ContactError(422, 'contact_export_query_invalid');
    return exportContacts(ctx, actor, options);
  }, true));
  app.post('/api/crm/contacts/export', wrap((req, actor, ctx) => {
    if (Object.keys(req.query).length || !req.body || Array.isArray(req.body) || Object.keys(req.body).length !== 1 || !Object.hasOwn(req.body, 'keys')) throw new ContactError(422, 'contact_selection_invalid');
    return exportContacts(ctx, actor, {}, req.body.keys);
  }, true));
  app.get('/api/crm/contacts/all', wrap((req, actor, ctx) => {
    const options = query(req); if (options.cursor !== undefined || options.limit !== undefined) throw new ContactError(422, 'contact_all_query_invalid');
    return allContacts(ctx, actor, options);
  }));
  app.get('/api/crm/contacts', wrap((req, actor, ctx) => listContacts(ctx, actor, query(req))));
  app.post('/api/crm/contacts', wrap((req, actor, ctx) => executeContact(ctx, actor, req.body)));
  app.get('/api/crm/contacts/:key/access', wrap((req, actor, ctx) => {
    if (Object.keys(req.query).length) throw new ContactError(422, 'contact_query_invalid');
    return readContactAccess(ctx, actor, String(req.params.key));
  }));
  app.get('/api/crm/contacts/:key/history', wrap((req, actor, ctx) => {
    if (Object.keys(req.query).some(k => k !== 'cursor') || req.query.cursor !== undefined && typeof req.query.cursor !== 'string') throw new ContactError(422, 'contact_query_invalid');
    return contactHistory(ctx, actor, String(req.params.key), req.query.cursor as string | undefined);
  }));
  app.get('/api/crm/contacts/:key', wrap((req, actor, ctx) => readContact(ctx, actor, String(req.params.key))));
  app.patch('/api/crm/contacts/:key', wrap((req, actor, ctx) => {
    if (req.body?.key !== req.params.key) throw new ContactError(422, 'contact_reference_mismatch');
    return executeContact(ctx, actor, req.body);
  }));
  app.delete('/api/crm/contacts/:key', wrap(async () => { throw new ContactError(405, 'contact_use_archive'); }));
}
