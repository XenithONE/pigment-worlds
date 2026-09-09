import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Small coastal vessels remain physical scenery: rounded hull, cambered sails,
// deck furniture and rigging are visible from every side of the headland.
export function addPaintedVessels({ scene, mesh, painted, material, tube, mergeParts, animated, reducedMotion }) {
  const hullMat = painted(['#354b54', '#53686a', '#87918a', '#acaa8d'], .51);
  const trimMat = painted(['#766247', '#a5895c', '#d0b583', '#e6ce9f'], .49);
  const sailMat = painted(['#c7c4af', '#e0d8bd', '#efdec3', '#a8b8b8'], .67);
  const ropeMat = material(new THREE.MeshStandardMaterial({ color: '#7e7f71', roughness: .7 }));
  for (const mat of [hullMat, trimMat, sailMat, ropeMat]) mat.userData.pigmentSurface = 'architecture';
  hullMat.name = 'painted-vessel-hull'; sailMat.name = 'painted-cambered-sail'; trimMat.name = 'painted-vessel-deck';

  const vec = values => new THREE.Vector3(...values);
  function hullGeometry(deck = false) {
    const rows = 40, cols = deck ? 10 : 20, positions = [], uvs = [], indices = [];
    for (let row = 0; row <= rows; row++) {
      const t = row / rows, x = (t - .5) * 9.6, width = Math.max(.015, Math.sin(Math.PI * t) ** .66 * 1.42) * (.82 + t * .3);
      const sheer = .55 + .43 * Math.abs(t * 2 - 1) ** 3 + .14 * (1 - t);
      for (let col = 0; col <= cols; col++) {
        const v = col / cols, angle = v * Math.PI;
        const z = deck ? (v * 2 - 1) * width : Math.cos(angle) * width;
        const y = deck ? sheer + .018 - .045 * (v * 2 - 1) ** 2 : sheer - Math.sin(angle) ** .71 * (1.30 + .15 * Math.sin(Math.PI * t));
        positions.push(x, y, z); uvs.push(t, v);
        if (row < rows && col < cols) { const i = row * (cols + 1) + col; indices.push(i, i + 1, i + cols + 1, i + 1, i + cols + 2, i + cols + 1); }
      }
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
  }
  function addSail(group, corners, fullness, phase) {
    const [a, b, c] = corners.map(vec), rows = 24, points = [], uvs = [], indices = [], lookup = [];
    const sample = (u, v, face = 0) => {
      const w = 1 - u - v, point = a.clone().multiplyScalar(w).addScaledVector(b, u).addScaledVector(c, v);
      const swelling = Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * Math.sin(Math.PI * w);
      point.z += fullness * swelling + .023 * Math.sin((u + v * .5) * 47 + phase) * swelling + face * .025;
      return point;
    };
    for (let face = 0; face < 2; face++) {
      const side = [];
      for (let row = 0; row <= rows; row++) {
        side[row] = [];
        for (let col = 0; col <= rows - row; col++) {
          side[row][col] = points.length / 3;
          const point = sample(row / rows, col / rows, face ? -1 : 1); points.push(point.x, point.y, point.z); uvs.push(row / rows, col / rows);
        }
      }
      lookup.push(side);
      for (let row = 0; row < rows; row++) for (let col = 0; col < rows - row; col++) {
        const triangle = [side[row][col], side[row + 1][col], side[row][col + 1]];
        indices.push(...(face ? triangle : triangle.reverse()));
        if (col < rows - row - 1) { const other = [side[row + 1][col], side[row + 1][col + 1], side[row][col + 1]]; indices.push(...(face ? other : other.reverse())); }
      }
    }
    const boundary = [];
    for (let i = 0; i < rows; i++) boundary.push([0, i]);
    for (let i = 0; i < rows; i++) boundary.push([i, rows - i]);
    for (let i = rows; i > 0; i--) boundary.push([i, 0]);
    for (let i = 0; i < boundary.length; i++) {
      const [r1, c1] = boundary[i], [r2, c2] = boundary[(i + 1) % boundary.length];
      const a0 = lookup[0][r1][c1], b0 = lookup[0][r2][c2], a1 = lookup[1][r1][c1], b1 = lookup[1][r2][c2]; indices.push(a0, a1, b0, b0, a1, b1);
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices); geometry.computeVertexNormals(); mesh(geometry, sailMat, group);
    for (const [start, end] of [[a, b], [b, c], [c, a]]) mesh(tube([start.toArray(), start.clone().lerp(end, .5).toArray(), end.toArray()], .023, 20, 6), trimMat, group);
    for (const v of [.18, .37, .57, .77]) {
      const seam = []; for (let j = 0; j <= 16; j++) seam.push(sample(j / 16 * (1 - v), v, 1.25).toArray());
      mesh(tube(seam, .007, 18, 5), trimMat, group);
    }
  }

  for (const [index, [x, z, scale, yaw]] of [[-34, -37, 1, -.19], [-53, -68, .75, .36], [-63, -21, .57, -.50]].entries()) {
    const group = new THREE.Group(); group.name = `painted-coastal-vessel-${index}`; group.position.set(x, -1.65, z); group.scale.setScalar(scale); group.rotation.y = yaw; scene.add(group);
    mesh(hullGeometry(), hullMat, group); mesh(hullGeometry(true), trimMat, group);
    const cabin = mesh(new RoundedBoxGeometry(2.1, .8, 1.48, 3, .12), sailMat, group); cabin.position.set(1.9, 1.05, 0);
    for (const sign of [-1, 1]) {
      const gunwale = [];
      for (let j = 0; j <= 32; j++) { const t = j / 32, width = Math.max(.015, Math.sin(Math.PI * t) ** .66 * 1.42) * (.82 + t * .3); gunwale.push([(t - .5) * 9.6, .60 + .43 * Math.abs(t * 2 - 1) ** 3 + .14 * (1 - t), sign * width]); }
      mesh(tube(gunwale, .073, 40, 7), trimMat, group);
      for (let j = 0; j < 3; j++) { const window = mesh(new RoundedBoxGeometry(.34, .29, .06, 2, .06), hullMat, group); window.position.set(1.25 + j * .57, 1.13, sign * .754); }
    }
    const mast = mesh(new THREE.CylinderGeometry(.065, .14, 10.7, 12), trimMat, group); mast.position.set(-.6, 5.54, 0);
    mesh(tube([[-4.2, .85, 0], [-5.0, 1.12, 0], [-5.8, 1.42, 0]], .065, 8, 8), trimMat, group);
    mesh(tube([[-.5, 1.28, 0], [1.5, 1.47, .02], [3.9, 1.8, 0]], .066, 10, 8), trimMat, group);
    addSail(group, [[-.46, 1.4, .03], [-.46, 10.35, .03], [3.78, 1.84, .03]], 1.62, index);
    addSail(group, [[-.80, 1.8, -.04], [-.80, 9.6, -.04], [-4.75, 1.42, -.04]], -1.0, index + 2);
    const rigging = [[[-.6, 10.8, 0], [-5.75, 1.43, 0]], [[-.6, 10.8, 0], [4.2, .9, 0]], [[-.6, 8.8, 0], [-.2, .6, -1.25]], [[-.6, 8.8, 0], [-.2, .6, 1.25]], [[-.6, 7.0, 0], [-2.2, .65, -1.18]], [[-.6, 7.0, 0], [-2.2, .65, 1.18]]];
    for (const [a, b] of rigging) { const mid = vec(a).lerp(vec(b), .5); mid.z += .035; mesh(tube([a, mid.toArray(), b], .015, 14, 5), ropeMat, group); }
    for (const z of [-.8, .8]) { const cleat = mesh(new RoundedBoxGeometry(.48, .12, .12, 2, .04), hullMat, group); cleat.position.set(-2.8, .82, z); }
    const partsByMaterial = new Map();
    for (const child of [...group.children]) {
      child.updateMatrix();
      if (!partsByMaterial.has(child.material)) partsByMaterial.set(child.material, []);
      partsByMaterial.get(child.material).push(child.geometry.clone().applyMatrix4(child.matrix)); group.remove(child);
    }
    for (const [mat, parts] of partsByMaterial) mergeParts(parts, mat, group);
    animated.push(time => { if (reducedMotion()) return; group.rotation.z = Math.sin(time * .35 + index * 2) * .012; group.position.y = -1.65 + Math.sin(time * .45 + index) * .035; });
  }
}
