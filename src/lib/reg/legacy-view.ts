import type { Source } from './types.js';

export type LegacyMoneyRow={kind:'legacy';source:Source|null;raw:Record<string,unknown>;unknown:string[]};
const MONEY_FIELDS=['amountPaidCents','lifetimeValueCents','paymentMethod','paymentStatus','paidAt','providerSessionId','stripeSessionId','currency'];

/** Conserva valores originales; una cita, contacto o tarifa no identifica un cobro REG. */
export function legacyMoneyRows(rows:Record<string,unknown>[],source:Omit<Source,'documentId'>|null):LegacyMoneyRow[]{
  return rows.filter(row=>MONEY_FIELDS.some(key=>Object.hasOwn(row,key))).map(row=>{
    const raw:Record<string,unknown>={};for(const key of ['id','date','time','status','name','fullName','phone','email','customerId','customerName','customerPhone','customerEmail','serviceId','serviceName','lastServiceId','staffId','staffName','barberId','barberName',...MONEY_FIELDS])if(Object.hasOwn(row,key))raw[key]=row[key];
    const unknown=['monetaryIdentity','scale','effectiveDate'];
    if(!Object.hasOwn(row,'amountPaidCents'))unknown.push('amount');
    if(!Object.hasOwn(row,'currency'))unknown.push('currency');
    if(!Object.hasOwn(row,'paymentMethod'))unknown.push('method');
    if(!source)unknown.push('physicalSource');
    return{kind:'legacy',source:source?{...source,documentId:String(row.id)}:null,raw,unknown};
  });
}
