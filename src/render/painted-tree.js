import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const vector = p => new THREE.Vector3(...p);
const randomSource = seed => () => {
  seed = seed + 0x6D2B79F5 | 0;
  let value = Math.imul(seed ^ seed >>> 15, seed | 1);
  value ^= value + Math.imul(value ^ value >>> 7, value | 61);
  return ((value ^ value >>> 14) >>> 0) / 4294967296;
};

// Each component is a closed swept volume. Parallel-transported frames keep
// the long dragged pigment ridges continuous around tight branch bends.
function sweepVolume({ points, radius, width, depth, rows = 60, sides = 24, phase = 0, twist = 0, flutes = 5, blade = false, crown = false, colorA, colorB }) {
  const curve = new THREE.CatmullRomCurve3(points.map(vector));
  const frames = curve.computeFrenetFrames(rows, false);
  const positions = [], uvs = [], colors = [], indices = [], stride = sides + 1;
  const low = new THREE.Color(colorA), high = new THREE.Color(colorB), pigment = new THREE.Color();
  const centres = [], shade = new THREE.Color('#542628');
  for (let row = 0; row <= rows; row++) {
    const fraction = row / rows, t = crown ? .5 - .5 * Math.cos(fraction * Math.PI) : fraction, p = curve.getPointAt(t);
    const tangent = crown ? curve.getTangentAt(t).normalize() : frames.tangents[row];
    const rotation = twist * t + .10 * Math.sin(t * 6 + phase);
    const basisX = crown ? new THREE.Vector3(0, 1, 0).cross(tangent).normalize() : frames.normals[row];
    if (basisX.lengthSq() < .01) basisX.copy(frames.normals[row]);
    const basisZ = crown ? tangent.clone().cross(basisX).normalize() : frames.binormals[row];
    const across = basisX.clone().multiplyScalar(Math.cos(rotation)).addScaledVector(basisZ, Math.sin(rotation));
    const normal = basisZ.clone().multiplyScalar(Math.cos(rotation)).addScaledVector(basisX, -Math.sin(rotation));
    const ringCenter = new THREE.Vector3();
    for (let side = 0; side <= sides; side++) {
      const a = side / sides * TAU, u = Math.cos(a), v = Math.sin(a);
      let x, z;
      if (blade) {
        // Wide palette-knife loads have curled, asymmetrical margins, several
        // broad creases, and a swollen rounded end instead of a leaf point.
        const envelope = Math.max(.016, Math.sin(Math.PI * t) ** (.35 + .10 * Math.sin(phase)));
        const asymmetry = .90 + .18 * Math.sin(t * 4.9 + phase + u * .8) + .075 * Math.sin(t * 13 + u * 2 + phase);
        x = Math.sign(u) * Math.abs(u) ** (crown ? .78 : 1) * width * envelope * asymmetry;
        const folds = Math.cos(u * 9.2 + .52 * Math.sin(t * 4 + phase)) * depth * (crown ? .32 : .25) * envelope;
        const curledEdge = Math.exp(-(((u - .70) / .28) ** 2)) * depth * (crown ? .75 : .95) * Math.sin(Math.PI * t);
        const drag = crown ? depth * .44 * Math.sin(t * 8 + u * 2.3 + phase) * Math.sin(Math.PI * t) : 0;
        z = Math.sign(v) * Math.abs(v) ** (crown ? .62 : 1) * depth * envelope * (.76 + .26 * Math.sin(t * 3.6)) + folds + curledEdge + drag;
      } else {
        const r = typeof radius === 'function' ? radius(t) : THREE.MathUtils.lerp(radius[0], radius[1], t);
        const ridges = 1 + .15 * Math.cos(a * flutes + phase + t * 4.4) + .075 * Math.sin(a * (flutes + 3) - t * 5.8 + phase);
        const knot = 1 + .13 * Math.sin(t * 13 + phase) + .075 * Math.sin(t * 27 + a * 2);
        x = u * r * ridges * knot;
        z = v * r * ridges * knot * (.82 + .09 * Math.sin(t * 5 + phase));
      }
      const vertex = p.clone().addScaledVector(across, x).addScaledVector(normal, z);
      positions.push(vertex.x, vertex.y, vertex.z); uvs.push(side / sides, t);
      if (side < sides) ringCenter.add(vertex);
      const broadStroke = .5 + .5 * Math.sin(a * (blade ? 2 : 3) + phase + t * 3.4);
      const tipLight = blade ? .12 + t * .32 + broadStroke * .34 : .10 + broadStroke * .58;
      pigment.copy(low).lerp(high, clamp(tipLight, 0, 1));
      if (blade && v < 0) pigment.lerp(shade, .10 * -v);
      pigment.multiplyScalar(crown ? .82 + .19 * Math.sin(t * 6 + phase + u * 1.8) : .93 + .08 * Math.sin(t * 8 + phase + a * 1.8));
      colors.push(pigment.r, pigment.g, pigment.b);
      if (row < rows && side < sides) {
        const i = row * stride + side;
        indices.push(i, i + 1, i + stride, i + 1, i + stride + 1, i + stride);
      }
    }
    centres.push(ringCenter.multiplyScalar(1 / sides));
  }
  for (const end of [0, 1]) {
    const ring = end ? rows * stride : 0, c = centres[end ? rows : 0], i = positions.length / 3;
    positions.push(c.x, c.y, c.z); uvs.push(.5, end); colors.push(low.r, low.g, low.b);
    for (let side = 0; side < sides; side++) {
      if (end) indices.push(i, ring + side, ring + side + 1);
      else indices.push(i, ring + side + 1, ring + side);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(positions.length), 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const n = geometry.attributes.normal, joined = new THREE.Vector3(), other = new THREE.Vector3();
  for (let row = 0; row <= rows; row++) {
    const a = row * stride, b = a + sides;
    joined.fromBufferAttribute(n, a).add(other.fromBufferAttribute(n, b)).normalize();
    n.setXYZ(a, joined.x, joined.y, joined.z); n.setXYZ(b, joined.x, joined.y, joined.z);
  }
  return { geometry, curve, frames };
}

function mergeParts(parts) {
  const merged = mergeGeometries(parts, false);
  parts.forEach(part => part.dispose());
  merged.computeBoundingBox(); merged.computeBoundingSphere(); return merged;
}

/**
 * A sculpted red-and-gold tree, approximately 18 m tall and 16 m across.
 * +X carries the long overhanging branch; the broad roots spread toward -X.
 * There are no cards, random leaf particles, or cylinder primitives. Closed
 * fluted branches, raised bark ribbons and overlapping thick paint loads form
 * the complete silhouette. The caller owns positioning and scene lighting.
 */
export function addPaintedTree(scene, { position = [0, 0, 0], seed = 42719, scale = 1 } = {}) {
  if (!scene?.add || !Array.isArray(position) || position.length !== 3 || !position.every(Number.isFinite) || !Number.isFinite(scale) || scale <= 0) {
    throw new TypeError('A painted tree requires a scene, a finite position and a positive scale.');
  }
  const random = randomSource(Number.isFinite(seed) ? seed | 0 : 42719);
  const group = new THREE.Group(); group.name = 'Hero — the poured vermilion tree';
  group.position.fromArray(position); group.scale.setScalar(scale);
  const barkParts = [], enamelParts = [], canopyParts = [], goldParts = [];
  const branchDefinitions = [
    // Two interlocking trunks leave a narrow dark cleft between their sweeps.
    { p: [[-.45, -.14, .12], [-.65, 1.7, .36], [.30, 4.2, .08], [1.25, 6.7, -.42], [.7, 9.4, -.70], [-.1, 12.4, -.9], [.45, 15.2, -1.5]], r: [1.24, .18], ribbons: 7 },
    { p: [[.68, -.10, -.50], [1.04, 1.8, -.5], [1.75, 4.7, -.6], [1.28, 7.3, -.3], [2.6, 9.7, -.10], [3.9, 11.4, .30], [6.8, 13.1, .24], [9.8, 13.7, -.48]], r: [.95, .10], ribbons: 6 },
    { p: [[.85, 5.05, -.32], [-.5, 7.7, .2], [-2.1, 9.4, .7], [-3.9, 11.6, .9], [-5.1, 13.9, .15]], r: [.65, .08], ribbons: 4 },
    { p: [[1.2, 7.7, -.3], [2.6, 9.4, -1.2], [3.7, 12.6, -2.1], [3.1, 15.6, -2.8]], r: [.57, .07], ribbons: 4 },
    { p: [[.0, 9.0, -.6], [-1.7, 10.7, -1.7], [-3.6, 12.7, -2.9], [-4.4, 14.4, -3.9]], r: [.44, .06], ribbons: 3 },
    { p: [[2.5, 9.7, .1], [3.4, 10.7, 1.4], [4.2, 12.2, 2.8], [6.2, 13.2, 3.4]], r: [.48, .055], ribbons: 3 },
    { p: [[6.1, 12.7, .3], [7.1, 14.3, -.7], [8.1, 15.1, -1.8]], r: [.29, .045], ribbons: 2 },
    { p: [[-.2, 11.6, -.9], [.8, 13.7, -.1], [1.5, 16.4, .4]], r: [.34, .055], ribbons: 3 },
    { p: [[-2.4, 9.7, .6], [-3.4, 10.8, 2.3], [-4.6, 12.4, 3.1]], r: [.34, .045], ribbons: 2 },
  ];
  const barkPalette = [['#341c24', '#985126'], ['#46251f', '#bf662d'], ['#29292b', '#7b4d32'], ['#49221f', '#b24a25']];
  const ribbonPalette = [['#702920', '#d7923e'], ['#8a281e', '#d35030'], ['#ab5c22', '#f1bc63'], ['#233d42', '#627c6d'], ['#592620', '#b65a30']];
  function addBranch(definition, index, root = false) {
    const phase = random() * TAU, palette = barkPalette[index % barkPalette.length];
    const rows = root ? 48 : index < 2 ? 116 : 76, sides = root ? 26 : index < 2 ? 36 : 28;
    const taper = t => {
      const a = definition.r[0], b = definition.r[1];
      return b + (a - b) * (1 - t) ** (root ? 1.08 : .82);
    };
    const shape = sweepVolume({ points: definition.p, radius: taper, rows, sides, phase, twist: root ? .65 : 1.25, flutes: 5 + index % 3, colorA: palette[0], colorB: palette[1] });
    barkParts.push(shape.geometry);
    // Broad deposited paint follows the wood's actual curvature and narrows
    // into individual tendrils. The bark remains visible between the pours.
    for (let ribbon = 0; ribbon < definition.ribbons; ribbon++) {
      const angle = ribbon / definition.ribbons * TAU + phase * .31;
      const begin = .015 + random() * .06, finish = .73 + random() * .23;
      const points = [];
      for (let step = 0; step < 12; step++) {
        const t = begin + (finish - begin) * step / 11, frame = Math.min(rows, Math.round(t * rows));
        const center = shape.curve.getPointAt(t), phi = angle + 1.3 * t + .13 * Math.sin(t * 8 + phase);
        const r = taper(t) * (1.02 + .1 * Math.sin(phi * (5 + index % 3) + phase + t * 4.4));
        center.addScaledVector(shape.frames.normals[frame], Math.cos(phi) * r).addScaledVector(shape.frames.binormals[frame], Math.sin(phi) * r * .87);
        points.push(center.toArray());
      }
      const palette = ribbonPalette[(index + ribbon) % ribbonPalette.length];
      const paint = sweepVolume({ points, blade: true, width: definition.r[0] * (.10 + random() * .085), depth: root ? .055 : .075, rows: root ? 34 : 52, sides: 12, phase: phase + ribbon, twist: .6, colorA: palette[0], colorB: palette[1] });
      enamelParts.push(paint.geometry);
    }
  }
  branchDefinitions.forEach((definition, index) => addBranch(definition, index));
  const roots = [
    [[-.3, .8, .1], [-1.7, .43, 1.0], [-3.1, .25, 2.3], [-5.2, .10, 2.8]],
    [[-.5, 1.0, -.2], [-1.9, .53, -.7], [-3.3, .20, -1.4], [-5.5, .07, -1.3]],
    [[.5, 1.1, .6], [.4, .43, 1.9], [1.3, .19, 3.3], [3.5, .06, 4.0]],
    [[.8, .9, -.4], [1.6, .40, -1.5], [1.8, .21, -3.2], [3.5, .08, -4.0]],
    [[-.1, .6, .1], [-1.9, .28, .1], [-3.9, .13, -.1], [-6.1, .02, .7]],
    [[1.0, .6, .2], [2.1, .27, .6], [3.3, .09, 1.0], [4.9, .02, .4]],
  ];
  roots.forEach((p, index) => addBranch({ p, r: [.57 + (index % 3) * .09, .035], ribbons: 3 }, index + 9, true));

  // These interlocking clusters are authored around the major branch ends.
  // Broad masses define the silhouette; smaller paint loads only articulate
  // their margins. Deliberate openings reveal the branch architecture below.
  const crowns = [
    { p: [-4.3, 13.2, .1], size: [2.1, 1.4, 2.0], shade: 0 },
    { p: [-3.8, 14.7, -2.8], size: [2.2, 1.7, 1.8], shade: 1 },
    { p: [-1.9, 15.3, -.8], size: [2.6, 1.65, 2.1], shade: 0 },
    { p: [.5, 16.0, -1.4], size: [2.45, 1.5, 2.0], shade: 1 },
    { p: [2.5, 16.0, -2.2], size: [2.4, 1.5, 1.8], shade: 2 },
    { p: [1.8, 15.1, 1.0], size: [2.3, 1.8, 2.0], shade: 0 },
    { p: [4.9, 14.0, .15], size: [2.45, 1.7, 1.9], shade: 1 },
    { p: [6.8, 14.7, -1.4], size: [2.1, 1.3, 1.7], shade: 2 },
    { p: [8.9, 13.6, -.5], size: [1.9, 1.1, 1.6], shade: 3 },
    { p: [5.6, 13.1, 2.6], size: [2.0, 1.3, 1.7], shade: 2 },
    { p: [-4.0, 12.1, 2.4], size: [1.7, 1.4, 1.5], shade: 3 },
    { p: [-.3, 13.7, 2.0], size: [2.0, 1.2, 1.6], shade: 0 },
  ];
  const crownPalette = [
    ['#722c2a', '#d85b2c'], ['#923526', '#ed7936'],
    ['#a45327', '#f2ae4c'], ['#c1852d', '#f6cf70'],
  ];
  const supports = branchDefinitions.flatMap(branch => new THREE.CatmullRomCurve3(branch.p.map(vector)).getPoints(35));
  let leafCount = 0;
  crowns.forEach((crown, crownIndex) => {
    const palette = crownPalette[crown.shade], p = crown.p, [sx, sy, sz] = crown.size;
    const heart = new THREE.Vector3(p[0], p[1] - sy * .60, p[2]);
    const support = supports.reduce((nearest, point) => point.distanceToSquared(heart) < nearest.distanceToSquared(heart) ? point : nearest, supports[0]);
    const junction = support.clone().lerp(heart, .56).add(new THREE.Vector3(0, .18, 0));
    barkParts.push(sweepVolume({ points: [support.toArray(), junction.toArray(), heart.toArray()], radius: [.14, .065], rows: 18, sides: 10, phase: random() * TAU, flutes: 4, colorA: '#3d2428', colorB: '#8d4b2c' }).geometry);
    // Eight little boughs spread from each supported heart. Five successive
    // nodes on each bough bear three overlapping 0.3–0.7 m brush leaves. This
    // is a dense branching canopy, rather than a shell of detached fragments.
    for (let bough = 0; bough < 8; bough++) {
      const angle = bough / 8 * TAU + crownIndex * .38 + (random() - .5) * .20;
      const extent = .87 + random() * .15, cosine = Math.cos(angle), sine = Math.sin(angle);
      const tip = new THREE.Vector3(p[0] + cosine * sx * extent, p[1] - sy * (.14 + random() * .31), p[2] + sine * sz * extent);
      const middle = new THREE.Vector3(p[0] + cosine * sx * .51, p[1] + sy * (.29 + random() * .14), p[2] + sine * sz * .51);
      const boughShape = sweepVolume({ points: [heart.toArray(), middle.toArray(), tip.toArray()], radius: [.075 + random() * .027, .009], rows: 24, sides: 10, phase: random() * TAU, flutes: 3, colorA: '#442027', colorB: '#9f5230' });
      barkParts.push(boughShape.geometry);
      for (let node = 0; node < 5; node++) {
        const t = .30 + node * .15 + (random() - .5) * .026;
        const anchor = boughShape.curve.getPointAt(t);
        for (let fan = 0; fan < 3; fan++) {
          const spread = (fan - 1) * 1.04, direction = angle + spread + (random() - .5) * .34;
          const length = .42 + random() * .29, width = .17 + random() * .135;
          const base = anchor.clone().add(new THREE.Vector3(0, .01 + fan * .018, 0));
          const end = base.clone().add(new THREE.Vector3(Math.cos(direction) * length, (fan === 1 ? .03 : -.07) - random() * .09, Math.sin(direction) * length));
          const lift = .065 + random() * .063;
          const first = base.clone().lerp(end, .31).add(new THREE.Vector3(0, lift, 0));
          const second = base.clone().lerp(end, .75).add(new THREE.Vector3(0, lift * .42, 0));
          const brightEdge = node > 2 && (bough + fan + crownIndex) % 4 === 0;
          const shade = brightEdge ? crownPalette[3] : node < 2 ? crownPalette[0] : palette;
          const leaf = sweepVolume({ points: [base.toArray(), first.toArray(), second.toArray(), end.toArray()], width, depth: .022 + random() * .014, blade: true, crown: true, rows: 15, sides: 10, twist: spread * .13 + (random() - .5) * .38, phase: random() * TAU, colorA: shade[0], colorB: shade[1] });
          canopyParts.push(leaf.geometry); leafCount++;
        }
      }
    }
    // A few heavy, hanging ends make the crowns read as viscous pigment.
    for (let drip = 0; drip < 3; drip++) {
      const angle = -.5 + drip * 1.8 + crownIndex * .51;
      const x = crown.p[0] + Math.cos(angle) * crown.size[0] * .72;
      const z = crown.p[2] + Math.sin(angle) * crown.size[2] * .72;
      const y = crown.p[1] - crown.size[1] * .34;
      const drop = .7 + random() * 1.2;
      const load = .07 + random() * .055;
      const shape = sweepVolume({ points: [[x, y + .30, z], [x + .11, y, z + .13], [x + .08, y - drop * .64, z + .18], [x + .03, y - drop, z + .15]], radius: t => .007 + load * ((1 - t) ** 2 * .9 + .56 * Math.exp(-(((t - .85) / .105) ** 2))), rows: 30, sides: 12, phase: random() * TAU, twist: .25, flutes: 3, colorA: '#95501d', colorB: '#ddb653' });
      goldParts.push(shape.geometry);
    }
  });

  const materials = [
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: .43, clearcoat: .33, clearcoatRoughness: .33 }),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: .35, clearcoat: .48, clearcoatRoughness: .25 }),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: .40, clearcoat: .36, clearcoatRoughness: .30 }),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: .34, clearcoat: .45, clearcoatRoughness: .25 }),
  ];
  const names = ['hero-tree-twisted-bark', 'hero-tree-dragged-enamel', 'hero-tree-sculpted-canopy', 'hero-tree-pooled-gold'];
  const parts = [barkParts, enamelParts, canopyParts, goldParts], geometries = [];
  let triangles = 0;
  parts.forEach((pieces, index) => {
    const geometry = mergeParts(pieces), material = materials[index], mesh = new THREE.Mesh(geometry, material);
    geometry.name = names[index]; material.name = names[index]; mesh.name = names[index];
    material.userData.pigmentSurface = index < 2 ? 'bark' : 'foliage';
    mesh.userData.pigmentSurface = material.userData.pigmentSurface;
    mesh.userData.heroPaintedTree = true;
    mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh); geometries.push(geometry); triangles += geometry.index.count / 3;
  });
  group.userData.triangles = triangles;
  group.userData.brushLeaves = leafCount;
  group.userData.heroPaintedTree = true;
  scene.add(group);
  let disposed = false;
  return { group, dispose() {
    if (disposed) return;
    disposed = true; group.removeFromParent(); group.clear();
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
  } };
}
