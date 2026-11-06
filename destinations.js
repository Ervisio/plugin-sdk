import { getSdk } from './index.js';

const labels = {
  en: { type:'Destination type',local:'Folder on this server',remote:'Saved SFTP / SMB folder',http:'HTTP upload service',drive:'ErvisioDrive',repo:'ErvisioRepo snapshot',s3:'Amazon S3 / compatible bucket',path:'Destination folder',browse:'Choose folder',connection:'Saved connection',noConnections:'Add an SFTP or SMB connection in Files, then refresh.',url:'Service URL',key:'API key / token',saved:'Saved · leave empty to keep',folder:'Folder slug (optional)',owner:'Repository owner',repository:'Repository name',target:'Target branch (optional)',repoHint:'Creates a draft release containing the snapshot. Repository branches and tags are not changed.',httpHint:'External uploads have no automatic deletion. Use {filename} in a PUT URL for a distinct object per export.',method:'HTTP method',body:'Upload body',multipart:'Multipart form',raw:'Raw file',field:'Multipart file field',header:'API key header',scheme:'Authentication format',bearer:'Bearer token',plain:'Raw key',bucket:'Bucket',region:'Region',endpoint:'Custom S3 endpoint (optional)',pathStyle:'Use path-style addresses (MinIO and similar services)',credentials:'AWS credentials',chain:'Account credential chain / IAM role',keys:'Access key and secret',access:'Access key ID',secret:'Secret access key',session:'Session token (optional)',retention:'Automatically clean up this plan’s expired S3 backups',retentionHint:'Only this plan’s authenticated archive/manifest pairs are eligible. Endpoints must support conditional deletion. Versioned buckets retain old versions according to their lifecycle.',insecure:'Allow unencrypted HTTP',insecureHint:'HTTP exposes API credentials and uploaded data on the network. Prefer HTTPS.',pickerUnavailable:'Upgrade Ervisio to use the shared file picker.',remoteOnly:'Choose a saved SFTP or SMB connection; this transport is not supported for backup delivery.' },
  it: { type:'Tipo di destinazione',local:'Cartella su questo server',remote:'Cartella SFTP / SMB salvata',http:'Servizio di upload HTTP',drive:'ErvisioDrive',repo:'Snapshot su ErvisioRepo',s3:'Amazon S3 / bucket compatibile',path:'Cartella di destinazione',browse:'Scegli cartella',connection:'Connessione salvata',noConnections:'Aggiungi una connessione SFTP o SMB in File, poi aggiorna.',url:'URL del servizio',key:'Chiave API / token',saved:'Salvata · lascia vuoto per mantenerla',folder:'Slug cartella (facoltativo)',owner:'Proprietario repository',repository:'Nome repository',target:'Branch di riferimento (facoltativo)',repoHint:'Crea una release in bozza contenente lo snapshot. I branch e i tag del repository non vengono modificati.',httpHint:'Gli upload esterni non hanno cancellazione automatica. Usa {filename} in un URL PUT per un oggetto diverso a ogni esportazione.',method:'Metodo HTTP',body:'Corpo upload',multipart:'Modulo multipart',raw:'File diretto',field:'Campo file multipart',header:'Intestazione chiave API',scheme:'Formato autenticazione',bearer:'Token Bearer',plain:'Chiave diretta',bucket:'Bucket',region:'Regione',endpoint:'Endpoint S3 personalizzato (facoltativo)',pathStyle:'Usa indirizzi path-style (MinIO e servizi simili)',credentials:'Credenziali AWS',chain:'Credenziali dell’account / ruolo IAM',keys:'Access key e secret',access:'Access key ID',secret:'Secret access key',session:'Session token (facoltativo)',retention:'Elimina automaticamente i vecchi backup S3 di questo piano',retentionHint:'Sono considerate solo le coppie archivio/manifesto autenticate di questo piano. L’endpoint deve supportare la cancellazione condizionale. I bucket versionati conservano le vecchie versioni secondo il loro ciclo di vita.',insecure:'Consenti HTTP non cifrato',insecureHint:'HTTP espone credenziali API e dati caricati sulla rete. Preferisci HTTPS.',pickerUnavailable:'Aggiorna Ervisio per usare il selettore di file condiviso.',remoteOnly:'Scegli una connessione SFTP o SMB salvata: questo trasporto non è supportato per i backup.' },
};

export function pickedDestination(path, connections = []) {
  if (typeof path !== 'string' || path.length > 4096 || /[\x00-\x1f\x7f]/.test(path)) throw new Error('Invalid selected destination.');
  const remote = /^remote:([a-f0-9]{16}):(\/.*)$/i.exec(path);
  if (remote) {
    const connection = connections.find(item => item.id === remote[1] && ['sftp','smb'].includes(item.kind));
    if (!connection) throw Object.assign(new Error('Choose a saved SFTP or SMB connection.'),{code:'unsupported_remote'});
    return {kind:'remote',connection:connection.id,path:remote[2]};
  }
  if (!(/^(\/|[A-Za-z]:[\\/]|\\\\[^\\]+\\[^\\]+)/.test(path))) throw new Error('Choose an absolute server folder.');
  return {kind:'local',connection:'',path};
}

const css = `.ev-destination{border:0;padding:0;margin:0;min-width:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.ev-destination-field{display:flex;flex-direction:column;gap:7px;min-width:0;font-size:12px;color:var(--ink2)}.ev-destination-field>span{font-weight:600}.ev-destination-wide{grid-column:1/-1}.ev-destination input:not([type=checkbox]),.ev-destination select{width:100%;box-sizing:border-box;min-height:38px;background:var(--sunk);color:var(--ink);border:1px solid var(--line);border-radius:9px;padding:8px 10px;font:inherit;outline:none}.ev-destination input:focus-visible,.ev-destination select:focus-visible,.ev-destination button:focus-visible{outline:2px solid var(--acc);outline-offset:2px}.ev-destination-check{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--ink)}.ev-destination-check input{accent-color:var(--acc)}.ev-destination-note{margin:0;font-size:12px;line-height:1.5;color:var(--ink2)}.ev-destination-error{color:var(--err)}.ev-destination-path{display:flex;gap:8px;align-items:center}.ev-destination-path>input{flex:1;min-width:0}.ev-destination button{border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--ink);padding:9px 12px;font:inherit;cursor:pointer;white-space:nowrap}.ev-destination:disabled{opacity:.65}@media(max-width:520px){.ev-destination{grid-template-columns:1fr}}`;

export function DestinationFields({value:d,onChange,connections=[],disabled=false,allowRetention=false}) {
  const sdk = getSdk(); const {createElement:h,useState,useEffect} = sdk.react;
  const [error,setError] = useState(''); const [picking,setPicking] = useState(false);
  useEffect(() => { if (document.getElementById('ervisio-destination-fields')) return; const style=document.createElement('style');style.id='ervisio-destination-fields';style.textContent=css;document.head.appendChild(style); },[]);
  const t=labels[sdk.lang?.().startsWith('it')?'it':'en']; const kind=d.kind||'remote';
  const patch=changes=>onChange({...d,...changes});
  const field=(key,title,props={})=>h('label',{className:'ev-destination-field'+(props.wide?' ev-destination-wide':''),key},h('span',null,title),h('input',{type:props.type||'text',required:props.required??false,maxLength:props.maxLength||2048,value:d[key]||'',placeholder:props.placeholder||'',autoComplete:props.type==='password'?'new-password':'off',onChange:e=>patch({[key]:e.target.value,...(key==='apiKey'?{clearAPIKey:false}:{})})}));
  const select=(key,title,options,defaultValue)=>h('label',{className:'ev-destination-field',key},h('span',null,title),h('select',{value:d[key]||defaultValue,onChange:e=>patch({[key]:e.target.value})},options.map(([value,label])=>h('option',{value,key:value},label))));
  const check=(key,title)=>h('label',{key,className:'ev-destination-check ev-destination-wide'},h('input',{type:'checkbox',checked:!!d[key],onChange:e=>patch({[key]:e.target.checked})}),title);
  const note=(key,text)=>h('p',{key,className:'ev-destination-note ev-destination-wide'},text);
  const browse=async()=>{setError('');setPicking(true);try{if(!sdk.files.pick)throw new Error(t.pickerUnavailable);const initial=kind==='remote'&&d.connection?`remote:${d.connection}:${d.path||'/'}`:kind==='local'?d.path:undefined;const picked=await sdk.files.pick({mode:'folder',title:t.path,...(initial?{initialDirectory:initial}:{})});if(picked)onChange(pickedDestination(picked.path,connections));}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setPicking(false);}};
  const children=[h('label',{key:'kind',className:'ev-destination-field ev-destination-wide'},h('span',null,t.type),h('select',{value:kind,onChange:e=>{setError('');onChange({kind:e.target.value,connection:'',path:e.target.value==='s3'?'':'/',...(e.target.value==='s3'?{region:'us-east-1',credentialMode:'default'}:{})});}},['local','remote','http','drive','repo','s3'].map(value=>h('option',{key:value,value},t[value]))))];
  if(kind==='local'||kind==='remote'){
    if(kind==='remote'){
      children.push(h('label',{key:'connection',className:'ev-destination-field ev-destination-wide'},h('span',null,t.connection),h('select',{value:d.connection||'',required:true,onChange:e=>{const selected=connections.find(c=>c.id===e.target.value);patch({connection:e.target.value,path:selected?.path||'/'});}},h('option',{value:''},'—'),connections.map(c=>h('option',{key:c.id,value:c.id},c.name+' · '+c.kind.toUpperCase())))));
      if(!connections.length)children.push(note('no-connections',t.noConnections));
    }
    children.push(h('label',{key:'path',className:'ev-destination-field ev-destination-wide'},h('span',null,t.path),h('span',{className:'ev-destination-path'},h('input',{required:true,value:d.path||'',onChange:e=>patch({path:e.target.value})}),h('button',{type:'button',disabled:picking,onClick:browse},t.browse))));
  }
  if(['http','drive','repo'].includes(kind)){
    children.push(field('url',t.url,{type:'url',required:true,wide:true,placeholder:'https://service.example'}));
    children.push(field('apiKey',t.key,{type:'password',wide:true,required:kind!=='http'&&!d.hasAPIKey,placeholder:d.hasAPIKey?t.saved:''}));
    if(kind==='drive')children.push(field('folder',t.folder,{wide:true,maxLength:150}));
    if(kind==='repo')children.push(field('owner',t.owner,{required:true,maxLength:100}),field('repository',t.repository,{required:true,maxLength:100}),field('target',t.target,{wide:true,maxLength:255}),note('repo-hint',t.repoHint));
    if(kind==='http'){
      children.push(select('method',t.method,[['POST','POST'],['PUT','PUT']],'POST'),select('uploadMode',t.body,[['multipart',t.multipart],['raw',t.raw]],'multipart'));
      if(d.uploadMode!=='raw')children.push(field('field',t.field,{placeholder:'file',maxLength:100}));
      children.push(field('apiHeader',t.header,{placeholder:'Authorization',maxLength:100}),select('authScheme',t.scheme,[['bearer',t.bearer],['raw',t.plain]],'bearer'));
    }
    children.push(note('external-hint',t.httpHint));
  }
  if(kind==='s3'){
    children.push(field('bucket',t.bucket,{required:true,maxLength:63}),field('region',t.region,{placeholder:'us-east-1',maxLength:64}),field('path',t.path,{placeholder:'backups/',wide:true,maxLength:1024}),field('endpoint',t.endpoint,{type:'url',wide:true,placeholder:'https://s3.example.com'}),check('pathStyle',t.pathStyle));
    children.push(h('label',{key:'credentials',className:'ev-destination-field ev-destination-wide'},h('span',null,t.credentials),h('select',{value:d.credentialMode||'default',onChange:e=>patch({credentialMode:e.target.value,accessKey:undefined,secretKey:undefined,sessionToken:undefined,hasCredentials:false,clearCredentials:e.target.value==='default'})},h('option',{value:'default'},t.chain),h('option',{value:'keys'},t.keys))));
    if(d.credentialMode==='keys')children.push(field('accessKey',t.access,{type:'password',required:!d.hasCredentials,placeholder:d.hasCredentials?t.saved:''}),field('secretKey',t.secret,{type:'password',required:!d.hasCredentials,placeholder:d.hasCredentials?t.saved:''}),field('sessionToken',t.session,{type:'password',wide:true,placeholder:d.hasCredentials?t.saved:''}));
    if(allowRetention)children.push(check('retention',t.retention),note('retention-hint',t.retentionHint));
  }
  if((d.url||d.endpoint||'').startsWith('http://'))children.push(check('allowHTTP',t.insecure),note('http-warning',t.insecureHint));
  if(error)children.push(h('p',{key:'error',role:'alert',className:'ev-destination-note ev-destination-error ev-destination-wide'},error));
  return h('fieldset',{className:'ev-destination',disabled},children);
}
