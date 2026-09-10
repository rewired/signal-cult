export const fields = [
  {key:'amount', label:'Amount', min:0, max:1, step:0.01, value:0.85, hint:'Blend the damaged signal with the original.'},
  {key:'memory', label:'Memory', min:0.05, max:3, step:0.05, value:0.8, unit:'s', hint:'How long old image details survive.'},
  {key:'flow', label:'Flow strength', min:0, max:3, step:0.05, value:1.4, hint:'How far motion drags the stored image.'},
  {key:'block', label:'Block size', min:4, max:96, step:1, value:24, unit:'px', hint:'Size of motion tiles in Block Rot.'},
  {key:'sensitivity', label:'Motion sensitivity', min:0, max:1, step:0.01, value:0.65, hint:'Higher values react to smaller movements.'},
  {key:'edges', label:'Edge protection', min:0, max:1, step:0.01, value:0.15, hint:'Bring fresh source contours back into the image.'},
];
export const defaults = Object.fromEntries(fields.map(f=>[f.key,f.value]));
export const presets = [
  {id:'motion-melt',name:'Motion Melt',description:'Movement pulls old colors into soft, liquid trails.',mode:'melt',params:{...defaults}},
  {id:'block-rot',name:'Block Rot',description:'Coarse motion tiles drag and fracture the previous signal.',mode:'block',params:{...defaults,memory:1.2,flow:2,block:40,edges:0.05}},
  {id:'contour-ghost',name:'Contour Ghost',description:'Color washes away, leaving bright traces of moving contours.',mode:'ghost',params:{...defaults,amount:0.9,memory:1,flow:0.6,edges:0.1}},
];
export function parsePreset(text) {
  const data=JSON.parse(text);
  if(data?.format!=='signal-rot-preset'||data.version!==1)throw new Error('Expected a SIGNAL ROT version 1 preset.');
  if(!['melt','block','ghost'].includes(data.mode))throw new Error('Invalid effect mode.');
  const params={};
  for(const f of fields){const n=data.params?.[f.key];if(typeof n!=='number'||!Number.isFinite(n)||n<f.min||n>f.max)throw new Error('Invalid parameter: '+f.label);params[f.key]=n;}
  return {format:data.format,version:1,name:typeof data.name==='string'&&data.name.trim()?data.name.trim().slice(0,80):'Untitled',mode:data.mode,params};
}
export function nextPreset(ids,current,direction){const index=ids.indexOf(current);return ids[index<0?(direction<0?ids.length-1:0):(index+direction+ids.length)%ids.length];}
export function previewSize(width,height){const scale=Math.min(1,960/width,540/height);return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};}
export function retention(dt,memory){return Math.exp(-Math.max(0,dt)/memory);}
