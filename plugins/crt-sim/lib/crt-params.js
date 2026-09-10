const presetURL = new URL('../presets/crt-presets.json', import.meta.url);
const presetData = typeof window === 'undefined'
    ? JSON.parse(await (await import('node:fs/promises')).readFile(presetURL, 'utf8'))
    : await fetch(presetURL).then(response => {
        if (!response.ok) throw new Error('Could not load CRT presets.');
        return response.json();
    });
export const maskTypes = [
    { id: 0, name: 'Aperture Grille / RGB', description: 'Continuous vertical RGB phosphor stripes.' },
    { id: 1, name: 'Slot Mask / Aligned', description: 'RGB slots with aligned horizontal bridges.' },
    { id: 2, name: 'Shadow Mask / Classic', description: 'Stylized staggered rows.' },
    { id: 3, name: 'Aperture Grille / BGR', description: 'Vertical stripes in reversed channel order.' },
    { id: 4, name: 'Grille / Black Matrix', description: 'Narrow phosphor stripes with dark gaps.' },
    { id: 5, name: 'Slot Mask / Staggered', description: 'Rounded slots with staggered bridges.' },
    { id: 6, name: 'Dot Mask / Inline', description: 'Round RGB dots in aligned rows.' },
    { id: 7, name: 'Delta Triads', description: 'Three phosphor dots arranged in triangular groups.' },
    { id: 8, name: 'Dot Mask / Hexagonal', description: 'Close-packed dots with staggered rows.' },
    { id: 9, name: 'Oval Mask', description: 'Elongated RGB phosphor islands.' },
    { id: 10, name: 'Diamond Mask', description: 'Staggered diamond-shaped phosphors.' },
    { id: 11, name: 'RGB / Horizontal', description: 'Horizontal RGB phosphor stripes.' },
];
export function validateMaskType(value) {
    if (typeof value !== 'number' || !Number.isInteger(value) || !maskTypes.some(type => type.id === value))
        throw new Error('Invalid mask type.');
    return value;
}
export const noiseTypes = [
    { id: 0, name: 'Reception Snow', description: 'Irregular grains, threads and evolving clusters.' },
    { id: 1, name: 'Fine RF Noise', description: 'Fine, rapidly changing reception noise.' },
    { id: 2, name: 'Coarse Snow', description: 'Large, soft black-and-white flakes.' },
    { id: 3, name: 'Horizontal Threads', description: 'Long, interrupted horizontal streaks.' },
    { id: 4, name: 'Impulse Noise', description: 'Sparse bright sparks and short discharges.' },
    { id: 5, name: 'Tape Dropouts', description: 'Dark signal losses with bright edges.' },
    { id: 6, name: 'Rolling Bands', description: 'Moving broad bands with dense noise.' },
    { id: 7, name: 'Hum / Interference', description: 'Angled interference with drifting phase.' },
    { id: 8, name: 'Chroma Noise', description: 'Independent color noise and coarse chroma flicker.' },
    { id: 9, name: 'Clouded Reception', description: 'Slowly evolving noise islands.' },
];
export const pixelPatterns = [{"id":0,"name":"Dots","description":"Luminance-responsive raster anchored to the image."},{"id":1,"name":"Square Cells","description":"Luminance-responsive raster anchored to the image."},{"id":2,"name":"Diamonds","description":"Luminance-responsive raster anchored to the image."},{"id":3,"name":"Vertical Bars","description":"Luminance-responsive raster anchored to the image."},{"id":4,"name":"Horizontal Bars","description":"Luminance-responsive raster anchored to the image."},{"id":5,"name":"Cross Matrix","description":"Luminance-responsive raster anchored to the image."},{"id":6,"name":"Rings","description":"Luminance-responsive raster anchored to the image."},{"id":7,"name":"Segment Display","description":"Luminance-responsive raster anchored to the image."}];
export const pixelPalettes = [{"id":0,"name":"Source Color","description":"Preserve the source colors."},{"id":1,"name":"Phosphor Green","description":"Stylized monitor palette."},{"id":2,"name":"Amber","description":"Stylized monitor palette."},{"id":3,"name":"Ice Blue","description":"Stylized monitor palette."},{"id":4,"name":"Magenta / Cyan","description":"Stylized monitor palette."},{"id":5,"name":"Warm White","description":"Stylized monitor palette."}];
export const choiceTypes = {noiseType:noiseTypes,pixelPattern:pixelPatterns,pixelPalette:pixelPalettes};
export const toggleIds = ['pixelEnabled','tubeEnabled'];
export const integerIds = ['noiseSeed'];
export const controls = [
    ["Signal","noiseSeed","Seed",0,16777215,1,0],
    ["Pixel / Sci-Fi","pixelEnabled","Enable Pixel / Sci-Fi",0,1,1,1],
    ["CRT","tubeEnabled","Enable CRT",0,1,1,1],
    ["Pixel / Sci-Fi","pixelMix","Pixel Mix",0,1,0.01,0],
    ["Pixel / Sci-Fi","pixelPattern","Raster Shape",0,7,1,0],
    ["Pixel / Sci-Fi","pixelPalette","Palette",0,5,1,0],
    ["Pixel / Sci-Fi","pixelSize","Cell Size (px)",3,64,0.5,10],
    ["Pixel / Sci-Fi","pixelAspect","Cell Aspect",0.5,2,0.01,1],
    ["Pixel / Sci-Fi","pixelFill","Cell Fill",0.2,1,0.01,0.85],
    ["Pixel / Sci-Fi","pixelResponse","Luminance Response",0.3,3,0.01,1],
    ["Pixel / Sci-Fi","pixelSoftness","Edge Softness",0,0.25,0.005,0.025],
    ["Pixel / Sci-Fi","pixelLevels","Tonal Levels",2,32,1,16],
    ["Pixel / Sci-Fi","pixelQuantize","Quantization",0,1,0.01,0],
    ["Pixel / Sci-Fi","pixelBackground","Background Emission",0,0.15,0.001,0.006],
    ["CRT","lines","Raster Lines",120,1080,1,360],
    ["CRT","scan","Scanline Strength",0,1,0.01,0.45],
    ["CRT","mask","Phosphor Mask",0,1,0.01,0.65],
    ["CRT","pitch","Mask Pitch (px)",2,12,0.1,3],
    ["CRT","beam","Beam Width",0.2,1,0.01,0.65],
    ["Light & Color","bloom","Bloom",0,1.5,0.01,0.3],
    ["Light & Color","exposure","Exposure (EV)",-2,2,0.01,0.2],
    ["Light & Color","saturation","Saturation",0,2,0.01,1.1],
    ["Light & Color","black","Black Level",0,0.15,0.001,0.005],
    ["Light & Color","gamma","CRT Gamma",1.5,3,0.01,2.2],
    ["Optics","curve","Curvature",0,0.3,0.001,0.06],
    ["Optics","vignette","Vignette",0,1,0.01,0.25],
    ["Optics","convergence","RGB Convergence (px)",0,8,0.1,0.6],
    ["Signal","noiseType","Noise Type",0,9,1,0],
    ["Signal","noise","Noise Amount",0,1,0.001,0.015],
    ["Signal","noiseSize","Noise Thread Length",0.25,4,0.05,1.2],
    ["Signal","noiseClump","Noise Clustering",0,1,0.01,0.65],
    ["Signal","noiseClumpSpeed","Cluster Evolution",0,3,0.01,0.35],
    ["Signal","noiseBands","Interference Bands",0,1,0.01,0.5],
    ["Signal","noiseSpeed","Noise Speed",0,2,0.01,1],
    ["Signal","noiseChroma","Chroma Noise",0,1,0.01,0.15],
    ["Signal","jitter","Line Jitter (px)",0,12,0.1,0.15],
    ["Signal","tracking","Tracking",0,1,0.01,0],
    ["Signal","flicker","Flicker",0,0.2,0.001,0.008],
];
export const defaults = Object.fromEntries(controls.map(c => [c[1], c[6]]));
export const presets=Object.fromEntries(presetData.map(p=>[p.name,p.params]));
export const presetStyles=Object.fromEntries(presetData.map(p=>[p.name,{maskType:p.maskType,description:p.description}]));
export function getBuiltInPreset(name) {
    if (!Object.hasOwn(presets, name) || !Object.hasOwn(presetStyles, name))
        throw new Error('Unknown preset.');
    return { version: 1, maskType: presetStyles[name].maskType, params: { ...presets[name] } };
}
export function validatePreset(input) {
    const value = input;
    if (value?.version !== 1 || !value.params)
        throw new Error('Unsupported CRT preset (expected version 1).');
    return Object.fromEntries(controls.map(c => {
        const n = value.params[c[1]] === undefined && ((c[1].startsWith('noise') && c[1] !== 'noise') || c[1].startsWith('pixel') || c[1]==='tubeEnabled') ? c[6] : value.params[c[1]];
        if (typeof n !== 'number' || !Number.isFinite(n) || n < c[3] || n > c[4] || ((Object.hasOwn(choiceTypes,c[1]) || toggleIds.includes(c[1]) || integerIds.includes(c[1])) && !Number.isInteger(n)))
            throw new Error('Invalid parameter: ' + c[2]);
        return [c[1], n];
    }));
}

