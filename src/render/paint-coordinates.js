// Adopted after the v15 scene comparison. Colour and height must use every
// tap below with identical weights; never map only one of the two atlases.
export const PAINT_COORDINATE_SETTINGS = Object.freeze({
  gridScale: 2.75,
  patchScale: .30,
  centreMin: .32,
  centreRange: .36,
  maxRotation: Math.PI / 22.5, // ±8 degrees; no mirrored or reversed strokes.
});

const ROOT3 = Math.sqrt(3), HALF_ROOT3 = ROOT3 * .5;
const unit24 = value => (value & 0xffffff) / 16777216;
function hash(x, y, salt) {
  let h = (Math.imul(x | 0, 0x9e3779b9) ^ Math.imul(y | 0, 0x85ebca6b) ^ salt) >>> 0;
  h = Math.imul(h ^ h >>> 16, 0x7feb352d) >>> 0;
  h = Math.imul(h ^ h >>> 15, 0x846ca68b) >>> 0;
  return (h ^ h >>> 16) >>> 0;
}

function patch(px, py, ix, iy, output, offset) {
  const settings = PAINT_COORDINATE_SETTINGS;
  const cx = settings.centreMin + unit24(hash(ix, iy, 0x68bc21eb)) * settings.centreRange;
  const cy = settings.centreMin + unit24(hash(ix, iy, 0x02e5be93)) * settings.centreRange;
  const angle = (unit24(hash(ix, iy, 0x967a889b)) * 2 - 1) * settings.maxRotation;
  const dx = px - (ix + iy * .5), dy = py - iy * HALF_ROOT3;
  const cosine = Math.cos(angle), sine = Math.sin(angle);
  output[offset] = cx + (cosine * dx - sine * dy) * settings.patchScale;
  output[offset + 1] = cy + (sine * dx + cosine * dy) * settings.patchScale;
}

/**
 * Fill [u0,v0,w0,u1,v1,w1,u2,v2,w2] for a point in unwrapped paint space.
 * Reuse `output` inside geometry loops to avoid per-vertex allocations. Apply
 * any shared flow bend BEFORE calling this function on both CPU and GPU.
 * Three atlas-interior samples blend on an equilateral triangular lattice.
 * The field is C0 across triangle edges, not guaranteed C1. All UVs stay in
 * [0.02,0.98] mathematically, so MirroredRepeat textures never reach a seam.
 */
export function paintCoordinates(x, y, output = new Float64Array(9)) {
  const px = x * PAINT_COORDINATE_SETTINGS.gridScale;
  const py = y * PAINT_COORDINATE_SETTINGS.gridScale;
  const a = px - py / ROOT3, b = py * 2 / ROOT3;
  const ix = Math.floor(a), iy = Math.floor(b), fx = a - ix, fy = b - iy;
  let w0, w1, w2;
  if (fx + fy <= 1) {
    w0 = 1 - fx - fy; w1 = fx; w2 = fy;
    patch(px, py, ix, iy, output, 0);
    patch(px, py, ix + 1, iy, output, 3);
    patch(px, py, ix, iy + 1, output, 6);
  } else {
    w0 = fx + fy - 1; w1 = 1 - fx; w2 = 1 - fy;
    patch(px, py, ix + 1, iy + 1, output, 0);
    patch(px, py, ix, iy + 1, output, 3);
    patch(px, py, ix + 1, iy, output, 6);
  }
  // Sharpen only the shared scalar weights, preserving a dominant pigment
  // patch over most of each triangle. Equal three-way mixing remains at its
  // centre; this can reduce contrast and needs actual-scene visual approval.
  w0 *= w0; w0 *= w0; w1 *= w1; w1 *= w1; w2 *= w2; w2 *= w2;
  const sum = w0 + w1 + w2;
  output[2] = w0 / sum; output[5] = w1 / sum; output[8] = w2 / sum;
  return output;
}

const float = n => Number(n).toPrecision(16);
/** Requires WebGL2/GLSL ES 3 uint support (the project's Three.js renderer). */
export const PAINT_COORDINATES_GLSL = /* glsl */`
const float paintGridScale = ${float(PAINT_COORDINATE_SETTINGS.gridScale)};
const float paintPatchScale = ${float(PAINT_COORDINATE_SETTINGS.patchScale)};
const float paintRoot3 = ${float(ROOT3)};
const float paintHalfRoot3 = ${float(HALF_ROOT3)};

uint paintPatchHash(ivec2 cell, uint salt) {
  uint h = uint(cell.x) * 0x9e3779b9u ^ uint(cell.y) * 0x85ebca6bu ^ salt;
  h = (h ^ (h >> 16u)) * 0x7feb352du;
  h = (h ^ (h >> 15u)) * 0x846ca68bu;
  return h ^ (h >> 16u);
}
float paintPatchUnit(ivec2 cell, uint salt) {
  return float(paintPatchHash(cell, salt) & 0x00ffffffu) * (1.0 / 16777216.0);
}
void paintPatchMapping(vec2 p, ivec2 cell, out vec2 uv, out mat2 jacobian) {
  vec2 centre = vec2(paintPatchUnit(cell, 0x68bc21ebu), paintPatchUnit(cell, 0x02e5be93u));
  centre = vec2(${float(PAINT_COORDINATE_SETTINGS.centreMin)}) + centre * ${float(PAINT_COORDINATE_SETTINGS.centreRange)};
  float angle = (paintPatchUnit(cell, 0x967a889bu) * 2.0 - 1.0) * ${float(PAINT_COORDINATE_SETTINGS.maxRotation)};
  vec2 delta = p - vec2(float(cell.x) + float(cell.y) * 0.5, float(cell.y) * paintHalfRoot3);
  float c = cos(angle), s = sin(angle);
  uv = centre + vec2(c * delta.x - s * delta.y, s * delta.x + c * delta.y) * paintPatchScale;
  jacobian = mat2(c, s, -s, c) * (paintPatchScale * paintGridScale);
}
// Explicit Jacobians avoid false implicit texture LOD when tap identities
// switch across a triangle boundary. Supply J*dFdx(p), J*dFdy(p) to textureGrad.
void paintCoordinates(vec2 p, out vec2 uv0, out vec2 uv1, out vec2 uv2, out vec3 weights, out mat2 j0, out mat2 j1, out mat2 j2) {
  vec2 q = p * paintGridScale;
  vec2 skew = vec2(q.x - q.y / paintRoot3, q.y * 2.0 / paintRoot3);
  ivec2 cell = ivec2(floor(skew));
  vec2 f = fract(skew);
  if (f.x + f.y <= 1.0) {
    weights = vec3(1.0 - f.x - f.y, f.x, f.y);
    paintPatchMapping(q, cell, uv0, j0);
    paintPatchMapping(q, cell + ivec2(1, 0), uv1, j1);
    paintPatchMapping(q, cell + ivec2(0, 1), uv2, j2);
  } else {
    weights = vec3(f.x + f.y - 1.0, 1.0 - f.x, 1.0 - f.y);
    paintPatchMapping(q, cell + ivec2(1, 1), uv0, j0);
    paintPatchMapping(q, cell + ivec2(0, 1), uv1, j1);
    paintPatchMapping(q, cell + ivec2(1, 0), uv2, j2);
  }
  weights *= weights;
  weights *= weights;
  weights /= weights.x + weights.y + weights.z;
}
void paintCoordinates(vec2 p, out vec2 uv0, out vec2 uv1, out vec2 uv2, out vec3 weights) {
  mat2 j0, j1, j2;
  paintCoordinates(p, uv0, uv1, uv2, weights, j0, j1, j2);
}
`;
