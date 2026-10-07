#pragma once
#include <string>
#include <vector>
#include "grid_rot/core.hpp"

namespace grid_rot::ofx {

struct CompanionState {
  std::string name;
  int mode = 4;
  ParameterValues values{};
};

struct CompanionResult {
  bool applied = false;
  CompanionState state{};
  std::string message;
};

std::vector<unsigned char> makePreviewBmp(const ConstImageView& source);
CompanionResult editInCompanion(
    const CompanionState& current,
    const std::vector<unsigned char>& preview);

}  // namespace grid_rot::ofx
