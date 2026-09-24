#include "broken_fm/core.hpp"

#include "../../hosts/ofx/src/native_support.hpp"

namespace {

void set(broken_fm::ParameterValues& values, broken_fm::ParameterId id, double value) {
  values[static_cast<std::size_t>(id)] = value;
}

}  // namespace

int main() {
  using broken_fm::ParameterId;
  auto values = broken_fm::defaultParameters();
  if (!broken_fm::ofx::nativeSupports(values)) return 1;

  // Preset 56: an LFO modulates feedback phase, but feedback itself is disabled.
  set(values, ParameterId::AudioSource2, 7);
  set(values, ParameterId::AudioDestination2, 20);
  set(values, ParameterId::AudioAmount2, .32);
  if (!broken_fm::ofx::nativeSupports(values)) return 2;

  set(values, ParameterId::FeedbackAmount, .1);
  if (broken_fm::ofx::nativeSupports(values)) return 3;
  set(values, ParameterId::FeedbackAmount, 0);

  // A route that can turn feedback or persistence on must still be rejected.
  set(values, ParameterId::AudioDestination2, 5);
  if (broken_fm::ofx::nativeSupports(values)) return 4;
  set(values, ParameterId::AudioDestination2, 16);
  if (broken_fm::ofx::nativeSupports(values)) return 5;

  // Audio analysis sources remain Companion-only.
  set(values, ParameterId::AudioDestination2, 1);
  set(values, ParameterId::AudioSource2, 1);
  if (broken_fm::ofx::nativeSupports(values)) return 6;

  return 0;
}
