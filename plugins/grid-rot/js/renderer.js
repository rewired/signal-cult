import {gridFor,activeAreas} from './params.js';
const vertex=`#version 300 es
out vec2 uv;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
const fragment=`#version 300 es
precision highp float;
in vec2 uv;out vec4 color;
uniform sampler2D image;uniform vec2 grid,size;
uniform vec4 regions[16];uniform vec2 traits[16];uniform float regionCount;
uniform float amount,shift,split,crush,overlay,fractureDepth,fractureAmount;
float noise(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
 vec4 fresh=texture(image,uv);vec2 cell=floor(vec2(uv.x,1.-uv.y)*grid);
 bool affected=false;float strength=0.;float tick=0.;
 for(int i=0;i<16;i++){
  if(float(i)>=regionCount)break;
  vec2 local=mod(cell-regions[i].xy+grid,grid);
  if(local.x<regions[i].z&&local.y<regions[i].w&&traits[i].x>strength){affected=true;strength=traits[i].x;tick=traits[i].y;}
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
 cell=floor(vec2(uv.x,1.-uv.y)*fineGrid);
 color=fresh;
 if(affected&&amount>0.){
  float n=noise(cell+floor(tick)*.137);vec2 d=vec2(n-.5,noise(cell+17.)-.5)*2.*shift/fineGrid;
  vec2 p=uv+d;vec2 rgb=vec2(split/fineGrid.x,0);
  vec3 damaged=vec3(texture(image,p+rgb).r,texture(image,p).g,texture(image,p-rgb).b);
  float levels=mix(256.,3.,crush);damaged=floor(damaged*(levels-1.)+.5)/(levels-1.);damaged*=1.-crush*n*.6;
  color=vec4(mix(fresh.rgb,damaged,amount*strength),fresh.a);
 }
 if(overlay>.5){vec2 f=fract(vec2(uv.x,1.-uv.y)*fineGrid);vec2 px=fineGrid/size;float line=1.-step(px.x,f.x)*step(px.y,f.y);color.rgb=mix(color.rgb,affected?vec3(.9,.5,1.):vec3(.35,.65,.55),line*.65);}
}`;
export class GridRenderer {
 constructor(canvas){this.canvas=canvas;this.gl=canvas.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:true});if(!this.gl)throw new Error('WebGL 2 is unavailable. Enable browser hardware acceleration.');this.programs=[];this.textures=[];this.time=0;this.offset=0;this.sourceWidth=960;this.sourceHeight=540;this.overlay=false;try{this.display=this.program(fragment);this.upload=this.texture();}catch(error){this.destroy();throw error;}}
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
  let unit=0;for(const [name,texture]of Object.entries(textures)){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(program.uniforms[name].location,unit++);}
  for(const [name,value]of Object.entries(values)){const u=program.uniforms[name];if(!u)continue;if(value instanceof Float32Array){if(u.type===gl.FLOAT_VEC4)gl.uniform4fv(u.location,value);else gl.uniform2fv(u.location,value);}else if(Array.isArray(value))gl.uniform2f(u.location,...value);else gl.uniform1f(u.location,value);}
  gl.drawArrays(gl.TRIANGLES,0,3);
 }

 resize(width,height){this.width=this.canvas.width=width;this.height=this.canvas.height=height;}
 reset(){this.offset=-this.time*(this.mode==='drops'?8:(this.params?.rate||0));}
 update(source,params,mode,time){this.params=params;this.mode=mode;this.time=time;const gl=this.gl;gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.upload);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);this.valid=true;}
 state(){const grid=gridFor(this.sourceWidth,this.sourceHeight,this.params.density);return {grid,areas:activeAreas(grid,this.params,this.mode,this.time,this.offset)};}
 present(amount,bypass=false){if(!this.valid)return;const {grid,areas}=this.state();const regions=new Float32Array(64),traits=new Float32Array(32);areas.forEach((a,i)=>{regions.set([a.x,a.y,a.width,a.height],i*4);traits.set([a.strength,a.tick%65536],i*2);});this.draw(this.display,null,{image:this.upload},{grid:[grid.columns,grid.rows],'regions[0]':regions,'traits[0]':traits,regionCount:areas.length,size:[this.width,this.height],amount:bypass?0:amount,shift:this.params.shift,split:this.params.split,crush:this.params.crush,fractureDepth:this.params.fractureDepth??0,fractureAmount:this.params.fractureAmount??0.65,overlay:!bypass&&amount>0&&this.overlay?1:0});}
 destroy(){for(const t of this.textures)this.gl.deleteTexture(t);for(const p of this.programs)this.gl.deleteProgram(p.program);this.textures=[];this.programs=[];}
}
