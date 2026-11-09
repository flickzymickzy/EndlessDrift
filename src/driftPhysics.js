// ENDLESS DRIFT V12: frame-rate-independent and beginner-friendly drift model.
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const ease=(old,goal,r,dt)=>old+(goal-old)*(1-Math.exp(-Math.max(0,r)*dt));
export function driftStep({mph=0,longitudinal=0,lateral=0,steer=0,handbrake=false,
 dt=1/90,blend=0,steeringInput=0,yaw=0,style='street',assist=true,
 steeringSensitivity=1,steeringTune=50,gripTune=50,stabilityTune=60,
 tireUpgrade=0,suspension=0,steeringKit=0,differential=0}){
 const speed=Math.abs(mph);const a=Math.abs(steer);
 const handling=style==='pro'?.75:style==='arcade'?1.25:1.05;
 // Quick entry at ~12 MPH; neutral steer settles gently without a spin.
 const active=speed>=10 && (a>.06||handbrake);
 const nextBlend=ease(blend,active?1:0,active?7.0:3.2,dt);
 const grip=clamp(.9+gripTune*.003+tireUpgrade*.07,.84,1.45);
 const steeringMax=(.30+.038*steeringKit)*(.83+steeringTune*.0038)*clamp(steeringSensitivity,.5,1.8);
 const steerScale=clamp(35/Math.max(16,speed*.447),.44,1);
 const transitionSnap=(Math.sign(steeringInput||0)!==Math.sign(steer||0)&&Math.abs(steeringInput)>.08&&a>.08)?5.0:8.4;
 const steering=ease(steeringInput,steer*steeringMax*steerScale,transitionSnap+suspension*.55,dt);
 // Lateral speed is deliberate and smooth; grip and drift kit control the upper bound.
 const driftPower=(6.1+Math.min(speed,120)*.084)*handling*(handbrake?1.86:1)/Math.sqrt(grip);
 const targetDirection=a>.08?-Math.sign(steering||steer||1):(Math.abs(lateral)>.25?Math.sign(lateral):0);
 const reversing=Math.sign(lateral||0)!==0&&Math.sign(lateral||0)!==Math.sign(targetDirection||0);
 const slideGoal=targetDirection*driftPower*nextBlend;
 const side=ease(lateral,slideGoal,active?(reversing?1.8:3.25)+differential*.20:4.6+tireUpgrade*.26,dt);
 const slideLimit=handbrake?(assist?22:26):(assist?18.5:23);
 const newLateral=clamp(side,-slideLimit,slideLimit);
 // Stable yaw avoids instantly steering directly into the barrier at highway speed.
 const yawGoal=clamp(steering*.92*(speed>=16?1:.62)*(handbrake&&a>.06?1.4:1),-.33,.33)*(assist?.73:1.0);
 const newYaw=ease(yaw,yawGoal,7.8+suspension*.28+stabilityTune*.032,dt);
 const slip=Math.atan2(Math.abs(newLateral),Math.max(2.4,Math.abs(longitudinal)))*180/Math.PI;
 const drifting=speed>=11&&nextBlend>.12&&slip>4.2&&slip<68;
 return {lateral:newLateral,yaw:newYaw,steeringInput:steering,blend:nextBlend,slip,drifting};
}
