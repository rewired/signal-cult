#include <cuda_runtime.h>
#include "kernel.hpp"
namespace crt {
__global__ void crtKernel(RenderJob job){int x=job.x1+blockIdx.x*blockDim.x+threadIdx.x,y=job.y1+blockIdx.y*blockDim.y+threadIdx.y;if(x<job.x2&&y<job.y2)renderPixel(job,x,y);}
int renderCUDA(const RenderJob& job,void* stream,bool hasStream){
 if(job.x2<=job.x1||job.y2<=job.y1)return 0;
 dim3 block(16,16),grid((job.x2-job.x1+15)/16,(job.y2-job.y1+15)/16);
 crtKernel<<<grid,block,0,reinterpret_cast<cudaStream_t>(stream)>>>(job);
 cudaError_t error=cudaGetLastError();if(error!=cudaSuccess)return int(error);
 return hasStream?0:int(cudaStreamSynchronize(reinterpret_cast<cudaStream_t>(stream)));
}

}

