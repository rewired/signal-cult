#include "broken_fm/core.hpp"

#include <algorithm>
#include <atomic>
#include <cmath>
#include <cstddef>
#include <memory>
#include <mutex>
#include <utility>
#include <vector>

#include <cub/device/device_scan.cuh>
#include <cuda_runtime.h>

#include "core_math.cuh"

namespace broken_fm {
namespace {

using detail::FloatParameterValues;

__global__ void modulationKernel(const float* __restrict__ source, float* __restrict__ modulation,
                                 int width, int height, bool sourceFlipY,
                                 const FloatParameterValues* __restrict__ parameters) {
  const int x = blockIdx.x * blockDim.x + threadIdx.x;
  const int y = blockIdx.y * blockDim.y + threadIdx.y;
  if (x >= width || y >= height) return;
  modulation[static_cast<std::size_t>(y) * width + x] = detail::modulationAt(
    source, width, height, static_cast<float>(x), static_cast<float>(y), *parameters, sourceFlipY);
}

__global__ void fmSeedKernel(const float* __restrict__ modulation, float* __restrict__ seed,
                             int* __restrict__ rowKeys,
                             int width, int height, int atlasWidth, int atlasHeight,
                             const FloatParameterValues* __restrict__ parameters, float signalTime) {
  const int x = blockIdx.x * blockDim.x + threadIdx.x;
  const int y = blockIdx.y * blockDim.y + threadIdx.y;
  if (x >= atlasWidth || y >= atlasHeight) return;
  const auto index = static_cast<std::size_t>(y) * atlasWidth + x;
  seed[index] = detail::fmSeedAt(
    modulation, width, height, x, y, atlasWidth, atlasHeight, *parameters, signalTime);
  rowKeys[index] = y;
}

__global__ void renderKernel(const float* __restrict__ source, float* __restrict__ output,
                             int width, int height, const FloatParameterValues* __restrict__ parameters,
                             float signalTime, const float* __restrict__ fmIntegral,
                             int fmWidth, int fmHeight, bool sourceFlipY, bool outputFlipY) {
  const int x = blockIdx.x * blockDim.x + threadIdx.x;
  const int y = blockIdx.y * blockDim.y + threadIdx.y;
  if (x >= width || y >= height) return;
  const int outputY = outputFlipY ? height - 1 - y : y;
  detail::renderPixel(source, width, height, x, y, *parameters, signalTime,
                      {fmIntegral, fmWidth, fmHeight}, sourceFlipY,
                      output + (static_cast<std::size_t>(outputY) * width + x) * 4);
}

bool validRequest(const RenderRequest& request) {
  constexpr auto pixelBytes = static_cast<std::ptrdiff_t>(4 * sizeof(float));
  return request.source.data && request.output.data && request.source.width > 0 && request.source.height > 0
    && request.output.width == request.source.width && request.output.height == request.source.height
    && std::abs(request.source.row_bytes) >= request.source.width * pixelBytes
    && std::abs(request.output.row_bytes) >= request.output.width * pixelBytes;
}

template <typename T>
bool reserveDevice(T*& pointer, std::size_t& capacity, std::size_t count,
                   std::atomic_size_t& allocationCount) {
  if (count <= capacity) return true;
  if (pointer) cudaFree(pointer);
  pointer = nullptr;
  capacity = 0;
  if (cudaMalloc(reinterpret_cast<void**>(&pointer), count * sizeof(T)) != cudaSuccess) return false;
  capacity = count;
  ++allocationCount;
  return true;
}

struct Slot {
  cudaStream_t stream = nullptr;
  float* source = nullptr;
  float* output = nullptr;
  float* modulation = nullptr;
  float* seed = nullptr;
  float* integral = nullptr;
  int* rowKeys = nullptr;
  FloatParameterValues* parameters = nullptr;
  void* scanWorkspace = nullptr;
  std::size_t sourceCapacity = 0;
  std::size_t outputCapacity = 0;
  std::size_t modulationCapacity = 0;
  std::size_t seedCapacity = 0;
  std::size_t integralCapacity = 0;
  std::size_t rowKeysCapacity = 0;
  std::size_t parameterCapacity = 0;
  std::size_t scanWorkspaceCapacity = 0;
  std::atomic_size_t allocationCount{0};
  bool inUse = false;

  Slot() { cudaStreamCreateWithFlags(&stream, cudaStreamNonBlocking); }
  ~Slot() {
    if (stream) cudaStreamSynchronize(stream);
    cudaFree(source);
    cudaFree(output);
    cudaFree(modulation);
    cudaFree(seed);
    cudaFree(integral);
    cudaFree(rowKeys);
    cudaFree(parameters);
    cudaFree(scanWorkspace);
    if (stream) cudaStreamDestroy(stream);
  }
  bool valid() const { return stream != nullptr; }
};

}  // namespace

struct CudaRenderContext::Impl {
  mutable std::mutex mutex;
  std::vector<std::unique_ptr<Slot>> slots;

  Slot* acquire() {
    std::lock_guard lock(mutex);
    for (const auto& slot : slots) {
      if (!slot->inUse) {
        slot->inUse = true;
        return slot.get();
      }
    }
    auto slot = std::make_unique<Slot>();
    if (!slot->valid()) return nullptr;
    slot->inUse = true;
    slots.push_back(std::move(slot));
    return slots.back().get();
  }

  void release(Slot* slot) {
    std::lock_guard lock(mutex);
    slot->inUse = false;
  }
};

bool cudaAvailable() {
  static const bool available = [] {
    int count = 0;
    return cudaGetDeviceCount(&count) == cudaSuccess && count > 0;
  }();
  return available;
}

CudaRenderContext::CudaRenderContext() : impl_(std::make_unique<Impl>()) {}
CudaRenderContext::~CudaRenderContext() = default;
CudaRenderContext::CudaRenderContext(CudaRenderContext&&) noexcept = default;
CudaRenderContext& CudaRenderContext::operator=(CudaRenderContext&&) noexcept = default;

CudaRenderStats CudaRenderContext::stats() const {
  std::lock_guard lock(impl_->mutex);
  CudaRenderStats result{impl_->slots.size(), 0};
  for (const auto& slot : impl_->slots) result.allocation_count += slot->allocationCount.load();
  return result;
}

RenderStatus CudaRenderContext::render(const RenderRequest& request) {
  if (!cudaAvailable()) return RenderStatus::CudaUnavailable;
  if (!validRequest(request)) return RenderStatus::InvalidArgument;

  Slot* acquiredSlot = impl_->acquire();
  if (!acquiredSlot) return RenderStatus::CudaError;
  struct Lease {
    Impl* owner;
    Slot* value;
    ~Lease() { owner->release(value); }
  } lease{impl_.get(), acquiredSlot};
  Slot& slot = *lease.value;
  const int width = request.source.width, height = request.source.height;
  const std::size_t pixelCount = static_cast<std::size_t>(width) * height;
  const std::size_t rowBytes = static_cast<std::size_t>(width) * 4 * sizeof(float);
  const auto effective = detail::toFloatParameters(detail::effectiveParameters(
    request.parameters, static_cast<float>(request.time_seconds),
    static_cast<float>(request.transport_origin_seconds)));
  const float jitter = detail::lfoWave(5, static_cast<float>(request.time_seconds)
    * detail::parameter(effective, ParameterId::DriftRate),
    detail::parameter(effective, ParameterId::Seed) * 37.31f + 911.7f);
  const float signalTime = static_cast<float>(request.time_seconds + jitter
    * detail::parameter(effective, ParameterId::TimeJitter) / std::max(request.frame_rate, 1.0)
    * detail::parameter(effective, ParameterId::Instability));

  bool ok = reserveDevice(slot.source, slot.sourceCapacity, pixelCount * 4, slot.allocationCount)
    && reserveDevice(slot.output, slot.outputCapacity, pixelCount * 4, slot.allocationCount)
    && reserveDevice(slot.parameters, slot.parameterCapacity, std::size_t{1}, slot.allocationCount);
  if (!ok) return RenderStatus::CudaError;

  const bool sourceFlipY = request.source.row_bytes < 0;
  const bool outputFlipY = request.output.row_bytes < 0;
  const auto sourcePitch = static_cast<std::size_t>(std::abs(request.source.row_bytes));
  const auto outputPitch = static_cast<std::size_t>(std::abs(request.output.row_bytes));
  const auto* sourceBase = reinterpret_cast<const std::byte*>(request.source.data);
  auto* outputBase = reinterpret_cast<std::byte*>(request.output.data);
  if (sourceFlipY) sourceBase += static_cast<std::ptrdiff_t>(height - 1) * request.source.row_bytes;
  if (outputFlipY) outputBase += static_cast<std::ptrdiff_t>(height - 1) * request.output.row_bytes;

  ok = cudaMemcpy2DAsync(slot.source, rowBytes, sourceBase, sourcePitch, rowBytes, height,
                         cudaMemcpyHostToDevice, slot.stream) == cudaSuccess
    && cudaMemcpyAsync(slot.parameters, &effective, sizeof(effective), cudaMemcpyHostToDevice,
                       slot.stream) == cudaSuccess;

  int atlasWidth = 0, atlasHeight = 0;
  const bool fmEnabled = static_cast<int>(detail::parameter(effective, ParameterId::Mode)) == 1;
  if (ok && fmEnabled) {
    detail::fmAtlasDimensions(width, height, detail::parameter(effective, ParameterId::ScanAngle),
                              atlasWidth, atlasHeight);
    const std::size_t atlasPixels = static_cast<std::size_t>(atlasWidth) * atlasHeight;
    ok = reserveDevice(slot.modulation, slot.modulationCapacity, pixelCount, slot.allocationCount)
      && reserveDevice(slot.seed, slot.seedCapacity, atlasPixels, slot.allocationCount)
      && reserveDevice(slot.integral, slot.integralCapacity, atlasPixels, slot.allocationCount)
      && reserveDevice(slot.rowKeys, slot.rowKeysCapacity, atlasPixels, slot.allocationCount);
    const dim3 block(16, 16), imageGrid((width + 15) / 16, (height + 15) / 16);
    if (ok) {
      modulationKernel<<<imageGrid, block, 0, slot.stream>>>(
        slot.source, slot.modulation, width, height, sourceFlipY, slot.parameters);
      const dim3 atlasGrid((atlasWidth + 15) / 16, (atlasHeight + 15) / 16);
      fmSeedKernel<<<atlasGrid, block, 0, slot.stream>>>(slot.modulation, slot.seed, slot.rowKeys, width, height,
        atlasWidth, atlasHeight, slot.parameters, signalTime);
      ok = cudaGetLastError() == cudaSuccess;
    }
    std::size_t workspaceBytes = 0;
    if (ok) {
      ok = cub::DeviceScan::InclusiveScanByKey(nullptr, workspaceBytes, slot.rowKeys, slot.seed,
        slot.integral, cub::Sum(), static_cast<int>(atlasPixels), cub::Equality(), slot.stream) == cudaSuccess;
    }
    if (ok && workspaceBytes > slot.scanWorkspaceCapacity) {
      if (slot.scanWorkspace) cudaFree(slot.scanWorkspace);
      slot.scanWorkspace = nullptr;
      slot.scanWorkspaceCapacity = 0;
      ok = cudaMalloc(&slot.scanWorkspace, workspaceBytes) == cudaSuccess;
      if (ok) {
        slot.scanWorkspaceCapacity = workspaceBytes;
        ++slot.allocationCount;
      }
    }
    if (ok) {
      ok = cub::DeviceScan::InclusiveScanByKey(slot.scanWorkspace, workspaceBytes, slot.rowKeys,
        slot.seed, slot.integral, cub::Sum(), static_cast<int>(atlasPixels), cub::Equality(), slot.stream) == cudaSuccess;
    }
  }

  if (ok) {
    const dim3 block(16, 16), grid((width + 15) / 16, (height + 15) / 16);
    renderKernel<<<grid, block, 0, slot.stream>>>(slot.source, slot.output, width, height,
      slot.parameters, signalTime, fmEnabled ? slot.integral : nullptr,
      atlasWidth, atlasHeight, sourceFlipY, outputFlipY);
    ok = cudaGetLastError() == cudaSuccess
      && cudaMemcpy2DAsync(outputBase, outputPitch, slot.output, rowBytes, rowBytes, height,
                           cudaMemcpyDeviceToHost, slot.stream) == cudaSuccess;
  }
  const auto synchronized = cudaStreamSynchronize(slot.stream);
  return ok && synchronized == cudaSuccess ? RenderStatus::Ok : RenderStatus::CudaError;
}

RenderStatus renderCuda(const RenderRequest& request) {
  thread_local CudaRenderContext context;
  return context.render(request);
}

}  // namespace broken_fm
