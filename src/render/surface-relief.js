import { DataUtils, Vector3 } from 'three';
import { TessellateModifier } from 'three/addons/modifiers/TessellateModifier.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { oilPaintUniform } from './paint-texture.js';
import { paintCoordinates } from './paint-coordinates.js';

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
function sampleHeight(x, y) {
  const u = mirrored(x) * sourceSize - .5, v = mirrored(y) * sourceSize - .5;
  const ix = Math.floor(u), iy = Math.floor(v), tx = u - ix, ty = v - iy;
  const clamp = n => Math.max(0, Math.min(sourceSize - 1, n));
  const x0 = clamp(ix), y0 = clamp(iy), x1 = clamp(ix + 1), y1 = clamp(iy + 1);
  const a = heightField[y0 * sourceSize + x0] * (1 - tx) + heightField[y0 * sourceSize + x1] * tx;
  const b = heightField[y1 * sourceSize + x0] * (1 - tx) + heightField[y1 * sourceSize + x1] * tx;
  return a * (1 - ty) + b * ty;
}
const coordinateTaps = new Float64Array(9);
function swipe(x,y,stochastic) {
  x += Math.sin(y * 3.1 + Math.sin(y * .79)) * .038;
  if(!stochastic)return sampleHeight(x,y);
  paintCoordinates(x,y,coordinateTaps);
  let height=0;
  for(let i=0;i<9;i+=3)height+=sampleHeight(coordinateTaps[i],coordinateTaps[i+1])*coordinateTaps[i+2];
  return height;
}

// Focal rock shelves carry actual relief as well as the material's finer
// bristles. This changes their silhouettes and sun/contact shadows in 3D.
// Flora, distant terrain and architecture retain their own specialised LODs.
export function applySculptedRelief(scene, { richPigment = false, stochasticPigment = false } = {}) {
  prepareHeight();
  if (sourceSize < 2) return { dispose() {} };
  const originals = [], modifier = new TessellateModifier(.14, 3), pathModifier = new TessellateModifier(.075, 4), normal = new Vector3();
  scene.traverse(object => {
    const canyonFace = richPigment && /canyon-(near|far)-continuous-paint-face/.test(object.name);
    if (!object.isMesh || object.isInstancedMesh || (!canyonFace && !/painted-rock-bodies|stratified-paint-shelves|walkable-paint-ribbon|path-palette-knife-scoops|path-raised-brush-ridges|sculpted-canyon-topography/.test(object.name))) return;
    const path = /walkable-paint-ribbon|path-palette-knife-scoops|path-raised-brush-ridges/.test(object.name);
    const terrain=object.name==='sculpted-canyon-topography', canyon=terrain||canyonFace;
    const original = object.geometry, geometry = canyon ? original.clone() : (path ? pathModifier : modifier).modify(original);
    const positions = geometry.attributes.position, normals = geometry.attributes.normal;
    // The painted coordinates belong to the substrate before any deposition.
    // Retain them through welding so albedo and fine relief follow the same
    // field as the displaced vertices, including the triplanar weights.
    geometry.setAttribute('oilRestPosition', positions.clone());
    geometry.setAttribute('oilRestNormal', normals.clone());
    for (let i = 0; i < positions.count; i++) {
      normal.fromBufferAttribute(normals, i).normalize();
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      const wx = Math.abs(normal.x) ** 5, wy = Math.abs(normal.y) ** 5, wz = Math.abs(normal.z) ** 5;
      const scaleXZ = richPigment ? (path ? .32 : canyon ? .14 : .30) : path ? .17 : terrain ? .45 : .26;
      const scaleY = richPigment ? (canyon ? .125 : .23) : terrain ? .32 : .19;
      const height = path ? swipe(x * scaleXZ, z * scaleXZ, stochasticPigment) : (swipe(z * scaleXZ, y * scaleY, stochasticPigment) * wx + swipe(x * scaleXZ, z * scaleXZ, stochasticPigment) * wy + swipe(x * scaleXZ, y * scaleY, stochasticPigment) * wz) / Math.max(.0001, wx + wy + wz);
      // A bank's upper and lower joins stay attached to their surrounding
      // terrain; its middle carries deeper deposited paint geometry.
      const u = canyonFace ? geometry.attributes.uv.getX(i) : .5;
      const smoothEdge = t => { t = Math.max(0, Math.min(1, t / .1)); return t * t * (3 - 2 * t); };
      const edge = canyonFace ? smoothEdge(u) * smoothEdge(1 - u) : 1;
      const amount = path ? Math.max(0, height - .25) * (richPigment ? .15 : .24)
        : canyonFace ? Math.max(0,height-.18)*1.45*edge : (height-.48)*(terrain?.55:.19);
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
