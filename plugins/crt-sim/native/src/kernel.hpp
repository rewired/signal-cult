#pragma once
#include "color.hpp"
#include "parameters.hpp"
#include <cstddef>
namespace crt {
struct Image {float* data=nullptr;int x1=0,y1=0,x2=0,y2=0,rowBytes=0;bool premult=false;};
struct RenderJob {Image input,output;int x1,y1,x2,y2;Parameters params;bool linear=false;bool managed=false;ColorConfig color;};
struct Kernel:Parameters {
 Image source;vec2 resolution;bool linear,managed;ColorConfig color;
 HD Kernel(const RenderJob& job):Parameters(job.params),source(job.input),resolution(float(source.x2-source.x1),float(source.y2-source.y1)),linear(job.linear),managed(job.managed),color(job.color){}
 HD vec4 pixel(int x,int y){
  x=int(clamp(float(x),float(source.x1),float(source.x2-1)));y=int(clamp(float(y),float(source.y1),float(source.y2-1)));
  const float* p=reinterpret_cast<const float*>(reinterpret_cast<const char*>(source.data)+ptrdiff_t(y-source.y1)*source.rowBytes)+4*(x-source.x1);
  return vec4(p[0],p[1],p[2],p[3]);
 }
 HD vec4 workingPixel(int x,int y){
  vec4 v=pixel(x,y);vec3 rgb=v.rgb();
  if(source.premult)rgb=v.a>1e-6f?rgb/v.a:vec3(0);
  rgb=decodeColor(rgb,color);if(source.premult)rgb*=v.a;return vec4(rgb,v.a);
 }
 HD vec4 texture(const Image&,vec2 uv){
  uv=clamp(uv,0,1);float x=uv.x*resolution.x-.5f+source.x1,y=uv.y*resolution.y-.5f+source.y1;
  int ix=int(floorf(x)),iy=int(floorf(y));float fx=fract(x),fy=fract(y);
  vec4 a=managed?workingPixel(ix,iy):pixel(ix,iy),b=managed?workingPixel(ix+1,iy):pixel(ix+1,iy),c=managed?workingPixel(ix,iy+1):pixel(ix,iy+1),d=managed?workingPixel(ix+1,iy+1):pixel(ix+1,iy+1);
  vec3 rgb=mix(mix(a.rgb(),b.rgb(),fx),mix(c.rgb(),d.rgb(),fx),fy);float alpha=mix(mix(a.a,b.a,fx),mix(c.a,d.a,fx),fy);
  if(source.premult)rgb=alpha>1e-6f?rgb/alpha:vec3(0);
  if(linear&&!managed)rgb=pow(max(rgb,vec3(0)),vec3(1.f/2.2f));
  return vec4(rgb,alpha);
 }
#include "shader.inc"
};
HD inline void renderPixel(const RenderJob& job,int x,int y){
 Kernel kernel(job);
 vec2 uv=vec2(float(x-job.input.x1)+.5f,float(y-job.input.y1)+.5f)/kernel.resolution;
 vec4 original=kernel.pixel(x,y),result=original;
 if(job.params.bypass<.5f && (job.params.tubeEnabled>=.5f || (job.params.pixelEnabled>=.5f && job.params.pixelMix>0))){
  result=kernel.shade(uv,vec2(float(x-job.input.x1)+.5f,float(y-job.input.y1)+.5f));
  vec2 q=uv*2.f-1.f;q*=1.f+(job.params.tubeEnabled>=.5f?job.params.curve:0.f)*dot(q,q);vec2 warped=q*.5f+.5f;
  result.a=(warped.x<0||warped.y<0||warped.x>1||warped.y>1)?0:kernel.texture(job.input,warped).a;
  if(job.managed){vec3 rgb=encodeColor(result.rgb(),job.color);result.r=rgb.r;result.g=rgb.g;result.b=rgb.b;}
  else if(job.linear){vec3 rgb=pow(max(result.rgb(),vec3(0)),vec3(2.2f));result.r=rgb.r;result.g=rgb.g;result.b=rgb.b;}
  if(job.output.premult){result.r*=result.a;result.g*=result.a;result.b*=result.a;}
 }
 float* out=reinterpret_cast<float*>(reinterpret_cast<char*>(job.output.data)+ptrdiff_t(y-job.output.y1)*job.output.rowBytes)+4*(x-job.output.x1);
 out[0]=result.r;out[1]=result.g;out[2]=result.b;out[3]=result.a;
}
void renderCPU(const RenderJob& job);
int renderCUDA(const RenderJob& job,void* stream,bool hasStream);

} // namespace crt
