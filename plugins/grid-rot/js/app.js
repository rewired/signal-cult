import {GridRenderer} from './renderer.js';
import {fields,defaults,presets,parsePreset,nextPreset,previewSize,gridFor,activeAreas,containsCell,fractureScale,defaultExtensions,operatorDefinitions,surfaceContract,presetToCompanionState,companionStateToPreset} from './params.js';
import {initializeCompanion} from './companion-adapter.js';
import {enableCtrlDragSnapping} from '../../broken-fm/js/controls.js';
import {TemporalDecoder} from './temporal.js';
const $=id=>document.getElementById(id);
const events=new AbortController();
const on=(target,event,handler)=>target.addEventListener(event,handler,{signal:events.signal});
let params={...presets.find(p=>p.id==='random-drops').params},mode='drops',presetId='random-drops',presetName='Random Drops';
let extensions=defaultExtensions();
let renderer,source,objectURL='',playing=true,bypass=false,started=false,disposed=false,raf=0,temporalPending=false,temporalSeekTimer=0;
const temporalDecoder=new TemporalDecoder(status=>{const badge=$('temporal-status'),detail=$('decoder-status');if(badge)badge.textContent=status.mode.toUpperCase();if(detail)detail.textContent=status.message+(renderer?' · History '+renderer.historyCount+' / 32':'');if(renderer&&status.frameRate)renderer.historyRate=status.frameRate;if(status.mode==='spatial'){if(temporalSeekTimer)clearTimeout(temporalSeekTimer);temporalSeekTimer=0;temporalPending=false;needsFrame=true;}},frames=>{if(temporalSeekTimer)clearTimeout(temporalSeekTimer);temporalSeekTimer=0;renderer?.loadHistoryFrames(frames);temporalPending=false;needsFrame=true;});
let generation=0,mediaFrame=0,videoWatchdog=0,needsFrame=true,sourceTime=0,videoObservedTime=-1,videoProgressAt=0,videoLoopRestarting=false;
let demoTime=0,lastRAF=0,lastDemo=-1,statsTime=0,statsFrames=0;
const demo=document.createElement('canvas');demo.width=960;demo.height=540;
const ctx=demo.getContext('2d');source=demo;
const controls=new Map();
const extensionControls=[];
function showError(message=''){$('error').textContent=message;$('error').hidden=!message;}
function custom(){presetId='custom';presetName='Untitled';$('preset-select').value='custom';$('preset-status').textContent='Current settings';$('preset-description').textContent='Custom spatial modulation.';}
function present(){if(renderer){renderer.params=params;renderer.mode=mode;renderer.extensions=extensions;renderer.present(params.amount,bypass);}syncGrid();}
function resetMotion(){if(renderer){renderer.params=params;renderer.mode=mode;renderer.reset();}needsFrame=true;present();}
function setPackageSummary(modalId,text,active){const summary=$(modalId.replace('-modal','-summary')),button=document.querySelector(`[data-open-modal="${modalId}"]`);if(summary)summary.textContent=text;if(button)button.classList.toggle('is-active',active);}
function syncPackageSummaries(){
 const varied=params.dropSpread>0||params.clusterAmount>0||params.fractureDepth>0;
 setPackageSummary('drop-pattern-modal',(params.dropSpread?Math.round(params.dropSpread*100)+'% variation':'Fixed')+(params.clusterAmount?' · clustered':'')+(params.fractureDepth?' · fracture '+(2**params.fractureDepth)+'×':''),varied);
 const targets=[['bright','Bright'],['dark','Dark'],['edges','Edges'],['motion','Motion']].filter(([key])=>extensions.targeting[key]>0).map(([,label])=>label);
 setPackageSummary('targeting-modal',extensions.targeting.bias>0?(targets.join(' + ')||'Uniform')+' · '+Math.round(extensions.targeting.bias*100)+'% bias':'Uniform · neutral',extensions.targeting.bias>0);
 const infected=extensions.infection.amount>0&&extensions.infection.radius>0;
 setPackageSummary('infection-modal',infected?'Radius '+extensions.infection.radius+' · '+extensions.infection.direction:'Off',infected);
 const topology=extensions.topology,deformed=topology.type!=='rect'||topology.jitter>0||topology.skew!==0||topology.warpAmount>0;
 setPackageSummary('topology-modal',topology.type[0].toUpperCase()+topology.type.slice(1)+(topology.warpAmount?' · warp '+topology.warpAmount:''),deformed);
 const enabled=Object.entries(extensions.operators).filter(([,operator])=>operator.enabled&&operator.weight>0);
 setPackageSummary('operators-modal',(enabled.length?enabled.length+' active':'No routing')+(extensions.temporal.enabled?' · memory on':' · spatial'),enabled.length>0||extensions.temporal.enabled);
}
function sync(){
 $('preset-select').value=presetId;$('mode').value=mode;
 for(const f of fields){const c=controls.get(f.key);c.range.value=c.number.value=params[f.key];const inactive=f.key.startsWith('cluster')?(mode!=='drops'||f.key!=='clusterAmount'&&params.clusterAmount===0):f.key.startsWith('drop')?mode!=='drops':(f.key==='rate'&&mode==='drops'||f.key==='fractureAmount'&&params.fractureDepth===0);c.wrap.classList.toggle('inactive',inactive);c.range.disabled=c.number.disabled=inactive;}
 extensionControls.forEach(update=>update());syncPackageSummaries();
}
function apply(preset,id='custom'){
 params={...preset.params};mode=preset.mode;presetName=preset.name;presetId=id;const base=defaultExtensions();extensions=structuredClone(Object.fromEntries(Object.keys(base).map(k=>[k,preset[k]??base[k]])));
 $('preset-description').textContent=preset.description||'Imported spatial modulation.';
 $('preset-status').textContent=(id==='custom'?'Loaded: ':'Applied: ')+presetName;
 sync();resetMotion();
}
async function renderPresetBrowser(){
 const dialog=$('preset-browser-dialog'),grid=$('preset-grid'),openButton=$('open-preset-browser');
 grid.replaceChildren();dialog.showModal();openButton.disabled=true;$('preset-browser-status').textContent='Rendering current frame...';
 let thumbRenderer;
 try{
  const thumbnail=document.createElement('canvas');thumbnail.width=240;thumbnail.height=Math.max(90,Math.round(240*(renderer?.sourceHeight||540)/(renderer?.sourceWidth||960)));
  thumbRenderer=new GridRenderer(thumbnail);thumbRenderer.sourceWidth=renderer?.sourceWidth||960;thumbRenderer.sourceHeight=renderer?.sourceHeight||540;thumbRenderer.resize(thumbnail.width,thumbnail.height);
  for(const [index,preset] of presets.entries()){
   const base=defaultExtensions();const presetExtensions=structuredClone(Object.fromEntries(Object.keys(base).map(key=>[key,preset[key]??base[key]])));
   thumbRenderer.extensions=presetExtensions;thumbRenderer.update(source,preset.params,preset.mode,sourceTime);thumbRenderer.present(preset.params.amount,false);
   const button=document.createElement('button');button.type='button';button.className='preset-card';button.dataset.preset=preset.id;
   const image=document.createElement('img');image.alt='';image.src=thumbnail.toDataURL('image/jpeg',.82);
   const copy=document.createElement('span'),title=document.createElement('strong'),description=document.createElement('small');title.textContent=preset.name;description.textContent=preset.description;copy.append(title,description);button.append(image,copy);
   on(button,'click',()=>{apply(preset,preset.id);dialog.close();});grid.append(button);
   if(index%4===3)await new Promise(resolve=>requestAnimationFrame(resolve));
  }
  $('preset-browser-status').textContent=`${presets.length} looks rendered from the current frame`;
 }catch(error){showError('Could not render preset previews: '+error.message);dialog.close();}
 finally{thumbRenderer?.destroy();openButton.disabled=false;}
}
for(const f of fields){
 const wrap=document.createElement('div');wrap.className='control';
 const heading=document.createElement('div');heading.className='control-heading';
 const label=document.createElement('label');label.htmlFor='range-'+f.key;label.textContent=f.label+(f.unit?' ('+f.unit+')':'');
 const number=document.createElement('input');number.type='number';number.setAttribute('aria-label',f.label+' value');
 const range=document.createElement('input');range.type='range';range.id='range-'+f.key;
 for(const el of [number,range]){el.min=f.min;el.max=f.max;el.step=f.step;el.value=params[f.key];}
 const update=value=>{if(!Number.isFinite(value))return;params[f.key]=Math.min(f.max,Math.max(f.min,f.step===1?Math.round(value):value));range.value=number.value=params[f.key];custom();sync();present();};
 on(range,'input',()=>update(Number(range.value)));on(number,'input',()=>{if(number.value!=='')update(number.valueAsNumber);});on(number,'blur',()=>number.value=params[f.key]);on(range,'dblclick',()=>update(f.value));
 range.dataset.snapStep=String(f.step*10);enableCtrlDragSnapping(range);
 const hint=document.createElement('p');hint.className='hint';hint.textContent=f.hint;
 heading.append(label,number);wrap.append(heading,range,hint);const direct=surfaceContract.ofx.params.includes(f.key)&&!['shift','split','crush'].includes(f.key),post=['shift','split','crush'].includes(f.key);$(direct?'core-controls':post?'post-controls':'drop-controls').append(wrap);controls.set(f.key,{wrap,number,range});
}
for(const button of document.querySelectorAll('[data-open-modal]'))on(button,'click',()=>$(button.dataset.openModal)?.showModal());
for(const dialog of document.querySelectorAll('.parameter-modal')){const close=dialog.querySelector('[data-close-modal]');if(close)on(close,'click',()=>dialog.close());on(dialog,'click',event=>{if(event.target===dialog)dialog.close();});}
for(const p of presets)$('preset-select').append(new Option(p.name,p.id));
on($('preset-select'),'change',()=>{const p=presets.find(p=>p.id===$('preset-select').value);if(p)apply(p,p.id);});
on($('open-preset-browser'),'click',()=>{void renderPresetBrowser();});
on($('close-preset-browser'),'click',()=>$('preset-browser-dialog').close());
for(const [id,delta]of [['preset-previous',-1],['preset-next',1]])on($(id),'click',()=>{const id=nextPreset(presets.map(p=>p.id),$('preset-select').value,delta);apply(presets.find(p=>p.id===id),id);});
on($('mode'),'change',()=>{mode=$('mode').value;custom();sync();resetMotion();});
on($('reset-motion'),'click',resetMotion);
on($('bypass'),'click',()=>{bypass=!bypass;$('bypass').setAttribute('aria-pressed',String(bypass));$('bypass').textContent=bypass?'View output':'View input';$('view-label').textContent=bypass?'INPUT':'OUTPUT';present();});
function playbackUI(){$('step-clock').disabled=playing||!started;$('play').textContent=playing?'Pause':'Play';$('play').setAttribute('aria-label',playing?'Pause':'Play');$('play').setAttribute('aria-pressed',String(!playing));}
on($('play'),'click',async()=>{
 playing=!playing;
 if(source instanceof HTMLVideoElement){if(playing){try{await source.play();}catch{playing=false;showError('Playback could not start. Try another video.');}}else source.pause();}
 playbackUI();
});
function release(media){if(videoWatchdog){clearInterval(videoWatchdog);videoWatchdog=0;}if(media instanceof HTMLVideoElement){if(mediaFrame&&media.cancelVideoFrameCallback)media.cancelVideoFrameCallback(mediaFrame);mediaFrame=0;media.pause();media.removeAttribute('src');media.load();}}
function restartVideoLoop(video){if(videoLoopRestarting||source!==video||!playing)return;videoLoopRestarting=true;sourceTime=0;seek.value=0;timecode.textContent='0:00';video.currentTime=0;}
function temporalPreroll(){let frames=extensions.temporal.range||1;for(const id of ['delay','stutter','reverse','smear']){const operator=extensions.operators[id];if(operator?.enabled)frames=Math.max(frames,operator.settings?.frames||1);}return Math.min(3,Math.max(params.dropLife,frames/(renderer?.historyRate||30)));}
function requestTemporalSeek(time){if(temporalSeekTimer)clearTimeout(temporalSeekTimer);temporalPending=temporalDecoder.status.mode==='ready';temporalDecoder.seek(time,temporalPreroll());needsFrame=!temporalPending;if(temporalPending)temporalSeekTimer=setTimeout(()=>{if(!temporalPending)return;temporalDecoder.cancelPending();renderer?.resetHistory();temporalPending=false;temporalSeekTimer=0;needsFrame=true;},750);}
function watchVideo(video){
 let observed=video.currentTime,progress=performance.now();videoWatchdog=setInterval(()=>{if(disposed||source!==video)return;const now=performance.now(),time=video.currentTime;if(Math.abs(time-observed)>.0001){observed=time;progress=now;}const tail=Math.max(.05,1.25/(renderer?.historyRate||30));if(playing&&Number.isFinite(video.duration)&&video.duration-time<=tail)restartVideoLoop(video);},100);
 if(!video.requestVideoFrameCallback)return;
 const callback=(_,metadata)=>{if(disposed||source!==video)return;const wrapped=metadata.mediaTime+.001<sourceTime;sourceTime=metadata.mediaTime;if(wrapped)requestTemporalSeek(sourceTime);else needsFrame=true;mediaFrame=video.requestVideoFrameCallback(callback);};
 mediaFrame=video.requestVideoFrameCallback(callback);
}
function configureSource(width,height){if(renderer){renderer.sourceWidth=width;renderer.sourceHeight=height;renderer.time=0;}const size=previewSize(width,height);renderer?.resize(size.width,size.height);$('dimensions').textContent=width+' × '+height+' / Preview '+size.width+' × '+size.height;resetMotion();}
function useDemo(){
 generation++;release(source);temporalDecoder.close();if(renderer)renderer.historyRate=30;if(objectURL)URL.revokeObjectURL(objectURL);objectURL='';source=demo;demoTime=0;lastDemo=-1;playing=true;sourceTime=0;
 $('filename').textContent='MOVING TEST SIGNAL';$('demo').classList.add('active');$('seek-control').hidden=true;configureSource(960,540);playbackUI();showError();
}
on($('demo'),'click',useDemo);
async function loadMedia(file){
 if(!file||!started)return;
 const id=++generation;const url=URL.createObjectURL(file);let next;
 showError();
 try{
  if(file.type.startsWith('video/')){
   next=document.createElement('video');next.muted=true;next.loop=false;next.playsInline=true;next.preload='auto';
   await new Promise((resolve,reject)=>{const timer=setTimeout(()=>done(new Error('Video loading timed out.')),20000);const done=error=>{clearTimeout(timer);next.onloadeddata=next.onerror=null;error?reject(error):resolve();};next.onloadeddata=()=>done();next.onerror=()=>done(new Error('Unsupported video. Try MP4 (H.264) or WebM.'));next.src=url;});
  }else if(file.type.startsWith('image/')){next=new Image();next.src=url;await next.decode();}
  else throw new Error('Select a video or image file.');
  if(disposed||id!==generation){if(next instanceof HTMLVideoElement){next.removeAttribute('src');next.load();}URL.revokeObjectURL(url);return;}
  release(source);if(objectURL)URL.revokeObjectURL(objectURL);source=next;objectURL=url;playing=true;sourceTime=0;videoObservedTime=-1;videoProgressAt=performance.now();videoLoopRestarting=false;demoTime=0;lastDemo=-1;
  const video=source instanceof HTMLVideoElement;configureSource(video?source.videoWidth:source.naturalWidth,video?source.videoHeight:source.naturalHeight);
  if(video){renderer.historyRate=30;void temporalDecoder.open(file);}else temporalDecoder.close();
  $('filename').textContent=file.name;$('demo').classList.remove('active');$('seek-control').hidden=!video;
  if(video){$('seek').max=Number.isFinite(source.duration)?source.duration:1;$('seek').value=0;watchVideo(source);on(source,'seeked',()=>{const resume=videoLoopRestarting;videoLoopRestarting=false;videoObservedTime=source.currentTime;videoProgressAt=performance.now();sourceTime=source.currentTime;if(resume){temporalPending=false;needsFrame=true;}else requestTemporalSeek(sourceTime);if(resume&&playing)setTimeout(()=>{if(source instanceof HTMLVideoElement&&playing)void source.play().catch(()=>{playing=false;playbackUI();showError('Playback could not restart.');});},0);});on(source,'ended',()=>restartVideoLoop(source));try{await source.play();}catch{playing=false;showError('Press Play to start playback.');}}
  playbackUI();
 }catch(error){if(next instanceof HTMLVideoElement){next.removeAttribute('src');next.load();}URL.revokeObjectURL(url);if(id===generation&&!disposed)showError(error.message);}
}
on($('media-file'),'change',event=>{void loadMedia(event.target.files[0]);event.target.value='';});
on(document,'dragover',event=>event.preventDefault());on(document,'drop',event=>{event.preventDefault();void loadMedia(event.dataTransfer.files[0]);});
on($('seek'),'input',()=>{if(source instanceof HTMLVideoElement){source.currentTime=Number($('seek').value);}});
on($('preset-file'),'change',async event=>{
 const file=event.target.files[0];event.target.value='';if(!file)return;
 try{if(file.size>65536)throw new Error('Preset file is too large (maximum 64 KB).');apply(parsePreset(await file.text()));showError();}catch(error){showError('Could not load preset: '+error.message);}
});
on($('save-preset'),'click',()=>{
 const preset=parsePreset(JSON.stringify({format:'grid-rot-preset',version:2,name:presetName,mode,params,...extensions}));
 const url=URL.createObjectURL(new Blob([JSON.stringify(preset,null,2)+'\n'],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download=(presetName.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'grid-rot')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('preset-status').textContent='Saved: '+presetName;
});

const map=$('grid-map'),mapCtx=map.getContext('2d');
function syncGrid(){
 const grid=gridFor(renderer?.sourceWidth||960,renderer?.sourceHeight||540,params.density);
 const areas=activeAreas(grid,params,mode,renderer?.time||0,renderer?.offset||0);
 $('grid-label').textContent=grid.columns+' × '+grid.rows+(params.fractureDepth?' · ÷'+2**params.fractureDepth:'');
 $('grid-status').textContent=(grid.approximate?'≈ ':'')+grid.baseColumns+':'+grid.baseRows+' base · ×'+params.density+(mode==='drops'?' · '+areas.length+'/'+params.dropCount+' drops'+(params.clusterAmount?' · '+params.clusterCount+' cluster centers':''):' · area '+areas[0].width+' × '+areas[0].height+' cells');
 map.width=384;map.height=Math.max(40,Math.round(384*grid.rows/grid.columns));
 const w=map.width/grid.columns,h=map.height/grid.rows;
 mapCtx.fillStyle='#101818';mapCtx.fillRect(0,0,map.width,map.height);
 for(let y=0;y<grid.rows;y++)for(let x=0;x<grid.columns;x++){
  let hit;for(const area of areas)if(containsCell(x,y,area,grid)&&(!hit||area.strength>hit.strength))hit=area;
  mapCtx.fillStyle=hit?'#8dffd8':'#233431';mapCtx.fillRect(x*w,y*h,Math.max(.5,w-1),Math.max(.5,h-1));
  const scale=hit?fractureScale(x,y,params,hit.tick):1;
  if(scale>1&&w/scale>=1&&h/scale>=1){mapCtx.strokeStyle='#304d45';mapCtx.lineWidth=.6;mapCtx.beginPath();for(let i=1;i<scale;i++){mapCtx.moveTo(x*w+i*w/scale,y*h);mapCtx.lineTo(x*w+i*w/scale,(y+1)*h);mapCtx.moveTo(x*w,y*h+i*h/scale);mapCtx.lineTo((x+1)*w,y*h+i*h/scale);}mapCtx.stroke();}
 }

}
on($('show-grid'),'change',()=>{if(renderer)renderer.overlay=$('show-grid').checked;present();});
on($('step-clock'),'click',()=>{if(playing||!renderer)return;renderer.offset++;present();});

function drawDemo(time){
 ctx.fillStyle='#091112';ctx.fillRect(0,0,960,540);
 ctx.strokeStyle='#20332e';ctx.lineWidth=1;for(let x=0;x<960;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,540);ctx.stroke();}for(let y=0;y<540;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(960,y);ctx.stroke();}
 ctx.fillStyle='#869a92';ctx.font='13px monospace';ctx.fillText('REWIRED-VFX / MOTION TEST',36,38);ctx.fillText('SOURCE 01     '+time.toFixed(2)+'s',36,512);
 ctx.save();ctx.translate(480+Math.sin(time*.9)*145,260+Math.cos(time*1.2)*60);ctx.rotate(Math.sin(time*.5)*.25);
 const colors=['#8dffd8','#e4f39c','#ff674b'];colors.forEach((color,i)=>{ctx.fillStyle=color;ctx.fillRect(-180+i*125,-105,112,180);ctx.fillStyle='#0b1613';for(let n=0;n<5;n++)ctx.fillRect(-173+i*125,-90+n*32,60+n*7,4);});
 ctx.fillStyle='#eef5e8';ctx.font='bold 76px Arial';ctx.textAlign='center';ctx.fillText('SIGNAL',0,145);ctx.restore();
 ctx.strokeStyle='#f2f7e9';ctx.lineWidth=5;ctx.beginPath();ctx.arc(480+Math.cos(time*1.1)*330,270+Math.sin(time*1.4)*170,36,0,Math.PI*2);ctx.stroke();
}
function loop(now){
 if(disposed)return;
 const dt=lastRAF?Math.min((now-lastRAF)/1000,.1):0;lastRAF=now;
 try{
  if(source===demo){if(playing&&!document.hidden)demoTime+=dt;const frame=Math.floor(demoTime*30);if(frame!==lastDemo){drawDemo(frame/30);lastDemo=frame;needsFrame=true;sourceTime=frame/30;}}
  else if(source instanceof HTMLVideoElement&&playing){const t=source.currentTime,frameDuration=1/(renderer.historyRate||30);if(Math.abs(t-videoObservedTime)>.0001){videoObservedTime=t;videoProgressAt=now;}if(Number.isFinite(source.duration)&&source.duration-t<=Math.max(.05,frameDuration*1.25)&&now-videoProgressAt>120)restartVideoLoop(source);else if(!source.requestVideoFrameCallback&&t!==sourceTime){sourceTime=t;needsFrame=true;}}
  else if(source instanceof HTMLImageElement&&playing&&!document.hidden){demoTime+=dt;const frame=Math.floor(demoTime*30);if(frame!==lastDemo){sourceTime=frame/30;lastDemo=frame;needsFrame=true;}}
  if(needsFrame&&!temporalPending&&!document.hidden&&!(source instanceof HTMLVideoElement&&source.seeking)){
   renderer.update(source,params,mode,sourceTime);present();needsFrame=false;statsFrames++;if($('decoder-status'))$('decoder-status').textContent=temporalDecoder.status.message+' · History '+renderer.historyCount+' / 32';
   if(source instanceof HTMLVideoElement){$('seek').value=source.currentTime;const seconds=Math.floor(source.currentTime);$('timecode').textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');}
  }
  if(now-statsTime>1000){$('fps').textContent=playing?Math.round(statsFrames*1000/(now-statsTime))+' FPS':'PAUSED';statsFrames=0;statsTime=now;}
  raf=requestAnimationFrame(loop);
 }catch(error){playing=false;playbackUI();showError('Preview stopped: '+error.message);}
}
function start(){
 if(started)return;
 try{renderer=new GridRenderer($('preview'));renderer.resize(960,540);started=true;playbackUI();lastRAF=0;statsTime=performance.now();raf=requestAnimationFrame(loop);}catch(error){showError(error.message);}
}
on($('preview'),'webglcontextlost',event=>{event.preventDefault();cancelAnimationFrame(raf);showError('Graphics context lost. Reload the page to restart the preview.');});
on(document,'visibilitychange',()=>{lastRAF=0;if(!document.hidden)resetMotion();});
const key='grid-rot.photosensitivity-warning.dismissed';let accepted=false;try{accepted=localStorage.getItem(key)==='true';}catch{}
on($('warning-form'),'submit',event=>{event.preventDefault();if($('dismiss-warning').checked)try{localStorage.setItem(key,'true');}catch{}$('photosensitivity-warning').hidden=true;start();});
if(accepted){$('photosensitivity-warning').hidden=true;start();}
on(window,'pagehide',event=>{if(event.persisted)return;disposed=true;generation++;if(temporalSeekTimer)clearTimeout(temporalSeekTimer);cancelAnimationFrame(raf);release(source);temporalDecoder.destroy();if(objectURL)URL.revokeObjectURL(objectURL);renderer?.destroy();events.abort();});
sync();$('preset-description').textContent=presets.find(p=>p.id===presetId).description;

syncGrid();
function extensionChanged(){custom();syncPackageSummaries();present();}
function addRange(container,section,key,label,min,max,step){
 const wrap=document.createElement('div');wrap.className='extension-control control';const heading=document.createElement('div');heading.className='control-heading';const text=document.createElement('label');text.textContent=label;const number=document.createElement('input');number.type='number';const range=document.createElement('input');range.type='range';
 for(const input of [number,range]){input.min=min;input.max=max;input.step=step;}const update=value=>{if(!Number.isFinite(value))return;extensions[section][key]=Math.max(min,Math.min(max,value));number.value=range.value=extensions[section][key];extensionChanged();};
 on(range,'input',()=>update(Number(range.value)));on(number,'input',()=>update(number.valueAsNumber));heading.append(text,number);wrap.append(heading,range);container.append(wrap);extensionControls.push(()=>number.value=range.value=extensions[section][key]);
}
function addSelect(container,section,key,label,options){
 const wrap=document.createElement('label');wrap.textContent=label;const select=document.createElement('select');for(const [value,name]of options)select.append(new Option(name,value));on(select,'change',()=>{extensions[section][key]=select.value;extensionChanged();});wrap.append(select);container.append(wrap);extensionControls.push(()=>select.value=extensions[section][key]);
}
function addCheck(container,section,key,label){
 const wrap=document.createElement('label');wrap.className='route-toggle';const input=document.createElement('input');input.type='checkbox';wrap.append(input,document.createTextNode(label));on(input,'change',()=>{extensions[section][key]=input.checked;extensionChanged();});container.append(wrap);extensionControls.push(()=>input.checked=Boolean(extensions[section][key]));
}
const targetingControls=$('targeting-controls');for(const [key,label]of [['uniform','Uniform'],['bright','Bright'],['dark','Dark'],['edges','Edges'],['motion','Motion'],['bias','Bias strength']])addRange(targetingControls,'targeting',key,label,0,1,.01);
const infectionControls=$('infection-controls');for(const [key,label,min,max,step]of [['amount','Amount',0,1,.01],['radius','Radius',0,32,.25],['speed','Speed',0,60,.1],['decay','Decay',0,10,.05],['mutation','Mutation',0,1,.01]])addRange(infectionControls,'infection',key,label,min,max,step);
addSelect(infectionControls,'infection','direction','Direction',[['all','All'],['horizontal','Horizontal'],['vertical','Vertical'],['route','Route direction']]);
const topologyControls=$('topology-controls');addSelect(topologyControls,'topology','type','Topology',[['rect','Rect grid'],['shards','Diagonal shards'],['voronoi','Voronoi']]);
for(const [key,label,min,max,step]of [['jitter','Jitter',0,1,.01],['skew','Skew',-1,1,.01],['warpAmount','Warp amount',0,2,.01],['warpSpeed','Warp speed',0,10,.05]])addRange(topologyControls,'topology',key,label,min,max,step);
const temporalControls=$('temporal-controls');addCheck(temporalControls,'temporal','enabled','Enable 32-frame cell memory');addRange(temporalControls,'temporal','range','Frame range',1,32,1);
for(const [key,label]of [['hold','Hold'],['delay','Delay'],['stutter','Stutter'],['reverse','Reverse'],['smear','Time smear']])addRange(temporalControls,'temporal',key,label,0,1,.01);
const operatorControls=$('operator-controls');
for(const definition of operatorDefinitions){
 const row=document.createElement('div');row.className='operator-row';const label=document.createElement('label'),enabled=document.createElement('input');enabled.type='checkbox';label.append(enabled,document.createTextNode(definition.label));
 const weight=document.createElement('input'),strength=document.createElement('input');for(const [input,max,value]of [[weight,100,0],[strength,2,1]]){input.type='number';input.min=0;input.max=max;input.step=.05;input.value=value;}
 const change=()=>{const operator=extensions.operators[definition.id];operator.enabled=enabled.checked;operator.weight=Math.max(0,Math.min(100,weight.valueAsNumber||0));operator.strength=Math.max(0,Math.min(2,strength.valueAsNumber||0));extensionChanged();};
 on(enabled,'change',change);on(weight,'input',change);on(strength,'input',change);row.append(label,weight,strength);
 for(const key of Object.keys(definition.settings)){const setting=document.createElement('div');setting.className='operator-settings';const title=document.createElement('span');title.textContent=key;const input=document.createElement('input');input.type='number';input.step=.1;input.min=-32;input.max=32;on(input,'input',()=>{if(Number.isFinite(input.valueAsNumber)){extensions.operators[definition.id].settings[key]=input.valueAsNumber;extensionChanged();}});setting.append(title,input);row.append(setting);extensionControls.push(()=>input.value=extensions.operators[definition.id].settings[key]??0);}
 operatorControls.append(row);extensionControls.push(()=>{const operator=extensions.operators[definition.id];enabled.checked=operator.enabled;weight.value=operator.weight;strength.value=operator.strength;});
}
sync();
void initializeCompanion({
 applyStateText(text){apply(companionStateToPreset(text));},
 currentStateText(){
  return JSON.stringify(presetToCompanionState({format:'grid-rot-preset',version:2,name:presetName,mode,params,...extensions}));
 },
 applyPreview(image){
  generation++;release(source);temporalDecoder.close();if(objectURL)URL.revokeObjectURL(objectURL);objectURL='';
  source=image;playing=false;sourceTime=0;lastDemo=-1;
  $('filename').textContent='RESOLVE SOURCE SNAPSHOT';$('demo').classList.remove('active');$('seek-control').hidden=true;
  configureSource(image.naturalWidth,image.naturalHeight);playbackUI();needsFrame=true;
 },
 showError
}).catch(error=>showError('Companion could not start: '+error));
