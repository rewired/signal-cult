#pragma once

#include <array>
#include <cstddef>
#include <cstdint>
#include <memory>

#include "broken_fm/parameters.generated.hpp"

namespace broken_fm {

using ParameterValues = std::array<double, static_cast<std::size_t>(ParameterId::Count)>;

struct ConstImageView {
  const float* data = nullptr;
  int width = 0;
  int height = 0;
  std::ptrdiff_t row_bytes = 0;
};

struct ImageView {
  float* data = nullptr;
  int width = 0;
  int height = 0;
  std::ptrdiff_t row_bytes = 0;
};

struct RenderRequest {
  ConstImageView source;
  ImageView output;
  ParameterValues parameters{};
  double time_seconds = 0.0;
  double frame_rate = 24.0;
  double transport_origin_seconds = 0.0;
};

enum class RenderStatus { Ok, InvalidArgument, CudaUnavailable, CudaError };

struct CudaRenderStats {
  std::size_t slot_count = 0;
  std::size_t allocation_count = 0;
};

class CudaRenderContext {
 public:
  CudaRenderContext();
  ~CudaRenderContext();
  CudaRenderContext(CudaRenderContext&&) noexcept;
  CudaRenderContext& operator=(CudaRenderContext&&) noexcept;
  CudaRenderContext(const CudaRenderContext&) = delete;
  CudaRenderContext& operator=(const CudaRenderContext&) = delete;

  RenderStatus render(const RenderRequest& request);
  CudaRenderStats stats() const;

 private:
  struct Impl;
  std::unique_ptr<Impl> impl_;
};

ParameterValues defaultParameters();
RenderStatus renderCpu(const RenderRequest& request);
RenderStatus renderCuda(const RenderRequest& request);
bool cudaAvailable();

}  // namespace broken_fm
