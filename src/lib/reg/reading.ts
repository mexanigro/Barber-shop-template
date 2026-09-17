import type { Projection } from './types';
import type { LegacyMoneyRow } from './legacy-view';
export type RegReading={reg:Projection|null;legacy:LegacyMoneyRow[];coverage:'loading'|'complete'|'partial'|'error';error:string|null;legacyCoverage?:'complete'|'partial'|'unknown'|'error'};
export const emptyRegReading:RegReading={reg:null,legacy:[],coverage:'loading',error:null};
