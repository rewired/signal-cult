#include "grid_rot/core.hpp"
#include <algorithm>
#include <cmath>
#include <execution>
#include <numeric>
#include <vector>
#include "core_math.cuh"
namespace grid_rot {
ParameterValues defaultParameters(){ParameterValues v{};for(size_t i=0;i<v.size();++i)v[i]=kParameterDescriptors[i].initial;return v;}
static float p(const ParameterValues&v,ParameterId id){return float(v[size_t(id)]);}static float random01(int seed){uint32_t n=uint32_t(seed+1);n=(n^(n>>16))*0x45d9f3bu;n=(n^(n>>16))*0x45d9f3bu;return float(n^(n>>16))/4294967296.0f;}static int wrap(int n,int count){int r=n%count;return r<0?r+count:r;}
int requiredPastFrames(const ParameterValues& v) {
  int frames = p(v, ParameterId::TargetingMotion) > 0.f &&
                       p(v, ParameterId::TargetingBias) > 0.f
                   ? 1
                   : 0;
  if (p(v, ParameterId::TemporalEnabled) < .5f) return frames;

  const auto enabled = [&](ParameterId enabledId, ParameterId weightId) {
    return p(v, enabledId) >= .5f && p(v, weightId) > 0.f;
  };
  if (enabled(ParameterId::OpHoldEnabled, ParameterId::OpHoldWeight))
    frames = std::max(frames, int(p(v, ParameterId::TemporalRange)) - 1);
  if (enabled(ParameterId::OpDelayEnabled, ParameterId::OpDelayWeight))
    frames = std::max(frames, int(p(v, ParameterId::OpDelayFrames)));
  if (enabled(ParameterId::OpStutterEnabled, ParameterId::OpStutterWeight))
    frames = std::max(frames, int(p(v, ParameterId::OpStutterFrames)) - 1);
  if (enabled(ParameterId::OpReverseEnabled, ParameterId::OpReverseWeight))
    frames = std::max(frames, int(p(v, ParameterId::OpReverseFrames)) * 2 - 1);
  if (enabled(ParameterId::OpSmearEnabled, ParameterId::OpSmearWeight))
    frames = std::max(frames, int(p(v, ParameterId::OpSmearFrames)));
  return std::clamp(frames, 0, kMaxHistory - 1);
}
void prepare(RenderRequest&r){double ratio=double(r.source.width)/r.source.height,error=1e30;int baseX=1,baseY=1;for(int y=1;y<=24;++y)for(int x=1;x<=24;++x){double e=std::abs(std::log((double(x)/y)/ratio));if(e<error-1e-10){error=e;baseX=x;baseY=y;}}int density=std::clamp(int(std::round(p(r.values,ParameterId::Density))),1,8);r.grid_columns=baseX*density;r.grid_rows=baseY*density;r.area_count=0;float spanX=p(r.values,ParameterId::SpanX),spanY=p(r.values,ParameterId::SpanY),rate=p(r.values,ParameterId::Rate);if(r.mode!=4){int count=r.grid_columns*r.grid_rows,index=0;double phase=std::max(0.0,r.time_seconds)*rate;if(r.mode==2)index=int(std::floor(random01(int(std::floor(phase)))*count));else if(r.mode==3)index=int(std::round((std::sin(phase/count*6.283185307179586-1.5707963267948966)+1)*.5*(count-1)));else index=wrap(int(std::floor(phase))*(r.mode==1?-1:1),count);r.areas[0]={float(index%r.grid_columns),float(index/r.grid_columns),std::min(spanX,float(r.grid_columns)),std::min(spanY,float(r.grid_rows)),1,float(std::floor(phase))};r.area_count=1;return;}int count=std::clamp(int(p(r.values,ParameterId::DropCount)),1,kMaxAreas),seed=int(p(r.values,ParameterId::DropSeed));float life=p(r.values,ParameterId::DropLife),spread=p(r.values,ParameterId::DropSpread),clock=float(std::max(0.0,r.time_seconds));for(int i=0;i<count;++i){int lane=seed*131+i*977;float period=life*(1+spread*(random01(lane)-.5f)),phase=clock/period+random01(lane+1);int cycle=int(std::floor(phase));float age=phase-cycle,key=float(lane+cycle*7919),visible=1-spread*(.1f+random01(int(key)+2)*.3f);if(age>=visible)continue;auto scale=[&](int n){return 1-spread*random01(int(key)+n)*.8f;};int x=int(random01(int(key)+3)*r.grid_columns),y=int(random01(int(key)+4)*r.grid_rows);if(random01(int(key)+20)<p(r.values,ParameterId::ClusterAmount)){float birth=(cycle-random01(lane+1))*period;int epoch=int(std::floor(birth/(life*4))),groups=std::max(1,int(p(r.values,ParameterId::ClusterCount))),group=i%groups,centerKey=seed*313+group*3571+epoch*104729,cx=int(random01(centerKey+51)*r.grid_columns),cy=int(random01(centerKey+52)*r.grid_rows);float angle=random01(int(key)+21)*6.2831853f,radius=std::sqrt(random01(int(key)+22))*p(r.values,ParameterId::ClusterRadius);x=wrap(cx+int(std::round(std::cos(angle)*radius)),r.grid_columns);y=wrap(cy+int(std::round(std::sin(angle)*radius)),r.grid_rows);}if(r.area_count<kMaxAreas)r.areas[r.area_count++]={float(x),float(y),std::min(float(r.grid_columns),std::max(1.f,std::round(spanX*scale(5)))),std::min(float(r.grid_rows),std::max(1.f,std::round(spanY*scale(6)))),std::max(.15f,scale(7)),float(cycle)};}}
static bool valid(const RenderRequest&r){return r.source.data&&r.output.data&&r.source.width>0&&r.source.height>0&&r.output.width==r.source.width&&r.output.height==r.source.height&&std::abs(r.source.row_bytes)>=r.source.width*16&&std::abs(r.output.row_bytes)>=r.output.width*16;}
RenderStatus renderCpu(const RenderRequest&input){if(!valid(input))return RenderStatus::InvalidArgument;RenderRequest r=input;prepare(r);std::vector<int>rows(r.source.height);std::iota(rows.begin(),rows.end(),0);std::for_each(std::execution::par_unseq,rows.begin(),rows.end(),[&](int y){auto*out=reinterpret_cast<float*>(reinterpret_cast<unsigned char*>(r.output.data)+std::ptrdiff_t(y)*r.output.row_bytes);for(int x=0;x<r.source.width;++x)detail::pixel(r,x,y,out+x*4);});return RenderStatus::Ok;}
#ifndef GRID_ROT_WITH_CUDA
RenderStatus renderCuda(const RenderRequest&){return RenderStatus::CudaUnavailable;}bool cudaAvailable(){return false;}
#endif
}