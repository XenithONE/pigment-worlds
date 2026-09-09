import { DataUtils, Vector3 } from 'three';
import { TessellateModifier } from 'three/addons/modifiers/TessellateModifier.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { oilPaintUniform } from './paint-texture.js';

let sourceData, sourceSize, heightField;
function prepareHeight() {
  const { data, width } = oilPaintUniform.value.image;
  if (data === sourceData) return;
  sourceData = data; sourceSize = width;
  heightField = new Float32Array(width * width);
  for (let i = 0; i < heightField.length; i++) heightField[i] = DataUtils.fromHalfFloat(data[i * 4 + 1]);
}
function mirrored(value) {
  const repeat = ((value % 2) + 2) % 2;
  return repeat <= 1 ? repeat : 2 - repeat;
}
function swipe(x, y) {
  x += Math.sin(y * 3.1 + Math.sin(y * .79)) * .038;
  const u = mirrored(x) * (sourceSize - 1), v = mirrored(y) * (sourceSize - 1);
  const x0 = Math.floor(u), y0 = Math.floor(v), x1 = Math.min(x0 + 1, sourceSize - 1), y1 = Math.min(y0 + 1, sourceSize - 1);
  const tx = u - x0, ty = v - y0;
  const a = heightField[y0 * sourceSize + x0] * (1 - tx) + heightField[y0 * sourceSize + x1] * tx;
  const b = heightField[y1 * sourceSize + x0] * (1 - tx) + heightField[y1 * sourceSize + x1] * tx;
  return a * (1 - ty) + b * ty;
}

// Focal rock shelves carry actual relief as well as the material's finer
// bristles. This changes their silhouettes and sun/contact shadows in 3D.
// Flora, distant terrain and architecture retain their own specialised LODs.
export function applySculptedRelief(scene) {
  prepareHeight();
  if (sourceSize < 2) return { dispose() {} };
  const originals = [], modifier = new TessellateModifier(.14, 3), pathModifier = new TessellateModifier(.075, 4), normal = new Vector3();
  scene.traverse(object => {
    if (!object.isMesh || object.isInstancedMesh || !/painted-rock-bodies|stratified-paint-shelves|walkable-paint-ribbon|path-palette-knife-scoops|path-raised-brush-ridges|sculpted-canyon-topography/.test(object.name)) return;
    const path = /walkable-paint-ribbon|path-palette-knife-scoops|path-raised-brush-ridges/.test(object.name);
    const terrain=object.name==='sculpted-canyon-topography';
    const original = object.geometry, geometry = terrain ? original.clone() : (path ? pathModifier : modifier).modify(original);
    const positions = geometry.attributes.position, normals = geometry.attributes.normal;
    for (let i = 0; i < positions.count; i++) {
      normal.fromBufferAttribute(normals, i).normalize();
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      const wx = Math.abs(normal.x) ** 5, wy = Math.abs(normal.y) ** 5, wz = Math.abs(normal.z) ** 5;
      const height = path ? swipe(x * .17, z * .17) : (swipe(z * .26, y * .19) * wx + swipe(x * .26, z * .26) * wy + swipe(x * .26, y * .19) * wz) / Math.max(.0001, wx + wy + wz);
      const amount = path ? Math.max(0, height - .25) * .24 : (height - .48) * (terrain?.24:.19);
      // All path layers share the same vertical paint field, preserving their
      // order while raising real pigment ridges above the walkable substrate.
      positions.setXYZ(i, x + (path ? 0 : normal.x * amount), y + (path ? amount : normal.y * amount), z + (path ? 0 : normal.z * amount));
    }
    // Rebuild shared normals after physical displacement, without artificial
    // UV boundaries: these materials use spatial projection throughout.
    geometry.deleteAttribute('normal');
    geometry.deleteAttribute('uv');
    const sculpted = mergeVertices(geometry, .0001);
    geometry.dispose();
    sculpted.computeVertexNormals(); sculpted.computeBoundingSphere();
    object.geometry = sculpted;
    originals.push([object, original, sculpted]);
  });
  return { dispose() { for (const [object, original, sculpted] of originals) { object.geometry = original; sculpted.dispose(); } } };
}
