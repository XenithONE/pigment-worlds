import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePouredPaintGeometry } from './poured-paint.js';

const TAU = Math.PI * 2;
const smooth = (a,b,x) => { const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
const gauss = x => Math.exp(-x*x);
export const canyonEdge = z => -9.2-3.3*gauss((z-4)/6)-6.5*gauss((z+18)/7)+1.4*Math.sin(z*.045);
export const canyonRiverX = z => canyonEdge(z)-8.0-1.2*Math.sin(z*.08);
export const canyonRiverLevel = z => .3+3.1*smooth(-2,2,-z)+3.3*smooth(30,34,-z)+2.0*smooth(68,74,-z);
export const canyonRiverContains = (x,z) => Math.abs(x-canyonRiverX(z))<7.65 && z<72;
export function canyonHeight(x,z) {
  const shelf=8.9+.23*Math.sin(z*.07)+.13*Math.sin(x*.17+z*.11);
  const edge=canyonEdge(z), shore=smooth(edge-1.5,edge+1.0,x);
  const river=canyonRiverLevel(z)-.75;
  const farBank=smooth(7.1,9.6,canyonRiverX(z)-x)*(13+4*Math.sin(z*.05)+2*Math.sin(z*.14));
  const rightEdge=19+1.1*Math.sin(z*.19)+.4*Math.sin(z*.63);
  const right=smooth(rightEdge-1,rightEdge+4,x)*(4+14*gauss((z-2)/13)+12*gauss((z+31)/15)+15*gauss((z+70)/23));
  return THREE.MathUtils.lerp(river,shelf,shore)+farBank+right;
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
  // A connected, irregular cross section rolls over each lip into a steep face.
  for(const bank of ['near','far']) surface(68,800,(u,t)=>{
    const z=72-t*200,edge=bank==='near'?canyonEdge(z):canyonRiverX(z)-8.2;
    const top=bank==='near'?canyonHeight(edge+1.15,z):canyonHeight(edge-2.1,z),bottom=canyonRiverLevel(z)-.9;
    const flow=Math.sin(z*.29+u*4)*.21+Math.sin(z*1.8-u*15)*.065+Math.sin(z*14+u*6)*.013;
    const outward=Math.sin(u*Math.PI)*((bank==='far'?1.25:.42)+.14*Math.sin(u*47+z*.22));
    const x=edge+(bank==='near'?1.18-u*3.0-outward:-2.18+u*3.0+outward)+flow*Math.sin(Math.PI*u);
    // Paint first spreads across the shelf, rolls over the lip, then descends.
    // A linear drop here was buried by the terrain's smooth upper shoulder.
    const descent=smooth(.10,1,u);
    const y=top*(1-descent)+bottom*descent+.09*(1-u);
    return [x,y,z];
  },cliffColor,cliffMat,`canyon-${bank}-continuous-paint-face`,bank==='far');
  surface(96,900,(u,t)=>{
    const z=74-t*207,x=canyonRiverX(z)+(u-.5)*15.6;
    const flow=u*31+Math.sin(z*.085)*.65+Math.sin(z*.38+u*4)*.11;
    const ridge=.08*Math.sin(flow*TAU)**4+.025*Math.sin(flow*TAU*2.07)**6;
    return [x,canyonRiverLevel(z)+ridge+.028*Math.sin(z*.36+u*14),z];
  },(c,u,t,p)=>{
    const wave=u*8+Math.sin(p[2]*.082)*.20+Math.sin(p[2]*.34+u*8)*.045;
    const strip=Math.floor(wave),f=wave-strip;
    c.copy(palette[[1,0,2,4,5,3,1,0,2][((strip%9)+9)%9]]).lerp(palette[[0,2,4,5,3,1,0,2,1][((strip%9)+9)%9]],smooth(.76,1,f));
    c.multiplyScalar(.87+.17*Math.sin(u*175+Math.sin(p[2]*.2)*4)**2);
  },flowMat,'continuous-viscous-canyon-river',true).castShadow=false;

  const pours=palette.map((color,i)=>physical(color,'canyon',{roughness:i%3===0?.36:.44})),buckets=pours.map(()=>[]);
  // Wide paint sheets fuse the high terraces to the river, with uneven pooled ends.
  for(let k=0;k<26;k++){
    const z=25-k*4.9,far=k%3!==0,edge=far?canyonRiverX(z)-8.2:canyonEdge(z);
    const y=canyonHeight(edge+(far?-2.1:1.15),z),h=y-canyonRiverLevel(z)-.16;
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
