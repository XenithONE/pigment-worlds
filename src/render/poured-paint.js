import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';

const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ease = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

function seeded(seed) {
  return () => {
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, seed | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * A closed volume of poured paint, including the portion spread on a shelf.
 * The shelf's front edge is (0, 0, 0): X is width, +Z faces the viewer and -Y
 * hangs downward. The upper spread reaches Z=-.35; the hanging sheet lies near
 * Z=.15. Width/height are metres; intended sizes are .3–1 m by .5–2 m.
 *
 * 2,624 triangles, independent of size. No material, texture or scene mutation.
 */
export function makePouredPaintGeometry(width = .65, height = 1.2, seed = 1) {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new RangeError('Poured paint width and height must be finite positive numbers.');
  }
  const random = seeded(Number.isFinite(seed) ? seed | 0 : 1);
  const foldLimit = width < .45 ? 2 : width < .7 ? 3 : 4;
  const foldCount = 2 + Math.floor(random() * (foldLimit - 1));
  const phases = [random() * TAU, random() * TAU, random() * TAU];
  const folds = Array.from({ length: foldCount }, (_, i) => ({
    center: -.69 + i / (foldCount - 1) * 1.38 + (random() - .5) * .10,
    spread: .20 + random() * .035,
    weight: .72 + random() * .28,
    phase: random() * TAU,
  }));
  const radius = Math.min(.15, height * .24);
  const foldDepth = Math.min(.052, width * .065);
  const nominalThickness = .044 + random() * Math.min(.037, width * .06);
  const spreadDepth = .35;

  function sample(u, s) {
    let y, z, normalY, normalZ, hanging;
    if (s <= .15) {
      // The back of the spread is thinner and gently fan-shaped.
      const t = s / .15;
      y = 0; z = -spreadDepth * (1 - t);
      normalY = 1; normalZ = 0; hanging = 0;
    } else if (s <= .4) {
      const angle = (s - .15) / .25 * Math.PI * .5;
      y = radius * (Math.cos(angle) - 1);
      z = radius * Math.sin(angle);
      normalY = Math.cos(angle); normalZ = Math.sin(angle); hanging = 0;
    } else {
      hanging = (s - .4) / .6;
      const scallop = .055 * Math.sin(u * 5.2 + phases[0])
        + .025 * Math.sin(u * 10.1 + phases[1]);
      // A few uneven, joined lobes replace a mechanically straight lower edge.
      const length = height * (1 + scallop);
      y = -radius - hanging * Math.max(.015, length - radius);
      z = radius + Math.sin(hanging * Math.PI) * .013
        + Math.pow(hanging, 6) * .032;
      normalY = 0; normalZ = 1;
    }
    let ridge = 0;
    for (const fold of folds) {
      const wanderingCenter = fold.center + Math.sin(hanging * 2.3 + fold.phase) * .026 * hanging;
      const distance = (u - wanderingCenter) / fold.spread;
      ridge += Math.exp(-distance * distance * 1.35) * fold.weight;
    }
    // Ridges run down the volume; they do not become thin independent strings.
    const paintedRidge = foldDepth * ridge * ease(s / .32)
      * (.9 + .1 * Math.sin(hanging * 3.2 + phases[1]));
    y += paintedRidge * normalY;
    z += paintedRidge * normalZ;
    const pooled = ease((hanging - .76) / .24);
    const spreadWidth = .93 + .07 * ease(s / .15);
    const outline = 1 + hanging * .025 * Math.sin(hanging * 4.1 + phases[2])
      + pooled * .045 * Math.sin(u * 3.4 + phases[0]);
    const x = u * width * .5 * spreadWidth * outline;
    return new Vector3(x, y, z);
  }

  const columns = 24;
  const rowParameters = [
    ...Array.from({ length: 4 }, (_, i) => i / 3 * .15),
    ...Array.from({ length: 5 }, (_, i) => .15 + (i + 1) / 5 * .25),
    ...Array.from({ length: 12 }, (_, i) => .4 + (i + 1) / 12 * .6),
  ];
  const rows = rowParameters.length - 1, stride = columns + 1;
  const centers = [], surfaceNormals = [], acrossTangents = [], alongTangents = [], halfThicknesses = [];
  const positions = [], uvs = [], indices = [];
  for (let row = 0; row <= rows; row++) {
    const s = rowParameters[row];
    for (let column = 0; column <= columns; column++) {
      const u = column / columns * 2 - 1;
      const center = sample(u, s);
      const across = sample(Math.min(1, u + .001), s).sub(sample(Math.max(-1, u - .001), s)).normalize();
      const along = sample(u, Math.min(1, s + .0001)).sub(sample(u, Math.max(0, s - .0001))).normalize();
      const normal = along.clone().cross(across).normalize();
      const pool = ease((s - .84) / .16);
      const thickness = clamp(nominalThickness * (.9 + .1 * Math.sin(u * 3.1 + phases[2]))
        + pool * .022, .04, .12);
      centers.push(center); surfaceNormals.push(normal);
      acrossTangents.push(across); alongTangents.push(along); halfThicknesses.push(thickness * .5);
    }
  }
  const sheetSize = centers.length;
  for (let face = 0; face < 2; face++) {
    const sign = face === 0 ? 1 : -1;
    for (let i = 0; i < sheetSize; i++) {
      const point = centers[i].clone().addScaledVector(surfaceNormals[i], halfThicknesses[i] * sign);
      positions.push(point.x, point.y, point.z);
      uvs.push(i % stride / columns, rowParameters[Math.floor(i / stride)]);
    }
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      const a = face * sheetSize + row * stride + column, b = a + stride;
      if (face === 0) indices.push(a, b, a + 1, a + 1, b, b + 1);
      else indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }

  // Join front/back with rounded rims. Shared boundary indices make one closed
  // manifold, including the top/back edge, both sides and the uneven pool.
  const perimeter = [];
  for (let x = columns; x >= 0; x--) perimeter.push(x);
  for (let y = 1; y <= rows; y++) perimeter.push(y * stride);
  for (let x = 1; x <= columns; x++) perimeter.push(rows * stride + x);
  for (let y = rows - 1; y >= 1; y--) perimeter.push(y * stride + columns);
  const rimSegments = 4, rings = [perimeter];
  for (let ring = 1; ring < rimSegments; ring++) {
    const angle = ring / rimSegments * Math.PI, ringIndices = [];
    for (const index of perimeter) {
      const x = index % stride, y = Math.floor(index / stride), outside = new Vector3();
      if (x === 0) outside.sub(acrossTangents[index]);
      if (x === columns) outside.add(acrossTangents[index]);
      if (y === 0) outside.sub(alongTangents[index]);
      if (y === rows) outside.add(alongTangents[index]);
      outside.addScaledVector(surfaceNormals[index], -outside.dot(surfaceNormals[index])).normalize();
      const point = centers[index].clone()
        .addScaledVector(surfaceNormals[index], Math.cos(angle) * halfThicknesses[index])
        .addScaledVector(outside, Math.sin(angle) * halfThicknesses[index]);
      ringIndices.push(positions.length / 3);
      positions.push(point.x, point.y, point.z);
      uvs.push(x / columns, rowParameters[y]);
    }
    rings.push(ringIndices);
  }
  rings.push(perimeter.map(index => index + sheetSize));
  for (let ring = 0; ring < rimSegments; ring++) for (let i = 0; i < perimeter.length; i++) {
    const next = (i + 1) % perimeter.length;
    const a = rings[ring][i], b = rings[ring][next], c = rings[ring + 1][i], d = rings[ring + 1][next];
    indices.push(a, c, b, b, c, d);
  }

  const geometry = new BufferGeometry();
  geometry.type = 'PouredPaintGeometry';
  geometry.name = 'Closed poured pigment sheet';
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.parameters = { width, height, seed, folds: foldCount };
  return geometry;
}
