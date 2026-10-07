import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {presets,surfaceContract} from '../js/params.js';
const generated=await readFile(new URL('../native/generated/parameters.hpp',import.meta.url),'utf8');
const host=await readFile(new URL('../hosts/ofx/src/grid_rot_ofx.cpp',import.meta.url),'utf8');
const core=await readFile(new URL('../native/src/core_math.cuh',import.meta.url),'utf8');
const cuda=await readFile(new URL('../native/src/core_cuda.cu',import.meta.url),'utf8');
const rootCmake=await readFile(new URL('../../../CMakeLists.txt',import.meta.url),'utf8');
test('native contract contains every web preset and the explicit surface split',()=>{
 for(const preset of presets)assert.ok(generated.includes(`"${preset.name}"`),preset.name);
 for(const id of surfaceContract.ofx.params)assert.match(generated,new RegExp(`\\{"${id}"[^\\n]+ParameterSurface::Direct`));
 for(const id of surfaceContract.companion.params)assert.match(generated,new RegExp(`\\{"${id}"[^\\n]+ParameterSurface::Companion`));
});
test('OFX requests deterministic source history without rolling render state',()=>{
 assert.match(host,/kOfxImageEffectPropTemporalClipAccess,1/);assert.match(host,/kOfxImageEffectActionGetFramesNeeded/);assert.match(host,/requiredPastFrames/);assert.match(host,/time-requiredPastFrames/);
 assert.doesNotMatch(host,/feedbackFrame|previous_feedback/);assert.match(host,/std::max\(first,time-i\)/);
});
test('OFX boolean parameters only receive properties valid for boolean descriptors',()=>{
 const body=host.match(/static void range\([\s\S]+?static const char\*type/)[0];
 assert.match(body,/ParameterKind::Boolean\)\{integer\(p,kOfxParamPropDefault,int\(d\.initial\)\);return;\}/);
 assert.ok(body.indexOf('ParameterKind::Boolean')<body.indexOf('kOfxParamPropMin'));
});test('Resolve page exposes direct controls and stores Companion controls secretly',()=>{
 assert.match(host,/ParameterSurface::Companion\)\{integer\(v,kOfxParamPropSecret,1\)/);
 assert.match(host,/if\(d\.surface==ParameterSurface::Direct\)text\(page,kOfxParamPropPageChild/);
 assert.match(host,/\{"editCompanion","companionStatus","preset","mode","bypass","useCuda"\}/);
});
test('CPU and CUDA share temporal operators and bounded 32-frame history',()=>{
 for(const token of ['TemporalHold','TemporalDelay','TemporalStutter','TemporalReverse','TemporalSmear','history_count'])assert.ok(core.includes(token));
 assert.match(cuda,/r\.history_count>1/);assert.match(cuda,/frameBytes\*\(r\.history_count-1\)/);assert.match(rootCmake,/add_subdirectory\(plugins\/grid-rot\)/);
});