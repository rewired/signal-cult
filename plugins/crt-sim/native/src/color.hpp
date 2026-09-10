#pragma once
#include "math.hpp"
namespace crt {
// Stable IDs: Rec.709, DWG, ACES AP1, Rec.2020, P3-D65, ACES AP0.
// Transfer IDs: Gamma 2.4, sRGB, Linear, DI, ACEScct, PQ, HLG, Gamma 2.2, BT.709.
struct ColorConfig {int gamut=0,transfer=0;float referenceWhite=100,hlgPeak=1000;};
HD inline float signedPower(float x,float exponent){return x<0?-powf(-x,exponent):powf(x,exponent);}
HD inline vec3 signedPower(vec3 c,float exponent){return vec3(signedPower(c.r,exponent),signedPower(c.g,exponent),signedPower(c.b,exponent));}
#include "color-matrices.inc"
HD inline float decodeTransfer(float v,int transfer,float white){
 switch(transfer){
 case 1:return abs(v)<=.04045f?v/12.92f:(v<0?-1.f:1.f)*powf((abs(v)+.055f)/1.055f,2.4f);
 case 2:return v;
 case 3:return v<=.02740668f?v/10.44426855f:exp2f(v/.07329248f-7.f)-.0075f;
 case 4:return v<=.155251141552511f?(v-.0729055341958355f)/10.5402377416545f:exp2f(v*17.52f-9.72f);
 case 5:{float p=powf(abs(v),1.f/78.84375f);float l=powf(max(p-.8359375f,0.f)/max(18.8515625f-18.6875f*p,1e-6f),1.f/.1593017578125f);return (v<0?-1.f:1.f)*l*10000.f/white;}
 case 6:{float a=abs(v);float l=a<=.5f?a*a/3.f:(expf((a-.55991073f)/.17883277f)+.28466892f)/12.f;return v<0?-l:l;}
 case 7:return signedPower(v,2.2f);
 case 8:return abs(v)<.081f?v/4.5f:(v<0?-1.f:1.f)*powf((abs(v)+.099f)/1.099f,1.f/.45f);
 default:return signedPower(v,2.4f);
 }
}
HD inline float encodeTransfer(float v,int transfer,float white){
 switch(transfer){
 case 1:return abs(v)<=.0031308f?v*12.92f:(v<0?-1.f:1.f)*(1.055f*powf(abs(v),1.f/2.4f)-.055f);
 case 2:return v;
 case 3:return v<=.00262409f?v*10.44426855f:(log2f(v+.0075f)+7.f)*.07329248f;
 case 4:return v<=.0078125f?v*10.5402377416545f+.0729055341958355f:(log2f(v)+9.72f)/17.52f;
 case 5:{float p=powf(abs(v)*white/10000.f,.1593017578125f);return (v<0?-1.f:1.f)*powf((.8359375f+18.8515625f*p)/(1.f+18.6875f*p),78.84375f);}
 case 6:{float a=abs(v);float e=a<=1.f/12.f?sqrtf(3.f*a):.17883277f*logf(12.f*a-.28466892f)+.55991073f;return v<0?-e:e;}
 case 7:return signedPower(v,1.f/2.2f);
 case 8:return abs(v)<.018f?v*4.5f:(v<0?-1.f:1.f)*(1.099f*powf(abs(v),.45f)-.099f);
 default:return signedPower(v,1.f/2.4f);
 }
}
HD inline vec3 gamutLuma(int gamut){
 if(gamut==3)return vec3(.2627f,.6780f,.0593f);
 return vec3(.2126f,.7152f,.0722f);
}
HD inline vec3 decodeColor(vec3 encoded,const ColorConfig& c){
 vec3 rgb=vec3(decodeTransfer(encoded.r,c.transfer,c.referenceWhite),decodeTransfer(encoded.g,c.transfer,c.referenceWhite),decodeTransfer(encoded.b,c.transfer,c.referenceWhite));
 if(c.transfer==6){float gamma=1.2f+.42f*log10f(c.hlgPeak/1000.f);float y=max(abs(dot(rgb,gamutLuma(c.gamut))),1e-10f);rgb*=powf(y,gamma-1.f)*c.hlgPeak/c.referenceWhite;}
 return toWorkingGamut(rgb,c.gamut);
}
HD inline vec3 encodeColor(vec3 working,const ColorConfig& c){
 vec3 rgb=fromWorkingGamut(working,c.gamut);
 if(c.transfer==6){rgb=rgb*c.referenceWhite/c.hlgPeak;float gamma=1.2f+.42f*log10f(c.hlgPeak/1000.f);float y=max(abs(dot(rgb,gamutLuma(c.gamut))),1e-10f);rgb*=powf(y,1.f/gamma-1.f);}
 return vec3(encodeTransfer(rgb.r,c.transfer,c.referenceWhite),encodeTransfer(rgb.g,c.transfer,c.referenceWhite),encodeTransfer(rgb.b,c.transfer,c.referenceWhite));
}
} // namespace crt
