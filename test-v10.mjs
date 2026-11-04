import fs from 'node:fs';
import assert from 'node:assert/strict';
import {CARS,UPGRADES,BODY_PARTS,BATTLE_PASS,PREMIUM_PASS,levelFromXP} from './src/data.js';
import {driftStep} from './src/driftPhysics.js';
import {performanceStats,upgradePreview,PERFORMANCE_FIELDS} from './src/performance.js';
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
const {state,save,carSave,pay,award,exportSave,importSave}=await import('./src/store.js');
assert.equal(CARS.length,24);assert.equal(BATTLE_PASS.length,30);assert.equal(PREMIUM_PASS.length,30);
assert.equal(new Set([...BATTLE_PASS,...PREMIUM_PASS].map(x=>x.id)).size,60);
assert.ok(UPGRADES.length>=16);assert.ok(BODY_PARTS.length>=8);
assert.equal(state.wallet,2500);
assert.ok(pay(300));assert.equal(state.wallet,2200);assert.equal(state.spent,300);
const priorXP=state.lifetimeXP;
const reward=award(850);assert.equal(state.lifetimeXP-priorXP,850,'XP is persistent and distinct from coins');
assert.equal(reward.coins,170,'only one Drift Coin per five earned XP');
assert.equal(state.wallet,2370+reward.bonus);assert.equal(reward.level,levelFromXP(state.lifetimeXP));
assert.ok(!PREMIUM_PASS.some(i=>state.unlockedCosmetics.includes(i.id)),'premium track cannot be granted by leveling');
const cs=carSave(CARS[2].id);cs.upgrades.transmission=2;cs.appearance.wheels='five';cs.rims='#e5be73';save();
const backup=exportSave();assert.match(backup,/"version": 10/);importSave(backup);
assert.equal(carSave(CARS[2].id).upgrades.transmission,2);assert.equal(carSave(CARS[2].id).rims,'#e5be73');
importSave(JSON.stringify({game:'ENDLESS DRIFT',save:{wallet:4123,lifetimeXP:13500,owned:[CARS[0].id,CARS[3].id],selected:CARS[3].id,settings:{uiTheme:'blue'},unlockedCosmetics:[]}}));
assert.equal(state.wallet,4123);assert.equal(state.selected,CARS[3].id);assert.equal(state.settings.uiTheme,'blue');
assert.ok(!PREMIUM_PASS.some(i=>state.unlockedCosmetics.includes(i.id)));
const base=CARS[0];const current=performanceStats(base,{});
assert.ok(current.acceleration<6,'slower stock acceleration');
assert.ok(current.shiftTime>=.3);
for(const up of UPGRADES){const {current,next}=upgradePreview(base,{},up.id,up.max);
 const diff=PERFORMANCE_FIELDS.some(([key])=>Math.abs(next[key]-current[key])>1e-5);
 assert.ok(diff,`Upgrade ${up.id} must change a visible stat`);
}
const race=performanceStats(base,{engine:5,transmission:3,clutch:3,tires:3});
assert.ok(race.hp>current.hp&&race.top>current.top&&race.acceleration>current.acceleration&&race.shiftTime<current.shiftTime&&race.handling>current.handling);
function drive(steer,steps,init={}){let state={lateral:0,yaw:0,steeringInput:0,blend:0,...init};for(let j=0;j<steps;j++){
 const d=driftStep({...state,mph:48,longitudinal:21.45,steer,dt:1/90,style:'street',assist:true});state={...d};}
 return state;
}
const left=drive(-1,90);assert.ok(left.drifting&&left.lateral>3&&left.slip>4.5,'holding A starts easy drift');
const right=drive(1,150,left);assert.ok(right.drifting&&right.lateral < -3,'D transitions to opposite slide');
const noSteer=drive(0,110,right);assert.ok(Math.abs(noSteer.lateral)<2,'releases drift when straight');
assert.equal(driftStep({mph:4,longitudinal:2,steer:1}).drifting,false);
const script=fs.readFileSync('./src/main.js','utf8');
for(const s of ['PREMIUM_PASS','data-premium-guide','pass-v10-wrap','5 XP = 1 DC','tune-stat-preview','stats.acceleration','shiftTimer','data-pass-preview'])assert.ok(script.includes(s),`Missing ${s}`);
const body=script.slice(script.indexOf(' endRun(crashed){'),script.indexOf(' crash(reason){'));
const fn=new Function('award','state','save','earnedXP','notify','fmt',`return ({${body}}).endRun`)(award,state,save,()=>{},()=>{},n=>Math.floor(n).toLocaleString());
for(const [reason,earned,lost] of [['HIGHWAY BARRIER IMPACT',500,500],['TRAFFIC COLLISION',750,250],[false,1000,0]]){
 const context={run:{score:1000,active:true,grace:0,seconds:2,nearMissXP:200,combo:1}};
 const result=fn.call(context,reason);assert.equal(result.banked,earned);assert.equal(result.lost,lost);
}
for(const f of ['main','store','data','car','world','showroom','audio','driftPhysics','performance'])assert.ok(fs.existsSync(`src/${f}.js`),f);
console.log('V10 PASS: 24 cars, 30 free/30 premium, secure-locked premium, 1 DC per 5 XP, legacy saves, 16 upgrades change stats, easy drifting, real shift delay, collision penalties.');
