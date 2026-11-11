// Allowlisted, backwards-compatible cosmetic settings for the 3D car and public profiles.
// These values do not alter the V27 drifting physics.
export const PAINT_FINISHES=Object.freeze({
 gloss:{label:'Glossy clearcoat',metalness:.71,roughness:.155,clearcoat:1,clearcoatRoughness:.06},
 satin:{label:'Satin finish',metalness:.49,roughness:.34,clearcoat:.35,clearcoatRoughness:.34},
 matte:{label:'Matte finish',metalness:.17,roughness:.83,clearcoat:.03,clearcoatRoughness:.8},
 chrome:{label:'Chrome finish',metalness:1,roughness:.075,clearcoat:.7,clearcoatRoughness:.05}
});
export const CAR_EXTRAS_DEFAULTS=Object.freeze({
 paintFinish:'gloss',caliperColor:'#ee693d',headlightColor:'#e6f6ff',
 secondaryColor:'match',roofColor:'match',taillightColor:'#ff253f',exhaustFlameColor:'#ff691f',
 rideHeight:50,wheelCamber:50,wheelSize:50,frontTrackWidth:50,rearTrackWidth:50,neonIntensity:100
});
export const CAR_STANCE_FIELDS=Object.freeze([
 ['rideHeight','RIDE HEIGHT'],['wheelCamber','WHEEL CAMBER'],['wheelSize','WHEEL SIZE'],
 ['frontTrackWidth','FRONT TRACK WIDTH'],['rearTrackWidth','REAR TRACK WIDTH'],['neonIntensity','NEON BRIGHTNESS']
]);
export const safeCarHex=(value,fallback)=>typeof value==='string'&&/^#[a-f0-9]{6}$/i.test(value)?value.toLowerCase():fallback;
const constrainedPercent=(v,fallback)=>{const n=Number(v);return v===null||v===undefined||v===''||!Number.isFinite(n)?fallback:Math.max(0,Math.min(100,Math.round(n)));};
export function sanitizeCarExtras(value={}){
 const car=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 const defaults=CAR_EXTRAS_DEFAULTS;
 const extras={
  paintFinish:Object.hasOwn(PAINT_FINISHES,car.paintFinish)?car.paintFinish:defaults.paintFinish,
  caliperColor:safeCarHex(car.caliperColor,defaults.caliperColor),
  headlightColor:safeCarHex(car.headlightColor,defaults.headlightColor),
  secondaryColor:car.secondaryColor==='match'?'match':safeCarHex(car.secondaryColor,defaults.secondaryColor),
  roofColor:car.roofColor==='match'?'match':safeCarHex(car.roofColor,defaults.roofColor),
  taillightColor:safeCarHex(car.taillightColor,defaults.taillightColor),
  exhaustFlameColor:safeCarHex(car.exhaustFlameColor,defaults.exhaustFlameColor)
 };
 for(const [key] of CAR_STANCE_FIELDS)extras[key]=constrainedPercent(car[key],defaults[key]);
 return extras;
}
