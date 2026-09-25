import * as T from 'three';

/** Fit a rigid ring to the index phalanx and the first skin exit in each direction. */
export function fitIndexRing(skin:T.Mesh,bone:T.Mesh){
 const p=bone.geometry.getAttribute('position'),points:T.Vector3[]=[],center=new T.Vector3();
 for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(bone.matrixWorld);points.push(v);center.add(v);}
 center.divideScalar(points.length);
 const axis=new T.Vector3(1,0,0);
 for(let pass=0;pass<24;pass++){const next=new T.Vector3();for(const p of points){const d=p.clone().sub(center);next.addScaledVector(d,d.dot(axis));}axis.copy(next.normalize());}
 if(axis.x<0)axis.negate();
 // Stay distal to the interdigital web so adjacent fingers cannot enter the fit.
 center.addScaledVector(axis,.009);
 const u=new T.Vector3().crossVectors(axis,new T.Vector3(0,1,0)).normalize(),v=new T.Vector3().crossVectors(axis,u).normalize();
 const ray=new T.Raycaster();
 const distance=(origin:T.Vector3,dir:T.Vector3)=>{
  ray.set(origin,dir);const hit=ray.intersectObject(skin,false)[0];
  if(!hit||hit.distance>.02)throw Error('Index skin fitting failed '+JSON.stringify({origin:origin.toArray(),dir:dir.toArray(),distance:hit?.distance}));
  return hit.distance;
 };
 for(let pass=0;pass<3;pass++)for(const dir of [u,v])center.addScaledVector(dir,(distance(center,dir)-distance(center,dir.clone().negate()))/2);
 const count=128,radii:number[]=[];
 for(let i=0;i<count;i++){
  const theta=i/count*Math.PI*2,dir=u.clone().multiplyScalar(Math.cos(theta)).addScaledVector(v,Math.sin(theta));let r=0;
  for(let j=0;j<=8;j++)r=Math.max(r,distance(center.clone().addScaledVector(axis,(j/8-.5)*.009),dir));
  radii.push(r+.00025);
 }
 // A smooth outward envelope preserves clearance along the entire 9 mm band.
 const smooth=radii.map((r,i)=>Math.max(r,...[-2,-1,1,2].map(k=>radii[(i+k+count)%count]-.00004*Math.abs(k))));
 return {center,axis,u,v,radii:smooth};
}

export function conformRing(hardware:T.Group,radii:number[]){
 hardware.updateMatrixWorld(true);
 hardware.traverse(o=>{if(!(o instanceof T.Mesh))return;
  // Bake component transforms before wrapping all housing parts and optical windows.
  o.geometry.applyMatrix4(o.matrix);o.position.set(0,0,0);o.quaternion.identity();o.scale.set(1,1,1);o.updateMatrix();
  const p=o.geometry.getAttribute('position');
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),r=Math.hypot(x,y),angle=(Math.atan2(y,x)+Math.PI*2)%(Math.PI*2),at=angle/Math.PI/2*radii.length,k=Math.floor(at),f=at-k;
   const inner=radii[k]*(1-f)+radii[(k+1)%radii.length]*f,next=inner+(r-.010);
   p.setXY(i,x*next/r,y*next/r);
  }
  p.needsUpdate=true;o.geometry.computeVertexNormals();o.geometry.computeBoundingSphere();
 });
}
