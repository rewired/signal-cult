const vertex=`#version 300 es
in vec2 position;out vec2 uv;
void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;

const surface=`#version 300 es
precision highp float;
in vec2 uv;out vec4 color;
uniform sampler2D sourceImage;
uniform sampler2D previousSource;
uniform sampler2D maskImage;
uniform float threshold;
uniform float surfaceDamage;
uniform float fiberAmount;
uniform float microDetail;
uniform float detailRecovery;
uniform float directionAngle;
uniform float flowInfluence;
uniform float seed;
uniform vec3 inkColor;
uniform int style;
uniform int maskChannel;
uniform bool invertMask;
uniform bool maskEnabled;
uniform int combineMode;
uniform vec4 maskRoutes[9];
float hash(vec2 p){p+=vec2(seed*.1031,seed*.11369);vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float n=0.,a=.55;for(int i=0;i<5;i++){n+=noise(p)*a;p=vec2(p.x*2.03+17.1,p.y*1.91-8.4);a*=.48;}return n;}
float luma(vec3 c){return dot(c,vec3(.299,.587,.114));}
float userMask(vec2 p){if(!maskEnabled)return 1.;vec4 m=texture(maskImage,p);float v=maskChannel==1?m.r:maskChannel==2?m.g:maskChannel==3?m.b:maskChannel==4?m.a:luma(m.rgb);return invertMask?1.-v:v;}
float motionMask(vec2 p){return smoothstep(.025,.2,length(texture(sourceImage,p).rgb-texture(previousSource,p).rgb));}
vec4 sources(vec2 p){float a=userMask(p);float motion=mix(noise(p*vec2(4.,44.)),motionMask(p),flowInfluence);float bands=step(.7,noise(vec2(floor(p.y*96.),0.)));return vec4(a,1.-a,motion,bands);}
float routed(int index,vec2 p){float route=maskRoutes[index].x,target=route<0.?1.-userMask(p):userMask(p);return mix(1.,target,abs(route));}
void main(){
 vec2 texel=1./vec2(textureSize(sourceImage,0));
 vec2 imageSize=vec2(textureSize(sourceImage,0));float aspect=imageSize.x/imageSize.y,angle=radians(directionAngle+maskRoutes[6].y);
 vec2 screenDir=vec2(cos(angle),sin(angle)),screenNormal=vec2(-screenDir.y,screenDir.x);
 vec2 physical=(uv-.5)*vec2(aspect,1.);vec2 oriented=vec2(dot(physical,screenDir),dot(physical,screenNormal))+.5;
 vec3 src=texture(sourceImage,uv).rgb;float tone=luma(src);
 float edge=abs(luma(texture(sourceImage,uv+vec2(texel.x,0.)).rgb)-luma(texture(sourceImage,uv-vec2(texel.x,0.)).rgb))+abs(luma(texture(sourceImage,uv+vec2(0.,texel.y)).rgb)-luma(texture(sourceImage,uv-vec2(0.,texel.y)).rgb));
 float paper=fbm(oriented*vec2(7.,370.))*.55+fbm(oriented*vec2(43.,1450.))*.31;
 float clump=fbm(oriented*vec2(13.,53.));float grit=hash(floor(gl_FragCoord.xy));
 float styleBias=style==1?.08:style==2?-.04:style==3?.13:0.;
 float soft=smoothstep(threshold+styleBias-.11,threshold+styleBias+.08,tone+edge*detailRecovery*.25);
 float toner=step(threshold+styleBias+(grit-.5)*microDetail*.42,tone+edge*detailRecovery*.3);
 float ink=mix(soft,toner,microDetail*.82);
 ink=mix(ink,pow(clamp(tone,0.,1.),.82),detailRecovery*.52);
 float pinholes=smoothstep(.63,.94,paper+(grit-.5)*.22)*surfaceDamage*fiberAmount;
 float dryClumps=smoothstep(.66,.9,clump)*surfaceDamage*.45;
 float horizontalCuts=smoothstep(.84,.99,fbm(oriented*vec2(2.1,920.)))*surfaceDamage*fiberAmount;
 float coverage=clamp(ink*(1.-pinholes*.82-horizontalCuts*.74)*(1.-dryClumps*.35),0.,1.);
 vec3 printed=inkColor*coverage*mix(.62,1.12,clamp(paper,0.,1.));if(style==3)printed*=vec3(1.,.93,.82);
 float surfaceMask=routed(6,uv)*surfaceDamage;
 color=vec4(mix(src,printed,.72+.28*surfaceMask),coverage);
}`;

const effect=`#version 300 es
precision highp float;
in vec2 uv;out vec4 color;
uniform sampler2D sourceImage;
uniform sampler2D materialImage;
uniform sampler2D previousSource;
uniform sampler2D previousFeedback;
uniform sampler2D maskImage;
uniform float time;
uniform float tearAmount;
uniform float bandScale;
uniform float tearComplexity;
uniform float directionAngle;
uniform float crossAmount;
uniform float smearLength;
uniform float waveAmount;
uniform float feedback;
uniform float feedbackDrift;
uniform float threshold;
uniform float surfaceDamage;
uniform float fiberAmount;
uniform float microDetail;
uniform float detailRecovery;
uniform float microEchoes;
uniform float echoDecay;
uniform float glitchGrain;
uniform float erosionHardness;
uniform float accentAmount;
uniform float accentBloom;
uniform float bloomSpread;
uniform float xeroxStrips;
uniform float xeroxGenerations;
uniform float xeroxDrift;
uniform float xeroxDecay;
uniform float flowInfluence;
uniform float seed;
uniform vec3 inkColor;
uniform vec3 accentColor;
uniform int style;
uniform int maskChannel;
uniform bool invertMask;
uniform bool maskEnabled;
uniform int combineMode;
uniform vec4 maskRoutes[9];

float hash(vec2 p){p+=vec2(seed*.1031,seed*.11369);vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fiberNoise(vec2 p){float value=0.,weight=.58;for(int i=0;i<4;i++){value+=noise(p)*weight;p=vec2(p.x*1.91+7.1,p.y*2.07-3.7);weight*=.48;}return value;}
float luma(vec3 c){return dot(c,vec3(.299,.587,.114));}
float userMask(vec2 p){if(!maskEnabled)return 1.;vec4 m=texture(maskImage,p);float v=maskChannel==1?m.r:maskChannel==2?m.g:maskChannel==3?m.b:maskChannel==4?m.a:luma(m.rgb);return invertMask?1.-v:v;}
float motionMask(vec2 p){vec3 a=texture(sourceImage,p).rgb,b=texture(previousSource,p).rgb;return smoothstep(.025,.2,length(a-b));}
vec4 sources(vec2 p){float a=userMask(p);float motion=mix(noise(p*vec2(4.,44.)+vec2(time*.1,0.)),motionMask(p),flowInfluence);float bands=step(.7,noise(vec2(floor(p.y*96.),floor(time*7.))));return vec4(a,1.-a,motion,bands);}
float routed(int index,vec2 p){
 float route=maskRoutes[index].x,target=route<0.?1.-userMask(p):userMask(p);
 return mix(1.,target,abs(route));
}
vec2 screenAxis(float degrees){float a=radians(degrees);return vec2(cos(a),sin(a));}
vec2 uvAxis(float degrees,float aspect){vec2 d=screenAxis(degrees);return normalize(vec2(d.x/aspect,d.y));}
vec2 axisSpace(vec2 p,float degrees,float aspect){vec2 d=screenAxis(degrees),n=vec2(-d.y,d.x),physical=(p-.5)*vec2(aspect,1.);return vec2(dot(physical,d),dot(physical,n))+.5;}
void main(){
 vec2 imageSize=vec2(textureSize(sourceImage,0));float aspect=imageSize.x/imageSize.y;
 float tearAngle=directionAngle+maskRoutes[1].y,displaceAngle=directionAngle+maskRoutes[2].y,smearAngle=directionAngle+maskRoutes[3].y;
 float feedbackAngle=directionAngle+maskRoutes[5].y,surfaceAngle=directionAngle+maskRoutes[6].y,accentAngle=directionAngle+maskRoutes[7].y,flowAngle=directionAngle+maskRoutes[8].y;
 vec2 tearSpace=axisSpace(uv,tearAngle,aspect),smearSpace=axisSpace(uv,smearAngle,aspect),surfaceSpace=axisSpace(uv,surfaceAngle,aspect),feedbackSpace=axisSpace(uv,feedbackAngle,aspect),accentSpace=axisSpace(uv,accentAngle,aspect);
 vec2 displaceAlong=uvAxis(displaceAngle,aspect),displaceAcross=uvAxis(displaceAngle+90.,aspect),smearAlong=uvAxis(smearAngle,aspect),smearAcross=uvAxis(smearAngle+90.,aspect),feedbackAlong=uvAxis(feedbackAngle,aspect),feedbackAcross=uvAxis(feedbackAngle+90.,aspect),flowAlong=uvAxis(flowAngle,aspect);
 float count=max(8.,bandScale),band=floor(tearSpace.y*count);
 float movement=max(motionMask(uv),motionMask(uv+flowAlong*.004)*abs(maskRoutes[8].x))*flowInfluence;
 float event=hash(vec2(band,floor(time*(1.2+flowInfluence*7.))));
 float fineBand=floor(tearSpace.y*count*3.73),coarseBand=floor(tearSpace.y*max(3.,count*.13));
 float fineEvent=hash(vec2(fineBand+131.,floor(time*4.7))),coarseEvent=hash(vec2(coarseBand+379.,floor(time*.83)));
 float mainGate=step(1.-tearAmount*(.48+movement*.35),event);
 float fineGate=step(.78+.18*(1.-tearAmount),fineEvent)*tearComplexity;
 float coarseGate=step(.9+.07*(1.-tearAmount),coarseEvent)*tearComplexity;
 float yWarp=tearSpace.y+(noise(vec2(floor(tearSpace.x*9.),coarseBand+19.))-.5)*.018*tearComplexity;
 float macroCell=floor(yWarp*max(5.,count*.12));
 float macroCenter=hash(vec2(macroCell+503.,floor(time*.7)));
 float macroWidth=mix(.12,.72,hash(vec2(macroCell+907.,seed+11.)));
 float macroWindow=1.-smoothstep(macroWidth,macroWidth+.055,abs(tearSpace.x-macroCenter));
 float ragged=noise(vec2(tearSpace.x*mix(18.,65.,tearComplexity),macroCell*7.3));
 macroWindow*=smoothstep(.19,.55,ragged+macroWidth*.38);
 float segmentedMain=mix(mainGate,mainGate*macroWindow,.62*tearComplexity);
 float tearGate=max(segmentedMain,max(fineGate*mix(.45,macroWindow,.7),coarseGate*macroWindow))*routed(1,uv);
 float wave=sin(tearSpace.y*mix(40.,720.,clamp(count/220.,0.,1.))+time*5.+noise(vec2(band*.09,time))*9.)*waveAmount;
 float offset=((event-.5)*.38+(fineEvent-.5)*.09*tearComplexity+(coarseEvent-.5)*.58*coarseGate)*tearAmount*tearGate+wave*tearGate;
 float crossBand=floor(tearSpace.x*max(6.,count*.71)),crossEvent=hash(vec2(crossBand+2027.,floor(time*1.13)));
 float crossGate=step(1.-crossAmount*.72,crossEvent)*routed(1,uv);
 float crossOffset=(crossEvent-.5)*.34*tearAmount*crossAmount*crossGate;
 vec2 displaced=uv+displaceAlong*offset*routed(2,uv)+displaceAcross*crossOffset*routed(2,uv);
 vec4 material=texture(materialImage,displaced);vec3 source=material.rgb;
 vec3 smeared=vec3(0.);float total=0.;
 float smearVariation=mix(.3,1.35,hash(vec2(band+811.,floor(time*2.))));
 for(int i=0;i<20;i++){float f=float(i)/19.,w=exp(-f*mix(2.4,5.2,fineEvent)),keep=step(.12,hash(vec2(float(i),band+29.)));float distance=f*smearLength*(.18+tearGate)*smearVariation;vec3 primarySmear=texture(materialImage,displaced-smearAlong*distance).rgb,secondarySmear=texture(materialImage,displaced-smearAcross*distance).rgb;smeared+=mix(primarySmear,secondarySmear,crossAmount*crossGate)*w*keep;total+=w*keep;}
 source=mix(source,smeared/max(total,.001),routed(3,uv)*(.14+.86*tearGate));

 // Fine, same-scanline micro echoes: repeated source fragments decay and perforate along x.
 float echoBand=floor(smearSpace.y*count*2.17),echoEvent=hash(vec2(echoBand+1201.,floor(time*2.1)));
 float echoGate=step(.66+.22*(1.-tearComplexity),echoEvent)*routed(1,uv)*microEchoes;
 float echoSpacing=mix(.0025,.014,hash(vec2(echoBand+1511.,seed+5.)));
 float echoCenter=hash(vec2(echoBand+1811.,seed+19.)),echoWidth=mix(.08,.43,hash(vec2(echoBand+1907.,seed+23.)));
 float echoFragment=1.-smoothstep(echoWidth,echoWidth+.025,abs(smearSpace.x-echoCenter));
 vec3 echoes=vec3(0.);float echoWeight=0.;
 for(int i=1;i<=7;i++){
  float fi=float(i),decay=exp(-fi*mix(.24,.92,echoDecay)),direction=hash(vec2(echoBand,77.))>.5?1.:-1.;
  float perforation=step(.27+fi*.055,noise(vec2(smearSpace.x*520.-fi*13.,echoBand*.31)));
  float w=decay*perforation;
  vec3 primaryEcho=texture(materialImage,displaced-smearAlong*direction*echoSpacing*fi).rgb,secondaryEcho=texture(materialImage,displaced-smearAcross*direction*echoSpacing*fi).rgb;
  echoes+=mix(primaryEcho,secondaryEcho,crossAmount*crossGate)*w;echoWeight+=w;
 }
 source=max(source,echoes/max(echoWeight,1.)*echoGate*echoFragment*(.42+.5*tearComplexity));

 // Rupture-local dirt: clustered toner loss, pinholes and horizontal dry streaks.
 float coarseDirt=fiberNoise((surfaceSpace+vec2(offset*.17,0.))*vec2(5.5,115.));
 float fineDirt=fiberNoise((surfaceSpace+vec2(offset*.41,0.))*vec2(61.,1320.));
 float dust=hash(floor(gl_FragCoord.xy*vec2(.47,.83))+vec2(band,17.));
 float dryStreak=noise(vec2(surfaceSpace.x*21.+band*.13,surfaceSpace.y*1730.));
 float dirtField=coarseDirt*.48+fineDirt*.27+dust*.13+dryStreak*.12;
 float erosionWidth=mix(.13,.006,erosionHardness);
 float dirtKeep=smoothstep(.34-erosionWidth,.34+erosionWidth,dirtField);
 float ruptureMaterial=clamp(max(tearGate,echoGate*echoFragment)+routed(3,uv)*tearGate,0.,1.);
 source*=mix(1.,dirtKeep,glitchGrain*ruptureMaterial);

 vec2 texel=1./vec2(textureSize(materialImage,0));
 float center=luma(source),left=luma(texture(materialImage,displaced-vec2(texel.x,0.)).rgb),right=luma(texture(materialImage,displaced+vec2(texel.x,0.)).rgb),up=luma(texture(materialImage,displaced+vec2(0.,texel.y)).rgb),down=luma(texture(materialImage,displaced-vec2(0.,texel.y)).rgb);
 float sourceEdge=clamp(abs(right-left)+abs(up-down),0.,1.);
 float longFiber=fiberNoise(surfaceSpace*vec2(7.,360.)),shortFiber=fiberNoise(surfaceSpace*vec2(39.,1180.));
 float paper=longFiber*.58+shortFiber*.42;
 float styleThreshold=style==1?.08:style==2?-.04:style==3?.13:0.;
 float transition=mix(.12,.018,style==1?.84:style==2?.62:.35);
 float grit=hash(floor(gl_FragCoord.xy));
 float stipple=step(threshold+styleThreshold+(grit-.5)*microDetail*.36,center+sourceEdge*detailRecovery*.22);
 float softPrint=smoothstep(threshold+styleThreshold-transition,threshold+styleThreshold+transition,center);
 float photo=pow(clamp(center,0.,1.),mix(1.35,.72,detailRecovery));
 float ink=mix(softPrint,stipple,microDetail*.74);
 ink=mix(ink,photo,detailRecovery*.58);
 ink=clamp(ink+sourceEdge*detailRecovery*.28+(grit-.5)*surfaceDamage*microDetail*.15,0.,1.);
 float dryCut=smoothstep(.61,.93,paper+(grit-.5)*.18)*surfaceDamage*fiberAmount*routed(6,uv);
 float scratches=smoothstep(.73,.98,fiberNoise(surfaceSpace*vec2(2.2,760.)));
 ink*=1.-clamp(dryCut*.72+scratches*surfaceDamage*fiberAmount*.42,0.,.92);
 vec3 printed=mix(source,inkColor*ink*mix(.68,1.06,paper),surfaceDamage*.18);
 if(style==3)printed*=vec3(1.,.96,.91);

 vec3 memory=texture(previousFeedback,uv-feedbackAlong*feedbackDrift*(.3+tearGate)).rgb;
 // Animated multi-generation photocopy strips. Each recurrence loses density and registration.
 float copyCount=mix(18.,138.,clamp(bandScale/220.,0.,1.));
 float copyWarp=(noise(vec2(feedbackSpace.x*7.,floor(time*.43)))-.5)*.009*tearComplexity;
 float copyBand=floor((feedbackSpace.y+copyWarp)*copyCount);
 float copyEpoch=floor(time*(.22+xeroxStrips*1.18));
 float copyBirth=hash(vec2(copyBand+2309.,copyEpoch+seed));
 float copyGate=step(1.-xeroxStrips*.72,copyBirth);
 float copyPhase=sin(time*mix(.31,2.4,xeroxStrips)+hash(vec2(copyBand,91.))*6.2831);
 float stripEdge=fract((feedbackSpace.y+copyWarp)*copyCount);
 copyGate*=smoothstep(0.,.08,stripEdge)*smoothstep(1.,.78,stripEdge);
 vec3 copyMemory=vec3(0.);float copyWeight=0.;
 for(int i=1;i<=6;i++){
  float fi=float(i);if(fi>xeroxGenerations)continue;
  float direction=hash(vec2(copyBand+fi*17.,seed+37.))>.5?1.:-1.;
  float registration=xeroxDrift*fi*direction+copyPhase*xeroxDrift*.24;
  vec3 primaryGeneration=texture(previousFeedback,uv-feedbackAlong*registration).rgb,secondaryGeneration=texture(previousFeedback,uv-feedbackAcross*registration).rgb;
  vec3 generation=mix(primaryGeneration,secondaryGeneration,crossAmount*crossGate);
  float generationGrain=hash(floor(gl_FragCoord.xy/vec2(1.+fi*.34,1.))+vec2(fi*61.,copyEpoch));
  float holes=step(mix(.08,.68,xeroxDecay)*fi/6.,generationGrain);
  float generationWeight=exp(-fi*mix(.13,.72,xeroxDecay))*holes;
  float copiedTone=luma(generation);
  generation*=smoothstep(.08+fi*.025*xeroxDecay,.82,copiedTone+.13);
  copyMemory=max(copyMemory,generation*generationWeight);copyWeight=max(copyWeight,generationWeight);
 }
 memory=max(memory,copyMemory*copyGate*xeroxStrips);
 float deposit=clamp(.08+tearGate*.92+movement*.55,0.,1.)*routed(4,displaced)*mix(1.,dirtKeep,glitchGrain*.72);
 float memoryBreakup=mix(.58,1.,smoothstep(.3,.82,fiberNoise(feedbackSpace*vec2(11.,240.))));
 float persistence=feedback*routed(5,uv)*deposit*memoryBreakup;
 vec3 temporal=max(printed,memory*persistence);
 if(style==4)temporal=mix(temporal,max(temporal,memory*.99),movement);

 float accentBand=floor(accentSpace.y*count);
 float dashNoise=noise(vec2(accentSpace.x*190.+floor(time*2.),accentBand*.73));
 float dash=step(mix(.25,.62,tearComplexity),dashNoise);
 float signalNoise=noise(vec2(accentSpace.y*1000.,floor(time*9.)));
 float trace=smoothstep(.978,1.,signalNoise)*mix(1.,dash,tearComplexity)*routed(7,uv);
 trace+=tearGate*step(.91,hash(vec2(accentBand,seed+3.)))*routed(7,uv);
 float haloThreshold=mix(.955,.69,bloomSpread);
 float halo=smoothstep(haloThreshold,1.,signalNoise);
 float bloomClumps=smoothstep(.24,.72,dashNoise+noise(vec2(accentSpace.x*37.,accentBand*.19))*.35);
 float bloomErosion=mix(1.,dirtKeep,glitchGrain*.82)*mix(.34,1.,bloomClumps);
 float displacedHalo=smoothstep(haloThreshold+.035,1.,noise(vec2((accentSpace.y+(hash(vec2(accentBand,41.))-.5)*.012*bloomSpread)*1000.,floor(time*9.))));
 float ruptureBloom=max(halo,displacedHalo*.62)*bloomErosion*routed(7,uv);
 vec3 accentSignal=accentColor*clamp(trace*accentAmount*2.4+ruptureBloom*accentAmount*accentBloom*.82,0.,1.);
 vec3 result=max(temporal,accentSignal);
 result=mix(source,result,routed(6,uv)*surfaceDamage*.28+.72);
 color=vec4(mix(texture(sourceImage,uv).rgb,result,routed(0,uv)),1.);
}`;

const display=`#version 300 es
precision highp float;in vec2 uv;out vec4 color;
uniform sampler2D rendered;uniform sampler2D sourceImage;uniform sampler2D maskImage;
uniform float amount;uniform int viewMode;uniform int maskChannel;uniform bool invertMask;uniform bool maskEnabled;
float luma(vec3 c){return dot(c,vec3(.299,.587,.114));}
void main(){vec4 m=texture(maskImage,uv);float mask=maskEnabled?(maskChannel==1?m.r:maskChannel==2?m.g:maskChannel==3?m.b:maskChannel==4?m.a:luma(m.rgb)):1.;if(maskEnabled&&invertMask)mask=1.-mask;if(viewMode==2){color=texture(sourceImage,uv);return;}if(viewMode==1){color=vec4(vec3(mask),1);return;}color=mix(texture(sourceImage,uv),texture(rendered,uv),amount);}`;

export class RuptureRenderer{
 constructor(canvas){
  this.canvas=canvas;this.gl=canvas.getContext('webgl2',{alpha:false,antialias:false});
  if(!this.gl)throw new Error('WebGL 2 is required for the RASTER RUPTURE preview.');
  const gl=this.gl;this.surfaceProgram=this.program(surface);this.effectProgram=this.program(effect);this.displayProgram=this.program(display);
  this.quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  this.source=this.texture(gl.LINEAR);this.previousSource=this.texture(gl.LINEAR);this.mask=this.texture(gl.getExtension('OES_texture_float_linear')?gl.LINEAR:gl.NEAREST);
  this.materialTexture=this.texture(gl.LINEAR);this.materialFramebuffer=gl.createFramebuffer();
  this.feedbackTextures=[this.texture(gl.LINEAR),this.texture(gl.LINEAR)];this.framebuffers=[gl.createFramebuffer(),gl.createFramebuffer()];
  this.width=0;this.height=0;this.ping=0;this.hasPrevious=false;this.viewMode=0;this.maskChannel=0;this.invertMask=false;this.maskEnabled=true;
 }
 shader(type,source){const gl=this.gl,s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
 program(fragment){const gl=this.gl,p=gl.createProgram();gl.attachShader(p,this.shader(gl.VERTEX_SHADER,vertex));gl.attachShader(p,this.shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;}
 texture(filter){const gl=this.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,filter);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,filter);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
 bind(program){const gl=this.gl;gl.useProgram(program);const p=gl.getAttribLocation(program,'position');gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);}
 sampler(program,name,texture,unit){const gl=this.gl;gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(gl.getUniformLocation(program,name),unit);}
 resize(width,height){if(width===this.width&&height===this.height)return;const gl=this.gl;this.width=width;this.height=height;this.canvas.width=width;this.canvas.height=height;gl.bindTexture(gl.TEXTURE_2D,this.materialTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.bindFramebuffer(gl.FRAMEBUFFER,this.materialFramebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.materialTexture,0);for(let i=0;i<2;i++){gl.bindTexture(gl.TEXTURE_2D,this.feedbackTextures[i]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.bindFramebuffer(gl.FRAMEBUFFER,this.framebuffers[i]);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.feedbackTextures[i],0);}gl.bindFramebuffer(gl.FRAMEBUFFER,null);this.reset();}
 upload(texture,source){const gl=this.gl;gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);}
 setMask(source){
  const sourceWidth=source.videoWidth||source.naturalWidth||source.width,sourceHeight=source.videoHeight||source.naturalHeight||source.height;
  if(!sourceWidth||!sourceHeight)throw new Error('Mask has no usable dimensions.');
  const scale=Math.min(1,2048/sourceWidth,2048/sourceHeight,Math.sqrt(2073600/(sourceWidth*sourceHeight)));
  const width=Math.max(1,Math.round(sourceWidth*scale)),height=Math.max(1,Math.round(sourceHeight*scale));
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d',{willReadFrequently:true});
  context.translate(0,height);context.scale(1,-1);context.drawImage(source,0,0,width,height);
  const bytes=context.getImageData(0,0,width,height).data,float=new Float32Array(bytes.length);for(let i=0;i<bytes.length;i++)float[i]=bytes[i]/255;
  const gl=this.gl;while(gl.getError()!==gl.NO_ERROR){}gl.bindTexture(gl.TEXTURE_2D,this.mask);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,width,height,0,gl.RGBA,gl.FLOAT,float);
  const error=gl.getError();if(error!==gl.NO_ERROR)throw new Error('Float mask upload failed (WebGL '+error+').');
  this.maskEnabled=true;
 }
 setMaskFrame(source){
  const width=source.videoWidth||source.naturalWidth||source.width,height=source.videoHeight||source.naturalHeight||source.height;
  if(!width||!height)throw new Error('Mask frame has no usable dimensions.');
  const gl=this.gl;gl.bindTexture(gl.TEXTURE_2D,this.mask);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
  const error=gl.getError();if(error!==gl.NO_ERROR)throw new Error('Video mask upload failed (WebGL '+error+').');this.maskEnabled=true;
 }
 setNoMask(){this.maskEnabled=false;}
 update(source,params,colors,style,routes,combine,time){
  const gl=this.gl;this.upload(this.source,source);if(!this.hasPrevious){this.upload(this.previousSource,source);this.hasPrevious=true;}
  gl.bindFramebuffer(gl.FRAMEBUFFER,this.materialFramebuffer);gl.viewport(0,0,this.width,this.height);this.bind(this.surfaceProgram);
  this.sampler(this.surfaceProgram,'sourceImage',this.source,0);this.sampler(this.surfaceProgram,'previousSource',this.previousSource,1);this.sampler(this.surfaceProgram,'maskImage',this.mask,2);
  for(const [key,value] of Object.entries(params)){const loc=gl.getUniformLocation(this.surfaceProgram,key);if(loc!==null)gl.uniform1f(loc,value);}
  gl.uniform3fv(gl.getUniformLocation(this.surfaceProgram,'inkColor'),colors.ink);gl.uniform1i(gl.getUniformLocation(this.surfaceProgram,'style'),['transmission','xerox','dry-ink','thermal','motion'].indexOf(style));gl.uniform1i(gl.getUniformLocation(this.surfaceProgram,'maskChannel'),this.maskChannel);gl.uniform1i(gl.getUniformLocation(this.surfaceProgram,'invertMask'),this.invertMask);gl.uniform1i(gl.getUniformLocation(this.surfaceProgram,'maskEnabled'),this.maskEnabled);gl.uniform1i(gl.getUniformLocation(this.surfaceProgram,'combineMode'),['max','add','multiply','min'].indexOf(combine));routes.forEach((route,index)=>gl.uniform4f(gl.getUniformLocation(this.surfaceProgram,`maskRoutes[${index}]`),route[0],route[1],0,0));gl.drawArrays(gl.TRIANGLES,0,6);
  const write=this.ping,read=1-write;gl.bindFramebuffer(gl.FRAMEBUFFER,this.framebuffers[write]);gl.viewport(0,0,this.width,this.height);this.bind(this.effectProgram);
  this.sampler(this.effectProgram,'sourceImage',this.source,0);this.sampler(this.effectProgram,'previousSource',this.previousSource,1);this.sampler(this.effectProgram,'previousFeedback',this.feedbackTextures[read],2);this.sampler(this.effectProgram,'maskImage',this.mask,3);this.sampler(this.effectProgram,'materialImage',this.materialTexture,4);
  for(const [key,value] of Object.entries(params)){const loc=gl.getUniformLocation(this.effectProgram,key);if(loc!==null)gl.uniform1f(loc,value);}
  gl.uniform3fv(gl.getUniformLocation(this.effectProgram,'inkColor'),colors.ink);gl.uniform3fv(gl.getUniformLocation(this.effectProgram,'accentColor'),colors.accent);
  gl.uniform1f(gl.getUniformLocation(this.effectProgram,'time'),time);gl.uniform1i(gl.getUniformLocation(this.effectProgram,'style'),['transmission','xerox','dry-ink','thermal','motion'].indexOf(style));gl.uniform1i(gl.getUniformLocation(this.effectProgram,'maskChannel'),this.maskChannel);gl.uniform1i(gl.getUniformLocation(this.effectProgram,'invertMask'),this.invertMask);gl.uniform1i(gl.getUniformLocation(this.effectProgram,'maskEnabled'),this.maskEnabled);gl.uniform1i(gl.getUniformLocation(this.effectProgram,'combineMode'),['max','add','multiply','min'].indexOf(combine));
  routes.forEach((route,index)=>gl.uniform4f(gl.getUniformLocation(this.effectProgram,`maskRoutes[${index}]`),route[0],route[1],0,0));
  gl.drawArrays(gl.TRIANGLES,0,6);this.upload(this.previousSource,source);this.ping=read;
 }
 present(amount,bypass=false){const gl=this.gl,latest=1-this.ping;gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,this.width,this.height);this.bind(this.displayProgram);this.sampler(this.displayProgram,'rendered',this.feedbackTextures[latest],0);this.sampler(this.displayProgram,'sourceImage',this.source,1);this.sampler(this.displayProgram,'maskImage',this.mask,2);gl.uniform1f(gl.getUniformLocation(this.displayProgram,'amount'),amount);gl.uniform1i(gl.getUniformLocation(this.displayProgram,'viewMode'),bypass?2:this.viewMode);gl.uniform1i(gl.getUniformLocation(this.displayProgram,'maskChannel'),this.maskChannel);gl.uniform1i(gl.getUniformLocation(this.displayProgram,'invertMask'),this.invertMask);gl.uniform1i(gl.getUniformLocation(this.displayProgram,'maskEnabled'),this.maskEnabled);gl.drawArrays(gl.TRIANGLES,0,6);}
 reset(){const gl=this.gl;for(const framebuffer of this.framebuffers){gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);}gl.bindFramebuffer(gl.FRAMEBUFFER,null);this.hasPrevious=false;}
 destroy(){const gl=this.gl;for(const t of [this.source,this.previousSource,this.mask,this.materialTexture,...this.feedbackTextures])gl.deleteTexture(t);for(const f of [this.materialFramebuffer,...this.framebuffers])gl.deleteFramebuffer(f);gl.deleteBuffer(this.quad);gl.deleteProgram(this.surfaceProgram);gl.deleteProgram(this.effectProgram);gl.deleteProgram(this.displayProgram);}
}
