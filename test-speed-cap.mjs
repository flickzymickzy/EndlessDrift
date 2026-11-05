import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARS,UPGRADES,mph} from './src/data.js';
import {performanceStats,capVehicleVelocity} from './src/performance.js';

const main=readFileSync('./src/main.js','utf8');
assert.equal((main.match(/capVehicleVelocity\(p,topSpeed\)/g)||[]).length,2,'Speed must be capped before movement and after boost pads');
assert.match(main,/this\.checkRoadFeatures\(dt\);[\s\S]*?capVehicleVelocity\(p,topSpeed\)/);
const fullUpgrades=Object.fromEntries(UPGRADES.map(u=>[u.id,u.max]));
const fastest=CARS.reduce((a,b)=>a.top>b.top?a:b);
for(const car of CARS){
 for(const upgrades of [{},fullUpgrades]){
  const stats=performanceStats(car,upgrades),max=stats.top/2.23694;
  assert.ok(Number.isFinite(max)&&max>0,'Car top speed must be finite');
  const carState={vx:max*2.5,vz:max*.8,speed:0};
  for(let i=0;i<200;i++){
   carState.vx+=13;carState.vz+=19; // simulated repeated boosts and throttle
   capVehicleVelocity(carState,max);
   assert.ok(carState.speed<=max+1e-9,car.id+' '+(upgrades===fullUpgrades?'max upgraded':'stock')+' exceeded cap');
   assert.ok(mph(carState.speed)<=stats.top+.001,'Displayed speed exceeded max');
  }
 }
}
const highTop=performanceStats(fastest,fullUpgrades).top;
const hyper={vx:1e5,vz:1e5};
capVehicleVelocity(hyper,highTop/2.23694);
assert.ok(mph(hyper.speed)<=highTop+.001,'Fully upgraded fastest car must have a top speed');
const admin={vx:1e5,vz:1e5};capVehicleVelocity(admin,highTop/2.23694*3);
assert.ok(mph(admin.speed)<=highTop*3+.001,'Admin speed multiplier remains supported');
const invalid={vx:Infinity,vz:NaN};capVehicleVelocity(invalid,highTop/2.23694);
assert.equal(invalid.speed,0,'Nonfinite velocity must not break HUD');
const reverse={vx:-1e4,vz:0};capVehicleVelocity(reverse,20);
assert.ok(reverse.vx<=0&&reverse.speed<=20,'Reverse must retain direction and cap');
console.log('Speed limiter checks passed for all stock and fully upgraded cars, boosted acceleration, max hypercar, admin mode and malformed velocity.');
