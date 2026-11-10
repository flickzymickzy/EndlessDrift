import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {driftStep} from './src/driftPhysics.js';

const main=readFileSync('./src/main.js','utf8');
const original=readFileSync('./src/driftPhysics.js','utf8');
const server=readFileSync('./server.js','utf8');
const css=readFileSync('./src/style.css','utf8');
const html=readFileSync('./index.html','utf8');

// V27 original drift physics, both with and without the handbrake, are restored.
assert.match(original,/\(handbrake\?1\.65:1\)/);
assert.match(original,/active\?\(reversing\?1\.8:3\.25\)/);
assert.match(original,/\(handbrake&&a>\.06\?1\.28:1\)/);
assert.match(main,/if\(handbrake\)\{const force=Math\.max\(5,stats\.brake\*\.42\)/);
const neutral=driftStep({mph:45,longitudinal:22,lateral:0,steer:0,handbrake:false,dt:1/90});
const handbrake=driftStep({mph:45,longitudinal:22,lateral:0,steer:1,handbrake:true,dt:1/90});
assert.equal(neutral.lateral,0);
assert.ok(Math.abs(handbrake.lateral)>0);

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
assert.match(html,/src="\.\/src\/main\.js\?v=30"/);
console.log('V29 crash, announcements and admin regressions passed with restored V27 drifting.');
