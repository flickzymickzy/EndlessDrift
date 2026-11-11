// Browser-independent, allowlisted car styling options.
export const PAINT_FINISHES=Object.freeze({
 gloss:{label:'Glossy clearcoat',metalness:.71,roughness:.155,clearcoat:1,clearcoatRoughness:.06},
 satin:{label:'Satin finish',metalness:.49,roughness:.34,clearcoat:.35,clearcoatRoughness:.34},
 matte:{label:'Matte finish',metalness:.17,roughness:.83,clearcoat:.03,clearcoatRoughness:.8},
 chrome:{label:'Chrome finish',metalness:1,roughness:.075,clearcoat:.7,clearcoatRoughness:.05}
});
export const CAR_EXTRAS_DEFAULTS=Object.freeze({paintFinish:'gloss',caliperColor:'#ee693d',headlightColor:'#e6f6ff'});
export const safeCarHex=(value,fallback)=>typeof value==='string'&&/^#[a-f0-9]{6}$/i.test(value)?value.toLowerCase():fallback;
export function sanitizeCarExtras(value={}){
 const car=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 return {
  paintFinish:Object.hasOwn(PAINT_FINISHES,car.paintFinish)?car.paintFinish:CAR_EXTRAS_DEFAULTS.paintFinish,
  caliperColor:safeCarHex(car.caliperColor,CAR_EXTRAS_DEFAULTS.caliperColor),
  headlightColor:safeCarHex(car.headlightColor,CAR_EXTRAS_DEFAULTS.headlightColor)
 };
}
