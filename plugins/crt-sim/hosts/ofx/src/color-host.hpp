#pragma once
#include "color.hpp"
#include <string>
#include <algorithm>
#include <cctype>
namespace crt {
inline bool colorFromHost(const char* name,ColorConfig& out){
 if(!name)return false;
 std::string s(name);std::transform(s.begin(),s.end(),s.begin(),[](unsigned char c){return char(std::tolower(c));});
 struct Alias{const char* name;int gamut,transfer;};
 const Alias aliases[]={
  {"srgb_display",0,1},{"srgb_tx",0,1},{"srgb - display",0,1},{"srgb - texture",0,1},
  {"rec1886_rec709_display",0,0},{"rec.1886 rec.709 - display",0,0},{"g24_rec709_tx",0,0},
  {"rec1886_rec2020_display",3,0},{"rec.1886 rec.2020 - display",3,0},
  {"acescct",2,4},{"acescg",2,2},{"aces2065-1",5,2},
  {"lin_rec709_srgb",0,2},{"linear rec.709 (srgb)",0,2},{"lin_rec2020",3,2},{"linear rec.2020",3,2},
  {"lin_p3d65",4,2},{"linear p3-d65",4,2},{"displayp3_display",4,1},{"display p3 - display",4,1},
  {"rec2100_pq_display",3,5},{"rec.2100-pq - display",3,5},{"rec2100_hlg_display",3,6},{"rec.2100-hlg - display",3,6},
  {"st2084_p3d65_display",4,5},{"st2084-p3-d65 - display",4,5},
  {"davinci intermediate widegamut",1,3},{"davinci wide gamut / davinci intermediate",1,3},{"davinci_intermediate_widegamut",1,3},
  {"g22_rec709_tx",0,7}
 };
 for(const auto& a:aliases)if(s==a.name){out.gamut=a.gamut;out.transfer=a.transfer;return true;}
 // Generic linear/log tags do not identify primaries. Never infer from them.
 return false;
}
} // namespace crt
