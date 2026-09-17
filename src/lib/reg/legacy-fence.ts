import type { DocumentReference, Firestore } from 'firebase-admin/firestore';
import { RegError } from './types.js';

/** Gate del writer manual Admin SDK: se serializa con la instalación del corte. */
export async function writeLegacyMoney(db:Firestore,clientId:string,ref:DocumentReference,payload:Record<string,unknown>):Promise<void>{
  await db.runTransaction(async tx=>{
    const [fence,document]=await tx.getAll(db.collection('reg_legacy_fence').doc(clientId),ref);
    if(fence.exists)throw new RegError(409,'reg.legacy_writer_blocked');
    if(!document.exists)throw new RegError(404,'reg.not_found');
    if(document.data()?.clientId!==clientId)throw new RegError(403,'reg.forbidden');
    tx.update(ref,payload);
  });
}
