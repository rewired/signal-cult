import {test} from 'node:test';import assert from 'node:assert/strict';import {baseGrid,gridFor,activeArea,activeAreas,containsCell,defaults,parsePreset,presets} from '../js/params.js';
test('source ratios and independent integer density',()=>{for(const [w,h,c,r] of [[1920,1080,16,9],[1080,1920,9,16],[1440,1080,4,3],[1000,1000,1,1]]){const g=gridFor(w,h,3);assert.equal(g.columns,c*3);assert.equal(g.rows,r*3);}const b=baseGrid(2048,1080);assert.ok(b.columns<=24&&b.rows<=24);assert.ok(Math.abs(b.columns/b.rows-2048/1080)<.02);assert.throws(()=>baseGrid(0,10));});
test('footprint wraps without altering grid density',()=>{const g=gridFor(1920,1080,1);const a=activeArea(g,{...defaults,spanX:4,spanY:3},'step-left',1/8);assert.equal(a.x,15);assert.equal(a.y,8);assert.ok(containsCell(0,0,a,g));assert.ok(!containsCell(4,0,a,g));assert.equal(activeArea(g,{...defaults,spanX:32},'step-right',0).width,16);});
test('motion is bounded and reproducible',()=>{const g=gridFor(1080,1920,2);for(const mode of ['step-right','step-left','random','lfo'])for(const t of [0,.3,12,1000]){const a=activeArea(g,defaults,mode,t);assert.deepEqual(a,activeArea(g,defaults,mode,t));assert.ok(a.x>=0&&a.x<g.columns&&a.y>=0&&a.y<g.rows);}assert.equal(activeArea(g,defaults,'step-right',0,1).x,1);});
test('preset isolation and strict integer controls',()=>{for(const p of presets){const data={...p,format:'grid-rot-preset',version:1};assert.deepEqual(parsePreset(JSON.stringify(data)).params,p.params);}const p={format:'grid-rot-preset',version:1,mode:'random',params:{...defaults,density:1.5}};assert.throws(()=>parsePreset(JSON.stringify(p)));p.params={...defaults};p.format='bucket-rot-preset';assert.throws(()=>parsePreset(JSON.stringify(p)));});

test('independent drops remain bounded, varied and deterministic across seeks',()=>{
 const grid=gridFor(1920,1080,2),p={...defaults,spanX:8,spanY:6,dropCount:16};
 const a=activeAreas(grid,p,'drops',1.25);assert.deepEqual(a,activeAreas(grid,p,'drops',1.25));
 assert.ok(a.length>1&&a.length<=16);assert.ok(new Set(a.map(d=>d.width+','+d.height)).size>1);assert.ok(new Set(a.map(d=>d.strength)).size>1);
 for(const d of a){assert.ok(d.x>=0&&d.x<grid.columns&&d.y>=0&&d.y<grid.rows);assert.ok(Number.isInteger(d.width)&&d.width>=1&&d.width<=8);assert.ok(d.strength>0&&d.strength<=1);}
 assert.notDeepEqual(a,activeAreas(grid,{...p,dropSeed:8},'drops',1.25));
 const later=activeAreas(grid,p,'drops',1.26);assert.ok(a.some(d=>later.some(e=>e.tick===d.tick)));assert.notDeepEqual(a,activeAreas(grid,p,'drops',4));
 assert.deepEqual(activeAreas(grid,p,'drops',12,-96),activeAreas(grid,p,'drops',0));
 const uniform=activeAreas(grid,{...p,dropSpread:0},'drops',1);assert.equal(uniform.length,16);assert.ok(uniform.every(d=>d.width===8&&d.height===6&&d.strength===1));
});
test('legacy presets gain drop defaults and reject invalid new fields',()=>{
 const params={...defaults};for(const key of Object.keys(params))if(key.startsWith('drop'))delete params[key];
 const data={format:'grid-rot-preset',version:1,mode:'step-right',params};assert.deepEqual(parsePreset(JSON.stringify(data)).params,defaults);
 for(const value of [null,0,17,1.5])assert.throws(()=>parsePreset(JSON.stringify({...data,params:{...params,dropCount:value}})));
});
