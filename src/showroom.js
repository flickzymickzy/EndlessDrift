import * as THREE from 'three';
import {createCar} from './car.js';

// Dedicated reusable preview renderer. One context, moved between Garage and Tuning.
// No external assets and no extra dependency needed.
export class Showroom {
  constructor(){
    this.canvas=document.createElement('canvas');
    this.canvas.className='showroom-canvas';
    this.canvas.setAttribute('aria-label','Rotating 3D preview of the selected car');
    this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,alpha:true,antialias:true,powerPreference:'default'});
    this.renderer.setPixelRatio(Math.min(1.6,window.devicePixelRatio||1));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.45;
    this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(40,1,.1,100);
    this.camera.position.set(6.5,2.95,7.6);this.camera.lookAt(0,.78,0);
    this.scene.add(new THREE.HemisphereLight(0xcce8ff,0x14202b,3.0));
    const key=new THREE.DirectionalLight(0xffffff,4);key.position.set(-7,11,9);this.scene.add(key);
    const rim=new THREE.DirectionalLight(0x59b8ff,4);rim.position.set(5,6,-7);this.scene.add(rim);
    const gold=new THREE.DirectionalLight(0xffb16c,1.3);gold.position.set(-8,2,-8);this.scene.add(gold);
    const surface=new THREE.Mesh(new THREE.CylinderGeometry(4.8,4.95,.2,72),new THREE.MeshStandardMaterial({color:0x172632,metalness:.76,roughness:.27}));
    surface.position.y=-.20;this.scene.add(surface);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(4.35,.024,8,90),new THREE.MeshBasicMaterial({color:0x60e7cb,transparent:true,opacity:.65}));
    ring.rotation.x=Math.PI/2;ring.position.y=-.086;this.scene.add(ring);this.accentRing=ring;
    const ground=new THREE.Mesh(new THREE.CircleGeometry(4.5,64),new THREE.MeshStandardMaterial({color:0x09131e,metalness:.38,roughness:.46}));ground.rotation.x=-Math.PI/2;ground.position.y=-.09;this.scene.add(ground);
    const grid=new THREE.GridHelper(9,18,0x355667,0x203c48);grid.position.y=-.076;this.scene.add(grid);
    this.previewSmoke=[];
    const smokeCanvas=document.createElement('canvas');smokeCanvas.width=128;smokeCanvas.height=128;
    const ctx=smokeCanvas.getContext('2d');const cloud=ctx.createRadialGradient(64,64,5,64,64,63);
    cloud.addColorStop(0,'rgba(255,255,255,.8)');cloud.addColorStop(.35,'rgba(255,255,255,.37)');cloud.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=cloud;ctx.fillRect(0,0,128,128);const vaporTexture=new THREE.CanvasTexture(smokeCanvas);
    for(let i=0;i<7;i++){
      const mat=new THREE.SpriteMaterial({map:vaporTexture,color:0xd6e9ff,transparent:true,opacity:.45,depthWrite:false});
      const vapor=new THREE.Sprite(mat);
      vapor.visible=false;this.scene.add(vapor);this.previewSmoke.push(vapor);
    }
    this.revUntil=0;this.car=null;this.signature='';this.rotation=.6;this.dragging=false;this.lastX=0;this.dragged=false;
    this.canvas.addEventListener('pointerdown',e=>{this.dragging=true;this.lastX=e.clientX;this.canvas.setPointerCapture(e.pointerId);});
    this.canvas.addEventListener('pointermove',e=>{if(!this.dragging)return;const dx=e.clientX-this.lastX;this.lastX=e.clientX;this.rotation+=dx*.012;this.dragged=true;});
    const done=()=>this.dragging=false;this.canvas.addEventListener('pointerup',done);this.canvas.addEventListener('pointercancel',done);
  }
  mount(elementId){const host=document.getElementById(elementId);if(host&&this.canvas.parentElement!==host)host.appendChild(this.canvas);}
  setCar(spec,custom){
    const sig=JSON.stringify([spec.id,custom.color,custom.rims,custom.neon,custom.smoke,custom.paintFinish,custom.caliperColor,custom.headlightColor,custom.showSmoke,custom.appearance]);
    if(this.signature===sig)return;
    if(this.car){this.scene.remove(this.car);this.car.traverse(o=>{if(o.isMesh&&o.geometry&&!o.geometry.userData?.shared)o.geometry.dispose();});}
    this.car=createCar(spec,custom.color,{rims:custom.rims,neon:custom.neon,appearance:custom.appearance,paintFinish:custom.paintFinish,caliperColor:custom.caliperColor,headlightColor:custom.headlightColor});
    const scale=Math.min(1.18,5.0/Math.max(spec.length||4.5,3.5));this.car.scale.setScalar(scale);
    this.scene.add(this.car);
    const back=-((spec.length||4.45)*scale)/2;
    for(const [i,vapor] of this.previewSmoke.entries()){
      vapor.visible=Boolean(custom.showSmoke);
      vapor.material.color.set(custom.smoke||'#e1e7ff');
      vapor.material.opacity=.42+(i%3)*.045;
      vapor.scale.setScalar(.95+i*.27);
      vapor.position.set(i%2===0?-.7:.7,.47+(i%3)*.23,back-.25-i*.25);
    }
    this.signature=sig;
  }
  triggerRev(durationMs=2900){this.revUntil=performance.now()+durationMs;}
  render(dt=0.016){
    if(!this.canvas.isConnected||this.canvas.clientWidth<50||this.canvas.clientHeight<50)return;
    const w=this.canvas.clientWidth,h=this.canvas.clientHeight;
    const res=Math.min(1.6,window.devicePixelRatio||1);
    this.renderer.setPixelRatio(res);
    if(this.canvas.width!==Math.round(w*res)||this.canvas.height!==Math.round(h*res)){
      this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
    }
    if(!this.dragging)this.rotation+=Math.min(.045,dt*.19);
    if(this.car){
      this.car.rotation.y=this.rotation;
      const remaining=this.revUntil-performance.now();
      const pop=remaining>0&&remaining<1000;
      for(const flame of this.car.userData.exhaustFlames||[]){
        flame.visible=pop;
        if(pop){const flicker=.7+Math.abs(Math.sin(performance.now()*.03+flame.userData.flameOffset))*.5;flame.scale.set(flicker,flicker*1.5,flicker);}
      }
    }
    for(const [i,vapor] of this.previewSmoke.entries()){
      vapor.rotation.y=-this.rotation;
      vapor.scale.setScalar(.95+i*.27+Math.sin(this.rotation*1.8+i)*.035);
    }
    this.renderer.render(this.scene,this.camera);
  }
}
