import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const app=await readFile(new URL('../js/app.js',import.meta.url),'utf8');
const renderer=await readFile(new URL('../js/renderer.js',import.meta.url),'utf8');
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');

test('MP4 is an explicit animated mask input',()=>{
 assert.match(html,/accept="[^"]*video\/mp4[^"]*\.mp4/);
 assert.match(app,/file\.type==='video\/mp4'/);
 assert.match(renderer,/setMaskFrame\(source\)/);
});

test('source video remains the master transport for a video mask',()=>{
 assert.match(app,/maskTime\(masterVideo\?source\.currentTime:sourceTime\)/);
 assert.match(app,/Math\.abs\(maskVideo\.currentTime-target\)>\.12/);
 assert.match(app,/source\.currentTime=Number\(\$\('seek'\)\.value\);void syncMaskTransport\(true\)/);
 assert.match(app,/shouldPlay=playing&&\(!masterVideo\|\|!source\.paused\)/);
});

test('source-to-mask is a persistent live link using the exact rendered source frame',()=>{
 assert.match(html,/id="source-mask"[^>]*>Source → mask/);
 assert.match(app,/function sourceMaskMode\(active\)/);
 assert.match(app,/if\(maskFromSource\)renderer\.setMaskFrame\(source\)/);
 assert.match(app,/if\(maskFromSource\)uploadSourceMask\(\);needsFrame=true/);
 assert.match(app,/on\(\$\('source-mask'\),'click'/);
});
