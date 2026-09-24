#pragma once

#include <cmath>

#include "broken_fm/core.hpp"

namespace broken_fm::ofx {

inline bool nativeSupports(const ParameterValues& values) {
  const auto get = [&](ParameterId id) { return values[static_cast<std::size_t>(id)]; };
  if (static_cast<int>(get(ParameterId::CarrierShape)) == 6) return false;
  if (static_cast<int>(get(ParameterId::CarrierShape)) == 5
      && static_cast<int>(get(ParameterId::Wavetable)) == 3) return false;
  const bool finiteFeedback = static_cast<int>(get(ParameterId::FeedbackModel)) == 1;
  if ((get(ParameterId::FeedbackAmount) > 0.000001 && !finiteFeedback)
      || get(ParameterId::PhosphorPersistence) > 0.000001) return false;
  if (finiteFeedback && static_cast<int>(get(ParameterId::Mode)) == 1
      && static_cast<int>(get(ParameterId::FeedbackInjection)) == 1) return false;
  for (int slot = 0; slot < 4; ++slot) {
    const auto source = static_cast<ParameterId>(static_cast<std::size_t>(ParameterId::AudioSource1) + slot * 3);
    const auto destination = static_cast<ParameterId>(static_cast<std::size_t>(ParameterId::AudioDestination1) + slot * 3);
    const auto amount = static_cast<ParameterId>(static_cast<std::size_t>(ParameterId::AudioAmount1) + slot * 3);
    const int sourceValue = static_cast<int>(get(source)), destinationValue = static_cast<int>(get(destination));
    if (std::abs(get(amount)) <= 0.000001 || destinationValue == 0) continue;
    if (sourceValue >= 1 && sourceValue <= 5) return false;
    if (destinationValue == 5 && !finiteFeedback) return false;
    if (destinationValue == 16) return false;
  }
  return true;
}

}  // namespace broken_fm::ofx
