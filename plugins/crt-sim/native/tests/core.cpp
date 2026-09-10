#include "kernel.hpp"
using namespace crt;
#include <vector>
#include <iostream>
#include <cmath>
#include <cstring>
int main(){
 const int w=96,h=64;std::vector<float> src(w*h*4),dst(src.size());for(size_t i=0;i<src.size();i+=4){src[i]=float(i%97)/97;src[i+1]=.4f;src[i+2]=.2f;src[i+3]=1;}
 RenderJob job{};job.input={src.data(),0,0,w,h,w*16,false};job.output={dst.data(),0,0,w,h,w*16,false};job.x2=w;job.y2=h;
 // A curved surface must equal the flat effect evaluated at the inverse-warped
 // location, including every phosphor mask and the pixel stage.
 for(int pattern=0;pattern<2;pattern++)for(int mask=0;mask<12;mask++){
  RenderJob check=job;check.params.maskType=float(mask);check.params.pixelMix=float(pattern);
  check.params.noise=0;check.params.jitter=0;check.params.tracking=0;check.params.vignette=0;check.params.flicker=0;
  check.params.curve=.24f;Kernel curved(check);check.params.curve=0;Kernel flat(check);
  for(int y=12;y<h-12;y+=9)for(int x=12;x<w-12;x+=11){
   vec2 uv=vec2(float(x)+.5f,float(y)+.5f)/curved.resolution;
   vec2 q=uv*2.f-1.f;q*=1.f+.24f*dot(q,q);vec2 warped=q*.5f+.5f;
   vec3 actual=curved.shade(uv,uv*curved.resolution).rgb();
   vec3 expected=flat.shade(warped,warped*flat.resolution).rgb();
   if(std::fabs(actual.r-expected.r)>1e-4f||std::fabs(actual.g-expected.g)>1e-4f||std::fabs(actual.b-expected.b)>1e-4f)return 16;
  }
 }
 job.params.bypass=1;renderCPU(job);if(std::memcmp(src.data(),dst.data(),src.size()*sizeof(float)))return 1;
 job.params.bypass=0;
 for(int mask=0;mask<12;mask++)for(int noise=0;noise<10;noise++){job.params.maskType=float(mask);job.params.noiseType=float(noise);job.params.noise=.4f;job.params.time=.7f;renderCPU(job);for(float v:dst)if(!std::isfinite(v))return 2;}
 auto first=dst;renderCPU(job);if(first!=dst)return 3;
 job.params.time=1.7f;renderCPU(job);if(first==dst)return 4;
 // Seeds must reproduce frames after out-of-order requests for every noise type.
 for(int noise=0;noise<10;noise++){
  job.params.noiseType=float(noise);job.params.noiseSeed=1234567;job.params.time=.73f;renderCPU(job);auto reference=dst;
  job.params.time=9.1f;renderCPU(job);job.params.time=-.2f;renderCPU(job);job.params.time=.73f;renderCPU(job);if(dst!=reference)return 17;
  job.params.noiseSeed=16777215;renderCPU(job);if(dst==reference)return 18;
  job.params.noiseSeed=1234567;renderCPU(job);if(dst!=reference)return 19;
 }
 job.params.noiseSeed=0;
 // Disabled new stage must ignore its other controls exactly.
 job.params.pixelMix=0;renderCPU(job);auto legacy=dst;
 job.params.pixelPattern=7;job.params.pixelPalette=4;job.params.pixelSize=27;renderCPU(job);if(legacy!=dst)return 8;
 // Every added preset must render finite, nonempty and distinct output.
 std::vector<std::vector<float>> looks;
 for(size_t n=12;n<std::size(presetDefs);n++){
  const auto& preset=presetDefs[n];for(size_t i=0;i<std::size(parameterDefs);i++)*reinterpret_cast<float*>(reinterpret_cast<char*>(&job.params)+parameterDefs[i].offset)=preset.values[i];
  job.params.maskType=preset.mask;renderCPU(job);float energy=0;
  for(float v:dst){if(!std::isfinite(v))return 9;energy+=v;}
  if(energy<=w*h)return 10;
  for(const auto& look:looks)if(look==dst)return 11;looks.push_back(dst);
 }
 // Independent stages: off preserves settings, both off copies source exactly.
 job.params.pixelEnabled=0;job.params.tubeEnabled=1;job.params.pixelMix=1;renderCPU(job);auto tubeOnly=dst;
 job.params.pixelMix=0;renderCPU(job);if(dst!=tubeOnly)return 12;
 job.params.pixelMix=1;job.params.pixelEnabled=1;job.params.tubeEnabled=0;renderCPU(job);auto pixelOnly=dst;
 job.params.curve=.3f;job.params.noise=1;job.params.bloom=1.5f;job.params.gamma=3;renderCPU(job);if(dst!=pixelOnly)return 13;
 job.params.pixelEnabled=0;renderCPU(job);if(dst!=src)return 14;
 job.params.pixelEnabled=1;renderCPU(job);if(dst!=pixelOnly)return 15;
 job.params.tubeEnabled=1;
 // Verify padded, negative strides and nonzero image origins without touching padding.
 const int stride=(w+3)*4;std::vector<float> padded(stride*h,-99),out(stride*h,-77);
 for(int y=0;y<h;y++)for(int x=0;x<w*4;x++)padded[y*stride+x]=src[y*w*4+x];
 job.input={padded.data()+(h-1)*stride,11,17,11+w,17+h,-stride*4,false};
 job.output={out.data()+(h-1)*stride,11,17,11+w,17+h,-stride*4,false};job.x1=11;job.y1=17;job.x2=11+w;job.y2=17+h;job.params.bypass=1;renderCPU(job);
 for(int y=0;y<h;y++){for(int x=0;x<w*4;x++)if(out[y*stride+x]!=padded[y*stride+x])return 5;for(int x=w*4;x<stride;x++)if(out[y*stride+x]!=-77)return 6;}
 // Transparent premultiplied input must not generate opaque noise.
 std::fill(src.begin(),src.end(),0);job.input={src.data(),0,0,w,h,w*16,true};job.output={dst.data(),0,0,w,h,w*16,true};job.x1=job.y1=0;job.x2=w;job.y2=h;job.params.bypass=0;renderCPU(job);for(float v:dst)if(v!=0)return 7;
 std::cout<<"CPU: bypass, 120 mask/noise combinations, determinism and animation passed\n";
 return 0;
}
