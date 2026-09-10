#include "broken_fm/core.hpp"

#include <algorithm>
#include <array>
#include <chrono>
#include <cmath>
#include <future>
#include <iostream>
#include <numeric>
#include <vector>

#include "../src/core_math.cuh"

namespace {

struct ImageBuffer {
  int width = 0;
  int height = 0;
  int stride_floats = 0;
  bool negative = false;
  std::vector<float> storage;

  float* data() {
    return storage.data() + (negative ? static_cast<std::size_t>(height - 1) * stride_floats : 0);
  }
  const float* data() const {
    return storage.data() + (negative ? static_cast<std::size_t>(height - 1) * stride_floats : 0);
  }
  std::ptrdiff_t rowBytes() const {
    return static_cast<std::ptrdiff_t>(stride_floats * sizeof(float)) * (negative ? -1 : 1);
  }
  float* row(int y) { return data() + static_cast<std::ptrdiff_t>(y) * rowBytes() / sizeof(float); }
  const float* row(int y) const { return data() + static_cast<std::ptrdiff_t>(y) * rowBytes() / sizeof(float); }
};

ImageBuffer makeImage(int width, int height, int padding = 0, bool negative = false) {
  ImageBuffer image{width, height, width * 4 + padding, negative};
  image.storage.resize(static_cast<std::size_t>(image.stride_floats) * height);
  return image;
}

void fillSource(ImageBuffer& image) {
  for (int y = 0; y < image.height; ++y) for (int x = 0; x < image.width; ++x) {
    float* pixel = image.row(y) + x * 4;
    pixel[0] = static_cast<float>(x) / std::max(image.width - 1, 1);
    pixel[1] = static_cast<float>(y) / std::max(image.height - 1, 1);
    pixel[2] = .15f + .35f * std::sin((x + y * .7f) * .13f);
    pixel[3] = ((x + y) % 11 == 0) ? .4f : 1.0f;
  }
}

broken_fm::RenderRequest requestFor(const ImageBuffer& source, ImageBuffer& output,
                                    const broken_fm::ParameterValues& parameters, double time = 1.25) {
  return {{source.data(), source.width, source.height, source.rowBytes()},
          {output.data(), output.width, output.height, output.rowBytes()}, parameters, time, 24.0};
}

bool compareImages(const ImageBuffer& cpu, const ImageBuffer& gpu, float& maximum, float& mean) {
  double total = 0.0;
  std::size_t count = 0;
  maximum = 0.0f;
  for (int y = 0; y < cpu.height; ++y) for (int x = 0; x < cpu.width * 4; ++x) {
    const float a = cpu.row(y)[x], b = gpu.row(y)[x];
    if (!std::isfinite(a) || !std::isfinite(b)) return false;
    const float difference = std::abs(a - b);
    maximum = std::max(maximum, difference);
    total += difference;
    ++count;
    if ((x & 3) == 3 && difference > 1e-6f) return false;
  }
  mean = static_cast<float>(total / count);
  return maximum <= 5e-3f && mean <= 5e-4f;
}

bool hashGoldenVectorsPass() {
  constexpr std::array<std::array<float, 3>, 4> vectors{{
    {{0.0f, 0.0f, 0.0f}},
    {{1.0f, 2.0f, 0.938903809f}},
    {{-7.25f, 13.5f, 0.514282227f}},
    {{123.456f, -98.75f, 0.0146484375f}},
  }};
  return std::all_of(vectors.begin(), vectors.end(), [](const auto& item) {
    return std::abs(broken_fm::detail::hash21(item[0], item[1]) - item[2]) <= 1e-6f;
  });
}

bool rgbPhaseLineParityPass() {
  auto source = makeImage(48, 24, 8), output = makeImage(48, 24, 12);
  fillSource(source);
  auto parameters = broken_fm::defaultParameters();
  parameters[static_cast<std::size_t>(broken_fm::ParameterId::ColorMode)] = 2;
  parameters[static_cast<std::size_t>(broken_fm::ParameterId::SignalRender)] = 0;
  parameters[static_cast<std::size_t>(broken_fm::ParameterId::RgbPhaseOffset)] = 0;
  parameters[static_cast<std::size_t>(broken_fm::ParameterId::SignalGamma)] = 1.8;
  parameters[static_cast<std::size_t>(broken_fm::ParameterId::Brightness)] = 1.4;
  parameters[static_cast<std::size_t>(broken_fm::ParameterId::BlackLevel)] = .03;
  if (broken_fm::renderCpu(requestFor(source, output, parameters)) != broken_fm::RenderStatus::Ok) return false;
  for (int y = 0; y < output.height; ++y) for (int x = 0; x < output.width; ++x) {
    const float* pixel = output.row(y) + x * 4;
    if (!std::isfinite(pixel[0]) || std::abs(pixel[0] - pixel[1]) > 1e-6f
        || std::abs(pixel[1] - pixel[2]) > 1e-6f) return false;
  }
  return true;
}

double percentile(std::vector<double> values, double fraction) {
  std::sort(values.begin(), values.end());
  return values[std::min(values.size() - 1,
    static_cast<std::size_t>(std::ceil(fraction * values.size()) - 1))];
}

bool benchmark(broken_fm::CudaRenderContext& context, int mode, const char* label) {
  constexpr int width = 1920, height = 1080, iterations = 30;
  auto source = makeImage(width, height), output = makeImage(width, height);
  fillSource(source);
  auto parameters = broken_fm::defaultParameters();
  parameters[static_cast<std::size_t>(broken_fm::ParameterId::Mode)] = mode;
  parameters[static_cast<std::size_t>(broken_fm::ParameterId::ScanAngle)] = 27.0;
  auto request = requestFor(source, output, parameters, 2.0);
  if (context.render(request) != broken_fm::RenderStatus::Ok) return false;
  std::vector<double> samples;
  samples.reserve(iterations);
  for (int i = 0; i < iterations; ++i) {
    request.time_seconds = 2.0 + i / 24.0;
    const auto start = std::chrono::steady_clock::now();
    if (context.render(request) != broken_fm::RenderStatus::Ok) return false;
    samples.push_back(std::chrono::duration<double, std::milli>(
      std::chrono::steady_clock::now() - start).count());
  }
  std::cout << "1920x1080 CUDA " << label << " median=" << percentile(samples, .5)
            << " ms p95=" << percentile(samples, .95) << " ms\n";
  return true;
}

}  // namespace

int main() {
  if (!hashGoldenVectorsPass()) return 1;
  if (!rgbPhaseLineParityPass()) return 10;

  constexpr int width = 96, height = 54;
  struct Scenario { int mode; float angle; int carrier; float seed; bool negative; };
  constexpr Scenario scenarios[]{
    {0, 0.0f, 0, 0.0f, false}, {0, -43.0f, 2, 7.0f, true},
    {1, 0.0f, 0, 2.0f, false}, {1, 31.0f, 4, 19.0f, true},
    {1, 89.0f, 3, -4.0f, false},
  };
  broken_fm::CudaRenderContext context;
  for (const auto& scenario : scenarios) {
    auto source = makeImage(width, height, 12, scenario.negative);
    auto cpu = makeImage(width, height, 20, scenario.negative);
    auto gpu = makeImage(width, height, 28, scenario.negative);
    fillSource(source);
    auto parameters = broken_fm::defaultParameters();
    parameters[static_cast<std::size_t>(broken_fm::ParameterId::Mode)] = scenario.mode;
    parameters[static_cast<std::size_t>(broken_fm::ParameterId::ScanAngle)] = scenario.angle;
    parameters[static_cast<std::size_t>(broken_fm::ParameterId::CarrierShape)] = scenario.carrier;
    parameters[static_cast<std::size_t>(broken_fm::ParameterId::Seed)] = scenario.seed;
    parameters[static_cast<std::size_t>(broken_fm::ParameterId::Dropout)] = .35;
    auto cpuRequest = requestFor(source, cpu, parameters);
    if (broken_fm::renderCpu(cpuRequest) != broken_fm::RenderStatus::Ok) return 2;
    if (broken_fm::cudaAvailable()) {
      auto gpuRequest = requestFor(source, gpu, parameters);
      if (context.render(gpuRequest) != broken_fm::RenderStatus::Ok) return 3;
      float maximum = 0.0f, mean = 0.0f;
      if (!compareImages(cpu, gpu, maximum, mean)) {
        std::cerr << "CPU/CUDA mismatch: max=" << maximum << " mean=" << mean << '\n';
        return 4;
      }
    }
  }

  if (broken_fm::cudaAvailable()) {
    auto source = makeImage(640, 360), first = makeImage(640, 360), second = makeImage(640, 360);
    fillSource(source);
    auto parameters = broken_fm::defaultParameters();
    parameters[static_cast<std::size_t>(broken_fm::ParameterId::Mode)] = 1;
    parameters[static_cast<std::size_t>(broken_fm::ParameterId::ScanAngle)] = 37;
    auto firstRequest = requestFor(source, first, parameters);
    auto secondRequest = requestFor(source, second, parameters, 2.5);
    std::promise<void> start;
    auto gate = start.get_future().share();
    auto a = std::async(std::launch::async, [&] { gate.wait(); return context.render(firstRequest); });
    auto b = std::async(std::launch::async, [&] { gate.wait(); return context.render(secondRequest); });
    start.set_value();
    if (a.get() != broken_fm::RenderStatus::Ok || b.get() != broken_fm::RenderStatus::Ok) return 5;
    if (context.stats().slot_count < 2) return 6;

    const auto allocations = context.stats().allocation_count;
    if (context.render(firstRequest) != broken_fm::RenderStatus::Ok
        || context.stats().allocation_count != allocations) return 7;
    broken_fm::CudaRenderContext secondContext;
    if (secondContext.render(firstRequest) != broken_fm::RenderStatus::Ok) return 8;
    if (!benchmark(context, 0, "PM") || !benchmark(context, 1, "FM")) return 9;
  }
  std::cout << "BROKEN FM core smoke passed\n";
  return 0;
}
