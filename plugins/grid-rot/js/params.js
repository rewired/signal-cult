export const fields = [
 {key:'density',label:'Grid multiplier',min:1,max:8,step:1,value:1,hint:'Multiply both axes of the source-based grid.'},
 {key:'spanX',label:'Area width',min:1,max:32,step:1,value:4,unit:'cells',hint:'Adjacent columns affected at once; wraps at the edge.'},
 {key:'spanY',label:'Area height',min:1,max:32,step:1,value:3,unit:'cells',hint:'Adjacent rows affected at once; limited to the grid height.'},
 {key:'rate',label:'Motion speed',min:0,max:30,step:0.1,value:8,unit:'cells/s',hint:'Step and random positions per second; LFO traverses one grid per cycle.'},
 {key:'shift',label:'Displacement',min:0,max:2,step:0.01,value:0.5,unit:'cells',hint:'Local horizontal and vertical image offsets.'},
 {key:'split',label:'Color separation',min:0,max:1,step:0.01,value:0.25,unit:'cells',hint:'Separate RGB channels inside the active area.'},
 {key:'crush',label:'Tone damage',min:0,max:1,step:0.01,value:0.35,hint:'Reduce color levels and darken individual cells.'},
 {key:'amount',label:'Amount',min:0,max:1,step:0.01,value:1,hint:'Blend the local damage with the current input.'}
];
export const defaults=Object.fromEntries(fields.map(f=>[f.key,f.value]));
export const modes=['step-right','step-left','random','lfo'];
export const presets=[
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
export function containsCell(x,y,area,grid){return wrap(x-area.x,grid.columns)<area.width&&wrap(y-area.y,grid.rows)<area.height;}
export function parsePreset(text){const p=JSON.parse(text);if(p?.format!=='grid-rot-preset'||p.version!==1)throw new Error('Expected a GRID ROT version 1 preset.');if(!modes.includes(p.mode))throw new Error('Invalid movement.');const params={};for(const f of fields){const n=p.params?.[f.key];if(typeof n!=='number'||!Number.isFinite(n)||n<f.min||n>f.max||(f.step===1&&!Number.isInteger(n)))throw new Error('Invalid parameter: '+f.label);params[f.key]=n;}return {format:p.format,version:1,name:typeof p.name==='string'&&p.name.trim()?p.name.trim().slice(0,80):'Untitled',mode:p.mode,params};}
export {nextPreset} from '../../signal-rot/js/params.js';
export function previewSize(width,height){const scale=Math.min(1,1920/width,1080/height);return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};}
