import type { RegReading } from './reading';
import { formatMoney } from './money';

/** Descripción del snapshot declarado por el cliente; no certifica su autoridad en servidor. */
export function describeRegReading(value:unknown):string{
  const reading=value as RegReading|undefined;
  if(!reading?.reg)return 'Money register unavailable; do not infer receipts from appointments or catalogue prices.';
  const p=reading.reg;
  if(!Array.isArray(p.groups)||!Number.isSafeInteger(p.cutRevision))return 'Money snapshot invalid.';
  const lines=[`Operator-declared money; provider unverified; client snapshot; coverage ${p.coverage}; cut ${p.cutRevision}.`];
  try{for(const g of p.groups)lines.push(`Gross ${formatMoney({...g,amountMinor:g.grossMinor})}; refunded ${formatMoney({...g,amountMinor:g.refundedMinor})}; net ${formatMoney({...g,amountMinor:g.netMinor})}.`);}catch{return 'Money snapshot invalid.';}
  lines.push(`Unknown records ${p.unknown}; legacy is separate, not consolidated.`);
  return lines.join('\n');
}
