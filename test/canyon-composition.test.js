import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { addSculptedCanyon, canyonHeight, canyonRiverX, canyonRiverLevel } from '../src/render/sculpted-canyon.js';

test('the entrance lookout exposes the central river bend through actual terrain and cliff meshes',()=>{
  const scene=new THREE.Scene(),canyon=addSculptedCanyon(scene);
  // Use the same terrain extent and tessellation as the world renderer. Flora
  // and hero-tree placement are verified by the separate full-scene capture.
  const geometry=new THREE.PlaneGeometry(220,220,420,420);geometry.rotateX(-Math.PI/2);
  const positions=geometry.attributes.position;
  for(let i=0;i<positions.count;i++)positions.setY(i,canyonHeight(positions.getX(i),positions.getZ(i)));
  geometry.computeVertexNormals();
  const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),terrain=new THREE.Mesh(geometry,material);
  scene.add(terrain);scene.updateMatrixWorld(true);
  const blockers=[terrain,...canyon.group.children.filter(mesh=>mesh.name!=='continuous-viscous-canyon-river')];
  const eye=new THREE.Vector3(-3.5,canyonHeight(-3.5,15)+1.8,15),ray=new THREE.Raycaster();
  try {
    for(const [z,offset] of [[-18,0],[-25,4],[-32,-4],[-32,0],[-32,4],[-40,-4],[-40,0],[-40,4],[-48,0]]){
      const target=new THREE.Vector3(canyonRiverX(z)+offset,canyonRiverLevel(z)+.13,z),direction=target.clone().sub(eye);
      ray.far=direction.length()-.15;ray.set(eye,direction.normalize());
      const hit=ray.intersectObjects(blockers,false)[0];
      assert.equal(hit,undefined,`The river at ${target.toArray()} is hidden by ${hit?.object.name||'terrain'}.`);
    }
  } finally { canyon.dispose();geometry.dispose();material.dispose();scene.clear(); }
});

test('the sculpted cliff and river meshes have finite vertices, referenced normals and complete disposal',()=>{
  const scene=new THREE.Scene(),canyon=addSculptedCanyon(scene),resources=new Map();
  const watch=resource=>{if(resources.has(resource))return;resources.set(resource,0);resource.addEventListener('dispose',()=>resources.set(resource,resources.get(resource)+1));};
  canyon.group.traverse(mesh=>{
    if(!mesh.geometry)return;
    const geometry=mesh.geometry;watch(geometry);watch(mesh.material);
    for(const [name,attribute] of Object.entries(geometry.attributes))assert.ok(attribute.array.every(Number.isFinite),`${mesh.name}: nonfinite ${name}`);
    const normal=geometry.attributes.normal,referenced=geometry.index?new Set(geometry.index.array):new Set(Array.from({length:normal.count},(_,i)=>i));
    for(const i of referenced){assert.ok(i<normal.count);const length=Math.hypot(normal.getX(i),normal.getY(i),normal.getZ(i));assert.ok(length>.99&&length<1.01,`${mesh.name}: invalid rendered normal at ${i}`);}
  });
  canyon.dispose();
  assert.ok([...resources.values()].every(count=>count===1));
  assert.equal(scene.children.length,0);
});
