import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeCompanion,isCompanionRuntime} from '../js/companion-adapter.js';
import {getBuiltInPreset,validatePreset,validateMaskType} from '../lib/crt-params.js';
test('CRT Companion bridge isolates look edits and forwards Apply and Cancel',async()=>{
 const savedDocument=globalThis.document,savedWindow=globalThis.window;const elements=new Map();
 const node=id=>{if(!elements.has(id))elements.set(id,{hidden:true,handlers:{},addEventListener(name,fn){this.handlers[name]=fn;}});return elements.get(id);};
 const look=getBuiltInPreset('Studio / PVM');let current;const calls=[];
 globalThis.document={querySelector:selector=>node(selector)};
 globalThis.window={__TAURI__:{core:{invoke:async(name,args)=>{calls.push({name,args});if(name==='host_exchange_context')return{active:true,preset:JSON.stringify(look),preview_data_url:''};}}}};
 try{
  assert.equal(isCompanionRuntime(),true);
  await initializeCompanion({applyPresetText(text){const parsed=JSON.parse(text);current={version:1,params:validatePreset(parsed),maskType:validateMaskType(parsed.maskType)};},currentPresetText(){return JSON.stringify(current);},showError(error){throw Error(error);}});
  assert.equal(node('#host-session').hidden,false);assert.match(node('#host-preview-status').textContent,/snapshot unavailable/);
  current.params.scan=.25;await node('#host-apply').handlers.click();await node('#host-cancel').handlers.click();
  const payload=JSON.parse(calls.find(c=>c.name==='host_exchange_apply').args.preset);assert.equal(payload.params.scan,.25);assert.equal(payload.params.inputGamma,undefined);assert(calls.some(c=>c.name==='host_exchange_cancel'));
 }finally{globalThis.document=savedDocument;globalThis.window=savedWindow;}
});
test('browser mode never contacts the native bridge',async()=>{
 const savedDocument=globalThis.document,savedWindow=globalThis.window;
 globalThis.document={querySelector:()=>null};globalThis.window={__TAURI__:{core:{invoke(){throw Error('unexpected native call');}}}};
 try{await initializeCompanion({});}finally{globalThis.document=savedDocument;globalThis.window=savedWindow;}
});
