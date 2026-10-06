const luminance=(r,g,b)=>(.2126*r+.7152*g+.0722*b)/255;
export function analysePixels(data,width,height,previous){
 const luma=new Float32Array(width*height),edges=new Float32Array(width*height),motion=new Float32Array(width*height);
 for(let i=0;i<luma.length;i++)luma[i]=luminance(data[i*4],data[i*4+1],data[i*4+2]);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x,left=luma[y*width+Math.max(0,x-1)],right=luma[y*width+Math.min(width-1,x+1)],up=luma[Math.max(0,y-1)*width+x],down=luma[Math.min(height-1,y+1)*width+x];edges[i]=Math.min(1,Math.hypot(right-left,down-up));motion[i]=previous?Math.min(1,Math.abs(luma[i]-previous[i])):0;}
 return {luma,edges,motion};
}
export function targetScore(sample,targeting){
 const total=targeting.uniform+targeting.bright+targeting.dark+targeting.edges+targeting.motion;if(total<=0)return 1;
 return (targeting.uniform+targeting.bright*sample.luma+targeting.dark*(1-sample.luma)+targeting.edges*sample.edge+targeting.motion*sample.motion)/total;
}
