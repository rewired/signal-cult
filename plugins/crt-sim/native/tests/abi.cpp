#define WIN32_LEAN_AND_MEAN
#define NOMINMAX
#include <windows.h>
#include "ofxImageEffect.h"
#include "ofxColour.h"
#include <map>
#include <vector>
#include <string>
#include <memory>
#include <iostream>
#include <cstring>
struct Store{std::map<std::string,std::vector<std::string>> strings;};
static Store effectStore;static std::vector<std::unique_ptr<Store>> stores;static std::map<std::string,Store*> paramStores;
static OfxPropertySetHandle handle(Store* s){return reinterpret_cast<OfxPropertySetHandle>(s);}
static OfxStatus setString(OfxPropertySetHandle p,const char* key,int i,const char* value){auto& values=reinterpret_cast<Store*>(p)->strings[key];if(values.size()<=size_t(i))values.resize(i+1);values[i]=value;return kOfxStatOK;}
static OfxStatus setInt(OfxPropertySetHandle,const char*,int,int){return kOfxStatOK;}
static OfxStatus setDouble(OfxPropertySetHandle,const char*,int,double){return kOfxStatOK;}
static OfxStatus getProps(OfxImageEffectHandle,OfxPropertySetHandle* out){*out=handle(&effectStore);return kOfxStatOK;}
static OfxStatus getParams(OfxImageEffectHandle,OfxParamSetHandle* out){*out=reinterpret_cast<OfxParamSetHandle>(&effectStore);return kOfxStatOK;}
static OfxStatus clipDefine(OfxImageEffectHandle,const char*,OfxPropertySetHandle* out){stores.push_back(std::make_unique<Store>());*out=handle(stores.back().get());return kOfxStatOK;}
static OfxStatus paramDefine(OfxParamSetHandle,const char*,const char* name,OfxPropertySetHandle* out){stores.push_back(std::make_unique<Store>());paramStores[name]=stores.back().get();*out=handle(stores.back().get());return kOfxStatOK;}
static OfxPropertySuiteV1 properties{};static OfxImageEffectSuiteV1 images{};static OfxParameterSuiteV1 params{};
static const void* fetch(OfxPropertySetHandle,const char* name,int version){if(version!=1)return nullptr;if(!strcmp(name,kOfxPropertySuite))return &properties;if(!strcmp(name,kOfxImageEffectSuite))return &images;if(!strcmp(name,kOfxParameterSuite))return &params;return nullptr;}
int main(int argc,char** argv){if(argc!=2)return 1;HMODULE module=LoadLibraryA(argv[1]);if(!module){std::cerr<<"LoadLibrary error "<<GetLastError()<<"\n";return 2;}
 auto count=reinterpret_cast<int(*)()>(GetProcAddress(module,"OfxGetNumberOfPlugins"));auto get=reinterpret_cast<OfxPlugin*(*)(int)>(GetProcAddress(module,"OfxGetPlugin"));if(!count||!get||count()!=1||get(-1)||get(1))return 3;
 auto plugin=get(0);if(strcmp(plugin->pluginIdentifier,"com.rewiredvfx.crtlab"))return 4;
 properties.propSetString=setString;properties.propSetInt=setInt;properties.propSetDouble=setDouble;images.getPropertySet=getProps;images.getParamSet=getParams;images.clipDefine=clipDefine;params.paramDefine=paramDefine;
 OfxHost host{handle(&effectStore),fetch};plugin->setHost(&host);
 if(plugin->mainEntry(kOfxActionLoad,nullptr,nullptr,nullptr)!=kOfxStatOK)return 5;
 if(plugin->mainEntry(kOfxActionDescribe,&effectStore,nullptr,nullptr)!=kOfxStatOK)return 6;
 if(plugin->mainEntry(kOfxImageEffectActionDescribeInContext,&effectStore,nullptr,nullptr)!=kOfxStatOK)return 7;
 if(paramStores["preset"]->strings[kOfxParamPropChoiceOption].size()!=25||paramStores["maskType"]->strings[kOfxParamPropChoiceOption].size()!=12||paramStores["noiseType"]->strings[kOfxParamPropChoiceOption].size()!=10)return 8;
 if(paramStores["pixelPattern"]->strings[kOfxParamPropChoiceOption].size()!=8||paramStores["pixelPalette"]->strings[kOfxParamPropChoiceOption].size()!=6||!paramStores.count("noiseClumpSpeed"))return 9;
 if(paramStores["encoding"]->strings[kOfxParamPropChoiceOption].size()!=4||paramStores["inputGamut"]->strings[kOfxParamPropChoiceOption].size()!=6||paramStores["inputGamma"]->strings[kOfxParamPropChoiceOption].size()!=9)return 10;
 Store output;if(plugin->mainEntry(kOfxImageEffectActionGetOutputColourspace,&effectStore,nullptr,handle(&output))!=kOfxStatOK||output.strings[kOfxImageClipPropColourspace][0]!="OfxColourspace_Source")return 11;
 plugin->mainEntry(kOfxActionUnload,nullptr,nullptr,nullptr);FreeLibrary(module);
 std::cout<<"OFX binary loads; exports, describe, host parameters and all choices passed\n";return 0;
}
