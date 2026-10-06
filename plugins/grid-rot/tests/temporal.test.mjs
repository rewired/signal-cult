import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
test('temporal renderer owns a bounded 32 frame texture array',()=>{
 const source=readFileSync(root+'/js/renderer.js','utf8');assert.match(source,/texImage3D\([^\n]+,32,/);assert.match(source,/Math\.min\(32,this\.historyCount\+1\)/);assert.match(source,/sampler2DArray history/);
});
test('MP4 probe is generation guarded and has a spatial fallback',()=>{
 const worker=readFileSync(root+'/js/temporal-worker.js','utf8'),controller=readFileSync(root+'/js/temporal.js','utf8'),renderer=readFileSync(root+'/js/renderer.js','utf8');
 assert.match(worker,/VideoDecoder\.isConfigSupported/);assert.match(worker,/setExtractionOptions/);assert.match(worker,/new EncodedVideoChunk/);
 assert.match(controller,/event\.data\.generation!==this\.generation/);assert.match(controller,/cancelPending\(\)/);assert.match(controller,/event\.data\.type==='frames'/);assert.match(controller,/spatial processing only/);
 assert.match(renderer,/loadHistoryFrames\(frames\)/);
});
test('video loops preserve rolling history while manual seeks use decoder preroll',()=>{
 const app=readFileSync(root+'/js/app.js','utf8'),worker=readFileSync(root+'/js/temporal-worker.js','utf8');
 assert.match(app,/on\(source,'ended'/);assert.match(app,/function restartVideoLoop/);assert.match(app,/setInterval/);assert.match(app,/clearInterval\(videoWatchdog\)/);assert.match(app,/video\.currentTime=0/);assert.match(app,/if\(resume\)\{temporalPending=false;needsFrame=true;\}else requestTemporalSeek/);assert.match(app,/function temporalPreroll\(\)/);assert.match(app,/temporalSeekTimer=setTimeout/);assert.match(app,/resetHistory\(\)/);
 assert.match(worker,/const end=time\*1e6,start=Math\.max/);assert.match(worker,/chunk\.timestamp>end&&chunk\.type==='key'/);assert.match(worker,/frames\.length>32/);
});
test('temporal operators use separate controls without global frame replacement',()=>{
 const renderer=readFileSync(root+'/js/renderer.js','utf8');
 assert.doesNotMatch(renderer,/fresh=mix\(fresh,texture\(history/);assert.match(renderer,/temporalModes\.x/);assert.match(renderer,/temporalModes\.y/);assert.match(renderer,/temporalModes\.z/);assert.match(renderer,/temporalModes\.w/);assert.match(renderer,/temporalSmear/);
 assert.match(renderer,/historyRate/);assert.match(renderer,/temporalSample=.*temporalSample\+texture/);
});