#pragma once

#include <cmath>
#include "broken_fm/core.hpp"

#if defined(__CUDACC__)
#define BFM_HD __host__ __device__
#else
#define BFM_HD
#endif

namespace broken_fm::detail {

constexpr float kTau = 6.2831853071795864769f;
using FloatParameterValues = std::array<float, static_cast<std::size_t>(ParameterId::Count)>;

struct FmIntegralView {
  const float* data = nullptr;
  int width = 0;
  int height = 0;
};

BFM_HD inline float clampf(float value, float low, float high) {
  return value < low ? low : value > high ? high : value;
}
BFM_HD inline float mixf(float a, float b, float amount) { return a + (b - a) * amount; }
BFM_HD inline float fractf(float value) { return value - floorf(value); }
BFM_HD inline float smooth(float edge0, float edge1, float value) {
  if (edge1 <= edge0) return value >= edge0 ? 1.0f : 0.0f;
  const float t = clampf((value - edge0) / (edge1 - edge0), 0.0f, 1.0f);
  return t * t * (3.0f - 2.0f * t);
}
BFM_HD inline float hash21(float x, float y) {
  const float px = fractf(x * 0.1031f);
  const float py = fractf(y * 0.1031f);
  const float pz = fractf(x * 0.1031f);
  const float dot = px * (py + 33.33f) + py * (pz + 33.33f) + pz * (px + 33.33f);
  return fractf((px + py + dot * 2.0f) * (pz + dot));
}
BFM_HD inline float valueNoise(float x, float y) {
  const float ix = floorf(x), iy = floorf(y);
  const float fx = fractf(x), fy = fractf(y);
  const float ux = fx * fx * (3.0f - 2.0f * fx);
  const float uy = fy * fy * (3.0f - 2.0f * fy);
  return mixf(mixf(hash21(ix, iy), hash21(ix + 1, iy), ux),
              mixf(hash21(ix, iy + 1), hash21(ix + 1, iy + 1), ux), uy);
}
BFM_HD inline float signedNoise(float x, float y) { return valueNoise(x, y) * 2.0f - 1.0f; }

template <typename Values>
BFM_HD inline float parameter(const Values& values, ParameterId id) {
  return static_cast<float>(values[static_cast<std::size_t>(id)]);
}

BFM_HD inline FloatParameterValues toFloatParameters(const ParameterValues& values) {
  FloatParameterValues result{};
  for (std::size_t i = 0; i < result.size(); ++i) result[i] = static_cast<float>(values[i]);
  return result;
}

BFM_HD inline float lfoWave(int shape, float phase, float seed) {
  const float cycle = fractf(phase);
  if (shape == 1) return 1.0f - 4.0f * fabsf(cycle - 0.5f);
  if (shape == 2) return cycle * 2.0f - 1.0f;
  if (shape == 3) return cycle < 0.5f ? 1.0f : -1.0f;
  const float cell = floorf(phase);
  if (shape == 4) return hash21(cell + seed, seed * 0.37f) * 2.0f - 1.0f;
  if (shape == 5) {
    const float local = cycle * cycle * (3.0f - 2.0f * cycle);
    return mixf(hash21(cell + seed, seed * 0.37f), hash21(cell + 1 + seed, seed * 0.37f), local) * 2.0f - 1.0f;
  }
  return sinf(cycle * kTau);
}

template <typename Values>
BFM_HD inline float lfo(const Values& values, int index, float time, float transportOrigin) {
  const bool first = index == 1;
  const auto shapeId = first ? ParameterId::Lfo1Shape : ParameterId::Lfo2Shape;
  const auto modeId = first ? ParameterId::Lfo1RateMode : ParameterId::Lfo2RateMode;
  const auto syncId = first ? ParameterId::Lfo1Sync : ParameterId::Lfo2Sync;
  const auto hzId = first ? ParameterId::Lfo1RateHz : ParameterId::Lfo2RateHz;
  const auto bpmId = first ? ParameterId::Lfo1Bpm : ParameterId::Lfo2Bpm;
  const auto divisionId = first ? ParameterId::Lfo1Division : ParameterId::Lfo2Division;
  const auto phaseId = first ? ParameterId::Lfo1Phase : ParameterId::Lfo2Phase;
  const auto polarityId = first ? ParameterId::Lfo1Polarity : ParameterId::Lfo2Polarity;
  const float divisions[7]{0.125f, 0.25f, 0.5f, 1.0f, 2.0f, 4.0f, 8.0f};
  const int division = static_cast<int>(parameter(values, divisionId));
  const float rate = static_cast<int>(parameter(values, modeId)) == 1
    ? parameter(values, bpmId) / 60.0f * divisions[division]
    : parameter(values, hzId);
  // In OFX, transport starts at clip time zero; manual retrigger is a Companion/session concern.
  const float clock = static_cast<int>(parameter(values, syncId)) == 1 ? fmaxf(0.0f, time - transportOrigin) : time;
  float result = lfoWave(static_cast<int>(parameter(values, shapeId)), clock * rate + parameter(values, phaseId),
                         parameter(values, ParameterId::Seed) * 19.19f + index * 101.7f);
  if (static_cast<int>(parameter(values, polarityId)) == 1) result = result * 0.5f + 0.5f;
  return result;
}

BFM_HD inline ParameterValues effectiveParameters(const ParameterValues& base, float time, float transportOrigin = 0.0f) {
  ParameterValues result = base;
  const float sources[8]{0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f, lfo(base, 1, time, transportOrigin), lfo(base, 2, time, transportOrigin)};
  const ParameterId destinations[21]{
    ParameterId::Mode, ParameterId::Frequency, ParameterId::Pwm, ParameterId::CarrierPhase,
    ParameterId::PhaseDepth, ParameterId::FeedbackAmount, ParameterId::ScanAngle, ParameterId::Dropout,
    ParameterId::PhaseJitter, ParameterId::FrequencyDrift, ParameterId::LineJitter,
    ParameterId::FeedbackDisplacement, ParameterId::FeedbackDisplacementAngle,
    ParameterId::HorizontalDrift, ParameterId::VerticalDrift, ParameterId::TimeJitter,
    ParameterId::PhosphorPersistence, ParameterId::SignalNoise, ParameterId::LineJitterScale,
    ParameterId::LineJitterSpeed, ParameterId::FeedbackPhase,
  };
  const float scales[21]{0, 12, .45f, 1, 2, .5f, 180, 1, 1, 8, 40, 48, 180, 120, 120, 30, 3000, 1, 127, 30, 1};
  for (int slot = 0; slot < 4; ++slot) {
    const auto sourceId = static_cast<ParameterId>(static_cast<std::size_t>(ParameterId::AudioSource1) + slot * 3);
    const auto destinationId = static_cast<ParameterId>(static_cast<std::size_t>(ParameterId::AudioDestination1) + slot * 3);
    const auto amountId = static_cast<ParameterId>(static_cast<std::size_t>(ParameterId::AudioAmount1) + slot * 3);
    const int source = static_cast<int>(parameter(base, sourceId));
    const int destination = static_cast<int>(parameter(base, destinationId));
    if (source <= 0 || source >= 8 || destination <= 0 || destination >= 21) continue;
    result[static_cast<std::size_t>(destinations[destination])] += sources[source] * parameter(base, amountId) * scales[destination];
  }
  auto limit = [&](ParameterId id, float low, float high) {
    const auto i = static_cast<std::size_t>(id); result[i] = clampf(static_cast<float>(result[i]), low, high);
  };
  limit(ParameterId::Frequency, .05f, 30); limit(ParameterId::Pwm, .05f, .95f);
  limit(ParameterId::PhaseDepth, 0, 4); limit(ParameterId::FeedbackAmount, 0, 1);
  limit(ParameterId::ScanAngle, -180, 180); limit(ParameterId::Dropout, 0, 1);
  limit(ParameterId::PhaseJitter, 0, 1); limit(ParameterId::FrequencyDrift, 0, 8);
  limit(ParameterId::LineJitter, 0, 40); limit(ParameterId::FeedbackDisplacement, 0, 64);
  limit(ParameterId::FeedbackDisplacementAngle, -180, 180); limit(ParameterId::HorizontalDrift, 0, 120);
  limit(ParameterId::VerticalDrift, 0, 120); limit(ParameterId::TimeJitter, 0, 30);
  limit(ParameterId::PhosphorPersistence, 0, 3000); limit(ParameterId::SignalNoise, 0, 1);
  limit(ParameterId::LineJitterScale, 1, 128); limit(ParameterId::LineJitterSpeed, 0, 30);
  limit(ParameterId::FeedbackPhase, -1, 1);
  return result;
}

BFM_HD inline float sourceChannel(const float* image, int width, int height, int x, int y, int channel,
                                  bool flipY = false) {
  x = x < 0 ? 0 : x >= width ? width - 1 : x;
  y = y < 0 ? 0 : y >= height ? height - 1 : y;
  if (flipY) y = height - 1 - y;
  return image[(static_cast<std::size_t>(y) * width + x) * 4 + channel];
}
BFM_HD inline float lumaAt(const float* image, int width, int height, float x, float y, bool flipY = false) {
  const int ix = static_cast<int>(floorf(x)), iy = static_cast<int>(floorf(y));
  const float fx = fractf(x), fy = fractf(y);
  float samples[4]{};
  int n = 0;
  for (int oy = 0; oy < 2; ++oy) for (int ox = 0; ox < 2; ++ox) {
    const float r = sourceChannel(image, width, height, ix + ox, iy + oy, 0, flipY);
    const float g = sourceChannel(image, width, height, ix + ox, iy + oy, 1, flipY);
    const float b = sourceChannel(image, width, height, ix + ox, iy + oy, 2, flipY);
    samples[n++] = r * .2126f + g * .7152f + b * .0722f;
  }
  return mixf(mixf(samples[0], samples[1], fx), mixf(samples[2], samples[3], fx), fy);
}

template <typename Values>
BFM_HD inline float modulationAt(const float* image, int width, int height, float x, float y, const Values& p,
                                 bool flipY = false) {
  const float luma = lumaAt(image, width, height, x, y, flipY);
  const float shaped = clampf(luma * parameter(p, ParameterId::LumaGain) + parameter(p, ParameterId::LumaBias), 0, 1);
  const float edgeX = lumaAt(image, width, height, x + 1, y, flipY) - lumaAt(image, width, height, x - 1, y, flipY);
  const float edgeY = lumaAt(image, width, height, x, y + 1, flipY) - lumaAt(image, width, height, x, y - 1, flipY);
  const float edge = clampf(sqrtf(edgeX * edgeX + edgeY * edgeY) * parameter(p, ParameterId::EdgeGain), 0, 1);
  const float neighbors = (lumaAt(image, width, height, x - 6, y, flipY) + lumaAt(image, width, height, x + 6, y, flipY)
    + lumaAt(image, width, height, x, y - 6, flipY) + lumaAt(image, width, height, x, y + 6, flipY)) * .25f;
  const float local = clampf(fabsf(luma - neighbors) * parameter(p, ParameterId::LocalContrastGain), 0, 1);
  const int source = static_cast<int>(parameter(p, ParameterId::ModSource));
  float modulation = source == 1 ? 1 - shaped : source == 2 ? edge : source == 3 ? local
    : source == 4 ? clampf(shaped * .72f + edge * .65f, 0, 1) : shaped;
  const float threshold = parameter(p, ParameterId::ModThreshold);
  if (threshold > 0) {
    const float softness = parameter(p, ParameterId::ModSoftness);
    modulation = softness > .00001f ? smooth(threshold - softness * .5f, threshold + softness * .5f, modulation)
                                    : (modulation >= threshold ? 1.0f : 0.0f);
  }
  return modulation;
}

BFM_HD inline float scalarAt(const float* image, int width, int height, int x, int y) {
  x = x < 0 ? 0 : x >= width ? width - 1 : x;
  y = y < 0 ? 0 : y >= height ? height - 1 : y;
  return image[static_cast<std::size_t>(y) * width + x];
}

BFM_HD inline float scalarLinear(const float* image, int width, int height, float x, float y) {
  const int ix = static_cast<int>(floorf(x)), iy = static_cast<int>(floorf(y));
  const float fx = fractf(x), fy = fractf(y);
  return mixf(mixf(scalarAt(image, width, height, ix, iy), scalarAt(image, width, height, ix + 1, iy), fx),
              mixf(scalarAt(image, width, height, ix, iy + 1), scalarAt(image, width, height, ix + 1, iy + 1), fx), fy);
}

inline void fmAtlasDimensions(int width, int height, float scanAngleDegrees, int& atlasWidth, int& atlasHeight) {
  const float angle = scanAngleDegrees * kTau / 360.0f;
  const float c = fabsf(cosf(angle)), s = fabsf(sinf(angle));
  atlasWidth = static_cast<int>(ceilf(width * c + height * s)) + 2;
  atlasHeight = static_cast<int>(ceilf(width * s + height * c)) + 2;
}

template <typename Values>
BFM_HD inline float fmSeedAt(const float* modulation, int width, int height, int atlasX, int atlasY,
                             int atlasWidth, int atlasHeight, const Values& p, float time) {
  const float angle = parameter(p, ParameterId::ScanAngle) * kTau / 360.0f;
  const float dx = cosf(angle), dy = sinf(angle), nx = -dy, ny = dx;
  const float scanX = atlasX + .5f - atlasWidth * .5f;
  const float scanY = atlasY + .5f - atlasHeight * .5f;
  const float outputX = dx * scanX + nx * scanY;
  const float outputY = dy * scanX + ny * scanY;
  if (outputX < width * -.5f || outputX > width * .5f
      || outputY < height * -.5f || outputY > height * .5f) return 0.0f;
  float value = scalarLinear(modulation, width, height,
                             outputX + width * .5f - .5f, outputY + height * .5f - .5f) - .5f;
  if (static_cast<int>(parameter(p, ParameterId::DropoutStage)) == 0) {
    const float seed = parameter(p, ParameterId::Seed);
    const float dropAngle = parameter(p, ParameterId::DropoutAngle) * kTau / 360.0f;
    const float dropNormal = outputX * -sinf(dropAngle) + outputY * cosf(dropAngle);
    const float random = hash21(floorf(dropNormal / 12.0f) + seed * .754877666f + 17.0f,
                                floorf(time * 5.0f) + seed * .569840296f + 53.0f);
    if (random >= 1.0f - parameter(p, ParameterId::Dropout) * .45f) value = 0.0f;
  }
  return value;
}

template <typename Values>
BFM_HD inline float carrier(float cycles, float normal, const Values& p, float time) {
  const float cycle = fractf(cycles);
  const float pwm = parameter(p, ParameterId::Pwm);
  const float warped = cycle < pwm ? .5f * cycle / pwm : .5f + .5f * (cycle - pwm) / (1 - pwm);
  const int shape = static_cast<int>(parameter(p, ParameterId::CarrierShape));
  if (shape == 1) return 1 - 4 * fabsf(warped - .5f);
  if (shape == 2) return warped * 2 - 1;
  if (shape == 3) return cycle < pwm ? 1.0f : -1.0f;
  if (shape == 4) return signedNoise(cycles * parameter(p, ParameterId::NoiseDetail), normal / 96 + parameter(p, ParameterId::Seed) * .071f);
  if (shape == 5) {
    const float phase = cycle * kTau;
    const int table = static_cast<int>(parameter(p, ParameterId::Wavetable));
    if (table == 1) return sinf(phase + 1.15f * sinf(phase * 3));
    if (table == 2) return .55f * sinf(phase) + .3f * sinf(phase * 4) + .15f * sinf(phase * 9);
    return .72f * sinf(phase) + .2f * sinf(phase * 2) + .08f * sinf(phase * 5);
  }
  if (shape == 6) return .65f * sinf((time * 110 + cycles) * kTau) + .35f * sinf((time * 223 + cycles * 1.37f) * kTau);
  return sinf(cycles * kTau);
}

template <typename Values>
BFM_HD inline float visibleSignal(float cycles, float normal, float frequency,
                                  const Values& p, float time) {
  if (static_cast<int>(parameter(p, ParameterId::SignalRender)) != 0) {
    return carrier(cycles, normal, p, time) * .5f + .5f;
  }
  const float angular = fabsf(atan2f(sinf(cycles * kTau), cosf(cycles * kTau)));
  const float phasePerPixel = fmaxf(kTau * fabsf(frequency) / 100, 1e-4f);
  const float distancePx = angular / phasePerPixel;
  return 1 - smooth(parameter(p, ParameterId::LineWidth) * .5f,
                    parameter(p, ParameterId::LineWidth) * .5f
                      + fmaxf(parameter(p, ParameterId::LineSoftness), .25f),
                    distancePx);
}

template <typename Values>
BFM_HD inline float shapeVisibleSignal(float value, const Values& p) {
  value = clampf(value + parameter(p, ParameterId::BlackLevel), 0, 1);
  value = clampf((value - .5f) * parameter(p, ParameterId::Contrast) + .5f, 0, 1);
  value = powf(value, 1 / fmaxf(parameter(p, ParameterId::SignalGamma), .05f));
  return clampf(value * parameter(p, ParameterId::Brightness), 0, 1);
}

template <typename Values>
BFM_HD inline void renderPixel(const float* image, int width, int height, int x, int y,
                               const Values& p, float time, FmIntegralView fmIntegral,
                               bool sourceFlipY, float* output) {
  const float cx = x + .5f - width * .5f, cy = y + .5f - height * .5f;
  const float angle = parameter(p, ParameterId::ScanAngle) * kTau / 360;
  const float dx = cosf(angle), dy = sinf(angle), nx = -dy, ny = dx;
  const float amount = clampf(parameter(p, ParameterId::Instability), 0, 1);
  const float seed = parameter(p, ParameterId::Seed);
  const float clock = time * fmaxf(parameter(p, ParameterId::DriftRate), .001f);
  const float driftX = signedNoise(clock + seed * .754877666f, 41.73f + seed * .569840296f) * parameter(p, ParameterId::HorizontalDrift) * amount;
  const float driftY = signedNoise(clock + seed * .754877666f, 83.19f + seed * .569840296f) * parameter(p, ParameterId::VerticalDrift) * amount;
  const float px = cx - driftX, py = cy - driftY;
  float scan = px * dx + py * dy;
  const float normal = px * nx + py * ny;
  const float lineIndex = floorf(normal / fmaxf(parameter(p, ParameterId::LineJitterScale), 1));
  scan += signedNoise(lineIndex + seed * .754877666f, time * parameter(p, ParameterId::LineJitterSpeed) + seed * .569840296f)
    * parameter(p, ParameterId::LineJitter) * amount;
  const float tearBand = floorf(normal / 28.0f);
  const float tearTime = floorf(time * 3.0f);
  const float seedX = seed * .754877666f, seedY = seed * .569840296f;
  const float tearRandom = hash21(tearBand + seedX + 71, tearTime + seedY + 13);
  const float tearProbability = clampf(parameter(p, ParameterId::LineTear) / 120, 0, 1) * .35f;
  if (tearRandom >= 1 - tearProbability) {
    const float direction = hash21(tearBand + seedX + 31, tearTime + seedY) * 2 - 1;
    scan += direction * parameter(p, ParameterId::LineTear);
  }
  const float driftFrequency = parameter(p, ParameterId::Frequency)
    + signedNoise(clock + seedX, 19.37f + seedY) * parameter(p, ParameterId::FrequencyDrift) * amount;
  float cycles = driftFrequency * scan / 100 + parameter(p, ParameterId::CarrierPhase);
  const float dropAngle = parameter(p, ParameterId::DropoutAngle) * kTau / 360;
  const float dropNormal = px * -sinf(dropAngle) + py * cosf(dropAngle);
  const float dropRandom = hash21(floorf(dropNormal / 12) + seedX + 17, floorf(time * 5) + seedY + 53);
  const bool dropped = dropRandom >= 1 - parameter(p, ParameterId::Dropout) * .45f;
  if (static_cast<int>(parameter(p, ParameterId::Mode)) == 0) {
    float modulation = modulationAt(image, width, height, static_cast<float>(x), static_cast<float>(y), p, sourceFlipY) - .5f;
    if (dropped && static_cast<int>(parameter(p, ParameterId::DropoutStage)) == 0) modulation = 0;
    cycles += parameter(p, ParameterId::PhaseDepth) * modulation * parameter(p, ParameterId::ModulationGain);
  } else if (fmIntegral.data && fmIntegral.width > 0 && fmIntegral.height > 0) {
    const int fmX = static_cast<int>(floorf(scan + fmIntegral.width * .5f));
    const int fmY = static_cast<int>(floorf(normal + fmIntegral.height * .5f));
    const int clampedX = fmX < 0 ? 0 : fmX >= fmIntegral.width ? fmIntegral.width - 1 : fmX;
    const int clampedY = fmY < 0 ? 0 : fmY >= fmIntegral.height ? fmIntegral.height - 1 : fmY;
    const float integral = fmIntegral.data[static_cast<std::size_t>(clampedY) * fmIntegral.width + clampedX];
    cycles += parameter(p, ParameterId::FrequencyDeviation) * parameter(p, ParameterId::ModulationGain)
      * integral / 100;
  }
  const float phaseNoise = signedNoise(scan / 84 + time * 1.1f + seedX,
                                       normal / 36 - time * .65f + seedY);
  const float broadNoise = signedNoise(px / 3.5f + time * 17 + seedX * 31,
                                       py / 3.5f - time * 11 + seedY * 31);
  cycles += (phaseNoise * parameter(p, ParameterId::PhaseJitter) + broadNoise * parameter(p, ParameterId::SignalNoise)) * amount;
  const float value = visibleSignal(cycles, normal, driftFrequency, p, time);
  const int color = static_cast<int>(parameter(p, ParameterId::ColorMode));
  const float inR = sourceChannel(image, width, height, x, y, 0, sourceFlipY);
  const float inG = sourceChannel(image, width, height, x, y, 1, sourceFlipY);
  const float inB = sourceChannel(image, width, height, x, y, 2, sourceFlipY);
  float r = value, g = value, b = value;
  if (color == 1) {
    const float peak = fmaxf(fmaxf(inR, inG), inB);
    if (peak > 1e-4f) { r *= inR / peak; g *= inG / peak; b *= inB / peak; }
  } else if (color == 2) {
    const float offset = parameter(p, ParameterId::RgbPhaseOffset);
    r = visibleSignal(cycles + offset, normal, driftFrequency, p, time);
    b = visibleSignal(cycles - offset, normal, driftFrequency, p, time);
  }
  if (dropped && static_cast<int>(parameter(p, ParameterId::DropoutStage)) != 0) r = g = b = 0;
  r = shapeVisibleSignal(r, p);
  g = shapeVisibleSignal(g, p);
  b = shapeVisibleSignal(b, p);
  const float alpha = clampf(sourceChannel(image, width, height, x, y, 3, sourceFlipY), 0, 1);
  output[0] = r * alpha; output[1] = g * alpha; output[2] = b * alpha; output[3] = alpha;
}

}  // namespace broken_fm::detail
