#pragma once
#include <cmath>
#include "raster_rupture/core.hpp"
#if defined(__CUDACC__)
#define RR_HD __host__ __device__
#else
#define RR_HD
#endif
namespace raster_rupture::detail {
constexpr float pi=3.14159265358979323846f;
RR_HD inline float sat(float x){return x<0?0.0f:x>1?1.0f:x;}
RR_HD inline float mix(float a,float b,float t){return a+(b-a)*t;}
RR_HD inline float fract(float x){return x-floorf(x);}
RR_HD inline float smooth(float a,float b,float x){float t=sat((x-a)/(b-a));return t*t*(3-2*t);}
RR_HD inline float hash(float x,float y){return fract(sinf(x*127.1f+y*311.7f)*43758.5453f);}
RR_HD inline float noise(float x,float y){float ix=floorf(x),iy=floorf(y),fx=fract(x),fy=fract(y);fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);return mix(mix(hash(ix,iy),hash(ix+1,iy),fx),mix(hash(ix,iy+1),hash(ix+1,iy+1),fx),fy);}
template<class V> RR_HD inline float p(const V&v,ParameterId id){return float(v[size_t(id)]);}
RR_HD inline float channel(const ConstImageView&im,int x,int y,int c){if(!im.data||im.width<1||im.height<1)return c==3?1.0f:0.0f;x=x<0?0:x>=im.width?im.width-1:x;y=y<0?0:y>=im.height?im.height-1:y;c=c<im.components?c:im.components-1;auto row=reinterpret_cast<const unsigned char*>(im.data)+std::ptrdiff_t(y)*im.row_bytes;return reinterpret_cast<const float*>(row)[x*im.components+c];}
RR_HD inline void sample(const ConstImageView&im,float x,float y,float out[4]){int ix=int(floorf(x)),iy=int(floorf(y));float fx=fract(x),fy=fract(y);for(int c=0;c<4;c++)out[c]=mix(mix(channel(im,ix,iy,c),channel(im,ix+1,iy,c),fx),mix(channel(im,ix,iy+1,c),channel(im,ix+1,iy+1,c),fx),fy);}
RR_HD inline float luma(const float c[4]){return c[0]*.2126f+c[1]*.7152f+c[2]*.0722f;}
RR_HD inline float maskAt(const RenderRequest&r,float x,float y){const auto&im=r.look.source_as_mask?r.source:r.mask;if(!im.data)return 1;float c[4];sample(im,x,y,c);float v=r.look.mask_channel==1?c[0]:r.look.mask_channel==2?c[1]:r.look.mask_channel==3?c[2]:r.look.mask_channel==4?c[3]:luma(c);return r.look.invert_mask?1-sat(v):sat(v);}
RR_HD inline float route(const RenderRequest&r,int i,float m){float v=r.look.routes[i][0];return v>=0?mix(1,m,v):mix(1,1-m,-v);}
RR_HD inline void axis(float angle,float&dx,float&dy,float&nx,float&ny){float a=angle*pi/180;dx=cosf(a);dy=sinf(a);nx=-dy;ny=dx;}
RR_HD inline void renderPixel(const RenderRequest&r,int x,int y,float*out){
 const auto&v=r.look.parameters;float src[4];sample(r.source,float(x),float(y),src);float amount=sat(p(v,ParameterId::Amount));if(amount<=0){for(int c=0;c<4;c++)out[c]=src[c];return;}
 float m=maskAt(r,float(x),float(y)),global=route(r,0,m),baseAngle=p(v,ParameterId::DirectionAngle),t=float(r.time_seconds)*p(v,ParameterId::Evolution),seed=p(v,ParameterId::Seed);
 float tdx,tdy,tnx,tny;axis(baseAngle+r.look.routes[1][1],tdx,tdy,tnx,tny);float tearAcross=x*tnx+y*tny,density=p(v,ParameterId::BandScale),band=fmaxf(2,float(r.source.height)/density),cell=floorf(tearAcross/band),tick=floorf(t*3);
 float complexity=p(v,ParameterId::TearComplexity),events=hash(cell+seed,tick+17)*.55f+hash(floorf(tearAcross/(band*3))+seed*2,tick+43)*.3f+hash(floorf(tearAcross/fmaxf(1,band*.25f))+seed*5,tick+71)*.15f*complexity;
 float previousHere[4];sample(r.previous,float(x),float(y),previousHere);float motion=r.previous.data?sat(fabsf(luma(src)-luma(previousHere))*5):0;float tearThreshold=p(v,ParameterId::TearAmount)*(.32f+.28f*complexity)+motion*p(v,ParameterId::FlowInfluence)*route(r,8,m)*.28f;float tear=(events>1-tearThreshold?1.0f:0.0f)*route(r,1,m);
 float ddx,ddy,dnx,dny;axis(baseAngle+r.look.routes[2][1],ddx,ddy,dnx,dny);float displacementMask=route(r,2,m),offset=(hash(cell+31,tick+seed)-.5f)*p(v,ParameterId::SmearLength)*r.source.width*2*tear*displacementMask,wave=sinf(tearAcross*.13f+t*5+seed)*p(v,ParameterId::WaveAmount)*r.source.width*tear*displacementMask;float cross=p(v,ParameterId::CrossAmount)*(hash(floorf((x*ddx+y*ddy)/fmaxf(2,band*1.7f))+seed*7,tick+91)-.5f)*p(v,ParameterId::SmearLength)*r.source.height;
 float displaced[4];sample(r.source,x+(offset+wave)*ddx-cross*ddy,y+(offset+wave)*ddy+cross*ddx,displaced);
 float sdx,sdy,snx,sny;axis(baseAngle+r.look.routes[3][1],sdx,sdy,snx,sny);float smeared[4]={0,0,0,0},weight=0;for(int i=0;i<7;i++){float q=float(i)/6,s[4],w=1-q*.78f;sample(r.source,x+(offset-q*p(v,ParameterId::SmearLength)*r.source.width)*sdx,y+(offset-q*p(v,ParameterId::SmearLength)*r.source.width)*sdy,s);for(int c=0;c<4;c++)smeared[c]+=s[c]*w;weight+=w;}float base[4];for(int c=0;c<4;c++)base[c]=mix(displaced[c],smeared[c]/weight,sat(route(r,3,m)*tear));
 float rdx,rdy,rnx,rny;axis(baseAngle+r.look.routes[5][1],rdx,rdy,rnx,rny);float echo=route(r,5,m)*p(v,ParameterId::MicroEchoes);for(int i=1;i<=5;i++){float e[4],distance=i*(2+9*p(v,ParameterId::EchoDecay));sample(r.source,x-distance*rdx,y-distance*rdy,e);float perforation=hash(cell+i*13+seed,floorf(t*5)+i)>p(v,ParameterId::EchoDecay)*.45f?1.0f:0.0f,w=echo*powf(1-p(v,ParameterId::EchoDecay)*.68f,float(i))*.22f*perforation;for(int c=0;c<3;c++)base[c]=mix(base[c],e[c],w);}
 if(r.previous.data){float wdx,wdy,wnx,wny;axis(baseAngle+r.look.routes[4][1],wdx,wdy,wnx,wny);float drift=p(v,ParameterId::FeedbackDrift)*r.source.width,old[4];sample(r.previous,x-drift*wdx,y-drift*wdy,old);float fb=p(v,ParameterId::Feedback)*route(r,5,m)*route(r,4,m)*(.25f+.55f*tear);for(int c=0;c<3;c++)base[c]=mix(base[c],old[c],sat(fb));int generations=int(p(v,ParameterId::XeroxGenerations));float strips=p(v,ParameterId::XeroxStrips),xeroxGate=hash(floorf((x*wnx+y*wny)/(band*1.5f))+seed,floorf(t*2))>1-strips*.55f?1.0f:0.0f;for(int g=1;g<=generations;g++){float copy[4],gd=p(v,ParameterId::XeroxDrift)*r.source.width*g;sample(r.previous,x-gd*wdx,y-gd*wdy,copy);float dropout=hash(x*.17f+g*31+seed,y*.11f+t)>p(v,ParameterId::XeroxDecay)*g*.1f?1.0f:0.0f,w=xeroxGate*dropout*route(r,5,m)*powf(1-p(v,ParameterId::XeroxDecay)*.45f,float(g))*.16f;for(int c=0;c<3;c++)base[c]=mix(base[c],copy[c],w);}}
 float fdx,fdy,fnx,fny;axis(baseAngle+r.look.routes[6][1],fdx,fdy,fnx,fny);float along=x*fdx+y*fdy,across=x*fnx+y*fny,lum=luma(base),edge=fabsf(lum-luma(src)),grain=hash(x+floorf(t*17)*19+seed,y+seed*7),fiber=noise(along*.18f+seed,across*.012f+t*.3f),damage=p(v,ParameterId::SurfaceDamage)*route(r,6,m),raw=(grain-.5f)*p(v,ParameterId::MicroDetail)*p(v,ParameterId::GlitchGrain)*2+(fiber-.55f)*p(v,ParameterId::FiberAmount)*1.4f,hard=smooth(.35f,.65f,raw),dirt=mix(sat(raw+.5f),hard,p(v,ParameterId::ErosionHardness));float styleDamage=r.look.style==2?1.25f:r.look.style==1?1.12f:1.0f,toner=sat((lum-p(v,ParameterId::Threshold))*7+.5f-damage*dirt*1.8f*styleDamage),inked[3];for(int c=0;c<3;c++)inked[c]=mix(r.look.ink[c]*toner,base[c],p(v,ParameterId::DetailRecovery)*(.35f+.65f*edge));
 float adx,ady,anx,any;axis(baseAngle+r.look.routes[7][1],adx,ady,anx,any);float aa=x*adx+y*ady,ac=x*anx+y*any,accentBand=(hash(floorf(ac/2)+seed*3,floorf(t*7))>1-p(v,ParameterId::AccentAmount)*.18f?1.0f:0.0f)*route(r,7,m),spread=mix(.16f,.018f,p(v,ParameterId::BloomSpread)),bloom=sat(p(v,ParameterId::AccentBloom)*(noise(aa*spread+t,ac*.08f+seed)-.35f))*route(r,7,m);for(int c=0;c<3;c++)out[c]=mix(src[c],mix(inked[c],r.look.accent[c],sat(accentBand+bloom*.62f)),amount*global);out[3]=src[3];
}
}
