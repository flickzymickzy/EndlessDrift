import {CARS, UPGRADES, BATTLE_PASS, BODY_PARTS, levelFromXP, levelReward} from './data.js';
const KEY='endless-drift-save-v3'; // stable across versions: existing cars and balances preserved
const starting={wallet:2500,lifetimeXP:0,spent:0,bestDrift:0,drifts:0,crashes:0,escapes:0,nearMisses:0,nearMissXP:0,bestNearMiss:0,levelRewardsClaimed:0,unlockedCosmetics:[],shopOwned:[],owned:[CARS[0].id],selected:CARS[0].id,cars:{},settings:{quality:'high',units:'mph',fps:'60',steering:1,driftAssist:true,driftStyle:'arcade',uiScale:100,smoke:true,uiTheme:'mint',hudLayout:'classic',speedStyle:'digital',hudOpacity:92,renderScale:100,shadows:true,particles:'medium',drawDistance:'normal',trafficDensity:'normal',cameraShake:70,music:true,musicVolume:60,effectsVolume:65,policeRadio:true,controls:{accelerate:'KeyW',brake:'KeyS',left:'KeyA',right:'KeyD',handbrake:'Space',camera:'KeyC',recover:'KeyR',pause:'Escape'}},garageTheme:'carbon',garageDecor:'neon'};
function copy(o){return JSON.parse(JSON.stringify(o));}
function sanitize(input){
 const s={...copy(starting),...input};
 for(const key of ['wallet','lifetimeXP','spent','bestDrift','drifts','crashes','escapes','nearMisses','nearMissXP','bestNearMiss'])s[key]=Math.max(0,Math.round(Number(s[key])||0));
 // Existing v3/v4 saves already have XP; never grant retrospective level rewards.
 s.levelRewardsClaimed=Number.isFinite(Number(input?.levelRewardsClaimed))?Math.max(0,Math.floor(Number(input.levelRewardsClaimed))):levelFromXP(s.lifetimeXP);
 s.shopOwned=Array.isArray(s.shopOwned)?[...new Set(s.shopOwned.map(String))]:[];
 s.owned=Array.isArray(s.owned)?[...new Set(s.owned.filter(id=>CARS.some(c=>c.id===id)))]:[CARS[0].id];
 if(!s.owned.includes(CARS[0].id))s.owned.unshift(CARS[0].id);
 if(!s.owned.includes(s.selected))s.selected=CARS[0].id;
 s.settings={...starting.settings,...(s.settings||{})};s.settings.controls={...starting.settings.controls,...(s.settings.controls||{})};
 // Unlock all pass cosmetics already earned, including for players upgrading from V5.
 const earned=BATTLE_PASS.filter(item=>levelFromXP(s.lifetimeXP)>=item.level).map(item=>item.id);
 s.unlockedCosmetics=[...new Set([...(Array.isArray(s.unlockedCosmetics)?s.unlockedCosmetics:[]),...earned])].filter(id=>BATTLE_PASS.some(item=>item.id===id));
 s.cars=s.cars&&typeof s.cars==='object'?s.cars:{};
 return s;
}
function load(){try{return sanitize(JSON.parse(localStorage.getItem(KEY)||'null')||starting);}catch{return copy(starting);}}
export const state=load();
export function save(){try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch{return false;}}
export function carSave(id=state.selected){
 if(!state.cars[id])state.cars[id]={color:CARS.find(c=>c.id===id)?.color||'#e4475c',smoke:'#eeeeff',upgrades:{},tune:{grip:50,steering:50,stability:60},rims:'#d0d9e2',neon:'off'};
 const c=state.cars[id];c.appearance ||= {};c.ownedParts ||= [];for(const part of BODY_PARTS)c.appearance[part.id] ||= 'stock';c.rims ||= '#d0d9e2';c.neon ||= 'off';c.upgrades ||= {};c.tune ||= {grip:50,steering:50,stability:60};
 for(const u of UPGRADES)c.upgrades[u.id]=Math.min(u.max,Math.max(0,Math.floor(Number(c.upgrades[u.id])||0)));
 return c;
}
export function pay(cost){cost=Math.round(cost);if(!Number.isFinite(cost)||cost<0||state.wallet<cost)return false;state.wallet-=cost;state.spent+=cost;save();return true;}
export function award(amount){
 amount=Math.max(0,Math.round(Number(amount)||0));
 const driftCoins=Math.floor(amount/5); // 5 earned XP = 1 spendable Drift Coin
 state.wallet+=driftCoins;state.lifetimeXP+=amount;
 const levels=[];let bonus=0;
 // Banked XP also awards the same number of spendable Drift Coins; the existing wallet migrates unchanged.
 // Monotonic thresholds ensure the loop terminates even with reward XP included.
 while(state.levelRewardsClaimed<levelFromXP(state.lifetimeXP)&&levels.length<200){
   const level=++state.levelRewardsClaimed;
   if(level<=1)continue;
   const reward=levelReward(level);
   const coinReward=Math.max(5,Math.floor(reward*.35));
   state.wallet+=coinReward;bonus+=coinReward;
   levels.push({level,reward});
 }
 // Award new cosmetics immediately, without consuming any XP.
 const passUnlocks=[];
 for(const item of BATTLE_PASS){
  if(levelFromXP(state.lifetimeXP)>=item.level&&!state.unlockedCosmetics.includes(item.id)){
   state.unlockedCosmetics.push(item.id);passUnlocks.push(item);
  }
 }
 save();
 return {earned:amount,coins:driftCoins,bonus,levels,passUnlocks,level:levelFromXP(state.lifetimeXP)};
}
export function getSelected(){return CARS.find(c=>c.id===state.selected)||CARS[0];}

export function cosmeticUnlocked(item){return state.unlockedCosmetics.includes(item.id)||levelFromXP(state.lifetimeXP)>=item.level;}

// Save portability for moving from localhost to a public custom domain.
export function exportSave(){return JSON.stringify({game:'ENDLESS DRIFT',version:10,exportedAt:new Date().toISOString(),save:state},null,2);}
export function importSave(json){
 const incoming=JSON.parse(json);
 if(incoming?.game!=='ENDLESS DRIFT'||!incoming.save||typeof incoming.save!=='object')throw new Error('Not an ENDLESS DRIFT save backup');
 const clean=sanitize(incoming.save);
 Object.keys(state).forEach(k=>delete state[k]);Object.assign(state,clean);save();return true;
}
