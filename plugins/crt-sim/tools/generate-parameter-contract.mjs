import fs from 'node:fs';
import {controls,maskTypes,choiceTypes,toggleIds,integerIds} from '../lib/crt-params.js';
const parameters=controls.map(([group,id,label,min,max,step,initial])=>({id,label,group,min,max,step,default:initial,type:choiceTypes[id]?'choice':toggleIds.includes(id)?'boolean':integerIds.includes(id)?'integer':'double'}));
const contract={schema:'crt-sim/parameter-contract',version:1,preset_schema_version:1,mask_count:maskTypes.length,parameters};
fs.writeFileSync(new URL('../contracts/parameters-v1.json',import.meta.url),JSON.stringify(contract,null,2)+'\n');
