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
#include <cstdarg>
#include <cmath>
struct Store{std::map<std::string,std::vector<std::string>> s;std::map<std::string,std::vector<int>> i;std::map<std::string,std::vector<double>> d;std::map<std::string,std::vector<void*>> p;std::string type;int iv=0;double dv=0;std::string sv;};
static Store effect,source,output,inputImage,outputImage;static std::map<std::string,std::unique_ptr<Store>> param;
static Store& st(void* h){return *reinterpret_cast<Store*>(h);}static OfxPropertySetHandle ph(Store& s){return reinterpret_cast<OfxPropertySetHandle>(&s);}
template<class T> static void put(std::map<std::string,std::vector<T>>& m,const char* k,int i,T v){auto& a=m[k];if(a.size()<=size_t(i))a.resize(i+1);a[i]=v;}
template<class T> static OfxStatus get(std::map<std::string,std::vector<T>>& m,const char* k,int i,T* out){auto it=m.find(k);if(it==m.end()||it->second.size()<=size_t(i))return kOfxStatErrUnknown;*out=it->second[i];return kOfxStatOK;}
static OfxStatus si(OfxPropertySetHandle h,const char*k,int i,int v){put(st(h).i,k,i,v);if(!strcmp(k,kOfxParamPropDefault))st(h).iv=v;return kOfxStatOK;}
static OfxStatus sd(OfxPropertySetHandle h,const char*k,int i,double v){put(st(h).d,k,i,v);if(!strcmp(k,kOfxParamPropDefault))st(h).dv=v;return kOfxStatOK;}
static OfxStatus ss(OfxPropertySetHandle h,const char*k,int i,const char*v){put(st(h).s,k,i,std::string(v));if(!strcmp(k,kOfxParamPropDefault))st(h).sv=v;return kOfxStatOK;}
static OfxStatus sp(OfxPropertySetHandle h,const char*k,int i,void*v){put(st(h).p,k,i,v);return kOfxStatOK;}
static OfxStatus gi(OfxPropertySetHandle h,const char*k,int i,int*v){return get(st(h).i,k,i,v);}static OfxStatus gd(OfxPropertySetHandle h,const char*k,int i,double*v){return get(st(h).d,k,i,v);}static OfxStatus gp(OfxPropertySetHandle h,const char*k,int i,void**v){return get(st(h).p,k,i,v);}
static OfxStatus gs(OfxPropertySetHandle h,const char*k,int i,char**v){std::string value;auto status=get(st(h).s,k,i,&value);if(status==kOfxStatOK)*v=st(h).s[k][i].data();return status;}
static OfxStatus gin(OfxPropertySetHandle h,const char*k,int n,int*v){for(int i=0;i<n;i++)if(gi(h,k,i,v+i)!=kOfxStatOK)return kOfxStatErrUnknown;return kOfxStatOK;}
static OfxStatus gdn(OfxPropertySetHandle h,const char*k,int n,double*v){for(int i=0;i<n;i++)if(gd(h,k,i,v+i)!=kOfxStatOK)return kOfxStatErrUnknown;return kOfxStatOK;}
static OfxStatus effectProps(OfxImageEffectHandle,OfxPropertySetHandle*out){*out=ph(effect);return kOfxStatOK;}
static OfxStatus paramSet(OfxImageEffectHandle,OfxParamSetHandle*out){*out=reinterpret_cast<OfxParamSetHandle>(&effect);return kOfxStatOK;}
static OfxStatus clipDefine(OfxImageEffectHandle,const char*n,OfxPropertySetHandle*out){*out=ph(!strcmp(n,"Source")?source:output);return kOfxStatOK;}
static OfxStatus clipGet(OfxImageEffectHandle,const char*n,OfxImageClipHandle*out,OfxPropertySetHandle*props){Store& s=!strcmp(n,"Source")?source:output;*out=reinterpret_cast<OfxImageClipHandle>(&s);if(props)*props=ph(s);return kOfxStatOK;}
static OfxStatus clipProps(OfxImageClipHandle h,OfxPropertySetHandle*out){*out=reinterpret_cast<OfxPropertySetHandle>(h);return kOfxStatOK;}
static OfxStatus clipImage(OfxImageClipHandle h,OfxTime,const OfxRectD*,OfxPropertySetHandle*out){*out=ph(reinterpret_cast<Store*>(h)==&source?inputImage:outputImage);return kOfxStatOK;}
static OfxStatus releaseImage(OfxPropertySetHandle){return kOfxStatOK;}static int abortRender(OfxImageEffectHandle){return 0;}
static OfxStatus paramDefine(OfxParamSetHandle,const char*t,const char*n,OfxPropertySetHandle*out){param[n]=std::make_unique<Store>();param[n]->type=t;*out=ph(*param[n]);return kOfxStatOK;}
static OfxStatus paramGet(OfxParamSetHandle,const char*n,OfxParamHandle*out,OfxPropertySetHandle*props){if(!param.count(n))return kOfxStatErrUnknown;*out=reinterpret_cast<OfxParamHandle>(param[n].get());if(props)*props=ph(*param[n]);return kOfxStatOK;}
static void value(Store& s,va_list args){if(s.type==kOfxParamTypeDouble)*va_arg(args,double*)=s.dv;else if(s.type==kOfxParamTypeString)*va_arg(args,char**)=s.sv.data();else *va_arg(args,int*)=s.iv;}
static OfxStatus getValue(OfxParamHandle h,...){va_list args;va_start(args,h);value(st(h),args);va_end(args);return kOfxStatOK;}
static OfxStatus getTimed(OfxParamHandle h,OfxTime t,...){va_list args;va_start(args,t);value(st(h),args);va_end(args);return kOfxStatOK;}
static OfxStatus setValue(OfxParamHandle h,...){va_list args;va_start(args,h);auto& s=st(h);if(s.type==kOfxParamTypeDouble)s.dv=va_arg(args,double);else if(s.type==kOfxParamTypeString)s.sv=va_arg(args,const char*);else s.iv=va_arg(args,int);va_end(args);return kOfxStatOK;}
static OfxStatus beginEdit(OfxParamSetHandle,const char*){return kOfxStatOK;}static OfxStatus endEdit(OfxParamSetHandle){return kOfxStatOK;}
static OfxPropertySuiteV1 properties{};static OfxImageEffectSuiteV1 images{};static OfxParameterSuiteV1 parameters{};
static const void* fetch(OfxPropertySetHandle,const char*n,int v){if(v!=1)return nullptr;if(!strcmp(n,kOfxPropertySuite))return &properties;if(!strcmp(n,kOfxImageEffectSuite))return &images;if(!strcmp(n,kOfxParameterSuite))return &parameters;return nullptr;}
int main(int argc,char**argv){if(argc!=2)return 1;auto dll=LoadLibraryA(argv[1]);if(!dll)return 2;auto plugin=reinterpret_cast<OfxPlugin*(*)(int)>(GetProcAddress(dll,"OfxGetPlugin"))(0);
 properties.propSetInt=si;properties.propSetDouble=sd;properties.propSetString=ss;properties.propSetPointer=sp;properties.propGetInt=gi;properties.propGetDouble=gd;properties.propGetString=gs;properties.propGetPointer=gp;properties.propGetIntN=gin;properties.propGetDoubleN=gdn;
 images.getPropertySet=effectProps;images.getParamSet=paramSet;images.clipDefine=clipDefine;images.clipGetHandle=clipGet;images.clipGetPropertySet=clipProps;images.clipGetImage=clipImage;images.clipReleaseImage=releaseImage;images.abort=abortRender;
 parameters.paramDefine=paramDefine;parameters.paramGetHandle=paramGet;parameters.paramGetValue=getValue;parameters.paramGetValueAtTime=getTimed;parameters.paramSetValue=setValue;parameters.paramEditBegin=beginEdit;parameters.paramEditEnd=endEdit;
 OfxHost host{ph(effect),fetch};plugin->setHost(&host);
 for(auto a:{kOfxActionLoad,kOfxActionDescribe,kOfxImageEffectActionDescribeInContext,kOfxActionCreateInstance})if(plugin->mainEntry(a,&effect,nullptr,nullptr)!=kOfxStatOK)return 3;
 if(param["encoding"]->iv!=3||param["noiseSeed"]->type!=kOfxParamTypeInteger||param["noiseSeed"]->iv!=0)return 4;
 const int w=16,h=12;std::vector<float> src(w*h*4),dst(src.size());for(size_t i=0;i<src.size();i+=4){src[i]=.2f;src[i+1]=.4f;src[i+2]=.6f;src[i+3]=.7f;}
 for(auto item:{std::pair<Store*,float*>{&inputImage,src.data()},{&outputImage,dst.data()}}){auto p=ph(*item.first);sp(p,kOfxImagePropData,0,item.second);si(p,kOfxImagePropRowBytes,0,w*16);for(int i=0;i<4;i++)si(p,kOfxImagePropBounds,i,i<2?0:i==2?w:h);ss(p,kOfxImageEffectPropPixelDepth,0,kOfxBitDepthFloat);ss(p,kOfxImageEffectPropComponents,0,kOfxImageComponentRGBA);ss(p,kOfxImageEffectPropPreMultiplication,0,kOfxImageUnPreMultiplied);}
 Store in;sd(ph(in),kOfxPropTime,0,0);for(int i=0;i<4;i++)si(ph(in),kOfxImageEffectPropRenderWindow,i,i<2?0:i==2?w:h);
 for(auto n:{"scan","mask","bloom","exposure","black","curve","vignette","convergence","noise","jitter","tracking","flicker","pixelMix"})param[n]->dv=0;param["saturation"]->dv=1;param["gamma"]->dv=2.2;
 auto render=[&](){return plugin->mainEntry(kOfxImageEffectActionRender,&effect,ph(in),nullptr);};
 if(render()!=kOfxStatOK)return 5;for(size_t i=0;i<src.size();i++)if(std::fabs(src[i]-dst[i])>1e-5f)return 6;
 param["encoding"]->iv=2;if(render()!=kOfxStatErrFormat)return 7;
 ss(ph(source),kOfxImageClipPropColourspace,0,"ofx_scene_linear");if(render()!=kOfxStatErrFormat)return 8;
 ss(ph(source),kOfxImageClipPropColourspace,0,"rec1886_rec709_display");if(render()!=kOfxStatOK)return 9;
 for(size_t i=0;i<src.size();i++)if(std::fabs(src[i]-dst[i])>1e-5f)return 10;
 param["inputGamut"]->iv=1;param["inputGamma"]->iv=3;param["preset"]->iv=13;Store change;ss(ph(change),kOfxPropName,0,"preset");ss(ph(change),kOfxPropChangeReason,0,kOfxChangeUserEdited);
 if(plugin->mainEntry(kOfxActionInstanceChanged,&effect,ph(change),nullptr)!=kOfxStatOK||param["encoding"]->iv!=2||param["inputGamut"]->iv!=1||param["inputGamma"]->iv!=3)return 11;
 ss(ph(source),kOfxImageClipPropColourspace,0,"unknown");param["bypass"]->iv=1;if(render()!=kOfxStatOK||src!=dst)return 12;
 param["bypass"]->iv=0;param["tubeEnabled"]->iv=0;param["pixelEnabled"]->iv=0;if(render()!=kOfxStatOK||src!=dst)return 13;
 plugin->mainEntry(kOfxActionDestroyInstance,&effect,nullptr,nullptr);plugin->mainEntry(kOfxActionUnload,nullptr,nullptr,nullptr);FreeLibrary(dll);
 std::cout<<"Host: manual/auto render, unknown metadata rejection, preset isolation and bypass passed\n";
}
