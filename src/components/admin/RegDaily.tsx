import React from 'react';
import { useRegReading } from './RegProvider';
import { regForPeriod } from '../../lib/reg/totals';
import { formatMoney } from '../../lib/reg/money';
import { regText } from '../../lib/reg/labels';
/** Serie exacta por fecha efectiva y unidad; la tabla evita redondear importes para un gráfico. */
export function RegDaily({language='en',from,to}:{language?:string;from?:string;to?:string}){
  const {reading}=useRegReading(),p=reading.reg,t=(key:Parameters<typeof regText>[1])=>regText(language,key);
  if(!p)return <p>{t(reading.coverage==='loading'?'loading':'unavailable')}</p>;
  const days=[...new Set(p.operations.map(op=>op.effective?.local.slice(0,10)).filter((day):day is string=>!!day&&(!from||day>=from)&&(!to||day<=to)))].sort();
  return <div className="overflow-x-auto"><p>{t('declaration')}</p>{p.coverage!=='complete'&&<p role="alert">{t('partial')}</p>}<table><thead><tr><th>{t('date')}</th><th>{t('received')}</th><th>{t('refunded')}</th><th>{t('net')}</th></tr></thead><tbody>{days.flatMap(day=>regForPeriod(p,{from:day,to:day}).groups.map(g=><tr key={day+g.currency+g.scale}><td>{day}</td><td>{formatMoney({...g,amountMinor:g.grossMinor})}</td><td>{formatMoney({...g,amountMinor:g.refundedMinor})}</td><td>{formatMoney({...g,amountMinor:g.netMinor})}</td></tr>))}</tbody></table>{days.length===0&&<p>{t('empty')}</p>}</div>;
}
