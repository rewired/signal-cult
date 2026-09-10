#include <algorithm>
#include <array>
#include <chrono>
#include <cmath>
#include <cstddef>
#include <cstring>
#include <filesystem>
#include <fstream>
#include <memory>
#include <mutex>
#include <sstream>
#include <string>
#include <string_view>
#include <vector>

#include <windows.h>
#include <shlobj.h>
#include <nlohmann/json.hpp>

#include "broken_fm/core.hpp"
#include "ofxCore.h"
#include "ofxGPURender.h"
#include "ofxImageEffect.h"
#include "ofxParam.h"
#include "ofxProperty.h"

namespace {

constexpr const char* kIdentifier = "com.rewired-vfx.broken-fm";
constexpr const char* kEditParam = "brokenFmEdit";
constexpr const char* kRetriggerParam = "brokenFmRetrigger";
constexpr const char* kTransportOriginParam = "brokenFmTransportOrigin";
constexpr const char* kStatusParam = "brokenFmStatus";

OfxHost* host = nullptr;
const OfxPropertySuiteV1* properties = nullptr;
const OfxImageEffectSuiteV1* effects = nullptr;
const OfxParameterSuiteV1* parameters = nullptr;

struct Instance {
  OfxImageEffectHandle effect = nullptr;
  OfxImageClipHandle source = nullptr;
  OfxImageClipHandle output = nullptr;
  OfxParamHandle transport_origin = nullptr;
  std::array<OfxParamHandle, static_cast<std::size_t>(broken_fm::ParameterId::Count)> values{};
  std::mutex preview_mutex;
  std::vector<std::uint8_t> preview_bmp;
  double preview_frame = -1e30;
  broken_fm::CudaRenderContext cuda;
};

struct Image {
  OfxPropertySetHandle handle = nullptr;
  void* data = nullptr;
  int row_bytes = 0;
  OfxRectI bounds{};
  ~Image() { if (handle && effects) effects->clipReleaseImage(handle); }
};

std::vector<std::string> splitChoices(const char* encoded) {
  std::vector<std::string> result;
  std::stringstream stream(encoded ? encoded : "");
  for (std::string item; std::getline(stream, item, '|');) result.push_back(item);
  return result;
}

std::string groupParameterId(std::string_view group) {
  return "brokenFmGroup_" + std::string(group);
}

bool nativeParameterEnabled(const broken_fm::ParameterDescriptor& descriptor) {
  const std::string_view id(descriptor.id), group(descriptor.group);
  return group != "feedback" && id != "phosphorPersistence" && id != "audioAttack" && id != "audioRelease";
}

OfxStatus fetchSuites() {
  if (!host || !host->fetchSuite) return kOfxStatErrMissingHostFeature;
  properties = static_cast<const OfxPropertySuiteV1*>(host->fetchSuite(host->host, kOfxPropertySuite, 1));
  effects = static_cast<const OfxImageEffectSuiteV1*>(host->fetchSuite(host->host, kOfxImageEffectSuite, 1));
  parameters = static_cast<const OfxParameterSuiteV1*>(host->fetchSuite(host->host, kOfxParameterSuite, 1));
  return properties && effects && parameters ? kOfxStatOK : kOfxStatErrMissingHostFeature;
}

OfxStatus describe(OfxImageEffectHandle effect) {
  if (fetchSuites() != kOfxStatOK) return kOfxStatErrMissingHostFeature;
  OfxPropertySetHandle props = nullptr;
  if (effects->getPropertySet(effect, &props) != kOfxStatOK) return kOfxStatErrBadHandle;
  properties->propSetString(props, kOfxPropLabel, 0, "BROKEN FM");
  properties->propSetString(props, kOfxImageEffectPluginPropGrouping, 0, "rewired-vfx");
  properties->propSetString(props, kOfxImageEffectPropSupportedContexts, 0, kOfxImageEffectContextFilter);
  properties->propSetString(props, kOfxImageEffectPropSupportedPixelDepths, 0, kOfxBitDepthFloat);
  properties->propSetInt(props, kOfxImageEffectPropSupportsTiles, 0, 0);
  properties->propSetInt(props, kOfxImageEffectPropSupportsMultiResolution, 0, 1);
  properties->propSetInt(props, kOfxImageEffectPluginPropSingleInstance, 0, 0);
  properties->propSetString(props, kOfxImageEffectPluginRenderThreadSafety, 0, kOfxImageEffectRenderFullySafe);
  properties->propSetInt(props, kOfxImageEffectPropTemporalClipAccess, 0, 0);
  properties->propSetInt(props, kOfxImageEffectPropCPURenderSupported, 0, 1);
  return kOfxStatOK;
}

OfxStatus defineClip(OfxImageEffectHandle effect, const char* name) {
  OfxPropertySetHandle descriptor = nullptr;
  const auto status = effects->clipDefine(effect, name, &descriptor);
  if (status != kOfxStatOK) return status;
  properties->propSetString(descriptor, kOfxImageEffectPropSupportedComponents, 0, kOfxImageComponentRGBA);
  return kOfxStatOK;
}

OfxStatus describeInContext(OfxImageEffectHandle effect) {
  if (defineClip(effect, kOfxImageEffectSimpleSourceClipName) != kOfxStatOK
      || defineClip(effect, kOfxImageEffectOutputClipName) != kOfxStatOK) return kOfxStatErrValue;
  OfxParamSetHandle set = nullptr;
  if (effects->getParamSet(effect, &set) != kOfxStatOK) return kOfxStatErrBadHandle;

  OfxPropertySetHandle edit = nullptr;
  parameters->paramDefine(set, kOfxParamTypePushButton, kEditParam, &edit);
  properties->propSetString(edit, kOfxPropLabel, 0, "Open BROKEN FM …");
  OfxPropertySetHandle retrigger = nullptr;
  parameters->paramDefine(set, kOfxParamTypePushButton, kRetriggerParam, &retrigger);
  properties->propSetString(retrigger, kOfxPropLabel, 0, "Retrigger LFOs");
  OfxPropertySetHandle transportOrigin = nullptr;
  parameters->paramDefine(set, kOfxParamTypeDouble, kTransportOriginParam, &transportOrigin);
  properties->propSetString(transportOrigin, kOfxPropLabel, 0, "Transport Origin");
  properties->propSetDouble(transportOrigin, kOfxParamPropDefault, 0, 0.0);
  properties->propSetInt(transportOrigin, kOfxParamPropAnimates, 0, 0);
  properties->propSetInt(transportOrigin, kOfxParamPropSecret, 0, 1);
  OfxPropertySetHandle status = nullptr;
  parameters->paramDefine(set, kOfxParamTypeString, kStatusParam, &status);
  properties->propSetString(status, kOfxPropLabel, 0, "Editor Status");
  properties->propSetString(status, kOfxParamPropDefault, 0, "Native core ready");
  properties->propSetInt(status, kOfxParamPropAnimates, 0, 0);
  properties->propSetInt(status, kOfxParamPropEnabled, 0, 0);

  std::vector<std::string> groups;
  for (const auto& descriptor : broken_fm::kParameterDescriptors) {
    if (std::find(groups.begin(), groups.end(), descriptor.group) != groups.end()) continue;
    groups.emplace_back(descriptor.group);
    const auto groupId = groupParameterId(descriptor.group);
    OfxPropertySetHandle group = nullptr;
    const auto result = parameters->paramDefine(set, kOfxParamTypeGroup, groupId.c_str(), &group);
    if (result != kOfxStatOK) return result;
    properties->propSetString(group, kOfxPropLabel, 0, descriptor.group);
  }

  for (const auto& descriptor : broken_fm::kParameterDescriptors) {
    const char* type = descriptor.type == broken_fm::ParameterType::Double ? kOfxParamTypeDouble
      : descriptor.type == broken_fm::ParameterType::Integer ? kOfxParamTypeInteger : kOfxParamTypeChoice;
    OfxPropertySetHandle param = nullptr;
    const auto result = parameters->paramDefine(set, type, descriptor.id, &param);
    if (result != kOfxStatOK) return result;
    properties->propSetString(param, kOfxPropLabel, 0, descriptor.label);
    const auto groupId = groupParameterId(descriptor.group);
    properties->propSetString(param, kOfxParamPropParent, 0, groupId.c_str());
    properties->propSetInt(param, kOfxParamPropAnimates, 0, descriptor.animatable ? 1 : 0);
    if (!nativeParameterEnabled(descriptor)) {
      properties->propSetInt(param, kOfxParamPropEnabled, 0, 0);
      properties->propSetString(param, kOfxParamPropHint, 0, "Preserved for preset round-trip; native v0.1 processing is pending.");
    }
    if (descriptor.type == broken_fm::ParameterType::Double) {
      properties->propSetDouble(param, kOfxParamPropDefault, 0, descriptor.default_value);
      properties->propSetDouble(param, kOfxParamPropMin, 0, descriptor.minimum);
      properties->propSetDouble(param, kOfxParamPropMax, 0, descriptor.maximum);
      properties->propSetDouble(param, kOfxParamPropDisplayMin, 0, descriptor.minimum);
      properties->propSetDouble(param, kOfxParamPropDisplayMax, 0, descriptor.maximum);
    } else {
      properties->propSetInt(param, kOfxParamPropDefault, 0, static_cast<int>(descriptor.default_value));
      properties->propSetInt(param, kOfxParamPropMin, 0, static_cast<int>(descriptor.minimum));
      properties->propSetInt(param, kOfxParamPropMax, 0, static_cast<int>(descriptor.maximum));
      if (descriptor.type == broken_fm::ParameterType::Choice) {
        const auto choices = splitChoices(descriptor.choices);
        for (std::size_t i = 0; i < choices.size(); ++i) properties->propSetString(param, kOfxParamPropChoiceOption, static_cast<int>(i), choices[i].c_str());
      }
    }
  }
  return kOfxStatOK;
}

OfxStatus instanceFromEffect(OfxImageEffectHandle effect, Instance*& instance) {
  OfxPropertySetHandle props = nullptr; void* raw = nullptr;
  if (effects->getPropertySet(effect, &props) != kOfxStatOK
      || properties->propGetPointer(props, kOfxPropInstanceData, 0, &raw) != kOfxStatOK || !raw) return kOfxStatErrBadHandle;
  instance = static_cast<Instance*>(raw); return kOfxStatOK;
}

OfxStatus createInstance(OfxImageEffectHandle effect) {
  auto instance = std::make_unique<Instance>(); instance->effect = effect;
  if (effects->clipGetHandle(effect, kOfxImageEffectSimpleSourceClipName, &instance->source, nullptr) != kOfxStatOK
      || effects->clipGetHandle(effect, kOfxImageEffectOutputClipName, &instance->output, nullptr) != kOfxStatOK) return kOfxStatErrBadHandle;
  OfxParamSetHandle set = nullptr;
  if (effects->getParamSet(effect, &set) != kOfxStatOK) return kOfxStatErrBadHandle;
  if (parameters->paramGetHandle(set, kTransportOriginParam, &instance->transport_origin, nullptr) != kOfxStatOK) return kOfxStatErrBadHandle;
  for (std::size_t i = 0; i < broken_fm::kParameterDescriptors.size(); ++i) {
    if (parameters->paramGetHandle(set, broken_fm::kParameterDescriptors[i].id, &instance->values[i], nullptr) != kOfxStatOK) return kOfxStatErrBadHandle;
  }
  OfxPropertySetHandle props = nullptr;
  if (effects->getPropertySet(effect, &props) != kOfxStatOK
      || properties->propSetPointer(props, kOfxPropInstanceData, 0, instance.get()) != kOfxStatOK) return kOfxStatErrBadHandle;
  instance.release(); return kOfxStatOK;
}

OfxStatus destroyInstance(OfxImageEffectHandle effect) {
  Instance* instance = nullptr; const auto result = instanceFromEffect(effect, instance);
  if (result != kOfxStatOK) return result;
  delete instance;
  OfxPropertySetHandle props = nullptr;
  if (effects->getPropertySet(effect, &props) == kOfxStatOK) properties->propSetPointer(props, kOfxPropInstanceData, 0, nullptr);
  return kOfxStatOK;
}

bool getImage(OfxImageClipHandle clip, OfxTime time, Image& image) {
  char* depth = nullptr; char* components = nullptr;
  return effects->clipGetImage(clip, time, nullptr, &image.handle) == kOfxStatOK && image.handle
    && properties->propGetPointer(image.handle, kOfxImagePropData, 0, &image.data) == kOfxStatOK
    && properties->propGetInt(image.handle, kOfxImagePropRowBytes, 0, &image.row_bytes) == kOfxStatOK
    && properties->propGetIntN(image.handle, kOfxImagePropBounds, 4, &image.bounds.x1) == kOfxStatOK
    && properties->propGetString(image.handle, kOfxImageEffectPropPixelDepth, 0, &depth) == kOfxStatOK
    && properties->propGetString(image.handle, kOfxImageEffectPropComponents, 0, &components) == kOfxStatOK
    && depth && components && std::strcmp(depth, kOfxBitDepthFloat) == 0 && std::strcmp(components, kOfxImageComponentRGBA) == 0;
}

void appendLe(std::vector<std::uint8_t>& bytes, std::uint32_t value, int count) {
  for (int i = 0; i < count; ++i) bytes.push_back(static_cast<std::uint8_t>((value >> (i * 8)) & 0xff));
}

std::vector<std::uint8_t> makePreviewBmp(const Image& source) {
  const int sourceWidth = source.bounds.x2 - source.bounds.x1;
  const int sourceHeight = source.bounds.y2 - source.bounds.y1;
  const double scale = std::min({1.0, 960.0 / sourceWidth, 540.0 / sourceHeight});
  const int width = std::max(1, static_cast<int>(std::round(sourceWidth * scale)));
  const int height = std::max(1, static_cast<int>(std::round(sourceHeight * scale)));
  const std::uint32_t pixelBytes = static_cast<std::uint32_t>(width * height * 4);
  std::vector<std::uint8_t> bmp; bmp.reserve(54 + pixelBytes);
  bmp.push_back('B'); bmp.push_back('M'); appendLe(bmp, 54 + pixelBytes, 4); appendLe(bmp, 0, 4); appendLe(bmp, 54, 4);
  appendLe(bmp, 40, 4); appendLe(bmp, width, 4); appendLe(bmp, height, 4); appendLe(bmp, 1, 2); appendLe(bmp, 32, 2);
  appendLe(bmp, 0, 4); appendLe(bmp, pixelBytes, 4); appendLe(bmp, 2835, 4); appendLe(bmp, 2835, 4); appendLe(bmp, 0, 4); appendLe(bmp, 0, 4);
  const auto encode = [](float value) {
    value = std::clamp(value, 0.0f, 1.0f);
    const float srgb = value <= .0031308f ? value * 12.92f : 1.055f * std::pow(value, 1.0f / 2.4f) - .055f;
    return static_cast<std::uint8_t>(std::round(std::clamp(srgb, 0.0f, 1.0f) * 255));
  };
  for (int y = 0; y < height; ++y) {
    const int sy = std::min(sourceHeight - 1, static_cast<int>((y + .5) * sourceHeight / height));
    const auto* row = reinterpret_cast<const float*>(reinterpret_cast<const std::byte*>(source.data) + sy * source.row_bytes);
    for (int x = 0; x < width; ++x) {
      const int sx = std::min(sourceWidth - 1, static_cast<int>((x + .5) * sourceWidth / width));
      const float* pixel = row + sx * 4; const float alpha = std::max(pixel[3], 1e-6f);
      bmp.push_back(encode(pixel[2] / alpha)); bmp.push_back(encode(pixel[1] / alpha)); bmp.push_back(encode(pixel[0] / alpha)); bmp.push_back(255);
    }
  }
  return bmp;
}

broken_fm::ParameterValues readValues(const Instance& instance, OfxTime time) {
  auto values = broken_fm::defaultParameters();
  for (std::size_t i = 0; i < values.size(); ++i) {
    const auto& descriptor = broken_fm::kParameterDescriptors[i];
    if (descriptor.type == broken_fm::ParameterType::Double) parameters->paramGetValueAtTime(instance.values[i], time, &values[i]);
    else { int value = 0; parameters->paramGetValueAtTime(instance.values[i], time, &value); values[i] = value; }
  }
  return values;
}

bool nativeSupports(const broken_fm::ParameterValues& values) {
  const auto get = [&](broken_fm::ParameterId id) { return values[static_cast<std::size_t>(id)]; };
  if (static_cast<int>(get(broken_fm::ParameterId::CarrierShape)) == 6) return false;
  if (static_cast<int>(get(broken_fm::ParameterId::CarrierShape)) == 5
      && static_cast<int>(get(broken_fm::ParameterId::Wavetable)) == 3) return false;
  if (get(broken_fm::ParameterId::FeedbackAmount) > 0.000001
      || get(broken_fm::ParameterId::PhosphorPersistence) > 0.000001) return false;
  for (int slot = 0; slot < 4; ++slot) {
    const auto source = static_cast<broken_fm::ParameterId>(static_cast<std::size_t>(broken_fm::ParameterId::AudioSource1) + slot * 3);
    const auto destination = static_cast<broken_fm::ParameterId>(static_cast<std::size_t>(broken_fm::ParameterId::AudioDestination1) + slot * 3);
    const auto amount = static_cast<broken_fm::ParameterId>(static_cast<std::size_t>(broken_fm::ParameterId::AudioAmount1) + slot * 3);
    const int sourceValue = static_cast<int>(get(source)), destinationValue = static_cast<int>(get(destination));
    if (std::abs(get(amount)) <= 0.000001 || destinationValue == 0) continue;
    if (sourceValue >= 1 && sourceValue <= 5) return false;
    if (destinationValue == 5 || destinationValue == 11 || destinationValue == 12 || destinationValue == 16 || destinationValue == 20) return false;
  }
  return true;
}

OfxStatus render(OfxImageEffectHandle effect, OfxPropertySetHandle inArgs) {
  Instance* instance = nullptr; if (instanceFromEffect(effect, instance) != kOfxStatOK) return kOfxStatErrBadHandle;
  OfxTime time = 0; if (properties->propGetDouble(inArgs, kOfxPropTime, 0, &time) != kOfxStatOK) return kOfxStatErrValue;
  Image source, output;
  if (!getImage(instance->source, time, source) || !getImage(instance->output, time, output)) return kOfxStatErrImageFormat;
  const int width = source.bounds.x2 - source.bounds.x1, height = source.bounds.y2 - source.bounds.y1;
  if (width != output.bounds.x2 - output.bounds.x1 || height != output.bounds.y2 - output.bounds.y1) return kOfxStatErrImageFormat;
  {
    std::lock_guard lock(instance->preview_mutex);
    if (instance->preview_bmp.empty() || std::abs(time - instance->preview_frame) >= 12.0) {
      instance->preview_bmp = makePreviewBmp(source);
      instance->preview_frame = time;
    }
  }
  OfxPropertySetHandle effectProps = nullptr; double frameRate = 24;
  if (effects->getPropertySet(effect, &effectProps) == kOfxStatOK) properties->propGetDouble(effectProps, kOfxImageEffectPropFrameRate, 0, &frameRate);
  const auto values = readValues(*instance, time);
  if (!nativeSupports(values)) return kOfxStatErrUnsupported;
  broken_fm::RenderRequest request{{static_cast<const float*>(source.data), width, height, source.row_bytes},
    {static_cast<float*>(output.data), width, height, output.row_bytes}, values, time / std::max(frameRate, 1.0), frameRate};
  parameters->paramGetValue(instance->transport_origin, &request.transport_origin_seconds);
  auto status = instance->cuda.render(request);
  if (status == broken_fm::RenderStatus::CudaUnavailable || status == broken_fm::RenderStatus::CudaError) status = broken_fm::renderCpu(request);
  return status == broken_fm::RenderStatus::Ok ? kOfxStatOK : kOfxStatErrValue;
}

std::filesystem::path exchangeDirectory() {
  PWSTR raw = nullptr;
  if (SHGetKnownFolderPath(FOLDERID_LocalAppData, KF_FLAG_CREATE, nullptr, &raw) != S_OK || !raw) throw std::runtime_error("LocalAppData unavailable");
  std::filesystem::path result(raw); CoTaskMemFree(raw); result /= L"BROKEN FM"; result /= L"Exchange";
  std::filesystem::create_directories(result); return result;
}

std::filesystem::path companionPath() {
  wchar_t value[32768]{}; DWORD bytes = sizeof(value);
  if (RegGetValueW(HKEY_CURRENT_USER, L"Software\\rewired-vfx\\BROKEN FM", L"CompanionPath", RRF_RT_REG_SZ, nullptr, value, &bytes) == ERROR_SUCCESS
      && std::filesystem::is_regular_file(value)) return value;
  throw std::runtime_error("BROKEN FM Companion is not installed");
}

void setStatus(OfxImageEffectHandle effect, const std::string& message) {
  OfxParamSetHandle set = nullptr; OfxParamHandle status = nullptr;
  if (effects->getParamSet(effect, &set) == kOfxStatOK && parameters->paramGetHandle(set, kStatusParam, &status, nullptr) == kOfxStatOK)
    parameters->paramSetValue(status, message.c_str());
}

nlohmann::json serializePreset(const Instance& instance, OfxTime time) {
  const auto values = readValues(instance, time); nlohmann::json encoded = nlohmann::json::object();
  for (std::size_t i = 0; i < values.size(); ++i) {
    const auto& descriptor = broken_fm::kParameterDescriptors[i];
    if (descriptor.type == broken_fm::ParameterType::Choice) {
      const auto choices = splitChoices(descriptor.choices); const int selected = static_cast<int>(values[i]);
      encoded[descriptor.id] = choices[std::clamp(selected, 0, static_cast<int>(choices.size()) - 1)];
    } else if (descriptor.type == broken_fm::ParameterType::Integer) encoded[descriptor.id] = static_cast<int>(values[i]);
    else encoded[descriptor.id] = values[i];
  }
  return {{"format", "broken-fm-preset"}, {"version", 16}, {"name", "Resolve Instance"}, {"parameters", encoded}};
}

void applyPreset(Instance& instance, const nlohmann::json& preset) {
  if (preset.value("format", "") != "broken-fm-preset" || preset.value("version", 0) != 16 || !preset.contains("parameters"))
    throw std::runtime_error("Companion returned an incompatible preset");
  const auto& values = preset.at("parameters");
  for (std::size_t i = 0; i < instance.values.size(); ++i) {
    const auto& descriptor = broken_fm::kParameterDescriptors[i]; if (!values.contains(descriptor.id)) throw std::runtime_error("Companion preset is incomplete");
    if (descriptor.type == broken_fm::ParameterType::Choice) {
      const auto choices = splitChoices(descriptor.choices); const auto value = values.at(descriptor.id).get<std::string>();
      const auto found = std::find(choices.begin(), choices.end(), value); if (found == choices.end()) throw std::runtime_error("Invalid Companion choice");
      parameters->paramSetValue(instance.values[i], static_cast<int>(found - choices.begin()));
    } else if (descriptor.type == broken_fm::ParameterType::Integer) parameters->paramSetValue(instance.values[i], values.at(descriptor.id).get<int>());
    else parameters->paramSetValue(instance.values[i], values.at(descriptor.id).get<double>());
  }
}

void editInCompanion(Instance& instance, OfxTime time) {
  const auto now = std::chrono::high_resolution_clock::now().time_since_epoch().count();
  const auto directory = exchangeDirectory(); const auto input = directory / (std::to_wstring(now) + L".input.json");
  const auto output = directory / (std::to_wstring(now) + L".result.json");
  const auto preview = directory / (std::to_wstring(now) + L".preview.bmp");
  { std::ofstream stream(input); stream << serializePreset(instance, time).dump(2); }
  bool hasPreview = false;
  {
    std::lock_guard lock(instance.preview_mutex);
    if (!instance.preview_bmp.empty()) {
      std::ofstream stream(preview, std::ios::binary); stream.write(reinterpret_cast<const char*>(instance.preview_bmp.data()), instance.preview_bmp.size()); hasPreview = true;
    }
  }
  const auto executable = companionPath();
  std::wstring command = L"\"" + executable.wstring() + L"\" --ofx-exchange \"" + input.wstring() + L"\" --ofx-result \"" + output.wstring() + L"\""
    + (hasPreview ? L" --ofx-preview \"" + preview.wstring() + L"\"" : L"");
  STARTUPINFOW startup{}; startup.cb = sizeof(startup); PROCESS_INFORMATION process{};
  if (!CreateProcessW(executable.c_str(), command.data(), nullptr, nullptr, FALSE, CREATE_UNICODE_ENVIRONMENT, nullptr, executable.parent_path().c_str(), &startup, &process))
    throw std::runtime_error("Could not launch BROKEN FM Companion");
  CloseHandle(process.hThread); WaitForSingleObject(process.hProcess, INFINITE); DWORD exitCode = 1; GetExitCodeProcess(process.hProcess, &exitCode); CloseHandle(process.hProcess);
  if (exitCode == 0 && std::filesystem::is_regular_file(output)) { std::ifstream stream(output); nlohmann::json result; stream >> result; applyPreset(instance, result); setStatus(instance.effect, "Applied from Companion"); }
  else setStatus(instance.effect, "Companion edit cancelled");
  std::error_code ignored; std::filesystem::remove(input, ignored); std::filesystem::remove(output, ignored); std::filesystem::remove(preview, ignored);
}

OfxStatus instanceChanged(OfxImageEffectHandle effect, OfxPropertySetHandle inArgs) {
  char* name = nullptr; if (properties->propGetString(inArgs, kOfxPropName, 0, &name) != kOfxStatOK || !name) return kOfxStatReplyDefault;
  OfxTime time = 0; properties->propGetDouble(inArgs, kOfxPropTime, 0, &time); Instance* instance = nullptr;
  if (instanceFromEffect(effect, instance) != kOfxStatOK) return kOfxStatErrBadHandle;
  if (std::strcmp(name, kRetriggerParam) == 0) {
    OfxPropertySetHandle effectProps = nullptr; double frameRate = 24;
    if (effects->getPropertySet(effect, &effectProps) == kOfxStatOK) properties->propGetDouble(effectProps, kOfxImageEffectPropFrameRate, 0, &frameRate);
    parameters->paramSetValue(instance->transport_origin, time / std::max(frameRate, 1.0));
    setStatus(effect, "Transport LFOs retriggered");
    return kOfxStatOK;
  }
  if (std::strcmp(name, kEditParam) != 0) return kOfxStatReplyDefault;
  try { editInCompanion(*instance, time); } catch (const std::exception& error) { setStatus(effect, error.what()); }
  return kOfxStatOK;
}

OfxStatus mainEntry(const char* action, const void* handle, OfxPropertySetHandle inArgs, OfxPropertySetHandle) {
  auto effect = reinterpret_cast<OfxImageEffectHandle>(const_cast<void*>(handle));
  try {
    if (std::strcmp(action, kOfxActionLoad) == 0) return fetchSuites();
    if (std::strcmp(action, kOfxActionUnload) == 0) return kOfxStatOK;
    if (std::strcmp(action, kOfxActionDescribe) == 0) return describe(effect);
    if (std::strcmp(action, kOfxImageEffectActionDescribeInContext) == 0) return describeInContext(effect);
    if (std::strcmp(action, kOfxActionCreateInstance) == 0) return createInstance(effect);
    if (std::strcmp(action, kOfxActionDestroyInstance) == 0) return destroyInstance(effect);
    if (std::strcmp(action, kOfxImageEffectActionRender) == 0) return render(effect, inArgs);
    if (std::strcmp(action, kOfxActionInstanceChanged) == 0) return instanceChanged(effect, inArgs);
    return kOfxStatReplyDefault;
  } catch (...) { return kOfxStatErrUnknown; }
}

void setHost(OfxHost* value) { host = value; }
OfxPlugin plugin{kOfxImageEffectPluginApi, 1, kIdentifier, 0, 1, setHost, mainEntry};

}  // namespace

extern "C" __declspec(dllexport) int OfxGetNumberOfPlugins() { return 1; }
extern "C" __declspec(dllexport) OfxPlugin* OfxGetPlugin(int index) { return index == 0 ? &plugin : nullptr; }
