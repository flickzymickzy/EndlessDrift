import * as THREE from 'three';
// Styles load from index.html so no installation/build step is needed.
import {CARS,UPGRADES,BODY_PARTS,COLORS,SMOKES,GARAGE_THEMES,BATTLE_PASS,PREMIUM_PASS,BASE_RIMS,BASE_NEONS,COSMETIC_SHOP,fmt,mph,kph,upgradeCost,levelStart,levelFromXP,levelTitle} from './data.js';
import {state,save,carSave,pay,award,getSelected,cosmeticUnlocked,exportSave,importSave} from './store.js';
import {createWorld} from './world.js';
import {createCar,setCarPaint,setCarCosmetics,animateWheels} from './car.js';
import {Showroom} from './showroom.js';
import {Soundtrack} from './audio.js';
import {driftStep} from './driftPhysics.js';
import {crashMultiplier} from './penalties.js';
import {wantedHeatRate,nextWantedLevel} from './pursuit.js';
import {performanceStats,upgradePreview,PERFORMANCE_FIELDS} from './performance.js';
import {cloudConfigured,cloudSignUp,cloudSignIn,cloudSignInGoogle,cloudSignOut,cloudUser,cloudBoard,cloudProfile,cloudUpdateUsername,googleOAuthReturned} from './cloud.js';
import {purchased,clearPurchased,refreshPurchased,beginCheckout,spendPurchased} from './payments.js';

const app=document.querySelector('#app');
if(!app)throw new Error('Missing #app element. Check index.html.');
app.innerHTML=`
<canvas id="view" aria-label="3D drifting game"></canvas><div id="tone"></div>
<div id="ui">
  <header class="topbar">
    <div class="brand">ENDLESS <span>DRIFT</span><small>DRIVE // DRIFT // EARN</small></div>
    <nav class="toplinks" aria-label="Main navigation">
      <button data-page="home" class="active">HOME</button><button data-page="game">DRIVE</button><button data-page="garage">GARAGE</button><button data-page="shop">SHOP</button><button data-page="coins">COINS</button><button data-page="battlepass">DRIFT PASS</button><button data-page="leaderboard">RANKS</button><button data-page="account">ACCOUNT</button><button data-page="settings">SETTINGS</button>
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
      <h1>ENDLESS<br/><span>DRIFT</span></h1>
      <p class="hero-sub">No finish line. No limits. Build your dream garage, chain massive drifts, earn near-miss XP and Drift Coins, and outrun the cops.</p><div class="home-level" id="homeLevel">LEVEL 1 · ROOKIE DRIVER</div>
      <div class="hero-actions"><button class="btn primary" data-page="game">▶ START DRIVING</button><button class="btn ghost" data-page="garage">EXPLORE GARAGE</button></div>
      <div class="hero-stats"><div><strong>${CARS.length}</strong><small>CARS TO COLLECT</small></div><div><strong>100 KM/H</strong><small>POLICE PURSUITS</small></div><div><strong>∞</strong><small>ENDLESS HIGHWAY</small></div></div>
    </div><div class="hero-footer">ARCADE DRIFT EXPERIENCE • VERSION 13.0 • SHOWROOM / STUDIO</div>
  </section>
  <section id="screen" class="panescreen hidden" aria-live="polite"></section>
  <div id="hud" class="hud hidden">
    <div class="hud-top"><div class="tag featured-tag"><small>RUN XP • 5 XP = 1 DC <span class="live-dot"></span></small><b id="runScore">0 XP</b></div><div class="tag"><small>COMBO</small><b id="combo">×1.0</b></div><div class="tag"><small>TOTAL NEAR MISSES</small><b id="nearMissCount">0</b></div><div class="tag car-tag"><small>CAR</small><b id="hudCar">SAKURA S13</b></div></div>
    <div class="level-mini"><span id="hudLevel">LEVEL 1</span><div><b id="hudLevelBar"></b></div><small id="hudLevelProgress">0 / 1500 XP</small></div>
    <div id="nearMissFlash" class="near-miss-flash hidden"><strong id="nearMissTitle">NEAR MISS</strong><span id="nearMissValue">+300 XP</span><small id="nearMissStreak">STREAK ×1</small></div>
    <div id="dispatchMessage" class="dispatch-message hidden" aria-live="polite"><small>POLICE DISPATCH</small><strong id="dispatchText"></strong></div>
    <div class="hud-top-right"><div id="wanted" class="wanted hidden"><small>POLICE PURSUIT</small><span id="stars">☆☆☆☆☆</span></div><button class="btn small ghost" id="customFromHud">CUSTOMIZE</button></div>
    <div class="drift-notice hidden" id="driftNotice"><div class="drift-rating" id="driftRating">CLEAN DRIFT</div><div class="score" id="driftSplash">DRIFT!</div><div class="combo" id="driftAngle">SUSTAIN YOUR DRIFT</div><div class="drift-meter"><i id="driftMeterFill"></i><b id="driftMeterPin"></b></div><small class="drift-meter-note">STEER SMOOTHLY • HOLD A / D TO SLIDE</small></div>
    <div class="hud-bottom-left"><button class="btn" id="pauseHud">PAUSE / MENU</button><button class="btn" data-page="garage">GARAGE</button></div>
    <div class="speed"><div class="speed-number" id="speedNumber">0</div><div class="unit" id="speedUnit">MPH</div><div class="speed-track"><b id="rpmLine"></b></div><div class="speed-bottom"><div><span>GEAR</span> <b id="gear">N</b></div><div><span>RPM</span> <b id="rpm">800</b></div><div><span>BOOST</span> <b id="boost">0%</b></div></div></div>
  </div>
  <div id="pauseScreen" class="pause-screen hidden" role="dialog" aria-modal="true" aria-labelledby="pauseTitle">
    <div class="pause-card">
      <div class="pause-kicker">ENDLESS DRIFT // GAME STOPPED</div>
      <h2 id="pauseTitle">PAUSED<span> / /</span></h2>
      <p id="pauseReason">Your run is frozen. Resume whenever you're ready.</p>
      <div class="pause-status"><span id="pauseCar">CURRENT RIDE</span><span id="pauseXP">0 RUN XP</span></div>
      <div class="pause-buttons">
        <button class="btn primary" id="resumeGame">▶ RESUME DRIVING</button>
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
  <div id="toast" class="toast hidden" role="status"></div><div id="levelUp" class="level-up hidden" aria-live="polite"><small>DRIVER RANK INCREASED</small><strong id="levelUpNumber">LEVEL 2</strong><span id="levelUpTitle">STREET RACER</span><p id="levelUpReward">+400 XP BONUS</p></div>
  <div id="overlay" class="overlay hidden"><div class="modal" id="modal"></div></div>
</div>`;
const $=id=>document.getElementById(id);
const dom={view:$('view'),hero:$('hero'),screen:$('screen'),hud:$('hud'),overlay:$('overlay'),modal:$('modal')};
let pauseActive=false;let activeUsername='';let selectedPreview=state.selected;let customizedCar=state.selected;let tuningCar=state.selected;let tuneTab='performance';let pendingUpgrade=null;let pendingVisual=null;let remapping=null;let showroom=null;let passPreviewId=BATTLE_PASS[0].id;let shopPreviewId=(COSMETIC_SHOP[0]||{}).id;let cosmeticPreview=null;let mode='home',modalKind=null,toastTimer=null;
const keys={};let game;
const char=(name)=>String(name||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
 try{await refreshPurchased();cashRefresh();if(mode==='coins')renderCoins();if(mode==='battlepass')renderBattlePass();}
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
 $('pauseCar').textContent=getSelected().name.toUpperCase();
 $('pauseXP').textContent=fmt(game.run.score)+' RUN XP';
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
function clearPause(){pauseActive=false;$('pauseScreen').classList.add('hidden');Object.keys(keys).forEach(key=>keys[key]=false);}
function errorScreen(err){console.error('Endless Drift error:',err);const msg=String(err?.stack||err?.message||err);
 let old=document.getElementById('fatal-error');if(old)return;
 const el=document.createElement('div');el.className='error';el.id='fatal-error';el.innerHTML=`<div class="error-panel"><div class="kicker">GAME STARTUP ERROR</div><h2>Something went wrong</h2><p style="margin:17px 0;line-height:1.8">The game couldn't load. Refresh your website or check the deployment logs in Render. If this continues, copy the error below into ChatGPT.</p><pre></pre><button class="btn primary" onclick="location.reload()">RELOAD GAME</button></div>`;
 el.querySelector('pre').textContent=msg;document.body.appendChild(el);
}
window.addEventListener('error',e=>{if(e.message&&!e.message.includes('ResizeObserver'))errorScreen(e.error||e.message);});
window.addEventListener('unhandledrejection',e=>errorScreen(e.reason));
function applyScale(){document.documentElement.style.setProperty('--scale',String((Number(state.settings.uiScale)||100)/100));}
function applyUI(){
 const s=state.settings,theme={mint:'#5cf2c9',orange:'#ff9165',blue:'#6dbdff',purple:'#b598ff',red:'#ff6c7d'};
 document.documentElement.style.setProperty('--mint',theme[s.uiTheme]||theme.mint);document.documentElement.style.setProperty('--accent-glow',theme[s.uiTheme]||theme.mint);if(showroom?.accentRing)showroom.accentRing.material.color.set(theme[s.uiTheme]||theme.mint);
 document.documentElement.style.setProperty('--hud-opacity',String((Number(s.hudOpacity)||92)/100));
 document.body.dataset.hudLayout=s.hudLayout||'classic';
 document.body.dataset.speedStyle=s.speedStyle||'digital';
 applyScale();
}
function applyGarageTheme(){const theme=GARAGE_THEMES.find(t=>t.id===state.garageTheme)||GARAGE_THEMES[0];document.documentElement.style.setProperty('--garage-wall',theme.wall);document.documentElement.style.setProperty('--garage-floor',theme.floor);document.documentElement.style.setProperty('--garage-accent',theme.accent);}

function renderPage(page){
  if(page!=='game'&&pauseActive)clearPause();
  if(page!=='game'&&game?.playing){
    if(game.crashState)game.respawn();else game.endRun(false);
  }
  mode=page; game&&(game.playing=page==='game');dom.screen.classList.toggle('garage-mode',page==='garage');
  dom.hero.classList.toggle('hidden',page!=='home');dom.screen.classList.toggle('hidden',page==='home'||page==='game');dom.hud.classList.toggle('hidden',page!=='game');
  document.querySelectorAll('.toplinks button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  if(page==='game'){
    game?.audio?.unlock();game?.resetTiming();document.activeElement?.blur?.();
    notify('WASD DRIVE  •  SPACE HANDBRAKE  •  C CAMERA  •  ESC PAUSE');
    return;
  }
  if(page==='garage')renderGarage();
  if(page==='tune')renderTune();
  if(page==='leaderboard')renderLeaderboard();
  if(page==='settings')renderSettings();
  if(page==='battlepass')renderBattlePass();
  if(page==='shop')renderShop();
  if(page==='coins')renderCoins();
  if(page==='account')renderAccount();
}
function header(title,kicker,desc){return `<div class="screen-head"><div><div class="kicker">${kicker}</div><h2>${title}</h2><p>${desc}</p></div><button class="btn ghost" data-page="game">▶ DRIVE</button></div>`;}
function carThumbnail(spec,paint){
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
 const rimColor='#dce8ef';
 return `<svg class="car-thumb" viewBox="0 0 200 74" role="img" aria-label="${char(spec.name)} thumbnail"><defs><linearGradient id="body-${spec.id}" x1="0" x2="1"><stop offset="0%" stop-color="${char(paint)}"/><stop offset="100%" stop-color="${char(accent)}"/></linearGradient></defs><ellipse cx="101" cy="60" rx="90" ry="8" fill="${shadow}"/><path d="${body}" fill="url(#body-${spec.id})" stroke="#ffffff60" stroke-width="1.2"/><path d="M 56 31 Q 77 ${roofY+4} 108 ${roofY+4} L 147 ${roofY+7} L 169 33 Z" fill="${glass}" stroke="#aceaff88" stroke-width="1"/>${spoiler}${stripe}<path d="M 20 44 L 29 43" stroke="#ff6679" stroke-width="3"/><path d="M 175 43 L 187 46" stroke="#ecf4fa" stroke-width="4"/><circle cx="${wheelRear}" cy="53" r="15.4" fill="#090e15"/><circle cx="${wheelFront}" cy="53" r="15.4" fill="#090e15"/><circle cx="${wheelRear}" cy="53" r="10.3" fill="#293746"/><circle cx="${wheelFront}" cy="53" r="10.3" fill="#293746"/><circle cx="${wheelRear}" cy="53" r="8.1" fill="${rimColor}"/><circle cx="${wheelFront}" cy="53" r="8.1" fill="${rimColor}"/><path d="M ${wheelRear-7} 53 H ${wheelRear+7} M ${wheelRear} 46 V 60 M ${wheelFront-7} 53 H ${wheelFront+7} M ${wheelFront} 46 V 60" stroke="#213241" stroke-width="1.6"/></svg>`;
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
   <div class="showcase-actions"><span>DRAG TO ROTATE <span class="separator">•</span> LIVE 3D MODEL</span><div class="showcase-buttons">${owned?`<button class="btn ghost" data-modal="car">PAINT + COSMETICS</button><button class="btn primary" data-tune-car="${car.id}">⚙ TUNE THIS CAR</button>`:`<button class="btn primary" data-confirm-car="${car.id}">UNLOCK FOR ${fmt(car.price)} DC</button>`}</div></div>
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
 const appearance=BODY_PARTS.map(part=>`<div class="body-part"><div class="body-part-head"><h3>${part.label}</h3><p>${part.description}</p></div><div class="body-options">${part.options.map(([id,label,cost])=>{const installed=saveCar.appearance[part.id]===id,bought=cost===0||saveCar.ownedParts.includes(part.id+':'+id),preview=pendingVisual===part.id+'|'+id;return `<button data-preview-visual="${part.id}|${id}" class="body-option ${installed?'active':''} ${preview?'preview-selected':''}"><span>${char(label)}</span><small>${installed?'✓ INSTALLED':bought?'OWNED • VIEW':'PREVIEW • '+fmt(cost)+' DC'}</small></button>`;}).join('')}</div></div>`).join('');
 const [partId,optionId]=(pendingVisual||'|').split('|');const activePart=BODY_PARTS.find(x=>x.id===partId),activeOpt=activePart?.options.find(x=>x[0]===optionId),alreadyOwned=activeOpt&&(activeOpt[2]===0||saveCar.ownedParts.includes(partId+':'+optionId));
 const bodyCheckout=activeOpt?`<div class="purchase-panel"><div><div class="kicker">LIVE VEHICLE PREVIEW</div><h3>${activeOpt[1]}</h3><p>${activePart.description}</p><small>Preview it on the car before spending Drift Coins</small></div><button class="btn primary" data-commit-visual="${pendingVisual}">${saveCar.appearance[partId]===optionId?'✓ INSTALLED':alreadyOwned?'EQUIP OWNED PART':'BUY • '+fmt(activeOpt[2])+' DC'}</button></div>`:'<div class="purchase-panel info-panel">Click a body part to preview it on your vehicle. Confirm with BUY to spend Drift Coins.</div>';
 const colorRow=(colors,key)=>colors.map(c=>`<button class="swatch ${saveCar[key]===c?'active':''}" data-tune-${key}="${c}" title="${key} ${c}" aria-label="${key} ${c}" style="background:${c}"></button>`).join('');
 dom.screen.innerHTML=header('TUNING LAB','BUILD YOUR DREAM CAR',`Live previews and permanent upgrades for ${spec.name}. Purchased parts deduct Drift Coins.`)+`
  <div class="tune-layout">
   <div class="tune-studio"><div class="kicker">LIVE BUILD STUDIO</div><h2>${char(spec.name)}</h2><div id="tuneCarMount" class="tune-car-mount"><div class="showroom-fallback">PREPARING 3D PREVIEW</div></div>
    <div class="tune-wallet">DRIFT COINS <strong>${fmt(state.wallet+purchased.coins)} DC</strong><span>PARTS SAVE TO THIS CAR</span></div>
    <div class="tune-studio-actions"><button class="btn ghost" data-page="garage">← GARAGE</button><button class="btn primary" data-modal="car">DRIFT PASS COSMETICS</button><button class="btn ghost" data-page="shop">STYLE SHOP</button></div>
    <div class="tune-help">DRAG THE CAR TO TURN IT • CHANGES SHOW LIVE</div></div>
   <div class="tune-controls"><div class="tune-tabs"><button data-tune-tab="body" class="${tuneTab==='body'?'active':''}">BODY KITS</button><button data-tune-tab="performance" class="${tuneTab==='performance'?'active':''}">PERFORMANCE</button><button data-tune-tab="paint" class="${tuneTab==='paint'?'active':''}">COLORS + SETUP</button></div>
    <div class="tune-tab-pane ${tuneTab==='body'?'':'hidden'}">${appearance}${bodyCheckout}</div>
    <div class="tune-tab-pane ${tuneTab==='performance'?'':'hidden'}"><div class="upgrade-grid">${upgrades}</div>${upgradeCheckout}</div>
    <div class="tune-tab-pane ${tuneTab==='paint'?'':'hidden'}"><div class="panel panel-pad"><h3>BODY COLOR</h3><div class="swatch-row">${colorRow(COLORS,'color')}</div><h3>DRIFT SMOKE</h3><div class="swatch-row">${colorRow(SMOKES,'smoke')}</div><h3>ALLOY FINISH</h3><div class="swatch-row">${colorRow(BASE_RIMS,'rims')}</div><h3>DRIVING SETUP</h3>${[['grip','Tire grip / control'],['steering','Steering response'],['stability','Drift stability assist']].map(([key,label])=>`<div class="setting"><label>${label}<span class="range-val" id="val-${key}">${saveCar.tune[key]??50}%</span></label><input type="range" min="0" max="100" value="${saveCar.tune[key]??50}" data-tune="${key}" /></div>`).join('')}</div></div>
   </div>
  </div>`;
 mountShowroom('tuneCarMount',spec);if(pendingVisual&&showroom){const [id,variant]=pendingVisual.split('|');showroom.setCar(spec,{...saveCar,appearance:{...saveCar.appearance,[id]:variant}});showroom.render(0.016);}
}
async function renderLeaderboard(){
 dom.screen.innerHTML=header('GLOBAL RANKS','LIFETIME XP / COINS SPENT','Public verified standings, once connected to a scoring backend. Local XP cannot be submitted as a trusted global score.')+`
 <div class="ranks-grid"><section class="panel panel-pad"><div class="kicker">GLOBAL LEADERBOARD</div><h3>TOP XP EARNED</h3><div id="xpLeaderboard" class="leaderboard-table">LOADING...</div></section><section class="panel panel-pad"><div class="kicker">GLOBAL LEADERBOARD</div><h3>MOST COINS SPENT</h3><div id="spentLeaderboard" class="leaderboard-table">LOADING...</div></section></div>
 <div class="panel panel-pad" style="margin-top:16px"><h3>YOUR LOCAL STATS</h3><div class="spec-row"><span>XP EARNED</span><strong>${fmt(state.lifetimeXP)} XP</strong></div><div class="spec-row"><span>DRIFT COINS SPENT</span><strong>${fmt(state.spent)} DC</strong></div><p class="notice">Local scores are not submitted to the global rankings. Server-authoritative score validation is required before public ranked play.</p></div>`;
 if(!cloudConfigured()){document.getElementById('xpLeaderboard').textContent='CONNECT SUPABASE TO LOAD GLOBAL RANKS';document.getElementById('spentLeaderboard').textContent='NOT CONFIGURED';return;}
 try{const [xp,spent]=await Promise.all([cloudBoard('lifetime_xp'),cloudBoard('coins_spent')]);if(mode!=='leaderboard')return;const table=(rows,key)=>rows.length?rows.map((r,i)=>`<div class="rank-row"><span>#${i+1}</span><strong>${char(r.username||'DRIVER')}</strong><b>${fmt(r[key])}</b></div>`).join(''):'NO VERIFIED SCORES YET';document.getElementById('xpLeaderboard').innerHTML=table(xp,'lifetime_xp');document.getElementById('spentLeaderboard').innerHTML=table(spent,'coins_spent');}catch(e){if(mode==='leaderboard'){document.getElementById('xpLeaderboard').textContent='Could not load ranks: '+e.message;document.getElementById('spentLeaderboard').textContent='CHECK DATABASE SETUP';}}
}
function renderBattlePass(){
 const level=levelFromXP(state.lifetimeXP),unlocked=BATTLE_PASS.filter(cosmeticUnlocked).length;
 const all=[...BATTLE_PASS,...PREMIUM_PASS];
 const item=all.find(i=>i.id===passPreviewId)||BATTLE_PASS[0];
 const isPremium=Boolean(item.premium);
 // Paid entitlements must eventually come from an authenticated payment backend.
 const owned=isPremium?(purchased.driftPass&&level>=item.level):cosmeticUnlocked(item);
 const next=BATTLE_PASS.find(i=>!cosmeticUnlocked(i));
 const tierCard=(reward)=>{const free=!reward.premium,ready=free?cosmeticUnlocked(reward):(purchased.driftPass&&level>=reward.level),selected=reward.id===item.id;
  return `<button class="pass-tier pass-v10-tier ${selected?'pass-selected':''} ${ready?'unlocked':'locked'} ${!free?'premium-tier':''}" data-pass-preview="${reward.id}" aria-pressed="${selected}">
   <div class="pass-top"><span>${free?'FREE':'PREMIUM'}</span><span>${ready?'✓ UNLOCKED':free?'LEVEL '+reward.level+' 🔒':'🔒'}</span></div>
   <div class="reward-preview reward-${reward.type}" style="--reward-color:${reward.color}"><div class="reward-symbol"></div></div>
   <div class="pass-type">${reward.type.toUpperCase()}</div><h3>${char(reward.name)}</h3>
   <p>${ready?'OWNED':free?'UNLOCK AT LEVEL '+reward.level:(purchased.driftPass?'REACH LEVEL '+reward.level:'PREMIUM REQUIRED')}</p>
  </button>`;
 };
 dom.screen.innerHTML=header('DRIFT PASS','SEASON 01 // STREET LEGENDS',
  'Two reward tracks. Level up for free cosmetics; premium rewards need a verified real-money purchase. Select ANY reward to preview it.')+`
 <div class="pass-banner panel"><div><div class="kicker">FREE TRACK + PREMIUM TRACK // 30 LEVELS EACH</div><h3>LEVEL ${level} <span>DRIVER</span></h3><p>${unlocked} / ${BATTLE_PASS.length} FREE REWARDS. ${next?`Next: ${next.name}, Level ${next.level}`:'All free rewards unlocked!'}</p></div><div class="pass-banner-actions"><span class="premium-lock">PREMIUM <strong>${purchased.driftPass?'OWNED':'LOCKED'}</strong></span><button class="btn ghost" data-premium-guide>${purchased.driftPass?'PASS OWNED':'BUY PASS • AED 34.99'}</button></div></div>
 <div class="pass-preview-studio panel">
   <div class="pass-preview-visual"><div class="kicker">LIVE 3D REWARD PREVIEW</div><div id="passCarMount" class="pass-car-mount"><div class="showroom-fallback">3D PREVIEW</div></div><span>DRAG TO ROTATE // PREVIEWS ARE FREE</span></div>
   <div class="pass-preview-info"><span class="pass-level-label">${isPremium?'PREMIUM':'FREE'} TRACK / LEVEL ${item.level}</span><h2>${char(item.name)}</h2><div class="pass-chip">${item.type.toUpperCase()}</div><p>See this ${item.type} on your ${char(getSelected().name)} before unlocking. ${isPremium?'Premium access requires a secure payment and server-verified ownership.':'Reach the level to earn it for free.'}</p>
     <div class="pass-reward-sample" style="--reward-color:${item.color}"><span class="sample-dot"></span><strong>${char(item.color.toUpperCase())}</strong><span>${owned?'✓ OWNED':isPremium?(purchased.driftPass?'REACH LEVEL '+item.level:'PREMIUM LOCKED'):'LEVEL '+item.level+' REQUIRED'}</span></div>
     ${isPremium?`<button class="btn primary" ${owned?`data-pass-equip="${item.id}"`:purchased.driftPass?'disabled':'data-premium-guide'}>${owned?'EQUIP REWARD':purchased.driftPass?'REACH LEVEL '+item.level:'BUY DRIFT PASS • AED 34.99'}</button>`:`<button class="btn primary" data-pass-equip="${item.id}" ${owned?'':'disabled'}>${owned?'EQUIP ON CURRENT CAR':'REACH LEVEL '+item.level+' TO UNLOCK'}</button>`}
   </div>
 </div>
 <div class="collection-header"><div><div class="kicker">DUAL REWARD TRACK</div><h3>FREE + PREMIUM DRIFT PASS</h3></div><span class="collection-hint">SCROLL SIDEWAYS TO SEE MORE LEVELS</span></div>
 <div class="pass-v10-wrap"><div class="pass-v10-rail-labels"><div>LEVEL</div><div>FREE</div><div>PREMIUM <span>${purchased.driftPass?'✓':'🔒'}</span></div></div><div class="pass-v10-scroll"><div class="pass-v10-grid">${BATTLE_PASS.map((free,i)=>`<div class="pass-v10-column"><div class="pass-v10-level ${level>=free.level?'pass-v10-reached':''}">${free.level}${level===free.level?' • YOU':''}</div>${tierCard(free)}${tierCard(PREMIUM_PASS[i])}</div>`).join('')}</div></div></div>
 <p class="notice" style="margin-top:19px">Drift Pass requires a signed-in player and server-verified Stripe purchase. Premium rewards become available as you reach their levels. Until live payments are activated, Stripe runs in Sandbox.</p>`;
 previewCosmetic(state.selected,item,'passCarMount');
}
const COIN_PACKS=[
 {id:'starter',coins:1500,price:'AED 9.99'},
 {id:'street',coins:5000,price:'AED 24.99'},
 {id:'legend',coins:12000,price:'AED 49.99'},
];
function renderCoins(){
 dom.screen.innerHTML=header('DRIFT COINS','CURRENCY STORE • STRIPE CHECKOUT','Sign in under Account before buying. Stripe Checkout handles payment. Purchased coins are saved securely in your Supabase account.')+`
 <div class="coin-banner panel panel-pad"><div class="kicker">YOUR CURRENT BALANCE</div><strong>${fmt(state.wallet+purchased.coins)} DC</strong><p>${fmt(state.wallet)} earned on this browser + ${fmt(purchased.coins)} purchased on your account. Online coins require a login to spend.</p></div>
 <div class="coin-pack-grid">${COIN_PACKS.map((pack,i)=>`<div class="coin-pack panel panel-pad"><div class="kicker">${i===0?'STARTER PACK':i===1?'STREET PACK':'LEGEND PACK'}</div><h3>${fmt(pack.coins)} <span>DC</span></h3><p class="muted">${pack.price}</p><div class="coin-symbol">DC</div><button class="btn primary" data-coins-guide="${pack.id}">BUY ${pack.price}</button><small>Secure Stripe Checkout • Sign-in required</small></div>`).join('')}</div>
 <div class="notice">A Stripe webhook must be configured on Render to award paid coins. Purchasing only works while logged in. Offline-earned coins and car saves remain browser-local until cloud saves are developed.</div>`;
}
async function renderAccount(){
 let user=null;let profile=null;let error='';
 if(cloudConfigured()){try{user=await cloudUser();if(user)profile=await cloudProfile();}catch(e){error=e.message;}}
 activeUsername=profile?.username||'';
 if(mode!=='account')return;
 dom.screen.innerHTML=header('DRIVER ACCOUNT','ACCOUNT SYSTEM • OPTIONAL ONLINE SETUP','Create an account to use online features once Supabase is configured. Local game saves remain on this browser until secure cloud saving is developed.')+`
 <div class="account-layout"><div class="panel panel-pad"><div class="kicker">${cloudConfigured()?'ONLINE AUTH':'SETUP NEEDED'}</div>
 ${cloudConfigured()?(user?`<h3>WELCOME BACK</h3><p class="notice">Signed in as ${char(user.email||user.id)}. Online score submissions are disabled until server anti-cheat is implemented.</p><div class="username-panel"><div class="kicker">YOUR PUBLIC DRIVER NAME</div><h3>${char(activeUsername||'NO USERNAME YET')}</h3><p class="muted">${activeUsername.startsWith('driver_')?'Choose a custom driver name for your Google account.':'Visible on the public leaderboard and your account.'}</p><form id="usernameForm" class="username-form"><label for="usernameEdit">CHOOSE / CHANGE USERNAME</label><div class="username-input-row"><input id="usernameEdit" name="username" minlength="3" maxlength="24" pattern="[A-Za-z0-9_]{3,24}" autocomplete="nickname" value="${char(activeUsername.startsWith('driver_')?'':activeUsername)}" placeholder="3–24 letters, numbers or _" required/><button class="btn primary" type="submit">SAVE USERNAME</button></div></form><p class="notice">Run backend/usernames-v13.sql in Supabase first. Usernames must be unique.</p></div><button class="btn ghost" data-cloud-signout>LOG OUT</button>`:`<h3>SIGN UP OR LOG IN</h3><form id="accountForm" class="account-form"><label>USERNAME<input name="username" minlength="3" maxlength="24" pattern="[A-Za-z0-9_]{3,24}" placeholder="Driver name (for sign up)"/></label><label>EMAIL<input type="email" name="email" required autocomplete="email" placeholder="driver@example.com"/></label><label>PASSWORD<input type="password" name="password" required minlength="6" autocomplete="current-password" placeholder="At least 6 characters"/></label><div class="account-buttons"><button class="btn primary" type="submit" data-auth-action="signin">LOG IN</button><button class="btn ghost" type="submit" data-auth-action="signup">CREATE ACCOUNT</button></div></form><div class="oauth-divider"><span>OR CONTINUE WITH</span></div><button class="btn google-login" data-google-login type="button"><svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.27 5.48-4.8 7.18l7.73 6C44.38 38.03 46.98 31.88 46.98 24.55z"/><path fill="#FBBC05" d="M10.53 28.59A14.46 14.46 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.2A23.85 23.85 0 0 0 0 24c0 3.87.92 7.53 2.53 10.78l8-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.92-2.13 15.89-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-8 6.19C6.51 42.62 14.62 48 24 48z"/></svg><span>CONTINUE WITH GOOGLE</span></button><p class="notice">For new email accounts, check your inbox for confirmation if enabled. Google sign-in uses your Google account and does not require a game password.</p>`):`<h3>CONNECT SUPABASE FIRST</h3><p class="notice">Open <code>cloud-config.js</code> and paste your Supabase Project URL and PUBLISHABLE key. Then run the SQL file from the <code>backend</code> folder in Supabase SQL Editor.</p><p class="notice">Do not paste database passwords or service-role keys into this website.</p>`}
 ${error?`<p class="notice">${char(error)}</p>`:''}</div><aside class="panel panel-pad"><div class="kicker">ONLINE SYSTEM STATUS</div><h3>${cloudConfigured()?'CONNECTED CONFIG':'NOT CONNECTED'}</h3><p class="notice">Your paid Drift Coin balance and Drift Pass ownership are stored securely online. Locally earned XP, car purchases, and local saves are still browser-based.</p><button class="btn ghost" data-page="leaderboard">VIEW RANKS</button></aside></div>`;
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
 </div><div class="divider"></div><div class="kicker">DRIVING / CONTROL</div><div class="settings-grid">
 ${select('units','SPEED UNIT',[['mph','MPH'],['kph','KM/H']])}
 ${select('driftAssist','DRIFT ASSIST',[['true','On — easier control'],['false','Off — more freedom']])}
 ${select('driftStyle','DRIFT HANDLING',[['street','Street — smooth and controllable'],['arcade','Arcade — big easy angles'],['pro','Pro — realistic / challenging']])}
 ${select('smoke','DRIFT SMOKE',[['true','On'],['false','Off']])}
 ${slider('steering','STEERING SENSITIVITY',.5,1.8,.1)}
 ${slider('cameraShake','CAMERA SHAKE STRENGTH',0,100,5,'%')}
 </div><div class="divider"></div><div class="kicker">CUSTOM KEYBOARD CONTROLS</div>
 <p class="notice">Click a binding, then press your new key. Escape cancels. The changes save automatically.</p>
 <div class="controls-grid">${Object.entries({accelerate:'Accelerate',brake:'Brake / reverse',left:'Steer left',right:'Steer right',handbrake:'Handbrake / drift',camera:'Change camera',recover:'Respawn / recover',pause:'Pause / menu'}).map(([key,label])=>`<button class="control-bind" data-bind="${key}"><span>${label}</span><kbd>${(s.controls?.[key]||'UNBOUND').replace('Key','').replace('Arrow','').replace('Digit','')}</kbd></button>`).join('')}</div><button class="btn ghost small" data-reset-keys>RESET CONTROLS</button>
 <div class="divider"></div><div class="kicker">MUSIC / AUDIO</div><div class="settings-grid">
 ${select('music','INSTRUMENTAL MUSIC',[['true','On — original instrumental'],['false','Off']])}
 ${select('policeRadio','POLICE RADIO DISPATCH',[['true','On'],['false','Off']])}
 ${slider('musicVolume','MUSIC VOLUME',0,100,5,'%')}
 ${slider('effectsVolume','SOUND EFFECTS',0,100,5,'%')}
 </div><div class="divider"></div><div class="kicker">SAVE DATA / WEBSITE MIGRATION</div><p class="notice" style="margin:12px 0">Moving from localhost to endless-drift.com uses a different browser save area. Export your save here, then import it on your new website to keep cars, XP, Drift Pass rewards and upgrades.</p><div class="save-actions"><button class="btn primary" data-save-export>DOWNLOAD SAVE BACKUP</button><button class="btn ghost" data-save-import>IMPORT SAVE BACKUP</button><input id="saveFileInput" class="hidden" type="file" accept=".json,application/json" /></div><p class="notice" style="margin-top:18px">Controls can be rebound above. Original instrumental audio starts after you click Play. No licensed songs included. Lower settings for slower Macs. Shadows, resolution, particles and traffic density affect the actual game rendering.</p></div>`;
}
function themeModal(){
 dom.modal.innerHTML=`<div class="screen-head"><div><div class="kicker">GARAGE CUSTOMIZATION</div><h2>GARAGE DESIGN</h2></div><button class="btn small ghost" data-close>✕</button></div><p class="muted" style="margin:0 0 20px">Pick a look for your garage menu. Saved for future updates and garage scenes.</p><div class="car-grid">${GARAGE_THEMES.map(t=>`<button class="car-tile" data-theme="${t.id}" style="min-height:120px;background:linear-gradient(135deg,${t.wall},${t.floor})"><div style="height:14px;width:70%;background:${t.accent};border-radius:3px;box-shadow:0 0 24px ${t.accent}55"></div><h3 style="margin-top:20px">${t.name}</h3><div class="sub">${state.garageTheme===t.id?'✓ SELECTED':'APPLY THEME'}</div></button>`).join('')}</div><div class="modal-actions"><button class="btn" data-close>CLOSE</button></div>`;
}
function carModal(){
 const car=CARS.find(c=>c.id===customizedCar)||getSelected(),cs=carSave(customizedCar);
 const preview=cosmeticPreview,selectedItem=preview?.id?[...BATTLE_PASS,...PREMIUM_PASS].find(i=>i.id===preview.id):null;
 const eligible=!selectedItem||(selectedItem.premium?(purchased.driftPass&&levelFromXP(state.lifetimeXP)>=selectedItem.level):cosmeticUnlocked(selectedItem));
 const section=(type,label,free)=>{
  const rewards=[...BATTLE_PASS,...PREMIUM_PASS].filter(i=>i.type===type);
  return `<div class="cosmetic-section"><h3>${label}</h3><div class="swatch-row">${free.map(c=>{
   const current=cs[COSMETIC_SLOT[type]]===c,active=preview?.type===type&&preview.color===c;
   return `<button class="swatch ${current?'active':''} ${active?'preview-selected':''}" data-preview-free="${type}|${c}" title="Preview ${label}: ${c}" aria-label="Preview ${label} ${c}" style="background:${c==='off'?'linear-gradient(135deg,#202935 45%,#ff5454 46%,#ff5454 54%,#202935 55%)':c}"></button>`;
  }).join('')}</div><div class="cosmetic-grid">${rewards.map(item=>{
    const owned=item.premium?(purchased.driftPass&&levelFromXP(state.lifetimeXP)>=item.level):cosmeticUnlocked(item),selected=cs[COSMETIC_SLOT[type]]===item.color,active=preview?.id===item.id;
    return `<button class="cosmetic-item ${owned?'':'locked'} ${selected?'selected':''} ${active?'preview-selected':''}" data-preview-cosmetic="${item.id}"><span class="cosmetic-color" style="background:${item.color}"></span><strong>${char(item.name)}</strong><small>${active?'PREVIEWING':owned?(selected?'EQUIPPED':'UNLOCKED'):(item.premium?'PREMIUM LOCKED':'PREVIEW • LVL '+item.level)}</small></button>`;
  }).join('')}</div></div>`;
 };
 dom.modal.innerHTML=`<div class="screen-head"><div><div class="kicker">LIVE COSMETIC PREVIEW // DRIFT PASS</div><h2>${char(car.name)}</h2></div><button class="btn small ghost" data-close>✕</button></div>
 <div class="cosmetic-showcase"><div id="cosmeticPreviewMount" class="cosmetic-car-mount"><div class="showroom-fallback">CAR PREVIEW</div></div><div class="cosmetic-showcase-detail"><div class="kicker">${preview?'PREVIEW MODE':'CURRENT BUILD'}</div><h3>${preview?char(preview.name):'YOUR CURRENT LOOK'}</h3><p>${preview?'This is how the selected cosmetic looks on your vehicle. Previewing never spends Coins or changes your saved car.':'Choose any cosmetic below to see it on this car before equipping.'}</p><div class="preview-buttons"><button class="btn primary" data-apply-cosmetic ${(!preview||!eligible)?'disabled':''}>${!preview?'SELECT A COSMETIC':!eligible?(selectedItem.premium?'PREMIUM PASS LOCKED':'UNLOCK AT LEVEL '+selectedItem.level):'EQUIP THIS LOOK'}</button><button class="btn ghost" data-clear-cosmetic-preview ${preview?'':'disabled'}>RESET PREVIEW</button></div></div></div>
 ${section('paint','BODY PAINT',COLORS)}
 ${section('smoke','DRIFT SMOKE',SMOKES)}
 ${section('rims','ALLOY RIMS',BASE_RIMS)}
 ${section('neon','UNDERGLOW NEONS',BASE_NEONS)}
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
 if(t.id==='pauseHud'){pauseGame();return;}
 if(t.id==='resumeGame'){resumeGame();return;}
 if(t.id==='restartGame'){resumeGame();game?.recover();return;}
 if(t.dataset.pausePage){clearPause();renderPage(t.dataset.pausePage);return;}
 if(t.dataset.close!==undefined){closeModal();return;}
 if(t.dataset.page){closeModal();if(t.dataset.page==='tune'){tuningCar=state.selected;tuneTab='performance';}renderPage(t.dataset.page);return;}
 if(t.dataset.saveExport!==undefined){const blob=new Blob([exportSave()],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='EndlessDrift-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('SAVE BACKUP DOWNLOADED');return;}
 if(t.dataset.saveImport!==undefined){document.getElementById('saveFileInput')?.click();return;}
 if(t.id==='garageDesign'){showModal('garage');return;}
 if(t.id==='customFromHud'){showModal('car');return;}
 if(t.dataset.coinsGuide){try{await beginCheckout(t.dataset.coinsGuide);}catch(err){notify('CHECKOUT: '+String(err.message||err));}return;}
 if(t.dataset.cloudSignout!==undefined){cloudSignOut().then(()=>{clearPurchased();cashRefresh();notify('LOGGED OUT');renderAccount()}).catch(e=>notify(e.message));return;}
 if(t.dataset.shopPreview){shopPreviewId=t.dataset.shopPreview;renderShop();return;}
 if(t.dataset.shopBuy){const item=COSMETIC_SHOP.find(x=>x.id===t.dataset.shopBuy);if(!item)return;if(shopOwns(item)){notify('YOU ALREADY OWN THIS COSMETIC');return;}if(!await payWithPurchasedCoins(item.price)){notify('NOT ENOUGH DRIFT COINS');return;}state.shopOwned ||= [];state.shopOwned.push(item.id);save();cashRefresh();notify(item.name.toUpperCase()+' PURCHASED');renderShop();return;}
 if(t.dataset.shopEquip){const item=COSMETIC_SHOP.find(x=>x.id===t.dataset.shopEquip);if(!item||!shopOwns(item))return;const slot=COSMETIC_SLOT[item.type],cs=carSave(state.selected);cs[slot]=item.color;save();game?.setCarPreviewCosmetics(state.selected);notify(item.name.toUpperCase()+' EQUIPPED');renderShop();return;}

 if(t.dataset.premiumGuide!==undefined){
  if(purchased.driftPass){notify('YOU ALREADY OWN THE DRIFT PASS');return;}
  try{await beginCheckout('drift_pass');}catch(err){notify('CHECKOUT: '+String(err.message||err));}return;
 }
 if(t.dataset.passPreview){passPreviewId=t.dataset.passPreview;renderBattlePass();return;}
 if(t.dataset.passEquip){const item=[...BATTLE_PASS,...PREMIUM_PASS].find(i=>i.id===t.dataset.passEquip);if(!item||(item.premium?!(purchased.driftPass&&levelFromXP(state.lifetimeXP)>=item.level):!cosmeticUnlocked(item)))return;
   const slot=COSMETIC_SLOT[item.type],cs=carSave(state.selected);cs[slot]=item.color;save();game?.setCarPreviewCosmetics(state.selected);renderBattlePass();notify(item.name.toUpperCase()+' EQUIPPED ON '+getSelected().name.toUpperCase());return;}
 if(t.dataset.previewCosmetic){const item=[...BATTLE_PASS,...PREMIUM_PASS].find(i=>i.id===t.dataset.previewCosmetic);if(!item)return;
   cosmeticPreview={id:item.id,type:item.type,color:item.color,name:item.name};carModal();return;}
 if(t.dataset.previewFree){const [type,color]=t.dataset.previewFree.split('|');if(!COSMETIC_SLOT[type])return;
   cosmeticPreview={type,color,name:color==='off'?'Underglow Off':type.toUpperCase()+' • '+color.toUpperCase()};carModal();return;}
 if(t.dataset.clearCosmeticPreview!==undefined){cosmeticPreview=null;carModal();return;}
 if(t.dataset.applyCosmetic!==undefined){if(!cosmeticPreview)return;const item=cosmeticPreview.id?[...BATTLE_PASS,...PREMIUM_PASS].find(i=>i.id===cosmeticPreview.id):null;
   if(item&&(item.premium?!(purchased.driftPass&&levelFromXP(state.lifetimeXP)>=item.level):!cosmeticUnlocked(item))){notify(item.premium?'DRIFT PASS OR LEVEL NOT UNLOCKED':'REACH DRIFT PASS LEVEL '+item.level+' TO UNLOCK');return;}
   const cs=carSave(customizedCar);cs[COSMETIC_SLOT[cosmeticPreview.type]]=cosmeticPreview.color;save();game?.setCarPreviewCosmetics(customizedCar);
   notify(cosmeticPreview.name.toUpperCase()+' EQUIPPED');cosmeticPreview=null;carModal();return;}
 if(t.dataset.tuneCar){if(!state.owned.includes(t.dataset.tuneCar))return;tuningCar=t.dataset.tuneCar;tuneTab='performance';pendingUpgrade=null;pendingVisual=null;renderPage('tune');return;}
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
   cs.upgrades[u.id]++;pendingUpgrade=null;save();if(tuningCar===state.selected)game?.audio?.setCarProfile(cs.upgrades);cashRefresh();notify(`${u.label.toUpperCase()} LEVEL ${cs.upgrades[u.id]} INSTALLED`);renderTune();return;
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
   if(!cosmetic||(cosmetic.premium?!(purchased.driftPass&&levelFromXP(state.lifetimeXP)>=cosmetic.level):!cosmeticUnlocked(cosmetic))){notify('UNLOCK THIS COSMETIC BY LEVELING UP OR BUYING THE DRIFT PASS');return;}
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
 if(e.target.id==='usernameForm'){
  e.preventDefault();const form=e.target,button=form.querySelector('button[type="submit"]');if(button)button.disabled=true;
  try{const username=String(new FormData(form).get('username')||'').trim();await cloudUpdateUsername(username);activeUsername=username;notify('USERNAME SAVED • @'+username);await renderAccount();}
  catch(err){notify('USERNAME: '+String(err.message||err));if(button)button.disabled=false;}
  return;
 }
 if(e.target.id!=='accountForm')return;e.preventDefault();
 const f=e.target,form=new FormData(f),email=String(form.get('email')||'').trim(),password=String(form.get('password')||''),username=String(form.get('username')||'').trim();
 for(const b of f.querySelectorAll('button'))b.disabled=true;
 try{if(loginAction==='signup'){if(!/^[A-Za-z0-9_]{3,24}$/.test(username))throw new Error('Username: 3–24 letters, numbers or underscores');const result=await cloudSignUp(email,password,username);notify(result?.session?'ACCOUNT CREATED':'ACCOUNT CREATED • CHECK YOUR EMAIL');}else{await cloudSignIn(email,password);notify('SIGNED IN');}renderAccount();syncPaidState();}
 catch(err){notify('ACCOUNT: '+err.message);for(const b of f.querySelectorAll('button'))b.disabled=false;}
});
document.addEventListener('change',async e=>{if(e.target.id!=='saveFileInput')return;try{const file=e.target.files?.[0];if(!file)return;importSave(await file.text());selectedPreview=state.selected;tuningCar=state.selected;cashRefresh();applyUI();game?.setPlayerCar();game?.applyQuality();renderPage('settings');notify('SAVE BACKUP IMPORTED SUCCESSFULLY');}catch(err){notify('IMPORT FAILED: '+(err?.message||'INVALID FILE'));}finally{e.target.value='';}});
dom.overlay.addEventListener('click',e=>{if(e.target===dom.overlay)closeModal();});
document.addEventListener('input',e=>{
 if(e.target.dataset.tune){const key=e.target.dataset.tune,val=Number(e.target.value);carSave(tuningCar).tune[key]=val;const v=$('val-'+key);if(v)v.textContent=`${val}%`;save();return;}
 if(e.target.dataset.setting){let val=e.target.value;const key=e.target.dataset.setting;
   if(['driftAssist','smoke','shadows','music','policeRadio'].includes(key))val=val==='true';
   if(['steering','uiScale','hudOpacity','renderScale','cameraShake','musicVolume','effectsVolume'].includes(key))val=Number(val);
   state.settings[key]=val;const v=$('setting-value-'+key);if(v)v.textContent=val+(['hudOpacity','uiScale','renderScale','cameraShake'].includes(key)?'%':'');
   updateSettings();
 }
});
function bound(action,code){return (state.settings.controls?.[action]||({accelerate:'KeyW',brake:'KeyS',left:'KeyA',right:'KeyD',handbrake:'Space',camera:'KeyC',recover:'KeyR',pause:'Escape'}[action]))===code;}
function pressed(action){return !!keys[state.settings.controls?.[action]||({accelerate:'KeyW',brake:'KeyS',left:'KeyA',right:'KeyD',handbrake:'Space'}[action])];}
window.addEventListener('keydown',e=>{
 const code=e.code;
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

class DriftGame{
 constructor(){
  this.scene=new THREE.Scene();
  this.renderer=new THREE.WebGLRenderer({canvas:dom.view,antialias:true,alpha:false,powerPreference:'high-performance'});
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.22;
  this.camera=new THREE.PerspectiveCamera(65,1,.1,1000);
  this.audio=new Soundtrack(()=>state.settings);this.clock=new THREE.Clock();this.accum=0;this.lastRender=0;this.playing=false;this.cameraMode=0;this.preview=undefined;
  this.sun=new THREE.DirectionalLight('#fff4dc',2.7);this.sun.position.set(-90,125,30);this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);this.sun.shadow.camera.left=-60;this.sun.shadow.camera.right=60;this.sun.shadow.camera.top=60;this.sun.shadow.camera.bottom=-60;this.sun.shadow.normalBias=.035;this.scene.add(this.sun);
  this.scene.add(new THREE.HemisphereLight('#eaf8ff','#486d67',2));
  this.world=createWorld(this.scene);
  this.player={x:0,z:0,vx:0,vz:0,heading:0,yaw:0,steer:0,driftBlend:0,speed:0,angle:0};
  this.run={score:0,active:false,grace:0,combo:1,seconds:0,nearMisses:0,nearMissXP:0};
  this.elapsed=0;this.nearMissStreak=0;this.lastNearMiss=-100;this.nearMissFlashUntil=0;this.invulnerable=1;this.wanted=0;this.chaseTime=0;this.wantedTimer=0;this.dispatchUntil=0;this.searchTimer=0;this.bustTimer=0;this.maxSpeed=0;this.crashState=null;this.crashSparks=[];this.crashDebris=[];
  this.police=[];this.traffic=[];this.blockade=[];this.blockadeNext=0;this.helicopter=null;this.heliLamp=null;this.heliRotor=null;this.radioTimer=0;this.tireDamage=0;this.fasterEscape=0;this.smokePool=[];this.smokeHead=0;this.smokeTimer=0;this.skids=[];this.skidHead=0;
  this.setPlayerCar();this.setupTraffic();this.setupSmoke();this.setupSkids();this.setupCrashEffects();this.applyQuality();
  this.camera.position.set(6,4.3,-12);this.camera.lookAt(0,1,2);
  window.addEventListener('resize',()=>this.resize());this.resize();
  this.animate=now=>{try{this.frame(now);requestAnimationFrame(this.animate);}catch(e){errorScreen(e);}};
  requestAnimationFrame(this.animate);
 }
 setPlayerCar(){if(this.car)this.scene.remove(this.car);const c=getSelected();this.car=createCar(c,carSave().color,{rims:carSave().rims,neon:carSave().neon,appearance:carSave().appearance});this.scene.add(this.car);this.preview=undefined;this.car.position.set(this.player.x,0,this.player.z);$('hudCar').textContent=c.name.toUpperCase();this.audio?.setCarProfile(carSave().upgrades||{});}
 previewCar(spec,color){if(mode==='game')return;
  if(this.preview&&this.preview.id===spec.id&&this.preview.color===color)return;
  if(this.car)this.scene.remove(this.car);
  this.car=createCar(spec,color,{rims:carSave(spec.id).rims,neon:carSave(spec.id).neon,appearance:carSave(spec.id).appearance});this.scene.add(this.car);this.preview={id:spec.id,color};this.car.position.set(this.player.x,0,this.player.z);
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
  this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1.5,preset*resolution));
  this.renderer.shadowMap.enabled=Boolean(s.shadows)&&(quality==='high'||quality==='ultra');
  this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.sun.castShadow=this.renderer.shadowMap.enabled;
  this.sun.shadow.mapSize.set(quality==='ultra'?2048:1024,quality==='ultra'?2048:1024);
  const fog={short:.004,normal:.0023,long:.00135}[s.drawDistance]||.0023;
  this.scene.fog.density=fog;
  const trafficCount={low:8,normal:12,high:16}[s.trafficDensity]||12;
  for(let i=0;i<this.traffic.length;i++){this.traffic[i].enabled=i<trafficCount;this.traffic[i].mesh.visible=i<trafficCount;}
  this.renderer.toneMappingExposure=quality==='low'?1.1:quality==='ultra'?1.28:1.19;
  this.resize();
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
  this.invulnerable=3;this.tireDamage=0;this.nearMissStreak=0;this.drifting=false;
  this.run={score:0,active:false,grace:0,combo:1,seconds:0,nearMisses:0,nearMissXP:0};
  if(this.car){this.car.position.set(p.x,0,p.z);this.car.rotation.set(0,0,0);}
  this.crashSparks.forEach(o=>o.mesh.visible=false);this.crashDebris.forEach(o=>o.mesh.visible=false);document.body.classList.remove('impact-active');
  $('crashFlash').classList.add('hidden');$('wreckScreen').classList.add('hidden');
  if(mode==='game')notify('CAR RESPAWNED • DRIVE SAFE');
 }
 setupCrashEffects(){
  const geometry=new THREE.BoxGeometry(.055,.055,.25);
  for(let i=0;i<35;i++){
    const material=new THREE.MeshBasicMaterial({color:i%3===0?0xffed8c:i%2===0?0xff713f:0xffffff,transparent:true,opacity:0,depthWrite:false});
    const mesh=new THREE.Mesh(geometry,material);mesh.visible=false;this.scene.add(mesh);
    this.crashSparks.push({mesh,vel:new THREE.Vector3(),life:0});
  }
  const scraps=[0x111b25,0x6d8ea0,0xff9a62,0x222e3c];
  for(let i=0;i<14;i++){
    const material=new THREE.MeshStandardMaterial({color:scraps[i%scraps.length],metalness:.65,roughness:.3,side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(.18+Math.random()*.38,.02+Math.random()*.07,.15+Math.random()*.29),material);
    mesh.visible=false;this.scene.add(mesh);this.crashDebris.push({mesh,vel:new THREE.Vector3(),life:0,spin:new THREE.Vector3()});
  }
 }
 createImpact(reason,breakdown){
  const p=this.player;
  this.crashState={time:0,reason,breakdown,x:p.x,z:p.z,heading:p.heading,speed:p.speed,side:p.x>0?-1:1};
  document.body.classList.add('impact-active');
  const impact=new THREE.Vector3(p.x,.83,p.z);
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
  if(this.car){const t=c.time,shake=Math.max(0,1-t/1.5);
    const tumble=Math.min(t,1.55);this.car.position.set(c.x+Math.sin(t*24)*.18*shake+c.side*tumble*.44,Math.max(0,Math.sin(t*4.5)*.42)*Math.max(0,1-t/2.3),c.z+Math.min(3,t*1.8));
    this.car.rotation.y=c.heading+c.side*Math.min(3.55,t*2.9);
    this.car.rotation.z=c.side*Math.sin(Math.min(t,1.65)*2.2)*.38*shake;
    this.car.rotation.x=Math.sin(Math.min(t,2.0)*2.6)*.20*shake;
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
  this.scene.add(mesh);return {mesh,x:0,z:0,heading:0,speed:0,lights:[a,b],police:true,swat};
 }
 startPolice(){if(this.wanted)return;this.wanted=1;this.chaseTime=0;this.wantedTimer=0;this.searchTimer=0;this.bustTimer=0;this.fasterEscape=0;
  for(let i=0;i<2;i++){const p=this.createPolice();p.x=[-8,8][i];p.z=this.player.z-85-i*20;p.heading=this.player.heading;p.mesh.position.set(p.x,0,p.z);this.police.push(p);}
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
  this.blockade.forEach(b=>this.scene.remove(b.mesh));this.blockade.length=0;
  if(this.helicopter){this.scene.remove(this.helicopter);this.helicopter=null;this.heliRotor=null;}
  this.wanted=0;this.chaseTime=0;this.wantedTimer=0;this.bustTimer=0;this.searchTimer=0;this.blockadeNext=0;this.fasterEscape=0;this.tireDamage=0;
  if(escaped){state.escapes++;const result=award(45+(this.maxSpeed*.3|0));this.maxSpeed=0;earnedXP(result);notify('POLICE LOST YOU • ESCAPE BONUS + XP');}
 }
 createBlockade(){
  this.blockade.forEach(b=>this.scene.remove(b.mesh));this.blockade.length=0;
  // Always leave driveable gaps. Four separate vehicles across a 32m highway.
  for(const x of [-11,-5,5,11]){
   const c=CARS[8],mesh=createCar(c,'#17243a',{traffic:true});mesh.rotation.y=Math.PI/2;
   const light=new THREE.Mesh(new THREE.BoxGeometry(.78,.10,.25),new THREE.MeshBasicMaterial({color:0x558bff}));light.position.set(0,1.94,0);mesh.add(light);
   const vehicle={mesh,x,z:this.player.z+190,speed:0,heading:Math.PI/2,police:true,blockade:true};mesh.position.set(vehicle.x,0,vehicle.z);this.scene.add(mesh);this.blockade.push(vehicle);
  }
  this.blockadeNext=this.elapsed+27;notify('POLICE ROADBLOCK AHEAD • USE THE GAPS');
 }
 updateBlockade(dt){
  if(!this.wanted||this.wanted<3)return;
  if(!this.blockade.length&&this.elapsed>this.blockadeNext)this.createBlockade();
  if(this.blockade.length&&this.blockade[0].z<this.player.z-35){this.blockade.forEach(b=>this.scene.remove(b.mesh));this.blockade.length=0;this.blockadeNext=this.elapsed+26;}
 }
 createHelicopter(){if(this.helicopter)return;
  const g=new THREE.Group(),hull=new THREE.MeshStandardMaterial({color:0x15202e,metalness:.6,roughness:.38});
  const body=new THREE.Mesh(new THREE.SphereGeometry(1.6,16,10),hull);body.scale.set(1,.55,1.6);g.add(body);
  const canopy=new THREE.Mesh(new THREE.SphereGeometry(.85,12,8),new THREE.MeshStandardMaterial({color:0x233e52,metalness:.45,roughness:.13}));canopy.scale.set(.9,.53,1.3);canopy.position.set(0,.12,1.0);g.add(canopy);
  const tail=new THREE.Mesh(new THREE.CylinderGeometry(.18,.31,4.4,8),hull);tail.rotation.x=Math.PI/2;tail.position.z=-3;g.add(tail);
  for(const side of [-1,1]){const skid=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,4.1,8),hull);skid.rotation.x=Math.PI/2;skid.position.set(side*1,-1.1,.25);g.add(skid);}
  const rotor=new THREE.Group();for(const sign of [-1,1]){const blade=new THREE.Mesh(new THREE.BoxGeometry(.12,.04,6.4),hull);blade.rotation.y=sign*Math.PI/4;rotor.add(blade);}rotor.position.y=.96;g.add(rotor);
  const light=new THREE.Mesh(new THREE.ConeGeometry(5,25,20,1,true),new THREE.MeshBasicMaterial({color:'#f4f6c1',transparent:true,opacity:.07,depthWrite:false,side:THREE.DoubleSide}));light.position.set(0,-12,0);g.add(light);
  g.position.set(this.player.x+24,28,this.player.z-40);this.scene.add(g);this.helicopter=g;this.heliRotor=rotor;this.heliLamp=light;notify('AIR UNIT DEPLOYED • 4 STAR PURSUIT');
 }
 updateHelicopter(dt){if(!this.helicopter||!this.wanted)return;
  const p=this.player,g=this.helicopter;
  g.position.x=THREE.MathUtils.damp(g.position.x,p.x+16,1.2,dt);
  g.position.z=THREE.MathUtils.damp(g.position.z,p.z-22,1.1,dt);
  g.position.y=27+Math.sin(this.elapsed*1.6)*1.5;
  this.heliRotor.rotation.y+=dt*22;
  this.heliLamp.visible=this.wanted>=4;
 }
 setupSmoke(){const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const ctx=canvas.getContext('2d');const gradient=ctx.createRadialGradient(32,32,4,32,32,31);gradient.addColorStop(0,'rgba(255,255,255,.86)');gradient.addColorStop(.42,'rgba(255,255,255,.42)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  const texture=new THREE.CanvasTexture(canvas);
  for(let i=0;i<115;i++){const m=new THREE.SpriteMaterial({map:texture,transparent:true,opacity:0,depthWrite:false});const s=new THREE.Sprite(m);s.visible=false;s.scale.set(1,1,1);this.scene.add(s);this.smokePool.push({s,life:0,max:1});}
 }
 setupSkids(){const material=new THREE.MeshBasicMaterial({color:0x101b20,transparent:true,opacity:.27,depthWrite:false});const geo=new THREE.PlaneGeometry(.23,1.4);
  for(let i=0;i<190;i++){const m=new THREE.Mesh(geo,material);m.rotation.x=-Math.PI/2;m.visible=false;this.scene.add(m);this.skids.push(m);}
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
  else{this.elapsed+=dt*.13;this.updateTraffic(dt*.16);this.updatePoliceLights();}
  this.updateSmoke(dt);this.world.update(this.player.z);this.updateCamera(dt);
  this.audio?.update(this.playing?this.wanted:0);this.renderer.render(this.scene,this.camera);if(showroom)showroom.render(dt);this.updateHUD();
 }
 currentStats(){return performanceStats(getSelected(),carSave().upgrades);}

 tick(dt){
  const p=this.player,stats=this.currentStats(),carTune=carSave().tune;
  this.elapsed+=dt;this.invulnerable=Math.max(0,this.invulnerable-dt);
  const throttle=pressed('accelerate'),brake=pressed('brake'),handbrake=pressed('handbrake');
  const steer=(Number(pressed('right'))-Number(pressed('left')));
  const fw=Math.sin(p.heading),fz=Math.cos(p.heading),rightX=Math.cos(p.heading),rightZ=-Math.sin(p.heading);
  let longitudinal=p.vx*fw+p.vz*fz,lateral=p.vx*rightX+p.vz*rightZ;
  const topSpeed=stats.top/2.23694;
  // Enough power to reach highway speeds while keeping acceleration smooth.
  // Upgrades increase the actual force applied rather than just the HUD number.
  const maxAccel=stats.acceleration*(1-this.tireDamage*.25);
  const estimatedGear=Math.max(1,Math.min(6,Math.floor(Math.abs(mph(longitudinal))/32)+1));
  if(p.lastGear&&estimatedGear>p.lastGear)p.shiftTimer=stats.shiftTime;
  p.lastGear=estimatedGear;
  p.shiftTimer=Math.max(0,(p.shiftTimer||0)-dt);
  // Transmission and clutch upgrades shorten actual in-game power interruptions.
  if(throttle)longitudinal+=maxAccel*dt*(p.shiftTimer>0?.40:1.08);

  if(brake){if(longitudinal>2)longitudinal-=stats.brake*dt;else longitudinal-=maxAccel*.55*dt;}
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
  const prevPlayerZ=p.z;
  p.x+=p.vx*dt;p.z+=p.vz*dt;
  p.speed=Math.hypot(p.vx,p.vz);p.angle=dynamics.slip;
  const engineRpm=900+Math.min(7600,Math.abs(longitudinal)*235+(throttle?700:0)+((p.shiftTimer||0)>0?400:0));
  this.audio?.updateEngine(engineRpm,Number(throttle),mphNow);
  this.maxSpeed=Math.max(this.maxSpeed,Math.round(mphNow));
  if(Math.abs(p.x)>16.3){p.x=THREE.MathUtils.clamp(p.x,-16.3,16.3);if(p.speed>4.5&&this.invulnerable<=0){this.crash('HIGHWAY BARRIER IMPACT');return;}p.vx*=-.15;p.vz*=.72;}
  if(this.car){this.car.position.set(p.x,Math.sin(this.elapsed*9)*.007,p.z);this.car.rotation.y=p.heading;animateWheels(this.car,dt,longitudinal*dt,p.steer);}
  this.updateTraffic(dt);this.updatePolice(dt);this.updateBlockade(dt);this.updateHelicopter(dt);
  if(this.invulnerable<=0){for(const a of [...this.traffic,...this.police,...this.blockade]){
    if(a.enabled===false)continue;
    const w1=(getSelected().width||1.8)*.50,w2=(a.mesh.userData.spec?.width||1.8)*.50;const l1=(getSelected().length||4.5)*.43,l2=(a.mesh.userData.spec?.length||4.5)*.43;
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
   this.run.score+=dt*(3.5+p.angle*.43)*(mphNow/65)*this.run.combo*.14*driftStyleBonus;
   this.spawnSmoke(dt);
  } else if(this.run.active){this.run.grace-=dt;if(this.run.grace<=0)this.endRun(false);}
  this.drifting=drift;
  if(kph(p.speed)>=100 && !this.wanted)this.startPolice();
 }
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
   const base=Math.round((perfect?10:6)+Math.min(7,mph(p.speed)*.045));
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
   state.nearMissXP+=Math.floor(this.run.nearMissXP*multiplier);
   if(this.run.seconds>.3)state.drifts++;
   state.bestDrift=Math.max(state.bestDrift,received);save();earnedXP(result);
   if(!crashed)notify(`RUN BANKED • +${fmt(received)} XP / +${fmt(result.coins||0)} DRIFT COINS`);
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
 updatePoliceLights(){for(const p of this.police){p.lights[0].visible=Math.sin(this.elapsed*17)>0;p.lights[1].visible=!p.lights[0].visible;}}
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
   const behind=dist>235;const targetX=behind?a.x:p.x+(a.swat&&dist<55?(i%2?1.4:-1.4):0);
   const desired=Math.atan2(targetX-a.x,p.z-a.z);const correction=Math.atan2(Math.sin(desired-a.heading),Math.cos(desired-a.heading));
   a.heading+=THREE.MathUtils.clamp(correction,-(a.swat?1.1:1.25)*dt,(a.swat?1.1:1.25)*dt);
   // Patrols are slower than most tuned performance cars. No forced teleporting.
   const cap=[0,34,37,40,44,49][this.wanted]+(a.swat?3:0);
   const targetSpeed=Math.min(cap,Math.max(15,dist>80?cap:Math.max(10,p.speed*.70)));
   a.speed=THREE.MathUtils.damp(a.speed,targetSpeed,.75,dt);
   a.x+=Math.sin(a.heading)*a.speed*dt;a.z+=Math.cos(a.heading)*a.speed*dt;
   a.mesh.position.set(a.x,0,a.z);a.mesh.rotation.y=a.heading;
   animateWheels(a.mesh,dt,a.speed*dt,correction);
   if(dist<130)visible++;
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
  if(closest>120)this.searchTimer+=dt;else this.searchTimer=Math.max(0,this.searchTimer-dt*1.6);
  const fastThreshold=this.wanted>=4?9:5;
  const distanceThreshold=this.wanted>=4?15:10;
  if(this.chaseTime>20&&(this.fasterEscape>fastThreshold+8||this.searchTimer>distanceThreshold+6))this.endPolice(true);
 }
 updateCamera(dt){const p=this.player;let dx,dy,dz,lookX,lookY,lookZ;const h=p.heading;
  if(mode!=='game'){
    const ang=.18+Math.sin(this.elapsed*.55)*.25;
    dx=p.x+Math.sin(h+ang)*7;dy=3.3;dz=p.z-Math.cos(h+ang)*10;lookX=p.x;lookY=1;lookZ=p.z+1.2;
  }else if(this.cameraMode===2){dx=p.x+Math.sin(h)*1.23;dy=1.3;dz=p.z+Math.cos(h)*1.23;lookX=p.x+Math.sin(h)*20;lookY=1.3;lookZ=p.z+Math.cos(h)*20;}
  else{const dist=this.cameraMode===1?5.9:8.9;const height=this.cameraMode===1?2.5:3.9;
   dx=p.x-Math.sin(h)*dist;dy=height;dz=p.z-Math.cos(h)*dist;lookX=p.x+Math.sin(h)*4.4;lookY=1.1;lookZ=p.z+Math.cos(h)*4.4;}
  if(this.crashState){
    const t=this.crashState.time,amp=Math.max(0,1-t/1.25)*(Number(state.settings.cameraShake)||0)/100;
    dx=p.x+Math.sin(t*.9)*8+(Math.random()-.5)*amp*.95;
    dy=3+Math.min(2,t*.72)+(Math.random()-.5)*amp*.4;
    dz=p.z-9+Math.cos(t*.8)*3+(Math.random()-.5)*amp*.95;
    lookX=p.x;lookY=1;lookZ=p.z;
  }
  const lerp=1-Math.exp(-(mode==='game'?(this.crashState?8:5):2)*dt);this.camera.position.lerp(new THREE.Vector3(dx,dy,dz),lerp);
  const look=new THREE.Vector3(lookX,lookY,lookZ);this.lookAt ||= look.clone();this.lookAt.lerp(look,Math.min(1,lerp*1.5));this.camera.lookAt(this.lookAt);
  this.camera.fov=THREE.MathUtils.damp(this.camera.fov,this.crashState?55:mode==='game'?65+Math.min(10,mph(p.speed)/26):62,2,dt);this.camera.updateProjectionMatrix();
 }
 updateHUD(){if(mode!=='game')return;
  const p=this.player;let speed=state.settings.units==='kph'?kph(p.speed):mph(p.speed);
  $('speedNumber').textContent=Math.round(speed).toString();$('speedUnit').textContent=state.settings.units==='kph'?'KM/H':'MPH';
  const rpm=Math.min(8000,Math.round(850+Math.abs(mph(p.speed))*41));
  $('rpm').textContent=String(rpm);$('rpmLine').style.width=`${Math.min(100,rpm/80)}%`;
  $('gear').textContent=p.speed<.7?'N':(p.vx*Math.sin(p.heading)+p.vz*Math.cos(p.heading))<0?'R':String(Math.min(6,Math.floor(mph(p.speed)/32)+1));
  $('boost').textContent=(carSave().upgrades.turbo>0||carSave().upgrades.supercharger>0)?Math.round(Math.min(100,mph(p.speed)/1.8))+'%':'N/A';
  $('runScore').textContent=fmt(this.run.score)+' XP';$('nearMissCount').textContent=fmt(state.nearMisses);
  if(this.elapsed>this.nearMissFlashUntil)$('nearMissFlash').classList.add('hidden');$('combo').textContent='×'+this.run.combo.toFixed(1);
  $('driftNotice').classList.toggle('hidden',!this.drifting);
  $('driftSplash').textContent=fmt(this.run.score);
  $('driftRating').textContent=p.angle>=24&&p.angle<=46?'PERFECT SLIDE':p.angle>46?'WIDE DRIFT':'CLEAN DRIFT';
  $('driftMeterFill').style.width=Math.min(100,p.angle/75*100)+'%';
  $('driftMeterPin').style.left=Math.min(100,p.angle/75*100)+'%';
  $('driftAngle').textContent=`${p.angle>=24&&p.angle<=46?'PERFECT SLIDE':p.angle>46?'WIDE ANGLE':'CLEAN DRIFT'} • ${Math.round(p.angle)}° • ${this.run.combo.toFixed(1)}× COMBO`;
  $('wanted').classList.toggle('hidden',!this.wanted);$('stars').textContent='★'.repeat(this.wanted)+'☆'.repeat(Math.max(0,5-this.wanted));if(this.elapsed>this.dispatchUntil)$('dispatchMessage').classList.add('hidden');
 }
}

try{applyUI();applyGarageTheme();cashRefresh();game=new DriftGame();try{showroom=new Showroom();applyUI();}catch(e){console.warn('3D showroom disabled:',e);}renderPage(googleOAuthReturned?'account':'home');syncPaidState();const paymentReturn=new URLSearchParams(location.search).get('checkout');if(paymentReturn){history.replaceState(null,'',location.pathname);if(paymentReturn==='success'){notify('PAYMENT RETURNED • VERIFYING WITH STRIPE');let attempt=0;const check=async()=>{await syncPaidState();if(++attempt<6)setTimeout(check,2000);};setTimeout(check,1500);}else notify('CHECKOUT CANCELED • NO CHARGE');}}
catch(e){errorScreen(e);}
