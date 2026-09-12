#include "raster_rupture/core.hpp"
#include <algorithm>
#include <cmath>
#include <execution>
#include <numeric>
#include <vector>
#include "core_math.cuh"
namespace raster_rupture {
ParameterValues defaultParameters(){ParameterValues values{};for(size_t i=0;i<values.size();++i)values[i]=kParameterDescriptors[i].initial;return values;}
Look defaultLook(){Look look;look.parameters=defaultParameters();for(auto&route:look.routes)route={1,0};look.routes[5]={-1,0};look.routes[6]={-1,0};return look;}
static bool valid(const RenderRequest&r){return r.source.data&&r.output.data&&r.source.width>0&&r.source.height>0&&r.output.width==r.source.width&&r.output.height==r.source.height&&std::abs(r.source.row_bytes)>=r.source.width*16&&std::abs(r.output.row_bytes)>=r.output.width*16;}
RenderStatus renderCpu(const RenderRequest&r){
 if(!valid(r))return RenderStatus::InvalidArgument;
 const int width=r.source.width,height=r.source.height;std::vector<int>rows(height);std::iota(rows.begin(),rows.end(),0);
 std::vector<float>material(size_t(width)*height*4);
 std::for_each(std::execution::par_unseq,rows.begin(),rows.end(),[&](int y){for(int x=0;x<width;++x){float*out=material.data()+(size_t(y)*width+x)*4;detail::surfacePixel(r,x,y,out);for(int c=0;c<4;++c)out[c]=detail::sat(out[c]);}});
 ConstImageView materialView{material.data(),width,height,4,std::ptrdiff_t(width*16)};
 const float amount=detail::sat(detail::p(r.look.parameters,ParameterId::Amount));
 std::for_each(std::execution::par_unseq,rows.begin(),rows.end(),[&](int y){auto*out=reinterpret_cast<float*>(reinterpret_cast<unsigned char*>(r.output.data)+std::ptrdiff_t(y)*r.output.row_bytes);for(int x=0;x<width;++x){detail::effectPixel(r,materialView,x,y,out+x*4);for(int c=0;c<3;++c)out[x*4+c]=detail::mixf(detail::channel(r.source,x,y,c),detail::sat(out[x*4+c]),amount);}});
 return RenderStatus::Ok;
}
#ifndef RASTER_RUPTURE_WITH_CUDA
RenderStatus renderCuda(const RenderRequest&){return RenderStatus::CudaUnavailable;}bool cudaAvailable(){return false;}
#endif
}
