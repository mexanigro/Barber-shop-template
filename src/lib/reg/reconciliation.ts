import type { EvidenceLink, Operation } from './types.js';

type Relation={link:EvidenceLink;owner:string;details:string[]};
type Support={terminalIds:Set<string>;valid:boolean};
export type SupportTrace={operationId:string;terminalIds:string[];valid:boolean};

/** Agregado apunta a detalle; una candidata duplicada apunta a su representante declarado. */
function relations(evidence:EvidenceLink[]):Relation[]{
  return evidence.flatMap(link=>link.aggregate?[{link,owner:link.receiptId,details:link.relatedIds}]:link.relatedIds.map(owner=>({link,owner,details:[link.receiptId]})));
}
function adjacency(evidence:EvidenceLink[]):Map<string,Set<string>>{
  const graph=new Map<string,Set<string>>();
  for(const row of relations(evidence)){const edges=graph.get(row.owner)??new Set<string>();for(const id of row.details)edges.add(id);graph.set(row.owner,edges);}
  return graph;
}
/** Sólo una arista nueva puede crear un ciclo nuevo. Permite reparar un grafo histórico por partes. */
export function introducesEvidenceCycle(before:EvidenceLink[],after:EvidenceLink[]):boolean{
  const old=adjacency(before),graph=adjacency(after);
  for(const [from,targets] of graph)for(const to of targets){
    if(old.get(from)?.has(to))continue;
    const pending=[to],seen=new Set<string>();
    while(pending.length){const node=pending.pop()!;if(node===from)return true;if(seen.has(node))continue;seen.add(node);pending.push(...(graph.get(node)??[]));}
  }
  return false;
}

/** Resuelve del detalle terminal hacia los agregados, sin recursión ni contar una identidad dos veces. */
export function reconcileEvidence(operations:Operation[],evidence:EvidenceLink[]):{review:number;excluded:string[];unresolved:string[];support:SupportTrace[]}{
  const ops=new Map(operations.map(op=>[op.id,op])),byOwner=new Map<string,Relation[]>(),graph=adjacency(evidence);
  const excluded=new Set<string>(),unresolved=new Set<string>();
  for(const row of relations(evidence)){const list=byOwner.get(row.owner)??[];list.push(row);byOwner.set(row.owner,list);excluded.add(row.owner);}
  for(const link of evidence)if(link.state==='review')unresolved.add(link.id);
  const parents=new Map<string,Set<string>>(),remaining=new Map<string,number>();
  const nodes=new Set([...ops.keys(),...graph.keys(),...[...graph.values()].flatMap(set=>[...set])]);
  for(const id of nodes){const children=graph.get(id)??new Set<string>();remaining.set(id,children.size);for(const child of children){const set=parents.get(child)??new Set<string>();set.add(id);parents.set(child,set);}}
  const pending=[...nodes].filter(id=>remaining.get(id)===0),resolved=new Map<string,Support>();
  const validReceipt=(op:Operation|undefined)=>!!op&&op.kind==='receipt'&&op.state==='received_declared'&&!!op.money&&/^\d{1,18}$/.test(op.money.amountMinor);
  const equal=(a:Set<string>,b:Set<string>)=>a.size===b.size&&[...a].every(id=>b.has(id));
  for(let cursor=0;cursor<pending.length;cursor++){
    const id=pending[cursor],op=ops.get(id),rows=byOwner.get(id)??[];
    let result:Support={terminalIds:new Set(validReceipt(op)?[id]:[]),valid:validReceipt(op)};
    if(rows.length){
      let first:Set<string>|null=null,allValid=true;
      for(const row of rows){
        let valid=validReceipt(op)&&row.link.state==='declared'&&row.details.length>0;
        const terminals=new Set<string>();
        for(const child of row.details){
          const support=resolved.get(child);if(!support?.valid)valid=false;
          for(const terminal of support?.terminalIds??[]){if(terminals.has(terminal))valid=false;terminals.add(terminal);}
        }
        let total=0n;
        for(const terminal of terminals){const detail=ops.get(terminal);if(!validReceipt(detail)||detail!.money!.currency!==op?.money?.currency||detail!.money!.scale!==op?.money?.scale)valid=false;else total+=BigInt(detail!.money!.amountMinor);}
        if(!op?.money||!validReceipt(op)||total!==BigInt(op.money.amountMinor))valid=false;
        if(first&&!equal(first,terminals))valid=false;
        if(!valid){unresolved.add(row.link.id);allValid=false;}
        first??=terminals;
      }
      // Alternativas incompatibles invalidan todas las declaraciones del mismo agregado.
      if(!allValid)for(const row of rows)unresolved.add(row.link.id);
      result={terminalIds:first??new Set(),valid:allValid};
    }
    resolved.set(id,result);
    for(const parent of parents.get(id)??[]){const count=remaining.get(parent)!-1;remaining.set(parent,count);if(count===0)pending.push(parent);}
  }
  // Lo no resuelto contiene ciclos o depende de ellos. Conserva identidad; no adivina su importe.
  for(const [id,rows]of byOwner)if(!resolved.has(id)){resolved.set(id,{terminalIds:new Set(),valid:false});for(const row of rows)unresolved.add(row.link.id);}
  for(const op of operations)if(op.parentReceiptId&&excluded.has(op.parentReceiptId))excluded.add(op.id);
  return{review:evidence.filter(e=>e.state==='review').length,excluded:[...excluded].sort(),unresolved:[...unresolved].sort(),support:[...byOwner.keys()].sort().map(operationId=>({operationId,terminalIds:[...(resolved.get(operationId)?.terminalIds??[])].sort(),valid:resolved.get(operationId)?.valid??false}))};
}
