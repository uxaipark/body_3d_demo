import * as T from 'three';
import {createSensorRing} from './hardware';
import {fitIndexRing,conformRing} from './fit';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {readQualityPreference,resolveQuality,qualitySettings,type QualityChoice} from '../render-quality';
export class RingScene{
 pulseCycles={value:0};pulseGain={value:1};
 setPulse(time:number,hr:number,emphasized:boolean){this.pulseCycles.value=time*hr/60;this.pulseGain.value=emphasized?10:1;}
 scene=new T.Scene();root=new T.Group();camera=new T.PerspectiveCamera(36,1,.001,3);renderer:T.WebGLRenderer;controls:OrbitControls;observer:ResizeObserver;frame=0;disposed=false;skin?:T.Mesh;ring=new T.Group();center=new T.Vector3(.164,.025,.025);qualityTier=resolveQuality(readQualityPreference());last=0;height=0;following=.5;moving=false;opacity=.06;abort=new AbortController();
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
 const name=(o.userData.sourceName||o.name).toLowerCase(),tendon=/tendon|sheath|fascia|retinaculum|ligament|aponeurosis/.test(name),vein=/vein|venous/.test(name);
 const colors:Record<string,number>={skin:0xc7a18b,adipose:0xd8b15b,muscular:0x9d4250,skeleton:0xe5d9b7,nervous:0xe9d68d,cardiovascular:0xb73246};
 o.material=new T.MeshStandardMaterial({color:tendon?0xd8cdbb:vein?0x486a99:colors[layer],roughness:layer==='skeleton'?.88:.65,transparent:true,side:T.DoubleSide});o.frustumCulled=false;
 if(/^radial[_ ]artery[._]/.test(name)){o.material.color.setHex(0xff0000);o.material.emissive.setHex(0xb00000);o.material.emissiveIntensity=.6;o.material.roughness=1;o.material.toneMapped=false;}
 if(layer==='cardiovascular'&&!vein){
 // Surface-normal expansion preserves the artery route instead of stretching its length.
 o.material.onBeforeCompile=(shader:Parameters<T.MeshStandardMaterial['onBeforeCompile']>[0])=>{shader.uniforms.ringPulseCycles=this.pulseCycles;shader.uniforms.ringPulseGain=this.pulseGain;
 shader.vertexShader='uniform float ringPulseCycles; uniform float ringPulseGain;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 float phase=fract(ringPulseCycles-position.x*0.15);
 float pulse=exp(-pow((phase-0.18)/0.10,2.0));
 transformed+=normal*(0.000035*ringPulseGain*pulse);`);};
 }
 if(layer==='skin')this.skin=o;
 if(/Proximal.phalanx.of.second.finger/i.test(o.userData.sourceName||o.name))bone=o;
 });this.root.add(gltf.scene);this.root.updateMatrixWorld(true);
 if(!this.skin||!bone)throw Error('Finger geometry unavailable');
 // Same skin-derived representative subcutis used by the original wrist view.
 const fat=this.skin.clone();fat.geometry=this.skin.geometry.clone();fat.userData={layer:'adipose'};const source=fat.geometry.getAttribute('position'),normal=fat.geometry.getAttribute('normal'),positionsFat=new Float32Array(source.count*3);
 for(let i=0;i<source.count;i++)for(let j=0;j<3;j++)positionsFat[i*3+j]=source.getComponent(i,j)-normal.getComponent(i,j)*.0016;
 fat.geometry.setAttribute('position',new T.BufferAttribute(positionsFat,3));fat.material=new T.MeshStandardMaterial({color:0xd8b15b,transparent:true,opacity:.12,depthWrite:false,side:T.DoubleSide});
 fat.material.onBeforeCompile=shader=>{shader.vertexShader='varying float wristAlong;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nwristAlong=position.x;');shader.fragmentShader='varying float wristAlong;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(wristAlong>.065)discard;');};this.root.add(fat);
 const fit=fitIndexRing(this.skin,bone),{axis,u,v}=fit;this.center.copy(fit.center);
 const hardware=createSensorRing(.010);conformRing(hardware,fit.radii);this.ring.add(hardware);
 this.ring.position.copy(this.center);
 this.ring.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(u,v,axis));
 this.setSkin(this.opacity);
 }
 setSkin(value:number){this.opacity=value;this.root.traverse(o=>{if(!(o instanceof T.Mesh)||!o.userData.layer)return;const layer=o.userData.layer,m=o.material as T.MeshStandardMaterial;o.visible=layer==='skin'||value<.98;m.opacity=layer==='skin'?value:layer==='cardiovascular'?1:layer==='skeleton'?.18:layer==='muscular'?.08:layer==='nervous'?0:layer==='adipose'?.03:.1;m.transparent=true;m.depthWrite=m.opacity>.94;});}
 setContact(value:boolean){this.ring.visible=value}
 setQuality(choice:QualityChoice){this.qualityTier=resolveQuality(choice);this.renderer.setPixelRatio(Math.min(devicePixelRatio,qualitySettings[this.qualityTier].dpr))}
 setHeight(cm:number){const next=cm/100,delta=next-this.height;this.height=next;this.root.position.y=next;this.controls.target.y+=delta*this.following;this.camera.position.y+=delta*this.following;}
 focus(close:boolean){this.following=close?1:.5;this.controls.target.copy(close?this.center:new T.Vector3(.075,.005,0));this.camera.position.copy(this.controls.target).add(close?new T.Vector3(.04,.055,.07):new T.Vector3(Math.sin(.75)*Math.sin(Math.PI+Math.atan(1/Math.cos(.75))),Math.cos(.75),Math.sin(.75)*Math.cos(Math.PI+Math.atan(1/Math.cos(.75)))).multiplyScalar(.48));this.controls.target.y+=this.height;this.camera.position.y+=this.height;this.controls.update()}
 draw=(now:number)=>{if(this.disposed)return;this.frame=requestAnimationFrame(this.draw);if(document.hidden||now-this.last<1000/(this.qualityTier==='low'?24:40))return;this.last=now;this.root.rotation.x=this.moving?Math.sin(now*.002)*.08:0;this.controls.update();this.renderer.render(this.scene,this.camera)};
 release(root:T.Object3D){root.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose())}})}
 dispose(){this.disposed=true;this.abort.abort();cancelAnimationFrame(this.frame);this.observer.disconnect();this.controls.dispose();this.release(this.root);this.renderer.dispose();this.renderer.domElement.remove()}
}
