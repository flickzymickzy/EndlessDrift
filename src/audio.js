// Original, synthesized instrumental score. No recordings, samples or copyrighted music.
const CALM=[ [48,55,60,64],[45,52,57,60],[41,48,53,57],[43,50,55,59] ];
const CHASE=[ [38,45,50,53],[36,43,48,52],[33,40,45,48],[35,42,47,50] ];
const FREQ=n=>440*Math.pow(2,(n-69)/12);
export class Soundtrack {
 constructor(settings){this.settings=settings;this.ctx=null;this.mode='calm';this.phase=0;this.step=0;this.next=0;this.lastRadio=-100;this.lastMode='';this.engineNodes=null;this.engineProfile={turbo:0,supercharger:0,engine:0,exhaust:0,transmission:0,ecu:0,clutch:0,note:'factory'};}
 setCarProfile(upgrades={},note='factory',car={}){
  const id=String(car?.id||car?.name||'endless-drift');
  const family=String(car?.kind||car?.type||'street').toLowerCase();
  const hp=Math.max(70,Number(car?.hp)||250);
  let hash=2166136261;
  for(const letter of id)hash=Math.imul(hash^letter.charCodeAt(0),16777619)>>>0;
  const cylinders=family.includes('hyper')||hp>850?12:family.includes('muscle')||hp>560?8:family.includes('super')||hp>380?6:4;
  this.engineProfile={
   turbo:Number(upgrades.turbo||0),supercharger:Number(upgrades.supercharger||0),
   engine:Number(upgrades.engine||0),exhaust:Number(upgrades.exhaustPerformance||0),
   transmission:Number(upgrades.transmission||0),ecu:Number(upgrades.ecu||0),
   clutch:Number(upgrades.clutch||0),note,
   cylinders,carId:id,family,pitch:.83+(hash%31)/100,
   bark:.65+((hash>>>5)%27)/35,brightness:.67+((hash>>>11)%33)/35
  };
  if(this.engineNodes){
   this.engineNodes.low.type=cylinders>=8?'sawtooth':'triangle';
   this.engineNodes.mid.type=cylinders===12?'sawtooth':'triangle';
   this.engineNodes.harmonic.type=cylinders===4?'square':'sawtooth';
  }
 }
 ensureEngine(){
  if(!this.ctx||this.engineNodes)return;
  const ctx=this.ctx,master=ctx.createGain(),compressor=ctx.createDynamicsCompressor();
  master.gain.value=0;
  compressor.threshold.value=-18;compressor.knee.value=18;compressor.ratio.value=3.5;
  compressor.attack.value=.003;compressor.release.value=.14;
  const low=ctx.createOscillator(),mid=ctx.createOscillator(),whine=ctx.createOscillator(),harmonic=ctx.createOscillator();
  const lowGain=ctx.createGain(),midGain=ctx.createGain(),whineGain=ctx.createGain(),harmonicGain=ctx.createGain();
  const lowFilter=ctx.createBiquadFilter(),midFilter=ctx.createBiquadFilter(),highFilter=ctx.createBiquadFilter();
  low.type='sawtooth';mid.type='triangle';whine.type='sine';harmonic.type='sawtooth';
  lowFilter.type='lowpass';lowFilter.frequency.value=520;
  midFilter.type='bandpass';midFilter.frequency.value=950;midFilter.Q.value=.62;
  highFilter.type='highpass';highFilter.frequency.value=1250;
  lowGain.gain.value=.12;midGain.gain.value=.07;whineGain.gain.value=0;harmonicGain.gain.value=.035;
  low.connect(lowGain);lowGain.connect(lowFilter);lowFilter.connect(master);
  mid.connect(midGain);midGain.connect(midFilter);midFilter.connect(master);
  whine.connect(whineGain);whineGain.connect(highFilter);highFilter.connect(master);
  harmonic.connect(harmonicGain);harmonicGain.connect(midFilter);
  const count=Math.ceil(ctx.sampleRate*.18),noiseBuffer=ctx.createBuffer(1,count,ctx.sampleRate),pixels=noiseBuffer.getChannelData(0);
  for(let i=0;i<count;i++)pixels[i]=Math.random()*2-1;
  const intake=ctx.createBufferSource(),intakeFilter=ctx.createBiquadFilter(),intakeGain=ctx.createGain();
  intake.buffer=noiseBuffer;intake.loop=true;intakeFilter.type='bandpass';intakeFilter.frequency.value=920;intakeFilter.Q.value=.8;
  intakeGain.gain.value=.0;intake.connect(intakeFilter);intakeFilter.connect(intakeGain);intakeGain.connect(master);
  master.connect(compressor);compressor.connect(ctx.destination);
  for(const o of [low,mid,whine,harmonic])o.start();
  intake.start();
  this.engineNodes={master,compressor,low,mid,whine,harmonic,lowGain,midGain,whineGain,harmonicGain,
   lowFilter,midFilter,highFilter,intake,intakeFilter,intakeGain};
  this.setCarProfile(this.engineProfile,this.engineProfile.note,{id:this.engineProfile.carId,kind:this.engineProfile.family,hp:this.engineProfile.cylinders===12?900:this.engineProfile.cylinders===8?600:this.engineProfile.cylinders===6?400:260});
 }
 updateEngine(rpm=900,throttle=0,speed=0){
  if(!this.ctx||this.ctx.state!=='running')return;
  this.ensureEngine();const n=this.engineNodes;if(!n)return;
  const s=this.settings(),p=this.engineProfile||{},t=this.ctx.currentTime;
  const fx=Math.max(0,Math.min(1,Number(s.effectsVolume??65)/100));
  const rev=Math.max(650,Math.min(9000,Number(rpm)||900));
  const gas=Math.max(0,Math.min(1,Number(throttle)||0));
  const nrm=(rev-650)/8350,load=.28+gas*.72;
  const cylinders=Math.max(4,Number(p.cylinders)||4),pitch=p.pitch||1;
  const turbo=Math.max(0,Math.min(1,(p.turbo||0)/4)),blower=Math.max(0,Math.min(1,(p.supercharger||0)/3));
  const exhaust=Math.max(0,Math.min(1,(p.exhaust||0)/4)),engine=Math.max(0,Math.min(1,(p.engine||0)/5));
  const gear=Math.max(0,Math.min(1,(p.transmission||0)/5)),ecu=Math.max(0,Math.min(1,(p.ecu||0)/4));
  const noteFactor=p.note==='deep'?.82:p.note==='race'?1.17:1;
  const firing=Math.max(30,rev/60*cylinders*.5*pitch*noteFactor);
  const volume=(.31+.18*nrm+.1*gas+engine*.05)*fx;
  n.master.gain.setTargetAtTime(volume,t,.06);
  n.low.frequency.setTargetAtTime(firing*.62,t,.055);
  n.mid.frequency.setTargetAtTime(firing*(1.14+gear*.08),t,.04);
  n.harmonic.frequency.setTargetAtTime(firing*(1.94+ecu*.17),t,.043);
  n.whine.frequency.setTargetAtTime(240+nrm*860+turbo*210+blower*175,t,.05);
  n.lowGain.gain.setTargetAtTime(.13+(1-nrm)*.035+(p.bark||.8)*gas*.025,t,.055);
  n.midGain.gain.setTargetAtTime(.08+nrm*.055+gas*.055+exhaust*.025,t,.055);
  n.harmonicGain.gain.setTargetAtTime(.026+(p.brightness||.8)*nrm*.055+exhaust*.034,t,.055);
  n.whineGain.gain.setTargetAtTime((turbo*.055+blower*.03)*Math.max(.25,nrm)*Math.max(.16,gas),t,.055);
  n.lowFilter.frequency.setTargetAtTime(310+nrm*1250+gas*370,t,.075);
  n.midFilter.frequency.setTargetAtTime(430+nrm*1750+(p.brightness||.8)*320,t,.075);
  n.intakeFilter.frequency.setTargetAtTime(500+nrm*1950+gas*600,t,.085);
  n.intakeGain.gain.setTargetAtTime(.008+gas*.019+nrm*.015,t,.075);
 }
 unlock(){try{this.ctx||=new (window.AudioContext||window.webkitAudioContext)();this.ctx.resume().catch(()=>{});if(!this.next||this.next<this.ctx.currentTime-.5)this.next=this.ctx.currentTime+.04;this.ensureEngine();}catch{}}
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
   1:['Dispatch, speeding suspect located. Beginning pursuit.','Central, visual on a reckless driver. Moving to intercept.','All patrols, we have a new pursuit. Units respond.','Unit twelve, speed violation confirmed. Vehicle refusing to pull over.','Dispatcher, we have a visual. Moving in behind the driver.','Suspect spotted along the expressway. Tracking now.'],
   2:['Suspect is not yielding. Additional units requested.','Dispatch to units, level two pursuit. Move to contain.','Driver is accelerating. Secondary patrols join the chase.','Request immediate backup on the eastbound lanes.','Suspect weaving through traffic. Units proceed carefully.','Additional ground units have joined the pursuit.'],
   3:['All units, set roadblocks ahead of the suspect.','Dispatch, third alert. Coordinate road closures.','Traffic units, establish an intercept point. Suspect remains mobile.','Vans are setting up a roadblock. Keep an exit lane monitored.','All units, watch for the stationary barrier ahead.','Roadblock teams are holding position. Stay sharp.'],
   4:['Air support has eyes on the target vehicle.','Helicopter online. Ground units, follow the air unit.','Four-star alert. Maintain visual from the air.','Air one, spotlight on suspect. Tracking from above.','Ground units, helicopter beacon marks the target.','Air support repositioning. Do not lose visual contact.'],
   5:['Maximum alert. Tactical units are now deploying.','All units, SWAT interception authorized.','Suspect escalated to highest priority. Tactical response underway.','Tactical intercept SUVs moving to close the gap.','All units, priority five. Maintain safe distance from roadblocks.','SWAT convoy approaching the target now.']
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
 exhaustPop(strength=1){
  if(!this.ctx||this.ctx.state!=='running')return;
  const ctx=this.ctx,t=ctx.currentTime,p=this.engineProfile||{};
  const fx=Math.max(0,Math.min(1,Number(this.settings().effectsVolume??65)/100));
  const force=Math.max(.15,Math.min(2,Number(strength)||1))*fx;
  if(force<.01)return;
  // A sharp, band-limited pressure crack layered over a short low-frequency exhaust thump.
  // Independent from the continuous engine oscillators and music scheduler.
  const count=Math.max(256,Math.floor(ctx.sampleRate*.145)),buf=ctx.createBuffer(1,count,ctx.sampleRate),samples=buf.getChannelData(0);
  let previous=0;
  for(let i=0;i<count;i++){
   const a=i/count,white=Math.random()*2-1;
   previous=previous*.68+white*.32;
   const envelope=Math.exp(-a*17)+.48*Math.exp(-Math.max(0,a-.16)*26)*(a>.16?1:0);
   samples[i]=(white*.55+previous*.75)*envelope;
  }
  const crack=ctx.createBufferSource(),crackBand=ctx.createBiquadFilter(),crackGain=ctx.createGain();
  crack.buffer=buf;crackBand.type='bandpass';crackBand.Q.value=.68;
  crackBand.frequency.value=(p.cylinders||6)>=8?690:1100;
  crackGain.gain.setValueAtTime(.0001,t);
  crackGain.gain.exponentialRampToValueAtTime(Math.max(.0002,force*.44),t+.004);
  crackGain.gain.exponentialRampToValueAtTime(.0001,t+.137);
  crack.connect(crackBand);crackBand.connect(crackGain);crackGain.connect(ctx.destination);
  crack.start(t);crack.stop(t+.146);
  const thump=ctx.createOscillator(),thumpGain=ctx.createGain(),thumpFilter=ctx.createBiquadFilter();
  thump.type='triangle';thump.frequency.setValueAtTime((p.cylinders||6)>=8?119:155,t);
  thump.frequency.exponentialRampToValueAtTime(43,t+.155);
  thumpFilter.type='lowpass';thumpFilter.frequency.value=400;
  thumpGain.gain.setValueAtTime(.0001,t);
  thumpGain.gain.exponentialRampToValueAtTime(Math.min(.20,force*.14+.0001),t+.007);
  thumpGain.gain.exponentialRampToValueAtTime(.0001,t+.19);
  thump.connect(thumpFilter);thumpFilter.connect(thumpGain);thumpGain.connect(ctx.destination);
  thump.start(t);thump.stop(t+.20);
  const snap=ctx.createOscillator(),snapGain=ctx.createGain();
  snap.type='square';snap.frequency.setValueAtTime(410,t);snap.frequency.exponentialRampToValueAtTime(95,t+.038);
  snapGain.gain.setValueAtTime(.0001,t);snapGain.gain.exponentialRampToValueAtTime(force*.024+.0001,t+.002);
  snapGain.gain.exponentialRampToValueAtTime(.0001,t+.041);
  snap.connect(snapGain);snapGain.connect(ctx.destination);snap.start(t);snap.stop(t+.048);
 }
 impact(){if(!this.ctx||this.ctx.state!=='running')return;const t=this.ctx.currentTime;this.noise(t,.18,.11);this.tone(35,t,.4,'sawtooth',.065);}
}
