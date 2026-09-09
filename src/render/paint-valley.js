import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePouredPaintGeometry } from './poured-paint.js';

const smooth=(a,b,x)=>{const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const gaussian=x=>Math.exp(-x*x);

// A high, walkable shelf overlooks a low winding pigment river. Two broad
// promontories keep the original colour discoveries connected to the path.
export function valleyEdge(z,pathX){
 return pathX(z)-5.0-6.2*gaussian((z-4)/4.2)-14*gaussian((z+9)/4.8);
}
export function valleyRiverX(z){return -14+7*Math.sin((z+10)*.060);}
export function valleyRiverContains(x,z,pathX){
 return z>-48&&z<35&&x<valleyEdge(z,pathX)-1.05&&Math.abs(x-valleyRiverX(z))<5.3+1.1*Math.sin(z*.12);
}
export function valleyHeight(x,z,pathX){
 const ripple=.3+Math.sin(x*.085)*.36+Math.sin(z*.09)*.32;
 const terrace=7.3*(1-smooth(23,52,-z));
 const shelf=smooth(valleyEdge(z,pathX)-1.05,valleyEdge(z,pathX)+1.05,x);
 const oppositeBank=4.2*gaussian((x-valleyRiverX(z)+11)/5.5)*smooth(-49,-28,z)*(1-smooth(11,30,z));
 const outerHills=(7.8+2.8*Math.sin(z*.047)+1.2*Math.sin(z*.13))*smooth(29,68,-x);
 const rightHill=2.1*gaussian((x-20)/14)*gaussian((z+5)/19);
 const distantHill=7.8*gaussian((x+23)/24)*gaussian((z+49)/24)+13*gaussian((x-33)/22)*gaussian((z+67)/22);
 if(valleyRiverContains(x,z,pathX))return -1.35;
 const basin=1-smooth(.67,1.14,((x-6)/20)**2+((z+54)/25)**2);
 return THREE.MathUtils.lerp(ripple+terrace*shelf+oppositeBank+rightHill+distantHill+outerHills,-1.35,basin);
}

export function addPaintValley(scene,{id,pathX,baseHeight}){
 if(id!==0)return()=>{};
 const group=new THREE.Group();group.name='Deep painted river terraces';scene.add(group);
 const colors=['#234c68','#2c6979','#a67e3c','#bba674','#35597a','#1e485d','#dfc88d'];
 const mats=colors.map(color=>{const m=new THREE.MeshStandardMaterial({color,roughness:.35});m.userData.pigmentSurface='rock';return m;});
 const parts=mats.map(()=>[]),geometries=[];
 const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-Math.PI/2);
 // Continuous strata follow the exact bank curve. Neighbouring samples share
 // their boundary, including both broad promontories and the descending end.
 // Local pours sit on this connected face instead of serving as separate walls.
 for(let layer=0;layer<6;layer++) {
  const positions=[],uvs=[],indices=[],columns=240,rows=8;
  for(let u=0;u<=columns;u++)for(let v=0;v<=rows;v++) {
   const z=30-u/columns*80,t=(layer+v/rows)/6,edge=valleyEdge(z,pathX);
   const top=baseHeight(edge+1.2,z)+.045,bottom=baseHeight(edge-1.65,z)-.09;
   const lip=Math.sin(v/rows*Math.PI)*.14;
   const x=edge+1.2-2.85*t-Math.sin(t*Math.PI)*.45-lip;
   const height=top-bottom,amplitude=Math.min(.05,Math.max(0,height)*.015);
   const y=top*(1-t)+bottom*t+Math.sin(z*1.5+t*26)*amplitude*Math.sin(t*Math.PI);
   positions.push(x,y,z);uvs.push(u/columns,v/rows);
   const nextZ=z-80/columns,nextEdge=valleyEdge(nextZ,pathX);
   const nextHeight=baseHeight(nextEdge+1.2,nextZ)+.045-baseHeight(nextEdge-1.65,nextZ)+.09;
   if(u<columns&&v<rows&&height>.2&&nextHeight>.2) {const a=u*(rows+1)+v;indices.push(a,a+rows+1,a+1,a+1,a+rows+1,a+rows+2);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);
  const used=mergeVertices(geo,.00001);geo.dispose();used.computeVertexNormals();geometries.push(used);
  const mesh=new THREE.Mesh(used,mats[[4,2,0,3,1,5][layer]]);mesh.name='continuous-pigment-riverbank';mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
 }
 for(let i=0;i<54;i++){
  if(i%7!==2)continue;
  const z=27-i*1.15,edge=valleyEdge(z,pathX),height=baseHeight(edge+1.12,z)-baseHeight(edge-1.15,z);
  if(height<1.7)continue;
  const width=1.4+(.5+.5*Math.sin(i*12.37))*.8;
  const geo=makePouredPaintGeometry(width,height+.12,9401+i*293);
  const positions=geo.attributes.position;
  for(let v=0;v<positions.count;v++) {
   const px=positions.getX(v),pz=positions.getZ(v);
   const back=smooth(.12,.35,-pz);
   positions.setX(v,px*(1-back*.3)+Math.sin(pz*14+i*.7)*.055*back);
  }
  geo.computeVertexNormals();
  matrix.compose(new THREE.Vector3(edge+.35,baseHeight(edge+1.12,z)+.05,z),rotation,new THREE.Vector3(1,1,4.5));geo.applyMatrix4(matrix);
  parts[i%6].push(geo);
 }
 for(let i=0;i<parts.length;i++)if(parts[i].length){
  const geo=mergeGeometries(parts[i],false);parts[i].forEach(g=>g.dispose());geometries.push(geo);
  const mesh=new THREE.Mesh(geo,mats[i]);mesh.name='hero-poured-pigment-cliff';mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
 }
 // Fine, long strands of ivory/yellow pigment turn the river's path into a
 // continuous visual route. They are attached to the water, not to the screen.
 for(let i=0;i<9;i++){
  const curve=[];for(let j=0;j<=100;j++){
   const z=33-j*.82,x=valleyRiverX(z)+(i-4)*.58+Math.sin(z*.13+i)*.22;
   curve.push(new THREE.Vector3(x,-.48+Math.sin(z*.37+i)*.02,z));
  }
  const geo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curve),200,.025+(i%3)*.010,5,false);geometries.push(geo);
  const mesh=new THREE.Mesh(geo,mats[i%2?2:6]);mesh.name='river-pigment-current';mesh.receiveShadow=true;group.add(mesh);
 }
 return()=>{group.removeFromParent();geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());};
}
