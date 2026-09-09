import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeCanyonCascade, makeCanyonBankLoad } from './canyon-paint-loads.js';

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
export const canyonRiverLevel = z => .3+3.1*smooth(-.55,.55,-z)+3.3*smooth(19.45,20.55,-z)+2.0*smooth(70.4,71.6,-z);
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
    const columnSteps=Array.isArray(cols)?cols:null,rowSteps=Array.isArray(rows)?rows:null;
    if(columnSteps)cols=columnSteps.length-1;if(rowSteps)rows=rowSteps.length-1;
    const pos=[],uv=[],colors=[],ix=[],c=new THREE.Color();
    for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){
      const u=columnSteps?columnSteps[j]:j/cols,t=rowSteps?rowSteps[i]:i/rows,p=sample(u,t);pos.push(...p);uv.push(u,t);shade(c,u,t,p);colors.push(c.r,c.g,c.b);
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
  // One structured grid keeps every shared edge connected. Its denser bands
  // retain every old sample and its actual UV; no independent refined patches
  // can open a crack after the material displaces their common boundaries.
  const refinedAxis=(count,subdivisions)=>{
    const steps=[];for(let i=0;i<count;i++){const divisions=subdivisions((i+.5)/count);for(let j=0;j<divisions;j++)steps.push((i+j/divisions)/count);}steps.push(1);return steps;
  };
  const nearColumns=refinedAxis(68,u=>u<.45?4:u<.5?2:1);
  const nearRows=refinedAxis(800,t=>{const z=72-t*200;return z>=-20&&z<=15?4:z>=-22&&z<=17?2:1;});
  for(const bank of ['near','far']) surface(bank==='near'?nearColumns:68,bank==='near'?nearRows:800,(u,t)=>{
    const near=bank==='near',z=72-t*200,edge=near?canyonEdge(z):farEdge(z);
    const sign=near?-1:1,start=edge-sign*(near?1.65:3.15),end=edge+sign*2.13;
    // Begin inside the level shelf instead of on a grid-interpolated ramp.
    // A small embedded seam remains sealed under the finer physical relief.
    const top=canyonHeight(start,z)-.065,bottom=canyonRiverLevel(z)-.92;
    const envelope=Math.sin(u*Math.PI),phase=z*(near?.36:.28)+(near?0:2.1)+.58*Math.sin(z*.093);
    const shoulder=Math.max(0,Math.sin(phase+u*1.7))**3;
    const lower=Math.max(0,Math.cos(phase*.73-u*3.2+.7))**4;
    const tucked=.24*(.5+.5*Math.sin(z*1.17+u*3.1))**8;
    const piled=.57*Math.sin(u*TAU*1.7+phase*.38)**4;
    const swelling=(.43+1.36*shoulder+.52*lower+piled-tucked)*envelope**1.15;
    const dragged=.12*Math.sin(z*1.31+u*2.8)+.033*Math.sin(z*5.8+u*6);
    const x=THREE.MathUtils.lerp(start,end,u)+sign*(swelling+dragged*envelope);
    const fold=.055*Math.sin(phase+u*6.4)*envelope;
    const baseDescent=smooth(.13,1,THREE.MathUtils.clamp(u+fold,0,1));
    const descent=baseDescent+.055*Math.sin(baseDescent*TAU*1.7+phase*.31)*envelope;
    const y=top*(1-descent)+bottom*descent+.42*shoulder*envelope*(1-u);
    return [x,y,z];
  },cliffColor,cliffMat,`canyon-${bank}-continuous-paint-face`,bank==='far');
  const riverMesh=surface(96,900,(u,t)=>{
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
  },flowMat,'continuous-viscous-canyon-river',true);
  const riverParts=[riverMesh.geometry];
  for(const [index,z] of [0,-20,-71].entries())riverParts.push(makeCanyonCascade({z,upper:canyonRiverLevel(z-2),lower:canyonRiverLevel(z+2),bounds:zz=>[farEdge(zz)+.18,canyonEdge(zz)-.32],seed:71+index*13}));
  const riverGeometry=mergeGeometries(riverParts,false);
  geometries.delete(riverMesh.geometry);riverParts.forEach(geometry=>geometry.dispose());geometries.add(riverGeometry);riverMesh.geometry=riverGeometry;
  riverMesh.castShadow=true;riverMesh.userData.cascadeCount=3;

  // Irregular, connected masses replace the repeated narrow drips. Their
  // colour is authored per load; the deposit material keeps those colours
  // while adding only the small-scale paint normal shared with other objects.
  const depositMat=physical('#ffffff','deposit',{vertexColors:true,roughness:.38,clearcoat:.6,clearcoatRoughness:.17});
  const depositColors=[['#103b50','#4b91a0'],['#3b4326','#93935a'],['#79291e','#d56432'],['#a97128','#e4bd65'],['#183844','#557969'],['#513321','#b57632']];
  const deposits=[];
  const banks=[{bank:'near',zs:[12.5,7.8,2.5,-3.7,-10.2,-15.9,-28.3,-42,-57],widths:[5.0,3.9,4.2,5.1,4.5,5.3,6.1,5.6,6.2]},
    {bank:'far',zs:[20.4,8.6,-3.5,-15,-27.2,-41.7,-58.5,-75.4,-92],widths:[6.7,7.9,5.4,6.6,8.3,5.8,7.3,6.1,8.4]}];
  for(const {bank,zs,widths} of banks)zs.forEach((z,index)=>{
    // Leave the lowered inner bend open: a crest here would cross the view
    // from the entrance through the broad middle reach of the river.
    if(bank==='near'&&index===6)return;
    const edge=bank==='near'?canyonEdge:farEdge,colors=depositColors[(index+(bank==='far'?2:0))%depositColors.length];
    const options={z,width:widths[index],bank,edge,height:canyonHeight,riverLevel:canyonRiverLevel,seed:37+index*11+(bank==='far'?103:0)};
    const topFraction=bank==='near'&&(index===2||index===3)?.82:1;
    deposits.push(makeCanyonBankLoad({...options,z:z-widths[index]*.17,width:widths[index]*.61,fraction:topFraction,colorA:colors[0],colorB:colors[1]}));
    const lowerColor=depositColors[(index+3)%depositColors.length];
    deposits.push(makeCanyonBankLoad({...options,z:z+widths[index]*.19,width:widths[index]*.53,fraction:topFraction-.20-.06*Math.sin(index*1.7)**2,seed:options.seed+5,colorA:lowerColor[0],colorB:lowerColor[1]}));
    if(index%2===0){const accent=depositColors[(index+1)%depositColors.length];deposits.push(makeCanyonBankLoad({...options,z:z+.23,width:widths[index]*.36,fraction:topFraction-.085,seed:options.seed+17,colorA:accent[0],colorB:accent[1]}));}
  });
  const depositedGeometry=mergeGeometries(deposits,false);deposits.forEach(geometry=>geometry.dispose());const deposited=put(depositedGeometry,depositMat,'canyon-piled-pigment-deposits');
  deposited.userData.pigmentSurface='deposit';deposited.userData.closedPaintLoads=deposits.length;
  group.userData.pouredCascades=3;group.userData.closedBankLoads=deposits.length;
  group.userData.nearBankGrid={columns:nearColumns.length-1,rows:nearRows.length-1};
  return {group,dispose(){group.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
