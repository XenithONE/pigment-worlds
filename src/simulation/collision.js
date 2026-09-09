// The landscape is static. A swept circle keeps the walking camera out of
// substantial paint masses while allowing it to slide along their contours.
export function slideAroundPaint(from, desired, obstacles = [], playerRadius = .26) {
  let x = from.x, z = from.z;
  let dx = desired.x - x, dz = desired.z - z;
  for (let iteration = 0; iteration < 3; iteration++) {
    const length2 = dx * dx + dz * dz;
    if (length2 < 1e-10) break;
    let nearest = null, fraction = 1;
    for (const obstacle of obstacles) {
      const radius = obstacle.radius + playerRadius;
      const ox = x - obstacle.x, oz = z - obstacle.z;
      const b = ox * dx + oz * dz, c = ox * ox + oz * oz - radius * radius;
      if (c < 0) {
        // Entering a world or a restored pose may place a camera just inside a
        // conservative proxy. Allow movement away instead of trapping it.
        if (b >= 0) continue;
        const length = Math.hypot(ox, oz) || 1;
        nearest = { nx: ox / length, nz: oz / length }; fraction = 0;
        continue;
      }
      const discriminant = b * b - length2 * c;
      if (b >= 0 || discriminant < 0) continue;
      const t = (-b - Math.sqrt(discriminant)) / length2;
      if (t >= 0 && t < fraction) {
        fraction = t;
        nearest = { nx: (ox + dx * t) / radius, nz: (oz + dz * t) / radius };
      }
    }
    if (!nearest) { x += dx; z += dz; break; }
    const safeFraction = Math.max(0, fraction - .001);
    x += dx * safeFraction; z += dz * safeFraction;
    dx *= 1 - fraction; dz *= 1 - fraction;
    const into = Math.min(0, dx * nearest.nx + dz * nearest.nz);
    dx -= nearest.nx * into; dz -= nearest.nz * into;
  }
  return { x, z };
}
