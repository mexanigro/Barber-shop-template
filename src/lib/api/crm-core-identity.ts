import { createHmac, timingSafeEqual, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { ContactError, type ContactContext, type ContactIdentity, type ContactSource } from './crm-core-types';

export function stableContactJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableContactJson).join(',') + ']';
  return '{' + Object.keys(value as object).sort().map(k => JSON.stringify(k) + ':' + stableContactJson((value as Record<string, unknown>)[k])).join(',') + '}';
}
export function contactDigest(ctx: ContactContext, purpose: string, value: unknown): string {
  if (ctx.identityKey.length !== 32) throw new ContactError(503, 'contact_identity_key_unavailable');
  return createHmac('sha256', ctx.identityKey).update(stableContactJson([purpose, ctx.authorityId, value])).digest('base64url');
}
export function contactKey(ctx: ContactContext, identity: ContactIdentity): string {
  if (identity[0] !== ctx.clientId || identity[3] !== 'customers') throw new ContactError(403, 'contact_identity_scope');
  return 'c2_' + contactDigest(ctx, 'contact', identity);
}
export function sourceId(source: Pick<ContactSource, 'projectId' | 'databaseId'>): string {
  return JSON.stringify([source.projectId, source.databaseId]);
}
export function contactSources(ctx: ContactContext): ContactSource[] {
  if (!ctx.enabled || !ctx.clientId || !ctx.issuer || !ctx.authorityId) throw new ContactError(503, 'contacts_unavailable');
  const sources = [...new Map([ctx.canonical, ...ctx.sources].map(s => [sourceId(s), s])).values()];
  if (sources.some(s => !s.projectId || !s.databaseId)) throw new ContactError(503, 'contact_catalog_invalid');
  return sources;
}
export async function contactDb(ctx: ContactContext, source: ContactSource) {
  if (!contactSources(ctx).some(s => sourceId(s) === sourceId(source))) throw new ContactError(403, 'contact_source_not_allowed');
  const db = await source.loadDb();
  const native = db as typeof db & { readonly projectId: string };
  if (native.projectId !== source.projectId || db.databaseId !== source.databaseId) throw new ContactError(503, 'contact_source_mismatch');
  return db;
}
export function sameContactKey(a: string, b: string): boolean {
  return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
/** El cursor puede cambiar en cada página; su contenido físico no sale en claro. */
export function sealContactCursor(ctx: ContactContext, value: unknown): string {
  const key = createHmac('sha256', ctx.identityKey).update('contact-cursor-v1').digest();
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(ctx.clientId));
  const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}
export function openContactCursor(ctx: ContactContext, token: string): unknown {
  try {
    if (token.length > 8192) throw Error('cursor');
    const raw = Buffer.from(token, 'base64url');
    const key = createHmac('sha256', ctx.identityKey).update('contact-cursor-v1').digest();
    const cipher = createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
    cipher.setAAD(Buffer.from(ctx.clientId)); cipher.setAuthTag(raw.subarray(12, 28));
    return JSON.parse(Buffer.concat([cipher.update(raw.subarray(28)), cipher.final()]).toString('utf8'));
  } catch { throw new ContactError(422, 'contact_cursor_invalid'); }
}
