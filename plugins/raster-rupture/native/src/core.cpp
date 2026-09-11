#include "raster_rupture/core.hpp"
#include <algorithm>
#include <cmath>
#include <execution>
#include <numeric>
#include <vector>
#include "core_math.cuh"
namespace raster_rupture {
ParameterValues defaultParameters(){ParameterValues v{};for(size_t i=0;i<v.size();i++)v[i]=kParameterDescriptors[i].initial;return v;} Look defaultLook(){Look l;l.parameters=defaultParameters();for(auto&r:l.routes)r={1,0};l.routes[5]={-1,0};l.routes[6]={-1,0};return l;}
RenderStatus renderCpu(const RenderRequest&r){if(!r.source.data||!r.output.data||r.source.width<1||r.source.height<1||r.output.width!=r.source.width||r.output.height!=r.source.height||std::abs(r.source.row_bytes)<r.source.width*16||std::abs(r.output.row_bytes)<r.output.width*16)return RenderStatus::InvalidArgument;std::vector<int>rows(r.source.height);std::iota(rows.begin(),rows.end(),0);std::for_each(std::execution::par_unseq,rows.begin(),rows.end(),[&](int y){auto*out=reinterpret_cast<float*>(reinterpret_cast<unsigned char*>(r.output.data)+std::ptrdiff_t(y)*r.output.row_bytes);for(int x=0;x<r.source.width;x++)detail::renderPixel(r,x,y,out+x*4);});return RenderStatus::Ok;}
#ifndef RASTER_RUPTURE_WITH_CUDA
RenderStatus renderCuda(const RenderRequest&){return RenderStatus::CudaUnavailable;} bool cudaAvailable(){return false;}
#endif
}
