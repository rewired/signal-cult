#pragma once
#include <array>
#include <cstddef>
#include "parameters.hpp"
namespace grid_rot {
inline constexpr int kMaxHistory=32,kMaxAreas=16,kOperatorCount=13;
using ParameterValues=std::array<double,static_cast<std::size_t>(ParameterId::Count)>;
struct ConstImageView { const float*data=nullptr;int width=0,height=0,components=4;std::ptrdiff_t row_bytes=0; };
struct ImageView { float*data=nullptr;int width=0,height=0;std::ptrdiff_t row_bytes=0; };
struct Area { float x=0,y=0,width=1,height=1,strength=1,tick=0; };
struct RenderRequest { ConstImageView source;std::array<ConstImageView,kMaxHistory>history{};int history_count=0;ImageView output;ParameterValues values{};int mode=4;double time_seconds=0,frame_number=0;int grid_columns=1,grid_rows=1,area_count=0;std::array<Area,kMaxAreas>areas{}; };
enum class RenderStatus { Ok,InvalidArgument,CudaUnavailable,CudaError };
ParameterValues defaultParameters();int requiredPastFrames(const ParameterValues&);void prepare(RenderRequest&);RenderStatus renderCpu(const RenderRequest&);RenderStatus renderCuda(const RenderRequest&);bool cudaAvailable();
}