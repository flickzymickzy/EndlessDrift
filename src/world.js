import * as THREE from 'three';
const SEG=96;
// Procedurally textured asphalt: small aggregate, dark patches and faint seams.
function asphaltTexture(){
 const can=document.createElement('canvas');can.width=256;can.height=256;const ctx=can.getContext('2d');
 ctx.fillStyle='#777e82';ctx.fillRect(0,0,256,256);
 let seed=85423;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(let i=0;i<17000;i++){
  const v=Math.floor(56+rand()*112);ctx.fillStyle=`rgba(${v},${v+2},${v+3},${.05+rand()*.18})`;
  const x=rand()*256,y=rand()*256,r=.5+rand()*1.3;ctx.fillRect(x,y,r,r);
 }
 for(let i=0;i<24;i++){ctx.fillStyle='rgba(12,20,30,.028)';ctx.fillRect(rand()*256,rand()*256,rand()*75,rand()*10)}
 const texture=new THREE.CanvasTexture(can);texture.colorSpace=THREE.SRGBColorSpace;
 texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(3,8);texture.anisotropy=4;return texture;
}
const roadMat=new THREE.MeshStandardMaterial({color:0x555e65,roughness:.98,metalness:.01,map:asphaltTexture()});
const shoulderMat=new THREE.MeshStandardMaterial({color:0x48525a,roughness:.95});
const lineMat=new THREE.MeshBasicMaterial({color:0xd1dee4});
const yellowMat=new THREE.MeshBasicMaterial({color:0xf1c56a});
const railMat=new THREE.MeshStandardMaterial({color:0x77818b,metalness:.54,roughness:.43});
const poleMat=new THREE.MeshStandardMaterial({color:0x435062,metalness:.7,roughness:.38});
const lampMat=new THREE.MeshBasicMaterial({color:0xe8fafe});
const lampGlow=new THREE.MeshBasicMaterial({color:0xaceeff,transparent:true,opacity:.18,depthWrite:false,side:THREE.DoubleSide});
const roadRepair=new THREE.MeshStandardMaterial({color:0x262c30,roughness:1,transparent:true,opacity:.18,depthWrite:false});
const retro=new THREE.MeshBasicMaterial({color:0xfcbe68});

const trunkMat=new THREE.MeshStandardMaterial({color:0x3e423d,roughness:1});
const leafMat=new THREE.MeshStandardMaterial({color:0x264b48,roughness:1});
const sidewalkMat=new THREE.MeshStandardMaterial({color:0x404a53,roughness:1});
const buildingMats=['#283543','#334656','#33404a','#455563','#263d48','#3a394d'].map(color=>new THREE.MeshStandardMaterial({color,roughness:.85}));
const windowMat=new THREE.MeshBasicMaterial({color:0x8cd7ea,transparent:true,opacity:.30});
function createSign(text='ENDLESS DRIFT'){
 const can=document.createElement('canvas');can.width=512;can.height=160;const c=can.getContext('2d');
 c.fillStyle='#0b2d39';c.fillRect(0,0,512,160);
 c.strokeStyle='#7de8dc';c.lineWidth=10;c.strokeRect(5,5,502,150);
 c.fillStyle='#eafffa';c.textAlign='center';c.font='bold 48px Arial';c.fillText(text,256,73);
 c.font='bold 22px Arial';c.fillStyle='#78ccb9';c.fillText('DRIVE  •  DRIFT  •  EARN',256,120);
 const t=new THREE.CanvasTexture(can);t.colorSpace=THREE.SRGBColorSpace;
 return new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide});
}
const signMat=createSign();
function put(group,geo,mat,x,y,z){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.receiveShadow=true;group.add(m);return m;}
const boxCache=new Map();
function box(w,h,d){const key=`${w}_${h}_${d}`;if(!boxCache.has(key))boxCache.set(key,new THREE.BoxGeometry(w,h,d));return boxCache.get(key);}
export function createWorld(scene){
 scene.background=new THREE.Color('#80afc9');
 // Giant sky dome follows the moving player; smoother horizon than a flat background.
 const sky=new THREE.Mesh(new THREE.SphereGeometry(850,32,16),new THREE.ShaderMaterial({
  side:THREE.BackSide,depthWrite:false,
  vertexShader:'varying vec3 vPos;void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec3 vPos;void main(){float h=clamp(normalize(vPos).y*.5+.5,0.,1.);vec3 horizon=vec3(.61,.77,.81);vec3 zenith=vec3(.12,.34,.59);gl_FragColor=vec4(mix(horizon,zenith,smoothstep(.40,1.,h)),1.);}'
 }));sky.frustumCulled=false;scene.add(sky);
 scene.fog=new THREE.FogExp2('#8bb0be',.0021);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),new THREE.MeshStandardMaterial({color:0x647e73,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.105;ground.receiveShadow=true;scene.add(ground);
 const chunks=[];let trackedIdx=Infinity;
 for(let i=0;i<11;i++){
   const g=new THREE.Group();
   // wide drivable highway in the centre, smooth joints between segments
   put(g,box(34,.12,SEG+0.4),roadMat,0,-.047,0);
   // Shallow asphalt repairs and tire-wear guides give texture near the camera.
   for(const x of [-12,-4,4,12]){
     put(g,box(.52,.004,SEG-.5),roadRepair,x-1.18,.020,0);
     put(g,box(.52,.004,SEG-.5),roadRepair,x+1.18,.020,0);
   }
   for(let k=0;k<4;k++){
     const z=-39+k*23+(i%3)*2;
     put(g,box(2.8,.004,3.3),roadRepair,[-11,-3,5,11][(i+k)%4],.021,z);
   }
   for(const sx of [-1,1]){
     put(g,box(2,.11,SEG+.45),shoulderMat,sx*17.8,-.036,0);
     put(g,box(.20,.045,SEG+.5),yellowMat,sx*15.9,.026,0);
     put(g,box(.16,.2,SEG+.4),railMat,sx*19,.10,0);
     for(const z of [-36,-12,12,36]){
       put(g,box(.17,4.2,.17),poleMat,sx*20.2,2.1,z);
       put(g,box(1.4,.10,.16),poleMat,sx*19.55,4.15,z);
       put(g,box(.65,.08,.22),lampMat,sx*18.95,4.08,z);
       const glow=put(g,new THREE.PlaneGeometry(1.7,.75),lampGlow,sx*18.96,4.03,z);glow.rotation.x=-.23;
       put(g,box(.30,.15,.15),retro,sx*19.1,.6,z);
     }
     for(const z of [-42,-18,6,30]){
       const rand=(Math.sin(z*14.37 + sx*24.6 + i*33.1)+1)/2;
       const w=6+rand*6, h=8+rand*28,d=6+(1-rand)*7;
       const x=sx*(28+rand*10);
       const b=put(g,box(w,h,d),buildingMats[(i+Math.abs(z)+ (sx>0?1:0))%buildingMats.length|0],x,h/2-.06,z+3); b.castShadow=false;
       for(const row of [3,7,11,15,19]){
         if(row>=h-2)break;
         const wx=x-sx*(w/2+.05);
         put(g,box(.09,1.2,3),windowMat,wx,row,z+3);
       }
     }
     for(const z of [-44,-25,-4,19,39]){
       const x=sx*(22.6+(i%3)*2);
       put(g,box(.19,2.0,.19),trunkMat,x,.96,z);
       const canopy=new THREE.Mesh(new THREE.IcosahedronGeometry(1.65,0),leafMat);canopy.position.set(x,3,z);g.add(canopy);
     }
   }
   // Highway gantry, reflective posts, and overhead direction signs.
   if(i%3===0){
     for(const x of [-18,18])put(g,box(.22,6,.22),poleMat,x,3,22);
     put(g,box(36,.18,.20),railMat,0,5.95,22);
     const sign=new THREE.Mesh(new THREE.PlaneGeometry(8,2.5),signMat);
     sign.position.set(0,5.9,22);g.add(sign);
   }
   for(const x of [-8,0,8]){
      for(let z=-SEG/2+7;z<SEG/2;z+=12)put(g,box(.16,.014,5.8),lineMat,x,.026,z);
   }
   for(const sx of [-1,1])put(g,box(1,.04,SEG+.2),sidewalkMat,sx*20.1,.005,0);
   scene.add(g);chunks.push(g);
 }
 function update(playerZ){const center=Math.floor(playerZ/SEG);ground.position.z=playerZ;sky.position.z=playerZ;
   if(center===trackedIdx)return;trackedIdx=center;
   chunks.forEach((g,i)=>{g.position.z=(center+i-5)*SEG;});
 }
 update(0);
 return {update,ground,chunks,roadHalf:16.3};
}
