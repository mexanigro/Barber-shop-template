import React from 'react';
import type { Allocation, Operation } from '../../lib/reg/types';
import { regText, type RegLabel } from '../../lib/reg/labels';
import { formatMoney } from '../../lib/reg/money';

export type RefundCorrectionDraft={enabled:boolean;amount:string;state:Operation['state'];unallocated:string;parts:Record<string,string>;reason:string};

/** Cada devolución dependiente se incluye expresamente; cambiar moneda nunca convierte importes. */
export function RegDependentCorrections({refunds,allocations,drafts,onChange,language,currency,scale}:{refunds:Operation[];allocations:Allocation[];drafts:Record<string,RefundCorrectionDraft>;onChange:(id:string,draft:RefundCorrectionDraft)=>void;language:string;currency:string;scale:number}){
  const t=(key:RegLabel)=>regText(language,key),input='block w-full min-w-0 rounded border border-border bg-background p-2';
  return <fieldset className="sm:col-span-2 space-y-3"><legend>{t('refundCorrections')}</legend><p>{t('explicitUnit')}</p>
    {refunds.map(refund=>{
      const draft=drafts[refund.id]??{enabled:false,amount:'',state:refund.state,unallocated:'',parts:{},reason:''};
      const set=(change:Partial<RefundCorrectionDraft>)=>onChange(refund.id,{...draft,...change});
      const original=refund.money?formatMoney(refund.money):t('unknown');
      return <fieldset key={refund.id} data-dependent-refund={refund.id} className="rounded border border-border p-3 space-y-2">
        <legend>{refund.description||refund.id} · <bdi>{original}</bdi></legend>
        <label><input type="checkbox" checked={draft.enabled} onChange={e=>set({enabled:e.target.checked})}/>{t('includeCorrection')}</label>
        {draft.enabled&&<>
          <p><bdi>{currency}</bdi> · {t('scale')}: {scale} · {t('date')}: <bdi>{refund.effective?.local??t('unknown')}</bdi></p>
          <label>{t('amount')}<input className={input} aria-label={t('amount')} value={draft.amount} onChange={e=>set({amount:e.target.value})} required/></label>
          <label>{t('state')}<select className={input} aria-label={t('state')} value={draft.state} onChange={e=>set({state:e.target.value as Operation['state']})}>{(['refund_pending','refund_declared','rejected','void'] as const).map(state=><option key={state} value={state}>{t(state)}</option>)}</select></label>
          <label>{t('unallocated')}<input className={input} aria-label={t('unallocated')} value={draft.unallocated} onChange={e=>set({unallocated:e.target.value})} required/></label>
          {allocations.map(allocation=><label className="block" key={allocation.id}>{t('distribution')} · {allocation.agreementId}<input className={input} aria-label={t('distribution')+' '+allocation.id} value={draft.parts[allocation.id]??''} onChange={e=>set({parts:{...draft.parts,[allocation.id]:e.target.value}})}/></label>)}
          <label>{t('reason')}<input className={input} aria-label={t('reason')} value={draft.reason} onChange={e=>set({reason:e.target.value})} required/></label>
        </>}
      </fieldset>;
    })}
  </fieldset>;
}
