import {
  BufferGeometry, ClampToEdgeWrapping, Color, DoubleSide, Float32BufferAttribute,
  Group, LinearFilter, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial,
  SRGBColorSpace, TextureLoader, Vector3,
} from 'three';

let artwork = null;
let loading = null;

/** Load the original scenic painting and its numerical skyline once per app. */
export function loadCanyonVista() {
  if (loading) return loading;
  const base = import.meta.env?.BASE_URL ?? './';
  const loader = new TextureLoader();
  loading = Promise.all([
    loader.loadAsync(`${base}art/vistas/canyon-vista-impasto-candidate.webp`),
    fetch(`${base}art/vistas/canyon-ridgeline-impasto-candidate.json`).then(response => {
      if (!response.ok) throw new Error(`Canyon skyline: HTTP ${response.status}`);
      return response.json();
    }),
  ]).then(([map, ridge]) => {
    if (!Array.isArray(ridge.outline) || ridge.outline.length < 2
      || ridge.outline.some(value => !Number.isFinite(value) || value < 0 || value > 1)) {
      map.dispose();
      throw new Error('Canyon skyline contains invalid geometry coordinates.');
    }
    map.colorSpace = SRGBColorSpace;
    map.wrapS = map.wrapT = ClampToEdgeWrapping;
    map.minFilter = LinearMipmapLinearFilter;
    map.magFilter = LinearFilter;
    map.anisotropy = 8;
    map.name = 'original-painted-canyon-and-spired-castle';
    artwork = { map, ridge };
    return artwork;
  }).catch(error => { loading = null; throw error; });
  return loading;
}

function curvedSkyline(radius, arc, bottom, height, ridge, crop = [0, 1], sourceBottom = 0) {
  const positions = [], uvs = [], scenicUVs = [], indices = [];
  const segments = Math.ceil((ridge.outline.length - 1) * Math.abs(crop[1] - crop[0]));
  // A column per original image pixel preserves slender castle spires. Only
  // the silhouette is geometry; the distant painted buildings are not walkable.
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i <= segments; i++) {
      const u = i / segments, angle = (u - .5) * arc;
      const sourceU = crop[0] + (crop[1] - crop[0]) * u;
      const sample = sourceU * (ridge.outline.length - 1), j = Math.floor(sample);
      const sourceTop = ridge.outline[j] + ((ridge.outline[j + 1] ?? ridge.outline[j]) - ridge.outline[j]) * (sample - j) - .5 / ridge.height;
      const top = Math.max(.01, (sourceTop - sourceBottom) / (1 - sourceBottom));
      positions.push(Math.sin(angle) * radius, bottom + row * height * top, -Math.cos(angle) * radius);
      uvs.push(sourceU, sourceBottom + row * (sourceTop - sourceBottom));
      scenicUVs.push(u, row);
      if (row === 0 && i < segments) {
        const a = i, b = i + 1, c = i + segments + 1, d = c + 1;
        indices.push(a, b, c, b, d, c);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('canyonUV', new Float32BufferAttribute(scenicUVs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function scenicMaterial(map, { atmosphere, tint, opacity, feather }) {
  const material = new MeshBasicMaterial({
    map, transparent: true, opacity, depthTest: true, depthWrite: false,
    side: DoubleSide, fog: false, toneMapped: false,
  });
  material.name = 'painted-canyon-distant-landscape';
  material.userData.pigmentSurface = 'painted-vista';
  material.onBeforeCompile = shader => {
    shader.uniforms.canyonAtmosphere = { value: atmosphere };
    shader.uniforms.canyonTint = { value: tint };
    shader.uniforms.canyonFeather = { value: feather };
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
      attribute vec2 canyonUV;
      varying vec2 vCanyonUV;
      varying vec3 vCanyonWorld;`);
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vCanyonUV = canyonUV;
      vCanyonWorld = (modelMatrix * vec4(position, 1.)).xyz;`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec2 vCanyonUV;
      varying vec3 vCanyonWorld;
      uniform float canyonAtmosphere;
      uniform float canyonFeather;
      uniform vec3 canyonTint;`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float scenicDistance = length(vCanyonWorld.xz - cameraPosition.xz);
      float distantOnly = smoothstep(60., 80., scenicDistance);
      float bottomEdge = smoothstep(.005, .07, vCanyonUV.y);
      float sideEdges = smoothstep(0., canyonFeather, vCanyonUV.x)
        * (1. - smoothstep(1. - canyonFeather, 1., vCanyonUV.x));
      // Subpixel edge softness leaves the tall spires intact. No broad fade
      // erases the skyline, and the mesh never moves with the camera.
      float ridgeEdge = 1. - smoothstep(.998, 1., vCanyonUV.y);
      diffuseColor.a *= distantOnly * bottomEdge * sideEdges * ridgeEdge;
      diffuseColor.rgb = mix(diffuseColor.rgb, canyonTint, canyonAtmosphere);
      if (diffuseColor.a < .003) discard;`);
  };
  material.customProgramCacheKey = () => 'painted-canyon-vista-v1';
  return material;
}

/**
 * A fixed, decorative distant landscape beyond the playable canyon. Its curved
 * mesh has the painting's actual skyline and modest viewpoint parallax; its
 * illustrated castle and bridges are scenery, not traversable 3D structures.
 * Call loadCanyonVista() before adding. There is no per-frame update. dispose()
 * removes this instance while retaining the shared texture for world revisits.
 */
export function addCanyonVista(scene, {
  origin = [0, 0, 0], radius = 210, arc = Math.PI * 2 / 3,
  height = 150, bottom = -35, yaw = 0, atmosphere = .035,
  tint = '#718a9e', opacity = 1, feather = .045,
} = {}) {
  if (!artwork) throw new Error('Call loadCanyonVista() before addCanyonVista().');
  const group = new Group();
  group.name = 'original-painted-canyon-vista';
  group.userData.staticScenicPaintings = true;
  group.position.copy(origin?.isVector3 ? origin : new Vector3(...origin));
  group.rotation.y = yaw;
  const geometry = curvedSkyline(radius, arc, bottom, height, artwork.ridge);
  const material = scenicMaterial(artwork.map, {
    atmosphere, tint: tint?.isColor ? tint : new Color(tint), opacity, feather,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = 'canyon-castle-curved-panorama';
  mesh.castShadow = mesh.receiveShadow = false;
  mesh.userData.staticScenicPainting = true;
  mesh.renderOrder = -20;
  group.add(mesh);
  const resources = [geometry, material];
  // Four overlapping arcs complete the side/rear horizon with mountain-only
  // crops. They never sample the castle (which starts beyond source u=.63).
  // The cropped lower rows remove the original river and large near villages.
  // Different ranges, scale and reversed UVs soften obvious peak repetition.
  // At least 16 degrees of overlap with the north panorama survives parallax
  // when looking around from the outer corners of the playable area.
  const mountainArcs = [
    { angle: -88, radius: radius + 14, crop: [.015, .365], height: height * 1.07, bottom: bottom - 6 },
    { angle: 88, radius: radius + 18, crop: [.345, .005], height: height * 1.01, bottom: bottom - 5 },
    { angle: -156, radius: radius + 24, crop: [.325, .025], height: height * .94, bottom: bottom - 8 },
    { angle: 156, radius: radius + 28, crop: [.045, .37], height: height * 1.04, bottom: bottom - 7 },
  ];
  for (const [i, layer] of mountainArcs.entries()) {
    const mountainGeometry = curvedSkyline(layer.radius, Math.PI * 88 / 180,
      layer.bottom, layer.height, artwork.ridge, layer.crop, .27);
    const mountainMaterial = scenicMaterial(artwork.map, {
      atmosphere: atmosphere + .025 + i * .009,
      tint: tint?.isColor ? tint : new Color(tint), opacity, feather: .075,
    });
    const mountain = new Mesh(mountainGeometry, mountainMaterial);
    mountain.name = `canyon-surrounding-painted-mountains-${i}`;
    mountain.rotation.y = -layer.angle * Math.PI / 180;
    mountain.castShadow = mountain.receiveShadow = false;
    mountain.userData.staticScenicPainting = true;
    mountain.userData.sourceCrop = [...layer.crop];
    mountain.renderOrder = -21;
    group.add(mountain);
    resources.push(mountainGeometry, mountainMaterial);
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
