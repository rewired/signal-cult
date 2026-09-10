export const STAGES=64;
export const fields=[
 {key:'memoryScale',label:'Memory resolution',min:1,max:3,step:1,value:2,unit:'×',hint:'1× = 320 × 180, 2× = 640 × 360, 3× = 960 × 540 at 16:9. Clears memory when changed.'},
 {key:'areaScale',label:'Matrix area',min:1,max:8,step:1,value:8,unit:'×',hint:'Damage covers a square of 1×1 to 8×8 matrix cells. 8× covers the full image.'},
 {key:'amount',label:'Amount',min:0,max:1,step:.01,value:.9,hint:'Blend the selected delayed stage with the live input.'},
 {key:'clock',label:'Clock',min:1,max:30,step:1,value:12,unit:'Hz',hint:'Transfers per second. Changing the clock changes the delay.'},
 {key:'feedback',label:'Feedback',min:0,max:.95,step:.01,value:.3,hint:'Return the selected stage to the input of the chain.'},
 {key:'intensity',label:'Damage',min:0,max:1,step:.01,value:.6,hint:'Displacement, chroma separation and stepped tonal loss.'},
 {key:'span',label:'Travel length',min:1,max:64,step:1,value:12,unit:'stages',hint:'Lifetime of both newly triggered disturbances.'},
 {key:'decay',label:'Decay per step',min:0,max:1,step:.01,value:.06,hint:'How much modulation strength is lost on each transfer.'},
 {key:'stepEvery',label:'Trigger every',min:1,max:16,step:1,value:2,unit:'ticks',hint:'Clock ticks between new modulation triggers.'},
 {key:'lfoRate',label:'LFO rate',min:.02,max:2,step:.02,value:.2,unit:'Hz',hint:'Speed of the sine-wave trigger position in LFO mode.'},
];
export const defaults={...Object.fromEntries(fields.map(f=>[f.key,f.value])),ride:1,wave:1,signalDirection:1,waveDirection:-1,tap:16,finalOnly:0};
export const presets=[
 {id:'counterflow',name:'Counterflow',mode:'step-right',params:{...defaults},description:'Signal travels right. Disturbances ride with it while a second wave travels left.'},
 {id:'packet-train',name:'Packet Train',mode:'step-right',params:{...defaults,wave:0,stepEvery:4,span:24,decay:.02},description:'Orange disturbances stay attached to a packet and ride through the delay.'},
 {id:'wandering-wave',name:'Wandering Wave',mode:'random',params:{...defaults,ride:0,wave:1,span:20,stepEvery:3,waveDirection:1,feedback:.5},description:'Random triggers launch mint waves that act on whichever packet occupies each stage.'},
 {id:'sine-drift',name:'Sine Drift',mode:'lfo',params:{...defaults,signalDirection:-1,waveDirection:1,span:18,lfoRate:.16},description:'A sine LFO scans the matrix while signal and modulation travel in opposite directions.'},
];
export function parsePreset(text){
 const p=JSON.parse(text);
 if(p?.format!=='bucket-rot-preset'||p.version!==1)throw new Error('Expected a BUCKET ROT version 1 preset.');
 if(!['step-right','step-left','random','lfo'].includes(p.mode))throw new Error('Invalid trigger motion.');
 const params={};for(const f of fields){const n=p.params?.[f.key]??(['memoryScale','areaScale'].includes(f.key)?f.value:undefined);if(typeof n!=='number'||!Number.isFinite(n)||n<f.min||n>f.max||(f.step===1&&!Number.isInteger(n)))throw new Error('Invalid parameter: '+f.label);params[f.key]=n;}
 for(const [key,values]of [['ride',[0,1]],['wave',[0,1]],['signalDirection',[-1,1]],['waveDirection',[-1,1]]]){if(!values.includes(p.params?.[key]))throw new Error('Invalid '+key);params[key]=p.params[key];}
 if(!Number.isInteger(p.params?.tap)||p.params.tap<1||p.params.tap>64)throw new Error('Invalid output stage.');params.tap=p.params.tap;
 const finalOnly=p.params.finalOnly??0;if(![0,1].includes(finalOnly))throw new Error('Invalid final-stage switch.');params.finalOnly=finalOnly;
 return {format:p.format,version:1,name:typeof p.name==='string'&&p.name.trim()?p.name.trim().slice(0,80):'Untitled',mode:p.mode,params};
}
export function outputTap(params){return params.finalOnly?(params.signalDirection===1?64:1):params.tap;}
export {nextPreset,previewSize} from '../../signal-rot/js/params.js';

// Image slots and packet-bound modulation move together; waves are independent.
export class BucketChain{
 constructor(){this.reset();}
 reset(){this.slots=Array.from({length:STAGES},(_,i)=>({slot:i,filled:false,carrier:null}));this.waves=[];this.ticks=0;this.time=0;this.cursor=null;this.lastMode=null;this.seed=13579;}
 triggerPosition(mode,rate){
  if(mode!==this.lastMode){this.cursor=null;this.lastMode=mode;}
  if(mode==='random'){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;this.cursor=(this.seed>>>16)%STAGES;}
  else if(mode==='lfo')this.cursor=Math.round((Math.sin(this.time*rate*Math.PI*2)+1)*.5*(STAGES-1));
  else{const direction=mode==='step-left'?-1:1;this.cursor=this.cursor===null?(direction<0?STAGES-1:0):(this.cursor+direction+STAGES)%STAGES;}
  return this.cursor;
 }
 step(p,mode){
  const recycled=p.signalDirection===1?this.slots.pop():this.slots.shift();
  recycled.filled=true;recycled.carrier=null;
  if(p.signalDirection===1)this.slots.unshift(recycled);else this.slots.push(recycled);
  for(const packet of this.slots){if(packet.carrier){packet.carrier.remaining--;packet.carrier.strength*=1-p.decay;if(packet.carrier.remaining<=0)packet.carrier=null;}}
  // Waves stop at chain ends; only the trigger cursor wraps around the matrix.
  this.waves=this.waves.map(w=>({...w,position:w.position+p.waveDirection,remaining:w.remaining-1,strength:w.strength*(1-p.decay)})).filter(w=>w.position>=0&&w.position<STAGES&&w.remaining>0);
  if(this.ticks%p.stepEvery===0){const at=this.triggerPosition(mode,p.lfoRate);if(p.ride)this.slots[at].carrier={remaining:p.span,strength:1,origin:at};if(p.wave)this.waves.push({position:at,remaining:p.span,strength:1});}
  this.ticks++;this.time+=1/p.clock;
  return recycled.slot;
 }
 levels(p){const carrier=this.slots.map(s=>p.ride?(s.carrier?.strength??0):0);const wave=new Array(STAGES).fill(0);if(p.wave)for(const w of this.waves)wave[w.position]=Math.min(1,wave[w.position]+w.strength);return {carrier,wave};}
}
