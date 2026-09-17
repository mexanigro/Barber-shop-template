import React from 'react';
import { regText } from '../../lib/reg/labels';
import { formatMoney } from '../../lib/reg/money';
import { regForPeriod } from '../../lib/reg/totals';
import type { RegReading } from '../../lib/reg/reading';
import { useRegReading } from './RegProvider';

export function RegSummary({language='en',from,to,reading:explicit,compact=false}:{language?:string;from?:string;to?:string;reading?:RegReading;compact?:boolean}){
  const shared=useRegReading(),reading=explicit??shared.reading,t=(key:Parameters<typeof regText>[1])=>regText(language,key);
  if(reading.coverage==='loading')return <p role="status">{t('loading')}</p>;
  if(!reading.reg)return <div role="alert">{t('unavailable')} <button type="button" onClick={shared.refresh}>{t('retry')}</button></div>;
  const p=regForPeriod(reading.reg,{from,to});
  return <section data-reg-summary data-cut={p.cutRevision} data-coverage={p.coverage} className="min-w-0 space-y-2">
    <p>{t('received')}{from||to?` · ${from??'…'} — ${to??'…'}`:''}</p>
    <p className="text-xs text-muted-foreground">{t('declaration')}</p>
    {p.coverage!=='complete'&&<p role="alert">{t('partial')}</p>}
    {p.groups.length===0?<p>{t('empty')}</p>:p.groups.map(g=><div key={g.currency+g.scale} data-reg-unit={g.currency+':'+g.scale}>
      <p data-reg-gross={g.grossMinor}>{formatMoney({...g,amountMinor:g.grossMinor})}</p>
      {!compact&&<><p data-reg-refund={g.refundedMinor}>{t('refunded')}: {formatMoney({...g,amountMinor:g.refundedMinor})}</p><p data-reg-net={g.netMinor}>{t('net')}: {formatMoney({...g,amountMinor:g.netMinor})}</p></>}
    </div>)}
    <p>{t('unknown')}: {p.unknown} · {t('review')}: {p.reconciliation.review}</p>
    {!compact&&<p className="text-xs text-muted-foreground">{t('cut')}: {p.cutRevision} · {p.source.projectId}/{p.source.databaseId} · {t('legacy')}</p>}
  </section>;
}
