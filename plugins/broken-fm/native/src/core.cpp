#include "broken_fm/core.hpp"

#include <algorithm>
#include <cmath>
#include <cstring>
#include <execution>
#include <numeric>
#include <vector>

#include "core_math.cuh"

namespace broken_fm {

ParameterValues defaultParameters() {
  ParameterValues values{};
  for (std::size_t i = 0; i < values.size(); ++i) values[i] = kParameterDescriptors[i].default_value;
  return values;
}

RenderStatus renderCpu(const RenderRequest& request) {
  if (!request.source.data || !request.output.data || request.source.width <= 0 || request.source.height <= 0
      || request.output.width != request.source.width || request.output.height != request.source.height
      || std::abs(request.source.row_bytes) < request.source.width * 4 * static_cast<std::ptrdiff_t>(sizeof(float))
      || std::abs(request.output.row_bytes) < request.output.width * 4 * static_cast<std::ptrdiff_t>(sizeof(float))) {
    return RenderStatus::InvalidArgument;
  }
  const int width = request.source.width, height = request.source.height;
  const auto effective = detail::toFloatParameters(detail::effectiveParameters(
    request.parameters, static_cast<float>(request.time_seconds),
    static_cast<float>(request.transport_origin_seconds)));
  const float jitter = detail::lfoWave(5, static_cast<float>(request.time_seconds * effective[static_cast<std::size_t>(ParameterId::DriftRate)]),
    static_cast<float>(effective[static_cast<std::size_t>(ParameterId::Seed)] * 37.31 + 911.7));
  const float signalTime = static_cast<float>(request.time_seconds + jitter
    * effective[static_cast<std::size_t>(ParameterId::TimeJitter)] / std::max(request.frame_rate, 1.0)
    * effective[static_cast<std::size_t>(ParameterId::Instability)]);
  std::vector<float> contiguous(static_cast<std::size_t>(width) * height * 4);
  for (int y = 0; y < height; ++y) {
    std::memcpy(contiguous.data() + static_cast<std::size_t>(y) * width * 4,
                reinterpret_cast<const std::byte*>(request.source.data) + y * request.source.row_bytes,
                static_cast<std::size_t>(width) * 4 * sizeof(float));
  }
  std::vector<int> rows(static_cast<std::size_t>(height));
  std::iota(rows.begin(), rows.end(), 0);
  detail::FmIntegralView fm{};
  std::vector<float> modulation, integral;
  int atlasWidth = 0, atlasHeight = 0;
  if (static_cast<int>(detail::parameter(effective, ParameterId::Mode)) == 1) {
    modulation.resize(static_cast<std::size_t>(width) * height);
    std::for_each(std::execution::par_unseq, rows.begin(), rows.end(), [&](int y) {
      for (int x = 0; x < width; ++x) {
        modulation[static_cast<std::size_t>(y) * width + x] = detail::modulationAt(
          contiguous.data(), width, height, static_cast<float>(x), static_cast<float>(y), effective);
      }
    });
    detail::fmAtlasDimensions(width, height, detail::parameter(effective, ParameterId::ScanAngle),
                              atlasWidth, atlasHeight);
    integral.resize(static_cast<std::size_t>(atlasWidth) * atlasHeight);
    std::vector<int> atlasRows(static_cast<std::size_t>(atlasHeight));
    std::iota(atlasRows.begin(), atlasRows.end(), 0);
    std::for_each(std::execution::par_unseq, atlasRows.begin(), atlasRows.end(), [&](int y) {
      float sum = 0.0f;
      for (int x = 0; x < atlasWidth; ++x) {
        sum += detail::fmSeedAt(modulation.data(), width, height, x, y, atlasWidth, atlasHeight,
                                effective, signalTime);
        integral[static_cast<std::size_t>(y) * atlasWidth + x] = sum;
      }
    });
    fm = {integral.data(), atlasWidth, atlasHeight};
  }
  std::for_each(std::execution::par_unseq, rows.begin(), rows.end(), [&](int y) {
    auto* row = reinterpret_cast<float*>(reinterpret_cast<std::byte*>(request.output.data) + y * request.output.row_bytes);
    for (int x = 0; x < width; ++x) detail::renderPixel(
      contiguous.data(), width, height, x, y, effective, signalTime, fm, false, row + x * 4);
  });
  return RenderStatus::Ok;
}

}  // namespace broken_fm
