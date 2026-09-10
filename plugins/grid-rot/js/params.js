export const fields = [
 {key:'density',label:'Grid multiplier',min:1,max:8,step:1,value:1,hint:'Multiply both axes of the source-based grid.'},
 {key:'spanX',label:'Area width',min:1,max:32,step:1,value:4,unit:'cells',hint:'Adjacent columns affected at once; wraps at the edge.'},
 {key:'spanY',label:'Area height',min:1,max:32,step:1,value:3,unit:'cells',hint:'Adjacent rows affected at once; limited to the grid height.'},
 {key:'rate',label:'Motion speed',min:0,max:30,step:0.1,value:8,unit:'cells/s',hint:'Step and random positions per second; LFO traverses one grid per cycle.'},
 {key:'dropCount',label:'Drop count',min:1,max:16,step:1,value:6,hint:'Independent drops, each with its own position and timing.'},
 {key:'dropLife',label:'Drop lifetime',min:0.1,max:3,step:0.05,value:0.8,unit:'s',hint:'Typical lifetime before a drop disappears and reappears elsewhere.'},
 {key:'dropSpread',label:'Drop variation',min:0,max:1,step:0.01,value:0.75,hint:'Vary size, strength, lifetime and the gaps between drops.'},
 {key:'dropSeed',label:'Random seed',min:0,max:9999,step:1,value:7,hint:'Choose another reproducible arrangement of drops.'},
 {key:'clusterAmount',label:'Cluster strength',min:0,max:1,step:0.01,value:0,hint:'Share of drops grouped around common centers. Zero keeps free scattering.'},
 {key:'clusterCount',label:'Cluster centers',min:1,max:6,step:1,value:2,hint:'Number of shared random centers. Centers renew after four drop lifetimes.'},
 {key:'clusterRadius',label:'Cluster radius',min:0,max:16,step:1,value:3,unit:'cells',hint:'Maximum distance of drop origins from their center. Smaller values create tight clusters.'},
 {key:'fractureDepth',label:'Fracture depth',min:0,max:3,step:1,value:0,hint:'Split affected cells into 2 × 2, 4 × 4 or 8 × 8 subcells. Zero disables fracture.'},
 {key:'fractureAmount',label:'Fracture spread',min:0,max:1,step:0.01,value:0.65,hint:'Chance of each further split. Lower values mix coarse and fine cells.'},
 {key:'shift',label:'Displacement',min:0,max:2,step:0.01,value:0.5,unit:'cells',hint:'Local horizontal and vertical image offsets.'},
 {key:'split',label:'Color separation',min:0,max:1,step:0.01,value:0.25,unit:'cells',hint:'Separate RGB channels inside the active area.'},
 {key:'crush',label:'Tone damage',min:0,max:1,step:0.01,value:0.35,hint:'Reduce color levels and darken individual cells.'},
 {key:'amount',label:'Amount',min:0,max:1,step:0.01,value:1,hint:'Blend the local damage with the current input.'}
];
export const defaults=Object.fromEntries(fields.map(f=>[f.key,f.value]));
export const modes=['step-right','step-left','random','lfo','drops'];
export const presets=[
 {"id":"pin-pricks","name":"Pin Pricks","description":"Sparse, tiny defects with long quiet gaps and subtle color damage.","mode":"drops","params":{...defaults,"density":4,"spanX":1,"spanY":2,"dropCount":3,"dropLife":0.25,"dropSpread":1,"shift":0.2,"split":0.15,"crush":0.3,"amount":0.65}},
 {"id":"digital-dust","name":"Digital Dust","description":"Fine, short-lived fragments scattered across the image.","mode":"drops","params":{...defaults,"density":4,"spanX":3,"spanY":3,"dropCount":16,"dropLife":0.15,"dropSpread":0.8,"fractureDepth":2,"fractureAmount":0.9,"shift":0.7,"split":0.6,"crush":0.65}},
 {"id":"packet-loss","name":"Packet Loss","description":"Coarse blocks fail in uneven bursts around three loose centers.","mode":"drops","params":{...defaults,"density":1,"spanX":3,"spanY":2,"dropCount":10,"dropLife":0.4,"dropSpread":0.85,"clusterAmount":0.7,"clusterCount":3,"clusterRadius":3,"shift":1.4,"split":0.1,"crush":0.9}},
 {"id":"swarm","name":"Swarm","description":"A tight island of restless fragments changes location slowly.","mode":"drops","params":{...defaults,"density":3,"spanX":3,"spanY":3,"dropCount":16,"dropLife":0.65,"dropSpread":0.7,"clusterAmount":1,"clusterCount":1,"clusterRadius":2,"fractureDepth":2,"fractureAmount":0.75,"shift":1.1,"split":0.6,"crush":0.45}},
 {"id":"chromatic-islands","name":"Chromatic Islands","description":"Three broad clusters pull colors apart with gentle tonal damage.","mode":"drops","params":{...defaults,"density":2,"spanX":5,"spanY":4,"dropCount":15,"dropLife":1.6,"dropSpread":0.5,"clusterAmount":1,"clusterCount":3,"clusterRadius":2,"fractureDepth":1,"fractureAmount":0.35,"shift":0.15,"split":1,"crush":0.08}},
 {"id":"glass-rain","name":"Glass Rain","description":"Tall, narrow shards flicker in a loose vertical rain.","mode":"drops","params":{...defaults,"density":3,"spanX":1,"spanY":12,"dropCount":12,"dropLife":0.3,"dropSpread":0.7,"fractureDepth":2,"fractureAmount":0.6,"shift":1.8,"split":0.55,"crush":0.25}},
 {"id":"scan-rip","name":"Scan Rip","description":"A thin strip tears backward through the image at a steady pace.","mode":"step-left","params":{...defaults,"density":1,"spanX":32,"spanY":1,"rate":22,"fractureDepth":1,"fractureAmount":0.45,"shift":0.9,"split":0.7,"crush":0.3}},
 {"id":"slow-collapse","name":"Slow Collapse","description":"Large, persistent islands break into mixed resolutions and heavy damage.","mode":"drops","params":{...defaults,"density":1,"spanX":8,"spanY":6,"dropCount":8,"dropLife":2.5,"dropSpread":0.55,"clusterAmount":0.85,"clusterCount":2,"clusterRadius":3,"fractureDepth":3,"fractureAmount":0.6,"shift":1.6,"split":0.8,"crush":0.85}},
 {id:'cluster-bloom',name:'Cluster Bloom',description:'Drops gather into changing islands of coarse and fractured cells.',mode:'drops',params:{...defaults,density:2,spanX:4,spanY:3,dropCount:14,clusterAmount:0.9,clusterCount:2,clusterRadius:3,fractureDepth:2,fractureAmount:0.6,shift:0.9,split:0.4}},
 {id:'shattered-drops',name:'Shattered Drops',description:'Random patches break into a mix of coarse cells and fine fragments.',mode:'drops',params:{...defaults,density:2,spanX:5,spanY:4,fractureDepth:3,fractureAmount:0.7,shift:1.2,split:0.5}},
 {id:'random-drops',name:'Random Drops',description:'Independent patches flicker in and out, with varied size and strength.',mode:'drops',params:{...defaults,density:2,spanX:5,spanY:4,shift:0.8,split:0.4}},
 {id:'grid-crawl',name:'Grid Crawl',description:'A moving patch fractures the live image, cell by cell.',mode:'step-right',params:{...defaults}},
 {id:'scatter',name:'Scatter',description:'Small, sharp disturbances jump across the current frame.',mode:'random',params:{...defaults,density:2,spanX:3,spanY:2,rate:12,shift:1,split:0.5}},
 {id:'wide-wave',name:'Wide Wave',description:'A broad area oscillates across the image.',mode:'lfo',params:{...defaults,spanX:12,spanY:2,rate:20,shift:0.25,split:0.5,crush:0.15}}
];
export function baseGrid(width,height){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new Error('Invalid source dimensions.');
 const ratio=width/height;let best={columns:1,rows:1},error=Infinity;
 // Search only small bases. Prefer fewer cells when aspect errors tie.
 for(let rows=1;rows<=24;rows++)for(let columns=1;columns<=24;columns++){
  const e=Math.abs(Math.log(columns/rows/ratio));
  if(e<error-1e-10){error=e;best={columns,rows};}
 }
 return {...best,approximate:error>1e-6};
}
export function gridFor(width,height,density){const base=baseGrid(width,height);const multiplier=Math.max(1,Math.min(8,Math.round(density)));return {...base,baseColumns:base.columns,baseRows:base.rows,columns:base.columns*multiplier,rows:base.rows*multiplier};}
const wrap=(n,count)=>((n%count)+count)%count;
export function random01(seed){let n=(seed+1)|0;n=Math.imul(n^(n>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return ((n^(n>>>16))>>>0)/4294967296;}
export function activeArea(grid,params,mode,time,offset=0){
 const count=grid.columns*grid.rows,phase=Math.max(0,time)*params.rate+offset;let index;
 if(mode==='random')index=Math.floor(random01(Math.floor(phase))*count);
 else if(mode==='lfo')index=Math.round((Math.sin(phase/count*Math.PI*2-Math.PI/2)+1)*0.5*(count-1));
 else index=wrap(Math.floor(phase)*(mode==='step-left'?-1:1),count);
 return {x:index%grid.columns,y:Math.floor(index/grid.columns),width:Math.min(params.spanX,grid.columns),height:Math.min(params.spanY,grid.rows),tick:Math.floor(phase)};
}
// Each lane has its own period and phase. A fixed cycle gives reproducible seeks
// without keeping history; per-cycle randomness varies its visible lifetime.
export function clusterCenter(grid,seed,group,epoch){
 const key=seed*313+group*3571+epoch*104729;
 return {x:Math.floor(random01(key+51)*grid.columns),y:Math.floor(random01(key+52)*grid.rows)};
}
export function activeAreas(grid,params,mode,time,offset=0){
 if(mode!=='drops')return [{...activeArea(grid,params,mode,time,offset),strength:1}];
 const count=params.dropCount??defaults.dropCount,life=params.dropLife??defaults.dropLife;
 const spread=params.dropSpread??defaults.dropSpread,seed=params.dropSeed??defaults.dropSeed;
 const clock=Math.max(0,time+offset/8),areas=[];
 for(let i=0;i<count;i++){
  const lane=seed*131+i*977,period=life*(1+spread*(random01(lane)-.5));
  const phase=clock/period+random01(lane+1),cycle=Math.floor(phase),age=phase-cycle;
  const key=lane+cycle*7919,visible=1-spread*(.1+random01(key+2)*.3);
  if(age>=visible)continue;
  const scale=n=>1-spread*random01(key+n)*.8;
  let x=Math.floor(random01(key+3)*grid.columns),y=Math.floor(random01(key+4)*grid.rows);
  if(random01(key+20)<(params.clusterAmount??0)){
   // Sample the center at this drop's birth so it never jumps during its life.
   const birth=(cycle-random01(lane+1))*period;
   const epoch=Math.floor(birth/(life*4)),group=i%(params.clusterCount??2);
   const center=clusterCenter(grid,seed,group,epoch);
   const angle=random01(key+21)*Math.PI*2,radius=Math.sqrt(random01(key+22))*(params.clusterRadius??3);
   x=wrap(center.x+Math.round(Math.cos(angle)*radius),grid.columns);
   y=wrap(center.y+Math.round(Math.sin(angle)*radius),grid.rows);
  }
  areas.push({x,y,
   width:Math.min(grid.columns,Math.max(1,Math.round(params.spanX*scale(5)))),
   height:Math.min(grid.rows,Math.max(1,Math.round(params.spanY*scale(6)))),
   strength:1-spread*random01(key+7)*.7,tick:key});
 }
 return areas;
}
// Small integer hash is identical in JavaScript and GLSL, including on mobile GPUs.
export function fractureScale(x,y,params,tick){
 let scale=1;
 for(let level=1;level<=(params.fractureDepth??0);level++){
  const seed=wrap(Math.floor(tick)%65536,997);
  const n=wrap(x*73+y*151+seed*199+level*37,997);
  const chance=((n*n+31*n+17)%997)/997;
  if(chance>=(params.fractureAmount??0.65))break;
  scale*=2;
 }
 return scale;
}
export function containsCell(x,y,area,grid){return wrap(x-area.x,grid.columns)<area.width&&wrap(y-area.y,grid.rows)<area.height;}
export function parsePreset(text){const p=JSON.parse(text);if(p?.format!=='grid-rot-preset'||p.version!==1)throw new Error('Expected a GRID ROT version 1 preset.');if(!modes.includes(p.mode))throw new Error('Invalid movement.');const params={};for(const f of fields){const n=p.params?.[f.key]===undefined&&(f.key.startsWith('drop')||f.key.startsWith('fracture')||f.key.startsWith('cluster'))?defaults[f.key]:p.params?.[f.key];if(typeof n!=='number'||!Number.isFinite(n)||n<f.min||n>f.max||(f.step===1&&!Number.isInteger(n)))throw new Error('Invalid parameter: '+f.label);params[f.key]=n;}return {format:p.format,version:1,name:typeof p.name==='string'&&p.name.trim()?p.name.trim().slice(0,80):'Untitled',mode:p.mode,params};}
export {nextPreset} from '../../signal-rot/js/params.js';
export function previewSize(width,height){const scale=Math.min(1,1920/width,1080/height);return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};}
