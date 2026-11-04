import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Original, procedural vehicle shapes. Their profiles, lights, intakes, canopy,
// bodywork and wheels vary by model. No copyrighted car meshes are included.
const PROFILE={
 'sakura-s13':'retro','midnight-r32':'boxy','apex-86':'classic','vortex-rx':'fastback',
 'night-350':'track','samurai-s15':'track','phantom-m3':'sedan','supra-xt':'fastback',
 'charger-x':'muscle','gtr-r':'track','venom-720':'super','horizon-r34':'boxy',
 'eclipse-gx':'fastback','kaze-brz':'classic','monarch-e46':'sedan','viper-v10':'roadster',
 'camaro-rs':'muscle','blackout-rs6':'wagon','phantom-m4':'track','apex-r8':'super',
 'cobra-gt':'muscle','raven-911':'rounded','comet-c8':'super','nebula-x':'hyper'
};
const SHAPE={
 retro:{roof:.52,front:.13,rear:-.19,nose:.86,rearHeight:.89,topWidth:.36,body:.47,arch:.98},
 boxy:{roof:.56,front:.20,rear:-.28,nose:.91,rearHeight:.96,topWidth:.39,body:.51,arch:1},
 classic:{roof:.46,front:.18,rear:-.22,nose:.81,rearHeight:.84,topWidth:.35,body:.43,arch:.95},
 fastback:{roof:.36,front:.14,rear:-.31,nose:.77,rearHeight:.82,topWidth:.36,body:.43,arch:1},
 track:{roof:.38,front:.13,rear:-.23,nose:.77,rearHeight:.90,topWidth:.35,body:.44,arch:1.04},
 sedan:{roof:.58,front:.25,rear:-.27,nose:.88,rearHeight:.95,topWidth:.38,body:.49,arch:1},
 muscle:{roof:.41,front:.04,rear:-.16,nose:.91,rearHeight:.94,topWidth:.34,body:.52,arch:1.09},
 roadster:{roof:.23,front:.14,rear:-.11,nose:.72,rearHeight:.81,topWidth:.30,body:.40,arch:1.04},
 wagon:{roof:.55,front:.24,rear:-.40,nose:.90,rearHeight:.97,topWidth:.39,body:.48,arch:1},
 super:{roof:.29,front:.11,rear:-.24,nose:.64,rearHeight:.72,topWidth:.36,body:.36,arch:1.09},
 hyper:{roof:.22,front:.09,rear:-.30,nose:.61,rearHeight:.69,topWidth:.35,body:.34,arch:1.14},
 rounded:{roof:.42,front:.18,rear:-.20,nose:.80,rearHeight:.87,topWidth:.35,body:.42,arch:.96}
};
const shared={
 tire:new THREE.MeshStandardMaterial({color:0x11151a,metalness:.06,roughness:1}),
 under:new THREE.MeshStandardMaterial({color:0x101924,metalness:.35,roughness:.58}),
 grille:new THREE.MeshStandardMaterial({color:0x0a1015,metalness:.33,roughness:.51}),
 chrome:new THREE.MeshStandardMaterial({color:0xcbd7e5,metalness:.96,roughness:.18}),
 smoked:new THREE.MeshStandardMaterial({color:0x2b3944,metalness:.75,roughness:.27}),
 rotor:new THREE.MeshStandardMaterial({color:0x697a86,metalness:.87,roughness:.37}),
 caliper:new THREE.MeshStandardMaterial({color:0xee693d,metalness:.55,roughness:.29}),
 glass:new THREE.MeshPhysicalMaterial({color:0x142e3e,metalness:.25,roughness:.10,transparent:true,opacity:.91,clearcoat:1}),
 mirror:new THREE.MeshStandardMaterial({color:0x101a23,roughness:.22,metalness:.5}),
 white:new THREE.MeshStandardMaterial({color:0xe2faff,emissive:0xb6e7ff,emissiveIntensity:1.4,roughness:.13}),
 amber:new THREE.MeshStandardMaterial({color:0xffb14a,emissive:0xff993b,emissiveIntensity:.8}),
 red:new THREE.MeshStandardMaterial({color:0xff253f,emissive:0xee2038,emissiveIntensity:1.5}),
 stripe:new THREE.MeshStandardMaterial({color:0xf2f6ff,metalness:.45,roughness:.26})
};
const rimGeometry=new THREE.CylinderGeometry(.305,.305,.085,36);
const tireGeometry=new THREE.CylinderGeometry(.415,.415,.245,28);
const discGeometry=new THREE.CylinderGeometry(.285,.285,.024,22);
for(const geo of [rimGeometry,tireGeometry,discGeometry])geo.userData.shared=true;
function box(group,w,h,d,material,x,y,z,r=.025){
 const geo=r>0?new RoundedBoxGeometry(w,h,d,2,Math.min(r,h/2,w/2,d/2)):new THREE.BoxGeometry(w,h,d);
 const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;
}
function quad(g,pts,mat){
 const geom=new THREE.BufferGeometry(),a=pts.map(p=>new THREE.Vector3(...p));
 geom.setAttribute('position',new THREE.Float32BufferAttribute([...a[0].toArray(),...a[1].toArray(),...a[2].toArray(),...a[0].toArray(),...a[2].toArray(),...a[3].toArray()],3));
 geom.computeVertexNormals();const m=new THREE.Mesh(geom,mat);m.material.side=THREE.DoubleSide;m.castShadow=true;g.add(m);return m;
}
function bar(g,a,b,r,mat){const v1=new THREE.Vector3(...a),v2=new THREE.Vector3(...b),diff=v2.clone().sub(v1);
 const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,diff.length(),6),mat);m.position.copy(v1).add(v2).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),diff.normalize());g.add(m);return m;
}
function plateMaterial(name){const cv=document.createElement('canvas');cv.width=256;cv.height=96;const ctx=cv.getContext('2d');ctx.fillStyle='#e4e9e9';ctx.fillRect(0,0,256,96);ctx.strokeStyle='#132b3d';ctx.lineWidth=8;ctx.strokeRect(3,3,250,90);ctx.fillStyle='#071827';ctx.font='bold 26px Arial';ctx.textAlign='center';ctx.fillText(name.slice(0,15).toUpperCase(),128,59);const tx=new THREE.CanvasTexture(cv);tx.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshStandardMaterial({map:tx,metalness:.18,roughness:.4});}
export function createCar(spec,color,options={}){
 const kind=PROFILE[spec.id]||'classic';const seed=[...spec.id].reduce((n,c)=>n+c.charCodeAt(0),0);const base=SHAPE[kind];
 const q={...base,roof:base.roof+((seed%7)-3)*.012,nose:base.nose+((seed%5)-2)*.011,rearHeight:base.rearHeight+((seed%9)-4)*.009,topWidth:base.topWidth+((seed%3)-1)*.008};const traffic=!!options.traffic,appearance=options.appearance||{};
 const w=spec.width||1.82,l=spec.length||4.45,half=l/2;
 const root=new THREE.Group();const parts=new THREE.Group();root.add(parts);
 const paintMat=new THREE.MeshPhysicalMaterial({color:color||spec.color,metalness:.71,roughness:.155,clearcoat:1,clearcoatRoughness:.06,reflectivity:1});
 const rimMat=new THREE.MeshStandardMaterial({color:options.rims||'#d0d9e2',metalness:.92,roughness:.19});
 const underMat=new THREE.MeshBasicMaterial({color:options.neon&&options.neon!=='off'?options.neon:'#58ffd3',transparent:true,opacity:options.neon&&options.neon!=='off'?.27:0,depthWrite:false,side:THREE.DoubleSide});
 const glassMat=shared.glass.clone();glassMat.color.set(appearance.tint==='dark'?'#07111a':appearance.tint==='smoke'?'#101e32':'#193747');glassMat.opacity=appearance.tint==='dark'?.98:.9;
 const bodyY=.64,hoodY=q.nose,trunkY=q.rearHeight;
 box(parts,w,q.body,l,paintMat,0,bodyY,0,.13);
 const shellTop=bodyY+q.body/2;
 box(parts,w*.95,.09,l*.24,paintMat,0,hoodY,half-l*.135,.045);
 box(parts,w*.94,.09,l*.17,paintMat,0,trunkY,-half+l*.095,.04);
 // Curved fender shoulders and hood creases make each car's profile less boxy.
 const sculpt=new THREE.MeshPhysicalMaterial({color:color||spec.color,metalness:.75,roughness:.20,clearcoat:1,clearcoatRoughness:.07});
 const slices=[-half+.20,-half*.70,-half*.29,half*.17,half*.55,half-.17];
 const heightAt=z=>z>half*.26?hoodY+.025:z< -half*.26?trunkY+.015:shellTop+.025;
 for(let k=0;k<slices.length-1;k++){
   const z1=slices[k],z2=slices[k+1],h1=heightAt(z1),h2=heightAt(z2);
   for(const side of [-1,1]){
    // Two short body surfaces at the shoulders; slight bonnet curvature stays visible in reflections.
    const x1=side*w*.45,x2=side*w*.32;
    quad(parts,[[x1,h1,z1],[x2,h1+.037,z1],[x2,h2+.037,z2],[x1,h2,z2]],sculpt);
   }
 }
 // Sculpted hoods and shoulders make long-hood cars, rear-engined sports cars,
 // low hypercars and tall wagons look different even without 3D assets.
 const shoulderZ=half-l*.19;
 quad(parts,[[-w*.43,hoodY-.04,half],[w*.43,hoodY-.04,half],[w*.47,shellTop,shoulderZ],[-w*.47,shellTop,shoulderZ]],paintMat);
 const farY=q.rearHeight-.04;quad(parts,[[-w*.43,farY,-half],[w*.43,farY,-half],[w*.47,shellTop,-half+l*.2],[-w*.47,shellTop,-half+l*.2]],paintMat);
 for(const side of [-1,1]){
   // Fender-lip highlights and sculpted lower front intakes.
   box(parts,.033,.018,l*.30,shared.chrome,side*w*.45,.84,half-l*.31,.007);
   // Sharply defined shoulder / door creases and lower air channels.
   box(parts,.025,.027,l*.70,shared.smoked,side*w*.498,bodyY+.09,-.02,.006);
   box(parts,.055,.075,l*.64,shared.under,side*w*.49,.43,0,.015);
   box(parts,.12,.13,l*.17,paintMat,side*w*.475,.76,half*.56,.04);
 }
 const roofBase=Math.max(shellTop+.05,Math.min(hoodY,trunkY)+.01);
 const topY=roofBase+q.roof, roofW=w*q.topWidth;
 const frontLow=l*q.front,rearLow=l*q.rear;
 const frontHigh=frontLow-(kind==='muscle'?.17:.10)*l,rearHigh=rearLow+(kind==='wagon'?-.02:.075)*l;
 const pFL=[-w*.425,roofBase,frontLow],pFR=[w*.425,roofBase,frontLow];
 const pBL=[-w*.425,roofBase,rearLow],pBR=[w*.425,roofBase,rearLow];
 const tFL=[-roofW,topY,frontHigh],tFR=[roofW,topY,frontHigh];
 const tBL=[-roofW,topY,rearHigh],tBR=[roofW,topY,rearHigh];
 quad(parts,[pFL,pFR,tFR,tFL],glassMat);
 quad(parts,[pBR,pBL,tBL,tBR],glassMat);
 quad(parts,[pBL,pFL,tFL,tBL],glassMat);
 quad(parts,[pFR,pBR,tBR,tFR],glassMat);
 quad(parts,[tBL,tFL,tFR,tBR],paintMat);
 if(!traffic){
  // Interior: seats, centre tunnel, gauge cluster and screen are visible through the glazing.
  const upholstery=new THREE.MeshStandardMaterial({color:0x121a21,metalness:.16,roughness:.88});
  const seats=[-.34,.34];
  for(const x of seats){box(parts,.52,.18,.60,upholstery,x,roofBase-.04,-.20,.07);const seat=box(parts,.49,.53,.14,upholstery,x,roofBase+.20,-.43,.07);seat.rotation.x=-.10;box(parts,.33,.15,.12,upholstery,x,roofBase+.49,-.47,.04);}
  box(parts,.66,.14,.4,upholstery,0,roofBase+.015,frontLow-.08,.06);
  box(parts,.18,.22,.06,shared.grille,-.34,roofBase+.19,frontLow-.12,.04);
 }
 for(const [a,b] of [[pFL,tFL],[pFR,tFR],[pBL,tBL],[pBR,tBR],[tBL,tFL],[tBR,tFR],[tBL,tBR]])bar(parts,a,b,.021,shared.mirror);
 if(kind==='wagon'||kind==='sedan'||kind==='boxy'){
   const middleZ=(rearLow+frontLow)/2;
   for(const side of [-1,1])bar(parts,[side*roofW,topY,middleZ+.035],[side*w*.425,roofBase,middleZ+.035],.017,shared.mirror);
 }
 // Front fascia and rear end have different proportions between classes.
 const bumperY=kind==='hyper'?.54:kind==='muscle'?.60:.58;
 box(parts,w*.95,.19,.18,paintMat,0,bumperY,half+.004,.045);
 box(parts,w*.95,.18,.16,paintMat,0,bumperY,-half-.004,.04);
 box(parts,w*(kind==='muscle'?.65:.51),.11,.035,shared.grille,0,bumperY+.028,half+.109,.009);
 if(!traffic){
  // Front grille depth, slats and lower cooling apertures.
  for(let j=0;j<5;j++)box(parts,w*(kind==='muscle'?.60:.46),.007,.019,shared.chrome,0,bumperY-.017+j*.024,half+.132,.002);
  for(const side of [-1,1]){box(parts,w*.19,.095,.024,shared.grille,side*w*.35,.45,half+.12,.01);box(parts,w*.20,.018,.025,shared.chrome,side*w*.35,.54,half+.133,.005);}
 }
 box(parts,w*.43,.09,.033,shared.grille,0,bumperY+.035,-half-.102,.01);
 const headlampStyle=(spec.id.length+spec.hp)%3;
 for(const side of [-1,1]){
   if(headlampStyle===0||kind==='rounded'){
     const lamp=new THREE.Mesh(new THREE.SphereGeometry(kind==='rounded'?.13:.10,14,8),shared.white);
     lamp.scale.set(1,.55,.43);lamp.position.set(side*w*.32,.77,half+.11);parts.add(lamp);
   }else if(headlampStyle===1){
     const lamp=box(parts,w*.22,.085,.045,shared.white,side*w*.32,.795,half+.11,.018);lamp.rotation.z=side*.14;
   }else{
     const lamp=box(parts,w*.25,.045,.055,shared.white,side*w*.325,.805,half+.106,.014);lamp.rotation.z=-side*.13;
     box(parts,w*.19,.026,.05,shared.smoked,side*w*.32,.758,half+.108,.006);
   }
   if(['boxy','sedan','wagon'].includes(kind)){
     box(parts,w*.24,.085,.052,shared.red,side*w*.30,.79,-half-.105,.014);
     box(parts,w*.07,.055,.06,shared.amber,side*w*.46,.73,half+.085,.009);
   }else if(kind==='hyper'||kind==='super'){
     box(parts,w*.31,.038,.05,shared.red,side*w*.29,.78,-half-.107,.006);
     box(parts,w*.11,.058,.08,shared.grille,side*w*.40,.49,half+.095,.01);
   }else{
     box(parts,w*.23,.12,.045,shared.red,side*w*.31,.76,-half-.105,.016);
   }
   if(!traffic){
     // Model-specific LED running-light signatures and individual rear light elements.
     const ledCount=kind==='super'||kind==='hyper'?5:3;
     for(let led=0;led<ledCount;led++){
       const lx=side*(w*.23+led*w*.032),z=half+.149;
       box(parts,w*.024,.015,.019,shared.white,lx,.745+((seed+led)%2)*.025,z,.003);
       box(parts,w*.025,.025,.02,shared.red,lx,.756,-half-.135,.004);
     }
     // Door panel contour and flush handle.
     box(parts,.014,.020,l*.20,shared.chrome,side*w*.503,.80,-.05,.004);
   }
   // Mirrors, handles, running lights, intakes, exhaust tips.
   box(parts,.14,.09,.18,paintMat,side*w*.54,roofBase+.14,frontLow-.12,.029);
   box(parts,.075,.026,.13,shared.chrome,side*w*.51,roofBase-.02,-.24,.008);
   box(parts,w*.16,.026,.045,shared.white,side*w*.31,.70,half+.11,.008);
   box(parts,.07,.052,.095,shared.chrome,side*w*.29,.48,-half-.13,.017);
   box(parts,w*.17,.09,.035,shared.grille,side*w*.38,bumperY-.06,half+.11,.01);
 }
 if(['super','hyper','track','fastback'].includes(kind)){
   for(const side of [-1,1]){
     box(parts,.021,.18,l*.21,shared.grille,side*w*.495,.64,-l*.09,.011);
     box(parts,w*.14,.022,l*.15,shared.grille,side*w*.26,hoodY+.055,half-l*.25,.007);
   }
 }
 if(kind==='muscle'||kind==='roadster'){
   box(parts,w*.20,.07,l*.25,shared.grille,0,hoodY+.085,half-l*.27,.03);
   box(parts,w*.09,.085,l*.20,paintMat,0,hoodY+.11,half-l*.23,.02);
 }
 if(kind==='rounded'){
   for(const side of [-1,1])box(parts,w*.14,.018,l*.23,shared.smoked,side*w*.23,hoodY+.058,half-l*.24,.009);
 }
 if(kind==='wagon'){
   for(const side of [-1,1])box(parts,.042,.066,l*.48,shared.chrome,side*roofW,topY+.025,(frontHigh+rearHigh)/2,.02);
 }
 // Optional class-specific wing: not all cars use the same spoiler.
 let wing;
 if(['track','super','hyper'].includes(kind)||spec.hp>=580){
   const spoilerY=kind==='hyper'?1.16:kind==='track'?1.18:1.08;
   wing=box(parts,w*(kind==='hyper'?.89:.76),.07,.25,shared.under,0,spoilerY,-half+.27,.02);
   for(const side of [-1,1])box(parts,.06,.26,.06,shared.smoked,side*w*.26,spoilerY-.145,-half+.28,.015);
   for(const side of [-1,1])box(parts,.04,.12,.31,paintMat,side*w*.40,spoilerY,-half+.28,.012);
 }else if(kind==='retro'||kind==='fastback'){
   wing=box(parts,w*.68,.055,.17,paintMat,0,trunkY+.11,-half+.16,.021);
 }
 if(!traffic){
   // Accent stripes and contrast graphics are intentionally different by model.
   const pattern=(spec.hp+spec.name.length)%4;
   if(pattern===0||kind==='muscle')for(const side of [-1,1])box(parts,.042,.015,l*.26,shared.stripe,side*.14,hoodY+.057,half-l*.26,.007);
   if(pattern===1)for(const side of [-1,1])box(parts,.03,.13,l*.18,shared.smoked,side*w*.494,.68,half-l*.34,.009);
   if(pattern===2)box(parts,w*.23,.025,.04,shared.chrome,0,.78,-half-.109,.006);
   const plate=new THREE.Mesh(new THREE.PlaneGeometry(.62,.20),plateMaterial(spec.name));plate.position.set(0,.72,-half-.11);plate.rotation.y=Math.PI;parts.add(plate);
 }
 // Customization is physical geometry, not a text-only menu.
 const aeroMat=new THREE.MeshStandardMaterial({color:0x141c25,metalness:.65,roughness:.28});
 const titanium=new THREE.MeshStandardMaterial({color:0x647da0,metalness:.88,roughness:.22});
 if(!traffic){
  // Distinctive front treatments, hood lines and sculpted fender accents for each model.
  const signature=(spec.id.split('').reduce((n,c)=>n+c.charCodeAt(0),0)%4);
  if(signature===0){for(const side of [-1,1])box(parts,w*.11,.015,l*.26,shared.smoked,side*w*.30,hoodY+.064,half-l*.22,.008);}
  if(signature===1){box(parts,w*.33,.025,.12,shared.grille,0,hoodY+.06,half-l*.31,.008);}
  if(signature===2){for(const side of [-1,1])box(parts,w*.22,.018,.06,shared.chrome,side*w*.27,hoodY+.060,half-l*.12,.006);}
  if(signature===3){for(const side of [-1,1])box(parts,.035,.018,l*.30,shared.smoked,side*w*.40,hoodY+.065,half-l*.26,.007);}
  // Adjustable painted rockers and side-skirts.
  if(appearance.skirts==='street'||appearance.skirts==='aero')for(const side of [-1,1]){
    const ext=appearance.skirts==='aero'?.22:.14;
    box(parts,ext,.095,l*.70,aeroMat,side*(w*.49+ext*.25),.29,-.03,.02);
    if(appearance.skirts==='aero')box(parts,.065,.08,l*.58,shared.chrome,side*(w*.53+ext*.14),.30,-.08,.01);
  }
  if(appearance.splitter!=='stock'){
    const width=appearance.splitter==='race'?w*1.19:w*1.03;
    box(parts,width,.045,.44,aeroMat,0,.36,half+.13,.02);
    if(appearance.splitter==='race')for(const side of [-1,1])box(parts,.034,.10,.27,aeroMat,side*width*.47,.42,half+.18,.01);
  }
  if(appearance.diffuser!=='stock'){
    box(parts,w*.90,.06,.42,aeroMat,0,.34,-half-.17,.02);
    for(const x of [-.48,-.18,.18,.48])box(parts,.035,.19,.32,aeroMat,x,.36,-half-.18,.012);
  }
  // Rear aero options. All optional spoilers are visibly different.
  if(appearance.spoiler==='lip')box(parts,w*.74,.085,.24,paintMat,0,Math.max(trunkY+.16,1.03),-half+.20,.035);
  if(['gt','race'].includes(appearance.spoiler)){
    const y=appearance.spoiler==='race'?1.60:1.38;
    for(const side of [-1,1])box(parts,.055,y-1.02,.11,aeroMat,side*w*.29,(y+1.02)/2,-half+.22,.012);
    box(parts,w*(appearance.spoiler==='race'?1.06:.88),.07,appearance.spoiler==='race'?.39:.27,aeroMat,0,y,-half+.22,.023);
    for(const side of [-1,1])box(parts,.035,.18,.32,aeroMat,side*w*.49,y,-half+.22,.013);
  }
  if(appearance.hood==='vents')for(const side of [-1,1]){
    box(parts,w*.16,.01,.30,shared.grille,side*w*.23,hoodY+.072,half-l*.27,.007);
    for(let t=0;t<3;t++)box(parts,w*.15,.015,.015,shared.chrome,side*w*.23,hoodY+.082,half-l*.27+(t-1)*.085,.003);
  }
  if(appearance.hood==='scoop'){
    box(parts,w*.30,.14,.44,paintMat,0,hoodY+.13,half-l*.27,.027);
    box(parts,w*.23,.07,.025,shared.grille,0,hoodY+.15,half-l*.27+.22,.007);
  }
  // Actual exhaust tips extend from the rear bumper; selected part changes arrangement.
  const exhaustStyle=appearance.exhaust||'stock';
  const exXs=exhaustStyle==='quad'?[-w*.35,-w*.23,w*.23,w*.35]:exhaustStyle==='dual'?[-w*.32,w*.32]:exhaustStyle==='burnt'?[w*.33]:[-w*.31];
  for(const x of exXs){
    const colorMat=exhaustStyle==='burnt'?titanium:shared.chrome;
    const tip=new THREE.Mesh(new THREE.CylinderGeometry(exhaustStyle==='quad'?.09:.105,exhaustStyle==='quad'?.09:.105,.34,14,1,true),colorMat);
    tip.rotation.x=Math.PI/2;tip.position.set(x,.47,-half-.22);parts.add(tip);
    const center=new THREE.Mesh(new THREE.CircleGeometry(exhaustStyle==='quad'?.075:.09,14),shared.grille);center.position.set(x,.47,-half-.405);center.rotation.y=Math.PI;parts.add(center);
  }
  // Front LED signatures and lower grille geometry.
  for(const side of [-1,1])box(parts,w*.11,.018,.035,shared.white,side*w*.25,.69,half+.14,.005);
 }
 // Four rolling wheels with actual moving steer pivots and individual rim paint.
 const wheels=[];for(const side of [-1,1])for(const axle of [1,-1]){
   const zp=axle===1?l*.31:-l*.32;
   const pivot=new THREE.Group();pivot.position.set(side*w*.485,.405,zp);
   const spin=new THREE.Group();
   const tire=new THREE.Mesh(tireGeometry,shared.tire);tire.rotation.z=Math.PI/2;tire.castShadow=true;spin.add(tire);
   const disc=new THREE.Mesh(discGeometry,shared.rotor);disc.rotation.z=Math.PI/2;disc.position.x=-side*.024;spin.add(disc);
   const rim=new THREE.Mesh(rimGeometry,rimMat);rim.rotation.z=Math.PI/2;rim.position.x=side*.132;rim.castShadow=true;spin.add(rim);
   const hub=new THREE.Mesh(new THREE.CylinderGeometry(.072,.072,.1,18),shared.chrome);hub.rotation.z=Math.PI/2;hub.position.x=side*.180;spin.add(hub);
   if(!traffic){
     const spokeCount=appearance.wheels==='mesh'?12:appearance.wheels==='five'?5:appearance.wheels==='turbine'?9:(spec.hp%3===0)?8:spec.kind==='super'?10:6;
     for(let spoke=0;spoke<spokeCount;spoke++){
       const a=2*Math.PI*spoke/spokeCount;
       const b=box(spin,.038,.044,.265,rimMat,side*.168,Math.sin(a)*.182,Math.cos(a)*.182,.008);
       b.rotation.x=-a;
     }
     // Tire shoulder, valve bolts and brake components increase close-up showroom detail.
     const ring=new THREE.Mesh(new THREE.TorusGeometry(.314,.026,8,44),shared.chrome);ring.rotation.y=Math.PI/2;ring.position.x=side*.174;spin.add(ring);
     const lip=new THREE.Mesh(new THREE.TorusGeometry(.258,.018,8,38),rimMat);lip.rotation.y=Math.PI/2;lip.position.x=side*.178;spin.add(lip);
     for(let bolt=0;bolt<5;bolt++){const a=Math.PI*2*bolt/5;const m=new THREE.Mesh(new THREE.SphereGeometry(.016,8,6),shared.chrome);m.position.set(side*.183,Math.sin(a)*.095,Math.cos(a)*.095);spin.add(m);}
     box(pivot,.06,.12,.09,shared.caliper,side*.14,.22,0,.018);
   }
   pivot.add(spin);root.add(pivot);wheels.push({wheelPivot:pivot,spin,front:axle===1});
   if(!traffic){const arch=new THREE.Mesh(new THREE.TorusGeometry(.443,.018,6,20,Math.PI*1.04),shared.under);
     arch.rotation.y=Math.PI/2;arch.rotation.z=-Math.PI*.02;arch.position.set(side*w*.51,.403,zp);parts.add(arch);
   }
 }
 // Underbody light is an optional battle-pass cosmetic, off by default.
 const neon=new THREE.Mesh(new THREE.PlaneGeometry(w*1.48,l*.7),underMat);neon.rotation.x=-Math.PI/2;neon.position.set(0,.028,0);root.add(neon);
 root.userData={wheels,bodyMat:paintMat,rimMat,neonMat:underMat,neon,spec,parts,kind,wing,appearance};
 if(traffic)root.traverse(o=>{if(o.isMesh)o.castShadow=false;});
 return root;
}
export function setCarPaint(car,color){car?.userData?.bodyMat?.color.set(color);}
export function setCarCosmetics(car,{color,rims,neon}={}){
 if(color)setCarPaint(car,color);
 if(rims)car?.userData?.rimMat?.color.set(rims);
 if(neon&&car?.userData?.neonMat){car.userData.neonMat.color.set(neon==='off'?'#58ffd3':neon);car.userData.neonMat.opacity=neon==='off'?0:.3;}
}
export function animateWheels(car,delta,distance,steer=0){for(const {spin,wheelPivot,front} of car?.userData?.wheels||[]){spin.rotation.x+=distance/.415;wheelPivot.rotation.y=front?steer*.42:0;}}
