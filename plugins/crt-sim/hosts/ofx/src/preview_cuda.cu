#include <cuda_runtime.h>
#include "preview.hpp"
namespace crt {
__global__ void snapshotKernel(RenderJob job,int width,int height,uint32_t* out){int x=blockIdx.x*blockDim.x+threadIdx.x,y=blockIdx.y*blockDim.y+threadIdx.y;if(x<width&&y<height)out[y*width+x]=snapshotPixel(job,x,y,width,height);}
bool snapshotCUDA(const RenderJob& job,int width,int height,void* opaque,std::vector<uint32_t>& pixels){
 uint32_t* device=nullptr;size_t bytes=size_t(width)*height*4;if(cudaMalloc(&device,bytes)!=cudaSuccess)return false;
 auto stream=static_cast<cudaStream_t>(opaque);snapshotKernel<<<dim3((width+15)/16,(height+15)/16),dim3(16,16),0,stream>>>(job,width,height,device);
 auto status=cudaGetLastError();if(status==cudaSuccess)status=cudaMemcpyAsync(pixels.data(),device,bytes,cudaMemcpyDeviceToHost,stream);if(status==cudaSuccess)status=cudaStreamSynchronize(stream);cudaFree(device);return status==cudaSuccess;
}
}
