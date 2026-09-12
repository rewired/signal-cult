#include "raster_rupture/core.hpp"
#include <cuda_runtime.h>
#include "core_math.cuh"
namespace raster_rupture {namespace {
__global__ void surfaceKernel(RenderRequest request,float*material){int x=blockIdx.x*blockDim.x+threadIdx.x,y=blockIdx.y*blockDim.y+threadIdx.y;if(x<request.source.width&&y<request.source.height){float*out=material+(size_t(y)*request.source.width+x)*4;detail::surfacePixel(request,x,y,out);for(int c=0;c<4;++c)out[c]=detail::sat(out[c]);}}
__global__ void effectKernel(RenderRequest request,ConstImageView material){int x=blockIdx.x*blockDim.x+threadIdx.x,y=blockIdx.y*blockDim.y+threadIdx.y;if(x>=request.source.width||y>=request.source.height)return;float*out=request.output.data+(size_t(y)*request.source.width+x)*4;detail::effectPixel(request,material,x,y,out);float amount=detail::sat(detail::p(request.look.parameters,ParameterId::Amount));for(int c=0;c<3;++c)out[c]=detail::mixf(detail::channel(request.source,x,y,c),detail::sat(out[c]),amount);}
bool copyImage(const ConstImageView&source,float*&allocation,ConstImageView&device){if(!source.data)return true;size_t bytes=size_t(source.width)*source.height*source.components*sizeof(float);if(cudaMalloc(&allocation,bytes)!=cudaSuccess)return false;for(int y=0;y<source.height;++y)if(cudaMemcpy(allocation+size_t(y)*source.width*source.components,reinterpret_cast<const unsigned char*>(source.data)+std::ptrdiff_t(y)*source.row_bytes,size_t(source.width)*source.components*sizeof(float),cudaMemcpyHostToDevice)!=cudaSuccess)return false;device={allocation,source.width,source.height,source.components,std::ptrdiff_t(source.width*source.components*sizeof(float))};return true;}
}
bool cudaAvailable(){int count=0;return cudaGetDeviceCount(&count)==cudaSuccess&&count>0;}
RenderStatus renderCuda(const RenderRequest&request){
 if(!cudaAvailable())return RenderStatus::CudaUnavailable;
 float *source=nullptr,*previous=nullptr,*feedback=nullptr,*mask=nullptr,*material=nullptr,*output=nullptr;RenderRequest device=request;size_t pixels=size_t(request.source.width)*request.source.height;
 bool ok=copyImage(request.source,source,device.source)&&copyImage(request.previous,previous,device.previous)&&copyImage(request.previous_feedback,feedback,device.previous_feedback)&&copyImage(request.mask,mask,device.mask)&&cudaMalloc(&material,pixels*4*sizeof(float))==cudaSuccess&&cudaMalloc(&output,pixels*4*sizeof(float))==cudaSuccess;
 device.output={output,request.source.width,request.source.height,std::ptrdiff_t(request.source.width*16)};
 if(ok){dim3 block(16,16),grid((request.source.width+15)/16,(request.source.height+15)/16);surfaceKernel<<<grid,block>>>(device,material);ConstImageView materialView{material,request.source.width,request.source.height,4,std::ptrdiff_t(request.source.width*16)};effectKernel<<<grid,block>>>(device,materialView);ok=cudaGetLastError()==cudaSuccess&&cudaDeviceSynchronize()==cudaSuccess;for(int y=0;ok&&y<request.source.height;++y)ok=cudaMemcpy(reinterpret_cast<unsigned char*>(request.output.data)+std::ptrdiff_t(y)*request.output.row_bytes,output+size_t(y)*request.source.width*4,size_t(request.source.width)*16,cudaMemcpyDeviceToHost)==cudaSuccess;}
 cudaFree(source);cudaFree(previous);cudaFree(feedback);cudaFree(mask);cudaFree(material);cudaFree(output);return ok?RenderStatus::Ok:RenderStatus::CudaError;
}
}
