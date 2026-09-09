import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const randomSource = seed => () => {
  seed = seed + 0x6D2B79F5 | 0;
  let value = Math.imul(seed ^ seed >>> 15, seed | 1);
  value ^= value + Math.imul(value ^ value >>> 7, value | 61);
  return ((value ^ value >>> 14) >>> 0) / 4294967296;
};
const profiles = [
  [.42, .83, 1, .98, .86, .65, .39, .19, .006],
  [.39, .70, .94, 1, .94, .78, .56, .29, .006],
  [.32, .64, .89, 1, .98, .81, .60, .31, .003],
];
const stops = [0, .05, .15, .29, .45, .63, .79, .92, 1];
const leafColors = [
  ['#102b28', '#365542'], ['#112d2e', '#37585a'],
  ['#0d2424', '#2c493f'], ['#172d25', '#415941'],
];

function interpolateProfile(t, profile) {
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i]) {
      const f = (t - stops[i - 1]) / (stops[i] - stops[i - 1]);
      const eased = f * f * (3 - 2 * f);
      return THREE.MathUtils.lerp(profile[i - 1], profile[i], eased);
    }
  }
  return profile[profile.length - 1];
}

function closedRings(rows, sides, sample, palette, phase) {
  const positions = [], colors = [], uvs = [], indices = [], centers = [];
  const low = new THREE.Color(palette[0]), high = new THREE.Color(palette[1]), color = new THREE.Color(), stride = sides + 1;
  for (let row = 0; row <= rows; row++) {
    const t = row / rows, center = new THREE.Vector3();
    for (let side = 0; side <= sides; side++) {
      const u = side / sides, p = sample(t, u * TAU);
      positions.push(p.x, p.y, p.z); uvs.push(u, t);
      if (side < sides) center.add(p);
      const brush = .45 + .20 * Math.sin(u * TAU * 3 + phase + t * 4) + .13 * Math.sin(u * TAU * 7 - t * 2.4 + phase);
      color.copy(low).lerp(high, clamp(brush, 0, 1));
      color.multiplyScalar(.94 + .065 * Math.sin(t * 7 + phase + u * 4));
      colors.push(color.r, color.g, color.b);
      if (row < rows && side < sides) {
        const i = row * stride + side;
        indices.push(i, i + stride, i + 1, i + 1, i + stride, i + stride + 1);
      }
    }
    centers.push(center.multiplyScalar(1 / sides));
  }
  for (const end of [false, true]) {
    const ring = end ? rows * stride : 0, i = positions.length / 3, p = centers[end ? rows : 0];
    positions.push(p.x, p.y, p.z); uvs.push(.5, end ? 1 : 0); colors.push(low.r, low.g, low.b);
    for (let side = 0; side < sides; side++) {
      if (end) indices.push(i, ring + side + 1, ring + side);
      else indices.push(i, ring + side, ring + side + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const normal = geometry.attributes.normal, n = new THREE.Vector3(), m = new THREE.Vector3();
  for (let row = 0; row <= rows; row++) {
    const a = row * stride, b = a + sides;
    n.fromBufferAttribute(normal, a).add(m.fromBufferAttribute(normal, b)).normalize();
    normal.setXYZ(a, n.x, n.y, n.z); normal.setXYZ(b, n.x, n.y, n.z);
  }
  return geometry;
}

function bodySurface(body, variant, phase) {
  return (t, angle) => {
    const twist = angle + body.twist * t + .13 * Math.sin(t * 5 + phase);
    const profile = variant === 0 && t > .63 ? Math.max(.006, .65 * Math.sqrt(Math.max(0, 1 - ((t - .63) / .37) ** 2))) : interpolateProfile(t, profiles[variant]);
    const draggedMasses = .10 * Math.sin(t * 29 + Math.cos(twist * 3 + phase) * 1.6) * (.63 + .37 * Math.cos(twist * 2 - t * 4));
    const smallerMasses = .065 * Math.sin(twist * 7 + t * 21 + phase) + .045 * Math.cos(twist * 11 - t * 17 + phase);
    const lobes = 1 + .115 * Math.cos(twist * 5 + phase + .8 * Math.sin(t * 6)) + .055 * Math.sin(twist * 9 - t * 7.6 + phase) + (draggedMasses + smallerMasses) * Math.sin(Math.PI * t) ** .4;
    const r = body.radius * profile * lobes;
    const x = body.x + body.lean * t ** 1.7 + body.radius * .11 * Math.sin(t * 5 + phase) * t;
    const z = body.z + body.radius * .13 * Math.sin(t * 4 + phase + 1) * t;
    return new THREE.Vector3(x + Math.cos(angle) * r, body.y + body.height * t + body.height * .009 * Math.sin(angle * 3 + t * 7) * Math.sin(Math.PI * t), z + Math.sin(angle) * r * body.flatten);
  };
}

function createBodyParts(body, variant, random, detail) {
  const settings = detail === 'high' ? { rows: 72, sides: 48, strokeRows: 30, strokeSides: 12 }
    : detail === 'medium' ? { rows: 34, sides: 26, strokeRows: 15, strokeSides: 8 }
      : { rows: 16, sides: 14, strokeRows: 7, strokeSides: 6 };
  const phase = random() * TAU, surface = bodySurface(body, variant, phase), parts = [];
  parts.push(closedRings(settings.rows, settings.sides, surface, leafColors[variant % 4], phase));
  for (let stroke = 0; stroke < body.strokes; stroke++) {
    // These broad deposits follow the same skin, embedding their lower face
    // in the solid body. Their upper lips and pooled lower ends create actual
    // crevices without open sheets, floating leaves or a scale-like shell.
    const angle = stroke * 2.399963229728653 + random() * .33;
    const upper = .26 + random() * .70;
    const length = .15 + random() * .30;
    const lower = Math.max(.015, upper - length);
    const strokeWidth = body.radius * (.14 + random() * .16) * (1 - upper * .45);
    const thickness = body.radius * (.032 + random() * .034);
    const flow = (random() - .5) * .43, bent = random() * TAU;
    const warm = stroke % 19 === 4, palette = warm ? ['#253129', '#756b3e'] : leafColors[(variant + stroke % 3) % 4];
    const sample = (fraction, circle) => {
      const s = .5 - .5 * Math.cos(fraction * Math.PI), t = THREE.MathUtils.lerp(upper, lower, s);
      const envelope = Math.max(.015, Math.sin(Math.PI * s) ** .44);
      const across = Math.cos(circle), face = Math.sin(circle);
      const radius = Math.max(body.radius * .055, body.radius * interpolateProfile(t, profiles[variant]));
      const angleAt = angle + flow * s + .06 * Math.sin(s * 5 + bent);
      const variation = 1 + .10 * Math.sin(s * 8 + bent + across);
      const alpha = angleAt + across * strokeWidth * envelope * variation / radius;
      const p = surface(t, alpha);
      const dy = surface(Math.min(.9999, t + .0001), alpha).sub(surface(Math.max(.0001, t - .0001), alpha));
      const da = surface(t, alpha + .0001).sub(surface(t, alpha - .0001));
      const normal = dy.cross(da).normalize();
      const fold = Math.cos(across * 6.8 + .42 * Math.sin(s * 4 + bent)) * .22;
      const lip = .40 * Math.exp(-(((s - .13) / .15) ** 2));
      const deposited = thickness * (.30 + face + fold + lip) * envelope;
      return p.addScaledVector(normal, deposited);
    };
    parts.push(closedRings(settings.strokeRows, settings.strokeSides, sample, palette, phase + stroke * .47));
  }
  return parts;
}

/** 0: spreading shrub (~1.4 m), 1: divided shrub (~2.1 m), 2: cypress (~7 m). */
export function createPigmentCypressGeometry(variant = 2, { detail = 'high', seed = 58193 } = {}) {
  if (![0, 1, 2].includes(variant) || !['high', 'medium', 'low'].includes(detail)) throw new RangeError('Choose cypress variant 0–2 and high, medium or low detail.');
  const random = randomSource((Number.isFinite(seed) ? seed | 0 : 58193) + variant * 971);
  const bodies = variant === 0 ? [
    { x: -.28, y: -.025, z: 0, radius: .62, height: 1.42, flatten: .87, lean: -.14, twist: .8, strokes: 26 },
    { x: .45, y: -.02, z: .04, radius: .46, height: 1.08, flatten: .94, lean: .22, twist: -.7, strokes: 20 },
    { x: -.04, y: -.02, z: .40, radius: .40, height: .88, flatten: .91, lean: .07, twist: .7, strokes: 17 },
  ] : variant === 1 ? [
    { x: -.12, y: -.02, z: 0, radius: .43, height: 2.16, flatten: .85, lean: .14, twist: 1.2, strokes: 31 },
    { x: -.42, y: -.025, z: .12, radius: .29, height: 1.49, flatten: .88, lean: -.09, twist: -.6, strokes: 20 },
    { x: .28, y: -.02, z: .17, radius: .28, height: 1.19, flatten: .96, lean: .16, twist: .8, strokes: 17 },
  ] : [
    { x: 0, y: -.045, z: 0, radius: .68, height: 7.24, flatten: .88, lean: -.24, twist: 1.2, strokes: 48 },
    { x: -.34, y: -.04, z: .09, radius: .45, height: 5.42, flatten: .91, lean: -.33, twist: -.8, strokes: 28 },
    { x: .38, y: -.035, z: .08, radius: .36, height: 4.31, flatten: .93, lean: .22, twist: .7, strokes: 22 },
  ];
  const parts = bodies.flatMap(body => createBodyParts(body, variant, random, detail));
  const geometry = mergeGeometries(parts, false); parts.forEach(part => part.dispose());
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  geometry.name = `pigment-cypress-${variant}-${detail}`;
  geometry.userData.pigmentSurface = 'foliage';
  geometry.userData.pigmentCypress = true;
  return geometry;
}

/**
 * Instances are { position:[x,y,z], variant:0|1|2, scale:1, yaw:0 }.
 * Shared closed geometry is batched in 12 m cells with three detail levels.
 * update(camera, 'high'|'auto'|'low') switches geometry without removing any
 * plant or pigment fold. dispose() owns all geometry, instance buffers and its
 * one material; provided scenes, lights and external textures remain owned by
 * the caller. Apply the scene's oil material pass after adding this group.
 */
export function addPigmentCypresses(scene, { instances = [], seed = 58193 } = {}) {
  if (!scene?.add || !Array.isArray(instances)) throw new TypeError('Cypresses require a scene and an instances array.');
  const entries = instances.map(instance => {
    const { position, variant = 2, scale = 1, yaw = 0 } = instance;
    if (!Array.isArray(position) || position.length !== 3 || !position.every(Number.isFinite) || ![0, 1, 2].includes(variant) || !Number.isFinite(scale) || scale <= 0 || !Number.isFinite(yaw)) throw new TypeError('Each cypress needs a finite position, variant 0–2 and a positive scale.');
    return { position, variant, scale, yaw };
  });
  const group = new THREE.Group(); group.name = 'Sculpted cypress pigment masses';
  const variants = new Map(), cells = new Map(), meshes = [], batches = [];
  const material = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: .38, clearcoat: .48, clearcoatRoughness: .27 });
  material.name = 'cypress — deep green oil pigment'; material.userData.pigmentSurface = 'foliage';
  for (const instance of entries) {
    const [x, , z] = instance.position, cell = `${instance.variant}:${Math.floor(x / 12)}:${Math.floor(z / 12)}`;
    if (!cells.has(cell)) cells.set(cell, []); cells.get(cell).push(instance);
    if (!variants.has(instance.variant)) variants.set(instance.variant, ['high', 'medium', 'low'].map(detail => createPigmentCypressGeometry(instance.variant, { detail, seed })));
  }
  const dummy = new THREE.Object3D();
  for (const [cell, placements] of cells) {
    const levels = variants.get(placements[0].variant), mesh = new THREE.InstancedMesh(levels[0], material, placements.length);
    mesh.name = `pigment-cypress-volume:${cell}`; mesh.userData.pigmentSurface = 'foliage'; mesh.userData.pigmentCypress = true;
    mesh.castShadow = true; mesh.receiveShadow = true;
    placements.forEach((instance, index) => {
      dummy.position.fromArray(instance.position); dummy.rotation.set(0, instance.yaw, 0); dummy.scale.setScalar(instance.scale); dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); mesh.boundingSphere.radius += .12;
    const center = mesh.boundingSphere.center.clone();
    mesh.geometry = levels[1]; group.add(mesh); meshes.push(mesh); batches.push({ mesh, levels, center, level: 1 });
  }
  group.userData.instances = entries.length;
  scene.add(group);
  let disposed = false, lastX = Infinity, lastZ = Infinity, lastQuality = '';
  return { group, update(camera, quality = 'auto') {
    if (disposed || !camera?.position) return;
    const { x, z } = camera.position;
    if (quality === lastQuality && (x - lastX) ** 2 + (z - lastZ) ** 2 < .08) return;
    lastX = x; lastZ = z; lastQuality = quality;
    const mobileAuto = quality === 'auto' && typeof matchMedia === 'function' && (matchMedia('(pointer: coarse)').matches || matchMedia('(max-width: 700px)').matches);
    const low = quality === 'low' || mobileAuto, high = quality === 'high', near = low ? 5 : high ? 17 : 12, middle = low ? 15 : high ? 38 : 27;
    let triangles = 0;
    for (const batch of batches) {
      const distance = Math.hypot(x - batch.center.x, z - batch.center.z);
      let level = distance < near ? 0 : distance < middle ? 1 : 2;
      if (level < batch.level && distance > (level === 0 ? near : middle) - .8) level = batch.level;
      if (level > batch.level && distance < (batch.level === 0 ? near : middle) + .8) level = batch.level;
      if (level !== batch.level) { batch.mesh.geometry = batch.levels[level]; batch.level = level; }
      triangles += batch.mesh.geometry.index.count / 3 * batch.mesh.count;
    }
    group.userData.triangles = triangles;
  }, dispose() {
    if (disposed) return;
    disposed = true; group.removeFromParent(); group.clear(); meshes.forEach(mesh => mesh.dispose());
    for (const levels of variants.values()) levels.forEach(geometry => geometry.dispose());
    material.dispose();
  } };
}
