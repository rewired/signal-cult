import test from 'node:test';
import assert from 'node:assert/strict';
import {BucketRenderer} from '../js/renderer.js';
import {BucketChain,defaults} from '../js/params.js';

// Exercise renderer routing directly; pixel-level validation also runs in WebGL.
function routingRenderer(params){
 const r=Object.create(BucketRenderer.prototype);r.ready=true;r.params=params;r.mode='step-right';r.chain=new BucketChain();r.calls=[];
 r.captureProgram='capture';r.displayProgram='display';r.bindTarget=()=>{};r.renderWet=()=>{};r.draw=(program,textures,values)=>r.calls.push({program,values});return r;
}
test('solo bypasses capture feedback and live blend without changing saved controls',()=>{
 const params={...defaults,amount:.2,feedback:.9,finalOnly:1};const r=routingRenderer(params);r.tick();r.tick();r.present(params.amount);
 assert.ok(r.calls.filter(c=>c.program==='capture').every(c=>c.values.feedback===0));assert.equal(r.calls.at(-1).values.amount,1);
 r.present(params.amount,true);assert.equal(r.calls.at(-1).values.amount,0);assert.equal(params.amount,.2);assert.equal(params.feedback,.9);
 params.finalOnly=0;r.tick();assert.equal(r.calls.at(-1).values.feedback,.9);r.present(params.amount);assert.equal(r.calls.at(-1).values.amount,.2);
});
test('entering solo discards contaminated history once, not on every input frame',()=>{
 const r=routingRenderer({...defaults});r.gl={activeTexture(){},bindTexture(){},pixelStorei(){},texImage2D(){}};r.setMemoryScale=()=>{};r.chain.step(defaults,'step-right');r.chain.step(defaults,'step-right');
 const solo={...defaults,finalOnly:1};r.upload({},solo,'step-right');assert.equal(r.chain.ticks,0);assert.equal(r.chain.slots.filter(s=>s.filled).length,0);
 r.tick();r.upload({},solo,'step-right');assert.equal(r.chain.ticks,1);
 r.upload({},defaults,'step-right');assert.equal(r.chain.ticks,1);r.upload({},solo,'step-right');assert.equal(r.chain.ticks,0);
});
