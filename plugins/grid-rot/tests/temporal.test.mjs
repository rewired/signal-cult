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
 assert.match(controller,/event\.data\.generation!==this\.generation/);assert.match(controller,/event\.data\.type==='frames'/);assert.match(controller,/spatial processing only/);
 assert.match(renderer,/loadHistoryFrames\(frames\)/);
});
