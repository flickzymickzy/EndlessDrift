// Simple deterministic heat progression for police escalation.
// Values are weighted seconds needed to unlock the next alert level.
export const WANTED_STAGE_SECONDS=[0,8,9,10,11];
export function wantedHeatRate(speedKmh,driftAngle=0){
  const base=speedKmh>=160?1.35:speedKmh>=100?1:speedKmh>=70?0.6:0.28;
  return base+(driftAngle>=22&&speedKmh>=65?0.22:0);
}
export function nextWantedLevel(level,heat){
 if(level<1)return 0;
 return level<5&&heat>=WANTED_STAGE_SECONDS[level]?level+1:level;
}
