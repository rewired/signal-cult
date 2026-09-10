#include <windows.h>
#include <shlobj.h>
#include <filesystem>
#include <fstream>
#include <mutex>
#include <chrono>
#include "companion-preset.hpp"
#include "preview.hpp"
#include "ofxImageEffect.h"
#include "ofxGPURender.h"
#include "ofxColour.h"
#include "ofxMessage.h"
#include "color-host.hpp"
#include "kernel.hpp"
using namespace crt;
#include <cstring>
#include <new>
#include <algorithm>
#include <stdexcept>
#include <string>
#include <iterator>
static OfxHost* host=nullptr;
static const OfxImageEffectSuiteV1* effects=nullptr;
static const OfxPropertySuiteV1* props=nullptr;
static const OfxParameterSuiteV1* parameters=nullptr;
static const OfxMultiThreadSuiteV1* threads=nullptr;
static const OfxMessageSuiteV2* messages=nullptr;
static constexpr size_t N=sizeof(parameterDefs)/sizeof(parameterDefs[0]);
struct Instance {OfxImageEffectHandle effect;OfxImageClipHandle source,output;OfxParamSetHandle paramSet;OfxParamHandle values[N],mask,preset,bypass,encoding,inputGamut,inputGamma,referenceWhite,hlgPeak,colorInfo;bool applying=false;std::mutex previewMutex;std::vector<uint8_t> preview;double previewTime=-1e30;};
static void check(OfxStatus status){if(status!=kOfxStatOK)throw status;}
static void text(OfxPropertySetHandle p,const char* name,const char* value,int index=0){check(props->propSetString(p,name,index,value));}
static void integer(OfxPropertySetHandle p,const char* name,int value,int index=0){check(props->propSetInt(p,name,index,value));}
static void real(OfxPropertySetHandle p,const char* name,double value){check(props->propSetDouble(p,name,0,value));}
static Instance* instance(OfxImageEffectHandle effect){OfxPropertySetHandle p;check(effects->getPropertySet(effect,&p));void* ptr=nullptr;check(props->propGetPointer(p,kOfxPropInstanceData,0,&ptr));if(!ptr)throw kOfxStatErrBadHandle;return static_cast<Instance*>(ptr);}
static OfxPropertySetHandle define(OfxParamSetHandle set,const char* type,const char* id,const char* label){OfxPropertySetHandle p;check(parameters->paramDefine(set,type,id,&p));text(p,kOfxPropLabel,label);return p;}
static OfxStatus describe(OfxImageEffectHandle effect){
 OfxPropertySetHandle p;check(effects->getPropertySet(effect,&p));text(p,kOfxPropLabel,"CRT SIM");text(p,kOfxImageEffectPluginPropGrouping,"rewired-vfx");
 text(p,kOfxImageEffectPropSupportedContexts,kOfxImageEffectContextFilter,0);text(p,kOfxImageEffectPropSupportedContexts,kOfxImageEffectContextGeneral,1);
 text(p,kOfxImageEffectPropSupportedPixelDepths,kOfxBitDepthFloat);text(p,kOfxImageEffectPluginRenderThreadSafety,kOfxImageEffectRenderFullySafe);
 integer(p,kOfxImageEffectPropSupportsTiles,0);integer(p,kOfxImageEffectPropSupportsMultiResolution,0);integer(p,kOfxImageEffectPropTemporalClipAccess,0);
 integer(p,kOfxImageEffectPluginPropHostFrameThreading,1);integer(p,kOfxImageEffectPropSupportsMultipleClipDepths,0);
#ifdef CRT_WITH_CUDA
 props->propSetString(p,kOfxImageEffectPropCudaRenderSupported,0,"true");props->propSetString(p,kOfxImageEffectPropCudaStreamSupported,0,"true");
#endif
 props->propSetString(p,kOfxImageEffectPropColourManagementStyle,0,kOfxImageEffectColourManagementFull);
 props->propSetString(p,kOfxImageEffectPropColourManagementAvailableConfigs,0,"ofx-native-v1.5_aces-v1.3_ocio-v2.3");
 return kOfxStatOK;
}
static OfxStatus context(OfxImageEffectHandle effect){
 OfxPropertySetHandle clip;for(const char* name:{"Source","Output"}){check(effects->clipDefine(effect,name,&clip));text(clip,kOfxImageEffectPropSupportedComponents,kOfxImageComponentRGBA);integer(clip,kOfxImageEffectPropSupportsTiles,0);}
 OfxParamSetHandle set;check(effects->getParamSet(effect,&set));
 auto page=define(set,kOfxParamTypePage,"controlsPage","Controls");int pageIndex=0;
 for(const char* child:{"crtSimEdit","crtSimStatus","preset","bypass","colorManagement","tube","light","optics","signal","pixel"})text(page,kOfxParamPropPageChild,child,pageIndex++);

 auto edit=define(set,kOfxParamTypePushButton,"crtSimEdit","Open CRT SIM Editor");text(edit,kOfxParamPropHint,"Edit a working copy in the CRT SIM Companion. Apply commits the look; Cancel leaves this instance unchanged.");
 auto status=define(set,kOfxParamTypeString,"crtSimStatus","Editor Status");text(status,kOfxParamPropDefault,"Ready");integer(status,kOfxParamPropEnabled,0);integer(status,kOfxParamPropAnimates,0);integer(status,kOfxParamPropPersistant,0);
 auto p=define(set,kOfxParamTypeChoice,"preset","Preset");text(p,kOfxParamPropChoiceOption,"Custom",0);int idx=1;for(const auto& preset:presetDefs)text(p,kOfxParamPropChoiceOption,preset.name,idx++);integer(p,kOfxParamPropDefault,1);integer(p,kOfxParamPropAnimates,0);
 p=define(set,kOfxParamTypeBoolean,"bypass","Bypass");integer(p,kOfxParamPropDefault,0);
 p=define(set,kOfxParamTypeGroup,"colorManagement","Color Management");integer(p,kOfxParamPropGroupOpen,1);
 auto colorChoice=[&](const char* id,const char* label,const std::initializer_list<const char*>& names,int initial){auto prop=define(set,kOfxParamTypeChoice,id,label);text(prop,kOfxParamPropParent,"colorManagement");int i=0;for(auto name:names)text(prop,kOfxParamPropChoiceOption,name,i++);integer(prop,kOfxParamPropDefault,initial);integer(prop,kOfxParamPropAnimates,0);return prop;};
 p=colorChoice("encoding","Color Processing",{"Legacy / Gamma 2.2","Legacy / Linear","Automatic / Host Metadata","Color Managed"},3);
 text(p,kOfxParamPropHint,"Legacy modes preserve older projects. Color Managed converts the specified node input to linear light and returns the same encoding. Automatic requires an explicit supported host color-space tag; it never guesses.");
 colorChoice("inputGamut","Input Color Space",{"Rec.709","DaVinci Wide Gamut","ACES AP1","Rec.2020","P3-D65","ACES AP0"},0);
 colorChoice("inputGamma","Input Gamma",{"Gamma 2.4","sRGB","Linear","DaVinci Intermediate","ACEScct","ST 2084 (PQ)","HLG","Gamma 2.2","Rec.709 (Scene)"},0);
 for(const auto& entry:{std::pair<const char*,const char*>{"referenceWhite","HDR Reference White (nits)"},{"hlgPeak","HLG Peak Luminance (nits)"}}){p=define(set,kOfxParamTypeDouble,entry.first,entry.second);text(p,kOfxParamPropParent,"colorManagement");bool peak=!std::strcmp(entry.first,"hlgPeak");real(p,kOfxParamPropDefault,peak?1000:100);real(p,kOfxParamPropMin,peak?400:1);real(p,kOfxParamPropMax,10000);real(p,kOfxParamPropDisplayMin,peak?400:80);real(p,kOfxParamPropDisplayMax,peak?4000:1000);integer(p,kOfxParamPropAnimates,0);}
 p=define(set,kOfxParamTypeString,"colorInfo","Host Color Space");text(p,kOfxParamPropParent,"colorManagement");text(p,kOfxParamPropStringMode,kOfxParamStringIsSingleLine);text(p,kOfxParamPropDefault,"Not reported; set Input Color Space and Input Gamma manually.");integer(p,kOfxParamPropEnabled,0);integer(p,kOfxParamPropAnimates,0);integer(p,kOfxParamPropPersistant,0);

 const char* groups[]={"CRT","Light & Color","Optics","Signal","Pixel / Sci-Fi"};const char* ids[]={"tube","light","optics","signal","pixel"};
 for(int i=0;i<5;i++){p=define(set,kOfxParamTypeGroup,ids[i],groups[i]);integer(p,kOfxParamPropGroupOpen,1);}
 p=define(set,kOfxParamTypeChoice,"maskType","Mask Type");text(p,kOfxParamPropParent,"tube");idx=0;for(const char* name:maskNames)text(p,kOfxParamPropChoiceOption,name,idx++);integer(p,kOfxParamPropDefault,0);
 for(const auto& def:parameterDefs){
  p=define(set,def.integer?kOfxParamTypeInteger:def.toggle?kOfxParamTypeBoolean:(def.choice?kOfxParamTypeChoice:kOfxParamTypeDouble),def.id,def.label);
  for(int i=0;i<5;i++)if(!std::strcmp(def.group,groups[i]))text(p,kOfxParamPropParent,ids[i]);
  if(def.integer){integer(p,kOfxParamPropDefault,int(def.initial));integer(p,kOfxParamPropMin,int(def.min));integer(p,kOfxParamPropMax,int(def.max));integer(p,kOfxParamPropDisplayMin,int(def.min));integer(p,kOfxParamPropDisplayMax,int(def.max));integer(p,kOfxParamPropAnimates,0);text(p,kOfxParamPropHint,"Deterministic signal seed. Same seed, settings and source time reproduce the same pattern. Zero preserves the original pattern.");}
  else if(def.toggle){integer(p,kOfxParamPropDefault,int(def.initial));}
  else if(def.choice){idx=0;if(!std::strcmp(def.id,"pixelPattern")){for(const char* name:pixelPatternNames)text(p,kOfxParamPropChoiceOption,name,idx++);}else if(!std::strcmp(def.id,"pixelPalette")){for(const char* name:pixelPaletteNames)text(p,kOfxParamPropChoiceOption,name,idx++);}else{for(const char* name:noiseNames)text(p,kOfxParamPropChoiceOption,name,idx++);}integer(p,kOfxParamPropDefault,int(def.initial));}
  else{real(p,kOfxParamPropDefault,def.initial);real(p,kOfxParamPropMin,def.min);real(p,kOfxParamPropMax,def.max);real(p,kOfxParamPropDisplayMin,def.min);real(p,kOfxParamPropDisplayMax,def.max);real(p,kOfxParamPropIncrement,def.step);integer(p,kOfxParamPropDigits,def.step>=1?0:3);}
 }
 return kOfxStatOK;
}
static void updateColorInfo(Instance* data);
static OfxStatus create(OfxImageEffectHandle effect){
 auto data=new Instance{};try{data->effect=effect;check(effects->clipGetHandle(effect,"Source",&data->source,nullptr));check(effects->clipGetHandle(effect,"Output",&data->output,nullptr));check(effects->getParamSet(effect,&data->paramSet));
 for(size_t i=0;i<N;i++)check(parameters->paramGetHandle(data->paramSet,parameterDefs[i].id,&data->values[i],nullptr));
 for(auto entry:{std::pair<const char*,OfxParamHandle*>{"maskType",&data->mask},{"preset",&data->preset},{"bypass",&data->bypass},{"encoding",&data->encoding},{"inputGamut",&data->inputGamut},{"inputGamma",&data->inputGamma},{"referenceWhite",&data->referenceWhite},{"hlgPeak",&data->hlgPeak},{"colorInfo",&data->colorInfo}})check(parameters->paramGetHandle(data->paramSet,entry.first,entry.second,nullptr));
 OfxPropertySetHandle p;check(effects->getPropertySet(effect,&p));check(props->propSetPointer(p,kOfxPropInstanceData,0,data));updateColorInfo(data);return kOfxStatOK;
 }catch(...){delete data;throw;}
}
static void updateColorInfo(Instance* data){
 OfxPropertySetHandle p;char* name=nullptr;
 if(effects->clipGetPropertySet(data->source,&p)==kOfxStatOK&&props->propGetString(p,kOfxImageClipPropColourspace,0,&name)==kOfxStatOK&&name)parameters->paramSetValue(data->colorInfo,name);
 else parameters->paramSetValue(data->colorInfo,"Not reported; set Input Color Space and Input Gamma manually.");
}
static void editInCompanion(Instance&,double);
static OfxStatus changed(OfxImageEffectHandle effect,OfxPropertySetHandle in){
 Instance* data=instance(effect);char* name=nullptr;char* reason=nullptr;props->propGetString(in,kOfxPropName,0,&name);props->propGetString(in,kOfxPropChangeReason,0,&reason);
 if(!name||!reason||std::strcmp(reason,kOfxChangeUserEdited)||data->applying)return kOfxStatReplyDefault;
 updateColorInfo(data);
 if(!std::strcmp(name,"crtSimEdit")){double time=0;props->propGetDouble(in,kOfxPropTime,0,&time);editInCompanion(*data,time);return kOfxStatOK;}
 if(!std::strcmp(name,"preset")){
  int selected=0;check(parameters->paramGetValue(data->preset,&selected));if(selected<1||selected>int(std::size(presetDefs)))return kOfxStatOK;
  data->applying=true;parameters->paramEditBegin(data->paramSet,"Apply CRT preset");
  const auto& preset=presetDefs[selected-1];for(size_t i=0;i<N;i++){if(parameterDefs[i].choice||parameterDefs[i].toggle||parameterDefs[i].integer)parameters->paramSetValue(data->values[i],int(preset.values[i]));else parameters->paramSetValue(data->values[i],double(preset.values[i]));}
  parameters->paramSetValue(data->mask,int(preset.mask));parameters->paramEditEnd(data->paramSet);data->applying=false;return kOfxStatOK;
 }
 bool custom=!std::strcmp(name,"maskType");for(const auto& def:parameterDefs)custom=custom||!std::strcmp(name,def.id);
 if(custom)parameters->paramSetValue(data->preset,0);return kOfxStatReplyDefault;
}
struct ScopedImage {OfxPropertySetHandle handle=nullptr;~ScopedImage(){if(handle)effects->clipReleaseImage(handle);}};
static Image image(OfxPropertySetHandle h){
 Image result;void* ptr;int b[4];char* depth=nullptr;char* component=nullptr;char* premult=nullptr;
 check(props->propGetPointer(h,kOfxImagePropData,0,&ptr));check(props->propGetIntN(h,kOfxImagePropBounds,4,b));check(props->propGetInt(h,kOfxImagePropRowBytes,0,&result.rowBytes));
 check(props->propGetString(h,kOfxImageEffectPropPixelDepth,0,&depth));check(props->propGetString(h,kOfxImageEffectPropComponents,0,&component));
 if(!ptr||std::strcmp(depth,kOfxBitDepthFloat)||std::strcmp(component,kOfxImageComponentRGBA))throw kOfxStatErrFormat;
 props->propGetString(h,kOfxImageEffectPropPreMultiplication,0,&premult);result.premult=premult&&!std::strcmp(premult,kOfxImagePreMultiplied);
 result.data=static_cast<float*>(ptr);result.x1=b[0];result.y1=b[1];result.x2=b[2];result.y2=b[3];
 if(result.x2<=result.x1||result.y2<=result.y1||std::abs(result.rowBytes)<(result.x2-result.x1)*16)throw kOfxStatErrValue;return result;
}

static void cachePreview(Instance& data,const RenderJob& job,bool gpu,void* stream){
 try{
  std::unique_lock<std::mutex> lock(data.previewMutex,std::try_to_lock);if(!lock.owns_lock()||(!data.preview.empty()&&std::abs(job.params.time-data.previewTime)<.5))return;
  int sw=job.input.x2-job.input.x1,sh=job.input.y2-job.input.y1;double scale=std::min({1.,960./sw,540./sh});int w=std::max(1,int(sw*scale)),h=std::max(1,int(sh*scale));std::vector<uint32_t> pixels(size_t(w)*h);
  if(gpu){
#ifdef CRT_WITH_CUDA
   if(!snapshotCUDA(job,w,h,stream,pixels))return;
#else
   return;
#endif
  }else for(int y=0;y<h;y++)for(int x=0;x<w;x++)pixels[size_t(y)*w+x]=snapshotPixel(job,x,y,w,h);
  std::vector<uint8_t> bmp;auto le=[&](uint32_t n,int bytes){for(int i=0;i<bytes;i++)bmp.push_back(uint8_t(n>>(i*8)));};
  bmp.push_back('B');bmp.push_back('M');le(54+w*h*4,4);le(0,4);le(54,4);le(40,4);le(w,4);le(h,4);le(1,2);le(32,2);le(0,4);le(w*h*4,4);le(2835,4);le(2835,4);le(0,4);le(0,4);for(auto pixel:pixels)le(pixel,4);
  data.preview=std::move(bmp);data.previewTime=job.params.time;
 }catch(...){/* Preview failure must never fail a render. */}
}
static void editInCompanion(Instance& data,double time){
 auto status=[&](const char* value){OfxParamHandle handle=nullptr;if(parameters->paramGetHandle(data.paramSet,"crtSimStatus",&handle,nullptr)==kOfxStatOK)parameters->paramSetValue(handle,value);};
 struct SessionFiles{std::filesystem::path dir;~SessionFiles(){if(dir.empty())return;std::error_code ec;for(auto name:{L"input.json",L"result.json",L"result.tmp",L"preview.bmp"})std::filesystem::remove(dir/name,ec);std::filesystem::remove(dir,ec);}} files;
 try{
  wchar_t executable[32768]{};DWORD bytes=sizeof(executable);if(RegGetValueW(HKEY_CURRENT_USER,L"Software\\rewired-vfx\\CRT SIM",L"CompanionPath",RRF_RT_REG_SZ,nullptr,executable,&bytes)!=ERROR_SUCCESS||!std::filesystem::is_regular_file(executable))throw std::runtime_error("CRT SIM Companion is not installed");
  PWSTR local=nullptr;if(SHGetKnownFolderPath(FOLDERID_LocalAppData,KF_FLAG_CREATE,nullptr,&local)!=S_OK)throw std::runtime_error("LocalAppData unavailable");std::filesystem::path directory(local);CoTaskMemFree(local);
  GUID guid;CoCreateGuid(&guid);wchar_t token[40];StringFromGUID2(guid,token,40);files.dir=directory/L"CRT SIM"/L"Exchange"/token;std::filesystem::create_directories(files.dir);
  nlohmann::json preset={{"version",1},{"params",nlohmann::json::object()}};
  for(size_t i=0;i<N;i++){const auto& d=parameterDefs[i];double v=0;if(d.choice||d.toggle||d.integer){int n;check(parameters->paramGetValueAtTime(data.values[i],time,&n));v=n;}else check(parameters->paramGetValueAtTime(data.values[i],time,&v));preset["params"][d.id]=v;}
  int mask;check(parameters->paramGetValueAtTime(data.mask,time,&mask));preset["maskType"]=mask;validateCompanionPreset(preset);
  bool hasPreview=false;{std::lock_guard<std::mutex> lock(data.previewMutex);if(!data.preview.empty()){std::ofstream image(files.dir/L"preview.bmp",std::ios::binary);image.write(reinterpret_cast<const char*>(data.preview.data()),data.preview.size());hasPreview=bool(image);preset["previewTime"]=data.previewTime;}}
  {std::ofstream input(files.dir/L"input.json");input<<preset.dump(2);if(!input)throw std::runtime_error("Could not write Companion session");}
  std::wstring command=L"\""+std::wstring(executable)+L"\" --ofx-exchange \""+(files.dir/L"input.json").wstring()+L"\" --ofx-result \""+(files.dir/L"result.json").wstring()+L"\"";
  if(hasPreview)command+=L" --ofx-preview \""+(files.dir/L"preview.bmp").wstring()+L"\"";
  STARTUPINFOW startup{};startup.cb=sizeof(startup);PROCESS_INFORMATION process{};
  if(!CreateProcessW(executable,command.data(),nullptr,nullptr,FALSE,CREATE_UNICODE_ENVIRONMENT,nullptr,nullptr,&startup,&process))throw std::runtime_error("Could not launch CRT SIM Companion");
  CloseHandle(process.hThread);WaitForSingleObject(process.hProcess,INFINITE);DWORD exitCode=1;GetExitCodeProcess(process.hProcess,&exitCode);CloseHandle(process.hProcess);
  auto result=files.dir/L"result.json";if(exitCode!=0||!std::filesystem::is_regular_file(result)){status("Companion edit cancelled");return;}
  if(std::filesystem::file_size(result)>128*1024)throw std::runtime_error("Companion result exceeds 128 KB");
  std::ifstream input(result);nlohmann::json json;input>>json;const auto values=validateCompanionPreset(json);
  // Validate the entire look before making any host parameter changes.
  data.applying=true;parameters->paramEditBegin(data.paramSet,"Apply CRT SIM Companion look");
  for(size_t i=0;i<N;i++){const auto& d=parameterDefs[i];if(d.choice||d.toggle||d.integer)parameters->paramSetValue(data.values[i],int(values.values[i]));else parameters->paramSetValue(data.values[i],values.values[i]);}
  parameters->paramSetValue(data.mask,values.mask);parameters->paramSetValue(data.preset,0);parameters->paramEditEnd(data.paramSet);data.applying=false;status("Applied from Companion");
 }catch(const std::exception& error){data.applying=false;status(error.what());}catch(...){data.applying=false;status("Companion session failed");}
}
struct CPUWork {RenderJob job;OfxImageEffectHandle effect;};
static void cpuWorker(unsigned int index,unsigned int count,void* opaque){auto work=static_cast<CPUWork*>(opaque);RenderJob part=work->job;int height=part.y2-part.y1;part.y1=work->job.y1+height*index/count;part.y2=work->job.y1+height*(index+1)/count;for(int y=part.y1;y<part.y2;y++){if(effects->abort(work->effect))break;for(int x=part.x1;x<part.x2;x++)renderPixel(part,x,y);}}
static OfxStatus colorError(OfxImageEffectHandle effect,const char* message){if(messages)messages->setPersistentMessage(effect,kOfxMessageError,"colorManagement","%s",message);return kOfxStatErrFormat;}
static OfxStatus render(OfxImageEffectHandle effect,OfxPropertySetHandle in){
 auto data=instance(effect);double time=0,scale[2]={1,1};check(props->propGetDouble(in,kOfxPropTime,0,&time));props->propGetDoubleN(in,kOfxImageEffectPropRenderScale,2,scale);
 ScopedImage src,dst;check(effects->clipGetImage(data->source,time,nullptr,&src.handle));check(effects->clipGetImage(data->output,time,nullptr,&dst.handle));
 RenderJob job{};job.input=image(src.handle);job.output=image(dst.handle);int window[4];check(props->propGetIntN(in,kOfxImageEffectPropRenderWindow,4,window));
 job.x1=std::max(window[0],job.output.x1);job.y1=std::max(window[1],job.output.y1);job.x2=std::min(window[2],job.output.x2);job.y2=std::min(window[3],job.output.y2);
 if(job.x2<=job.x1||job.y2<=job.y1)return kOfxStatOK;
 for(size_t i=0;i<N;i++){double value=parameterDefs[i].initial;if(parameterDefs[i].choice||parameterDefs[i].toggle||parameterDefs[i].integer){int v=0;check(parameters->paramGetValueAtTime(data->values[i],time,&v));value=v;}else check(parameters->paramGetValueAtTime(data->values[i],time,&value));if(!std::isfinite(value))value=parameterDefs[i].initial;value=std::clamp(value,parameterDefs[i].min,parameterDefs[i].max);*reinterpret_cast<float*>(reinterpret_cast<char*>(&job.params)+parameterDefs[i].offset)=float(value);}
 int mask=0,bypass=0,encoding=0;check(parameters->paramGetValueAtTime(data->mask,time,&mask));check(parameters->paramGetValueAtTime(data->bypass,time,&bypass));check(parameters->paramGetValueAtTime(data->encoding,time,&encoding));job.params.maskType=float(std::clamp(mask,0,11));job.params.bypass=float(bypass);job.linear=encoding==1;
 job.managed=encoding>=2;
 OfxPropertySetHandle clipProps;double fps=24;check(effects->clipGetPropertySet(data->source,&clipProps));props->propGetDouble(clipProps,kOfxImageEffectPropFrameRate,0,&fps);if(!std::isfinite(fps)||fps<=0)fps=24;job.params.time=float(time/fps);
 if(job.managed && job.params.bypass<.5f && (job.params.tubeEnabled>=.5f||(job.params.pixelEnabled>=.5f&&job.params.pixelMix>0))){
  int gamut=0,transfer=0;double white=100,peak=1000;
  check(parameters->paramGetValue(data->inputGamut,&gamut));check(parameters->paramGetValue(data->inputGamma,&transfer));check(parameters->paramGetValue(data->referenceWhite,&white));check(parameters->paramGetValue(data->hlgPeak,&peak));
  if(gamut<0||gamut>5||transfer<0||transfer>8||!std::isfinite(white)||white<1||white>10000||!std::isfinite(peak)||peak<400||peak>10000)return colorError(effect,"Invalid color-management parameters.");
  job.color={gamut,transfer,float(white),float(peak)};
  if(encoding==2){char* tag=nullptr;if(props->propGetString(clipProps,kOfxImageClipPropColourspace,0,&tag)!=kOfxStatOK||!colorFromHost(tag,job.color))return colorError(effect,"Automatic color management requires a supported explicit host color-space tag. Select Color Managed and set Input Color Space / Input Gamma to the actual node encoding.");}
  if(job.color.transfer==6&&job.color.gamut!=3)return colorError(effect,"HLG requires Rec.2020 primaries.");
 }
 if(messages)messages->clearPersistentMessage(effect);
 job.params.pixelSize*=float(scale[0]);job.params.pitch*=float(scale[0]);job.params.jitter*=float(scale[0]);job.params.convergence*=float(scale[0]);
 int cuda=0;props->propGetInt(in,kOfxImageEffectPropCudaEnabled,0,&cuda);
 if(cuda){
#ifdef CRT_WITH_CUDA
  void* stream=nullptr;bool supplied=props->propGetPointer(in,kOfxImageEffectPropCudaStream,0,&stream)==kOfxStatOK;cachePreview(*data,job,true,stream);return renderCUDA(job,stream,supplied)==0?kOfxStatOK:kOfxStatFailed;
#else
  return kOfxStatErrUnsupported;
#endif
 }
 cachePreview(*data,job,false,nullptr);CPUWork work{job,effect};if(threads){unsigned int count=1;threads->multiThreadNumCPUs(&count);return threads->multiThread(cpuWorker,std::max(1u,std::min(count,16u)),&work);}cpuWorker(0,1,&work);return kOfxStatOK;
}
static OfxStatus entry(const char* action,const void* handle,OfxPropertySetHandle in,OfxPropertySetHandle out){try{
 auto effect=(OfxImageEffectHandle)handle;
 if(!std::strcmp(action,kOfxActionLoad)){if(!host)return kOfxStatErrMissingHostFeature;effects=(const OfxImageEffectSuiteV1*)host->fetchSuite(host->host,kOfxImageEffectSuite,1);props=(const OfxPropertySuiteV1*)host->fetchSuite(host->host,kOfxPropertySuite,1);parameters=(const OfxParameterSuiteV1*)host->fetchSuite(host->host,kOfxParameterSuite,1);threads=(const OfxMultiThreadSuiteV1*)host->fetchSuite(host->host,kOfxMultiThreadSuite,1);messages=(const OfxMessageSuiteV2*)host->fetchSuite(host->host,kOfxMessageSuite,2);return effects&&props&&parameters?kOfxStatOK:kOfxStatErrMissingHostFeature;}
 if(!std::strcmp(action,kOfxActionUnload))return kOfxStatOK;
 if(!effects||!props||!parameters)return kOfxStatErrMissingHostFeature;
 if(!std::strcmp(action,kOfxActionDescribe))return describe(effect);
 if(!std::strcmp(action,kOfxImageEffectActionDescribeInContext))return context(effect);
 if(!std::strcmp(action,kOfxActionCreateInstance))return create(effect);
 if(!std::strcmp(action,kOfxActionDestroyInstance)){delete instance(effect);OfxPropertySetHandle p;effects->getPropertySet(effect,&p);props->propSetPointer(p,kOfxPropInstanceData,0,nullptr);return kOfxStatOK;}
 if(!std::strcmp(action,kOfxActionInstanceChanged))return changed(effect,in);
 if(!std::strcmp(action,kOfxImageEffectActionRender))return render(effect,in);
 if(!std::strcmp(action,kOfxImageEffectActionGetRegionOfDefinition)||!std::strcmp(action,kOfxImageEffectActionGetRegionsOfInterest)){
  double time=0;props->propGetDouble(in,kOfxPropTime,0,&time);OfxRectD rod;check(effects->clipGetRegionOfDefinition(instance(effect)->source,time,&rod));double bounds[]={rod.x1,rod.y1,rod.x2,rod.y2};const char* key=!std::strcmp(action,kOfxImageEffectActionGetRegionOfDefinition)?kOfxImageEffectPropRegionOfDefinition:"OfxImageClipPropRoI_Source";check(props->propSetDoubleN(out,key,4,bounds));return kOfxStatOK;
 }
 if(!std::strcmp(action,kOfxImageEffectActionGetOutputColourspace)){text(out,kOfxImageClipPropColourspace,"OfxColourspace_Source");return kOfxStatOK;}
 if(!std::strcmp(action,kOfxImageEffectActionGetClipPreferences)){text(out,"OfxImageClipPropComponents_Output",kOfxImageComponentRGBA);text(out,"OfxImageClipPropDepth_Output",kOfxBitDepthFloat);integer(out,kOfxImageEffectFrameVarying,1);integer(out,kOfxImageClipPropContinuousSamples,1);return kOfxStatOK;}
 return kOfxStatReplyDefault;
}catch(OfxStatus status){return status;}catch(const std::bad_alloc&){return kOfxStatErrMemory;}catch(...){return kOfxStatFailed;}}
static void setHost(OfxHost* h){host=h;}
static OfxPlugin plugin={kOfxImageEffectPluginApi,1,"com.rewiredvfx.crtlab",0,7,setHost,entry};
extern "C" {OfxExport int OfxGetNumberOfPlugins(){return 1;}OfxExport OfxPlugin* OfxGetPlugin(int index){return index==0?&plugin:nullptr;}}
