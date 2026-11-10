import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {driftStep} from './src/driftPhysics.js';
import {MAX_VEHICLE_SPEED_MPH,vehicleSpeedLimitMps,capVehicleVelocity,performanceStats} from './src/performance.js';
import {CARS,UPGRADES} from './src/data.js';

const main=readFileSync('./src/main.js','utf8');
const css=readFileSync('./src/style.css','utf8');
const html=readFileSync('./index.html','utf8');
const server=readFileSync('./server.js','utf8');
const store=readFileSync('./src/store.js','utf8');

assert.equal(MAX_VEHICLE_SPEED_MPH,280);
for(const car of CARS){
 const full=Object.fromEntries(UPGRADES.map(u=>[u.id,u.max]));
 for(const upg of [{},full]){
  const stats=performanceStats(car,upg);
  assert.ok(stats.top<=280,'Top speed exceeds V28 limit');
  for(const mult of [1,2,3]){
   const v={vx:500,vz:500};
   capVehicleVelocity(v,vehicleSpeedLimitMps(stats.top,mult));
   assert.ok(v.speed*2.2369362921<=280.000001,'Unbounded velocity');
  }
 }
}
for(const action of ['accelerate','brake','left','right','handbrake'])assert.match(main,new RegExp('data-touch="'+action+'"'));
for(const direction of ['dpad-up','dpad-down','dpad-left','dpad-right'])assert.match(main,new RegExp('class="'+direction+'"'));
assert.match(main,/touchLayout','PHONE \/ TABLET BUTTONS'/);
assert.match(store,/touchLayout:'arrows'/);
assert.match(main,/dataset\.touchLayout/);
assert.match(css,/data-touch-layout="arrows"/);
assert.match(css,/body\.game-active/);
assert.match(main,/document\.addEventListener\(eventName,event=>releaseTouch\(event\.pointerId\),true\)/);
assert.match(main,/touchPanel\?\.addEventListener\('pointermove'/);
assert.match(main,/id="onboardingSkip"/);
assert.match(main,/skippedUsernameGate/);
for(const command of ['unboost','superboost','superjump','unjump','unstuck','restore','godon','godoff','unmorph']){
 assert.match(server,new RegExp("case '"+command+"'"),'Missing admin command: '+command);
 assert.match(main,new RegExp('value="'+command+'"'),'Missing admin UI control: '+command);
}
assert.match(main,/class="beta-label">BETA/);
assert.match(html,/>BETA</);
assert.match(html,/src="\.\/src\/main\.js\?v=31"/);
assert.match(main,/OWNER PROFILE • UNRANKED/);
assert.doesNotMatch(server.split("case 'xp':{")[1].split("case 'coins':{")[0],/ed_record_ranked_xp/);
const neutral=driftStep({mph:45,longitudinal:20,lateral:0,steer:0,handbrake:true,dt:1/90});
const sliding=driftStep({mph:45,longitudinal:20,lateral:0,steer:1,handbrake:true,dt:1/90});
assert.equal(neutral.lateral,0);
assert.ok(Math.abs(sliding.lateral)>0&&Math.abs(sliding.yaw)>0);
console.log('V28 passed: touch D-pad, mobile recovery, admin commands, 280 MPH cap, username skip, BETA, owner ranks and responsive handbrake');
