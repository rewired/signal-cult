import {createFile,DataStream} from '../vendor/mp4box/mp4box.all.js';
import {analysePixels} from './analysis.js';

let activeGeneration=0,activeRequest=0,decoderConfig=null,chunks=[],pendingSeek=null;
const respond=(type,data={},transfer=[])=>postMessage({type,generation:activeGeneration,...data},transfer);
function description(file,track){
 const trak=file.getTrackById(track.id);
 for(const entry of trak.mdia.minf.stbl.stsd.entries){const box=entry.avcC||entry.hvcC||entry.vpcC||entry.av1C;if(box){const stream=new DataStream(undefined,0,DataStream.BIG_ENDIAN);box.write(stream);return new Uint8Array(stream.buffer,8);}}
 throw new Error('Codec description box not found.');
}
async function decodeWindow(time,preroll,generation,request){
 if(generation!==activeGeneration||request!==activeRequest)return;
 if(!decoderConfig||!chunks.length){pendingSeek={time,preroll,generation,request};return;}
 pendingSeek=null;
 const end=time*1e6,start=Math.max(0,(time-Math.min(3,preroll))*1e6);let first=chunks.findIndex(chunk=>chunk.timestamp>=start);if(first<0)first=chunks.length-1;while(first>0&&chunks[first].type!=='key')first--;
 const frames=[];const decoder=new VideoDecoder({output:frame=>{if(frame.timestamp>=start&&frame.timestamp<=end){frames.push(frame);if(frames.length>32)frames.shift().close();}else frame.close();},error:error=>respond('unsupported',{reason:error.message})});
 decoder.configure(decoderConfig);
 for(let i=first;i<chunks.length&&chunks[i].timestamp<=end;i++)decoder.decode(chunks[i]);
 await decoder.flush();decoder.close();
 if(generation!==activeGeneration||request!==activeRequest){frames.forEach(frame=>frame.close());return;}
 respond('frames',{time,request,frames},frames);
}

onmessage=async event=>{
 const message=event.data||{};
 if(message.type==='cancel'){activeGeneration=message.generation;activeRequest++;chunks=[];decoderConfig=null;pendingSeek=null;return;}
 if(message.type==='probe'){
  activeGeneration=message.generation;chunks=[];decoderConfig=null;
  try{
   if(typeof VideoDecoder==='undefined')throw new Error('WebCodecs VideoDecoder is unavailable.');
   const buffer=message.buffer;buffer.fileStart=0;const file=createFile();
   file.onError=error=>respond('unsupported',{reason:String(error)});
   file.onSamples=(_,__,samples)=>{for(const sample of samples)chunks.push(new EncodedVideoChunk({type:sample.is_sync?'key':'delta',timestamp:1e6*sample.cts/sample.timescale,duration:1e6*sample.duration/sample.timescale,data:sample.data}));const pending=pendingSeek;if(pending){pendingSeek=null;void decodeWindow(pending.time,pending.preroll,pending.generation,pending.request);}};
   file.onReady=async info=>{
    try{
     const track=info.videoTracks?.[0];if(!track)throw new Error('No MP4 video track found.');
     decoderConfig={codec:track.codec,codedWidth:track.video?.width||track.track_width,codedHeight:track.video?.height||track.track_height,description:description(file,track)};
     const support=await VideoDecoder.isConfigSupported(decoderConfig);if(!support.supported)throw new Error('The browser cannot decode '+track.codec+'.');
     file.setExtractionOptions(track.id,null,{nbSamples:track.nb_samples});file.start();
     respond('ready',{codec:track.codec,duration:track.duration/track.timescale,frameRate:track.nb_samples/(track.duration/track.timescale)});
    }catch(error){respond('unsupported',{reason:error.message});}
   };
   file.appendBuffer(buffer);file.flush();
  }catch(error){respond('unsupported',{reason:error.message});}
 }
 if(message.type==='seek'){activeRequest=message.request;await decodeWindow(message.time,Math.min(3,Math.max(0,message.preroll||0)),message.generation,message.request);}
 if(message.type==='analyse'){
  activeGeneration=message.generation;const result=analysePixels(new Uint8ClampedArray(message.pixels),message.width,message.height,message.previous?new Float32Array(message.previous):null);
  respond('analysis',{width:message.width,height:message.height,luma:result.luma,edges:result.edges,motion:result.motion},[result.luma.buffer,result.edges.buffer,result.motion.buffer]);
 }
};
