import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSensorRing} from '../lib/ring/hardware.ts';

test('ring enclosure is closed, has inward and outward walls, and finite thickness',()=>{
 const ring=createSensorRing(.01),geometry=ring.children[0].geometry;
 const p=geometry.getAttribute('position'),n=geometry.getAttribute('normal'),index=geometry.index;
 const edges=new Map();let inward=0,outward=0,minR=Infinity,maxR=0;
 const key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e8)).join(',');
 for(let i=0;i<p.count;i++){
  const radius=Math.hypot(p.getX(i),p.getY(i));assert.ok(Number.isFinite(radius));
  minR=Math.min(minR,radius);maxR=Math.max(maxR,radius);
  const dot=p.getX(i)*n.getX(i)+p.getY(i)*n.getY(i);
  if(dot<-.005)inward++;if(dot>.005)outward++;
 }
 for(let i=0;i<index.count;i+=3)for(let j=0;j<3;j++){
  const a=key(index.getX(i+j)),b=key(index.getX(i+(j+1)%3));
  const edge=[a,b].sort().join('|');edges.set(edge,(edges.get(edge)||0)+1);
 }
 assert.ok([...edges.values()].every(count=>count===2),'no open edges');
 assert.ok(inward>0&&outward>0,'correct inner and outer surfaces');
 assert.ok(Math.abs(minR-.01)<1e-6&&Math.abs(maxR-.0124)<1e-6);
 assert.equal(ring.children.filter(o=>o.name.includes('window')).length,3);
 ring.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});
});
