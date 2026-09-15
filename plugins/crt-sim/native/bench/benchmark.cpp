#include "kernel.hpp"
#include <chrono>
#include <cmath>
#include <cstdlib>
#include <iomanip>
#include <iostream>
#include <string>
#include <thread>
#include <vector>
#ifdef CRT_WITH_CUDA
#include <cuda_runtime.h>
#endif
using namespace crt;

static void maximumProfile(Parameters& p){
 p.pixelEnabled=1;p.pixelMix=1;p.tubeEnabled=1;p.noise=.65f;p.noiseClump=1;p.noiseBands=1;p.noiseChroma=1;p.jitter=8;p.tracking=.7f;p.flicker=.12f;
 p.chromaBleed=.8f;p.chromaDelay=12;p.lumaSharpness=1.2f;p.chromaSharpness=1.1f;p.hueDrift=35;p.hueDriftSpeed=1;
 p.bloom=1.2f;p.bloomSpread=1;p.highlightDiffusion=.8f;p.tubeGlow=.65f;p.monochrome=.55f;
 p.verticalRoll=.15f;p.shutterScan=.5f;p.shakeX=12;p.shakeY=8;p.syncDrift=24;
}
static void report(const char* backend,int w,int h,const std::string& profile,int frames,double seconds){
 double ms=seconds*1000.0/frames,fps=frames/seconds;
 std::cout<<"| "<<backend<<" | "<<w<<"x"<<h<<" | "<<profile<<" | "<<frames<<" | "<<std::fixed<<std::setprecision(2)<<ms<<" | "<<fps<<" |\n";
}
int main(int argc,char** argv){
 if(argc<6){std::cerr<<"usage: crt_benchmark <width> <height> <default|max> <frames> <cpu|cuda>\n";return 2;}
 int w=std::max(1,std::atoi(argv[1])),h=std::max(1,std::atoi(argv[2])),frames=std::max(1,std::atoi(argv[4]));std::string profile=argv[3],backend=argv[5];
 std::vector<float> src(size_t(w)*h*4),out(src.size());
 for(int y=0;y<h;y++)for(int x=0;x<w;x++){size_t i=(size_t(y)*w+x)*4;src[i]=float(x)/w;src[i+1]=float(y)/h;src[i+2]=.5f+.5f*std::sin(float(x+y)*.017f);src[i+3]=1;}
 RenderJob job{};job.input={src.data(),0,0,w,h,w*16,false};job.output={out.data(),0,0,w,h,w*16,false};job.x2=w;job.y2=h;job.params.time=.73f;
 if(profile=="max")maximumProfile(job.params);else if(profile!="default"){std::cerr<<"profile must be default or max\n";return 3;}
 if(backend=="cpu"){
  unsigned count=std::max(1u,std::min(std::thread::hardware_concurrency(),16u));
  auto frame=[&](){std::vector<std::thread> workers;for(unsigned i=0;i<count;i++){RenderJob slice=job;slice.y1=int((long long)h*i/count);slice.y2=int((long long)h*(i+1)/count);workers.emplace_back([slice](){renderCPU(slice);});}for(auto& worker:workers)worker.join();};
  frame();auto begin=std::chrono::steady_clock::now();for(int i=0;i<frames;i++){job.params.time=.73f+i/24.f;frame();}auto end=std::chrono::steady_clock::now();
  std::string label="CPU/"+std::to_string(count)+"t";report(label.c_str(),w,h,profile,frames,std::chrono::duration<double>(end-begin).count());return 0;
 }
#ifdef CRT_WITH_CUDA
 if(backend=="cuda"){
  float *input=nullptr,*output=nullptr;size_t bytes=src.size()*sizeof(float);
  if(cudaMalloc(&input,bytes)!=cudaSuccess||cudaMalloc(&output,bytes)!=cudaSuccess)return 4;
  cudaMemcpy(input,src.data(),bytes,cudaMemcpyHostToDevice);RenderJob device=job;device.input.data=input;device.output.data=output;
  if(renderCUDA(device,nullptr,false)||cudaDeviceSynchronize()!=cudaSuccess)return 5;
  auto begin=std::chrono::steady_clock::now();for(int i=0;i<frames;i++){device.params.time=.73f+i/24.f;if(renderCUDA(device,nullptr,false))return 6;}cudaDeviceSynchronize();auto end=std::chrono::steady_clock::now();
  report("CUDA",w,h,profile,frames,std::chrono::duration<double>(end-begin).count());cudaFree(input);cudaFree(output);return 0;
 }
#endif
 std::cerr<<"requested backend is unavailable in this build\n";return 7;
}
