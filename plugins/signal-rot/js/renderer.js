import {retention} from './params.js';
// Two-scale backward block matching, then a bounded-resolution feedback image.
// Only update() advances memory. present() is safe while paused or bypassed.
const vertex=`#version 300 es
out vec2 uv;
void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
const prefix=`#version 300 es
precision highp float;
in vec2 uv;out vec4 color;
float luma(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
`;
const copy=prefix+`uniform sampler2D image;void main(){color=texture(image,uv);}`;
const flow=prefix+`
uniform sampler2D currentFrame,previousFrame,coarseFlow;
uniform vec2 size;uniform float refine;
float cost(vec2 offset){
 float error=0.;
 for(int i=0;i<5;i++){
  vec2 d=i==0?vec2(0):i==1?vec2(1,0):i==2?vec2(-1,0):i==3?vec2(0,1):vec2(0,-1);
  vec3 a=texture(currentFrame,uv+d/size).rgb;
  vec3 b=texture(previousFrame,clamp(uv+d/size+offset,vec2(0),vec2(1))).rgb;
  error+=dot(abs(a-b),vec3(.3,.45,.25));
 }
 return error*.2;
}
void main(){
 vec2 base=refine>.5?(texture(coarseFlow,uv).rg*255.-128.)*.25/(size*.5):vec2(0);
 vec2 best=vec2(0);float bestCost=cost(best);
 for(int y=-4;y<=4;y++)for(int x=-4;x<=4;x++){
  if(refine>.5&&(abs(x)>2||abs(y)>2))continue;
  vec2 offset=base+vec2(x,y)/size;
  float c=cost(offset)+length(offset*size)*.0005;
  if(c<bestCost){bestCost=c;best=offset;}
 }
 float difference=cost(vec2(0));
 // Exact zero is 128, so a stationary frame never acquires a rounding drift.
 color=vec4((clamp(best*size*4.,vec2(-127),vec2(127))+128.)/255.,difference,1.);
}`;
const feedback=prefix+`
uniform sampler2D currentFrame,history,motion;
uniform vec2 size,flowSize;
uniform float keep,flowStrength,blockSize,sensitivity,edges,mode;
float edge(vec2 p){vec2 d=1./size;return clamp(length(vec2(
 luma(texture(currentFrame,p+vec2(d.x,0)).rgb)-luma(texture(currentFrame,p-vec2(d.x,0)).rgb),
 luma(texture(currentFrame,p+vec2(0,d.y)).rgb)-luma(texture(currentFrame,p-vec2(0,d.y)).rgb)))*3.,0.,1.);}
void main(){
 vec2 lookup=mode==1.?(floor(uv*size/blockSize)+.5)*blockSize/size:uv;
 vec4 m=texture(motion,lookup);
 vec2 velocity=(m.rg*255.-128.)*.25/flowSize;
 float activity=smoothstep(mix(.16,.006,sensitivity),mix(.3,.05,sensitivity),m.b+length(velocity)*2.);
 vec2 p=uv+velocity*flowStrength*activity;
 vec4 fresh=texture(currentFrame,uv);
 vec4 old=texture(history,clamp(p,vec2(0),vec2(1)));
 float inside=step(0.,p.x)*step(p.x,1.)*step(0.,p.y)*step(p.y,1.);
 float e=edge(uv);
 if(mode==2.){
  vec3 ink=fresh.rgb*(.10+e*1.8);
  vec3 trail=old.rgb*keep;
  color=vec4(max(ink,trail*inside),fresh.a);
 }else{
  float memory=keep*mix(.45,1.,activity)*(1.-e*edges)*inside;
  color=mix(fresh,old,memory);
 }
}`;
const display=prefix+`uniform sampler2D currentFrame,history;uniform float amount;void main(){color=mix(texture(currentFrame,uv),texture(history,uv),amount);}`;

export class RotRenderer {
 constructor(canvas){
  this.canvas=canvas;this.gl=canvas.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:true});
  if(!this.gl)throw new Error('WebGL 2 is unavailable. Enable browser hardware acceleration.');
  this.programs=[];this.targets=[];this.textures=[];
  try{this.copy=this.program(copy);this.flow=this.program(flow);this.feedback=this.program(feedback);this.display=this.program(display);this.upload=this.texture();this.valid=false;}catch(error){this.destroy();throw error;}
 }
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
 target(width,height){const gl=this.gl;const texture=this.texture();gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);const framebuffer=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);const result={texture,framebuffer,width,height};this.targets.push(result);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Could not allocate preview buffers.');return result;}
 resize(width,height){
  if(this.width===width&&this.height===height)return;
  const gl=this.gl;for(const target of this.targets){gl.deleteFramebuffer(target.framebuffer);gl.deleteTexture(target.texture);this.textures=this.textures.filter(t=>t!==target.texture);}this.targets=[];
  this.width=width;this.height=height;this.canvas.width=width;this.canvas.height=height;
  this.frames=[this.target(width,height),this.target(width,height)];this.memory=[this.target(width,height),this.target(width,height)];
  // Even analysis dimensions keep the coarse-to-fine ratio exact for portrait too.
  this.fw=Math.max(2,Math.round(width/6/2)*2);this.fh=Math.max(2,Math.round(height/6/2)*2);
  this.coarse=this.target(this.fw/2,this.fh/2);this.fine=this.target(this.fw,this.fh);this.valid=false;
 }
 draw(program,target,textures,values={}){
  const gl=this.gl;gl.bindFramebuffer(gl.FRAMEBUFFER,target?.framebuffer??null);gl.viewport(0,0,target?.width??this.width,target?.height??this.height);gl.useProgram(program.program);
  let unit=0;for(const [name,texture]of Object.entries(textures)){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(program.uniforms[name].location,unit++);}
  for(const [name,value]of Object.entries(values)){const u=program.uniforms[name];if(!u)continue;if(Array.isArray(value))gl.uniform2f(u.location,...value);else gl.uniform1f(u.location,value);}
  gl.drawArrays(gl.TRIANGLES,0,3);
 }
 reset(){this.valid=false;}
 update(source,params,mode,dt){
  const gl=this.gl;gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.upload);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
  this.draw(this.copy,this.frames[0],{image:this.upload});
  const freshStart=!this.valid;
  if(freshStart){this.draw(this.copy,this.memory[0],{image:this.frames[0].texture});this.valid=true;}
  else{
   this.draw(this.flow,this.coarse,{currentFrame:this.frames[0].texture,previousFrame:this.frames[1].texture,coarseFlow:this.fine.texture},{size:[this.fw/2,this.fh/2],refine:0});
   this.draw(this.flow,this.fine,{currentFrame:this.frames[0].texture,previousFrame:this.frames[1].texture,coarseFlow:this.coarse.texture},{size:[this.fw,this.fh],refine:1});
  }
   this.draw(this.feedback,this.memory[1],{currentFrame:this.frames[0].texture,history:this.memory[0].texture,motion:this.fine.texture},{size:[this.width,this.height],flowSize:[this.fw,this.fh],keep:freshStart?0:retention(Math.min(.25,dt),params.memory),flowStrength:params.flow,blockSize:params.block,sensitivity:params.sensitivity,edges:params.edges,mode:['melt','block','ghost'].indexOf(mode)});
   this.memory.reverse();
  this.frames.reverse();
 }
 present(amount,bypass=false){if(this.valid)this.draw(this.display,null,{currentFrame:this.frames[1].texture,history:this.memory[0].texture},{amount:bypass?0:amount});}
 destroy(){const gl=this.gl;for(const target of this.targets)gl.deleteFramebuffer(target.framebuffer);for(const texture of this.textures)gl.deleteTexture(texture);for(const p of this.programs)gl.deleteProgram(p.program);this.targets=[];this.textures=[];this.programs=[];}
}
