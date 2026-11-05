// Original, synthesized instrumental score. No recordings, samples or copyrighted music.
const CALM=[ [48,55,60,64],[45,52,57,60],[41,48,53,57],[43,50,55,59] ];
const CHASE=[ [38,45,50,53],[36,43,48,52],[33,40,45,48],[35,42,47,50] ];
const FREQ=n=>440*Math.pow(2,(n-69)/12);
export class Soundtrack {
 constructor(settings){this.settings=settings;this.ctx=null;this.mode='calm';this.phase=0;this.step=0;this.next=0;this.lastRadio=-100;this.lastMode='';this.engineNodes=null;this.engineProfile={turbo:0,supercharger:0,engine:0,exhaust:0};}
 setCarProfile(upgrades={}){this.engineProfile={turbo:Number(upgrades.turbo||0),supercharger:Number(upgrades.supercharger||0),engine:Number(upgrades.engine||0),exhaust:Number(upgrades.exhaustPerformance||0)};}
 ensureEngine(){if(!this.ctx||this.engineNodes)return;const master=this.ctx.createGain();master.gain.value=0;const low=this.ctx.createOscillator(),mid=this.ctx.createOscillator(),whine=this.ctx.createOscillator();const lowGain=this.ctx.createGain(),midGain=this.ctx.createGain(),whineGain=this.ctx.createGain();low.type='sawtooth';mid.type='triangle';whine.type='sine';lowGain.gain.value=.02;midGain.gain.value=.01;whineGain.gain.value=.0;const lowFilter=this.ctx.createBiquadFilter();lowFilter.type='lowpass';lowFilter.frequency.value=680;const midFilter=this.ctx.createBiquadFilter();midFilter.type='bandpass';midFilter.frequency.value=920;midFilter.Q.value=.55;const highFilter=this.ctx.createBiquadFilter();highFilter.type='highpass';highFilter.frequency.value=1200;low.connect(lowGain);lowGain.connect(lowFilter);lowFilter.connect(master);mid.connect(midGain);midGain.connect(midFilter);midFilter.connect(master);whine.connect(whineGain);whineGain.connect(highFilter);highFilter.connect(master);master.connect(this.ctx.destination);for(const o of [low,mid,whine])o.start();this.engineNodes={master,low,mid,whine,lowGain,midGain,whineGain,lowFilter,midFilter,highFilter};}
 updateEngine(rpm=900,throttle=0,speed=0){if(!this.ctx||this.ctx.state!=='running')return;this.ensureEngine();const n=this.engineNodes;if(!n)return;const s=this.settings();const fx=Math.max(0,Math.min(1,Number(s.effectsVolume??65)/100));const profile=this.engineProfile||{};const t=this.ctx.currentTime;const rev=Math.max(700,Math.min(8500,Number(rpm)||900));const nrm=(rev-700)/7800;const turbo=Math.max(0,Math.min(1,(profile.turbo||0)/4));const blower=Math.max(0,Math.min(1,(profile.supercharger||0)/3));const engineLvl=Math.max(0,Math.min(1,(profile.engine||0)/5));const throttleAmt=Math.max(0,Math.min(1,Number(throttle)||0));const targetVol=(0.02+0.11*(0.18+nrm*.82)*(0.4+throttleAmt*.6)*(0.75+engineLvl*.4))*fx; n.master.gain.cancelScheduledValues(t);n.master.gain.linearRampToValueAtTime(targetVol,t+.06);n.low.frequency.setTargetAtTime(36+nrm*54,t,.05);n.mid.frequency.setTargetAtTime(82+nrm*185+speed*.08,t,.05);n.whine.frequency.setTargetAtTime(150+nrm*380+turbo*140+blower*75,t,.05);n.lowGain.gain.setTargetAtTime(.03+engineLvl*.012+throttleAmt*.01,t,.06);n.midGain.gain.setTargetAtTime(.014+nrm*.03+blower*.012,t,.06);n.whineGain.gain.setTargetAtTime((turbo*.028*Math.max(0,nrm-.32)+blower*.018*(.45+nrm*.7))*Math.max(.2,throttleAmt),t,.06);n.lowFilter.frequency.setTargetAtTime(420+nrm*780,t,.08);n.midFilter.frequency.setTargetAtTime(540+nrm*1050,t,.08);}
 unlock(){try{this.ctx||=new (window.AudioContext||window.webkitAudioContext)();this.ctx.resume().catch(()=>{});this.next=this.ctx.currentTime+.04;this.ensureEngine();}catch{}}
 setMode(mode){if(this.mode===mode)return;this.mode=mode;this.step=0;this.next=this.ctx?.currentTime+.08||0;}
 tone(n,when,duration,type='sine',amp=.08,attack=.015,filter=0){if(!this.ctx||this.ctx.state!=='running')return;
  const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(FREQ(n),when);
  g.gain.setValueAtTime(0.0001,when);g.gain.exponentialRampToValueAtTime(Math.max(.0002,amp),when+attack);
  g.gain.exponentialRampToValueAtTime(.0001,when+duration);
  o.connect(g);g.connect(this.ctx.destination);o.start(when);o.stop(when+duration+.03);
 }
 noise(when,duration,amp){if(!this.ctx||this.ctx.state!=='running')return;
  const count=Math.round(this.ctx.sampleRate*Math.min(duration,.2));const b=this.ctx.createBuffer(1,count,this.ctx.sampleRate),data=b.getChannelData(0);for(let i=0;i<count;i++)data[i]=(Math.random()*2-1)*(1-i/count);
  const src=this.ctx.createBufferSource(),gain=this.ctx.createGain(),filter=this.ctx.createBiquadFilter();filter.type='highpass';filter.frequency.value=550;gain.gain.setValueAtTime(amp,when);gain.gain.exponentialRampToValueAtTime(.0001,when+duration);
  src.buffer=b;src.connect(filter);filter.connect(gain);gain.connect(this.ctx.destination);src.start(when);src.stop(when+duration);
 }
 update(wanted=0){if(!this.ctx||this.ctx.state!=='running')return;
  const s=this.settings();const mode=wanted>0?'chase':'calm';if(mode!==this.mode)this.setMode(mode);
  if(!s.music){this.next=this.ctx.currentTime+.06;return;}
  const vol=Math.max(0,Math.min(1,Number(s.musicVolume??60)/100))*.75;
  const beat=mode==='chase'?.165:.28;
  if(this.next<this.ctx.currentTime-.5)this.next=this.ctx.currentTime+.02;
  let guard=0;while(this.next<this.ctx.currentTime+.18&&guard++<5){
   const i=this.step,bar=Math.floor(i/16)%4,chord=(mode==='chase'?CHASE:CALM)[bar];
   if(mode==='calm'){
     if(i%4===0){this.tone(chord[0]-12,this.next,.62,'sine',vol*.055);this.tone(chord[1],this.next,.9,'triangle',vol*.016);}
     if(i%2===0)this.tone(chord[2+(i/2|0)%2]+12,this.next,.32,'sine',vol*.027);
     if(i%8===4)this.tone(chord[1]+12,this.next,.7,'triangle',vol*.012);
   }else{
     if(i%4===0){this.tone(chord[0]-12,this.next,.36,'sawtooth',vol*.055);this.tone(chord[0]-24,this.next,.27,'triangle',vol*.04);}
     if(i%2===0)this.tone(chord[1]+12,this.next,.15,'square',vol*.012);
     if(i%4===2)this.noise(this.next,.065,vol*.045);
     if(i%8===0)this.tone(chord[3],this.next,.2,'sawtooth',vol*.018);
   }
   this.step++;this.next+=beat;
  }
 }
 radio(wanted){
  const lines={
   1:['Dispatch, speeding suspect located. Beginning pursuit.','Central, visual on a reckless driver. Moving to intercept.','All patrols, we have a new pursuit. Units respond.'],
   2:['Suspect is not yielding. Additional units requested.','Dispatch to units, level two pursuit. Move to contain.','Driver is accelerating. Secondary patrols join the chase.'],
   3:['All units, set roadblocks ahead of the suspect.','Dispatch, third alert. Coordinate road closures.','Traffic units, establish an intercept point. Suspect remains mobile.'],
   4:['Air support has eyes on the target vehicle.','Helicopter online. Ground units, follow the air unit.','Four-star alert. Maintain visual from the air.'],
   5:['Maximum alert. Tactical units are now deploying.','All units, SWAT interception authorized.','Suspect escalated to highest priority. Tactical response underway.']
  };
  const pool=lines[Math.min(5,Math.max(1,wanted))]||lines[1];
  const eligible=pool.filter(line=>line!==this.lastSpokenLine);
  const message=(eligible.length?eligible:pool)[Math.floor(Math.random()*(eligible.length||pool.length))];
  this.lastSpokenLine=message;
  const s=this.settings();
  if(!s.policeRadio)return message;
  if(this.ctx?.state==='running'){
   const t=this.ctx.currentTime,fx=Math.max(.05,Math.min(1,Number(s.effectsVolume??65)/100));
   this.noise(t,.10,.035*fx);this.tone(83,t,.10,'square',.022*fx);
  }
  if(typeof window!=='undefined'&&'speechSynthesis' in window&&typeof SpeechSynthesisUtterance==='function'){
   try{
    speechSynthesis.cancel();
    const msg=new SpeechSynthesisUtterance(message);msg.lang='en-US';msg.rate=1.04;msg.pitch=.83;
    msg.volume=Math.max(.08,Math.min(.85,Number(s.effectsVolume??65)/100));speechSynthesis.speak(msg);
   }catch(err){console.warn('Police voice unavailable:',err);}
  }
  return message;
 }
 cancelRadio(){try{if(typeof speechSynthesis!=='undefined')speechSynthesis.cancel();}catch{}}
 suspend(){this.cancelRadio();try{this.ctx?.suspend?.();}catch{}}
 impact(){if(!this.ctx||this.ctx.state!=='running')return;const t=this.ctx.currentTime;this.noise(t,.18,.11);this.tone(35,t,.4,'sawtooth',.065);}
}
