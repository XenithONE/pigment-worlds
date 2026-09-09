import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePouredPaintGeometry } from './poured-paint.js';

const TAU = Math.PI * 2;
const smooth = (a,b,x) => { const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
const gauss = x => Math.exp(-x*x);
// The river turns into the view beyond the colour-bearing walking shelf,
// then away again beneath the distant citadel. Smaller shoulders belong to
// each bank separately; they do not make two parallel extrusion rails.
const canyonSpine = z => -10.3-2.1*gauss((z-4)/8)-4.9*gauss((z+17)/8)
  +18.4*gauss((z+37)/19)-3.8*gauss((z+18)/5.5)-4.3*gauss((z+83)/19)+.75*Math.sin(z*.073);
export const canyonEdge = z => canyonSpine(z)+.68*Math.sin(z*.31+.65*Math.sin(z*.083))
  -.8*gauss((z-12)/3.8)+.62*gauss((z+7)/3.1);
export const canyonRiverX = z => canyonSpine(z)-8.25-.7*Math.sin(z*.105+.4);
const farEdge = z => canyonRiverX(z)-8.35+.75*Math.sin(z*.22+1.7)+1.2*gauss((z+10)/6);
export const canyonRiverLevel = z => .3+3.1*smooth(-2,2,-z)+3.3*smooth(18,22,-z)+2.0*smooth(68,74,-z);
export const canyonRiverContains = (x,z) => x>farEdge(z)+.2 && x<canyonEdge(z)-.25 && z<72;
export function canyonHeight(x,z) {
  // A gently descending lookout exposes the water below the approach. All
  // existing collection clearings remain on this continuous walkable shelf.
  const edge=canyonEdge(z), shore=smooth(edge-2.05,edge+1.0,x);
  const lookout=3.7*gauss((z-17)/11)*smooth(2.5,8.0,x-edge);
  const shelf=8.85+1.95*smooth(-20,23,z)+lookout+.16*Math.sin(z*.079)+.10*Math.sin(x*.17+z*.11)
    -1.8*smooth(-16,-24,z)*(1-smooth(-48,-66,z));
  const river=canyonRiverLevel(z)-.75;
  const farTop=13.8+3.7*gauss((z-3)/16)+3.1*gauss((z+49)/13)-2.4*gauss((z+25)/11)+1.2*Math.sin(z*.071);
  const farBank=smooth(farEdge(z)+1.35,farEdge(z)-2.15,x)*(farTop-river);
  const lipMass=(.55+.45*Math.sin(z*.35+.8*Math.sin(z*.12)))*gauss((x-edge-1.2)/2.35)*.70;
  const rightEdge=19.8+2.1*Math.sin(z*.092+.55*Math.sin(z*.043))+1.0*Math.sin(z*.253);
  const rightMass=5.0+13*gauss((z-1)/11)+11*gauss((z+34)/13)+15*gauss((z+75)/20);
  const right=smooth(rightEdge-1.1,rightEdge+4.6,x)*rightMass
    +1.35*gauss((x-rightEdge-2.2)/2.8)*(1+.52*Math.sin(z*.32+.7*Math.sin(z*.14)));
  return THREE.MathUtils.lerp(river,shelf,shore)+farBank+right+lipMass*shore;
}

/** Continuous, walkable terrain and actual impasto forms share one height field. */
export function addSculptedCanyon(scene) {
  const group=new THREE.Group();group.name='Golden pigment canyon';scene.add(group);
  const geometries=new Set(),materials=new Set();
  const palette=['#183f59','#235e73','#527b86','#b78336','#d9ac57','#e7cf97','#958068'].map(c=>new THREE.Color(c));
  const physical=(color,surface,options={})=>{
    const m=new THREE.MeshPhysicalMaterial({color,roughness:.43,clearcoat:.42,clearcoatRoughness:.29,...options});
    // Geometry already carries its own painted colour bands and stroke relief.
    // Treating those bands as another generic marble atlas erases their flow.
    m.userData.pigmentSurface=surface;m.userData.preservePaintColor=surface==='liquid';materials.add(m);return m;
  };
  const cliffMat=physical('#ffffff','canyon',{vertexColors:true});
  const flowMat=physical('#ffffff','liquid',{vertexColors:true,roughness:.30,clearcoat:.8,clearcoatRoughness:.23,envMapIntensity:.5});
  flowMat.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vFlowPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nvFlowPosition=(modelMatrix*vec4(position,1.)).xyz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vFlowPosition;').replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      float phase=vFlowPosition.x*120.+sin(vFlowPosition.z*.44)*7.;
      float resolved=1.-smoothstep(.5,3.,fwidth(phase));
      vec3 dp1=dFdx(-vViewPosition),dp2=dFdy(-vViewPosition);
      vec3 r1=cross(dp2,normal),r2=cross(normal,dp1);
      float det=dot(dp1,r1);
      float dhx=cos(phase)*.00035*resolved;
      normal=normalize(abs(det)*normal-sign(det)*(dFdx(phase)*dhx*r1+dFdy(phase)*dhx*r2));`).replace('#include <clearcoat_normal_fragment_maps>','#include <clearcoat_normal_fragment_maps>\nclearcoatNormal=normal;');
  };
  flowMat.customProgramCacheKey=()=> 'canyon-flow-bristles-v1';
  const put=(g,m,name)=>{geometries.add(g);g.computeVertexNormals();const mesh=new THREE.Mesh(g,m);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;};
  const surface=(cols,rows,sample,shade,mat,name,flip=false)=>{
    const pos=[],uv=[],colors=[],ix=[],c=new THREE.Color();
    for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){
      const u=j/cols,t=i/rows,p=sample(u,t);pos.push(...p);uv.push(u,t);shade(c,u,t,p);colors.push(c.r,c.g,c.b);
      if(i<rows&&j<cols){const a=i*(cols+1)+j,b=a+cols+1;ix.push(...(flip?[a,a+1,b,a+1,b+1,b]:[a,b,a+1,a+1,b,b+1]));}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(ix);return put(g,mat,name);
  };
  const cliffColor=(c,u,t,p)=>{
    const phase=u*10+Math.sin(p[2]*.13)*.70+Math.sin(p[2]*.65+u*8)*.38+Math.sin(p[2]*1.6+u*24)*.16;
    const n=Math.floor(phase),f=phase-n;
    c.copy(palette[[0,1,4,3,5,2,0,6,4,5,1][((n%11)+11)%11]]).lerp(palette[[1,4,3,5,2,0,6,4,5,1,3][((n%11)+11)%11]],smooth(.78,1,f));
    c.multiplyScalar(.86+.18*Math.sin(p[2]*2.1+u*91)**2+.10*Math.sin(p[2]*23+u*140)**2);
  };
  // Broad masses overlap inside one continuous surface: swelling upper folds,
  // longer lower drags and recessed seams share their surface and silhouette.
  // The top and submerged foot remain attached to the same terrain field.
  for(const bank of ['near','far']) surface(68,800,(u,t)=>{
    const near=bank==='near',z=72-t*200,edge=near?canyonEdge(z):farEdge(z);
    const sign=near?-1:1,start=edge-sign*(near?1.65:3.15),end=edge+sign*2.13;
    // Begin inside the level shelf instead of on a grid-interpolated ramp.
    // A small embedded seam remains sealed under the finer physical relief.
    const top=canyonHeight(start,z)-.065,bottom=canyonRiverLevel(z)-.92;
    const envelope=Math.sin(u*Math.PI),phase=z*(near?.36:.28)+(near?0:2.1)+.58*Math.sin(z*.093);
    const shoulder=Math.max(0,Math.sin(phase+u*1.7))**3;
    const lower=Math.max(0,Math.cos(phase*.73-u*3.2+.7))**4;
    const tucked=.24*(.5+.5*Math.sin(z*1.17+u*3.1))**8;
    const swelling=(.43+1.36*shoulder+.52*lower-tucked)*envelope**1.15;
    const dragged=.12*Math.sin(z*1.31+u*2.8)+.033*Math.sin(z*5.8+u*6);
    const x=THREE.MathUtils.lerp(start,end,u)+sign*(swelling+dragged*envelope);
    const fold=.055*Math.sin(phase+u*6.4)*envelope;
    const descent=smooth(.13,1,THREE.MathUtils.clamp(u+fold,0,1));
    const y=top*(1-descent)+bottom*descent+.42*shoulder*envelope*(1-u);
    return [x,y,z];
  },cliffColor,cliffMat,`canyon-${bank}-continuous-paint-face`,bank==='far');
  surface(96,900,(u,t)=>{
    const z=74-t*207,x=THREE.MathUtils.lerp(farEdge(z)+.18,canyonEdge(z)-.32,u);
    const pool=.09*gauss((z+25)/13)*Math.sin(u*TAU+z*.11)+.075*gauss((z+59)/11)*Math.sin(u*TAU-z*.14);
    const flow=u+.038*Math.sin(z*.16+u*6)+pool;
    const ridge=.085*Math.sin(flow*TAU*23)**4+.026*Math.sin(flow*TAU*46.3+z*.031)**6;
    return [x,canyonRiverLevel(z)+ridge+.034*Math.sin(z*.29+flow*15),z];
  },(c,u,t,p)=>{
    const z=p[2],pool=.09*gauss((z+25)/13)*Math.sin(u*TAU+z*.11)+.075*gauss((z+59)/11)*Math.sin(u*TAU-z*.14);
    const wave=(u+.038*Math.sin(z*.16+u*6)+pool)*6.3+.14*Math.sin(z*.074);
    const strip=Math.floor(wave),f=wave-strip;
    c.copy(palette[[1,0,2,1,4,5,0,1,2][((strip%9)+9)%9]]).lerp(palette[[0,2,1,4,5,0,1,2,1][((strip%9)+9)%9]],smooth(.78,1,f));
    c.multiplyScalar(.87+.17*Math.sin(u*175+Math.sin(p[2]*.2)*4)**2);
  },flowMat,'continuous-viscous-canyon-river',true).castShadow=false;

  const pours=palette.map((color,i)=>physical(color,'canyon',{roughness:i%3===0?.36:.44})),buckets=pours.map(()=>[]);
  // Wide paint sheets fuse the high terraces to the river, with uneven pooled ends.
  for(let k=0;k<26;k++){
    const z=25-k*4.9,far=k%3!==0,edge=far?farEdge(z):canyonEdge(z);
    const y=canyonHeight(edge+(far?-1.65:1.65),z),h=y-canyonRiverLevel(z)-.16;
    if(h<1.4)continue;
    const g=makePouredPaintGeometry(1.2+(k%4)*.41,h*.93,613+k*147);
    g.scale(1,1,2.7);g.rotateY(far?Math.PI/2:-Math.PI/2);g.translate(edge+(far?-1.0:.47),y+.04,z);buckets[(k*3+4)%7].push(g);
  }
  // Small connected ridges beside the walking surface give the foreground a
  // tangible wet edge. They follow the terrain instead of hovering over it.
  for(let k=0;k<78;k++){
    const z=28-k*.76,x=canyonEdge(z)+1.8;
    const pts=[];for(let j=0;j<=9;j++){const zz=z-j*.11,xx=x+.12*Math.sin(j*.4+k);pts.push(new THREE.Vector3(xx,canyonHeight(xx,zz)+.06+.025*Math.sin(j*.5),zz));}
    const g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),12,.045+.012*(k%3),7,false);buckets[k%7].push(g);
  }
  for(let i=0;i<buckets.length;i++)if(buckets[i].length){const g=mergeGeometries(buckets[i],false);buckets[i].forEach(x=>x.dispose());put(g,pours[i],'canyon-heavy-pigment-pours');}
  return {group,dispose(){group.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
