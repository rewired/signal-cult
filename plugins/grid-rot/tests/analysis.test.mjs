import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {analysePixels,targetScore} from '../js/analysis.js';
test('analysis maps expose deterministic luma edges and motion',()=>{
 const pixels=new Uint8ClampedArray([0,0,0,255,255,255,255,255,0,0,0,255,255,255,255,255]);const a=analysePixels(pixels,2,2),b=analysePixels(pixels,2,2,a.luma);
 assert.equal(a.luma[0],0);assert.equal(a.luma[1],1);assert.ok(a.edges[0]>0);assert.deepEqual([...b.motion],[0,0,0,0]);
});
test('target weights combine without exceeding their normalized range',()=>{
 const score=targetScore({luma:.8,edge:.5,motion:.25},{uniform:0,bright:1,dark:0,edges:1,motion:1});assert.ok(score>=0&&score<=1);assert.equal(targetScore({luma:0,edge:0,motion:0},{uniform:0,bright:0,dark:0,edges:0,motion:0}),1);
});

test('renderer expands and shapes edge and motion masks for cell targeting',()=>{
 const source=readFileSync(fileURLToPath(new URL('../js/renderer.js',import.meta.url)),'utf8');
 assert.match(source,/float edgeAt\(vec2 p\)/);assert.match(source,/float motionAt\(vec2 p,float layer\)/);
 assert.match(source,/featureRadius=\.28\/grid/);assert.match(source,/edge=smoothstep\(\.015,\.24,edge\)/);assert.match(source,/motion=smoothstep\(\.008,\.16,motion\)/);
 assert.match(source,/edgeAt\(uv\+vec2\(featureRadius\.x,0\.\)\)/);assert.match(source,/motionAt\(uv-vec2\(0\.,featureRadius\.y\),previousLayer\)/);
});