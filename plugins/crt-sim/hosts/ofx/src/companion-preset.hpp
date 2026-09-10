#pragma once
#include <array>
#include <cmath>
#include <stdexcept>
#include <nlohmann/json.hpp>
#include "parameters.hpp"
struct CompanionPreset {std::array<double,std::size(parameterDefs)> values;int mask;};
inline CompanionPreset validateCompanionPreset(const nlohmann::json& preset){
 if(!preset.contains("version")||!preset["version"].is_number_integer()||preset["version"]!=1||!preset.contains("params")||!preset["params"].is_object()||!preset.contains("maskType")||!preset["maskType"].is_number_integer())throw std::runtime_error("Incompatible CRT preset");
 CompanionPreset out{};out.mask=preset["maskType"].get<int>();if(out.mask<0||out.mask>=int(std::size(maskNames)))throw std::runtime_error("Invalid mask type");
 for(size_t i=0;i<out.values.size();++i){const auto& d=parameterDefs[i];const auto& p=preset.at("params");if(!p.contains(d.id)||!p[d.id].is_number())throw std::runtime_error("Incomplete CRT preset");double v=p[d.id].get<double>();if(!std::isfinite(v)||v<d.min||v>d.max||((d.choice||d.toggle||d.integer)&&std::floor(v)!=v))throw std::runtime_error("Invalid CRT parameter");out.values[i]=v;}
 return out;
}
