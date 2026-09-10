import test from 'node:test';
import assert from 'node:assert/strict';
import {getBuiltInPreset,presets} from '../lib/crt-params.js';
import {parsePreset,stringifyPreset,stepPresetName} from '../js/presets.js';

test('factory looks retain their name, mask and parameters through JSON exchange',()=>{
 for(const name of Object.keys(presets)){
  const preset={...getBuiltInPreset(name),name};
  assert.deepEqual(parsePreset(stringifyPreset(preset)),preset);
 }
});

test('legacy unnamed presets load with defaults and exclude technical color settings',()=>{
 const legacy=getBuiltInPreset('Studio / PVM');
 delete legacy.params.pixelEnabled;delete legacy.params.tubeEnabled;delete legacy.params.noiseSeed;
 legacy.params.inputGamma=5;
 const loaded=parsePreset(JSON.stringify(legacy));
 assert.equal(loaded.name,'Untitled');assert.equal(loaded.params.pixelEnabled,1);
 assert.equal(loaded.params.tubeEnabled,1);assert.equal(loaded.params.noiseSeed,0);
 assert.equal(loaded.params.inputGamma,undefined);
});

test('preset imports reject invalid masks and incomplete settings',()=>{
 const preset=getBuiltInPreset('Studio / PVM');
 assert.throws(()=>parsePreset(JSON.stringify({...preset,maskType:99})),/mask type/);
 delete preset.params.scan;
 assert.throws(()=>parsePreset(JSON.stringify(preset)),/Invalid parameter/);
 assert.throws(()=>parsePreset('{'),SyntaxError);
});

test('preset navigation matches BROKEN FM at custom state and library boundaries',()=>{
 const names=Object.keys(presets);
 assert.equal(stepPresetName(names,'custom',-1),names.at(-1));
 assert.equal(stepPresetName(names,'custom',1),names[0]);
 assert.equal(stepPresetName(names,names[0],-1),names.at(-1));
 assert.equal(stepPresetName(names,names.at(-1),1),names[0]);
 assert.equal(stepPresetName([],'custom',1),null);
});
