export class TemporalDecoder {
 constructor(onStatus=()=>{},onFrames=()=>{}){this.onStatus=onStatus;this.onFrames=onFrames;this.generation=0;this.worker=null;this.pending={time:0,preroll:1};this.request=0;this.status={mode:'spatial',message:'Spatial only'};}
 async open(file){
  this.close();const generation=++this.generation;
  if(file.type!=='video/mp4'){this.set('spatial','Temporal operators require an H.264 MP4.');return false;}
  if(!globalThis.VideoDecoder||!globalThis.Worker){this.set('spatial','WebCodecs unavailable — spatial processing only.');return false;}
  this.worker=new Worker(new URL('./temporal-worker.js',import.meta.url),{type:'module'});
  this.worker.onmessage=event=>{if(event.data.generation!==this.generation)return;if(event.data.type==='ready'){this.set('ready','Temporal ready · '+event.data.codec,{frameRate:event.data.frameRate||30,duration:event.data.duration||0});this.seek(this.pending.time,this.pending.preroll);}else if(event.data.type==='frames'&&event.data.request===this.request)this.onFrames(event.data.frames,event.data.time);else if(event.data.type==='unsupported')this.set('spatial',event.data.reason||'Temporal decode unavailable.');};
  this.worker.onerror=event=>this.set('spatial',(event.message||'Temporal decoder stopped')+' — spatial processing only.');
  this.set('loading','Indexing MP4 for deterministic seeks…');
  const buffer=await file.arrayBuffer();if(generation!==this.generation)return false;
  this.worker.postMessage({type:'probe',generation,buffer},[buffer]);return true;
 }
 seek(time,preroll=1){this.pending={time,preroll};const request=++this.request;this.worker?.postMessage({type:'seek',generation:this.generation,request,time,preroll});return request;}
 cancelPending(){this.request++;}
 set(mode,message,details={}){this.status={mode,message,...details};this.onStatus(this.status);}
 close(){this.request++;if(this.worker){this.worker.terminate();this.worker=null;}this.generation++;this.set('spatial','Spatial only');}
 destroy(){this.close();}
}
