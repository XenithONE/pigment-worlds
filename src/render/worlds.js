import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { addSculptedScenery } from './sculpted-scenery.js';
import { createPaintWaterMaterial } from './paint-water.js';
import { addPaintedFlora } from './painted-flora.js';
import { addPaintedVessels } from './vessel-scenery.js';

// The scenery is original, traversable geometry. Generated paintings supply the
// sky panoramas; small, instanced impasto marks make up the living foreground.
const TAU = Math.PI * 2;
const PALETTES = [
  { ground: ['#1c3556', '#274365', '#314c6c', '#49516a'], path: ['#9c8860', '#c3a66c', '#d3bb82'], leaf: ['#254f67', '#32627b', '#416c8a', '#5c7e91', '#9b9f73'], flower: ['#e9bc39', '#fbd56d', '#497ac4', '#668ecb', '#c2c9cb'], sky: '#10265a', fog: '#33466d', light: '#a1b9ff', sun: '#ffe7ab', water: '#224c76' },
  { ground: ['#567756', '#6e8b5f', '#75916a', '#91a07d'], path: ['#a49b80', '#c0b193', '#d3c9a9'], leaf: ['#577f4a', '#80a667', '#8eac61', '#b4c582', '#407455'], flower: ['#f3d9d4', '#e6a4c1', '#d2bee0', '#eef0de', '#aea8df'], sky: '#b4c8c8', fog: '#a6b9a0', light: '#ecf6e3', sun: '#fff1c7', water: '#609591' },
  { ground: ['#8a7034', '#88753b', '#aa8d46', '#aa994f'], path: ['#b59653', '#d0b169', '#d4c082'], leaf: ['#ad7e23', '#dfb44b', '#f0cb6a', '#a97c34', '#f3d596'], flower: ['#e3b947', '#f1d284', '#b86147', '#f0ebce', '#703f53'], sky: '#c5ad77', fog: '#c2ab76', light: '#fff2c9', sun: '#ffe8a4', water: '#968657' },
  { ground: ['#777b79', '#717d7d', '#93927f', '#999787'], path: ['#bcb19a', '#c3bda6', '#ded4b4'], leaf: ['#727e69', '#94997a', '#a6a785', '#888d74', '#bdbaa0'], flower: ['#ede8d4', '#c9b59c', '#9cabc2', '#cbcad1', '#ddb875'], sky: '#c4cdcc', fog: '#bfc8c6', light: '#f1f0df', sun: '#ffeac4', water: '#779ca3' },
];

function seeded(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function smoothstep(a, b, v) { const t = THREE.MathUtils.clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
function pigmentTexture(random, colors, kind = 'ground') {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = colors[0]; ctx.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 18500; i++) {
    const x = random() * 1024, y = random() * 1024, w = 2 + random() * 17, h = 1 + random() * 4;
    ctx.save(); ctx.translate(x, y); ctx.rotate(kind === 'bark' ? Math.PI / 2 + (random() - .5) * .18 : (random() - .5) * .7);
    ctx.globalAlpha = .2 + random() * .65; ctx.fillStyle = colors[Math.floor(random() * colors.length)];
    ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(-w * .55, -h); ctx.lineTo(w * .6, -h * .7); ctx.lineTo(w, h * .15); ctx.lineTo(w * .45, h); ctx.lineTo(-w * .65, h * .65); ctx.fill();
    if (i % 6 === 0) { ctx.globalAlpha = .12; ctx.fillStyle = '#fff8dc'; ctx.fillRect(-w * .55, -h, w, .65); }
    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(kind === 'bark' ? 1 : 9, kind === 'bark' ? 3 : 9); texture.anisotropy = 4;
  return texture;
}
function roundedPaintDaub(width, depth, curve) {
  const points = [], normals = [], indices = [], ts = [0, .16, .5, .84, 1], sides = 8;
  for (let row = 0; row < ts.length; row++) {
    const t = ts[row], r = Math.max(.008, Math.sin(Math.PI * t) ** .62), y = t - .5;
    for (let side = 0; side <= sides; side++) {
      const a = side / sides * TAU;
      points.push(Math.cos(a) * r * width, y, Math.sin(a) * r * depth + Math.sin(Math.PI * t) * curve);
      const normal = new THREE.Vector3(Math.cos(a) / width, (t - .5) * 2.8, Math.sin(a) / depth).normalize(); normals.push(normal.x, normal.y, normal.z);
      if (row < ts.length - 1 && side < sides) { const i = row * (sides + 1) + side; indices.push(i, i + sides + 1, i + 1, i + 1, i + sides + 1, i + sides + 2); }
    }
  }
  const lower = points.length / 3, upper = lower + 1; points.push(0, -.5, 0, 0, .5, 0); normals.push(0, -1, 0, 0, 1, 0);
  for (let side = 0; side < sides; side++) { indices.push(lower, side, side + 1); const end = (ts.length - 1) * (sides + 1); indices.push(upper, end + side + 1, end + side); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3)); g.setIndex(indices); return g;
}
function makeStrokeGeometry() { return roundedPaintDaub(.47, .14, .045); }
function makeLeafGeometry() {
  const points = [], uv = [], indices = [], rows = 14, sides = 12;
  for (let row = 0; row <= rows; row++) {
    const t = row / rows, r = Math.max(.006, Math.sin(Math.PI * t) ** .45);
    for (let s = 0; s <= sides; s++) {
      const a = s / sides * TAU, rib = 1 + .12 * Math.sin(a * 4 + .55 * Math.sin(t * 6)) * Math.sin(Math.PI * t);
      const knifeEdge = .014 * Math.cos(a * 3 - .55 * Math.sin(t * 4)) * Math.sin(Math.PI * t);
      points.push(Math.cos(a) * r * .21 * (1 + .09 * Math.cos(t * 8 + a)) * rib + .15 * Math.sin(Math.PI * t) + .14 * t * t, t - .5 - .25 * t ** 4, Math.sin(a) * r * .060 * rib + .34 * t * t + .045 * Math.sin(Math.PI * t) + knifeEdge); uv.push(s / sides, t);
      if (row < rows && s < sides) { const i = row * (sides + 1) + s; indices.push(i, i + sides + 1, i + 1, i + 1, i + sides + 1, i + sides + 2); }
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(indices); g.computeVertexNormals(); return g;
}
function makePetalGeometry() {
  const points = [], normals = [], indices = [], ts = [0, .12, .34, .63, .86, 1], sides = 8;
  const sample = (t, a) => {
    const r = Math.max(.006, Math.sin(Math.PI * THREE.MathUtils.clamp(t, 0, 1)) ** .58);
    const fullness = 1 + .11 * Math.sin(t * 6 + a) + .055 * Math.cos(a * 3);
    const knifeFold = .023 * Math.cos(a * 4 + .55 * Math.sin(t * 5)) * Math.sin(Math.PI * t);
    return new THREE.Vector3(Math.cos(a) * r * .43 * fullness + .06 * Math.sin(Math.PI * t) + .10 * t * t, t * .95 - .19 * t ** 4, .18 * Math.sin(Math.PI * t) + t * t * .40 + Math.sin(a) * r * .105 + knifeFold);
  };
  for (let row = 0; row < ts.length; row++) {
    const t = ts[row];
    for (let side = 0; side <= sides; side++) {
      const a = side / sides * TAU, position = sample(t, a);
      const along = sample(Math.min(.9999, t + .001), a).sub(sample(Math.max(.0001, t - .001), a));
      const around = sample(t, a + .001).sub(sample(t, a - .001));
      const normal = along.cross(around).normalize(); points.push(position.x, position.y, position.z); normals.push(normal.x, normal.y, normal.z);
      if (row < ts.length - 1 && side < sides) { const i = row * (sides + 1) + side; indices.push(i, i + sides + 1, i + 1, i + 1, i + sides + 1, i + sides + 2); }
    }
  }
  const lower = points.length / 3, upper = lower + 1; points.push(0, 0, 0, .10, .76, .40); normals.push(0, -1, 0, 0, 1, 0);
  for (let side = 0; side < sides; side++) { indices.push(lower, side, side + 1); const end = (ts.length - 1) * (sides + 1); indices.push(upper, end + side + 1, end + side); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3)); g.setIndex(indices); return g;
}
// Closed 24- and 8-triangle daubs retain their rounded pigment silhouette when
// their richer near-camera counterpart is only a few pixels tall on screen.
function makeCompactPaintGeometry(kind, veryLow = false) {
  const petal = kind === 'petal', width = petal ? .43 : kind === 'leaf' ? .21 : .47;
  const depth = petal ? .105 : kind === 'leaf' ? .060 : .14, curve = .045;
  const sides = veryLow ? 4 : 6, levels = veryLow ? [.5] : [.24, .74];
  const sample = (t, a) => {
    const r = Math.sin(Math.PI * t) ** (petal ? .58 : kind === 'leaf' ? .45 : .62);
    return new THREE.Vector3(Math.cos(a) * r * width + (petal ? .06 * Math.sin(Math.PI * t) + .10 * t * t : kind === 'leaf' ? .15 * Math.sin(Math.PI * t) + .14 * t * t : 0), petal ? t * .95 - .19 * t ** 4 : t - .5 - (kind === 'leaf' ? .25 * t ** 4 : 0), (petal ? .18 * Math.sin(Math.PI * t) + t * t * .40 : kind === 'leaf' ? .34 * t * t + .045 * Math.sin(Math.PI * t) : Math.sin(Math.PI * t) * curve) + Math.sin(a) * r * depth);
  };
  const bottom = sample(0, 0), top = sample(1, 0), points = [bottom.x, bottom.y, bottom.z], normals = [0, -1, 0], indices = [];
  for (const t of levels) for (let side = 0; side < sides; side++) {
    const a = side / sides * TAU, pos = sample(t, a), normal = sample(t + .001, a).sub(sample(t - .001, a)).cross(sample(t, a + .001).sub(sample(t, a - .001))).normalize();
    points.push(pos.x, pos.y, pos.z); normals.push(normal.x, normal.y, normal.z);
  }
  const end = points.length / 3; points.push(top.x, top.y, top.z); normals.push(0, 1, 0);
  for (let side = 0; side < sides; side++) {
    const next = (side + 1) % sides; indices.push(0, 1 + side, 1 + next);
    for (let row = 0; row < levels.length - 1; row++) { const a = 1 + row * sides + side, b = 1 + row * sides + next; indices.push(a, a + sides, b, b, a + sides, b + sides); }
    const last = 1 + (levels.length - 1) * sides; indices.push(end, last + next, last + side);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3)); g.setIndex(indices); return g;
}

export function createWorld(id, { skyTextures = [], portalTextures = [], reducedMotion = false, detailLevel = 'auto' } = {}) {
  id = Math.max(0, Math.min(3, id | 0));
  const random = seeded(13482 + id * 10071), p = PALETTES[id], scene = new THREE.Scene();
  const obstacles = [];
  const clearingPositions = [[[-4, 4], [-8, -9], [10, -21]], [[5, 3], [-9, -5], [8, -19]], [[-5, 4], [12, -3], [-7, -18]], [[-3, 3], [-8, -9], [7, -20]]][id];
  scene.background = new THREE.Color(p.sky); scene.fog = new THREE.FogExp2(p.fog, id === 3 ? .013 : id === 0 ? .0075 : .0085);
  const geometries = new Set(), materials = new Set(), textures = new Set(), animated = [], batches = new Map(), detailBatches = [];
  let lastDetailUpdate = -Infinity;
  const geo = value => { geometries.add(value); return value; };
  const material = value => { materials.add(value); return value; };
  const mesh = (geometry, mat, parent = scene) => { const m = new THREE.Mesh(geo(geometry), mat); m.castShadow = Boolean(mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial); m.receiveShadow = m.castShadow; parent.add(m); return m; };
  const painted = (colors, roughness = .59, kind = 'ground') => {
    const texture = pigmentTexture(random, colors, kind); textures.add(texture);
    return material(new THREE.MeshStandardMaterial({ map: texture, bumpMap: texture, bumpScale: kind === 'bark' ? .13 : .055, roughness, metalness: 0 }));
  };
  const groundMat = painted(p.ground), pathMat = painted(p.path), barkMat = painted(id === 2 ? ['#ddd1a9', '#eee4c6', '#786c51', '#f6eacd'] : ['#514f39', '#675c42', '#373e38', '#91846a'], .65, 'bark');
  const brushMat = material(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .48, side: THREE.DoubleSide, metalness: id === 2 ? .1 : 0 }));
  const goldMat = painted(['#cf9b44', '#edbd61', '#ffe5a0', '#bf8f42'], .44); goldMat.metalness = .22; goldMat.emissive.set('#9b6923'); goldMat.emissiveIntensity = .26;
  const darkGoldMat = material(new THREE.MeshStandardMaterial({ color: '#715324', roughness: .5, metalness: .68 }));
  for (const [mat, surface] of [[groundMat, 'ground'], [pathMat, 'path'], [barkMat, 'bark'], [brushMat, 'foliage'], [goldMat, 'gold'], [darkGoldMat, 'gold']]) { mat.name = `pigment-${surface}`; mat.userData.pigmentSurface = surface; }
  const strokeGeo = geo(makeStrokeGeometry()), leafGeo = geo(makeLeafGeometry()), petalGeo = geo(makePetalGeometry());
  const detailGeometry = new Map([
    [strokeGeo, [strokeGeo, geo(makeCompactPaintGeometry('stroke')), geo(makeCompactPaintGeometry('stroke', true))]],
    [leafGeo, [leafGeo, geo(makeCompactPaintGeometry('leaf')), geo(makeCompactPaintGeometry('leaf', true))]],
    [petalGeo, [petalGeo, geo(makeCompactPaintGeometry('petal')), geo(makeCompactPaintGeometry('petal', true))]],
  ]);
  const sphereGeo = geo(new THREE.SphereGeometry(1, 6, 4)), stemGeo = geo(new THREE.CylinderGeometry(.006, .01, 1, 5));
  detailGeometry.set(sphereGeo, [sphereGeo, geo(new THREE.SphereGeometry(1, 4, 3)), geo(new THREE.SphereGeometry(1, 4, 2))]);
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  const spatialBatches = new Set(['grass', 'flowers', 'fallen-pigment', 'path-marks', 'tree-pigment', 'willow-trails', 'gold-canopy', 'sea-foam', 'pond-brush-marks', 'lily-pads', 'waterlilies']);
  function groundGrowthGap(x, z) {
    const pockets = [[11, -4.9, 2.1, 2.6], [-1, 5.5, 2.4, 1.8], [-16, -8, 2.35, 2.1], [-28, 9, 2.5, 2.25], [23, 6.2, 1.8, 2.3]];
    for (const [cz, offset, width, depth] of pockets) {
      const cx = pathX(cz) + offset, nx = (x - cx) / width, nz = (z - cz) / depth, d = nx * nx + nz * nz;
      if (d < 1.2 && d < .90 + .12 * Math.sin(x * .93 + z * .35 + id) + .10 * Math.sin(z * 1.05 + id * .7)) return true;
    }
    return false;
  }
  function stamp(name, geometry, mat, x, y, z, sx, sy, sz, rx, ry, rz, col, groundGrowth = false) {
    if (groundGrowth && groundGrowthGap(x, z)) return;
    const key = spatialBatches.has(name) ? `${name}:${Math.floor(x / 12)},${Math.floor(z / 12)}` : name;
    if (!batches.has(key)) batches.set(key, { name, key, geometry, mat, items: [] });
    batches.get(key).items.push([x, y, z, sx, sy, sz, rx, ry, rz, col]);
  }
  function flush() {
    for (const { name, key, geometry, mat, items } of batches.values()) {
      const m = new THREE.InstancedMesh(geometry, mat, items.length);
      m.name = key; m.userData.pigmentBatch = name;
      m.receiveShadow = true; m.castShadow = !['star-rings', 'pond-brush-marks', 'sea-foam', 'pollen', 'village-windows'].includes(name);
      items.forEach((v, i) => { dummy.position.set(v[0], v[1], v[2]); dummy.scale.set(v[3], v[4], v[5]); dummy.rotation.set(v[6], v[7], v[8]); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); if (v[9]) m.setColorAt(i, color.set(v[9])); });
      m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); scene.add(m);
      if (detailGeometry.has(geometry)) detailBatches.push({ mesh: m, levels: detailGeometry.get(geometry), center: m.boundingSphere.center.clone(), level: 0, name });
    }
    batches.clear();
  }
  function mergeParts(parts, mat, parent = scene) {
    if (!parts.length) return;
    const mixedIndices = parts.some(g => Boolean(g.index) !== Boolean(parts[0].index));
    const normalized = mixedIndices ? parts.map(g => g.index ? g.toNonIndexed() : g) : parts;
    const merged = mergeGeometries(normalized, false); new Set([...parts, ...normalized]).forEach(g => g.dispose()); return mesh(merged, mat, parent);
  }
  function transform(g, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    dummy.position.set(x, y, z); dummy.rotation.set(rx, ry, rz); dummy.scale.set(sx, sy, sz); dummy.updateMatrix(); return g.applyMatrix4(dummy.matrix);
  }
  function tube(points, radius, segments = 12, sides = 5) { return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v => new THREE.Vector3(...v))), segments, radius, sides, false); }
  function baseHeight(x, z) {
    const hill = (cx, cz, radius, height) => height * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (radius * radius));
    const shoulder = smoothstep(2.5, 9.5, Math.abs(x - pathX(z)));
    if (id === 1) {
      const shore = smoothstep(1.1, 2.4, ((x + 12) / 14) ** 2 + ((z + 5) / 19) ** 2);
      return .25 + Math.sin(x * .085) * .28 + Math.sin(z * .1) * .22 + shore * shoulder * (hill(22, -9, 15, 3.8) + hill(-30, -32, 17, 4.4) + hill(0, -56, 29, 5));
    }
    if (id === 3) return .25 + Math.sin(x * .07 + z * .08) * .55 + .25 * Math.sin(z * .2) + smoothstep(-9, 18, x) * 1.3 + shoulder * (hill(19, 5, 13, 4.5) + hill(31, -35, 20, 7));
    const ripple = .35 + Math.sin(x * .085) * .45 + Math.sin(z * .09) * .43 + Math.sin(x * .16 + z * .12) * .2;
    if (id === 2) return ripple + shoulder * (hill(-13, -3, 15, 2.8) + hill(23, -21, 19, 4.6) + hill(-28, -53, 22, 6));
    const upland = ripple + shoulder * (hill(-9, 6, 9, 2.8) + hill(16, -4, 12, 3.5) + hill(-23, -49, 24, 7.8) + hill(33, -67, 22, 13));
    const valley = ((x - 6) / 20) ** 2 + ((z + 54) / 25) ** 2;
    const basin = 1 - smoothstep(.67, 1.14, valley);
    return THREE.MathUtils.lerp(upland, -1.35 + .10 * Math.sin(x * .17 + z * .21), basin);
  }
  function groundHeight(x, z) {
    if (id === 1 && Math.abs(z + 5) <= 1.65 && x >= -25 && x <= 3) return .43 + 2.5 * Math.sin(Math.PI * (x + 25) / 28);
    return baseHeight(x, z);
  }
  const portal = { x: 7, z: -8, next: (id + 1) % 4 };
  // smoothstep is increasing; this explicit blend keeps the traversable trail
  // visually connected to the frame in all four worlds.
  function pathX(z) { const t = THREE.MathUtils.clamp((15 - z) / 24, 0, 1); return Math.sin(t * Math.PI) * -1.4 + 7 * t; }
  function isPond(x, z) { return id === 0 ? ((x - 6) / 20) ** 2 + ((z + 54) / 25) ** 2 < .82 : id === 1 && ((x + 12) / 14) ** 2 + ((z + 5) / 19) ** 2 < 1; }
  function isSea(x, z) { return id === 3 && x < -8.5 + Math.sin(z * .095) * 2; }
  const terrain = new THREE.PlaneGeometry(220, 220, 240, 240); terrain.rotateX(-Math.PI / 2);
  const pos = terrain.attributes.position, colors = [];
  const c1 = new THREE.Color(p.ground[1]), c2 = new THREE.Color(p.ground[3]);
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); let y = baseHeight(x, z); if (id === 1 && isPond(x, z)) y = -.58; if (isSea(x, z)) y = -3.2; pos.setY(i, y); color.copy(c1).lerp(c2, .5 + .25 * Math.sin(x * .3) * Math.sin(z * .27)); colors.push(color.r, color.g, color.b); }
  terrain.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); terrain.computeVertexNormals(); const terrainMesh = mesh(terrain, groundMat); terrainMesh.receiveShadow = true;
  // A wide, gently meandering ribbon is tessellated against the actual ground.
  const pathVertices = [], pathUV = [], pathIndices = [], pathColumns = 15;
  for (let i = 0; i <= 280; i++) {
    const z = 35 - i * .29, x = pathX(z), width = 1.22 + .08 * Math.sin(i * .19) + .04 * Math.sin(i * .61);
    for (let j = 0; j < pathColumns; j++) { const side = j / (pathColumns - 1) * 2 - 1, xx = x + side * width; const ridge = .02 * Math.sin(xx * 19 + z * 3.8) + .014 * Math.sin(xx * 45 - z * 7); pathVertices.push(xx, baseHeight(xx, z) + .06 + ridge * (1 - side * side), z); pathUV.push(j / (pathColumns - 1), i / 55); if (i < 280 && j < pathColumns - 1) { const a = i * pathColumns + j; pathIndices.push(a, a + 1, a + pathColumns, a + pathColumns, a + 1, a + pathColumns + 1); } }
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pathVertices, 3)); pg.setAttribute('uv', new THREE.Float32BufferAttribute(pathUV, 2)); pg.setIndex(pathIndices); pg.computeVertexNormals(); mesh(pg, pathMat);

  if (skyTextures[id]) {
    const skyGeometry = new THREE.SphereGeometry(175, 72, 36);
    const skyUV = skyGeometry.attributes.uv;
    // The source is a sky panorama, rather than a full-sphere photograph. Its
    // painted horizon belongs at the equator, with the full sky above it.
    for (let i = 0; i < skyUV.count; i++) skyUV.setY(i, THREE.MathUtils.clamp((skyUV.getY(i) - .5) * 1.82 + .075, .005, .985));
    const panorama = skyTextures[id].clone(); panorama.wrapS = THREE.RepeatWrapping; panorama.repeat.x = 2; panorama.needsUpdate = true; textures.add(panorama);
    const sky = mesh(skyGeometry, material(new THREE.MeshBasicMaterial({ map: panorama, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false })));
    sky.position.y = 5; sky.rotation.y = -.48; sky.renderOrder = -10;
  }
  scene.add(new THREE.HemisphereLight(p.light, id === 0 ? '#40536f' : p.ground[1], id === 0 ? .65 : 1));
  const sun = new THREE.DirectionalLight(p.sun, 3.2); sun.name = 'paint-sun'; sun.position.set(-20, 34, 8); sun.castShadow = true; scene.add(sun);
  // Two broad opposing fills reveal the rounded sides of the pigment. A dark
  // underside should still read as blue paint, rather than a black paper cutout.
  const rim = new THREE.DirectionalLight('#ffe5b5', .24); rim.position.set(-18, 12, 22); scene.add(rim);
  const blueFill = new THREE.DirectionalLight('#83baff', .22); blueFill.position.set(24, 9, 12); scene.add(blueFill);

  // Individual growth comes from shared root clusters, with dense drifts along
  // the path shoulders and quieter patches farther into each landscape.
  let growthX = 0, growthZ = 0, growthRadius = 1, growthHue = 0;
  const edgeGrowthRandom = seeded(79123 + id * 103);
  for (let i = 0; i < 50000; i++) {
    if (i % 12 === 0) {
      growthZ = 32 - random() * 94;
      growthX = random() < .72 ? pathX(growthZ) + (random() < .5 ? -1 : 1) * (2.7 + random() ** 1.6 * 12) : (random() - .5) * 108;
      growthRadius = .45 + random() * 1.35; growthHue = random();
    }
    const ga = random() * TAU, gr = Math.sqrt(random()) * growthRadius, x = growthX + Math.cos(ga) * gr, z = growthZ + Math.sin(ga) * gr, distance = Math.hypot(x, z - 10);
    const pathDistance = Math.abs(x - pathX(z));
    if (distance > 68 || pathDistance < 1.42 || isPond(x, z) || isSea(x, z)) continue;
    // Plants newly admitted beside the narrower path use an independent stream.
    // Existing placement/obstacle randomness is therefore exactly preserved.
    const plantRandom = pathDistance < 1.87 ? edgeGrowthRandom : random;
    const growthPatch = .5 + .5 * Math.sin(x * .43 + Math.cos(z * .29) * 1.9) * Math.sin(z * .37 + .6);
    const y = baseHeight(x, z), height = .28 + plantRandom() * .29 + growthPatch * .31, col = p.leaf[Math.floor(plantRandom() * p.leaf.length)];
    stamp('grass', leafGeo, brushMat, x, y + height * .34, z, .42 + growthPatch * .43 + plantRandom() * .18, height, .9, -.25 + plantRandom() * .52, plantRandom() * TAU, (plantRandom() - .5) * .95, col, true);
    const flowerPatch = .5 + .5 * Math.sin(x * .39 + Math.sin(z * .22) * 1.8) * Math.sin(z * .31 + .8);
    if (i % (id === 3 ? 15 : 6) === 0 && growthHue > .16 && flowerPatch > .2) {
      const heroScale = Math.abs(x - pathX(z)) < 6 && z > -18 ? 1.25 : 1;
      const fy = y + .30 + flowerPatch * .36 + plantRandom() * .26, fc = p.flower[id === 0 ? growthHue < .55 ? Math.floor(plantRandom() * 2) : growthHue < .92 ? 2 + Math.floor(plantRandom() * 2) : 4 : Math.floor(growthHue * p.flower.length)], size = (.07 + flowerPatch * .09 + plantRandom() * .09) * heroScale;
      stamp('flower-stems', stemGeo, brushMat, x, (y + fy) * .5, z, 1, fy - y, 1, 0, 0, 0, p.leaf[3], true);
      const slots = flowerPatch > .7 ? 5 : 6, petals = 3 + Math.floor((.5 + .5 * Math.sin(x * 3.7 + z * 6.3)) * 2.99), upright = id === 0 && flowerPatch > .56;
      const bloomTurn = Math.sin(x * 2.3 + z * 4.9) * TAU;
      for (let j = 0; j < slots; j++) {
        // Consume the established placement random stream even for absent
        // petals, preserving all scenery and obstacle coordinates downstream.
        const variation = plantRandom(); if (j >= petals) continue;
        const a = bloomTurn + j * TAU / petals + (variation - .5) * .36;
        const tilt = (upright ? -.74 : -1.29) + (variation - .5) * .95;
        const length = .74 + .5 * (.5 + .5 * Math.sin(j * 2.7 + x * 5.2 + z * 1.9));
        stamp('flowers', petalGeo, brushMat, x, fy + size * .07 * Math.sin(a), z, size * (.92 + variation * .81), size * (upright ? 2.02 : 1.62) * length, size * (1.1 + variation * .55), tilt, .15 * Math.sin(bloomTurn), a, fc, true);
      }
      stamp('pollen', sphereGeo, brushMat, x, fy + .018, z, size * .25, size * .15, size * .25, 0, 0, 0, id === 0 ? '#634422' : '#e9ba58', true);
    }
    if (i % 6 === 0) {
      stamp('fallen-pigment', strokeGeo, brushMat, x, y + .043, z, .18 + plantRandom() * .3, .24 + plantRandom() * .42, .19 + plantRandom() * .12, -Math.PI / 2, 0, plantRandom() * TAU, i % 30 === 0 ? p.flower[Math.floor(plantRandom() * p.flower.length)] : p.ground[Math.floor(plantRandom() * p.ground.length)], true);
    }
  }

  const trunkParts = [], branchParts = [];
  function organicTrunk(x, z, height, radius, bend = .5, matParts = trunkParts) {
    const y = baseHeight(x, z), points = [];
    const collisionRadius = Math.max(.34, radius * 1.05);
    if (radius > .30 && Math.hypot(x, z - 5) < 62 && Math.abs(x - pathX(z)) > collisionRadius + 1.7 && !clearingPositions.some(([mx, mz]) => Math.hypot(x - mx, z - mz) < collisionRadius + 3)) obstacles.push({ x, z, radius: collisionRadius });
    for (let i = 0; i <= 34; i++) { const t = i / 34; points.push(new THREE.Vector2(radius * (1 - t * .88) * (1 + .05 * Math.sin(t * 18)), height * t)); }
    const g = new THREE.LatheGeometry(points, 32); const a = g.attributes.position;
    for (let i = 0; i < a.count; i++) { const t = a.getY(i) / height, angle = Math.atan2(a.getZ(i), a.getX(i)), grain = 1 + .075 * Math.sin(angle * 9 + t * 2) + .027 * Math.sin(angle * 23 - t * 9); a.setX(i, a.getX(i) * grain + Math.sin(t * 2.2) * bend); a.setZ(i, a.getZ(i) * grain + t * t * bend * .35); }
    for (let root = 0; root < 5; root++) { const ang = root * TAU / 5 + random() * .4, length = radius * (2.4 + random() * 2.2), ex = x + Math.cos(ang) * length, ez = z + Math.sin(ang) * length; matParts.push(tube([[x, y + .55, z], [x + Math.cos(ang) * length * .45, y + .18, z + Math.sin(ang) * length * .45], [ex, baseHeight(ex, ez) + .03, ez]], radius * .18, 12, 8)); }
    g.computeVertexNormals(); matParts.push(transform(g, x, y, z)); return { x, y, z, height, bend };
  }
  function cypress(x, z, h, r = 1.4) {
    const tree = organicTrunk(x, z, h * .8, r * .22, .35);
    // A sculpted, asymmetrical heart underneath overlapping brush-shaped leaves.
    const outline = []; for (let j = 0; j <= 20; j++) { const t = j / 20; outline.push(new THREE.Vector2(Math.max(.01, r * Math.sin(Math.PI * t) ** .6 * (1 - .45 * t) * (1 + .09 * Math.sin(t * 35))), h * t)); }
    const coreMat = material(new THREE.MeshStandardMaterial({ color: p.leaf[0], roughness: 1 })); const core = mesh(new THREE.LatheGeometry(outline, 12), coreMat); core.position.set(x, tree.y, z);
    for (let j = 0; j < 2800; j++) {
      const t = random(), angle = random() * TAU, radius = r * Math.sin(Math.PI * t) ** .6 * (1 - .45 * t) * (.7 + random() * .43);
      const xx = x + Math.cos(angle) * radius + .18 * Math.sin(t * 8), zz = z + Math.sin(angle) * radius;
      stamp('tree-pigment', leafGeo, brushMat, xx, tree.y + t * h, zz, .12 + random() * .22, .29 + random() * .42, .7, (random() - .5) * .55, -angle + Math.PI / 2, (random() - .5) * .4, p.leaf[Math.floor(random() * p.leaf.length)]);
    }
  }
  function broadTree(x, z, h, radius, willow = false) {
    const tree = organicTrunk(x, z, h * .7, .33 + h * .018, (random() - .5) * 1.4);
    for (let j = 0; j < 7; j++) {
      const a = j * TAU / 7 + random() * .4, ex = x + Math.cos(a) * radius * .7, ez = z + Math.sin(a) * radius * .7, ey = tree.y + h * (.7 + random() * .2);
      branchParts.push(tube([[x, tree.y + h * .35, z], [x + Math.cos(a), tree.y + h * .58, z + Math.sin(a)], [ex, ey, ez]], .12, 8));
    }
    const count = willow ? 0 : 2700;
    for (let j = 0; j < count; j++) {
      const angle = random() * TAU, rr = Math.sqrt(random()), xx = x + Math.cos(angle) * radius * rr, zz = z + Math.sin(angle) * radius * rr;
      const crown = tree.y + h * .77 + Math.sqrt(1 - rr * rr) * radius * .52;
      const yy = willow ? crown - random() ** .7 * h * .55 * rr : crown + (random() - .5) * radius * .6;
      stamp('tree-pigment', leafGeo, brushMat, xx, yy, zz, willow ? .18 : .38, willow ? .68 : .36, .7, (random() - .5) * 1.4, random() * TAU, (random() - .5) * (willow ? .3 : TAU), p.leaf[Math.floor(random() * p.leaf.length)]);
    }
    if (willow) {
      // A willow is a collection of heavy, hanging foliage masses. Irregular
      // gaps separate the plaits; each plait contains overlapping paint daubs.
      for (let patch = 0; patch < 32; patch++) {
        const a = random() * TAU, rr = radius * Math.sqrt(random()) * .9;
        const cx = x + Math.cos(a) * rr, cz = z + Math.sin(a) * rr, cy = tree.y + h * .77 + Math.sqrt(1 - (rr / radius) ** 2) * radius * .47;
        const tint = p.leaf[patch % p.leaf.length];
        for (let k = 0; k < 23; k++) {
          const aa = random() * TAU, spread = random() ** .6 * .75;
          stamp('tree-pigment', leafGeo, brushMat, cx + Math.cos(aa) * spread, cy + (random() - .5) * .75, cz + Math.sin(aa) * spread, .8 + random() * .8, .45 + random() * .6, 1.6, -.3 + random() * .6, aa, (random() - .5) * 2.2, tint);
        }
      }
      for (let strand = 0; strand < 66; strand++) {
        const a = random() * TAU, rr = radius * (.38 + random() * .6), xx = x + Math.cos(a) * rr, zz = z + Math.sin(a) * rr;
        const top = tree.y + h * .77 + Math.sqrt(Math.max(0, 1 - (rr / radius) ** 2)) * radius * .48, len = h * (.17 + random() * .34) * (.5 + rr / radius * .5), phase = random() * TAU;
        const at = t => [xx + Math.cos(a) * Math.sin(t * 2.2) * .65 + Math.sin(t * 5 + phase) * .12, top - len * t, zz + Math.sin(a) * Math.sin(t * 2.2) * .65];
        if (strand % 2 === 0) branchParts.push(tube([at(0), at(.25), at(.6), at(1)], .017, 12, 5));
        const knots = 5 + Math.floor(random() * 5), tint = p.leaf[strand % 5];
        for (let k = 0; k < knots; k++) {
          const t = (k + .35) / knots, point = at(t), fullness = .65 + .52 * t, leaves = 3 + Math.floor(random() * 3);
          for (let leaf = 0; leaf < leaves; leaf++) {
            const aa = leaf * TAU / leaves + phase, spread = .12 + random() * .13;
            stamp('willow-trails', leafGeo, brushMat, point[0] + Math.cos(aa) * spread, point[1] + (random() - .5) * .23, point[2] + Math.sin(aa) * spread, fullness * (.65 + random() * .65), .45 + random() * .45, 1.3 + random() * .5, -.25 + random() * .5, aa, Math.PI + .20 * Math.sin(t * 4 + phase), leaf === 0 ? p.leaf[0] : tint);
          }
        }
      }
    }
  }

  const rockGeo = geo(new THREE.SphereGeometry(1, 18, 12));
  const rv = rockGeo.attributes.position;
  for (let i = 0; i < rv.count; i++) { const x = rv.getX(i), y = rv.getY(i), z = rv.getZ(i), f = 1 + .12 * Math.sin(x * 7 + z * 3) * Math.sin(y * 8); rv.setXYZ(i, x * f, y * f, z * f); }
  rockGeo.computeVertexNormals();
  const rockMat = painted(id === 0 ? ['#536077', '#7d817b', '#383e51', '#a39b79'] : id === 3 ? ['#727f85', '#a3a598', '#5d6d75', '#c5bd9f'] : ['#929783', '#b3b69c', '#747b68', '#cec7a9']);
  rockMat.name = 'pigment-rock'; rockMat.userData.pigmentSurface = 'rock';
  addSculptedScenery({ id, scene, random, baseHeight, pathX, isPond, isSea, mesh, painted, material, mergeParts, transform, tube, goldMat, stamp, leafGeo, petalGeo, brushMat, stemGeo, p, obstacles, clearingPositions, skyTextures, textures });
  for (let i = 0; i < (id === 3 ? 35 : 45); i++) {
    const z = (random() - .5) * 120 - 8, x = id === 3 ? -9 + Math.sin(z * .095) * 2 + (random() - .5) * 4 : (random() < .5 ? -1 : 1) * (4 + random() * 35);
    if (Math.abs(x - pathX(z)) < 3 || isPond(x, z)) continue;
    const size = id === 3 ? .27 + random() * .8 : .22 + random() * 1.1;
    stamp('rocks', rockGeo, rockMat, x, baseHeight(x, z) + size * .13 - (id === 3 ? .5 : 0), z, size * 1.45, size, size * 1.1, random() * .6, random() * TAU, random() * .4, '#ffffff');
  }

  function water(x, z, width, depth, height) {
    const liquid = createPaintWaterMaterial(p.water, id), mat = material(liquid.material);
    const surface = mesh(new THREE.PlaneGeometry(width, depth, Math.ceil(width * 2), Math.ceil(depth * 2)), mat); surface.rotation.x = -Math.PI / 2; surface.position.set(x, height, z); surface.castShadow = false; surface.receiveShadow = true;
    liquid.attachReflection(surface, scene); surface.userData.paintLiquid = liquid;
    animated.push(time => { liquid.update(reducedMotion ? 0 : time); }); return surface;
  }

  if (id === 0) {
    [[-11, 4, 19, 2.2], [-17, -4, 23, 2.1], [-23, -12, 16, 1.5], [18, -22, 14, 1.6], [-29, -26, 18, 1.5], [29, 0, 17, 1.7], [36, -30, 13, 1.4], [-35, 14, 20, 1.8]].forEach(v => cypress(...v));
    const wallMat = painted(['#56606a', '#78817f', '#aaa28a', '#c6b797']), roofMat = painted(['#283f59', '#496178', '#6d7a8a', '#8e938c']);
    wallMat.name = 'village-painted-stone'; wallMat.userData.pigmentSurface = 'architecture'; roofMat.name = 'village-painted-roofs'; roofMat.userData.pigmentSurface = 'architecture';
    const windowMat = material(new THREE.MeshBasicMaterial({ color: '#ffd67f', toneMapped: false }));
    const walls = [], roofs = [];
    for (let i = 0; i < 72; i++) {
      const centers = [[-25, -49], [-15, -59], [-5, -65]], center = centers[i % 3];
      const x = center[0] + (random() - .5) * 18, z = center[1] + (random() - .5) * 14, y = baseHeight(x, z), w = .75 + random() * 1.1, d = .95 + random() * 1.1, h = .95 + random() * 1.15;
      if (((x - 6) / 20) ** 2 + ((z + 54) / 25) ** 2 < 1.08) continue;
      walls.push(transform(new RoundedBoxGeometry(w, h, d, 3, .12), x, y + h / 2, z));
      const shape = new THREE.Shape(); shape.moveTo(-w * .59, 0); shape.lineTo(0, h * .5); shape.lineTo(w * .59, 0); shape.closePath();
      const roof = new THREE.ExtrudeGeometry(shape, { depth: d + .38, bevelEnabled: true, bevelSize: .08, bevelThickness: .08, bevelSegments: 3 }); roofs.push(transform(roof, x, y + h, z - d * .5 - .19));
      walls.push(transform(new RoundedBoxGeometry(.19, .65, .23, 2, .035), x + w * .25, y + h + .35, z - .15));
      for (let f = 0; f < 2; f++) for (let j = 0; j < 2; j++) if (random() > .2) stamp('village-windows', geo(new THREE.PlaneGeometry(.18, .32)), windowMat, x + (j - .5) * w * .46, y + h * (.28 + f * .42), z + d / 2 + .012, 1, 1, 1, 0, 0, 0, '#ffffff');
    }
    mergeParts(walls, wallMat); mergeParts(roofs, roofMat);
    const churchY = baseHeight(-20, -58); mesh(new RoundedBoxGeometry(1.35, 4.5, 1.45, 3, .09), wallMat).position.set(-20, churchY + 2.25, -58);
    mesh(new THREE.ConeGeometry(1.05, 3.2, 8), roofMat).position.set(-20, churchY + 6.1, -58);
    water(6, -54, 40, 50, -.62);
    // Volumetric-looking star filaments behind the trees, made of fine paint dashes.
    const starMat = material(new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, side: THREE.DoubleSide }));
  } else if (id === 1) {
    water(-12, -5, 28.1, 38.2, -.17);
    [[-24, 9, 15, 7], [-25, -16, 18, 7.8], [-5, -28, 14, 6], [21, -13, 13, 5.5], [18, 10, 12, 5], [-35, -34, 15, 6], [32, -30, 17, 6]].forEach(v => broadTree(...v, true));
    const bridgeMat = painted(['#6f9e94', '#abc0a6', '#d1d8b5', '#568a85'], .86, 'bark'), bridgeParts = [];
    for (let i = 0; i < 76; i++) { const x = -25 + (i + .5) * 28 / 76, yy = .43 + 2.5 * Math.sin(Math.PI * (x + 25) / 28); bridgeParts.push(transform(new THREE.BoxGeometry(28 / 76 - .024, .17, 3.3), x, yy - .085, -5, 0, 0, Math.cos(Math.PI * (x + 25) / 28) * .26)); }
    for (const side of [-1, 1]) {
      const z = -5 + side * 1.62;
      for (let j = 0; j <= 16; j++) { const x = -25 + j * 28 / 16, yy = .43 + 2.5 * Math.sin(Math.PI * j / 16); bridgeParts.push(transform(new THREE.CylinderGeometry(.058, .074, 1.18, 7), x, yy + .55, z)); }
      for (const level of [.52, 1.12]) { const pts = []; for (let j = 0; j <= 24; j++) pts.push([-25 + j * 28 / 24, .43 + 2.5 * Math.sin(Math.PI * j / 24) + level, z]); bridgeParts.push(tube(pts, .073, 60, 7)); }
    }
    mergeParts(bridgeParts, bridgeMat);
    const lilyGeo = geo(new THREE.CircleGeometry(1, 20, .17, TAU - .34)); lilyGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 620; i++) {
      const x = -12 + (random() - .5) * 27, z = -5 + (random() - .5) * 37;
      if (!isPond(x, z) || Math.abs(z + 5) < 2.1) continue;
      const r = .15 + random() * .45;
      stamp('lily-pads', lilyGeo, brushMat, x, -.13 + random() * .035, z, r, 1, r * .86, 0, random() * TAU, 0, ['#819b65', '#6c987b', '#789b76', '#a6b180'][i % 4]);
      if (i % 4 === 0) for (let j = 0; j < 8; j++) { const a = j * TAU / 8; stamp('waterlilies', leafGeo, brushMat, x + Math.cos(a) * .09, -.035, z + Math.sin(a) * .09, .35, .35, .35, -Math.PI / 3, a, 0, ['#f5dce3', '#e9b3ce', '#fff0df'][i % 3]); }
    }
    for (let i = 0; i < 1900; i++) { const x = -12 + (random() - .5) * 27, z = -5 + (random() - .5) * 38; if (!isPond(x, z)) continue; stamp('pond-brush-marks', strokeGeo, brushMat, x, -.105, z, .1 + random() * .2, .25 + random() * .85, .05, -Math.PI / 2, 0, Math.PI / 2 + (random() - .5) * .2, ['#9faec0', '#c9c6b8', '#81a7a1', '#bdc5a3'][i % 4]); }
  } else if (id === 2) {
    const birchParts = [], blackMat = material(new THREE.MeshStandardMaterial({ color: '#67583e', roughness: 1 }));
    const birches = [];
    for (let i = 0; i < 42; i++) {
      const x = (random() - .5) * 103, z = 17 - random() * 80;
      if (Math.abs(x - pathX(z)) < 6 || Math.hypot(x - 7, z + 8) < 6) continue;
      const h = 13 + random() * 10, radius = .22 + random() * .25, t = organicTrunk(x, z, h, radius, (random() - .5) * .9, birchParts); birches.push(t);
      for (let j = 0; j < 15; j++) { const yy = t.y + .3 + random() * h, a = random() * TAU; stamp('birch-bark', strokeGeo, blackMat, x + Math.cos(a) * radius * .95, yy, z + Math.sin(a) * radius * .95, radius * 1.8, .08 + random() * .09, .05, 0, -a + Math.PI / 2, (random() - .5) * .2, '#ffffff'); }
      for (let j = 0; j < 440; j++) {
        const a = random() * TAU, rr = Math.sqrt(random()) * (3 + random()), yy = t.y + h * .63 + random() * h * .4;
        stamp('gold-canopy', leafGeo, brushMat, x + Math.cos(a) * rr, yy, z + Math.sin(a) * rr, .9 + random() * .8, .7 + random() * 1.0, 1.2, random() * TAU, random() * TAU, random() * TAU, p.leaf[j % p.leaf.length]);
      }
    }
    mergeParts(birchParts, barkMat);
    // The signature mosaic grove has jewel-toned circles embedded in gold leaves.
    const circleGeo = geo(new THREE.RingGeometry(.075, .13, 12));
    for (let i = 0; i < 650; i++) {
      const x = (random() < .5 ? -1 : 1) * (8 + random() * 30), z = 8 - random() * 50, y = baseHeight(x, z) + .4 + random() * .8;
      stamp('mosaic-gold', circleGeo, goldMat, x, y, z, 1.2, 1.2, 1.2, (random() - .5) * .5, random() * TAU, random() * TAU, '#ffffff');
    }
    [[-15, -9, 11, 4.8], [17, -25, 13, 5.3], [-28, 9, 12, 5], [30, -9, 14, 5.5]].forEach(v => broadTree(...v));
  } else {
    water(-80, -24, 152, 190, -1.9);
    [[27, 5, 9, 4], [32, -20, 10, 4.5], [21, -39, 12, 4.5], [40, -45, 14, 5]].forEach(v => broadTree(...v));
    const lighthouseMat = painted(['#c4c2ab', '#eee4c8', '#aeafa1', '#f0e7d3'], .85, 'bark');
    lighthouseMat.name = 'painted-lighthouse'; lighthouseMat.userData.pigmentSurface = 'architecture';
    const lighthouseParts = [], darkMat = material(new THREE.MeshStandardMaterial({ color: '#555d59', metalness: .5, roughness: .5 }));
    const lx = 25, lz = -31, ly = baseHeight(lx, lz);
    lighthouseParts.push(transform(new THREE.CylinderGeometry(1.5, 2.15, 16, 32), lx, ly + 8, lz));
    lighthouseParts.push(transform(new THREE.CylinderGeometry(1.91, 1.9, .37, 32), lx, ly + 16, lz));
    mergeParts(lighthouseParts, lighthouseMat);
    const lanternMat = material(new THREE.MeshBasicMaterial({ color: '#ffe0a0', toneMapped: false })); mesh(new THREE.CylinderGeometry(1.12, 1.12, 1.6, 24), lanternMat).position.set(lx, ly + 17, lz);
    const roof = mesh(new THREE.ConeGeometry(1.8, 1.7, 24), darkMat); roof.position.set(lx, ly + 18.62, lz);
    const details = [];
    for (let j = 0; j < 12; j++) { const a = j * TAU / 12; details.push(transform(new THREE.CylinderGeometry(.045, .045, 1.8, 5), lx + Math.cos(a) * 1.25, ly + 17, lz + Math.sin(a) * 1.25)); details.push(transform(new THREE.CylinderGeometry(.034, .034, .82, 5), lx + Math.cos(a) * 1.86, ly + 16.5, lz + Math.sin(a) * 1.86)); }
    for (const yy of [ly + 16.2, ly + 16.9]) details.push(transform(new THREE.TorusGeometry(1.86, .046, 6, 48), lx, yy, lz, Math.PI / 2));
    mergeParts(details, darkMat);
    for (let j = 0; j < 4; j++) mesh(new THREE.PlaneGeometry(.48, .95), darkMat).position.set(lx, ly + 3.1 + j * 3, lz + 1.92 - j * .09);
    addPaintedVessels({ scene, mesh, painted, material, tube, mergeParts, animated, reducedMotion: () => reducedMotion });
    for (let i = 0; i < 3200; i++) { const z = 35 - random() * 125, x = -15 - random() * 72; if (!isSea(x, z)) continue; stamp('sea-foam', strokeGeo, brushMat, x, -1.865 + random() * .018, z, .08 + random() * .32, .7 + random() * 2.3, .05, -Math.PI / 2, 0, Math.PI / 2 + (random() - .5) * .22, ['#c6d1cc', '#e3ddd0', '#9aafb1', '#bac9c6'][i % 4]); }
  }
  mergeParts(trunkParts, barkMat); mergeParts(branchParts, barkMat);

  // Gilded portal: bevelled mouldings, leaf relief, acanthus curls and an inset
  // painting of the next world. These details remain readable up close.
  const frame = new THREE.Group(); frame.position.set(portal.x, groundHeight(portal.x, portal.z) + .05, portal.z); scene.add(frame);
  function frameShape(w, h, border) {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.closePath();
    const hole = new THREE.Path(); hole.moveTo(-w / 2 + border, border); hole.lineTo(-w / 2 + border, h - border); hole.lineTo(w / 2 - border, h - border); hole.lineTo(w / 2 - border, border); hole.closePath(); s.holes.push(hole); return s;
  }
  const f1 = mesh(new THREE.ExtrudeGeometry(frameShape(5.5, 8.2, .43), { depth: .16, bevelEnabled: true, bevelSize: .10, bevelThickness: .10, bevelSegments: 3 }), goldMat, frame); f1.position.z = .02;
  const f2 = mesh(new THREE.ExtrudeGeometry(frameShape(4.8, 7.5, .10), { depth: .12, bevelEnabled: true, bevelSize: .045, bevelThickness: .05, bevelSegments: 2 }), darkGoldMat, frame); f2.position.set(0, .35, .14);
  const f3 = mesh(new THREE.ExtrudeGeometry(frameShape(4.59, 7.28, .065), { depth: .05, bevelEnabled: true, bevelSize: .03, bevelThickness: .025, bevelSegments: 2 }), goldMat, frame); f3.position.set(0, .46, .23);
  const nextTexture = portalTextures[portal.next] || skyTextures[portal.next];
  const portalMat = material(new THREE.MeshBasicMaterial({ map: nextTexture || null, color: nextTexture ? '#ffffff' : PALETTES[portal.next].sky, toneMapped: false, side: THREE.DoubleSide }));
  const painting = mesh(new THREE.PlaneGeometry(4.45, 7.12), portalMat, frame); painting.position.set(0, 4.1, .015);
  const ornamentParts = [];
  for (const sign of [-1, 1]) {
    for (const yy of [.65, 7.55]) {
      const points = [];
      for (let j = 0; j <= 35; j++) { const a = j / 35 * Math.PI * 3.2, rr = .50 * (1 - j / 42); points.push([sign * (2.62 + Math.cos(a) * rr), yy + Math.sin(a) * rr, .29]); }
      ornamentParts.push(tube(points, .065, 45, 6));
    }
    for (let j = 0; j < 18; j++) {
      const yy = .55 + j * .42;
      ornamentParts.push(transform(new THREE.SphereGeometry(.063, 8, 6), sign * 2.51, yy, .34));
      for (let k = 0; k < 2; k++) {
        const leaf = mesh(leafGeo, goldMat, frame); leaf.position.set(sign * (2.66 + k * .15), yy, .26); leaf.scale.set(.45, .6, .9); leaf.rotation.set(0, .2, sign * (.55 + k * .65));
      }
    }
  }
  // Consolidate the many leaf relief pieces into one mesh to keep draw calls low.
  const relief = []; for (const child of [...frame.children]) if (child.geometry === leafGeo) { child.updateMatrix(); relief.push(leafGeo.clone().applyMatrix4(child.matrix)); frame.remove(child); }
  mergeParts(relief, goldMat, frame); mergeParts(ornamentParts, goldMat, frame);
  const crest = mesh(new THREE.TorusGeometry(.42, .105, 10, 32), goldMat, frame); crest.position.set(0, 8.4, .21); crest.scale.y = 1.3;
  const crownParts = [];
  for (let i = 0; i < 8; i++) { const a = (i / 7 - .5) * Math.PI * .9; crownParts.push(transform(makeLeafGeometry(), Math.sin(a) * .63, 8.37 + Math.cos(a) * .57, .19, -.18, 0, -a + (i % 2 ? .16 : -.12), .67, .84, 1.2)); }
  for (const sign of [-1, 1]) crownParts.push(tube([[0, 8.28, .15], [sign * .7, 8.54, .21], [sign * .86, 8.91, .22], [sign * .57, 9.13, .20], [sign * .41, 8.89, .25], [sign * .61, 8.81, .27]], .062, 30, 8));
  mergeParts(crownParts, goldMat, frame);
  const vineParts = [];
  for (const sign of [-1, 1]) {
    const points = []; for (let k = 0; k <= 24; k++) { const y = k / 24 * 7.3; points.push([sign * (2.83 + Math.sin(y * 2) * .16), y + .25, .12 + Math.cos(y * 1.7) * .18]); } vineParts.push(tube(points, .035, 70, 7));
    for (let k = 0; k < 64; k++) {
      const y = .3 + random() * 7.5, x = portal.x + sign * (2.81 + Math.sin(y * 2) * .18), z = portal.z + .25;
      stamp('tree-pigment', leafGeo, brushMat, x + (random() - .5) * .33, frame.position.y + y, z, .55, .42, .8, .2, random() * TAU, sign * .9, p.leaf[k % p.leaf.length]);
      if (k % 6 === 0) for (let j = 0; j < 5; j++) stamp('flowers', petalGeo, brushMat, x + .07 * Math.sin(j), frame.position.y + y, z + .10, .2, .23, .22, -.75, 0, j * TAU / 5, k % 12 ? '#f6e7c4' : '#cedaee');
    }
  }
  mergeParts(vineParts, barkMat, frame);
  const threshold = mesh(new THREE.BoxGeometry(6, .17, 1.5), rockMat, frame); threshold.position.set(0, -.02, .15);
  const portalLight = new THREE.PointLight(id === 0 ? '#ffd684' : '#fff3c5', 16, 11, 1.6); portalLight.position.set(7, frame.position.y + 2.7, -6.8); scene.add(portalLight);

  const memories = [
    [{ id: '0-a', x: -4, z: 4, label: '星のかけら' }, { id: '0-b', x: -8, z: -9, label: '夜を編む青' }, { id: '0-c', x: 10, z: -21, label: '月の金色' }],
    [{ id: '1-a', x: 5, z: 3, label: '睡蓮のひかり' }, { id: '1-b', x: -9, z: -5, label: '水面の記憶' }, { id: '1-c', x: 8, z: -19, label: '柳のささやき' }],
    [{ id: '2-a', x: -5, z: 4, label: '黄金の葉' }, { id: '2-b', x: 12, z: -3, label: '森の装飾' }, { id: '2-c', x: -7, z: -18, label: '永遠の琥珀' }],
    [{ id: '3-a', x: -3, z: 3, label: '霧のしずく' }, { id: '3-b', x: -8, z: -9, label: '遠い帆' }, { id: '3-c', x: 7, z: -20, label: '光の帰り道' }],
  ][id];
  const memoryMeshes = new Map();
  const memoryMat = material(new THREE.MeshStandardMaterial({ color: id === 1 ? '#ecc7df' : id === 3 ? '#d1edf5' : '#ffe0a0', emissive: id === 1 ? '#dc94c6' : '#f1bf54', emissiveIntensity: .85, roughness: .19, metalness: .58 }));
  const glowMat = material(new THREE.MeshBasicMaterial({ color: '#ffe5af', transparent: true, opacity: .62, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  for (const [index, memory] of memories.entries()) {
    const group = new THREE.Group(); group.position.set(memory.x, groundHeight(memory.x, memory.z) + 1.15, memory.z); scene.add(group); memoryMeshes.set(memory.id, group);
    const profile = [new THREE.Vector2(0, -.28), new THREE.Vector2(.2, -.19), new THREE.Vector2(.25, .03), new THREE.Vector2(.17, .23), new THREE.Vector2(.03, .56), new THREE.Vector2(0, .65)];
    mesh(new THREE.LatheGeometry(profile, 24), memoryMat, group);
    const ribbon = mesh(new THREE.TorusKnotGeometry(.35, .017, 100, 5, 2, 3), goldMat, group); ribbon.rotation.x = .45;
    const ring = mesh(new THREE.RingGeometry(.64, .65, 64), glowMat, group); ring.rotation.x = -Math.PI / 2; ring.position.y = -.63;
    for (let j = 0; j < 7; j++) { const a = j * TAU / 7; const feather = mesh(leafGeo, memoryMat, group); feather.position.set(Math.cos(a) * .32, -.33, Math.sin(a) * .32); feather.rotation.set(-1, a, 0); feather.scale.set(.3, .6, .3); }
    const light = new THREE.PointLight('#ffe5b0', 2.0, 4); group.add(light);
    const initialY = group.position.y; animated.push(time => { if (reducedMotion) return; group.rotation.y = time * .27 + index; group.position.y = initialY + Math.sin(time * 1.4 + index * 2) * .12; });
  }
  // Fine, soft glowing motes have their own compact shader so they never create
  // hundreds of sprites or light sources.
  const particlePositions = [], particleSizes = [], particlePhases = [];
  for (let i = 0; i < 200; i++) { const nearPortal = i < 85; particlePositions.push(nearPortal ? 7 + (random() - .5) * 7 : (random() - .5) * 74, nearPortal ? frame.position.y + random() * 9 : 1 + random() * 8, nearPortal ? -8 + (random() - .5) * 5 : 25 - random() * 74); particleSizes.push(1 + random() * 2); particlePhases.push(random() * TAU); }
  const particleGeo = geo(new THREE.BufferGeometry()); particleGeo.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions, 3)); particleGeo.setAttribute('aSize', new THREE.Float32BufferAttribute(particleSizes, 1)); particleGeo.setAttribute('aPhase', new THREE.Float32BufferAttribute(particlePhases, 1));
  const particleMat = material(new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(id === 1 ? '#fff2d5' : '#ffe19b') } }, vertexShader: `attribute float aSize;attribute float aPhase;uniform float uTime;varying float vAlpha;void main(){vec3 p=position;p.x+=sin(uTime*.22+aPhase)*.24;p.y+=sin(uTime*.38+aPhase)*.3;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*75./max(1.,-mv.z),1.,13.);vAlpha=.42+.3*sin(aPhase+uTime*.65);}`, fragmentShader: `uniform vec3 uColor;varying float vAlpha;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(uColor,pow(1.-d,2.)*vAlpha);}` }));
  scene.add(new THREE.Points(particleGeo, particleMat)); animated.push(time => { particleMat.uniforms.uTime.value = reducedMotion ? 0 : time; });
  const removePaintedFlora = addPaintedFlora(scene, { id, baseHeight, pathX, isPond, isSea });
  flush();

  function updateDetail(camera) {
    if (!camera) return;
    const mobileAuto = detailLevel === 'auto' && typeof matchMedia === 'function' && (matchMedia('(pointer: coarse)').matches || matchMedia('(max-width: 700px)').matches);
    const low = detailLevel === 'low' || mobileAuto, high = detailLevel === 'high';
    const near = low ? 9 : high ? 28 : 21, middle = low ? 18 : high ? 52 : 40;
    for (const batch of detailBatches) {
      const distance = Math.hypot(camera.position.x - batch.center.x, camera.position.z - batch.center.z);
      let level = distance < near ? 0 : distance < middle ? 1 : 2;
      if (!low && batch.name === 'gold-canopy' && distance < 48) level = Math.min(level, 1);
      if (low && (batch.name === 'path-marks' || batch.name === 'fallen-pigment')) level = Math.max(1, level);
      if (level !== batch.level) { batch.mesh.geometry = batch.levels[level]; batch.level = level; }
    }
  }

  return {
    scene, groundHeight, spawn: { x: 0, z: 15, yaw: 0 }, portal, memories, memoryMeshes, obstacles,
    setReducedMotion(value) { reducedMotion = Boolean(value); },
    setDetailLevel(value) { detailLevel = ['auto', 'low', 'high'].includes(value) ? value : 'auto'; lastDetailUpdate = -Infinity; },
    update(time, delta, camera) {
      for (const fn of animated) fn(time, delta, camera);
      if (reducedMotion || Math.abs(time - lastDetailUpdate) > .18) { updateDetail(camera); lastDetailUpdate = time; }
    },
    dispose() {
      removePaintedFlora();
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
      scene.traverse(obj => { if (obj.isInstancedMesh) obj.dispose(); }); scene.clear();
    },
  };
}
