import { Color, MeshPhysicalMaterial, MeshStandardMaterial, SRGBColorSpace, Vector3 } from 'three';
import { oilPaintReadyUniform, oilPaintUniform, oilPigmentUniform } from './paint-texture.js';
import { PAINT_COORDINATES_GLSL } from './paint-coordinates.js';
export { loadOilPaintTexture } from './paint-texture.js';

// Coordinates belong to the undeformed object, not the screen or camera.
// Instanced leaves retain their local Y brush direction and a stable offset;
// merged scenery retains its baked object positions. No UVs are required.
const pigmentFunctions = /* glsl */`
varying vec3 vOilPosition;
varying vec3 vOilRestNormal;
#ifdef USE_OIL_BLADE_UV
  varying vec2 vOilBladeUv;
#endif
uniform sampler2D uOilPaint;
uniform sampler2D uOilPigmentAtlas;
uniform float uOilPaintReady;
uniform vec3 uOilScale;
uniform float uOilDepth;
uniform float uOilPigment;
uniform vec3 uOilColorWeights;
uniform float uOilFold;
uniform float uOilLeafValue;
uniform float uOilDirectPigment;
${PAINT_COORDINATES_GLSL}

vec4 oilSwipe(vec2 p, out vec3 paintedColor) {
  float bend = sin(p.y * 3.1 + sin(p.y * .79)) * .038;
  vec2 q = vec2(p.x + bend, p.y);
  vec3 relief;
  #ifdef OIL_PATCH_MAPPING
    vec2 uv0, uv1, uv2; vec3 weights; mat2 j0, j1, j2;
    paintCoordinates(q, uv0, uv1, uv2, weights, j0, j1, j2);
    vec2 gx=dFdx(q), gy=dFdy(q);
    relief = textureGrad(uOilPaint, uv0, j0*gx, j0*gy).rgb * weights.x + textureGrad(uOilPaint, uv1, j1*gx, j1*gy).rgb * weights.y + textureGrad(uOilPaint, uv2, j2*gx, j2*gy).rgb * weights.z;
    paintedColor = textureGrad(uOilPigmentAtlas, uv0, j0*gx, j0*gy).rgb * weights.x + textureGrad(uOilPigmentAtlas, uv1, j1*gx, j1*gy).rgb * weights.y + textureGrad(uOilPigmentAtlas, uv2, j2*gx, j2*gy).rgb * weights.z;
  #else
    relief = texture2D(uOilPaint, q).rgb;
    paintedColor = texture2D(uOilPigmentAtlas, q).rgb;
  #endif
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

#ifdef USE_OIL_BLADE_UV
vec4 oilBlade(vec2 uv, out vec3 paintedColor) {
  // A blade is a dragged load: a few broad faces, a folded lip and fine
  // bristles running together. Its brush field follows the closed blade UV,
  // including the underside, instead of cutting across a small leaf in XYZ.
  float across = cos(uv.x * 6.283185307);
  float along = uv.y;
  float drag = across + sin(along * 4.3) * .065 + sin(along * 9.1) * .012;
  float faceA = smoothstep(-.77, -.48, drag) - smoothstep(.06, .27, drag);
  float faceB = smoothstep(.14, .34, drag) - smoothstep(.70, .91, drag);
  float lip = exp(-pow((drag - .63) / .11, 2.));
  float footprint = max(fwidth(across), fwidth(along));
  float bristleFade = 1. - smoothstep(.025, .09, footprint);
  float bristle = sin(drag * 43. + sin(along * 4.1) * .9) * .0035 * bristleFade;
  // Sample a complete dragged stroke directly. The spatial patch blender is
  // useful for broad terrain, but fragments the stroke inside a tiny petal.
  vec2 bladeGuideUv = vec2(.48 + across * .16, .10 + along * .62);
  vec3 guide = texture2D(uOilPaint, bladeGuideUv).rgb;
  paintedColor = texture2D(uOilPigmentAtlas, bladeGuideUv).rgb;
  float load = .33 + faceA * .25 + faceB * .13 + lip * .07;
  float draggedPaint = mix(load, guide.y, .80 * uOilPaintReady);
  float height = draggedPaint + bristle;
  float groove = (1. - smoothstep(.27, .48, draggedPaint)) * .16;
  return vec4(height, draggedPaint, groove, .5 + drag * .28);
}
#endif
`;

const profiles = {
  // Colour weights are atlas chroma / exposed underpaint / atlas value.
  // Brush relief is independent: leaves can retain their green mass without
  // inheriting the blue-and-ochre palette used for broad mixed paint banks.
  ground:       { scale: [.30, .22, .30], depth: .045, pigment: .26, color: [.18, .10, .25], fold: .40, roughness: .50, coat: .32 },
  canyon:       { scale: [.45, .32, .45], depth: .042, pigment: .05, color: [0, 0, .20], fold: .30, roughness: .62, coat: .24 },
  path:         { scale: [.17, .17, .17], depth: .070, pigment: .56, color: [.37, .27, .34], fold: .55, roughness: .40, coat: .62, glaze: .16 },
  rock:         { scale: [.26, .19, .26], depth: .095, pigment: .62, color: [.43, .34, .38], fold: .70, roughness: .40, coat: .62, glaze: .16 },
  bark:         { scale: [.62, .16, .62], depth: .060, pigment: .14, color: [.04, .035, .18], fold: .40, roughness: .47, coat: .36 },
  foliage:      { scale: [1.00, .50, 1.00], depth: .015, pigment: .08, color: [.025, .025, .10], fold: .22, roughness: .40, coat: .42 },
  crown:        { scale: [.80, .65, .80], depth: .040, pigment: 0, color: [0, 0, .035], fold: 0, roughness: .34, coat: .55, glaze: .20, loadRange: [.58, 1.40], atlasResidue: 0 },
  deposit:      { scale: [.42, .23, .42], depth: .035, pigment: 0, color: [0, 0, .04], fold: 0, roughness: .38, coat: .60, glaze: .17, loadRange: [.58, 1.40], atlasResidue: 0 },
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

const richProfiles = {
  ground: { scale: [.34, .28, .34], direct: .60, depth: .052, roughness: .40, coat: .52 },
  canyon: { scale: [.14, .125, .14], direct: .72, depth: .12, roughness: .48, coat: .55 },
  path: { scale: [.32, .32, .32], direct: .85, depth: .065, roughness: .35, coat: .64 },
  rock: { scale: [.30, .23, .30], direct: .75, depth: .095, roughness: .37, coat: .62 },
};

export function applyOilMaterials(scene, { richPigment = false, stochasticPigment = false } = {}) {
  const coatings = new Map(), originals = [], time = { value: 0 };
  scene.traverse(object => {
    if (!object.isMesh) return;
    const originalMaterial = object.material;
    const coat = original => {
      if (!original?.isMeshStandardMaterial) return original;
      // Flowing paint water owns a separate physical shader and its uniforms.
      if (original.userData.pigmentSurface === 'liquid' || original.userData.preservePaintColor) return original;
      const surface = surfaceFor(object, original);
      const profile = { ...profiles[surface], ...(richPigment ? richProfiles[surface] : {}) };
      const moving = surface === 'foliage' && /grass|flower|foliage|tree-pigment|canopy|willow/i.test(object.name);
      const anchored = Boolean(object.geometry?.attributes.oilRestPosition && object.geometry?.attributes.oilRestNormal);
      const blade = surface === 'foliage' && Boolean(object.userData.pigmentBladeUV);
      const leafLoad = blade && object.geometry?.name.startsWith('dragged-pigment-leaf-');
      if (!coatings.has(original)) coatings.set(original, new Map());
      const variants = coatings.get(original), key = `${surface}:${moving}:${anchored}:${blade}:${leafLoad}`;
      if (variants.has(key)) return variants.get(key);
      const material = new MeshPhysicalMaterial();
      MeshStandardMaterial.prototype.copy.call(material, original);
      material.defines = { STANDARD: '', PHYSICAL: '' };
      if(stochasticPigment) material.defines.OIL_PATCH_MAPPING = '';
      if(anchored) material.defines.USE_OIL_REST = '';
      if(blade) material.defines.USE_OIL_BLADE_UV = '';
      if(leafLoad) material.defines.USE_OIL_LEAF_LOAD = '';
      material.name = `${original.name || surface} / viscous oil`;
      material.userData = { ...original.userData, pigmentSurface: surface };
      // The old CanvasTexture repeated like linen. Preserve its palette as
      // substrate; coherent spatial strokes now supply its physical texture.
      const palette = averageCanvasPigment(original);
      if (palette) { material.color.multiply(palette); material.map = null; }
      material.bumpMap = null;
      material.normalMap = null;
      material.roughness = blade ? .40 : profile.roughness;
      material.clearcoat = blade ? .55 : profile.coat;
      material.clearcoatRoughness = blade ? .27 : profile.glaze ?? .27;
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
        shader.uniforms.uOilDirectPigment = { value: profile.direct ?? 0 };
        shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
          varying vec3 vOilPosition;
          varying vec3 vOilRestNormal;
          #ifdef USE_OIL_BLADE_UV
            varying vec2 vOilBladeUv;
          #endif
          #ifdef USE_OIL_REST
            attribute vec3 oilRestPosition;
            attribute vec3 oilRestNormal;
          #endif
          uniform float uOilTime;`);
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          vOilPosition = position;
          vOilRestNormal = normal;
          #ifdef USE_OIL_BLADE_UV
            vOilBladeUv = uv;
          #endif
          #ifdef USE_OIL_REST
            vOilPosition = oilRestPosition;
            vOilRestNormal = oilRestNormal;
          #endif
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
          vec3 authoredLoad = diffuseColor.rgb;
          vec3 paintedColor;
          #ifdef USE_OIL_BLADE_UV
            vec4 oil = oilBlade(vOilBladeUv, paintedColor);
          #else
            vec4 oil = oilSurface(vOilPosition * uOilScale, normalize(vOilRestNormal), paintedColor);
          #endif
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
          #ifdef USE_OIL_BLADE_UV
            // Colour remains pigment on the broad load. Gloss is confined to
            // the raised lip below, rather than washing the whole petal white.
            float draggedValue = smoothstep(.30, .60, oil.y);
            diffuseColor.rgb = authoredLoad * mix(.57, 1.38, draggedValue);
            #ifdef USE_OIL_LEAF_LOAD
              // Pigment picked up by the same dragged stroke: cool underpaint
              // and warm olive/ochre separate within each broad painted leaf.
              // Using the atlas colour here keeps those transitions attached
              // to its actual brush relief instead of a repeated leaf vein.
              float leafTemperature = smoothstep(-.045, .09, paintedColor.r - paintedColor.b);
              vec3 leafPigment = mix(vec3(.48, .76, 1.08), vec3(1.32, 1.14, .62), leafTemperature);
              diffuseColor.rgb *= leafPigment;
            #endif
          #endif
          diffuseColor.rgb *= 1. - oil.z * .065;
          // Keep the artist's actual pigment values in broad paint deposits.
          // The physical relief still supplies view-dependent light and shadow.
          ${profile.loadRange ? `// Each deposited load keeps its authored pigment. The matched height
          // field changes its value without painting every surface ivory-blue.
          float loadStroke = smoothstep(.24, .64, oil.y);
          float loadGain = mix(${profile.loadRange[0].toFixed(2)}, ${profile.loadRange[1].toFixed(2)}, loadStroke);
          float loadPeak = max(authoredLoad.r, max(authoredLoad.g, authoredLoad.b));
          vec3 depositedLoad = authoredLoad * min(loadGain, .94 / max(.001, loadPeak));
          diffuseColor.rgb = mix(diffuseColor.rgb, mix(depositedLoad, paintedColor, ${profile.atlasResidue.toFixed(2)}), uOilPaintReady);`
          : `float directPigment = uOilDirectPigment;
          ${surface === 'canyon' ? `
          // Broad pigment bodies stay visible between dragged interfaces.
          // This object-space layer field changes colour coverage, never the
          // atlas coordinates shared by the physical and shaded relief.
          vec3 layerPosition = vOilPosition;
          float layerFlow = layerPosition.x * .23 + layerPosition.y * .31
            + .82 * sin(layerPosition.z * .19 + .34 * sin(layerPosition.x * .16))
            + .27 * sin(layerPosition.z * .43 + layerPosition.y * .13);
          float layerPhase = sin(layerFlow);
          float layerInterface = 1. - smoothstep(.10, .38, abs(layerPhase));
          float scrapedPaint = 1. - smoothstep(.29, .53, oil.y);
          float canyonMixedEdge = max(layerInterface, scrapedPaint * .70);
          float loadValue = mix(.64, 1.24, smoothstep(.25, .63, oil.y));
          vec3 bodyPigment = authoredLoad * loadValue;
          // A little source pigment remains inside the body; the complete
          // blue/ochre/ivory strands return at scraped and overlapping edges.
          diffuseColor.rgb = mix(diffuseColor.rgb, bodyPigment, .30);
          directPigment *= mix(.55, 1., canyonMixedEdge)
            * mix(.24, 1., smoothstep(.025, .18, pigmentLight));` : ''}
          diffuseColor.rgb = mix(diffuseColor.rgb, paintedColor, directPigment * uOilPaintReady);`}`);
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
            ${surface === 'canyon' ? `float paintRim = smoothstep(.45, .69, oil.x) * canyonMixedEdge;
            material.clearcoat = mix(.16, .72, paintRim);
            material.clearcoatRoughness = mix(.34, .18, paintRim);` : ''}
            #ifdef USE_OIL_BLADE_UV
              float loadedLip = exp(-pow((cos(vOilBladeUv.x * 6.283185307) + sin(vOilBladeUv.y * 4.3) * .065 + sin(vOilBladeUv.y * 9.1) * .012 - .63) / .14, 2.));
              material.clearcoat = mix(.25, .72, loadedLip);
              material.clearcoatRoughness = mix(.31, .18, loadedLip);
            #endif
          #endif`);
      };
      material.customProgramCacheKey = () => `pigment-viscous-atlas-v18-${surface}-${moving}-${richPigment}-${anchored}-${stochasticPigment}-${blade}-${leafLoad}`;
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
