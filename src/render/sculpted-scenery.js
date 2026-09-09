import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makePouredPaintGeometry } from './poured-paint.js';

const TAU = Math.PI * 2;

// This layer supplies the large physical forms of the painting: poured shelves,
// rolled impasto edges, pendulous paint, receding mountain ranges and masonry.
// All coordinates are genuinely three-dimensional and retain walking parallax.
export function addSculptedScenery(ctx) {
  const { id, scene, random, baseHeight, pathX, isPond, isSea, mesh, painted, material, mergeParts, transform, tube, goldMat, stamp, leafGeo, petalGeo, brushMat, stemGeo, p, obstacles, clearingPositions, skyTextures, textures } = ctx;
  const collected = new Map();
  const coat = (name, colors, roughness = .44) => {
    const mat = painted(colors, roughness); mat.name = `sculpted-${name}`; mat.userData.pigmentSurface = name; return mat;
  };
  const earth = coat('rock', id === 0 ? ['#49525b', '#6b716e', '#98947c', '#b4a17e'] : id === 3 ? ['#53636e', '#7c898a', '#a8aaa0', '#777968'] : ['#656c4e', '#8f9270', '#b4af87', '#787e5d']);
  const deep = coat('rock', id === 0 ? ['#172d46', '#29465c', '#3e5d70'] : id === 2 ? ['#655326', '#8b6b32', '#baa05b'] : ['#385c5b', '#557c71', '#738b80']);
  const ochre = coat('rock', ['#926024', '#bb8438', '#dba351', '#f0c47b']);
  const ivory = coat('rock', ['#b7a67f', '#d0bd96', '#e2d4ac', '#f3e4b9']);
  const cobalt = coat('rock', ['#143a65', '#245b83', '#3e7a9a', '#658ca4']);
  const vermilion = coat('rock', ['#5c292a', '#933b32', '#c46240']);
  const pathColors = id === 0 ? [['#a9772c', '#ce9e49', '#e4b866'], ['#bd8d3b', '#daae5a', '#ecc57a'], ['#b58433', '#d0a04d', '#e3b965']] : id === 2 ? [['#aa822e', '#caa148', '#e2bd65'], ['#c99e3f', '#e4be65', '#f3d488'], ['#a47d31', '#cba24f', '#e4c078']] : [['#9c9271', '#b8ac85', '#cbbd93'], ['#b9ab81', '#d4c5a0', '#e4d8b5'], ['#a99f81', '#c7bb9b', '#d6caaa']];
  const pathMats = pathColors.map(palette => coat('path', palette, .41));
  function queue(name, geometry, mat) {
    const key = `${name}:${mat.uuid}`;
    if (!collected.has(key)) collected.set(key, { name, mat, parts: [] });
    collected.get(key).parts.push(geometry);
  }
  function flush() {
    for (const { name, mat, parts } of collected.values()) { const obj = mergeParts(parts, mat); obj.name = name; obj.castShadow = !name.startsWith('mountain') && !name.includes('lit-windows'); obj.receiveShadow = !name.includes('lit-windows'); }
    collected.clear();
  }
  function flowingTube(points, radius, name, mat, tip = .55) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const g = new THREE.TubeGeometry(curve, 18, radius, 8, false), p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) { const t = uv.getX(i), center = curve.getPointAt(t), swell = .62 + .4 * Math.sin(Math.PI * t) + tip * Math.exp(-(((t - .88) / .15) ** 2)); p.setXYZ(i, center.x + (p.getX(i) - center.x) * swell, center.y + (p.getY(i) - center.y) * swell, center.z + (p.getZ(i) - center.z) * swell); }
    g.computeVertexNormals(); queue(name, g, mat);
  }
  function shelf(rx, rz, thickness, seed) {
    const sides = 48, radial = [0, .20, .42, .64, .83, .96, 1.015, 1.035, .98, .84], points = [], uv = [], indices = [];
    for (let ring = 0; ring < radial.length; ring++) {
      const r = radial[ring];
      for (let s = 0; s <= sides; s++) {
        const a = s / sides * TAU, irregular = 1 + .17 * Math.sin(a * 3 + seed * 1.9) + .07 * Math.cos(a * 7 - seed * .7);
        let y = thickness * (.9 - .14 * r * r) + .045 * Math.sin(a * 9 + r * 18 + seed) * r + Math.cos(a * 2 + seed) * r * thickness * .13;
        if (ring > 5) y -= thickness * [0, 0, 0, 0, 0, 0, .15, .45, .88, 1.18][ring];
        points.push(Math.sign(Math.cos(a)) * Math.abs(Math.cos(a)) ** .73 * rx * r * irregular, y, Math.sign(Math.sin(a)) * Math.abs(Math.sin(a)) ** .73 * rz * r * irregular);
        uv.push(.5 + Math.cos(a) * r * .5, .5 + Math.sin(a) * r * .5);
        if (ring < radial.length - 1 && s < sides) { const i = ring * (sides + 1) + s; indices.push(i, i + 1, i + sides + 1, i + 1, i + sides + 2, i + sides + 1); }
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(indices); g.computeVertexNormals(); return g;
  }
  function paintedOutcrop(x, z, scale, height, variant = 0) {
    const y = baseHeight(x, z), coats = id === 0 ? [earth, ochre, deep, earth, ivory, ochre] : id === 2 ? [deep, earth, ochre, ivory] : [deep, earth, ivory, earth, cobalt];
    const radius = scale * .65;
    if (height > .7 && scale > .8 && Math.abs(x - pathX(z)) > radius + 1.7 && !clearingPositions.some(([mx, mz]) => Math.hypot(x - mx, z - mz) < radius + 3)) obstacles.push({ x, z, radius });
    const bulk = new THREE.SphereGeometry(1, 28, 20), bp = bulk.attributes.position;
    for (let i = 0; i < bp.count; i++) { const xx = bp.getX(i), yy = bp.getY(i), zz = bp.getZ(i), f = 1 + .09 * Math.sin(xx * 8 + zz * 6 + variant) * Math.sin(yy * 7); bp.setXYZ(i, xx * f, yy, zz * f); }
    bulk.computeVertexNormals(); queue('painted-rock-bodies', transform(bulk, x, y + height * .35, z, .03, variant, .03, scale, height * .68, scale * .72), earth);
    const layers = 3 + Math.floor(height * .7);
    for (let l = 0; l < layers; l++) {
      const t = l / layers, spread = scale * (.83 + .24 * Math.sin(l * 1.8 + variant) - .14 * t);
      const lx = x + Math.sin(l * 1.4 + variant) * .30, lz = z + Math.cos(l * 1.9) * .24, ly = y + t * height;
      queue('stratified-paint-shelves', transform(shelf(spread, spread * (.68 + .13 * Math.sin(l + variant)), .22 + height * .075, variant * 2.3 + l), lx, ly, lz, (random() - .5) * .17, variant * .29 + random() * .3, (random() - .5) * .15), coats[(l + variant) % coats.length | 0]);
      if (l > 0) for (let d = 0; d < 5; d++) {
        const a = .20 + random() * Math.PI * .86, xx = lx + Math.cos(a) * spread * .89, zz = lz + Math.sin(a) * spread * .70, length = .28 + random() ** .7 * Math.min(2.8, height * 1.15);
        const mat = d % 5 === 0 && variant % 3 === 0 ? vermilion : d % 3 === 0 ? ochre : d % 3 === 1 ? cobalt : ivory;
        const dripRadius = .026 + random() ** 2 * .115, dripTip = .3 + random() * 1.4;
        if (d === 0 && l === layers - 1 && variant % 2 === 0 && height > .85) {
          // A few wide pours replace thin cords. Their seeded geometry adds
          // no placement randomness, preserving the established collision map.
          const front = .78 + (a - .20) / (Math.PI * .86) * 1.5;
          const width = .48 + .46 * (.5 + .5 * Math.sin(x * 3.1 + z * 1.7));
          const pourHeight = Math.min(1.8, ly - y + .20, .78 + height * .57);
          const poured = makePouredPaintGeometry(width, pourHeight, Math.round(x * 1031 + z * 217 + variant * 391));
          const pourMat = variant === 0 ? ochre : variant === 2 ? cobalt : id === 2 ? ivory : deep;
          queue('broad-poured-pigment', transform(poured, lx + Math.cos(front) * spread * 1.01, ly + .29, lz + Math.sin(front) * spread * .86, 0, Math.PI / 2 - front), pourMat);
        } else flowingTube([[xx, ly + .26, zz], [xx + .06, ly + .04, zz + .15], [xx + .10, ly - length * .55, zz + .21], [xx + .11, ly - length, zz + .22]], dripRadius, 'viscous-paint-drips', mat, dripTip);
      }
    }
    // Plants take root in cracks and spill across the upper ledge; foreground
    // geology becomes a living bank, rather than a row of empty rock props.
    if (stamp) for (let plant = 0; plant < 24; plant++) {
      const a = random() * TAU, rr = Math.sqrt(random()) * scale * .68, xx = x + Math.cos(a) * rr, zz = z + Math.sin(a) * rr * .64;
      const py = y + height * .76 + .22, h = .22 + random() * .5;
      for (let blade = 0; blade < 3; blade++) stamp('grass', leafGeo, brushMat, xx + (random() - .5) * .12, py + h * .34, zz + (random() - .5) * .12, .6 + random() * .4, h, .9, -.5 + random() * .8, random() * TAU, (random() - .5) * 1.0, p.leaf[Math.floor(random() * p.leaf.length)]);
      if (plant % 3 === 0 && id !== 3) {
        const fy = py + .30 + random() * .22, col = p.flower[id === 0 ? plant % 2 ? 0 : 2 : plant % p.flower.length];
        stamp('flower-stems', stemGeo, brushMat, xx, (py + fy) * .5, zz, 1, fy - py, 1, 0, 0, 0, p.leaf[2]);
        for (let petal = 0; petal < 5; petal++) stamp('flowers', petalGeo, brushMat, xx, fy, zz, .22, .27, .25, -1.15, 0, petal * TAU / 5, col);
      }
    }
  }

  // Foreground shoulder masses make the walkway pass through the terrain,
  // instead of lying on top of an empty flat field.
  const memoryClearings = clearingPositions;
  for (let i = 0; i < 23; i++) {
    const z = 20 - i * 2.35, sign = i % 2 ? 1 : -1, offset = 3.65 + random() * 2.1, x = pathX(z) + sign * offset;
    if (id === 3 && sign < 0) continue;
    if (memoryClearings.some(([mx, mz]) => Math.hypot(x - mx, z - mz) < 2.5)) continue;
    if (isPond(x, z) || isSea(x, z) || Math.hypot(x - 7, z + 8) < 4.2) continue;
    paintedOutcrop(x, z, 1.05 + random() * 1.25, .8 + random() * 1.45, i % 6);
  }
  if (id === 3) for (let i = 0; i < 9; i++) { const z = 19 - i * 8.2, x = -8 + Math.sin(z * .095) * 2; paintedOutcrop(x, z, z > -17 ? .8 + random() * .5 : 1.7 + random() * .7, z > -17 ? .24 + random() * .35 : .8 + random(), i % 4); }

  // The palette knife changes direction between strokes. Short curling edges
  // cross broader, flatter scoops without making continuous parallel tracks.
  for (let strip = 0; strip < 92; strip++) {
    const startZ = 29 - random() * 68, length = 1.2 + random() * 4.6, lane = (random() - .5) * 1.52, width = .09 + random() * .15, phase = random() * TAU, drift = (random() - .5) * .34, rows = 22, cols = 7;
    const centerX = t => pathX(startZ - t * length) + lane + drift * (t - .5) + .11 * Math.sin(t * 4.2 + phase);
    const positions = [], uvs = [], indices = [];
    for (let v = 0; v <= rows; v++) for (let u = 0; u <= cols; u++) {
      const t = v / rows, across = u / cols * 2 - 1, z = startZ - t * length;
      const taper = .35 + .65 * Math.sin(Math.PI * t) ** .35;
      const x = centerX(t) + across * width * taper;
      const curledEdge = .023 * Math.exp(-(((across - .72) / .24) ** 2)) * Math.sin(Math.PI * t);
      const ridge = .012 * Math.cos(across * 18 + Math.sin(t * 7 + phase)) + .006 * Math.sin(across * 39 + t * 3);
      positions.push(x, baseHeight(x, z) + .072 + curledEdge + ridge * Math.sin(Math.PI * t), z); uvs.push(u / cols, t);
      if (v < rows && u < cols) { const a = v * (cols + 1) + u; indices.push(a, a + 1, a + cols + 1, a + 1, a + cols + 2, a + cols + 1); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(indices); g.computeVertexNormals(); queue('path-palette-knife-scoops', g, pathMats[strip % 3]);
    if (strip % 3 === 0) {
      const pts = [], end = .22 + random() * .29; for (let j = 0; j <= 6; j++) { const t = .12 + j / 6 * end, z = startZ - t * length, x = centerX(t) + width * .60 * Math.sin(t * 3 + .6); pts.push([x, baseHeight(x, z) + .086 + Math.sin(j / 6 * Math.PI) * .009, z]); }
      flowingTube(pts, .008 + random() * .010, 'path-raised-brush-ridges', pathMats[strip % 3], .05);
    }
  }

  // Separate terrain bands and unique peaks provide real depth and silhouettes.
  function mountainBand(zCenter, width, depth, height, phase, colors) {
    const g = new THREE.PlaneGeometry(width, depth, 150, 60); g.rotateX(-Math.PI / 2); const pos = g.attributes.position, uv = g.attributes.uv, vertexColors = [];
    const hash = (x, z) => { const n = Math.sin(x * 127.1 + z * 311.7 + phase * 47.6) * 43758.5453; return n - Math.floor(n); };
    const noise = (x, z) => { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz); return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix, iz), hash(ix + 1, iz), sx), THREE.MathUtils.lerp(hash(ix, iz + 1), hash(ix + 1, iz + 1), sx), sz); };
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), localZ = pos.getZ(i), z = zCenter + localZ;
      const crest = (noise(x * .023, phase) - .5) * depth * .44;
      const envelope = Math.max(0, 1 - Math.abs((localZ - crest) / (depth * .61))) ** 1.18;
      const broad = .41 + noise(x * .041, phase + 2) * .34;
      const folds = (1 - Math.abs(noise(x * .11 + localZ * .022, z * .08) * 2 - 1)) * .22;
      const crags = (1 - Math.abs(noise(x * .29 + localZ * .05, z * .17) * 2 - 1)) * .085;
      const y = -1.2 + envelope * height * (broad + folds + crags);
      pos.setXYZ(i, x, y, z);
      // Reuse only the image's painted horizon pigment on the physical range.
      // UVs follow elevation and folds, so every ridge retains real parallax.
      const crop = [[.008, .060], [.006, .073], [.004, .051], [.065, .235]][id];
      const elevation = THREE.MathUtils.clamp((y + 1.2) / (height * .84), 0, 1);
      uv.setXY(i, x / width * .88 + .5 + phase * .031 + localZ * .0014, crop[0] + elevation * crop[1] + noise(x * .06, localZ * .08) * .006);
      const mottling = .86 + noise(x * .09 + localZ * .035, z * .06) * .29;
      vertexColors.push(mottling * (id === 0 ? .93 : 1), mottling, mottling * (id === 0 ? 1.10 : id === 2 ? .88 : 1.01));
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3)); g.computeVertexNormals();
    let mat;
    if (skyTextures?.[id]) {
      const map = skyTextures[id].clone(); map.wrapS = THREE.RepeatWrapping; map.wrapT = THREE.ClampToEdgeWrapping; map.repeat.set(1, 1); map.offset.set(0, 0); map.anisotropy = 8; map.needsUpdate = true; textures.add(map);
      mat = material(new THREE.MeshStandardMaterial({ map, color: id === 3 ? '#8fa4a8' : '#ffffff', vertexColors: true, roughness: .92, metalness: 0 }));
    } else mat = coat('rock', colors, .9);
    mat.name = 'distant-pigment-ridge'; mat.userData.pigmentSurface = 'rock'; mat.userData.pigmentDistant = true;
    const obj = mesh(g, mat); obj.name = `mountain-range-${phase}`; obj.castShadow = false; obj.receiveShadow = false;
  }
  if (id === 0) {
    mountainBand(-136, 205, 43, 29, 1.5, ['#3c5275', '#516989', '#6e82a1', '#8292ac']);
    mountainBand(-101, 190, 40, 17, 3.7, ['#2d4663', '#425d79', '#60768d', '#7b8a9d']);
    mountainBand(-77, 180, 28, 8.5, 5.2, ['#253d51', '#3e5669', '#586e7c', '#74848b']);
  } else if (id === 1) {
    mountainBand(-100, 200, 45, 17, 2.6, ['#708f89', '#9caaa0', '#bdc2ad', '#7e9c89']);
    mountainBand(-70, 170, 32, 9, 4.2, ['#54755d', '#728b69', '#8fa17b', '#a7b08a']);
  } else if (id === 2) {
    mountainBand(-124, 205, 48, 32, 3.6, ['#756347', '#988160', '#b5a07d', '#c9b994']);
    mountainBand(-79, 180, 38, 15, 6.2, ['#6a672f', '#8d8040', '#b49b52', '#ccb367']);
  } else {
    mountainBand(-139, 210, 44, 28, 2.2, ['#82949a', '#a7b0b0', '#c2c4bb', '#a9b1aa']);
    mountainBand(-100, 170, 32, 14, 5.9, ['#667d82', '#8b9998', '#abb0a5', '#7f9393']);
  }

  const masonry = coat('architecture', id === 0 ? ['#6c6e6b', '#9b9681', '#b3aa8e', '#d0bf98'] : ['#9f9778', '#bdb390', '#d9cba5', '#bca883'], .52);
  const roofMat = coat('architecture', id === 0 ? ['#263b5c', '#3b5272', '#687489', '#8a8c8c'] : ['#7d775d', '#999274', '#bdb293'], .52);
  const windowMat = material(new THREE.MeshBasicMaterial({ color: '#ffd58b', toneMapped: false }));
  function castleTower(x, z, h, radius, phase = 0) {
    const y = baseHeight(x, z);
    queue('castle-painted-masonry', transform(new THREE.CylinderGeometry(radius * .86, radius, h, 24), x, y + h * .5, z), masonry);
    queue('castle-painted-roofs', transform(new THREE.ConeGeometry(radius * 1.28, radius * 3.1, 24), x, y + h + radius * 1.5, z), roofMat);
    for (const yy of [.8, h * .42, h * .73, h - .18]) queue('castle-painted-masonry', transform(new THREE.TorusGeometry(radius * (.95 - yy / h * .08), .085, 8, 36), x, y + yy, z, Math.PI / 2), masonry);
    for (let j = 0; j < 4; j++) { const a = j * TAU / 4 + phase, xx = x + Math.sin(a) * radius * .94, zz = z + Math.cos(a) * radius * .94; queue('castle-lit-windows', transform(new THREE.PlaneGeometry(.32, .85), xx, y + h * .63, zz, 0, a), windowMat); }
  }
  function archSpan(x, z, width, height, depth, yOffset = 0) {
    const pillar = .57, r = width / 2 - pillar, spring = height * .44;
    const s = new THREE.Shape(); s.moveTo(-width / 2, 0); s.lineTo(-width / 2, height); s.lineTo(width / 2, height); s.lineTo(width / 2, 0); s.lineTo(r, 0); s.lineTo(r, spring); s.absarc(0, spring, r, 0, Math.PI, false); s.lineTo(-r, 0); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: .065, bevelSize: .065, bevelSegments: 3, curveSegments: 20 });
    queue('painted-stone-arches', transform(g, x, baseHeight(x, z) + yOffset, z - depth / 2), masonry);
    queue('painted-stone-arches', transform(new RoundedBoxGeometry(width + .15, .25, depth + .3, 2, .06), x, baseHeight(x, z) + yOffset + height + .06, z), masonry);
  }
  if (id === 0) {
    for (const [dx, dz, h, r] of [[0, 0, 13, 1.7], [-5, 1.5, 8, 1.25], [5, 0, 9.5, 1.25], [-2.5, -3.8, 17, 1.1], [3, -4.3, 14.5, 1.1], [0, -6.5, 20, .9]]) castleTower(40 + dx * .75, -78 + dz * .75, h * .73, r * .70, .2);
    queue('castle-painted-masonry', transform(new RoundedBoxGeometry(6.5, 5, 3.2, 3, .15), 40, baseHeight(40, -80) + 2.7, -80), masonry);
    // A continuous aqueduct crosses the carved lake valley; its footings share
    // one submerged bed and its ends disappear into the opposing wooded banks.
    const bridgeZ = -62, footing = -1.8, deck = 4.2;
    for (let j = 0; j < 7; j++) { const x = -12 + j * 5.6; archSpan(x, bridgeZ, 5.6, deck - footing, 1.8, footing - baseHeight(x, bridgeZ)); }
    for (const x of [-17.5, 28]) {
      const bank = new THREE.SphereGeometry(1, 40, 22), bp = bank.attributes.position;
      for (let v = 0; v < bp.count; v++) { const xx = bp.getX(v), yy = bp.getY(v), zz = bp.getZ(v); bp.setXYZ(v, xx * (1 + .07 * Math.sin(zz * 9)), yy * (1 + .05 * Math.cos(xx * 7)), zz); }
      bank.computeVertexNormals(); queue('bridge-rooted-embankments', transform(bank, x, -.8, bridgeZ, 0, .28, 0, 6.5, 5.5, 8), deep);
      queue('painted-stone-arches', transform(new RoundedBoxGeometry(8, .35, 2.15, 2, .08), x, deck, bridgeZ), masonry);
    }
  } else if (id === 1) {
    for (let j = 0; j < 4; j++) archSpan(17 + j * 4.2, -38, 4.2, 5.1, .7);
  } else if (id === 2) {
    for (let j = 0; j < 3; j++) archSpan(-26 + j * 4.5, -43, 4.5, 6.5, 1.4);
    castleTower(-29, -45, 8, 1.1); castleTower(-14, -45, 6, .85);
  } else {
    for (let j = 0; j < 5; j++) archSpan(16 + j * 3.5, -49, 3.5, 4.7, 1.5);
  }
  flush();
}
