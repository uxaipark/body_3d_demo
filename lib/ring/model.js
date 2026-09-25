// Public demonstration signals; no cuffless BP or capacitive-array pipeline.
export function ringSample(t,{hr=64,rr=14,spo2=97,motion=false,contact=true}={}){
 const respiration=Math.sin(2*Math.PI*t*rr/60),phase=(t*hr/60)%1;
 const pulse=Math.exp(-(((phase-.18)/.075)**2))+.28*Math.exp(-(((phase-.43)/.12)**2));
 const artifact=motion?.35*Math.sin(2*Math.PI*3.7*t)+.15*Math.sin(2*Math.PI*8.3*t):0;
 const ir=contact?1+.025*(1+.12*respiration)*pulse+artifact:0;
 // Ratio-of-ratios is illustrative, not a calibrated oximeter conversion.
 const ratio=(110-spo2)/25,red=contact?1+.025*ratio*(1+.12*respiration)*pulse+artifact*.8:0;
 return {t,red,ir,ax:motion?.6*Math.sin(t*7):.008*respiration,ay:motion?.35*Math.cos(t*5):.004*Math.cos(t),az:1+(motion?.4*Math.sin(t*9):.015*respiration),hr:contact&&!motion?hr:null,spo2:contact&&!motion?spo2:null,quality:!contact?0:motion?25:96};
}
export function ringCsv(samples){return 'time_s,red_normalized,ir_normalized,acc_x_g,acc_y_g,acc_z_g,simulated_hr_bpm,simulated_spo2_percent,quality_percent\n'+samples.map(s=>[s.t.toFixed(3),s.red,s.ir,s.ax,s.ay,s.az,s.hr??'',s.spo2??'',s.quality].join(',')).join('\n');}
