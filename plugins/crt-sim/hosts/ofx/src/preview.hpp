#pragma once
#include "kernel.hpp"
#include <vector>
#include <cstdint>
namespace crt {
HD inline uint32_t snapshotPixel(const RenderJob& job,int x,int y,int width,int height){
 const auto& s=job.input;const int sx=s.x1+int((x+.5f)*(s.x2-s.x1)/width),sy=s.y1+int((y+.5f)*(s.y2-s.y1)/height);
 const float* p=reinterpret_cast<const float*>(reinterpret_cast<const char*>(s.data)+ptrdiff_t(sy-s.y1)*s.rowBytes)+4*(sx-s.x1);
 vec3 rgb(p[0],p[1],p[2]);if(s.premult)rgb=p[3]>1e-6f?rgb/p[3]:vec3(0);
 if(job.managed)rgb=decodeColor(rgb,job.color);else if(!job.linear)rgb=pow(max(rgb,vec3(0)),vec3(2.2f));
 rgb=vec3(encodeTransfer(rgb.r,1,100),encodeTransfer(rgb.g,1,100),encodeTransfer(rgb.b,1,100));
 const auto red=uint32_t(clamp(rgb.r,0,1)*255+.5f),green=uint32_t(clamp(rgb.g,0,1)*255+.5f),blue=uint32_t(clamp(rgb.b,0,1)*255+.5f);
 return blue|(green<<8)|(red<<16)|0xff000000u;
}
#ifdef CRT_WITH_CUDA
bool snapshotCUDA(const RenderJob&,int,int,void*,std::vector<uint32_t>&);
#endif
}
