import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,presets,getBuiltInPreset,noiseTypes,maskTypes,validateMaskType,validatePreset} from '../lib/crt-params.js';
test('every built-in preset survives JSON exchange',()=>{
 for(const params of Object.values(presets))assert.deepEqual(validatePreset(JSON.parse(JSON.stringify({version:1,params}))),params);
});
test('malformed and unsupported presets fail without changing defaults',()=>{
 const before=JSON.stringify(defaults);
 for(const input of [null,{}, {version:2,params:defaults},{version:1,params:{}},{version:1,params:{...defaults,lines:0}},{version:1,params:{...defaults,bloom:'1'}},{version:1,params:{...defaults,noise:Infinity}}])assert.throws(()=>validatePreset(input));
 assert.equal(JSON.stringify(defaults),before);
});

test('legacy presets acquire noise controls without losing saved settings',()=>{
 const legacy=Object.fromEntries(Object.entries(defaults).filter(([key])=>key==='noise'||!key.startsWith('noise')));
 legacy.noise=.21;
 const result=validatePreset({version:1,params:legacy});
 assert.equal(result.noise,.21);
 assert.equal(result.noiseSize,defaults.noiseSize);
 assert.equal(result.noiseBands,defaults.noiseBands);
 assert.equal(result.noiseClumpSpeed,defaults.noiseClumpSpeed);
 assert.equal(validatePreset({version:1,params:{...legacy,noiseClumpSpeed:0}}).noiseClumpSpeed,0);
 assert.throws(()=>validatePreset({version:1,params:{...legacy,noiseClumpSpeed:4}}));
 assert.throws(()=>validatePreset({version:1,params:{...legacy,noiseSize:null}}));
 assert.throws(()=>validatePreset({version:1,params:{...legacy,noiseSpeed:-1}}));
});

test('all ten noise types survive preset exchange and reject invalid type IDs',()=>{
 assert.equal(noiseTypes.length,10);
 assert.equal(new Set(noiseTypes.map(type=>type.id)).size,10);
 for(const type of noiseTypes){
  const saved=JSON.parse(JSON.stringify({version:1,params:{...defaults,noiseType:type.id}}));
  assert.equal(validatePreset(saved).noiseType,type.id);
 }
 for(const id of [-1,.5,10,null,'3'])assert.throws(()=>validatePreset({version:1,params:{...defaults,noiseType:id}}));
});

test('all twelve mask IDs round-trip while malformed values fail',()=>{
 assert.equal(maskTypes.length,12);
 assert.equal(new Set(maskTypes.map(type=>type.id)).size,12);
 for(const type of maskTypes){
  const saved=JSON.parse(JSON.stringify({version:1,maskType:type.id,params:defaults}));
  assert.equal(validateMaskType(saved.maskType),type.id);
  assert.deepEqual(validatePreset(saved),defaults);
 }
 for(const oldId of [0,1,2])assert.equal(validateMaskType(oldId),oldId);
 for(const invalid of [-1,12,.5,null,undefined,'2',NaN])assert.throws(()=>validateMaskType(invalid));
});

test('built-in snapshots retain their mask and do not mutate saved looks',()=>{
 assert.equal(Object.keys(presets).length,24);
 for(const name of Object.keys(presets)){
  const snapshot=getBuiltInPreset(name);
  const encoded=JSON.parse(JSON.stringify(snapshot));
  assert.deepEqual(validatePreset(encoded),presets[name]);
  assert.equal(validateMaskType(encoded.maskType),snapshot.maskType);
  snapshot.params.noise=999;
  assert.notEqual(getBuiltInPreset(name).params.noise,999);
 }
 assert.equal(getBuiltInPreset('Delta / vintage').maskType,7);
 assert.equal(getBuiltInPreset('VHS / rental').params.noiseType,5);
 assert.throws(()=>getBuiltInPreset('Custom'));
 assert.throws(()=>getBuiltInPreset('__proto__'));
});


test('Sci-Fi presets and legacy compatibility',()=>{
 const old={...defaults};for(const id of Object.keys(old))if(id.startsWith('pixel'))delete old[id];
 assert.equal(validatePreset({version:1,params:old}).pixelMix,0);
 const looks=Object.entries(presets).filter(([name])=>name.startsWith('Sci-Fi /'));
 assert.equal(looks.length,12);
 assert.equal(new Set(looks.map(([,p])=>JSON.stringify(p))).size,12);
 for(const [name,p] of Object.entries(presets))assert.equal(p.pixelEnabled===1,name.startsWith('Sci-Fi /'));
 for(const [key,values] of Object.entries({pixelPattern:[-1,.5,8],pixelPalette:[-1,.5,6],pixelSize:[0,65],pixelMix:[-1,2]}))
  for(const value of values)assert.throws(()=>validatePreset({version:1,params:{...defaults,[key]:value}}));
});

test('stage switches round-trip and old files preserve their render',()=>{
 const legacy={...defaults};delete legacy.pixelEnabled;delete legacy.tubeEnabled;
 const restored=validatePreset({version:1,params:legacy});assert.equal(restored.pixelEnabled,1);assert.equal(restored.tubeEnabled,1);
 for(const pixelEnabled of [0,1])for(const tubeEnabled of [0,1]){const p={...defaults,pixelEnabled,tubeEnabled};assert.deepEqual(validatePreset({version:1,params:p}),p);}
 for(const key of ['pixelEnabled','tubeEnabled'])assert.throws(()=>validatePreset({version:1,params:{...defaults,[key]:.5}}));
});

test('seed is an exact 24-bit integer and defaults to zero for old presets',()=>{
 const legacy={...defaults};delete legacy.noiseSeed;assert.equal(validatePreset({version:1,params:legacy}).noiseSeed,0);
 for(const noiseSeed of [0,1,1234567,16777215])assert.equal(validatePreset({version:1,params:{...defaults,noiseSeed}}).noiseSeed,noiseSeed);
 for(const noiseSeed of [-1,.5,16777216,NaN,'12',null])assert.throws(()=>validatePreset({version:1,params:{...defaults,noiseSeed}}));
});
