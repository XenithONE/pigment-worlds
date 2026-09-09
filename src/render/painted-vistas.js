import {
  BufferGeometry, ClampToEdgeWrapping, Color, DoubleSide, Float32BufferAttribute,
  Group, LinearFilter, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial,
  SRGBColorSpace, TextureLoader, Vector3,
} from 'three';

let paintings = null;
let loading = null;

const gardenSkyline = [0.73066,0.79144,0.80663,0.78867,0.77624,0.82597,0.87431,0.89088,0.9116,0.91575,0.90884,0.89779,0.86326,0.82459,0.84392,0.85083,0.83978,0.90608,0.9268,0.8895,0.90746,0.98066,1,1,0.9489,0.83011,0.74862,0.77624,0.79006,0.8232,0.85221,0.85359,0.84254,0.87017,0.86602,0.86188,0.83564,0.83149,0.81077,0.79834,0.80801,0.79282,0.77901,0.75276,0.78039,0.79144,0.79696,0.78315,0.82182,0.84945,0.84116,0.79696,0.80387,0.78177,0.72514,0.74586,0.75138,0.73066,0.69337,0.6837,0.71271,0.74033,0.76796,0.77624,0.77762,0.75829,0.77486,0.77762,0.77072,0.74586,0.72928,0.69475,0.68785,0.66713,0.62845,0.61878,0.63536,0.65193,0.66713,0.66436,0.6616,0.65608,0.63674,0.64365,0.61188,0.70304,0.71961,0.64365,0.68923,0.66713,0.67127,0.66989,0.66436,0.68508,0.79834,0.79558,0.74448,0.86326,0.85912,0.86326,0.86602,0.8011,0.66989,0.69337,0.70994,0.69751,0.72928,0.73204,0.75414,0.76657,0.75,0.73481,0.76934,0.78177,0.77624,0.75414,0.73619,0.73481,0.75,0.74724,0.73343];

// Scenic mesh silhouette traced from the generated mountain reference. The
// source panorama stays intact; vertices/UVs clip its quiet sky above the ridge.
const starrySkyline = [0.83425,0.83149,0.82459,0.81906,0.8232,0.8232,0.84254,0.85083,0.85912,0.87431,0.87155,0.85083,0.83287,0.82459,0.83011,0.81354,0.81492,0.81768,0.83702,0.84807,0.83149,0.81492,0.80663,0.80801,0.81906,0.8011,0.77901,0.77348,0.76519,0.7721,0.77901,0.79144,0.81215,0.80801,0.81768,0.8011,0.79144,0.8011,0.81906,0.84254,0.83287,0.85359,0.87293,0.86878,0.85221,0.84807,0.84807,0.85083,0.83564,0.81215,0.79834,0.78315,0.76657,0.77486,0.78315,0.79144,0.7721,0.75276,0.75967,0.77072,0.76519,0.76657,0.78729,0.79558,0.79144,0.7942,0.79144,0.76934,0.75276,0.74448,0.75138,0.73343,0.72238,0.71547,0.72376,0.72928,0.74448,0.73343,0.72238,0.72238,0.73204,0.74309,0.75276,0.76657,0.75829,0.75691,0.77072,0.77624,0.76519,0.74724,0.75138,0.74862,0.75552,0.75967,0.78177,0.79558,0.81906,0.83287,0.8384,0.83564,0.84669,0.86464,0.85359,0.83425,0.81492,0.79972,0.79972,0.80663,0.8232,0.83564,0.81906,0.81077,0.80249,0.7942,0.78039,0.79006,0.8011,0.81492,0.80663,0.79144,0.77072];

/** Original static scenic paintings, shared across world visits. */
export function loadPaintedVistas() {
  if (!loading) {
    const base = import.meta.env?.BASE_URL ?? './';
    const loader = new TextureLoader();
    loading = Promise.all([
      loader.loadAsync(`${base}art/vistas/starry-vista.webp`),
      loader.loadAsync(`${base}art/vistas/starry-vista-layers.webp`),
      loader.loadAsync(`${base}art/vistas/garden-vista-opaque.webp`),
    ]).then(([panorama, layers, garden]) => {
      for (const texture of [panorama, layers, garden]) {
        texture.colorSpace = SRGBColorSpace;
        texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
        texture.minFilter = LinearMipmapLinearFilter;
        texture.magFilter = LinearFilter;
        texture.anisotropy = 8;
      }
      panorama.name = 'original-starry-village-panorama';
      layers.name = 'original-starry-village-parallax-layers';
      garden.name = 'original-monet-garden-panorama';
      paintings = { panorama, layers, garden };
      return paintings;
    }).catch(error => { loading = null; throw error; });
  }
  return loading;
}

function curvedPainting(radius, arc, bottom, height, segments, crop = [0, 1], skyline = null) {
  const positions = [], uvs = [], localUVs = [], indices = [];
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i <= segments; i++) {
      const u = i / segments, angle = (u - .5) * arc;
      const sourceU = crop[0] + u * (crop[1] - crop[0]);
      const sample = sourceU * ((skyline?.length ?? 1) - 1), j = Math.floor(sample);
      const top = skyline ? Math.min(1, skyline[j] + ((skyline[j + 1] ?? skyline[j]) - skyline[j]) * (sample - j) + .008) : 1;
      positions.push(Math.sin(angle) * radius, bottom + row * height * top, -Math.cos(angle) * radius);
      uvs.push(sourceU, row * top);
      localUVs.push(u, row);
      if (row === 0 && i < segments) {
        const a = i, b = i + 1, c = i + segments + 1, d = c + 1;
        indices.push(a, b, c, b, d, c);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('vistaUV', new Float32BufferAttribute(localUVs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function paintingMaterial(map, { panorama, atmosphere, tint, opacity, feather = .045 }) {
  const material = new MeshBasicMaterial({
    map, transparent: true, opacity, depthTest: true, depthWrite: false,
    side: DoubleSide, fog: false, toneMapped: false,
  });
  material.name = panorama ? 'distant-oil-panorama' : 'distant-oil-parallax-fragment';
  // These are painted scenic surfaces, deliberately excluded from the solid
  // impasto material pass. All traversable foreground remains actual geometry.
  material.userData.pigmentSurface = 'painted-vista';
  material.onBeforeCompile = shader => {
    shader.uniforms.vistaAtmosphere = { value: atmosphere };
    shader.uniforms.vistaTint = { value: tint };
    shader.uniforms.vistaFeather = { value: feather };
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
      attribute vec2 vistaUV;
      varying vec2 vVistaUV;
      varying vec3 vVistaWorld;`);
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vVistaUV = vistaUV;
      vVistaWorld = (modelMatrix * vec4(position, 1.)).xyz;`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec2 vVistaUV;
      varying vec3 vVistaWorld;
      uniform float vistaAtmosphere;
      uniform float vistaFeather;
      uniform vec3 vistaTint;`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float vistaDistance = length(vVistaWorld.xz - cameraPosition.xz);
      // Approaching a backdrop reveals the real scene instead of a huge flat
      // painted prop. Neither geometry nor texture ever follows the camera.
      float vistaFarOnly = smoothstep(60., 76., vistaDistance);
      float vistaBase = smoothstep(.015, ${panorama ? '.115' : '.10'}, vVistaUV.y);
      ${panorama ? `
        float vistaTop = 1. - smoothstep(.975, .999, vVistaUV.y);
        float vistaSides = smoothstep(0., vistaFeather, vVistaUV.x) * (1. - smoothstep(1. - vistaFeather, 1., vVistaUV.x));
        diffuseColor.a *= vistaTop * vistaSides;` : ''}
      diffuseColor.a *= vistaBase * vistaFarOnly;
      diffuseColor.rgb = mix(diffuseColor.rgb, vistaTint, vistaAtmosphere);
      if (diffuseColor.a < .003) discard;`);
  };
  material.customProgramCacheKey = () => `painted-vistas-v2-${panorama}`;
  return material;
}

/**
 * Add distant static scenic paintings at fixed world coordinates. The curved
 * panorama and transparent scenic fragments give modest real parallax. They are
 * decorative backgrounds, not traversable architecture or collision geometry.
 * Call loadPaintedVistas() during boot. No per-frame update is needed.
 * The returned dispose() releases only this world's meshes/materials; shared
 * image textures remain cached for revisits. Worlds 2 and 3 are a no-op.
 */
export function addPaintedVistas(scene, {
  id = 0, origin = [0, 5, 0], radius = 125, height = 78,
  atmosphere = .085, opacity = 1, worldScale = 1.75,
} = {}) {
  if (id !== 0 && id !== 1) return { group: null, dispose() {} };
  if (!paintings) throw new Error('Call loadPaintedVistas() before addPaintedVistas().');
  const group = new Group();
  group.name = 'original-painted-distant-vistas';
  group.userData.staticScenicPaintings = true;
  group.position.copy(origin?.isVector3 ? origin : new Vector3(...origin));
  // Even the near scenic layers remain beyond 76 m when walking to the
  // playable square's +/-58 m corners. Their angular composition is retained.
  group.scale.setScalar(worldScale);
  const tint = new Color(id === 0 ? '#29476c' : '#879b84');
  const resources = [];
  const add = (geometry, map, parameters) => {
    const material = paintingMaterial(map, { atmosphere, tint, opacity, ...parameters });
    const mesh = new Mesh(geometry, material);
    mesh.castShadow = mesh.receiveShadow = false;
    mesh.renderOrder = parameters.panorama ? -20 : -19;
    mesh.frustumCulled = true;
    mesh.userData.staticScenicPainting = true;
    group.add(mesh);
    resources.push(geometry, material);
    return mesh;
  };
  if (id === 0) {
  const panorama = add(curvedPainting(radius, 1.96, -18, height, 120, [0, 1], starrySkyline), paintings.panorama, { panorama: true });
  panorama.name = 'starry-village-curved-panorama';
  // A shallow arc per fragment avoids an obvious flat-card angle from the
  // edges of the playable valley. Each atlas cell is a different oil painting.
  const layers = [
    { cell: 0, radius: 96, angle: -.61, width: 28, height: 28, bottom: -5 },
    { cell: 1, radius: 105, angle: .13, width: 33, height: 33, bottom: -12 },
    { cell: 2, radius: 97, angle: .66, width: 32, height: 32, bottom: -5 },
    // Overlapping irregular RGBA hills continue around the sides and rear.
    // They hide the central panorama's vertical endings when looking sideways.
    ...[-1.02, 1.02, -1.58, 1.58, -2.20, 2.20, Math.PI].map((angle, i) => ({
      cell: i % 2 ? 0 : 2, radius: 136 + i % 2 * 5, angle,
      width: 94, height: Math.abs(angle) < 1.2 ? 64 : 56, bottom: -18,
    })),
  ];
  for (const layer of layers) {
    const inset = 1 / paintings.layers.image.width;
    const geometry = curvedPainting(layer.radius, layer.width / layer.radius, layer.bottom,
      layer.height, 12, [layer.cell / 3 + inset, (layer.cell + 1) / 3 - inset]);
    const mesh = add(geometry, paintings.layers, { panorama: false, atmosphere: atmosphere * .38 });
    mesh.name = `starry-vista-fragment-${layer.cell}-${layer.angle}`;
    mesh.rotation.y = -layer.angle;
  }
  } else {
    // Mesh silhouettes cut the opaque original along its tree crowns. Three
    // overlapping far arcs continue the garden around the entire horizon.
    for (const [i, angle] of [0, -2.09, 2.09].entries()) {
      const geometry = curvedPainting(radius + i * 4, i === 0 ? 2.24 : 2.48, -23,
        height * .82, 120, [0, 1], gardenSkyline);
      const mesh = add(geometry, paintings.garden, { panorama: true, feather: .095 });
      mesh.name = `garden-painted-far-grove-${i}`;
      mesh.rotation.y = angle;
    }
    // Different crops are fixed closer than the full grove, giving modest
    // parallax without making near plants out of painted backgrounds.
    for (const [i, layer] of [
      { radius: 102, angle: -.67, crop: [.015, .25], width: 35, height: 48 },
      { radius: 105, angle: .77, crop: [.765, .985], width: 33, height: 47 },
    ].entries()) {
      const geometry = curvedPainting(layer.radius, layer.width / layer.radius,
        -12, layer.height, 40, layer.crop, gardenSkyline);
      const mesh = add(geometry, paintings.garden, {
        panorama: true, atmosphere: atmosphere * .45, feather: .20,
      });
      mesh.name = `garden-painted-parallax-grove-${i}`;
      mesh.renderOrder = -19;
      mesh.rotation.y = -layer.angle;
    }
  }
  scene.add(group);
  let disposed = false;
  return { group, dispose() {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    for (const resource of resources) resource.dispose();
  } };
}
