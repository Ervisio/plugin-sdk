import { getSdk } from './index.js';

/** Host filesystem paths only. Container and paired-host browsers own their context. */
export function localPickedPath(path) {
  if (typeof path !== 'string' || /[\x00-\x1f\x7f]/.test(path) || !/^(\/|[a-z]:[\\/]|\\\\[^\\]+\\[^\\]+)/i.test(path)) {
    throw new Error('Choose a file or folder on this server.');
  }
  return path;
}

export function PathInput({ value, onPathChange, mode='file', ...props }) {
  const sdk=getSdk(); const {createElement:h,useState,useRef,useEffect}=sdk.react;
  const [busy,setBusy]=useState(false); const alive=useRef(true);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const italian=sdk.lang?.().startsWith('it');
  const title=typeof props.label==='string'?props.label:italian?'Scegli percorso':'Choose path';
  const browse=async()=>{
    setBusy(true);
    try {
      if(!sdk.files.pick)throw new Error(italian?'Aggiorna Ervisio per usare il selettore.':'Upgrade Ervisio to use the file picker.');
      const initial=/^(\/|[a-z]:[\\/]|\\\\)/i.test(value||'')?value.replaceAll('\\','/'):undefined;
      const directory=mode==='folder'?initial:initial?.slice(0,initial.lastIndexOf('/')+1);
      const picked=await sdk.files.pick({mode,title,...(directory?{initialDirectory:directory}:{}),...(mode==='save'?{initialName:initial?.split('/').at(-1)||''}:{})});
      if(picked&&alive.current)onPathChange(localPickedPath(picked.path));
    }catch(error){if(alive.current)sdk.ui.toast.err(title,error instanceof Error?error.message:String(error));}
    finally{if(alive.current)setBusy(false);}
  };
  return h(sdk.ui.Input,{...props,value,onChange:event=>onPathChange(event.target.value),end:h(sdk.react.Fragment,null,props.end,h(sdk.ui.IconButton,{type:'button',icon:'files',label:(italian?'Sfoglia: ':'Browse: ')+title,disabled:props.disabled||busy,onClick:()=>void browse()}))});
}
