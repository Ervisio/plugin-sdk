import test from 'node:test';
import assert from 'node:assert/strict';
import { localPickedPath, PathInput } from '../paths.js';
import { setSdk } from '../index.js';

test('host path fields reject virtual connections rather than passing them to local tools',()=>{
  for(const path of ['/etc/app.conf','C:\\Data\\app.conf','\\\\server\\share\\file'])assert.equal(localPickedPath(path),path);
  for(const path of ['remote:'+'a'.repeat(16)+':/file','relative','/bad\npath'])assert.throws(()=>localPickedPath(path));
});
test('Browse uses the shared chooser and cancel does not modify the input',async()=>{
  let selected={path:'/srv/chosen'};let options;let result='unchanged';
  const h=(type,props,...children)=>({type,props,children});
  setSdk({react:{createElement:h,useState:v=>[v,()=>{}],useRef:v=>({current:v}),useEffect:fn=>fn(),Fragment:'fragment'},lang:()=> 'en',ui:{Input:'input',IconButton:'button',toast:{err:()=>assert.fail('unexpected picker error')}},files:{pick:async o=>{options=o;return selected;}}});
  const render=()=>PathInput({value:'/srv/old',mode:'folder',label:'Destination',onPathChange:p=>{result=p;}});
  await render().props.end.children[1].props.onClick();
  // onClick deliberately starts the async operation without making React await it.
  await Promise.resolve();assert.equal(options.mode,'folder');assert.equal(options.initialDirectory,'/srv/old');assert.equal(result,'/srv/chosen');
  selected=null;await render().props.end.children[1].props.onClick();await Promise.resolve();assert.equal(result,'/srv/chosen');
});
