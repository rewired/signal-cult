// Generated from lib/crt-renderer.js; do not edit.
HD float hash(vec2 p){
 // Seed zero retains the original look; other seeds use integer avalanche.
 if(noiseSeed==0.)return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);
 uint h=uint(int(p.x))*1597334677u ^ uint(int(p.y))*3812015801u ^ uint(noiseSeed)*747796405u;
 h^=h>>16;h*=2246822519u;h^=h>>13;h*=3266489917u;h^=h>>16;
 return float(h>>8)*(1./16777216.);
}
// Integer avalanche avoids the spatial patterns of sin/dot pixel hashes.
HD float signalRandom(ivec2 cell,int seed){
 uint h=uint(cell.x)*1597334677u ^ uint(cell.y)*3812015801u ^ uint(seed)*2798796415u ^ uint(noiseSeed)*747796405u;
 h^=h>>16;h*=2246822519u;h^=h>>13;h*=3266489917u;h^=h>>16;
 return float(h>>8)*(1./16777216.);
}
HD float signalField(vec2 p,int seed){
 ivec2 i=ivec2(floor(p));vec2 f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(signalRandom(i,seed),signalRandom(i+ivec2(1,0),seed),f.x),
 mix(signalRandom(i+ivec2(0,1),seed),signalRandom(i+ivec2(1,1),seed),f.x),f.y);
}
// Continuous temporal noise: neighbouring time slices share the same seed at
// their boundary. Quintic blending keeps both value and velocity continuous.
HD float evolvingSignalField(vec2 p,float evolution,int seed){
 int epoch=int(floor(evolution));
 float f=fract(evolution);
 float w=f*f*f*(f*(f*6.-15.)+10.);
 float a=signalField(p,seed+epoch*1013);
 float b=signalField(p,seed+(epoch+1)*1013);
 // Preserve variance while blending so clusters do not pulse in unison.
 float variance=sqrt((1.-w)*(1.-w)+w*w);
 return clamp(.5+(mix(a,b,w)-.5)/variance,0.,1.);
}
HD vec3 receptionNoise(vec2 p,float rasterBand){
 float t=time*noiseSpeed;int field=int(floor(t*50.));
 float aspect=resolution.x/resolution.y;
 // Signal-space grains with bandwidth capped for small output sizes.
 float rows=min(lines,resolution.y*.5);
 float x=p.x*min(rows*aspect/max(noiseSize,.25),resolution.x*.5);
 float y=p.y*rows;
 float lineOffset=signalRandom(ivec2(0,int(floor(y))),field)*47.;
 vec2 grains=vec2(x+lineOffset,floor(y));
 float fine=signalField(grains,field);
 float thread=signalField(vec2(grains.x*.31+19.,grains.y),field+71);
 float grain=mix(fine,thread,.32);
 // Independent cluster clock evolves shape and density, even with grain speed zero.
 float clumpTime=time*noiseClumpSpeed;
 float cloud=evolvingSignalField(vec2(p.x*9.+clumpTime*.17,p.y*13.-clumpTime*.23),clumpTime,113);
 float patches=evolvingSignalField(vec2(p.x*23.-clumpTime*.31,p.y*37.+clumpTime*.11),clumpTime*1.37+.41,227);
 float envelope=mix(1.,.16+1.75*cloud*cloud+.45*patches,noiseClump);
 float barField=signalField(vec2(t*.12,p.y*8.-t*.28),389);
 float bars=smoothstep(.51,.84,barField);
 float rowGain=signalRandom(ivec2(int(floor(y)),0),field+103);
 float gain=envelope*(1.+noiseBands*(bars*2.4-.45));
 float snow=smoothstep(.22,.9,grain)*gain*(.65+.6*rowGain);
 // Rare short impulses interrupt the band-limited grains.
 float impulse=pow(signalField(vec2(grains.x*.53,grains.y),field+313),12.);
 snow+=impulse*(.3+noiseClump)*gain;
 snow+=rasterBand*(.12+.65*grain);
 // Ten distinct signal structures; IDs are stable in exported presets.
 int kind=int(noiseType);
 if(kind==1){
  vec2 rf=vec2(p.x*min(resolution.x*.5,rows*aspect*2./noiseSize),y);
  float n=signalRandom(ivec2(floor(rf)),field+601);
  snow=smoothstep(.12,.88,n)*envelope*(.85+noiseBands*bars);
 }else if(kind==2){
  float n=signalField(vec2(x*.24,y*.28),field+617);
  snow=smoothstep(.28,.72,n)*gain;
 }else if(kind==3){
  float n=signalField(vec2(grains.x*.085,grains.y),field+631);
  float breaks=signalField(vec2(grains.x*.7,grains.y),field+641);
  snow=smoothstep(.45,.74,n)*(.3+.7*breaks)*gain*1.4;
 }else if(kind==4){
  float n=signalField(vec2(grains.x*.7,grains.y),field+653);
  snow=smoothstep(.82,.98,n)*2.8*gain+fine*.025;
 }else if(kind==5){
  float n=signalField(vec2(grains.x*.055,grains.y),field+677);
  float dropout=smoothstep(.68,.83,n)*clamp(gain,0.,1.);
  float edge=smoothstep(.6,.68,n)*(1.-smoothstep(.68,.77,n));
  // R is the dropout mask, G a narrow bright fringe; applied to the source below.
  return vec3(dropout,edge*.28,0.);
 }else if(kind==6){
  float rolling=signalField(vec2(t*.09,p.y*(4.+noiseBands*8.)-t*.5),701);
  float strips=smoothstep(.45,.7,rolling);
  snow=(.025+strips*1.7)*smoothstep(.2,.85,grain)*envelope;
 }else if(kind==7){
  float drift=signalField(vec2(p.y*7.,t*.2),719);
  float carrier=sin(p.x*110./noiseSize+p.y*85.+drift*9.+t*7.);
  float beat=sin(p.x*103./noiseSize-p.y*43.-t*5.);
  snow=(.1+.9*pow(.5+.5*carrier,3.))*(.55+.45*beat)*gain+fine*.09;
 }else if(kind==8){
  vec2 cp=vec2(x*.45,floor(y*.65));
  vec3 rgb=vec3(signalField(cp,field+733),signalField(cp,field+751),signalField(cp,field+769));
  rgb=smoothstep(vec3(.2),vec3(.85),rgb)*gain;
  float luma=dot(rgb,vec3(.2126,.7152,.0722));
  return mix(vec3(luma),rgb,.45+.55*noiseChroma);
 }else if(kind==9){
  float islands=evolvingSignalField(vec2(p.x*12./noiseSize+clumpTime*.07,p.y*16.-clumpTime*.1),clumpTime*.71+.23,787);
  float density=smoothstep(.27,.76,islands);
  snow=(.06+density*1.65)*smoothstep(.3,.85,grain)*gain;
 }
 float chroma=signalField(vec2(x*.43,floor(y)),field+509)-.5;
 return max(vec3(0),vec3(snow)+noiseChroma*chroma*vec3(.32,-.08,-.26));
}
HD vec3 phosphorColor(float channel){
 return channel<1.?vec3(1.,.22,.22):channel<2.?vec3(.22,1.,.22):vec3(.22,.22,1.);
}
HD float maskCoverage(float distanceToEdge){
 float aa=max(.35/max(pitch,1.),.001);
 return 1.-smoothstep(-aa,aa,distanceToEdge);
}
HD float triadDot(vec2 p,vec2 center){
 vec2 d=fract(p-center+.5)-.5;
 return maskCoverage(length(d)-.205);
}
HD vec3 phosphorMask(vec2 pixel){
 int kind=int(maskType);
 vec2 grid=pixel/vec2(pitch/3.,pitch*.8);
 float cell=floor(grid.x);
 // Preserve the first three mask IDs and their existing preset appearance.
 if(kind<=2){
  if(kind==2)cell+=mod(floor(pixel.y/(pitch*.65)),2.);
  vec3 m=phosphorColor(mod(cell,3.));
  if(kind>0)m*=mix(.45,1.,step(.16,fract(pixel.y/(pitch*1.6))));
  return m*1.7;
 }
 if(kind==3)return phosphorColor(2.-mod(cell,3.))*1.7;
 if(kind==4){
  float aperture=maskCoverage(abs(fract(grid.x)-.5)-.31);
  return mix(vec3(.025),phosphorColor(mod(cell,3.))*2.15,aperture);
 }
 if(kind==7){
  vec2 p=pixel/pitch;
  vec3 triad=vec3(triadDot(p,vec2(.24,.26)),triadDot(p,vec2(.74,.26)),triadDot(p,vec2(.49,.72)));
  return vec3(.025)+triad*2.6;
 }
 if(kind==11)return phosphorColor(mod(floor(pixel.y/(pitch/3.)),3.))*1.7;
 if(kind==5){
  // Alternating slot columns stagger the horizontal bridges.
  vec2 p=vec2(grid.x,grid.y*.5+mod(cell,2.)*.5);
  vec2 d=abs(fract(p)-.5)-vec2(.3,.36);
  float shape=length(max(d,0.))+min(max(d.x,d.y),0.)-.07;
  return mix(vec3(.025),phosphorColor(mod(cell,3.))*2.1,maskCoverage(shape));
 }
 // Point masks use independent row staggering and aperture geometry.
 float rowHeight=kind==8?.288675:kind==9?.9:.42;
 vec2 p=pixel/vec2(pitch/3.,pitch*rowHeight);
 float row=floor(p.y);
 if(kind!=6)p.x+=mod(row,2.)*.5;
 vec2 local=fract(p)-.5;
 float shape;
 if(kind==10)shape=(abs(local.x)+abs(local.y))-.42;
 else if(kind==9)shape=length(local/vec2(.34,.44))-1.;
 else {
  // Correct for rectangular cells, so dot apertures stay circular in pixels.
  vec2 metric=vec2(1.,rowHeight*3.);
  shape=length(local*metric)-.4;
 }
 return mix(vec3(.025),phosphorColor(mod(floor(p.x),3.))*2.3,maskCoverage(shape));
}
HD vec3 rawLinear(vec2 p){if(managed)return texture(source,clamp(p,0.,1.)).rgb();return pow(max(texture(source,clamp(p,0.,1.)).rgb(),vec3(0)),vec3(2.2));}
// Independent procedural cells, anchored to the image. No external pattern assets.
HD float pixelDistance(vec2 q,float radius){
 vec2 a=abs(q);int kind=int(pixelPattern);
 if(kind==1)return max(a.x,a.y)-radius;
 if(kind==2)return (a.x+a.y)*.70710678-radius;
 if(kind==3)return max(a.x-radius*.55,a.y-.43);
 if(kind==4)return max(a.x-.43,a.y-radius*.55);
 if(kind==5)return min(max(a.x-radius*.3,a.y-radius),max(a.x-radius,a.y-radius*.3));
 if(kind==6)return abs(length(q)-radius*.72)-radius*.24;
 if(kind==7){
  float sides=max(abs(a.x-.28)-radius*.22,a.y-.36);
  float middle=max(a.x-.28,a.y-radius*.2);
  float ends=max(a.x-.28,abs(a.y-.36)-radius*.2);
  return min(sides,min(middle,ends));
 }
 return length(q)-radius;
}
HD vec3 pixelTint(vec3 original,float level){
 int kind=int(pixelPalette);
 if(kind==1)return vec3(.12,1.,.28)*level;
 if(kind==2)return vec3(1.,.43,.065)*level;
 if(kind==3)return vec3(.16,.68,1.)*level;
 if(kind==4)return mix(vec3(.75,.035,.42),vec3(.12,.95,1.),smoothstep(.15,.85,level))*level;
 if(kind==5)return vec3(1.,.88,.69)*level;
 return original;
}
HD vec3 sampleLinear(vec2 p){
 vec3 original=rawLinear(p);if(pixelEnabled<.5||pixelMix<=0.)return original;
 vec2 size=vec2(max(pixelSize,1.)*pixelAspect,max(pixelSize,1.));
 vec2 grid=p*resolution/size;vec2 center=(floor(grid)+.5)*size/resolution;
 vec2 delta=size*.22/resolution;
 // Four taps reduce subcell detail flicker on moving footage.
 vec3 cell=(rawLinear(center+delta)+rawLinear(center-delta)+rawLinear(center+vec2(delta.x,-delta.y))+rawLinear(center+vec2(-delta.x,delta.y)))*.25;
 float luma=clamp(dot(cell,vec3(.2126,.7152,.0722)),0.,1.);
 float level=pow(luma,1./pixelResponse);
 float count=max(floor(pixelLevels+.5),2.);
 level=mix(level,floor(level*(count-1.)+.5)/(count-1.),pixelQuantize);
 float radius=.48*pixelFill*sqrt(level);
 float aa=max(.5/min(size.x,size.y),pixelSoftness);
 float coverage=(1.-smoothstep(-aa,aa,pixelDistance(fract(grid)-.5,radius)))*smoothstep(0.,.025,level);
 vec3 normalized=cell/max(luma,.00001)*level;
 vec3 lit=pixelTint(normalized,level);
 vec3 background=pixelTint(vec3(pixelBackground),pixelBackground);
 return mix(original,mix(background,lit,coverage),pixelMix);
}
HD vec4 shade(vec2 uv,vec2 gl_FragCoord){
 vec2 p=uv;
 if(bypass>.5||(tubeEnabled<.5&&(pixelEnabled<.5||pixelMix<=0.))||(split>0.&&uv.x<split)){return texture(source,p);}
 if(tubeEnabled<.5){return managed?vec4(sampleLinear(p),1):vec4(pow(max(sampleLinear(p),vec3(0)),vec3(1./2.2)),1);}
 vec2 q=p*2.-1.;q*=1.+curve*dot(q,q);p=q*.5+.5;
 if(any(lessThan(p,vec2(0)))||any(greaterThan(p,vec2(1)))){return vec4(0,0,0,0);}
 // Inverse-map the complete tube surface before evaluating its layers.
 // Keep the physical raster separate from horizontal signal displacement.
 vec2 surfaceUV=p;
 vec2 surfacePixel=curve==0.?gl_FragCoord:surfaceUV*resolution;
 float tick=floor(time*30.);float row=floor(surfaceUV.y*lines);
 float band=pow(max(0.,1.-abs(p.y-fract(time*.11))/.035),2.)*tracking;
 p.x+=((hash(vec2(row,tick))-.5)*jitter+band*sin(row*2.+time*20.)*35.)/resolution.x;
 vec2 offset=vec2(convergence/resolution.x,0);
 vec3 c=vec3(sampleLinear(p+offset).r,sampleLinear(p).g,sampleLinear(p-offset).b);
 // Reception noise enters before beam, mask and glass, not as a final overlay.
 if(noise>0.){
  vec3 snow=receptionNoise(p,band);
  if(int(noiseType)==5)c=c*(1.-noise*snow.r)+vec3(noise*snow.g);
  else if(int(noiseType)==4)c+=pow(max(snow,vec3(0)),vec3(2.2))*noise;
  else c=mix(c,pow(max(snow,vec3(0)),vec3(2.2)),noise);
 }
 c+=vec3(band*hash(vec2(row,tick))*.12);
 float phase=fract(surfaceUV.y*lines)-.5;
 c*=mix(1.,exp(-phase*phase/(beam*beam*.18)),scan);
 c*=mix(vec3(1),phosphorMask(surfacePixel),mask);
 vec3 glow=vec3(0);
 for(int i=-2;i<=2;i++){for(int j=-2;j<=2;j++){
 vec2 d=vec2(float(i),float(j));float w=exp(-dot(d,d)*.5);
 glow+=sampleLinear(p+d*3./resolution)*w/6.1689;
 }}
 c+=glow*bloom*.45*(int(noiseType)==4?1.:1.-noise);
 c=mix(vec3(dot(c,vec3(.2126,.7152,.0722))),c,saturation);
 c=c*exp2(exposure)+black;
 c*=1.-vignette*smoothstep(.15,1.4,dot(q,q));
 c*=1.-flicker*(.5+.5*sin(time*113.));

 return managed?vec4(signedPower(c,2.2f/gamma),1):vec4(pow(max(c,vec3(0)),vec3(1./gamma)),1);
}