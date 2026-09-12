#include "raster_rupture/core.hpp"
#include <cmath>
#include <iostream>
#include <vector>
using namespace raster_rupture;
int main(){
 constexpr int width=96,height=54;std::vector<float>source(width*height*4),previous(width*height*4),mask(width*height),cpu(width*height*4),gpu(width*height*4),feedbackInput(width*height*4,.9f),withFeedback(width*height*4),withoutFeedback(width*height*4);
 for(int y=0;y<height;++y)for(int x=0;x<width;++x){size_t i=(size_t(y)*width+x)*4;source[i]=float(x)/width;source[i+1]=float(y)/height;source[i+2]=.2f+.3f*float((x/7+y/5)&1);source[i+3]=1;int px=x>2?x-3:0;previous[i]=float(px)/width;previous[i+1]=source[i+1];previous[i+2]=source[i+2];previous[i+3]=1;mask[size_t(y)*width+x]=x<width/2?0:1;}
 RenderRequest request;request.source={source.data(),width,height,4,width*16};request.previous={previous.data(),width,height,4,width*16};request.mask={mask.data(),width,height,1,width*4};request.output={cpu.data(),width,height,width*16};request.look=defaultLook();request.time_seconds=1.25;
 if(renderCpu(request)!=RenderStatus::Ok)return 1;for(float value:cpu)if(!std::isfinite(value))return 2;
#ifdef RASTER_RUPTURE_WITH_CUDA
 if(cudaAvailable()){request.output={gpu.data(),width,height,width*16};if(renderCuda(request)!=RenderStatus::Ok)return 3;double error=0;for(size_t i=0;i<gpu.size();++i){if(!std::isfinite(gpu[i]))return 4;error+=std::abs(gpu[i]-cpu[i]);}if(error/gpu.size()>.02)return 5;}
#endif
 for(size_t i=3;i<feedbackInput.size();i+=4)feedbackInput[i]=1;request.mask={};for(auto&route:request.look.routes)route={1,0};request.previous_feedback={feedbackInput.data(),width,height,4,width*16};request.output={withFeedback.data(),width,height,width*16};request.time_seconds+=1.0/24.0;if(renderCpu(request)!=RenderStatus::Ok)return 6;request.previous_feedback={};request.output={withoutFeedback.data(),width,height,width*16};if(renderCpu(request)!=RenderStatus::Ok)return 7;double feedbackDifference=0;for(size_t i=0;i<withFeedback.size();++i)feedbackDifference+=std::abs(withFeedback[i]-withoutFeedback[i]);if(feedbackDifference/withFeedback.size()<1e-4)return 8;
 request.look.parameters[size_t(ParameterId::Amount)]=0;request.output={cpu.data(),width,height,width*16};if(renderCpu(request)!=RenderStatus::Ok)return 9;for(size_t i=0;i<source.size();++i)if(std::abs(source[i]-cpu[i])>1e-6)return 10;
 std::cout<<"Raster Rupture two-pass CPU/CUDA/feedback smoke OK\n";
}
