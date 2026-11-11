import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {BODY_PARTS,CARS} from './src/data.js';
import {CAR_EXTRAS_DEFAULTS,CAR_STANCE_FIELDS,sanitizeCarExtras} from './src/carCustomization.js';
import {publicDriverProfile} from './src/publicProfile.js';
const main=readFileSync('src/main.js','utf8');
const car=readFileSync('src/car.js','utf8');
const showroom=readFileSync('src/showroom.js','utf8');
const style=readFileSync('src/style.css','utf8');
const html=readFileSync('index.html','utf8');
for(const file of ['src/main.js','src/car.js','src/data.js','src/store.js','src/showroom.js','src/carCustomization.js','src/publicProfile.js','server.js']){
 const proc=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
 assert.equal(proc.status,0,file+' parser: '+proc.stderr);
}
const expected=['frontBumper','rearBumper','spoiler','skirts','exhaust','splitter','diffuser','hood','fenders','mirrors','roof','lights','tint','wheels'];
assert.equal(BODY_PARTS.length,expected.length);
for(const id of expected){
 const part=BODY_PARTS.find(p=>p.id===id);
 assert.ok(part,'Missing '+id);
 assert.ok(part.options.length>=3,id+' needs multiple parts');
 assert.equal(part.options[0][0],'stock');
 assert.equal(part.options[0][2],0);
 assert.ok(car.includes('appearance.'+id),'Physical 3D geometry for '+id);
}
for(const part of BODY_PARTS){
 assert.equal(new Set(part.options.map(o=>o[0])).size,part.options.length,'Duplicate options');
}
const safe=sanitizeCarExtras({...CAR_EXTRAS_DEFAULTS,secondaryColor:'#ABCDEF',roofColor:'#123456',rideHeight:999,wheelCamber:-12,neonIntensity:23});
assert.equal(safe.secondaryColor,'#abcdef');
assert.equal(safe.rideHeight,100);
assert.equal(safe.wheelCamber,0);
assert.equal(safe.neonIntensity,23);
assert.equal(sanitizeCarExtras({roofColor:'javascript:alert(1)'}).roofColor,'match');
assert.equal(sanitizeCarExtras({taillightColor:'<svg>'}).taillightColor,CAR_EXTRAS_DEFAULTS.taillightColor);
for(const [key] of CAR_STANCE_FIELDS)assert.ok(Number.isFinite(safe[key]));
const id=CARS[0].id,save={wallet:99999,owned:[id],selected:id,cars:{[id]:{appearance:{frontBumper:'track',fenders:'extreme'},roofColor:'#123456',secondaryColor:'#fedcba',wheelCamber:67}}};
const profile=publicDriverProfile({username:'TestDriver',ranked:{lifetime_xp:100},save});
assert.equal(profile.garage[0].appearance.fenders,'extreme');
assert.equal(profile.garage[0].wheelCamber,67);
assert.equal(profile.wallet,undefined);
assert.equal(publicDriverProfile({save:{...save,settings:{profileVisibility:'private'}}}).garage.length,0);
for(const id of ['body','paint','wheels','lighting','stance','exhaust','performance','setup'])assert.ok(main.includes("['"+id+"',"),'Missing tab '+id);
for(const key of ['secondaryColor','roofColor','taillightColor','exhaustFlameColor','rideHeight','wheelCamber','wheelSize','frontTrackWidth','rearTrackWidth','neonIntensity'])assert.ok(main.includes(key),'Missing setting '+key);
assert.ok(main.includes("FULL 3D CUSTOMIZATION"));
assert.ok(main.includes('data-car-extra-range'));
assert.ok(main.includes('data-car-extra-neon'));
assert.ok(main.includes('data-car-match-color'));
assert.ok(car.includes('export function setCarStance'));
assert.ok(car.includes('const taillightMat=shared.red.clone'));
assert.ok(car.includes('const roofMat=new THREE.MeshPhysicalMaterial'));
assert.ok(showroom.includes('this.car=createCar(spec,custom.color,custom)'));
assert.ok(style.includes('full-screen 3D showroom'));
assert.ok(html.includes('style.css?v=34')&&html.includes('main.js?v=34'));
const physics=readFileSync('src/driftPhysics.js','utf8');
const gitSha=createHash('sha1').update('blob '+Buffer.byteLength(physics)+'\0'+physics).digest('hex');
assert.equal(gitSha,'b2b71a679666a374e57ea3702a02e0395a4ef3e2','V27 drift physics must stay unchanged');
assert.ok(main.includes('Math.max(5,stats.brake*.42)'));
console.log('V33 passed 14 new and existing body kits, saved customization, public garages, larger 3D preview and V27 drift preservation');
