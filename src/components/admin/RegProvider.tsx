import React from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { regService } from '../../services/reg';
import { emptyRegReading, type RegReading } from '../../lib/reg/reading';

const Context=React.createContext<{reading:RegReading;refresh:()=>void}>({reading:emptyRegReading,refresh:()=>{}});
/** Un corte compartido por los lectores; cualquier cambio de sesión descarta el anterior. */
export function RegProvider({children,client=regService,watchSession=true}:{children:React.ReactNode;client?:typeof regService;watchSession?:boolean}){
  const [reading,setReading]=React.useState<RegReading>(emptyRegReading),generation=React.useRef(0);
  const refresh=React.useCallback(async()=>{
    const n=++generation.current;setReading(emptyRegReading);
    try{const {projection:reg,assertCurrent}=await client.readBundle();assertCurrent();if(generation.current===n)setReading({reg,legacy:[],coverage:reg.coverage,error:null});}
    catch(error){if(generation.current===n)setReading({reg:null,legacy:[],coverage:'error',error:error instanceof Error?error.message:'reg.source_unavailable'});}
  },[client]);
  React.useEffect(()=>{
    const changed=()=>{void refresh();};
    window.addEventListener('reg:changed',changed);window.addEventListener('focus',changed);
    const unsubscribe=watchSession&&auth?onAuthStateChanged(auth,changed):null;
    if(!unsubscribe)changed();
    return()=>{generation.current++;unsubscribe?.();window.removeEventListener('reg:changed',changed);window.removeEventListener('focus',changed);};
  },[refresh,watchSession]);
  return <Context.Provider value={{reading,refresh}}>{children}</Context.Provider>;
}
export function useRegReading(){return React.useContext(Context);}
