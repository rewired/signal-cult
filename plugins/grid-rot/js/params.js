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
export const temporalDefaults={enabled:false,range:12,hold:0,delay:0,stutter:0,reverse:0,smear:0};
export const infectionDefaults={amount:0,radius:0,speed:4,decay:.5,mutation:0,direction:'all'};
export const topologyDefaults={type:'rect',jitter:0,skew:0,warpAmount:0,warpSpeed:0};
export const targetingDefaults={uniform:1,bright:0,dark:0,edges:0,motion:0,bias:0};
export const operatorDefinitions=[
 {id:'offset',label:'Offset',settings:{distance:1,angle:0}},{id:'mirror',label:'Mirror',settings:{axis:0}},
 {id:'rotate',label:'Rotate',settings:{turns:1}},{id:'zoom',label:'Zoom',settings:{scale:1.25}},
 {id:'neighbor',label:'Neighbor cell',settings:{radius:1}},{id:'channel',label:'Channel permute',settings:{permutation:1}},
 {id:'blackout',label:'Blackout',settings:{level:0}},{id:'noise',label:'Noise',settings:{scale:8}},
 {id:'hold',label:'Hold',settings:{}},{id:'delay',label:'Delay',settings:{frames:8}},{id:'stutter',label:'Stutter',settings:{frames:3}},
 {id:'reverse',label:'Reverse',settings:{frames:12}},{id:'smear',label:'Time smear',settings:{frames:12}}
];
export const operatorDefaults=Object.fromEntries(operatorDefinitions.map(d=>[d.id,{enabled:false,weight:0,strength:1,settings:{...d.settings}}]));
export function defaultExtensions(){return {temporal:{...temporalDefaults},infection:{...infectionDefaults},topology:{...topologyDefaults},targeting:{...targetingDefaults},operators:Object.fromEntries(Object.entries(operatorDefaults).map(([id,o])=>[id,{...o,settings:{...o.settings}}]))};}
export const presets=[
 {"id":"pin-pricks","name":"Pin Pricks","description":"Small, distinct punctures with sharp color edges and irregular flicker.","mode":"drops","params":{...defaults,"density":2,"spanX":1,"spanY":2,"dropCount":8,"dropLife":0.5,"dropSpread":0.45,"shift":1.1,"split":0.8,"crush":0.75,"amount":1}},
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
const number=(value,min,max,label)=>{if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new Error('Invalid parameter: '+label);return value;};
const enumValue=(value,values,label)=>{if(!values.includes(value))throw new Error('Invalid '+label+'.');return value;};
export function parsePreset(text){
 const p=JSON.parse(text);if(p?.format!=='grid-rot-preset'||![1,2].includes(p.version))throw new Error('Expected a GRID ROT version 1 or 2 preset.');if(!modes.includes(p.mode))throw new Error('Invalid movement.');
 const params={};for(const f of fields){const n=p.params?.[f.key]===undefined?defaults[f.key]:p.params[f.key];if(typeof n!=='number'||!Number.isFinite(n)||n<f.min||n>f.max||(f.step===1&&!Number.isInteger(n)))throw new Error('Invalid parameter: '+f.label);params[f.key]=n;}
 const ext=defaultExtensions();
 if(p.version===2){
  Object.assign(ext.temporal,p.temporal);ext.temporal.enabled=Boolean(ext.temporal.enabled);number(ext.temporal.range,1,32,'temporal range');for(const k of ['hold','delay','stutter','reverse','smear'])number(ext.temporal[k],0,1,'temporal '+k);
  Object.assign(ext.infection,p.infection);number(ext.infection.amount,0,1,'infection amount');number(ext.infection.radius,0,32,'infection radius');number(ext.infection.speed,0,60,'infection speed');number(ext.infection.decay,0,10,'infection decay');number(ext.infection.mutation,0,1,'infection mutation');enumValue(ext.infection.direction,['all','horizontal','vertical','route'],'infection direction');
  Object.assign(ext.topology,p.topology);enumValue(ext.topology.type,['rect','shards','voronoi'],'topology');number(ext.topology.jitter,0,1,'topology jitter');number(ext.topology.skew,-1,1,'topology skew');number(ext.topology.warpAmount,0,2,'warp amount');number(ext.topology.warpSpeed,0,10,'warp speed');
  Object.assign(ext.targeting,p.targeting);for(const k of ['uniform','bright','dark','edges','motion','bias'])number(ext.targeting[k],0,1,'targeting '+k);
  for(const d of operatorDefinitions){const input=p.operators?.[d.id];if(!input)continue;const target=ext.operators[d.id];target.enabled=Boolean(input.enabled);target.weight=number(input.weight,0,100,d.id+' weight');target.strength=number(input.strength,0,2,d.id+' strength');if(input.settings&&typeof input.settings==='object')Object.assign(target.settings,input.settings);}
 }
 return {format:p.format,version:2,name:typeof p.name==='string'&&p.name.trim()?p.name.trim().slice(0,80):'Untitled',mode:p.mode,params,...ext};
}
export {nextPreset} from '../../signal-rot/js/params.js';
export function previewSize(width,height){const scale=Math.min(1,1920/width,1080/height);return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};}
const featurePreset=(id,name,description,params,configure)=>{const extension=defaultExtensions();configure(extension);return {id,name,description,mode:'drops',params:{...defaults,...params},...extension};};
presets.push(
 featurePreset('frozen-infection','Frozen Infection','Frozen cells spread through a decaying local infection.',{density:2,dropCount:10,dropLife:1.8,fractureDepth:2},e=>{Object.assign(e.temporal,{enabled:true,range:24,hold:1});Object.assign(e.infection,{amount:.9,radius:7,speed:4,decay:1.2,mutation:.7});Object.assign(e.operators.hold,{enabled:true,weight:100});}),
 featurePreset('time-mosaic','Time Mosaic','A mosaic of neighboring moments selected per fractured cell.',{density:3,dropCount:16,fractureDepth:2,split:.2},e=>{Object.assign(e.temporal,{enabled:true,range:32,smear:1});Object.assign(e.operators.smear,{enabled:true,weight:100});e.operators.smear.settings.frames=32;}),
 featurePreset('memory-collapse','Memory Collapse','Large temporal blocks collapse backward through local history.',{density:1,spanX:8,spanY:6,dropLife:2.4,crush:.6},e=>{Object.assign(e.temporal,{enabled:true,range:28,reverse:.9});Object.assign(e.operators.reverse,{enabled:true,weight:70});Object.assign(e.operators.blackout,{enabled:true,weight:30,strength:.6});Object.assign(e.infection,{amount:.6,radius:5,speed:2,decay:2});}),
 featurePreset('cellular-burn','Cellular Burn','A mutating wave burns outward across neighboring cells.',{density:2,dropCount:6,fractureDepth:3,crush:.85},e=>{Object.assign(e.infection,{amount:1,radius:12,speed:6,decay:1,mutation:1,direction:'all'});Object.assign(e.operators.noise,{enabled:true,weight:60});Object.assign(e.operators.blackout,{enabled:true,weight:40});}),
 featurePreset('operator-storm','Operator Storm','Every damaged cell draws from a broad spatial operator bank.',{density:3,dropCount:16,fractureDepth:2},e=>{for(const id of ['offset','mirror','rotate','zoom','neighbor','channel','noise'])Object.assign(e.operators[id],{enabled:true,weight:20});}),
 featurePreset('shard-current','Shard Current','Diagonal shards drift through a warped directional current.',{density:2,dropCount:12,spanX:5,spanY:5},e=>{Object.assign(e.topology,{type:'shards',jitter:.35,skew:.35,warpAmount:.45,warpSpeed:.4});Object.assign(e.operators.offset,{enabled:true,weight:70});Object.assign(e.operators.rotate,{enabled:true,weight:30});}),
 featurePreset('voronoi-decay','Voronoi Decay','Irregular cells infect and decay across a moving Voronoi lattice.',{density:2,dropCount:10,dropLife:1.6,crush:.5},e=>{Object.assign(e.topology,{type:'voronoi',jitter:.85,warpAmount:.2,warpSpeed:.2});Object.assign(e.infection,{amount:.8,radius:8,speed:3,decay:1.5,mutation:.5});Object.assign(e.operators.zoom,{enabled:true,weight:50});Object.assign(e.operators.delay,{enabled:true,weight:50});}),
 featurePreset('edge-parasite','Edge Parasite','Damage clings to high-contrast edges and spreads outward.',{density:4,dropCount:16,spanX:4,spanY:3},e=>{Object.assign(e.targeting,{uniform:0,edges:1,bias:1});Object.assign(e.infection,{amount:.7,radius:4,speed:5,decay:.7});Object.assign(e.operators.channel,{enabled:true,weight:50});Object.assign(e.operators.offset,{enabled:true,weight:50});}),
 featurePreset('motion-eater','Motion Eater','Moving image regions are consumed by delayed and blacked-out cells.',{density:3,dropCount:16,dropLife:.7,crush:.4},e=>{Object.assign(e.targeting,{uniform:0,motion:1,bias:1});Object.assign(e.temporal,{enabled:true,range:16,delay:.8});Object.assign(e.operators.delay,{enabled:true,weight:70});Object.assign(e.operators.blackout,{enabled:true,weight:30});}),
 featurePreset('zash-impact','ZASH // IMPACT','A short, violent full-spectrum hit: shards, infection and hard routing collide.',{density:2,spanX:8,spanY:6,dropCount:16,dropLife:.18,dropSpread:.95,fractureDepth:3,fractureAmount:1,shift:2,split:1,crush:.9},e=>{Object.assign(e.topology,{type:'shards',jitter:.7,skew:.55,warpAmount:1.2,warpSpeed:4});Object.assign(e.infection,{amount:1,radius:10,speed:35,decay:.25,mutation:1});Object.assign(e.operators.offset,{enabled:true,weight:35,strength:2});Object.assign(e.operators.rotate,{enabled:true,weight:25,strength:2});Object.assign(e.operators.channel,{enabled:true,weight:25,strength:2});Object.assign(e.operators.blackout,{enabled:true,weight:15,strength:1.5});e.operators.offset.settings.distance=2;e.operators.offset.settings.angle=.4;}),
 featurePreset('zash-chroma-knife','ZASH // CHROMA KNIFE','Razor-thin chromatic shards slice through edges with mirrored displacement.',{density:5,spanX:2,spanY:14,dropCount:16,dropLife:.28,dropSpread:.8,fractureDepth:2,fractureAmount:.9,shift:1.8,split:1,crush:.25},e=>{Object.assign(e.topology,{type:'shards',jitter:.45,skew:-.7,warpAmount:.55,warpSpeed:2.5});Object.assign(e.targeting,{uniform:.15,edges:1,bias:.8});Object.assign(e.infection,{amount:.75,radius:5,speed:18,decay:.35,mutation:.8,direction:'vertical'});Object.assign(e.operators.channel,{enabled:true,weight:45,strength:2});Object.assign(e.operators.mirror,{enabled:true,weight:30,strength:1.5});Object.assign(e.operators.offset,{enabled:true,weight:25,strength:2});e.operators.mirror.settings.axis=2;}),
 featurePreset('zash-time-slap','ZASH // TIME SLAP','A hard temporal kick alternates stutter, reverse and delayed cells.',{density:3,spanX:6,spanY:5,dropCount:16,dropLife:.36,dropSpread:.9,fractureDepth:3,fractureAmount:.85,shift:1.2,split:.65,crush:.65},e=>{Object.assign(e.temporal,{enabled:true,range:32,delay:1,stutter:1,reverse:1,smear:.75});Object.assign(e.infection,{amount:1,radius:9,speed:24,decay:.3,mutation:1,direction:'route'});Object.assign(e.operators.stutter,{enabled:true,weight:35,strength:2});Object.assign(e.operators.reverse,{enabled:true,weight:30,strength:2});Object.assign(e.operators.delay,{enabled:true,weight:25,strength:1.8});Object.assign(e.operators.smear,{enabled:true,weight:10,strength:1.5});e.operators.stutter.settings.frames=2;e.operators.reverse.settings.frames=24;e.operators.delay.settings.frames=16;e.operators.smear.settings.frames=32;}),
 featurePreset('zash-void-punch','ZASH // VOID PUNCH','Motion-sensitive Voronoi cells punch black holes through noisy zoom bursts.',{density:3,spanX:7,spanY:6,dropCount:14,dropLife:.5,dropSpread:1,clusterAmount:.7,clusterCount:2,clusterRadius:2,fractureDepth:2,fractureAmount:.8,shift:1.5,split:.2,crush:1},e=>{Object.assign(e.topology,{type:'voronoi',jitter:1,skew:.25,warpAmount:.8,warpSpeed:3});Object.assign(e.targeting,{uniform:.1,dark:.45,motion:1,bias:.9});Object.assign(e.infection,{amount:1,radius:7,speed:16,decay:.45,mutation:1});Object.assign(e.operators.blackout,{enabled:true,weight:45,strength:2});Object.assign(e.operators.noise,{enabled:true,weight:35,strength:2});Object.assign(e.operators.zoom,{enabled:true,weight:20,strength:2});e.operators.noise.settings.scale=24;e.operators.zoom.settings.scale=2.4;}),
 featurePreset('zash-cascade','ZASH // CASCADE','A vertical avalanche of held neighbors and stuttering warped rows.',{density:4,spanX:10,spanY:2,dropCount:16,dropLife:.22,dropSpread:.85,fractureDepth:2,fractureAmount:.95,shift:2,split:.8,crush:.75},e=>{Object.assign(e.temporal,{enabled:true,range:20,hold:.7,stutter:1});Object.assign(e.topology,{type:'rect',jitter:.8,skew:.35,warpAmount:1,warpSpeed:6});Object.assign(e.infection,{amount:1,radius:12,speed:28,decay:.2,mutation:.9,direction:'vertical'});Object.assign(e.operators.neighbor,{enabled:true,weight:35,strength:2});Object.assign(e.operators.stutter,{enabled:true,weight:30,strength:2});Object.assign(e.operators.hold,{enabled:true,weight:20,strength:1.8});Object.assign(e.operators.offset,{enabled:true,weight:15,strength:2});e.operators.neighbor.settings.radius=3;e.operators.stutter.settings.frames=2;})
);
