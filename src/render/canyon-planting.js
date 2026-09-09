import { addPigmentCypresses } from './pigment-cypress.js';
import { canyonEdge, canyonRiverX, canyonRiverContains, canyonHeight } from './sculpted-canyon.js';

const TAU = Math.PI * 2;
const SEED = 58193;
const randomSource = seed => () => {
  seed = seed + 0x6D2B79F5 | 0;
  let value = Math.imul(seed ^ seed >>> 15, seed | 1);
  value ^= value + Math.imul(value ^ value >>> 7, value | 61);
  return ((value ^ value >>> 14) >>> 0) / 4294967296;
};

// Circumcircles of the actual high-detail geometry with seed 58193. The small
// margin also covers the different sampling of the two lower detail levels.
// Offsets rotate with each instance; a shrub is not treated as a thin trunk.
const footprints = [
  { x: -.01054, z: .10164, radius: 1.125, height: 1.42 },
  { x: -.06343, z: .01557, radius: .825, height: 2.165 },
  { x: -.06175, z: .01812, radius: .945, height: 7.24 },
];
const spawn = { x: -3.5, z: 15 };

function slopeAt(height, x, z) {
  const e = .24;
  const dx = (height(x + e, z) - height(x - e, z)) / (e * 2);
  const dz = (height(x, z + e) - height(x, z - e)) / (e * 2);
  return Math.hypot(dx, dz);
}

/** Pure placement plan, also exported so terrain and route clearance can be audited without a renderer. */
export function planCanyonPlanting({ pathX, baseHeight = canyonHeight, isPond = canyonRiverContains, clearings = [] } = {}) {
  if (typeof pathX !== 'function' || typeof baseHeight !== 'function' || typeof isPond !== 'function' || !Array.isArray(clearings)) throw new TypeError('Canyon planting requires terrain functions and an array of clearings.');
  const protectedPoints = clearings.map(point => Array.isArray(point) ? { x: point[0], z: point.length > 2 ? point[2] : point[1] } : { x: point.x, z: point.z });
  if (protectedPoints.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.z))) throw new TypeError('Canyon clearings need finite X/Z coordinates.');
  protectedPoints.push({ x: 7, z: -8 });
  const random = randomSource(946281), instances = [], obstacles = [], records = [];
  const counts = { far: 0, right: 0, foreground: 0 };

  function place(x, z, variant, scale, yaw, zone) {
    const footprint = footprints[variant], cosine = Math.cos(yaw), sine = Math.sin(yaw);
    const cx = x + scale * (footprint.x * cosine + footprint.z * sine);
    const cz = z + scale * (-footprint.x * sine + footprint.z * cosine);
    const radius = footprint.radius * scale;
    if (!Number.isFinite(x) || !Number.isFinite(z) || Math.abs(x) > 74 || z < -101 || z > 35) return false;
    const far = zone === 'far';
    if (far && cx + radius > canyonRiverX(cz) - 10.2) return false;
    if (!far && cx - radius < canyonEdge(cz) + 1.9) return false;
    if (!far) {
      if (Math.abs(cx - pathX(cz)) < 4 + radius) return false;
      if (Math.hypot(cx - spawn.x, cz - spawn.z) < 8 + radius) return false;
      if (protectedPoints.some(point => Math.hypot(cx - point.x, cz - point.z) < 4 + radius)) return false;
      // Keep the whole left sightline from the start toward the painted river
      // and hero tree open. Foreground accents occupy the right margin only.
      if (zone === 'foreground' && cx < pathX(cz) + 5) return false;
    }
    if (records.some(other => Math.hypot(cx - other.x, cz - other.z) < (radius + other.radius) * .78)) return false;

    let highest = -Infinity, lowest = Infinity, maxSlope = 0;
    for (let sample = 0; sample < 9; sample++) {
      const a = (sample - 1) / 8 * TAU, r = sample === 0 ? 0 : radius;
      const px = cx + Math.cos(a) * r, pz = cz + Math.sin(a) * r;
      const h = baseHeight(px, pz), slope = slopeAt(baseHeight, px, pz);
      if (!Number.isFinite(h) || !Number.isFinite(slope) || slope > .8 || isPond(px, pz)) return false;
      if (!far && Math.abs(px - pathX(pz)) < 4) return false;
      highest = Math.max(highest, h); lowest = Math.min(lowest, h); maxSlope = Math.max(maxSlope, slope);
    }
    // Embed the feet in the low side of the terrace instead of leaving them
    // suspended on a slope. Large relief changes are unsuitable for shrubs.
    if (highest - lowest > (variant === 2 ? .72 : .43) * scale) return false;
    const y = lowest + .02;
    instances.push({ position: [x, y, z], variant, scale, yaw });
    records.push({ x: cx, z: cz, radius, zone, maxSlope, relief: highest - lowest });
    counts[zone]++;
    if (!far) obstacles.push({ x: cx, z: cz, radius });
    return true;
  }

  function scatter(zone, anchor, quota) {
    let accepted = 0;
    for (let attempt = 0; attempt < 420 && accepted < quota; attempt++) {
      const a = random() * TAU, r = Math.sqrt(random());
      const x = anchor.x + Math.cos(a) * r * anchor.width;
      const z = anchor.z + Math.sin(a) * r * anchor.depth;
      const variant = random() < (zone === 'far' ? .60 : .52) ? 2 : random() < .57 ? 0 : 1;
      const scale = .55 + random() * .65, yaw = random() * TAU;
      if (place(x, z, variant, scale, yaw, zone)) accepted++;
    }
  }
  // Loose groves occupy different terrace depths, so they overlap in the
  // view without forming equally spaced rows along either canyon rim.
  [19, 8, -11, -29, -45, -58, -74, -91].forEach((z, index) => {
    const x = canyonRiverX(z) - 13.0 - (index % 3) * 1.35;
    scatter('far', { x, z, width: 3.8 + index % 2, depth: 5.3 }, index % 2 ? 10 : 9);
  });
  [8, -4, -26, -38, -64, -78].forEach((z, index) => {
    scatter('right', { x: 27.0 + (index % 3) * 2.1, z, width: 3.3, depth: 7.8 }, index < 4 ? 8 : 7);
  });

  // Fill only where the continuous field genuinely supports a planted grove.
  // These fallback samples preserve the same deterministic order and limits.
  for (const [zone, target] of [['far', 76], ['right', 46]]) {
    for (let attempt = 0; attempt < 3200 && counts[zone] < target; attempt++) {
      const z = 27 - random() * 124;
      const x = zone === 'far' ? canyonRiverX(z) - 11.6 - random() * 8.2 : 24.8 + random() * 10.3;
      const variant = random() < .58 ? 2 : random() < .5 ? 0 : 1;
      place(x, z, variant, .55 + random() * .65, random() * TAU, zone);
    }
  }
  // Ten small foreground clumps anchor blank margins while leaving the route,
  // pickup clearings, portal and initial photo opening completely available.
  for (let attempt = 0; attempt < 2000 && counts.foreground < 10; attempt++) {
    const z = 18 - random() * 49;
    const x = pathX(z) + 5.5 + random() * 6.4;
    place(x, z, random() < .72 ? 0 : 1, .55 + random() * .34, random() * TAU, 'foreground');
  }
  return { instances, obstacles, records, counts };
}

export function addCanyonPlanting(scene, options) {
  const plan = planCanyonPlanting(options);
  const plants = addPigmentCypresses(scene, { instances: plan.instances, seed: SEED });
  plants.group.name = 'Canyon — dark cypress terrace groves';
  plants.group.userData.plantingCounts = plan.counts;
  return { group: plants.group, obstacles: plan.obstacles, update: plants.update, dispose: plants.dispose };
}
