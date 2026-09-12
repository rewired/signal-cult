import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const web=await readFile(new URL('../js/renderer.js',import.meta.url),'utf8');
const native=await readFile(new URL('../native/src/core_math.cuh',import.meta.url),'utf8');
const host=await readFile(new URL('../hosts/ofx/src/raster_rupture_ofx.cpp',import.meta.url),'utf8');

test('native renderer preserves the two-stage WebGL framegraph',()=>{
 assert.match(native,/surfacePixel/);
 assert.match(native,/effectPixel/);
 assert.match(native,/i<20/);
 assert.match(native,/i<=7/);
 assert.match(web,/materialFramebuffer/);
 assert.match(web,/previousFeedback/);
});

test('native feedback reads the previously rendered effect rather than only previous source',()=>{
 assert.match(native,/previous_feedback/);
 assert.match(host,/feedbackFrame-\(time-1\)/);
 assert.match(host,/request\.previous_feedback=/);
 assert.match(host,/kOfxImageEffectRenderInstanceSafe/);
});

test('GLSL hash constants and all directional route families remain mirrored',()=>{
 for(const token of ['.1031','33.33','2.03','1.91','maskRoutes[1]','maskRoutes[8]'])assert.ok(web.includes(token));
 for(const token of ['.1031f','33.33f','2.03f','1.91f','routes[1]','routes[8]'])assert.ok(native.includes(token));
});

test('native factory contract carries style, combine, colors and nine XY routes',async()=>{
 const generated=await readFile(new URL('../native/generated/parameters.hpp',import.meta.url),'utf8');
 assert.match(generated,/int style,combine/);
 assert.match(generated,/std::array<std::array<float,2>,9>/);
 assert.equal((generated.match(/\{"/g)||[]).length>=36,true);
});
