import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const renderer=await readFile(new URL('../js/renderer.js',import.meta.url),'utf8');
const fract=value=>value-Math.floor(value);
const f=Math.fround;
function shaderHash(x,y,seed){
 x=f(x+f(seed*.1031));y=f(y+f(seed*.11369));
 let a=fract(f(x*.1031)),b=fract(f(y*.1031)),c=fract(f(x*.1031));
 const dot=f(f(a*f(b+33.33))+f(b*f(c+33.33))+f(c*f(a+33.33)));
 a=f(a+dot);b=f(b+dot);c=f(c+dot);
 return fract(f(f(a+b)*c));
}

test('seed offsets hash coordinates instead of biasing its distribution',()=>{
 assert.match(renderer,/p\+=vec2\(seed\*\.1031,seed\*\.11369\)/);
 assert.doesNotMatch(renderer,/p3\.yzx\+33\.33\+seed/);
 const threshold=1-.68*.58;
 for(const seed of [0,1,71,100,500,1000,5000,9999]){
  const active=Array.from({length:96},(_,band)=>shaderHash(band,0,seed)).filter(value=>value>threshold).length;
  assert.ok(active>=20&&active<=55,'seed '+seed+' produced '+active+' active bands');
 }
});

test('rupture direction rotates every material family and exposes cross damage',()=>{
 assert.match(renderer,/uniform float directionAngle/);
 assert.match(renderer,/directionAngle\+maskRoutes\[6\]\.y/);
 assert.match(renderer,/tearAngle=directionAngle\+maskRoutes\[1\]\.y/);
 assert.match(renderer,/smearAngle=directionAngle\+maskRoutes\[3\]\.y/);
 assert.match(renderer,/feedbackAngle=directionAngle\+maskRoutes\[5\]\.y/);
 assert.match(renderer,/accentAngle=directionAngle\+maskRoutes\[7\]\.y/);
 assert.match(renderer,/displaced=uv\+displaceAlong\*offset.*\+displaceAcross\*crossOffset/);
 assert.match(renderer,/primarySmear.*secondarySmear/);
 assert.match(renderer,/primaryEcho.*secondaryEcho/);
 assert.match(renderer,/primaryGeneration.*secondaryGeneration/);
 assert.match(renderer,/previousFeedback,uv-feedbackAlong\*feedbackDrift/);
 assert.match(renderer,/signalNoise=noise\(vec2\(accentSpace\.y/);
});
