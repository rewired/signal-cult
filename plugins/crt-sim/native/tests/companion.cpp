
#include "companion-preset.hpp"
#include <fstream>
#include <iostream>
int main(int argc,char** argv){
 if(argc!=2)return 1;std::ifstream input(argv[1]);nlohmann::json presets;input>>presets;
 for(const auto& p:presets)validateCompanionPreset({{"version",1},{"maskType",p["maskType"]},{"params",p["params"]}});
 nlohmann::json valid={{"version",1},{"maskType",0},{"params",presets[0]["params"]}};
 auto rejects=[](const nlohmann::json& p){try{validateCompanionPreset(p);return false;}catch(...){return true;}};
 auto p=valid;p["params"].erase("scan");if(!rejects(p))return 2;
 p=valid;p["params"]["noiseSeed"]=.5;if(!rejects(p))return 3;
 p=valid;p["params"]["tubeEnabled"]=2;if(!rejects(p))return 4;
 p=valid;p["maskType"]=12;if(!rejects(p))return 5;
 p=valid;p["maskType"]=0.5;if(!rejects(p))return 6;
 p=valid;p["version"]=16;if(!rejects(p))return 7;
 p=valid;p["params"]["scan"]="0.5";if(!rejects(p))return 8;
 std::cout<<"All factory looks accepted; invalid and incomplete companion results rejected\n";
}
