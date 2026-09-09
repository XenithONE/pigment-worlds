import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const v3 = values => new THREE.Vector3(...values);
const seeded = seed => () => {
  seed = seed + 0x6D2B79F5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, seed | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

// A volumetric blade wrapped around a bent centre line. Both faces share the
// same broad knife folds; a rounded thickness and end caps close the volume.
// This is used for sword leaves, erect iris standards and drooping iris falls.
function foldedBlade({ center, width, thickness, rows = 24, sides = 12, twist = 0, phase = 0, fold = .006, petal = false }) {
  const positions = [], uvs = [], indices = [], stride = sides + 1;
  for (let row = 0; row <= rows; row++) {
    const fraction = row / rows, t = petal ? .5 - .5 * Math.cos(fraction * Math.PI) : fraction, c = v3(center(t));
    const tangent = v3(center(Math.min(1, t + .001))).sub(v3(center(Math.max(0, t - .001)))).normalize();
    const across = new THREE.Vector3(1, 0, 0).addScaledVector(tangent, -tangent.x).normalize();
    const normal = across.clone().cross(tangent).normalize();
    const angle = twist * Math.sin(t * 2.2) + .06 * Math.sin(t * 5 + phase);
    const b = across.clone().multiplyScalar(Math.cos(angle)).addScaledVector(normal, Math.sin(angle));
    const n = normal.clone().multiplyScalar(Math.cos(angle)).addScaledVector(across, -Math.sin(angle));
    const envelope = Math.sin(Math.PI * t), profile = Math.max(.002, envelope ** (petal ? .42 : .50)) * (petal ? .67 + t * .52 : .90 - t * .20);
    for (let side = 0; side <= sides; side++) {
      const a = side / sides * TAU, u = Math.cos(a), face = Math.sin(a);
      const asymmetry = 1 + .11 * Math.sin(t * 5.1 + phase + u * .7) + .045 * Math.cos(t * 11 + u * 2);
      const x = u * width * profile * asymmetry;
      const dragged = Math.cos(u * Math.PI * 2.3 + .37 * Math.sin(t * 4 + phase)) * fold * envelope;
      const rolledEdge = Math.exp(-(((u - .78) / .24) ** 2)) * fold * 2.7 * envelope;
      const z = face * thickness * profile + dragged + rolledEdge;
      const point = c.clone().addScaledVector(b, x).addScaledVector(n, z);
      positions.push(point.x, point.y, point.z); uvs.push(side / sides, t);
      if (row < rows && side < sides) { const i = row * stride + side; indices.push(i, i + stride, i + 1, i + 1, i + stride, i + stride + 1); }
    }
  }
  for (const top of [false, true]) {
    const index = positions.length / 3, centerPoint = center(top ? 1 : 0); positions.push(...centerPoint); uvs.push(.5, top ? 1 : 0);
    const ring = top ? rows * stride : 0;
    for (let side = 0; side < sides; side++) {
      if (top) indices.push(index, ring + side + 1, ring + side);
      else indices.push(index, ring + side, ring + side + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  // Join the duplicated UV seam normals without losing UVs.
  const normals = geometry.attributes.normal, normal = new THREE.Vector3();
  for (let row = 0; row <= rows; row++) {
    const a = row * stride, b = a + sides;
    normal.fromBufferAttribute(normals, a).add(new THREE.Vector3().fromBufferAttribute(normals, b)).normalize();
    normals.setXYZ(a, normal.x, normal.y, normal.z); normals.setXYZ(b, normal.x, normal.y, normal.z);
  }
  return geometry;
}

function curvedStem(points, baseRadius = .007, tipRadius = .003, segments = 16, sides = 8) {
  const curve = new THREE.CatmullRomCurve3(points.map(v3));
  const geometry = new THREE.CylinderGeometry(tipRadius, baseRadius, 1, sides, segments, false);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const t = clamp(positions.getY(i) + .5, 0, 1), c = curve.getPoint(t), tangent = curve.getTangent(t).normalize();
    const xAxis = new THREE.Vector3(1, 0, 0).addScaledVector(tangent, -tangent.x).normalize();
    const zAxis = xAxis.clone().cross(tangent).normalize();
    c.addScaledVector(xAxis, positions.getX(i)).addScaledVector(zAxis, positions.getZ(i)); positions.setXYZ(i, c.x, c.y, c.z);
  }
  geometry.computeVertexNormals(); return geometry;
}

function plantBuilder() {
  const parts = [], matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion();
  return {
    add(geometry, bottomColor, topColor = bottomColor, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
      const low = new THREE.Color(bottomColor), high = new THREE.Color(topColor), color = new THREE.Color(), colors = [], uv = geometry.attributes.uv;
      for (let i = 0; i < geometry.attributes.position.count; i++) {
        const t = uv?.getY(i) ?? .5, u = uv?.getX(i) ?? .5;
        color.copy(low).lerp(high, clamp(t * .86 + .05, 0, 1));
        color.multiplyScalar(.95 + .07 * Math.sin(t * 5.3 + u * 2.1)); colors.push(color.r, color.g, color.b);
      }
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      quaternion.setFromEuler(new THREE.Euler(...rotation)); matrix.compose(v3(position), quaternion, v3(scale));
      geometry.applyMatrix4(matrix); parts.push(geometry);
    },
    finish() {
      const geometry = mergeGeometries(parts, false); parts.forEach(part => part.dispose());
      geometry.computeBoundingBox(); geometry.computeBoundingSphere(); return geometry;
    },
  };
}

function sculptingTools(detail) {
  const rows = count => detail === 0 ? count : Math.max(4, Math.round(count * (detail === 1 ? .55 : .28)));
  const sides = count => detail === 0 ? count : Math.max(4, Math.round(count * (detail === 1 ? .65 : .43)));
  return {
    blade: options => foldedBlade({ ...options, rows: rows(options.rows ?? 24), sides: sides(options.sides ?? 12) }),
    stem: (points, baseRadius, tipRadius, segments = 16, radial = 8) => curvedStem(points, baseRadius, tipRadius, rows(segments), sides(radial)),
    sphere: (radius, horizontal, vertical) => new THREE.SphereGeometry(radius, sides(horizontal), Math.max(3, rows(vertical))),
  };
}

function irisPlant(variant, garden, detail = 0) {
  const { blade, stem, sphere } = sculptingTools(detail);
  const build = plantBuilder(), random = seeded(72019 + variant * 913), leafBase = garden ? '#345f4f' : '#254957', leafTip = garden ? '#759275' : '#618982';
  const bloomBase = garden ? '#5b508c' : '#344682', bloomTip = garden ? '#a6a3d2' : '#778ac6';
  const mainHeight = [.78, .86, .70][variant % 3], lean = (variant - 1) * .025;
  build.add(stem([[0, 0, 0], [lean * .5, .3, -.015], [lean, mainHeight * .75, .01], [lean + .018, mainHeight, .014]], .009, .0048, 18), leafBase, leafTip);
  const secondary = [-.12 + variant * .02, mainHeight * .72, .07 - variant * .035];
  build.add(stem([[lean, .28, 0], [-.028, .43, .005], [secondary[0], secondary[1] - .11, secondary[2]], [secondary[0], secondary[1], secondary[2]]], .0062, .0038, 15), leafBase, leafTip);
  for (let leaf = 0; leaf < 6; leaf++) {
    const length = .41 + random() * .47, reach = .12 + random() * .19, yaw = leaf * 2.22 + variant * .39, phase = random() * TAU;
    const geometry = blade({ center: t => [.024 * Math.sin(t * 3.3 + phase) * t, length * t - .075 * t ** 7, reach * t * t + .023 * Math.sin(t * Math.PI)], width: .024 + random() * .019, thickness: .0055 + random() * .003, rows: 22, sides: 10, twist: (random() - .5) * .7, phase, fold: .004 });
    build.add(geometry, leafBase, leafTip, [(random() - .5) * .07, .003, (random() - .5) * .05], [0, yaw, (random() - .5) * .12]);
  }
  const blossoms = [[lean + .018, mainHeight, .014, 1, variant * .6], [...secondary, .77 + variant * .055, 1.05 + variant * .6]];
  for (const [bx, by, bz, scale, turn] of blossoms) {
    build.add(sphere(1, 12, 8), leafBase, leafTip, [bx, by - .025, bz], [0, 0, 0], [.018 * scale, .044 * scale, .018 * scale]);
    for (let petal = 0; petal < 3; petal++) {
      const angle = turn + petal * TAU / 3, phase = petal * 1.7 + variant;
      const standard = blade({ center: t => [.014 * Math.sin(t * 3.8 + phase) * t, .012 + .202 * t - .040 * t ** 5, .017 + .068 * Math.sin(Math.PI * t) - .024 * t * t], width: .054 + petal * .002, thickness: .008, rows: 24, sides: 12, twist: .26 * Math.sin(phase), phase, fold: .0055, petal: true });
      build.add(standard, bloomBase, bloomTip, [bx, by, bz], [.05 * Math.sin(phase), angle + Math.PI / 3, .06 * Math.cos(phase)], [scale, scale * (1 + .04 * Math.sin(phase)), scale]);
      const fall = blade({ center: t => [.015 * Math.sin(t * 4.7 + phase) * t, .024 + .069 * Math.sin(t * Math.PI * .87) - .116 * t * t - .026 * t ** 7, .022 + .173 * t], width: .060 + petal * .002, thickness: .0078, rows: 24, sides: 12, twist: .17 * Math.cos(phase), phase: phase + 1.2, fold: .0065, petal: true });
      build.add(fall, '#303e75', garden ? '#9b9ccd' : '#7b9aca', [bx, by, bz], [0, angle, 0], [scale, scale, scale]);
      const beard = blade({ center: t => { const s = .075 + t * .40; return [.012 * Math.sin(s * 4.7 + phase) * s, .037 + .069 * Math.sin(s * Math.PI * .87) - .116 * s * s - .026 * s ** 7, .022 + .173 * s]; }, width: .0105, thickness: .003, rows: 14, sides: 8, phase, fold: .0015, petal: true });
      build.add(beard, '#b49539', '#e9ce69', [bx, by, bz], [0, angle, 0], [scale, scale, scale]);
      const sepal = blade({ center: t => [0, -.061 + t * .077, .007 + Math.sin(t * Math.PI) * .02], width: .014, thickness: .004, rows: 10, sides: 8, phase, fold: .002 });
      build.add(sepal, leafBase, '#788d6a', [bx, by, bz], [.18, angle, 0], [scale, scale, scale]);
    }
  }
  return build.finish();
}

function goldenWildflowers(variant, garden, detail = 0) {
  const { blade, stem, sphere } = sculptingTools(detail);
  const build = plantBuilder(), random = seeded(52619 + variant * 317), leafBase = garden ? '#376548' : '#345663', leafTip = garden ? '#739765' : '#83967c';
  const flowers = 5 + variant % 2;
  build.add(stem([[0, 0, 0], [-.015, .15, 0], [.012, .31, .02], [.024, .46, .01]], .0055, .0026, 16, 7), leafBase, leafTip);
  for (let flower = 0; flower < flowers; flower++) {
    const angle = flower * 2.39 + variant * .4, distance = .045 + random() * .115, height = .30 + random() * .30;
    const x = Math.cos(angle) * distance, z = Math.sin(angle) * distance;
    build.add(stem([[0, .14 + flower * .021, 0], [x * .4, height * .68, z * .6], [x, height, z]], .0035, .0018, 13, 6), leafBase, leafTip);
    const tilt = -.12 + random() * .4, size = .028 + random() * .018;
    for (let petal = 0; petal < 5; petal++) {
      const phase = petal * 1.3 + flower, length = size * (.83 + .22 * Math.sin(phase));
      const petalGeometry = blade({ center: t => [.0014 * Math.sin(t * 4 + phase), .003 + .008 * Math.sin(t * Math.PI) - .008 * t ** 5, .004 + length * t], width: size * .40, thickness: .0026, rows: 12, sides: 8, twist: .12 * Math.sin(phase), phase, fold: .0015, petal: true });
      build.add(petalGeometry, '#ac822d', '#ecd06c', [x, height, z], [tilt, angle + petal * TAU / 5 + .07 *Math.sin(phase), .12 * Math.cos(phase)]);
    }
    build.add(sphere(1, 10, 6), '#78542b', '#d3a44d', [x, height + .005, z], [tilt, angle, 0], [.009, .005, .009]);
  }
  for (let leaf = 0; leaf < 9; leaf++) {
    const phase = leaf * 1.78 + variant, height = .07 + random() * .23, length = .055 + random() * .085;
    const leafGeometry = blade({ center: t => [.004 * Math.sin(t * 3), length * t * .67 - .023 * t ** 5, length * t * .58], width: .014 + random() * .007, thickness: .0035, rows: 12, sides: 8, twist: .2, phase, fold: .002 });
    build.add(leafGeometry, leafBase, leafTip, [0, height, 0], [0, phase, -.2 + random() * .4]);
  }
  return build.finish();
}

/**
 * Add a bounded near-field layer of complete 3D plants for worlds 0 and 1.
 * Call before applyOilMaterials. Geometry is shared by variant and 6 m cell;
 * each whole plant is one instance with closed surfaces, UVs and normals.
 * Call the returned .update(camera, quality) as the camera moves to select LOD.
 * The idempotent disposer also exposes .group, .count and .triangles for review.
 */
export function addBotanicalSculptures(scene, { id = 0, baseHeight, pathX, isPond = () => false, isSea = () => false, seed = 136871, density = 1 } = {}) {
  const group = new THREE.Group(); group.name = 'sculptural-botanical-garden';
  let count = 0, triangles = 0, disposed = false;
  const geometries = [], levels = [], meshes = [], materials = [], detailBatches = [];
  const dispose = () => {
    if (disposed) return; disposed = true; group.removeFromParent();
    meshes.forEach(mesh => mesh.dispose()); geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()); group.clear();
  };
  dispose.group = group; dispose.count = 0; dispose.triangles = 0; dispose.renderTriangles = 0; dispose.update = () => {};
  if (id !== 0 && id !== 1 || density <= 0) return dispose;
  if (typeof baseHeight !== 'function' || typeof pathX !== 'function') throw new TypeError('Botanical sculptures require baseHeight and pathX.');
  for (let variant = 0; variant < 5; variant++) {
    const resolutions = [];
    for (let detail = 0; detail < 3; detail++) resolutions.push(variant < 3 ? irisPlant(variant, id === 1, detail) : goldenWildflowers(variant - 3, id === 1, detail));
    levels.push(resolutions); geometries.push(...resolutions);
  }
  const material = new THREE.MeshStandardMaterial({ name: 'Botanical sculpted pigment', vertexColors: true, color: '#ffffff', roughness: .49, metalness: 0 });
  material.userData.pigmentSurface = 'foliage'; materials.push(material);
  const random = seeded(seed + id * 1979), batches = new Map();
  const memories = id === 0 ? [[-4, 4], [-8, -9], [10, -21]] : [[5, 3], [-9, -5], [8, -19]];
  const patchCount = Math.round(42 * clamp(density, 0, 3));
  let driftX = 0, driftZ = 0, driftIris = true, driftIndex = 0;
  for (let patch = 0; patch < patchCount; patch++) {
    if (patch % 3 === 0) {
      driftIndex = Math.floor(patch / 3);
      const side = driftIndex % 2 ? 1 : -1;
      driftZ = driftIndex < 6 ? [14, 10, 4, 19, -3, -10][driftIndex] + (random() - .5) * 1.2 : 22 - random() * 42;
      driftX = pathX(driftZ) + side * (2.0 + random() ** 1.5 * 4.7);
      driftIris = driftIndex % 5 < 3;
    }
    // Adjacent patches share a colour and an elongated centre. The resulting
    // drifts contain many overlapping stems without covering every bare area.
    const z = driftZ + (random() - .5) * 2.3, x = driftX + (random() - .5) * 1.15, iris = driftIris;
    const plants = 4 + Math.floor(random() * 5);
    for (let plant = 0; plant < plants; plant++) {
      const angle = random() * TAU, radius = Math.sqrt(random()) * .83, px = x + Math.cos(angle) * radius, pz = z + Math.sin(angle) * radius;
      const scale = iris ? .95 + random() * .18 : 1.02 + random() * .25;
      const heightScale = iris ? driftIndex % 13 === 0 && plant === 0 ? 1.4 : 1.10 + random() * .20 : 1.06 + random() * .24;
      if (Math.hypot(px, pz - 15) > 31 || Math.abs(px - pathX(pz)) < 1.64) continue;
      if (Math.hypot(px - 7, pz + 8) < 3.35 || memories.some(([mx, mz]) => Math.hypot(px - mx, pz - mz) < 1.45)) continue;
      if (isPond(px, pz) || isSea(px, pz) || isPond(px - .32, pz) || isPond(px + .32, pz)) continue;
      const y = baseHeight(px, pz); if (!Number.isFinite(y)) continue;
      const variant = iris ? (patch + plant) % 3 : 3 + (patch + plant) % 2, key = `${variant}:${Math.floor(px / 6)},${Math.floor(pz / 6)}`;
      if (!batches.has(key)) batches.set(key, { variant, plants: [] });
      batches.get(key).plants.push({ x: px, y: y - .008, z: pz, scale, heightScale, yaw: random() * TAU, lean: (random() - .5) * .075 }); count++;
    }
  }
  const dummy = new THREE.Object3D();
  for (const [key, { variant, plants }] of batches) {
    const mesh = new THREE.InstancedMesh(levels[variant][0], material, plants.length);
    mesh.name = `botanical-${variant < 3 ? 'iris' : 'golden'}-flowers:${key}`;
    mesh.userData.pigmentSurface = 'foliage'; mesh.userData.botanicalSculpture = true;
    mesh.castShadow = true; mesh.receiveShadow = true;
    plants.forEach((plant, index) => {
      dummy.position.set(plant.x, plant.y, plant.z); dummy.rotation.set(plant.lean, plant.yaw, -plant.lean * .6); dummy.scale.set(plant.scale, plant.heightScale, plant.scale); dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); mesh.boundingSphere.radius += .1; group.add(mesh); meshes.push(mesh);
    triangles += levels[variant][0].index.count / 3 * plants.length;
    mesh.geometry = levels[variant][1];
    detailBatches.push({ mesh, levels: levels[variant], center: mesh.boundingSphere.center.clone(), level: 1 });
  }
  group.userData.plants = count; group.userData.triangles = triangles; scene.add(group);
  let previousX = Infinity, previousZ = Infinity, previousQuality = null;
  dispose.update = (camera, quality = 'auto') => {
    if (disposed || !camera?.position) return;
    const px = camera.position.x, pz = camera.position.z;
    if (quality === previousQuality && (px - previousX) ** 2 + (pz - previousZ) ** 2 < .035) return;
    previousX = px; previousZ = pz; previousQuality = quality;
    const mobileAuto = quality === 'auto' && typeof matchMedia === 'function' && (matchMedia('(pointer: coarse)').matches || matchMedia('(max-width: 700px)').matches);
    const low = quality === 'low' || mobileAuto, high = quality === 'high';
    const near = low ? 2.8 : high ? 10 : 8, middle = low ? 8.5 : high ? 23 : 18;
    let rendered = 0;
    for (const batch of detailBatches) {
      const distance = Math.hypot(px - batch.center.x, pz - batch.center.z);
      let level = distance < near ? 0 : distance < middle ? 1 : 2;
      if (level < batch.level && distance > (level === 0 ? near : middle) - .65) level = batch.level;
      if (level > batch.level && distance < (batch.level === 0 ? near : middle) + .65) level = batch.level;
      if (level !== batch.level) { batch.mesh.geometry = batch.levels[level]; batch.level = level; }
      rendered += batch.mesh.geometry.index.count / 3 * batch.mesh.count;
    }
    dispose.renderTriangles = rendered; group.userData.renderTriangles = rendered;
  };
  dispose.count = count; dispose.triangles = triangles;
  dispose.renderTriangles = detailBatches.reduce((sum, batch) => sum + batch.mesh.geometry.index.count / 3 * batch.mesh.count, 0);
  return dispose;
}
