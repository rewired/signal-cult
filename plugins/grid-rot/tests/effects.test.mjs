import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultExtensions} from '../js/params.js';
import {infectionStrength,operatorData,selectOperator,topologyCoordinate} from '../js/effects.js';
test('operator matrix normalizes enabled weights and is deterministic',()=>{
 const operators=defaultExtensions().operators;operators.offset={...operators.offset,enabled:true,weight:2};operators.delay={...operators.delay,enabled:true,weight:3};
 const data=operatorData(operators);assert.equal(data.total,5);assert.equal(data.weights[0],2);assert.equal(data.weights[9],3);
 assert.equal(selectOperator(3,7,99,operators),selectOperator(3,7,99,operators));
});
test('zero operator weight preserves legacy routing',()=>{assert.equal(selectOperator(1,2,3,defaultExtensions().operators),-1);});
test('infection spread is bounded and timeline deterministic',()=>{
 const infection={amount:1,radius:6,speed:4,decay:.5};
 assert.equal(infectionStrength(2,1,7,infection),infectionStrength(2,1,7,infection));
 assert.equal(infectionStrength(7,1,7,infection),0);assert.ok(infectionStrength(0,1,7,infection)>=infectionStrength(2,1,7,infection));
});
test('topology deformation is stable for arbitrary timeline seeks',()=>{
 const topology={type:'voronoi',skew:.2,warpAmount:.4,warpSpeed:1};
 assert.deepEqual(topologyCoordinate(.2,.8,topology,3),topologyCoordinate(.2,.8,topology,3));
 assert.notDeepEqual(topologyCoordinate(.2,.8,topology,3),topologyCoordinate(.2,.8,topology,3.25));
});
