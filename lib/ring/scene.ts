import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {readQualityPreference,resolveQuality,qualitySettings,type QualityChoice} from '../render-quality';
export class RingScene{
 scene=new T.Scene();root=new T.Group();camera=new T.PerspectiveCamera(36,1,.001,3);renderer:T.WebGLRenderer;controls:OrbitControls;observer:ResizeObserver;frame=0;disposed=false;skin?:T.Mesh;ring=new T.Group();center=new T.Vector3(.164,.025,.025);qualityTier=resolveQuality(readQualityPreference());last=0;moving=false;opacity=1;abort=new AbortController();
 constructor(private host:HTMLElement){
 this.renderer=new T.WebGLRenderer({antialias:this.qualityTier!=='low',alpha:true});this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.9;this.renderer.setClearColor(0x0d1419,1);this.renderer.setPixelRatio(Math.min(devicePixelRatio,qualitySettings[this.qualityTier].dpr));host.appendChild(this.renderer.domElement);
 this.scene.add(this.root);this.root.add(this.ring);this.scene.add(new T.HemisphereLight(0xd8f2ff,0x3c3028,2));for(const pos of [[.1,.5,.3],[-.2,.1,-.4]]){const l=new T.DirectionalLight(0xffffff,2);l.position.set(...pos as [number,number,number]);this.scene.add(l)}
 this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.minDistance=.04;this.controls.maxDistance=.9;this.focus(false);
 this.observer=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;this.renderer.setSize(w,h);this.camera.aspect=w/Math.max(1,h);this.camera.updateProjectionMatrix()});this.observer.observe(host);this.frame=requestAnimationFrame(this.draw);
 }
 async load(){
 const response=await fetch('/models/wrist/atlas.glb',{signal:this.abort.signal});if(!response.ok)throw Error('Hand model unavailable');const gltf=await new GLTFLoader().parseAsync(await response.arrayBuffer(),'');
 if(this.disposed){this.release(gltf.scene);return}gltf.scene.updateMatrixWorld(true);
 let bone:T.Mesh|undefined;
 gltf.scene.traverse(o=>{if(!(o instanceof T.Mesh))return;const old=Array.isArray(o.material)?o.material:[o.material];old.forEach(m=>m.dispose());const layer=o.userData.layer;
 o.material=new T.MeshStandardMaterial({color:layer==='skin'?0xd3ac93:layer==='skeleton'?0xeee2c4:layer==='cardiovascular'?0xbe3448:layer==='nervous'?0xd7bc7c:0x98494e,roughness:.58,side:T.DoubleSide});
 if(layer==='skin'){this.skin=o;const oldGeometry=o.geometry;const p=oldGeometry.getAttribute('position'),a=new Float32Array(p.count*3);for(let i=0;i<p.count;i++)for(let j=0;j<3;j++)a[i*3+j]=p.getComponent(i,j);o.geometry=new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(a,3));if(oldGeometry.index)o.geometry.setIndex(oldGeometry.index.clone());const joined=mergeVertices(o.geometry,.00005);o.geometry.dispose();o.geometry=joined;oldGeometry.dispose();o.geometry.computeVertexNormals();}if(/Proximal.phalanx.of.second.finger/i.test(o.userData.sourceName||o.name))bone=o;
 });this.root.add(gltf.scene);this.root.updateMatrixWorld(true);
 if(!this.skin||!bone)throw Error('Finger geometry unavailable');
 const box=new T.Box3().setFromObject(bone);box.getCenter(this.center);this.center.x-=.007;this.center.y-=.004;
 const axis=new T.Vector3(1,.53,.4).normalize(),u=new T.Vector3().crossVectors(axis,new T.Vector3(0,1,0)).normalize(),v=new T.Vector3().crossVectors(axis,u).normalize();
 const ray=new T.Raycaster(),positions:number[]=[],indices:number[]=[],segments=80,slices=4;
 // Fit each ring slice to the actual skin intersection, not a floating torus.
 for(let k=0;k<=slices;k++)for(let i=0;i<=segments;i++){
 const theta=i/segments*Math.PI*2,dir=u.clone().multiplyScalar(Math.cos(theta)).addScaledVector(v,Math.sin(theta)),origin=this.center.clone().addScaledVector(axis,(k/slices-.5)*.008);
 ray.set(origin,dir);const hits=ray.intersectObject(this.skin,false);const radius=Math.max(.005,Math.min(.016,hits[0]?.distance??.010))+.0012;
 positions.push(...origin.addScaledVector(dir,radius).toArray());if(k<slices&&i<segments){const a=k*(segments+1)+i,b=a+segments+1;indices.push(a,b,a+1,b,b+1,a+1)}
 }
 const geometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(positions,3)).setIndex(indices);geometry.computeVertexNormals();this.ring.add(new T.Mesh(geometry,new T.MeshStandardMaterial({color:0x526467,metalness:.8,roughness:.25,side:T.DoubleSide})));
 const mark=new T.Mesh(new T.SphereGeometry(.002,16,12),new T.MeshStandardMaterial({color:0x66ebc0,emissive:0x1f8e65,emissiveIntensity:1}));mark.position.copy(this.center).addScaledVector(v,.0125);this.ring.add(mark);this.setSkin(this.opacity);
 }
 setSkin(value:number){this.opacity=value;this.root.traverse(o=>{if(o instanceof T.Mesh&&o.userData.layer&&o.userData.layer!=='skin')o.visible=value<.98});if(this.skin){const m=this.skin.material as T.MeshStandardMaterial;m.transparent=value<1;m.opacity=value;m.depthWrite=value>=.98;}}
 setContact(value:boolean){this.ring.visible=value}
 setQuality(choice:QualityChoice){this.qualityTier=resolveQuality(choice);this.renderer.setPixelRatio(Math.min(devicePixelRatio,qualitySettings[this.qualityTier].dpr))}
 focus(close:boolean){this.controls.target.copy(close?this.center:new T.Vector3(.077,.01,0));this.camera.position.copy(this.controls.target).add(close?new T.Vector3(.04,.055,.07):new T.Vector3(.12,.33,.34));this.controls.update()}
 draw=(now:number)=>{if(this.disposed)return;this.frame=requestAnimationFrame(this.draw);if(document.hidden||now-this.last<1000/(this.qualityTier==='low'?24:40))return;this.last=now;this.root.rotation.x=this.moving?Math.sin(now*.002)*.08:0;this.controls.update();this.renderer.render(this.scene,this.camera)};
 release(root:T.Object3D){root.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose())}})}
 dispose(){this.disposed=true;this.abort.abort();cancelAnimationFrame(this.frame);this.observer.disconnect();this.controls.dispose();this.release(this.root);this.renderer.dispose();this.renderer.domElement.remove()}
}
