// Single source of truth for driving physics and the garage upgrade comparison UI.
// Values are game-balancing estimates, not manufacturer-certified specifications.
export const PERFORMANCE_FIELDS=[
 ['hp','HORSEPOWER',' HP',0,true],['handling','HANDLING',' / 100',0,true],
 ['acceleration','ACCELERATION',' m/s²',2,true],['top','MAX SPEED',' MPH',0,true],
 ['shiftTime','GEAR SHIFT TIME',' sec',2,false],['brake','BRAKING FORCE','',1,true],
 ['gripScore','GRIP CONTROL',' / 100',0,true],['weightKg','WEIGHT',' kg',0,false]
];
export function performanceStats(base,u={}){
 const v=(n)=>Math.max(0,Math.floor(Number(u[n])||0));
 const weightKg=Math.max(820,base.weight*(1-.032*v('weightReduction')));
 const hp=base.hp*(1+.14*v('engine')+.11*v('turbo')+.10*v('supercharger')+.052*v('ecu')+.032*v('fuelSystem')+.025*v('exhaustPerformance')+.019*v('cooling'));
 const top=base.top*(1+.026*v('engine')+.052*v('turbo')+.03*v('supercharger')+.018*v('transmission')+.010*v('ecu'));
 const trans=v('transmission'),clutch=v('clutch'),susp=v('suspension'),steer=v('steering'),grip=v('tires'),diff=v('differential'),drive=v('driveshaft');
 const acceleration=(3.15+5.65*hp/weightKg)*(1+.023*trans+.018*clutch+.012*drive+.008*v('cooling'));
 const handling=Math.min(100,base.handling+grip*2.4+susp*2.4+steer*1.3+diff*1.1+v('weightReduction')*.8);
 const gripScore=Math.min(100,Math.round(58+grip*7+susp*3+diff*2));
 const shiftTime=Math.max(.12,.47-.048*trans-.026*clutch-.009*drive);
 return {hp,top,handling,acceleration,shiftTime,brake:16+v('brakes')*2.2,gripScore,weightKg,
  grip,steer,susp,trans,clutch,diff,weight:v('weightReduction'),drive};
}
export function upgradePreview(base,upgrades,upgradeId,cap){
 const current=performanceStats(base,upgrades);
 const after={...upgrades,[upgradeId]:Math.min(cap,(upgrades[upgradeId]||0)+1)};
 return {current,next:performanceStats(base,after)};
}
