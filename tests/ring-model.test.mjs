import {test} from 'node:test';import assert from 'node:assert/strict';import {ringSample,ringCsv,ringPressure} from '../lib/ring/model.js';
test('off-finger and movement suppress displayed physiological references',()=>{for(const options of [{contact:false},{motion:true}]){const s=ringSample(3,options);assert.equal(s.hr,null);assert.equal(s.spo2,null);assert.ok(s.quality<30)}assert.equal(ringSample(3,{contact:false}).red,0)});
test('optical AC/DC ratio follows the selected synthetic reference',()=>{for(const spo2 of [80,90,97,100]){const s=ringSample(.18*60/64,{spo2});assert.ok(Math.abs((s.red-1)/(s.ir-1)-(110-spo2)/25)<1e-9)}});
test('CSV preserves artifact gaps instead of reporting false zero vital signs',()=>{const csv=ringCsv([ringSample(1,{motion:true})]);assert.equal(csv.split('\n')[1].split(',').length,15);assert.ok(csv.includes(',,,25,'))});

test('hydrostatic sign, magnitude and preserved pulse pressure',()=>{for(const h of [-30,0,30]){const p=ringPressure(h);assert.ok(Math.abs((p.sbp-p.dbp)-40)<1e-9);assert.ok(Math.abs(p.offset+h*.7797193777)<.001)}assert.equal(ringPressure(0).sbp,120)});
test('cyclic hand position and pressure share the same height',()=>{const s=ringSample(2,{cycle:true});assert.ok(Math.abs(s.heightCm-20)<1e-8);assert.equal(s.sbp,ringPressure(s.heightCm).sbp);assert.ok(s.sbp<120)});
