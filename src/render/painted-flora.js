import * as THREE from 'three';
import { createPigmentHerbGeometry } from './pigment-herbs.js';

function randomFromSeed(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ seed >>> 15, seed | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Bounded middle-distance layer of closed, sculpted paint plants.
 * Returns an idempotent disposal function. It also exposes .group/.count for QA.
 * All distances retain actual volume; sampling decreases with distance.
 */
export function addPaintedFlora(scene, { id = 0, baseHeight, pathX, isPond = () => false, isSea = () => false, seed = 79331 } = {}) {
  if (typeof baseHeight !== 'function' || typeof pathX !== 'function') throw new TypeError('Painted flora needs terrain height and walking-path functions.');
  id = Math.max(0, Math.min(3, id | 0));
  const random = randomFromSeed(seed + id * 16937), cells = new Map();
  const clearingPositions = [
    [[-4, 4], [-8, -9], [10, -21]],
    [[5, 3], [-9, -5], [8, -19]],
    [[-5, 4], [12, -3], [-7, -18]],
    [[-3, 3], [-8, -9], [7, -20]],
  ][id];
  const group = new THREE.Group();
  group.name = 'sculpted-flora-middle-distance';
  group.userData.pigmentSurface = 'foliage';
  let count = 0;
  // Small patches leave irregular gaps and avoid a uniform carpet. Most grow
  // beside the road, with a quieter scattering further into the landscape.
  for (let patch = 0; patch < 115 && count < 600; patch++) {
    const z = 21 - random() * 58;
    const side = random() < .5 ? -1 : 1;
    const x = pathX(z) + side * (3.3 + random() ** 1.4 * 24);
    const clumps = 2 + Math.floor(random() * 3);
    for (let i = 0; i < clumps && count < 600; i++) {
      const angle = random() * Math.PI * 2, radius = Math.sqrt(random()) * 2.1;
      const px = x + Math.cos(angle) * radius, pz = z + Math.sin(angle) * radius;
      const fromSpawn = Math.hypot(px, pz - 15), pathDistance = Math.abs(px - pathX(pz));
      const height = .62 + random() ** .7 * .88, width = height * (.82 + random() * .2);
      if (fromSpawn < 8 || fromSpawn > 45 || pathDistance < 1.95 + width * .5) continue;
      if (Math.hypot(px - 7, pz + 8) < 3.8 || clearingPositions.some(([mx, mz]) => Math.hypot(px - mx, pz - mz) < 1.6)) continue;
      if (isPond(px, pz) || isSea(px, pz) || isPond(px - width * .5, pz) || isPond(px + width * .5, pz) || isSea(px - width * .5, pz)) continue;
      if(id===2 && Math.hypot((baseHeight(px+.2,pz)-baseHeight(px-.2,pz))/.4,(baseHeight(px,pz+.2)-baseHeight(px,pz-.2))/.4)>1)continue;
      const y = baseHeight(px, pz);
      if (!Number.isFinite(y)) continue;
      const variant = patch % 3;
      const key = `${variant}:${Math.floor(px / 8)},${Math.floor(pz / 8)}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push({ variant, x: px, y: y - .11, z: pz, width, height, yaw: random() * Math.PI * 2, tint: .83 + random() * .17 });
      count++;
    }
  }
  const levels = Array.from({length:3},(_,variant)=>Array.from({length:3},(_,detail)=>createPigmentHerbGeometry(id,variant,detail)));
  const material = new THREE.MeshStandardMaterial({name:'Closed sculpted pigment herbs',vertexColors:true,color:'#ffffff',roughness:.42});
  material.userData.pigmentSurface = 'foliage';
  const batches=[];
  const dummy = new THREE.Object3D(), tint = new THREE.Color();
  for (const [key, plants] of cells) {
    const mesh = new THREE.InstancedMesh(levels[plants[0].variant][1], material, plants.length);
    mesh.name = `sculpted-flora:${key}`;
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    mesh.userData.pigmentSurface = 'foliage';
    mesh.userData.pigmentBladeUV = true;
    plants.forEach((plant, index) => {
      dummy.position.set(plant.x, plant.y, plant.z);
      dummy.rotation.set(0, plant.yaw, 0);
      dummy.scale.set(plant.width, plant.height, plant.width);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      mesh.setColorAt(index, tint.setRGB(plant.tint, plant.tint, plant.tint));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
    batches.push({mesh,levels:levels[plants[0].variant],center:mesh.boundingSphere.center.clone()});
  }
  group.userData.clumps = count;
  group.userData.triangles = batches.reduce((sum,b)=>sum+b.mesh.count*b.mesh.geometry.index.count/3,0);
  scene.add(group);
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    group.children.forEach(mesh => mesh.dispose());
    group.clear();
    levels.flat().forEach(geometry=>geometry.dispose());
    material.dispose();
  };
  dispose.group = group;
  dispose.count = count;
  dispose.update = (camera,quality='auto') => {
    if(disposed || !camera?.position)return;
    const low=quality==='low',near=low?5:quality==='high'?12:9,middle=low?14:25;
    for(const batch of batches){
      const distance=Math.hypot(camera.position.x-batch.center.x,camera.position.z-batch.center.z);
      batch.mesh.geometry=batch.levels[distance<near?0:distance<middle?1:2];
    }
  };
  return dispose;
}
