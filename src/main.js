import * as THREE from 'three';
// Styles load from index.html so no installation/build step is needed.
import {CARS,UPGRADES,BODY_PARTS,COLORS,SMOKES,GARAGE_THEMES,BATTLE_PASS,PREMIUM_PASS,BASE_RIMS,BASE_NEONS,COSMETIC_SHOP,fmt,mph,kph,upgradeCost,levelStart,levelFromXP,levelTitle} from './data.js';
import {state,save,carSave,pay,award,getSelected,cosmeticUnlocked,exportSave,importSave,setSaveOwner,getSaveOwner,setSaveHook} from './store.js';
import {createWorld} from './world.js';
import {createCar,setCarPaint,setCarCosmetics,animateWheels} from './car.js';
import {Showroom} from './showroom.js';
import {Soundtrack} from './audio.js';
import {driftStep} from './driftPhysics.js';
import {crashMultiplier} from './penalties.js';
import {wantedHeatRate,nextWantedLevel} from './pursuit.js';
import {performanceStats,upgradePreview,PERFORMANCE_FIELDS,capVehicleVelocity,vehicleSpeedLimitMps} from './performance.js';
import {PAINT_FINISHES,CAR_EXTRAS_DEFAULTS,CAR_STANCE_FIELDS,safeCarHex} from './carCustomization.js';
import {cloudConfigured,cloudSignUp,cloudSignIn,cloudSignInGoogle,cloudSignOut,cloudUser,cloudBoard,cloudProfile,cloudUpdateUsername,googleOAuthReturned,cloudLoadGameSave,cloudSaveGameSave,cloudAccessToken} from './cloud.js';
import {purchased,clearPurchased,refreshPurchased,spendPurchased} from './payments.js';

const DRIFT_PASS_COST=15000;
const hasDriftPass=()=>state.driftPassOwned===true||purchased.driftPass===true;
const app=document.querySelector('#app');
if(!app)throw new Error('Missing #app element. Check index.html.');
app.innerHTML=`
<canvas id="view" aria-label="3D drifting game"></canvas><div id="tone"></div>
<div id="ui">
  <header class="topbar">
    <div class="brand">DRIFT <span>ENDLESSLY</span><b class="beta-label">BETA</b><small>DRIVE // DRIFT // EARN</small></div>
    <nav class="toplinks" aria-label="Main navigation">
      <button data-page="home" class="active">HOME</button><button data-page="game">DRIVE</button><button data-page="garage">GARAGE</button><button data-page="shop">SHOP</button><button data-page="battlepass">DRIFT PASS</button><button data-page="leaderboard">RANKS</button><button data-page="account">ACCOUNT</button><button data-page="settings">SETTINGS</button><button id="adminNav" data-page="admin" class="hidden">ADMIN</button>
    </nav>
    <div class="player-progression" title="Level rises with lifetime XP earned">
      <div class="progress-top"><span id="playerLevel">LVL 1</span><span id="playerRank">ROOKIE DRIVER</span></div>
      <div class="progress-bar"><b id="levelBar"></b></div><div class="progress-bottom" id="levelNext">0 / 1,500 XP</div>
    </div>
    <div class="wallet"><span>DRIFT COINS</span><span id="wallet" class="cash">2,500 DC</span></div>
    <button class="btn small ghost" id="garageDesign">GARAGE STYLE</button>
  </header>
  <section id="hero" class="hero">
    <div class="hero-inner">
      <div class="kicker">FREE TO PLAY • XP LEVELS • DRIFT COIN ECONOMY</div>
      <h1>DRIFT<br/><span>ENDLESSLY</span></h1>
      <p class="hero-sub">No finish line. No limits. Build your dream garage, chain massive drifts, earn near-miss XP and Drift Coins, and outrun the cops.</p><div class="home-level" id="homeLevel">LEVEL 1 · ROOKIE DRIVER</div>
      <div id="lastRunBanked" class="last-run-banked hidden"></div><div class="hero-actions"><button class="btn primary" data-page="game">▶ START DRIVING</button><button class="btn ghost" data-page="garage">EXPLORE GARAGE</button></div>
      <div class="hero-stats"><div><strong>${CARS.length}</strong><small>CARS TO COLLECT</small></div><div><strong>100 KM/H</strong><small>POLICE PURSUITS</small></div><div><strong>∞</strong><small>ENDLESS HIGHWAY</small></div></div>
    </div><div class="hero-footer">ARCADE DRIFT EXPERIENCE • BETA • SHOWROOM / STUDIO</div>
  </section>
  <section id="screen" class="panescreen hidden" aria-live="polite"></section>
  <div id="hud" class="hud hidden">
    <div class="hud-top"><div class="tag featured-tag"><small>RUN XP • 5 XP = 1 DC <span class="live-dot"></span></small><b id="runScore">0 XP</b><small id="runEarnedCoins" class="run-coin-preview">EST. +0 DC</small><small class="run-coin-preview">BANK TO SAVE REWARDS</small></div><div class="tag"><small>COMBO</small><b id="combo">×1.0</b></div><div class="tag"><small>TOTAL NEAR MISSES</small><b id="nearMissCount">0</b></div><div class="tag car-tag"><small>CAR</small><b id="hudCar">SAKURA S13</b></div></div>
    <div class="level-mini"><span id="hudLevel">LEVEL 1</span><div><b id="hudLevelBar"></b></div><small id="hudLevelProgress">0 / 1500 XP</small></div>
    <div id="nearMissFlash" class="near-miss-flash hidden"><strong id="nearMissTitle">NEAR MISS</strong><span id="nearMissValue">+300 XP</span><small id="nearMissStreak">STREAK ×1</small></div>
    <div id="dispatchMessage" class="dispatch-message hidden" aria-live="polite"><small>POLICE DISPATCH</small><strong id="dispatchText"></strong></div>
    <div class="hud-top-right"><div id="wanted" class="wanted hidden"><small>POLICE PURSUIT</small><span id="stars">☆☆☆☆☆</span><div id="policeArrow" class="police-arrow">↓ POLICE 80m</div></div><button class="btn small ghost" id="customFromHud">CUSTOMIZE</button></div>
    <div id="copGlow" class="cop-glow hidden" aria-hidden="true"></div>
    <div id="featureNotice" class="feature-notice hidden" aria-live="polite"></div>
    <div class="drift-notice hidden" id="driftNotice"><div class="drift-rating" id="driftRating">CLEAN DRIFT</div><div class="score" id="driftSplash">DRIFT!</div><div class="combo" id="driftAngle">SUSTAIN YOUR DRIFT</div><div class="drift-meter"><i id="driftMeterFill"></i><b id="driftMeterPin"></b></div><small class="drift-meter-note">STEER WITH A/D OR ARROWS • HOLD DRIFT TO SLIDE</small></div>
    <details class="controls-hint"><summary>CONTROLS</summary><div><b>W / ↑</b> Drive<br><b>S / ↓</b> Brake<br><b>A / D / ← →</b> Steer<br><b>SPACE</b> Drift<br><b>C</b> Camera<br><b>R</b> Recover<br><b>ESC</b> Pause</div></details><div id="touchControls" class="touch-controls" aria-label="Touch driving controls">
  <div class="touch-tools" role="group" aria-label="Game actions">
    <button type="button" data-touch="camera" aria-label="Change camera">CAM</button>
    <button type="button" data-touch="recover" aria-label="Recover vehicle">RESET</button>
    <button type="button" data-touch="pause" aria-label="Pause game">PAUSE</button>
    <button type="button" data-touch="bank" aria-label="Bank this run and exit">BANK + EXIT</button>
  </div>
  <div class="touch-dpad" role="group" aria-label="Four-arrow touch controls">
    <button type="button" class="dpad-up" data-touch="accelerate" aria-label="Accelerate with up arrow">↑</button>
    <button type="button" class="dpad-left" data-touch="left" aria-label="Steer left with arrow">←</button>
    <button type="button" class="dpad-right" data-touch="right" aria-label="Steer right with arrow">→</button>
    <button type="button" class="dpad-down" data-touch="brake" aria-label="Brake with down arrow">↓</button>
   </div>
   <div class="touch-dpad-drift"><button type="button" data-touch="handbrake" aria-label="Hold handbrake to drift">DRIFT</button></div>
   <div class="touch-steer touch-group" role="group" aria-label="Steering">
    <button type="button" data-touch="left" aria-label="Steer left">◀</button><button type="button" data-touch="right" aria-label="Steer right">▶</button>
  </div>
  <div class="touch-pedals touch-group" role="group" aria-label="Driving pedals">
    <button type="button" data-touch="handbrake" class="touch-handbrake" aria-label="Handbrake drift">DRIFT</button>
    <button type="button" data-touch="brake" aria-label="Brake">BRAKE</button>
    <button type="button" data-touch="accelerate" class="touch-gas" aria-label="Accelerate">GAS</button>
  </div>
 </div><div class="hud-bottom-left"><button class="btn bank-btn" id="bankExit">BANK XP + DC / EXIT</button><button class="btn" id="pauseHud">PAUSE / MENU</button><button class="btn" data-page="garage">GARAGE</button></div>
    <div class="speed"><div class="speed-number" id="speedNumber">0</div><div class="unit" id="speedUnit">MPH</div><div class="speed-track"><b id="rpmLine"></b></div><div class="speed-bottom"><div><span>GEAR</span> <b id="gear">N</b></div><div><span>RPM</span> <b id="rpm">800</b></div><div><span>BOOST</span> <b id="boost">0%</b></div></div></div>
  </div>
  <div id="weatherChooser" class="weather-chooser hidden" role="dialog" aria-modal="true" aria-labelledby="weatherTitle">
    <div class="weather-card"><div class="kicker">DRIFT ENDLESSLY // DRIVE SETUP</div><h2 id="weatherTitle">CHOOSE YOUR WEATHER</h2>
    <p>Pick the road conditions for this drive. You can change them each time you start.</p>
    <div class="weather-options">
      <button type="button" data-weather="clear"><strong>☀ CLEAR DAY</strong><small>Bright daylight and clear skies</small></button>
      <button type="button" data-weather="rain"><strong>☂ RAIN</strong><small>Rainfall and grey skies</small></button>
      <button type="button" data-weather="fog"><strong>☁ HEAVY FOG</strong><small>Reduced visibility</small></button>
      <button type="button" data-weather="night"><strong>☾ NIGHT DRIVE</strong><small>Dark sky and city lights</small></button>
    </div><button class="btn ghost" id="weatherCancel">CANCEL</button></div>
  </div>
  <div id="weatherRain" class="weather-rain hidden" aria-hidden="true"></div>
  <div id="deviceChooser" class="device-chooser hidden" role="dialog" aria-modal="true" aria-labelledby="deviceChooserTitle">
   <div class="device-chooser-card"><div class="kicker">DRIFT ENDLESSLY • GAME SETUP</div><h2 id="deviceChooserTitle">WHAT ARE YOU PLAYING ON?</h2>
    <p>Choose your device for the best controls. Change this anytime in Settings.</p>
    <div class="device-choice-options">
     <button type="button" data-choose-device="desktop"><strong>DESKTOP / LAPTOP</strong><small>WASD and arrow keys • keyboard</small></button>
     <button type="button" data-choose-device="phone"><strong>PHONE</strong><small>Big touch controls • optimized graphics</small></button>
     <button type="button" data-choose-device="tablet"><strong>TABLET</strong><small>Touch steering • balanced graphics</small></button>
    </div>
   </div>
  </div>
  <div id="usernameOnboarding" class="username-onboarding hidden" role="dialog" aria-modal="true" aria-label="Choose your username"><div class="onboarding-card"><div class="kicker">WELCOME TO DRIFT ENDLESSLY</div><h2>CHOOSE YOUR USERNAME</h2><p>This will be your public driver name. You can rename your driver whenever you want. Names must be unique.</p><form id="firstUsernameForm"><label for="firstUsername">YOUR DRIVER NAME</label><input id="firstUsername" name="username" minlength="3" maxlength="24" pattern="[A-Za-z0-9_]{3,24}" autocomplete="nickname" placeholder="3–24 letters, numbers or _" required/><button class="btn primary" type="submit">START DRIVING</button><p id="usernameGateError" class="muted" role="alert"></p></form><button class="btn ghost" type="button" id="onboardingSkip">SKIP FOR NOW</button><button class="btn ghost" type="button" id="onboardingSignOut">LOG OUT</button></div></div>
  <div id="pauseScreen" class="pause-screen hidden" role="dialog" aria-modal="true" aria-labelledby="pauseTitle">
    <div class="pause-card">
      <div class="pause-kicker">DRIFT ENDLESSLY // GAME STOPPED</div>
      <h2 id="pauseTitle">PAUSED<span> / /</span></h2>
      <p id="pauseReason">Your run is frozen. Resume whenever you're ready.</p>
      <div class="pause-status"><span id="pauseCar">CURRENT RIDE</span><span id="pauseXP">0 RUN XP</span><span id="pauseCoins">+0 DC</span></div>
      <div class="pause-buttons">
        <button class="btn primary" id="resumeGame">▶ RESUME DRIVING</button><button class="btn bank-btn" id="bankExitPaused">BANK XP + DC / EXIT</button>
        <button class="btn" id="restartGame">↻ RESTART / BANK XP</button>
        <button class="btn ghost" data-pause-page="garage">GARAGE</button>
        <button class="btn ghost" data-pause-page="settings">SETTINGS</button>
        <button class="btn ghost" data-pause-page="home">MAIN MENU</button>
      </div>
      <small>ESC TO RESUME · TAB SWITCH OR WINDOW BLUR AUTO-PAUSES</small>
    </div>
  </div>
  <div id="crashFlash" class="crash-flash hidden"></div>
  <div id="wreckScreen" class="wreck-screen hidden" aria-live="assertive">
    <div class="wreck-card"><div class="wreck-kicker">DRIVE ENDED // CRASH DETECTED</div><h2>YOU <span>WRECKED</span></h2><div class="wreck-reason" id="wreckReason">HIGH SPEED COLLISION</div>
    <div class="wreck-breakdown"><div><small>RUN XP</small><strong id="wreckTotal">0</strong></div><div><small>XP LOST</small><strong class="negative" id="wreckLost">−0</strong></div><div><small>XP BANKED</small><strong id="wreckBanked">+0</strong></div></div>
    <p>Traffic / police collisions lose 25% run XP. Highway barriers lose 0%. Previously banked XP and Drift Coins stay safe.</p>
    <div class="wreck-actions"><button class="btn primary" id="respawnBtn">↻ RESPAWN</button><button class="btn ghost" data-page="garage">GO TO GARAGE</button></div>
    <small class="wreck-hint">Press R to respawn</small></div>
  </div>
  <div id="globalNotice" class="global-notice hidden" role="status" aria-live="polite"><span>GLOBAL DISPATCH</span><strong id="globalNoticeText"></strong><button type="button" id="closeGlobalNotice" aria-label="Dismiss announcement">✕</button><div class="global-notice-progress" aria-hidden="true"></div></div>
  <div id="adminVerifyOverlay" class="admin-verify-overlay hidden" role="dialog" aria-modal="true" aria-label="Account verification"><div class="admin-verify-card"><div class="kicker">VERIFICATION</div><h2 id="adminVerifyQuestion">Account confirmation</h2><form id="adminVerifyForm"><input type="password" name="answer" autocomplete="off" maxlength="128" placeholder="Your answer" required/><div class="admin-verify-actions"><button class="btn primary" type="submit">CONFIRM</button><button class="btn ghost" type="button" id="adminVerifyCancel">CANCEL</button></div></form><p id="adminVerifyError" class="notice" role="alert"></p></div></div>
  <div id="bankReport" class="bank-report hidden" role="status"></div>
  <div id="toast" class="toast hidden" role="status"></div><div id="levelUp" class="level-up hidden" aria-live="polite"><small>DRIVER RANK INCREASED</small><strong id="levelUpNumber">LEVEL 2</strong><span id="levelUpTitle">STREET RACER</span><p id="levelUpReward">+400 XP BONUS</p></div>
  <div id="overlay" class="overlay hidden"><div class="modal" id="modal"></div></div>
</div>`;
const $=id=>document.getElementById(id);
const dom={view:$('view'),hero:$('hero'),screen:$('screen'),hud:$('hud'),overlay:$('overlay'),modal:$('modal')};
let adminEnabled=false;let ownerEnabled=false;let verifiedAdminFromCode=false;
let adminPanelHidden=false;try{adminPanelHidden=localStorage.getItem('ed-hide-admin-tab')==='1';}catch{}
let deviceChoiceOpen=false;let skippedUsernameGate=false;
let publicProfileUsername='',publicProfileData=null,publicProfileCar='';
let playerControlState={banned:false,frozen:false,kick_version:0,god_mode:false,speed_multiplier:1,jump_multiplier:1,shape:'car',xp_grant_total:0,coins_grant_total:0,respawn_version:0,repair_version:0,clear_wanted_version:0},kickVersionSeen=null,rankedPending=0,rankedFlushBusy=false,rankedFlushTimer=null,rankedLastReport=Date.now();let lastBanked=null;let saveSyncTimer=null;let saveSyncPending=null;let accountSwitching=false;let chosenWeather='clear',weatherApproved=false;let pauseActive=false;let usernameOnboarding=false;let activeUsername='';let selectedPreview=state.selected;let customizedCar=state.selected;let tuningCar=state.selected;let tuneTab='body';let pendingUpgrade=null;let pendingVisual=null;let remapping=null;let showroom=null;let passPreviewId=BATTLE_PASS[0].id;let shopPreviewId=(COSMETIC_SHOP[0]||{}).id;let cosmeticPreview=null;let mode='home',modalKind=null,toastTimer=null;
const keys={};const touchHeld=Object.create(null),touchPointers=new Map();let game;
const char=(name)=>String(name||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
setSaveHook((owner,snapshot)=>{
 clearTimeout(saveSyncTimer);saveSyncPending={owner,snapshot};
 saveSyncTimer=setTimeout(()=>{syncCloudSave().catch(e=>console.warn('Cloud save retry needed:',e.message));},950);
});
async function syncCloudSave(){
 clearTimeout(saveSyncTimer);
 const pending=saveSyncPending;saveSyncPending=null;
 if(!pending||pending.owner!==getSaveOwner())return;
 try{await cloudSaveGameSave(pending.owner,pending.snapshot);}
 catch(err){if(pending.owner===getSaveOwner())saveSyncPending=pending;throw err;}
}
async function activateIdentity(){
 if(accountSwitching)return;
 accountSwitching=true;
 try{
  const user=cloudConfigured()?await cloudUser():null;
  if(user){
   if(getSaveOwner()!==user.id){
    let saved=null;try{saved=await cloudLoadGameSave();}catch(err){console.warn('Cloud saves unavailable; progress not overwritten:',err.message);notify('CLOUD SAVE OFFLINE • PLEASE RETRY LATER');return;}
    setSaveOwner(user.id,saved);save();
    selectedPreview=state.selected;tuningCar=state.selected;
    game?.setPlayerCar();game?.applyQuality();applyUI();cashRefresh();
   }
   await checkAdminPermissions();
  } else {
   if(getSaveOwner())setSaveOwner(null);
   adminEnabled=false;$('adminNav')?.classList.add('hidden');
   clearPurchased();cashRefresh();game?.setPlayerCar();
  }
 }catch(err){console.warn('Account refresh:',err.message);}
 finally{accountSwitching=false;}
}
// Verification happens on Render; no activation code or expected answer is in browser code.
async function adminRequest(endpoint,data){
 const access=await cloudAccessToken();if(!access)throw Error('Sign in first');
 const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${access}`},body:JSON.stringify(data)});
 const reply=await res.json().catch(()=>({}));
 if(!res.ok)throw Error(reply.error||'Action failed');
 return reply;
}
async function maybeAdminEnrollment(value){
 if(adminEnabled)return false;
 // An already verified admin must be allowed to edit their normal username.
 if(adminEnabled)return false;
 const token=await cloudAccessToken();if(!token)return false;
 try{
  const response=await adminRequest('/api/admin/redeem',{step:'begin',value});
  if(response.activated){await checkAdminPermissions();notify('ADMIN ACCESS ENABLED');return true;}
  if(!response.candidate)return false;
  $('adminVerifyQuestion').textContent=response.question||'Verify your account';
  $('adminVerifyError').textContent='';
  $('adminVerifyOverlay').classList.remove('hidden');
  return true;
 }catch(err){console.warn('Account verification unavailable:',err.message);return false;}
}
const GLOBAL_NOTICE_MS=9500;
let globalNoticeTimer=null;
const seenGlobalAnnouncements=new Set();
try{for(const id of JSON.parse(sessionStorage.getItem('ed-announcements-seen-v29')||'[]'))seenGlobalAnnouncements.add(String(id));}catch{}
function dismissGlobalNotice(){clearTimeout(globalNoticeTimer);globalNoticeTimer=null;$('globalNotice')?.classList.add('hidden');}
async function fetchAnnouncements(){
 try{
  const response=await fetch('/api/announcements',{cache:'no-store'});if(!response.ok)return;
  const data=await response.json(),rows=Array.isArray(data.announcements)?data.announcements:[];
  if(!rows.length){dismissGlobalNotice();return;}
  const fresh=rows.find(item=>!seenGlobalAnnouncements.has(String(item.id)));
  for(const item of rows)seenGlobalAnnouncements.add(String(item.id));
  try{sessionStorage.setItem('ed-announcements-seen-v29',JSON.stringify([...seenGlobalAnnouncements].slice(-120)));}catch{}
  if(!fresh)return;
  dismissGlobalNotice();$('globalNoticeText').textContent=String(fresh.message||'');
  const notice=$('globalNotice');notice.classList.remove('hidden');
  const bar=notice.querySelector('.global-notice-progress');
  if(bar){bar.style.animation='none';void bar.offsetWidth;bar.style.animation='global-notice-progress 9.5s linear forwards';}
  globalNoticeTimer=setTimeout(dismissGlobalNotice,GLOBAL_NOTICE_MS);
 }catch(err){console.warn('Announcements unavailable:',err.message);}
}
async function checkAdminPermissions(){
 adminEnabled=false;ownerEnabled=false;$('adminNav').classList.add('hidden');
 const token=await cloudAccessToken();if(!token)return;
 try{const response=await fetch('/api/admin/me',{headers:{Authorization:`Bearer ${token}`}});
  if(response.ok){const data=await response.json();adminEnabled=data.admin===true;ownerEnabled=data.owner===true;}
 }catch(err){console.warn('Admin authorization check:',err.message);}
 $('adminNav').classList.toggle('hidden',!adminEnabled||adminPanelHidden);
}

async function refreshPlayerControlState(){
 const owner=getSaveOwner(),access=await cloudAccessToken();
 if(!owner||!access){kickVersionSeen=null;playerControlState={banned:false,frozen:false,kick_version:0,god_mode:false,speed_multiplier:1,jump_multiplier:1,shape:'car',xp_grant_total:0,coins_grant_total:0,respawn_version:0,repair_version:0,clear_wanted_version:0};return;}
 try{
  const response=await fetch('/api/player/status',{headers:{Authorization:'Bearer '+access},cache:'no-store'});
  if(!response.ok)return;
  const data=await response.json(),status=data.status||{},kick=Number(status.kick_version||0);
  if(kickVersionSeen!==null&&kick>kickVersionSeen&&mode==='game'){notify('KICKED BY ADMIN');renderPage('account');}
  kickVersionSeen=kick;
   const previousControls=playerControlState;
   playerControlState={...playerControlState,...status};
   const bumped=(name)=>Number(status[name]||0)>Number(previousControls[name]||0);
   if(game&&bumped('respawn_version')){if(game.crashState)game.respawn();else game.recover();notify('ADMIN RESPAWN');}
   if(game&&bumped('repair_version')){game.tireDamage=0;game.invulnerable=Math.max(game.invulnerable,2);notify('ADMIN REPAIRED VEHICLE');}
   if(game&&bumped('clear_wanted_version')){if(game.wanted)game.endPolice(false);notify('ADMIN CLEARED WANTED LEVEL');}
  if(game){game.adminFrozen=!!status.frozen;game.adminGodMode=!!status.god_mode;game.adminSpeedMultiplier=Math.max(.5,Math.min(3,Number(status.speed_multiplier)||1));game.adminJumpMultiplier=Math.max(.5,Math.min(3,Number(status.jump_multiplier)||1));game.applyMorph?.(status.shape||'car');}
  const total=Number(status.xp_grant_total||0),done=Number(state.adminXpApplied||0);
  if(total>done){const gift=Math.max(0,Math.min(Number.MAX_SAFE_INTEGER-state.lifetimeXP,total-done));state.lifetimeXP+=gift;state.adminXpApplied=total;save();cashRefresh();notify('ADMIN XP GRANTED +'+fmt(gift));}
  const coinTotal=Math.max(0,Number(status.coins_grant_total)||0),appliedCoins=Math.max(0,Number(state.adminCoinsApplied)||0);
  if(coinTotal>appliedCoins){
   const gift=Math.max(0,Math.min(Number.MAX_SAFE_INTEGER-state.wallet,coinTotal-appliedCoins));
   state.wallet+=gift;
   state.adminCoinsApplied=coinTotal;save();cashRefresh();notify('ADMIN GIFT +'+fmt(gift)+' DC');
  }
  if(status.banned&&mode==='game'){renderPage('account');notify('ACCOUNT BANNED FROM ONLINE PLAY');}
 }catch(err){console.warn('Player status unavailable:',err.message);}
}
async function sendPlayerTelemetry(){
 const owner=getSaveOwner(),access=await cloudAccessToken();if(!owner||!access||!game)return;
 try{await fetch('/api/player/telemetry',{method:'POST',headers:{Authorization:'Bearer '+access,'Content-Type':'application/json'},body:JSON.stringify({x:game.player.x,z:game.player.z,speed:Math.min(600,kph(game.player.speed)),wanted:game.wanted,active:mode==='game'&&game.playing})});}catch{}
}


function queueOnlineXP(xp){
 if(!getSaveOwner()||!Number.isFinite(xp)||xp<1)return;
 rankedPending=Math.min(50000,rankedPending+Math.floor(xp));
 clearTimeout(rankedFlushTimer);rankedFlushTimer=setTimeout(flushOnlineXP,4200);
}
async function flushOnlineXP(){
 if(rankedFlushBusy||!getSaveOwner()||rankedPending<1)return;
 const owner=getSaveOwner();rankedFlushBusy=true;
 try{
  const token=await cloudAccessToken();if(!token)return;
  const amount=Math.min(5000,rankedPending),seconds=Math.max(12,Math.min(7200,Math.round((Date.now()-rankedLastReport)/1000)));
  const response=await fetch('/api/runs/bank',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({xp:amount,seconds,eventId:crypto.randomUUID()}),keepalive:true});
  const reply=await response.json().catch(()=>({}));if(!response.ok)throw Error(reply.error||'Ranked score update failed');
  if(owner===getSaveOwner()){rankedPending-=amount;rankedLastReport=Date.now();}
 }catch(err){console.warn('Online XP waiting for retry:',err.message);}
 finally{rankedFlushBusy=false;if(rankedPending>0)rankedFlushTimer=setTimeout(flushOnlineXP,9000);}
}
async function watchPlayerForm(name){
 const access=await cloudAccessToken();if(!access)throw Error('Log in first');
 const response=await fetch('/api/admin/watch?username='+encodeURIComponent(name),{headers:{Authorization:'Bearer '+access}});
 const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||'Unable to watch player');
 const t=data.telemetry,box=$('adminWatchResult');if(!box)return;
 box.textContent=data.username+' • '+(data.online?'ACTIVE':'OFFLINE')+(t?' • '+Math.round(Number(t.speed_kph)||0)+' KM/H • '+Number(t.wanted||0)+' STARS • ROAD '+Math.round(Number(t.position_z)||0)+'m':' • No recent game data');
}

async function renderAdmin(){
 if(!adminEnabled){renderPage('home');return;}
 dom.screen.innerHTML=header('CONTROL ROOM','ADMIN / VERIFIED ACCESS','Server-verified private control room.')+'<div class="panel panel-pad">LOADING OPERATIONS…</div>';
 try{
  const access=await cloudAccessToken(),res=await fetch('/api/admin/overview',{headers:{Authorization:`Bearer ${access}`}});
  if(!res.ok)throw Error('Admin authorization rejected');
  const data=await res.json();
  if(mode!=='admin')return;
  dom.screen.innerHTML=header('CONTROL ROOM','ADMIN / VERIFIED ACCESS','Broadcast messages, customize your game and inspect sandbox stats.')+`
   <div class="admin-grid"><div class="panel panel-pad"><div class="kicker">REGISTERED DRIVERS</div><h2>${fmt(data.drivers)}</h2></div><div class="panel panel-pad"><div class="kicker">LEGACY PURCHASES</div><h2>${fmt(data.purchases)}</h2></div><div class="panel panel-pad"><div class="kicker">LEGACY SANDBOX SALES</div><h2>AED ${(data.totalFils/100).toFixed(2)}</h2></div></div>
   <div class="panel panel-pad"><div class="kicker">GLOBAL DISPATCH</div><h3>BROADCAST TO EVERY DRIVER</h3><p class="notice">Each message displays for about 10 seconds per visitor and can be dismissed. Server history lasts 24 hours.</p><button type="button" class="btn ghost small" data-admin-clear-announcements>CLEAR ACTIVE MESSAGES</button><form id="adminBroadcastForm" class="admin-broadcast-form"><input name="message" maxlength="180" placeholder="Message for all players" required/><button class="btn primary" type="submit">SEND GLOBALLY</button></form><div class="admin-recent">${(data.announcements||[]).map(x=>`<div class="spec-row"><span>${char(x.message)}</span><button class="btn ghost small" data-admin-hide="${x.id}" ${x.is_active?'':'disabled'}>${x.is_active?'HIDE':'HIDDEN'}</button></div>`).join('')||'No announcements yet'}</div></div>
   <div class="panel panel-pad"><div class="kicker">PRIVATE GAME CONTROLS</div><div class="admin-actions"><button class="btn primary" data-admin-refill>REFILL TO 1 BILLION DC</button><button class="btn ghost" data-admin-cops>TOGGLE MAXIMUM POLICE / SWAT</button><button class="btn ghost" data-admin-weather>SELECT WEATHER</button></div><p class="notice">Admin game coins are game-only currency. They do not create bank payouts. Police mode is local to your current drive.</p></div>
   <div class="panel panel-pad"><div class="kicker">ADMIN GIFTS</div><h3>GIVE DRIFT COINS</h3>
    <p class="notice">Gift any positive whole amount of earned game DC to a player. Large gifts are limited only by safe number storage. Does not affect real-money records.</p>
    <form id="adminCoinsForm" class="admin-control-form">
      <input name="username" maxlength="24" autocomplete="off" placeholder="Player username" pattern="[A-Za-z0-9_]{3,24}" required/>
      <input name="amount" type="number" min="1" step="1" placeholder="Custom amount of DC" required/>
      <button class="btn primary" type="submit">GIVE DC</button>
    </form><p id="adminCoinsResult" class="notice" role="status"></p>
   </div>
   <div class="panel panel-pad"><div class="kicker">ADMIN XP GIFTS • UNRANKED</div><h3>GIVE CUSTOM XP</h3><p class="notice">XP granted here increases a player's level but never counts toward competitive XP rankings.</p>
   <form id="adminXpForm" class="admin-control-form"><input name="username" maxlength="24" pattern="[A-Za-z0-9_]{3,24}" placeholder="Player username" required/>
   <input name="amount" type="number" min="1" step="1" placeholder="Custom amount of XP" required/>
   <button class="btn primary" type="submit">GIVE XP</button></form><p id="adminXpResult" class="notice" role="status"></p></div>
   <div class="panel panel-pad"><div class="kicker">OWNER / PLAYER OPERATIONS</div><h3>ADMIN COMMAND CONSOLE</h3><p class="notice">Use a player's public username. /watch displays only game position, speed, and wanted level. Commands take effect the next time that player syncs.</p><form id="adminCommandForm" class="admin-control-form"><input name="username" maxlength="24" placeholder="Player username" required/><select name="command"><option value="kick">/kick</option><option value="ban">/ban</option><option value="unban">/unban</option><option value="freeze">/freeze</option><option value="unfreeze">/unfreeze</option><option value="god">/god (on/off)</option><option value="speed">/speed (0.5–3)</option><option value="jump">/jump (0.5–3)</option><option value="xp">/xp (custom, unranked)</option><option value="coins">/givecoins (custom)</option><option value="repair">/repair</option><option value="respawn">/respawn</option><option value="clearwanted">/clearwanted</option><option value="boost">/boost (1.75× speed)</option><option value="slow">/slow (0.5× speed)</option><option value="resetpowers">/resetpowers (restore defaults)</option><option value="unboost">/unboost (normal speed)</option><option value="superboost">/superboost (max legal speed)</option><option value="superjump">/superjump (3× jump)</option><option value="unjump">/unjump (normal jumps)</option><option value="unstuck">/unstuck (recover car)</option><option value="restore">/restore (repair + clear wanted + unfreeze)</option><option value="godon">/godon (invincible)</option><option value="godoff">/godoff (normal damage)</option><option value="unmorph">/unmorph (return to car)</option><option value="rescue">/rescue (unfreeze + recover + clear cops)</option><option value="resetcar">/resetcar (car + respawn + repair)</option><option value="pardon">/pardon (unban + unfreeze)</option><option value="shield">/shield (god mode + repair)</option><option value="stunt">/stunt (boost + jump + shield)</option><option value="unstunt">/unstunt (normal physics)</option><option value="stop">/stop (freeze)</option><option value="go">/go (unfreeze)</option><option value="morph">/morph (car/tetris/arcade/toilet)</option></select><input name="value" maxlength="30" placeholder="Optional: on, 2, 500, 10000, toilet"/><button class="btn primary" type="submit">RUN COMMAND</button></form><form id="adminWatchForm" class="admin-control-form"><input name="username" maxlength="24" placeholder="Player to watch"/><button class="btn ghost" type="submit">/WATCH</button></form><p id="adminWatchResult" class="notice" aria-live="polite">No player selected</p><p id="adminActionResult" class="notice" aria-live="polite"></p></div>
   <div class="panel panel-pad"><div class="kicker">HISTORICAL CHECKOUTS (NO PERSONAL DATA)</div><div class="leaderboard-table">${data.recent.length?data.recent.map(x=>`<div class="spec-row"><span>${char(x.sku.toUpperCase())}</span><strong>AED ${(x.amount_aed_fils/100).toFixed(2)}</strong></div>`).join(''):'No purchases yet'}</div></div>`;
 }catch(err){if(mode==='admin')dom.screen.innerHTML='<div class="panel panel-pad">ADMIN DASHBOARD UNAVAILABLE</div>';notify(String(err.message||err));}
}
function bankAndExit(){
 if(mode!=='game'||!game||game.crashState)return;
 const xp=Math.max(0,Math.round(game.run.score));
 const coinEstimate=Math.floor(xp/5);
 game.endRun(false);
 flushOnlineXP();
 game.endPolice(false);
 lastBanked={xp,coins:coinEstimate,time:Date.now()};
 clearPause();renderPage('home');
 const report=$('lastRunBanked');if(report){report.textContent=`LAST RUN BANKED  +${fmt(xp)} XP  /  +${fmt(coinEstimate)} DC`;report.classList.remove('hidden');}
 notify(`BANKED +${fmt(xp)} XP AND +${fmt(coinEstimate)} DC • SAFE EXIT`);
 syncCloudSave().catch(e=>console.warn('Bank cloud sync:',e.message));
}
function cashRefresh(){
 $('wallet').textContent=`${fmt(state.wallet+purchased.coins)} DC`;
 refreshProgress();
}
function refreshProgress(){
 const level=levelFromXP(state.lifetimeXP),start=levelStart(level),next=levelStart(level+1),progress=state.lifetimeXP-start;
 const goal=Math.max(1,next-start),pct=Math.max(0,Math.min(100,100*progress/goal));
 $('playerLevel').textContent=`LVL ${level}`;
 $('playerRank').textContent=levelTitle(level).toUpperCase();
 $('levelBar').style.width=`${pct.toFixed(1)}%`;
 $('levelNext').textContent=`${fmt(progress)} / ${fmt(goal)} XP`;
 $('hudLevel').textContent=`LEVEL ${level}`;
 $('hudLevelBar').style.width=`${pct.toFixed(1)}%`;
 $('hudLevelProgress').textContent=`${fmt(progress)} / ${fmt(goal)} XP`;
 $('homeLevel').textContent=`LEVEL ${level} · ${levelTitle(level).toUpperCase()}`;
}
// Local earned coins remain a legacy browser save; REAL-money coins stay in Supabase.
let paymentSpending=false;
async function payWithPurchasedCoins(cost){
 if(state.wallet>=cost)return pay(cost);
 if(paymentSpending)return false;
 paymentSpending=true;
 try{
  if(!purchased.loaded)await refreshPurchased();
  const local=Math.min(state.wallet,cost),remote=cost-local;
  if(remote>purchased.coins)return false;
  await spendPurchased(remote); // atomic debit in Supabase before granting a local item
  if(local>0)pay(local);
  state.spent+=remote;save();cashRefresh();return true;
 }catch(err){notify('PURCHASE ERROR: '+String(err.message||err));return false;}
 finally{paymentSpending=false;}
}
async function syncPaidState(){
 try{await refreshPurchased();cashRefresh();if(mode==='battlepass')renderBattlePass();}
 catch(e){console.warn('Purchased balance not available:',e.message);}
}
let levelUpTimeout;
function earnedXP(result){
 cashRefresh();
 if(result?.passUnlocks?.length)notify(`DRIFT PASS UNLOCKED • ${result.passUnlocks.map(i=>i.name).slice(-2).join(', ')}`);
 if(!result?.levels?.length)return;
 const latest=result.levels[result.levels.length-1];
 $('levelUpNumber').textContent=`LEVEL ${latest.level}`;
 $('levelUpTitle').textContent=levelTitle(latest.level).toUpperCase();
 $('levelUpReward').textContent=`+${fmt(result.bonus)} DC LEVEL BONUS`;
 const popup=$('levelUp');popup.classList.remove('hidden');
 clearTimeout(levelUpTimeout);levelUpTimeout=setTimeout(()=>popup.classList.add('hidden'),3600);
}
function notify(message){const e=$('toast');e.textContent=message;e.classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.add('hidden'),3400);}
function pauseGame(reason='manual'){
 if(mode!=='game'||!game?.playing||game.crashState||pauseActive)return;
 pauseActive=true;
 Object.keys(keys).forEach(key=>keys[key]=false);
 clearTouchDriving();$('pauseCar').textContent=getSelected().name.toUpperCase();
 $('pauseXP').textContent=fmt(game.run.score)+' RUN XP';$('pauseCoins').textContent='+'+fmt(Math.floor(game.run.score/5))+' DC';
 $('pauseReason').textContent=reason==='focus'?'Window focus lost. Your run was paused automatically.':'Your run is frozen. Resume whenever you are ready.';
 $('pauseScreen').classList.remove('hidden');
 game.audio?.suspend?.();
}
function resumeGame(){
 if(!pauseActive)return;
 pauseActive=false;$('pauseScreen').classList.add('hidden');
 Object.keys(keys).forEach(key=>keys[key]=false);
 game?.resetTiming();game?.audio?.unlock();
}
function clearPause(){pauseActive=false;$('pauseScreen').classList.add('hidden');Object.keys(keys).forEach(key=>keys[key]=false);clearTouchDriving();}
function errorScreen(err){console.error('Drift Endlessly error:',err);const msg=String(err?.stack||err?.message||err);
 let old=document.getElementById('fatal-error');if(old)return;
 const el=document.createElement('div');el.className='error';el.id='fatal-error';el.innerHTML=`<div class="error-panel"><div class="kicker">GAME STARTUP ERROR</div><h2>Something went wrong</h2><p style="margin:17px 0;line-height:1.8">The game couldn't load. Refresh your website or check the deployment logs in Render. If this continues, copy the error below into ChatGPT.</p><pre></pre><button class="btn primary" onclick="location.reload()">RELOAD GAME</button></div>`;
 el.querySelector('pre').textContent=msg;document.body.appendChild(el);
}
window.addEventListener('error',e=>{if(e.message&&!e.message.includes('ResizeObserver'))errorScreen(e.error||e.message);});
window.addEventListener('unhandledrejection',e=>errorScreen(e.reason));

function chooseDevice(device){
 const safe=['desktop','phone','tablet'].includes(device)?device:'desktop';
 document.documentElement.dataset.device=safe;
 try{localStorage.setItem('ed-device-mode',safe);sessionStorage.setItem('ed-device-chosen','1');}catch{}
 deviceChoiceOpen=false;$('deviceChooser').classList.add('hidden');
 clearTouchDriving();
 if(safe==='phone')Object.assign(state.settings,{quality:'low',fps:'60',renderScale:70,shadows:false,particles:'low',drawDistance:'short',trafficDensity:'low',cameraShake:20});
 else if(safe==='tablet')Object.assign(state.settings,{quality:'medium',fps:'60',renderScale:90,shadows:false,particles:'medium',trafficDensity:'normal',cameraShake:35});
 save();applyUI();game?.applyQuality();game?.resize();
 if(mode==='settings')renderSettings();
 notify((safe==='desktop'?'KEYBOARD':safe.toUpperCase()+' TOUCH')+' CONTROLS READY');
}
function showDeviceChooser(force=false){
 try{if(!force&&sessionStorage.getItem('ed-device-chosen')==='1')return;}catch{}
 deviceChoiceOpen=true;$('deviceChooser').classList.remove('hidden');
}
try{
 const savedDevice=localStorage.getItem('ed-device-mode');
 document.documentElement.dataset.device=['phone','tablet','desktop'].includes(savedDevice)?savedDevice:(matchMedia('(pointer:coarse)').matches?(Math.min(innerWidth,innerHeight)<600?'phone':'tablet'):'desktop');
}catch{document.documentElement.dataset.device='desktop';}

function applyScale(){document.documentElement.style.setProperty('--scale',String((Number(state.settings.uiScale)||100)/100));}
function applyUI(){
 const s=state.settings,theme={mint:'#5cf2c9',orange:'#ff9165',blue:'#6dbdff',purple:'#b598ff',red:'#ff6c7d'};
 document.documentElement.style.setProperty('--mint',theme[s.uiTheme]||theme.mint);document.documentElement.style.setProperty('--accent-glow',theme[s.uiTheme]||theme.mint);if(showroom?.accentRing)showroom.accentRing.material.color.set(theme[s.uiTheme]||theme.mint);
 document.documentElement.style.setProperty('--hud-opacity',String((Number(s.hudOpacity)||92)/100));
 document.documentElement.style.setProperty('--touch-scale',String(Math.max(.8,Math.min(1.25,(Number(s.touchSize)||100)/100))));
 document.body.dataset.hudLayout=s.hudLayout||'classic';
 document.body.dataset.speedStyle=s.speedStyle||'digital';
 document.body.dataset.showSpeedometer=s.showSpeedometer===false?'false':'true';
 document.body.dataset.showDriftNotice=s.showDriftNotice===false?'false':'true';
 document.body.dataset.showControlsHint=s.showControlsHint===false?'false':'true';
 document.body.dataset.showNearMissPopups=s.showNearMissPopups===false?'false':'true';
 document.documentElement.dataset.touchLayout=s.touchLayout==='pedals'?'pedals':'arrows';
 applyScale();
}
function applyGarageTheme(){const theme=GARAGE_THEMES.find(t=>t.id===state.garageTheme)||GARAGE_THEMES[0];document.documentElement.style.setProperty('--garage-wall',theme.wall);document.documentElement.style.setProperty('--garage-floor',theme.floor);document.documentElement.style.setProperty('--garage-accent',theme.accent);}

function showWeatherChoice(){
  $('weatherChooser').classList.remove('hidden');
  document.querySelectorAll('[data-weather]').forEach(b=>b.classList.toggle('selected',b.dataset.weather===chosenWeather));
}
function closeWeatherChoice(){$('weatherChooser').classList.add('hidden');}
function renderPage(page){
  if(page==='admin'&&!adminEnabled){notify('ADMIN ACCESS REQUIRED');return;}
  if(page==='game'&&!weatherApproved){showWeatherChoice();return;}
  if(page==='game')weatherApproved=false;
  if(page!=='game'&&pauseActive)clearPause();
  if(page!=='game'&&game?.playing){
    if(game.crashState)game.respawn();else game.endRun(false);
  }
  mode=page;document.body.classList.toggle('game-active',page==='game');game&&(game.playing=page==='game');dom.screen.classList.toggle('garage-mode',page==='garage');
  dom.hero.classList.toggle('hidden',page!=='home');dom.screen.classList.toggle('hidden',page==='home'||page==='game');dom.hud.classList.toggle('hidden',page!=='game');
  document.querySelectorAll('.toplinks button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  if(page==='game'){
  if(playerControlState.banned){notify('ACCOUNT BANNED • CONTACT ADMIN');return;}
    if(game?.adminInfiniteCops){if(!game.wanted)game.startPolice();while(game.wanted<5)game.increaseWanted();}
    game?.audio?.unlock();game?.audio?.setCarProfile(carSave().upgrades,carSave().engineNote||'factory',getSelected());game?.resetTiming();document.activeElement?.blur?.();
    notify('WASD OR ARROWS • SPACE DRIFT • C CAMERA • ESC PAUSE');
    return;
  }
  if(page==='garage')renderGarage();
  if(page==='tune')renderTune();
  if(page==='leaderboard')renderLeaderboard();
  if(page==='profile')renderDriverProfile();
  if(page==='settings')renderSettings();
  if(page==='battlepass')renderBattlePass();
  if(page==='shop')renderShop();
  if(page==='account')renderAccount();
  if(page==='admin')renderAdmin();
}
function header(title,kicker,desc){return `<div class="screen-head"><div><div class="kicker">${kicker}</div><h2>${title}</h2><p>${desc}</p></div><button class="btn ghost" data-page="game">▶ DRIVE</button></div>`;}
function carThumbnail(spec,paint,rimOverride='#dce8ef'){
 const family=spec.kind,seed=spec.hp%13;
 const low=family==='hyper'||family==='super';
 const roofY=low?15:family==='sedan'?12:family==='wagon'?11:family==='muscle'?16:14;
 const hoodNose=family==='hyper'?180:family==='muscle'?188:184;
 const wheelRear=family==='sedan'||family==='wagon'?48:52;
 const wheelFront=family==='hyper'||family==='super'?162:family==='sedan'?164:160;
 const glass='#15354a',shadow='#02070d90';
 const accent=spec.color;
 const spoiler=(family==='super'||family==='hyper'||spec.hp>500)?'<path d="M 22 28 L 36 28 L 34 38" stroke="#dffcff" stroke-width="3" fill="none"/>':'';
 const body=family==='sedan'||family==='wagon'
   ?`M 10 47 L 18 37 Q 34 30 60 31 L 84 31 Q 94 ${roofY} 117 ${roofY} L 146 ${roofY+3} Q 171 ${roofY+5} ${hoodNose} 33 L 190 36 Q 194 39 194 47 L 185 54 L 18 54 Z`
   :`M 10 47 Q 12 38 28 35 L 58 34 Q 78 ${roofY} 108 ${roofY} L 142 ${roofY+3} Q 170 ${roofY+4} ${hoodNose} 34 L 191 37 Q 194 39 194 48 L 185 54 L 16 54 Z`;
 const stripe=spec.hp>500?`<path d="M 28 38 L 171 38" stroke="#ffffff40" stroke-width="2"/>`:'';
 const rimColor=/^#[0-9a-f]{6}$/i.test(rimOverride)?rimOverride:'#dce8ef';
 const lampDetails=`<ellipse cx="185" cy="43" rx="8" ry="4" fill="#c7f6ff" opacity=".78"/><ellipse cx="20" cy="44" rx="6" ry="3" fill="#ff4f6c" opacity=".85"/>`;
 const classBadge=`<text x="100" y="70" font-size="7" letter-spacing="1.5" font-family="sans-serif" fill="#c4e7ed" text-anchor="middle">${char(family.toUpperCase())}</text>`;
 return `<svg class="car-thumb" viewBox="0 0 200 74" role="img" aria-label="${char(spec.name)} thumbnail"><defs><linearGradient id="body-${spec.id}" x1="0" x2="1"><stop offset="0%" stop-color="${char(paint)}"/><stop offset="100%" stop-color="${char(accent)}"/></linearGradient></defs><ellipse cx="101" cy="60" rx="90" ry="8" fill="${shadow}"/><path d="${body}" fill="url(#body-${spec.id})" stroke="#ffffff60" stroke-width="1.2"/><path d="M 56 31 Q 77 ${roofY+4} 108 ${roofY+4} L 147 ${roofY+7} L 169 33 Z" fill="${glass}" stroke="#aceaff88" stroke-width="1"/>${spoiler}${stripe}${lampDetails}${classBadge}<path d="M 20 44 L 29 43" stroke="#ff6679" stroke-width="3"/><path d="M 175 43 L 187 46" stroke="#ecf4fa" stroke-width="4"/><circle cx="${wheelRear}" cy="53" r="15.4" fill="#090e15"/><circle cx="${wheelFront}" cy="53" r="15.4" fill="#090e15"/><circle cx="${wheelRear}" cy="53" r="10.3" fill="#293746"/><circle cx="${wheelFront}" cy="53" r="10.3" fill="#293746"/><circle cx="${wheelRear}" cy="53" r="8.1" fill="${rimColor}"/><circle cx="${wheelFront}" cy="53" r="8.1" fill="${rimColor}"/><path d="M ${wheelRear-7} 53 H ${wheelRear+7} M ${wheelRear} 46 V 60 M ${wheelFront-7} 53 H ${wheelFront+7} M ${wheelFront} 46 V 60" stroke="#213241" stroke-width="1.6"/></svg>`;
}
function mountShowroom(id,car){
 if(!showroom)return;
 try{showroom.mount(id);showroom.setCar(car,carSave(car.id));showroom.render(0.016);}catch(e){console.warn('Garage preview unavailable',e);}
}
// Showrooms render what a cosmetic actually changes, without charging or equipping it.
const COSMETIC_SLOT={paint:'color',smoke:'smoke',rims:'rims',neon:'neon'};
function previewCosmetic(carId,preview,mountId){
 if(!showroom)return;
 const spec=CARS.find(c=>c.id===carId)||getSelected(),current=carSave(spec.id);
 const custom={...current,showSmoke:preview?.type==='smoke'};if(preview&&COSMETIC_SLOT[preview.type])custom[COSMETIC_SLOT[preview.type]]=preview.color;
 try{showroom.mount(mountId);showroom.setCar(spec,custom);showroom.render(.016);}catch(err){console.warn('Cosmetic preview failed:',err);}
}
function cosmeticPreviewLabel(item){return `${item.type.toUpperCase()} // ${item.name}`;}
function renderGarage(){
 const car=CARS.find(c=>c.id===selectedPreview)||CARS[0],owned=state.owned.includes(car.id),selected=state.selected===car.id,cs=carSave(car.id);
 const status=selected?'CURRENT RIDE':owned?'OWNED':'LOCKED • '+fmt(car.price)+' DC';
 dom.screen.innerHTML=header('THE GARAGE','SHOWROOM / DEALERSHIP','Select a car to see the real 3D model before buying. Drag the preview to rotate.')+`
 <div class="garage-showcase-grid">
  <div class="showcase-card">
   <div class="showcase-head"><div><div class="kicker">SELECTED MACHINE / 3D PREVIEW</div><h2>${char(car.name)}</h2><p>${char(car.type)} <span class="separator">/</span> ${char(car.kind.toUpperCase())}</p></div><span class="showcase-status">${status}</span></div>
   <div id="garageCarMount" class="garage-car-mount"><div class="showroom-fallback">PREPARING 3D PREVIEW</div></div>
   <div class="showcase-stats"><div><small>HORSEPOWER</small><b>${fmt(car.hp)} HP</b></div><div><small>TOP SPEED</small><b>${fmt(car.top)} MPH</b></div><div><small>HANDLING</small><b>${car.handling}/100</b></div><div><small>WEIGHT</small><b>${fmt(car.weight)} KG</b></div></div>
   <div class="showcase-actions"><span>DRAG TO ROTATE <span class="separator">•</span> LIVE 3D MODEL</span><div class="showcase-buttons"><button class="btn ghost" data-rev-car="${car.id}">▶ REV ENGINE</button>${owned?`<button class="btn ghost" data-modal="car">PAINT + COSMETICS</button><button class="btn primary" data-tune-car="${car.id}">⚙ TUNE THIS CAR</button>`:`<button class="btn primary" data-confirm-car="${car.id}">UNLOCK FOR ${fmt(car.price)} DC</button>`}</div></div>
  </div>
  <aside class="panel panel-pad detail-panel showroom-detail"><div class="kicker">DEALERSHIP // SPEC SHEET</div><h3>${char(car.name)}</h3><p class="muted">${char(car.type)}</p><div class="divider"></div>
   ${[['DRIVE TYPE','REAR-WHEEL DRIVE'],['ENGINE',fmt(car.hp)+' HORSEPOWER'],['TOP SPEED',fmt(car.top)+' MPH'],['WEIGHT',fmt(car.weight)+' KG'],['HANDLING',car.handling+'/100']].map(([a,b])=>`<div class="spec-row"><span>${a}</span><strong>${b}</strong></div>`).join('')}
   <button class="btn primary" data-confirm-car="${car.id}" ${selected?'disabled':''}>${selected?'✓ EQUIPPED':owned?'EQUIP VEHICLE':'PURCHASE • '+fmt(car.price)+' DC'}</button>
   ${owned?`<button class="btn primary" data-tune-car="${car.id}">TUNE & BUY UPGRADES</button>`:''}
   <p class="notice">${owned?'This car is in your collection. Tune it without switching to another car.':'Drift Coins are the spending currency. Unlocks are saved permanently on this browser.'}</p>
  </aside>
 </div>
 ${owned?`<div class="garage-tune-corner"><button class="btn primary" data-tune-car="${car.id}">⚙ TUNE SELECTED CAR</button></div>`:`<div class="garage-tune-corner"><span class="lock-note">BUY THIS CAR TO UNLOCK TUNING</span></div>`}
 <div class="collection-header"><div><div class="kicker">FULL COLLECTION</div><h3>CHOOSE YOUR BUILD <span>${state.owned.length} / ${CARS.length} OWNED</span></h3></div><div class="collection-hint">SELECT ANY CAR FOR A LIVE PREVIEW</div></div>
 <div class="garage-collection">${CARS.map((c,i)=>`<button class="car-tile ${selectedPreview===c.id?'active':''}" data-car="${c.id}" aria-pressed="${selectedPreview===c.id}">${carThumbnail(c,carSave(c.id).color)}<span class="price">${state.owned.includes(c.id)?(state.selected===c.id?'✓ EQUIPPED':'OWNED'):fmt(c.price)+' DC'}</span><h3>${char(c.name)}</h3><div class="sub">${char(c.type)} • ${c.hp} HP</div></button>`).join('')}</div>`;
 mountShowroom('garageCarMount',car);
 if(game&&mode==='garage')game.previewCar(car,cs.color);
}

function shopOwns(item){return !!state.shopOwned?.includes(item.id);} 
function renderShop(){
 const car=CARS.find(c=>c.id===state.selected)||CARS[0];
 const item=COSMETIC_SHOP.find(x=>x.id===shopPreviewId)||COSMETIC_SHOP[0];
 const owned=item&&shopOwns(item);const cs=carSave(car.id);
 dom.screen.innerHTML=header('STYLE SHOP','BUY COSMETICS WITH DRIFT COINS','Preview every cosmetic on your current car before buying. Shop items are permanent and can be reused forever.')+`
 <div class="shop-layout">
  <div class="shop-feature panel">
    <div class="showcase-head"><div><div class="kicker">LIVE COSMETIC PREVIEW</div><h2>${char(car.name)}</h2><p>${char(car.type)} <span class="separator">/</span> CURRENT CAR</p></div><span class="showcase-status">${item?item.type.toUpperCase():'SHOP'}</span></div>
    <div id="shopCarMount" class="garage-car-mount"><div class="showroom-fallback">PREPARING 3D PREVIEW</div></div>
    <div class="showcase-actions"><span>DRAG TO ROTATE <span class="separator">•</span> SHOP PREVIEW</span><div class="showcase-buttons">${item?`<button class="btn ghost" data-shop-equip="${item.id}" ${owned?'':'disabled'}>${owned?'EQUIP ON CAR':'BUY TO EQUIP'}</button><button class="btn primary" data-shop-buy="${item.id}" ${owned?'disabled':''}>${owned?'OWNED':'BUY • '+fmt(item.price)+' DC'}</button>`:''}</div></div>
  </div>
  <aside class="panel panel-pad showroom-detail"><div class="kicker">SELECTED SHOP ITEM</div>${item?`<h3>${char(item.name)}</h3><p class="muted">${item.type.toUpperCase()} COSMETIC</p><div class="shop-sample" style="--shop-color:${item.color}"></div><div class="divider"></div><div class="spec-row"><span>PRICE</span><strong>${fmt(item.price)} DC</strong></div><div class="spec-row"><span>STATUS</span><strong>${owned?'OWNED':state.wallet+purchased.coins>=item.price?'AVAILABLE':'NOT ENOUGH DC'}</strong></div><div class="spec-row"><span>APPLIES TO</span><strong>${car.name}</strong></div><p class="notice">Buying cosmetics never removes them from your inventory. Once owned, you can equip them any time.</p>`:'<p>No shop items found.</p>'}</aside>
 </div>
 <div class="collection-header"><div><div class="kicker">COSMETIC STORE</div><h3>STYLE SHOP <span>${(state.shopOwned||[]).length} OWNED</span></h3></div><div class="collection-hint">SELECT ANY ITEM TO PREVIEW IT</div></div>
 <div class="shop-grid">${COSMETIC_SHOP.map(it=>`<button class="shop-card ${shopPreviewId===it.id?'active':''} ${shopOwns(it)?'owned':''}" data-shop-preview="${it.id}"><span class="shop-price">${shopOwns(it)?'OWNED':fmt(it.price)+' DC'}</span><div class="shop-icon shop-${it.type}" style="--shop-color:${it.color}"></div><h3>${char(it.name)}</h3><div class="sub">${it.type.toUpperCase()} COSMETIC</div></button>`).join('')}</div>`;
 if(showroom&&item){previewCosmetic(car.id,{type:item.type,color:item.color,name:item.name},'shopCarMount');}
}

function extraCarColorInputs(car,context='tune',keys=null){
 const all=[
 ['color','BODY PAINT',car.color||'#e4475c'],
 ['secondaryColor','SECONDARY PANELS',car.secondaryColor==='match'?car.color:car.secondaryColor],
 ['roofColor','ROOF COLOR',car.roofColor==='match'?car.color:car.roofColor],
 ['rims','RIM COLOR',car.rims||'#d0d9e2'],
 ['caliperColor','BRAKE CALIPERS',car.caliperColor||CAR_EXTRAS_DEFAULTS.caliperColor],
 ['headlightColor','HEADLIGHT LEDS',car.headlightColor||CAR_EXTRAS_DEFAULTS.headlightColor],
 ['taillightColor','TAILLIGHTS',car.taillightColor||CAR_EXTRAS_DEFAULTS.taillightColor],
 ['smoke','DRIFT SMOKE',car.smoke||'#eeeeff'],
 ['exhaustFlameColor','EXHAUST FLAMES',car.exhaustFlameColor||CAR_EXTRAS_DEFAULTS.exhaustFlameColor]
 ];
 const items=keys?all.filter(([key])=>keys.includes(key)):all;
 return `<div class="car-color-grid">${items.map(([key,label,color])=>`<label class="car-color-field"><span>${char(label)}</span><div><input type="color" data-car-extra-color="${key}" data-car-extra-context="${context}" value="${safeCarHex(color,car.color||'#eeeeff')}" aria-label="${char(label)}"/><small class="car-color-hex">${char(safeCarHex(color,car.color||'#ffffff'))}</small></div>${['secondaryColor','roofColor'].includes(key)?`<button type="button" class="btn ghost small car-match-color" data-car-match-color="${key}" data-car-extra-context="${context}">${car[key]==='match'?'✓ MATCHES BODY':'MATCH BODY PAINT'}</button>`:''}</label>`).join('')}</div>`;
}
function carStanceSliders(car,keys=CAR_STANCE_FIELDS.map(([k])=>k)){
 return `<div class="car-stance-grid">${CAR_STANCE_FIELDS.filter(([key])=>keys.includes(key)).map(([key,label])=>`<div class="car-stance-slider"><label for="stance-${key}">${label}<strong id="stance-value-${key}">${car[key]??50}%</strong></label><input type="range" id="stance-${key}" data-car-extra-range="${key}" min="0" max="100" step="1" value="${car[key]??50}" aria-label="${label}"/><small>${key==='rideHeight'?'LOW ← → HIGH':key==='wheelCamber'?'NEGATIVE ← → POSITIVE':'MIN ← → MAX'}</small></div>`).join('')}</div>`;
}
function paintFinishChoices(car,context='tune'){
 return `<div class="car-finish-grid">${Object.entries(PAINT_FINISHES).map(([id,finish])=>`<button type="button" class="btn ghost car-finish-choice ${car.paintFinish===id?'active':''}" data-car-paint-finish="${id}" data-car-extra-context="${context}" aria-pressed="${car.paintFinish===id}">${char(finish.label)}</button>`).join('')}</div>`;
}
function renderTune(){
 // A garage car can be modified even when a different one is equipped.
 if(!state.owned.includes(tuningCar))tuningCar=state.selected;
 const spec=CARS.find(c=>c.id===tuningCar)||getSelected(),saveCar=carSave(tuningCar);
 const upgrades=UPGRADES.map(u=>{const lv=saveCar.upgrades[u.id]||0;const cost=upgradeCost(u,lv),active=pendingUpgrade===u.id;return `<article class="upgrade upgrade-choice ${active?'preview-selected':''}"><div class="row"><h3>${u.label}</h3><span class="level">LVL ${lv}/${u.max}</span></div><p>${u.description}. ${u.effect}.</p><div class="upgrade-actions"><button class="btn ghost small" data-preview-upgrade="${u.id}">VIEW STATS</button><button class="btn primary small" data-stage-buy-upgrade="${u.id}" ${lv>=u.max?'disabled':''}>${lv>=u.max?'MAXED':'BUY • '+fmt(cost)+' DC'}</button></div></article>`;}).join('');
 const upgradeChoice=UPGRADES.find(u=>u.id===pendingUpgrade);const upgradedLevel=upgradeChoice?(saveCar.upgrades[upgradeChoice.id]||0):0;
 const comparison=upgradeChoice?upgradePreview(spec,saveCar.upgrades,upgradeChoice.id,upgradeChoice.max):null;
 const upgradeStats=comparison?`<div class="tune-stat-preview"><div class="kicker">LIVE PERFORMANCE COMPARISON • CURRENT → AFTER PURCHASE</div><div class="tune-stat-grid">${PERFORMANCE_FIELDS.map(([key,title,unit,precision,higherBetter])=>{
   const before=comparison.current[key],after=comparison.next[key],d=after-before;
   const improved=(higherBetter?d>0:d<0),changed=Math.abs(d)>0.00001;
   return `<div class="tune-stat"><span>${title}</span><strong>${Number(before).toFixed(precision)} <i>→</i> ${Number(after).toFixed(precision)}${unit}</strong><small class="${improved?'stat-good':changed?'stat-bad':'stat-neutral'}">${!changed?'UNCHANGED':(d>0?'+':'')+d.toFixed(precision)+unit+(improved?' • IMPROVED':'')}</small></div>`;}).join('')}</div><p class="stat-note">Values are calculated from the same upgrade configuration used by the car's driving simulation.</p></div>`:'';
 const upgradeCheckout=upgradeChoice?`<div class="purchase-panel"><div><div class="kicker">REVIEW PERFORMANCE UPGRADE</div><h3>${upgradeChoice.label}</h3><p>${upgradeChoice.description}. ${upgradeChoice.effect}.</p><small>Current level ${upgradedLevel} / ${upgradeChoice.max} • Compare before buying</small>${upgradeStats}</div><button class="btn primary" data-commit-upgrade="${upgradeChoice.id}" ${upgradedLevel>=upgradeChoice.max?'disabled':''}>${upgradedLevel>=upgradeChoice.max?'MAXED OUT':'BUY • '+fmt(upgradeCost(upgradeChoice,upgradedLevel))+' DC'}</button></div>`:'<div class="purchase-panel info-panel">Select a performance upgrade above to view it. Your Drift Coins are safe until you click BUY.</div>';
 const bodyPartCard=part=>`<div class="body-part"><div class="body-part-head"><h3>${part.label}</h3><p>${part.description}</p></div><div class="body-options">${part.options.map(([id,label,cost])=>{const installed=saveCar.appearance[part.id]===id,bought=cost===0||saveCar.ownedParts.includes(part.id+':'+id),preview=pendingVisual===part.id+'|'+id;return `<button data-preview-visual="${part.id}|${id}" class="body-option ${installed?'active':''} ${preview?'preview-selected':''}"><span>${char(label)}</span><small>${installed?'✓ INSTALLED':bought?'OWNED • VIEW':'PREVIEW • '+fmt(cost)+' DC'}</small></button>`;}).join('')}</div></div>`;
 const groupOptions=keys=>BODY_PARTS.filter(part=>keys.includes(part.id)).map(bodyPartCard).join('');
 const appearance=BODY_PARTS.filter(part=>!['wheels','lights','exhaust'].includes(part.id)).map(bodyPartCard).join('');
 const wheelKits=groupOptions(['wheels']),lightKits=groupOptions(['lights']),exhaustKits=groupOptions(['exhaust']);
 const [partId,optionId]=(pendingVisual||'|').split('|');const activePart=BODY_PARTS.find(x=>x.id===partId),activeOpt=activePart?.options.find(x=>x[0]===optionId),alreadyOwned=activeOpt&&(activeOpt[2]===0||saveCar.ownedParts.includes(partId+':'+optionId));
 const bodyCheckout=activeOpt?`<div class="purchase-panel"><div><div class="kicker">LIVE VEHICLE PREVIEW</div><h3>${activeOpt[1]}</h3><p>${activePart.description}</p><small>Preview it on the car before spending Drift Coins</small></div><button class="btn primary" data-commit-visual="${pendingVisual}">${saveCar.appearance[partId]===optionId?'✓ INSTALLED':alreadyOwned?'EQUIP OWNED PART':'BUY • '+fmt(activeOpt[2])+' DC'}</button></div>`:'<div class="purchase-panel info-panel">Click a body part to preview it on your vehicle. Confirm with BUY to spend Drift Coins.</div>';
 const colorRow=(colors,key)=>colors.map(c=>`<button class="swatch ${saveCar[key]===c?'active':''}" data-tune-${key}="${c}" title="${key} ${c}" aria-label="${key} ${c}" style="background:${c}"></button>`).join('');
 const tuningTabs=[['body','BODY KITS'],['paint','PAINT'],['wheels','WHEELS'],['lighting','LIGHTING'],['stance','STANCE'],['exhaust','EXHAUST'],['performance','PERFORMANCE'],['setup','SETUP']];
 const tabPane=(id,body)=>`<div class="tune-tab-pane ${tuneTab===id?'':'hidden'}">${body}</div>`;
 const setup=[['grip','Tire grip / control'],['steering','Steering response'],['stability','Drift stability assist']].map(([key,label])=>`<div class="setting"><label>${label}<span class="range-val" id="val-${key}">${saveCar.tune[key]??50}%</span></label><input type="range" min="0" max="100" value="${saveCar.tune[key]??50}" data-tune="${key}" /></div>`).join('');
 const sounds=`<div class="engine-sound-options">${[['factory','Factory'],['deep','Deep rumble'],['race','Track exhaust']].map(([id,label])=>`<button class="btn small ghost ${saveCar.engineNote===id?'sound-active':''}" data-tune-sound="${id}">${label}</button>`).join('')}</div>`;
 dom.screen.innerHTML=header('TUNING LAB','BUILD YOUR DREAM CAR',`Live previews and permanent upgrades for ${spec.name}. Purchased parts deduct Drift Coins.`)+`
 <div class="tune-layout">
  <section class="tune-studio">
   <div class="tune-studio-head"><div><div class="kicker">SELECTED MACHINE / FULL 3D CUSTOMIZATION</div><h2>${char(spec.name)}</h2><p>${char(spec.type)} • ${char(spec.kind.toUpperCase())}</p></div><span class="showcase-status">LIVE PREVIEW</span></div>
   <div id="tuneCarMount" class="tune-car-mount"><div class="showroom-fallback">LOADING INTERACTIVE 3D CAR</div></div>
   <div class="tune-wallet">YOUR DRIFT COINS <strong>${fmt(state.wallet+purchased.coins)} DC</strong><span>DRAG / SWIPE TO ROTATE • ALL VISUAL CHANGES PREVIEW LIVE</span></div>
   <div class="tune-studio-actions"><button class="btn primary" data-rev-car="${spec.id}">▶ REV ENGINE</button><button class="btn ghost" data-page="garage">← GARAGE</button><button class="btn ghost" data-modal="car">DRIFT PASS COSMETICS</button><button class="btn ghost" data-page="shop">STYLE SHOP</button></div>
  </section>
  <section class="tune-controls">
   <div class="tune-tabs">${tuningTabs.map(([id,label])=>`<button type="button" data-tune-tab="${id}" class="${tuneTab===id?'active':''}" aria-pressed="${tuneTab===id}">${label}</button>`).join('')}</div>
   ${tabPane('body',`<div class="tune-section-head"><h3>BODY KIT BUILDER</h3><p>Every front, rear, fender, wing, hood, roof and mirror option changes the actual 3D car.</p></div>${appearance}${activePart&&!['wheels','lights','exhaust'].includes(activePart.id)?bodyCheckout:''}`)}
   ${tabPane('paint',`<div class="panel panel-pad"><h3>BODY PAINT + FINISHES</h3><p class="muted">Choose any color for the body, secondary panels and roof.</p><div class="swatch-row">${colorRow(COLORS,'color')}</div>${extraCarColorInputs(saveCar,'tune',['color','secondaryColor','roofColor'])}<h3>PAINT FINISH</h3>${paintFinishChoices(saveCar)}</div>`)}
   ${tabPane('wheels',`<div class="panel panel-pad"><h3>WHEELS / BRAKES</h3><p class="muted">Preview real 3D wheel designs before buying.</p>${wheelKits}${activePart?.id==='wheels'?bodyCheckout:''}<h3>RIMS + BRAKE CALIPERS</h3><div class="swatch-row">${colorRow(BASE_RIMS,'rims')}</div>${extraCarColorInputs(saveCar,'tune',['rims','caliperColor'])}</div>`)}
   ${tabPane('lighting',`<div class="panel panel-pad"><h3>LIGHTING</h3>${lightKits}${activePart?.id==='lights'?bodyCheckout:''}${extraCarColorInputs(saveCar,'tune',['headlightColor','taillightColor'])}<h3>UNDERGLOW NEON</h3><div class="swatch-row">${BASE_NEONS.map(c=>`<button type="button" class="swatch ${saveCar.neon===c?'active':''}" data-car-extra-neon="${c}" style="background:${c==='off'?'linear-gradient(135deg,#18232a 45%,#ff5265 46%,#ff5265 54%,#18232a 55%)':c}" title="${c==='off'?'Off':c}" aria-label="Neon ${c}"></button>`).join('')}</div>${carStanceSliders(saveCar,['neonIntensity'])}</div>`)}
   ${tabPane('stance',`<div class="panel panel-pad"><h3>STANCE / FITMENT</h3><p class="muted">Visual height, wheel size, camber and track width. V27 drifting stays unchanged.</p>${carStanceSliders(saveCar,['rideHeight','wheelCamber','wheelSize','frontTrackWidth','rearTrackWidth'])}</div>`)}
   ${tabPane('exhaust',`<div class="panel panel-pad"><h3>EXHAUST / SOUND</h3>${exhaustKits}${activePart?.id==='exhaust'?bodyCheckout:''}${extraCarColorInputs(saveCar,'tune',['exhaustFlameColor','smoke'])}<h3>ENGINE SOUND</h3>${sounds}</div>`)}
   ${tabPane('performance',`<div class="upgrade-grid">${upgrades}</div>${upgradeCheckout}`)}
   ${tabPane('setup',`<div class="panel panel-pad"><h3>DRIVING SETUP</h3><p class="muted">Adjust existing grip, steering and stability settings.</p>${setup}</div>`)}
  </section>
 </div>`;
 mountShowroom('tuneCarMount',spec);if(pendingVisual&&showroom){const [id,variant]=pendingVisual.split('|');showroom.setCar(spec,{...saveCar,appearance:{...saveCar.appearance,[id]:variant}});showroom.render(0.016);}
}
async function renderLeaderboard(){
 dom.screen.innerHTML=header('GLOBAL RANKS','GAMEPLAY XP / COINS SPENT','Only gameplay XP counts toward competitive rankings. Owner accounts have a separate unranked display.')+`
 <div class="panel panel-pad unranked-owner"><div class="kicker">OWNER PROFILE • UNRANKED</div><div id="ownerLeaderboardProfile">LOADING…</div><p class="notice">Owner scores and admin-gifted XP never affect the numbered leaderboard.</p></div>
 <form id="profileLookupForm" class="profile-lookup" aria-label="Find driver profile"><label for="profileLookup">FIND DRIVER PROFILE</label><input id="profileLookup" name="username" maxlength="24" pattern="[A-Za-z0-9_]{3,24}" placeholder="Username" required/><button type="submit" class="btn primary">VIEW PROFILE</button></form>
  <div class="ranks-grid"><section class="panel panel-pad"><div class="kicker">GLOBAL LEADERBOARD</div><h3>TOP XP EARNED</h3><div id="xpLeaderboard" class="leaderboard-table">LOADING...</div></section><section class="panel panel-pad"><div class="kicker">GLOBAL LEADERBOARD</div><h3>MOST COINS SPENT</h3><div id="spentLeaderboard" class="leaderboard-table">LOADING...</div></section></div>
 <div class="panel panel-pad" style="margin-top:16px"><h3>YOUR LOCAL STATS</h3><div class="spec-row"><span>XP EARNED</span><strong>${fmt(state.lifetimeXP)} XP</strong></div><div class="spec-row"><span>DRIFT COINS SPENT</span><strong>${fmt(state.spent)} DC</strong></div><p class="notice">The Most Coins Spent board reads saved spending synced from each driver account. These are game-only statistics and have not been anti-cheat verified.</p></div>`;
 if(!cloudConfigured()){document.getElementById('xpLeaderboard').textContent='CONNECT SUPABASE TO LOAD GLOBAL RANKS';document.getElementById('spentLeaderboard').textContent='NOT CONFIGURED';document.getElementById('ownerLeaderboardProfile').textContent='OFFLINE';return;}
 try{const [xp,spent]=await Promise.all([cloudBoard('lifetime_xp'),cloudBoard('coins_spent')]);if(mode!=='leaderboard')return;const table=(rows,key,unit)=>rows.length?rows.map((r,i)=>`<div class="rank-row"><span>#${i+1}</span><button type="button" class="profile-rank-link" data-driver-profile="${char(r.username)}" title="View ${char(r.username)}'s garage">${char(r.username||'DRIVER')}${r.owner?'<span class="owner-tag">OWNER</span>':''}<small>VIEW GARAGE</small></button><b>${fmt(Math.max(0,Number(r[key])||0))} ${unit}</b></div>`).join(''):'NO SCORES YET';const owner=xp.find(r=>r.owner)||spent.find(r=>r.owner);
  document.getElementById('ownerLeaderboardProfile').innerHTML=owner?`<div class="owner-showcase"><button type="button" class="profile-rank-link" data-driver-profile="${char(owner.username)}">${char(owner.username||'OWNER')} <span class="owner-tag">OWNER • UNRANKED</span><small>VIEW OWNER GARAGE</small></button><small>Gameplay XP: ${fmt(owner.lifetime_xp)} • DC spent: ${fmt(owner.coins_spent)}</small></div>`:'OWNER PROFILE NOT AVAILABLE';
  document.getElementById('xpLeaderboard').innerHTML=table(xp.filter(r=>!r.owner),'lifetime_xp','XP');
  document.getElementById('spentLeaderboard').innerHTML=table(spent.filter(r=>!r.owner),'coins_spent','DC');}catch(e){if(mode==='leaderboard'){document.getElementById('xpLeaderboard').textContent='Could not load ranks: '+e.message;document.getElementById('spentLeaderboard').textContent='CHECK DATABASE SETUP';}}
}

async function openDriverProfile(username){
 if(!/^[A-Za-z0-9_]{3,24}$/.test(username)){notify('ENTER A VALID DRIVER USERNAME');return;}
 publicProfileUsername=username;publicProfileData=null;publicProfileCar='';
 renderPage('profile');
}
async function renderDriverProfile(){
 const username=publicProfileUsername;
 dom.screen.innerHTML=header('DRIVER PROFILE','PUBLIC GARAGE / DRIVER STATS','Browse a driver’s saved cars and earned stats.')+
  `<div class="panel panel-pad">LOADING @${char(username)}…</div>`;
 if(!username)return;
 try{
  const res=await fetch('/api/profile?username='+encodeURIComponent(username),{cache:'no-store'});
  const data=await res.json().catch(()=>({}));
  if(mode!=='profile'||publicProfileUsername!==username)return;
  if(!res.ok)throw Error(data.error||'Profile unavailable');
  publicProfileData=data.profile;publicProfileCar=data.profile?.selected||data.profile?.garage?.[0]?.id||'';
  renderDriverProfileDetails();
 }catch(err){
  if(mode==='profile'&&publicProfileUsername===username)dom.screen.innerHTML=
   header('DRIVER PROFILE','DRIVER NOT FOUND','Find a different driver in the leaderboard.')+
   `<div class="panel panel-pad"><p class="notice">${char(err.message||'Could not load the profile')}</p><button type="button" data-page="leaderboard" class="btn ghost">BACK TO RANKS</button></div>`;
 }
}
function renderDriverProfileDetails(){
 const p=publicProfileData;if(!p||mode!=='profile')return;
 const garage=Array.isArray(p.garage)?p.garage:[];
 const selected=garage.find(c=>c.id===publicProfileCar)||garage[0];
 if(selected)publicProfileCar=selected.id;
 const spec=selected?CARS.find(c=>c.id===selected.id):null;
 const privateGarage=p.privateGarage===true,stats=p.stats||{};
 const stat=(label,value)=>`<div class="driver-stat"><small>${char(label)}</small><strong>${char(value)}</strong></div>`;
 const parts=selected?BODY_PARTS.filter(part=>selected.appearance?.[part.id]&&selected.appearance[part.id]!=='stock'):[];
 const upgrades=selected?Object.entries(selected.upgrades||{}).filter(([,level])=>level>0):[];
 const showCar=selected&&spec?`
   <div class="profile-car-details">
    <div id="profileCarMount" class="profile-car-mount" aria-label="3D preview of ${char(spec.name)}"><div class="profile-car-fallback"><span>LOADING 3D CAR PREVIEW</span></div></div>
    <div class="profile-car-info">
     <div class="kicker">READ-ONLY SHOWROOM</div><h3>${char(spec.name)}</h3><p class="muted">${char(spec.type)} • ${selected.selected?'CURRENTLY EQUIPPED':'OWNED VEHICLE'}</p>
     <div class="profile-finishes">
      <span>PAINT <i style="background:${char(selected.color)}"></i> ${char(selected.color)}</span>
      <span>RIMS <i style="background:${char(selected.rims)}"></i> ${char(selected.rims)}</span>
      <span>NEON ${selected.neon==='off'?'OFF':`<i style="background:${char(selected.neon)}"></i> ${char(selected.neon)}`}</span>
      <span>SMOKE <i style="background:${char(selected.smoke)}"></i> ${char(selected.smoke)}</span>
       <span>CALIPERS <i style="background:${char(selected.caliperColor)}"></i> ${char(selected.caliperColor)}</span>
       <span>HEADLIGHTS <i style="background:${char(selected.headlightColor)}"></i> ${char(selected.headlightColor)}</span>
       <span>PAINT FINISH <strong>${char(PAINT_FINISHES[selected.paintFinish]?.label||'Glossy clearcoat')}</strong></span>
       <span>SECONDARY <i style="background:${selected.secondaryColor==='match'?char(selected.color):char(selected.secondaryColor)}"></i> ${char(selected.secondaryColor==='match'?'MATCH BODY':selected.secondaryColor)}</span>
       <span>ROOF <i style="background:${selected.roofColor==='match'?char(selected.color):char(selected.roofColor)}"></i> ${char(selected.roofColor==='match'?'MATCH BODY':selected.roofColor)}</span>
       <span>REAR LIGHTS <i style="background:${char(selected.taillightColor)}"></i> ${char(selected.taillightColor)}</span>
       <span>EXHAUST FLAMES <i style="background:${char(selected.exhaustFlameColor)}"></i> ${char(selected.exhaustFlameColor)}</span>
     </div>
     <div class="kicker">PERFORMANCE UPGRADES</div>
     <div class="profile-chips">${upgrades.map(([id,level])=>`<span>${char(UPGRADES.find(u=>u.id===id)?.label||id)} LV ${fmt(level)}</span>`).join('')||'<span>STOCK PERFORMANCE</span>'}</div>
     <div class="kicker">VISUAL STANCE / FITMENT</div>
      <div class="profile-chips">${CAR_STANCE_FIELDS.map(([key,label])=>`<span>${char(label)} ${Number(selected[key]??50)}%</span>`).join('')}</div>
      <div class="kicker">FITTED BODY PARTS</div>
     <div class="profile-chips">${parts.map(part=>`<span>${char(part.label)}: ${char(part.options.find(opt=>opt[0]===selected.appearance[part.id])?.[1]||'CUSTOM')}</span>`).join('')||'<span>STOCK BODY KIT</span>'}</div>
    </div>
   </div>`:'<p class="notice">No saved cars available yet.</p>';
 dom.screen.innerHTML=header(char(p.username),'DRIVER PROFILE • PUBLIC SHOWROOM','Inspect public gameplay stats and view saved car builds. Profiles are read-only.')+
  `<div class="driver-profile-actions"><button type="button" class="btn ghost" data-page="leaderboard">← BACK TO RANKS</button>${p.owner?'<span class="owner-tag">OWNER • UNRANKED</span>':''}<span class="profile-joined">JOINED ${char(p.joined||'UNKNOWN')}</span></div>
  <div class="profile-stat-grid">
    ${stat('GAMEPLAY XP',fmt(p.rankedXP)+' XP')}
    ${stat('COINS SPENT',fmt(p.coinsSpent)+' DC')}
    ${privateGarage?'':stat('GARAGE LEVEL',fmt(stats.garageLevel))}
    ${privateGarage?'':stat('CARS OWNED',fmt(garage.length))}
    ${privateGarage?'':stat('TOTAL DRIFTS',fmt(stats.drifts))}
    ${privateGarage?'':stat('BEST DRIFT',fmt(stats.bestDrift))}
    ${privateGarage?'':stat('NEAR MISSES',fmt(stats.nearMisses))}
    ${privateGarage?'':stat('POLICE ESCAPES',fmt(stats.escapes))}
    ${privateGarage?'':stat('CRASHES',fmt(stats.crashes))}
   </div>
   <section class="panel panel-pad driver-garage">
    <div class="kicker">PUBLIC GARAGE</div><h3>${privateGarage?'PRIVATE GARAGE':char(p.username)+'\'S CAR COLLECTION'}</h3>
    ${privateGarage?'<p class="notice">This player has chosen to hide their saved garage and personal stats.</p>':
     `<p class="muted">Select a car to inspect its actual 3D body kits, wheel fitment, paint finish, lights and saved modifications.</p>
      ${showCar}
      <div class="profile-car-grid">${garage.map(car=>{const base=CARS.find(c=>c.id===car.id);return base?`<button type="button" class="profile-car-choice ${car.id===publicProfileCar?'active':''}" data-profile-car="${char(car.id)}" aria-pressed="${car.id===publicProfileCar}"><span class="profile-car-choice-type">${char(base.type||base.kind||'CAR')}</span><strong>${char(base.name)}</strong><small>${car.selected?'EQUIPPED':'OWNED'} • VIEW 3D</small></button>`:'';}).join('')}</div>`}
   </section>`;
 if(spec&&showroom&&!privateGarage){
  try{showroom.mount('profileCarMount');showroom.setCar(spec,{...selected,showSmoke:false});showroom.render(0.016);}
  catch(e){console.warn('Driver profile 3D preview unavailable:',e.message);}
 }
}

function openDriftPassPurchase(){
 if(hasDriftPass()){notify('DRIFT PASS ALREADY OWNED');return;}
 const balance=Math.max(0,state.wallet+purchased.coins);
 const shortfall=Math.max(0,DRIFT_PASS_COST-balance);
 modalKind='driftpass';dom.overlay.classList.remove('hidden');
 dom.modal.innerHTML=`<div class="kicker">DRIFT PASS // IN-GAME PURCHASE</div><h2>UNLOCK PREMIUM</h2>
 <p class="muted" style="margin:14px 0">Unlock the premium reward track using Drift Coins. No real-money payment.</p>
 <div class="purchase-panel"><div><small>YOUR WALLET</small><h3>${fmt(balance)} DC</h3><small>DRIFT PASS PRICE</small><h3>${fmt(DRIFT_PASS_COST)} DC</h3></div></div>
 ${shortfall?`<p class="notice" role="status" style="margin-top:14px">You need ${fmt(shortfall)} more DC. Drift and bank XP to earn them.</p>`:'<p class="notice" role="status" style="margin-top:14px">Confirm to deduct 15,000 DC once and unlock permanent premium access.</p>'}
 <div class="modal-actions"><button type="button" class="btn ghost" data-close>CANCEL</button>${shortfall?'<button type="button" class="btn primary" data-page="game">EARN DRIFT COINS</button>':'<button type="button" class="btn primary drift-pass-buy-btn" data-confirm-drift-pass>CONFIRM BUY • 15,000 DC</button>'}</div>`;
}
function renderBattlePass(){
 const level=levelFromXP(state.lifetimeXP),unlocked=BATTLE_PASS.filter(cosmeticUnlocked).length;
 const all=[...BATTLE_PASS,...PREMIUM_PASS];
 const item=all.find(i=>i.id===passPreviewId)||BATTLE_PASS[0];
 const isPremium=Boolean(item.premium);
 // Drift Pass access uses earned Drift Coins and existing cloud saves; recognize historical purchases.
 const owned=isPremium?(hasDriftPass()&&level>=item.level):cosmeticUnlocked(item);
 const next=BATTLE_PASS.find(i=>!cosmeticUnlocked(i));
 const tierCard=(reward)=>{const free=!reward.premium,ready=free?cosmeticUnlocked(reward):(hasDriftPass()&&level>=reward.level),selected=reward.id===item.id;
  return `<button class="pass-tier pass-v10-tier ${selected?'pass-selected':''} ${ready?'unlocked':'locked'} ${!free?'premium-tier':''}" data-pass-preview="${reward.id}" aria-pressed="${selected}">
   <div class="pass-top"><span>${free?'FREE':'PREMIUM'}</span><span>${ready?'✓ UNLOCKED':free?'LEVEL '+reward.level+' 🔒':'🔒'}</span></div>
   <div class="reward-preview reward-${reward.type}" style="--reward-color:${reward.color}"><div class="reward-symbol"></div></div>
   <div class="pass-type">${reward.type.toUpperCase()}</div><h3>${char(reward.name)}</h3>
   <p>${ready?'OWNED':free?'UNLOCK AT LEVEL '+reward.level:(hasDriftPass()?'REACH LEVEL '+reward.level:'PREMIUM REQUIRED')}</p>
  </button>`;
 };
 dom.screen.innerHTML=header('DRIFT PASS','SEASON 01 // STREET LEGENDS',
  'Two reward tracks. Level up for free cosmetics; premium rewards unlock using earned Drift Coins. Select ANY reward to preview it.')+`
 <div class="pass-banner panel"><div><div class="kicker">FREE TRACK + PREMIUM TRACK // 30 LEVELS EACH</div><h3>LEVEL ${level} <span>DRIVER</span></h3><p>${unlocked} / ${BATTLE_PASS.length} FREE REWARDS. ${next?`Next: ${next.name}, Level ${next.level}`:'All free rewards unlocked!'}</p></div><div class="pass-banner-actions"><span class="premium-lock">PREMIUM <strong>${hasDriftPass()?'OWNED':'LOCKED'}</strong></span><small class="drift-pass-wallet">YOUR WALLET: <strong>${fmt(state.wallet+purchased.coins)} DC</strong></small><button type="button" class="btn primary drift-pass-buy-btn" data-buy-drift-pass ${hasDriftPass()?'disabled':''}>${hasDriftPass()?'✓ DRIFT PASS OWNED':'BUY DRIFT PASS • '+fmt(DRIFT_PASS_COST)+' DC'}</button>${!hasDriftPass()&&state.wallet+purchased.coins<DRIFT_PASS_COST?`<small class="drift-pass-shortfall">Need ${fmt(DRIFT_PASS_COST-state.wallet-purchased.coins)} more DC</small>`:''}</div></div>
 <div class="pass-preview-studio panel">
   <div class="pass-preview-visual"><div class="kicker">LIVE 3D REWARD PREVIEW</div><div id="passCarMount" class="pass-car-mount"><div class="showroom-fallback">3D PREVIEW</div></div><span>DRAG TO ROTATE // PREVIEWS ARE FREE</span></div>
   <div class="pass-preview-info"><span class="pass-level-label">${isPremium?'PREMIUM':'FREE'} TRACK / LEVEL ${item.level}</span><h2>${char(item.name)}</h2><div class="pass-chip">${item.type.toUpperCase()}</div><p>See this ${item.type} on your ${char(getSelected().name)} before unlocking. ${isPremium?'Buy Drift Pass with 15,000 earned Drift Coins to access premium rewards.':'Reach the level to earn it for free.'}</p>
     <div class="pass-reward-sample" style="--reward-color:${item.color}"><span class="sample-dot"></span><strong>${char(item.color.toUpperCase())}</strong><span>${owned?'✓ OWNED':isPremium?(hasDriftPass()?'REACH LEVEL '+item.level:'PREMIUM LOCKED'):'LEVEL '+item.level+' REQUIRED'}</span></div>
     ${isPremium?`<button class="btn primary" ${owned?`data-pass-equip="${item.id}"`:hasDriftPass()?'disabled':'data-buy-drift-pass'}>${owned?'EQUIP REWARD':hasDriftPass()?'REACH LEVEL '+item.level:'BUY DRIFT PASS • ${fmt(DRIFT_PASS_COST)} DC'}</button>`:`<button class="btn primary" data-pass-equip="${item.id}" ${owned?'':'disabled'}>${owned?'EQUIP ON CURRENT CAR':'REACH LEVEL '+item.level+' TO UNLOCK'}</button>`}
   </div>
 </div>
 <div class="collection-header"><div><div class="kicker">DUAL REWARD TRACK</div><h3>FREE + PREMIUM DRIFT PASS</h3></div><span class="collection-hint">SCROLL SIDEWAYS TO SEE MORE LEVELS</span></div>
 <div class="pass-v10-wrap"><div class="pass-v10-rail-labels"><div>LEVEL</div><div>FREE</div><div>PREMIUM <span>${hasDriftPass()?'✓':'🔒'}</span></div></div><div class="pass-v10-scroll"><div class="pass-v10-grid">${BATTLE_PASS.map((free,i)=>`<div class="pass-v10-column"><div class="pass-v10-level ${level>=free.level?'pass-v10-reached':''}">${free.level}${level===free.level?' • YOU':''}</div>${tierCard(free)}${tierCard(PREMIUM_PASS[i])}</div>`).join('')}</div></div></div>
 <p class="notice" style="margin-top:19px">Drift Pass costs 15,000 earned Drift Coins, not real money. Ownership is saved with your garage. Premium rewards unlock when you reach the required level.</p>`;
 previewCosmetic(state.selected,item,'passCarMount');
}
function showUsernameGate(profile){
 const needsChoice=!!profile && profile.username_initialized_at===null&&!skippedUsernameGate;
 usernameOnboarding=needsChoice;
 $('usernameOnboarding').classList.toggle('hidden',!needsChoice);
 if(needsChoice){ if(mode==='game')pauseGame('focus'); const el=$('firstUsername');if(el&&!el.value)el.value=''; }
}
async function checkUsernameGate(){
 if(!cloudConfigured())return;
 await activateIdentity();
 try{const user=await cloudUser();if(!user){showUsernameGate(null);return;}const profile=await cloudProfile();if(profile)showUsernameGate(profile);}
 catch(err){console.warn('Username setup check:',err.message);}
}
async function renderAccount(){
 if(!accountSwitching)await activateIdentity();
 let user=null;let profile=null;let error='';
 if(cloudConfigured()){try{user=await cloudUser();if(user)profile=await cloudProfile();}catch(e){error=e.message;}}
 activeUsername=profile?.username||'';
 if(profile)showUsernameGate(profile);
 if(mode!=='account')return;
 dom.screen.innerHTML=header('DRIVER ACCOUNT','ACCOUNT SYSTEM • OPTIONAL ONLINE SETUP','Create an account to use online features once Supabase is configured. Each driver now has a private cloud save. Guests start fresh without accessing your account.')+`
 <div class="account-layout"><div class="panel panel-pad"><div class="kicker">${cloudConfigured()?'ONLINE AUTH':'SETUP NEEDED'}</div>
 ${cloudConfigured()?(user?`<h3>WELCOME BACK</h3><p class="notice">Signed in as ${char(user.email||user.id)}. Only XP earned from gameplay counts toward competitive ranks.</p><div class="username-panel"><div class="kicker">YOUR PUBLIC DRIVER NAME</div><h3>${char(activeUsername||'NO USERNAME YET')}${ownerEnabled?'<span class="owner-tag">OWNER</span>':''}</h3><p class="muted">${activeUsername.startsWith('driver_')?'Choose a custom driver name for your Google account.':'Visible on the public leaderboard and your account.'}</p><form id="usernameForm" class="username-form"><label for="usernameEdit">CHOOSE / CHANGE USERNAME</label><div class="username-input-row"><input id="usernameEdit" name="username" minlength="3" maxlength="24" pattern="[A-Za-z0-9_]{3,24}" autocomplete="nickname" value="${char(activeUsername.startsWith('driver_')?'':activeUsername)}" placeholder="3–24 letters, numbers or _" required/><button class="btn primary" type="submit" >SAVE USERNAME</button></div></form><p class="notice">Rename anytime. Usernames must remain unique.</p><button type="button" class="btn primary" data-driver-profile="${char(activeUsername)}">VIEW MY PUBLIC PROFILE + GARAGE</button></div><button class="btn ghost" data-cloud-signout>LOG OUT</button>`:`<h3>SIGN UP OR LOG IN</h3><form id="accountForm" class="account-form"><label>USERNAME<input name="username" minlength="3" maxlength="24" pattern="[A-Za-z0-9_]{3,24}" placeholder="Driver name (for sign up)"/></label><label>EMAIL<input type="email" name="email" required autocomplete="email" placeholder="driver@example.com"/></label><label>PASSWORD<input type="password" name="password" required minlength="6" autocomplete="current-password" placeholder="At least 6 characters"/></label><div class="account-buttons"><button class="btn primary" type="submit" data-auth-action="signin">LOG IN</button><button class="btn ghost" type="submit" data-auth-action="signup">CREATE ACCOUNT</button></div></form><div class="oauth-divider"><span>OR CONTINUE WITH</span></div><button class="btn google-login" data-google-login type="button"><svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.27 5.48-4.8 7.18l7.73 6C44.38 38.03 46.98 31.88 46.98 24.55z"/><path fill="#FBBC05" d="M10.53 28.59A14.46 14.46 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.2A23.85 23.85 0 0 0 0 24c0 3.87.92 7.53 2.53 10.78l8-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.92-2.13 15.89-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-8 6.19C6.51 42.62 14.62 48 24 48z"/></svg><span>CONTINUE WITH GOOGLE</span></button><p class="notice">For new email accounts, check your inbox for confirmation if enabled. Google sign-in uses your Google account and does not require a game password.</p>`):`<h3>CONNECT SUPABASE FIRST</h3><p class="notice">Open <code>cloud-config.js</code> and paste your Supabase Project URL and PUBLISHABLE key. Then run the SQL file from the <code>backend</code> folder in Supabase SQL Editor.</p><p class="notice">Do not paste database passwords or service-role keys into this website.</p>`}
 ${error?`<p class="notice">${char(error)}</p>`:''}</div><aside class="panel panel-pad"><div class="kicker">ONLINE SYSTEM STATUS</div><h3>${cloudConfigured()?'CONNECTED CONFIG':'NOT CONNECTED'}</h3><p class="notice">Earned Drift Coins, Drift Pass ownership, XP, cars, and tuning are saved with your signed-in garage. Legacy paid balances are retained where applicable. Guests do not inherit another driver's garage.</p><button class="btn ghost" data-page="leaderboard">VIEW RANKS</button>${user&&activeUsername?`<button type="button" class="btn primary" data-driver-profile="${char(activeUsername)}">VIEW MY PUBLIC PROFILE</button>`:''}</aside></div>`;
}
function renderSettings(){const s=state.settings;
 const select=(name,label,items)=>`<div class="setting"><label for="setting-${name}">${label}</label><select id="setting-${name}" data-setting="${name}">${items.map(([v,t])=>`<option value="${v}" ${String(s[name])===String(v)?'selected':''}>${t}</option>`).join('')}</select></div>`;
 const slider=(name,label,min,max,step=1,unit='')=>`<div class="setting"><label>${label}<span class="range-val" id="setting-value-${name}">${s[name]}${unit}</span></label><input type="range" min="${min}" max="${max}" step="${step}" value="${s[name]}" data-setting="${name}"/></div>`;
 dom.screen.innerHTML=header('GAME SETTINGS','VISUALS • HUD • DRIVING','Customize the graphics, FPS, dashboard appearance, and driving feel. Every option is saved.')+`<div class="panel panel-pad"><div class="kicker">GRAPHICS QUALITY</div><div class="settings-grid">
 ${select('quality','PRESET',[['low','Low — fastest'],['medium','Medium'],['high','High'],['ultra','Ultra']])}
 ${select('fps','FRAME RATE LIMIT',[['30','30 FPS'],['60','60 FPS'],['120','120 FPS'],['144','144 FPS'],['0','Unlimited']])}
 ${slider('renderScale','RENDER RESOLUTION',60,125,5,'%')}
 ${select('shadows','DYNAMIC SHADOWS',[['true','On'],['false','Off']])}
 ${select('particles','SMOKE / PARTICLE DENSITY',[['low','Low'],['medium','Medium'],['high','High']])}
 ${select('drawDistance','VIEW DISTANCE',[['short','Short'],['normal','Normal'],['long','Long']])}
 ${select('trafficDensity','TRAFFIC DENSITY',[['low','Low'],['normal','Normal'],['high','High']])}
 </div><div class="divider"></div><div class="kicker">HUD / INTERFACE CUSTOMIZATION</div><div class="settings-grid">
 ${select('uiTheme','HUD ACCENT COLOR',[['mint','Neon Mint'],['orange','Sunset Orange'],['blue','Electric Blue'],['purple','Violet'],['red','Racing Red']])}
 ${select('hudLayout','HUD LAYOUT',[['classic','Classic'],['minimal','Minimal'],['racing','Racing']])}
 ${select('speedStyle','SPEEDOMETER DESIGN',[['digital','Digital'],['glass','Glass'],['compact','Compact']])}
 ${slider('hudOpacity','HUD OPACITY',45,100,5,'%')}
 ${slider('uiScale','INTERFACE SIZE',75,125,5,'%')}
 ${select('showSpeedometer','SPEEDOMETER VISIBLE',[['true','On'],['false','Off']])}
 ${select('showDriftNotice','DRIFT / ANGLE HUD',[['true','On'],['false','Off']])}
 ${select('showControlsHint','CONTROLS HELP',[['true','On'],['false','Off']])}
 ${select('showNearMissPopups','NEAR MISS POPUPS',[['true','On'],['false','Off']])}
 </div><div class="divider"></div><div class="kicker">DRIVING / CONTROL</div><div class="settings-grid">
 <div class="setting"><label for="device-mode-setting">DEVICE / CONTROLS</label><select id="device-mode-setting" data-device-change><option value="desktop" ${document.documentElement.dataset.device==='desktop'?'selected':''}>DESKTOP / LAPTOP</option><option value="phone" ${document.documentElement.dataset.device==='phone'?'selected':''}>PHONE TOUCH</option><option value="tablet" ${document.documentElement.dataset.device==='tablet'?'selected':''}>TABLET TOUCH</option></select></div>
 ${select('units','SPEED UNIT',[['mph','MPH'],['kph','KM/H']])}
 ${select('driftAssist','DRIFT ASSIST',[['true','On — easier control'],['false','Off — more freedom']])}
 ${select('driftStyle','DRIFT HANDLING',[['street','Street — smooth and controllable'],['arcade','Arcade — big easy angles'],['pro','Pro — realistic / challenging']])}
 ${select('smoke','DRIFT SMOKE',[['true','On'],['false','Off']])}
 ${slider('steering','STEERING SENSITIVITY',.5,1.8,.1)}
 ${slider('cameraShake','CAMERA SHAKE STRENGTH',0,100,5,'%')}
 ${slider('cameraDistance','CHASE CAMERA DISTANCE',75,145,5,'%')}
 ${slider('cameraFov','CAMERA FIELD OF VIEW',55,88,1,'°')}
 ${slider('cameraSmoothing','CAMERA FOLLOW RESPONSE',25,125,5,'%')}
  ${slider('touchSize','TOUCH CONTROL SIZE',80,125,5,'%')}
  ${select('touchLayout','PHONE / TABLET BUTTONS',[['arrows','FOUR ARROWS + DRIFT'],['pedals','GAS / BRAKE + STEERING']])}
 </div><div class="divider"></div><div class="kicker">PUBLIC PROFILE PRIVACY</div><div class="settings-grid">
 ${select('profileVisibility','WHO CAN SEE YOUR GARAGE',[['public','Everyone — public showcase'],['private','Private — hide cars and detailed stats']])}
 </div><div class="divider"></div><div class="kicker">CUSTOM KEYBOARD CONTROLS</div>
 <p class="notice">Click a binding, then press your new key. Escape cancels. The changes save automatically.</p>
 <div class="controls-grid">${Object.entries({accelerate:'Accelerate',brake:'Brake / reverse',left:'Steer left',right:'Steer right',handbrake:'Handbrake / drift',camera:'Change camera',recover:'Respawn / recover',pause:'Pause / menu'}).map(([key,label])=>`<button class="control-bind" data-bind="${key}"><span>${label}</span><kbd>${(s.controls?.[key]||'UNBOUND').replace('Key','').replace('Arrow','').replace('Digit','')}</kbd></button>`).join('')}</div><button class="btn ghost small" data-reset-keys>RESET CONTROLS</button>
 <div class="divider"></div><div class="kicker">MUSIC / AUDIO</div><div class="settings-grid">
 ${select('music','INSTRUMENTAL MUSIC',[['true','On — original instrumental'],['false','Off']])}
 ${select('policeRadio','POLICE RADIO DISPATCH',[['true','On'],['false','Off']])}
 ${slider('musicVolume','MUSIC VOLUME',0,100,5,'%')}
 ${slider('effectsVolume','SOUND EFFECTS',0,100,5,'%')}
 </div>${adminEnabled?`<div class="divider"></div><div class="kicker">ADMIN TAB VISIBILITY</div><p class="notice">Hiding the Admin tab does not change your server verified permissions.</p><button class="btn ghost" data-admin-visibility>${adminPanelHidden?'SHOW ADMIN TAB':'HIDE ADMIN TAB'}</button>`:''}
 <div class="divider"></div><div class="kicker">SAVE DATA / WEBSITE MIGRATION</div><p class="notice" style="margin:12px 0">Moving from localhost to another domain uses a different browser save area. Export your save here, then import it on your new website to keep cars, XP, Drift Pass rewards and upgrades.</p><div class="save-actions"><button class="btn primary" data-save-export>DOWNLOAD SAVE BACKUP</button><button class="btn ghost" data-save-import>IMPORT SAVE BACKUP</button><input id="saveFileInput" class="hidden" type="file" accept=".json,application/json" /></div><p class="notice" style="margin-top:18px">Controls can be rebound above. Original instrumental audio starts after you click Play. No licensed songs included. Lower settings for slower Macs. Shadows, resolution, particles and traffic density affect the actual game rendering.</p></div>`;
}
function themeModal(){
 dom.modal.innerHTML=`<div class="screen-head"><div><div class="kicker">GARAGE CUSTOMIZATION</div><h2>GARAGE DESIGN</h2></div><button class="btn small ghost" data-close>✕</button></div><p class="muted" style="margin:0 0 20px">Pick a look for your garage menu. Saved for future updates and garage scenes.</p><div class="car-grid">${GARAGE_THEMES.map(t=>`<button class="car-tile" data-theme="${t.id}" style="min-height:120px;background:linear-gradient(135deg,${t.wall},${t.floor})"><div style="height:14px;width:70%;background:${t.accent};border-radius:3px;box-shadow:0 0 24px ${t.accent}55"></div><h3 style="margin-top:20px">${t.name}</h3><div class="sub">${state.garageTheme===t.id?'✓ SELECTED':'APPLY THEME'}</div></button>`).join('')}</div><div class="modal-actions"><button class="btn" data-close>CLOSE</button></div>`;
}
function carModal(){
 const car=CARS.find(c=>c.id===customizedCar)||getSelected(),cs=carSave(customizedCar);
 const preview=cosmeticPreview,selectedItem=preview?.id?[...BATTLE_PASS,...PREMIUM_PASS].find(i=>i.id===preview.id):null;
 const eligible=!selectedItem||(selectedItem.premium?(hasDriftPass()&&levelFromXP(state.lifetimeXP)>=selectedItem.level):cosmeticUnlocked(selectedItem));
 const section=(type,label,free)=>{
  const rewards=[...BATTLE_PASS,...PREMIUM_PASS].filter(i=>i.type===type);
  return `<div class="cosmetic-section"><h3>${label}</h3><div class="swatch-row">${free.map(c=>{
   const current=cs[COSMETIC_SLOT[type]]===c,active=preview?.type===type&&preview.color===c;
   return `<button class="swatch ${current?'active':''} ${active?'preview-selected':''}" data-preview-free="${type}|${c}" title="Preview ${label}: ${c}" aria-label="Preview ${label} ${c}" style="background:${c==='off'?'linear-gradient(135deg,#202935 45%,#ff5454 46%,#ff5454 54%,#202935 55%)':c}"></button>`;
  }).join('')}</div><div class="cosmetic-grid">${rewards.map(item=>{
    const owned=item.premium?(hasDriftPass()&&levelFromXP(state.lifetimeXP)>=item.level):cosmeticUnlocked(item),selected=cs[COSMETIC_SLOT[type]]===item.color,active=preview?.id===item.id;
    return `<button class="cosmetic-item ${owned?'':'locked'} ${selected?'selected':''} ${active?'preview-selected':''}" data-preview-cosmetic="${item.id}"><span class="cosmetic-color" style="background:${item.color}"></span><strong>${char(item.name)}</strong><small>${active?'PREVIEWING':owned?(selected?'EQUIPPED':'UNLOCKED'):(item.premium?'PREMIUM LOCKED':'PREVIEW • LVL '+item.level)}</small></button>`;
  }).join('')}</div></div>`;
 };
 dom.modal.innerHTML=`<div class="screen-head"><div><div class="kicker">LIVE COSMETIC PREVIEW // DRIFT PASS</div><h2>${char(car.name)}</h2></div><button class="btn small ghost" data-close>✕</button></div>
 <div class="cosmetic-showcase"><div id="cosmeticPreviewMount" class="cosmetic-car-mount"><div class="showroom-fallback">CAR PREVIEW</div></div><div class="cosmetic-showcase-detail"><div class="kicker">${preview?'PREVIEW MODE':'CURRENT BUILD'}</div><h3>${preview?char(preview.name):'YOUR CURRENT LOOK'}</h3><p>${preview?'This is how the selected cosmetic looks on your vehicle. Previewing never spends Coins or changes your saved car.':'Choose any cosmetic below to see it on this car before equipping.'}</p><div class="preview-buttons"><button class="btn primary" data-apply-cosmetic ${(!preview||!eligible)?'disabled':''}>${!preview?'SELECT A COSMETIC':!eligible?(selectedItem.premium?'PREMIUM PASS LOCKED':'UNLOCK AT LEVEL '+selectedItem.level):'EQUIP THIS LOOK'}</button><button class="btn ghost" data-clear-cosmetic-preview ${preview?'':'disabled'}>RESET PREVIEW</button></div></div></div>
 ${section('paint','BODY PAINT',COLORS)}
 ${section('smoke','DRIFT SMOKE',SMOKES)}
 ${section('rims','ALLOY RIMS',BASE_RIMS)}
 <div class="rim-color-custom"><label for="customRimColor">CUSTOM RIM COLOR</label><input id="customRimColor" data-rim-color type="color" value="${/^#[0-9a-f]{6}$/i.test(cs.rims)?cs.rims:'#d0d9e2'}"/><span>Choose any color • free and saved to this car</span></div>
 ${section('neon','UNDERGLOW NEONS',BASE_NEONS)}
 <div class="car-modal-extras"><h3>ADVANCED CAR COLORS</h3><p class="muted">Customize paint, calipers, headlights and smoke for free.</p>${extraCarColorInputs(cs,'modal')}<h3>PAINT FINISH</h3>${paintFinishChoices(cs,'modal')}</div>
 <p class="notice">Cosmetics never expire or disappear when you buy cars. Locked Drift Pass rewards can be previewed now and equipped after leveling up.</p>
 <div class="modal-actions"><button class="btn" data-page="battlepass">DRIFT PASS REWARDS</button><button class="btn primary" data-close>DONE</button></div>`;
 previewCosmetic(customizedCar,preview,'cosmeticPreviewMount');
}
function showModal(kind){modalKind=kind;dom.overlay.classList.remove('hidden');if(kind==='car'){cosmeticPreview=null;customizedCar=mode==='tune'?tuningCar:mode==='garage'&&state.owned.includes(selectedPreview)?selectedPreview:state.selected;carModal();}else themeModal();}
function closeModal(){dom.overlay.classList.add('hidden');modalKind=null;cosmeticPreview=null;if(mode==='garage')renderGarage();else if(mode==='tune')renderTune();}
function updateSettings(){save();applyUI();game?.applyQuality();game?.resetTiming();}

// Event delegation keeps controls working after each panel is regenerated.
document.addEventListener('click',async e=>{
 const t=e.target.closest('button');if(!t)return;
 if(t.dataset.chooseDevice){chooseDevice(t.dataset.chooseDevice);return;}
 if(t.dataset.driverProfile!==undefined){await openDriverProfile(String(t.dataset.driverProfile));return;}
 if(t.dataset.profileCar!==undefined&&mode==='profile'&&publicProfileData){
  if(publicProfileData.garage?.some(c=>c.id===t.dataset.profileCar)){publicProfileCar=t.dataset.profileCar;renderDriverProfileDetails();}
  return;
 }
  if(deviceChoiceOpen)return;
  if(usernameOnboarding&&t.id!=='onboardingSkip'&&t.id!=='onboardingSignOut'&&t.id!=='adminVerifyCancel')return;
 if(t.id==='closeGlobalNotice'){dismissGlobalNotice();return;}
 if(t.id==='adminVerifyCancel'){$('adminVerifyOverlay').classList.add('hidden');return;}
 if(t.dataset.adminVisibility!==undefined){
   adminPanelHidden=!adminPanelHidden;try{localStorage.setItem('ed-hide-admin-tab',adminPanelHidden?'1':'0');}catch{}
   $('adminNav').classList.toggle('hidden',!adminEnabled||adminPanelHidden);
   if(mode==='admin'&&adminPanelHidden)renderPage('settings');else if(mode==='settings')renderSettings();
   notify(adminPanelHidden?'ADMIN TAB HIDDEN • ACCESS KEPT':'ADMIN TAB VISIBLE');return;
  }
  if(t.dataset.adminRefill!==undefined){try{const v=await adminRequest('/api/admin/refill',{});state.wallet=v.wallet;save();cashRefresh();notify('ADMIN DC REFILLED');}catch(err){notify(err.message);}return;}
 if(t.dataset.adminCops!==undefined){if(!game)return;game.adminInfiniteCops=!game.adminInfiniteCops;if(game.adminInfiniteCops&&game.playing){if(!game.wanted)game.startPolice();while(game.wanted<5)game.increaseWanted();}notify(game.adminInfiniteCops?'MAXIMUM PURSUIT ENABLED':'MAXIMUM PURSUIT DISABLED');return;}
 if(t.dataset.adminWeather!==undefined){renderPage('home');$('weatherChooser').classList.remove('hidden');return;}
 if(t.dataset.adminHide){try{await adminRequest('/api/admin/announcement/hide',{id:Number(t.dataset.adminHide)});dismissGlobalNotice();await renderAdmin();await fetchAnnouncements();}catch(err){notify(err.message);}return;}
 if(t.dataset.adminClearAnnouncements!==undefined){
  if(!confirm('Clear all active global messages?'))return;
  try{await adminRequest('/api/admin/announcement/clear',{});dismissGlobalNotice();await renderAdmin();notify('GLOBAL MESSAGES CLEARED');}
  catch(err){notify('DISPATCH: '+err.message);}return;
 }
 if(t.id==='onboardingSkip'){skippedUsernameGate=true;showUsernameGate(null);notify('YOU CAN CHANGE YOUR USERNAME LATER IN ACCOUNT');return;}
 if(t.id==='onboardingSignOut'){skippedUsernameGate=false;await syncCloudSave().catch(()=>{});await cloudSignOut();setSaveOwner(null);await activateIdentity();showUsernameGate(null);renderPage('account');return;}
 if(t.dataset.weather){chosenWeather=t.dataset.weather;closeWeatherChoice();game?.applyWeather(chosenWeather);weatherApproved=true;renderPage('game');return;}
 if(t.id==='weatherCancel'){closeWeatherChoice();return;}
 if(t.id==='bankExit'||t.id==='bankExitPaused'){bankAndExit();return;}
 if(t.id==='pauseHud'){pauseGame();return;}
 if(t.id==='resumeGame'){resumeGame();return;}
 if(t.id==='restartGame'){resumeGame();game?.recover();return;}
 if(t.dataset.pausePage){clearPause();renderPage(t.dataset.pausePage);return;}
 if(t.dataset.close!==undefined){closeModal();return;}
 if(t.dataset.page){closeModal();if(t.dataset.page==='tune'){tuningCar=state.selected;tuneTab='body';}renderPage(t.dataset.page);return;}
 if(t.dataset.saveExport!==undefined){const blob=new Blob([exportSave()],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='EndlessDrift-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('SAVE BACKUP DOWNLOADED');return;}
 if(t.dataset.saveImport!==undefined){document.getElementById('saveFileInput')?.click();return;}
 if(t.id==='garageDesign'){showModal('garage');return;}
 if(t.id==='customFromHud'){showModal('car');return;}
 /* Real-money coin purchases remain disabled after release. */
 if(t.dataset.cloudSignout!==undefined){try{await syncCloudSave().catch(()=>{});await cloudSignOut();setSaveOwner(null);await activateIdentity();notify('LOGGED OUT');renderAccount();}catch(e){notify(e.message);}return;}
 if(t.dataset.revCar){game?.revPreview(t.dataset.revCar);return;}
 if(t.dataset.carMatchColor!==undefined){
  const key=t.dataset.carMatchColor,modal=t.dataset.carExtraContext==='modal',id=modal?customizedCar:tuningCar;
  if(!['secondaryColor','roofColor'].includes(key)||!state.owned.includes(id))return;
  carSave(id)[key]='match';save();game?.setCarPreviewCosmetics(id);
  if(modal){cosmeticPreview=null;carModal();}else if(mode==='tune')renderTune();
  return;
 }
 if(t.dataset.carExtraNeon!==undefined){
  const value=t.dataset.carExtraNeon;
  if(value!=='off'&&!/^#[0-9a-f]{6}$/i.test(value))return;
  if(!state.owned.includes(tuningCar))return;
  carSave(tuningCar).neon=value;save();game?.setCarPreviewCosmetics(tuningCar);renderTune();
  return;
 }
 if(t.dataset.carPaintFinish!==undefined){
  const finish=t.dataset.carPaintFinish;if(!Object.hasOwn(PAINT_FINISHES,finish))return;
  const modal=t.dataset.carExtraContext==='modal',id=modal?customizedCar:tuningCar;
  if(!state.owned.includes(id))return;
  carSave(id).paintFinish=finish;save();game?.setCarPreviewCosmetics(id);
  if(modal){cosmeticPreview=null;carModal();}else if(mode==='tune')renderTune();
  return;
 }
 if(t.dataset.tuneSound){carSave(tuningCar).engineNote=t.dataset.tuneSound;save();game?.revPreview(tuningCar);renderTune();return;}
 if(t.dataset.shopPreview){shopPreviewId=t.dataset.shopPreview;renderShop();return;}
 if(t.dataset.shopBuy){const item=COSMETIC_SHOP.find(x=>x.id===t.dataset.shopBuy);if(!item)return;if(shopOwns(item)){notify('YOU ALREADY OWN THIS COSMETIC');return;}if(!await payWithPurchasedCoins(item.price)){notify('NOT ENOUGH DRIFT COINS');return;}state.shopOwned ||= [];state.shopOwned.push(item.id);save();cashRefresh();notify(item.name.toUpperCase()+' PURCHASED');renderShop();return;}
 if(t.dataset.shopEquip){const item=COSMETIC_SHOP.find(x=>x.id===t.dataset.shopEquip);if(!item||!shopOwns(item))return;const slot=COSMETIC_SLOT[item.type],cs=carSave(state.selected);cs[slot]=item.color;save();game?.setCarPreviewCosmetics(state.selected);notify(item.name.toUpperCase()+' EQUIPPED');renderShop();return;}

 if(t.dataset.buyDriftPass!==undefined||t.dataset.premiumGuide!==undefined){openDriftPassPurchase();return;}
 if(t.dataset.confirmDriftPass!==undefined){
  if(hasDriftPass()){closeModal();notify('DRIFT PASS ALREADY OWNED');return;}
  t.disabled=true;
  const success=await payWithPurchasedCoins(DRIFT_PASS_COST);
  if(!success){t.disabled=false;openDriftPassPurchase();notify('NOT ENOUGH DRIFT COINS TO BUY DRIFT PASS');return;}
  state.driftPassOwned=true;save();cashRefresh();closeModal();renderBattlePass();
  notify('DRIFT PASS PURCHASED • PREMIUM REWARDS UNLOCKED');return;
 }
 if(t.dataset.passPreview){passPreviewId=t.dataset.passPreview;renderBattlePass();return;}
 if(t.dataset.passEquip){const item=[...BATTLE_PASS,...PREMIUM_PASS].find(i=>i.id===t.dataset.passEquip);if(!item||(item.premium?!(hasDriftPass()&&levelFromXP(state.lifetimeXP)>=item.level):!cosmeticUnlocked(item)))return;
   const slot=COSMETIC_SLOT[item.type],cs=carSave(state.selected);cs[slot]=item.color;save();game?.setCarPreviewCosmetics(state.selected);renderBattlePass();notify(item.name.toUpperCase()+' EQUIPPED ON '+getSelected().name.toUpperCase());return;}
 if(t.dataset.previewCosmetic){const item=[...BATTLE_PASS,...PREMIUM_PASS].find(i=>i.id===t.dataset.previewCosmetic);if(!item)return;
   cosmeticPreview={id:item.id,type:item.type,color:item.color,name:item.name};carModal();return;}
 if(t.dataset.previewFree){const [type,color]=t.dataset.previewFree.split('|');if(!COSMETIC_SLOT[type])return;
   cosmeticPreview={type,color,name:color==='off'?'Underglow Off':type.toUpperCase()+' • '+color.toUpperCase()};carModal();return;}
 if(t.dataset.clearCosmeticPreview!==undefined){cosmeticPreview=null;carModal();return;}
 if(t.dataset.applyCosmetic!==undefined){if(!cosmeticPreview)return;const item=cosmeticPreview.id?[...BATTLE_PASS,...PREMIUM_PASS].find(i=>i.id===cosmeticPreview.id):null;
   if(item&&(item.premium?!(hasDriftPass()&&levelFromXP(state.lifetimeXP)>=item.level):!cosmeticUnlocked(item))){notify(item.premium?'DRIFT PASS OR LEVEL NOT UNLOCKED':'REACH DRIFT PASS LEVEL '+item.level+' TO UNLOCK');return;}
   const cs=carSave(customizedCar);cs[COSMETIC_SLOT[cosmeticPreview.type]]=cosmeticPreview.color;save();game?.setCarPreviewCosmetics(customizedCar);
   notify(cosmeticPreview.name.toUpperCase()+' EQUIPPED');cosmeticPreview=null;carModal();return;}
 if(t.dataset.tuneCar){if(!state.owned.includes(t.dataset.tuneCar))return;tuningCar=t.dataset.tuneCar;tuneTab='body';pendingUpgrade=null;pendingVisual=null;renderPage('tune');return;}
 if(t.dataset.tuneTab){tuneTab=t.dataset.tuneTab;renderTune();return;}
 if(t.id==='respawnBtn'){game?.respawn();return;}
 if(t.dataset.bind){remapping=t.dataset.bind;renderSettings();document.querySelector(`[data-bind="${remapping}"] kbd`).textContent='PRESS KEY';notify('PRESS NEW KEY • ESC TO CANCEL');return;}
 if(t.dataset.resetKeys!==undefined){state.settings.controls={accelerate:'KeyW',brake:'KeyS',left:'KeyA',right:'KeyD',handbrake:'Space',camera:'KeyC',recover:'KeyR',pause:'Escape'};save();remapping=null;renderSettings();notify('CONTROLS RESET');return;}
 if(t.dataset.previewUpgrade){pendingUpgrade=t.dataset.previewUpgrade;renderTune();document.querySelector('.tune-stat-preview')?.scrollIntoView({block:'nearest',behavior:'smooth'});return;}
 if(t.dataset.stageBuyUpgrade){pendingUpgrade=t.dataset.stageBuyUpgrade;renderTune();document.querySelector('.purchase-panel:has([data-commit-upgrade])')?.scrollIntoView({block:'center',behavior:'smooth'});return;}
 if(t.dataset.previewVisual){pendingVisual=t.dataset.previewVisual;renderTune();return;}
 if(t.dataset.confirmCar){const id=t.dataset.confirmCar,spec=CARS.find(c=>c.id===id);if(!spec)return;selectedPreview=id;
  if(state.owned.includes(id)){state.selected=id;save();game?.setPlayerCar();renderGarage();return;}
  if(state.wallet+purchased.coins<spec.price){notify('NOT ENOUGH DRIFT COINS TO BUY THIS CAR');return;}
  modalKind='buycar';dom.overlay.classList.remove('hidden');dom.modal.innerHTML=`<div class="kicker">VEHICLE PURCHASE • REVIEW</div><h2>${char(spec.name)}</h2><p class="muted" style="margin:15px 0">${char(spec.type)} · ${spec.hp} HP · ${spec.top} MPH</p><div class="purchase-panel"><div><small>WALLET: ${fmt(state.wallet+purchased.coins)} DC</small><h3>PRICE: ${fmt(spec.price)} DC</h3></div><button class="btn primary" data-buy="${id}">BUY VEHICLE</button></div><div class="modal-actions"><button class="btn ghost" data-close>CANCEL</button></div>`;return;}

 if(t.dataset.modal){showModal(t.dataset.modal);return;}
 if(t.dataset.car){selectedPreview=t.dataset.car;renderGarage();return;}
 if(t.dataset.buy){const id=t.dataset.buy;const spec=CARS.find(c=>c.id===id);if(!spec)return;
   if(!state.owned.includes(id)){if(!await payWithPurchasedCoins(spec.price)){notify('NOT ENOUGH DRIFT COINS • KEEP DRIFTING');return;}state.owned.push(id);notify(`${spec.name.toUpperCase()} PURCHASED`);}
   state.selected=id;selectedPreview=id;save();cashRefresh();game?.setPlayerCar();closeModal();renderGarage();return;
 }
 if(t.dataset.commitUpgrade){const u=UPGRADES.find(x=>x.id===t.dataset.commitUpgrade);if(!u)return;const cs=carSave(tuningCar),lv=cs.upgrades[u.id];if(lv>=u.max)return;
   if(!await payWithPurchasedCoins(upgradeCost(u,lv))){notify('NOT ENOUGH DRIFT COINS • BANK MORE DRIFTS');return;}
   cs.upgrades[u.id]++;pendingUpgrade=null;save();if(tuningCar===state.selected)game?.audio?.setCarProfile(cs.upgrades,cs.engineNote||'factory',getSelected());cashRefresh();notify(`${u.label.toUpperCase()} LEVEL ${cs.upgrades[u.id]} INSTALLED`);renderTune();return;
 }
 if(t.dataset.commitVisual){const [id,variant]=t.dataset.commitVisual.split('|');const part=BODY_PARTS.find(p=>p.id===id),opt=part?.options.find(o=>o[0]===variant);if(!part||!opt||!state.owned.includes(tuningCar))return;const cs=carSave(tuningCar),key=id+':'+variant;
   if(opt[2]>0&&!cs.ownedParts.includes(key)){if(!await payWithPurchasedCoins(opt[2])){notify('NOT ENOUGH DRIFT COINS TO INSTALL THIS PART');return;}cs.ownedParts.push(key);}
   cs.appearance[id]=variant;pendingVisual=null;save();cashRefresh();notify(opt[1].toUpperCase()+' INSTALLED');if(tuningCar===state.selected)game?.setPlayerCar();renderTune();return;}
 if(t.dataset.tuneColor){carSave(tuningCar).color=t.dataset.tuneColor;save();if(tuningCar===state.selected)game?.setPlayerCosmetics();renderTune();return;}
 if(t.dataset.tuneSmoke){carSave(tuningCar).smoke=t.dataset.tuneSmoke;save();renderTune();return;}
 if(t.dataset.tuneRims){carSave(tuningCar).rims=t.dataset.tuneRims;save();if(tuningCar===state.selected)game?.setPlayerCosmetics();renderTune();return;}
 if(t.dataset.paint){const cs=carSave(customizedCar);cs.color=t.dataset.paint;save();game?.setCarPreviewCosmetics(customizedCar);carModal();return;}
 if(t.dataset.smoke){carSave(customizedCar).smoke=t.dataset.smoke;save();carModal();return;}
 if(t.dataset.freeRims){carSave(customizedCar).rims=t.dataset.freeRims;save();game?.setCarPreviewCosmetics(customizedCar);carModal();return;}
 if(t.dataset.freeNeon){carSave(customizedCar).neon=t.dataset.freeNeon;save();game?.setCarPreviewCosmetics(customizedCar);carModal();return;}
 if(t.dataset.cosmetic){
   const cosmetic=[...BATTLE_PASS,...PREMIUM_PASS].find(item=>item.id===t.dataset.cosmetic);
   if(!cosmetic||(cosmetic.premium?!(hasDriftPass()&&levelFromXP(state.lifetimeXP)>=cosmetic.level):!cosmeticUnlocked(cosmetic))){notify('UNLOCK THIS COSMETIC BY LEVELING UP OR BUYING THE DRIFT PASS');return;}
   const cs=carSave(customizedCar);const slot={paint:'color',smoke:'smoke',rims:'rims',neon:'neon'}[cosmetic.type];
   cs[slot]=cosmetic.color;save();game?.setCarPreviewCosmetics(customizedCar);carModal();notify(cosmetic.name.toUpperCase()+' EQUIPPED');return;
 }
 if(t.dataset.theme){state.garageTheme=t.dataset.theme;save();applyGarageTheme();themeModal();notify('GARAGE STYLE SAVED');return;}
});
let loginAction='signin';
document.addEventListener('click',e=>{const b=e.target.closest('button[data-auth-action]');if(b)loginAction=b.dataset.authAction;});
document.addEventListener('click',e=>{
 const b=e.target.closest('button[data-google-login]');
 if(!b)return;
 try{cloudSignInGoogle();}catch(err){notify('GOOGLE SIGN IN: '+String(err.message||err));}
});

document.addEventListener('submit',async e=>{
 if(e.target.id==='adminVerifyForm'){
  e.preventDefault();const form=e.target,button=form.querySelector('button');button.disabled=true;
  try{await adminRequest('/api/admin/redeem',{step:'finish',value:new FormData(form).get('answer')});$('adminVerifyOverlay').classList.add('hidden');form.reset();await checkAdminPermissions();notify('ADMIN ACCESS ACTIVATED');if(mode==='account')await renderAccount();}
  catch(err){$('adminVerifyError').textContent=String(err.message||err);}finally{button.disabled=false;}
  return;
 }
 if(e.target.id==='profileLookupForm'){
  e.preventDefault();await openDriverProfile(String(new FormData(e.target).get('username')||'').trim());return;
 }
 if(e.target.id==='adminBroadcastForm'){
  e.preventDefault();const form=e.target,button=form.querySelector('button');button.disabled=true;
  try{await adminRequest('/api/admin/announce',{message:new FormData(form).get('message')});form.reset();notify('GLOBAL DISPATCH SENT');await fetchAnnouncements();await renderAdmin();}
  catch(err){notify('DISPATCH: '+err.message);}finally{button.disabled=false;}
  return;
 }


 if(e.target.id==='adminXpForm'){
  e.preventDefault();
  const form=e.target,fields=new FormData(form),amount=Number(fields.get('amount')),username=String(fields.get('username')||'').trim();
  const button=form.querySelector('[type=submit]'),result=$('adminXpResult');
  if(!Number.isSafeInteger(amount)||amount<1){result.textContent='Enter a positive whole XP amount';return;}
  button.disabled=true;result.textContent='Granting unranked XP…';
  try{await adminRequest('/api/admin/moderate',{command:'xp',username,value:amount});result.textContent='GIFTED '+fmt(amount)+' XP TO @'+username+' • NOT RANKED';form.reset();}
  catch(err){result.textContent='XP GIFT FAILED: '+String(err.message||err);}
  finally{button.disabled=false;}return;
 }
 if(e.target.id==='adminCoinsForm'){
  e.preventDefault();
  const form=e.target,button=form.querySelector('[type=submit]'),fields=new FormData(form);
  const username=String(fields.get('username')||'').trim(),amount=Number(fields.get('amount'));
  const result=$('adminCoinsResult');
  if(!Number.isSafeInteger(amount)||amount<1){result.textContent='Enter a positive whole DC amount';return;}
  button.disabled=true;result.textContent='Sending gift...';
  try{
   await adminRequest('/api/admin/moderate',{command:'coins',username,value:amount});
   result.textContent='GIFT SENT: +'+fmt(amount)+' DC TO @'+username;
   notify('ADMIN GIFT +'+fmt(amount)+' DC → @'+username);
   form.reset();
  }catch(err){result.textContent='GIFT FAILED: '+String(err.message||err);}
  finally{button.disabled=false;}
  return;
 }

 if(e.target.id==='adminCommandForm'){
  e.preventDefault();const fields=new FormData(e.target),command=String(fields.get('command')||''),username=String(fields.get('username')||'').trim(),raw=String(fields.get('value')||'').trim();
  const value=command==='god'?raw.toLowerCase()==='on':raw;
  try{const data=await adminRequest('/api/admin/moderate',{command,username,value});$('adminActionResult').textContent='DONE /'+data.command+' '+data.username;await refreshPlayerControlState();}
  catch(err){$('adminActionResult').textContent='ERROR '+err.message;}return;
 }
 if(e.target.id==='adminWatchForm'){
  e.preventDefault();try{await watchPlayerForm(String(new FormData(e.target).get('username')||'').trim());}
  catch(err){$('adminWatchResult').textContent=err.message;}return;
 }
 if(e.target.id==='firstUsernameForm'){
  e.preventDefault();const form=e.target;const button=form.querySelector('button[type=submit]');button.disabled=true;
  try{const name=String(new FormData(form).get('username')||'').trim();if(await maybeAdminEnrollment(name)){button.disabled=false;return;}await cloudUpdateUsername(name);activeUsername=name;showUsernameGate(null);notify('WELCOME @'+name.toUpperCase());if(mode==='account')await renderAccount();}
  catch(err){$('usernameGateError').textContent=String(err.message||err);button.disabled=false;}
  return;
 }
 if(e.target.id==='usernameForm'){
  e.preventDefault();const form=e.target,button=form.querySelector('button[type="submit"]');if(button)button.disabled=true;
  try{const username=String(new FormData(form).get('username')||'').trim();if(await maybeAdminEnrollment(username)){if(button)button.disabled=false;return;}await cloudUpdateUsername(username);activeUsername=username;notify('USERNAME SAVED • @'+username);await renderAccount();}
  catch(err){notify('USERNAME: '+String(err.message||err));if(button)button.disabled=false;}
  return;
 }
 if(e.target.id!=='accountForm')return;e.preventDefault();
 const f=e.target,form=new FormData(f),email=String(form.get('email')||'').trim(),password=String(form.get('password')||''),username=String(form.get('username')||'').trim();
 for(const b of f.querySelectorAll('button'))b.disabled=true;
 try{if(loginAction==='signup'){if(!/^[A-Za-z0-9_]{3,24}$/.test(username))throw new Error('Username: 3–24 letters, numbers or underscores');const result=await cloudSignUp(email,password,username);notify(result?.session?'ACCOUNT CREATED':'ACCOUNT CREATED • CHECK YOUR EMAIL');}else{await cloudSignIn(email,password);notify('SIGNED IN');}await activateIdentity();await renderAccount();syncPaidState();showDeviceChooser(true);}
 catch(err){notify('ACCOUNT: '+err.message);for(const b of f.querySelectorAll('button'))b.disabled=false;}
});
document.addEventListener('change',async e=>{if(e.target.dataset.deviceChange){chooseDevice(e.target.value);return;}if(e.target.id!=='saveFileInput')return;try{const file=e.target.files?.[0];if(!file)return;importSave(await file.text());selectedPreview=state.selected;tuningCar=state.selected;cashRefresh();applyUI();game?.setPlayerCar();game?.applyQuality();renderPage('settings');notify('SAVE BACKUP IMPORTED SUCCESSFULLY');}catch(err){notify('IMPORT FAILED: '+(err?.message||'INVALID FILE'));}finally{e.target.value='';}});
dom.overlay.addEventListener('click',e=>{if(e.target===dom.overlay)closeModal();});
document.addEventListener('input',e=>{
 if(e.target.dataset.carExtraRange!==undefined){
  const key=e.target.dataset.carExtraRange,valid=CAR_STANCE_FIELDS.some(([id])=>id===key);
  const value=Math.round(Number(e.target.value));
  if(!valid||!Number.isFinite(value)||value<0||value>100||!state.owned.includes(tuningCar))return;
  const custom=carSave(tuningCar);custom[key]=value;save();
  const output=document.getElementById('stance-value-'+key);if(output)output.textContent=value+'%';
  game?.setCarPreviewCosmetics(tuningCar);
  if(mode==='tune'&&showroom){const spec=CARS.find(c=>c.id===tuningCar)||getSelected();
   showroom.mount('tuneCarMount');showroom.setCar(spec,custom);showroom.render(.016);}
  return;
 }
 if(e.target.dataset.carExtraColor!==undefined){
  const key=e.target.dataset.carExtraColor,value=String(e.target.value||'');
  if(!['color','secondaryColor','roofColor','rims','caliperColor','headlightColor','taillightColor','smoke','exhaustFlameColor'].includes(key)||!/^#[0-9a-f]{6}$/i.test(value))return;
  const modal=e.target.dataset.carExtraContext==='modal',id=modal?customizedCar:tuningCar;
  if(!state.owned.includes(id))return;
  const custom=carSave(id);custom[key]=value.toLowerCase();save();
  const caption=e.target.closest('.car-color-field')?.querySelector('.car-color-hex');if(caption)caption.textContent=custom[key];
  game?.setCarPreviewCosmetics(id);
  if(modal){cosmeticPreview=null;previewCosmetic(id,null,'cosmeticPreviewMount');}
  else if(mode==='tune'&&showroom){const spec=CARS.find(c=>c.id===id)||getSelected();showroom.mount('tuneCarMount');showroom.setCar(spec,custom);showroom.render(.016);}
  return;
 }
 if(e.target.dataset.rimColor){
  const hex=String(e.target.value||'');
  if(/^#[0-9a-f]{6}$/i.test(hex)){
   carSave(customizedCar).rims=hex;cosmeticPreview=null;save();
   game?.setCarPreviewCosmetics(customizedCar);
   previewCosmetic(customizedCar,null,'cosmeticPreviewMount');
  }
  return;
 }
 if(e.target.dataset.tune){const key=e.target.dataset.tune,val=Number(e.target.value);carSave(tuningCar).tune[key]=val;const v=$('val-'+key);if(v)v.textContent=`${val}%`;save();return;}
 if(e.target.dataset.setting){let val=e.target.value;const key=e.target.dataset.setting;
   if(['driftAssist','smoke','shadows','music','policeRadio','showSpeedometer','showDriftNotice','showControlsHint','showNearMissPopups'].includes(key))val=val==='true';
   if(['steering','uiScale','hudOpacity','renderScale','cameraShake','cameraDistance','cameraFov','cameraSmoothing','musicVolume','effectsVolume','touchSize'].includes(key))val=Number(val);
   state.settings[key]=val;const v=$('setting-value-'+key);if(v)v.textContent=val+(['hudOpacity','uiScale','renderScale','cameraShake','cameraDistance','cameraSmoothing'].includes(key)?'%':key==='cameraFov'?'°':'');
   updateSettings();
 }
});
function bound(action,code){return (state.settings.controls?.[action]||({accelerate:'KeyW',brake:'KeyS',left:'KeyA',right:'KeyD',handbrake:'Space',camera:'KeyC',recover:'KeyR',pause:'Escape'}[action]))===code;}
function pressed(action){
 const code=state.settings.controls?.[action]||({accelerate:'KeyW',brake:'KeyS',left:'KeyA',right:'KeyD',handbrake:'Space'}[action]);
 const arrow={accelerate:'ArrowUp',brake:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'};
 return !!touchHeld[action]||!!keys[code]||!!(arrow[action]&&keys[arrow[action]]);
}
window.addEventListener('keydown',e=>{
 const code=e.code;
 if(usernameOnboarding||deviceChoiceOpen)return;
 if(remapping){e.preventDefault();if(code!=='Escape'){const oldAction=Object.keys(state.settings.controls).find(k=>k!==remapping&&state.settings.controls[k]===code);if(oldAction)state.settings.controls[oldAction]='Unbound';state.settings.controls[remapping]=code;save();notify('NEW CONTROL SAVED');}remapping=null;renderSettings();return;}
 if(mode==='game'&&['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight',...Object.values(state.settings.controls)].includes(code))e.preventDefault();
 if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;
 keys[code]=true;if(e.repeat)return;
 if(bound('pause',code)){if(modalKind)closeModal();else if(mode==='game'){if(pauseActive)resumeGame();else pauseGame();}else renderPage('game');return;}
 if(pauseActive)return;
 if(bound('camera',code)&&mode==='game')game?.changeCamera();
 if(bound('recover',code)&&mode==='game'){if(game?.crashState)game.respawn();else game?.recover();}
});
window.addEventListener('keyup',e=>{keys[e.code]=false;});
window.addEventListener('blur',()=>{Object.keys(keys).forEach(k=>keys[k]=false);pauseGame('focus');});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame('focus');});

const touchPanel=$('touchControls');
const drivingTouchActions=new Set(['accelerate','brake','left','right','handbrake']);
function releaseTouch(id){
 const entry=touchPointers.get(id);if(!entry)return;
 touchPointers.delete(id);
 touchHeld[entry.action]=Math.max(0,(touchHeld[entry.action]||1)-1);
 entry.button?.toggleAttribute('data-held',!!touchHeld[entry.action]);
 entry.button?.setAttribute('aria-pressed',touchHeld[entry.action]?'true':'false');
}
function clearTouchDriving(){for(const id of [...touchPointers.keys()])releaseTouch(id);for(const action of Object.keys(touchHeld))touchHeld[action]=0;}
touchPanel?.addEventListener('pointerdown',event=>{
 const button=event.target.closest('button[data-touch]');
 if(!button||mode!=='game'||usernameOnboarding||deviceChoiceOpen)return;
 const action=button.dataset.touch;event.preventDefault();event.stopPropagation();
 game?.audio?.unlock(); // Must happen inside a real touch gesture on iOS.
 if(drivingTouchActions.has(action)){
  if(pauseActive||touchPointers.has(event.pointerId))return;
  touchPointers.set(event.pointerId,{button,action});
  touchHeld[action]=(touchHeld[action]||0)+1;
  button.setAttribute('data-held','');button.setAttribute('aria-pressed','true');
  try{button.setPointerCapture(event.pointerId);}catch{}
  return;
 }
 if(action==='camera'&&!pauseActive)game?.changeCamera();
 if(action==='recover'&&!pauseActive){if(game?.crashState)game.respawn();else game?.recover();}
 if(action==='pause'){if(pauseActive)resumeGame();else pauseGame();}
 if(action==='bank')$(pauseActive?'bankExitPaused':'bankExit')?.click();
});
for(const eventName of ['pointerup','pointercancel','lostpointercapture'])touchPanel?.addEventListener(eventName,event=>releaseTouch(event.pointerId));
// iOS/Safari can release a captured pointer outside the button. Clear stuck actions.
for(const eventName of ['pointerup','pointercancel'])document.addEventListener(eventName,event=>releaseTouch(event.pointerId),true);
touchPanel?.addEventListener('pointermove',event=>{
 const entry=touchPointers.get(event.pointerId);if(!entry)return;
 const next=document.elementFromPoint(event.clientX,event.clientY)?.closest('button[data-touch]');
 if(!next||next===entry.button||!drivingTouchActions.has(next.dataset.touch))return;
 touchHeld[entry.action]=Math.max(0,(touchHeld[entry.action]||1)-1);
 entry.button.toggleAttribute('data-held',!!touchHeld[entry.action]);
 entry.button.setAttribute('aria-pressed',touchHeld[entry.action]?'true':'false');
 entry.button=next;entry.action=next.dataset.touch;
 touchHeld[entry.action]=(touchHeld[entry.action]||0)+1;
 next.setAttribute('data-held','');next.setAttribute('aria-pressed','true');
});
window.addEventListener('blur',clearTouchDriving);
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTouchDriving();});


class DriftGame{
 constructor(){
  this.scene=new THREE.Scene();
  this.renderer=new THREE.WebGLRenderer({canvas:dom.view,antialias:document.documentElement.dataset.device==='desktop',alpha:false,powerPreference:'high-performance'});
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.22;
  this.camera=new THREE.PerspectiveCamera(65,1,.1,1000);
  this.audio=new Soundtrack(()=>state.settings);this.clock=new THREE.Clock();this.accum=0;this.lastRender=0;this.playing=false;this.cameraMode=0;this.preview=undefined;
  this.sun=new THREE.DirectionalLight('#fff4dc',2.7);this.sun.position.set(-90,125,30);this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);this.sun.shadow.camera.left=-60;this.sun.shadow.camera.right=60;this.sun.shadow.camera.top=60;this.sun.shadow.camera.bottom=-60;this.sun.shadow.normalBias=.035;this.scene.add(this.sun);
  this.ambientLight=new THREE.HemisphereLight('#eaf8ff','#486d67',2);this.scene.add(this.ambientLight);
  this.world=createWorld(this.scene);this.applyWeather('clear');
  this.player={x:0,z:0,vx:0,vz:0,heading:0,yaw:0,steer:0,driftBlend:0,speed:0,angle:0};
  this.run={score:0,active:false,grace:0,combo:1,seconds:0,nearMisses:0,nearMissXP:0};
  this.elapsed=0;this.nearMissStreak=0;this.lastNearMiss=-100;this.nearMissFlashUntil=0;this.invulnerable=1;this.wanted=0;this.chaseTime=0;this.wantedTimer=0;this.dispatchUntil=0;this.searchTimer=0;this.bustTimer=0;this.maxSpeed=0;this.crashState=null;this.crashSparks=[];this.crashDebris=[];
  this.police=[];this.traffic=[];this.blockade=[];this.lastBoostCell=-999;this.lastRampCell=-999;this.boostTimer=0;this.airTimer=0;this.airDuration=0;this.blockadeNext=0;this.helicopter=null;this.heliLamp=null;this.heliRotor=null;this.radioTimer=0;this.tireDamage=0;this.fasterEscape=0;this.smokePool=[];this.smokeHead=0;this.smokeTimer=0;this.skids=[];this.skidHead=0;
  this.setPlayerCar();this.setupTraffic();this.setupSmoke();this.setupSkids();this.setupCrashEffects();this.applyQuality();
  this.camera.position.set(6,4.3,-12);this.camera.lookAt(0,1,2);
  window.addEventListener('resize',()=>this.resize());this.resize();
  this.animate=now=>{try{this.frame(now);requestAnimationFrame(this.animate);}catch(e){errorScreen(e);}};
  requestAnimationFrame(this.animate);
 }
 applyMorph(shape='car'){
  if(this.currentMorph===shape)return;
  this.currentMorph=shape;
  if(this.morph){this.scene.remove(this.morph);this.morph.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.();});this.morph=null;}
  if(this.car)this.car.visible=shape==='car';
  if(shape==='car'||!['tetris','arcade','toilet'].includes(shape))return;
  const group=new THREE.Group(),mat=new THREE.MeshStandardMaterial({color:shape==='tetris'?0x4bf7c5:shape==='arcade'?0x5e88ff:0xf4f4f1,metalness:.2,roughness:.45});
  const put=(g,x,y,z,m=mat)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);group.add(o);return o;};
  if(shape==='tetris')for(const [x,y] of [[0,.5],[0,1.5],[1,1.5],[-1,1.5]])put(new THREE.BoxGeometry(.95,.95,.95),x,y,0);
  if(shape==='arcade'){put(new THREE.BoxGeometry(1.5,2.4,1.1),0,1.2,0);put(new THREE.BoxGeometry(1.2,.85,.05),0,1.65,.59,new THREE.MeshBasicMaterial({color:0x061a2d}));put(new THREE.BoxGeometry(1,.15,.25),0,.7,.65);}
  if(shape==='toilet'){put(new THREE.BoxGeometry(1.3,1.6,.45),0,1.1,-.65);put(new THREE.CylinderGeometry(.72,.65,.55,20),0,.5,.3);put(new THREE.CylinderGeometry(.55,.5,.42,20),0,.24,.3);}
  this.morph=group;this.scene.add(group);
 }
 revPreview(carId){
  const conf=carSave(carId);this.audio?.unlock();this.audio?.setCarProfile(conf.upgrades||{},conf.engineNote||'factory',CARS.find(c=>c.id===carId));
  this.previewRevStart=performance.now();this.previewRevEnd=this.previewRevStart+2900;this.previewRevPopped=false;showroom?.triggerRev(2900);
  notify('ENGINE REV • '+(CARS.find(c=>c.id===carId)?.name||'CAR').toUpperCase());
 }
 setPlayerCar(){if(this.car)this.scene.remove(this.car);const c=getSelected();this.car=createCar(c,carSave().color,{...carSave()});this.scene.add(this.car);this.preview=undefined;this.currentMorph=null;this.applyMorph(playerControlState.shape||'car');this.car.position.set(this.player.x,0,this.player.z);$('hudCar').textContent=c.name.toUpperCase();this.audio?.setCarProfile(carSave().upgrades||{},carSave().engineNote||'factory',getSelected());for(const light of this.car.userData.headlights||[])light.intensity=this.weather==='night'?110:this.weather==='fog'||this.weather==='rain'?72:29;}
 previewCar(spec,color){if(mode==='game')return;
  if(this.preview&&this.preview.id===spec.id&&this.preview.color===color)return;
  if(this.car)this.scene.remove(this.car);
  this.car=createCar(spec,color,{...carSave(spec.id)});this.scene.add(this.car);this.preview={id:spec.id,color};this.car.position.set(this.player.x,0,this.player.z);
 }
 setPlayerPaint(color){setCarPaint(this.car,color);if(this.preview)this.preview.color=color;}
 setPlayerCosmetics(){setCarCosmetics(this.car,carSave());}
 setCarPreviewCosmetics(id){if(id===state.selected||(this.preview?.id===id))setCarCosmetics(this.car,carSave(id));}
 restoreEquipped(){if(this.preview)this.setPlayerCar();}
 resize(){const w=window.innerWidth,h=window.innerHeight;this.camera.aspect=w/Math.max(h,1);this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);}
 applyQuality(){
  const s=state.settings,quality=s.quality||'medium';
  const preset={low:.72,medium:1,high:1.25,ultra:1.6}[quality]||1;
  const resolution=Math.max(.6,Math.min(1.25,Number(s.renderScale||100)/100));
  this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1.5,preset*resolution,document.documentElement.dataset.device==='phone'?1:document.documentElement.dataset.device==='tablet'?1.35:2.5));
  this.renderer.shadowMap.enabled=Boolean(s.shadows)&&(quality==='high'||quality==='ultra');
  this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.sun.castShadow=this.renderer.shadowMap.enabled;
  this.sun.shadow.mapSize.set(quality==='ultra'?2048:1024,quality==='ultra'?2048:1024);
  const fog={short:.004,normal:.0023,long:.00135}[s.drawDistance]||.0023;
  this.scene.fog.density=fog;this.applyWeather(chosenWeather);
  const trafficCount={low:8,normal:12,high:16}[s.trafficDensity]||12;
  for(let i=0;i<this.traffic.length;i++){this.traffic[i].enabled=i<trafficCount;this.traffic[i].mesh.visible=i<trafficCount;}
  this.renderer.toneMappingExposure=quality==='low'?1.1:quality==='ultra'?1.28:1.19;
  this.resize();
 }
 applyWeather(weather='clear'){
  this.weather=weather;
  const styles={
    clear:{fog:'#8bb0be',density:.0021,sun:2.7,hemi:2,exposure:1.19,horizon:'#9bc5cf',zenith:'#1f578f'},
    rain:{fog:'#778998',density:.0031,sun:1.05,hemi:1.35,exposure:.94,horizon:'#8998a9',zenith:'#394b61'},
    fog:{fog:'#afb9bf',density:.011,sun:1.0,hemi:1.65,exposure:1.05,horizon:'#b9c4c9',zenith:'#8999a4'},
    night:{fog:'#14243f',density:.0037,sun:.22,hemi:.53,exposure:.78,horizon:'#152844',zenith:'#050f23'}
  };
  const style=styles[weather]||styles.clear;
  this.scene.fog.color.set(style.fog);
  const distanceSetting={short:1.7,normal:1,long:.72}[state.settings.drawDistance]||1;
  this.scene.fog.density=style.density*distanceSetting;
  this.scene.background.set(style.fog);
  this.sun.intensity=style.sun;
  this.ambientLight.intensity=style.hemi;
  this.renderer.toneMappingExposure=style.exposure;
  for(const light of this.car?.userData?.headlights||[])light.intensity=weather==='night'?110:weather==='rain'||weather==='fog'?72:29;
  for(const light of this.world?.streetLights||[])light.intensity=weather==='night'?3.7:weather==='rain'||weather==='fog'?1.7:.15;
  if(this.world.sky?.material?.uniforms){this.world.sky.material.uniforms.uHorizon.value.set(style.horizon);this.world.sky.material.uniforms.uZenith.value.set(style.zenith);}
  $('weatherRain')?.classList.toggle('hidden',weather!=='rain');
  document.body.dataset.weather=weather;
 }
 resetTiming(){this.accum=0;this.clock.getDelta();this.lastRender=0;if(mode==='game')this.restoreEquipped();}
 changeCamera(){this.cameraMode=(this.cameraMode+1)%3;notify(['FOLLOW CAMERA','CLOSE CHASE CAMERA','HOOD CAMERA'][this.cameraMode]);}
 recover(){
  if(this.crashState){this.respawn();return;}
  this.endRun(false);this.player.vx=this.player.vz=this.player.yaw=this.player.driftBlend=0;this.player.heading=0;this.player.x=0;
  this.player.z=Math.round(this.player.z/96)*96;this.player.steer=0;this.invulnerable=2;
  if(this.car)this.car.rotation.set(0,0,0);notify('CAR RECOVERED • NO XP PENALTY');
 }
 respawn(){
  this.crashState=null;this.endPolice(false);
  const p=this.player;p.x=0;p.z=Math.round(p.z/96)*96;p.vx=p.vz=p.yaw=p.speed=p.angle=p.heading=p.steer=p.driftBlend=0;
  this.invulnerable=3;this.tireDamage=0;this.airTimer=0;this.boostTimer=0;this.nearMissStreak=0;this.drifting=false;
  this.run={score:0,active:false,grace:0,combo:1,seconds:0,nearMisses:0,nearMissXP:0};
  if(this.car){this.car.position.set(p.x,0,p.z);this.car.rotation.set(0,0,0);}
  this.crashSparks.forEach(o=>o.mesh.visible=false);this.crashDebris.forEach(o=>o.mesh.visible=false);document.body.classList.remove('impact-active');
  $('crashFlash').classList.add('hidden');$('wreckScreen').classList.add('hidden');
  if(mode==='game')notify('CAR RESPAWNED • DRIVE SAFE');
 }
 setupCrashEffects(){
  const geometry=new THREE.BoxGeometry(.055,.055,.25);
  for(let i=0,n=document.documentElement.dataset.device==='phone'?14:35;i<n;i++){
    const material=new THREE.MeshBasicMaterial({color:i%3===0?0xffed8c:i%2===0?0xff713f:0xffffff,transparent:true,opacity:0,depthWrite:false});
    const mesh=new THREE.Mesh(geometry,material);mesh.visible=false;this.scene.add(mesh);
    this.crashSparks.push({mesh,vel:new THREE.Vector3(),life:0});
  }
  const scraps=[0x111b25,0x6d8ea0,0xff9a62,0x222e3c];
  for(let i=0,n=document.documentElement.dataset.device==='phone'?7:14;i<n;i++){
    const material=new THREE.MeshStandardMaterial({color:scraps[i%scraps.length],metalness:.65,roughness:.3,side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(.18+Math.random()*.38,.02+Math.random()*.07,.15+Math.random()*.29),material);
    mesh.visible=false;this.scene.add(mesh);this.crashDebris.push({mesh,vel:new THREE.Vector3(),life:0,spin:new THREE.Vector3()});
  }
 }
 createImpact(reason,breakdown){
  const p=this.player;
  const impact=new THREE.Vector3(p.x,.83,p.z),impactSpeed=Math.max(0,p.speed);
  const dirX=impactSpeed>1?p.vx/impactSpeed:Math.sin(p.heading);
  const dirZ=impactSpeed>1?p.vz/impactSpeed:Math.cos(p.heading);
  // Back away from the other hitbox before the impact animation.
  const setback=reason==='HIGHWAY BARRIER IMPACT'?.8:1.9;
  const safeX=THREE.MathUtils.clamp(p.x-dirX*setback,-14.15,14.15),safeZ=p.z-dirZ*setback;
  this.crashState={time:0,reason,breakdown,x:safeX,z:safeZ,heading:p.heading,speed:impactSpeed,dirX,dirZ,side:p.x>0?-1:1};
  p.x=safeX;p.z=safeZ;p.vx=p.vz=p.speed=0;
  document.body.classList.add('impact-active');
  if(this.car)this.car.position.set(safeX,0,safeZ);
  // Instant external view: never fly the camera through the 3D car from hood view.
  this.camera.position.set(safeX-Math.sin(p.heading)*7.8+Math.cos(p.heading)*4.6,4.15,safeZ-Math.cos(p.heading)*7.8-Math.sin(p.heading)*4.6);
  this.lookAt=new THREE.Vector3(safeX,1.1,safeZ);this.camera.lookAt(this.lookAt);
  for(const fx of this.crashSparks){
   fx.mesh.visible=true;fx.mesh.position.copy(impact);
   const a=Math.random()*Math.PI*2,sp=2+Math.random()*8;
   fx.vel.set(Math.sin(a)*sp,1.6+Math.random()*5,Math.cos(a)*sp);
   fx.life=.35+Math.random()*.8;fx.mesh.material.opacity=1;
  }
  for(const fx of this.crashDebris){
    fx.mesh.visible=true;fx.mesh.position.set(p.x,.6+Math.random()*.5,p.z);
    const dir=Math.random()*Math.PI*2,speed=2+Math.random()*8;
    fx.vel.set(Math.cos(dir)*speed,2+Math.random()*6,Math.sin(dir)*speed);
    fx.spin.set(Math.random()*14-7,Math.random()*12-6,Math.random()*14-7);
    fx.life=1+Math.random()*1.3;
  }
  $('wreckReason').textContent=reason+' // '+breakdown.penalty+'% RUN XP LOST';
  $('wreckTotal').textContent=fmt(breakdown.total);
  $('wreckLost').textContent='−'+fmt(breakdown.lost);
  $('wreckBanked').textContent='+'+fmt(breakdown.banked);
  $('crashFlash').classList.remove('hidden');
  $('wreckScreen').classList.add('hidden');
  this.audio?.impact();
  // Impact burst uses synthesized audio, so no external soundtrack is required.
  try{
   const Context=window.AudioContext||window.webkitAudioContext;
   if(Context){this.audioContext ||= new Context();const ctx=this.audioContext;
    if(ctx.state==='running'){
     const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sawtooth';osc.frequency.setValueAtTime(125,ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(32,ctx.currentTime+.33);
     gain.gain.setValueAtTime(.11,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.36);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.37);
    }
   }
  }catch{}
 }
 updateCrash(dt){
  const c=this.crashState;if(!c)return;c.time+=dt;
  for(const fx of this.crashSparks){if(fx.life<=0){fx.mesh.visible=false;continue;}
   fx.life-=dt;fx.vel.y-=9.8*dt;fx.mesh.position.addScaledVector(fx.vel,dt);fx.mesh.rotation.x+=dt*15;fx.mesh.rotation.z+=dt*11;
   fx.mesh.material.opacity=Math.max(0,Math.min(1,fx.life*2.8));if(fx.life<=0)fx.mesh.visible=false;
  }
  for(const fx of this.crashDebris){if(fx.life<=0){fx.mesh.visible=false;continue;}fx.life-=dt;fx.vel.y-=12*dt;fx.mesh.position.addScaledVector(fx.vel,dt);fx.mesh.rotation.x+=fx.spin.x*dt;fx.mesh.rotation.y+=fx.spin.y*dt;fx.mesh.rotation.z+=fx.spin.z*dt;if(fx.mesh.position.y<.05){fx.mesh.position.y=.05;fx.vel.multiplyScalar(.42);}if(fx.life<=0)fx.mesh.visible=false;}
  if(this.car){const t=Math.min(c.time,2.2),shake=Math.max(0,1-t/1.45);
    const recoil=(1-Math.exp(-t*4.4))*.64,sway=c.side*Math.sin(t*6.5)*.10*shake;
    this.car.position.set(c.x-c.dirX*recoil+Math.cos(c.heading)*sway,
      Math.max(0,Math.sin(Math.min(1,t/.8)*Math.PI))*.13*shake,
      c.z-c.dirZ*recoil-Math.sin(c.heading)*sway);
    this.car.rotation.y=c.heading+c.side*(1-Math.exp(-t*2.4))*.68;
    this.car.rotation.z=c.side*Math.sin(Math.min(t,1.5)*2.25)*.19*shake;
    this.car.rotation.x=Math.sin(Math.min(t,1.7)*2.5)*.11*shake;
  }
  if(c.time>.45)$('crashFlash').classList.add('hidden');
  if(c.time>1.65){$('wreckScreen').classList.remove('hidden');document.body.classList.remove('impact-active');}
 }

 setupTraffic(){const palette=['#79a8e0','#eeeef1','#606a77','#ca473f','#ecbc48','#5c9b8e','#a48aa6'];
  for(let i=0;i<16;i++){
   const c=CARS[[0,1,2,4,6,8,12,13,15,17,20,22][i%12]];const mesh=createCar(c,palette[i%palette.length],{traffic:true});mesh.scale.setScalar(.91);this.scene.add(mesh);
   const lane=[-12,-4,4,12][i%4];const z=35+i*30+Math.random()*28;
   const a={mesh,x:lane,z,speed:14+Math.random()*15};mesh.position.set(a.x,0,a.z);this.traffic.push(a);
  }
 }
 createPolice(swat=false){
  const c=CARS[swat?8:6],mesh=createCar(c,swat?'#14191f':'#10243b',{traffic:true});
  const a=new THREE.Mesh(new THREE.BoxGeometry(.43,.14,.20),new THREE.MeshStandardMaterial({color:swat?0xe6d7a0:0xf52a42,emissive:swat?0xddc482:0xf52a42,emissiveIntensity:3}));
  a.position.set(-.23,2.03,0);const b=new THREE.Mesh(new THREE.BoxGeometry(.43,.14,.20),new THREE.MeshStandardMaterial({color:0x367cff,emissive:0x367cff,emissiveIntensity:3}));b.position.set(.23,2.03,0);mesh.add(a,b);
  if(swat){const shield=new THREE.Mesh(new THREE.BoxGeometry(1.25,.32,.09),new THREE.MeshStandardMaterial({color:'#132335',roughness:.35}));shield.position.set(0,.94,-c.length*.5-.13);mesh.add(shield);}
  const redLight=new THREE.PointLight(0xff2144,swat?2.6:1.7,35,2),blueLight=new THREE.PointLight(0x2c62ff,swat?2.6:1.7,35,2);redLight.position.set(-.45,2.16,-.25);blueLight.position.set(.45,2.16,-.25);mesh.add(redLight,blueLight);
  this.scene.add(mesh);return {mesh,x:0,z:0,heading:0,speed:0,lights:[a,b],flashLights:[redLight,blueLight],police:true,swat};
 }
 startPolice(){if(this.wanted)return;this.wanted=1;this.chaseTime=0;this.wantedTimer=0;this.searchTimer=0;this.bustTimer=0;this.fasterEscape=0;
  for(let i=0;i<2;i++){const p=this.createPolice();p.x=[-8,8][i];p.z=this.player.z-37-i*17;p.heading=this.player.heading;p.mesh.position.set(p.x,0,p.z);this.police.push(p);}
  this.dispatchPolice();notify('POLICE PURSUIT • SPEED EXCEEDED 100 KM/H');
 }
 dispatchPolice(){
  const phrase=this.audio?.radio(this.wanted)||`Police alert level ${this.wanted}`;
  $('dispatchText').textContent=phrase;
  $('dispatchMessage').classList.remove('hidden');this.dispatchUntil=this.elapsed+5;
 }
 increaseWanted(){
  if(this.wanted>=5)return;
  this.wanted++;this.wantedTimer=0;
  const add=this.createPolice(this.wanted>=5);add.x=this.player.x+8;add.z=this.player.z-120;add.mesh.position.set(add.x,0,add.z);this.police.push(add);
  if(this.wanted===3)this.blockadeNext=this.elapsed+4;
  if(this.wanted===4)this.createHelicopter();
  if(this.wanted===5){for(let i=0;i<2;i++){const sw=this.createPolice(true);sw.x=[-10,10][i];sw.z=this.player.z-150-i*25;sw.mesh.position.set(sw.x,0,sw.z);this.police.push(sw);}notify('5 STARS • SWAT INTERCEPT UNITS');}
  this.dispatchPolice();notify(`WANTED LEVEL ${this.wanted} / 5`);
 }
 endPolice(escaped){
  this.audio?.cancelRadio?.();$('dispatchMessage').classList.add('hidden');
  this.police.forEach(p=>this.scene.remove(p.mesh));this.police.length=0;
  this.blockade.forEach(b=>this.scene.remove(b.mesh));this.blockade.length=0;if(this.blockadeRamp){this.scene.remove(this.blockadeRamp);this.blockadeRamp=null;}
  if(this.helicopter){this.scene.remove(this.helicopter);this.helicopter=null;this.heliRotor=null;}if(this.heliSpotTarget)this.scene.remove(this.heliSpotTarget);if(this.heliLightCircle)this.scene.remove(this.heliLightCircle);this.heliSpot=null;this.heliSpotTarget=null;this.heliLightCircle=null;
  this.wanted=0;this.chaseTime=0;this.wantedTimer=0;this.bustTimer=0;this.searchTimer=0;this.blockadeNext=0;this.fasterEscape=0;this.tireDamage=0;
  if(escaped){state.escapes++;const result=award(45+(this.maxSpeed*.3|0));this.maxSpeed=0;earnedXP(result);notify('POLICE LOST YOU • ESCAPE BONUS + XP');}
 }
 createBlockade(){
  this.blockade.forEach(b=>this.scene.remove(b.mesh));this.blockade.length=0;
  if(this.blockadeRamp)this.scene.remove(this.blockadeRamp);this.blockadeRamp=null;
  // Stationary police vans. Three lanes blocked; rightmost lane (+12) is OPEN.
  for(const x of [-12,-4,4]){
   const c=CARS[8],mesh=createCar(c,'#17243a',{traffic:true});mesh.rotation.y=Math.PI/2;
   const vanRoof=new THREE.Mesh(new THREE.BoxGeometry(1.75,.58,2.6),new THREE.MeshStandardMaterial({color:0x1c354c,metalness:.33,roughness:.5}));vanRoof.position.set(0,1.77,-.3);mesh.add(vanRoof);
   const light=new THREE.Mesh(new THREE.BoxGeometry(.78,.10,.25),new THREE.MeshBasicMaterial({color:0x558bff,emissive:0x2269ff,emissiveIntensity:1.4}));light.position.set(0,2.12,-.3);mesh.add(light);
   const vehicle={mesh,x,z:this.player.z+190,speed:0,heading:Math.PI/2,police:true,blockade:true};mesh.position.set(vehicle.x,0,vehicle.z);this.scene.add(mesh);this.blockade.push(vehicle);
  }
  const ramp=new THREE.Group(),rmat=new THREE.MeshStandardMaterial({color:0xf9b64a,metalness:.4,roughness:.5});
  const wedge=new THREE.Mesh(new THREE.BoxGeometry(3.4,.32,6),rmat);wedge.position.y=.21;wedge.rotation.x=-.10;ramp.add(wedge);
  const stripe=new THREE.Mesh(new THREE.BoxGeometry(2.6,.05,.45),new THREE.MeshBasicMaterial({color:0x15273a}));stripe.position.set(0,.47,1.2);ramp.add(stripe);
  ramp.position.set(-4,0,this.player.z+173);this.scene.add(ramp);this.blockadeRamp=ramp;
  this.blockadeNext=this.elapsed+27;notify('POLICE ROADBLOCK • JUMP THE VANS OR TAKE RIGHT LANE');
 }
 updateBlockade(dt){
  if(!this.wanted||this.wanted<3)return;
  if(!this.blockade.length&&this.elapsed>this.blockadeNext)this.createBlockade();
  if(this.blockade.length&&this.blockade[0].z<this.player.z-35){this.blockade.forEach(b=>this.scene.remove(b.mesh));this.blockade.length=0;if(this.blockadeRamp)this.scene.remove(this.blockadeRamp);this.blockadeRamp=null;this.blockadeNext=this.elapsed+26;}
 }
 createHelicopter(){if(this.helicopter)return;
  const g=new THREE.Group(),hull=new THREE.MeshStandardMaterial({color:0x15202e,metalness:.6,roughness:.38});
  const body=new THREE.Mesh(new THREE.SphereGeometry(1.6,16,10),hull);body.scale.set(1,.55,1.6);g.add(body);
  const canopy=new THREE.Mesh(new THREE.SphereGeometry(.85,12,8),new THREE.MeshStandardMaterial({color:0x233e52,metalness:.45,roughness:.13}));canopy.scale.set(.9,.53,1.3);canopy.position.set(0,.12,1.0);g.add(canopy);
  const tail=new THREE.Mesh(new THREE.CylinderGeometry(.18,.31,4.4,8),hull);tail.rotation.x=Math.PI/2;tail.position.z=-3;g.add(tail);
  for(const side of [-1,1]){const skid=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,4.1,8),hull);skid.rotation.x=Math.PI/2;skid.position.set(side*1,-1.1,.25);g.add(skid);}
  const rotor=new THREE.Group();for(const sign of [-1,1]){const blade=new THREE.Mesh(new THREE.BoxGeometry(.12,.04,6.4),hull);blade.rotation.y=sign*Math.PI/4;rotor.add(blade);}rotor.position.y=.96;g.add(rotor);
  const light=new THREE.Mesh(new THREE.ConeGeometry(5,25,20,1,true),new THREE.MeshBasicMaterial({color:'#f4f6c1',transparent:true,opacity:.07,depthWrite:false,side:THREE.DoubleSide}));light.position.set(0,-12,0);g.add(light);
  const spot=new THREE.SpotLight(0xfff9d7,58,115,.48,.75,1.2);
  spot.position.set(0,-.45,.35);g.add(spot);
  const spotTarget=new THREE.Object3D();this.scene.add(spotTarget);spot.target=spotTarget;
  const disc=new THREE.Mesh(new THREE.CircleGeometry(5,32),new THREE.MeshBasicMaterial({color:0xfff7c9,transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide}));
  disc.rotation.x=-Math.PI/2;disc.position.set(this.player.x,.035,this.player.z);this.scene.add(disc);
  g.position.set(this.player.x+24,28,this.player.z-40);this.scene.add(g);
  this.helicopter=g;this.heliRotor=rotor;this.heliLamp=light;this.heliSpot=spot;this.heliSpotTarget=spotTarget;this.heliLightCircle=disc;
  notify('AIR UNIT DEPLOYED • 4 STAR PURSUIT');
 }
 updateHelicopter(dt){if(!this.helicopter||!this.wanted)return;
  const p=this.player,g=this.helicopter;
  g.position.x=THREE.MathUtils.damp(g.position.x,p.x+16,1.2,dt);
  g.position.z=THREE.MathUtils.damp(g.position.z,p.z-22,1.1,dt);
  g.position.y=27+Math.sin(this.elapsed*1.6)*1.5;
  this.heliRotor.rotation.y+=dt*22;
  this.heliLamp.visible=this.wanted>=4;
  if(this.heliSpotTarget){this.heliSpotTarget.position.set(p.x,.12,p.z);}
  if(this.heliLightCircle){this.heliLightCircle.position.x=THREE.MathUtils.damp(this.heliLightCircle.position.x,p.x,5,dt);this.heliLightCircle.position.z=THREE.MathUtils.damp(this.heliLightCircle.position.z,p.z,5,dt);this.heliLightCircle.material.opacity=.11+Math.sin(this.elapsed*4)*.035;}

 }
 setupSmoke(){const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const ctx=canvas.getContext('2d');const gradient=ctx.createRadialGradient(32,32,4,32,32,31);gradient.addColorStop(0,'rgba(255,255,255,.86)');gradient.addColorStop(.42,'rgba(255,255,255,.42)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  const texture=new THREE.CanvasTexture(canvas);
  for(let i=0,n=document.documentElement.dataset.device==='phone'?44:document.documentElement.dataset.device==='tablet'?76:115;i<n;i++){const m=new THREE.SpriteMaterial({map:texture,transparent:true,opacity:0,depthWrite:false});const s=new THREE.Sprite(m);s.visible=false;s.scale.set(1,1,1);this.scene.add(s);this.smokePool.push({s,life:0,max:1});}
 }
 setupSkids(){const material=new THREE.MeshBasicMaterial({color:0x101b20,transparent:true,opacity:.27,depthWrite:false});const geo=new THREE.PlaneGeometry(.23,1.4);
  for(let i=0,n=document.documentElement.dataset.device==='phone'?85:document.documentElement.dataset.device==='tablet'?130:190;i<n;i++){const m=new THREE.Mesh(geo,material);m.rotation.x=-Math.PI/2;m.visible=false;this.scene.add(m);this.skids.push(m);}
 }
 spawnSmoke(dt){this.smokeTimer-=dt;if(this.smokeTimer>0||state.settings.smoke===false)return;this.smokeTimer=({low:.09,medium:.055,high:.03}[state.settings.particles]||.055);const {x,z,heading}=this.player;
  for(const sx of [-1,1]){const s=this.smokePool[this.smokeHead++%this.smokePool.length];const side=sx*.74,back=-1.38;
   s.s.position.set(x+Math.cos(heading)*side+Math.sin(heading)*back,.30,z-Math.sin(heading)*side+Math.cos(heading)*back);
   s.s.material.color.set(carSave().smoke);s.s.material.opacity=.35;s.s.scale.set(1,1,1);s.s.visible=true;s.life=1.3;s.max=1.3;
   const skid=this.skids[this.skidHead++%this.skids.length];skid.visible=true;skid.position.set(s.s.position.x,.035,s.s.position.z);skid.rotation.set(-Math.PI/2,0,-heading);
  }
 }
 updateSmoke(dt){for(const o of this.smokePool){if(o.life<=0)continue;o.life-=dt;if(o.life<=0){o.s.visible=false;continue;}o.s.position.y+=dt*.46;o.s.scale.setScalar(1+(.5*(o.max-o.life))*2.6);o.s.material.opacity=.43*Math.pow(Math.max(0,o.life/o.max),1.5);}}
 frame(now){const fps=Number(state.settings.fps||60);if(fps>0&&now-this.lastRender<1000/fps*.93)return;this.lastRender=now;
  let dt=Math.min(this.clock.getDelta(),.05);if(!Number.isFinite(dt)||dt<=0)dt=.016;
  if(pauseActive&&mode==='game'){this.renderer.render(this.scene,this.camera);return;}
  if(this.playing&&!modalKind){
   if(this.crashState){this.updateCrash(dt);this.accum=0;}
   else{this.accum+=dt;const STEP=1/90;let n=0;while(this.accum>=STEP&&n++<6){this.tick(STEP);this.accum-=STEP;if(this.crashState)break;}if(n>5)this.accum=0;}
  }
  else{this.accum=0;} // Freeze EVERYTHING before Play or while browsing the garage.
  const revActive=!this.playing&&performance.now()<(this.previewRevEnd||0);
  if(revActive){const revPhase=Math.min(1,(performance.now()-this.previewRevStart)/2900),rpm=1150+6900*Math.sin(Math.PI*revPhase);this.audio?.updateEngine(rpm,revPhase<.66?1:.12,0);if(revPhase>.70&&!this.previewRevPopped){this.previewRevPopped=true;this.audio?.exhaustPop(1.3);}}
  else if(!this.playing)this.audio?.updateEngine(850,0,0);
  if(!this.playing)for(const f of this.car?.userData?.exhaustFlames||[])f.visible=false;
  if(this.morph){this.morph.position.set(this.player.x,0,this.player.z);this.morph.rotation.y=this.player.heading;}
  this.updateSmoke(this.playing?dt:0);this.world.update(this.player.z);this.updateCamera(this.playing?dt:0.016);
  this.audio?.update(this.playing?this.wanted:0);this.renderer.render(this.scene,this.camera);if(showroom)showroom.render(dt);this.updateHUD();
 }
 currentStats(){return performanceStats(getSelected(),carSave().upgrades);}

 tick(dt){
  const p=this.player,stats=this.currentStats(),carTune=carSave().tune;
  if(this.adminFrozen){this.player.vx=this.player.vz=this.player.speed=0;return;}
  this.elapsed+=dt;this.invulnerable=Math.max(0,this.invulnerable-dt);
  if(this.adminGodMode)this.invulnerable=Math.max(this.invulnerable,1);
  const throttle=pressed('accelerate'),brake=pressed('brake'),handbrake=pressed('handbrake');
  const steer=(Number(pressed('right'))-Number(pressed('left')));
  const fw=Math.sin(p.heading),fz=Math.cos(p.heading),rightX=Math.cos(p.heading),rightZ=-Math.sin(p.heading);
  let longitudinal=p.vx*fw+p.vz*fz,lateral=p.vx*rightX+p.vz*rightZ;
  const topSpeed=vehicleSpeedLimitMps(stats.top,this.adminSpeedMultiplier||1);
  // Enough power to reach highway speeds while keeping acceleration smooth.
  // Upgrades increase the actual force applied rather than just the HUD number.
  const maxAccel=stats.acceleration*(1-this.tireDamage*.25)*(this.adminSpeedMultiplier||1);
  const estimatedGear=Math.max(1,Math.min(6,Math.floor(Math.abs(mph(longitudinal))/32)+1));
  if(p.lastGear&&estimatedGear>p.lastGear)p.shiftTimer=stats.shiftTime;
  p.lastGear=estimatedGear;
  p.shiftTimer=Math.max(0,(p.shiftTimer||0)-dt);
  // Transmission and clutch upgrades shorten actual in-game power interruptions.
  if(throttle){const headroom=Math.max(0,topSpeed-Math.max(0,longitudinal));const taper=Math.max(.16,Math.min(1,headroom/Math.max(1,topSpeed*.16)));longitudinal+=maxAccel*taper*dt*(p.shiftTimer>0?.40:1.08)*(this.boostTimer>0?1.7:1);}
  this.boostTimer=Math.max(0,this.boostTimer-dt);this.airTimer=Math.max(0,this.airTimer-dt);

  if(brake){if(longitudinal>2)longitudinal-=stats.brake*dt;else longitudinal-=maxAccel*.55*dt;}
  // Handbrake slows the car while letting the rear slide into a controlled drift.
  if(handbrake){const force=Math.max(5,stats.brake*.42);if(longitudinal>4)longitudinal=Math.max(4,longitudinal-force*dt);else if(longitudinal< -2)longitudinal=Math.min(-2,longitudinal+force*dt);}
  const drag=.00042*longitudinal*Math.abs(longitudinal)+.021*longitudinal;
  longitudinal-=drag*dt;
  longitudinal=THREE.MathUtils.clamp(longitudinal,-15,topSpeed);
  const mphNow=mph(longitudinal);
  // Steering starts a controllable drift at road speeds. Players can countersteer
  // and transition between left/right slides without accumulating infinite yaw.
  const dynamics=driftStep({mph:mphNow,longitudinal,lateral,steer,handbrake,dt,
    blend:p.driftBlend,steeringInput:p.steer,yaw:p.yaw,
    style:state.settings.driftStyle||'street',assist:state.settings.driftAssist!==false,
    steeringSensitivity:Number(state.settings.steering)||1,
    steeringTune:carTune.steering,gripTune:carTune.grip,stabilityTune:carTune.stability,
    tireUpgrade:stats.grip,suspension:stats.susp,steeringKit:stats.steer,differential:stats.diff});
  p.steer=dynamics.steeringInput;p.driftBlend=dynamics.blend;
  lateral=dynamics.lateral;p.yaw=dynamics.yaw;
  p.heading+=(p.yaw-(state.settings.driftAssist!==false?p.heading*.65:0))*dt;
  // Recompute the basis after turning; using the old heading made car movement jitter.
  const fw2=Math.sin(p.heading),fz2=Math.cos(p.heading),rx2=Math.cos(p.heading),rz2=-Math.sin(p.heading);
  p.vx=fw2*longitudinal+rx2*lateral;p.vz=fz2*longitudinal+rz2*lateral;
  // Limit full movement speed, not only forward velocity: slides add sideways speed.
  capVehicleVelocity(p,topSpeed);
  const prevPlayerZ=p.z;
  p.x+=p.vx*dt;p.z+=p.vz*dt;this.checkRoadFeatures(dt);
  // Boost pads can change velocity after normal acceleration; apply the same cap.
  capVehicleVelocity(p,topSpeed);
  p.angle=dynamics.slip;
  if(this.lastThrottle&&!throttle&&p.speed>14&&this.elapsed-(this.lastPopTime||0)>.4){this.audio?.exhaustPop(1+(carSave().upgrades.turbo||0)*.12);this.lastPopTime=this.elapsed;this.backfireUntil=this.elapsed+.16;}
  this.lastThrottle=throttle;
  const engineRpm=900+Math.min(7600,Math.abs(longitudinal)*235+(throttle?700:0)+((p.shiftTimer||0)>0?400:0));
  this.audio?.updateEngine(engineRpm,Number(throttle),mphNow);
  this.maxSpeed=Math.max(this.maxSpeed,Math.round(mphNow));
  if(Math.abs(p.x)>16.3){p.x=THREE.MathUtils.clamp(p.x,-16.3,16.3);if(p.speed>4.5&&this.invulnerable<=0){this.crash('HIGHWAY BARRIER IMPACT');return;}p.vx*=-.15;p.vz*=.72;}
  if(this.car){this.car.position.set(p.x,this.airTimer>0?Math.sin(Math.PI*(1-this.airTimer/this.airDuration))*1.5:Math.sin(this.elapsed*9)*.007,p.z);this.car.rotation.y=p.heading;this.car.rotation.x=this.airTimer>0?-0.09*Math.cos(Math.PI*(1-this.airTimer/this.airDuration)):0;animateWheels(this.car,dt,longitudinal*dt,p.steer);
   const upgraded=carSave().upgrades||{};
   const flameChance=(throttle&&Math.abs(longitudinal)>7)?(this.boostTimer>0?.95:.44+Math.min(.33,(upgraded.turbo||0)*.065+(upgraded.exhaustPerformance||0)*.06)):(this.elapsed<(this.backfireUntil||0)?.98:0);
   const flicker=Math.sin(this.elapsed*38)*.5+.5;
   for(const flame of this.car.userData.exhaustFlames||[]){
     const firing=flameChance>0&&Math.sin(this.elapsed*21+flame.userData.flameOffset)>1-flameChance*1.55;
     flame.visible=!!firing;
     if(firing){flame.scale.set(.65+flicker*.45,.52+flicker*.85,.65+flicker*.45);flame.material.opacity=.65+flicker*.27;}
   }
  }
  this.updateTraffic(dt);this.updatePolice(dt);this.updateBlockade(dt);this.updateHelicopter(dt);
  if(this.invulnerable<=0){for(const a of [...this.traffic,...this.police,...this.blockade]){
    if(a.enabled===false)continue;
    const w1=(getSelected().width||1.8)*.50,w2=(a.blockade?(a.mesh.userData.spec?.length||5.1):(a.mesh.userData.spec?.width||1.8))*.50;const l1=(getSelected().length||4.5)*.43,l2=(a.blockade?(a.mesh.userData.spec?.width||1.8):(a.mesh.userData.spec?.length||4.5))*.43;
    if(Math.abs(a.x-p.x)<(w1+w2)*.94&&Math.abs(a.z-p.z)<(l1+l2)*.90){if(p.speed>3.5||Math.abs(p.vz-(a.speed||0))>6){this.crash(a.swat?'SWAT VEHICLE IMPACT':a.police?'POLICE VEHICLE IMPACT':'TRAFFIC COLLISION');break;}p.vz*=.18;p.vx*=-.1;}
  }}
  if(this.crashState)return;
  if(this.invulnerable<=0)this.checkNearMisses(prevPlayerZ);
  const drift=this.invulnerable<=0&&dynamics.drifting&&p.angle>=6&&mphNow>17;
  if(drift){if(!this.run.active){this.run={score:0,active:true,grace:0,combo:1,seconds:0,nearMisses:0,nearMissXP:0};}
   this.run.grace=2.25;this.run.seconds+=dt;
   this.run.combo=Math.min(8,1+this.run.seconds*.37);
   // V10 XP economy: slow XP accrual and only 1 Drift Coin per 5 banked XP.
   const driftStyleBonus=p.angle>=24&&p.angle<=46?1.18:1;
   this.run.score+=dt*(6+p.angle*.72)*(mphNow/65)*this.run.combo*.6*driftStyleBonus;
   this.spawnSmoke(dt);
  } else if(this.run.active){this.run.grace-=dt;if(this.run.grace<=0)this.endRun(false);}
  if(mphNow>35&&!drift){if(!this.run.active){this.run={score:0,active:true,grace:2.25,combo:1,seconds:0,nearMisses:0,nearMissXP:0};}this.run.grace=Math.max(this.run.grace,2.25);this.run.score+=dt*(1.6+mphNow*.04);}
  this.drifting=drift;
  if(this.adminInfiniteCops&&!this.wanted){this.startPolice();while(this.wanted<5)this.increaseWanted();}
  if(kph(p.speed)>=100 && !this.wanted)this.startPolice();
 }
 checkRoadFeatures(dt){
  if(!this.playing||this.crashState)return;
  const p=this.player;
  if(p.speed<8)return;
  const feature=(kind,last)=>{for(const chunk of this.world.chunks){const marker=chunk.userData[kind];if(!marker)continue;const z=chunk.position.z+marker.z,id=Math.round(z);if(Math.abs(p.z-z)<2.3&&Math.abs(p.x-marker.x)<2.7&&id!==this[last])return id;}return null;};
  const boost=feature('boost','lastBoostCell');
  if(boost!==null){this.lastBoostCell=boost;this.boostTimer=3.4;const forward=new THREE.Vector2(Math.sin(p.heading),Math.cos(p.heading));p.vx+=forward.x*13;p.vz+=forward.y*13;this.run.active=true;this.run.grace=2.6;this.run.score+=85;this.showFeature('BOOST PAD  +85 XP',2.8);}
  const ramp=feature('ramp','lastRampCell');
  if(ramp!==null){this.lastRampCell=ramp;this.airDuration=1.15*(this.adminJumpMultiplier||1);this.airTimer=this.airDuration;this.run.active=true;this.run.grace=2.6;this.run.score+=120;this.showFeature('RAMP JUMP  +120 XP',2.8);}
  if(this.blockadeRamp&&Math.abs(p.z-this.blockadeRamp.position.z)<3&&Math.abs(p.x-this.blockadeRamp.position.x)<2.7&&this.airTimer<=0){this.airDuration=2.4*(this.adminJumpMultiplier||1);this.airTimer=this.airDuration;this.invulnerable=Math.max(this.invulnerable,this.airDuration);this.showFeature('ROADBLOCK JUMP • CLEAR THE VANS',3.2);}
 }
 showFeature(text,duration=2){$('featureNotice').textContent=text;$('featureNotice').classList.remove('hidden');this.featureUntil=this.elapsed+duration;}
 checkNearMisses(previousPlayerZ){
  const p=this.player;
  if(mph(p.speed)<45||p.vz<22||Math.abs(p.heading)>0.9)return;
  for(const a of this.traffic){
   if(!a.enabled)continue;
   const before=a.previousZ-previousPlayerZ;
   const after=a.z-p.z;
   // Count an overtake only at the instant the traffic crosses from ahead to behind.
   // Traffic that gets teleported during chunk recycling cannot trigger a bonus.
   if(!(before>=0&&after<0)||before>8||after< -8||p.vz-a.speed<5)continue;
   const clearance=Math.abs(p.x-a.x);
   // Collision distance is roughly 1.8 metres, so reward only genuinely close safe passes.
   if(clearance<2.25||clearance>5.2)continue;
   if(this.elapsed-this.lastNearMiss<=12)this.nearMissStreak=Math.min(10,this.nearMissStreak+1);
   else this.nearMissStreak=1;
   this.lastNearMiss=this.elapsed;
   const perfect=clearance<3;
   const base=Math.round((perfect?55:35)+Math.min(25,mph(p.speed)*.14));
   const multiplier=Math.min(2,1+(this.nearMissStreak-1)*.115);
   const gained=Math.round(base*multiplier);
   if(!this.run.active){this.run={score:0,active:true,grace:0,combo:1,seconds:0,nearMisses:0,nearMissXP:0};}
   this.run.score+=gained;
   this.run.nearMisses++;
   this.run.grace=Math.max(this.run.grace,3.2);
   state.nearMisses++;
   this.run.nearMissXP+=gained;
   state.bestNearMiss=Math.max(state.bestNearMiss,gained);
   save();
   $('nearMissTitle').textContent=perfect?'PERFECT NEAR MISS':'NEAR MISS';
   $('nearMissValue').textContent=`+${fmt(gained)} RUN XP`;
   $('nearMissStreak').textContent=`STREAK ×${this.nearMissStreak}`;
   const flash=$('nearMissFlash');flash.classList.remove('hidden');flash.classList.remove('pop');
   void flash.offsetWidth;flash.classList.add('pop');
   this.nearMissFlashUntil=this.elapsed+2;
  }
 }
 endRun(crashed){
  const score=Math.max(0,Math.round(this.run.score));
  const multiplier=crashMultiplier(crashed);
  const received=Math.floor(score*multiplier);
  const breakdown={total:score,banked:received,lost:score-received,penalty:Math.round((1-multiplier)*100)};
  if(this.run.active&&score>0){
   const result=award(received);
   queueOnlineXP(received);
   state.nearMissXP+=Math.floor(this.run.nearMissXP*multiplier);
   if(this.run.seconds>.3)state.drifts++;
   state.bestDrift=Math.max(state.bestDrift,received);save();earnedXP(result);
   if(!crashed)notify(`BANKED +${fmt(received)} XP / EARNED +${fmt(result.coins||0)} DC`);
  }
  this.run={score:0,active:false,grace:0,combo:1,seconds:0,nearMisses:0,nearMissXP:0};
  return breakdown;
 }
 crash(reason){
  if(this.invulnerable>0||this.crashState)return;
  const breakdown=this.endRun(reason);
  state.crashes++;save();this.invulnerable=5;this.nearMissStreak=0;this.drifting=false;
  this.endPolice(false);this.createImpact(reason,breakdown);
 }
 updateTraffic(dt){const p=this.player;
  for(const a of this.traffic){if(!a.enabled)continue;a.previousZ=a.z;a.z+=a.speed*dt;if(a.z<p.z-160){a.z=p.z+250+Math.random()*200;a.x=[-12,-4,4,12][Math.random()*4|0];}if(a.z>p.z+520){a.z=p.z-180-Math.random()*80;}
   if(Math.abs(a.z-a.previousZ)>100)a.previousZ=a.z;
   a.mesh.position.set(a.x,0,a.z);animateWheels(a.mesh,dt,a.speed*dt,0);
  }
 }
 updatePoliceLights(){for(const p of this.police){const red=Math.sin(this.elapsed*19)>0;p.lights[0].visible=red;p.lights[1].visible=!red;if(p.flashLights){p.flashLights[0].visible=red;p.flashLights[1].visible=!red;}}}
 updatePolice(dt){if(!this.wanted)return;
  this.chaseTime+=dt;
  // Wanted stars rise from sustained dangerous driving, not only long chases.
  // The old 25-second timer combined with instant escapes hid levels 3–5.
  const velocity=kph(this.player.speed);
  this.wantedTimer+=dt*wantedHeatRate(velocity,this.player.angle);
  if(nextWantedLevel(this.wanted,this.wantedTimer)>this.wanted)this.increaseWanted();
  const p=this.player,fast=mph(p.speed)>135;
  let closest=Infinity,visible=0;
  for(let i=0;i<this.police.length;i++){
   const a=this.police[i],dx=p.x-a.x,dz=p.z-a.z,dist=Math.hypot(dx,dz);closest=Math.min(closest,dist);
   const behind=dist>235;const targetX=behind?a.x:p.x+(a.swat&&dist<55?(i%2?.35:-.35):0);
   const desired=Math.atan2(targetX-a.x,p.z-a.z);const correction=Math.atan2(Math.sin(desired-a.heading),Math.cos(desired-a.heading));
   a.heading+=THREE.MathUtils.clamp(correction,-(a.swat?1.1:1.25)*dt,(a.swat?1.1:1.25)*dt);
   // Patrols are slower than most tuned performance cars. No forced teleporting.
   const cap=Math.max([0,35,39,44,49,55][this.wanted]+(a.swat?9:0),Math.min(p.speed*(a.swat?1.12:1.01),a.swat?84:69));
   const targetSpeed=Math.min(cap,Math.max(15,dist>80?cap:Math.max(10,p.speed*(a.swat?1.0:.78))));
   a.speed=THREE.MathUtils.damp(a.speed,targetSpeed,.75,dt);
   a.x+=Math.sin(a.heading)*a.speed*dt;a.z+=Math.cos(a.heading)*a.speed*dt;
   a.mesh.position.set(a.x,0,a.z);a.mesh.rotation.y=a.heading;
   animateWheels(a.mesh,dt,a.speed*dt,correction);
   if(dist<145)visible++;
   if(a.swat&&dist<26&&this.elapsed-(a.lastShot||0)>8){a.lastShot=this.elapsed;
     // Simulated non-graphic tactical tire damage. Slower acceleration until escaped.
     if(dist<18){this.tireDamage=Math.min(1,this.tireDamage+.25);notify('SWAT TIRE HIT • HANDLING REDUCED');this.audio?.impact();}
   }
  }
  this.updatePoliceLights();
  if(closest<4.5&&p.speed<13)this.bustTimer+=dt;else this.bustTimer=Math.max(0,this.bustTimer-dt*2);
  if(this.bustTimer>2.7){this.crash('BUSTED BY POLICE');return;}
  // Outrunning patrols is an actual escape method, even with a helicopter.
  if(fast&&p.speed>Math.max(...this.police.map(a=>a.speed),0)+10)this.fasterEscape+=dt;else this.fasterEscape=Math.max(0,this.fasterEscape-dt*.75);
  if(closest>135)this.searchTimer+=dt;else this.searchTimer=Math.max(0,this.searchTimer-dt*1.6);
  const fastThreshold=this.wanted>=4?13:6;
  const distanceThreshold=this.wanted>=4?24:11; // helicopter extends the search at 4/5 stars
  if(!this.adminInfiniteCops&&this.chaseTime>26&&(this.fasterEscape>fastThreshold||this.searchTimer>distanceThreshold))this.endPolice(true);
  this.nearestPolice=closest;
 }
 updateCamera(dt){const p=this.player;let dx,dy,dz,lookX,lookY,lookZ;const h=p.heading;
  if(mode!=='game'){
    const ang=.18+Math.sin(this.elapsed*.55)*.25;
    dx=p.x+Math.sin(h+ang)*7;dy=3.3;dz=p.z-Math.cos(h+ang)*10;lookX=p.x;lookY=1;lookZ=p.z+1.2;
  }else if(this.cameraMode===2){dx=p.x+Math.sin(h)*.23;dy=1.63+(this.airTimer>0?.25:0);dz=p.z+Math.cos(h)*.90;lookX=p.x+Math.sin(h)*32;lookY=1.15;lookZ=p.z+Math.cos(h)*32;}
  else{const dist=(this.cameraMode===1?5.9:8.9)*Math.max(.75,Math.min(1.45,(Number(state.settings.cameraDistance)||100)/100));const height=this.cameraMode===1?2.5:3.9;
   dx=p.x-Math.sin(h)*dist;dy=height;dz=p.z-Math.cos(h)*dist;lookX=p.x+Math.sin(h)*4.4;lookY=1.1;lookZ=p.z+Math.cos(h)*4.4;}
  if(this.crashState){
    const c=this.crashState,t=Math.min(c.time,2.2),orbit=.10*Math.min(1,t/1.2);
    const cx=this.car?.position.x??c.x,cz=this.car?.position.z??c.z;
    const h=c.heading-orbit,back=8,side=4.6;
    dx=cx-Math.sin(h)*back+Math.cos(h)*side;
    dy=4.05+Math.sin(Math.min(t,1.6)*1.4)*.18;
    dz=cz-Math.cos(h)*back-Math.sin(h)*side;
    lookX=cx;lookY=1.1;lookZ=cz;
  }
  // Fix fast acceleration camera lag and avoid a widening third-person zoom.
  const desiredCamera=new THREE.Vector3(dx,dy,dz);
  const followRate=mode==='game'?(this.crashState?8:Math.min(26,9+Math.abs(p.speed)*.36)*Math.max(.25,Math.min(1.25,(Number(state.settings.cameraSmoothing)||100)/100))):2;
  const lerp=1-Math.exp(-followRate*Math.max(.001,dt));
  if(this.crashState)this.camera.position.copy(desiredCamera);
  else this.camera.position.lerp(desiredCamera,lerp);
  if(mode==='game'&&!this.crashState){
   const maxLag=this.cameraMode===2?1.8:3.7;
   const gap=this.camera.position.distanceTo(desiredCamera);
   if(gap>maxLag)this.camera.position.lerp(desiredCamera,(gap-maxLag)/gap);
  }
  const look=new THREE.Vector3(lookX,lookY,lookZ);this.lookAt ||= look.clone();
  if(this.crashState)this.lookAt.copy(look);else this.lookAt.lerp(look,Math.min(1,lerp*1.5));
  this.camera.lookAt(this.lookAt);
  this.camera.fov=THREE.MathUtils.damp(this.camera.fov,this.crashState?55:mode==='game'?Math.max(55,Math.min(88,Number(state.settings.cameraFov)||64))+Math.min(2,Math.max(0,mph(p.speed))/140):62,3,dt);this.camera.updateProjectionMatrix();
 }
 updateHUD(){if(mode!=='game')return;
  const p=this.player;
  // Recheck the physical velocity before HUD output, even after boosts or status updates.
  capVehicleVelocity(p,vehicleSpeedLimitMps(this.currentStats().top,this.adminSpeedMultiplier||1));
  let speed=state.settings.units==='kph'?kph(p.speed):mph(p.speed);
  $('speedNumber').textContent=Math.round(speed).toString();$('speedUnit').textContent=state.settings.units==='kph'?'KM/H':'MPH';
  const rpm=Math.min(8000,Math.round(850+Math.abs(mph(p.speed))*41));
  $('rpm').textContent=String(rpm);$('rpmLine').style.width=`${Math.min(100,rpm/80)}%`;
  $('gear').textContent=p.speed<.7?'N':(p.vx*Math.sin(p.heading)+p.vz*Math.cos(p.heading))<0?'R':String(Math.min(6,Math.floor(mph(p.speed)/32)+1));
  $('boost').textContent=this.boostTimer>0?('PAD '+Math.ceil(this.boostTimer)+'s'):(carSave().upgrades.turbo>0||carSave().upgrades.supercharger>0)?Math.round(Math.min(100,mph(p.speed)/1.8))+'%':'N/A';
  $('runScore').textContent=fmt(this.run.score)+' XP';$('runEarnedCoins').textContent='THIS RUN +'+fmt(Math.floor(this.run.score/5))+' DC • BANK AT EXIT';
  $('featureNotice').classList.toggle('hidden',!(this.featureUntil>this.elapsed));$('nearMissCount').textContent=fmt(state.nearMisses);
  if(this.elapsed>this.nearMissFlashUntil)$('nearMissFlash').classList.add('hidden');$('combo').textContent='×'+this.run.combo.toFixed(1);
  $('driftNotice').classList.toggle('hidden',!this.drifting);
  $('driftSplash').textContent=fmt(this.run.score);
  $('driftRating').textContent=p.angle>=24&&p.angle<=46?'PERFECT SLIDE':p.angle>46?'WIDE DRIFT':'CLEAN DRIFT';
  $('driftMeterFill').style.width=Math.min(100,p.angle/75*100)+'%';
  $('driftMeterPin').style.left=Math.min(100,p.angle/75*100)+'%';
  $('driftAngle').textContent=`${p.angle>=24&&p.angle<=46?'PERFECT SLIDE':p.angle>46?'WIDE ANGLE':'CLEAN DRIFT'} • ${Math.round(p.angle)}° • ${this.run.combo.toFixed(1)}× COMBO`;
  $('wanted').classList.toggle('hidden',!this.wanted);$('stars').textContent='★'.repeat(this.wanted)+'☆'.repeat(Math.max(0,5-this.wanted));if(this.elapsed>this.dispatchUntil)$('dispatchMessage').classList.add('hidden');
  const closest=this.police.reduce((best,a)=>Math.hypot(a.x-p.x,a.z-p.z)<Math.hypot((best?.x??99999)-p.x,(best?.z??99999)-p.z)?a:best,null);
  const dist=closest?Math.hypot(closest.x-p.x,closest.z-p.z):Infinity;
  if(closest){const lx=closest.x-p.x,lz=closest.z-p.z;const side=lx*Math.cos(p.heading)-lz*Math.sin(p.heading),ahead=lx*Math.sin(p.heading)+lz*Math.cos(p.heading);const arrow=Math.abs(side)>Math.abs(ahead)*.65?(side>0?'→':'←'):(ahead>0?'↑':'↓');$('policeArrow').textContent=arrow+' POLICE '+Math.round(dist)+'m';}
  $('copGlow').classList.toggle('hidden',!this.wanted||dist>145);$('copGlow').style.opacity=String(Math.min(.28,Math.max(.04,(145-dist)/620))); 
 }
}

try{applyUI();applyGarageTheme();cashRefresh();game=new DriftGame();try{showroom=new Showroom();applyUI();}catch(e){console.warn('3D showroom disabled:',e);}renderPage(googleOAuthReturned?'account':'home');checkUsernameGate();syncPaidState();setTimeout(()=>showDeviceChooser(googleOAuthReturned),150);const paymentReturn=new URLSearchParams(location.search).get('checkout');if(paymentReturn){history.replaceState(null,'',location.pathname);if(paymentReturn==='success'){notify('PAYMENT RETURNED • VERIFYING WITH STRIPE');let attempt=0;const check=async()=>{await syncPaidState();if(++attempt<6)setTimeout(check,2000);};setTimeout(check,1500);}else notify('CHECKOUT CANCELED • NO CHARGE');}fetchAnnouncements();setInterval(fetchAnnouncements,25000);setTimeout(refreshPlayerControlState,1600);setInterval(refreshPlayerControlState,14000);setInterval(sendPlayerTelemetry,11000);setInterval(flushOnlineXP,23000);}
catch(e){errorScreen(e);}
