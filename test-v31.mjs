import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {publicDriverProfile} from './src/publicProfile.js';
import {CARS} from './src/data.js';
const main=readFileSync('src/main.js','utf8');
const server=readFileSync('server.js','utf8');
const css=readFileSync('src/style.css','utf8');
const store=readFileSync('src/store.js','utf8');
const html=readFileSync('index.html','utf8');
for(const file of ['src/main.js','server.js','src/publicProfile.js']){
 const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
 assert.equal(result.status,0,file+' has a syntax error: '+result.stderr);
}
const fakeSave={wallet:900000,lifetimeXP:1800000,drifts:88,crashes:11,escapes:5,
 nearMisses:28,bestDrift:5000,bestNearMiss:300,selected:CARS[1].id,
 owned:[CARS[0].id,CARS[1].id,'fake-car'],
 cars:{[CARS[1].id]:{color:'#aabbcc',rims:'#1299ff',neon:'off',
 appearance:{spoiler:'race',hood:'scoop',bogus:'danger'},
 upgrades:{engine:2,turbo:4,invalid:999}}},settings:{profileVisibility:'public'},
 secretToken:'do-not-return',email:'private@example.com',inventoryPrivate:'secret'};
const p=publicDriverProfile({username:'Tester_1',createdAt:'2025-02-01T03:00:00Z',
 owner:false,ranked:{lifetime_xp:500,coins_spent:100},save:fakeSave});
assert.equal(p.username,'Tester_1');
assert.equal(p.rankedXP,500,'Ranked XP must never be inflated by local/admin XP');
assert.equal(p.coinsSpent,100);
assert.equal(p.garage.length,2);
assert.equal(p.garage[1].rims,'#1299ff');
assert.equal(p.garage[1].appearance.spoiler,'race');
assert.equal(p.garage[1].appearance.bogus,undefined);
assert.equal(p.garage[1].upgrades.invalid,undefined);
assert.equal(p.garage[1].selected,true);
assert.equal(p.stats.drifts,88);
assert.equal(p.joined,'2025-02-01');
for(const privateData of ['wallet','email','secretToken','user_id','idToken','inventoryPrivate']){
 assert.equal(p[privateData],undefined,'Private field leaked: '+privateData);
}
const hidden=publicDriverProfile({username:'privateDriver',ranked:{lifetime_xp:25},save:{
 ...fakeSave,settings:{profileVisibility:'private'}}});
assert.equal(hidden.privateGarage,true);
assert.equal(hidden.garage.length,0);
assert.equal(hidden.stats,null);
assert.equal(hidden.rankedXP,25);
const malicious=publicDriverProfile({username:'test',save:{owned:[CARS[1].id],cars:{
 [CARS[1].id]:{color:'javascript:evil()',rims:'<svg/onload=alert(1)>',
 appearance:{spoiler:'<img src=x onerror=alert(1)>'},upgrades:{engine:900}}}}});
assert.equal(malicious.garage[0].color,CARS[1].color);
assert.equal(malicious.garage[0].rims,'#d0d9e2');
assert.equal(malicious.garage[0].appearance.spoiler,'stock');
assert.ok(malicious.garage[0].upgrades.engine<=5);
assert.match(main,/data-driver-profile=/);
assert.match(main,/data-profile-car=/);
assert.match(main,/function renderDriverProfileDetails/);
assert.match(main,/showroom\.setCar\(spec,\{\.\.\.selected,showSmoke:false\}\)/);
assert.match(main,/id="profileLookupForm"/);
assert.match(main,/profileVisibility/);
assert.match(server,/route==='\/api\/profile'/);
assert.match(server,/publicDriverProfile\(\{/);
assert.doesNotMatch(server,/json\(res,200,\{profile:saves/);
for(const key of ['cameraDistance','cameraFov','cameraSmoothing','showSpeedometer','showDriftNotice','showControlsHint','showNearMissPopups','profileVisibility']){
 assert.ok(store.includes(key),'Missing default setting '+key);
 assert.ok(main.includes(key),'Missing UI or setting logic '+key);
}
assert.match(css,/profile-car-grid/);
assert.match(css,/data-show-drift-notice="false"/);
assert.match(html,/src="\.\/src\/main\.js\?v=\d+"/);
assert.match(html,/href="\.\/src\/style\.css\?v=\d+"/);
assert.match(main,/const force=Math\.max\(5,stats\.brake\*\.42\)/);
assert.match(main,/OWNER PROFILE • UNRANKED/);
console.log('V31 passed: safe public driver stats and garages, readable 3D profile screen, camera/HUD settings, private profiles, and V27 drifting preserved.');
