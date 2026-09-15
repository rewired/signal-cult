import {enableCtrlDragSnapping} from '../js/master-controls.js';
import {parsePreset,stringifyPreset,stepPresetName} from '../js/presets.js';
import {initializeCompanion} from '../js/companion-adapter.js';
import {controls,presets,presetStyles,getBuiltInPreset,maskTypes,choiceTypes,toggleIds,integerIds,colorIds} from '../lib/crt-params.js';
import {CRTRenderer} from '../lib/crt-renderer.js';
import {registerCRTTools} from '../lib/crt-webmcp.js';
import {testPattern} from './test-pattern.js';
const $=id=>document.getElementById(id);
const lifecycle=new AbortController();
const on=(target,event,fn)=>target.addEventListener(event,fn,{signal:lifecycle.signal});
const state={params:getBuiltInPreset('Studio / PVM').params,maskType:0,preset:'Studio / PVM',playing:true,expanded:false};
const canvas=$('preview');
let hostSession=false;
let currentPresetName=state.preset;
let source=testPattern(),renderer,mediaURL='',loadId=0,frame=0,clock=0,disposed=false;
const fields=new Map();
const showError=message=>{ $('error').textContent=message; $('error').hidden=!message; };
function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function custom(){state.preset='custom';currentPresetName='Untitled';$('preset-select').value='custom';$('preset-description').textContent='Custom Settings';$('preset-status').textContent='Current settings';}
function options(select,types){for(const type of types){const option=document.createElement('option');option.value=type.id;option.textContent=`${String(type.id+1).padStart(2,'0')} · ${type.name}`;select.append(option);}}
function typePicker(parent,label,types,get,set){const wrap=document.createElement('div');wrap.className='noise-picker';const l=document.createElement('label');l.className='maskselect';l.append(label);const select=document.createElement('select');options(select,types);l.append(select);const description=document.createElement('p');wrap.append(l,description);parent.append(wrap);const sync=()=>{select.value=get();description.textContent=types.find(t=>t.id===get())?.description||'';};on(select,'change',()=>{set(+select.value);custom();sync();});sync();return sync;}
const linearToSrgb=value=>value<=.0031308?value*12.92:1.055*Math.pow(value,1/2.4)-.055;
const srgbToLinear=value=>value<=.04045?value/12.92:Math.pow((value+.055)/1.055,2.4);
const byteHex=value=>Math.round(Math.max(0,Math.min(1,linearToSrgb(value)))*255).toString(16).padStart(2,'0');
function sciFiColorPicker(parent){
 const wrap=document.createElement('label');wrap.className='sci-fi-color';
 const title=document.createElement('span');title.textContent='Sci-Fi Color';
 const input=document.createElement('input');input.type='color';input.setAttribute('aria-label','Sci-Fi Color');
 const value=document.createElement('code');
 wrap.append(title,input,value);parent.append(wrap);
 const sync=()=>{const hex='#'+colorIds.map(id=>byteHex(state.params[id])).join('');input.value=hex;value.textContent=hex.toUpperCase();};
 on(input,'input',()=>{const bytes=input.value.match(/[0-9a-f]{2}/gi).map(component=>parseInt(component,16)/255);colorIds.forEach((id,index)=>{state.params[id]=srgbToLinear(bytes[index]);});state.params.pixelPalette=6;custom();syncTypes.forEach(update=>update());});
 sync();return sync;
}
const select=$('preset-select');select.append(new Option('Current / custom','custom'));
for(const name of Object.keys(presets))select.append(new Option(name,name));
const syncTypes=[];
for(const [index,group] of ['CRT','Signal','Chroma & Signal','Glow','Monochrome','Motion','Light & Color','Optics','Pixel / Sci-Fi'].entries()){
 const details=document.createElement('section');
 const summary=document.createElement('h2');const label=document.createElement('span');const small=document.createElement('small');small.textContent=`0${index+1}`;label.append(group);summary.append(label);details.append(summary);
 for(const [,id,title] of controls.filter(c=>c[0]===group&&toggleIds.includes(c[1]))){
  const wrap=document.createElement('label');wrap.className='stage-toggle';
  const input=document.createElement('input');input.type='checkbox';input.setAttribute('role','switch');input.checked=state.params[id]===1;
  wrap.append(input,title);details.append(wrap);syncTypes.push(()=>{input.checked=state.params[id]===1;});
  on(input,'change',()=>{state.params[id]=Number(input.checked);custom();});
 }
 if(group==='CRT')syncTypes.push(typePicker(details,'Mask Type',maskTypes,()=>state.maskType,value=>{state.maskType=value;}));
 for(const [,id,title] of controls.filter(c=>c[0]===group&&choiceTypes[c[1]]))syncTypes.push(typePicker(details,title,choiceTypes[id],()=>state.params[id],value=>{state.params[id]=value;}));
 if(group==='Pixel / Sci-Fi')syncTypes.push(sciFiColorPicker(details));
 for(const [,id,title,min,max,step,initial] of controls.filter(c=>c[0]===group&&!choiceTypes[c[1]]&&!toggleIds.includes(c[1])&&!colorIds.includes(c[1]))){
  const wrap=document.createElement('div');wrap.className='control';const heading=document.createElement('div');heading.className='control-heading';const text=document.createElement('label');text.htmlFor=`range-${id}`;text.textContent=title;
  const number=document.createElement('input');number.type='number';number.setAttribute('aria-label',`${title} Value`);
  const range=document.createElement('input');range.type='range';range.id=`range-${id}`;range.setAttribute('aria-label',title);
  for(const input of [number,range]){input.min=min;input.max=max;input.step=step;input.value=state.params[id];}
  const update=value=>{if(integerIds.includes(id))value=Math.round(value);state.params[id]=Math.max(min,Math.min(max,value));number.value=state.params[id];range.value=state.params[id];custom();};
  range.dataset.snapStep=String(step*10);enableCtrlDragSnapping(range);on(range,'input',()=>update(+range.value));on(range,'dblclick',()=>update(initial));
  on(number,'input',()=>{if(number.value!==''&&Number.isFinite(number.valueAsNumber))update(number.valueAsNumber);});on(number,'blur',()=>{number.value=state.params[id];});
  heading.append(text,number);wrap.append(heading,range);details.append(wrap);fields.set(id,{number,range});
 }
 $('controls').append(details);
}
function syncControls(){for(const [id,{number,range}]of fields){number.value=state.params[id];range.value=state.params[id];}syncTypes.forEach(sync=>sync());select.value=state.preset;$('preset-description').textContent=presetStyles[state.preset]?.description||'Custom Settings';}
function apply(name){const preset=getBuiltInPreset(name);state.params=preset.params;state.maskType=preset.maskType;state.preset=name;currentPresetName=name;syncControls();$('preset-status').textContent=`Applied: ${name}`;}
async function renderPresetBrowser(){
 const dialog=$('preset-browser-dialog'),grid=$('preset-grid'),openButton=$('open-preset-browser');
 grid.replaceChildren();dialog.showModal();openButton.disabled=true;$('preset-browser-status').textContent='Rendering current frame...';
 const thumb=document.createElement('canvas');const video=source instanceof HTMLVideoElement;
 const sourceWidth=video?source.videoWidth:(source.naturalWidth||source.width),sourceHeight=video?source.videoHeight:(source.naturalHeight||source.height);
 thumb.width=240;thumb.height=Math.max(90,Math.round(240*sourceHeight/sourceWidth));const thumbRenderer=new CRTRenderer(thumb);
 try{
  const previewTime=video?source.currentTime:clock;
  for(const [index,name] of names.entries()){
   const preset=getBuiltInPreset(name);thumbRenderer.render(source,preset.params,previewTime,false,0,preset.maskType);
   const button=document.createElement('button');button.type='button';button.className='preset-card';button.dataset.preset=name;
   const image=document.createElement('img');image.alt='';image.src=thumb.toDataURL('image/jpeg',.82);
   const copy=document.createElement('span');const title=document.createElement('strong');title.textContent=name;const description=document.createElement('small');description.textContent=presetStyles[name].description;
   copy.append(title,description);button.append(image,copy);on(button,'click',()=>{apply(name);dialog.close();});grid.append(button);
   if(index%4===3)await new Promise(resolve=>requestAnimationFrame(resolve));
  }
  $('preset-browser-status').textContent=`${names.length} looks rendered from the current frame`;
 }catch(error){showError('Could not render preset previews: '+error.message);dialog.close();}
 finally{thumbRenderer.destroy();openButton.disabled=false;}
}
on($('open-preset-browser'),'click',()=>{void renderPresetBrowser();});
on($('close-preset-browser'),'click',()=>$('preset-browser-dialog').close());

const names=Object.keys(presets);
function stepPreset(delta){const name=stepPresetName(names,select.value,delta);if(name)apply(name);}
on($('preset-previous'),'click',()=>stepPreset(-1));on($('preset-next'),'click',()=>stepPreset(1));
on($('use-test'),'click',()=>{if(hostSession)return;release(source);if(mediaURL)URL.revokeObjectURL(mediaURL);mediaURL='';source=testPattern();canvas.width=source.width;canvas.height=source.height;clock=0;state.playing=true;$('filename').textContent='TEST PATTERN';$('use-test').classList.add('active');transport();});
on(select,'change',()=>{if(select.value!=='custom')apply(select.value);});on($('reset'),'click',()=>apply('Studio / PVM'));
on($('maximize'),'click',()=>{state.expanded=!state.expanded;$('app').classList.toggle('preview-focus',state.expanded);$('maximize').textContent=state.expanded?'Show Controls':'Maximize';$('maximize').setAttribute('aria-pressed',String(state.expanded));});
function transport(){$('play').textContent=state.playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',state.playing?'Pause':'Play');}
on($('play'),'click',async()=>{state.playing=!state.playing;if(source instanceof HTMLVideoElement){if(state.playing)try{await source.play();}catch{state.playing=false;showError('Playback could not start.');}else source.pause();}transport();});
function release(media){if(media instanceof HTMLVideoElement){media.pause();media.removeAttribute('src');media.load();}}
async function load(file){if(!file||hostSession)return;const id=++loadId;showError('');const url=URL.createObjectURL(file);let next;
 try{
  if(file.type.startsWith('video/')){next=document.createElement('video');next.muted=true;next.loop=true;next.playsInline=true;next.preload='auto';await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{next.onloadeddata=next.onerror=null;reject(new Error('Video loading timed out.'));},30000);next.onloadeddata=()=>{clearTimeout(timer);next.onloadeddata=next.onerror=null;resolve();};next.onerror=()=>{clearTimeout(timer);next.onloadeddata=next.onerror=null;reject(new Error('Unsupported video format. Try MP4 (H.264) or WebM.'));};next.src=url;});}
  else if(file.type.startsWith('image/')){next=new Image();next.src=url;await next.decode();}else throw new Error('Select an image or video.');
  if(id!==loadId||disposed){release(next);URL.revokeObjectURL(url);return;}
  release(source);if(mediaURL)URL.revokeObjectURL(mediaURL);source=next;mediaURL=url;state.playing=true;$('filename').textContent=file.name;$('use-test').classList.remove('active');
  const video=source instanceof HTMLVideoElement;const w=video?source.videoWidth:source.naturalWidth,h=video?source.videoHeight:source.naturalHeight;const scale=Math.min(1,1920/Math.max(w,h));canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));
  if(video){try{await source.play();}catch{state.playing=false;showError('Press Play to start playback.');}}
  transport();
 }catch(error){release(next);URL.revokeObjectURL(url);if(id===loadId&&!disposed)showError(error.message);}
}
on($('load'),'click',()=>$('media-file').click());on($('media-file'),'change',()=>{void load($('media-file').files[0]);$('media-file').value='';});
on($('app'),'dragover',event=>event.preventDefault());on($('app'),'drop',event=>{event.preventDefault();void load(event.dataTransfer.files[0]);});
on($('save-preset'),'click',()=>{
 const preset={version:1,name:currentPresetName,maskType:state.maskType,params:state.params};
 const safeName=currentPresetName.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'crt-sim-preset';
 download(new Blob([stringifyPreset(preset)],{type:'application/json'}),safeName+'.json');
 $('preset-status').textContent='Saved: '+currentPresetName;
});
function loadPresetText(text){
 const preset=parsePreset(text);
 state.params=preset.params;state.maskType=preset.maskType;state.preset='custom';currentPresetName=preset.name;
 syncControls();$('preset-status').textContent='Loaded: '+preset.name;
}
on($('preset-file'),'change',async()=>{
 const file=$('preset-file').files[0];$('preset-file').value='';if(!file)return;
 try{if(file.size>64*1024)throw new Error('Preset file is too large (maximum 64 KB).');loadPresetText(await file.text());showError('');}
 catch(error){showError('Could not load preset: '+error.message);}
});
const unregister=registerCRTTools(apply);
syncControls();$('preset-status').textContent='Applied: '+currentPresetName;transport();
let last=performance.now(),report=last,frames=0;
function loop(now){if(state.playing)clock+=Math.min((now-last)/1000,.25);last=now;
 try{renderer.render(source,state.params,source instanceof HTMLVideoElement?source.currentTime:clock,false,0,state.maskType);}catch(error){showError(error.message);return;}
 frames++;if(now-report>750){$('fps').textContent=`${Math.round(frames*1000/(now-report))} FPS`;frames=0;report=now;}
 frame=requestAnimationFrame(loop);
}

async function start(){
 try{
  await initializeCompanion({
   applyPresetText(text){const json=JSON.parse(text);loadPresetText(text);hostSession=true;clock=Number.isFinite(json.previewTime)?json.previewTime:0;state.playing=false;$('play').disabled=true;transport();},
   currentPresetText(){return stringifyPreset({version:1,name:currentPresetName,maskType:state.maskType,params:state.params});},
   applyPreview(preview){source=preview;canvas.width=preview.naturalWidth;canvas.height=preview.naturalHeight;$('filename').textContent='RESOLVE SOURCE SNAPSHOT';},
   showError
  });
  renderer=new CRTRenderer(canvas);frame=requestAnimationFrame(loop);
 }catch(error){showError(error.message);}
}
const warning=$('photosensitivity-warning');
const accepted=()=>{try{return localStorage.getItem('crt-sim.photosensitivity-warning.dismissed')==='true';}catch{return false;}};
if(accepted()){warning.hidden=true;void start();}
else on($('photosensitivity-form'),'submit',event=>{event.preventDefault();if($('photosensitivity-dismiss').checked)try{localStorage.setItem('crt-sim.photosensitivity-warning.dismissed','true');}catch{}warning.hidden=true;void start();});

function dispose(){disposed=true;loadId++;cancelAnimationFrame(frame);lifecycle.abort();unregister();release(source);if(mediaURL)URL.revokeObjectURL(mediaURL);renderer?.destroy();}
on(window,'pagehide',event=>{if(!event.persisted)dispose();});
