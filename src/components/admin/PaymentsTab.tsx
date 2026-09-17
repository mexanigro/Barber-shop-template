import React from 'react';
import type { Appointment, Service, StaffMember } from '../../types';
import { localeConfig } from '../../config/locale';
import { RegOperationPanel } from './RegOperationPanel';
import { legacyMoneyRows } from '../../lib/reg/legacy-view';
import { regText } from '../../lib/reg/labels';
import { browserRegSource, regService } from '../../services/reg';
import { useCustomerList } from '../../hooks/useCustomerList';

/** REG registra dinero; la historia conserva campos originales sin reconstruir cobros. */
export function PaymentsTab({appointments,services,staff,isLoading=false,error=null,client=regService}:{appointments:Appointment[];services:Service[];staff:StaffMember[];isLoading?:boolean;error?:string|null;client?:typeof regService}){
  const language=localeConfig.lang,t=(key:Parameters<typeof regText>[1])=>regText(language,key);
  const {customers,loading:customersLoading,error:customersError}=useCustomerList();
  const legacy=[...legacyMoneyRows(appointments as unknown as Record<string,unknown>[],browserRegSource('appointments')),...legacyMoneyRows(customers as unknown as Record<string,unknown>[],browserRegSource('customers'))];
  const context=(stored:unknown,id:unknown,catalog:readonly {id:string;name:string}[])=>{
    const name=typeof stored==='string'&&stored.trim()?stored:undefined,current=catalog.find(item=>item.id===id)?.name;
    return <>{name??current??t('unknown')} · {name?t('recordedContext'):current?t('currentContext'):t('unknown')}{id?<small> · <bdi>{String(id)}</bdi></small>:null}</>;
  };
  return <div className="space-y-6"><RegOperationPanel language={language} client={client} legacy={legacy} legacyComplete={!isLoading&&!customersLoading&&!error&&!customersError} showPeriods/>
    <details className="rounded border border-border p-4"><summary>{t('legacy')}</summary>
      {(isLoading||customersLoading)&&<p>{t('loading')}</p>}{(error||customersError)&&<p role="alert">{t('historyIncomplete')}</p>}
      <p>{t('legacyPeriod')}</p>
      {legacy.map((row,index)=><article className="my-3 break-words" key={String(row.raw.id??index)}>
        <p>{t('customer')}: {context(row.raw.customerName??row.raw.fullName??row.raw.name,row.raw.customerId??(row.source?.collection==='customers'?row.raw.id:null),[])} · <bdi>{String(row.raw.customerPhone??row.raw.phone??'')}</bdi></p>
        <p>{t('service')}: {context(row.raw.serviceName,row.raw.serviceId??row.raw.lastServiceId,services)}</p>
        <p>{t('professional')}: {context(row.raw.staffName??row.raw.barberName,row.raw.staffId??row.raw.barberId,staff)}</p>
        <p>{t('appointmentDate')}: <bdi>{String(row.raw.date??t('unknown'))} {String(row.raw.time??'')}</bdi> · {String(row.raw.status??'')}</p>
        <p>{t('amount')}: {row.raw.amountPaidCents===undefined?t('unknown'):<bdi>{String(row.raw.amountPaidCents)} (amountPaidCents)</bdi>} · {t('currency')}: {String(row.raw.currency??t('unknown'))}</p>
        <p>{t('method')}: {String(row.raw.paymentMethod??t('unknown'))} · {t('source')}: {row.source?Object.values(row.source).join('/'):t('unknown')}</p>
        <details><summary>{t('originalFields')}</summary><pre className="whitespace-pre-wrap text-xs">{JSON.stringify(row.raw,null,2)}</pre></details>
      </article>)}
      {!legacy.length&&!isLoading&&!error&&<p>{t('empty')}</p>}
    </details>
  </div>;
}
