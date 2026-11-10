import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {driftStep} from './src/driftPhysics.js';

const main=readFileSync('./src/main.js','utf8');
const original=readFileSync('./src/driftPhysics.js','utf8');
const server=readFileSync('./server.js','utf8');
const css=readFileSync('./src/style.css','utf8');
const html=readFileSync('./index.html','utf8');

// Recreate the previous handbrake coefficients: NONE of these changes should
// affect normal steering/drift when the handbrake is not held.
const old=original
 .replace('(handbrake?1.62:1)','(handbrake?1.86:1)')
 .replace('active?(reversing?1.8:handbrake?4.05:3.25)','active?(reversing?1.8:3.25)')
 .replace('(handbrake&&a>.06?1.23:1)','(handbrake&&a>.06?1.4:1)');
assert.notEqual(old,original);
const {driftStep:baseline}=await import('data:text/javascript,'+encodeURIComponent(old));
for(const speed of [0,12,25,65,130,200]){
 for(const steer of [-1,-.5,0,.5,1]){
  for(const lateral of [-14,-2,0,3,15]){
   const input={mph:speed,longitudinal:speed/2.23694,lateral,steer,
      handbrake:false,dt:1/90,blend:.44,steeringInput:.27,yaw:.08,
      assist:true,gripTune:58,stabilityTune:50,steeringTune:65,suspension:2,differential:3};
   assert.deepEqual(driftStep(input),baseline(input),
     'Normal drifting changed with handbrake released');
  }
 }
}
const hbInput={mph:62,longitudinal:25,lateral:2,steer:1,handbrake:true,dt:1/90,blend:.75,steeringInput:.32,yaw:.08};
assert.notDeepEqual(driftStep(hbInput),baseline(hbInput),'Handbrake should respond differently');

// Camera must be placed directly outside the vehicle, never moved through its body.
assert.match(main,/const safeX=THREE\.MathUtils\.clamp\(p\.x-dirX\*setback/);
assert.match(main,/this\.camera\.position\.set\(safeX-Math\.sin\(p\.heading\)\*7\.8/);
assert.match(main,/if\(this\.crashState\)this\.camera\.position\.copy\(desiredCamera\)/);
assert.match(main,/if\(this\.crashState\)this\.lookAt\.copy\(look\)/);
assert.doesNotMatch(main,/c\.z\+Math\.min\(3,t\*1\.8\)/);
assert.match(main,/if\(handbrake\)\{[\s\S]*?const force=/);

// Global announcements disappear after 9.5s, are individually dismissible,
// and are not repeatedly rendered on polling or page refresh.
assert.match(main,/const GLOBAL_NOTICE_MS=9500/);
assert.match(main,/globalNoticeTimer=setTimeout\(dismissGlobalNotice,GLOBAL_NOTICE_MS\)/);
assert.match(main,/seenGlobalAnnouncements\.has\(String\(item\.id\)\)/);
assert.match(main,/id="closeGlobalNotice"/);
assert.match(main,/data-admin-clear-announcements/);
assert.match(server,/\/api\/admin\/announcement\/clear/);
assert.match(server,/await supabase\('\/rest\/v1\/ed_announcements\?is_active=eq\.true'/);
assert.match(css,/global-notice-progress/);

// New commands reuse verified admin endpoints and existing control flags.
for(const command of ['rescue','resetcar','pardon','shield','stunt','unstunt','stop','go']){
 assert.match(server,new RegExp("case '"+command+"'"));
 assert.match(main,new RegExp('value="'+command+'"'));
}
assert.match(server,/if\(!isAdmin\)return json\(res,403/);
assert.match(server,/const destructive=\['kick','ban','freeze','unfreeze','stop'\]/);
assert.match(server,/never to competitive ranked scores/);
assert.match(main,/OWNER PROFILE • UNRANKED/);
assert.match(main,/class="beta-label">BETA/);
assert.match(html,/src="\.\/src\/main\.js\?v=29"/);
console.log('V29 passed: unchanged normal drifts, dedicated handbrake tuning, no crash-camera clipping, 9.5s messages, and verified admin commands.');
