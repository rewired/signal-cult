#include "raster_rupture/core.hpp"
#include <cmath>
#include <iostream>
#include <vector>
int main(){constexpr int w=64,h=40;std::vector<float>src(w*h*4),dst(w*h*4),mask(w*h);for(int y=0;y<h;y++)for(int x=0;x<w;x++){auto i=(y*w+x)*4;src[i]=float(x)/w;src[i+1]=float(y)/h;src[i+2]=.3f;src[i+3]=1;mask[y*w+x]=x<w/2?0:1;}raster_rupture::RenderRequest r;r.source={src.data(),w,h,4,w*16};r.output={dst.data(),w,h,w*16};r.mask={mask.data(),w,h,1,w*4};r.look=raster_rupture::defaultLook();r.time_seconds=1.25;auto status=raster_rupture::renderCpu(r);if(status!=raster_rupture::RenderStatus::Ok)return 1;double sum=0;for(float v:dst){if(!std::isfinite(v))return 2;sum+=v;}if(sum<=0)return 3;
#ifdef RASTER_RUPTURE_WITH_CUDA
 if(raster_rupture::cudaAvailable()&&raster_rupture::renderCuda(r)!=raster_rupture::RenderStatus::Ok)return 5;
#endif
 auto a=r.look.parameters;a[static_cast<size_t>(raster_rupture::ParameterId::Amount)]=0;r.look.parameters=a;raster_rupture::renderCpu(r);for(size_t i=0;i<src.size();i++)if(std::abs(src[i]-dst[i])>1e-6)return 4;std::cout<<"Raster Rupture native smoke OK\n";}
