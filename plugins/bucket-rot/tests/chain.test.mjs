import test from 'node:test';
import assert from 'node:assert/strict';
import {BucketChain,defaults,presets,parsePreset} from '../js/params.js';

test('64 image slots remain unique and move in either direction',()=>{
 const chain=new BucketChain();const p={...defaults,ride:0,wave:0};const newest=chain.step(p,'step-right');assert.equal(chain.slots[0].slot,newest);
 for(let i=0;i<80;i++)chain.step(p,'step-right');assert.equal(new Set(chain.slots.map(s=>s.slot)).size,64);assert.equal(chain.slots.filter(s=>s.filled).length,64);
 const first=chain.slots[0].slot;chain.step({...p,signalDirection:-1},'step-right');assert.equal(chain.slots[63].slot,first);
});
test('carried disturbance follows its image while wave travels independently',()=>{
 const c=new BucketChain();const p={...defaults,stepEvery:16,decay:.1,waveDirection:1};
 // First leftward trigger targets stage 64; subsequent signal flows left.
 p.signalDirection=-1;c.step(p,'step-left');const slot=c.slots[63].slot;
 assert.equal(c.slots[63].carrier.strength,1);assert.equal(c.waves[0].position,63);
 c.step(p,'step-left');assert.equal(c.slots[62].slot,slot);assert.equal(c.slots[62].carrier.strength,.9);assert.equal(c.waves.length,0);
 // Mid-chain wave and carrier move in opposite directions across row boundaries.
 c.slots[8].carrier={remaining:4,strength:1};c.waves=[{position:8,remaining:4,strength:1}];
 c.step(p,'step-left');assert.equal(c.slots[7].carrier.strength,.9);assert.equal(c.waves[0].position,9);
});
test('travel length expires, toggles isolate routes and reset is reproducible',()=>{
 const c=new BucketChain();const p={...defaults,span:2,stepEvery:16,waveDirection:1};c.step(p,'step-right');c.step(p,'step-right');assert.equal(c.slots[1].carrier.remaining,1);assert.equal(c.waves.length,1);c.step(p,'step-right');assert.equal(c.slots[2].carrier,null);assert.equal(c.waves.length,0);
 c.reset();c.step({...p,ride:0},'step-right');assert.equal(c.slots[0].carrier,null);assert.equal(c.waves.length,1);
 c.reset();c.step({...p,wave:0},'step-right');assert.equal(c.waves.length,0);assert.ok(c.slots[0].carrier);
 const run=()=>{c.reset();return Array.from({length:20},()=>{c.step({...p,stepEvery:1},'random');return c.cursor;});};assert.deepEqual(run(),run());
});
test('step cursors wrap and LFO remains bounded',()=>{
 const c=new BucketChain();const p={...defaults,stepEvery:1};c.step(p,'step-left');assert.equal(c.cursor,63);c.step(p,'step-left');assert.equal(c.cursor,62);
 c.reset();for(let i=0;i<65;i++)c.step(p,'step-right');assert.equal(c.cursor,0);
 c.reset();const positions=[];for(let i=0;i<200;i++){c.step(p,'lfo');positions.push(c.cursor);}assert.ok(positions.every(i=>i>=0&&i<64));assert.ok(new Set(positions).size>20);
});
test('all preset controls round-trip and invalid stage references are rejected',()=>{
 for(const p of presets){const saved={format:'bucket-rot-preset',version:1,name:p.name,mode:p.mode,params:p.params};assert.deepEqual(parsePreset(JSON.stringify(saved)),saved);}
 const valid={format:'bucket-rot-preset',version:1,...presets[0]};for(const params of [{...defaults,tap:65},{...defaults,signalDirection:0},{...defaults,span:1.5},{...defaults,wave:'yes'},{...defaults,clock:0}])assert.throws(()=>parsePreset(JSON.stringify({...valid,params})));
});

test('final-stage lock follows direction and preserves the selected tap',async()=>{
 const {outputTap}=await import('../js/params.js');const p={...defaults,tap:23};assert.equal(outputTap(p),23);p.finalOnly=1;assert.equal(outputTap(p),64);p.signalDirection=-1;assert.equal(outputTap(p),1);p.finalOnly=0;assert.equal(outputTap(p),23);
 const legacy={format:'bucket-rot-preset',version:1,...presets[0],params:{...defaults}};delete legacy.params.finalOnly;assert.equal(parsePreset(JSON.stringify(legacy)).params.finalOnly,0);assert.throws(()=>parsePreset(JSON.stringify({...legacy,params:{...legacy.params,finalOnly:2}})));
});

test('resolution and spatial area have separate integer ranges and legacy defaults',()=>{
 const old={format:'bucket-rot-preset',version:1,...presets[0],params:{...defaults}};delete old.params.memoryScale;delete old.params.areaScale;const parsed=parsePreset(JSON.stringify(old));assert.equal(parsed.params.memoryScale,2);assert.equal(parsed.params.areaScale,8);
 for(const params of [{...defaults,memoryScale:1.5},{...defaults,memoryScale:4},{...defaults,areaScale:0},{...defaults,areaScale:2.5}])assert.throws(()=>parsePreset(JSON.stringify({...old,params})));
 const c=new BucketChain();c.step({...defaults,signalDirection:1,stepEvery:16},'step-right');const packet=c.slots[0];assert.equal(packet.carrier.origin,0);c.step({...defaults,signalDirection:1,stepEvery:16},'step-right');assert.equal(c.slots[1],packet);assert.equal(c.slots[1].carrier.origin,0);
});
