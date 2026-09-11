import {RuptureRenderer} from './renderer.js';
import {destinations,fields,defaults,defaultColors,defaultRoutes,presets,parsePreset,serializePreset,nextPreset,previewSize} from './params.js';
import {enableCtrlDragSnapping} from '../../broken-fm/js/controls.js';

const $=id=>document.getElementById(id),events=new AbortController();
const on=(target,event,handler)=>target.addEventListener(event,handler,{signal:events.signal});
let params={...defaults},colors={...defaultColors},routes=defaultRoutes(),style='transmission',combine='max',presetId='paper-signal',presetName='Paper Signal';
let renderer,source,objectURL='',maskVideo=null,maskObjectURL='',maskFromSource=false,playing=true,bypass=false,started=false,disposed=false,raf=0,generation=0,mediaFrame=0,maskFrame=0,lastMediaTime=null,lastMaskTime=-1,needsFrame=true,sourceTime=0,demoTime=0,lastRAF=0,lastDemo=-1,statsTime=0,statsFrames=0;
const controls=new Map(),demo=document.createElement('canvas'),demoMask=document.createElement('canvas');demo.width=demoMask.width=960;demo.height=demoMask.height=540;
const ctx=demo.getContext('2d'),maskContext=demoMask.getContext('2d');source=demo;

function showError(message=''){$('error').textContent=message;$('error').hidden=!message;}
function custom(){presetId='custom';presetName='Untitled';$('preset-select').value='custom';$('preset-status').textContent='Current settings';$('preset-description').textContent='Custom raster rupture.';}
function clearMemory(){renderer?.reset();needsFrame=true;lastMediaTime=null;}
function sync(){
 $('preset-select').value=presetId;$('style').value=style;$('ink-color').value=colors.ink;$('accent-color').value=colors.accent;
 for(const field of fields){const control=controls.get(field.key);control.range.value=control.number.value=params[field.key];}
 paintMaskInfluence();
}
function apply(preset,id='custom'){
 params={...preset.params};colors={...preset.colors};routes=preset.routes.map(route=>[...route]);style=preset.style;combine=preset.combine;presetName=preset.name;presetId=id;
 $('preset-description').textContent=preset.description||'Imported raster rupture.';$('preset-status').textContent=(id==='custom'?'Loaded: ':'Applied: ')+presetName;sync();clearMemory();
}
for(const field of fields){
 const wrap=document.createElement('div');wrap.className='control';
 const heading=document.createElement('div');heading.className='control-heading';
 const label=document.createElement('label');label.htmlFor='range-'+field.key;label.textContent=field.label;
 const number=document.createElement('input');number.type='number';number.setAttribute('aria-label',field.label+' value');
 const range=document.createElement('input');range.type='range';range.id='range-'+field.key;
 for(const element of [number,range]){element.min=field.min;element.max=field.max;element.step=field.step;element.value=params[field.key];}
 const update=value=>{if(!Number.isFinite(value))return;params[field.key]=Math.min(field.max,Math.max(field.min,value));range.value=number.value=params[field.key];custom();needsFrame=true;};
 on(range,'input',()=>update(Number(range.value)));on(number,'input',()=>{if(number.value!=='')update(number.valueAsNumber);});on(number,'blur',()=>number.value=params[field.key]);on(range,'dblclick',()=>update(field.value));range.dataset.snapStep=String(field.step*10);enableCtrlDragSnapping(range);
 const hint=document.createElement('p');hint.className='hint';hint.textContent=field.hint;heading.append(label,number);wrap.append(heading,range,hint);$('parameters').append(wrap);controls.set(field.key,{range,number});
}

let selectedRoute=1;
const destinationBar=$('mask-destinations'),pad=$('mask-xy-pad'),padHandle=$('mask-pad-handle'),padX=$('mask-pad-x'),padY=$('mask-pad-y'),destinationButtons=[];
destinations.forEach((destination,index)=>{const button=document.createElement('button');button.type='button';button.textContent=destination.label;button.title='Edit '+destination.label;on(button,'click',()=>{selectedRoute=index;paintMaskInfluence();});destinationBar.append(button);destinationButtons.push(button);});
function updateMaskRoute(x,y){if(!Number.isFinite(x)||!Number.isFinite(y))return;routes[selectedRoute]=[Math.max(-1,Math.min(1,x)),selectedRoute===0?0:Math.max(-90,Math.min(90,y))];custom();paintMaskInfluence();needsFrame=true;}
function paintMaskInfluence(){
 const [x,y]=routes[selectedRoute];destinationButtons.forEach((button,index)=>{button.classList.toggle('active',index===selectedRoute);button.style.setProperty('--route-strength',Math.abs(routes[index][0]));});
 padHandle.style.left=((x+1)*50)+'%';padHandle.style.top=((1-y/90)*50)+'%';padX.value=Number(x.toFixed(2));padY.value=Math.round(y);padY.disabled=selectedRoute===0;
 $('mask-pad-note').textContent=destinations[selectedRoute].label+(selectedRoute===0?' · angle not applicable':' · '+(y>=0?'+':'')+Math.round(y)+'° from global direction');
 pad.setAttribute('aria-label',destinations[selectedRoute].label+': influence '+x.toFixed(2)+', angle '+Math.round(y)+' degrees');
}
function padPosition(event){const rect=pad.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width*2-1,y=(.5-(event.clientY-rect.top)/rect.height)*180;updateMaskRoute(x,y);}
on(pad,'pointerdown',event=>{pad.setPointerCapture(event.pointerId);padPosition(event);});on(pad,'pointermove',event=>{if(pad.hasPointerCapture(event.pointerId))padPosition(event);});
on(pad,'dblclick',()=>updateMaskRoute(0,0));on(pad,'keydown',event=>{let [x,y]=routes[selectedRoute],handled=true,small=event.shiftKey;if(event.key==='ArrowLeft')x-=small ? .01 : .05;else if(event.key==='ArrowRight')x+=small ? .01 : .05;else if(event.key==='ArrowUp')y+=small ? 1 : 5;else if(event.key==='ArrowDown')y-=small ? 1 : 5;else if(event.key==='Home'){x=0;y=0;}else handled=false;if(handled){event.preventDefault();updateMaskRoute(x,y);}});
on(padX,'input',()=>{if(padX.value!=='')updateMaskRoute(padX.valueAsNumber,routes[selectedRoute][1]);});on(padY,'input',()=>{if(padY.value!=='')updateMaskRoute(routes[selectedRoute][0],padY.valueAsNumber);});
on(padX,'blur',paintMaskInfluence);on(padY,'blur',paintMaskInfluence);
paintMaskInfluence();

for(const preset of presets)$('preset-select').append(new Option(preset.name,preset.id));
on($('preset-select'),'change',()=>{const preset=presets.find(item=>item.id===$('preset-select').value);if(preset)apply(preset,preset.id);});
for(const [id,delta] of [['preset-previous',-1],['preset-next',1]])on($(id),'click',()=>{const id=nextPreset(presets.map(p=>p.id),$('preset-select').value,delta);apply(presets.find(p=>p.id===id),id);});
on($('style'),'change',()=>{style=$('style').value;custom();clearMemory();});
const colorToFloat=value=>[parseInt(value.slice(1,3),16)/255,parseInt(value.slice(3,5),16)/255,parseInt(value.slice(5,7),16)/255];
for(const [id,key] of [['ink-color','ink'],['accent-color','accent']])on($(id),'input',()=>{colors[key]=$(id).value.toLowerCase();custom();needsFrame=true;});
on($('clear-routes'),'click',()=>{routes=routes.map(()=>[0,0]);paintMaskInfluence();custom();needsFrame=true;});
on($('clear-memory'),'click',clearMemory);
on($('bypass'),'click',()=>{bypass=!bypass;$('bypass').setAttribute('aria-pressed',String(bypass));$('bypass').textContent=bypass?'View output':'View input';$('view-label').textContent=bypass?'INPUT':'OUTPUT';renderer?.present(params.amount,bypass);});

function drawDemoMask(){
 maskContext.fillStyle='#000';maskContext.fillRect(0,0,960,540);maskContext.fillStyle='#fff';
 maskContext.beginPath();maskContext.ellipse(500,238,145,190,-.08,0,Math.PI*2);maskContext.fill();
 const gradient=maskContext.createLinearGradient(0,330,0,540);gradient.addColorStop(0,'#fff');gradient.addColorStop(1,'#444');maskContext.fillStyle=gradient;maskContext.beginPath();maskContext.moveTo(355,350);maskContext.lineTo(650,350);maskContext.lineTo(790,540);maskContext.lineTo(190,540);maskContext.closePath();maskContext.fill();
}
function drawDemo(time){
 ctx.fillStyle='#080a0a';ctx.fillRect(0,0,960,540);const drift=Math.sin(time*.37)*16;
 const background=ctx.createLinearGradient(0,0,960,540);background.addColorStop(0,'#050606');background.addColorStop(.55,'#242725');background.addColorStop(1,'#090a0a');ctx.fillStyle=background;ctx.fillRect(0,0,960,540);
 ctx.save();ctx.translate(drift,0);ctx.beginPath();ctx.ellipse(500,238,145,190,-.08,0,Math.PI*2);ctx.clip();const face=ctx.createLinearGradient(360,90,640,400);face.addColorStop(0,'#4a4c48');face.addColorStop(.32,'#e8e4d8');face.addColorStop(.62,'#85877f');face.addColorStop(1,'#d7d2c6');ctx.fillStyle=face;ctx.fillRect(330,40,350,410);ctx.globalAlpha=.2;for(let i=0;i<900;i++){const x=350+Math.random()*310,y=45+Math.random()*400,r=Math.random()*1.5;ctx.fillStyle=Math.random()>.5?'#fff':'#000';ctx.fillRect(x,y,r,r)}ctx.globalAlpha=1;ctx.restore();ctx.save();ctx.translate(drift,0);
 ctx.fillStyle='#202221';ctx.beginPath();ctx.ellipse(455,205,36,17,-.1,0,Math.PI*2);ctx.ellipse(557,195,35,16,.12,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#565853';ctx.beginPath();ctx.moveTo(510,205);ctx.lineTo(535,308);ctx.lineTo(490,316);ctx.closePath();ctx.fill();
 ctx.fillStyle='#252624';ctx.beginPath();ctx.ellipse(515,353,68,16,-.06,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#d8d7cf';ctx.beginPath();ctx.moveTo(355,350);ctx.lineTo(650,350);ctx.lineTo(790,540);ctx.lineTo(190,540);ctx.closePath();ctx.fill();ctx.restore();
 ctx.globalAlpha=.24;ctx.fillStyle='#000';for(let y=3;y<540;y+=5)ctx.fillRect(0,y,960,1);ctx.globalAlpha=1;
}
drawDemoMask();drawDemo(0);

function playbackUI(){$('play').textContent=playing?'Pause':'Play';$('play').setAttribute('aria-label',playing?'Pause':'Play');$('play').setAttribute('aria-pressed',String(!playing));}
function maskTime(time){return maskVideo&&Number.isFinite(maskVideo.duration)&&maskVideo.duration>0?((time%maskVideo.duration)+maskVideo.duration)%maskVideo.duration:0;}
async function syncMaskTransport(force=false){
 if(!maskVideo)return;
 const masterVideo=source instanceof HTMLVideoElement,target=maskTime(masterVideo?source.currentTime:sourceTime);
 if((force||Math.abs(maskVideo.currentTime-target)>.12)&&!maskVideo.seeking)maskVideo.currentTime=target;
 const shouldPlay=playing&&(!masterVideo||!source.paused);if(shouldPlay&&maskVideo.paused)try{await maskVideo.play();}catch{}else if(!shouldPlay&&!maskVideo.paused)maskVideo.pause();
}
on($('play'),'click',async()=>{playing=!playing;if(source instanceof HTMLVideoElement){if(playing){try{await source.play();}catch{playing=false;showError('Playback could not start.');}}else source.pause();}await syncMaskTransport(true);playbackUI();});
function release(media){if(media instanceof HTMLVideoElement){if(mediaFrame&&media.cancelVideoFrameCallback)media.cancelVideoFrameCallback(mediaFrame);mediaFrame=0;media.pause();media.removeAttribute('src');media.load();}}
function releaseMask(){if(maskVideo){if(maskFrame&&maskVideo.cancelVideoFrameCallback)maskVideo.cancelVideoFrameCallback(maskFrame);maskFrame=0;maskVideo.pause();maskVideo.removeAttribute('src');maskVideo.load();maskVideo=null;}if(maskObjectURL){URL.revokeObjectURL(maskObjectURL);maskObjectURL='';}lastMaskTime=-1;}
function sourceMaskMode(active){maskFromSource=active;$('source-mask').setAttribute('aria-pressed',String(active));$('source-mask').classList.toggle('active',active);}
function uploadSourceMask(){renderer.setMaskFrame(source);$('mask-name').textContent='SOURCE LINK / '+$('filename').textContent;}
function watchVideo(video){if(!video.requestVideoFrameCallback)return;const callback=(_,metadata)=>{if(disposed||source!==video)return;sourceTime=metadata.mediaTime;needsFrame=true;mediaFrame=video.requestVideoFrameCallback(callback);};mediaFrame=video.requestVideoFrameCallback(callback);}
function configureSource(width,height){const size=previewSize(width,height);renderer?.resize(size.width,size.height);$('dimensions').textContent=width+' × '+height+' / Preview '+size.width+' × '+size.height;clearMemory();}
function useDemo(){generation++;release(source);releaseMask();if(objectURL)URL.revokeObjectURL(objectURL);objectURL='';source=demo;demoTime=0;lastDemo=-1;playing=true;sourceTime=0;$('filename').textContent='PROCEDURAL PORTRAIT';$('demo').classList.add('active');$('seek-control').hidden=true;configureSource(960,540);if(maskFromSource)uploadSourceMask();else{renderer?.setMask(demoMask);$('mask-name').textContent='PROCEDURAL PORTRAIT MATTE';}playbackUI();showError();}
on($('demo'),'click',useDemo);
async function loadMedia(file){
 if(!file||!started)return;const id=++generation,url=URL.createObjectURL(file);let next;showError();
 try{
  if(file.type.startsWith('video/')){next=document.createElement('video');next.muted=true;next.loop=true;next.playsInline=true;next.preload='auto';await new Promise((resolve,reject)=>{const done=error=>{next.onloadeddata=next.onerror=null;error?reject(error):resolve();};next.onloadeddata=()=>done();next.onerror=()=>done(Error('Unsupported video.'));next.src=url;});}
  else if(file.type.startsWith('image/')){next=new Image();next.src=url;await next.decode();}else throw Error('Select a video or image.');
  if(disposed||id!==generation){URL.revokeObjectURL(url);return;}release(source);if(objectURL)URL.revokeObjectURL(objectURL);source=next;objectURL=url;playing=true;sourceTime=0;$('filename').textContent=file.name;$('demo').classList.remove('active');const video=source instanceof HTMLVideoElement;configureSource(video?source.videoWidth:source.naturalWidth,video?source.videoHeight:source.naturalHeight);$('seek-control').hidden=!video;if(video){$('seek').max=Number.isFinite(source.duration)?source.duration:1;watchVideo(source);try{await source.play();}catch{playing=false;}}await syncMaskTransport(true);if(maskFromSource)uploadSourceMask();needsFrame=true;playbackUI();
 }catch(error){URL.revokeObjectURL(url);showError(error.message);}
}
on($('media-file'),'change',event=>{void loadMedia(event.target.files[0]);event.target.value='';});
on(document,'dragover',event=>event.preventDefault());on(document,'drop',event=>{event.preventDefault();void loadMedia(event.dataTransfer.files[0]);});
on($('seek'),'input',()=>{if(source instanceof HTMLVideoElement){clearMemory();source.currentTime=Number($('seek').value);void syncMaskTransport(true);}});

async function loadMask(file){
 if(!file)return;
 if(file.name.toLowerCase().endsWith('.exr')){showError('The float32 mask contract is ready, but OpenEXR decoding is not bundled into this first browser study yet. PNG, MP4 and browser-supported TIFF files work now.');$('mask-name').textContent='EXR ADAPTER PENDING / FLOAT32 RESERVED';return;}
 const url=URL.createObjectURL(file);let keepURL=false;
 try{
  if(file.type==='video/mp4'||file.name.toLowerCase().endsWith('.mp4')){
   const video=document.createElement('video');video.muted=true;video.loop=true;video.playsInline=true;video.preload='auto';video.src=url;
   await new Promise((resolve,reject)=>{const done=error=>{video.onloadeddata=video.onerror=null;error?reject(error):resolve();};video.onloadeddata=()=>done();video.onerror=()=>done(Error('Unsupported MP4 mask.'));});
   releaseMask();sourceMaskMode(false);maskVideo=video;maskObjectURL=url;keepURL=true;lastMaskTime=-1;renderer.setMaskFrame(video);
   if(video.requestVideoFrameCallback){const watch=()=>{if(disposed||maskVideo!==video)return;needsFrame=true;maskFrame=video.requestVideoFrameCallback(watch);};maskFrame=video.requestVideoFrameCallback(watch);}
   await syncMaskTransport(true);
  }else{
   const image=new Image();image.src=url;await image.decode();releaseMask();sourceMaskMode(false);renderer.setMask(image);
  }
  $('mask-name').textContent=file.name.toUpperCase();clearMemory();showError();
 }catch(error){if(keepURL)releaseMask();showError('Mask loading failed: '+error.message+' Use PNG or MP4 for the preview; EXR remains a native/WASM adapter boundary.');}finally{if(!keepURL)URL.revokeObjectURL(url);}
}
on($('mask-file'),'change',event=>{
 const input=event.target,file=input.files[0];
 input.value='';input.blur();window.scrollTo(0,0);
 void loadMask(file).finally(()=>requestAnimationFrame(()=>window.scrollTo(0,0)));
});
on($('source-mask'),'click',()=>{releaseMask();sourceMaskMode(true);uploadSourceMask();clearMemory();showError();});
on($('no-mask'),'click',()=>{releaseMask();sourceMaskMode(false);renderer.setNoMask();$('mask-name').textContent='NO MASK / FULL FRAME';clearMemory();});
on($('default-mask'),'click',()=>{releaseMask();sourceMaskMode(false);renderer.setMask(demoMask);$('mask-name').textContent='PROCEDURAL PORTRAIT MATTE';clearMemory();});
on($('mask-channel'),'change',()=>{renderer.maskChannel=['luma','r','g','b','a'].indexOf($('mask-channel').value);needsFrame=true;});
on($('mask-invert'),'change',()=>{renderer.invertMask=$('mask-invert').checked;needsFrame=true;});

on($('preset-file'),'change',async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;try{if(file.size>65536)throw Error('Preset file is too large.');apply(parsePreset(await file.text()));showError();}catch(error){showError('Could not load preset: '+error.message);}});
on($('save-preset'),'click',()=>{const preset=serializePreset({name:presetName,style,description:$('preset-description').textContent,params,colors,routes,combine}),url=URL.createObjectURL(new Blob([JSON.stringify(preset,null,2)+'\n'],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=(presetName.toLowerCase().replace(/[^a-z0-9]+/g,'-')||'raster-rupture')+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('preset-status').textContent='Saved: '+presetName;});

function loop(now){
 if(disposed)return;const dt=lastRAF?Math.min((now-lastRAF)/1000,.1):0;lastRAF=now;
 try{
  if(source===demo){if(playing&&!document.hidden)demoTime+=dt;const frame=Math.floor(demoTime*30);if(frame!==lastDemo){drawDemo(frame/30);lastDemo=frame;sourceTime=frame/30;needsFrame=true;}}
  else if(source instanceof HTMLVideoElement&&!source.requestVideoFrameCallback&&!source.paused){if(source.currentTime!==sourceTime){sourceTime=source.currentTime;needsFrame=true;}}
  else if(!(source instanceof HTMLVideoElement)&&playing){demoTime+=dt;sourceTime=demoTime;needsFrame=true;}
  if(maskVideo&&maskVideo.readyState>=2){if(source instanceof HTMLVideoElement&&Math.abs(maskVideo.currentTime-maskTime(source.currentTime))>.12)void syncMaskTransport();if(maskVideo.currentTime!==lastMaskTime){renderer.setMaskFrame(maskVideo);lastMaskTime=maskVideo.currentTime;needsFrame=true;}}
  if(needsFrame&&!document.hidden&&!(source instanceof HTMLVideoElement&&source.seeking)){if(maskFromSource)renderer.setMaskFrame(source);const delta=lastMediaTime===null?1/30:sourceTime-lastMediaTime;if(delta<0||delta>.3)renderer.reset();renderer.update(source,params,{ink:colorToFloat(colors.ink),accent:colorToFloat(colors.accent)},style,routes,combine,sourceTime*params.evolution);renderer.present(params.amount,bypass);needsFrame=false;lastMediaTime=sourceTime;statsFrames++;if(source instanceof HTMLVideoElement){$('seek').value=source.currentTime;const seconds=Math.floor(source.currentTime);$('timecode').textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');}}
  if(now-statsTime>1000){$('fps').textContent=playing?Math.round(statsFrames*1000/(now-statsTime))+' FPS':'PAUSED';statsFrames=0;statsTime=now;}raf=requestAnimationFrame(loop);
 }catch(error){playing=false;playbackUI();showError('Preview stopped: '+error.message);}
}
function start(){if(started)return;try{renderer=new RuptureRenderer($('preview'));renderer.resize(960,540);renderer.setMask(demoMask);started=true;statsTime=performance.now();raf=requestAnimationFrame(loop);}catch(error){showError(error.message);}}
const warningKey='raster-rupture.photosensitivity-warning.dismissed';let accepted=false;try{accepted=localStorage.getItem(warningKey)==='true';}catch{}
on($('warning-form'),'submit',event=>{event.preventDefault();if($('dismiss-warning').checked)try{localStorage.setItem(warningKey,'true');}catch{}$('photosensitivity-warning').hidden=true;start();});
if(accepted){$('photosensitivity-warning').hidden=true;start();}
on(window,'pagehide',event=>{if(event.persisted)return;disposed=true;generation++;cancelAnimationFrame(raf);release(source);releaseMask();if(objectURL)URL.revokeObjectURL(objectURL);renderer?.destroy();events.abort();});
sync();$('preset-description').textContent=presets[0].description;
