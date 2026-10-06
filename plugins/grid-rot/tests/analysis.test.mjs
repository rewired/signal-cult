import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analysePixels,targetScore} from '../js/analysis.js';
test('analysis maps expose deterministic luma edges and motion',()=>{
 const pixels=new Uint8ClampedArray([0,0,0,255,255,255,255,255,0,0,0,255,255,255,255,255]);const a=analysePixels(pixels,2,2),b=analysePixels(pixels,2,2,a.luma);
 assert.equal(a.luma[0],0);assert.equal(a.luma[1],1);assert.ok(a.edges[0]>0);assert.deepEqual([...b.motion],[0,0,0,0]);
});
test('target weights combine without exceeding their normalized range',()=>{
 const score=targetScore({luma:.8,edge:.5,motion:.25},{uniform:0,bright:1,dark:0,edges:1,motion:1});assert.ok(score>=0&&score<=1);assert.equal(targetScore({luma:0,edge:0,motion:0},{uniform:0,bright:0,dark:0,edges:0,motion:0}),1);
});
