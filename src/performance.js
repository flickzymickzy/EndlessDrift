// Single source of truth for driving physics and the garage upgrade comparison UI.
export const MAX_VEHICLE_SPEED_MPH=300;
const MPH_PER_MPS=2.2369362921;
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
 const top=Math.min(MAX_VEHICLE_SPEED_MPH,base.top*(1+.026*v('engine')+.052*v('turbo')+.03*v('supercharger')+.018*v('transmission')+.010*v('ecu')));
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

// Respect each car's upgraded limit with an absolute ceiling, even under admin /speed.
export function vehicleSpeedLimitMps(carTopMph,adminMultiplier=1){
 const top=Number(carTopMph),value=Number(adminMultiplier);
 const safeTop=Number.isFinite(top)?Math.max(0,top):0;
 const mult=Number.isFinite(value)?Math.min(3,Math.max(.5,value)):1;
 return Math.min(MAX_VEHICLE_SPEED_MPH,safeTop*mult)/MPH_PER_MPS;
}
// Hard speed limit for total car movement, including side-slip and boost-pad impulses.
// topSpeedMps reflects the upgraded car and the existing admin speed multiplier.
export function capVehicleVelocity(vehicle,topSpeedMps){
 const cap=Number.isFinite(topSpeedMps)?Math.max(0,topSpeedMps):0;
 const vx=Number.isFinite(vehicle.vx)?vehicle.vx:0;
 const vz=Number.isFinite(vehicle.vz)?vehicle.vz:0;
 const speed=Math.hypot(vx,vz);
 const scale=speed>cap&&speed>0?cap/speed:1;
 vehicle.vx=vx*scale;
 vehicle.vz=vz*scale;
 vehicle.speed=Math.hypot(vehicle.vx,vehicle.vz);
 return vehicle.speed;
}
