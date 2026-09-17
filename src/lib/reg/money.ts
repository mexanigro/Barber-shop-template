import { RegError, type Money, type EffectiveDate } from './types.js';

/** No usa Number para el importe, ni redondea datos declarados. */
export function minor(value: unknown, zero=false): string {
  if(typeof value!=='string'||! /^(0|[1-9]\d{0,17})$/.test(value)||(!zero&&value==='0'))throw new RegError(400,'reg.amount_invalid');
  return value;
}
export function decimalToMinor(text: string, scale: number): string {
  if(!Number.isInteger(scale)||scale<0||scale>3||! /^(0|[1-9]\d*)(\.\d+)?$/.test(text))throw new RegError(400,'reg.amount_invalid');
  const [whole,fraction='']=text.split('.');if(fraction.length>scale)throw new RegError(400,'reg.amount_precision');
  return minor((whole+fraction.padEnd(scale,'0')).replace(/^0+(?=\d)/,''));
}
export function money(value: unknown, currencies: Record<string,number>, zero=false): Money {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new RegError(422,'reg.money_unknown');
  const v=value as Record<string,unknown>;
  if(Object.keys(v).some(k=>!['amountMinor','currency','scale'].includes(k))||typeof v.currency!=='string'||!Object.hasOwn(currencies,v.currency)||v.scale!==currencies[v.currency])throw new RegError(422,'reg.currency_invalid');
  return{amountMinor:minor(v.amountMinor,zero),currency:v.currency,scale:v.scale as number};
}
export function formatMoney(value: Money): string {
  if(!/^-?(0|[1-9]\d*)$/.test(value.amountMinor)||!Number.isInteger(value.scale)||value.scale<0||value.scale>3)throw new RegError(400,'reg.amount_invalid');
  const negative=value.amountMinor.startsWith('-'),n=value.amountMinor.replace('-','').padStart(value.scale+1,'0');
  return `${negative?'-':''}${value.scale?n.slice(0,-value.scale)+'.'+n.slice(-value.scale):n} ${value.currency}`;
}
export function sameUnit(a: Pick<Money,'currency'|'scale'>,b: Pick<Money,'currency'|'scale'>): boolean{return a.currency===b.currency&&a.scale===b.scale;}

/** Comprueba el instante contra la hora local/offset explícitos, incluido DST. */
export function effectiveDate(value: unknown, now: string, future=false): EffectiveDate {
  if(!value||typeof value!=='object')throw new RegError(400,'reg.date_invalid');
  const v=value as EffectiveDate;
  if(typeof v.instant!=='string'||typeof v.local!=='string'||typeof v.zone!=='string'||typeof v.offset!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(v.local)||! /^(?:\+|-)\d{2}:\d{2}$/.test(v.offset))throw new RegError(400,'reg.date_invalid');
  const date=new Date(v.local+v.offset);
  if(!Number.isFinite(date.getTime())||date.toISOString()!==v.instant||(!future&&date.getTime()>Date.parse(now)))throw new RegError(400,'reg.date_invalid');
  let local: string;
  try{
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:v.zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);
    const get=(key:string)=>parts.find(p=>p.type===key)?.value;
    local=`${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
  }catch{throw new RegError(400,'reg.zone_invalid');}
  if(local!==v.local)throw new RegError(400,'reg.date_offset_invalid');
  return{instant:v.instant,local:v.local,zone:v.zone,offset:v.offset};
}
