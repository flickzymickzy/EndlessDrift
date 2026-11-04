import fs from 'node:fs';
import assert from 'node:assert/strict';
import {CARS,UPGRADES,BODY_PARTS,BATTLE_PASS,levelFromXP} from './src/data.js';
import {driftStep} from './src/driftPhysics.js';
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
const {state,save,carSave,pay,award,exportSave,importSave}=await import('./src/store.js');
assert.equal(CARS.length,24,'keep every car');assert.equal(BATTLE_PASS.length,30,'keep every Drift Pass cosmetic');assert.ok(UPGRADES.length>=15);assert.ok(BODY_PARTS.length>=8);
assert.equal(state.wallet,2500,'new driver starts with 2500 Drift Coins');assert.equal(state.settings.driftStyle,'street');
const wallet=state.wallet,life=state.lifetimeXP;
assert.ok(pay(320));assert.equal(state.wallet,wallet-320);assert.equal(state.lifetimeXP,life);assert.equal(state.spent,320);
assert.equal(pay(10000000),false);
const result=award(1700);assert.equal(state.wallet,wallet-320+1700+result.bonus);assert.equal(result.level,levelFromXP(state.lifetimeXP));
const car=carSave(CARS[3].id);car.upgrades.transmission=3;car.appearance.spoiler='gt';save();
const exported=exportSave();assert.match(exported,/"version": 9/);importSave(exported);assert.equal(carSave(CARS[3].id).upgrades.transmission,3);assert.equal(carSave(CARS[3].id).appearance.spoiler,'gt');
importSave(JSON.stringify({game:'ENDLESS DRIFT',save:{wallet:12345,lifetimeXP:3000,owned:[CARS[0].id,CARS[2].id],selected:CARS[2].id,settings:{uiTheme:'purple'},unlockedCosmetics:[]}}));
assert.equal(state.wallet,12345,'V8 Drift Coins wallet preserved');assert.equal(state.selected,CARS[2].id);assert.equal(state.settings.uiTheme,'purple');assert.equal(state.settings.driftStyle,'street');
let lat=0,yaw=0,steeringInput=0,blend=0;
for(let i=0;i<90;i++){
 const d=driftStep({mph:62,longitudinal:27.7,lateral:lat,steer:-1,dt:1/90,blend,yaw,steeringInput,style:'street',assist:true});
 lat=d.lateral;yaw=d.yaw;steeringInput=d.steeringInput;blend=d.blend;
}
assert.ok(lat>5,'holding A initiates controllable left drift');assert.ok(Math.abs(yaw)<.70,'yaw stays controlled');
let shifted=false;
for(let i=0;i<130;i++){
 const d=driftStep({mph:62,longitudinal:27.7,lateral:lat,steer:1,dt:1/90,blend,yaw,steeringInput,style:'street',assist:true});
 lat=d.lateral;yaw=d.yaw;steeringInput=d.steeringInput;blend=d.blend;if(lat<0)shifted=true;
}
assert.ok(shifted,'countersteering transitions from left to right');
let slow=driftStep({mph:4,longitudinal:2,lateral:0,steer:1,dt:1/90});assert.equal(slow.drifting,false);
const script=fs.readFileSync('./src/main.js','utf8');
const section=script.slice(script.indexOf(' endRun(crashed){'),script.indexOf(' crash(reason){'));
const fn=new Function('award','state','save','earnedXP','notify','fmt',`return ({${section}}).endRun`)(award,state,save,()=>{},()=>{},n=>Math.floor(n).toLocaleString());
const o={run:{score:1000,active:true,seconds:2,nearMissXP:300,nearMisses:1,combo:2,grace:0}};
const barrier=fn.call(o,'HIGHWAY BARRIER IMPACT');assert.deepEqual(barrier,{total:1000,banked:500,lost:500,penalty:50});
o.run={score:1000,active:true,seconds:2,nearMissXP:200,nearMisses:1};const traffic=fn.call(o,'TRAFFIC COLLISION');assert.deepEqual(traffic,{total:1000,banked:750,lost:250,penalty:25});
o.run={score:1000,active:true,seconds:2,nearMissXP:100,nearMisses:1};const clean=fn.call(o,false);assert.deepEqual(clean,{total:1000,banked:1000,lost:0,penalty:0});
for(const name of ['main','world','data','car','store','audio','showroom','driftPhysics'])assert.ok(fs.existsSync(`./src/${name}.js`),`missing ${name}`);
assert.ok(script.includes('data-preview-cosmetic'),'cosmetic preview selector');assert.ok(script.includes('passCarMount'),'Drift Pass showcase');
console.log('V9 PASS: V8 save migration, 24 cars, 30 cosmetics, separate Drift Coins purchases, physics steering, barrier -50%, vehicles -25%, clean run, cosmetic previews.');
