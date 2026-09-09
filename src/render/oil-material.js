import { Color, MeshPhysicalMaterial, MeshStandardMaterial, SRGBColorSpace, Vector3 } from 'three';
import { oilPaintReadyUniform, oilPaintUniform, oilPigmentUniform } from './paint-texture.js';
export { loadOilPaintTexture } from './paint-texture.js';

// Coordinates belong to the undeformed object, not the screen or camera.
// Instanced leaves retain their local Y brush direction and a stable offset;
// merged scenery retains its baked object positions. No UVs are required.
const pigmentFunctions = /* glsl */`
varying vec3 vOilPosition;
varying vec3 vOilRestNormal;
uniform sampler2D uOilPaint;
uniform sampler2D uOilPigmentAtlas;
uniform float uOilPaintReady;
uniform vec3 uOilScale;
uniform float uOilDepth;
uniform float uOilPigment;
uniform vec3 uOilColorWeights;
uniform float uOilFold;
uniform float uOilLeafValue;

vec4 oilSwipe(vec2 p, out vec3 paintedColor) {
  float bend = sin(p.y * 3.1 + sin(p.y * .79)) * .038;
  vec2 q = vec2(p.x + bend, p.y);
  vec3 relief = texture2D(uOilPaint, q).rgb;
  paintedColor = texture2D(uOilPigmentAtlas, q).rgb;
  float phase = (p.x + bend * 1.6) * 19.0 + sin(p.y * 2.1) * .42;
  float fold = pow(.5 + .5 * sin(phase), 2.2);
  float macro = sin(p.y * 2.2 + sin(p.x * 1.7)) * .055;
  float broad = mix(.45 + fold * .22, relief.g, uOilPaintReady);
  float meso = mix(broad, relief.r, uOilPaintReady);
  float footprint = max(length(dFdx(q)), length(dFdy(q)));
  float nearDetail = 1. - smoothstep(.004, .022, footprint);
  float height = broad * .75 + meso * .25 + fold * .065 + macro;
  height = mix(broad + fold * .05, height, nearDetail * .6 + .4);
  float groove = relief.b * nearDetail;
  float mixture = .5 + .5 * sin(phase * .31 + broad * 4.1 + sin(p.y * 1.3));
  return vec4(height, broad, groove, mixture);
}

vec4 oilSurface(vec3 p, vec3 n, out vec3 paintedColor) {
  vec3 weight = pow(abs(n), vec3(5.));
  weight /= max(.0001, weight.x + weight.y + weight.z);
  // Vertical faces flow along Y; horizontal faces along Z. Differentiating
  // after triplanar blending gives continuous normals without tangent seams.
  vec3 colorX, colorY, colorZ;
  vec4 surfaceX = oilSwipe(p.zy, colorX);
  vec4 surfaceY = oilSwipe(p.xz, colorY);
  vec4 surfaceZ = oilSwipe(p.xy, colorZ);
  paintedColor = colorX * weight.x + colorY * weight.y + colorZ * weight.z;
  return surfaceX * weight.x + surfaceY * weight.y + surfaceZ * weight.z;
}
`;

const profiles = {
  // Colour weights are atlas chroma / exposed underpaint / atlas value.
  // Brush relief is independent: leaves can retain their green mass without
  // inheriting the blue-and-ochre palette used for broad mixed paint banks.
  ground:       { scale: [.30, .22, .30], depth: .045, pigment: .26, color: [.18, .10, .25], fold: .40, roughness: .50, coat: .32 },
  path:         { scale: [.17, .17, .17], depth: .070, pigment: .56, color: [.37, .27, .34], fold: .55, roughness: .40, coat: .62, glaze: .16 },
  rock:         { scale: [.26, .19, .26], depth: .095, pigment: .62, color: [.43, .34, .38], fold: .70, roughness: .40, coat: .62, glaze: .16 },
  bark:         { scale: [.62, .16, .62], depth: .060, pigment: .14, color: [.04, .035, .18], fold: .40, roughness: .47, coat: .36 },
  foliage:      { scale: [1.00, .50, 1.00], depth: .015, pigment: .08, color: [.025, .025, .10], fold: .22, roughness: .40, coat: .42 },
  gold:         { scale: [.60, .42, .60], depth: .016, pigment: .06, color: [.018, .012, .10], fold: .15, roughness: .38, coat: .32 },
  architecture: { scale: [.32, .28, .32], depth: .042, pigment: .08, color: [.035, .025, .12], fold: .22, roughness: .49, coat: .30 },
  water:        { scale: [.15, .12, .15], depth: .055, pigment: .15, color: [.08, .05, .16], fold: .20, roughness: .28, coat: .64 },
  distant:      { scale: [.12, .12, .12], depth: .003, pigment: .03, color: [.012, 0, .04], fold: 0, roughness: .90, coat: 0 },
};

function surfaceFor(object, material) {
  if (material.userData.pigmentDistant || object.userData.pigmentDistant) return 'distant';
  const tagged = object.userData.pigmentSurface ?? material.userData.pigmentSurface;
  if (tagged && profiles[tagged]) return tagged;
  const label = `${material.name} ${object.name} ${object.userData.pigmentBatch ?? ''}`;
  if (/path/i.test(label)) return 'path';
  if (/grass|flower|foliage|leaf|tree-pigment|canopy|willow|lily|stem/i.test(label)) return 'foliage';
  if (/foam|pond|water|sea-/i.test(label)) return 'water';
  if (/rock|stone|cliff/i.test(label)) return 'rock';
  if (/bark|trunk|branch/i.test(label)) return 'bark';
  if (/gold|frame|gild/i.test(label) || material.metalness > .2) return 'gold';
  if (/house|wall|roof|bridge|building|sail|lighthouse|tower/i.test(label)) return 'architecture';
  return 'ground';
}

function averageCanvasPigment(material) {
  if (!material.map?.isCanvasTexture || typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 8;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(material.map.image, 0, 0, 8, 8);
  const data = context.getImageData(0, 0, 8, 8).data;
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
  return new Color().setRGB(r / (64 * 255), g / (64 * 255), b / (64 * 255), SRGBColorSpace);
}

export function applyOilMaterials(scene) {
  const coatings = new Map(), originals = [], time = { value: 0 };
  scene.traverse(object => {
    if (!object.isMesh) return;
    const originalMaterial = object.material;
    const coat = original => {
      if (!original?.isMeshStandardMaterial) return original;
      // Flowing paint water owns a separate physical shader and its uniforms.
      if (original.userData.pigmentSurface === 'liquid') return original;
      const surface = surfaceFor(object, original), profile = profiles[surface];
      const moving = surface === 'foliage' && /grass|flower|foliage|tree-pigment|canopy|willow/i.test(object.name);
      if (!coatings.has(original)) coatings.set(original, new Map());
      const variants = coatings.get(original), key = `${surface}:${moving}`;
      if (variants.has(key)) return variants.get(key);
      const material = new MeshPhysicalMaterial();
      MeshStandardMaterial.prototype.copy.call(material, original);
      material.defines = { STANDARD: '', PHYSICAL: '' };
      material.name = `${original.name || surface} / viscous oil`;
      material.userData = { ...original.userData, pigmentSurface: surface };
      // The old CanvasTexture repeated like linen. Preserve its palette as
      // substrate; coherent spatial strokes now supply its physical texture.
      const palette = averageCanvasPigment(original);
      if (palette) { material.color.multiply(palette); material.map = null; }
      material.bumpMap = null;
      material.normalMap = null;
      material.roughness = profile.roughness;
      material.clearcoat = profile.coat;
      material.clearcoatRoughness = profile.glaze ?? .27;
      material.ior = 1.47;
      material.specularIntensity = .90;
      material.onBeforeCompile = shader => {
        shader.uniforms.uOilTime = time;
        shader.uniforms.uOilPaint = oilPaintUniform;
        shader.uniforms.uOilPigmentAtlas = oilPigmentUniform;
        shader.uniforms.uOilPaintReady = oilPaintReadyUniform;
        shader.uniforms.uOilScale = { value: new Vector3(...profile.scale) };
        shader.uniforms.uOilDepth = { value: profile.depth };
        shader.uniforms.uOilPigment = { value: profile.pigment };
        shader.uniforms.uOilColorWeights = { value: new Vector3(...profile.color) };
        shader.uniforms.uOilFold = { value: profile.fold };
        shader.uniforms.uOilLeafValue = { value: surface === 'foliage' ? 1 : 0 };
        shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
          varying vec3 vOilPosition;
          varying vec3 vOilRestNormal;
          uniform float uOilTime;`);
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          vOilPosition = position;
          vOilRestNormal = normal;
          float oilPhase = 0.;
          #ifdef USE_INSTANCING
            vec3 oilOrigin = instanceMatrix[3].xyz;
            oilPhase = oilOrigin.x * .6 + oilOrigin.z * .33;
            vOilPosition += mod(abs(oilOrigin * vec3(.371, .719, .533)), 19.);
          #endif
          ${moving ? `
            float oilTip = pow(clamp(position.y + .5, 0., 1.5), 2.);
            transformed.x += sin(uOilTime * .38 + oilPhase) * oilTip * .055;
            transformed.z += cos(uOilTime * .29 + oilPhase) * oilTip * .022;` : ''}`);
        shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${pigmentFunctions}`);
        shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
          vec3 paintedColor;
          vec4 oil = oilSurface(vOilPosition * uOilScale, normalize(vOilRestNormal), paintedColor);
          vec3 pigmentMix = mix(vec3(.78, .93, 1.19), vec3(1.21, 1.02, .76), oil.w);
          diffuseColor.rgb *= mix(vec3(1.), pigmentMix, uOilPigment);
          // A swipe picks up the ochre/cool underpainting at its lifted edge.
          // Keep its luminance while varying the actual pigment, rather than
          // drawing a grayscale embossed pattern over a single flat colour.
          float pigmentLight = dot(diffuseColor.rgb, vec3(.2126, .7152, .0722));
          vec3 coolUnderpaint = pigmentLight * vec3(.42, .92, 1.74);
          vec3 warmUnderpaint = pigmentLight * vec3(1.78, .91, .30);
          vec3 underpaint = mix(coolUnderpaint, warmUnderpaint, smoothstep(.30, .73, oil.w));
          float exposedPigment = (1. - smoothstep(.32, .61, oil.y)) * uOilColorWeights.y;
          diffuseColor.rgb = mix(diffuseColor.rgb, underpaint, exposedPigment);
          // Matched original colour swipes supply chroma and marbling; their
          // values are remapped to the scene's pigment brightness so each world
          // retains its palette while exhibiting actual mixed paint strands.
          float paintedLight = max(.025, dot(paintedColor, vec3(.2126, .7152, .0722)));
          vec3 paintedChroma = clamp(paintedColor / paintedLight, vec3(.14), vec3(2.6));
          vec3 marbledPigment = paintedChroma * pigmentLight;
          diffuseColor.rgb = mix(diffuseColor.rgb, marbledPigment, uOilColorWeights.x * uOilPaintReady);
          // Value comes from pigment thickness, never a white wash. Physical
          // key-light and clearcoat provide the bright ridge crests instead.
          float paintValue = clamp(.62 + sqrt(paintedLight) * .72, .68, 1.);
          diffuseColor.rgb *= mix(1., paintValue, uOilColorWeights.z * uOilPaintReady);
          diffuseColor.rgb *= mix(1., .76 + oil.y * .24, uOilFold);
          // Broad overlapping strokes deepen the existing green/petal pigment;
          // the scalar leaves its hue intact and follows the same local relief.
          float leafStroke = smoothstep(.18, .72, oil.y * .8 + oil.x * .2);
          diffuseColor.rgb *= mix(1., mix(.65, 1.15, leafStroke), uOilLeafValue);
          diffuseColor.rgb *= 1. - oil.z * .065;`);
        shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          vec3 oilS = dFdx(-vViewPosition), oilT = dFdy(-vViewPosition);
          vec3 oilR1 = cross(oilT, normal), oilR2 = cross(normal, oilS);
          float oilDet = dot(oilS, oilR1);
          vec3 oilGradient = sign(oilDet) * (dFdx(oil.x) * oilR1 + dFdy(oil.x) * oilR2);
          vec3 oilNormal = normalize(abs(oilDet) * normal - uOilDepth * oilGradient);
          normal = normalize(mix(normal, oilNormal, .82));`);
        shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          roughnessFactor = clamp(roughnessFactor + (1. - oil.y) * .14 - oil.z * .10, .24, ${surface === 'distant' ? '.95' : '.66'});`);
        shader.fragmentShader = shader.fragmentShader.replace('#include <clearcoat_normal_fragment_maps>', `#include <clearcoat_normal_fragment_maps>
          #ifdef USE_CLEARCOAT
            clearcoatNormal = normal;
          #endif`);
        shader.fragmentShader = shader.fragmentShader.replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
          #ifdef USE_CLEARCOAT
            material.clearcoatRoughness = clamp(material.clearcoatRoughness + (1. - oil.y) * .10 - oil.z * .08, .14, .4);
          #endif`);
      };
      material.customProgramCacheKey = () => `pigment-viscous-atlas-v9-${surface}-${moving}`;
      material.needsUpdate = true;
      variants.set(key, material);
      return material;
    };
    object.material = Array.isArray(originalMaterial) ? originalMaterial.map(coat) : coat(originalMaterial);
    if (object.material !== originalMaterial) originals.push([object, originalMaterial]);
  });
  return {
    update(t) { time.value = t; },
    dispose() {
      for (const [object, original] of originals) object.material = original;
      for (const variants of coatings.values()) for (const material of variants.values()) material.dispose();
      coatings.clear();
    },
  };
}
