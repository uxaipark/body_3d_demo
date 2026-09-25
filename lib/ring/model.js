// Public demonstration signals; no cuffless BP or capacitive-array pipeline.
export function ringSample(t,{hr=64,rr=14,spo2=97,motion=false,contact=true,heightCm=0,cycle=false,sbp=120,dbp=80,heightVelocity=0,posture='standing',arm='heart_level'}={}){
 const height=cycle?heightCm+20*Math.sin(2*Math.PI*t/8):heightCm;
 const velocity=cycle?.2*(2*Math.PI/8)*Math.cos(2*Math.PI*t/8):heightVelocity;
 const moving=motion||Math.abs(velocity)>.025;
 const pressure=ringPressure(height,sbp,dbp);
 const respiration=Math.sin(2*Math.PI*t*rr/60),phase=(t*hr/60)%1;
 const pulse=Math.exp(-(((phase-.18)/.075)**2))+.28*Math.exp(-(((phase-.43)/.12)**2));
 const artifact=moving?.35*Math.sin(2*Math.PI*3.7*t)+.15*Math.sin(2*Math.PI*8.3*t):0;
 const ir=contact?1+.025*(1+.12*respiration)*pulse+artifact:0;
 // Ratio-of-ratios is illustrative, not a calibrated oximeter conversion.
 const ratio=(110-spo2)/25,red=contact?1+.025*ratio*(1+.12*respiration)*pulse+artifact*.8:0;
 return {t,posture,arm,...pressure,heightCm:height,velocity,red,ir,ax:moving?.6*Math.sin(t*7):.008*respiration,ay:moving?.35*Math.cos(t*5):.004*Math.cos(t),az:1+(cycle?-.2*(2*Math.PI/8)**2*Math.sin(2*Math.PI*t/8)/9.80665:0)+(moving?.4*Math.sin(t*9):.015*respiration),hr:contact&&!moving?hr:null,spo2:contact&&!moving?spo2:null,quality:!contact?0:moving?25:96};
}
// Quasi-static local arterial pressure: height positive above the right atrium.
// Reference systemic pressure stays fixed; no autoregulation or BP inference.
export function ringPressure(heightCm,sbp=120,dbp=80){const offset=-1060*9.80665*(heightCm/100)/133.322;return {sbp:sbp+offset,dbp:dbp+offset,offset};}
export function ringCsv(samples){return 'time_s,red_normalized,ir_normalized,acc_x_g,acc_y_g,acc_z_g,simulated_hr_bpm,simulated_spo2_percent,quality_percent,height_above_heart_cm,local_sbp_mmhg,local_dbp_mmhg,hydrostatic_offset_mmhg,posture,arm_pose\n'+samples.map(s=>[s.t.toFixed(3),s.red,s.ir,s.ax,s.ay,s.az,s.hr??'',s.spo2??'',s.quality,s.heightCm,s.sbp,s.dbp,s.offset,s.posture,s.arm].join(',')).join('\n');}
