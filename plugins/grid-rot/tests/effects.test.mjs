import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultExtensions} from '../js/params.js';
import {operatorData,selectOperator} from '../js/effects.js';
test('operator matrix normalizes enabled weights and is deterministic',()=>{
 const operators=defaultExtensions().operators;operators.offset={...operators.offset,enabled:true,weight:2};operators.delay={...operators.delay,enabled:true,weight:3};
 const data=operatorData(operators);assert.equal(data.total,5);assert.equal(data.weights[0],2);assert.equal(data.weights[9],3);
 assert.equal(selectOperator(3,7,99,operators),selectOperator(3,7,99,operators));
});
test('zero operator weight preserves legacy routing',()=>{assert.equal(selectOperator(1,2,3,defaultExtensions().operators),-1);});
