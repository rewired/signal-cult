#pragma once
#include <cstddef>
struct Parameters {
 float noiseSeed = 0.000000f;
 float pixelEnabled = 1.000000f;
 float tubeEnabled = 1.000000f;
 float pixelMix = 0.000000f;
 float pixelPattern = 0.000000f;
 float pixelPalette = 0.000000f;
 float pixelSize = 10.000000f;
 float pixelAspect = 1.000000f;
 float pixelFill = 0.850000f;
 float pixelResponse = 1.000000f;
 float pixelSoftness = 0.025000f;
 float pixelLevels = 16.000000f;
 float pixelQuantize = 0.000000f;
 float pixelBackground = 0.006000f;
 float lines = 360.000000f;
 float scan = 0.450000f;
 float mask = 0.650000f;
 float pitch = 3.000000f;
 float beam = 0.650000f;
 float bloom = 0.300000f;
 float exposure = 0.200000f;
 float saturation = 1.100000f;
 float black = 0.005000f;
 float gamma = 2.200000f;
 float curve = 0.060000f;
 float vignette = 0.250000f;
 float convergence = 0.600000f;
 float noiseType = 0.000000f;
 float noise = 0.015000f;
 float noiseSize = 1.200000f;
 float noiseClump = 0.650000f;
 float noiseClumpSpeed = 0.350000f;
 float noiseBands = 0.500000f;
 float noiseSpeed = 1.000000f;
 float noiseChroma = 0.150000f;
 float jitter = 0.150000f;
 float tracking = 0.000000f;
 float flicker = 0.008000f;
 float maskType=0; float time=0; float bypass=0; float split=0;
};
struct ParameterDef {const char* id; const char* label; const char* group; double min,max,step,initial; size_t offset; bool choice; bool toggle; bool integer;};
inline const ParameterDef parameterDefs[]={
{"noiseSeed","Seed","Signal",0,16777215,1,0,offsetof(Parameters,noiseSeed),false,false,true},
{"pixelEnabled","Enable Pixel / Sci-Fi","Pixel / Sci-Fi",0,1,1,1,offsetof(Parameters,pixelEnabled),false,true,false},
{"tubeEnabled","Enable CRT","CRT",0,1,1,1,offsetof(Parameters,tubeEnabled),false,true,false},
{"pixelMix","Pixel Mix","Pixel / Sci-Fi",0,1,0.01,0,offsetof(Parameters,pixelMix),false,false,false},
{"pixelPattern","Raster Shape","Pixel / Sci-Fi",0,7,1,0,offsetof(Parameters,pixelPattern),true,false,false},
{"pixelPalette","Palette","Pixel / Sci-Fi",0,5,1,0,offsetof(Parameters,pixelPalette),true,false,false},
{"pixelSize","Cell Size (px)","Pixel / Sci-Fi",3,64,0.5,10,offsetof(Parameters,pixelSize),false,false,false},
{"pixelAspect","Cell Aspect","Pixel / Sci-Fi",0.5,2,0.01,1,offsetof(Parameters,pixelAspect),false,false,false},
{"pixelFill","Cell Fill","Pixel / Sci-Fi",0.2,1,0.01,0.85,offsetof(Parameters,pixelFill),false,false,false},
{"pixelResponse","Luminance Response","Pixel / Sci-Fi",0.3,3,0.01,1,offsetof(Parameters,pixelResponse),false,false,false},
{"pixelSoftness","Edge Softness","Pixel / Sci-Fi",0,0.25,0.005,0.025,offsetof(Parameters,pixelSoftness),false,false,false},
{"pixelLevels","Tonal Levels","Pixel / Sci-Fi",2,32,1,16,offsetof(Parameters,pixelLevels),false,false,false},
{"pixelQuantize","Quantization","Pixel / Sci-Fi",0,1,0.01,0,offsetof(Parameters,pixelQuantize),false,false,false},
{"pixelBackground","Background Emission","Pixel / Sci-Fi",0,0.15,0.001,0.006,offsetof(Parameters,pixelBackground),false,false,false},
{"lines","Raster Lines","CRT",120,1080,1,360,offsetof(Parameters,lines),false,false,false},
{"scan","Scanline Strength","CRT",0,1,0.01,0.45,offsetof(Parameters,scan),false,false,false},
{"mask","Phosphor Mask","CRT",0,1,0.01,0.65,offsetof(Parameters,mask),false,false,false},
{"pitch","Mask Pitch (px)","CRT",2,12,0.1,3,offsetof(Parameters,pitch),false,false,false},
{"beam","Beam Width","CRT",0.2,1,0.01,0.65,offsetof(Parameters,beam),false,false,false},
{"bloom","Bloom","Light & Color",0,1.5,0.01,0.3,offsetof(Parameters,bloom),false,false,false},
{"exposure","Exposure (EV)","Light & Color",-2,2,0.01,0.2,offsetof(Parameters,exposure),false,false,false},
{"saturation","Saturation","Light & Color",0,2,0.01,1.1,offsetof(Parameters,saturation),false,false,false},
{"black","Black Level","Light & Color",0,0.15,0.001,0.005,offsetof(Parameters,black),false,false,false},
{"gamma","CRT Gamma","Light & Color",1.5,3,0.01,2.2,offsetof(Parameters,gamma),false,false,false},
{"curve","Curvature","Optics",0,0.3,0.001,0.06,offsetof(Parameters,curve),false,false,false},
{"vignette","Vignette","Optics",0,1,0.01,0.25,offsetof(Parameters,vignette),false,false,false},
{"convergence","RGB Convergence (px)","Optics",0,8,0.1,0.6,offsetof(Parameters,convergence),false,false,false},
{"noiseType","Noise Type","Signal",0,9,1,0,offsetof(Parameters,noiseType),true,false,false},
{"noise","Noise Amount","Signal",0,1,0.001,0.015,offsetof(Parameters,noise),false,false,false},
{"noiseSize","Noise Thread Length","Signal",0.25,4,0.05,1.2,offsetof(Parameters,noiseSize),false,false,false},
{"noiseClump","Noise Clustering","Signal",0,1,0.01,0.65,offsetof(Parameters,noiseClump),false,false,false},
{"noiseClumpSpeed","Cluster Evolution","Signal",0,3,0.01,0.35,offsetof(Parameters,noiseClumpSpeed),false,false,false},
{"noiseBands","Interference Bands","Signal",0,1,0.01,0.5,offsetof(Parameters,noiseBands),false,false,false},
{"noiseSpeed","Noise Speed","Signal",0,2,0.01,1,offsetof(Parameters,noiseSpeed),false,false,false},
{"noiseChroma","Chroma Noise","Signal",0,1,0.01,0.15,offsetof(Parameters,noiseChroma),false,false,false},
{"jitter","Line Jitter (px)","Signal",0,12,0.1,0.15,offsetof(Parameters,jitter),false,false,false},
{"tracking","Tracking","Signal",0,1,0.01,0,offsetof(Parameters,tracking),false,false,false},
{"flicker","Flicker","Signal",0,0.2,0.001,0.008,offsetof(Parameters,flicker),false,false,false},
};
inline const char* maskNames[]={"Aperture Grille / RGB","Slot Mask / Aligned","Shadow Mask / Classic","Aperture Grille / BGR","Grille / Black Matrix","Slot Mask / Staggered","Dot Mask / Inline","Delta Triads","Dot Mask / Hexagonal","Oval Mask","Diamond Mask","RGB / Horizontal"};
inline const char* noiseNames[]={"Reception Snow","Fine RF Noise","Coarse Snow","Horizontal Threads","Impulse Noise","Tape Dropouts","Rolling Bands","Hum / Interference","Chroma Noise","Clouded Reception"};
inline const char* pixelPatternNames[]={"Dots","Square Cells","Diamonds","Vertical Bars","Horizontal Bars","Cross Matrix","Rings","Segment Display"};
inline const char* pixelPaletteNames[]={"Source Color","Phosphor Green","Amber","Ice Blue","Magenta / Cyan","Warm White"};
struct PresetDef {const char* name; float mask; float values[38];};
inline const PresetDef presetDefs[]={
{"Studio / PVM",0,{101.000000f,0.000000f,1.000000f,1.000000f,0.000000f,0.000000f,10.000000f,1.000000f,0.850000f,1.000000f,0.025000f,16.000000f,0.000000f,0.006000f,360.000000f,0.450000f,0.650000f,3.000000f,0.650000f,0.300000f,0.200000f,1.100000f,0.005000f,2.200000f,0.060000f,0.250000f,0.600000f,1.000000f,0.008000f,0.650000f,0.150000f,0.150000f,0.050000f,1.100000f,0.030000f,0.150000f,0.000000f,0.008000f}},
{"Living room / 1994",0,{1994.000000f,0.000000f,1.000000f,1.000000f,0.000000f,0.000000f,10.000000f,1.000000f,0.850000f,1.000000f,0.025000f,16.000000f,0.000000f,0.006000f,240.000000f,0.650000f,0.800000f,3.000000f,0.650000f,0.550000f,0.200000f,1.100000f,0.005000f,2.200000f,0.130000f,0.250000f,1.200000f,7.000000f,0.025000f,1.600000f,0.400000f,0.200000f,0.250000f,0.650000f,0.120000f,0.150000f,0.000000f,0.008000f}},
{"Worn tape",0,{307.000000f,0.000000f,1.000000f,1.000000f,0.000000f,0.000000f,10.000000f,1.000000f,0.850000f,1.000000f,0.025000f,16.000000f,0.000000f,0.006000f,280.000000f,0.500000f,0.850000f,4.000000f,0.650000f,0.450000f,0.200000f,1.100000f,0.005000f,2.200000f,0.060000f,0.250000f,2.500000f,3.000000f,0.080000f,2.400000f,0.800000f,0.450000f,0.600000f,0.850000f,0.250000f,1.800000f,0.450000f,0.008000f}},
{"Arcade / RGB",0,{404.000000f,0.000000f,1.000000f,1.000000f,0.000000f,0.000000f,10.000000f,1.000000f,0.850000f,1.000000f,0.025000f,16.000000f,0.000000f,0.006000f,240.000000f,0.800000f,0.800000f,3.000000f,0.650000f,0.400000f,0.200000f,1.350000f,0.005000f,2.200000f,0.080000f,0.250000f,0.600000f,4.000000f,0.035000f,0.700000f,0.200000f,0.250000f,0.050000f,1.200000f,0.080000f,0.150000f,0.000000f,0.008000f}},
{"Broadcast / clean",4,{505.000000f,0.000000f,1.000000f,1.000000f,0.000000f,0.000000f,10.000000f,1.000000f,0.850000f,1.000000f,0.025000f,16.000000f,0.000000f,0.006000f,576.000000f,0.200000f,0.380000f,3.000000f,0.850000f,0.120000f,0.050000f,1.000000f,0.005000f,2.200000f,0.015000f,0.250000f,0.150000f,1.000000f,0.004000f,0.500000f,0.100000f,0.100000f,0.000000f,1.000000f,0.020000f,0.150000f,0.000000f,0.008000f}},
{"PC VGA / 1998",6,{0.000000f,0.000000f,1.000000f,1.000000f,0.000000f,0.000000f,10.000000f,1.000000f,0.850000f,1.000000f,0.025000f,16.000000f,0.000000f,0.006000f,768.000000f,0.120000f,0.720000f,4.000000f,0.900000f,0.080000f,0.200000f,1.000000f,0.005000f,2.200000f,0.025000f,0.100000f,0.100000f,1.000000f,0.000000f,0.500000f,0.000000f,0.000000f,0.000000f,1.000000f,0.000000f,0.150000f,0.000000f,0.008000f}},
{"Console / 240p",5,{240.000000f,0.000000f,1.000000f,1.000000f,0.000000f,0.000000f,10.000000f,1.000000f,0.850000f,1.000000f,0.025000f,16.000000f,0.000000f,0.006000f,240.000000f,0.850000f,0.800000f,5.000000f,0.520000f,0.380000f,0.300000f,1.200000f,0.005000f,2.200000f,0.095000f,0.250000f,0.800000f,3.000000f,0.025000f,1.800000f,0.450000f,0.250000f,0.200000f,0.900000f,0.120000f,0.150000f,0.000000f,0.008000f}},
{"Delta / vintage",7,{707.000000f,0.000000f,1.000000f,1.000000f,0.000000f,0.000000f,10.000000f,1.000000f,0.850000f,1.000000f,0.025000f,16.000000f,0.000000f,0.006000f,288.000000f,0.480000f,0.880000f,7.000000f,0.750000f,0.650000f,0.200000f,0.820000f,0.018000f,2.400000f,0.180000f,0.450000f,1.700000f,2.000000f,0.055000f,2.200000f,0.750000f,0.200000f,0.300000f,0.700000f,0.080000f,0.150000f,0.000000f,0.008000f}},
{"VHS / rental",9,{808.000000f,0.000000f,1.000000f,1.000000f,0.000000f,0.000000f,10.000000f,1.000000f,0.850000f,1.000000f,0.025000f,16.000000f,0.000000f,0.006000f,240.000000f,0.450000f,0.650000f,5.000000f,0.780000f,0.500000f,0.200000f,0.880000f,0.020000f,2.200000f,0.110000f,0.250000f,2.800000f,5.000000f,0.550000f,2.800000f,0.850000f,0.300000f,0.650000f,0.800000f,0.000000f,1.200000f,0.280000f,0.008000f}},
{"Antenna / weak",1,{909.000000f,0.000000f,1.000000f,1.000000f,0.000000f,0.000000f,10.000000f,1.000000f,0.850000f,1.000000f,0.025000f,16.000000f,0.000000f,0.006000f,312.000000f,0.700000f,0.750000f,4.000000f,0.600000f,0.200000f,0.200000f,0.720000f,0.005000f,2.200000f,0.120000f,0.250000f,1.500000f,0.000000f,0.420000f,1.100000f,0.900000f,0.550000f,0.800000f,1.150000f,0.200000f,1.600000f,0.300000f,0.025000f}},
{"Night watch / mono",0,{1010.000000f,0.000000f,1.000000f,1.000000f,0.000000f,0.000000f,10.000000f,1.000000f,0.850000f,1.000000f,0.025000f,16.000000f,0.000000f,0.006000f,320.000000f,0.600000f,0.000000f,3.000000f,0.580000f,0.300000f,-0.150000f,0.000000f,0.012000f,2.400000f,0.160000f,0.600000f,0.000000f,9.000000f,0.160000f,2.000000f,0.850000f,0.180000f,0.400000f,0.650000f,0.000000f,0.150000f,0.000000f,0.008000f}},
{"Chroma / meltdown",8,{1111.000000f,0.000000f,1.000000f,1.000000f,0.000000f,0.000000f,10.000000f,1.000000f,0.850000f,1.000000f,0.025000f,16.000000f,0.000000f,0.006000f,280.000000f,0.650000f,0.850000f,6.000000f,0.600000f,0.600000f,0.250000f,1.600000f,0.005000f,2.200000f,0.140000f,0.250000f,4.000000f,8.000000f,0.380000f,1.800000f,0.800000f,0.600000f,0.650000f,1.250000f,1.000000f,2.200000f,0.400000f,0.008000f}},
{"Sci-Fi / Emerald terminal",0,{1212.000000f,1.000000f,1.000000f,1.000000f,0.000000f,1.000000f,9.000000f,1.000000f,0.850000f,1.000000f,0.025000f,16.000000f,0.000000f,0.006000f,360.000000f,0.200000f,0.200000f,3.000000f,0.650000f,0.650000f,0.500000f,1.100000f,0.005000f,2.200000f,0.070000f,0.250000f,0.200000f,7.000000f,0.025000f,1.100000f,0.300000f,0.200000f,0.150000f,0.400000f,0.000000f,0.000000f,0.000000f,0.008000f}},
{"Sci-Fi / Amber telemetry",0,{1313.000000f,1.000000f,1.000000f,1.000000f,3.000000f,2.000000f,11.000000f,0.700000f,0.850000f,1.000000f,0.025000f,16.000000f,0.000000f,0.006000f,360.000000f,0.250000f,0.200000f,3.000000f,0.650000f,0.400000f,0.500000f,1.100000f,0.005000f,2.200000f,0.060000f,0.250000f,0.200000f,6.000000f,0.045000f,1.400000f,0.450000f,0.250000f,0.350000f,0.450000f,0.000000f,0.000000f,0.000000f,0.008000f}},
{"Sci-Fi / Arctic array",0,{1414.000000f,1.000000f,1.000000f,1.000000f,1.000000f,3.000000f,7.000000f,1.000000f,0.920000f,1.000000f,0.025000f,16.000000f,0.000000f,0.006000f,360.000000f,0.120000f,0.200000f,3.000000f,0.650000f,0.180000f,0.500000f,1.100000f,0.005000f,2.200000f,0.000000f,0.250000f,0.200000f,1.000000f,0.006000f,0.450000f,0.100000f,0.100000f,0.000000f,1.300000f,0.020000f,0.000000f,0.000000f,0.008000f}},
{"Sci-Fi / Neon relay",0,{1515.000000f,1.000000f,1.000000f,1.000000f,5.000000f,4.000000f,14.000000f,1.000000f,0.850000f,1.500000f,0.025000f,16.000000f,0.000000f,0.006000f,360.000000f,0.200000f,0.150000f,3.000000f,0.650000f,0.800000f,0.500000f,1.100000f,0.005000f,2.200000f,0.060000f,0.250000f,0.200000f,4.000000f,0.120000f,0.850000f,0.550000f,0.600000f,0.200000f,1.400000f,0.550000f,0.000000f,0.000000f,0.008000f}},
{"Sci-Fi / Diamond archive",0,{1616.000000f,1.000000f,1.000000f,1.000000f,2.000000f,5.000000f,12.000000f,1.000000f,0.900000f,1.000000f,0.025000f,5.000000f,1.000000f,0.006000f,360.000000f,0.200000f,0.200000f,3.000000f,0.650000f,0.300000f,0.500000f,1.100000f,0.005000f,2.200000f,0.060000f,0.250000f,0.200000f,2.000000f,0.025000f,1.800000f,0.500000f,0.120000f,0.100000f,0.450000f,0.050000f,0.000000f,0.000000f,0.008000f}},
{"Sci-Fi / Orbital rings",0,{1717.000000f,1.000000f,1.000000f,1.000000f,6.000000f,3.000000f,18.000000f,1.000000f,0.850000f,1.800000f,0.025000f,16.000000f,0.000000f,0.006000f,360.000000f,0.150000f,0.200000f,3.000000f,0.650000f,0.500000f,0.500000f,1.100000f,0.005000f,2.200000f,0.060000f,0.250000f,0.200000f,6.000000f,0.060000f,1.600000f,0.600000f,0.350000f,0.700000f,0.300000f,0.120000f,0.000000f,0.000000f,0.008000f}},
{"Sci-Fi / Vector bars",0,{1818.000000f,1.000000f,1.000000f,1.000000f,4.000000f,1.000000f,10.000000f,1.800000f,0.650000f,1.000000f,0.025000f,16.000000f,0.000000f,0.006000f,360.000000f,0.200000f,0.200000f,3.000000f,0.650000f,0.350000f,0.500000f,1.100000f,0.005000f,2.200000f,0.060000f,0.250000f,0.200000f,3.000000f,0.030000f,3.000000f,0.400000f,0.150000f,0.150000f,0.600000f,0.000000f,0.000000f,0.000000f,0.008000f}},
{"Sci-Fi / Signal mosaic",0,{1919.000000f,1.000000f,1.000000f,1.000000f,0.000000f,0.000000f,12.000000f,1.000000f,0.850000f,1.500000f,0.025000f,16.000000f,0.000000f,0.006000f,360.000000f,0.200000f,0.200000f,3.000000f,0.650000f,0.300000f,0.500000f,1.350000f,0.005000f,2.200000f,0.060000f,0.250000f,0.200000f,8.000000f,0.050000f,0.900000f,0.350000f,0.400000f,0.100000f,1.100000f,0.800000f,0.000000f,0.000000f,0.008000f}},
{"Sci-Fi / Deck readout",0,{2020.000000f,1.000000f,1.000000f,1.000000f,7.000000f,2.000000f,18.000000f,0.650000f,0.850000f,1.000000f,0.025000f,4.000000f,1.000000f,0.006000f,360.000000f,0.200000f,0.200000f,3.000000f,0.650000f,0.450000f,0.500000f,1.100000f,0.005000f,2.200000f,0.060000f,0.250000f,0.200000f,5.000000f,0.150000f,1.400000f,0.400000f,0.200000f,0.150000f,0.550000f,0.000000f,0.000000f,0.000000f,0.008000f}},
{"Sci-Fi / Ice microgrid",0,{2121.000000f,1.000000f,1.000000f,1.000000f,1.000000f,5.000000f,5.000000f,1.000000f,0.950000f,1.000000f,0.025000f,16.000000f,0.000000f,0.002000f,360.000000f,0.200000f,0.300000f,3.000000f,0.650000f,0.150000f,0.500000f,1.100000f,0.005000f,2.200000f,0.060000f,0.250000f,0.200000f,1.000000f,0.003000f,0.300000f,0.050000f,0.080000f,0.000000f,0.800000f,0.000000f,0.000000f,0.000000f,0.008000f}},
{"Sci-Fi / Lost transmission",0,{2222.000000f,1.000000f,1.000000f,1.000000f,0.000000f,4.000000f,15.000000f,1.000000f,0.850000f,1.000000f,0.025000f,16.000000f,0.000000f,0.006000f,360.000000f,0.200000f,0.200000f,3.000000f,0.650000f,0.700000f,0.500000f,1.100000f,0.005000f,2.200000f,0.060000f,0.250000f,0.200000f,9.000000f,0.190000f,2.400000f,0.950000f,0.650000f,0.700000f,0.750000f,0.650000f,0.000000f,0.080000f,0.008000f}},
{"Sci-Fi / Hybrid phosphor",0,{2323.000000f,1.000000f,1.000000f,0.620000f,5.000000f,0.000000f,9.000000f,1.000000f,0.850000f,1.700000f,0.025000f,16.000000f,0.000000f,0.012000f,360.000000f,0.200000f,0.500000f,3.000000f,0.650000f,0.500000f,0.500000f,1.100000f,0.005000f,2.200000f,0.060000f,0.250000f,0.200000f,8.000000f,0.025000f,0.650000f,0.250000f,0.300000f,0.100000f,0.850000f,0.350000f,0.000000f,0.000000f,0.008000f}},
};
