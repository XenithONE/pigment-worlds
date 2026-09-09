const finitePoint = point => Number.isFinite(point?.x) && Number.isFinite(point?.z);

/**
 * Sweep a walking step over a height field, sliding beside steep terrain.
 * All distances are metres; maxSlope is rise/run, not an angle in degrees.
 * This constrains horizontal motion only. The caller samples groundHeight for
 * camera elevation and applies its existing object collision handling.
 * Optional isPositionAllowed(x, z, from) also checks swept/sliding positions.
 * Its third argument is the original pose, allowing an object collision guard
 * to permit moving outward from an already overlapping conservative proxy.
 *
 * Very long input moves are limited to 256 substeps (25.6 m by default), rather
 * than enlarging steps and tunnelling through a cliff. Normal frame movement is
 * several substeps. Non-finite terrain is treated as an impassable boundary.
 */
export function constrainTerrainStep(from, desired, groundHeight, {
  maxSlope = .90,
  maxRise = .22,
  maxDrop = .28,
  stepSize = .10,
  probeRadius = .20,
  skin = .003,
  slideIterations = 3,
  isPositionAllowed = () => true,
} = {}) {
  if (!finitePoint(from) || !finitePoint(desired) || typeof groundHeight !== 'function' || typeof isPositionAllowed !== 'function') throw new TypeError('Terrain movement requires finite points, a groundHeight function and a valid position guard.');
  if (![maxSlope, maxRise, maxDrop, stepSize, probeRadius, skin].every(Number.isFinite) || maxSlope <= 0 || maxRise < 0 || maxDrop < 0 || stepSize <= 0 || probeRadius <= 0 || skin < 0) throw new RangeError('Terrain movement options must be finite positive distances and slope limits.');
  const dx = desired.x - from.x, dz = desired.z - from.z, length = Math.hypot(dx, dz);
  if (length < 1e-10) return { x: from.x, z: from.z };
  const increment = Math.min(.25, stepSize), count = Math.min(256, Math.ceil(length / increment));
  const travelledLength = Math.min(length, increment * count), stepX = dx / length * travelledLength / count, stepZ = dz / length * travelledLength / count;
  const iterations = Math.max(1, Math.min(5, Number.isFinite(slideIterations) ? Math.floor(slideIterations) : 3));
  let x = from.x, z = from.z;

  function sample(px, pz) {
    const height = groundHeight(px, pz);
    if (!Number.isFinite(height)) return { x: px, z: pz, height, gx: 0, gz: 0, slope: Infinity, valid: false };
    const east = groundHeight(px + probeRadius, pz), west = groundHeight(px - probeRadius, pz);
    const north = groundHeight(px, pz + probeRadius), south = groundHeight(px, pz - probeRadius);
    if (![east, west, north, south].every(Number.isFinite)) return { x: px, z: pz, height, gx: 0, gz: 0, slope: Infinity, valid: false };
    const gx = (east - west) / (probeRadius * 2), gz = (north - south) / (probeRadius * 2);
    return { x: px, z: pz, height, gx, gz, slope: Math.hypot(gx, gz), valid: true };
  }
  function acceptable(value, origin) {
    if (!value.valid || !isPositionAllowed(value.x, value.z, from) || value.height - origin.height > maxRise + 1e-9 || origin.height - value.height > maxDrop + 1e-9) return false;
    // A restored pose on a steep patch can move towards gentler ground. A safe
    // pose cannot enter terrain steeper than the configured walkable slope.
    return value.slope <= Math.max(maxSlope, origin.slope) + 1e-7;
  }
  function inspectStep(px, pz, mx, mz, origin) {
    const end = sample(px + mx, pz + mz);
    if (!acceptable(end, origin)) return { allowed: false, blocked: end };
    const middle = sample(px + mx * .5, pz + mz * .5);
    return { allowed: acceptable(middle, origin), blocked: middle };
  }

  for (let step = 0; step < count; step++) {
    const beforeX = x, beforeZ = z;
    let mx = stepX, mz = stepZ;
    for (let iteration = 0; iteration < iterations; iteration++) {
      const distance = Math.hypot(mx, mz); if (distance < 1e-8) break;
      const origin = sample(x, z); if (!Number.isFinite(origin.height)) return { x, z };
      // A non-finite neighbour makes the footprint unsafe: let a move back to
      // fully finite terrain recover, while still respecting rise/drop limits.
      if (!origin.valid) origin.slope = maxSlope;
      const inspected = inspectStep(x, z, mx, mz, origin);
      if (inspected.allowed) { x += mx; z += mz; break; }

      let low = 0, high = 1, contact = inspected.blocked;
      for (let search = 0; search < 8; search++) {
        const fraction = (low + high) * .5;
        const checked = inspectStep(x, z, mx * fraction, mz * fraction, origin);
        if (checked.allowed) low = fraction;
        else { high = fraction; contact = checked.blocked; }
      }
      const safeFraction = Math.max(0, low - skin / distance);
      x += mx * safeFraction; z += mz * safeFraction;
      mx *= 1 - safeFraction; mz *= 1 - safeFraction;
      const magnitude = Math.hypot(contact.gx, contact.gz);
      if (!contact.valid || magnitude < 1e-8) break;
      let nx = contact.gx / magnitude, nz = contact.gz / magnitude;
      if (mx * nx + mz * nz > 0) { nx = -nx; nz = -nz; }
      const into = Math.min(0, mx * nx + mz * nz);
      mx -= nx * into; mz -= nz * into;
    }
    if (Math.hypot(x - beforeX, z - beforeZ) < 1e-8) break;
  }
  return { x, z };
}
