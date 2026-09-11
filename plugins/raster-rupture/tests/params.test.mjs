import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,defaultColors,defaultRoutes,destinations,fields,maskSources,parsePreset,presets,serializePreset} from '../js/params.js';

test('one mask exposes nine continuous bipolar destinations',()=>{
 const routes=defaultRoutes();
 assert.equal(routes.length,destinations.length);
 assert.ok(routes.every(route=>route.length===2&&route[0]>=-1&&route[0]<=1&&route[1]>=-90&&route[1]<=90));
 assert.equal(destinations.length,9);
 assert.deepEqual(maskSources,['MASK']);
});

test('preset round-trip preserves parameters and signed routes',()=>{
 const routes=defaultRoutes();routes[2]=[-.37,42];
 const preset=serializePreset({name:'Test',style:'motion',description:'Contract test',params:{...defaults},colors:{ink:'#123456',accent:'#abcdef'},routes,combine:'max'});
 assert.deepEqual(parsePreset(JSON.stringify(preset)),preset);
});

test('legacy four-source routes migrate A and inverse-B into one bipolar value',()=>{
 const legacy=defaultRoutes().map(()=>[0,0,0,0]);legacy[0][0]=1;legacy[1][1]=1;legacy[2][2]=1;
 const parsed=parsePreset(JSON.stringify({format:'raster-rupture-preset',version:1,name:'Legacy',style:'transmission',description:'',params:{...defaults},colors:defaultColors,routes:legacy,combine:'max'}));
 assert.deepEqual(parsed.routes[0],[1,0]);assert.deepEqual(parsed.routes[1],[-1,0]);assert.deepEqual(parsed.routes[2],[0,0]);
});

test('factory presets actively use distinct bipolar mask profiles',()=>{
 const profiles=new Set(presets.map(preset=>JSON.stringify(preset.routes)));
 assert.ok(profiles.size>=8,'expected at least eight routing characters');
 for(const preset of presets){
  assert.equal(preset.routes.length,destinations.length,preset.id);
  assert.ok(preset.routes.some(([value])=>value<0),preset.id+' needs an inverted destination');
  assert.ok(preset.routes.some(([value])=>value>0),preset.id+' needs a normal destination');
  assert.ok(preset.routes.some(([value])=>Math.abs(value)>0&&Math.abs(value)<1),preset.id+' needs continuous influence');
 }
 const archive=presets.find(preset=>preset.id==='black-archive').routes;
 assert.deepEqual(archive[4],[1,0]);assert.deepEqual(archive[5],[-1,0]);
 const blood=presets.find(preset=>preset.id==='blood-fax').routes;
 assert.deepEqual(blood[7],[-1,0]);
 const motion=presets.find(preset=>preset.id==='motion-residue').routes;
 assert.deepEqual(motion[8],[1,0]);
 const legacyIds=new Set(presets.slice(0,26).map(preset=>preset.id));
 assert.ok(presets.filter(preset=>legacyIds.has(preset.id)).every(preset=>preset.routes.every(([,angle])=>angle===0)));
 const directional=presets.slice(26);assert.equal(directional.length,10);assert.ok(directional.every(preset=>preset.routes.some(([,angle])=>angle!==0)));
});

test('invalid parameters and route cells are rejected',()=>{
 const valid=serializePreset({name:'Test',style:'transmission',description:'',params:{...defaults},colors:defaultColors,routes:defaultRoutes(),combine:'max'});
 for(const patch of [{version:2},{combine:'xor'},{colors:{ink:'white',accent:'#ffffff'}},{params:{...valid.params,tearAmount:2}},{routes:valid.routes.map((route,index)=>index?route:[2,0])},{routes:valid.routes.map((route,index)=>index?route:[0,91])}]){
  assert.throws(()=>parsePreset(JSON.stringify({...valid,...patch})));
 }
});

test('every parameter default belongs to its declared native-safe range',()=>{
 for(const field of fields)assert.ok(defaults[field.key]>=field.min&&defaults[field.key]<=field.max,field.key);
});
