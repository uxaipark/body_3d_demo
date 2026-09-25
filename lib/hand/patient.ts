import * as T from 'three';
import {Avatar} from './original-avatar';
import {PostureController} from './kinematics.js';
import type {QualityChoice} from '../render-quality';
export class PatientScene{
 avatar:Avatar;posture=new PostureController();ready=false;ring:T.Mesh;previousHeight:number|null=null;contact=true;
 constructor(host:HTMLDivElement){this.avatar=new Avatar(host);this.posture.setArmIdleIntensity(0);this.posture.setBodyIdleIntensity(0);this.ring=new T.Mesh(new T.TorusGeometry(.009,.0017,12,48),new T.MeshStandardMaterial({color:0x6b9390,metalness:.7,roughness:.3}));this.avatar.view.root.add(this.ring)}
 async load(){await this.avatar.ready;this.ready=true;}
 get qualityTier(){return this.avatar.view.qualityTier}
 setQuality(c:QualityChoice){this.avatar.view.setQuality(c)}
 step(dt:number,t:number,c:{posture:string;arm:string;hr:number;rr:number;contact:boolean}){
 if(!this.ready)return null;
 if(this.avatar.posture!==c.posture){this.avatar.setBodyPosture(c.posture);this.posture.setBodyPosture(c.posture);this.previousHeight=null;}
 if(this.posture.armPosition!==c.arm)this.posture.setArmPosition(c.arm);
 this.posture.update(dt);
 this.avatar.update(this.posture.getAngles(),{heart:Math.exp(-(((t*c.hr/60%1-.12)/.09)**2))},null,this.posture.getTorsoState(),{t,instantHR:c.hr,hemo:{resp_bpm:c.rr,respDepth:1}});
 const r=this.avatar.view.rig,a=r.bone('finger1.0.r').getWorldPosition(new T.Vector3()),b=r.bone('finger1.1.r').getWorldPosition(new T.Vector3()),center=a.clone().lerp(b,.3),axis=b.clone().sub(a).normalize(),heart=r.transform(new T.Vector3(0,1.27,.02));
 this.ring.position.copy(center);this.ring.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),axis);this.ring.visible=c.contact;
 const heightCm=(center.y-heart.y)*100,velocity=this.previousHeight===null||dt<=0?0:(heightCm-this.previousHeight)/100/dt;this.previousHeight=heightCm;
 return {heightCm,velocity};
 }
 dispose(){this.avatar.dispose()}
}
