import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const physics=readFileSync('./src/driftPhysics.js','utf8');
const main=readFileSync('./src/main.js','utf8');
const html=readFileSync('./index.html','utf8');
// Verify the entire drift module is byte-for-byte identical to the historical V27 blob.
const gitBlobSha=createHash('sha1').update('blob '+Buffer.byteLength(physics)+'\0'+physics).digest('hex');
assert.equal(gitBlobSha,'b2b71a679666a374e57ea3702a02e0395a4ef3e2','Drifting physics must match V27 exactly');
assert.match(main,/if\(handbrake\)\{const force=Math\.max\(5,stats\.brake\*\.42\)/);
assert.doesNotMatch(main,/stats\.brake\*\(Math\.abs\(steer\)/);
assert.match(html,/src="\.\/src\/main\.js\?v=30"/);
assert.match(main,/class="beta-label">BETA/);
assert.match(main,/const GLOBAL_NOTICE_MS=9500/);
assert.match(main,/this\.camera\.position\.copy\(desiredCamera\)/);
console.log('V30 passed: original V27 drift physics and handbrake restored without removing V29 features');
