import {BucketChain,STAGES,outputTap} from './params.js';
const vertex=`#version 300 es
out vec2 uv;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
const header=`#version 300 es
precision highp float;precision highp sampler2DArray;
in vec2 uv;out vec4 color;
`;
const capture=header+`uniform sampler2D source,previousOutput;uniform float feedback;void main(){color=mix(texture(source,uv),texture(previousOutput,uv),feedback);}`;
const stage=header+`
uniform sampler2D source;uniform sampler2DArray buckets;
uniform float slot,filled,carrier,wave,damage,tick,areaScale,carrierCell,waveCell,emptyBlack;
vec4 sampleStage(vec2 p){return filled>.5?texture(buckets,vec3(clamp(p,vec2(0),vec2(1)),slot)):(emptyBlack>.5?vec4(0,0,0,1):texture(source,p));}
float region(float cell){
 vec2 center=vec2(mod(cell,8.),floor(cell/8.));
 vec2 lower=clamp(center-vec2((areaScale-1.)*.5),vec2(0),vec2(8.-areaScale))/8.;
 vec2 upper=lower+areaScale/8.;vec2 point=vec2(uv.x,1.-uv.y);
 return step(lower.x,point.x)*step(point.x,upper.x)*step(lower.y,point.y)*step(point.y,upper.y);
}
void main(){
 float c=carrier*damage*region(carrierCell),w=wave*damage*region(waveCell);
 float row=floor(uv.y*36.);
 float tear=sin(row*7.13+slot*1.7)*c*.07;
 float ripple=sin(row*.71+tick*.27)*w*.035;
 vec2 p=uv+vec2(tear+ripple,c*.015*sin(slot));
 float chroma=c*.014+w*.009;
 vec4 base=sampleStage(p);
 vec3 rgb=vec3(sampleStage(p+vec2(chroma,0)).r,base.g,sampleStage(p-vec2(chroma,0)).b);
 float levels=mix(256.,8.,clamp(c+w,0.,1.));
 rgb=mix(rgb,floor(rgb*levels+.5)/levels,clamp(c+w,0.,1.));
 color=vec4(rgb,base.a);
}`;
const display=header+`uniform sampler2D source,wet;uniform float amount;void main(){color=mix(texture(source,uv),texture(wet,uv),amount);}`;
export class BucketRenderer{
 constructor(canvas){
  this.canvas=canvas;this.gl=canvas.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:true});if(!this.gl)throw new Error('WebGL 2 is required. Enable browser hardware acceleration.');
  this.chain=new BucketChain();this.programs=[];this.textures=[];this.fb=this.gl.createFramebuffer();
  try{this.captureProgram=this.program(capture);this.stageProgram=this.program(stage);this.displayProgram=this.program(display);this.source=this.texture();this.wet=this.texture();}catch(error){this.destroy();throw error;}
  this.accumulator=0;this.ready=false;this.memoryScale=2;
 }
 program(fragment){const gl=this.gl;const program=gl.createProgram();const shaders=[];try{
  for(const [type,text]of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){const s=gl.createShader(type);shaders.push(s);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));gl.attachShader(program,s);}
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));const uniforms={};for(let i=0;i<gl.getProgramParameter(program,gl.ACTIVE_UNIFORMS);i++){const name=gl.getActiveUniform(program,i).name;uniforms[name]=gl.getUniformLocation(program,name);}const p={program,uniforms};this.programs.push(p);return p;
 }catch(error){gl.deleteProgram(program);throw error;}finally{for(const s of shaders)gl.deleteShader(s);}}
 texture(target=this.gl.TEXTURE_2D){const gl=this.gl;const t=gl.createTexture();this.textures.push(t);gl.bindTexture(target,t);gl.texParameteri(target,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(target,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(target,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(target,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
 resize(width,height){if(width===this.width&&height===this.height)return;const gl=this.gl;this.width=width;this.height=height;this.canvas.width=width;this.canvas.height=height;
  gl.bindTexture(gl.TEXTURE_2D,this.wet);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);this.allocateMemory();
 }
 setMemoryScale(scale){if(scale===this.memoryScale)return;this.memoryScale=scale;if(this.width)this.allocateMemory();}
 allocateMemory(){const gl=this.gl;this.bw=Math.max(1,Math.round(this.width*this.memoryScale/3));this.bh=Math.max(1,Math.round(this.height*this.memoryScale/3));
  if(this.buckets){gl.deleteTexture(this.buckets);this.textures=this.textures.filter(t=>t!==this.buckets);}this.buckets=this.texture(gl.TEXTURE_2D_ARRAY);gl.texImage3D(gl.TEXTURE_2D_ARRAY,0,gl.RGBA8,this.bw,this.bh,STAGES,0,gl.RGBA,gl.UNSIGNED_BYTE,null);this.reset();
 }
 bindTarget(kind,layer){const gl=this.gl;if(kind==='screen'){gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,this.width,this.height);return;}gl.bindFramebuffer(gl.FRAMEBUFFER,this.fb);
  if(kind==='bucket'){gl.framebufferTextureLayer(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,this.buckets,0,layer);gl.viewport(0,0,this.bw,this.bh);}else{gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.wet,0);gl.viewport(0,0,this.width,this.height);}
  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Could not allocate delay memory.');
 }
 draw(p,textures,values){const gl=this.gl;gl.useProgram(p.program);let unit=0;for(const [name,[texture,target]]of Object.entries(textures)){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(target??gl.TEXTURE_2D,texture);gl.uniform1i(p.uniforms[name],unit++);}for(const [name,value]of Object.entries(values))gl.uniform1f(p.uniforms[name],value);gl.drawArrays(gl.TRIANGLES,0,3);}
 reset(){this.chain.reset();this.accumulator=0;this.ready=false;}
 upload(media,p,mode){this.setMemoryScale(p.memoryScale);const gl=this.gl;gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.source);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,media);this.params=p;this.mode=mode;this.ready=true;}
 tick(){if(!this.ready)return;const p=this.params;const slot=this.chain.step(p,this.mode);
  this.bindTarget('bucket',slot);this.draw(this.captureProgram,{source:[this.source],previousOutput:[this.wet]},{feedback:this.chain.ticks>1?p.feedback:0});this.renderWet();
 }
 update(media,p,mode,dt){this.upload(media,p,mode);this.accumulator+=Math.max(0,Math.min(dt,.25));let count=0;while(this.accumulator>=1/p.clock&&count<8){this.accumulator-=1/p.clock;this.tick();count++;}this.renderWet();}
 renderWet(){if(!this.ready)return;const p=this.params;const index=outputTap(p)-1;const packet=this.chain.slots[index];const levels=this.chain.levels(p);this.bindTarget('wet');this.draw(this.stageProgram,{source:[this.source],buckets:[this.buckets,this.gl.TEXTURE_2D_ARRAY]},{slot:packet.slot,filled:Number(packet.filled),carrier:levels.carrier[index],wave:levels.wave[index],damage:p.intensity,tick:this.chain.ticks,areaScale:p.areaScale,carrierCell:packet.carrier?.origin??index,waveCell:index,emptyBlack:p.finalOnly});}
 present(amount,bypass=false){if(!this.ready)return;this.renderWet();this.bindTarget('screen');this.draw(this.displayProgram,{source:[this.source],wet:[this.wet]},{amount:bypass?0:amount});}
 destroy(){const gl=this.gl;for(const t of this.textures)gl.deleteTexture(t);for(const p of this.programs)gl.deleteProgram(p.program);gl.deleteFramebuffer(this.fb);}
}
