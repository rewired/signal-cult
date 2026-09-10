#include "kernel.hpp"
#include "color-host.hpp"
#include <iostream>
#include <vector>
#include <cmath>
#include <algorithm>
using namespace crt;
static bool close(float a,float b,float e=2e-5f){return std::isfinite(a)&&std::isfinite(b)&&std::fabs(a-b)<=e*(1+std::fabs(b));}
static bool close(vec3 a,vec3 b,float e=2e-5f){return close(a.r,b.r,e)&&close(a.g,b.g,e)&&close(a.b,b.b,e);}
int main(){
 // Published reference anchors, independent of inverse round-trip checks.
 if(!close(encodeTransfer(.18f,3,100),.336043f,2e-6f))return 1;
 if(!close(encodeTransfer(.18f,4,100),.4135884f,2e-6f))return 2;
 if(!close(decodeTransfer(.04045f,1,100),.00313080495f,1e-7f))return 3;
 if(!close(encodeTransfer(1.f,5,100),.50807842f,2e-5f))return 4;
 if(!close(decodeTransfer(.5f,0,100),.189464571f,1e-7f))return 5;
 // D60-to-D65 adaptation must preserve neutral whites; known ACES AP1 red transform.
 if(!close(toWorkingGamut(vec3(1),2),vec3(1),2e-6f))return 6;
 if(!close(toWorkingGamut(vec3(1,0,0),2),vec3(1.7050515f,-.1302571f,-.0240033f),2e-5f))return 7;
 for(int gamut=0;gamut<6;gamut++)for(int transfer=0;transfer<9;transfer++){
  if(transfer==6&&gamut!=3)continue;
  ColorConfig c{gamut,transfer,100,1000};
  for(float v:{-.01f,0.f,.0001f,.18f,1.f,10.f,100.f}){
   vec3 original(v,v*.7f,v*.4f);
   if(!close(decodeColor(encodeColor(original,c),c),original,transfer==5?5e-4f:3e-5f)){std::cerr<<"roundtrip "<<gamut<<","<<transfer<<","<<v<<"\n";return 8;}
  }
 }
 ColorConfig hlg{3,6,100,1000};if(!close(decodeColor(vec3(1),hlg),vec3(10),2e-5f))return 9;
 ColorConfig detected;
 if(colorFromHost(nullptr,detected)||colorFromHost("ofx_scene_linear",detected)||colorFromHost("unrecognized",detected))return 10;
 if(!colorFromHost("ACEScct",detected)||detected.gamut!=2||detected.transfer!=4)return 11;
 if(!colorFromHost("DaVinci Intermediate WideGamut",detected)||detected.gamut!=1||detected.transfer!=3)return 12;
 // Active but neutral processing must preserve signed/HDR colors and alpha.
 const int w=16,h=12;std::vector<float> src(w*h*4),dst(src.size());
 RenderJob j{};j.input={src.data(),0,0,w,h,w*16,false};j.output={dst.data(),0,0,w,h,w*16,false};j.x2=w;j.y2=h;j.managed=true;
 j.params.pixelMix=0;j.params.scan=j.params.mask=j.params.bloom=j.params.exposure=j.params.black=j.params.curve=j.params.vignette=j.params.convergence=j.params.noise=j.params.jitter=j.params.tracking=j.params.flicker=0;j.params.saturation=1;j.params.gamma=2.2f;
 for(int gamut=0;gamut<6;gamut++)for(int transfer=0;transfer<9;transfer++){
  if(transfer==6&&gamut!=3)continue;j.color={gamut,transfer,100,1000};
  for(int premult=0;premult<2;premult++){
   j.input.premult=j.output.premult=premult;
   for(size_t i=0;i<src.size();i+=4){float level=float(i%41)/4.f-.1f;float alpha=i%7?.6f:0.f;vec3 c=encodeColor(vec3(level,level*.7f,level*.4f),j.color);if(premult)c*=alpha;src[i]=c.r;src[i+1]=c.g;src[i+2]=c.b;src[i+3]=alpha;}
   renderCPU(j);
   for(size_t i=0;i<src.size();i++){if(!close(dst[i],src[i],transfer==5?1e-3f:2e-4f)){std::cerr<<"neutral "<<gamut<<","<<transfer<<","<<premult<<","<<i<<" "<<src[i]<<" -> "<<dst[i]<<"\n";return 13;}}
   j.params.bypass=1;renderCPU(j);if(src!=dst)return 14;j.params.bypass=0;
  }
 }
 std::cout<<"Color: published anchors, gamut/transfer round-trips, signed HDR neutrality, alpha and host tag resolution passed\n";
}
