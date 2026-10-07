import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
 companionStateToPreset,
 parsePreset,
 presets,
 presetToCompanionState
} from '../js/params.js';
import {initializeCompanion,isCompanionRuntime} from '../js/companion-adapter.js';

const contract=JSON.parse(await readFile(new URL('../native/generated/companion-contract.json',import.meta.url),'utf8'));
const exchange=await readFile(new URL('../hosts/ofx/src/companion_exchange.cpp',import.meta.url),'utf8');
const host=await readFile(new URL('../hosts/ofx/src/grid_rot_ofx.cpp',import.meta.url),'utf8');
const stage=await readFile(new URL('../companion/scripts/stage_frontend.mjs',import.meta.url),'utf8');

test('every GRID ROT factory preset round-trips through the native Companion state',()=>{
 for(const preset of presets){
  const normalized=parsePreset(JSON.stringify({format:'grid-rot-preset',version:2,...preset}));
  const state=presetToCompanionState(normalized);
  assert.equal(Object.keys(state.values).length,contract.parameters.length,preset.name);
  assert.deepEqual(companionStateToPreset(state),normalized,preset.name);
 }
});

test('Companion state rejects missing, invalid and out-of-range values',()=>{
 const state=presetToCompanionState(presets[0]);
 delete state.values.density;
 assert.throws(()=>companionStateToPreset(state),/Missing Companion parameter/);
 const invalid=presetToCompanionState(presets[0]);
 invalid.values.temporalEnabled=2;
 assert.throws(()=>companionStateToPreset(invalid),/Invalid Companion switch/);
 const excessive=presetToCompanionState(presets[0]);
 excessive.values.infectionRadius=99;
 assert.throws(()=>companionStateToPreset(excessive),/infection radius/);
});

test('Companion runtime loads host state and forwards Apply and Cancel',async()=>{
 const savedDocument=globalThis.document,savedWindow=globalThis.window;
 const elements=new Map();
 const node=id=>{if(!elements.has(id))elements.set(id,{hidden:true,textContent:'',handlers:{},addEventListener(name,fn){this.handlers[name]=fn;}});return elements.get(id);};
 const state=presetToCompanionState(presets[0]),calls=[];
 globalThis.document={
  documentElement:{classList:{add(value){this.value=value;}}},
  querySelector(selector){if(selector.startsWith('meta['))return {};return node(selector);}
 };
 globalThis.window={__TAURI__:{core:{invoke:async(name,args)=>{calls.push({name,args});if(name==='host_exchange_context')return{active:true,state:JSON.stringify(state),preview_data_url:''};}}}};
 try{
  assert.equal(isCompanionRuntime(),true);
  let current=state;
  await initializeCompanion({applyStateText(text){current=JSON.parse(text);},currentStateText(){return JSON.stringify(current);},showError(error){throw Error(error);}});
  assert.equal(node('#host-session').hidden,false);
  await node('#host-apply').handlers.click();
  await node('#host-cancel').handlers.click();
  assert(calls.some(call=>call.name==='host_exchange_apply'));
  assert(calls.some(call=>call.name==='host_exchange_cancel'));
 }finally{globalThis.document=savedDocument;globalThis.window=savedWindow;}
});

test('browser runtime never contacts the Tauri bridge',async()=>{
 const savedDocument=globalThis.document,savedWindow=globalThis.window;
 globalThis.document={querySelector(){return null;}};
 globalThis.window={__TAURI__:{core:{invoke(){throw Error('unexpected native call');}}}};
 try{await initializeCompanion({});}finally{globalThis.document=savedDocument;globalThis.window=savedWindow;}
});

test('OFX Companion launch is registered, validated and staged without remote assets',()=>{
 assert.match(host,/kOfxParamTypePushButton,"editCompanion"/);
 assert.match(host,/editAdvanced/);
 assert.match(exchange,/Software\\\\rewired-vfx\\\\GRID ROT/);
 assert.match(exchange,/Companion returned an incompatible state/);
 assert.match(exchange,/CreateProcessW/);
 assert.match(stage,/grid-rot-runtime/);
 assert.match(stage,/controls\.js/);
 assert.match(stage,/signal-rot-params\.js/);
 assert.match(stage,/broken-fm-base\.css/);
 assert.match(stage,/signal-rot-style\.css/);
});
