import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {fields,presets,destinations} from '../js/params.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'native','generated','parameters.hpp');
const ident=s=>s.replace(/[^a-zA-Z0-9]+(.)?/g,(_,c)=>c?c.toUpperCase():'').replace(/^./,c=>c.toUpperCase());
const f=n=>Number(n).toPrecision(9).replace(/e\+/,'e')+'f';
const q=s=>'"'+s.replaceAll('\\','\\\\').replaceAll('"','\\"')+'"';
const styles=['transmission','xerox','dry-ink','thermal','motion'],combines=['max','add','multiply','min'],lines=[];
lines.push('#pragma once','#include <array>','#include <cstddef>','namespace raster_rupture {');
lines.push('enum class ParameterId { '+fields.map(x=>ident(x.key)).join(', ')+', Count };');
lines.push('struct ParameterDescriptor { const char* id; const char* label; float minimum, maximum, initial, step; };');
lines.push('inline constexpr std::array<ParameterDescriptor, static_cast<std::size_t>(ParameterId::Count)> kParameterDescriptors{{');
for(const x of fields)lines.push(`  {${q(x.key)},${q(x.label)},${f(x.min)},${f(x.max)},${f(x.value)},${f(x.step)}},`);
lines.push('}};','inline constexpr std::array<const char*,9> kRouteIds{{'+destinations.map(x=>q(x.key)).join(',')+'}};','inline constexpr std::array<const char*,9> kRouteLabels{{'+destinations.map(x=>q(x.label)).join(',')+'}};');
lines.push('struct FactoryPreset { const char* name; int style,combine; std::array<float,static_cast<std::size_t>(ParameterId::Count)> values; std::array<float,3> ink,accent; std::array<std::array<float,2>,9> routes; };',`inline constexpr std::array<FactoryPreset,${presets.length}> kFactoryPresets{{`);
for(const p of presets)lines.push(` {${q(p.name)},${styles.indexOf(p.style)},${combines.indexOf(p.combine)},{{${fields.map(x=>f(p.params[x.key])).join(',')}}},{{${hex(p.colors.ink)}}},{{${hex(p.colors.accent)}}},{{${p.routes.map(r=>`{{${f(r[0])},${f(r[1])}}}`).join(',')}}}},`);
lines.push('}};','} // namespace raster_rupture','');await mkdir(path.dirname(out),{recursive:true});await writeFile(out,lines.join('\n'));
function hex(value){return [1,3,5].map(i=>f(parseInt(value.slice(i,i+2),16)/255)).join(',');}
