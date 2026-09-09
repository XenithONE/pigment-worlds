import * as THREE from 'three';

let atlas = null;
let atlasRequest = null;

/** Shared, original RGBA oil painting. World disposal does not dispose this cache. */
export async function loadPaintedFloraAtlas() {
  if (!atlasRequest) {
    const base = import.meta.env?.BASE_URL ?? './';
    atlasRequest = new THREE.TextureLoader().loadAsync(`${base}art/materials/flora-atlas.webp`)
      .then(texture => {
        texture.name = 'original-painted-botanical-atlas';
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = 4;
        atlas = texture;
        return texture;
      }).catch(error => { atlasRequest = null; throw error; });
  }
  return atlasRequest;
}

function randomFromSeed(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ seed >>> 15, seed | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function crossedPlantGeometry(id) {
  const positions = [], normals = [], uvs = [], localUVs = [], indices = [];
  const u0 = (id % 2) * .5, v0 = id < 2 ? .5 : 0;
  // One texel of inset avoids a neighboring plant in coarse atlas filtering.
  const inset = 1 / 1254;
  for (let plane = 0; plane < 2; plane++) {
    const angle = plane * Math.PI / 2, c = Math.cos(angle), s = Math.sin(angle);
    for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
      positions.push((u - .5) * c, v, (u - .5) * s);
      // A gently upward normal admits soft sky light across the dense painted
      // leaves, while the scene's directional light and shadow remain active.
      normals.push(-s * .8, .6, c * .8);
      uvs.push(u0 + inset + u * (.5 - inset * 2), v0 + inset + v * (.5 - inset * 2));
      localUVs.push(u, v);
    }
    const i = plane * 4;
    indices.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('floraUV', new THREE.Float32BufferAttribute(localUVs, 2));
  geometry.setIndex(indices);
  return geometry;
}

function plantMaterial() {
  // Lambert deliberately preserves the already painted pigment detail instead
  // of replacing this map with the triplanar relief used by solid 3D scenery.
  const material = new THREE.MeshLambertMaterial({
    name: 'painted-botanical-cards',
    map: atlas,
    color: '#c9c9c9',
    emissive: '#ffffff',
    emissiveMap: atlas,
    emissiveIntensity: .09,
    side: THREE.DoubleSide,
    alphaTest: .45,
    alphaToCoverage: true,
    depthWrite: true,
    transparent: false,
  });
  material.userData.pigmentSurface = 'botanical-card';
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `
      #include <common>
      attribute vec2 floraUV;
      varying vec2 vFloraUV;
      varying vec3 vFloraRoot;
    `).replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vFloraUV = floraUV;
      vFloraRoot = (modelMatrix * instanceMatrix * vec4(0., 0., 0., 1.)).xyz;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
      #include <common>
      varying vec2 vFloraUV;
      varying vec3 vFloraRoot;
    `).replace('#include <alphamap_fragment>', `
      #include <alphamap_fragment>
      float floraDistance = length(cameraPosition.xz - vFloraRoot.xz);
      float floraFade = smoothstep(3., 7., floraDistance) * (1. - smoothstep(39., 49., floraDistance));
      // Clean quadrant boundaries and transparent leaf holes. Alpha testing
      // removes the generated low-alpha fringe without changing the artwork.
      float floraEdge = min(min(vFloraUV.x, 1. - vFloraUV.x), min(vFloraUV.y, 1. - vFloraUV.y));
      diffuseColor.a *= floraFade * smoothstep(0., .015, floraEdge);
    `);
  };
  material.customProgramCacheKey = () => 'pigment-flora-crossed-v1';
  return material;
}

/**
 * Add a bounded middle-distance layer; await loadPaintedFloraAtlas() first.
 * Returns an idempotent disposal function. It also exposes .group/.count for QA.
 * These are crossed, alpha-cutout cards; nearby plants remain closed 3D meshes.
 */
export function addPaintedFlora(scene, { id = 0, baseHeight, pathX, isPond = () => false, isSea = () => false, seed = 79331 } = {}) {
  if (!atlas) throw new Error('Call loadPaintedFloraAtlas() before addPaintedFlora().');
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
  group.name = 'painted-flora-middle-distance';
  group.userData.pigmentSurface = 'botanical-card';
  let count = 0;
  // Small patches leave irregular gaps and avoid a uniform carpet. Most grow
  // beside the road, with a quieter scattering further into the landscape.
  for (let patch = 0; patch < 205 && count < 1400; patch++) {
    const z = 21 - random() * 58;
    const side = random() < .5 ? -1 : 1;
    const x = pathX(z) + side * (3.3 + random() ** 1.4 * 24);
    const clumps = 4 + Math.floor(random() * 7);
    for (let i = 0; i < clumps && count < 1400; i++) {
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
      const key = `${Math.floor(px / 12)},${Math.floor(pz / 12)}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push({ x: px, y: y - .11, z: pz, width, height, yaw: random() * Math.PI * 2, tint: .83 + random() * .17 });
      count++;
    }
  }
  const geometry = crossedPlantGeometry(id), material = plantMaterial();
  const dummy = new THREE.Object3D(), tint = new THREE.Color();
  for (const [key, plants] of cells) {
    const mesh = new THREE.InstancedMesh(geometry, material, plants.length);
    mesh.name = `painted-flora:${key}`;
    mesh.receiveShadow = true;
    // No static cast shadows: the distance fade is camera dependent, and nearby
    // true 3D foliage already supplies the grounded shadows in this layer.
    mesh.castShadow = false;
    mesh.userData.pigmentSurface = 'botanical-card';
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
  }
  group.userData.clumps = count;
  group.userData.triangles = count * 4;
  scene.add(group);
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    group.children.forEach(mesh => mesh.dispose());
    group.clear();
    geometry.dispose();
    material.dispose();
  };
  dispose.group = group;
  dispose.count = count;
  return dispose;
}
