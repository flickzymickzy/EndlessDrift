export const CARS = [
  {id:'sakura-s13',name:'Sakura S13',type:'Drift Coupe',price:0,hp:210,top:80,handling:76,weight:1220,kind:'coupe',color:'#fe6a4b',length:4.42,width:1.78},
  {id:'midnight-r32',name:'Midnight R32',type:'Street Legend',price:3500,hp:280,top:164,handling:79,weight:1480,kind:'coupe',color:'#5568e8',length:4.5,width:1.83},
  {id:'apex-86',name:'Apex 86',type:'Lightweight Drift',price:5200,hp:220,top:152,handling:90,weight:1120,kind:'coupe',color:'#f3f3ea',length:4.3,width:1.75},
  {id:'vortex-rx',name:'Vortex RX',type:'Rotary Coupe',price:8500,hp:295,top:171,handling:86,weight:1260,kind:'sports',color:'#ee3152',length:4.34,width:1.78},
  {id:'night-350',name:'Night 350',type:'Widebody Sports',price:12500,hp:330,top:176,handling:81,weight:1530,kind:'sports',color:'#d2d6dc',length:4.4,width:1.89},
  {id:'samurai-s15',name:'Samurai S15',type:'Pro Drift',price:17500,hp:380,top:184,handling:91,weight:1260,kind:'coupe',color:'#fbbf24',length:4.44,width:1.8},
  {id:'phantom-m3',name:'Phantom M3',type:'Euro Performance',price:24000,hp:420,top:192,handling:84,weight:1570,kind:'sedan',color:'#2587d9',length:4.72,width:1.88},
  {id:'supra-xt',name:'Supra XT',type:'Turbo Legend',price:36000,hp:470,top:205,handling:85,weight:1510,kind:'sports',color:'#ff753b',length:4.52,width:1.86},
  {id:'charger-x',name:'Charger X',type:'Muscle Sedan',price:48000,hp:520,top:208,handling:70,weight:1950,kind:'sedan',color:'#45434f',length:5.1,width:1.98},
  {id:'gtr-r',name:'GTR-R',type:'Track Weapon',price:70000,hp:615,top:226,handling:88,weight:1740,kind:'super',color:'#b8c1d0',length:4.65,width:1.93},
  {id:'venom-720',name:'Venom 720',type:'Supercar',price:98000,hp:720,top:241,handling:92,weight:1420,kind:'super',color:'#8f55ff',length:4.54,width:1.98},

  {id:'horizon-r34',name:'Horizon R34',type:'Classic Grand Tourer',price:9500,hp:320,top:185,handling:81,weight:1510,kind:'coupe',color:'#3b83ed',length:4.61,width:1.79},
  {id:'eclipse-gx',name:'Eclipse GX',type:'All Wheel Drift',price:13200,hp:310,top:175,handling:87,weight:1455,kind:'sports',color:'#ffde6c',length:4.41,width:1.83},
  {id:'kaze-brz',name:'Kaze BRZ',type:'Lightweight Coupe',price:7300,hp:240,top:158,handling:91,weight:1185,kind:'coupe',color:'#628ee4',length:4.29,width:1.79},
  {id:'monarch-e46',name:'Monarch E46',type:'German Drift Icon',price:16000,hp:355,top:179,handling:88,weight:1510,kind:'coupe',color:'#b49eff',length:4.49,width:1.80},
  {id:'viper-v10',name:'Viper V10',type:'Muscle Roadster',price:55000,hp:605,top:214,handling:77,weight:1600,kind:'sports',color:'#d92740',length:4.46,width:1.92},
  {id:'camaro-rs',name:'Camaro RS',type:'American Muscle',price:32000,hp:455,top:191,handling:73,weight:1730,kind:'coupe',color:'#ffb942',length:4.78,width:1.90},
  {id:'blackout-rs6',name:'Blackout RS6',type:'Power Wagon',price:57000,hp:590,top:212,handling:78,weight:2070,kind:'sedan',color:'#6c818d',length:5.00,width:1.97},
  {id:'phantom-m4',name:'Phantom M4',type:'Twin Turbo Coupe',price:42000,hp:510,top:194,handling:87,weight:1700,kind:'coupe',color:'#a6dfdb',length:4.79,width:1.88},
  {id:'apex-r8',name:'Apex R8',type:'V10 Supercar',price:99000,hp:620,top:205,handling:90,weight:1595,kind:'super',color:'#dbdce5',length:4.43,width:1.94},
  {id:'cobra-gt',name:'Cobra GT',type:'Supercharged Muscle',price:49000,hp:760,top:204,handling:73,weight:1780,kind:'coupe',color:'#42bcca',length:4.82,width:1.94},
  {id:'raven-911',name:'Raven 911',type:'Rear Engine Sports',price:78000,hp:535,top:196,handling:94,weight:1515,kind:'sports',color:'#d5edf0',length:4.55,width:1.85},
  {id:'comet-c8',name:'Comet C8',type:'Mid Engine Supercar',price:125000,hp:700,top:221,handling:93,weight:1590,kind:'super',color:'#eea943',length:4.63,width:1.93},
  {id:'nebula-x',name:'Nebula X',type:'Hypercar',price:145000,hp:950,top:273,handling:95,weight:1350,kind:'hyper',color:'#32d7c8',length:4.68,width:2.04}
];

export const UPGRADES = [
 {id:'engine',label:'Engine',max:5,base:1000,description:'More horsepower and acceleration',effect:'+14% power per level'},
 {id:'turbo',label:'Turbo',max:4,base:1350,description:'Extra boost at higher RPM',effect:'+11% top-end power'},
 {id:'supercharger',label:'Supercharger',max:3,base:1800,description:'Instant low-end torque',effect:'+10% acceleration'},
 {id:'tires',label:'Drift tires',max:4,base:850,description:'Predictable grip and better control',effect:'Improved lateral control'},
 {id:'suspension',label:'Suspension',max:4,base:1050,description:'Sharper steering and transitions',effect:'Faster response'},
 {id:'steering',label:'Steering kit',max:3,base:1100,description:'More angle for big drifts',effect:'More steering lock'},
 {id:'brakes',label:'Performance brakes',max:3,base:750,description:'Larger rotors and calipers',effect:'More braking force'},
 {id:'transmission',label:'Race transmission',max:5,base:1350,description:'Tighter gear ratios and quicker shifts',effect:'More acceleration and higher usable speed'},
 {id:'clutch',label:'Performance clutch',max:4,base:680,description:'Stronger clutch and shift response',effect:'Better torque transfer'},
 {id:'differential',label:'Limited slip differential',max:4,base:990,description:'Rear axle locking for controlled power slides',effect:'More predictable drifting'},
 {id:'ecu',label:'ECU tune',max:4,base:890,description:'Engine mapping, rev limit, ignition timing',effect:'More usable engine power'},
 {id:'cooling',label:'Cooling system',max:3,base:780,description:'Intercooler, oil cooling and radiator',effect:'Better sustained acceleration'},
 {id:'exhaustPerformance',label:'Performance exhaust',max:4,base:720,description:'Headers, piping and catalytic flow',effect:'More top end power'},
 {id:'weightReduction',label:'Weight reduction',max:4,base:1150,description:'Lighter body panels and racing interior',effect:'Higher acceleration and agility'},
 {id:'fuelSystem',label:'Fuel delivery',max:3,base:970,description:'Fuel pump, injectors and lines',effect:'Additional power'},
 {id:'driveshaft',label:'Driveshaft and axles',max:3,base:820,description:'Stronger driveline components',effect:'Improved power transfer'}
];
// Installable body parts. Stock is always free. Purchased pieces remain permanently owned per car.
export const BODY_PARTS=[
 {id:'spoiler',label:'REAR WING',description:'Low-profile lips, full GT wings and race aero',options:[['stock','Factory',0],['lip','Ducktail lip',500],['gt','GT wing',1250],['race','Carbon race wing',2400]]},
 {id:'skirts',label:'SIDE SKIRTS',description:'Lower profile and sculpted side aero',options:[['stock','Factory',0],['street','Street skirts',420],['aero','Wide aero skirts',1150]]},
 {id:'exhaust',label:'EXHAUST TIPS',description:'Chrome, titanium and aggressive quad tips',options:[['stock','Factory',0],['dual','Dual stainless',400],['burnt','Burnt titanium',950],['quad','Quad performance',1400]]},
 {id:'splitter',label:'FRONT SPLITTER',description:'Front lips and aggressive aero blades',options:[['stock','Factory',0],['street','Front lip',450],['race','Race splitter',1350]]},
 {id:'diffuser',label:'REAR DIFFUSER',description:'Rear underbody aero and fins',options:[['stock','Factory',0],['street','Street diffuser',550],['race','Track diffuser',1600]]},
 {id:'hood',label:'HOOD DESIGN',description:'Sculpted vent and air scoop upgrades',options:[['stock','Factory',0],['vents','Twin hood vents',650],['scoop','Performance hood scoop',1450]]},
 {id:'tint',label:'WINDOW TINT',description:'Darken the glass finish',options:[['stock','Factory',0],['smoke','Smoked glass',250],['dark','Deep black tint',600]]},
 {id:'wheels',label:'WHEEL DESIGN',description:'Different spoke and forged wheel patterns',options:[['stock','Factory',0],['mesh','Mesh alloy',700],['five','Five-spoke forged',950],['turbine','Turbine wheels',1250]]}
];
export const COLORS=['#fe6a4b','#fecc38','#39e8d0','#a176ff','#50a4ff','#fb6aaf','#f2f6fc','#161820','#d13e48','#37d273'];
export const SMOKES=['#eeeeff','#79d8ff','#ff68c8','#c28dff','#73ffcb','#ffcf66','#f55656'];
export const GARAGE_THEMES=[
 {id:'carbon',name:'Carbon Lab',wall:'#101927',floor:'#202a36',accent:'#65f8d2'},
 {id:'sunset',name:'Sunset Garage',wall:'#32212c',floor:'#3b3138',accent:'#ff9165'},
 {id:'ice',name:'Ice Workshop',wall:'#192635',floor:'#304253',accent:'#78c6ff'},
 {id:'gold',name:'Night Luxe',wall:'#242116',floor:'#373326',accent:'#e8c476'}
];

// Free seasonal-style battle pass: each completed driver level unlocks one cosmetic.
// Cosmetics cannot be purchased with XP and cannot be consumed by buying cars/upgrades.
const PASS_REWARDS = [
  ['paint','Arctic Pearl','#e8f7ff'],['smoke','Electric Mist','#35c8ff'],['rims','Forged Gold','#ebc46c'],['neon','Mint Reactor','#58ffd3'],
  ['paint','Midnight Amethyst','#7c53db'],['smoke','Rose Burnout','#ff5eaa'],['rims','Obsidian Alloy','#293744'],['neon','Inferno Strip','#ff7048'],
  ['paint','Race Crimson','#ed3952'],['smoke','Toxic Cloud','#9aff57'],['rims','Polar Chrome','#c5e9f5'],['neon','Violet Circuit','#ac73ff'],
  ['paint','Liquid Silver','#b7c8d2'],['smoke','Golden Hour','#ffc45f'],['rims','Copper Finish','#b47b4a'],['neon','Cobalt Pulse','#437fff'],
  ['paint','Emerald Metallic','#178f77'],['smoke','Vapor Violet','#aa79f0'],['rims','Titanium Black','#515b69'],['neon','Hot Pink Glow','#ff53d9'],
  ['paint','Sunset Magma','#f88743'],['smoke','Deep Ocean','#337dff'],['rims','Bronze Mesh','#ac8750'],['neon','Storm White','#d2f6ff'],
  ['paint','Electric Sapphire','#2966db'],['smoke','Phoenix Red','#ff4b45'],['rims','Ice Forged','#79b7d8'],['neon','Aftershock Lime','#c9ff57'],
  ['paint','Rose Quartz','#dd8bb0'],['smoke','Celestial Haze','#b2bdff']
];
export const BATTLE_PASS=PASS_REWARDS.map(([type,name,color],index)=>({id:`pass-${index+2}`,level:index+2,type,name,color}));
// Premium pass is a separate preview-only reward track until a payment backend is configured.
// Never grant premium ownership from localStorage, a URL parameter, or client-side buttons.
const PREMIUM_PALETTE=[
 ['paint','Holographic Glacier','#9bfff1'],['rims','Satin Obsidian','#252832'],
 ['neon','Prismatic Halo','#ff86f7'],['smoke','Solar Flare','#ff9548'],
 ['paint','Midnight Carbon','#292e38'],['rims','Forged Copper','#db9561'],
 ['neon','Hyper Blue','#368fff'],['smoke','Neon Mirage','#d6a5ff'],
 ['paint','Molten Crimson','#b31836'],['rims','Titanium Frost','#c1dfea'],
 ['neon','Amber Spectre','#ffbd65'],['smoke','Ice Burnout','#a2faff'],
 ['paint','Galaxy Violet','#7946d2'],['rims','Champagne Alloy','#e6bd91'],
 ['neon','Voltage Lime','#ceff45'],['smoke','Blacklight Bloom','#b05bff'],
 ['paint','Eclipse Black','#121821'],['rims','Rose Chrome','#f4c0da'],
 ['neon','Cerulean Arc','#37d9ff'],['smoke','Copper Storm','#f0a268'],
 ['paint','Emerald Chromatic','#26c4a1'],['rims','Arctic Titanium','#b7d2e8'],
 ['neon','Cyber Magenta','#ff47ac'],['smoke','Electric Lavender','#9281ff'],
 ['paint','Hypernova Pearl','#e9e0ff'],['rims','Carbon Bronze','#9f8262'],
 ['neon','Arctic Pulse','#a0efff'],['smoke','Phoenix Cloud','#ff7161'],
 ['paint','Liquid Sunset','#fa7d50'],['rims','Legendary Gold','#ffd274']
];
export const PREMIUM_PASS=PREMIUM_PALETTE.map(([type,name,color],index)=>({id:`premium-${index+2}`,level:index+2,type,name,color,premium:true}));
export const BASE_RIMS=['#d0d9e2','#1b2730','#e5be73','#edf0f5'];
export const BASE_NEONS=['off','#64f2cf','#6eaeff'];

export const COSMETIC_SHOP=[
 {id:'shop-paint-obsidian',type:'paint',name:'Obsidian Fade',color:'#273847',price:1800},
 {id:'shop-paint-sunburst',type:'paint',name:'Sunburst Orange',color:'#ff8b43',price:1600},
 {id:'shop-paint-ice',type:'paint',name:'Ice White',color:'#edf7ff',price:1750},
 {id:'shop-paint-katana',type:'paint',name:'Katana Red',color:'#ff435d',price:2100},
 {id:'shop-rims-forged-gold',type:'rims',name:'Forged Gold',color:'#e9c46d',price:2200},
 {id:'shop-rims-black-chrome',type:'rims',name:'Black Chrome',color:'#3b4550',price:2200},
 {id:'shop-rims-frozen',type:'rims',name:'Frozen Alloy',color:'#dceefe',price:2450},
 {id:'shop-rims-titanium',type:'rims',name:'Titanium Bronze',color:'#a88762',price:2350},
 {id:'shop-neon-cyan',type:'neon',name:'Cyan Pulse',color:'#5de9ff',price:1500},
 {id:'shop-neon-pink',type:'neon',name:'Tokyo Pink',color:'#ff63cc',price:1500},
 {id:'shop-neon-lime',type:'neon',name:'Lime Volt',color:'#c9ff57',price:1550},
 {id:'shop-smoke-ember',type:'smoke',name:'Ember Smoke',color:'#ff9363',price:1350},
 {id:'shop-smoke-violet',type:'smoke',name:'Violet Haze',color:'#b692ff',price:1350},
 {id:'shop-smoke-ice',type:'smoke',name:'Ice Mist',color:'#b7e9ff',price:1350}
];

export const fmt = n => Math.floor(Math.max(0,Number(n)||0)).toLocaleString('en-US');
export function upgradeCost(upgrade, level){ return Math.round(upgrade.base*Math.pow(1.66,level)); }
export function mph(mps){return Math.abs(mps)*2.2369362921;}
export function kph(mps){return Math.abs(mps)*3.6;}

// Level progression is based on lifetime earned XP, never on unspent money.
// Level 2 begins at 1,500 XP. Increasing thresholds keep higher levels meaningful.
export function levelStart(level){
 const n=Math.max(0,Math.floor(level)-1);
 return Math.round(350*n*n+1150*Math.pow(n,1.45));
}
export function levelFromXP(xp){
 let level=1;
 const total=Math.max(0,Number(xp)||0);
 while(level<200&&total>=levelStart(level+1))level++;
 return level;
}
export function levelTitle(level){
 if(level>=50)return 'Drift Legend';
 if(level>=35)return 'Elite Outlaw';
 if(level>=25)return 'Street King';
 if(level>=15)return 'Pro Drifter';
 if(level>=10)return 'Night Runner';
 if(level>=5)return 'Street Racer';
 return 'Rookie Driver';
}
export function levelReward(level){return 40+Math.floor(level)*22;}
