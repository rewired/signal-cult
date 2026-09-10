#include "kernel.hpp"
namespace crt {
void renderCPU(const RenderJob& job){for(int y=job.y1;y<job.y2;++y)for(int x=job.x1;x<job.x2;++x)renderPixel(job,x,y);}

}

