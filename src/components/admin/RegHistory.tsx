import React from 'react';
import { regText } from '../../lib/reg/labels';
import { formatMoney } from '../../lib/reg/money';
import type { Event, Operation } from '../../lib/reg/types';

export function RegHistory({events,language}:{events:Event[];language:string}){
  const t=(key:Parameters<typeof regText>[1])=>regText(language,key);
  return <section aria-label={t('history')} className="space-y-3">
    <h3>{t('history')}</h3>
    {events.map(event=>{const op=event.after as Operation;return <article key={event.id} className="rounded border border-border p-3 break-words">
      <p>{t('revision')}: {op.revision} · {t('recorded')}: <bdi>{event.recordedAt}</bdi></p>
      <p>{t('amount')}: <bdi>{op.money?formatMoney(op.money):t('unknown')}</bdi> · {t('state')}: {t(op.state)}</p>
      <p>{t('method')}: {op.method?.translations[language]??op.method?.label??t('unknown')}</p>
      <p>{t('date')}: <bdi>{op.effective?op.effective.local+' '+op.effective.offset:t('unknown')}</bdi></p>
      <p>{t('author')}: <bdi>{event.actor.email}</bdi></p><p>{t('reason')}: {event.reason||'—'}</p>
      <p>{t('evidence')}: {op.evidence.reference||t('noEvidence')}</p>
      <p>{t('description')}: {op.description}</p>
    </article>;})}
  </section>;
}
