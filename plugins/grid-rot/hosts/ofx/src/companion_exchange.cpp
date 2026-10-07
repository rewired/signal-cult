#include "companion_exchange.hpp"
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <filesystem>
#include <fstream>
#include <stdexcept>
#include <windows.h>
#include <shlobj.h>
#include <objbase.h>
#include <nlohmann/json.hpp>

namespace grid_rot::ofx {
namespace {
using json = nlohmann::json;

struct SessionFiles {
  std::filesystem::path directory;
  ~SessionFiles() {
    if (directory.empty()) return;
    std::error_code ignored;
    for (const auto* name : {L"input.json", L"result.json", L"result.tmp", L"preview.bmp"})
      std::filesystem::remove(directory / name, ignored);
    std::filesystem::remove(directory, ignored);
  }
};

std::filesystem::path companionPath() {
  wchar_t executable[32768]{};
  DWORD bytes = sizeof(executable);
  if (RegGetValueW(
          HKEY_CURRENT_USER,
          L"Software\\rewired-vfx\\GRID ROT",
          L"CompanionPath",
          RRF_RT_REG_SZ,
          nullptr,
          executable,
          &bytes) != ERROR_SUCCESS ||
      !std::filesystem::is_regular_file(executable))
    throw std::runtime_error("GRID ROT Companion is not installed");
  return executable;
}

std::filesystem::path exchangeDirectory() {
  PWSTR local = nullptr;
  if (SHGetKnownFolderPath(FOLDERID_LocalAppData, KF_FLAG_CREATE, nullptr, &local) != S_OK ||
      !local)
    throw std::runtime_error("LocalAppData unavailable");
  std::filesystem::path root(local);
  CoTaskMemFree(local);
  GUID guid{};
  if (CoCreateGuid(&guid) != S_OK) throw std::runtime_error("Could not create edit session");
  wchar_t token[40]{};
  StringFromGUID2(guid, token, 40);
  auto result = root / L"GRID ROT" / L"Exchange" / token;
  std::filesystem::create_directories(result);
  return result;
}

json encode(const CompanionState& state) {
  json values = json::object();
  for (std::size_t i = 0; i < kParameterDescriptors.size(); ++i)
    values[kParameterDescriptors[i].id] = state.values[i];
  return {
      {"format", "grid-rot-companion-state"},
      {"version", 1},
      {"name", state.name},
      {"mode", state.mode},
      {"values", std::move(values)},
  };
}

CompanionState decode(const json& input) {
  if (input.value("format", "") != "grid-rot-companion-state" ||
      input.value("version", 0) != 1 || !input.contains("values") ||
      !input["values"].is_object())
    throw std::runtime_error("Companion returned an incompatible state");
  CompanionState state;
  state.name = input.value("name", "Resolve Instance");
  state.mode = input.value("mode", -1);
  if (state.mode < 0 || state.mode > 4) throw std::runtime_error("Invalid movement mode");
  const auto& values = input["values"];
  for (std::size_t i = 0; i < kParameterDescriptors.size(); ++i) {
    const auto& descriptor = kParameterDescriptors[i];
    if (!values.contains(descriptor.id) || !values[descriptor.id].is_number())
      throw std::runtime_error(std::string("Missing Companion parameter: ") + descriptor.id);
    const double value = values[descriptor.id].get<double>();
    if (!std::isfinite(value) || value < descriptor.minimum || value > descriptor.maximum)
      throw std::runtime_error(std::string("Invalid Companion parameter: ") + descriptor.id);
    if (descriptor.kind != ParameterKind::Double && std::floor(value) != value)
      throw std::runtime_error(std::string("Non-integral Companion parameter: ") + descriptor.id);
    state.values[i] = value;
  }
  return state;
}

void appendLittleEndian(std::vector<unsigned char>& bytes, std::uint32_t value, int count) {
  for (int i = 0; i < count; ++i) bytes.push_back(static_cast<unsigned char>(value >> (i * 8)));
}
}  // namespace

std::vector<unsigned char> makePreviewBmp(const ConstImageView& source) {
  if (!source.data || source.width <= 0 || source.height <= 0) return {};
  const double scale = std::min({1.0, 960.0 / source.width, 540.0 / source.height});
  const int width = std::max(1, static_cast<int>(std::round(source.width * scale)));
  const int height = std::max(1, static_cast<int>(std::round(source.height * scale)));
  std::vector<unsigned char> bytes;
  bytes.reserve(54 + std::size_t(width) * height * 4);
  bytes.push_back('B');
  bytes.push_back('M');
  appendLittleEndian(bytes, 54 + width * height * 4, 4);
  appendLittleEndian(bytes, 0, 4);
  appendLittleEndian(bytes, 54, 4);
  appendLittleEndian(bytes, 40, 4);
  appendLittleEndian(bytes, width, 4);
  appendLittleEndian(bytes, height, 4);
  appendLittleEndian(bytes, 1, 2);
  appendLittleEndian(bytes, 32, 2);
  appendLittleEndian(bytes, 0, 4);
  appendLittleEndian(bytes, width * height * 4, 4);
  appendLittleEndian(bytes, 2835, 4);
  appendLittleEndian(bytes, 2835, 4);
  appendLittleEndian(bytes, 0, 4);
  appendLittleEndian(bytes, 0, 4);
  for (int y = 0; y < height; ++y) {
    const int sourceY = std::clamp(
        static_cast<int>((height - 1 - y + 0.5) * source.height / height), 0, source.height - 1);
    const auto* row = reinterpret_cast<const float*>(
        reinterpret_cast<const unsigned char*>(source.data) +
        std::ptrdiff_t(sourceY) * source.row_bytes);
    for (int x = 0; x < width; ++x) {
      const int sourceX =
          std::clamp(static_cast<int>((x + 0.5) * source.width / width), 0, source.width - 1);
      const auto* pixel = row + sourceX * source.components;
      const auto channel = [&](int index) {
        return static_cast<unsigned char>(
            std::clamp(std::lround(std::clamp(pixel[index], 0.0f, 1.0f) * 255.0f), 0l, 255l));
      };
      bytes.push_back(channel(2));
      bytes.push_back(channel(1));
      bytes.push_back(channel(0));
      bytes.push_back(source.components > 3 ? channel(3) : 255);
    }
  }
  return bytes;
}

CompanionResult editInCompanion(
    const CompanionState& current,
    const std::vector<unsigned char>& preview) {
  SessionFiles files{exchangeDirectory()};
  const auto input = files.directory / L"input.json";
  const auto output = files.directory / L"result.json";
  const auto previewPath = files.directory / L"preview.bmp";
  {
    std::ofstream stream(input);
    stream << encode(current).dump(2);
    if (!stream) throw std::runtime_error("Could not write Companion session");
  }
  bool hasPreview = false;
  if (!preview.empty()) {
    std::ofstream stream(previewPath, std::ios::binary);
    stream.write(reinterpret_cast<const char*>(preview.data()), preview.size());
    hasPreview = bool(stream);
  }
  const auto executable = companionPath();
  std::wstring command =
      L"\"" + executable.wstring() + L"\" --ofx-exchange \"" + input.wstring() +
      L"\" --ofx-result \"" + output.wstring() + L"\"";
  if (hasPreview) command += L" --ofx-preview \"" + previewPath.wstring() + L"\"";
  STARTUPINFOW startup{};
  startup.cb = sizeof(startup);
  PROCESS_INFORMATION process{};
  if (!CreateProcessW(
          executable.c_str(),
          command.data(),
          nullptr,
          nullptr,
          FALSE,
          CREATE_UNICODE_ENVIRONMENT,
          nullptr,
          executable.parent_path().c_str(),
          &startup,
          &process))
    throw std::runtime_error("Could not launch GRID ROT Companion");
  CloseHandle(process.hThread);
  WaitForSingleObject(process.hProcess, INFINITE);
  DWORD exitCode = 1;
  GetExitCodeProcess(process.hProcess, &exitCode);
  CloseHandle(process.hProcess);
  if (exitCode != 0 || !std::filesystem::is_regular_file(output))
    return {false, current, "Companion edit cancelled"};
  if (std::filesystem::file_size(output) > 128 * 1024)
    throw std::runtime_error("Companion result exceeds 128 KB");
  std::ifstream stream(output);
  json returned;
  stream >> returned;
  return {true, decode(returned), "Applied from Companion"};
}

}  // namespace grid_rot::ofx
