import React from 'react';
import type { Customer } from '../../types';
import type { ContactAccessView, ContactCommand, ContactFields, ContactGrantCommand } from '../../lib/api/crm-core-types';
import type { ContactGrantIntent, ContactIntent } from '../../services/core-contacts';
import { customerService } from '../../services/customers';
import { contactText } from '../../lib/core-contact-labels';
import { localeConfig } from '../../config/locale';

type Draft = { fullName: string; email: string; phone: string; channel: string; notes: string; tags: string[]; stage: string };
export const draftOf = (customer: Customer): Draft => ({ fullName: customer.fullName, email: customer.email, phone: customer.phone, channel: customer.source ?? 'manual', notes: customer.notes ?? '', tags: [...(customer.tags ?? [])], stage: customer.stage ?? '' });

/** Cambia sólo lo editado: canales legacy y tags con comas sobreviven a otra edición. */
export function contactPatch(base: Customer, draft: Draft): Partial<ContactFields> {
  const original = draftOf(base), patch: Partial<ContactFields> = {};
  for (const key of ['fullName', 'email', 'phone', 'channel', 'notes', 'tags', 'stage'] as const) {
    if (JSON.stringify(original[key]) === JSON.stringify(draft[key])) continue;
    const value = key === 'email' || key === 'phone' ? String(draft[key]).trim() || null : key === 'stage' ? draft.stage || null : draft[key];
    Object.assign(patch, { [key]: value });
  }
  return patch;
}
/** Conserva únicamente la edición propia al adoptar explícitamente la versión comparada. */
export function contactRebase(base: Customer, draft: Draft, current: Customer): Draft {
  const patch = contactPatch(base, draft);
  return { ...draftOf(current), ...patch, email: patch.email === undefined ? current.email : patch.email ?? '', phone: patch.phone === undefined ? current.phone : patch.phone ?? '', stage: patch.stage === undefined ? current.stage ?? '' : patch.stage ?? '' } as Draft;
}

/** El panel relee acceso vigente tras confirmar; el recibo no mantiene una concesión. */
function ContactAccessPanel({ customer, service, language }: { customer: Customer; service: typeof customerService; language: string }) {
  const t = (key: Parameters<typeof contactText>[1]) => contactText(language, key);
  const [rows, setRows] = React.useState<ContactAccessView[]>([]), [capacities, setCapacities] = React.useState<ContactAccessView[]>([]);
  const [pending, setPending] = React.useState<ContactGrantIntent | null>(null), [busy, setBusy] = React.useState(true), [reason, setReason] = React.useState('');
  const [notice, setNotice] = React.useState<'saved' | 'failed' | 'uncertain' | null>(null);
  const mounted = React.useRef(false), inFlight = React.useRef(false);
  const refresh = async () => {
    const [access, capacity, intents] = await Promise.all([service.client.access(customer.id), service.client.access('create-contact'), service.client.grantIntents(customer.id)]);
    if (!mounted.current) return;
    setRows(access); setCapacities(capacity);
    const unresolved = intents.find(intent => intent.state === 'prepared' || intent.state === 'uncertain');
    setPending(unresolved ?? null); if (unresolved) setNotice('uncertain');
  };
  React.useEffect(() => {
    mounted.current = true; inFlight.current = true;
    void refresh().catch(() => { if (mounted.current) setNotice('failed'); }).finally(() => { inFlight.current = false; if (mounted.current) setBusy(false); });
    return () => { mounted.current = false; };
  }, [customer.id, service]);
  const run = async (action: () => Promise<ContactGrantIntent>) => {
    if (inFlight.current) return; inFlight.current = true; setBusy(true);
    try {
      const result = await action(); if (!mounted.current) return;
      setPending(result.state === 'prepared' || result.state === 'uncertain' ? result : null);
      setNotice(result.state === 'accepted' ? 'saved' : result.state === 'rejected' ? 'failed' : 'uncertain');
      if (result.state === 'accepted') { await refresh(); if (mounted.current) setReason(''); }
    } catch { if (mounted.current) setNotice('failed'); }
    finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  };
  const change = (row: ContactAccessView, capacity: boolean) => {
    const command: ContactGrantCommand = { operationId: crypto.randomUUID(), action: capacity ? row.active ? 'deny-create' : 'allow-create' : row.active ? 'revoke' : 'grant', ...(capacity ? {} : { key: customer.id }), principal: { issuer: row.member.issuer, uid: row.member.uid!, email: row.member.email }, expectedRevision: row.revision, reason };
    void run(async () => { const intent = await service.client.prepareGrant(command, customer.core!.scope); if (mounted.current) setPending(intent); return service.client.retryGrant(intent); });
  };
  const locked = busy || pending !== null;
  return <section className="space-y-3" aria-label={t('access')}><h4>{t('access')}</h4>
    {notice && <p role={notice === 'saved' ? 'status' : 'alert'}>{t(notice)}</p>}
    {pending && <div className="flex gap-2"><button type="button" disabled={busy} onClick={() => void run(() => service.client.recoverGrant(pending))}>{t('recover')}</button><button type="button" disabled={busy} onClick={() => void run(() => service.client.retryGrant(pending))}>{t('retry')}</button></div>}
    <label>{t('reason')}<input className="w-full rounded border border-border bg-card p-2" value={reason} disabled={locked} onChange={event => setReason(event.target.value)} /></label>
    {rows.map(row => { const capacity = capacities.find(item => item.member.uid === row.member.uid && item.member.epoch === row.member.epoch); return <div key={row.member.uid} className="rounded border border-border p-2 space-y-2"><p className="break-all">{row.member.email}</p>
      <p>{t('access')}: {t(row.active ? 'enabled' : 'disabled')}</p><button type="button" disabled={locked || !reason.trim()} onClick={() => change(row, false)}>{t(row.active ? 'revoke' : 'allow')}</button>
      {capacity && <><p>{t('createCapacity')}: {t(capacity.active ? 'enabled' : 'disabled')}</p><button type="button" disabled={locked || !reason.trim()} onClick={() => change(capacity, true)}>{t(capacity.active ? 'denyCreate' : 'allowCreate')}</button></>}
    </div>; })}
    {!busy && !rows.length && <p>{t('noStaff')}</p>}
    <button type="button" disabled={locked} onClick={() => { setBusy(true); inFlight.current = true; void refresh().catch(() => { if (mounted.current) setNotice('failed'); }).finally(() => { inFlight.current = false; if (mounted.current) setBusy(false); }); }}>{t('refreshAccess')}</button>
  </section>;
}

/** Edición del contacto sobre la revisión vista. La recuperación nunca cambia de operationId. */
export function CoreContacts({ customer, onCustomerUpdated, language = localeConfig.lang, service = customerService }: {
  customer: Customer; onCustomerUpdated: (customer: Customer) => void; language?: string; service?: typeof customerService;
}) {
  const t = (key: Parameters<typeof contactText>[1]) => contactText(language, key);
  const [base, setBase] = React.useState(customer), [draft, setDraft] = React.useState<Draft>(() => draftOf(customer));
  const [comparison, setComparison] = React.useState<Customer | null>(null);
  const [pending, setPending] = React.useState<ContactIntent | null>(null), [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<'saved' | 'failed' | 'conflict' | 'uncertain' | null>(null), [reason, setReason] = React.useState('');
  const [history, setHistory] = React.useState<Record<string, unknown>[]>([]), [cursor, setCursor] = React.useState<string | null>(null), [historyOpen, setHistoryOpen] = React.useState(false);
  const inFlight = React.useRef(false), mounted = React.useRef(true);
  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const canManage = base.core?.role === 'owner' || base.core?.role === 'manager';
  const locked = busy || pending?.state === 'uncertain' || pending?.state === 'prepared';

  React.useEffect(() => {
    let active = true;
    void service.client.intents(customer.id).then(rows => {
      if (!active) return;
      const unresolved = rows.find(row => row.state === 'prepared' || row.state === 'uncertain');
      if (unresolved) { setPending(unresolved); setNotice('uncertain'); }
    }).catch(() => { if (active) setNotice('failed'); });
    return () => { active = false; };
  }, [customer.id, service]);

  const consume = async (intent: ContactIntent) => {
    if (!mounted.current) return;
    setPending(intent);
    if (intent.state !== 'accepted' || !intent.result) {
      setNotice(intent.state === 'rejected' ? intent.error === 'contact_revision_conflict' ? 'conflict' : 'failed' : 'uncertain');
      return;
    }
    const current = await service.getCustomer(intent.result.key);
    if (!mounted.current) return;
    setBase(current); setDraft(draftOf(current)); setPending(null); setNotice('saved'); setHistory([]); setHistoryOpen(false); onCustomerUpdated(current);
  };
  const run = async (action: () => Promise<ContactIntent>) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true);
    try { await consume(await action()); }
    catch { if (mounted.current) setNotice('failed'); }
    finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  };
  const command = (action: ContactCommand['action'], fields?: Partial<ContactFields>): ContactCommand => ({
    operationId: crypto.randomUUID(), action, key: base.id, expectedRevision: base.core!.revision, expectedVersion: base.core!.version,
    ...(fields ? { fields } : { reason }),
  });
  const save = (event: React.FormEvent) => {
    event.preventDefault(); if (locked || !canManage || !base.core) return;
    const fields = contactPatch(base, draft);
    if (!Object.keys(fields).length || notice === 'conflict') return;
    const next = command('update', fields);
    void run(async () => { const intent = await service.client.prepare(next, base.core!.scope); if (mounted.current) setPending(intent); return service.client.retry(intent); });
  };
  const reload = async () => {
    if (inFlight.current || locked) return;
    inFlight.current = true; setBusy(true);
    try { const current = await service.getCustomer(base.id); if (mounted.current) { setComparison(current); } }
    catch { if (mounted.current) setNotice('failed'); }
    finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  };
  const loadHistory = async (after?: string) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true);
    try { const result = await service.client.history(base.id, after); if (mounted.current) { setHistory(rows => after ? [...rows, ...result.items] : result.items); setCursor(result.cursor); setHistoryOpen(true); } }
    catch { if (mounted.current) setNotice('failed'); }
    finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  };
  if (!base.core) return null;
  const inputClass = 'w-full rounded border border-border bg-card p-2 text-foreground';
  return <section className="space-y-4 p-4" dir={language === 'he' || language === 'ar' ? 'rtl' : 'ltr'} aria-label={t('title')}>
    <h3 className="font-semibold">{t('title')}</h3>
    {base.core.archived && <p>{t('archived')}</p>}
    {base.core.attendance?.count === null && <p>{t('visitsUnknown')}</p>}
    {notice && <p role={notice === 'saved' ? 'status' : 'alert'}>{t(notice)}</p>}
    {pending && (pending.state === 'prepared' || pending.state === 'uncertain') && <div className="flex flex-wrap gap-2">
      <button type="button" disabled={busy} onClick={() => void run(() => service.client.recover(pending))}>{t('recover')}</button>
      <button type="button" disabled={busy} onClick={() => void run(() => service.client.retry(pending))}>{t('retry')}</button>
    </div>}
    {notice === 'conflict' && <button type="button" disabled={locked} onClick={() => void reload()}>{t('reload')}</button>}
    {comparison && <div className="space-y-2" role="region" aria-label={t('comparison')}>
      <h4>{t('comparison')}</h4>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th>{t('field')}</th><th>{t('current')}</th><th>{t('draft')}</th></tr></thead>
        <tbody>{(['fullName', 'email', 'phone', 'channel', 'notes', 'tags', 'stage'] as const).map(field => <tr key={field}><th>{t(field === 'fullName' ? 'name' : field)}</th><td dir={field === 'email' || field === 'phone' ? 'ltr' : undefined} className="break-words">{Array.isArray(draftOf(comparison)[field]) ? JSON.stringify(draftOf(comparison)[field]) : String(draftOf(comparison)[field]) || t('none')}</td><td dir={field === 'email' || field === 'phone' ? 'ltr' : undefined} className="break-words">{Array.isArray(draft[field]) ? JSON.stringify(draft[field]) : String(draft[field]) || t('none')}</td></tr>)}</tbody></table></div>
      <button type="button" disabled={locked} onClick={() => { setDraft(contactRebase(base, draft, comparison)); setBase(comparison); setPending(null); setNotice(null); setComparison(null); onCustomerUpdated(comparison); }}>{t('adopt')}</button>
    </div>}
    {canManage ? <form onSubmit={save} className="space-y-3">
      <fieldset disabled={locked} className="grid gap-3 sm:grid-cols-2">
        {(['fullName', 'email', 'phone'] as const).map(field => <label key={field}>{t(field === 'fullName' ? 'name' : field)}
          <input dir={field === 'email' || field === 'phone' ? 'ltr' : undefined} className={inputClass} required={field === 'fullName'} type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'} value={draft[field]} onChange={event => setDraft(value => ({ ...value, [field]: event.target.value }))} />
        </label>)}
        <label>{t('channel')}<select className={inputClass} value={draft.channel} onChange={event => setDraft(value => ({ ...value, channel: event.target.value }))}>
          {draft.channel === 'unknown' && <option value="unknown">{t('none')}</option>}
          {(['manual', 'walkin', 'web', 'booking', 'import', 'whatsapp', 'instagram', 'google', 'referral'] as const).map(channel => <option key={channel} value={channel}>{t(channel)}</option>)}
        </select></label>
        <label>{t('stage')}<select className={inputClass} value={draft.stage} onChange={event => setDraft(value => ({ ...value, stage: event.target.value }))}>
          <option value="">{t('none')}</option>{(['lead', 'contacted', 'scheduled', 'converted', 'lost'] as const).map(stage => <option key={stage} value={stage}>{t(stage)}</option>)}
        </select></label>
        <div>{t('tags')}{draft.tags.map((tag, index) => <div className="flex gap-2" key={index}><input aria-label={t('tags') + ' ' + (index + 1)} className={inputClass} value={tag} onChange={event => setDraft(value => ({ ...value, tags: value.tags.map((text, i) => i === index ? event.target.value : text) }))} /><button type="button" onClick={() => setDraft(value => ({ ...value, tags: value.tags.filter((_, i) => i !== index) }))}>{t('removeTag')}</button></div>)}<button type="button" disabled={draft.tags.length >= 20} onClick={() => setDraft(value => ({ ...value, tags: [...value.tags, ''] }))}>{t('addTag')}</button></div>
        <label className="sm:col-span-2">{t('notes')}<textarea className={inputClass} rows={4} value={draft.notes} onChange={event => setDraft(value => ({ ...value, notes: event.target.value }))} /></label>
      </fieldset>
      <button type="submit" disabled={locked || notice === 'conflict' || !Object.keys(contactPatch(base, draft)).length}>{busy ? t('saving') : t('save')}</button>
    </form> : <dl className="grid gap-2">
      <dt>{t('name')}</dt><dd>{base.fullName}</dd><dt>{t('phone')}</dt><dd dir="ltr">{base.phone || t('none')}</dd><dt>{t('email')}</dt><dd dir="ltr">{base.email || t('none')}</dd>
      <dt>{t('tags')}</dt><dd>{base.tags?.join(', ') || t('none')}</dd><dt>{t('stage')}</dt><dd>{base.stage ? t(base.stage) : t('none')}</dd>
    </dl>}
    {canManage && <ContactAccessPanel key={base.id} customer={base} service={service} language={language} />}
    {canManage && base.core.legacyValues && <section aria-label={t('legacy')}><h4>{t('legacy')}</h4><p>{t('legacyLimit')}</p><dl>{Object.entries(base.core.legacyValues.values).map(([field, value]) => <React.Fragment key={field}><dt>{t(field as 'lifetimeValueCents' | 'amountPaidCents' | 'visitCount' | 'lastServiceId' | 'paymentMethod' | 'lastVisitAt' | 'lastContactedAt')}</dt><dd>{String(value)}</dd></React.Fragment>)}</dl></section>}
    {canManage && <>
      <label className="block">{t('reason')}<input className={inputClass} value={reason} disabled={locked} onChange={event => setReason(event.target.value)} /></label>
      <button type="button" disabled={locked || !reason.trim()} onClick={() => { const next = command(base.core!.archived ? 'restore' : 'archive'); void run(async () => { const intent = await service.client.prepare(next, base.core!.scope); if (mounted.current) setPending(intent); return service.client.retry(intent); }); }}>{t(base.core.archived ? 'restore' : 'archive')}</button>
    </>}
    <>
      <button type="button" disabled={busy} onClick={() => void loadHistory()}>{t('history')}</button>
      {historyOpen && <ol className="space-y-2">{history.length === 0 && <li>{t('empty')}</li>}{history.map((row, index) => <li key={String(row.id ?? index)}>
        <time>{String(row.recordedAt ?? '')}</time> · {['create','update','archive','restore','grant','revoke'].includes(String(row.action)) ? t(row.action as 'create' | 'update' | 'archive' | 'restore' | 'grant' | 'revoke') : t('history')}
        {typeof row.reason === 'string' && row.reason && <p>{row.reason}</p>}
      </li>)}</ol>}
      {historyOpen && cursor && <button type="button" disabled={busy} onClick={() => void loadHistory(cursor)}>{t('more')}</button>}
    </>
  </section>;
}
