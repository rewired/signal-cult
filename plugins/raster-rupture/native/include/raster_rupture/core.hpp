#pragma once
#include <array>
#include <cstddef>
#include "parameters.hpp"
namespace raster_rupture {
using ParameterValues=std::array<double,static_cast<std::size_t>(ParameterId::Count)>;
struct ConstImageView { const float* data=nullptr; int width=0,height=0,components=4; std::ptrdiff_t row_bytes=0; };
struct ImageView { float* data=nullptr; int width=0,height=0; std::ptrdiff_t row_bytes=0; };
struct Look { ParameterValues parameters{}; std::array<float,3> ink{{.91f,.89f,.85f}},accent{{1,.15f,.22f}}; std::array<std::array<float,2>,9> routes{}; int style=0,combine=0,mask_channel=0; bool invert_mask=false,source_as_mask=false; };
struct RenderRequest { ConstImageView source,previous,previous_feedback,mask; ImageView output; Look look; double time_seconds=0; };
enum class RenderStatus { Ok,InvalidArgument,CudaUnavailable,CudaError };
ParameterValues defaultParameters(); Look defaultLook(); RenderStatus renderCpu(const RenderRequest&); RenderStatus renderCuda(const RenderRequest&); bool cudaAvailable();
}
