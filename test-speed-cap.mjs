import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARS,UPGRADES,mph} from './src/data.js';
import {performanceStats,capVehicleVelocity,vehicleSpeedLimitMps,MAX_VEHICLE_SPEED_MPH} from './src/performance.js';

const main=readFileSync('./src/main.js','utf8');
assert.equal((main.match(/capVehicleVelocity\(p,topSpeed\)/g)||[]).length,2,'Speed must be capped before movement and after boost pads');
assert.match(main,/const topSpeed=vehicleSpeedLimitMps\(stats\.top,this\.adminSpeedMultiplier\|\|1\)/);
assert.match(main,/capVehicleVelocity\(p,vehicleSpeedLimitMps\(this\.currentStats\(\)\.top,this\.adminSpeedMultiplier\|\|1\)\)/);
assert.equal(MAX_VEHICLE_SPEED_MPH,280);
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

for(const car of CARS){
 for(const upgrades of [{},fullUpgrades]){
  const stats=performanceStats(car,upgrades);
  assert.ok(stats.top<=MAX_VEHICLE_SPEED_MPH,'Garage speed stat exceeds physical ceiling');
  for(const multiplier of [1,1.5,3]){
   const limit=vehicleSpeedLimitMps(stats.top,multiplier);
   assert.ok(limit*2.2369362921<=280+1e-8,'Admin speed override bypasses cap');
   const v={vx:0,vz:0,speed:0};
   for(let frame=0;frame<5000;frame++){
    v.vz+=stats.acceleration/90*multiplier*1.08;
    if(frame%27===0)v.vz+=13;
    if(frame%37===0)v.vx+=18;
    capVehicleVelocity(v,limit);
    assert.ok(v.speed<=limit+1e-8,`Exceeded physical speed cap on ${car.id} frame ${frame}`);
   }
  }
 }
}
assert.equal(Math.round(vehicleSpeedLimitMps(280.262,3)*2.2369362921),280);
assert.equal(vehicleSpeedLimitMps(NaN,3),0);
console.log('280 MPH hard speed limiter verified across all cars, all upgrades, boost impulses, admin speeds and extended acceleration.');
