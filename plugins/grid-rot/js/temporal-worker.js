import {createFile} from '../vendor/mp4box/mp4box.all.mjs';
import {analysePixels} from './analysis.js';

let activeGeneration=0;
const respond=(type,data={})=>postMessage({type,generation:activeGeneration,...data});

onmessage=async event=>{
 const message=event.data||{};
 if(message.type==='cancel'){activeGeneration=message.generation;return;}
 if(message.type==='probe'){
  activeGeneration=message.generation;
  try{
   if(typeof VideoDecoder==='undefined')throw new Error('WebCodecs VideoDecoder is unavailable.');
   const buffer=message.buffer;buffer.fileStart=0;
   const file=createFile();
   file.onError=error=>respond('unsupported',{reason:String(error)});
   file.onReady=async info=>{
    const track=info.videoTracks?.[0];
    if(!track){respond('unsupported',{reason:'No MP4 video track found.'});return;}
    const config={codec:track.codec,codedWidth:track.video?.width||track.track_width,codedHeight:track.video?.height||track.track_height};
    const support=await VideoDecoder.isConfigSupported(config);
    respond(support.supported?'ready':'unsupported',{codec:track.codec,duration:track.duration/track.timescale,frameRate:track.nb_samples/(track.duration/track.timescale),reason:support.supported?'':'The browser cannot decode '+track.codec+'.'});
   };
   file.appendBuffer(buffer);file.flush();
  }catch(error){respond('unsupported',{reason:error.message});}
 }
 if(message.type==='seek')respond('seek',{time:message.time,preroll:Math.min(3,Math.max(0,message.preroll||0))});
 if(message.type==='analyse'){
  activeGeneration=message.generation;const result=analysePixels(new Uint8ClampedArray(message.pixels),message.width,message.height,message.previous?new Float32Array(message.previous):null);
  postMessage({type:'analysis',generation:activeGeneration,width:message.width,height:message.height,luma:result.luma,edges:result.edges,motion:result.motion},[result.luma.buffer,result.edges.buffer,result.motion.buffer]);
 }
};
