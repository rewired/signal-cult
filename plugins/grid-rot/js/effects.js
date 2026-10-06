import {operatorDefinitions,random01} from './params.js';

export function operatorData(operators){
 const weights=new Float32Array(operatorDefinitions.length),strengths=new Float32Array(operatorDefinitions.length),settings=new Float32Array(operatorDefinitions.length*2);let total=0;
 operatorDefinitions.forEach((definition,index)=>{const operator=operators?.[definition.id];if(!operator?.enabled)return;weights[index]=Math.max(0,operator.weight||0);strengths[index]=Math.max(0,operator.strength||0);const values=Object.values(operator.settings||{}).filter(Number.isFinite);settings[index*2]=values[0]??0;settings[index*2+1]=values[1]??0;total+=weights[index];});
 return {weights,strengths,settings,total};
}
export function selectOperator(x,y,tick,operators){
 const data=operatorData(operators);if(data.total<=0)return -1;let pick=random01((x*73856093)^(y*19349663)^(Math.floor(tick)*83492791))*data.total;
 for(let i=0;i<data.weights.length;i++){pick-=data.weights[i];if(pick<0)return i;}return data.weights.length-1;
}
