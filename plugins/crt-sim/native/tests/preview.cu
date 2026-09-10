#include <cuda_runtime.h>
#include "preview.hpp"
#include <iostream>
#include <vector>
#include <cstdlib>
using namespace crt;
static void ok(cudaError_t s){if(s!=cudaSuccess){std::cerr<<cudaGetErrorString(s);std::exit(1);}}
int main(){
 const int w=16,h=12,pitch=(w+3)*4;std::vector<float> source(pitch*h,.25f);for(size_t i=0;i<source.size();i+=4){source[i]=-.03f;source[i+1]=.4f;source[i+2]=1.2f;source[i+3]=.5f;}
 float* device;ok(cudaMalloc(&device,source.size()*sizeof(float)));ok(cudaMemcpy(device,source.data(),source.size()*sizeof(float),cudaMemcpyHostToDevice));
 cudaStream_t stream;ok(cudaStreamCreate(&stream));
 for(int reverse=0;reverse<2;reverse++)for(int mode=0;mode<3;mode++){
  RenderJob cpu{};cpu.input={source.data()+(reverse?(h-1)*pitch:0),0,0,w,h,(reverse?-1:1)*pitch*4,true};cpu.managed=mode==2;cpu.linear=mode==1;cpu.color={1,3,100,1000};
  RenderJob gpu=cpu;gpu.input.data=device+(reverse?(h-1)*pitch:0);std::vector<uint32_t> pixels(8*6);
  if(!snapshotCUDA(gpu,8,6,stream,pixels))return 2;
  for(int y=0;y<6;y++)for(int x=0;x<8;x++){auto expected=snapshotPixel(cpu,x,y,8,6),actual=pixels[y*8+x];for(int shift=0;shift<32;shift+=8)if(std::abs(int((actual>>shift)&255)-int((expected>>shift)&255))>1)return 3;}
 }
 std::vector<float> after(source.size());ok(cudaMemcpy(after.data(),device,after.size()*sizeof(float),cudaMemcpyDeviceToHost));if(after!=source)return 4;
 ok(cudaFree(device));ok(cudaStreamDestroy(stream));std::cout<<"CPU/CUDA snapshot parity, signed/padded strides and source preservation passed\n";
}
