import {gridFor,activeAreas} from './params.js';
import {operatorData} from './effects.js';
const vertex=`#version 300 es
out vec2 uv;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
const fragment=`#version 300 es
precision highp float;
in vec2 uv;out vec4 color;
uniform sampler2D image;uniform highp sampler2DArray history;uniform vec2 grid,size;
uniform float historyHead,historyCount,temporalRange,historyRate;uniform vec4 temporalModes;uniform float temporalSmear;
uniform vec4 regions[16];uniform vec2 traits[16];uniform float regionCount;
uniform float amount,shift,split,crush,overlay,fractureDepth,fractureAmount;
uniform float timeline,infectionAmount,infectionRadius,infectionSpeed,infectionDecay,infectionMutation,infectionDirection;
uniform float topologyType,topologyJitter,topologySkew,topologyWarp,topologyWarpSpeed;
uniform float targetUniform,targetBright,targetDark,targetEdges,targetMotion,targetBias;
uniform float opWeights[13],opStrengths[13],opTotal;uniform vec2 opSettings[13];
float noise(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float luma(vec3 value){return dot(value,vec3(.2126,.7152,.0722));}
vec2 topologyCell(vec2 p){vec2 base=floor(p);if(topologyType<1.5)return mod(base,grid);vec2 best=base;float bestDistance=1e9;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 candidate=base+vec2(float(x),float(y));vec2 point=candidate+.5+(vec2(noise(candidate+13.),noise(candidate+71.))-.5)*topologyJitter;float distance=dot(p-point,p-point);if(distance<bestDistance){bestDistance=distance;best=candidate;}}return mod(best+grid,grid);}
int chooseOperator(vec2 p,float tick){if(opTotal<=0.)return -1;float pick=noise(p+tick*.013)*opTotal,used=0.;for(int i=0;i<13;i++){used+=opWeights[i];if(pick<used)return i;}return 12;}
void main(){
 vec4 fresh=texture(image,uv);vec2 mappedUv=uv;
 mappedUv.x+=(mappedUv.y-.5)*topologySkew;mappedUv+=vec2(sin((mappedUv.y+timeline*topologyWarpSpeed)*6.283),cos((mappedUv.x-timeline*topologyWarpSpeed)*6.283))*topologyWarp/grid;
 vec2 lattice=vec2(mappedUv.x,1.-mappedUv.y)*grid;
 if(topologyType<.5)lattice+=vec2((noise(vec2(floor(lattice.y),17.))-.5)*topologyJitter,(noise(vec2(floor(lattice.x),31.))-.5)*topologyJitter);vec2 cell=topologyCell(lattice);


 bool affected=false;float strength=0.;float tick=0.;
 for(int i=0;i<16;i++){
  if(float(i)>=regionCount)break;
  vec2 local=mod(cell-regions[i].xy+grid,grid);bool inside=local.x<regions[i].z&&local.y<regions[i].w;
  vec2 halfSize=regions[i].zw*.5,center=regions[i].xy+halfSize;
  vec2 outside=max(abs(mod(cell-center+grid*.5,grid)-grid*.5)-halfSize,0.);
  float distance=infectionDirection==1.?outside.x:infectionDirection==2.?outside.y:length(outside);
  float cycle=infectionRadius+max(.001,infectionSpeed*infectionDecay);
  float phase=mod(timeline*infectionSpeed+traits[i].y*.001,cycle);
  float infected=infectionAmount*max(0.,1.-distance/max(.001,infectionRadius))*step(distance,min(infectionRadius,phase))*max(0.,1.-max(0.,phase-infectionRadius)/max(.001,infectionSpeed*infectionDecay));
  float candidate=inside?traits[i].x:traits[i].x*infected;if(candidate>strength){affected=candidate>0.;strength=candidate;tick=traits[i].y;}
 }
 float scale=1.;
 if(affected){for(int level=1;level<=3;level++){
  if(float(level)>fractureDepth)break;
  float seed=mod(floor(tick),997.);
  float n=mod(cell.x*73.+cell.y*151.+seed*199.+float(level)*37.,997.);
  float chance=mod(n*n+31.*n+17.,997.)/997.;
  if(chance>=fractureAmount)break;
  scale*=2.;
 }}
 vec2 fineGrid=grid*scale;
 cell=floor(lattice*scale);
 strength=min(1.,strength*(1.+infectionMutation));
 vec2 analysisPx=1./size;float lum=luma(texture(image,uv).rgb);
 float edge=max(abs(luma(texture(image,uv+vec2(analysisPx.x,0)).rgb)-lum),abs(luma(texture(image,uv+vec2(0,analysisPx.y)).rgb)-lum));
 float previousLayer=mod(historyHead-1.+32.,32.);float motion=historyCount>1.?abs(lum-luma(texture(history,vec3(uv,previousLayer)).rgb)):0.;
 float targetTotal=targetUniform+targetBright+targetDark+targetEdges+targetMotion;float targetScore=targetTotal>0.?(targetUniform+targetBright*lum+targetDark*(1.-lum)+targetEdges*edge+targetMotion*motion)/targetTotal:1.;
 strength*=mix(1.,clamp(targetScore,0.,1.),targetBias);affected=strength>0.;
 color=fresh;
 if(affected&&amount>0.){
  float n=noise(cell+floor(tick)*.137);int op=chooseOperator(cell,tick);float os=op<0?0.:opStrengths[op];
  vec2 d=vec2(n-.5,noise(cell+17.)-.5)*2.*shift/fineGrid,p=uv+d;
  vec2 origin=floor(uv*fineGrid)/fineGrid,local=fract(uv*fineGrid),mapped=local;
  if(op==0){float a=opSettings[0].y;mapped+=vec2(cos(a),sin(a))*opSettings[0].x*os;}
  else if(op==1){if(opSettings[1].x<.5||opSettings[1].x>1.5)mapped.x=1.-mapped.x;if(opSettings[1].x>.5)mapped.y=1.-mapped.y;}
  else if(op==2){int turns=int(mod(floor(opSettings[2].x),4.));for(int i=0;i<3;i++){if(i>=turns)break;mapped=vec2(1.-mapped.y,mapped.x);}}
  else if(op==3){mapped=(mapped-.5)/max(.1,mix(1.,opSettings[3].x,os))+.5;}
  else if(op==4){mapped+=vec2(floor(noise(cell+4.)*3.)-1.,floor(noise(cell+9.)*3.)-1.)*opSettings[4].x;}
  if(op>=0&&op<=4)p=origin+mapped/fineGrid+d;
  vec3 damaged=texture(image,p).rgb;
  if(op>=8&&historyCount>1.){
   float frames=max(1.,opSettings[op].x),clock=floor(timeline*max(1.,historyRate)+.5),lag=1.,blend=0.;
   if(op==8){lag=mod(clock,max(1.,temporalRange));blend=temporalModes.x;}
   else if(op==9){lag=frames;blend=temporalModes.y;}
   else if(op==10){lag=mod(clock,frames);blend=temporalModes.z;}
   else if(op==11){lag=1.+2.*mod(clock,frames);blend=temporalModes.w;}
   else {lag=1.+noise(cell)*frames;blend=temporalSmear;}
   lag=min(lag,historyCount-1.);vec3 temporalSample=texture(history,vec3(p,mod(historyHead-lag+32.,32.))).rgb;
   if(op==12){float middle=min(max(1.,floor(frames*.5)),historyCount-1.),tail=min(frames,historyCount-1.);temporalSample=(temporalSample+texture(history,vec3(p,mod(historyHead-middle+32.,32.))).rgb+texture(history,vec3(p,mod(historyHead-tail+32.,32.))).rgb)/3.;}
   damaged=mix(damaged,temporalSample,clamp(blend*os,0.,1.));
  }
  if(op==5)damaged=damaged.gbr;if(op==6)damaged=vec3(opSettings[6].x);if(op==7)damaged=mix(damaged,vec3(noise(cell+uv*opSettings[7].x)),os);
  vec2 rgb=vec2(split/fineGrid.x,0);if(split>0.&&op<0)damaged=vec3(texture(image,p+rgb).r,texture(image,p).g,texture(image,p-rgb).b);
  float levels=mix(256.,3.,crush);damaged=floor(damaged*(levels-1.)+.5)/(levels-1.);damaged*=1.-crush*n*.6;
  color=vec4(mix(fresh.rgb,damaged,amount*strength),fresh.a);
 }
 if(overlay>.5){vec2 f=fract(lattice*scale);vec2 px=fineGrid/size;float line=1.-step(px.x,f.x)*step(px.y,f.y);if(topologyType>.5&&topologyType<1.5)line=max(line,1.-step(max(px.x,px.y),abs(f.x-f.y)));color.rgb=mix(color.rgb,affected?vec3(.9,.5,1.):vec3(.35,.65,.55),line*.65);}
}`;
export class GridRenderer {
 constructor(canvas){this.canvas=canvas;this.historyRate=30;this.gl=canvas.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:true});if(!this.gl)throw new Error('WebGL 2 is unavailable. Enable browser hardware acceleration.');this.programs=[];this.textures=[];this.time=0;this.offset=0;this.sourceWidth=960;this.sourceHeight=540;this.overlay=false;this.historyHead=-1;this.historyCount=0;this.historyCanvas=document.createElement('canvas');this.historyContext=this.historyCanvas.getContext('2d',{alpha:false});try{this.display=this.program(fragment);this.upload=this.texture();const texture=this.gl.createTexture();this.textures.push(texture);this.history={texture,target:this.gl.TEXTURE_2D_ARRAY};}catch(error){this.destroy();throw error;}}
 program(fragment){
  const gl=this.gl;const shaders=[];const program=gl.createProgram();
  try{
   for(const [type,source]of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
    const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));gl.attachShader(program,shader);
   }
   gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
   const uniforms={};for(let i=0;i<gl.getProgramParameter(program,gl.ACTIVE_UNIFORMS);i++){const info=gl.getActiveUniform(program,i);uniforms[info.name]={location:gl.getUniformLocation(program,info.name),type:info.type};}
   const result={program,uniforms};this.programs.push(result);return result;
  }catch(error){gl.deleteProgram(program);throw error;}finally{shaders.forEach(shader=>gl.deleteShader(shader));}
 }
 texture(){const gl=this.gl;const texture=gl.createTexture();this.textures.push(texture);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return texture;}

 draw(program,target,textures,values={}){
  const gl=this.gl;gl.bindFramebuffer(gl.FRAMEBUFFER,target?.framebuffer??null);gl.viewport(0,0,target?.width??this.width,target?.height??this.height);gl.useProgram(program.program);
  let unit=0;for(const [name,value]of Object.entries(textures)){const resource=value?.texture?value:{texture:value,target:gl.TEXTURE_2D};gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(resource.target,resource.texture);gl.uniform1i(program.uniforms[name].location,unit++);}
  for(const [name,value]of Object.entries(values)){const u=program.uniforms[name];if(!u)continue;if(value instanceof Float32Array){if(u.type===gl.FLOAT_VEC4)gl.uniform4fv(u.location,value);else if(u.type===gl.FLOAT_VEC2)gl.uniform2fv(u.location,value);else gl.uniform1fv(u.location,value);}else if(Array.isArray(value))gl.uniform2f(u.location,...value);else gl.uniform1f(u.location,value);}
  gl.drawArrays(gl.TRIANGLES,0,3);
 }

 resize(width,height){this.width=this.canvas.width=width;this.height=this.canvas.height=height;this.historyCanvas.width=width;this.historyCanvas.height=height;const gl=this.gl;gl.bindTexture(gl.TEXTURE_2D_ARRAY,this.history.texture);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage3D(gl.TEXTURE_2D_ARRAY,0,gl.RGBA8,width,height,32,0,gl.RGBA,gl.UNSIGNED_BYTE,null);this.historyHead=-1;this.historyCount=0;}
 resetHistory(){this.historyHead=-1;this.historyCount=0;}
 reset(){this.offset=-this.time*(this.mode==='drops'?8:(this.params?.rate||0));}
 update(source,params,mode,time){this.params=params;this.mode=mode;this.time=time;const gl=this.gl;this.historyContext.drawImage(source,0,0,this.width,this.height);gl.activeTexture(gl.TEXTURE0);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.bindTexture(gl.TEXTURE_2D,this.upload);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.historyCanvas);this.historyHead=(this.historyHead+1)%32;gl.bindTexture(gl.TEXTURE_2D_ARRAY,this.history.texture);gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,this.historyHead,this.width,this.height,1,gl.RGBA,gl.UNSIGNED_BYTE,this.historyCanvas);this.historyCount=Math.min(32,this.historyCount+1);this.valid=true;}
 loadHistoryFrames(frames){const gl=this.gl;this.historyHead=-1;this.historyCount=0;gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);for(const frame of frames){this.historyContext.drawImage(frame,0,0,this.width,this.height);this.historyHead=(this.historyHead+1)%32;gl.bindTexture(gl.TEXTURE_2D_ARRAY,this.history.texture);gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,this.historyHead,this.width,this.height,1,gl.RGBA,gl.UNSIGNED_BYTE,this.historyCanvas);this.historyCount++;frame.close();}}
 state(){const grid=gridFor(this.sourceWidth,this.sourceHeight,this.params.density);return {grid,areas:activeAreas(grid,this.params,this.mode,this.time,this.offset)};}
 present(amount,bypass=false){if(!this.valid)return;const {grid,areas}=this.state(),temporal=this.extensions?.temporal??{},infection=this.extensions?.infection??{},topology=this.extensions?.topology??{},targeting=this.extensions?.targeting??{},ops=operatorData(this.extensions?.operators);const regions=new Float32Array(64),traits=new Float32Array(32);areas.forEach((a,i)=>{regions.set([a.x,a.y,a.width,a.height],i*4);traits.set([a.strength,a.tick%65536],i*2);});this.draw(this.display,null,{image:this.upload,history:this.history},{grid:[grid.columns,grid.rows],'regions[0]':regions,'traits[0]':traits,regionCount:areas.length,size:[this.width,this.height],timeline:this.time,targetUniform:targeting.uniform??1,targetBright:targeting.bright??0,targetDark:targeting.dark??0,targetEdges:targeting.edges??0,targetMotion:targeting.motion??0,targetBias:targeting.bias??0,topologyType:['rect','shards','voronoi'].indexOf(topology.type),topologyJitter:topology.jitter??0,topologySkew:topology.skew??0,topologyWarp:topology.warpAmount??0,topologyWarpSpeed:topology.warpSpeed??0,infectionAmount:infection.amount??0,infectionRadius:infection.radius??0,infectionSpeed:infection.speed??0,infectionDecay:infection.decay??0,infectionMutation:infection.mutation??0,infectionDirection:['all','horizontal','vertical','route'].indexOf(infection.direction),historyHead:this.historyHead,historyCount:this.historyCount,temporalRange:temporal.range??1,historyRate:this.historyRate,temporalModes:temporal.enabled?[temporal.hold??0,temporal.delay??0,temporal.stutter??0,temporal.reverse??0]:[0,0,0,0],temporalSmear:temporal.enabled?temporal.smear??0:0,'opWeights[0]':ops.weights,'opStrengths[0]':ops.strengths,'opSettings[0]':ops.settings,opTotal:ops.total,amount:bypass?0:amount,shift:this.params.shift,split:this.params.split,crush:this.params.crush,fractureDepth:this.params.fractureDepth??0,fractureAmount:this.params.fractureAmount??0.65,overlay:!bypass&&amount>0&&this.overlay?1:0});}
 destroy(){for(const t of this.textures)this.gl.deleteTexture(t);for(const p of this.programs)this.gl.deleteProgram(p.program);this.textures=[];this.programs=[];}
}
