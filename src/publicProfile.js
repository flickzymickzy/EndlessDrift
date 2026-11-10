// Public driver profiles expose ONLY approved gameplay stats and saved car cosmetics.
// Never return the source cloud save, wallet, account ID, email, session, or purchase history.
import {CARS,BODY_PARTS,UPGRADES,levelFromXP} from './data.js';
const ids=new Set(CARS.map(car=>car.id));
const defaultCar=CARS[0];
const whole=v=>{const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,Math.floor(n))):0;};
const hex=(v,fallback)=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:fallback;
const lookupUpgrade=new Map(UPGRADES.map(u=>[u.id,u.max]));
function publicCar(id,raw,selected){
 const spec=CARS.find(car=>car.id===id)||defaultCar;
 const custom=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const appearance={};
 for(const part of BODY_PARTS){
  const choice=custom.appearance?.[part.id];
  appearance[part.id]=part.options.some(opt=>opt[0]===choice)?choice:'stock';
 }
 const upgrades={};
 for(const [id,cap] of lookupUpgrade){
  upgrades[id]=Math.min(cap,whole(custom.upgrades?.[id]));
 }
 return {id:spec.id,selected:id===selected,color:hex(custom.color,spec.color),
  rims:hex(custom.rims,'#d0d9e2'),neon:custom.neon==='off'?'off':hex(custom.neon,'off'),
  smoke:hex(custom.smoke,'#e1e7ff'),appearance,upgrades};
}
export function publicDriverProfile({username,createdAt,owner=false,ranked={},save={}}={}){
 const data=save&&typeof save==='object'&&!Array.isArray(save)?save:{};
 const hidden=data.settings?.profileVisibility==='private';
 const rankedXP=whole(ranked?.lifetime_xp),coinsSpent=whole(ranked?.coins_spent);
 const response={username:String(username||'DRIVER').slice(0,24),owner:Boolean(owner),joined:typeof createdAt==='string'?createdAt.slice(0,10):null,
  rankedXP,coinsSpent,privateGarage:hidden};
 if(hidden)return {...response,stats:null,garage:[],selected:null};
 const owned=Array.isArray(data.owned)?[...new Set(data.owned.filter(id=>ids.has(id)))].slice(0,CARS.length):[];
 if(!owned.length)owned.push(defaultCar.id);
 const selected=owned.includes(data.selected)?data.selected:owned[0];
 const cars=data.cars&&typeof data.cars==='object'?data.cars:{};
 return {...response,selected,garage:owned.map(id=>publicCar(id,cars[id],selected)),
  stats:{garageLevel:whole(levelFromXP(whole(data.lifetimeXP))),drifts:whole(data.drifts),
   crashes:whole(data.crashes),escapes:whole(data.escapes),nearMisses:whole(data.nearMisses),
   bestDrift:whole(data.bestDrift),bestNearMiss:whole(data.bestNearMiss)}};
}
