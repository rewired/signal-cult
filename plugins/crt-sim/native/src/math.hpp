#pragma once
#include <cmath>
#include <cstdint>
#ifdef __CUDACC__
#define HD __host__ __device__
#else
#define HD
#endif
namespace crt {
using uint=uint32_t;
HD inline float floor(float x){return floorf(x);} HD inline float abs(float x){return fabsf(x);}
HD inline float pow(float x,float y){return powf(x,y);} HD inline float sqrt(float x){return sqrtf(x);}
HD inline float sin(float x){return sinf(x);} HD inline float exp(float x){return expf(x);} HD inline float exp2(float x){return exp2f(x);}
struct vec2 {float x,y; HD vec2(float a=0):x(a),y(a){} HD vec2(float a,float b):x(a),y(b){} };
struct ivec2 {int x,y; HD ivec2(int a,int b):x(a),y(b){} HD explicit ivec2(vec2 a):x(int(a.x)),y(int(a.y)){} };
struct vec3 {union {struct{float x,y,z;};struct{float r,g,b;};}; HD vec3(float a=0):x(a),y(a),z(a){} HD vec3(float a,float b,float c):x(a),y(b),z(c){} };
struct vec4 {float r,g,b,a; HD vec4(float x,float y,float z,float w):r(x),g(y),b(z),a(w){} HD vec4(vec3 c,float w):r(c.r),g(c.g),b(c.b),a(w){} HD vec3 rgb() const{return vec3(r,g,b);} };
#define OP2(op) HD inline vec2 operator op(vec2 a,vec2 b){return vec2(a.x op b.x,a.y op b.y);} HD inline vec2 operator op(vec2 a,float b){return a op vec2(b);} HD inline vec2 operator op(float a,vec2 b){return vec2(a) op b;}
#define OP3(op) HD inline vec3 operator op(vec3 a,vec3 b){return vec3(a.x op b.x,a.y op b.y,a.z op b.z);} HD inline vec3 operator op(vec3 a,float b){return a op vec3(b);} HD inline vec3 operator op(float a,vec3 b){return vec3(a) op b;}
OP2(+) OP2(-) OP2(*) OP2(/) OP3(+) OP3(-) OP3(*) OP3(/)
HD inline ivec2 operator+(ivec2 a,ivec2 b){return ivec2(a.x+b.x,a.y+b.y);}
HD inline vec2& operator*=(vec2&a,float b){a=a*b;return a;}
HD inline vec3& operator*=(vec3&a,vec3 b){a=a*b;return a;}
HD inline vec3& operator+=(vec3&a,vec3 b){a=a+b;return a;}
HD inline float min(float a,float b){return fminf(a,b);} HD inline float max(float a,float b){return fmaxf(a,b);}
HD inline float clamp(float a,float l,float h){return min(max(a,l),h);} HD inline vec2 clamp(vec2 a,float l,float h){return vec2(clamp(a.x,l,h),clamp(a.y,l,h));}
HD inline vec3 max(vec3 a,vec3 b){return vec3(max(a.x,b.x),max(a.y,b.y),max(a.z,b.z));}
HD inline vec2 max(vec2 a,float b){return vec2(max(a.x,b),max(a.y,b));}
HD inline float fract(float a){return a-floorf(a);} HD inline vec2 fract(vec2 a){return vec2(fract(a.x),fract(a.y));}
HD inline vec2 floor(vec2 a){return vec2(floorf(a.x),floorf(a.y));}
HD inline vec2 abs(vec2 a){return vec2(fabsf(a.x),fabsf(a.y));}
HD inline float dot(vec2 a,vec2 b){return a.x*b.x+a.y*b.y;} HD inline float dot(vec3 a,vec3 b){return a.x*b.x+a.y*b.y+a.z*b.z;}
HD inline float length(vec2 a){return sqrtf(dot(a,a));}
HD inline float mod(float a,float b){return a-b*floorf(a/b);}
HD inline float mix(float a,float b,float t){return a*(1-t)+b*t;} HD inline vec2 mix(vec2 a,vec2 b,float t){return a*(1-t)+b*t;} HD inline vec3 mix(vec3 a,vec3 b,float t){return a*(1-t)+b*t;}
HD inline vec3 pow(vec3 a,vec3 b){return vec3(powf(a.x,b.x),powf(a.y,b.y),powf(a.z,b.z));}
HD inline float smoothstep(float a,float b,float x){float t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);}
HD inline vec3 smoothstep(vec3 a,vec3 b,vec3 x){return vec3(smoothstep(a.x,b.x,x.x),smoothstep(a.y,b.y,x.y),smoothstep(a.z,b.z,x.z));}
HD inline float step(float edge,float x){return x<edge?0.f:1.f;}
HD inline bool lessThan(vec2 a,vec2 b){return a.x<b.x||a.y<b.y;} HD inline bool greaterThan(vec2 a,vec2 b){return a.x>b.x||a.y>b.y;} HD inline bool any(bool b){return b;}

} // namespace crt


