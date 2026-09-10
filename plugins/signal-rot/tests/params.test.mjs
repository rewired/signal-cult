import test from 'node:test';
import assert from 'node:assert/strict';
import {presets,parsePreset,nextPreset,previewSize,retention} from '../js/params.js';

test('all signal-rot looks round-trip and returned settings are independent',()=>{
 for(const preset of presets){const saved={format:'signal-rot-preset',version:1,name:preset.name,mode:preset.mode,params:preset.params};const parsed=parsePreset(JSON.stringify(saved));assert.deepEqual(parsed,saved);parsed.params.amount=0;assert.notEqual(preset.params.amount,0);}
});
test('invalid imports reject cross-plugin files and unsafe parameters',()=>{
 const valid={format:'signal-rot-preset',version:1,...presets[0]};
 for(const patch of [{format:'broken-fm-preset'},{version:2},{mode:'unknown'},{params:{}},{params:{...valid.params,memory:0}},{params:{...valid.params,flow:'2'}}])assert.throws(()=>parsePreset(JSON.stringify({...valid,...patch})));
});
test('navigation wraps in either direction and custom starts at the correct boundary',()=>{
 const ids=presets.map(p=>p.id);assert.equal(nextPreset(ids,'custom',-1),ids.at(-1));assert.equal(nextPreset(ids,'custom',1),ids[0]);assert.equal(nextPreset(ids,ids[0],-1),ids.at(-1));assert.equal(nextPreset(ids,ids.at(-1),1),ids[0]);
});
test('preview dimensions respect portrait and landscape budgets without upscaling',()=>{
 assert.deepEqual(previewSize(3840,2160),{width:960,height:540});assert.deepEqual(previewSize(1080,1920),{width:304,height:540});assert.deepEqual(previewSize(320,240),{width:320,height:240});assert.deepEqual(previewSize(4000,1000),{width:960,height:240});
});
test('memory decay is independent of frame subdivision',()=>{
 assert.ok(Math.abs(retention(1/30,.8)**30-retention(1/60,.8)**60)<1e-12);assert.equal(retention(0,1),1);assert.ok(retention(.1,.2)<retention(.1,2));
});
