#include <cuda_runtime.h>
#include "kernel.hpp"
#include <vector>
#include <iostream>
#include <cmath>
using namespace crt;
static void ok(cudaError_t status){if(status!=cudaSuccess){std::cerr<<cudaGetErrorString(status)<<"\n";std::exit(1);}}
int main(){
 const int w=80,h=48;const size_t bytes=w*h*4*sizeof(float);std::vector<float> src(w*h*4),cpu(src.size()),gpu(src.size());
 for(size_t i=0;i<src.size();i+=4){src[i]=float(i%101)/101;src[i+1]=.35f;src[i+2]=.2f;src[i+3]=.7f;}
 float *deviceIn,*deviceOut;ok(cudaMalloc(&deviceIn,bytes));ok(cudaMalloc(&deviceOut,bytes));ok(cudaMemcpy(deviceIn,src.data(),bytes,cudaMemcpyHostToDevice));
 RenderJob job{};job.input={src.data(),0,0,w,h,w*16,false};job.output={cpu.data(),0,0,w,h,w*16,false};job.x2=w;job.y2=h;job.params.jitter=0;job.params.tracking=0;job.params.time=.73f;job.params.noise=.4f;
 float worst=0;cudaStream_t stream;ok(cudaStreamCreate(&stream));
 for(int mask=0;mask<12;mask++)for(int noise=0;noise<10;noise++){
  job.params.maskType=float(mask);job.params.noiseType=float(noise);renderCPU(job);
  RenderJob device=job;device.input.data=deviceIn;device.output.data=deviceOut;
  if(renderCUDA(device,stream,true))return 2;ok(cudaStreamSynchronize(stream));ok(cudaMemcpy(gpu.data(),deviceOut,bytes,cudaMemcpyDeviceToHost));
  for(size_t i=0;i<gpu.size();i++){if(!std::isfinite(gpu[i]))return 3;worst=std::fmax(worst,std::fabs(gpu[i]-cpu[i]));}
 }
 // Exercise all new pattern/palette pairs, including their threshold edges.
 for(int pattern=0;pattern<8;pattern++)for(int palette=0;palette<6;palette++){
  job.params.pixelMix=1;job.params.pixelPattern=float(pattern);job.params.pixelPalette=float(palette);job.params.pixelSize=9;job.params.pixelResponse=1.4f;
  renderCPU(job);RenderJob device=job;device.input.data=deviceIn;device.output.data=deviceOut;
  if(renderCUDA(device,stream,true))return 7;ok(cudaStreamSynchronize(stream));ok(cudaMemcpy(gpu.data(),deviceOut,bytes,cudaMemcpyDeviceToHost));
  for(size_t i=0;i<gpu.size();i++){if(!std::isfinite(gpu[i])||!std::isfinite(cpu[i]))return 8;worst=std::fmax(worst,std::fabs(gpu[i]-cpu[i]));}
 }
 for(int pixel=0;pixel<2;pixel++)for(int tube=0;tube<2;tube++){
  job.params.pixelEnabled=float(pixel);job.params.tubeEnabled=float(tube);job.params.pixelMix=1;
  renderCPU(job);RenderJob device=job;device.input.data=deviceIn;device.output.data=deviceOut;
  if(renderCUDA(device,stream,true))return 9;ok(cudaStreamSynchronize(stream));ok(cudaMemcpy(gpu.data(),deviceOut,bytes,cudaMemcpyDeviceToHost));
  for(size_t i=0;i<gpu.size();i++){if(!std::isfinite(gpu[i]))return 10;worst=std::fmax(worst,std::fabs(gpu[i]-cpu[i]));}
  if(!pixel&&!tube&&gpu!=src)return 11;
 }
 // Repeat the same seeded frame after an unrelated render, on the real GPU.
 job.managed=false;job.params.tubeEnabled=1;job.params.noise=.5f;
 for(float seed:{1.f,1234567.f,16777215.f}){
  job.params.noiseSeed=seed;job.params.time=.73f;renderCPU(job);RenderJob device=job;device.input.data=deviceIn;device.output.data=deviceOut;
  if(renderCUDA(device,stream,true))return 15;ok(cudaStreamSynchronize(stream));ok(cudaMemcpy(gpu.data(),deviceOut,bytes,cudaMemcpyDeviceToHost));auto reference=gpu;
  for(size_t i=0;i<gpu.size();i++){if(!std::isfinite(gpu[i]))return 16;worst=std::fmax(worst,std::fabs(gpu[i]-cpu[i]));}
  device.params.time=4.1f;if(renderCUDA(device,stream,true))return 17;device.params.time=.73f;if(renderCUDA(device,stream,true))return 18;ok(cudaStreamSynchronize(stream));ok(cudaMemcpy(gpu.data(),deviceOut,bytes,cudaMemcpyDeviceToHost));if(gpu!=reference)return 19;
 }
 job.params.noiseSeed=0;
 // Full managed rendering on CUDA, including signed/HDR inputs and every transfer.
 job.managed=true;job.params.tubeEnabled=1;job.params.pixelEnabled=1;job.params.pixelMix=.4f;
 float colorWorst=0;
 for(int gamut=0;gamut<6;gamut++)for(int transfer=0;transfer<9;transfer++){
  if(transfer==6&&gamut!=3)continue;job.color={gamut,transfer,100,1000};
  for(size_t i=0;i<src.size();i+=4){float level=float(i%107)/21.f-.01f;vec3 c=encodeColor(vec3(level,level*.75f,level*.5f),job.color);src[i]=c.r;src[i+1]=c.g;src[i+2]=c.b;src[i+3]=.7f;}
  ok(cudaMemcpy(deviceIn,src.data(),bytes,cudaMemcpyHostToDevice));renderCPU(job);
  RenderJob device=job;device.input.data=deviceIn;device.output.data=deviceOut;
  if(renderCUDA(device,stream,true))return 12;ok(cudaStreamSynchronize(stream));ok(cudaMemcpy(gpu.data(),deviceOut,bytes,cudaMemcpyDeviceToHost));
  for(size_t i=0;i<gpu.size();i++){if(!std::isfinite(gpu[i])||!std::isfinite(cpu[i]))return 13;colorWorst=std::fmax(colorWorst,std::fabs(gpu[i]-cpu[i])/(1+std::fabs(cpu[i])));}
 }
 if(colorWorst>.003f){std::cerr<<"Color CPU/CUDA relative error "<<colorWorst<<"\n";return 14;}
 std::cout<<"Managed color CPU/CUDA relative error: "<<colorWorst<<"\n";
 job.params.bypass=1;RenderJob bypass=job;bypass.input.data=deviceIn;bypass.output.data=deviceOut;if(renderCUDA(bypass,nullptr,false))return 4;ok(cudaMemcpy(gpu.data(),deviceOut,bytes,cudaMemcpyDeviceToHost));if(gpu!=src)return 5;
 ok(cudaFree(deviceIn));ok(cudaFree(deviceOut));ok(cudaStreamDestroy(stream));
 std::cout<<"CUDA: 120 mask/noise and 48 pixel/palette combinations, stream and default-stream bypass. Max CPU/GPU difference: "<<worst<<"\n";
 return worst<.015f?0:6;
}
